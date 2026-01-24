import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/services/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const { userId, currentPassword, newPassword } = await request.json();

    if (!userId || !currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Vui lòng nhập đầy đủ thông tin' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Mật khẩu mới phải có ít nhất 6 ký tự' },
        { status: 400 }
      );
    }

    // Lấy thông tin user hiện tại - explicitly select columns (exclude permissions)
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('id, username, email, password, full_name, phone, role, branch, status, manager_id, join_date, date_of_birth, id_card, id_card_issue_date, id_card_issue_place, bank_name, bank_account, professional_level, permanent_address, current_address, tax_code, dependents, avatar_url, last_login_at, must_change_password, created_at, updated_at, notes')
      .eq('id', userId)
      .single();

    if (fetchError || !user) {
      return NextResponse.json(
        { error: 'Không tìm thấy người dùng' },
        { status: 404 }
      );
    }

    // Verify current password (plain text comparison)
    if (user.password !== currentPassword) {
      return NextResponse.json(
        { error: 'Mật khẩu hiện tại không đúng' },
        { status: 401 }
      );
    }

    // Cập nhật mật khẩu mới và đánh dấu đã đổi mật khẩu
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ 
        password: newPassword,
        must_change_password: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('id, username, email, password, full_name, phone, role, branch, status, manager_id, join_date, date_of_birth, id_card, id_card_issue_date, id_card_issue_place, bank_name, bank_account, professional_level, permanent_address, current_address, tax_code, dependents, avatar_url, last_login_at, must_change_password, created_at, updated_at, notes')
      .single();

    if (updateError) {
      console.error('Update password error:', updateError);
      return NextResponse.json(
        { error: `Đã xảy ra lỗi khi cập nhật mật khẩu: ${updateError.message}` },
        { status: 500 }
      );
    }

    if (!updatedUser) {
      console.error('Updated user is null');
      return NextResponse.json(
        { error: 'Không thể cập nhật thông tin người dùng' },
        { status: 500 }
      );
    }

    // Trả về user đã cập nhật (không bao gồm password)
    const { password: _, ...userWithoutPassword } = updatedUser;

    return NextResponse.json({
      user: userWithoutPassword,
      message: 'Đổi mật khẩu thành công',
    });
  } catch (error: any) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { error: `Đã xảy ra lỗi khi đổi mật khẩu: ${error?.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}
