import { NextRequest, NextResponse } from 'next/server';
import { supabase, usingServiceRole } from '../../_supabase';

const errorResponse = (message: string, status = 500) => {
  return NextResponse.json({ error: message }, { status });
};

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!supabase) {
      return errorResponse('Supabase URL hoặc key chưa được cấu hình.');
    }

    const { id } = await params;
    const promotionId = id;
    if (!promotionId) {
      return errorResponse('Promotion ID is required', 400);
    }

    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('id', promotionId)
      .single();

    if (error || !data) {
      console.error('Error fetching promotion:', error);
      return errorResponse('Không tìm thấy khuyến mãi', 404);
    }

    return NextResponse.json({ promotion: data });
  } catch (error: any) {
    console.error('Error in promotion detail API:', error);
    return errorResponse(error.message || 'Lỗi server khi tải khuyến mãi');
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!supabase) {
      return errorResponse('Supabase URL hoặc key chưa được cấu hình.');
    }
    if (!usingServiceRole) {
      console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY not found. Using anon key - RLS policies must allow UPDATE.');
    }

    const { id } = await params;
    const promotionId = id;
    if (!promotionId) {
      return errorResponse('Promotion ID is required', 400);
    }

    const body = await request.json();
    const promotion = body?.promotion ?? body;

    const { data, error } = await supabase
      .from('promotions')
      .update(promotion)
      .eq('id', promotionId)
      .select()
      .single();

    if (error) {
      console.error('Error updating promotion:', error);
      return errorResponse(error.message || 'Lỗi cập nhật khuyến mãi');
    }

    return NextResponse.json({ promotion: data });
  } catch (error: any) {
    console.error('Error in promotion update API:', error);
    return errorResponse(error.message || 'Lỗi server khi cập nhật khuyến mãi');
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!supabase) {
      return errorResponse('Supabase URL hoặc key chưa được cấu hình.');
    }
    if (!usingServiceRole) {
      console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY not found. Using anon key - RLS policies must allow DELETE.');
    }

    const { id } = await params;
    const promotionId = id;
    if (!promotionId) {
      return errorResponse('Promotion ID is required', 400);
    }

    const { error } = await supabase
      .from('promotions')
      .delete()
      .eq('id', promotionId);

    if (error) {
      console.error('Error deleting promotion:', error);
      return errorResponse(error.message || 'Lỗi xóa khuyến mãi');
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in promotion delete API:', error);
    return errorResponse(error.message || 'Lỗi server khi xóa khuyến mãi');
  }
}
