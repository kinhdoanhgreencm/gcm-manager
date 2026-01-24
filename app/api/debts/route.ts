import { NextRequest, NextResponse } from 'next/server';
import { supabase, usingServiceRole } from './_supabase';
import { DebtStatus, DebtType } from '@/types';

const formatDate = (dateInput: string | Date | null): string => {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const calculateDebtStatus = (dueDate: Date | null, remainingAmount: number): DebtStatus => {
  if (remainingAmount <= 0) {
    return DebtStatus.PAID;
  }
  if (!dueDate) {
    return DebtStatus.NOT_DUE;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return DebtStatus.OVERDUE;
  } else if (diffDays === 0) {
    return DebtStatus.DUE;
  } else {
    return DebtStatus.NOT_DUE;
  }
};

const buildReceivableDebts = async () => {
  if (!supabase) {
    throw new Error('Supabase client is not initialized');
  }

  const { data: contracts, error: contractsError } = await supabase
    .from('contracts')
    .select(`
      id,
      contract_code,
      customer_name,
      customer_phone,
      total_amount,
      paid_amount,
      signed_date,
      payment_schedules (
        id,
        milestone_name,
        amount,
        due_date,
        status,
        paid_at
      )
    `)
    .eq('contract_type', 'SALES')
    .in('status', ['SIGNED', 'PAYING', 'COMPLETED']);

  if (contractsError) throw contractsError;

  const contractIds = (contracts || []).map((c: any) => c.id).filter(Boolean);
  const phoneNumbers = Array.from(new Set((contracts || []).map((c: any) => c.customer_phone).filter(Boolean)));

  const transactionsMap = new Map<string, number>();
  if (contractIds.length > 0) {
    const { data: transactions } = await supabase
      .from('transactions')
      .select('reference_id, amount')
      .eq('reference_type', 'CONTRACT')
      .eq('type', 'INCOME')
      .in('status', ['APPROVED', 'LOCKED'])
      .in('reference_id', contractIds);

    (transactions || []).forEach((t: any) => {
      const refId = t.reference_id;
      const current = transactionsMap.get(refId) || 0;
      transactionsMap.set(refId, current + Number(t.amount || 0));
    });
  }

  const customerCodeMap = new Map<string, string>();
  if (phoneNumbers.length > 0) {
    const { data: customers } = await supabase
      .from('customers')
      .select('phone, code')
      .in('phone', phoneNumbers);

    (customers || []).forEach((c: any) => {
      if (c.phone) {
        customerCodeMap.set(c.phone, c.code || '');
      }
    });
  }

  const receivableDebts: any[] = [];

  for (const contract of contracts || []) {
    const totalAmount = Number(contract.total_amount || 0);
    const paidAmount = transactionsMap.get(contract.id) || 0;
    const remainingAmount = Math.max(0, totalAmount - paidAmount);

    const schedules = contract.payment_schedules || [];
    const pendingSchedules = schedules.filter((s: any) => s.status === 'PENDING' || s.status === 'OVERDUE');

    const schedulesRemaining = pendingSchedules.reduce((sum: number, s: any) => sum + Number(s.amount || 0), 0);
    if (Math.abs(remainingAmount - schedulesRemaining) > 1000) {
      console.warn(`[Debt] Contract ${contract.contract_code}: remainingAmount (${remainingAmount}) khác với tổng payment_schedules (${schedulesRemaining})`);
    }

    if (remainingAmount <= 0) continue;

    const pendingSchedule = pendingSchedules
      .sort((a: any, b: any) => {
        const dateA = a.due_date ? new Date(a.due_date).getTime() : 0;
        const dateB = b.due_date ? new Date(b.due_date).getTime() : 0;
        return dateA - dateB;
      })[0];

    const dueDateRaw = pendingSchedule?.due_date ? new Date(pendingSchedule.due_date) : null;
    const status = calculateDebtStatus(dueDateRaw, remainingAmount);

    receivableDebts.push({
      id: contract.id,
      code: `CN-${contract.contract_code}`,
      type: DebtType.RECEIVABLE,
      partnerId: contract.id,
      partnerName: contract.customer_name || 'N/A',
      partnerCode: contract.customer_phone ? (customerCodeMap.get(contract.customer_phone) || '') : '',
      referenceId: contract.id,
      referenceCode: contract.contract_code,
      totalAmount: totalAmount,
      paidAmount: paidAmount,
      remainingAmount: remainingAmount,
      dueDate: dueDateRaw ? formatDate(dueDateRaw) : '',
      status: status,
      notes: pendingSchedule?.milestone_name || ''
    });
  }

  return receivableDebts;
};

const buildPayableDebts = async () => {
  if (!supabase) {
    throw new Error('Supabase client is not initialized');
  }

  const { data: suppliers, error: suppliersError } = await supabase
    .from('suppliers')
    .select('id, code, name, debt, payment_terms, status')
    .eq('payment_terms', 'DEFERRED')
    .gt('debt', 0)
    .eq('status', 'ACTIVE');

  if (suppliersError) throw suppliersError;

  const pendingTransactionsMap: Record<string, boolean> = {};
  const pendingReferenceIds = new Set<string>();

  const { data: pendingTxns } = await supabase
    .from('transactions')
    .select('reference_id')
    .eq('reference_type', 'SUPPLIER')
    .eq('type', 'EXPENSE')
    .in('status', ['DRAFT', 'PENDING']);

  (pendingTxns || []).forEach((t: any) => {
    if (t.reference_id) {
      pendingReferenceIds.add(String(t.reference_id));
    }
  });

  const payableDebts: any[] = [];

  for (const supplier of suppliers || []) {
    const debt = Number(supplier.debt || 0);
    if (debt <= 0) continue;

    const supplierKeys = [supplier.id, supplier.code].filter(Boolean);

    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('cost, entry_date, supplier_id')
      .in('supplier_id', supplierKeys);

    const totalImportValue = vehicles?.reduce((sum, v) => sum + Number(v.cost || 0), 0) || 0;

    const { data: transactions } = await supabase
      .from('transactions')
      .select('amount, reference_id')
      .eq('reference_type', 'SUPPLIER')
      .in('reference_id', supplierKeys)
      .eq('type', 'EXPENSE')
      .in('status', ['APPROVED', 'LOCKED']);

    const paidAmount = transactions?.reduce((sum, t) => sum + Number(t.amount || 0), 0) || 0;
    const remainingAmount = Math.max(0, totalImportValue - paidAmount);

    const supplierDebt = Number(supplier.debt || 0);
    if (supplierDebt > 0 && Math.abs(remainingAmount - supplierDebt) > 1000) {
      console.warn(`[Debt] Supplier ${supplier.code || supplier.id}: remainingAmount (${remainingAmount}) khác với supplier.debt (${supplierDebt})`);
    }

    if (remainingAmount <= 0) continue;

    const latestEntryDate = vehicles
      ?.map(v => v.entry_date)
      .filter(Boolean)
      .sort()
      .reverse()[0];

    let dueDateRaw: Date | null = null;
    if (latestEntryDate) {
      const entryDate = new Date(latestEntryDate);
      entryDate.setDate(entryDate.getDate() + 30);
      dueDateRaw = entryDate;
    }

    const status = calculateDebtStatus(dueDateRaw, remainingAmount);

    const hasPending = supplierKeys.some(key => pendingReferenceIds.has(String(key)));
    pendingTransactionsMap[supplier.id] = hasPending;

    payableDebts.push({
      id: supplier.id,
      code: `CN-${supplier.code || supplier.id}`,
      type: DebtType.PAYABLE,
      partnerId: supplier.id,
      partnerName: supplier.name || 'N/A',
      partnerCode: supplier.code || '',
      referenceId: supplier.id,
      referenceCode: supplier.code || supplier.id,
      totalAmount: totalImportValue,
      paidAmount: paidAmount,
      remainingAmount: remainingAmount,
      dueDate: dueDateRaw ? formatDate(dueDateRaw) : '',
      status: status,
      notes: 'Công nợ nhà cung cấp'
    });
  }

  return { payableDebts, pendingTransactionsMap };
};

export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase URL hoặc key chưa được cấu hình.' },
        { status: 500 }
      );
    }

    if (!usingServiceRole) {
      console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY not found. Using anon key - RLS policies must allow SELECT.');
    }

    const type = request.nextUrl.searchParams.get('type');
    const debts: any[] = [];
    let pendingTransactionsMap: Record<string, boolean> = {};

    if (type === 'receivable') {
      debts.push(...await buildReceivableDebts());
    } else if (type === 'payable') {
      const payableResult = await buildPayableDebts();
      debts.push(...payableResult.payableDebts);
      pendingTransactionsMap = payableResult.pendingTransactionsMap;
    } else {
      const [receivableDebts, payableResult] = await Promise.all([
        buildReceivableDebts(),
        buildPayableDebts()
      ]);
      debts.push(...receivableDebts, ...payableResult.payableDebts);
      pendingTransactionsMap = payableResult.pendingTransactionsMap;
    }

    return NextResponse.json({
      debts,
      pendingTransactions: pendingTransactionsMap
    });
  } catch (error: any) {
    console.error('Error in debts API:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi server khi tải dữ liệu công nợ' },
      { status: 500 }
    );
  }
}
