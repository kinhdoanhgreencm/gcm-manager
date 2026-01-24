
import { Vehicle, VehicleType, VehicleStatus, Transaction, TransactionType, TransactionCategory, DepositContract, SalesContract, ContractStatus, Account, RegistrationProfile, RegistrationStatus, TransactionStatus, Customer, CustomerType, CustomerStatus, Supplier, SupplierType, SupplierStatus, DebtRecord, DebtType, DebtStatus, Staff, StaffRole, StaffStatus } from './types';

export const MOCK_STAFF: Staff[] = [
  {
    id: 'staff1',
    code: 'NV-001',
    name: 'Trần Văn Quản Lý',
    phone: '0901234567',
    email: 'quanly@gcm.vn',
    role: StaffRole.STRATEGIC_DIRECTOR,
    branch: 'GCM-Tổng',
    status: StaffStatus.ACTIVE,
    joinDate: '2020-01-01',
    username: 'admin',
    permissions: {
      canManageContract: true,
      canApproveFinance: true,
      canViewReports: true,
      canManageInventory: true,
      canManageStaff: true
    } as any,
    totalContracts: 0,
    totalRevenue: 0
  },
  {
    id: 'staff2',
    code: 'NV-002',
    name: 'Nguyễn Thị Sale',
    phone: '0988888999',
    email: 'salen@gcm.vn',
    role: StaffRole.SALES_CONSULTANT,
    branch: 'GCM-Tổng',
    status: StaffStatus.ACTIVE,
    joinDate: '2023-06-15',
    username: 'sale.nguyen',
    permissions: {
      canManageContract: true,
      canApproveFinance: false,
      canViewReports: false,
      canManageInventory: false,
      canManageStaff: false
    } as any,
    totalContracts: 15,
    totalRevenue: 12500000000
  },
  {
    id: 'staff3',
    code: 'NV-003',
    name: 'Lê Văn Kế Toán',
    phone: '0911223344',
    email: 'ketoan@gcm.vn',
    role: StaffRole.ACCOUNTANT,
    branch: 'GCM-Tổng',
    status: StaffStatus.ACTIVE,
    joinDate: '2022-10-10',
    username: 'ketoan.le',
    permissions: {
      canManageContract: false,
      canApproveFinance: true,
      canViewReports: true,
      canManageInventory: false,
      canManageStaff: false
    } as any
  }
];

export const MOCK_DEBTS: DebtRecord[] = [
  {
    id: 'debt1',
    code: 'CN-2024-001',
    type: DebtType.RECEIVABLE,
    partnerId: 'cust1',
    partnerName: 'Nguyễn Văn A',
    partnerCode: 'KH-0001',
    referenceId: 'sc1',
    referenceCode: 'HDMB/2024/001',
    totalAmount: 1213000000,
    paidAmount: 500000000,
    remainingAmount: 713000000,
    dueDate: '2024-06-01',
    status: DebtStatus.NOT_DUE,
    notes: 'Chờ giải ngân ngân hàng Techcombank'
  },
  {
    id: 'debt2',
    code: 'CN-2024-002',
    type: DebtType.PAYABLE,
    partnerId: 'sup1',
    partnerName: 'VinFast Auto Việt Nam',
    partnerCode: 'NCC-001',
    referenceId: '1',
    referenceCode: 'PN-VF-088',
    totalAmount: 950000000,
    paidAmount: 0,
    remainingAmount: 950000000,
    dueDate: '2024-05-15',
    status: DebtStatus.OVERDUE,
    notes: 'Lô xe VinFast VF 7 Plus mới nhập'
  },
  {
    id: 'debt3',
    code: 'CN-2024-003',
    type: DebtType.RECEIVABLE,
    partnerId: 'cust2',
    partnerName: 'Công ty TNHH Vận tải Toàn Cầu',
    partnerCode: 'KH-0002',
    referenceId: 'sc2',
    referenceCode: 'HDMB/2024/005',
    totalAmount: 2500000000,
    paidAmount: 2500000000,
    remainingAmount: 0,
    dueDate: '2024-04-10',
    status: DebtStatus.PAID,
    lastPaymentDate: '2024-04-09'
  }
];

