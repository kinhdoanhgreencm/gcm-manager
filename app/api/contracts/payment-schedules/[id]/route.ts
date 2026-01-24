import { NextRequest, NextResponse } from 'next/server';
import { supabase, usingServiceRole } from '../../../_supabase';

const errorResponse = (message: string, status = 500) => {
  return NextResponse.json({ error: message }, { status });
};

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!supabase) {
      return errorResponse('Supabase URL hoặc key chưa được cấu hình.');
    }
    if (!usingServiceRole) {
      console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY not found. Using anon key - RLS policies must allow UPDATE.');
    }

    const { id } = await params;
    const scheduleId = id;
    if (!scheduleId) {
      return errorResponse('Schedule ID is required', 400);
    }

    const body = await request.json();
    const update = body?.update ?? body;

    const { data, error } = await supabase
      .from('payment_schedules')
      .update(update)
      .eq('id', scheduleId)
      .select()
      .single();

    if (error) {
      console.error('Error updating payment schedule:', error);
      return errorResponse(error.message || 'Lỗi cập nhật lịch thanh toán');
    }

    return NextResponse.json({ schedule: data });
  } catch (error: any) {
    console.error('Error in payment schedule update API:', error);
    return errorResponse(error.message || 'Lỗi server khi cập nhật lịch thanh toán');
  }
}
