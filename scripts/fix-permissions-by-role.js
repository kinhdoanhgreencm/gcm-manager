/**
 * Script để tự động sửa permissions dựa trên role của user
 * 
 * Script này sẽ:
 * 1. Kiểm tra permissions của từng user
 * 2. Tự động gán permissions cơ bản dựa trên role
 * 3. Giữ nguyên các permissions đã được gán thủ công
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Vui lòng cấu hình NEXT_PUBLIC_SUPABASE_URL và NEXT_PUBLIC_SUPABASE_ANON_KEY trong file .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Định nghĩa permissions mặc định cho từng role
const defaultPermissionsByRole = {
  'INVENTORY': {
    inventoryView: true,
    inventoryCreate: true,
    inventoryRead: true,
    inventoryUpdate: true,
    inventoryDelete: false, // Có thể cần approval
    inventoryVehicles: true,
    inventoryPrice: true,
    // Có thể cần xem suppliers để nhập xe
    supplierView: true,
    supplierRead: true,
  },
  'ACCOUNTANT': {
    accountingView: true,
    accountingCreate: true,
    accountingRead: true,
    accountingUpdate: true,
    accountingDelete: false, // Cần approval
    accountingPost: true,
    accountingLock: true,
    financeView: true,
    financeCreate: true,
    financeRead: true,
    financeUpdate: true,
    financeApprove: true,
    debtManagementView: true,
    debtManagementCreate: true,
    debtManagementRead: true,
    debtManagementUpdate: true,
  },
  'SALES_CONSULTANT': {
    customerView: true, // Bắt buộc
    customerCreate: true,
    customerRead: true, // Bắt buộc
    customerUpdate: true,
    customerDelete: false,
    customerSelf: true, // Chỉ xem khách hàng của mình
    contractsView: true,
    contractsCreate: true,
    contractsRead: true,
    contractsUpdate: true,
    promotionsView: true,
    promotionsRead: true,
  },
  'ADMIN': {
    // Admin có quyền quản lý staff
    staffView: true, // Bắt buộc
    staffCreate: true,
    staffRead: true,
    staffUpdate: true,
    staffDelete: false, // Cần cẩn thận
    staffAll: true,
    // Có thể cần xem các module khác để quản lý
    customerView: true,
    customerRead: true,
    customerAll: true,
    inventoryView: true,
    inventoryRead: true,
    contractsView: true,
    contractsRead: true,
    contractsApprove: true,
  },
  'STRATEGIC_DIRECTOR': {
    // Giám đốc chiến lược cần xem tất cả nhưng không chỉnh sửa
    reportsView: true,
    reportsExport: true,
    customerView: true,
    customerRead: true,
    customerAll: true,
    staffView: true,
    staffRead: true,
    staffAll: true,
    inventoryView: true,
    inventoryRead: true,
    financeView: true,
    financeRead: true,
    financeApprove: true,
    accountingView: true,
    accountingRead: true,
    contractsView: true,
    contractsRead: true,
    contractsApprove: true,
  },
  'BUSINESS_DIRECTOR': {
    // Giám đốc kinh doanh quản lý sales và customers
    customerView: true, // Bắt buộc
    customerCreate: true,
    customerRead: true,
    customerUpdate: true,
    customerSubordinates: true,
    staffView: true,
    staffCreate: true,
    staffRead: true,
    staffUpdate: true,
    staffSubordinates: true,
    contractsView: true,
    contractsCreate: true,
    contractsRead: true,
    contractsUpdate: true,
    contractsApprove: true,
    inventoryView: true,
    inventoryRead: true,
    promotionsView: true,
    promotionsRead: true,
  },
  'OPERATIONS_DIRECTOR': {
    // Giám đốc vận hành: duyệt hợp đồng, xem kho, hợp đồng
    contractsView: true,
    contractsRead: true,
    contractsApprove: true,
    inventoryView: true,
    inventoryRead: true,
    customerView: true,
    customerRead: true,
    staffView: true,
    staffRead: true,
  },
  'DIRECTOR': {
    // Giám đốc: duyệt hợp đồng, xem toàn diện
    contractsView: true,
    contractsRead: true,
    contractsApprove: true,
    inventoryView: true,
    inventoryRead: true,
    customerView: true,
    customerRead: true,
    customerAll: true,
    staffView: true,
    staffRead: true,
    staffAll: true,
    financeView: true,
    financeRead: true,
  },
  'SALES_MANAGER': {
    customerView: true,
    customerCreate: true,
    customerRead: true,
    customerUpdate: true,
    customerSubordinates: true,
    contractsView: true,
    contractsCreate: true,
    contractsRead: true,
    contractsUpdate: true,
    promotionsView: true,
    promotionsRead: true,
    promotionsCreate: true,
    promotionsUpdate: true,
  },
  'IT': {
    // IT thường chỉ cần dashboard, có thể cần xem một số thông tin để hỗ trợ
    dashboardView: true,
    // Có thể cần xem staff để hỗ trợ
    staffView: true,
    staffRead: true,
  }
};

async function fixPermissionsByRole() {
  console.log('🔧 Bắt đầu sửa permissions dựa trên role...\n');

  // Lấy danh sách tất cả users
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, username, email, full_name, role, branch, status')
    .eq('status', 'ACTIVE');

  if (usersError) {
    console.error('❌ Lỗi khi lấy danh sách users:', usersError.message);
    return;
  }

  if (!users || users.length === 0) {
    console.log('⚠️  Không có user nào trong hệ thống');
    return;
  }

  console.log(`✅ Tìm thấy ${users.length} user(s)\n`);

  let fixedCount = 0;
  let skippedCount = 0;

  for (const user of users) {
    console.log(`\n👤 Xử lý user: ${user.full_name} (${user.username})`);
    console.log(`   Role: ${user.role}`);

    // Lấy permissions hiện tại
    const { data: permissionsData, error: permissionsError } = await supabase
      .from('permissions')
      .select('permissions')
      .eq('user_id', user.id)
      .single();

    const currentPermissions = permissionsData?.permissions || {};

    // Kiểm tra xem role có trong danh sách không
    if (!defaultPermissionsByRole[user.role]) {
      console.log(`   ⚠️  Không có template permissions cho role: ${user.role}`);
      skippedCount++;
      continue;
    }

    // Lấy permissions mặc định cho role
    const defaultPermissions = defaultPermissionsByRole[user.role];

    // Merge: giữ nguyên permissions hiện tại, thêm permissions mặc định nếu chưa có
    const mergedPermissions = {
      ...defaultPermissions,
      ...currentPermissions // Permissions hiện tại sẽ override defaults
    };

    // Chỉ cập nhật nếu có thay đổi
    const hasChanges = JSON.stringify(mergedPermissions) !== JSON.stringify(currentPermissions);

    if (hasChanges) {
      console.log(`   🔄 Cập nhật permissions...`);
      
      // Chỉ lưu permissions có giá trị true (normalize)
      const normalizedPermissions = {};
      for (const [key, value] of Object.entries(mergedPermissions)) {
        if (value === true) {
          normalizedPermissions[key] = true;
        }
      }

      const { error: updateError } = await supabase
        .from('permissions')
        .upsert({
          user_id: user.id,
          permissions: normalizedPermissions
        }, {
          onConflict: 'user_id'
        });

      if (updateError) {
        console.error(`   ❌ Lỗi khi cập nhật permissions: ${updateError.message}`);
      } else {
        console.log(`   ✅ Đã cập nhật permissions thành công`);
        fixedCount++;
        
        // Hiển thị permissions mới được thêm
        const newPermissions = Object.keys(normalizedPermissions).filter(
          key => !currentPermissions[key]
        );
        if (newPermissions.length > 0) {
          console.log(`      → Permissions mới được thêm: ${newPermissions.slice(0, 5).join(', ')}${newPermissions.length > 5 ? '...' : ''}`);
        }
      }
    } else {
      console.log(`   ✓ Permissions đã đúng, không cần cập nhật`);
      skippedCount++;
    }
  }

  // Tổng kết
  console.log('\n' + '='.repeat(60));
  console.log('📊 TỔNG KẾT');
  console.log('='.repeat(60));
  console.log(`Tổng số users: ${users.length}`);
  console.log(`Đã sửa: ${fixedCount}`);
  console.log(`Bỏ qua: ${skippedCount}`);
  console.log('\n💡 Lưu ý: Script này chỉ thêm permissions mặc định cho role.');
  console.log('   Các permissions đã được gán thủ công sẽ được giữ nguyên.');
  console.log('   Chạy lại script test-permissions.js để kiểm tra kết quả.');
}

// Chạy fix
fixPermissionsByRole().catch(error => {
  console.error('❌ Lỗi khi chạy script:', error);
  process.exit(1);
});
