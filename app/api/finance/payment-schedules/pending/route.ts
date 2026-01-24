import { NextResponse } from 'next/server';
import { supabase } from '../../_supabase';

export async function GET() {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase URL hoặc key chưa được cấu hình.' },
        { status: 500 }
      );
    }

    const db = supabase;

    const { data: schedules, error } = await db
      .from('payment_schedules')
      .select(`
        id,
        amount,
        milestone_name,
        status,
        due_date,
        contract_id,
        transaction_id,
        contracts:contract_id (
          id,
          contract_code,
          customer_name,
          customer_phone
        )
      `)
      .in('status', ['PENDING', 'OVERDUE'])
      .is('transaction_id', null)
      .order('due_date', { ascending: true });

    if (error) {
      console.error('Error loading pending schedules:', error);
      return NextResponse.json(
        { error: error.message || 'Lỗi tải lịch thanh toán' },
        { status: 500 }
      );
    }

    const contractIds = [...new Set((schedules || []).map(s => s.contract_id))];
    const contractSchedulesMap = new Map<string, any[]>();

    await Promise.all(
      contractIds.map(async (contractId) => {
        const { data: allContractSchedules } = await db
          .from('payment_schedules')
          .select('id, due_date')
          .eq('contract_id', contractId)
          .order('due_date', { ascending: true });

        if (allContractSchedules) {
          contractSchedulesMap.set(contractId, allContractSchedules);
        }
      })
    );

    const schedulesWithPaymentNumber = (schedules || []).map((schedule: any) => {
      const allContractSchedules = contractSchedulesMap.get(schedule.contract_id) || [];
      const paymentNumber = allContractSchedules.findIndex((s: { id: string }) => s.id === schedule.id) + 1;
      return {
        ...schedule,
        paymentNumber: paymentNumber || 1
      };
    });

    return NextResponse.json({ schedules: schedulesWithPaymentNumber });
  } catch (error: any) {
    console.error('Error in pending schedules API:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi server khi tải lịch thanh toán' },
      { status: 500 }
    );
  }
}
