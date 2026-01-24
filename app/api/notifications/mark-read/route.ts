import { NextRequest, NextResponse } from 'next/server';
import { supabase, usingServiceRole } from '../_supabase';

export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase URL hoặc key chưa được cấu hình.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { notificationId, userId } = body;

    if (!notificationId) {
      return NextResponse.json(
        { error: 'notificationId là bắt buộc' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'userId là bắt buộc' },
        { status: 400 }
      );
    }

    if (!usingServiceRole) {
      console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY not found. Using anon key - RLS policies must allow UPDATE.');
    }

    // Cập nhật trực tiếp vào database
    const { data, error } = await supabase
      .from('notifications')
      .update({ 
        is_read: true, 
        read_at: new Date().toISOString() 
      })
      .eq('id', notificationId)
      .eq('user_id', userId) // Đảm bảo chỉ cập nhật thông báo của user này
      .select()
      .single();

    if (error) {
      console.error('Error marking notification as read:', error);
      return NextResponse.json(
        { 
          error: error.message || 'Lỗi khi đánh dấu thông báo đã đọc',
          details: error
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      notification: data
    });
  } catch (error: any) {
    console.error('Error in mark-read API:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi server khi đánh dấu thông báo đã đọc' },
      { status: 500 }
    );
  }
}
