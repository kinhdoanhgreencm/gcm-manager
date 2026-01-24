import { NextRequest, NextResponse } from 'next/server';
import { supabase, usingServiceRole } from '../_supabase';

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

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (userId) {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching staff by id:', error);
        return NextResponse.json(
          { error: error.message || 'Lỗi tải thông tin nhân viên' },
          { status: 500 }
        );
      }

      return NextResponse.json({ staff: data || null });
    }

    const { data, error } = await supabase
      .from('users')
      .select('id, full_name')
      .eq('status', 'ACTIVE')
      .order('full_name', { ascending: true });

    if (error) {
      console.error('Error fetching staff:', error);
      return NextResponse.json(
        { error: error.message || 'Lỗi tải danh sách nhân viên' },
        { status: 500 }
      );
    }

    return NextResponse.json({ staff: data || [] });
  } catch (error: any) {
    console.error('Error in customers staff API:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi server khi tải danh sách nhân viên' },
      { status: 500 }
    );
  }
}