export const MOCK_SUPPLIERS: Supplier[] = [
  {
    id: 'sup1',
    code: 'NCC-001',
    type: SupplierType.OEM,
    name: 'VinFast Auto Việt Nam',
    phone: '1900232389',
    email: 'support.vn@vinfastauto.com',
    address: 'Khu kinh tế Đình Vũ - Cát Hải, Hải Phòng',
    taxCode: '010600123456',
    representative: 'Bà Lê Thị Thu Thủy',
    position: 'Chủ tịch HĐQT',
    bankName: 'Techcombank',
    bankAccount: '1903...001',
    paymentTerms: 'DEFERRED',
    assignedStaffId: 'staff1',
    status: SupplierStatus.ACTIVE,
    createdAt: '2017-09-01',
    totalVehicles: 450,
    totalImportValue: 525000000000,
    debt: 45000000000
  },
  {
    id: 'sup2',
    code: 'NCC-002',
    type: SupplierType.INDIVIDUAL,
    name: 'Nguyễn Văn Ký Gửi',
    phone: '0912345678',
    address: '456 Lê Lợi, Quận 1, TP.HCM',
    idCard: '079090123999',
    paymentTerms: 'IMMEDIATE',
    assignedStaffId: 'staff2',
    status: SupplierStatus.ACTIVE,
    createdAt: '2024-03-15',
    totalVehicles: 1,
    totalImportValue: 850000000,
    debt: 0
  }
];

export const MOCK_CUSTOMERS: Customer[] = [
  {
    id: 'cust1',
    code: 'KH-0001',
    type: CustomerType.INDIVIDUAL,
    name: 'Nguyễn Văn A',
    phone: '0901234567',
    email: 'vana@gmail.com',
    address: '123 Nguyễn Huệ, Quận 1, TP.HCM',
    idCard: '079090123456',
    source: 'Quảng cáo Facebook',
    assignedStaffId: 'staff2',
    status: CustomerStatus.TRADING,
    createdAt: '2024-01-10',
    totalContracts: 1,
    totalPurchased: 0,
    totalRevenue: 1480000000,
    debt: 1430000000
  },
  {
    id: 'cust2',
    code: 'KH-0002',
    type: CustomerType.CORPORATE,
    name: 'Công ty TNHH Vận tải Toàn Cầu',
    phone: '0283888999',
    email: 'contact@globaltrans.vn',
    address: 'Lầu 5, Pearl Plaza, Bình Thạnh, TP.HCM',
    taxCode: '0312345678',
    companyName: 'Công ty TNHH Vận tải Toàn Cầu',
    representative: 'Trần Thị B',
    position: 'Giám đốc',
    source: 'Khách tự đến',
    assignedStaffId: 'staff2',
    status: CustomerStatus.LOYAL,
    createdAt: '2023-11-05',
    totalContracts: 2,
    totalPurchased: 1,
    totalRevenue: 2500000000,
    debt: 0
  }
];

export const MOCK_ACCOUNTS: Account[] = [
  { id: 'acc1', name: 'Quỹ tiền mặt', type: 'CASH', balance: 500000000 },
  { id: 'acc2', name: 'Techcombank Business', type: 'BANK', bankName: 'Techcombank', accountNumber: '1903...888', balance: 3500000000 },
  { id: 'acc3', name: 'Vietcombank Showroom', type: 'BANK', bankName: 'Vietcombank', accountNumber: '0071...999', balance: 1200000000 },
];

export const MOCK_VEHICLES: Vehicle[] = [
  { id: '1', vin: 'VNF7PLUS123456', make: 'VinFast', model: 'VF 7 Plus', year: 2024, type: VehicleType.EV, price: 1099000000, cost: 950000000, status: VehicleStatus.REGISTRATION, color: 'Deep Ocean', batteryHealth: 100, createdAt: '2024-01-01T08:00:00Z', supplierId: 'sup1' },
  { id: '2', vin: 'VNF8LUX987654', make: 'VinFast', model: 'VF 8 Luxury', year: 2023, type: VehicleType.EV, price: 1250000000, cost: 1100000000, status: VehicleStatus.RESERVED, color: 'Crimson Red', batteryHealth: 98, createdAt: '2024-02-15T09:30:00Z', supplierId: 'sup1' },
  { id: '3', vin: 'VNFE34XYZ456', make: 'VinFast', model: 'VF e34', year: 2022, type: VehicleType.EV, price: 710000000, cost: 620000000, status: VehicleStatus.AVAILABLE, color: 'Brahminy White', batteryHealth: 92, mileage: 15000, createdAt: '2024-03-10T14:20:00Z', supplierId: 'sup2' },
  { id: '4', vin: 'VNF9ECO112233', make: 'VinFast', model: 'VF 9 Eco', year: 2024, type: VehicleType.EV, price: 1491000000, cost: 1350000000, status: VehicleStatus.AVAILABLE, color: 'VinFast Blue', batteryHealth: 100, createdAt: '2024-04-05T10:00:00Z', supplierId: 'sup1' },
  { id: '5', vin: 'VNF3BASE445566', make: 'VinFast', model: 'VF 3', year: 2024, type: VehicleType.EV, price: 322000000, cost: 285000000, status: VehicleStatus.AVAILABLE, color: 'Sunset Orange', batteryHealth: 100, createdAt: '2024-05-01T09:00:00Z', supplierId: 'sup1' },
];

