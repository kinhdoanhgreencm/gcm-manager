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

    const managerId = request.nextUrl.searchParams.get('managerId');
    if (!managerId) {
      return NextResponse.json(
        { error: 'managerId là bắt buộc' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('manager_id', managerId);

    if (error) {
      console.error('Error fetching subordinates:', error);
      return NextResponse.json(
        { error: error.message || 'Lỗi tải danh sách nhân viên cấp dưới' },
        { status: 500 }
      );
    }

    const ids = (data || []).map((s: any) => s.id);
    return NextResponse.json({ subordinates: ids });
  } catch (error: any) {
    console.error('Error in customers subordinates API:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi server khi tải danh sách nhân viên cấp dưới' },
      { status: 500 }
    );
  }
}
