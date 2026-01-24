import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/services/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Vui lòng nhập tên đăng nhập và mật khẩu' },
        { status: 400 }
      );
    }

    // Tìm user theo username hoặc email - explicitly select columns (exclude permissions)
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('id, username, email, password, full_name, phone, role, branch, status, manager_id, join_date, date_of_birth, id_card, id_card_issue_date, id_card_issue_place, bank_name, bank_account, professional_level, permanent_address, current_address, tax_code, dependents, avatar_url, last_login_at, must_change_password, created_at, updated_at, notes')
      .or(`username.eq.${username},email.eq.${username}`)
      .eq('status', 'ACTIVE');

    if (fetchError || !users || users.length === 0) {
      return NextResponse.json(
        { error: 'Tên đăng nhập hoặc mật khẩu không đúng' },
        { status: 401 }
      );
    }

    const user = users[0];

    // Verify password (plain text comparison)
    if (user.password !== password) {
      return NextResponse.json(
        { error: 'Tên đăng nhập hoặc mật khẩu không đúng' },
        { status: 401 }
      );
    }

    // Kiểm tra nếu user đăng nhập lần đầu (chưa có last_login_at) thì bắt buộc đổi mật khẩu
    const isFirstLogin = !user.last_login_at;
    const mustChangePassword = isFirstLogin || user.must_change_password === true;

    // Cập nhật last_login_at và must_change_password
    const updatedAt = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        last_login_at: updatedAt,
        must_change_password: mustChangePassword
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating last_login_at:', updateError);
    }

    // Fetch lại user để đảm bảo có dữ liệu mới nhất từ database - explicitly select columns
    const { data: updatedUser, error: refetchError } = await supabase
      .from('users')
      .select('id, username, email, password, full_name, phone, role, branch, status, manager_id, join_date, date_of_birth, id_card, id_card_issue_date, id_card_issue_place, bank_name, bank_account, professional_level, permanent_address, current_address, tax_code, dependents, avatar_url, last_login_at, must_change_password, created_at, updated_at, notes')
      .eq('id', user.id)
      .single();

    // Nếu fetch thành công, dùng dữ liệu mới; nếu không, dùng dữ liệu cũ
    const finalUser = updatedUser || user;

    // Lấy permissions từ bảng permissions riêng
    const { data: permissionsData, error: permissionsError } = await supabase
      .from('permissions')
      .select('permissions')
      .eq('user_id', finalUser.id)
      .single();

    // Trả về thông tin user (không bao gồm password)
    const { password: _, ...userWithoutPassword } = finalUser;

    // Lấy permissions từ bảng permissions, nếu không có thì dùng object rỗng
    let userPermissions: Record<string, boolean> = {};
    if (permissionsData && permissionsData.permissions) {
      userPermissions = permissionsData.permissions as Record<string, boolean>;
    } else if (!permissionsError) {
      // Nếu không có lỗi nhưng không có dữ liệu, tạo permissions mặc định
      // (có thể user chưa có record trong bảng permissions)
      userPermissions = {};
    }

    return NextResponse.json({
      user: {
        ...userWithoutPassword,
        permissions: userPermissions,
        must_change_password: mustChangePassword,
        last_login_at: updatedAt
      },
      message: 'Đăng nhập thành công',
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi đăng nhập' },
      { status: 500 }
    );
  }
}

