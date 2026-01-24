import { NextRequest, NextResponse } from 'next/server';
import { supabase, usingServiceRole } from '../../../_supabase';

const errorResponse = (message: string, status = 500) => {
  return NextResponse.json({ error: message }, { status });
};

export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return errorResponse('Supabase URL hoặc key chưa được cấu hình.');
    }
    if (!usingServiceRole) {
      console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY not found. Using anon key - RLS policies must allow UPDATE/DELETE.');
    }

    const body = await request.json();
    const contractId = body?.contractId;
    const schedules = body?.schedules || [];

    if (!contractId) {
      return errorResponse('Thiếu contractId', 400);
    }

    const { error: deleteError } = await supabase
      .from('payment_schedules')
      .delete()
      .eq('contract_id', contractId);

    if (deleteError) {
      console.error('Error deleting payment schedules:', deleteError);
    }

    if (Array.isArray(schedules) && schedules.length > 0) {
      const { error: insertError } = await supabase
        .from('payment_schedules')
        .insert(schedules);

      if (insertError) {
        console.error('Error inserting payment schedules:', insertError);
        return errorResponse(insertError.message || 'Lỗi tạo lịch thanh toán');
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in replace schedules API:', error);
    return errorResponse(error.message || 'Lỗi server khi cập nhật lịch thanh toán');
  }
}
