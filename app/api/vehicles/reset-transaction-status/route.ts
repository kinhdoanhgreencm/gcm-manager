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
    const vehicleId = body?.vehicleId;
    if (!vehicleId) {
      return errorResponse('Thiếu vehicleId', 400);
    }

    const { error } = await supabase
      .from('vehicles')
      .update({
        transaction_status: 'Sẵn sàng giao dịch',
        status: 'AVAILABLE'
      })
      .eq('id', vehicleId);

    if (error) {
      console.error('Error resetting vehicle status:', error);
      return errorResponse(error.message || 'Lỗi cập nhật trạng thái xe');
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in vehicle reset API:', error);
    return errorResponse(error.message || 'Lỗi server khi cập nhật trạng thái xe');
  }
}
