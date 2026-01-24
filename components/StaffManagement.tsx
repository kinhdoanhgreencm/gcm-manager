'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Plus, Search, Filter, UserCheck, 
  ChevronRight, Phone, 
  Mail, Briefcase, Calendar, 
  TrendingUp, FileText, CheckCircle2,
  Users, BarChart3, Activity, Info,
  Building2, ArrowLeft, ArrowUpRight, Settings,
  LayoutDashboard, ShieldAlert, Wallet, CreditCard,
  Landmark, Lock, Package, Tag, Car, Receipt, History, ShieldCheck, Download
} from 'lucide-react';
import { MOCK_SALES_CONTRACTS, MOCK_CUSTOMERS } from '@/constants';
import { Staff, StaffRole, StaffStatus } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useReload } from '@/contexts/ReloadContext';
import { hasAnyPermission, PermissionCategories } from '@/utils/permissions';
import { AccessDenied } from './AccessDenied';

// Avatar component with fallback
const Avatar: React.FC<{ 
  src?: string; 
  name: string; 
  size: 'small' | 'large';
  className?: string;
}> = ({ src, name, size, className = '' }) => {
  const [imageError, setImageError] = useState(false);
  const sizeClasses = size === 'large' 
    ? 'w-24 h-24 text-3xl' 
    : 'w-12 h-12 text-lg';
  const bgClasses = size === 'large'
    ? 'bg-blue-100 text-blue-600 ring-8 ring-blue-50'
    : 'bg-slate-100 text-slate-400 group-hover:bg-blue-600 group-hover:text-white';

  return (
    <div className={`${sizeClasses} ${bgClasses} rounded-full flex items-center justify-center font-black overflow-hidden relative ${className}`}>
      {src && !imageError ? (
        <img 
          src={src} 
          alt={name}
          className="w-full h-full object-cover rounded-full"
          onError={() => setImageError(true)}
        />
      ) : (
        name.charAt(0)
      )}
    </div>
  );
};

