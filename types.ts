
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
  code?: string; // Mã xe theo format GCM-XXX
  vin: string;
  make: string;
  model: string;
  year: number;
  type: VehicleType;
  price: number;
  cost: number;
  status: VehicleStatus;
  color: string;
  mileage?: number;
  batteryHealth?: number;
  images?: string[];
  documents?: string[];
  createdAt: string;
  linkedContractId?: string;
  supplierId?: string;
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
  MANAGER = 'MANAGER',         // Quản lý / Chủ đại lý
  SALES = 'SALES',             // Nhân viên kinh doanh
  ACCOUNTANT = 'ACCOUNTANT',   // Kế toán
  INVENTORY = 'INVENTORY',     // Nhân viên kho
  LEGAL = 'LEGAL'              // Nhân viên hồ sơ
}

export enum StaffStatus {
  ACTIVE = 'ACTIVE',           // Đang làm việc
  INACTIVE = 'INACTIVE'        // Đã nghỉ việc
}

export interface StaffPermissions {
  canManageContract: boolean;
  canApproveFinance: boolean;
  canViewReports: boolean;
  canManageInventory: boolean;
  canManageStaff: boolean;
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
}

export enum ContractStatus {
  ACTIVE = 'ACTIVE',
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
