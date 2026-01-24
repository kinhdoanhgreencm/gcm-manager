import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../_supabase';

const getSelectFields = (fields: string | null) => {
  switch (fields) {
    case 'summary':
      return 'id, customer_name, customer_phone, paid_amount, total_amount, status';
    case 'overview':
      return 'id, vehicle_id, status';
    case 'status':
      return 'id, status';
    case 'details':
      return '*';
    default:
      return '*';
  }
};

export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase URL hoặc key chưa được cấu hình.' },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const contractType = searchParams.get('contractType') || 'SALES';
    const customerName = searchParams.get('customerName');
    const customerPhone = searchParams.get('customerPhone');
    const idsParam = searchParams.get('ids');
    const ids = idsParam ? idsParam.split(',').map(id => id.trim()).filter(Boolean) : [];
    const fields = searchParams.get('fields');
    const orderBy = searchParams.get('orderBy');
    const order = searchParams.get('order') || 'desc';

    let query = supabase
      .from('contracts')
      .select(getSelectFields(fields))
      .eq('contract_type', contractType);

    if (ids.length > 0) {
      query = query.in('id', ids);
    }

    if (customerPhone) {
      query = query.eq('customer_phone', customerPhone);
    } else if (customerName) {
      query = query.ilike('customer_name', customerName);
    }

    if (orderBy) {
      query = query.order(orderBy, { ascending: order !== 'desc' });
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching contracts:', error);
      return NextResponse.json(
        { error: error.message || 'Lỗi tải hợp đồng' },
        { status: 500 }
      );
    }

    return NextResponse.json({ contracts: data || [] });
  } catch (error: any) {
    console.error('Error in customers contracts API:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi server khi tải hợp đồng' },
      { status: 500 }
    );
  }
}
