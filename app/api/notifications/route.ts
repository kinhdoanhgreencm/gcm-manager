import { NextRequest, NextResponse } from 'next/server';
import { supabase } from './_supabase';

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
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Number(limitParam) : 20;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId là bắt buộc' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(Number.isFinite(limit) && limit > 0 ? limit : 20);

    if (error) {
      console.error('Error fetching notifications:', error);
      return NextResponse.json(
        { error: error.message || 'Lỗi tải thông báo' },
        { status: 500 }
      );
    }

    return NextResponse.json({ notifications: data || [] });
  } catch (error: any) {
    console.error('Error in notifications list API:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi server khi tải thông báo' },
      { status: 500 }
    );
  }
}