export const MOCK_REGISTRATIONS: RegistrationProfile[] = [
  {
    id: 'reg1',
    vehicleId: '1',
    ownerName: 'Trần Thị B',
    ownerID: '001090654321',
    licensePlate: '30K-888.88',
    registrationNumber: '686868',
    inspectionExpiry: '2026-05-20',
    status: RegistrationStatus.PROCESSING,
    documents: [
      { type: 'Hóa đơn GTGT', url: '#', status: 'DONE' },
      { type: 'Chứng từ thuế', url: '#', status: 'DONE' },
      { type: 'Bản cà số khung/máy', url: '#', status: 'MISSING' },
    ],
    updatedAt: '2024-05-18'
  }
];

export const MOCK_DEPOSIT_CONTRACTS: DepositContract[] = [
  { 
    id: 'dc1', 
    contractCode: 'DC/2024/001', 
    vehicleId: '2', 
    customerName: 'Nguyễn Văn A', 
    customerPhone: '0901234567',
    customerIDCard: '001090123456',
    depositAmount: 50000000, 
    agreedPrice: 1250000000,
    signedDate: '2024-05-01', 
    expiryDate: '2024-05-15',
    paymentMethod: 'BANK_TRANSFER',
    status: ContractStatus.ACTIVE 
  },
];

export const MOCK_SALES_CONTRACTS: SalesContract[] = [
  {
    id: 'sc1',
    contractCode: 'HDMB/2024/001',
    vehicleId: '1',
    depositContractId: 'dc2',
    customerName: 'Trần Thị B',
    customerPhone: '0987654321',
    customerIDCard: '001090654321',
    customerAddress: 'Số 123 Cầu Giấy, Hà Nội',
    carPrice: 1099000000,
    vatAmount: 0, // EVs are often VAT/Tax exempt or reduced in mock context
    registrationFee: 20000000,
    insuranceFee: 15000000,
    discount: 10000000,
    totalAmount: 1124000000,
    paidAmount: 500000000,
    paymentType: 'INSTALLMENT',
    bankName: 'Techcombank',
    loanAmount: 624000000,
    signedDate: '2024-04-25',
    status: ContractStatus.PAYING
  }
];

export const MOCK_TRANSACTIONS: Transaction[] = [
  { 
    id: 'T-001', 
    date: '2024-04-20', 
    amount: 50000000, 
    type: TransactionType.INCOME, 
    category: TransactionCategory.DEPOSIT, 
    description: 'Thu tiền: Đặt cọc giữ xe VinFast VF 8 - Hợp đồng HDMB/2024/001', 
    accountId: 'acc2', 
    referenceId: 'sc1', 
    referenceType: 'CONTRACT',
    paymentMethod: 'BANK_TRANSFER',
    status: TransactionStatus.APPROVED,
    creatorId: 'staff1'
  },
  { 
    id: 'T-002', 
    date: '2024-05-15', 
    amount: 450000000, 
    type: TransactionType.INCOME, 
    category: TransactionCategory.CAR_SALE, 
    description: 'Thu tiền: Thanh toán đợt 2 (Đối ứng) VF 7 Plus - Hợp đồng HDMB/2024/001', 
    accountId: 'acc3', 
    referenceId: 'sc1',
    referenceType: 'CONTRACT',
    paymentMethod: 'BANK_TRANSFER',
    status: TransactionStatus.APPROVED,
    creatorId: 'staff3'
  },
];
