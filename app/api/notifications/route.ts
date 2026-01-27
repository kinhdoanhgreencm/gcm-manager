import { NextRequest, NextResponse } from 'next/server';
import { supabase } from './_supabase';

export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
      const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
      const hasAnonKey = !!(process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
      
      console.error('Notifications API: Supabase client not initialized', {
        hasUrl: !!supabaseUrl,
        hasServiceKey,
        hasAnonKey,
        message: 'Please check your .env.local file for SUPABASE_URL and SUPABASE keys'
      });
      
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
      console.warn('Notifications API: userId is missing');
      return NextResponse.json(
        { error: 'userId là bắt buộc' },
        { status: 400 }
      );
    }

    // Validate userId format (should be UUID)
    if (typeof userId !== 'string' || userId.trim().length === 0) {
      console.warn('Notifications API: Invalid userId format', { userId });
      return NextResponse.json(
        { error: 'userId không hợp lệ' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId.trim())
      .order('created_at', { ascending: false })
      .limit(Number.isFinite(limit) && limit > 0 ? limit : 20);

    if (error) {
      console.error('Error fetching notifications from Supabase:', {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        userId
      });
      return NextResponse.json(
        { error: error.message || 'Lỗi tải thông báo' },
        { status: 500 }
      );
    }

    return NextResponse.json({ notifications: data || [] });
  } catch (error: any) {
    console.error('Error in notifications list API:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return NextResponse.json(
      { error: error.message || 'Lỗi server khi tải thông báo' },
      { status: 500 }
    );
  }
}
