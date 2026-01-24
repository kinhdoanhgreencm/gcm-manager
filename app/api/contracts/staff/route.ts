import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../_supabase';

export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase URL hoặc key chưa được cấu hình.' },
        { status: 500 }
      );
    }

    const idsParam = request.nextUrl.searchParams.get('ids');
    if (!idsParam) {
      return NextResponse.json({ staff: [] });
    }

    const ids = idsParam.split(',').map(id => id.trim()).filter(Boolean);
    if (ids.length === 0) {
      return NextResponse.json({ staff: [] });
    }

    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, username')
      .in('id', ids);

    if (error) {
      console.error('Error fetching staff:', error);
      return NextResponse.json(
        { error: error.message || 'Lỗi tải nhân sự' },
        { status: 500 }
      );
    }

    return NextResponse.json({ staff: data || [] });
  } catch (error: any) {
    console.error('Error in contracts staff API:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi server khi tải nhân sự' },
      { status: 500 }
    );
  }
}
