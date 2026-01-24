
export enum VehicleType {
  NEW = 'NEW',
  USED = 'USED',
  EV = 'EV'
}

export enum VehicleStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  SOLD = 'SOLD',
  REGISTRATION = 'REGISTRATION',
  DELIVERED = 'DELIVERED'
}

export interface Vehicle {
  id: string;
  code?: string; // Mã xe theo format CTGF-XXXX
  vin: string;
  make: string;
  model: string;
  version?: string; // Phiên bản xe (VD: Eco, Plus, Luxury...)
  year: number;
  type: VehicleType;
  price: number;
  cost: number;
  status: VehicleStatus;
  color: string; // Màu ngoại thất
  interiorColor?: string; // Màu nội thất
  mileage?: number;
  batteryHealth?: number;
  images?: string[];
  documents?: string[];
  createdAt: string;
  linkedContractId?: string;
  supplierId?: string;
  transactionStatus?: string; // Trạng thái giao dịch: Sẵn sàng giao dịch, Đã cọc, Đã xuất hóa đơn, Đã bàn giao
}

export enum SupplierType {
  OEM = 'OEM',
  DEALER = 'DEALER',
  INDIVIDUAL = 'INDIVIDUAL',
  AUCTION = 'AUCTION'
}

export enum SupplierStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE'
}

export interface Supplier {
  id: string;
  code: string;
  type: SupplierType;
  name: string;
  phone: string;
  email?: string;
  address: string;
  taxCode?: string;
  idCard?: string;
  representative?: string;
  position?: string;
  bankName?: string;
  bankAccount?: string;
  paymentTerms: 'IMMEDIATE' | 'DEFERRED';
  assignedStaffId: string;
  status: SupplierStatus;
  notes?: string;
  createdAt: string;
  totalVehicles: number;
  totalImportValue: number;
  debt: number;
}

// Staff & Roles Types
export enum StaffRole {
  STRATEGIC_DIRECTOR = 'STRATEGIC_DIRECTOR',   // Giám đốc chiến lược
  BUSINESS_DIRECTOR = 'BUSINESS_DIRECTOR',     // Giám đốc kinh doanh
  OPERATIONS_DIRECTOR = 'OPERATIONS_DIRECTOR', // Giám đốc vận hành
  DIRECTOR = 'DIRECTOR',                       // Giám đốc
  SALES_MANAGER = 'SALES_MANAGER',            // Trưởng phòng kinh doanh
  ACCOUNTANT = 'ACCOUNTANT',                   // Kế toán
  IT = 'IT',                                   // IT
  SALES_CONSULTANT = 'SALES_CONSULTANT',      // Tư vấn bán hàng
  ADMIN = 'ADMIN',                             // Admin
  INVENTORY = 'INVENTORY',                     // Nhân viên kho
  DRIVER_RECRUITMENT_POINT = 'DRIVER_RECRUITMENT_POINT' // Điểm tuyển tài xế
}

export enum StaffStatus {
  ACTIVE = 'ACTIVE',           // Đang làm việc
  INACTIVE = 'INACTIVE'        // Đã nghỉ việc
}

export interface StaffPermissions {
  // Kho (Inventory)
  inventoryView: boolean;
  inventoryCreate: boolean; // Thêm xe mới
  inventoryRead: boolean; // Xem danh sách xe
  inventoryUpdate: boolean; // Sửa thông tin xe
  inventoryDelete: boolean; // Xóa xe
  inventoryVehicles: boolean; // Quản lý xe (legacy)
  inventoryPrice: boolean; // Giá nhập - Giá bán
  
  // Nhà cung cấp (Suppliers)
  supplierView: boolean;
  supplierCreate: boolean; // Thêm nhà cung cấp
  supplierRead: boolean; // Xem danh sách nhà cung cấp
  supplierUpdate: boolean; // Sửa thông tin nhà cung cấp
  supplierDelete: boolean; // Xóa nhà cung cấp
  supplierInfo: boolean; // Xe thông tin nhà cung cấp (legacy)
  supplierDebt: boolean; // Công nợ
  // Detailed permissions
  supplierBasicInfo: boolean; // Xem thông tin cơ bản (tên, loại, số xe, nhân viên phụ trách)
  supplierFinancialInfo: boolean; // Xem thông tin tài chính (giá trị nhập, công nợ)
  supplierLegalInfo: boolean; // Xem thông tin pháp lý (MST, CCCD, người đại diện)
  supplierVehicles: boolean; // Xem danh sách xe đã nhập từ nhà cung cấp
  supplierPaymentHistory: boolean; // Xem lịch sử thanh toán
  supplierDebtHistory: boolean; // Xem lịch sử nợ
  
