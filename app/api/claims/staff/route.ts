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
      .from('users')
      .select('id, full_name, username')
      .eq('status', 'ACTIVE')
      .order('full_name', { ascending: true });

    if (error) {
      console.error('Error fetching staff:', error);
      return NextResponse.json(
        { error: error.message || 'Lỗi tải danh sách nhân sự' },
        { status: 500 }
      );
    }

    return NextResponse.json({ staff: data || [] });
  } catch (error: any) {
    console.error('Error in claims staff API:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi server khi tải nhân sự' },
      { status: 500 }
    );
  }
}