export const StaffManagement: React.FC = () => {
  const { user } = useAuth();
  const { reloadKey } = useReload();
  const [search, setSearch] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'activities' | 'performance'>('overview');
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [managerMap, setManagerMap] = useState<Map<string, string>>(new Map());
  const [staffStatsMap, setStaffStatsMap] = useState<Map<string, { totalContracts: number; totalRevenue: number }>>(new Map());

  // Chỉ Giám đốc vận hành, Giám đốc và Admin mới được truy cập trang nhân sự
  const allowedRoles = ['OPERATIONS_DIRECTOR', 'DIRECTOR', 'ADMIN'];
  
  if (!user || !allowedRoles.includes(user.role || '')) {
    return (
      <AccessDenied 
        message="Chỉ Giám đốc vận hành, Giám đốc và Quản trị viên mới được phép truy cập trang quản lý nhân sự."
        redirectTo="/dashboard"
        icon="shield"
      />
    );
  }

  // Load staff from database
  useEffect(() => {
    const loadStaff = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/staff', { cache: 'no-store' });
        const result = await response.json();

        if (!response.ok) {
          console.error('Error loading staff:', result?.error || 'Unknown error');
        } else {
          const data = result?.staff || [];
          // Transform database data to Staff interface
          const formattedStaff: Staff[] = (data || []).map((user: any) => ({
            id: user.id,
            code: `NV-${user.id.substring(0, 8).toUpperCase()}`, // Generate code from ID
            name: user.full_name,
            phone: user.phone || '',
            email: user.email,
            role: user.role as StaffRole,
            branch: user.branch || 'GCM',
            status: user.status as StaffStatus,
            joinDate: user.join_date || user.created_at?.split('T')[0] || '',
            managerId: user.manager_id,
            username: user.username,
            permissions: user.permissions || {
              canManageContract: false,
              canApproveFinance: false,
              canViewReports: false,
              canManageInventory: false,
              canManageStaff: false
            },
            // Personal Information
            dateOfBirth: user.date_of_birth,
            idCard: user.id_card,
            idCardIssueDate: user.id_card_issue_date,
            idCardIssuePlace: user.id_card_issue_place,
            bankName: user.bank_name,
            bankAccount: user.bank_account,
            professionalLevel: user.professional_level,
            permanentAddress: user.permanent_address,
            currentAddress: user.current_address,
            taxCode: user.tax_code,
            dependents: user.dependents || 0,
            avatarUrl: user.avatar_url || undefined,
            notes: user.notes,
            // Stats (will be computed later if needed)
            totalContracts: 0,
            totalRevenue: 0,
            totalVehiclesHandled: 0
          }));
          setStaffList(formattedStaff);
        }
      } catch (error) {
        console.error('Error loading staff:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStaff();
  }, []);

  // Export staff data to CSV/Excel
  const exportStaffData = () => {
    // Prepare CSV content
    const headers = [
      'Mã nhân viên',
      'Họ và tên',
      'Số điện thoại',
      'Email',
      'Vai trò',
      'Chi nhánh',
      'Trạng thái',
      'Ngày vào làm',
      'Người quản lý',
      'Ngày sinh',
      'CCCD/CMND',
      'Ngân hàng',
      'Số tài khoản',
      'Địa chỉ thường trú',
      'Địa chỉ hiện tại',
      'Mã số thuế',
      'Số người phụ thuộc',
      'Ghi chú'
    ];

    // Convert staff data to CSV rows
    const rows = staffList.map(staff => {
      const manager = staff.managerId ? managerMap.get(staff.managerId) : '';
      return [
        staff.code || '',
        staff.name || '',
        staff.phone || '',
        staff.email || '',
        staff.role || '',
        staff.branch || '',
        staff.status || '',
        staff.joinDate || '',
        manager || '',
        staff.dateOfBirth || '',
        staff.idCard || '',
        staff.bankName || '',
        staff.bankAccount || '',
        staff.permanentAddress || '',
        staff.currentAddress || '',
        staff.taxCode || '',
        staff.dependents?.toString() || '0',
        staff.notes || ''
      ];
    });

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => 
        row.map(cell => {
          // Escape commas and quotes in cell content
          const cellStr = String(cell || '');
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        }).join(',')
      )
    ].join('\n');

    // Add BOM for Excel UTF-8 support
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Create download link
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Danh_sach_nhan_su_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Fetch manager map
  useEffect(() => {
    const fetchManagers = async () => {
      try {
        const response = await fetch('/api/staff?status=ACTIVE&fields=manager', { cache: 'no-store' });
        const result = await response.json();

        if (!response.ok) {
          console.error('Error fetching managers:', result?.error || 'Unknown error');
          return;
        }

        const data = result?.staff || [];

        if (data) {
          const map = new Map<string, string>();
          data.forEach((user: any) => {
            map.set(user.id, user.full_name);
          });
          setManagerMap(map);
        }
      } catch (err: any) {
        console.error('Unexpected error fetching managers:', err);
      }
    };

    fetchManagers();
  }, [reloadKey]); // Re-fetch when reloadKey changes

  // Load sales performance stats (contracts & total amount) for sales staff
  useEffect(() => {
    const loadStaffSalesStats = async () => {
      try {
        // Only fetch if we have staff to map stats to
        if (!staffList || staffList.length === 0) return;

        const response = await fetch('/api/staff/contracts?contractType=SALES', { cache: 'no-store' });
        const result = await response.json();

        if (!response.ok) {
          console.error('Error loading staff sales stats:', result?.error || 'Unknown error');
          return;
        }

        const data = result?.contracts || [];

        const statsMap = new Map<string, { totalContracts: number; totalRevenue: number }>();

        (data || []).forEach((contract: any) => {
          const staffId = contract.responsible_staff_id as string | null;
          if (!staffId) return;

          // Bỏ qua hợp đồng đã huỷ để không tính vào hiệu suất
          if (contract.status === 'CANCELLED') return;

          const totalAmount = Number(contract.total_amount) || 0;
          const current = statsMap.get(staffId) || { totalContracts: 0, totalRevenue: 0 };
          current.totalContracts += 1;
          current.totalRevenue += totalAmount;
          statsMap.set(staffId, current);
        });

        setStaffStatsMap(statsMap);
      } catch (err) {
        console.error('Unexpected error loading staff sales stats:', err);
      }
    };

    loadStaffSalesStats();
  }, [staffList]);

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const getStaffStats = (staffId?: string | null) => {
    if (!staffId) return { totalContracts: 0, totalRevenue: 0 };
    return staffStatsMap.get(staffId) || { totalContracts: 0, totalRevenue: 0 };
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      // Handle both ISO format (YYYY-MM-DD) and other formats
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        // If it's already in DD/MM/YYYY format, return as is
        if (dateString.includes('/')) return dateString;
        return 'N/A';
      }
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateString;
    }
  };

  const formatPermissionName = (key: string): string => {
    // Direct mapping of permission keys to Vietnamese labels
    const permissionLabels: { [key: string]: string } = {
      // Inventory
      'inventoryView': 'Xem kho',
      'inventoryCreate': 'Thêm xe mới',
      'inventoryRead': 'Xem danh sách xe',
      'inventoryUpdate': 'Sửa thông tin xe',
      'inventoryDelete': 'Xóa xe',
      'inventoryVehicles': 'Quản lý xe',
      'inventoryPrice': 'Quản lý giá nhập - Giá bán',
      
      // Supplier
      'supplierView': 'Xem nhà cung cấp',
      'supplierCreate': 'Thêm nhà cung cấp',
      'supplierRead': 'Xem danh sách nhà cung cấp',
      'supplierUpdate': 'Sửa thông tin nhà cung cấp',
      'supplierDelete': 'Xóa nhà cung cấp',
      'supplierInfo': 'Xem thông tin nhà cung cấp',
      'supplierDebt': 'Quản lý công nợ nhà cung cấp',
      'supplierBasicInfo': 'Xem thông tin cơ bản',
      'supplierFinancialInfo': 'Xem thông tin tài chính',
      'supplierLegalInfo': 'Xem thông tin pháp lý',
      'supplierVehicles': 'Xem danh sách xe đã nhập',
      'supplierPaymentHistory': 'Xem lịch sử thanh toán',
      'supplierDebtHistory': 'Xem lịch sử nợ',
      
      // Customer
      'customerView': 'Xem khách hàng',
      'customerCreate': 'Thêm khách hàng',
      'customerRead': 'Xem danh sách khách hàng',
      'customerUpdate': 'Sửa thông tin khách hàng',
      'customerDelete': 'Xóa khách hàng',
      'customerSelf': 'Xem khách hàng bản thân',
      'customerSubordinates': 'Xem khách hàng cấp dưới',
      'customerAll': 'Xem tất cả khách hàng',
      
      // Staff
      'staffView': 'Xem nhân sự',
      'staffCreate': 'Thêm nhân sự',
      'staffRead': 'Xem danh sách nhân sự',
      'staffUpdate': 'Sửa thông tin nhân sự',
      'staffDelete': 'Xóa nhân sự',
      'staffSubordinates': 'Xem nhân sự cấp dưới',
      'staffAll': 'Xem tất cả nhân sự',
      
      // Contracts
      'contractsView': 'Xem hợp đồng',
      'contractsCreate': 'Tạo hợp đồng mới',
      'contractsRead': 'Xem chi tiết hợp đồng',
      'contractsUpdate': 'Sửa hợp đồng',
      'contractsDelete': 'Xóa hợp đồng',
      'contracts': 'Quản lý hợp đồng',
      
      // Promotions
      'promotionsView': 'Xem chương trình khuyến mãi',
      'promotionsCreate': 'Tạo CTKM mới',
      'promotionsRead': 'Xem chi tiết CTKM',
      'promotionsUpdate': 'Sửa CTKM',
      'promotionsDelete': 'Xóa CTKM',
      
      // Carriers
      'carriersView': 'Xem đơn vị vận chuyển',
      'carriersCreate': 'Thêm đơn vị vận chuyển',
      'carriersRead': 'Xem chi tiết đơn vị vận chuyển',
      'carriersUpdate': 'Sửa đơn vị vận chuyển',
      'carriersDelete': 'Xóa đơn vị vận chuyển',
      
      // Finance
      'financeView': 'Xem giao dịch',
      'financeCreate': 'Tạo giao dịch mới',
      'financeRead': 'Xem chi tiết giao dịch',
      'financeUpdate': 'Sửa giao dịch',
      'financeDelete': 'Xóa giao dịch',
      'financeApprove': 'Duyệt giao dịch',
      'finance': 'Quản lý thu chi',
      
      // Debt Management
      'debtManagementView': 'Xem công nợ',
      'debtManagementCreate': 'Tạo thanh toán công nợ',
      'debtManagementRead': 'Xem chi tiết công nợ',
      'debtManagementUpdate': 'Sửa thanh toán công nợ',
      'debtManagementDelete': 'Xóa thanh toán công nợ',
      'debtManagement': 'Quản lý công nợ',
      
      // Accounting
      'accountingView': 'Xem kế toán',
      'accountingCreate': 'Tạo phiếu kế toán',
      'accountingRead': 'Xem chi tiết phiếu kế toán',
      'accountingUpdate': 'Sửa phiếu kế toán',
      'accountingDelete': 'Xóa phiếu kế toán',
      'accountingPost': 'Đăng phiếu kế toán',
      'accountingLock': 'Khóa phiếu kế toán',
      
      // Registration
      'registrationView': 'Xem hồ sơ pháp lý',
      'registrationUpdate': 'Cập nhật hồ sơ pháp lý',
      'registration': 'Quản lý hồ sơ pháp lý',
      
      // Reports
      'reportsView': 'Xem báo cáo',
      'reportsExport': 'Xuất báo cáo',
      'reports': 'Quản lý báo cáo',
      
      // Dashboard
      'dashboardView': 'Xem dashboard',
      
      // Legacy permissions
      'canManageContract': 'Quản lý hợp đồng',
      'canApproveFinance': 'Duyệt giao dịch',
      'canViewReports': 'Xem báo cáo',
      'canManageInventory': 'Quản lý kho',
      'canManageStaff': 'Quản lý nhân sự',
    };
    
    // Return mapped label or format the key as fallback
    if (permissionLabels[key]) {
      return permissionLabels[key];
    }
    
    // Fallback: format the key if not in mapping
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };

  const getRoleBadge = (role: StaffRole) => {
    switch(role) {
      case StaffRole.STRATEGIC_DIRECTOR: return { label: 'Giám đốc chiến lược', class: 'bg-purple-100 text-purple-700' };
      case StaffRole.BUSINESS_DIRECTOR: return { label: 'Giám đốc kinh doanh', class: 'bg-rose-100 text-rose-700' };
      case StaffRole.OPERATIONS_DIRECTOR: return { label: 'Giám đốc vận hành', class: 'bg-teal-100 text-teal-700' };
      case StaffRole.DIRECTOR: return { label: 'Giám đốc', class: 'bg-violet-100 text-violet-700' };
      case StaffRole.SALES_MANAGER: return { label: 'Trưởng phòng KD', class: 'bg-pink-100 text-pink-700' };
      case StaffRole.ACCOUNTANT: return { label: 'Kế toán', class: 'bg-indigo-100 text-indigo-700' };
      case StaffRole.IT: return { label: 'IT', class: 'bg-cyan-100 text-cyan-700' };
      case StaffRole.SALES_CONSULTANT: return { label: 'Tư vấn bán hàng', class: 'bg-blue-100 text-blue-700' };
      case StaffRole.ADMIN: return { label: 'Admin', class: 'bg-emerald-100 text-emerald-700' };
      case StaffRole.INVENTORY: return { label: 'Nhân viên kho', class: 'bg-amber-100 text-amber-700' };
      case StaffRole.DRIVER_RECRUITMENT_POINT: return { label: 'Điểm tuyển tài xế', class: 'bg-orange-100 text-orange-700' };
      default: return { label: 'Khác', class: 'bg-slate-100 text-slate-700' };
    }
  };

  const filteredStaff = staffList.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.code.toLowerCase().includes(search.toLowerCase())
  );

  if (selectedStaff) {
    const staffContracts = MOCK_SALES_CONTRACTS.filter(c => c.customerName.includes('')); // Trong thực tế filter theo staffId
    const staffCustomers = MOCK_CUSTOMERS.filter(c => c.assignedStaffId === selectedStaff.id);

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <button 
          onClick={() => setSelectedStaff(null)}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold text-sm transition-colors"
        >
          <ArrowLeft size={18} /> Quay lại danh sách
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Staff Header Card */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-[40px] border border-slate-200 p-8 shadow-sm text-center">
              <div className="mb-4 mx-auto">
                <Avatar 
                  src={selectedStaff.avatarUrl} 
                  name={selectedStaff.name} 
                  size="large"
                />
              </div>
              <h3 className="text-xl font-black text-slate-900">{selectedStaff.name}</h3>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">{selectedStaff.code}</p>
              
              <div className="mt-6 inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 text-blue-700 rounded-full text-[10px] font-black uppercase tracking-tighter">
                {getRoleBadge(selectedStaff.role).label}
              </div>

              <div className="mt-8 pt-8 border-t border-slate-50 space-y-4 text-left">
                 <div className="flex items-center gap-3">
                   <Phone size={16} className="text-slate-400" />
                   <span className="text-sm font-bold text-slate-900">{selectedStaff.phone}</span>
                 </div>
                 <div className="flex items-center gap-3">
                   <Mail size={16} className="text-slate-400" />
                   <span className="text-sm font-bold text-slate-900 truncate">{selectedStaff.email}</span>
                 </div>
                 <div className="flex items-center gap-3">
                   <Calendar size={16} className="text-slate-400" />
                   <span className="text-sm font-bold text-slate-900">Vào làm: {formatDate(selectedStaff.joinDate)}</span>
                 </div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-[32px] p-6 text-white overflow-hidden relative">
               <div className="relative z-10">
                  <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1">Hiệu suất bán hàng</p>
                  <h4 className="text-2xl font-black text-emerald-400">{formatVND(getStaffStats(selectedStaff.id).totalRevenue)}</h4>
                  <div className="mt-4 pt-4 border-t border-white/10">
                     <div className="flex justify-between items-center text-xs">
                        <span className="text-white/60">Số hợp đồng</span>
                        <span className="font-bold">{getStaffStats(selectedStaff.id).totalContracts}</span>
                     </div>
                  </div>
               </div>
               <BarChart3 className="absolute -bottom-4 -right-4 text-white/5" size={100} />
            </div>
          </div>

          {/* Details Content */}
          <div className="lg:col-span-3 space-y-6">
            <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 w-fit">
              {[
                { id: 'overview', label: 'Hồ sơ chuyên môn', icon: <UserCheck size={16} /> },
                { id: 'activities', label: 'Hoạt động nghiệp vụ', icon: <Activity size={16} /> },
                { id: 'performance', label: 'Báo cáo hiệu suất', icon: <TrendingUp size={16} /> },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all ${
                    activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'overview' && (
              <div className="space-y-6 animate-in slide-in-from-bottom-4">
                 <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Quyền hạn hệ thống</h4>
                       <div className="max-h-[400px] overflow-y-auto pr-2 space-y-6 custom-scrollbar">
                          {(() => {
                            // Ensure permissions is an object
                            const permissions = selectedStaff.permissions || {};
                            
                            // Define permission groups with their keys and labels (matching ProfilePage structure)
                            const permissionGroups = [
                              {
                                title: 'Tổng quan',
                                icon: <LayoutDashboard size={14} />,
                                permissions: [
                                  { key: 'dashboardView', label: 'Xem Dashboard', icon: <LayoutDashboard size={14} /> }
                                ]
                              },
                              {
                                title: 'Kho xe',
                                icon: <Settings size={14} />,
                                permissions: [
                                  { key: 'inventoryCreate', label: 'Thêm xe mới', icon: <Settings size={14} /> },
                                  { key: 'inventoryRead', label: 'Xem danh sách xe', icon: <Settings size={14} /> },
                                  { key: 'inventoryUpdate', label: 'Sửa thông tin xe', icon: <Settings size={14} /> },
                                  { key: 'inventoryDelete', label: 'Xóa xe', icon: <Settings size={14} /> },
                                  { key: 'inventoryPrice', label: 'Giá nhập - Giá bán', icon: <Settings size={14} /> },
                                  { key: 'inventoryView', label: 'Xem kho', icon: <Settings size={14} /> },
                                  { key: 'inventoryVehicles', label: 'Quản lý xe', icon: <Settings size={14} /> }
                                ]
                              },
                              {
                                title: 'Nhà cung cấp',
                                icon: <Building2 size={14} />,
                                permissions: [
                                  { key: 'supplierCreate', label: 'Thêm nhà cung cấp', icon: <Building2 size={14} /> },
                                  { key: 'supplierRead', label: 'Xem danh sách nhà cung cấp', icon: <Building2 size={14} /> },
                                  { key: 'supplierUpdate', label: 'Sửa thông tin nhà cung cấp', icon: <Building2 size={14} /> },
                                  { key: 'supplierDelete', label: 'Xóa nhà cung cấp', icon: <Building2 size={14} /> },
                                  { key: 'supplierDebt', label: 'Công nợ', icon: <Wallet size={14} /> },
                                  { key: 'supplierView', label: 'Xem nhà cung cấp', icon: <Building2 size={14} /> },
                                  { key: 'supplierInfo', label: 'Xem thông tin nhà cung cấp', icon: <Building2 size={14} /> },
                                  { key: 'supplierBasicInfo', label: 'Xem thông tin cơ bản', icon: <Building2 size={14} /> },
                                  { key: 'supplierFinancialInfo', label: 'Xem thông tin tài chính', icon: <Wallet size={14} /> },
                                  { key: 'supplierLegalInfo', label: 'Xem thông tin pháp lý', icon: <ShieldCheck size={14} /> },
                                  { key: 'supplierVehicles', label: 'Xem danh sách xe đã nhập', icon: <Car size={14} /> },
                                  { key: 'supplierPaymentHistory', label: 'Xem lịch sử thanh toán', icon: <Receipt size={14} /> },
                                  { key: 'supplierDebtHistory', label: 'Xem lịch sử nợ', icon: <History size={14} /> }
                                ]
                              },
                              {
                                title: 'Khách hàng',
                                icon: <Users size={14} />,
                                permissions: [
                                  { key: 'customerCreate', label: 'Thêm khách hàng', icon: <Users size={14} /> },
                                  { key: 'customerRead', label: 'Xem danh sách khách hàng', icon: <Users size={14} /> },
                                  { key: 'customerUpdate', label: 'Sửa thông tin khách hàng', icon: <Users size={14} /> },
                                  { key: 'customerDelete', label: 'Xóa khách hàng', icon: <Users size={14} /> },
                                  { key: 'customerSelf', label: 'Thông tin từ user tự nhập (Sales)', icon: <Users size={14} /> },
                                  { key: 'customerSubordinates', label: 'Thông tin từ user và từ cấp dưới (Quản lý cấp trung)', icon: <Users size={14} /> },
                                  { key: 'customerAll', label: 'Thông tin toàn hệ thống (Quản lý cấp cao)', icon: <Users size={14} /> },
                                  { key: 'customerView', label: 'Xem khách hàng', icon: <Users size={14} /> }
                                ]
                              },
                              {
                                title: 'Nhân sự',
                                icon: <ShieldAlert size={14} />,
                                permissions: [
                                  { key: 'staffCreate', label: 'Thêm nhân sự', icon: <ShieldAlert size={14} /> },
                                  { key: 'staffRead', label: 'Xem danh sách nhân sự', icon: <ShieldAlert size={14} /> },
                                  { key: 'staffUpdate', label: 'Sửa thông tin nhân sự', icon: <ShieldAlert size={14} /> },
                                  { key: 'staffDelete', label: 'Xóa nhân sự', icon: <ShieldAlert size={14} /> },
                                  { key: 'staffSubordinates', label: 'Nhân sự cấp dưới (Quản lý cấp trung)', icon: <ShieldAlert size={14} /> },
                                  { key: 'staffAll', label: 'Nhân sự toàn hệ thống (Quản lý cấp cao)', icon: <ShieldAlert size={14} /> },
                                  { key: 'staffView', label: 'Xem nhân sự', icon: <ShieldAlert size={14} /> }
                                ]
                              },
                              {
                                title: 'Hợp đồng',
                                icon: <FileText size={14} />,
                                permissions: [
                                  { key: 'contractsCreate', label: 'Tạo hợp đồng mới', icon: <FileText size={14} /> },
                                  { key: 'contractsRead', label: 'Xem chi tiết hợp đồng', icon: <FileText size={14} /> },
                                  { key: 'contractsUpdate', label: 'Sửa hợp đồng', icon: <FileText size={14} /> },
                                  { key: 'contractsDelete', label: 'Xóa hợp đồng', icon: <FileText size={14} /> },
                                  { key: 'contractsApprove', label: 'Duyệt hợp đồng', icon: <FileText size={14} /> },
                                  { key: 'contractsView', label: 'Xem hợp đồng', icon: <FileText size={14} /> },
                                  { key: 'contracts', label: 'Quản lý hợp đồng', icon: <FileText size={14} /> }
                                ]
                              },
                              {
                                title: 'CTKM',
                                icon: <Tag size={14} />,
                                permissions: [
                                  { key: 'promotionsCreate', label: 'Tạo CTKM mới', icon: <Tag size={14} /> },
                                  { key: 'promotionsRead', label: 'Xem chi tiết CTKM', icon: <Tag size={14} /> },
                                  { key: 'promotionsUpdate', label: 'Sửa CTKM', icon: <Tag size={14} /> },
                                  { key: 'promotionsDelete', label: 'Xóa CTKM', icon: <Tag size={14} /> },
                                  { key: 'promotionsView', label: 'Xem chương trình khuyến mãi', icon: <Tag size={14} /> }
                                ]
                              },
                              {
                                title: 'Đơn vị vận chuyển',
                                icon: <Package size={14} />,
                                permissions: [
                                  { key: 'carriersCreate', label: 'Thêm đơn vị vận chuyển', icon: <Package size={14} /> },
                                  { key: 'carriersRead', label: 'Xem chi tiết đơn vị vận chuyển', icon: <Package size={14} /> },
                                  { key: 'carriersUpdate', label: 'Sửa đơn vị vận chuyển', icon: <Package size={14} /> },
                                  { key: 'carriersDelete', label: 'Xóa đơn vị vận chuyển', icon: <Package size={14} /> },
                                  { key: 'carriersView', label: 'Xem đơn vị vận chuyển', icon: <Package size={14} /> }
                                ]
                              },
                              {
                                title: 'Thu chi & Dòng tiền',
                                icon: <Wallet size={14} />,
                                permissions: [
                                  { key: 'financeCreate', label: 'Tạo giao dịch mới', icon: <Wallet size={14} /> },
                                  { key: 'financeRead', label: 'Xem chi tiết giao dịch', icon: <Wallet size={14} /> },
                                  { key: 'financeUpdate', label: 'Sửa giao dịch', icon: <Wallet size={14} /> },
                                  { key: 'financeDelete', label: 'Xóa giao dịch', icon: <Wallet size={14} /> },
                                  { key: 'financeApprove', label: 'Duyệt giao dịch', icon: <CheckCircle2 size={14} /> },
                                  { key: 'financeView', label: 'Xem giao dịch', icon: <Wallet size={14} /> },
                                  { key: 'finance', label: 'Quản lý thu chi', icon: <Wallet size={14} /> }
                                ]
                              },
                              {
                                title: 'Quản lý công nợ',
                                icon: <CreditCard size={14} />,
                                permissions: [
                                  { key: 'debtManagementView', label: 'Xem công nợ', icon: <CreditCard size={14} /> },
                                  { key: 'debtManagementCreate', label: 'Tạo thanh toán công nợ', icon: <CreditCard size={14} /> },
                                  { key: 'debtManagementRead', label: 'Xem chi tiết công nợ', icon: <CreditCard size={14} /> },
                                  { key: 'debtManagementUpdate', label: 'Sửa thanh toán công nợ', icon: <CreditCard size={14} /> },
                                  { key: 'debtManagementDelete', label: 'Xóa thanh toán công nợ', icon: <CreditCard size={14} /> },
                                  { key: 'debtManagement', label: 'Quản lý công nợ', icon: <CreditCard size={14} /> }
                                ]
                              },
                              {
                                title: 'Kế toán',
                                icon: <Landmark size={14} />,
                                permissions: [
                                  { key: 'accountingView', label: 'Xem kế toán', icon: <Landmark size={14} /> },
                                  { key: 'accountingCreate', label: 'Tạo phiếu kế toán', icon: <Landmark size={14} /> },
                                  { key: 'accountingRead', label: 'Xem chi tiết phiếu kế toán', icon: <Landmark size={14} /> },
                                  { key: 'accountingUpdate', label: 'Sửa phiếu kế toán', icon: <Landmark size={14} /> },
                                  { key: 'accountingDelete', label: 'Xóa phiếu kế toán', icon: <Landmark size={14} /> },
                                  { key: 'accountingPost', label: 'Đăng phiếu kế toán', icon: <CheckCircle2 size={14} /> },
                                  { key: 'accountingLock', label: 'Khóa phiếu kế toán', icon: <Lock size={14} /> }
                                ]
                              },
                              {
                                title: 'Hồ sơ pháp lý',
                                icon: <FileText size={14} />,
                                permissions: [
                                  { key: 'registrationView', label: 'Xem hồ sơ pháp lý', icon: <FileText size={14} /> },
                                  { key: 'registrationUpdate', label: 'Cập nhật hồ sơ pháp lý', icon: <FileText size={14} /> },
                                  { key: 'registration', label: 'Quản lý hồ sơ pháp lý', icon: <FileText size={14} /> }
                                ]
                              },
                              {
                                title: 'Báo cáo',
                                icon: <LayoutDashboard size={14} />,
                                permissions: [
                                  { key: 'reportsView', label: 'Xem báo cáo', icon: <LayoutDashboard size={14} /> },
                                  { key: 'reportsExport', label: 'Xuất báo cáo', icon: <LayoutDashboard size={14} /> },
                                  { key: 'reports', label: 'Quản lý báo cáo', icon: <LayoutDashboard size={14} /> }
                                ]
                              },
                              {
                                title: 'Legacy Permissions',
                                icon: <Settings size={14} />,
                                permissions: [
                                  { key: 'canManageContract', label: 'Quản lý hợp đồng', icon: <FileText size={14} /> },
                                  { key: 'canApproveFinance', label: 'Duyệt giao dịch', icon: <CheckCircle2 size={14} /> },
                                  { key: 'canViewReports', label: 'Xem báo cáo', icon: <LayoutDashboard size={14} /> },
                                  { key: 'canManageInventory', label: 'Quản lý kho', icon: <Settings size={14} /> },
                                  { key: 'canManageStaff', label: 'Quản lý nhân sự', icon: <ShieldAlert size={14} /> }
                                ]
                              }
                            ];
                            
                            // Render permission groups
                            // IMPORTANT: Only show groups that have at least one permission with value true
                            // Filter out groups with no true permissions first
                            const renderedGroups = permissionGroups
                              .map((group) => {
                                // Filter permissions for this group - only show permissions that are true
                                const groupPermissions = group.permissions.filter((perm) => {
                                  const permValue = (permissions as unknown as Record<string, unknown>)[perm.key];
                                  // Only show permissions that are explicitly true (handle both boolean and string 'true')
                                  return permValue === true || permValue === 'true';
                                });
                                
                                // Only return group if it has at least one true permission
                                if (groupPermissions.length === 0) {
                                  return null;
                                }
                                
                                return {
                                  ...group,
                                  permissions: groupPermissions
                                };
                              })
                              .filter((group): group is typeof permissionGroups[0] => group !== null) // Type-safe filter
                              .map((group) => (
                                <div key={group.title} className="space-y-3">
                                  <h5 className="text-[9px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                    {group.icon} {group.title}
                                  </h5>
                                  <div className="space-y-2 pl-6">
                                    {group.permissions.map((perm) => (
                                      <div key={perm.key} className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700">
                                        <CheckCircle2 size={14} className="flex-shrink-0" />
                                        <span className="text-xs font-bold">{perm.label}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ));
                            
                            // Check if there are any true permissions to display
                            const hasTruePermissions = Object.entries(permissions).some(([_, value]) => 
                              value === true || value === 'true'
                            );
                            
                            if (!hasTruePermissions || renderedGroups.length === 0) {
                              return (
                                <div className="text-center py-8 text-slate-400 text-sm">
                                  Chưa có quyền hạn nào được phân công
                                </div>
                              );
                            }
                            
                            return renderedGroups;
                          })()}
                       </div>
                    </div>
                    <div className="space-y-6">
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Tài khoản & Phụ trách</h4>
                       <div className="space-y-4">
                          <div>
                             <p className="text-[10px] font-bold text-slate-400 uppercase">Tên đăng nhập</p>
                             <p className="text-sm font-black text-slate-900">{selectedStaff.username}</p>
                          </div>
                          <div>
                             <p className="text-[10px] font-bold text-slate-400 uppercase">Người quản lý</p>
                             <p className="text-sm font-bold text-blue-600">
                               {selectedStaff.managerId && managerMap.has(selectedStaff.managerId) 
                                 ? managerMap.get(selectedStaff.managerId) 
                                 : 'Chưa phân công'}
                             </p>
                          </div>
                          <div>
                             <p className="text-[10px] font-bold text-slate-400 uppercase">Ghi chú nhân sự</p>
                             <p className="text-xs italic text-slate-500 leading-relaxed">
                               {selectedStaff.notes || 'Chưa có ghi chú'}
                             </p>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
            )}

            {activeTab === 'activities' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-4">
                 <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                       <h4 className="text-xs font-black text-slate-900 uppercase">Khách hàng phụ trách</h4>
                       <span className="text-xs font-bold text-blue-600">{staffCustomers.length} KH</span>
                    </div>
                    <div className="space-y-4">
                       {staffCustomers.map(c => (
                         <div key={c.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl hover:bg-blue-50 transition-colors cursor-pointer">
                            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm">
                               {c.name.charAt(0)}
                            </div>
                            <div className="flex-1">
                               <p className="text-xs font-black text-slate-900">{c.name}</p>
                               <p className="text-[10px] text-slate-500">{c.phone}</p>
                            </div>
                            <ChevronRight size={14} className="text-slate-300" />
                         </div>
                       ))}
                    </div>
                 </div>
                 
                 <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                       <h4 className="text-xs font-black text-slate-900 uppercase">Giao dịch thực hiện gần đây</h4>
                    </div>
                    <div className="space-y-4">
                       <div className="p-4 border-l-4 border-emerald-500 bg-emerald-50 rounded-r-2xl">
                          <p className="text-[10px] font-black text-emerald-600 uppercase">Phiếu thu tiền cọc</p>
                          <p className="text-xs font-bold text-slate-900 mt-1">Hợp đồng #HDMB-001</p>
                          <p className="text-[9px] text-slate-500 mt-0.5">Thời gian: 15/05/2024 14:30</p>
                       </div>
                       <div className="p-4 border-l-4 border-blue-500 bg-blue-50 rounded-r-2xl">
                          <p className="text-[10px] font-black text-blue-600 uppercase">Cập nhật hồ sơ xe</p>
                          <p className="text-xs font-bold text-slate-900 mt-1">VIN: VN123456789</p>
                          <p className="text-[9px] text-slate-500 mt-0.5">Thời gian: 15/05/2024 10:15</p>
                       </div>
                    </div>
                 </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Check if user has any staff permissions
  const hasStaffPermissions = hasAnyPermission(user?.permissions, PermissionCategories.staff);
  const canCreateStaff = hasAnyPermission(user?.permissions, ['staffCreate']);
  const canUpdateStaff = hasAnyPermission(user?.permissions, ['staffUpdate']);

  // If user doesn't have any staff permissions, show access denied message
  if (!hasStaffPermissions) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white/80 backdrop-blur-md rounded-[40px] border border-white p-20 text-center shadow-xl max-w-md">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldAlert size={40} className="text-slate-300" />
          </div>
          <h3 className="text-xl font-black text-slate-900 mb-2">Không có quyền truy cập</h3>
          <p className="text-slate-500 font-bold">Bạn không có quyền xem nhân sự. Vui lòng liên hệ quản trị viên để được cấp quyền.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      {[
      { label: 'Tổng nhân sự', value: staffList.filter(s => s.role !== StaffRole.DRIVER_RECRUITMENT_POINT).length, color: 'text-slate-900', icon: <Users size={16} /> },
      { label: 'Đang làm việc', value: staffList.filter(s => s.status === StaffStatus.ACTIVE && s.role !== StaffRole.DRIVER_RECRUITMENT_POINT).length, color: 'text-emerald-600', icon: <UserCheck size={16} /> },
      // Đội ngũ Sales nội bộ: Sales + Trưởng phòng KD, không tính điểm tuyển tài xế
      { label: 'Đội ngũ Sales', value: staffList.filter(s => s.role === StaffRole.SALES_CONSULTANT || s.role === StaffRole.SALES_MANAGER).length, color: 'text-blue-600', icon: <TrendingUp size={16} /> },
      { label: 'Hệ thống Admin', value: staffList.filter(s => s.role === StaffRole.ADMIN || s.role === StaffRole.STRATEGIC_DIRECTOR).length, color: 'text-rose-600', icon: <Info size={16} /> },
      { label: 'Điểm tuyển tài xế', value: staffList.filter(s => s.role === StaffRole.DRIVER_RECRUITMENT_POINT).length, color: 'text-orange-600', icon: <Car size={16} /> },
      ].map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-xl ${stat.color.replace('text', 'bg').replace('600', '50')} ${stat.color}`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-slate-200">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Tìm theo tên, mã nhân viên..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold focus:ring-4 focus:ring-blue-500/10 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportStaffData}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-bold text-sm transition-all"
            title="Xuất danh sách nhân sự"
          >
            <Download size={16} /> Xuất file
          </button>
          {canCreateStaff && (
            <Link
              href="/staff/new"
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-black text-sm shadow-lg shadow-blue-200 transition-all"
            >
              <Plus size={16} /> Thêm nhân sự
            </Link>
          )}
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <tr>
              <th className="px-6 py-4">Hồ sơ nhân viên</th>
              <th className="px-6 py-4">Vai trò</th>
              <th className="px-6 py-4">Chi nhánh</th>
              <th className="px-6 py-4">Người quản lý</th>
              <th className="px-6 py-4 text-center">Trạng thái</th>
              <th className="px-6 py-4 text-right">Hiệu suất (Sales)</th>
              <th className="px-6 py-4 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="text-slate-500 text-sm">Đang tải dữ liệu...</p>
                  </div>
                </td>
              </tr>
            ) : filteredStaff.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <p className="text-slate-500 text-sm">Chưa có nhân sự nào</p>
                </td>
              </tr>
            ) : (
              filteredStaff.map((s) => {
                const roleInfo = getRoleBadge(s.role);
                return (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer group" onClick={(e) => {
                    // If user is selecting text, don't navigate
                    if (window.getSelection()?.toString()) return;
                    setSelectedStaff(s);
                  }}>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <Avatar 
                          src={s.avatarUrl} 
                          name={s.name} 
                          size="small"
                          className="transition-all"
                        />
                        <div>
                          <h4 className="font-bold text-slate-900 leading-none">{s.name}</h4>
                          <p className="text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-tighter">
                            {s.code} <span className="text-slate-300 mx-1">•</span> {s.phone}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight ${roleInfo.class}`}>
                        {roleInfo.label}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                         <Building2 size={14} className="text-slate-400" /> {s.branch}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                         <Users size={14} className="text-slate-400" />
                         {s.managerId && managerMap.has(s.managerId) 
                           ? managerMap.get(s.managerId) 
                           : <span className="text-slate-400 italic">Chưa phân công</span>}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black ${
                        s.status === StaffStatus.ACTIVE ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                      }`}>
                         <div className={`w-1.5 h-1.5 rounded-full ${s.status === StaffStatus.ACTIVE ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                         {s.status === StaffStatus.ACTIVE ? 'ĐANG LÀM' : 'ĐÃ NGHỈ'}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                    {(s.role === StaffRole.SALES_CONSULTANT || s.role === StaffRole.SALES_MANAGER || s.role === StaffRole.BUSINESS_DIRECTOR || s.role === StaffRole.DRIVER_RECRUITMENT_POINT) ? (
                    <div>
                       <p className="text-sm font-black text-slate-900">{formatVND(getStaffStats(s.id).totalRevenue)}</p>
                       <p className="text-[9px] font-bold text-slate-400 uppercase">{getStaffStats(s.id).totalContracts} Hợp đồng</p>
                    </div>
                    ) : (
                    <span className="text-[10px] text-slate-300 font-bold uppercase">N/A</span>
                    )}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-center">
                        {canUpdateStaff && (
                          <Link
                            href={`/staff/${s.id}/edit`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-all flex items-center justify-center w-10 h-10"
                            title="Chỉnh sửa"
                          >
                            <Settings size={18} />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