  // Khách hàng (CRM)
  customerView: boolean;
  customerCreate: boolean; // Thêm khách hàng
  customerRead: boolean; // Xem danh sách khách hàng
  customerUpdate: boolean; // Sửa thông tin khách hàng
  customerDelete: boolean; // Xóa khách hàng
  customerSelf: boolean; // Thông tin từ user tự nhập (Sales)
  customerSubordinates: boolean; // Thông tin từ user và từ cấp dưới (Quản lý cấp trung)
  customerAll: boolean; // Thông tin toàn hệ thống (Quản lý cấp cao)
  
  // Nhân sự (Staff)
  staffView: boolean;
  staffCreate: boolean; // Thêm nhân sự
  staffRead: boolean; // Xem danh sách nhân sự
  staffUpdate: boolean; // Sửa thông tin nhân sự
  staffDelete: boolean; // Xóa nhân sự
  staffSubordinates: boolean; // Nhân sự cấp dưới (Quản lý cấp trung)
  staffAll: boolean; // Nhân sự toàn hệ thống (Quản lý cấp cao)
  
  // Hợp đồng (Contracts)
  contractsView: boolean; // Xem danh sách hợp đồng
  contractsCreate: boolean; // Tạo hợp đồng mới
  contractsRead: boolean; // Xem chi tiết hợp đồng
  contractsUpdate: boolean; // Sửa hợp đồng
  contractsDelete: boolean; // Xóa hợp đồng
  contractsApprove: boolean; // Duyệt hợp đồng (chờ duyệt → đã ký / đang thanh toán)
  contracts: boolean; // Hợp đồng (legacy)
  
  // Chương trình khuyến mãi (Promotions)
  promotionsView: boolean; // Xem danh sách CTKM
  promotionsCreate: boolean; // Tạo CTKM mới
  promotionsRead: boolean; // Xem chi tiết CTKM
  promotionsUpdate: boolean; // Sửa CTKM
  promotionsDelete: boolean; // Xóa CTKM
  
  // Đơn vị vận chuyển (Carriers)
  carriersView: boolean; // Xem danh sách đơn vị vận chuyển
  carriersCreate: boolean; // Thêm đơn vị vận chuyển
  carriersRead: boolean; // Xem chi tiết đơn vị vận chuyển
  carriersUpdate: boolean; // Sửa đơn vị vận chuyển
  carriersDelete: boolean; // Xóa đơn vị vận chuyển
  
  // Thu chi & Dòng tiền (Finance)
  financeView: boolean; // Xem danh sách giao dịch
  financeCreate: boolean; // Tạo giao dịch mới
  financeRead: boolean; // Xem chi tiết giao dịch
  financeUpdate: boolean; // Sửa giao dịch
  financeDelete: boolean; // Xóa giao dịch
  financeApprove: boolean; // Duyệt giao dịch
  finance: boolean; // Thu chi & Dòng tiền (legacy)
  
  // Quản lý công nợ (Debt)
  debtManagementView: boolean; // Xem công nợ
  debtManagementCreate: boolean; // Tạo thanh toán công nợ
  debtManagementRead: boolean; // Xem chi tiết công nợ
  debtManagementUpdate: boolean; // Sửa thanh toán công nợ
  debtManagementDelete: boolean; // Xóa thanh toán công nợ
  debtManagement: boolean; // Quản lý công nợ (legacy)
  
  // Kế toán (Accounting)
  accountingView: boolean; // Xem kế toán
  accountingCreate: boolean; // Tạo phiếu kế toán
  accountingRead: boolean; // Xem chi tiết phiếu kế toán
  accountingUpdate: boolean; // Sửa phiếu kế toán
  accountingDelete: boolean; // Xóa phiếu kế toán
  accountingPost: boolean; // Đăng phiếu kế toán
  accountingLock: boolean; // Khóa phiếu kế toán
  
