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
      .from('accounts')
      .select('id, name, type, bank_name, account_number, balance, chart_of_account_id')
      .eq('status', 'ACTIVE')
      .order('type', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching accounts:', error);
      return NextResponse.json(
        { error: error.message || 'Lỗi tải tài khoản' },
        { status: 500 }
      );
    }

    return NextResponse.json({ accounts: data || [] });
  } catch (error: any) {
    console.error('Error in accounts API:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi server khi tải tài khoản' },
      { status: 500 }
    );
  }
}
