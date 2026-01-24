'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Save, User, Phone, Mail, 
  Calendar, ShieldCheck, Briefcase, 
  Building2, Lock, Eye, EyeOff,
  CheckCircle2, Info, LayoutDashboard,
  ShieldAlert, Settings, FileText, Wallet, ArrowLeft,
  CreditCard, Landmark, MapPin, GraduationCap, Users,
  Package, Tag, Car, Receipt, History
} from 'lucide-react';
import { StaffRole, StaffStatus, StaffPermissions } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { AccessDenied } from './AccessDenied';
import { notificationService } from '@/services/notificationService';

export const StaffFormPage: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  
  // Check if current user is admin or operations director
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'STRATEGIC_DIRECTOR' || user?.role === 'OPERATIONS_DIRECTOR';
  
  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Fetch staff list for manager dropdown
  useEffect(() => {
    const fetchStaffList = async () => {
      try {
        const response = await fetch('/api/staff?status=ACTIVE&fields=basic', { cache: 'no-store' });
        const result = await response.json();

        if (!response.ok) {
          console.error('Error fetching staff list:', result?.error || 'Unknown error');
          return;
        }

        const data = result?.staff || [];

        if (data) {
          setStaffList(data);
        }
      } catch (err) {
        console.error('Unexpected error fetching staff list:', err);
      }
    };

    fetchStaffList();
  }, []);

  const [formData, setFormData] = useState<Partial<any>>({
    name: '',
    phone: '',
    email: '',
    dateOfBirth: '',
    idCard: '',
    idCardIssueDate: '',
    idCardIssuePlace: '',
    bankName: '',
    bankAccount: '',
    professionalLevel: '',
    permanentAddress: '',
    currentAddress: '',
    taxCode: '',
    dependents: 0,
    role: StaffRole.SALES_CONSULTANT,
    branch: 'GCM-Tổng',
    status: StaffStatus.ACTIVE,
    joinDate: new Date().toISOString().split('T')[0],
    managerId: '',
    username: '',
    // Permissions must match StaffPermissions interface in types.ts
    // IMPORTANT: Keep this synchronized with defaultPermissions in handleSubmit for consistency
    permissions: {
      // Dashboard
      dashboardView: false,
      
      // Kho (Inventory)
      inventoryView: false,
      inventoryCreate: false,
      inventoryRead: false,
      inventoryUpdate: false,
      inventoryDelete: false,
      inventoryVehicles: false,
      inventoryPrice: false,
      
      // Nhà cung cấp (Suppliers)
      supplierView: false,
      supplierCreate: false,
      supplierRead: false,
      supplierUpdate: false,
      supplierDelete: false,
      supplierInfo: false,
      supplierDebt: false,
      // Detailed permissions
      supplierBasicInfo: false,
      supplierFinancialInfo: false,
      supplierLegalInfo: false,
      supplierVehicles: false,
      supplierPaymentHistory: false,
      supplierDebtHistory: false,
      
      // Khách hàng (CRM)
      customerView: false,
      customerCreate: false,
      customerRead: false,
      customerUpdate: false,
      customerDelete: false,
      customerSelf: false,
      customerSubordinates: false,
      customerAll: false,
      
      // Nhân sự (Staff)
      staffView: false,
      staffCreate: false,
      staffRead: false,
      staffUpdate: false,
      staffDelete: false,
      staffSubordinates: false,
      staffAll: false,
      
      // Hợp đồng (Contracts)
      contractsView: false,
      contractsCreate: false,
      contractsRead: false,
      contractsUpdate: false,
      contractsDelete: false,
      contractsApprove: false,
      contracts: false,
      
      // Chương trình khuyến mãi (Promotions)
      promotionsView: false,
      promotionsCreate: false,
      promotionsRead: false,
      promotionsUpdate: false,
      promotionsDelete: false,
      
      // Đơn vị vận chuyển (Carriers)
      carriersView: false,
      carriersCreate: false,
      carriersRead: false,
      carriersUpdate: false,
      carriersDelete: false,
      
      // Thu chi & Dòng tiền (Finance)
      financeView: false,
      financeCreate: false,
      financeRead: false,
      financeUpdate: false,
      financeDelete: false,
      financeApprove: false,
      finance: false,
      
      // Quản lý công nợ (Debt Management)
      debtManagementView: false,
      debtManagementCreate: false,
      debtManagementRead: false,
      debtManagementUpdate: false,
      debtManagementDelete: false,
      debtManagement: false,
      
      // Kế toán (Accounting)
      accountingView: false,
      accountingCreate: false,
      accountingRead: false,
      accountingUpdate: false,
      accountingDelete: false,
      accountingPost: false,
      accountingLock: false,
      
      // Hồ sơ pháp lý (Registration)
      registrationView: false,
      registrationUpdate: false,
      registration: false,
      
      // Hồ sơ Claim (Claims)
      claimsView: false,
      claimsCreate: false,
      claimsRead: false,
      claimsUpdate: false,
      claimsDelete: false,
      
      // Báo cáo (Reports)
      reportsView: false,
      reportsExport: false,
      reports: false,
      
      // Legacy permissions (backward compatibility with database default schema)
      // These match the default permissions in sql/database_setup_users.sql
      canManageContract: false,
      canApproveFinance: false,
      canViewReports: false,
      canManageInventory: false,
      canManageStaff: false
    }
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [staffList, setStaffList] = useState<Array<{ id: string; full_name: string; role: string }>>([]);

  // Format ISO date (YYYY-MM-DD) to dd/mm/yyyy
  const formatDate = (dateString: string): string => {
    if (!dateString) return '';
    // If already in dd/mm/yyyy format, return as is
    if (dateString.includes('/')) return dateString;
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      
      return `${day}/${month}/${year}`;
    } catch {
      return '';
    }
  };

  // Parse dd/mm/yyyy to ISO date (YYYY-MM-DD)
  const parseDate = (value: string): string => {
    if (!value) return '';
    
    // Remove all non-digit characters except /
    const cleaned = value.replace(/[^\d/]/g, '');
    
    // If it's already in ISO format (YYYY-MM-DD), return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }
    
    // Parse dd/mm/yyyy format
    const parts = cleaned.split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      
      // Validate date components
      const dayNum = parseInt(day);
      const monthNum = parseInt(month);
      const yearNum = parseInt(year);
      
      if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12 && yearNum >= 1900 && yearNum <= 2100) {
        try {
          const date = new Date(yearNum, monthNum - 1, dayNum);
          if (!isNaN(date.getTime()) && date.getDate() === dayNum && date.getMonth() === monthNum - 1) {
            return `${yearNum}-${month}-${day}`;
          }
        } catch {
          // Invalid date
        }
      }
    }
    
    // Return empty string if invalid
    return '';
  };

  // Separate state for display values (dd/mm/yyyy format)
  const [dateDisplayValues, setDateDisplayValues] = useState<{
    dateOfBirth: string;
    idCardIssueDate: string;
    joinDate: string;
  }>({
    dateOfBirth: '',
    idCardIssueDate: '',
    joinDate: (() => {
      const today = new Date();
      const day = today.getDate().toString().padStart(2, '0');
      const month = (today.getMonth() + 1).toString().padStart(2, '0');
      const year = today.getFullYear();
      return `${day}/${month}/${year}`;
    })()
  });

  // Handle date input with auto-formatting
  const handleDateChange = (field: 'dateOfBirth' | 'idCardIssueDate' | 'joinDate', value: string) => {
    // Remove all non-digit characters except /
    let cleaned = value.replace(/[^\d/]/g, '');
    
    // Auto-format as user types: dd/mm/yyyy
    let digits = cleaned.replace(/\//g, '');
    let formatted = '';
    
    if (digits.length > 0) {
      // Day (2 digits)
      formatted = digits.slice(0, 2);
      if (digits.length > 2) {
        formatted += '/' + digits.slice(2, 4); // Month
      }
      if (digits.length > 4) {
        formatted += '/' + digits.slice(4, 8); // Year
      }
    }
    
    // Limit to 10 characters (dd/mm/yyyy)
    if (formatted.length > 10) {
      formatted = formatted.slice(0, 10);
    }
    
    // Update display value immediately
    setDateDisplayValues({
      ...dateDisplayValues,
      [field]: formatted
    });
    
    // Try to parse to ISO format
    const isoDate = parseDate(formatted);
    if (isoDate) {
      // Only update formData if we have a valid ISO date
      setFormData({
        ...formData,
        [field]: isoDate
      });
    } else if (formatted.length === 10) {
      // If format is complete but invalid, clear the ISO value
      setFormData({
        ...formData,
        [field]: ''
      });
    }
    // If incomplete, keep the existing ISO value in formData
  };

  // Handle date blur - validate and ensure we have a valid date
  const handleDateBlur = (field: 'dateOfBirth' | 'idCardIssueDate' | 'joinDate') => {
    const displayValue = dateDisplayValues[field];
    const isoDate = parseDate(displayValue);
    
    if (displayValue && !isoDate) {
      // Invalid date - clear both display and ISO
      setDateDisplayValues({
        ...dateDisplayValues,
        [field]: ''
      });
      setFormData({
        ...formData,
        [field]: ''
      });
    } else if (isoDate) {
      // Valid date - ensure ISO is stored and display is properly formatted
      setFormData({
        ...formData,
        [field]: isoDate
      });
      setDateDisplayValues({
        ...dateDisplayValues,
        [field]: formatDate(isoDate)
      });
    }
  };

  const togglePermission = (key: keyof StaffPermissions) => {
    if (!formData.permissions) return;
    setFormData({
      ...formData,
      permissions: {
        ...formData.permissions,
        [key]: !formData.permissions[key]
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all required fields
    const requiredFields = [
      formData.name, formData.phone, formData.email,
      formData.dateOfBirth, formData.idCard, formData.idCardIssueDate,
      formData.idCardIssuePlace, formData.professionalLevel, formData.permanentAddress,
      formData.currentAddress, formData.taxCode, formData.bankName,
      formData.bankAccount, formData.role, formData.branch, formData.joinDate
    ];
    
    // Username is only required for admin
    if (isAdmin && !formData.username) {
      requiredFields.push(formData.username);
    }
    
    if (requiredFields.some(field => !field) || formData.dependents === undefined) {
      setSubmitError('Vui lòng nhập đầy đủ thông tin bắt buộc');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Validate required fields
      if (!formData.name || !formData.name.trim()) {
        throw new Error('Vui lòng nhập họ và tên');
      }
      if (!formData.email || !formData.email.trim()) {
        throw new Error('Vui lòng nhập email');
      }
      // Username is only required for admin
      if (isAdmin && (!formData.username || !formData.username.trim())) {
        throw new Error('Vui lòng nhập tên đăng nhập');
      }
      if (!formData.phone || !formData.phone.trim()) {
        throw new Error('Vui lòng nhập số điện thoại');
      }
      if (!formData.dateOfBirth) {
        throw new Error('Vui lòng nhập ngày tháng năm sinh');
      }
      if (!formData.idCard || !formData.idCard.trim()) {
        throw new Error('Vui lòng nhập số CCCD');
      }
      if (!formData.idCardIssueDate) {
        throw new Error('Vui lòng nhập ngày cấp CCCD');
      }
      if (!formData.idCardIssuePlace || !formData.idCardIssuePlace.trim()) {
        throw new Error('Vui lòng nhập nơi cấp CCCD');
      }
      if (!formData.professionalLevel || !formData.professionalLevel.trim()) {
        throw new Error('Vui lòng nhập trình độ chuyên môn');
      }
      if (!formData.permanentAddress || !formData.permanentAddress.trim()) {
        throw new Error('Vui lòng nhập địa chỉ hộ khẩu');
      }
      if (!formData.currentAddress || !formData.currentAddress.trim()) {
        throw new Error('Vui lòng nhập nơi ở hiện tại');
      }
      if (!formData.taxCode || !formData.taxCode.trim()) {
        throw new Error('Vui lòng nhập mã số thuế');
      }
      if (formData.dependents === undefined || formData.dependents === null) {
        throw new Error('Vui lòng nhập số người phụ thuộc');
      }
      if (!formData.bankName || !formData.bankName.trim()) {
        throw new Error('Vui lòng nhập tên ngân hàng');
      }
      if (!formData.bankAccount || !formData.bankAccount.trim()) {
        throw new Error('Vui lòng nhập số tài khoản ngân hàng');
      }
      if (!formData.role) {
        throw new Error('Vui lòng chọn vai trò công việc');
      }
      if (!formData.branch || !formData.branch.trim()) {
        throw new Error('Vui lòng chọn chi nhánh');
      }
      if (!formData.joinDate) {
        throw new Error('Vui lòng nhập ngày vào làm');
      }

      // Generate staff code
      const codeNumber = Math.floor(100 + Math.random() * 900);
      const staffCode = `NV-${codeNumber}`;

      // Validate and ensure role is a valid string value
      // IMPORTANT: These values must match exactly with the database constraint
      const validRoles = [
        'STRATEGIC_DIRECTOR',
        'BUSINESS_DIRECTOR',
        'OPERATIONS_DIRECTOR',
        'DIRECTOR',
        'SALES_MANAGER',
        'ACCOUNTANT',
        'IT',
        'SALES_CONSULTANT',
        'ADMIN',
        'INVENTORY',
        'DRIVER_RECRUITMENT_POINT'
      ];
      
      // Normalize role: trim, uppercase, and validate
      let roleValue = formData.role 
        ? String(formData.role).trim().toUpperCase()
        : 'SALES_CONSULTANT';
      
      // Ensure it's a valid role
      if (!validRoles.includes(roleValue)) {
        console.warn(`Invalid role value: ${roleValue}, defaulting to SALES_CONSULTANT`);
        roleValue = 'SALES_CONSULTANT';
      }
      
      // Final validation - must be exactly one of the valid roles
      if (!validRoles.includes(roleValue)) {
        roleValue = 'SALES_CONSULTANT';
      }

      // Validate and ensure status is a valid string value
      let statusValue = formData.status 
        ? String(formData.status).trim().toUpperCase()
        : 'ACTIVE';
      
      // Ensure it's either ACTIVE or INACTIVE
      if (statusValue !== 'ACTIVE' && statusValue !== 'INACTIVE') {
        statusValue = 'ACTIVE';
      }

      // Format join_date - ensure it's a valid date string (YYYY-MM-DD)
      let joinDateValue = formData.joinDate || new Date().toISOString().split('T')[0];
      if (joinDateValue && joinDateValue.includes('T')) {
        joinDateValue = joinDateValue.split('T')[0];
      }

      // Helper function to convert empty strings to null
      const toNullIfEmpty = (value: any): any => {
        if (value === '' || value === undefined) return null;
        return value;
      };

      // Prepare default permissions object with all fields set to false
      // This must match the StaffPermissions interface in types.ts and form initial state above
      // IMPORTANT: Keep this synchronized with form initial state (lines 50-157) for consistency
      const defaultPermissions = {
          // Dashboard
          dashboardView: false,
          
          // Kho (Inventory)
          inventoryView: false,
          inventoryCreate: false,
          inventoryRead: false,
          inventoryUpdate: false,
          inventoryDelete: false,
          inventoryVehicles: false,
          inventoryPrice: false,
          
          // Nhà cung cấp (Suppliers)
          supplierView: false,
          supplierCreate: false,
          supplierRead: false,
          supplierUpdate: false,
          supplierDelete: false,
          supplierInfo: false,
          supplierDebt: false,
          // Detailed permissions
          supplierBasicInfo: false,
          supplierFinancialInfo: false,
          supplierLegalInfo: false,
          supplierVehicles: false,
          supplierPaymentHistory: false,
          supplierDebtHistory: false,
          
          // Khách hàng (CRM)
          customerView: false,
          customerCreate: false,
          customerRead: false,
          customerUpdate: false,
          customerDelete: false,
          customerSelf: false,
          customerSubordinates: false,
          customerAll: false,
          
          // Nhân sự (Staff)
          staffView: false,
          staffCreate: false,
          staffRead: false,
          staffUpdate: false,
          staffDelete: false,
          staffSubordinates: false,
          staffAll: false,
          
          // Hợp đồng (Contracts)
          contractsView: false,
          contractsCreate: false,
          contractsRead: false,
          contractsUpdate: false,
          contractsDelete: false,
          contractsApprove: false,
          contracts: false,
          
          // Chương trình khuyến mãi (Promotions)
          promotionsView: false,
          promotionsCreate: false,
          promotionsRead: false,
          promotionsUpdate: false,
          promotionsDelete: false,
          
          // Đơn vị vận chuyển (Carriers)
          carriersView: false,
          carriersCreate: false,
          carriersRead: false,
          carriersUpdate: false,
          carriersDelete: false,
          
          // Thu chi & Dòng tiền (Finance)
          financeView: false,
          financeCreate: false,
          financeRead: false,
          financeUpdate: false,
          financeDelete: false,
          financeApprove: false,
          finance: false,
          
          // Quản lý công nợ (Debt Management)
          debtManagementView: false,
          debtManagementCreate: false,
          debtManagementRead: false,
          debtManagementUpdate: false,
          debtManagementDelete: false,
          debtManagement: false,
          
          // Kế toán (Accounting)
          accountingView: false,
          accountingCreate: false,
          accountingRead: false,
          accountingUpdate: false,
          accountingDelete: false,
          accountingPost: false,
          accountingLock: false,
          
          // Hồ sơ pháp lý (Registration)
          registrationView: false,
          registrationUpdate: false,
          registration: false,
          
          // Hồ sơ Claim (Claims)
          claimsView: false,
          claimsCreate: false,
          claimsRead: false,
          claimsUpdate: false,
          claimsDelete: false,
          
          // Báo cáo (Reports)
          reportsView: false,
          reportsExport: false,
          reports: false,
          
          // Legacy permissions (backward compatibility with database default schema)
          // These match the default permissions in sql/database_setup_users.sql
          canManageContract: false,
          canApproveFinance: false,
          canViewReports: false,
          canManageInventory: false,
          canManageStaff: false
        };

      // Merge form permissions with default permissions
      // This ensures all permission fields are present, with form values taking precedence
      const mergedPermissions = {
        ...defaultPermissions,
        ...(formData.permissions || {})
      };

      // Ensure all boolean values are properly converted
      // IMPORTANT: Only keep permissions with value true (remove false permissions)
      const normalizedPermissions: Record<string, boolean> = {};
      for (const [key, value] of Object.entries(mergedPermissions)) {
        // Convert to boolean: true if value is true or 'true', false otherwise
        const boolValue = value === true || value === 'true';
        // Only add permissions that are true to the object
        if (boolValue) {
          normalizedPermissions[key] = true;
        }
      }

      // Prepare staff data in database format (snake_case)
      // IMPORTANT: Ensure all values match database schema exactly
      const staffData: any = {
        full_name: formData.name.trim(),
        phone: toNullIfEmpty(formData.phone?.trim()),
        email: formData.email.trim().toLowerCase(),
        username: isAdmin && formData.username ? formData.username.trim() : '', // Backend will auto-generate if empty
        password: 'changeme123', // Default password, should be changed on first login
        role: roleValue, // Already validated and normalized above
        branch: (formData.branch || 'GCM-Tổng').trim(),
        status: statusValue, // Already validated and normalized above
        join_date: joinDateValue,
        manager_id: toNullIfEmpty(formData.managerId),
        // permissions column has been removed from database
        // Personal Information
        date_of_birth: toNullIfEmpty(formData.dateOfBirth),
        id_card: toNullIfEmpty(formData.idCard?.trim()),
        id_card_issue_date: toNullIfEmpty(formData.idCardIssueDate),
        id_card_issue_place: toNullIfEmpty(formData.idCardIssuePlace?.trim()),
        bank_name: toNullIfEmpty(formData.bankName?.trim()),
        bank_account: toNullIfEmpty(formData.bankAccount?.trim()),
        professional_level: toNullIfEmpty(formData.professionalLevel?.trim()),
        permanent_address: toNullIfEmpty(formData.permanentAddress?.trim()),
        current_address: toNullIfEmpty(formData.currentAddress?.trim()),
        tax_code: toNullIfEmpty(formData.taxCode?.trim()),
        dependents: formData.dependents || 0,
        notes: null
      };

      // Log the data being sent for debugging
      console.log('Sending staff data:', JSON.stringify(staffData, null, 2));
      console.log('Is Admin:', isAdmin);
      console.log('Role value being sent:', roleValue, 'Type:', typeof roleValue);

      const response = await fetch('/api/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user: staffData,
          permissions: normalizedPermissions
        })
      });
      const result = await response.json();

      if (!response.ok) {
        let errorMessage = 'Lỗi lưu dữ liệu nhân sự';
        if (result?.error) {
          errorMessage += `: ${result.error}`;
        }
        throw new Error(errorMessage);
      }

      const data = result?.user;

      // Gửi thông báo cho ADMIN, DIRECTOR và OPERATIONS_DIRECTOR khi có nhân sự mới
      try {
        // Mapping role để hiển thị tên role bằng tiếng Việt
        const roleLabels: { [key: string]: string } = {
          'STRATEGIC_DIRECTOR': 'Giám đốc chiến lược',
          'BUSINESS_DIRECTOR': 'Giám đốc kinh doanh',
          'OPERATIONS_DIRECTOR': 'Giám đốc vận hành',
          'DIRECTOR': 'Giám đốc',
          'SALES_MANAGER': 'Trưởng phòng kinh doanh',
          'ACCOUNTANT': 'Kế toán',
          'IT': 'IT',
          'SALES_CONSULTANT': 'Tư vấn bán hàng',
          'ADMIN': 'Admin',
          'INVENTORY': 'Nhân viên kho',
          'DRIVER_RECRUITMENT_POINT': 'Điểm tuyển tài xế'
        };

        const roleText = roleLabels[roleValue] || roleValue;
        const staffName = formData.name || data?.full_name || data?.username || 'Nhân viên mới';
        const statusText = statusValue === 'ACTIVE' ? 'Đang làm việc' : 'Đã nghỉ';

        const message = 
          `Nhân sự mới đã được thêm vào hệ thống:\n` +
          `• Tên: ${staffName}\n` +
          `• Vai trò: ${roleText}\n` +
          `• Chi nhánh: ${formData.branch || 'GCM-Tổng'}\n` +
          `${formData.email ? `• Email: ${formData.email}\n` : ''}` +
          `${formData.phone ? `• SĐT: ${formData.phone}\n` : ''}` +
          `${formData.joinDate ? `• Ngày vào làm: ${formData.joinDate}\n` : ''}` +
          `• Trạng thái: ${statusText}`;

        await notificationService.createNotificationForRoles(
          ['ADMIN', 'DIRECTOR', 'OPERATIONS_DIRECTOR'],
          {
            title: `Nhân sự mới: ${staffName}`,
            message: message,
            type: 'INFO',
            referenceType: 'STAFF',
            referenceId: data.id,
            actionUrl: `/staff`,
            metadata: {
              staffId: data.id,
              staffName: staffName,
              staffRole: roleValue,
              staffRoleText: roleText,
              staffEmail: formData.email,
              staffPhone: formData.phone,
              staffBranch: formData.branch || 'GCM-Tổng',
              staffStatus: statusValue,
              joinDate: formData.joinDate,
              createdBy: user?.id,
              createdByName: user?.full_name || user?.username
            }
          }
        );
      } catch (notificationError) {
        // Log lỗi nhưng không chặn việc tạo nhân sự
        console.error('Error sending notification:', notificationError);
      }

      // Success - redirect to staff page
      router.push('/staff');
    } catch (error: any) {
      console.error('Submit error - Full error:', error);
      console.error('Error type:', typeof error);
      console.error('Error keys:', Object.keys(error || {}));
      
      let errorMessage = 'Có lỗi xảy ra khi lưu dữ liệu. Vui lòng thử lại.';
      if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error?.error?.message) {
        errorMessage = error.error.message;
      }
      
      setSubmitError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

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

  return (
    <div className="space-y-8">
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
               <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-tighter">Staff Management</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900">Thêm nhân sự mới</h2>
            <p className="text-xs text-slate-500 font-medium">Khai báo thông tin hồ sơ và cấu hình quyền hạn hệ thống</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form 
        onSubmit={handleSubmit}
        className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden"
      >
        {/* Scrollable Content */}
        <div className="p-10 space-y-12 overflow-visible">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            
            {/* Left Column: Personal & Job Info */}
            <div className="space-y-10">
              <section className="space-y-6">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <User size={18} className="text-blue-600" /> A. Thông tin cá nhân
                </h3>
                <div className="grid grid-cols-1 gap-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Họ và tên *</label>
                      <input 
                        required
                        type="text" 
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                      />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Số điện thoại *</label>
                        <input 
                          required
                          type="tel" 
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none"
                          value={formData.phone}
                          onChange={e => setFormData({...formData, phone: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email *</label>
                        <input 
                          required
                          type="email" 
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none"
                          value={formData.email}
                          onChange={e => setFormData({...formData, email: e.target.value})}
                        />
                      </div>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngày tháng năm sinh *</label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                          required
                          type="text" 
                          placeholder="dd/mm/yyyy"
                          className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                          value={dateDisplayValues.dateOfBirth}
                          onChange={e => handleDateChange('dateOfBirth', e.target.value)}
                          onBlur={() => handleDateBlur('dateOfBirth')}
                          maxLength={10}
                        />
                      </div>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Số CCCD *</label>
                        <input 
                          required
                          type="text" 
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                          value={formData.idCard || ''}
                          onChange={e => setFormData({...formData, idCard: e.target.value})}
                          placeholder="Nhập số CCCD/CMND"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngày cấp *</label>
                        <input 
                          required
                          type="text" 
                          placeholder="dd/mm/yyyy"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                          value={dateDisplayValues.idCardIssueDate}
                          onChange={e => handleDateChange('idCardIssueDate', e.target.value)}
                          onBlur={() => handleDateBlur('idCardIssueDate')}
                          maxLength={10}
                        />
                      </div>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nơi cấp *</label>
                      <select 
                        required
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                        value={formData.idCardIssuePlace || ''}
                        onChange={e => setFormData({...formData, idCardIssuePlace: e.target.value})}
                      >
                        <option value="">Chọn nơi cấp CCCD/CMND</option>
                        <option value="Cục Cảnh sát quản lý hành chính về trật tự xã hội">Cục Cảnh sát quản lý hành chính về trật tự xã hội</option>
                        <option value="Bộ Công an">Bộ Công an</option>
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trình độ chuyên môn *</label>
                      <div className="relative">
                        <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                          required
                          type="text" 
                          className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                          value={formData.professionalLevel || ''}
                          onChange={e => setFormData({...formData, professionalLevel: e.target.value})}
                          placeholder="Ví dụ: Đại học, Cao đẳng, Trung cấp..."
                        />
                      </div>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Địa chỉ hộ khẩu *</label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                          required
                          type="text" 
                          className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                          value={formData.permanentAddress || ''}
                          onChange={e => setFormData({...formData, permanentAddress: e.target.value})}
                          placeholder="Nhập địa chỉ hộ khẩu thường trú"
                        />
                      </div>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nơi ở hiện tại *</label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                          required
                          type="text" 
                          className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                          value={formData.currentAddress || ''}
                          onChange={e => setFormData({...formData, currentAddress: e.target.value})}
                          placeholder="Nhập địa chỉ nơi ở hiện tại"
                        />
                      </div>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">MST (Mã số thuế) *</label>
                        <input 
                          required
                          type="text" 
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                          value={formData.taxCode || ''}
                          onChange={e => setFormData({...formData, taxCode: e.target.value})}
                          placeholder="Nhập mã số thuế"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Người phụ thuộc *</label>
                        <div className="relative">
                          <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input 
                            required
                            type="number" 
                            min="0"
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                            value={formData.dependents || 0}
                            onChange={e => setFormData({...formData, dependents: parseInt(e.target.value) || 0})}
                            placeholder="0"
                          />
                        </div>
                      </div>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tên ngân hàng *</label>
                        <div className="relative">
                          <Landmark className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input 
                            required
                            type="text" 
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                            value={formData.bankName || ''}
                            onChange={e => setFormData({...formData, bankName: e.target.value})}
                            placeholder="Ví dụ: Techcombank"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tài khoản ngân hàng *</label>
                        <div className="relative">
                          <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input 
                            required
                            type="text" 
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                            value={formData.bankAccount || ''}
                            onChange={e => setFormData({...formData, bankAccount: e.target.value})}
                            placeholder="Nhập số tài khoản"
                          />
                        </div>
                      </div>
                   </div>
                </div>
              </section>

              <section className="space-y-6">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <Briefcase size={18} className="text-indigo-600" /> B. Thông tin công việc
                </h3>
                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vai trò công việc *</label>
                      <select 
                        required
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none"
                        value={formData.role}
                        onChange={e => setFormData({...formData, role: e.target.value as StaffRole})}
                      >
                        <option value={StaffRole.STRATEGIC_DIRECTOR}>Giám đốc chiến lược</option>
                        <option value={StaffRole.BUSINESS_DIRECTOR}>Giám đốc kinh doanh</option>
                        <option value={StaffRole.OPERATIONS_DIRECTOR}>Giám đốc vận hành</option>
                        <option value={StaffRole.DIRECTOR}>Giám đốc</option>
                        <option value={StaffRole.SALES_MANAGER}>Trưởng phòng kinh doanh</option>
                        <option value={StaffRole.ACCOUNTANT}>Kế toán</option>
                        <option value={StaffRole.IT}>IT</option>
                        <option value={StaffRole.SALES_CONSULTANT}>Tư vấn bán hàng</option>
                        <option value={StaffRole.ADMIN}>Admin</option>
                        <option value={StaffRole.INVENTORY}>Nhân viên kho</option>
                        <option value={StaffRole.DRIVER_RECRUITMENT_POINT}>Điểm tuyển tài xế</option>
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chi nhánh *</label>
                      <div className="relative">
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" size={18} />
                        <select 
                          required
                          className="w-full pl-12 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none appearance-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                          value={formData.branch}
                          onChange={e => setFormData({...formData, branch: e.target.value})}
                        >
                          <option value="GCM">GCM</option>
                          <option value="Cần Thơ GF">Cần Thơ GF</option>
                        </select>
                      </div>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Người quản lý</label>
                      <div className="relative">
                        <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" size={18} />
                        <select 
                          className="w-full pl-12 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none appearance-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                          value={formData.managerId || ''}
                          onChange={e => setFormData({...formData, managerId: e.target.value})}
                        >
                          <option value="">Chọn người quản lý</option>
                          {staffList.map(staff => (
                            <option key={staff.id} value={staff.id}>
                              {staff.full_name} ({staff.role})
                            </option>
                          ))}
                        </select>
                      </div>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngày vào làm *</label>
                      <input 
                        required
                        type="text" 
                        placeholder="dd/mm/yyyy"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                        value={dateDisplayValues.joinDate}
                        onChange={e => handleDateChange('joinDate', e.target.value)}
                        onBlur={() => handleDateBlur('joinDate')}
                        maxLength={10}
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trạng thái</label>
                      <div className="flex bg-slate-100 p-1 rounded-2xl">
                        <button 
                          type="button"
                          onClick={() => setFormData({...formData, status: StaffStatus.ACTIVE})}
                          className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${formData.status === StaffStatus.ACTIVE ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}
                        >Đang làm</button>
                        <button 
                          type="button"
                          onClick={() => setFormData({...formData, status: StaffStatus.INACTIVE})}
                          className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${formData.status === StaffStatus.INACTIVE ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400'}`}
                        >Đã nghỉ</button>
                      </div>
                   </div>
                </div>
              </section>
            </div>

            {/* Right Column: Security & Permissions */}
            {isAdmin && (
            <div className="space-y-10">
              <section className="space-y-6">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <Lock size={18} className="text-rose-600" /> C. Tài khoản hệ thống
                </h3>
                <div className="p-8 bg-slate-900 rounded-[32px] space-y-6 shadow-xl">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Tên đăng nhập *</label>
                      <input 
                        required
                        type="text" 
                        className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-2xl text-sm font-bold text-white outline-none focus:bg-white/20 transition-all"
                        value={formData.username}
                        onChange={e => setFormData({...formData, username: e.target.value})}
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Mật khẩu khởi tạo</label>
                      <div className="relative">
                        <input 
                          type={showPassword ? "text" : "password"}
                          className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-2xl text-sm font-bold text-white outline-none"
                          placeholder="••••••••"
                        />
                        <button 
                          type="button" 
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                   </div>
                </div>
              </section>

              <section className="space-y-6">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <ShieldCheck size={18} className="text-emerald-600" /> D. Phân quyền nghiệp vụ
                </h3>
                <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
                   {/* Dashboard */}
                   <div className="space-y-3">
                     <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                       <LayoutDashboard size={14} /> Tổng quan
                     </h4>
                     {([
                       { key: 'dashboardView' as keyof StaffPermissions, label: 'Xem Dashboard', icon: <LayoutDashboard size={14} /> },
                     ]).map(item => (
                       <button
                          key={item.key}
                          type="button"
                          onClick={() => togglePermission(item.key)}
                          className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                            formData.permissions?.[item.key] 
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                              : 'bg-white border-slate-200 text-slate-500'
                          }`}
                       >
                          <div className="flex items-center gap-2">
                             {item.icon}
                             <span className="text-xs font-bold">{item.label}</span>
                          </div>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                            formData.permissions?.[item.key]
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'bg-white border-slate-300'
                          }`}>
                             {formData.permissions?.[item.key] && <CheckCircle2 size={12} />}
                          </div>
                       </button>
                     ))}
                   </div>

                   {/* Kho */}
                   <div className="space-y-3">
                     <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                       <Settings size={14} /> Kho xe
                     </h4>
                     {([
                       { key: 'inventoryView' as keyof StaffPermissions, label: 'Xem tab Kho xe', icon: <Settings size={14} /> },
                       { key: 'inventoryCreate' as keyof StaffPermissions, label: 'Thêm xe mới', icon: <Settings size={14} /> },
                       { key: 'inventoryRead' as keyof StaffPermissions, label: 'Xem danh sách xe', icon: <Settings size={14} /> },
                       { key: 'inventoryUpdate' as keyof StaffPermissions, label: 'Sửa thông tin xe', icon: <Settings size={14} /> },
                       { key: 'inventoryDelete' as keyof StaffPermissions, label: 'Xóa xe', icon: <Settings size={14} /> },
                       { key: 'inventoryPrice' as keyof StaffPermissions, label: 'Giá nhập - Giá bán', icon: <Settings size={14} /> },
                     ]).map(item => (
                       <button
                          key={item.key}
                          type="button"
                          onClick={() => togglePermission(item.key)}
                          className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                            formData.permissions?.[item.key] 
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                              : 'bg-white border-slate-200 text-slate-500'
                          }`}
                       >
                          <div className="flex items-center gap-2">
                             {item.icon}
                             <span className="text-xs font-bold">{item.label}</span>
                          </div>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                            formData.permissions?.[item.key]
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'bg-white border-slate-300'
                          }`}>
                             {formData.permissions?.[item.key] && <CheckCircle2 size={12} />}
                          </div>
                       </button>
                     ))}
                   </div>

                   {/* Nhà cung cấp */}
                   <div className="space-y-3">
                     <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                       <Building2 size={14} /> Nhà cung cấp
                     </h4>
                     {([
                       { key: 'supplierView' as keyof StaffPermissions, label: 'Xem tab Nhà cung cấp', icon: <Building2 size={14} /> },
                       { key: 'supplierCreate' as keyof StaffPermissions, label: 'Thêm nhà cung cấp', icon: <Building2 size={14} /> },
                       { key: 'supplierRead' as keyof StaffPermissions, label: 'Xem danh sách nhà cung cấp', icon: <Building2 size={14} /> },
                       { key: 'supplierUpdate' as keyof StaffPermissions, label: 'Sửa thông tin nhà cung cấp', icon: <Building2 size={14} /> },
                       { key: 'supplierDelete' as keyof StaffPermissions, label: 'Xóa nhà cung cấp', icon: <Building2 size={14} /> },
                       { key: 'supplierDebt' as keyof StaffPermissions, label: 'Công nợ', icon: <Wallet size={14} /> },
                       { key: 'supplierBasicInfo' as keyof StaffPermissions, label: 'Xem thông tin cơ bản', icon: <Building2 size={14} /> },
                       { key: 'supplierFinancialInfo' as keyof StaffPermissions, label: 'Xem thông tin tài chính', icon: <Wallet size={14} /> },
                       { key: 'supplierLegalInfo' as keyof StaffPermissions, label: 'Xem thông tin pháp lý', icon: <ShieldCheck size={14} /> },
                       { key: 'supplierVehicles' as keyof StaffPermissions, label: 'Xem danh sách xe đã nhập', icon: <Car size={14} /> },
                       { key: 'supplierPaymentHistory' as keyof StaffPermissions, label: 'Xem lịch sử thanh toán', icon: <Receipt size={14} /> },
                       { key: 'supplierDebtHistory' as keyof StaffPermissions, label: 'Xem lịch sử nợ', icon: <History size={14} /> },
                     ]).map(item => (
                       <button
                          key={item.key}
                          type="button"
                          onClick={() => togglePermission(item.key)}
                          className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                            formData.permissions?.[item.key] 
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                              : 'bg-white border-slate-200 text-slate-500'
                          }`}
                       >
                          <div className="flex items-center gap-2">
                             {item.icon}
                             <span className="text-xs font-bold">{item.label}</span>
                          </div>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                            formData.permissions?.[item.key]
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'bg-white border-slate-300'
                          }`}>
                             {formData.permissions?.[item.key] && <CheckCircle2 size={12} />}
                          </div>
                       </button>
                     ))}
                   </div>

                   {/* Khách hàng */}
                   <div className="space-y-3">
                     <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                       <Users size={14} /> Khách hàng
                     </h4>
                     {([
                       { key: 'customerView' as keyof StaffPermissions, label: 'Xem tab Khách hàng', icon: <Users size={14} /> },
                       { key: 'customerCreate' as keyof StaffPermissions, label: 'Thêm khách hàng', icon: <Users size={14} /> },
                       { key: 'customerRead' as keyof StaffPermissions, label: 'Xem danh sách khách hàng', icon: <Users size={14} /> },
                       { key: 'customerUpdate' as keyof StaffPermissions, label: 'Sửa thông tin khách hàng', icon: <Users size={14} /> },
                       { key: 'customerDelete' as keyof StaffPermissions, label: 'Xóa khách hàng', icon: <Users size={14} /> },
                       { key: 'customerSelf' as keyof StaffPermissions, label: 'Thông tin từ user tự nhập (Sales)', icon: <Users size={14} /> },
                       { key: 'customerSubordinates' as keyof StaffPermissions, label: 'Thông tin từ user và từ cấp dưới (Quản lý cấp trung)', icon: <Users size={14} /> },
                       { key: 'customerAll' as keyof StaffPermissions, label: 'Thông tin toàn hệ thống (Quản lý cấp cao)', icon: <Users size={14} /> },
                     ]).map(item => (
                       <button
                          key={item.key}
                          type="button"
                          onClick={() => togglePermission(item.key)}
                          className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                            formData.permissions?.[item.key] 
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                              : 'bg-white border-slate-200 text-slate-500'
                          }`}
                       >
                          <div className="flex items-center gap-2">
                             {item.icon}
                             <span className="text-xs font-bold">{item.label}</span>
                          </div>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                            formData.permissions?.[item.key]
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'bg-white border-slate-300'
                          }`}>
                             {formData.permissions?.[item.key] && <CheckCircle2 size={12} />}
                          </div>
                       </button>
                     ))}
                   </div>

                   {/* Hợp đồng */}
                   <div className="space-y-3">
                     <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                       <FileText size={14} /> Hợp đồng
                     </h4>
                     {([
                       { key: 'contractsView' as keyof StaffPermissions, label: 'Xem tab Hợp đồng', icon: <FileText size={14} /> },
                       { key: 'contractsCreate' as keyof StaffPermissions, label: 'Tạo hợp đồng mới', icon: <FileText size={14} /> },
                       { key: 'contractsRead' as keyof StaffPermissions, label: 'Xem chi tiết hợp đồng', icon: <FileText size={14} /> },
                       { key: 'contractsUpdate' as keyof StaffPermissions, label: 'Sửa hợp đồng', icon: <FileText size={14} /> },
                       { key: 'contractsDelete' as keyof StaffPermissions, label: 'Xóa hợp đồng', icon: <FileText size={14} /> },
                       { key: 'contractsApprove' as keyof StaffPermissions, label: 'Duyệt hợp đồng', icon: <FileText size={14} /> },
                     ]).map(item => (
                       <button
                          key={item.key}
                          type="button"
                          onClick={() => togglePermission(item.key)}
                          className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                            formData.permissions?.[item.key] 
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                              : 'bg-white border-slate-200 text-slate-500'
                          }`}
                       >
                          <div className="flex items-center gap-2">
                             {item.icon}
                             <span className="text-xs font-bold">{item.label}</span>
                          </div>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                            formData.permissions?.[item.key]
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'bg-white border-slate-300'
                          }`}>
                             {formData.permissions?.[item.key] && <CheckCircle2 size={12} />}
                          </div>
                       </button>
                     ))}
                   </div>

                   {/* Chương trình khuyến mãi */}
                   <div className="space-y-3">
                     <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                       <Tag size={14} /> CTKM
                     </h4>
                     {([
                       { key: 'promotionsView' as keyof StaffPermissions, label: 'Xem tab CTKM', icon: <Tag size={14} /> },
                       { key: 'promotionsCreate' as keyof StaffPermissions, label: 'Tạo CTKM mới', icon: <Tag size={14} /> },
                       { key: 'promotionsRead' as keyof StaffPermissions, label: 'Xem chi tiết CTKM', icon: <Tag size={14} /> },
                       { key: 'promotionsUpdate' as keyof StaffPermissions, label: 'Sửa CTKM', icon: <Tag size={14} /> },
                       { key: 'promotionsDelete' as keyof StaffPermissions, label: 'Xóa CTKM', icon: <Tag size={14} /> },
                     ]).map(item => (
                       <button
                          key={item.key}
                          type="button"
                          onClick={() => togglePermission(item.key)}
                          className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                            formData.permissions?.[item.key] 
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                              : 'bg-white border-slate-200 text-slate-500'
                          }`}
                       >
                          <div className="flex items-center gap-2">
                             {item.icon}
                             <span className="text-xs font-bold">{item.label}</span>
                          </div>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                            formData.permissions?.[item.key]
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'bg-white border-slate-300'
                          }`}>
                             {formData.permissions?.[item.key] && <CheckCircle2 size={12} />}
                          </div>
                       </button>
                     ))}
                   </div>

                   {/* Đơn vị vận chuyển */}
                   <div className="space-y-3">
                     <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                       <Package size={14} /> Đơn vị vận chuyển
                     </h4>
                     {([
                       { key: 'carriersView' as keyof StaffPermissions, label: 'Xem tab Đơn vị vận chuyển', icon: <Package size={14} /> },
                       { key: 'carriersCreate' as keyof StaffPermissions, label: 'Thêm đơn vị vận chuyển', icon: <Package size={14} /> },
                       { key: 'carriersRead' as keyof StaffPermissions, label: 'Xem chi tiết đơn vị vận chuyển', icon: <Package size={14} /> },
                       { key: 'carriersUpdate' as keyof StaffPermissions, label: 'Sửa đơn vị vận chuyển', icon: <Package size={14} /> },
                       { key: 'carriersDelete' as keyof StaffPermissions, label: 'Xóa đơn vị vận chuyển', icon: <Package size={14} /> },
                     ]).map(item => (
                       <button
                          key={item.key}
                          type="button"
                          onClick={() => togglePermission(item.key)}
                          className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                            formData.permissions?.[item.key] 
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                              : 'bg-white border-slate-200 text-slate-500'
                          }`}
                       >
                          <div className="flex items-center gap-2">
                             {item.icon}
                             <span className="text-xs font-bold">{item.label}</span>
                          </div>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                            formData.permissions?.[item.key]
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'bg-white border-slate-300'
                          }`}>
                             {formData.permissions?.[item.key] && <CheckCircle2 size={12} />}
                          </div>
                       </button>
                     ))}
                   </div>

                   {/* Thu chi & Dòng tiền */}
                   <div className="space-y-3">
                     <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                       <Wallet size={14} /> Thu chi & Dòng tiền
                     </h4>
                     {([
                       { key: 'financeView' as keyof StaffPermissions, label: 'Xem tab Thu chi & Dòng tiền', icon: <Wallet size={14} /> },
                       { key: 'financeCreate' as keyof StaffPermissions, label: 'Tạo giao dịch mới', icon: <Wallet size={14} /> },
                       { key: 'financeRead' as keyof StaffPermissions, label: 'Xem chi tiết giao dịch', icon: <Wallet size={14} /> },
                       { key: 'financeUpdate' as keyof StaffPermissions, label: 'Sửa giao dịch', icon: <Wallet size={14} /> },
                       { key: 'financeDelete' as keyof StaffPermissions, label: 'Xóa giao dịch', icon: <Wallet size={14} /> },
                       { key: 'financeApprove' as keyof StaffPermissions, label: 'Duyệt giao dịch', icon: <CheckCircle2 size={14} /> },
                     ]).map(item => (
                       <button
                          key={item.key}
                          type="button"
                          onClick={() => togglePermission(item.key)}
                          className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                            formData.permissions?.[item.key] 
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                              : 'bg-white border-slate-200 text-slate-500'
                          }`}
                       >
                          <div className="flex items-center gap-2">
                             {item.icon}
                             <span className="text-xs font-bold">{item.label}</span>
                          </div>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                            formData.permissions?.[item.key]
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'bg-white border-slate-300'
                          }`}>
                             {formData.permissions?.[item.key] && <CheckCircle2 size={12} />}
                          </div>
                       </button>
                     ))}
                   </div>

                   {/* Quản lý công nợ */}
                   <div className="space-y-3">
                     <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                       <CreditCard size={14} /> Quản lý công nợ
                     </h4>
                     {([
                       { key: 'debtManagementView' as keyof StaffPermissions, label: 'Xem công nợ', icon: <CreditCard size={14} /> },
                       { key: 'debtManagementCreate' as keyof StaffPermissions, label: 'Tạo thanh toán công nợ', icon: <CreditCard size={14} /> },
                       { key: 'debtManagementUpdate' as keyof StaffPermissions, label: 'Sửa thanh toán công nợ', icon: <CreditCard size={14} /> },
                       { key: 'debtManagementDelete' as keyof StaffPermissions, label: 'Xóa thanh toán công nợ', icon: <CreditCard size={14} /> },
                     ]).map(item => (
                       <button
                          key={item.key}
                          type="button"
                          onClick={() => togglePermission(item.key)}
                          className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                            formData.permissions?.[item.key] 
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                              : 'bg-white border-slate-200 text-slate-500'
                          }`}
                       >
                          <div className="flex items-center gap-2">
                             {item.icon}
                             <span className="text-xs font-bold">{item.label}</span>
                          </div>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                            formData.permissions?.[item.key]
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'bg-white border-slate-300'
                          }`}>
                             {formData.permissions?.[item.key] && <CheckCircle2 size={12} />}
                          </div>
                       </button>
                     ))}
                   </div>

                   {/* Kế toán */}
                   <div className="space-y-3">
                     <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                       <Landmark size={14} /> Kế toán
                     </h4>
                     {([
                       { key: 'accountingView' as keyof StaffPermissions, label: 'Xem kế toán', icon: <Landmark size={14} /> },
                       { key: 'accountingCreate' as keyof StaffPermissions, label: 'Tạo phiếu kế toán', icon: <Landmark size={14} /> },
                       { key: 'accountingRead' as keyof StaffPermissions, label: 'Xem chi tiết phiếu kế toán', icon: <Landmark size={14} /> },
                       { key: 'accountingUpdate' as keyof StaffPermissions, label: 'Sửa phiếu kế toán', icon: <Landmark size={14} /> },
                       { key: 'accountingDelete' as keyof StaffPermissions, label: 'Xóa phiếu kế toán', icon: <Landmark size={14} /> },
                       { key: 'accountingPost' as keyof StaffPermissions, label: 'Đăng phiếu kế toán', icon: <CheckCircle2 size={14} /> },
                       { key: 'accountingLock' as keyof StaffPermissions, label: 'Khóa phiếu kế toán', icon: <Lock size={14} /> },
                     ]).map(item => (
                       <button
                          key={item.key}
                          type="button"
                          onClick={() => togglePermission(item.key)}
                          className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                            formData.permissions?.[item.key] 
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                              : 'bg-white border-slate-200 text-slate-500'
                          }`}
                       >
                          <div className="flex items-center gap-2">
                             {item.icon}
                             <span className="text-xs font-bold">{item.label}</span>
                          </div>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                            formData.permissions?.[item.key]
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'bg-white border-slate-300'
                          }`}>
                             {formData.permissions?.[item.key] && <CheckCircle2 size={12} />}
                          </div>
                       </button>
                     ))}
                   </div>

                   {/* Nhân sự */}
                   <div className="space-y-3">
                     <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                       <ShieldAlert size={14} /> Nhân sự
                     </h4>
                     {([
                       { key: 'staffView' as keyof StaffPermissions, label: 'Xem tab Nhân sự', icon: <ShieldAlert size={14} /> },
                       { key: 'staffCreate' as keyof StaffPermissions, label: 'Thêm nhân sự', icon: <ShieldAlert size={14} /> },
                       { key: 'staffRead' as keyof StaffPermissions, label: 'Xem danh sách nhân sự', icon: <ShieldAlert size={14} /> },
                       { key: 'staffUpdate' as keyof StaffPermissions, label: 'Sửa thông tin nhân sự', icon: <ShieldAlert size={14} /> },
                       { key: 'staffDelete' as keyof StaffPermissions, label: 'Xóa nhân sự', icon: <ShieldAlert size={14} /> },
                       { key: 'staffSubordinates' as keyof StaffPermissions, label: 'Nhân sự cấp dưới (Quản lý cấp trung)', icon: <ShieldAlert size={14} /> },
                       { key: 'staffAll' as keyof StaffPermissions, label: 'Nhân sự toàn hệ thống (Quản lý cấp cao)', icon: <ShieldAlert size={14} /> },
                     ]).map(item => (
                       <button
                          key={item.key}
                          type="button"
                          onClick={() => togglePermission(item.key)}
                          className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                            formData.permissions?.[item.key] 
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                              : 'bg-white border-slate-200 text-slate-500'
                          }`}
                       >
                          <div className="flex items-center gap-2">
                             {item.icon}
                             <span className="text-xs font-bold">{item.label}</span>
                          </div>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                            formData.permissions?.[item.key]
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'bg-white border-slate-300'
                          }`}>
                             {formData.permissions?.[item.key] && <CheckCircle2 size={12} />}
                          </div>
                       </button>
                     ))}
                   </div>

                   {/* Hồ sơ pháp lý */}
                   <div className="space-y-3">
                     <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                       <FileText size={14} /> Hồ sơ pháp lý
                     </h4>
                     {([
                       { key: 'registrationView' as keyof StaffPermissions, label: 'Xem hồ sơ pháp lý', icon: <FileText size={14} /> },
                       { key: 'registrationUpdate' as keyof StaffPermissions, label: 'Cập nhật hồ sơ pháp lý', icon: <FileText size={14} /> },
                     ]).map(item => (
                       <button
                          key={item.key}
                          type="button"
                          onClick={() => togglePermission(item.key)}
                          className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                            formData.permissions?.[item.key] 
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                              : 'bg-white border-slate-200 text-slate-500'
                          }`}
                       >
                          <div className="flex items-center gap-2">
                             {item.icon}
                             <span className="text-xs font-bold">{item.label}</span>
                          </div>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                            formData.permissions?.[item.key]
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'bg-white border-slate-300'
                          }`}>
                             {formData.permissions?.[item.key] && <CheckCircle2 size={12} />}
                          </div>
                       </button>
                     ))}
                   </div>

                   {/* Hồ sơ Claim */}
                   <div className="space-y-3">
                     <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                       <FileText size={14} /> Hồ sơ Claim
                     </h4>
                     {([
                       { key: 'claimsView' as keyof StaffPermissions, label: 'Xem danh sách hồ sơ claim', icon: <FileText size={14} /> },
                       { key: 'claimsCreate' as keyof StaffPermissions, label: 'Tạo hồ sơ claim mới', icon: <FileText size={14} /> },
                       { key: 'claimsRead' as keyof StaffPermissions, label: 'Xem chi tiết hồ sơ claim', icon: <FileText size={14} /> },
                       { key: 'claimsUpdate' as keyof StaffPermissions, label: 'Sửa hồ sơ claim', icon: <FileText size={14} /> },
                       { key: 'claimsDelete' as keyof StaffPermissions, label: 'Xóa hồ sơ claim', icon: <FileText size={14} /> },
                     ]).map(item => (
                       <button
                          key={item.key}
                          type="button"
                          onClick={() => togglePermission(item.key)}
                          className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                            formData.permissions?.[item.key] 
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                              : 'bg-white border-slate-200 text-slate-500'
                          }`}
                       >
                          <div className="flex items-center gap-2">
                             {item.icon}
                             <span className="text-xs font-bold">{item.label}</span>
                          </div>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                            formData.permissions?.[item.key]
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'bg-white border-slate-300'
                          }`}>
                             {formData.permissions?.[item.key] && <CheckCircle2 size={12} />}
                          </div>
                       </button>
                     ))}
                   </div>

                   {/* Báo cáo */}
                   <div className="space-y-3">
                     <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                       <LayoutDashboard size={14} /> Báo cáo
                     </h4>
                     {([
                       { key: 'reportsView' as keyof StaffPermissions, label: 'Xem báo cáo', icon: <LayoutDashboard size={14} /> },
                       { key: 'reportsExport' as keyof StaffPermissions, label: 'Xuất báo cáo', icon: <LayoutDashboard size={14} /> },
                     ]).map(item => (
                       <button
                          key={item.key}
                          type="button"
                          onClick={() => togglePermission(item.key)}
                          className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                            formData.permissions?.[item.key] 
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                              : 'bg-white border-slate-200 text-slate-500'
                          }`}
                       >
                          <div className="flex items-center gap-2">
                             {item.icon}
                             <span className="text-xs font-bold">{item.label}</span>
                          </div>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                            formData.permissions?.[item.key]
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'bg-white border-slate-300'
                          }`}>
                             {formData.permissions?.[item.key] && <CheckCircle2 size={12} />}
                          </div>
                       </button>
                     ))}
                   </div>
                </div>
              </section>
            </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-10 py-8 bg-slate-50 border-t border-slate-100 space-y-4">
          {/* Error Message */}
          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
              <Info className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
              <div className="flex-1">
                <p className="text-sm font-bold text-red-900">Lỗi khi lưu dữ liệu</p>
                <p className="text-xs text-red-700 mt-1">{submitError}</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-4">
            <button 
              type="button" 
              onClick={() => router.back()}
              disabled={isSubmitting}
              className="px-8 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Hủy
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="flex items-center gap-2 px-12 py-3 bg-blue-600 text-white rounded-2xl text-sm font-black hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Đang lưu...
                </>
              ) : (
                <>
                  <Save size={18} /> Lưu hồ sơ nhân sự
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