  // Hồ sơ pháp lý (Registration)
  registrationView: boolean; // Xem hồ sơ pháp lý
  registrationUpdate: boolean; // Cập nhật hồ sơ pháp lý
  registration: boolean; // Hồ sơ pháp lý (legacy)
  
  // Hồ sơ Claim (Claims)
  claimsView: boolean; // Xem danh sách hồ sơ claim
  claimsCreate: boolean; // Tạo hồ sơ claim mới
  claimsRead: boolean; // Xem chi tiết hồ sơ claim
  claimsUpdate: boolean; // Sửa hồ sơ claim
  claimsDelete: boolean; // Xóa hồ sơ claim
  
  // Báo cáo (Reports)
  reportsView: boolean; // Xem báo cáo
  reportsExport: boolean; // Xuất báo cáo
  reports: boolean; // Báo cáo (legacy)
  
  // Dashboard
  dashboardView: boolean; // Xem dashboard
  
  // Legacy permissions (backward compatibility)
  canManageContract?: boolean;
  canApproveFinance?: boolean;
  canViewReports?: boolean;
  canManageInventory?: boolean;
  canManageStaff?: boolean;
}

export interface Staff {
  id: string;
  code: string;
  name: string;
  phone: string;
  email: string;
  role: StaffRole;
  branch: string;
  status: StaffStatus;
  joinDate: string;
  managerId?: string;
  // Personal Information
  dateOfBirth?: string;         // Ngày tháng năm sinh
  idCard?: string;              // Số CCCD
  idCardIssueDate?: string;     // Ngày cấp CCCD
  idCardIssuePlace?: string;    // Nơi cấp CCCD
  bankName?: string;            // Tên ngân hàng
  bankAccount?: string;          // Tài khoản ngân hàng
  professionalLevel?: string;    // Trình độ chuyên môn
  permanentAddress?: string;    // Địa chỉ hộ khẩu
  currentAddress?: string;       // Nơi ở hiện tại
  taxCode?: string;             // MST (Mã số thuế)
  dependents?: number;           // Người phụ thuộc
  avatarUrl?: string;            // URL ảnh đại diện
  // System Account
  username: string;
  permissions: StaffPermissions;
  notes?: string;
  // Stats (Computed)
  totalContracts?: number;
  totalRevenue?: number;
  totalVehiclesHandled?: number;
}

export enum CustomerType {
  INDIVIDUAL = 'INDIVIDUAL',
  CORPORATE = 'CORPORATE'
}

export enum CustomerStatus {
  PROSPECT = 'PROSPECT',
  TRADING = 'TRADING',
  LOYAL = 'LOYAL',
  INACTIVE = 'INACTIVE'
}

export interface Customer {
  id: string;
  code: string;
  type: CustomerType;
  name: string;
  phone: string;
  email?: string;
  address: string;
  idCard?: string;
  taxCode?: string;
  companyName?: string;
  representative?: string;
  position?: string;
  source: string;
  assignedStaffId: string;
  status: CustomerStatus;
  notes?: string;
  createdAt: string;
  totalContracts: number;
  totalPurchased: number;
  totalRevenue: number;
  debt: number;
  // Additional fields
  dateOfBirth?: string;
  gender?: string;
  idCardIssueDate?: string;
  idCardIssuePlace?: string;
  bankName?: string;
  bankAccount?: string;
  bankBranch?: string;
}

export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  TRANSFER = 'TRANSFER'
}

export enum TransactionStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  LOCKED = 'LOCKED',
  CANCELLED = 'CANCELLED'
}

export enum TransactionCategory {
  CAR_SALE = 'Bán xe',
  DEPOSIT = 'Đặt cọc',
  SERVICE = 'Phí dịch vụ',
  COMMISSION = 'Hoa hồng',
  INVENTORY_PURCHASE = 'Nhập xe',
  REGISTRATION_FEE = 'Phí đăng ký/kiểm',
  SALARY = 'Lương nhân viên',
  MARKETING = 'Marketing',
  OPERATION = 'Vận hành',
  INTERNAL_TRANSFER = 'Chuyển tiền nội bộ'
}

export enum DebtType {
  RECEIVABLE = 'RECEIVABLE',
  PAYABLE = 'PAYABLE'
}

export enum DebtStatus {
  NOT_DUE = 'NOT_DUE',
  DUE = 'DUE',
  OVERDUE = 'OVERDUE',
  PAID = 'PAID'
}

