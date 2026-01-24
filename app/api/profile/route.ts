import { NextRequest, NextResponse } from 'next/server';
import { supabase, usingServiceRole } from '../_supabase';

const errorResponse = (message: string, status = 500) => {
  return NextResponse.json({ error: message }, { status });
};

export async function PATCH(request: NextRequest) {
  try {
    if (!supabase) {
      return errorResponse('Supabase URL hoặc key chưa được cấu hình.');
    }
    if (!usingServiceRole) {
      console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY not found. Using anon key - RLS policies must allow UPDATE.');
    }

    const body = await request.json();
    const userId = body?.userId;
    const data = body?.data;

    if (!userId || !data) {
      return errorResponse('Thiếu userId hoặc dữ liệu cập nhật', 400);
    }

    const { error } = await supabase
      .from('users')
      .update(data)
      .eq('id', userId);

    if (error) {
      console.error('Error updating profile:', error);
      return errorResponse(error.message || 'Lỗi cập nhật hồ sơ');
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in profile update API:', error);
    return errorResponse(error.message || 'Lỗi server khi cập nhật hồ sơ');
  }
}
