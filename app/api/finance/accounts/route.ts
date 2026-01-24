import { NextRequest, NextResponse } from 'next/server';
import { supabase, usingServiceRole } from '../_supabase';

export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase URL hoặc key chưa được cấu hình.' },
        { status: 500 }
      );
    }

    if (!usingServiceRole) {
      console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY not found. Using anon key - RLS policies must allow SELECT.');
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');

    let query = supabase
      .from('accounts')
      .select('id, name, type, bank_name, account_number, balance, chart_of_account_id')
      .order('name', { ascending: true });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error loading accounts:', error);
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
