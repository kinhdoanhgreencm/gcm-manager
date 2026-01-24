import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../_supabase';

const errorResponse = (message: string, status = 500) => {
  return NextResponse.json({ error: message }, { status });
};

const getAllSuperiors = async (userId: string): Promise<string[]> => {
  const superiorIds: string[] = [];
  const visited = new Set<string>();
  let currentUserId: string | null = userId;

  while (currentUserId) {
    if (visited.has(currentUserId)) break;
    visited.add(currentUserId);

    if (!supabase) break;

    const { data: userData }: { data: { manager_id: string | null } | null } = await supabase
      .from('users')
      .select('manager_id')
      .eq('id', currentUserId)
      .single();

    if (!userData || !userData.manager_id) break;
    superiorIds.push(userData.manager_id);
    currentUserId = userData.manager_id;
  }

  return superiorIds;
};

const getAllSubordinates = async (userId: string): Promise<string[]> => {
  const subordinateIds: string[] = [];
  const visited = new Set<string>();

  const collect = async (managerId: string) => {
    if (visited.has(managerId)) return;
    visited.add(managerId);

    if (!supabase) return;

    const { data: subs } = await supabase
      .from('users')
      .select('id')
      .eq('manager_id', managerId);

    if (subs && subs.length > 0) {
      for (const sub of subs) {
        subordinateIds.push(sub.id);
        await collect(sub.id);
      }
    }
  };

  await collect(userId);
  return subordinateIds;
};

const transformTransaction = (t: any) => ({
  id: t.id,
  date: t.date,
  amount: Number(t.amount) || 0,
  type: t.type,
  category: t.category,
  description: t.description || '',
  accountId: t.account_id,
  toAccountId: t.to_account_id || undefined,
  referenceId: t.reference_id || undefined,
  referenceType: t.reference_type || undefined,
  paymentMethod: t.payment_method,
  status: t.status,
  creatorId: t.creator_id,
  approverId: t.approver_id || undefined,
  attachments: t.attachments || undefined,
  approvedAt: t.approved_at || undefined
});

export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return errorResponse('Supabase URL hoặc key chưa được cấu hình.');
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const role = searchParams.get('role') || '';
    const contractType = searchParams.get('contractType') || 'SALES';

    if (!userId) {
      return errorResponse('Thiếu userId', 400);
    }

    const allowedRoles = ['ADMIN', 'DIRECTOR', 'OPERATIONS_DIRECTOR'];
    const canViewAllContracts = allowedRoles.includes(role);

    let query = supabase
      .from('contracts')
      .select('*')
      .eq('contract_type', contractType);

    if (!canViewAllContracts) {
      if (role === 'DRIVER_RECRUITMENT_POINT') {
        query = query.eq('created_by', userId);
      } else {
        const superiors = await getAllSuperiors(userId);
        const subordinates = await getAllSubordinates(userId);
        const allowedUserIds = Array.from(new Set([userId, ...superiors, ...subordinates]));
        query = query.in('created_by', allowedUserIds);
      }
    }

    const { data: contractsData, error: contractsError } = await query.order('signed_date', { ascending: false });

    if (contractsError) {
      console.error('Error fetching contracts:', contractsError);
      return errorResponse(contractsError.message || 'Lỗi tải hợp đồng');
    }

    if (!contractsData || contractsData.length === 0) {
      return NextResponse.json({
        contracts: [],
        approvedTransactions: [],
        allTransactions: [],
        staffMap: {}
      });
    }

    const contractIds = contractsData.map((c: any) => c.id);

    const staffIds = new Set<string>();
    contractsData.forEach((c: any) => {
      if (c.responsible_staff_id) staffIds.add(c.responsible_staff_id);
      if (c.updated_by) staffIds.add(c.updated_by);
    });

    const staffMap = new Map<string, { id: string; name: string; username?: string }>();
    if (staffIds.size > 0) {
      const { data: staffData } = await supabase
        .from('users')
        .select('id, full_name, username')
        .in('id', Array.from(staffIds));

      (staffData || []).forEach((staff: any) => {
        staffMap.set(staff.id, {
          id: staff.id,
          name: staff.full_name || staff.username || '',
          username: staff.username
        });
      });
    }

    const { data: schedulesData } = await supabase
      .from('payment_schedules')
      .select('*')
      .in('contract_id', contractIds)
      .order('due_date', { ascending: true });

    const { data: approvedTransactionsRaw } = await supabase
      .from('transactions')
      .select('*')
      .eq('reference_type', 'CONTRACT')
      .in('reference_id', contractIds)
      .in('status', ['APPROVED', 'LOCKED']);

    const { data: allTransactionsRaw } = await supabase
      .from('transactions')
      .select('*')
      .eq('reference_type', 'CONTRACT')
      .in('reference_id', contractIds);

    const approvedTransactions = (approvedTransactionsRaw || []).map(transformTransaction);
    const allTransactions = (allTransactionsRaw || []).map(transformTransaction);

    const transformedContracts = contractsData.map((c: any) => {
      const contractSchedules = (schedulesData || []).filter((s: any) => s.contract_id === c.id);
      const contractTransactions = (approvedTransactionsRaw || []).filter(
        (t: any) => t.reference_id === c.id && t.type === 'INCOME'
      );
      const actualPaidAmount = contractTransactions.reduce(
        (sum: number, t: any) => sum + (Number(t.amount) || 0),
        0
      );
      const finalPaidAmount = actualPaidAmount > 0 ? actualPaidAmount : (Number(c.paid_amount) || 0);

      const staffInfo = c.responsible_staff_id ? staffMap.get(c.responsible_staff_id) : undefined;
      const approverInfo = c.updated_by ? staffMap.get(c.updated_by) : undefined;

      return {
        id: c.id,
        contractCode: c.contract_code || '',
        vehicleId: c.vehicle_id || '',
        depositContractId: c.deposit_contract_id || undefined,
        customerName: c.customer_name || '',
        customerPhone: c.customer_phone || '',
        customerIDCard: c.customer_id_card || '',
        customerAddress: c.customer_address || '',
        carPrice: Number(c.car_price) || 0,
        vatAmount: Number(c.vat_amount) || 0,
        registrationFee: Number(c.registration_fee) || 0,
        insuranceFee: Number(c.insurance_fee) || 0,
        discount: Number(c.discount) || 0,
        totalAmount: Number(c.total_amount) || 0,
        paidAmount: finalPaidAmount,
        paymentType: c.payment_type,
        bankName: c.bank_name || undefined,
        loanAmount: c.loan_amount ? Number(c.loan_amount) : undefined,
        signedDate: c.signed_date || '',
        status: c.status,
        responsibleStaffId: c.responsible_staff_id || undefined,
        responsibleStaffName: staffInfo?.name || undefined,
        approverId: c.updated_by || undefined,
        approverName: approverInfo?.name || undefined,
        schedules: contractSchedules.map((s: any) => ({
          id: s.id,
          contractId: s.contract_id,
          milestoneName: s.milestone_name || '',
          amount: Number(s.amount) || 0,
          dueDate: s.due_date || '',
          status: s.status
        }))
      };
    });

    return NextResponse.json({
      contracts: transformedContracts,
      approvedTransactions,
      allTransactions,
      staffMap: Object.fromEntries(staffMap)
    });
  } catch (error: any) {
    console.error('Error in contracts overview API:', error);
    return errorResponse(error.message || 'Lỗi server khi tải hợp đồng');
  }
}
