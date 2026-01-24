/**
 * Script kiểm tra hệ thống phân quyền
 * 
 * Script này sẽ kiểm tra:
 * 1. Permissions được load đúng khi đăng nhập
 * 2. PermissionGuard hoạt động đúng với các route
 * 3. Sidebar menu hiển thị đúng theo permissions
 * 4. Permissions được lưu đúng khi tạo/cập nhật user
 * 5. Permissions được load đúng khi edit user
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

// Permission categories từ utils/permissions.ts
const PermissionCategories = {
  contracts: ['contractsView', 'contractsCreate', 'contractsRead', 'contractsUpdate', 'contractsDelete', 'contracts'],
  customers: ['customerView', 'customerCreate', 'customerRead', 'customerUpdate', 'customerDelete', 'customerSelf', 'customerSubordinates', 'customerAll'],
  inventory: ['inventoryView', 'inventoryCreate', 'inventoryRead', 'inventoryUpdate', 'inventoryDelete', 'inventoryVehicles', 'inventoryPrice'],
  suppliers: ['supplierView', 'supplierCreate', 'supplierRead', 'supplierUpdate', 'supplierDelete', 'supplierInfo', 'supplierDebt'],
  staff: ['staffView', 'staffCreate', 'staffRead', 'staffUpdate', 'staffDelete', 'staffSubordinates', 'staffAll'],
  promotions: ['promotionsView', 'promotionsCreate', 'promotionsRead', 'promotionsUpdate', 'promotionsDelete'],
  carriers: ['carriersView', 'carriersCreate', 'carriersRead', 'carriersUpdate', 'carriersDelete'],
  finance: ['financeView', 'financeCreate', 'financeRead', 'financeUpdate', 'financeDelete', 'financeApprove', 'finance'],
  debt: ['debtManagementView', 'debtManagementCreate', 'debtManagementRead', 'debtManagementUpdate', 'debtManagementDelete', 'debtManagement'],
  accounting: ['accountingView', 'accountingCreate', 'accountingRead', 'accountingUpdate', 'accountingDelete', 'accountingPost', 'accountingLock'],
  registration: ['registrationView', 'registrationUpdate', 'registration'],
  reports: ['reportsView', 'reportsExport', 'reports'],
  dashboard: ['dashboardView'],
};

// Route permissions từ PermissionGuard
const routePermissions = {
  '/dashboard': [],
  '/inventory': PermissionCategories.inventory,
  '/suppliers': PermissionCategories.suppliers,
  '/crm': PermissionCategories.customers,
  '/staff': PermissionCategories.staff,
  '/debt': PermissionCategories.debt,
  '/finance': PermissionCategories.finance,
  '/accounting': PermissionCategories.accounting,
  '/contracts': PermissionCategories.contracts,
  '/promotions': PermissionCategories.promotions,
  '/carriers': PermissionCategories.carriers,
  '/registration': PermissionCategories.registration,
  '/reports': PermissionCategories.reports,
  '/profile': [],
  '/settings': [],
};

// Helper function để check permissions (từ utils/permissions.ts)
function hasAnyPermission(permissions, permissionKeys) {
  if (!permissions) {
    return false;
  }
  return permissionKeys.some(key => permissions[key] === true);
}

async function testPermissions() {
  console.log('🔍 Bắt đầu kiểm tra hệ thống phân quyền...\n');

  // 1. Lấy danh sách tất cả users
  console.log('📋 Bước 1: Lấy danh sách tất cả users...');
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

  // 2. Kiểm tra permissions cho từng user
  let totalIssues = 0;
  const issues = [];

  for (const user of users) {
    console.log(`\n👤 Kiểm tra user: ${user.full_name} (${user.username})`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Branch: ${user.branch}`);

    // Lấy permissions từ bảng permissions
    const { data: permissionsData, error: permissionsError } = await supabase
      .from('permissions')
      .select('permissions')
      .eq('user_id', user.id)
      .single();

    if (permissionsError && permissionsError.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      console.error(`   ❌ Lỗi khi lấy permissions: ${permissionsError.message}`);
      totalIssues++;
      issues.push({
        user: user.username,
        issue: `Lỗi khi lấy permissions: ${permissionsError.message}`
      });
      continue;
    }

    const userPermissions = permissionsData?.permissions || {};

    // Kiểm tra xem user có permissions object không
    if (!permissionsData) {
      console.log(`   ⚠️  User chưa có record trong bảng permissions`);
      totalIssues++;
      issues.push({
        user: user.username,
        issue: 'User chưa có record trong bảng permissions'
      });
    } else {
      console.log(`   ✅ Có record permissions trong database`);
    }

    // Đếm số permissions được bật
    const enabledPermissions = Object.entries(userPermissions).filter(([_, value]) => value === true);
    const totalPermissionKeys = Object.keys(userPermissions).length;
    console.log(`   📊 Số permissions được bật: ${enabledPermissions.length}/${totalPermissionKeys > 0 ? totalPermissionKeys : 'N/A'}`);

    // Kiểm tra sự không nhất quán giữa role và permissions
    const rolePermissionMismatches = [];
    
    // Định nghĩa permissions mong đợi cho từng role
    const expectedPermissionsByRole = {
      'INVENTORY': {
        required: ['inventoryView', 'inventoryRead'],
        expected: ['inventoryView', 'inventoryCreate', 'inventoryRead', 'inventoryUpdate', 'inventoryDelete']
      },
      'ACCOUNTANT': {
        required: ['accountingView', 'accountingRead'],
        expected: ['accountingView', 'accountingCreate', 'accountingRead', 'accountingUpdate', 'financeView', 'financeRead', 'debtManagementView']
      },
      'SALES_CONSULTANT': {
        required: ['customerView', 'customerRead'],
        expected: ['customerView', 'customerCreate', 'customerRead', 'customerUpdate', 'customerSelf', 'contractsView', 'contractsCreate', 'contractsRead']
      },
      'ADMIN': {
        required: ['staffView', 'staffRead'],
        expected: ['staffView', 'staffCreate', 'staffRead', 'staffUpdate', 'staffDelete', 'staffAll']
      },
      'STRATEGIC_DIRECTOR': {
        required: ['reportsView'],
        expected: ['reportsView', 'reportsExport', 'customerAll', 'staffAll']
      },
      'BUSINESS_DIRECTOR': {
        required: ['customerView'],
        expected: ['customerView', 'customerRead', 'customerSubordinates', 'staffSubordinates']
      }
    };

    const roleExpectations = expectedPermissionsByRole[user.role];
    if (roleExpectations) {
      const missingRequired = roleExpectations.required.filter(perm => !userPermissions[perm]);
      if (missingRequired.length > 0) {
        rolePermissionMismatches.push({
          type: 'missing_required',
          permissions: missingRequired,
          message: `Role ${user.role} thiếu permissions bắt buộc: ${missingRequired.join(', ')}`
        });
        totalIssues++;
        issues.push({
          user: user.username,
          issue: `Role ${user.role} thiếu permissions bắt buộc: ${missingRequired.join(', ')}`
        });
      }
    }

    // Kiểm tra từng route
    console.log(`   🔐 Kiểm tra quyền truy cập các route:`);
    for (const [route, requiredPermissions] of Object.entries(routePermissions)) {
      if (requiredPermissions.length === 0) {
        // Route không yêu cầu permissions (dashboard, profile, settings)
        continue;
      }

      const hasAccess = hasAnyPermission(userPermissions, requiredPermissions);
      const status = hasAccess ? '✅' : '❌';
      console.log(`      ${status} ${route}: ${hasAccess ? 'Có quyền' : 'Không có quyền'}`);

      // Kiểm tra xem có permissions nào trong category được bật không
      const enabledInCategory = requiredPermissions.filter(key => userPermissions[key] === true);
      if (enabledInCategory.length > 0) {
        console.log(`         → Permissions được bật: ${enabledInCategory.join(', ')}`);
      }
    }

    // Kiểm tra menu items sẽ hiển thị
    const menuItems = [
      { id: 'dashboard', label: 'Tổng quan', permissions: PermissionCategories.dashboard },
      { id: 'inventory', label: 'Kho xe', permissions: PermissionCategories.inventory },
      { id: 'suppliers', label: 'Nhà cung cấp', permissions: PermissionCategories.suppliers },
      { id: 'crm', label: 'Khách hàng', permissions: PermissionCategories.customers },
      { id: 'staff', label: 'Nhân sự', permissions: PermissionCategories.staff },
      { id: 'debt', label: 'Quản lý Công nợ', permissions: PermissionCategories.debt },
      { id: 'finance', label: 'Thu chi & Dòng tiền', permissions: PermissionCategories.finance },
      { id: 'accounting', label: 'Kế toán', permissions: PermissionCategories.accounting },
      { id: 'contracts', label: 'Hợp đồng', permissions: PermissionCategories.contracts },
      { id: 'promotions', label: 'CTKM', permissions: PermissionCategories.promotions },
      { id: 'carriers', label: 'Đơn vị vận chuyển', permissions: PermissionCategories.carriers },
      { id: 'registration', label: 'Hồ sơ đăng kiểm', permissions: PermissionCategories.registration },
      { id: 'reports', label: 'Báo cáo', permissions: PermissionCategories.reports },
    ];

    const visibleMenuItems = menuItems.filter(item => {
      if (item.id === 'dashboard') {
        return true; // Dashboard luôn hiển thị
      }
      return hasAnyPermission(userPermissions, item.permissions);
    });

    console.log(`   📱 Menu items sẽ hiển thị (${visibleMenuItems.length}/${menuItems.length}):`);
    visibleMenuItems.forEach(item => {
      console.log(`      ✓ ${item.label}`);
    });

    const hiddenMenuItems = menuItems.filter(item => {
      if (item.id === 'dashboard') {
        return false; // Dashboard luôn hiển thị
      }
      return !hasAnyPermission(userPermissions, item.permissions);
    });

    if (hiddenMenuItems.length > 0) {
      console.log(`   🚫 Menu items sẽ bị ẩn (${hiddenMenuItems.length}):`);
      hiddenMenuItems.forEach(item => {
        console.log(`      ✗ ${item.label}`);
      });
    }

    // Hiển thị cảnh báo về sự không nhất quán
    if (rolePermissionMismatches.length > 0) {
      console.log(`   ⚠️  CẢNH BÁO - Sự không nhất quán giữa Role và Permissions:`);
      rolePermissionMismatches.forEach(mismatch => {
        console.log(`      ⚠️  ${mismatch.message}`);
      });
    }

    // Kiểm tra trường hợp đặc biệt: INVENTORY role không có inventory permissions
    if (user.role === 'INVENTORY') {
      const hasInventoryAccess = hasAnyPermission(userPermissions, PermissionCategories.inventory);
      if (!hasInventoryAccess) {
        console.log(`   ❌ LỖI NGHIÊM TRỌNG: User có role INVENTORY nhưng không có quyền truy cập /inventory!`);
        totalIssues++;
        issues.push({
          user: user.username,
          issue: 'User có role INVENTORY nhưng không có quyền truy cập /inventory'
        });
      }
    }

    // Kiểm tra trường hợp đặc biệt: ACCOUNTANT role không có accounting permissions
    if (user.role === 'ACCOUNTANT') {
      const hasAccountingAccess = hasAnyPermission(userPermissions, PermissionCategories.accounting);
      if (!hasAccountingAccess) {
        console.log(`   ❌ LỖI NGHIÊM TRỌNG: User có role ACCOUNTANT nhưng không có quyền truy cập /accounting!`);
        totalIssues++;
        issues.push({
          user: user.username,
          issue: 'User có role ACCOUNTANT nhưng không có quyền truy cập /accounting'
        });
      }
    }

    // Kiểm tra trường hợp đặc biệt: SALES_CONSULTANT role không có customer permissions
    if (user.role === 'SALES_CONSULTANT') {
      const hasCustomerAccess = hasAnyPermission(userPermissions, PermissionCategories.customers);
      if (!hasCustomerAccess) {
        console.log(`   ⚠️  CẢNH BÁO: User có role SALES_CONSULTANT nhưng không có quyền truy cập /crm!`);
        // Không tính là lỗi nghiêm trọng vì có thể có trường hợp đặc biệt
      }
    }
  }

  // Tổng kết
  console.log('\n' + '='.repeat(60));
  console.log('📊 TỔNG KẾT KIỂM TRA');
  console.log('='.repeat(60));
  console.log(`Tổng số users: ${users.length}`);
  console.log(`Tổng số vấn đề: ${totalIssues}`);

  if (totalIssues > 0) {
    console.log('\n⚠️  CÁC VẤN ĐỀ PHÁT HIỆN:');
    issues.forEach((issue, index) => {
      console.log(`\n${index + 1}. User: ${issue.user}`);
      console.log(`   Vấn đề: ${issue.issue}`);
    });
  } else {
    console.log('\n✅ Không phát hiện vấn đề nào!');
  }

  console.log('\n💡 LƯU Ý:');
  console.log('   - Script này chỉ kiểm tra cấu trúc permissions trong database');
  console.log('   - Cần test thực tế trên UI để đảm bảo permissions hoạt động đúng');
  console.log('   - Kiểm tra PermissionGuard có redirect đúng không');
  console.log('   - Kiểm tra sidebar menu có filter đúng không');
  console.log('   - Kiểm tra các nút action trong components có check permissions không');
}

// Chạy test
testPermissions().catch(error => {
  console.error('❌ Lỗi khi chạy test:', error);
  process.exit(1);
});
