import { NextResponse } from 'next/server';
import { supabase } from '../../_supabase';

export async function GET() {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase URL hoặc key chưa được cấu hình.' },
        { status: 500 }
      );
    }

    const { data, error } = await supabase
      .from('chart_of_accounts')
      .select('*')
      .eq('is_active', true)
      .order('code', { ascending: true });

    if (error) {
      console.error('Error fetching chart of accounts:', error);
      return NextResponse.json(
        { error: error.message || 'Lỗi tải tài khoản kế toán' },
        { status: 500 }
      );
    }

    return NextResponse.json({ accounts: data || [] });
  } catch (error: any) {
    console.error('Error in chart of accounts API:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi server khi tải tài khoản kế toán' },
      { status: 500 }
    );
  }
}
