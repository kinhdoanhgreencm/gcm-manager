import { NextRequest, NextResponse } from 'next/server';
import { supabase, usingServiceRole } from '../_supabase';
import { insertNotifications } from '../_helpers';

export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase URL hoặc key chưa được cấu hình.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { roles, title, message, type, referenceType, referenceId, actionUrl, metadata } = body;

    if (!roles || !Array.isArray(roles) || roles.length === 0) {
      return NextResponse.json(
        { error: 'roles phải là một mảng không rỗng' },
        { status: 400 }
      );
    }

    if (!title || !message) {
      return NextResponse.json(
        { error: 'title và message là bắt buộc' },
        { status: 400 }
      );
    }

    if (!usingServiceRole) {
      console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY not found. Using anon key - RLS policies must allow SELECT/INSERT.');
    }

    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id')
      .in('role', roles)
      .eq('status', 'ACTIVE');

    if (usersError) {
      console.error('Error fetching users by roles:', usersError);
      return NextResponse.json(
        { error: usersError.message || 'Lỗi lấy danh sách user theo role' },
        { status: 500 }
      );
    }

    const userIds = (users || []).map(u => u.id);
    if (userIds.length === 0) {
      return NextResponse.json({ success: true, notifications: [], count: 0 });
    }

    const createdNotifications = await insertNotifications(supabase, {
      userIds,
      title,
      message,
      type: type || 'INFO',
      referenceType,
      referenceId,
      actionUrl,
      metadata
    });

    return NextResponse.json({
      success: true,
      notifications: createdNotifications || [],
      count: createdNotifications?.length || 0
    });
  } catch (error: any) {
    console.error('Error in create notifications by roles API:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi server khi tạo thông báo theo role' },
      { status: 500 }
    );
  }
}
