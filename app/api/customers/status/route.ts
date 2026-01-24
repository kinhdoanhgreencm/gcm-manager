import { NextRequest, NextResponse } from 'next/server';
import { supabase, usingServiceRole } from '../../_supabase';

const errorResponse = (message: string, status = 500) => {
  return NextResponse.json({ error: message }, { status });
};

export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return errorResponse('Supabase URL hoặc key chưa được cấu hình.');
    }
    if (!usingServiceRole) {
      console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY not found. Using anon key - RLS policies must allow UPDATE.');
    }

    const body = await request.json();
    const phone = body?.phone;
    const name = body?.name;
    const status = body?.status || 'TRADING';

    if (!phone && !name) {
      return errorResponse('Thiếu thông tin khách hàng', 400);
    }

    let customerData = null;
    if (phone) {
      const { data } = await supabase
        .from('customers')
        .select('id, status')
        .eq('phone', phone)
        .limit(1)
        .single();
      if (data) {
        customerData = data;
      }
    }

    if (!customerData && name) {
      const { data } = await supabase
        .from('customers')
        .select('id, status')
        .eq('name', name)
        .limit(1)
        .single();
      if (data) {
        customerData = data;
      }
    }

    if (!customerData) {
      return NextResponse.json({ success: false });
    }

    const { error } = await supabase
      .from('customers')
      .update({ status })
      .eq('id', customerData.id);

    if (error) {
      console.error('Error updating customer status:', error);
      return errorResponse(error.message || 'Lỗi cập nhật khách hàng');
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in customer status API:', error);
    return errorResponse(error.message || 'Lỗi server khi cập nhật khách hàng');
  }
}
