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
      .from('customers')
      .select('id, name, phone, email')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching customers:', error);
      return NextResponse.json(
        { error: error.message || 'Lỗi tải danh sách khách hàng' },
        { status: 500 }
      );
    }

    return NextResponse.json({ customers: data || [] });
  } catch (error: any) {
    console.error('Error in claims customers API:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi server khi tải khách hàng' },
      { status: 500 }
    );
  }
}
