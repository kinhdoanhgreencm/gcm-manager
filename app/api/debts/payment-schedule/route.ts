import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../_supabase';

export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase URL hoặc key chưa được cấu hình.' },
        { status: 500 }
      );
    }

    const contractId = request.nextUrl.searchParams.get('contractId');
    if (!contractId) {
      return NextResponse.json(
        { error: 'contractId là bắt buộc' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('payment_schedules')
      .select('milestone_name, amount, due_date')
      .eq('contract_id', contractId)
      .in('status', ['PENDING', 'OVERDUE'])
      .order('due_date', { ascending: true })
      .limit(1);

    if (error) {
      console.error('Error fetching payment schedule:', error);
      return NextResponse.json(
        { error: error.message || 'Lỗi tải lịch thanh toán' },
        { status: 500 }
      );
    }

    return NextResponse.json({ schedule: data?.[0] || null });
  } catch (error: any) {
    console.error('Error in payment schedule API:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi server khi tải lịch thanh toán' },
      { status: 500 }
    );
  }
}
