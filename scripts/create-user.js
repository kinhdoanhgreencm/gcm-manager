/**
 * Script để tạo user đầu tiên trong database
 * Chạy: node scripts/create-user.js
 * 
 * Lưu ý: Cần có file .env.local với NEXT_PUBLIC_SUPABASE_URL và NEXT_PUBLIC_SUPABASE_ANON_KEY
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Vui lòng cấu hình NEXT_PUBLIC_SUPABASE_URL và NEXT_PUBLIC_SUPABASE_ANON_KEY trong file .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createUser() {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (query) => new Promise((resolve) => readline.question(query, resolve));

  try {
    console.log('📝 Tạo tài khoản mới\n');

    const username = await question('Tên đăng nhập (username): ');
    const email = await question('Email: ');
    const password = await question('Mật khẩu: ');
    const fullName = await question('Họ và tên: ');
    const phone = await question('Số điện thoại (tùy chọn): ');
    const role = await question('Vai trò (MANAGER/SALES/ACCOUNTANT/INVENTORY/LEGAL) [MANAGER]: ') || 'MANAGER';
    const branch = await question('Chi nhánh [GCM-Tổng]: ') || 'GCM-Tổng';

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Permissions column has been removed from database - all users have full access now

    // Insert user
    const { data, error } = await supabase
      .from('users')
      .insert({
        username,
        email,
        password_hash: passwordHash,
        full_name: fullName,
        phone: phone || null,
        role,
        branch,
        status: 'ACTIVE'
        // permissions column has been removed
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Lỗi khi tạo user:', error.message);
      process.exit(1);
    }

    // Tạo permissions mặc định cho user mới
    if (data && data.id) {
      const { error: permissionsError } = await supabase
        .from('permissions')
        .insert({
          user_id: data.id,
          permissions: {} // Permissions mặc định (tất cả false)
        });

      if (permissionsError) {
        console.warn('⚠️  Lỗi khi tạo permissions mặc định:', permissionsError.message);
        console.warn('   User đã được tạo nhưng chưa có permissions. Vui lòng tạo permissions thủ công.');
      } else {
        console.log('✅ Đã tạo permissions mặc định cho user');
      }
    }

    console.log('\n✅ Tạo user thành công!');
    console.log('📋 Thông tin user:');
    console.log(`   ID: ${data.id}`);
    console.log(`   Username: ${data.username}`);
    console.log(`   Email: ${data.email}`);
    console.log(`   Tên: ${data.full_name}`);
    console.log(`   Vai trò: ${data.role}`);
    console.log(`   Chi nhánh: ${data.branch}`);
    console.log('\n💡 Lưu ý: User mới có permissions mặc định (tất cả false).');
    console.log('   Vui lòng cập nhật permissions cho user này trong trang quản lý nhân sự.');

  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    process.exit(1);
  } finally {
    readline.close();
  }
}

createUser();

