'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  User, Phone, Mail, Calendar, ShieldCheck, Briefcase, 
  Building2, ArrowLeft, MapPin, GraduationCap, 
  FileText, Clock, CheckCircle2,
  XCircle, Lock, Settings, Hash, CreditCard,
  Landmark, Users, LayoutDashboard, ShieldAlert, Wallet, Package, Tag,
  Car, Receipt, History
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ChangePasswordModal } from '@/components/ChangePasswordModal';
import { ChangeAvatarModal } from '@/components/ChangeAvatarModal';
import { Save, Edit2, X } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showChangeAvatarModal, setShowChangeAvatarModal] = useState(false);
  const [isEditingPersonalInfo, setIsEditingPersonalInfo] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [personalInfoForm, setPersonalInfoForm] = useState({
    full_name: '',
    phone: '',
    date_of_birth: '',
    id_card: '',
    id_card_issue_date: '',
    id_card_issue_place: '',
    professional_level: '',
    permanent_address: '',
    current_address: '',
    tax_code: '',
    dependents: 0,
    bank_name: '',
    bank_account: ''
  });
  const [dateDisplayValues, setDateDisplayValues] = useState<{
    date_of_birth: string;
    id_card_issue_date: string;
  }>({
    date_of_birth: '',
    id_card_issue_date: ''
  });

  // Scroll to top and refresh user data when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Automatically refresh user data from database when component mounts
    const loadUserData = async () => {
      if (user?.id) {
        try {
          await refreshUser();
        } catch (error) {
          console.error('Error loading user data:', error);
        }
      }
    };
    loadUserData();
  }, []); // Only run once on mount

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-slate-500 font-medium">Đang tải thông tin...</p>
        </div>
      </div>
    );
  }

  const getRoleLabel = (role: string) => {
    const roleMap: { [key: string]: string } = {
      'MANAGER': 'Quản lý',
      'SALES': 'Kinh doanh',
      'ACCOUNTANT': 'Kế toán',
      'INVENTORY': 'Kho',
      'LEGAL': 'Hồ sơ',
      'SALES_CONSULTANT': 'Tư vấn bán hàng',
      'SALES_MANAGER': 'Quản lý kinh doanh',
      'STRATEGIC_DIRECTOR': 'Giám đốc chiến lược',
      'BUSINESS_DIRECTOR': 'Giám đốc kinh doanh',
      'OPERATIONS_DIRECTOR': 'Giám đốc vận hành',
      'DIRECTOR': 'Giám đốc',
      'IT': 'Công nghệ thông tin',
      'ADMIN': 'Quản trị viên',
      'DRIVER_RECRUITMENT_POINT': 'Điểm tuyển tài xế'
    };
    return roleMap[role] || role;
  };

  const getStatusConfig = (status: string) => {
    if (status === 'ACTIVE') {
      return {
        label: 'Đang hoạt động',
        icon: <CheckCircle2 size={16} className="text-emerald-500" />,
        class: 'bg-emerald-50 text-emerald-600 border-emerald-200'
      };
    }
    return {
      label: 'Không hoạt động',
      icon: <XCircle size={16} className="text-red-500" />,
      class: 'bg-red-50 text-red-600 border-red-200'
    };
  };

  const statusConfig = getStatusConfig(user.status);

  // Check if current user is admin
  const isAdmin = user.role === 'ADMIN' || user.role === 'STRATEGIC_DIRECTOR';

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

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Chưa cập nhật';
    try {
      // Handle ISO format (YYYY-MM-DD) or full ISO datetime
      let date: Date;
      if (dateString.includes('T')) {
        date = new Date(dateString);
      } else if (dateString.includes('-')) {
        // Assume YYYY-MM-DD format
        const parts = dateString.split('-');
        if (parts.length === 3) {
          date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        } else {
          date = new Date(dateString);
        }
      } else {
        date = new Date(dateString);
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Chưa cập nhật';
      }
      
      // Format as dd/mm/yyyy
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateString || 'Chưa cập nhật';
    }
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'Chưa đăng nhập';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  // Initialize form data when user data is loaded or when entering edit mode
  useEffect(() => {
    if (user && isEditingPersonalInfo) {
      setPersonalInfoForm({
        full_name: user.full_name || '',
        phone: user.phone || '',
        date_of_birth: user.date_of_birth || '',
        id_card: user.id_card || '',
        id_card_issue_date: user.id_card_issue_date || '',
        id_card_issue_place: user.id_card_issue_place || '',
        professional_level: user.professional_level || '',
        permanent_address: user.permanent_address || '',
        current_address: user.current_address || '',
        tax_code: user.tax_code || '',
        dependents: user.dependents || 0,
        bank_name: user.bank_name || '',
        bank_account: user.bank_account || ''
      });
    }
  }, [user, isEditingPersonalInfo]);

  // Helper function to format ISO date (YYYY-MM-DD) to dd/mm/yyyy
  const formatDateToDisplay = (dateString: string, fieldName?: 'date_of_birth' | 'id_card_issue_date'): string => {
    if (fieldName && dateDisplayValues[fieldName]) {
      return dateDisplayValues[fieldName];
    }
    
    if (!dateString) return '';
    if (dateString.includes('/')) return dateString;
    const parts = dateString.split('T')[0].split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return '';
  };

  // Helper function to parse dd/mm/yyyy to ISO date (YYYY-MM-DD)
  const parseDateToISO = (dateString: string): string => {
    if (!dateString) return '';
    const cleaned = dateString.replace(/[^\d/]/g, '');
    const parts = cleaned.split('/').filter(p => p.length > 0);
    
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      
      if (year.length === 4) {
        const dayNum = parseInt(day);
        const monthNum = parseInt(month);
        const yearNum = parseInt(year);
        
        if (dayNum > 0 && dayNum <= 31 && monthNum > 0 && monthNum <= 12 && yearNum >= 1900 && yearNum <= 2100) {
          return `${year}-${month}-${day}`;
        }
      }
    }
    
    if (dateString.includes('-')) {
      return dateString.split('T')[0];
    }
    
    return '';
  };

  // Handle date input change with auto-formatting
  const handleDateInputChange = (
    value: string,
    fieldName: 'date_of_birth' | 'id_card_issue_date'
  ) => {
    let cleaned = value.replace(/[^\d/]/g, '');
    let digits = cleaned.replace(/\//g, '');
    let formatted = '';
    
    if (digits.length > 0) {
      formatted = digits.slice(0, 2);
      if (digits.length > 2) {
        formatted += '/' + digits.slice(2, 4);
      }
      if (digits.length > 4) {
        formatted += '/' + digits.slice(4, 8);
      }
    }
    
    if (formatted.length > 10) {
      formatted = formatted.slice(0, 10);
    }
    
    setDateDisplayValues(prev => ({ ...prev, [fieldName]: formatted }));
    
    const isoDate = parseDateToISO(formatted);
    if (isoDate) {
      setPersonalInfoForm(prev => ({ ...prev, [fieldName]: isoDate }));
      setDateDisplayValues(prev => ({ ...prev, [fieldName]: '' }));
    } else if (formatted.length === 0) {
      setPersonalInfoForm(prev => ({ ...prev, [fieldName]: '' }));
      setDateDisplayValues(prev => ({ ...prev, [fieldName]: '' }));
    }
  };

  // Handle date input blur
  const handleDateInputBlur = (fieldName: 'date_of_birth' | 'id_card_issue_date') => {
    const displayValue = dateDisplayValues[fieldName];
    if (displayValue) {
      const isoDate = parseDateToISO(displayValue);
      if (isoDate) {
        setPersonalInfoForm(prev => ({ ...prev, [fieldName]: isoDate }));
        setDateDisplayValues(prev => ({ ...prev, [fieldName]: '' }));
      } else {
        setDateDisplayValues(prev => ({ ...prev, [fieldName]: '' }));
        setPersonalInfoForm(prev => ({ ...prev, [fieldName]: '' }));
      }
    }
  };

  // Handle save personal information
  const handleSavePersonalInfo = async () => {
    if (!user?.id) return;
    
    setIsSaving(true);
    setSaveError(null);

    try {
      // Helper function to convert empty strings to null
      const toNullIfEmpty = (value: any): any => {
        if (value === '' || value === undefined) return null;
        return value;
      };

      const updateData: any = {
        full_name: personalInfoForm.full_name.trim(),
        phone: toNullIfEmpty(personalInfoForm.phone?.trim()),
        date_of_birth: toNullIfEmpty(personalInfoForm.date_of_birth),
        id_card: toNullIfEmpty(personalInfoForm.id_card?.trim()),
        id_card_issue_date: toNullIfEmpty(personalInfoForm.id_card_issue_date),
        id_card_issue_place: toNullIfEmpty(personalInfoForm.id_card_issue_place?.trim()),
        professional_level: toNullIfEmpty(personalInfoForm.professional_level?.trim()),
        permanent_address: toNullIfEmpty(personalInfoForm.permanent_address?.trim()),
        current_address: toNullIfEmpty(personalInfoForm.current_address?.trim()),
        tax_code: toNullIfEmpty(personalInfoForm.tax_code?.trim()),
        dependents: personalInfoForm.dependents || 0,
        bank_name: toNullIfEmpty(personalInfoForm.bank_name?.trim()),
        bank_account: toNullIfEmpty(personalInfoForm.bank_account?.trim())
      };

      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, data: updateData })
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || 'Có lỗi xảy ra khi cập nhật thông tin');
      }

      // Refresh user data
      await refreshUser();
      setIsEditingPersonalInfo(false);
      setDateDisplayValues({ date_of_birth: '', id_card_issue_date: '' });
    } catch (error: any) {
      console.error('Error saving personal info:', error);
      setSaveError(error.message || 'Có lỗi xảy ra khi cập nhật thông tin');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingPersonalInfo(false);
    setSaveError(null);
    setDateDisplayValues({ date_of_birth: '', id_card_issue_date: '' });
  };

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-3 hover:bg-slate-100 rounded-2xl transition-colors text-slate-400 hover:text-slate-900"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-tighter">Hồ sơ cá nhân</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900">Thông tin hồ sơ</h2>
            <p className="text-xs text-slate-500 font-medium">Xem và quản lý thông tin tài khoản của bạn</p>
          </div>
        </div>
      </div>

      {/* Profile Content */}
      <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-10 space-y-12">
          {/* Profile Header Card */}
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6 p-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl border border-blue-100">
            <div className="relative group cursor-pointer" onClick={() => setShowChangeAvatarModal(true)}>
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-3xl transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100 z-10">
                <span className="text-white text-xs font-black uppercase tracking-wider">Đổi avatar</span>
              </div>
              <img 
                src={user.avatar_url || "https://picsum.photos/seed/vinfast/120/120"} 
                className="w-32 h-32 rounded-3xl shadow-lg border-4 border-white transition-all duration-200 group-hover:scale-105"
                alt="Avatar"
              />
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-[#00d26a] rounded-full border-4 border-white flex items-center justify-center">
                <CheckCircle2 size={16} className="text-white" />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-3xl font-black text-slate-900">{user.full_name}</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-black border ${statusConfig.class} flex items-center gap-1.5`}>
                  {statusConfig.icon}
                  {statusConfig.label}
                </span>
              </div>
              <p className="text-lg font-bold text-slate-600 mb-1">{getRoleLabel(user.role)}</p>
              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <Building2 size={16} />
                  <span className="font-medium">{user.branch}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail size={16} />
                  <span className="font-medium">{user.email}</span>
                </div>
                {user.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={16} />
                    <span className="font-medium">{user.phone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Left Column: Personal Info */}
            <div className="space-y-10">
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <User size={18} className="text-blue-600" /> A. Thông tin cá nhân
                  </h3>
                  {!isEditingPersonalInfo && (
                    <button
                      onClick={() => setIsEditingPersonalInfo(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 rounded-xl text-sm font-bold text-blue-600 transition-colors"
                    >
                      <Edit2 size={16} />
                      Chỉnh sửa
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Họ và tên</label>
                    {isEditingPersonalInfo ? (
                      <input
                        type="text"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                        value={personalInfoForm.full_name}
                        onChange={e => setPersonalInfoForm({...personalInfoForm, full_name: e.target.value})}
                      />
                    ) : (
                      <div className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900">
                        {user.full_name}
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Số điện thoại</label>
                      {isEditingPersonalInfo ? (
                        <input
                          type="tel"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                          value={personalInfoForm.phone}
                          onChange={e => setPersonalInfoForm({...personalInfoForm, phone: e.target.value})}
                        />
                      ) : (
                        <div className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900">
                          {user.phone || 'Chưa cập nhật'}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</label>
                      <div className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900">
                        {user.email}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngày tháng năm sinh</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      {isEditingPersonalInfo ? (
                        <input
                          type="text"
                          placeholder="dd/mm/yyyy"
                          className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                          value={formatDateToDisplay(personalInfoForm.date_of_birth || '', 'date_of_birth')}
                          onChange={e => handleDateInputChange(e.target.value, 'date_of_birth')}
                          onBlur={() => handleDateInputBlur('date_of_birth')}
                          maxLength={10}
                        />
                      ) : (
                        <div className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900">
                          {formatDate(user.date_of_birth)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Số CCCD/CMND</label>
                      {isEditingPersonalInfo ? (
                        <input
                          type="text"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                          value={personalInfoForm.id_card}
                          onChange={e => setPersonalInfoForm({...personalInfoForm, id_card: e.target.value})}
                        />
                      ) : (
                        <div className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900">
                          {user.id_card || 'Chưa cập nhật'}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngày cấp</label>
                      {isEditingPersonalInfo ? (
                        <input
                          type="text"
                          placeholder="dd/mm/yyyy"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                          value={formatDateToDisplay(personalInfoForm.id_card_issue_date || '', 'id_card_issue_date')}
                          onChange={e => handleDateInputChange(e.target.value, 'id_card_issue_date')}
                          onBlur={() => handleDateInputBlur('id_card_issue_date')}
                          maxLength={10}
                        />
                      ) : (
                        <div className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900">
                          {formatDate(user.id_card_issue_date)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nơi cấp CCCD/CMND</label>
                    {isEditingPersonalInfo ? (
                      <select
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                        value={personalInfoForm.id_card_issue_place || ''}
                        onChange={e => setPersonalInfoForm({...personalInfoForm, id_card_issue_place: e.target.value})}
                      >
                        <option value="">-- Chọn nơi cấp --</option>
                        <option value="Cục cảnh sát quản lý hành chính về trật tự xã hội">Cục cảnh sát quản lý hành chính về trật tự xã hội</option>
                        <option value="Bộ Công An">Bộ Công An</option>
                      </select>
                    ) : (
                      <div className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900">
                        {user.id_card_issue_place || 'Chưa cập nhật'}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trình độ chuyên môn</label>
                    <div className="relative">
                      <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      {isEditingPersonalInfo ? (
                        <input
                          type="text"
                          className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                          value={personalInfoForm.professional_level}
                          onChange={e => setPersonalInfoForm({...personalInfoForm, professional_level: e.target.value})}
                          placeholder="Ví dụ: Đại học, Cao đẳng, Trung cấp..."
                        />
                      ) : (
                        <div className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900">
                          {user.professional_level || 'Chưa cập nhật'}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Địa chỉ hộ khẩu</label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      {isEditingPersonalInfo ? (
                        <input
                          type="text"
                          className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                          value={personalInfoForm.permanent_address}
                          onChange={e => setPersonalInfoForm({...personalInfoForm, permanent_address: e.target.value})}
                          placeholder="Nhập địa chỉ hộ khẩu thường trú"
                        />
                      ) : (
                        <div className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900">
                          {user.permanent_address || 'Chưa cập nhật'}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nơi ở hiện tại</label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      {isEditingPersonalInfo ? (
                        <input
                          type="text"
                          className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                          value={personalInfoForm.current_address}
                          onChange={e => setPersonalInfoForm({...personalInfoForm, current_address: e.target.value})}
                          placeholder="Nhập địa chỉ nơi ở hiện tại"
                        />
                      ) : (
                        <div className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900">
                          {user.current_address || 'Chưa cập nhật'}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mã số thuế</label>
                      {isEditingPersonalInfo ? (
                        <input
                          type="text"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                          value={personalInfoForm.tax_code}
                          onChange={e => setPersonalInfoForm({...personalInfoForm, tax_code: e.target.value})}
                          placeholder="Nhập mã số thuế"
                        />
                      ) : (
                        <div className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900">
                          {user.tax_code || 'Chưa cập nhật'}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Người phụ thuộc</label>
                      <div className="relative">
                        <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        {isEditingPersonalInfo ? (
                          <input
                            type="number"
                            min="0"
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                            value={personalInfoForm.dependents || 0}
                            onChange={e => setPersonalInfoForm({...personalInfoForm, dependents: parseInt(e.target.value) || 0})}
                            placeholder="0"
                          />
                        ) : (
                          <div className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900">
                            {user.dependents !== undefined && user.dependents !== null ? user.dependents : 0}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tên ngân hàng</label>
                      <div className="relative">
                        <Landmark className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        {isEditingPersonalInfo ? (
                          <input
                            type="text"
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                            value={personalInfoForm.bank_name}
                            onChange={e => setPersonalInfoForm({...personalInfoForm, bank_name: e.target.value})}
                            placeholder="Ví dụ: Techcombank"
                          />
                        ) : (
                          <div className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900">
                            {user.bank_name || 'Chưa cập nhật'}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Số tài khoản</label>
                      <div className="relative">
                        <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        {isEditingPersonalInfo ? (
                          <input
                            type="text"
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                            value={personalInfoForm.bank_account}
                            onChange={e => setPersonalInfoForm({...personalInfoForm, bank_account: e.target.value})}
                            placeholder="Nhập số tài khoản"
                          />
                        ) : (
                          <div className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900">
                            {user.bank_account || 'Chưa cập nhật'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {isEditingPersonalInfo && (
                    <div className="pt-4 space-y-4">
                      {saveError && (
                        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
                          <XCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                          <div className="flex-1">
                            <p className="text-sm font-bold text-red-900">Lỗi khi cập nhật</p>
                            <p className="text-xs text-red-700 mt-1">{saveError}</p>
                          </div>
                        </div>
                      )}
                      <div className="flex justify-end gap-4">
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          disabled={isSaving}
                          className="px-8 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          onClick={handleSavePersonalInfo}
                          disabled={isSaving}
                          className="flex items-center gap-2 px-12 py-3 bg-blue-600 text-white rounded-2xl text-sm font-black hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSaving ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                              Đang cập nhật...
                            </>
                          ) : (
                            <>
                              <Save size={18} />
                              Cập nhật thông tin
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <section className="space-y-6">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <Briefcase size={18} className="text-indigo-600" /> B. Thông tin công việc
                </h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tên đăng nhập</label>
                    <div className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900">
                      {user.username}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vai trò công việc</label>
                    <div className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900">
                      {getRoleLabel(user.role)}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chi nhánh</label>
                    <div className="relative">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" size={18} />
                      <div className="w-full pl-12 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900">
                        {user.branch}
                      </div>
                    </div>
                  </div>

                  {user.join_date && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngày vào làm</label>
                      <div className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900">
                        {formatDate(user.join_date)}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lần đăng nhập cuối</label>
                    <div className="relative">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <div className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900">
                        {formatDateTime(user.last_login_at)}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* Right Column: Job Info & Permissions */}
            <div className="space-y-10">
              <section className="space-y-6">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <ShieldCheck size={18} className="text-emerald-600" /> Quyền hạn hệ thống
                </h3>
                <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
                  {(() => {
                    // Ensure permissions is an object
                    const permissions = user.permissions || {};
                    
                    // Define permission groups with their keys and labels
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
                    // IMPORTANT: Only show permissions with value true (remove false permissions)
                    const renderedGroups = permissionGroups.map((group) => {
                      // Filter permissions for this group - only show permissions that are true
                      const groupPermissions = group.permissions.filter((perm) => {
                        const permValue = permissions[perm.key];
                        // Only show permissions that are explicitly true
                        return permValue === true;
                      });

                      // Don't render group if no permissions match
                      if (groupPermissions.length === 0) {
                        return null;
                      }

                      return (
                        <div key={group.title} className="space-y-3">
                          <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                            {group.icon} {group.title}
                          </h4>
                          {groupPermissions.map((perm) => {
                            // All permissions here are already filtered to be true, so we can display them directly
                            return (
                              <div
                                key={perm.key}
                                className="w-full flex items-center justify-between p-3 rounded-xl border transition-all bg-emerald-50 border-emerald-200 text-emerald-900"
                              >
                                <div className="flex items-center gap-2">
                                  {perm.icon}
                                  <span className="text-xs font-bold">{perm.label}</span>
                                </div>
                                <div className="w-4 h-4 rounded border flex items-center justify-center bg-emerald-500 border-emerald-500 text-white">
                                  <CheckCircle2 size={12} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    }).filter(Boolean); // Remove null entries
                    
                    // Check if there are any true permissions to display
                    const hasTruePermissions = Object.entries(permissions).some(([_, value]) =>
                      value === true
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
              </section>

              <section className="space-y-6">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <FileText size={18} className="text-blue-600" /> Thông tin hệ thống
                </h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngày tạo tài khoản</label>
                    <div className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900">
                      {formatDate(user.created_at)}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cập nhật lần cuối</label>
                    <div className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900">
                      {formatDate(user.updated_at)}
                    </div>
                  </div>
                </div>
              </section>

              {/* Actions */}
              <section className="space-y-6">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <Settings size={18} className="text-blue-600" /> Thao tác
                </h3>
                <div className="space-y-3">
                  <button
                    onClick={() => setShowChangePasswordModal(true)}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-2xl border border-blue-200 transition-colors text-left group"
                  >
                    <Lock size={18} className="text-blue-600 group-hover:text-blue-700" />
                    <span className="text-sm font-bold text-slate-900">Đổi mật khẩu</span>
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal 
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        isRequired={false}
      />

      {/* Change Avatar Modal */}
      <ChangeAvatarModal 
        isOpen={showChangeAvatarModal}
        onClose={() => setShowChangeAvatarModal(false)}
      />
    </div>
  );
};
