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

    const { id: carrierId } = await params;
    if (!carrierId) {
      return errorResponse('Carrier ID is required', 400);
    }

    const { data, error } = await supabase
      .from('carriers')
      .select('*')
      .eq('id', carrierId)
      .single();

    if (error || !data) {
      console.error('Error fetching carrier:', error);
      return errorResponse('Không tìm thấy đơn vị vận chuyển', 404);
    }

    const userIds = [data.created_by, data.updated_by].filter(Boolean);
    let usersMap: Record<string, { full_name: string; email?: string }> = {};
    if (userIds.length > 0) {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, full_name, email')
        .in('id', userIds);

      if (usersData) {
        usersData.forEach((user: any) => {
          usersMap[user.id] = { full_name: user.full_name, email: user.email };
        });
      }
    }

    return NextResponse.json({ carrier: data, users: usersMap });
  } catch (error: any) {
    console.error('Error in carrier detail API:', error);
    return errorResponse(error.message || 'Lỗi server khi tải đơn vị vận chuyển');
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

    const { id: carrierId } = await params;
    if (!carrierId) {
      return errorResponse('Carrier ID is required', 400);
    }

    const body = await request.json();
    const carrier = body?.carrier ?? body;

    const { data, error } = await supabase
      .from('carriers')
      .update(carrier)
      .eq('id', carrierId)
      .select()
      .single();

    if (error) {
      console.error('Error updating carrier:', error);
      return errorResponse(error.message || 'Lỗi cập nhật đơn vị vận chuyển');
    }

    return NextResponse.json({ carrier: data });
  } catch (error: any) {
    console.error('Error in carrier update API:', error);
    return errorResponse(error.message || 'Lỗi server khi cập nhật đơn vị vận chuyển');
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

    const { id: carrierId } = await params;
    if (!carrierId) {
      return errorResponse('Carrier ID is required', 400);
    }

    const { error } = await supabase
      .from('carriers')
      .delete()
      .eq('id', carrierId);

    if (error) {
      console.error('Error deleting carrier:', error);
      return errorResponse(error.message || 'Lỗi xóa đơn vị vận chuyển');
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in carrier delete API:', error);
    return errorResponse(error.message || 'Lỗi server khi xóa đơn vị vận chuyển');
  }
}
