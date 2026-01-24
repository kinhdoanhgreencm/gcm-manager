import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../_supabase';

const getVehicleFields = (fields: string | null) => {
  switch (fields) {
    case 'overview':
      return 'id, transaction_status';
    case 'details':
      return 'id, make, model, year, color, vin, code';
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

    const idsParam = request.nextUrl.searchParams.get('ids');
    const fields = request.nextUrl.searchParams.get('fields');
    const ids = idsParam ? idsParam.split(',').map(id => id.trim()).filter(Boolean) : [];

    if (ids.length === 0) {
      return NextResponse.json({ vehicles: [] });
    }

    const { data, error } = await supabase
      .from('vehicles')
      .select(getVehicleFields(fields))
      .in('id', ids);

    if (error) {
      console.error('Error fetching vehicles:', error);
      return NextResponse.json(
        { error: error.message || 'Lỗi tải xe' },
        { status: 500 }
      );
    }

    return NextResponse.json({ vehicles: data || [] });
  } catch (error: any) {
    console.error('Error in customers vehicles API:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi server khi tải xe' },
      { status: 500 }
    );
  }
}
