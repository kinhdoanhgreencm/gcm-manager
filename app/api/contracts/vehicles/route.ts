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
      .from('vehicles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching vehicles:', error);
      return NextResponse.json(
        { error: error.message || 'Lỗi tải danh sách xe' },
        { status: 500 }
      );
    }

    return NextResponse.json({ vehicles: data || [] });
  } catch (error: any) {
    console.error('Error in contracts vehicles API:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi server khi tải danh sách xe' },
      { status: 500 }
    );
  }
}