export interface DebtRecord {
  id: string;
  code: string;
  type: DebtType;
  partnerId: string;
  partnerName: string;
  partnerCode: string;
  referenceId: string;
  referenceCode: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: string;
  status: DebtStatus;
  lastPaymentDate?: string;
  notes?: string;
}

export interface Account {
  id: string;
  name: string;
  type: 'CASH' | 'BANK' | 'E_WALLET';
  bankName?: string;
  accountNumber?: string;
  balance: number;
  chartOfAccountId?: string; // ID tài khoản kế toán trong chart_of_accounts
}

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: TransactionType;
  category: TransactionCategory;
  description: string;
  accountId: string;
  toAccountId?: string;
  referenceId?: string; 
  referenceType?: 'VEHICLE' | 'CONTRACT' | 'PARTNER' | 'CUSTOMER' | 'SUPPLIER';
  paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'E_WALLET';
  status: TransactionStatus;
  creatorId: string;
  approverId?: string;
  attachments?: string[];
  approvedAt?: string;
  createdAt?: string;
}

export enum ContractStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  SIGNED = 'SIGNED',
  PAYING = 'PAYING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  CONVERTED = 'CONVERTED'
}

export interface PaymentSchedule {
  id: string;
  contractId: string;
  milestoneName: string; 
  amount: number;
  dueDate: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
  transactionId?: string; // ID của transaction đã được tạo cho milestone này
}

export interface DepositContract {
  id: string;
  contractCode: string;
  vehicleId: string;
  customerName: string;
  customerPhone: string;
  customerIDCard: string;
  depositAmount: number;
  agreedPrice: number;
  signedDate: string;
  expiryDate: string;
  paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'E_WALLET';
  status: ContractStatus;
  schedules?: PaymentSchedule[];
}

export interface SalesContract {
  id: string;
  contractCode: string;
  vehicleId: string;
  depositContractId?: string;
  customerName: string;
  customerPhone: string;
  customerIDCard: string;
  customerAddress: string;
  carPrice: number;
  vatAmount: number;
  registrationFee: number;
  insuranceFee: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  paymentType: 'INSTALLMENT' | 'CASH';
  bankName?: string;
  loanAmount?: number;
  signedDate: string;
  status: ContractStatus;
  schedules?: PaymentSchedule[];
  responsibleStaffId?: string;
  responsibleStaffName?: string;
  approverId?: string;
  approverName?: string;
}

export enum RegistrationStatus {
  PENDING = 'PENDING',
  TAX_PAID = 'TAX_PAID',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED'
}

export interface RegistrationProfile {
  id: string;
  vehicleId: string;
  ownerName: string;
  ownerID: string;
  licensePlate?: string;
  registrationNumber?: string;
  inspectionExpiry?: string;
  status: RegistrationStatus;
  documents: {
    type: string;
    url: string;
    status: 'DONE' | 'MISSING' | 'PENDING';
  }[];
  updatedAt: string;
}

// ===== Claims Types =====

export enum ClaimStatus {
  PENDING = 'PENDING',           // Chờ xử lý
  IN_PROGRESS = 'IN_PROGRESS',   // Đang xử lý
  RESOLVED = 'RESOLVED',         // Đã giải quyết
  REJECTED = 'REJECTED',         // Từ chối
  CLOSED = 'CLOSED'              // Đã đóng
}

export enum ClaimType {
  WARRANTY = 'WARRANTY',         // Bảo hành
  COMPLAINT = 'COMPLAINT',       // Khiếu nại
  REPAIR = 'REPAIR',            // Sửa chữa
  REPLACEMENT = 'REPLACEMENT',   // Thay thế
  REFUND = 'REFUND'             // Hoàn tiền
}

export enum ClaimPriority {
  LOW = 'LOW',           // Thấp
  MEDIUM = 'MEDIUM',     // Trung bình
  HIGH = 'HIGH',         // Cao
  URGENT = 'URGENT'      // Khẩn cấp
}

export interface Claim {
  id: string;
  claimCode: string;              // Mã hồ sơ claim (VD: CLM-2024-001)
  type: ClaimType;                // Loại claim
  status: ClaimStatus;            // Trạng thái
  priority: ClaimPriority;        // Độ ưu tiên
  
