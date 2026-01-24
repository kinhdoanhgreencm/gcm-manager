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
    const referenceType = searchParams.get('referenceType');
    const referenceIdsParam = searchParams.get('referenceIds');
    const typesParam = searchParams.get('types');
    const statusesParam = searchParams.get('statuses');
    const orderBy = searchParams.get('orderBy');
    const order = searchParams.get('order') || 'desc';

    if (!referenceType) {
      return NextResponse.json(
        { error: 'referenceType là bắt buộc' },
        { status: 400 }
      );
    }

    const referenceIds = referenceIdsParam
      ? referenceIdsParam.split(',').map(id => id.trim()).filter(Boolean)
      : [];
    const types = typesParam ? typesParam.split(',').map(t => t.trim()).filter(Boolean) : [];
    const statuses = statusesParam ? statusesParam.split(',').map(s => s.trim()).filter(Boolean) : [];

    let query = supabase
      .from('transactions')
      .select('*')
      .eq('reference_type', referenceType);

    if (referenceIds.length > 0) {
      query = query.in('reference_id', referenceIds);
    }

    if (types.length > 0) {
      query = query.in('type', types);
    }

    if (statuses.length > 0) {
      query = query.in('status', statuses);
    }

    if (orderBy) {
      query = query.order(orderBy, { ascending: order !== 'desc' });
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching transactions:', error);
      return NextResponse.json(
        { error: error.message || 'Lỗi tải giao dịch' },
        { status: 500 }
      );
    }

    return NextResponse.json({ transactions: data || [] });
  } catch (error: any) {
    console.error('Error in customers transactions API:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi server khi tải giao dịch' },
      { status: 500 }
    );
  }
}
