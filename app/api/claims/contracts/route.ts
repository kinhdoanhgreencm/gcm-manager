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

    const { data, error } = await supabase
      .from('contracts')
      .select('id, contract_code, customer_name, customer_phone')
      .eq('contract_type', 'SALES')
      .order('signed_date', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching contracts:', error);
      return NextResponse.json(
        { error: error.message || 'Lỗi tải danh sách hợp đồng' },
        { status: 500 }
      );
    }

    return NextResponse.json({ contracts: data || [] });
  } catch (error: any) {
    console.error('Error in claims contracts API:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi server khi tải hợp đồng' },
      { status: 500 }
    );
  }
}
