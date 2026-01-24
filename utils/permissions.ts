/**
 * Utility functions for checking user permissions
 */

/**
 * Check if user has any permission in a given category
 * @param permissions User permissions object
 * @param permissionKeys Array of permission keys to check
 * @returns true if any permission is true, false otherwise
 */
export function hasAnyPermission(
  permissions: Record<string, boolean> | undefined,
  permissionKeys: string[]
): boolean {
  // If no permissions object, deny access
  if (!permissions) {
    return false;
  }

  // Check if user has at least one of the required permissions
  return permissionKeys.some(key => permissions[key] === true);
}

/**
 * Check if user has a specific permission
 * @param permissions User permissions object
 * @param permissionKey Permission key to check
 * @returns true if permission is true, false otherwise
 */
export function hasPermission(
  permissions: Record<string, boolean> | undefined,
  permissionKey: string
): boolean {
  // If no permissions object, deny access
  if (!permissions) {
    return false;
  }

  // Check if user has the specific permission
  return permissions[permissionKey] === true;
}

/**
 * Permission categories for different modules
 */
export const PermissionCategories = {
  contracts: ['contractsView', 'contractsCreate', 'contractsRead', 'contractsUpdate', 'contractsDelete', 'contractsApprove', 'contracts'],
  customers: [
    'customerView',
    'customerCreate',
    'customerRead',
    'customerUpdate',
    'customerDelete',
    'customerSelf',
    'customerSubordinates',
    'customerAll',
    // Detailed permissions
    'customerBasicInfo',       // Xem thông tin cơ bản (tên, loại, số điện thoại, nguồn, NV phụ trách)
    'customerFinancialInfo',   // Xem thông tin tài chính (doanh thu, công nợ)
    'customerLegalInfo',       // Xem thông tin pháp lý (CCCD, MST, ngày sinh, giới tính, người đại diện)
    'customerBankInfo',        // Xem thông tin ngân hàng
    'customerContracts',       // Xem danh sách hợp đồng và số liệu liên quan
    'customerPaymentHistory',  // Xem lịch sử thanh toán
    'customerPurchaseHistory', // Xem lịch sử mua hàng (xe đã bàn giao)
  ],
  inventory: ['inventoryView', 'inventoryCreate', 'inventoryRead', 'inventoryUpdate', 'inventoryDelete', 'inventoryVehicles', 'inventoryPrice'],
  suppliers: [
    'supplierView', 'supplierCreate', 'supplierRead', 'supplierUpdate', 'supplierDelete', 
    'supplierInfo', 'supplierDebt',
    // Detailed permissions
    'supplierBasicInfo',      // Xem thông tin cơ bản (tên, loại, số xe, nhân viên phụ trách)
    'supplierFinancialInfo',  // Xem thông tin tài chính (giá trị nhập, công nợ)
    'supplierLegalInfo',      // Xem thông tin pháp lý (MST, CCCD, người đại diện)
    'supplierVehicles',       // Xem danh sách xe đã nhập từ nhà cung cấp
    'supplierPaymentHistory', // Xem lịch sử thanh toán
    'supplierDebtHistory'    // Xem lịch sử nợ
  ],
  staff: ['staffView', 'staffCreate', 'staffRead', 'staffUpdate', 'staffDelete', 'staffSubordinates', 'staffAll'],
  promotions: ['promotionsView', 'promotionsCreate', 'promotionsRead', 'promotionsUpdate', 'promotionsDelete'],
  carriers: ['carriersView', 'carriersCreate', 'carriersRead', 'carriersUpdate', 'carriersDelete'],
  finance: ['financeView', 'financeCreate', 'financeRead', 'financeUpdate', 'financeDelete', 'financeApprove', 'finance'],
  debt: ['debtManagementView', 'debtManagementCreate', 'debtManagementRead', 'debtManagementUpdate', 'debtManagementDelete', 'debtManagement'],
  accounting: ['accountingView', 'accountingCreate', 'accountingRead', 'accountingUpdate', 'accountingDelete', 'accountingPost', 'accountingLock'],
  registration: ['registrationView', 'registrationUpdate', 'registration'],
  claims: ['claimsView', 'claimsCreate', 'claimsRead', 'claimsUpdate', 'claimsDelete'],
  reports: ['reportsView', 'reportsExport', 'reports'],
  dashboard: ['dashboardView'],
};