  // Thông tin khách hàng
  customerId?: string;             // ID khách hàng (tham chiếu customers)
  customerName: string;           // Tên khách hàng
  customerPhone: string;          // Số điện thoại
  customerEmail?: string;         // Email
  
  // Thông tin liên quan
  vehicleId?: string;             // ID xe (tham chiếu vehicles)
  vehicleCode?: string;          // Mã xe
  contractId?: string;           // ID hợp đồng (tham chiếu contracts)
  contractCode?: string;         // Mã hợp đồng
  
  // Thông tin claim
  title: string;                  // Tiêu đề claim
  description: string;           // Mô tả chi tiết
  requestedAmount?: number;       // Số tiền yêu cầu
  approvedAmount?: number;        // Số tiền được duyệt
  resolution?: string;           // Giải pháp/Phương án xử lý
  notes?: string;                // Ghi chú
  
  // Thông tin xử lý
  assignedToId?: string;          // ID nhân viên được giao xử lý
  assignedToName?: string;       // Tên nhân viên được giao
  createdById: string;           // ID người tạo
  createdByName?: string;        // Tên người tạo
  resolvedById?: string;         // ID người giải quyết
  resolvedByName?: string;      // Tên người giải quyết
  
  // Thời gian
  reportedDate: string;          // Ngày báo cáo
  dueDate?: string;              // Ngày hạn xử lý
  resolvedDate?: string;         // Ngày giải quyết
  closedDate?: string;           // Ngày đóng
  
  // Tài liệu đính kèm
  attachments?: string[];         // Danh sách URL file đính kèm
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

// ===== Accounting Types =====

export enum AccountType {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  EQUITY = 'EQUITY',
  REVENUE = 'REVENUE',
  EXPENSE = 'EXPENSE',
  COST_OF_SALES = 'COST_OF_SALES'
}

export enum NormalBalance {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT'
}

export interface ChartOfAccount {
  id: string;
  code: string;
  name: string;
  parentId?: string;
  accountType: AccountType;
  normalBalance: NormalBalance;
  level: number;
  isActive: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export enum VoucherType {
  RECEIPT = 'RECEIPT',           // Phiếu thu
  PAYMENT = 'PAYMENT',           // Phiếu chi
  TRANSFER = 'TRANSFER',         // Phiếu chuyển khoản
  JOURNAL = 'JOURNAL',           // Bút toán nhật ký
  SALES_INVOICE = 'SALES_INVOICE',   // Hóa đơn bán hàng
  PURCHASE_INVOICE = 'PURCHASE_INVOICE' // Hóa đơn mua hàng
}

export enum VoucherStatus {
  DRAFT = 'DRAFT',
  POSTED = 'POSTED',
  LOCKED = 'LOCKED',
  CANCELLED = 'CANCELLED'
}

export interface AccountingVoucher {
  id: string;
  voucherNumber: string;
  voucherDate: string;
  voucherType: VoucherType;
  description: string;
  totalAmount: number;
  referenceType?: string;
  referenceId?: string;
  status: VoucherStatus;
  postedBy?: string;
  postedAt?: string;
  lockedBy?: string;
  lockedAt?: string;
  attachments?: string[];
  notes?: string;
  createdAt: string;
  createdBy?: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface AccountingEntry {
  id: string;
  voucherId: string;
  accountId: string;
  accountCode?: string;
  accountName?: string;
  debitAmount: number;
  creditAmount: number;
  description?: string;
  referenceType?: string;
  referenceId?: string;
  createdAt: string;
  createdBy?: string;
}

// Financial Report Types
export interface BalanceSheet {
  assets: {
    currentAssets: number;
    fixedAssets: number;
    totalAssets: number;
  };
  liabilities: {
    currentLiabilities: number;
    longTermLiabilities: number;
    totalLiabilities: number;
  };
  equity: {
    capital: number;
    retainedEarnings: number;
    totalEquity: number;
  };
  date: string;
}

export interface IncomeStatement {
  revenue: {
    sales: number;
    other: number;
    total: number;
  };
  costOfSales: number;
  grossProfit: number;
  expenses: {
    selling: number;
    administrative: number;
    financial: number;
    other: number;
    total: number;
  };
  netIncome: number;
  period: {
    from: string;
    to: string;
  };
}
