import { NextRequest, NextResponse } from 'next/server';
import { supabase, usingServiceRole } from '../_supabase';

const errorResponse = (message: string, status = 500) => {
  return NextResponse.json({ error: message }, { status });
};

export async function GET() {
  try {
    if (!supabase) {
      return errorResponse('Supabase URL hoặc key chưa được cấu hình.');
    }

    const { data, error } = await supabase
      .from('carriers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching carriers:', error);
      return errorResponse(error.message || 'Lỗi tải đơn vị vận chuyển');
    }

    const userIds = new Set<string>();
    (data || []).forEach((carrier: any) => {
      if (carrier.created_by) userIds.add(carrier.created_by);
      if (carrier.updated_by) userIds.add(carrier.updated_by);
    });

    let usersMap: Record<string, { full_name: string; email?: string }> = {};
    if (userIds.size > 0) {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, full_name, email')
        .in('id', Array.from(userIds));

      if (usersData) {
        usersData.forEach((user: any) => {
          usersMap[user.id] = { full_name: user.full_name, email: user.email };
        });
      }
    }

    return NextResponse.json({
      carriers: data || [],
      users: usersMap
    });
  } catch (error: any) {
    console.error('Error in carriers API:', error);
    return errorResponse(error.message || 'Lỗi server khi tải đơn vị vận chuyển');
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return errorResponse('Supabase URL hoặc key chưa được cấu hình.');
    }
    if (!usingServiceRole) {
      console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY not found. Using anon key - RLS policies must allow INSERT.');
    }

    const body = await request.json();
    const carrier = body?.carrier ?? body;

    if (!carrier?.name || !carrier?.phone || !carrier?.email || !carrier?.contact_person || !carrier?.address) {
      return errorResponse('Thiếu thông tin bắt buộc', 400);
    }

    const { data, error } = await supabase
      .from('carriers')
      .insert([carrier])
      .select()
      .single();

    if (error) {
      console.error('Error creating carrier:', error);
      return errorResponse(error.message || 'Lỗi tạo đơn vị vận chuyển');
    }

    return NextResponse.json({ carrier: data });
  } catch (error: any) {
    console.error('Error in carriers create API:', error);
    return errorResponse(error.message || 'Lỗi server khi tạo đơn vị vận chuyển');
  }
}
