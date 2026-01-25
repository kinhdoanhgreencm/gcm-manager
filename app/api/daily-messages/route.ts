import { NextRequest, NextResponse } from 'next/server';
import { supabase, usingServiceRole } from '../_supabase';

const errorResponse = (message: string, status = 500) => {
  return NextResponse.json({ error: message }, { status });
};

// GET: Lấy tất cả daily messages
export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return errorResponse('Supabase URL hoặc key chưa được cấu hình.', 500);
    }

    const { data, error } = await supabase
      .from('daily_messages')
      .select('*')
      .order('department', { ascending: true });

    if (error) {
      console.error('Error fetching daily messages:', error);
      return errorResponse(error.message || 'Lỗi khi lấy lời nhắc', 500);
    }

    return NextResponse.json({ messages: data || [] });
  } catch (error: any) {
    console.error('Error in daily messages GET API:', error);
    return errorResponse(error.message || 'Lỗi server khi lấy lời nhắc', 500);
  }
}

// PATCH: Cập nhật daily message
export async function PATCH(request: NextRequest) {
  try {
    if (!supabase) {
      return errorResponse('Supabase URL hoặc key chưa được cấu hình.', 500);
    }
    if (!usingServiceRole) {
      console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY not found. Using anon key - RLS policies must allow UPDATE.');
    }

    const body = await request.json();
    const { id, message, department, userId } = body;

    if (!id || !message || !department || !userId) {
      return errorResponse('Thiếu thông tin cần thiết (id, message, department, userId)', 400);
    }

    // Kiểm tra quyền của user: chỉ admin, director, operations_director mới được cập nhật
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      return errorResponse('Không tìm thấy người dùng', 404);
    }

    const allowedRoles = ['ADMIN', 'DIRECTOR', 'OPERATIONS_DIRECTOR', 'STRATEGIC_DIRECTOR', 'BUSINESS_DIRECTOR'];
    if (!allowedRoles.includes(userData.role)) {
      return errorResponse('Bạn không có quyền cập nhật lời nhắc', 403);
    }

    // Cập nhật message
    const { data, error } = await supabase
      .from('daily_messages')
      .update({
        message: message.trim(),
        created_by: userId,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating daily message:', error);
      return errorResponse(error.message || 'Lỗi khi cập nhật lời nhắc', 500);
    }

    return NextResponse.json({ message: data, success: true });
  } catch (error: any) {
    console.error('Error in daily messages PATCH API:', error);
    return errorResponse(error.message || 'Lỗi server khi cập nhật lời nhắc', 500);
  }
}
