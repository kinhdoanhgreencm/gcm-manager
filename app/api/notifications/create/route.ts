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
    const { userIds, title, message, type, referenceType, referenceId, actionUrl, metadata } = body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'userIds phải là một mảng không rỗng' },
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
      console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY not found. Using anon key - RLS policies must allow INSERT.');
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
    console.error('Error in create notifications API:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Lỗi server khi tạo thông báo',
        hint: 'Cần chạy migration SQL trong Supabase SQL Editor. Chọn 1 trong 3 file: migration_fix_notifications_rls_final.sql (khuyến nghị), migration_fix_notifications_insert_only.sql, hoặc migration_disable_rls_insert_notifications.sql',
        usingServiceRole: usingServiceRole,
        migrationFiles: [
          'sql/migration_fix_notifications_rls_final.sql',
          'sql/migration_fix_notifications_insert_only.sql',
          'sql/migration_disable_rls_insert_notifications.sql'
        ],
        alternative: usingServiceRole ? null : 'Hoặc thêm SUPABASE_SERVICE_ROLE_KEY vào .env.local để bypass RLS'
      },
      { status: 500 }
    );
  }
}
