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

    const searchParams = request.nextUrl.searchParams;
    const contractType = searchParams.get('contractType') || 'SALES';

    const { data, error } = await supabase
      .from('contracts')
      .select('responsible_staff_id, total_amount, status, contract_type')
      .eq('contract_type', contractType);

    if (error) {
      console.error('Error fetching staff contracts stats:', error);
      return NextResponse.json(
        { error: error.message || 'Lỗi tải dữ liệu hợp đồng' },
        { status: 500 }
      );
    }

    return NextResponse.json({ contracts: data || [] });
  } catch (error: any) {
    console.error('Error in staff contracts API:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi server khi tải dữ liệu hợp đồng' },
      { status: 500 }
    );
  }
}
