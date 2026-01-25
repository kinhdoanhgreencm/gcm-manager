'use client'

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  Save, User, Phone, Mail, 
  Calendar, ShieldCheck, Briefcase, 
  Building2, Lock, Eye, EyeOff,
  CheckCircle2, Info, LayoutDashboard,
  ShieldAlert, Settings, FileText, Wallet, ArrowLeft,
  CreditCard, Landmark, MapPin, GraduationCap, Users,
  Package, Tag, Hash, Car, Receipt, History
} from 'lucide-react';
import { StaffRole, StaffStatus, StaffPermissions } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { AccessDenied } from './AccessDenied';

export const StaffEditPage: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const staffId = params?.id as string;
  const { user } = useAuth();
  
  // Check if current user is admin or operations director
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'STRATEGIC_DIRECTOR' || user?.role === 'OPERATIONS_DIRECTOR';
  
  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    branch: 'Cần Thơ GF',
    status: StaffStatus.ACTIVE,
    joinDate: new Date().toISOString().split('T')[0],
    username: '',
    managerId: '',
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
  const [isLoading, setIsLoading] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [staffList, setStaffList] = useState<Array<{ id: string; full_name: string }>>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);

  // State to hold display values for date inputs (for handling partial input)
  const [dateDisplayValues, setDateDisplayValues] = useState<{
    dateOfBirth: string;
    idCardIssueDate: string;
    joinDate: string;
  }>({
    dateOfBirth: '',
    idCardIssueDate: '',
    joinDate: ''
  });

  // Helper function to format ISO date (YYYY-MM-DD) to dd/mm/yyyy
  const formatDateToDisplay = (dateString: string, fieldName?: 'dateOfBirth' | 'idCardIssueDate' | 'joinDate'): string => {
    // If we have a display value for this field, use it (for partial input)
    if (fieldName && dateDisplayValues[fieldName]) {
      return dateDisplayValues[fieldName];
    }
    
    if (!dateString) return '';
    // If already in dd/mm/yyyy format, return as is
    if (dateString.includes('/')) return dateString;
    // Parse ISO format YYYY-MM-DD
    const parts = dateString.split('T')[0].split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return '';
  };

  // Helper function to parse dd/mm/yyyy to ISO date (YYYY-MM-DD)
  const parseDateToISO = (dateString: string): string => {
    if (!dateString) return '';
    // Remove all non-digit characters except /
    const cleaned = dateString.replace(/[^\d/]/g, '');
    const parts = cleaned.split('/').filter(p => p.length > 0);
    
    // Only parse if we have complete date parts (day, month, year all present)
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      
      // Check if year is complete (4 digits)
      if (year.length === 4) {
        // Validate date
        const dayNum = parseInt(day);
        const monthNum = parseInt(month);
        const yearNum = parseInt(year);
        
        if (dayNum > 0 && dayNum <= 31 && monthNum > 0 && monthNum <= 12 && yearNum >= 1900 && yearNum <= 2100) {
          return `${year}-${month}-${day}`;
        }
      }
    }
    
    // If format doesn't match, try to parse as ISO
    if (dateString.includes('-')) {
      return dateString.split('T')[0];
    }
    
    return '';
  };

  // Handle date input change with auto-formatting
  const handleDateInputChange = (
    value: string,
    fieldName: 'dateOfBirth' | 'idCardIssueDate' | 'joinDate'
  ) => {
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
        formatted += '/' + digits.slice(4, 8); // Year (up to 4 digits)
      }
    }
    
    // Limit to 10 characters (dd/mm/yyyy)
    if (formatted.length > 10) {
      formatted = formatted.slice(0, 10);
    }
    
    // Update display value
    setDateDisplayValues(prev => ({ ...prev, [fieldName]: formatted }));
    
    // Try to parse to ISO format for storage
    // If complete date, store ISO format; if incomplete, keep current ISO or empty
    const isoDate = parseDateToISO(formatted);
    if (isoDate) {
      // Valid complete date - update form data with ISO format
      setFormData({ ...formData, [fieldName]: isoDate });
      // Clear display value since we now have valid ISO
      setDateDisplayValues(prev => ({ ...prev, [fieldName]: '' }));
    } else if (formatted.length === 0) {
      // User cleared the field
      setFormData({ ...formData, [fieldName]: '' });
      setDateDisplayValues(prev => ({ ...prev, [fieldName]: '' }));
    }
    // If incomplete date, keep the formatted string in displayValues but don't update formData yet
  };

  // Handle date input blur - try to finalize the date
  const handleDateInputBlur = (fieldName: 'dateOfBirth' | 'idCardIssueDate' | 'joinDate') => {
    const displayValue = dateDisplayValues[fieldName];
    if (displayValue) {
      const isoDate = parseDateToISO(displayValue);
      if (isoDate) {
        setFormData(prev => ({ ...prev, [fieldName]: isoDate }));
        setDateDisplayValues(prev => ({ ...prev, [fieldName]: '' }));
      } else {
        // Invalid or incomplete - clear display and keep ISO empty
        setDateDisplayValues(prev => ({ ...prev, [fieldName]: '' }));
        setFormData(prev => ({ ...prev, [fieldName]: '' }));
      }
    }
  };

  // Load staff data from database
  useEffect(() => {
    const loadStaff = async () => {
      if (!staffId) {
        setSubmitError('Không tìm thấy ID nhân viên');
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/staff/${staffId}?include=permissions`, { cache: 'no-store' });
        const result = await response.json();

        if (!response.ok) {
          console.error('Error loading staff:', result?.error || 'Unknown error');
          setSubmitError('Không thể tải thông tin nhân viên');
          setIsLoading(false);
          return;
        }

        const data = result?.user;
        const permissionsData = result?.permissions ? { permissions: result.permissions } : null;

        if (data) {
          // Transform database data to form format
          setFormData({
            name: data.full_name || '',
            phone: data.phone || '',
            email: data.email || '',
            dateOfBirth: data.date_of_birth || '',
            idCard: data.id_card || '',
            idCardIssueDate: data.id_card_issue_date || '',
            idCardIssuePlace: data.id_card_issue_place || '',
            bankName: data.bank_name || '',
            bankAccount: data.bank_account || '',
            professionalLevel: data.professional_level || '',
            permanentAddress: data.permanent_address || '',
            currentAddress: data.current_address || '',
            taxCode: data.tax_code || '',
            dependents: data.dependents || 0,
            role: data.role || StaffRole.SALES_CONSULTANT,
            branch: data.branch || 'Cần Thơ GF',
            status: data.status || StaffStatus.ACTIVE,
            joinDate: data.join_date || data.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
            username: data.username || '',
            permissions: (() => {
              // Default permissions structure matching StaffPermissions interface
              // This must match the default permissions structure exactly
              const defaultPermissions: Record<string, boolean> = {
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
                canManageContract: false,
                canApproveFinance: false,
                canViewReports: false,
                canManageInventory: false,
                canManageStaff: false
              };
              
              // Merge database permissions with defaults
              // Get permissions from permissions table, not from users table
              const dbPermissions = permissionsData?.permissions || {};
              const mergedPermissions: Record<string, boolean> = {};
              
              // First, set all defaults
              for (const [key, value] of Object.entries(defaultPermissions)) {
                mergedPermissions[key] = value;
              }
              
              // Then, override with values from database
              for (const [key, value] of Object.entries(dbPermissions)) {
                // Convert to boolean: true if value is true or 'true', false otherwise
                mergedPermissions[key] = value === true || value === 'true';
              }
              
              return mergedPermissions;
            })(),
            managerId: data.manager_id || ''
          });
        }
      } catch (error: any) {
        console.error('Error loading staff:', error);
        setSubmitError('Có lỗi xảy ra khi tải thông tin nhân viên');
      } finally {
        setIsLoading(false);
      }
    };

    loadStaff();
  }, [staffId]);

  // Fetch staff list from database (excluding current staff)
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        setLoadingStaff(true);
        const response = await fetch(`/api/staff?status=ACTIVE&excludeId=${staffId || ''}&fields=manager`, { cache: 'no-store' });
        const result = await response.json();

        if (!response.ok) {
          console.error('Error fetching staff:', result?.error || 'Unknown error');
          return;
        }

        const data = result?.staff || [];
        if (data) {
          setStaffList(data);
        }
      } catch (err: any) {
        console.error('Unexpected error fetching staff:', err);
      } finally {
        setLoadingStaff(false);
      }
    };

    if (staffId) {
      fetchStaff();
    }
  }, [staffId]);

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
    
    // Username is only required for admin
    if (!formData.name || !formData.phone || !formData.email) {
      setSubmitError('Vui lòng nhập đầy đủ thông tin bắt buộc');
      return;
    }
    
    if (isAdmin && !formData.username) {
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
      // Username is only required for admin (in edit mode, username should already exist)
      if (isAdmin && formData.username && !formData.username.trim()) {
        throw new Error('Tên đăng nhập không hợp lệ');
      }
      if (!formData.phone || !formData.phone.trim()) {
        throw new Error('Vui lòng nhập số điện thoại');
      }

      // Validate and ensure role is a valid string value
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
      
      let roleValue = formData.role 
        ? String(formData.role).trim().toUpperCase()
        : 'SALES_CONSULTANT';
      
      if (!validRoles.includes(roleValue)) {
        console.warn(`Invalid role value: ${roleValue}, defaulting to SALES_CONSULTANT`);
        roleValue = 'SALES_CONSULTANT';
      }

      // Validate and ensure status is a valid string value
      let statusValue = formData.status 
        ? String(formData.status).trim().toUpperCase()
        : 'ACTIVE';
      
      if (statusValue !== 'ACTIVE' && statusValue !== 'INACTIVE') {
        statusValue = 'ACTIVE';
      }

      // Format join_date
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
      // This must match the StaffPermissions interface in types.ts
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
        
        // Báo cáo (Reports)
        reportsView: false,
        reportsExport: false,
        reports: false,
        
        // Legacy permissions (backward compatibility)
        canManageContract: false,
        canApproveFinance: false,
        canViewReports: false,
        canManageInventory: false,
        canManageStaff: false
      };

      // Merge form permissions with default permissions
      const mergedPermissions = {
        ...defaultPermissions,
        ...(formData.permissions || {})
      };

      // Normalize permissions - only keep permissions with value true
      const normalizedPermissions: Record<string, boolean> = {};
      for (const [key, value] of Object.entries(mergedPermissions)) {
        const boolValue = value === true || value === 'true';
        if (boolValue) {
          normalizedPermissions[key] = true;
        }
      }

      // Prepare staff data in database format (snake_case)
      // IMPORTANT: Do NOT include 'permissions' field - it's stored in separate 'permissions' table
      const staffData: any = {
        full_name: formData.name.trim(),
        phone: toNullIfEmpty(formData.phone?.trim()),
        email: formData.email.trim().toLowerCase(),
        username: formData.username.trim(),
        // Note: Don't update password unless user explicitly wants to change it
        role: roleValue,
        branch: (formData.branch || 'Cần Thơ GF').trim(),
        status: statusValue,
        join_date: joinDateValue,
        // permissions column has been removed from database - DO NOT include it here
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
        manager_id: toNullIfEmpty(formData.managerId),
        notes: null
      };

      // CRITICAL: Explicitly remove 'permissions' if it somehow got included
      // This prevents database trigger errors about missing permissions field
      delete staffData.permissions;

      // Log the data being sent for debugging
      console.log('Updating staff data:', JSON.stringify(staffData, null, 2));
      console.log('Permissions will be saved separately in permissions table');

      const response = await fetch(`/api/staff/${staffId}`, {
        method: 'PATCH',
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
        let errorMessage = 'Lỗi cập nhật dữ liệu nhân sự';
        if (result?.error) {
          errorMessage += `: ${result.error}`;
        }
        throw new Error(errorMessage);
      }

      // Nếu đang chỉnh sửa chính user hiện tại, refresh permissions
      if (staffId && user && user.id === staffId) {
        try {
          const refreshResponse = await fetch(`/api/auth/user?id=${user.id}`);
          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            sessionStorage.setItem('user', JSON.stringify(refreshData.user));
            setTimeout(() => {
              window.location.reload();
            }, 500);
            return; // Không redirect nữa vì sẽ reload
          }
        } catch (refreshError) {
          console.error('Error refreshing user permissions:', refreshError);
        }
      }

      // Success - redirect to staff page (only if not refreshing current user)
      if (!user || user.id !== staffId) {
        router.push('/staff');
      }
    } catch (error: any) {
      console.error('Submit error - Full error:', error);
      
      let errorMessage = 'Có lỗi xảy ra khi cập nhật dữ liệu. Vui lòng thử lại.';
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-slate-500 text-sm font-bold">Đang tải thông tin nhân viên...</p>
        </div>
      </div>
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
            <h2 className="text-2xl font-black text-slate-900">Cập nhật thông tin nhân sự</h2>
            <p className="text-xs text-slate-500 font-medium">Chỉnh sửa thông tin hồ sơ và cấu hình quyền hạn hệ thống</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form 
        onSubmit={handleSubmit}
        className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden"
      >
        {/* Scrollable Content */}
        <div className="p-10 space-y-12">
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
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                          value={formData.phone}
                          onChange={e => setFormData({...formData, phone: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email *</label>
                        <input 
                          required
                          type="email" 
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                          value={formData.email}
                          onChange={e => setFormData({...formData, email: e.target.value})}
                        />
                      </div>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngày tháng năm sinh</label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                          type="text" 
                          placeholder="dd/mm/yyyy"
                          className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                          value={formatDateToDisplay(formData.dateOfBirth || '', 'dateOfBirth')}
                          onChange={e => handleDateInputChange(e.target.value, 'dateOfBirth')}
                          onBlur={() => handleDateInputBlur('dateOfBirth')}
                          maxLength={10}
                        />
                      </div>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Số CCCD/CMND</label>
                        <input 
                          type="text" 
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-mono"
                          value={formData.idCard || ''}
                          onChange={e => setFormData({...formData, idCard: e.target.value})}
                          placeholder="Nhập số CCCD/CMND"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngày cấp</label>
                        <input 
                          type="text" 
                          placeholder="dd/mm/yyyy"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                          value={formatDateToDisplay(formData.idCardIssueDate || '', 'idCardIssueDate')}
                          onChange={e => handleDateInputChange(e.target.value, 'idCardIssueDate')}
                          onBlur={() => handleDateInputBlur('idCardIssueDate')}
                          maxLength={10}
                        />
                      </div>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nơi cấp CCCD/CMND</label>
                      <select 
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                        value={formData.idCardIssuePlace || ''}
                        onChange={e => setFormData({...formData, idCardIssuePlace: e.target.value})}
                      >
                        <option value="">-- Chọn nơi cấp --</option>
                        <option value="Cục cảnh sát quản lý hành chính về trật tự xã hội">Cục cảnh sát quản lý hành chính về trật tự xã hội</option>
                        <option value="Bộ Công An">Bộ Công An</option>
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trình độ chuyên môn</label>
                      <div className="relative">
                        <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                          type="text" 
                          className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                          value={formData.professionalLevel || ''}
                          onChange={e => setFormData({...formData, professionalLevel: e.target.value})}
                          placeholder="Ví dụ: Đại học, Cao đẳng, Trung cấp..."
                        />
                      </div>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Địa chỉ hộ khẩu</label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                          type="text" 
                          className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                          value={formData.permanentAddress || ''}
                          onChange={e => setFormData({...formData, permanentAddress: e.target.value})}
                          placeholder="Nhập địa chỉ hộ khẩu thường trú"
                        />
                      </div>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nơi ở hiện tại</label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
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
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mã số thuế</label>
                        <input 
                          type="text" 
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-mono"
                          value={formData.taxCode || ''}
                          onChange={e => setFormData({...formData, taxCode: e.target.value})}
                          placeholder="Nhập mã số thuế"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Người phụ thuộc</label>
                        <div className="relative">
                          <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input 
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
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tên ngân hàng</label>
                        <div className="relative">
                          <Landmark className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input 
                            type="text" 
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                            value={formData.bankName || ''}
                            onChange={e => setFormData({...formData, bankName: e.target.value})}
                            placeholder="Ví dụ: Techcombank"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Số tài khoản</label>
                        <div className="relative">
                          <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input 
                            type="text" 
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-mono"
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
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vai trò công việc</label>
                      <select 
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
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chi nhánh</label>
                      <div className="relative">
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" size={18} />
                        <select 
                          className="w-full pl-12 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none appearance-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                          value={formData.branch}
                          onChange={e => setFormData({...formData, branch: e.target.value})}
                        >
                          <option value="Cần Thơ GF">Cần Thơ GF</option>
                        </select>
                      </div>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngày vào làm</label>
                      <input 
                        type="text" 
                        placeholder="dd/mm/yyyy"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                        value={formatDateToDisplay(formData.joinDate || '', 'joinDate')}
                        onChange={e => handleDateInputChange(e.target.value, 'joinDate')}
                        onBlur={() => handleDateInputBlur('joinDate')}
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
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Người quản lý</label>
                      <div className="relative">
                        <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" size={18} />
                        <select 
                          className="w-full pl-12 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none appearance-none focus:ring-4 focus:ring-blue-500/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          value={formData.managerId || ''}
                          onChange={e => setFormData({...formData, managerId: e.target.value})}
                          disabled={loadingStaff}
                        >
                          <option value="">{loadingStaff ? 'Đang tải...' : '-- Chọn người quản lý --'}</option>
                          {staffList.map((staff) => (
                            <option key={staff.id} value={staff.id}>
                              {staff.full_name}
                            </option>
                          ))}
                        </select>
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
                      <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Mật khẩu</label>
                      <div className="relative">
                        <input 
                          type={showPassword ? "text" : "password"}
                          className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-2xl text-sm font-bold text-white outline-none"
                          placeholder="Để trống nếu không đổi mật khẩu"
                          disabled
                        />
                        <button 
                          type="button" 
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      <p className="text-[10px] text-white/30 font-medium">Mật khẩu không thể thay đổi từ đây. Vui lòng liên hệ quản trị viên.</p>
                   </div>
                </div>
              </section>

              <section className="space-y-6">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <ShieldCheck size={18} className="text-emerald-600" /> D. Phân quyền nghiệp vụ
                </h3>
                <div className="space-y-6 pr-2">
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
                <p className="text-sm font-bold text-red-900">Lỗi khi cập nhật dữ liệu</p>
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
                  Đang cập nhật...
                </>
              ) : (
                <>
                  <Save size={18} /> Cập nhật hồ sơ nhân sự
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

