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
    const { permissionKey, title, message, type, referenceType, referenceId, actionUrl, metadata } = body;

    if (!permissionKey) {
      return NextResponse.json(
        { error: 'permissionKey là bắt buộc' },
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

    const { data: permissions, error: permissionsError } = await supabase
      .from('permissions')
      .select('user_id, permissions');

    if (permissionsError) {
      console.error('Error fetching permissions:', permissionsError);
      return NextResponse.json(
        { error: permissionsError.message || 'Lỗi lấy danh sách permissions' },
        { status: 500 }
      );
    }

    const userIdsWithPermission: string[] = [];
    for (const perm of permissions || []) {
      if (perm.permissions && perm.permissions[permissionKey] === true) {
        userIdsWithPermission.push(perm.user_id);
      }
    }

    if (userIdsWithPermission.length === 0) {
      return NextResponse.json({ success: true, notifications: [], count: 0 });
    }

    const { data: activeUsers, error: usersError } = await supabase
      .from('users')
      .select('id')
      .in('id', userIdsWithPermission)
      .eq('status', 'ACTIVE');

    if (usersError) {
      console.error('Error fetching active users:', usersError);
      return NextResponse.json(
        { error: usersError.message || 'Lỗi lấy danh sách user active' },
        { status: 500 }
      );
    }

    const activeUserIds = (activeUsers || []).map(u => u.id);
    if (activeUserIds.length === 0) {
      return NextResponse.json({ success: true, notifications: [], count: 0 });
    }

    const createdNotifications = await insertNotifications(supabase, {
      userIds: activeUserIds,
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
    console.error('Error in create notifications by permission API:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi server khi tạo thông báo theo permission' },
      { status: 500 }
    );
  }
}
