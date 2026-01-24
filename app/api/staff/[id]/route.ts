import { NextRequest, NextResponse } from 'next/server';
import { supabase, usingServiceRole } from '../_supabase';

const errorResponse = (message: string, status = 500) => {
  return NextResponse.json({ error: message }, { status });
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!supabase) {
      return errorResponse('Supabase URL hoặc key chưa được cấu hình.');
    }

    const { id } = await params;
    const staffId = id;
    if (!staffId) {
      return errorResponse('Staff ID is required', 400);
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, username, email, full_name, phone, role, branch, status, manager_id, join_date, date_of_birth, id_card, id_card_issue_date, id_card_issue_place, bank_name, bank_account, professional_level, permanent_address, current_address, tax_code, dependents, avatar_url, created_at, notes')
      .eq('id', staffId)
      .single();

    if (userError || !user) {
      console.error('Error fetching staff:', userError);
      return errorResponse('Không tìm thấy thông tin nhân sự', 404);
    }

    const include = request.nextUrl.searchParams.get('include');
    if (include !== 'permissions') {
      return NextResponse.json({ user });
    }

    const { data: permissionsData, error: permissionsError } = await supabase
      .from('permissions')
      .select('permissions')
      .eq('user_id', staffId)
      .single();

    if (permissionsError) {
      console.warn('Error fetching permissions:', permissionsError);
    }

    return NextResponse.json({
      user,
      permissions: permissionsData?.permissions || {}
    });
  } catch (error: any) {
    console.error('Error in staff detail API:', error);
    return errorResponse(error.message || 'Lỗi server khi tải nhân sự');
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
    const staffId = id;
    if (!staffId) {
      return errorResponse('Staff ID is required', 400);
    }

    const body = await request.json();
    const userData = body?.user ?? body;
    const permissions = body?.permissions ?? null;

    if (!userData) {
      return errorResponse('Thiếu dữ liệu cập nhật', 400);
    }

    const { data, error } = await supabase
      .from('users')
      .update(userData)
      .eq('id', staffId)
      .select('id')
      .single();

    if (error) {
      console.error('Error updating staff:', error);
      return errorResponse(error.message || 'Lỗi cập nhật nhân sự');
    }

    if (permissions) {
      const { error: permissionsError } = await supabase
        .from('permissions')
        .upsert({
          user_id: staffId,
          permissions: permissions
        }, {
          onConflict: 'user_id'
        });

      if (permissionsError) {
        console.error('Error saving permissions:', permissionsError);
      }
    }

    return NextResponse.json({ user: data });
  } catch (error: any) {
    console.error('Error in staff update API:', error);
    return errorResponse(error.message || 'Lỗi server khi cập nhật nhân sự');
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
    const staffId = id;
    if (!staffId) {
      return errorResponse('Staff ID is required', 400);
    }

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', staffId);

    if (error) {
      console.error('Error deleting staff:', error);
      return errorResponse(error.message || 'Lỗi xóa nhân sự');
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in staff delete API:', error);
    return errorResponse(error.message || 'Lỗi server khi xóa nhân sự');
  }
}
