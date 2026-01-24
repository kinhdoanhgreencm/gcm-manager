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

    const searchParams = request.nextUrl.searchParams;
    const phone = searchParams.get('phone');
    const name = searchParams.get('name');

    if (!phone && !name) {
      return NextResponse.json(
        { error: 'Thiếu thông tin khách hàng' },
        { status: 400 }
      );
    }

    let customer = null;
    if (phone) {
      const { data } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', phone)
        .maybeSingle();

      if (data) {
        customer = data;
      }
    }

    if (!customer && name) {
      const { data } = await supabase
        .from('customers')
        .select('*')
        .ilike('name', name)
        .limit(1)
        .maybeSingle();

      if (data) {
        customer = data;
      }
    }

    return NextResponse.json({ customer });
  } catch (error: any) {
    console.error('Error in contract customer lookup API:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi server khi tải khách hàng' },
      { status: 500 }
    );
  }
}
