import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/services/supabaseClient';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Explicitly select columns (exclude permissions as it's in separate table)
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, email, password, full_name, phone, role, branch, status, manager_id, join_date, date_of_birth, id_card, id_card_issue_date, id_card_issue_place, bank_name, bank_account, professional_level, permanent_address, current_address, tax_code, dependents, avatar_url, last_login_at, must_change_password, created_at, updated_at, notes')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Lấy permissions từ bảng permissions riêng
    const { data: permissionsData, error: permissionsError } = await supabase
      .from('permissions')
      .select('permissions')
      .eq('user_id', userId)
      .single();

    // Trả về thông tin user (không bao gồm password)
    const { password: _, ...userWithoutPassword } = user;

    // Lấy permissions từ bảng permissions, nếu không có thì dùng object rỗng
    let userPermissions: Record<string, boolean> = {};
    if (permissionsData && permissionsData.permissions) {
      userPermissions = permissionsData.permissions as Record<string, boolean>;
    } else if (!permissionsError) {
      // Nếu không có lỗi nhưng không có dữ liệu, tạo permissions mặc định
      userPermissions = {};
    }

    return NextResponse.json({
      user: {
        ...userWithoutPassword,
        permissions: userPermissions
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi lấy thông tin người dùng' },
      { status: 500 }
    );
  }
}
