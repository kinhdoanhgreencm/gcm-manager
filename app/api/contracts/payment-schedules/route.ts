import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../_supabase';

export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase URL hoặc key chưa được cấu hình.' },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const contractId = searchParams.get('contractId');
    const contractIdsParam = searchParams.get('contractIds');

    let contractIds: string[] = [];
    if (contractId) {
      contractIds = [contractId];
    } else if (contractIdsParam) {
      contractIds = contractIdsParam.split(',').map(id => id.trim()).filter(Boolean);
    }

    if (contractIds.length === 0) {
      return NextResponse.json(
        { error: 'Thiếu contractId' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('payment_schedules')
      .select('*')
      .in('contract_id', contractIds)
      .order('due_date', { ascending: true });

    if (error) {
      console.error('Error fetching payment schedules:', error);
      return NextResponse.json(
        { error: error.message || 'Lỗi tải lịch thanh toán' },
        { status: 500 }
      );
    }

    return NextResponse.json({ schedules: data || [] });
  } catch (error: any) {
    console.error('Error in payment schedules API:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi server khi tải lịch thanh toán' },
      { status: 500 }
    );
  }
}
