import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../_supabase';

export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase URL hoặc key chưa được cấu hình.' },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId là bắt buộc' },
        { status: 400 }
      );
    }

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Error getting unread count:', error);
      return NextResponse.json(
        { error: error.message || 'Lỗi tải số lượng thông báo chưa đọc' },
        { status: 500 }
      );
    }

    return NextResponse.json({ count: count || 0 });
  } catch (error: any) {
    console.error('Error in unread count API:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi server khi tải số lượng thông báo' },
      { status: 500 }
    );
  }
}
