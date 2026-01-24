import { NextRequest, NextResponse } from 'next/server';
import { supabase, usingServiceRole } from '../_supabase';
import { linkPaymentSchedules } from '../_helpers';

export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase URL hoặc key chưa được cấu hình.' },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const limitParam = searchParams.get('limit');
    const orderBy = searchParams.get('orderBy') || 'date';
    const order = searchParams.get('order') || 'desc';
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const category = searchParams.get('category');
    const accountId = searchParams.get('accountId');

    let query = supabase
      .from('transactions')
      .select('*')
      .order(orderBy, { ascending: order !== 'desc' })
      .order('created_at', { ascending: order !== 'desc' });

    if (status) query = query.eq('status', status);
    if (type) query = query.eq('type', type);
    if (category) query = query.eq('category', category);
    if (accountId) query = query.eq('account_id', accountId);

    const limit = limitParam ? Number(limitParam) : null;
    if (limit && Number.isFinite(limit)) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error loading transactions:', error);
      return NextResponse.json(
        { error: error.message || 'Lỗi tải giao dịch' },
        { status: 500 }
      );
    }

    return NextResponse.json({ transactions: data || [] });
  } catch (error: any) {
    console.error('Error in transactions list API:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi server khi tải giao dịch' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase URL hoặc key chưa được cấu hình.' },
        { status: 500 }
      );
    }

    if (!usingServiceRole) {
      console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY not found. Using anon key - RLS policies must allow INSERT.');
    }

    const body = await request.json();
    const transaction = body?.transaction ?? body;

    if (!transaction?.amount || !transaction?.type || !transaction?.account_id) {
      return NextResponse.json(
        { error: 'Thiếu thông tin bắt buộc: amount, type, account_id' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('transactions')
      .insert([transaction])
      .select()
      .single();

    if (error) {
      console.error('Error creating transaction:', error);
      return NextResponse.json(
        { error: error.message || 'Lỗi tạo giao dịch' },
        { status: 500 }
      );
    }

    if (data?.reference_id && data.reference_type === 'CONTRACT' && data.type === 'INCOME') {
      try {
        await linkPaymentSchedules(
          data.reference_id,
          data.id,
          Number(data.amount || 0),
          data.description || ''
        );
      } catch (linkError) {
        console.error('Error linking payment schedules:', linkError);
      }
    }

    return NextResponse.json({ transaction: data });
  } catch (error: any) {
    console.error('Error in transaction create API:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi server khi tạo giao dịch' },
      { status: 500 }
    );
  }
}
