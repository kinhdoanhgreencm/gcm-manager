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
    const vehicleId = id;
    if (!vehicleId) {
      return errorResponse('Vehicle ID is required', 400);
    }

    const body = await request.json();
    const update = body?.update ?? body;

    const { data, error } = await supabase
      .from('vehicles')
      .update(update)
      .eq('id', vehicleId)
      .select()
      .single();

    if (error) {
      console.error('Error updating vehicle status:', error);
      return errorResponse(error.message || 'Lỗi cập nhật trạng thái xe');
    }

    return NextResponse.json({ vehicle: data });
  } catch (error: any) {
    console.error('Error in vehicle status API:', error);
    return errorResponse(error.message || 'Lỗi server khi cập nhật trạng thái xe');
  }
}
