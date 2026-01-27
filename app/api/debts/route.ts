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

const buildReceivableDebts = async () => {
  if (!supabase) {
    throw new Error('Supabase client is not initialized');
  }

  // Query từ bảng debt_records thay vì tính toán
  const { data: debtRecords, error: debtRecordsError } = await supabase
    .from('debt_records')
    .select('*')
    .eq('type', 'RECEIVABLE')
    .eq('reference_type', 'CONTRACT')
    .gt('remaining_amount', 0) // Chỉ lấy các công nợ còn lại
    .order('due_date', { ascending: true });

  if (debtRecordsError) {
    console.error('Error fetching receivable debts from debt_records:', debtRecordsError);
    throw debtRecordsError;
  }

  // Map từ debt_records sang format DebtRecord
  const receivableDebts = (debtRecords || []).map((record: any) => ({
    id: record.reference_id, // Sử dụng reference_id (contract.id) làm id
    code: record.code || `CN-${record.reference_code}`,
    type: DebtType.RECEIVABLE,
    partnerId: record.partner_id,
    partnerName: record.partner_name || 'N/A',
    partnerCode: record.partner_code || '',
    referenceId: record.reference_id,
    referenceCode: record.reference_code,
    totalAmount: Number(record.total_amount || 0),
    paidAmount: Number(record.paid_amount || 0),
    remainingAmount: Number(record.remaining_amount || 0),
    dueDate: record.due_date ? formatDate(record.due_date) : '',
    status: record.status as DebtStatus,
    notes: record.notes || ''
  }));

  return receivableDebts;
};

const buildPayableDebts = async () => {
  if (!supabase) {
    throw new Error('Supabase client is not initialized');
  }

  // Query từ bảng debt_records thay vì tính toán
  const { data: debtRecords, error: debtRecordsError } = await supabase
    .from('debt_records')
    .select('*')
    .eq('type', 'PAYABLE')
    .eq('reference_type', 'SUPPLIER')
    .gt('remaining_amount', 0) // Chỉ lấy các công nợ còn lại
    .order('due_date', { ascending: true });

  if (debtRecordsError) {
    console.error('Error fetching payable debts from debt_records:', debtRecordsError);
    throw debtRecordsError;
  }

  // Lấy danh sách pending transactions để hiển thị trạng thái
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

  // Map từ debt_records sang format DebtRecord
  const payableDebts = (debtRecords || []).map((record: any) => {
    const partnerId = record.partner_id;
    const referenceId = record.reference_id;
    
    // Kiểm tra xem có pending transaction không
    const hasPending = pendingReferenceIds.has(String(referenceId)) || 
                      pendingReferenceIds.has(String(partnerId));
    pendingTransactionsMap[partnerId] = hasPending;

    return {
      id: record.reference_id, // Sử dụng reference_id (supplier.id) làm id
      code: record.code || `CN-${record.reference_code}`,
      type: DebtType.PAYABLE,
      partnerId: partnerId,
      partnerName: record.partner_name || 'N/A',
      partnerCode: record.partner_code || '',
      referenceId: referenceId,
      referenceCode: record.reference_code,
      totalAmount: Number(record.total_amount || 0),
      paidAmount: Number(record.paid_amount || 0),
      remainingAmount: Number(record.remaining_amount || 0),
      dueDate: record.due_date ? formatDate(record.due_date) : '',
      status: record.status as DebtStatus,
      notes: record.notes || 'Công nợ nhà cung cấp'
    };
  });

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
