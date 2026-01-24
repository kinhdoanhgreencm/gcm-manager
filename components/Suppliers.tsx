'use client'

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { 
  Truck, Plus, Search, Filter, Building2, 
  MoreVertical, ChevronRight, Phone, Mail, 
  MapPin, Landmark, CreditCard, History, 
  Car, Receipt, DollarSign, AlertCircle,
  ShieldCheck, ArrowUpRight, ArrowDownRight,
  Clock, CheckCircle2, User, FileText, Loader2,
  RefreshCw, Edit, Trash2, X
} from 'lucide-react';
import { Supplier, SupplierType, SupplierStatus, VehicleStatus, TransactionType, TransactionCategory, Vehicle, Transaction } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useReload } from '@/contexts/ReloadContext';
import { hasAnyPermission, hasPermission, PermissionCategories } from '@/utils/permissions';
import { AccessDenied } from './AccessDenied';

export const Suppliers: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { user, refreshUser } = useAuth();
  const { reloadKey } = useReload();
  const [search, setSearch] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'inventory' | 'finance' | 'debt'>('overview');
  const [paymentMode, setPaymentMode] = useState<'per-vehicle' | 'full'>('per-vehicle');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [supplierVehicles, setSupplierVehicles] = useState<Vehicle[]>([]);
  const [supplierTransactions, setSupplierTransactions] = useState<Transaction[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [refreshingDebt, setRefreshingDebt] = useState(false);
  const [staffMap, setStaffMap] = useState<Map<string, string>>(new Map());
  const isMountedRef = useRef(false);
  const lastPathnameRef = useRef<string | null>(null);
  const [hasPendingPayment, setHasPendingPayment] = useState(false);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ show: boolean; supplierId: string | null; supplierName: string | null }>({
    show: false,
    supplierId: null,
    supplierName: null
  });
  const [deleting, setDeleting] = useState(false);

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const getSupplierTypeLabel = (type: SupplierType) => {
    switch(type) {
      case SupplierType.OEM: return { label: 'Hãng / Nhà phân phối', color: 'bg-blue-100 text-blue-700' };
      case SupplierType.DEALER: return { label: 'Đại lý trung gian', color: 'bg-indigo-100 text-indigo-700' };
      case SupplierType.INDIVIDUAL: return { label: 'Cá nhân ký gửi', color: 'bg-amber-100 text-amber-700' };
      case SupplierType.AUCTION: return { label: 'Nguồn đấu giá', color: 'bg-rose-100 text-rose-700' };
      default: return { label: 'Khác', color: 'bg-slate-100 text-slate-700' };
    }
  };

  // Fetch staff list from database
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const response = await fetch('/api/suppliers/staff', { cache: 'no-store' });
        const result = await response.json();

        if (!response.ok) {
          console.error('Error fetching staff:', result?.error || 'Unknown error');
          return;
        }

        const data = result?.staff || [];

        if (data) {
          const map = new Map<string, string>();
          data.forEach((staff: any) => {
            map.set(staff.id, staff.full_name);
          });
          setStaffMap(map);
        }
      } catch (err: any) {
        console.error('Unexpected error fetching staff:', err);
      }
    };

    fetchStaff();
  }, []);

  // Refresh debt cho tất cả suppliers
  const refreshSupplierDebt = async () => {
    try {
      setRefreshingDebt(true);
      setError(null);
      const response = await fetch('/api/suppliers/refresh-debt', {
        method: 'POST'
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || 'Không thể cập nhật công nợ nhà cung cấp');
      }

      // Refresh lại danh sách suppliers (không set loading để không ảnh hưởng UI)
      await fetchSuppliers({ silent: true });
    } catch (err: any) {
      console.error('Error refreshing supplier debt:', err);
      setError('Có lỗi xảy ra khi cập nhật công nợ. Vui lòng thử lại.');
    } finally {
      setRefreshingDebt(false);
    }
  };

  // Fetch suppliers from database
  const fetchSuppliers = async (options: { silent?: boolean } = {}) => {
    try {
      if (!options.silent) {
        setLoading(true);
      }
      setError(null);

      const response = await fetch('/api/suppliers', { cache: 'no-store' });
      const result = await response.json();

      if (!response.ok) {
        const errorMessage = result?.error || 'Không thể tải danh sách nhà cung cấp';
        console.error('Error fetching suppliers:', errorMessage);
        setError(`Lỗi tải dữ liệu: ${errorMessage}`);
        return;
      }

      const data = result?.suppliers || [];

      if (data) {
        // Transform Supabase data to Supplier type
        const transformedSuppliers: Supplier[] = data.map((s: any) => ({
          id: s.id,
          code: s.code || '',
          type: s.type as SupplierType,
          name: s.name || '',
          phone: s.phone || '',
          email: s.email || undefined,
          address: s.address || '',
          taxCode: s.tax_code || undefined,
          idCard: s.id_card || undefined,
          companyName: s.company_name || undefined,
          representative: s.representative || undefined,
          position: s.position || undefined,
          bankName: s.bank_name || undefined,
          bankAccount: s.bank_account || undefined,
          paymentTerms: (s.payment_terms || 'DEFERRED') as 'IMMEDIATE' | 'DEFERRED',
          assignedStaffId: s.assigned_staff_id || '',
          status: s.status as SupplierStatus,
          notes: s.notes || undefined,
          createdAt: s.created_at || new Date().toISOString(),
          totalVehicles: s.total_vehicles ? Number(s.total_vehicles) : 0,
          // Lấy giá trị nhập từ database (total_import_value)
          totalImportValue: s.total_import_value != null ? Number(s.total_import_value) : 0,
          debt: s.debt != null ? Number(s.debt) : 0
        }));

        setSuppliers(transformedSuppliers);
        
        // Cập nhật selectedSupplier nếu đang được chọn
        if (selectedSupplier) {
          const updatedSupplier = transformedSuppliers.find(s => s.id === selectedSupplier.id);
          if (updatedSupplier) {
            setSelectedSupplier(updatedSupplier);
          }
        }
      }
    } catch (err: any) {
      console.error('Unexpected error:', err);
      setError('Có lỗi xảy ra khi tải dữ liệu. Vui lòng thử lại.');
    } finally {
      if (!options.silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchSuppliers();
    isMountedRef.current = true;
    lastPathnameRef.current = pathname;
    
    // Refresh user permissions to ensure latest permissions are loaded
    refreshUser();
  }, [reloadKey]); // Re-fetch when reloadKey changes

  // Auto-select supplier from URL query param (e.g., from DebtManagement)
  useEffect(() => {
    const supplierId = searchParams.get('supplierId');
    if (supplierId && suppliers.length > 0 && !selectedSupplier) {
      const supplier = suppliers.find(s => s.id === supplierId);
      if (supplier) {
        setSelectedSupplier(supplier);
        // Auto-switch to finance tab when coming from DebtManagement
        setActiveTab('finance');
        // Remove supplierId from URL after selecting
        const newSearchParams = new URLSearchParams(searchParams.toString());
        newSearchParams.delete('supplierId');
        const newUrl = newSearchParams.toString() 
          ? `${window.location.pathname}?${newSearchParams.toString()}`
          : window.location.pathname;
        window.history.replaceState({}, '', newUrl);
        // Refresh data when coming from DebtManagement
        fetchSupplierDetails();
        fetchSuppliers();
      }
    }
  }, [searchParams, suppliers, selectedSupplier]);

  // Refresh data when window gets focus or becomes visible (e.g., after returning from finance page)
  useEffect(() => {
    const handleFocus = () => {
      // Refresh suppliers data when window gets focus
      fetchSuppliers();
      // Also refresh supplier details if a supplier is selected
      if (selectedSupplier) {
        fetchSupplierDetails();
      }
    };

    const handleVisibilityChange = () => {
      // Refresh when page becomes visible (e.g., switching back from another tab or page)
      if (document.visibilityState === 'visible') {
        fetchSuppliers();
        if (selectedSupplier) {
          fetchSupplierDetails();
        }
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [selectedSupplier]);

  // Refresh supplier details when switching to finance tab or payment mode
  // This ensures data is up-to-date after making payments from DebtManagement or Finance page
  useEffect(() => {
    if (selectedSupplier && activeTab === 'finance') {
      // Refresh supplier details to get latest transactions
      fetchSupplierDetails();
      // Also refresh supplier list to update debt values
      fetchSuppliers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, paymentMode]);

  // Refresh data when pathname changes (e.g., returning from DebtManagement or Finance page)
  useEffect(() => {
    // Only refresh if we're on the suppliers page, component is mounted, and pathname changed
    if (isMountedRef.current && pathname === '/suppliers' && lastPathnameRef.current !== pathname) {
      // Refresh if we have a selected supplier
      if (selectedSupplier) {
        fetchSupplierDetails();
      }
      fetchSuppliers();
    }
    lastPathnameRef.current = pathname;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, selectedSupplier]);

  // Fetch vehicles and transactions when supplier is selected
  const fetchSupplierDetails = async () => {
    if (!selectedSupplier) {
      setSupplierVehicles([]);
      setSupplierTransactions([]);
      setHasPendingPayment(false);
      return;
    }

    try {
      setLoadingDetails(true);

        const response = await fetch(`/api/suppliers/${selectedSupplier.id}?include=details`, { cache: 'no-store' });
        const result = await response.json();

        if (!response.ok) {
          console.warn('Error fetching supplier details:', result?.error || 'Unknown error');
          setSupplierVehicles([]);
          setSupplierTransactions([]);
          setHasPendingPayment(false);
          return;
        }

        const vehiclesData = result?.vehicles || [];
        const transactionsData = result?.transactions || [];

        const transformedVehicles: Vehicle[] = vehiclesData.map((v: any) => ({
          id: v.id,
          code: v.code || undefined,
          vin: v.vin,
          make: v.make || 'VinFast',
          model: v.model || '',
          year: v.year,
          type: v.type as any,
          price: Number(v.price) || 0,
          cost: Number(v.cost) || 0,
          status: v.status as VehicleStatus,
          color: v.color || '',
          mileage: v.mileage || undefined,
          batteryHealth: v.battery_health || undefined,
          images: v.images || [],
          createdAt: v.created_at || new Date().toISOString(),
          supplierId: v.supplier_id || undefined
        }));
        setSupplierVehicles(transformedVehicles);

        const transformedTransactions: Transaction[] = transactionsData.map((t: any) => ({
          id: t.id,
          date: t.date || t.created_at || new Date().toISOString(),
          amount: Number(t.amount) || 0,
          type: t.type as TransactionType,
          category: t.category as any,
          description: t.description || '',
          accountId: t.account_id || '',
          toAccountId: t.to_account_id || undefined,
          referenceId: t.reference_id || undefined,
          referenceType: t.reference_type as any,
          paymentMethod: t.payment_method as any,
          status: t.status as any,
          creatorId: t.creator_id || '',
          approverId: t.approver_id || undefined,
          attachments: t.attachments || undefined,
          approvedAt: t.approved_at || undefined
        }));
        setSupplierTransactions(transformedTransactions);

        // Check for pending payment transactions
        const hasPending = transformedTransactions.some(t => 
          t.type === TransactionType.EXPENSE && 
          (t.status === 'DRAFT' || t.status === 'PENDING')
        );
        setHasPendingPayment(hasPending);
      } catch (err: any) {
        console.error('Error fetching supplier details:', err);
      } finally {
        setLoadingDetails(false);
      }
  };

  useEffect(() => {
    fetchSupplierDetails();
  }, [selectedSupplier]);

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.code.toLowerCase().includes(search.toLowerCase()) ||
    (s.taxCode && s.taxCode.toLowerCase().includes(search.toLowerCase())) ||
    (s.idCard && s.idCard.toLowerCase().includes(search.toLowerCase())) ||
    (s.phone && s.phone.toLowerCase().includes(search.toLowerCase()))
  );

  // Handle payment creation
  const handleCreatePaymentForVehicle = (vehicle: Vehicle, amount: number) => {
    if (!selectedSupplier) return;
    
    const prefillData = {
      referenceId: selectedSupplier.id, // Sử dụng supplier.id để trigger cập nhật debt
      referenceType: 'SUPPLIER' as const, // Phải là SUPPLIER để trigger hoạt động
      amount: amount,
      category: TransactionCategory.INVENTORY_PURCHASE,
      description: `Trả nợ NCC: ${selectedSupplier.name} - Xe ${vehicle.make} ${vehicle.model} (${vehicle.vin})`,
      customerName: selectedSupplier.name, // Using customerName field for supplier name
      bankName: selectedSupplier.bankName,
      bankAccount: selectedSupplier.bankAccount
    };
    const prefillParam = encodeURIComponent(JSON.stringify(prefillData));
    router.push(`/finance/new?type=${TransactionType.EXPENSE}&prefill=${prefillParam}`);
  };

  const handleCreateFullPayment = () => {
    if (!selectedSupplier || selectedSupplier.debt <= 0) return;
    
    // Tính toán danh sách các xe chưa thanh toán đủ để thêm vào description
    const unpaidVehicles = supplierVehicles.map(v => {
      const vehiclePayments = supplierTransactions.filter(t => 
        t.referenceId === v.id || t.description.includes(v.vin)
      );
      const paidAmount = vehiclePayments.reduce((sum, t) => sum + t.amount, 0);
      const remainingAmount = v.cost - paidAmount;
      return { vehicle: v, remainingAmount };
    }).filter(item => item.remainingAmount > 0);

    // Tạo description chi tiết bao gồm danh sách các xe
    let description = `Trả nợ NCC: ${selectedSupplier.name}`;
    if (unpaidVehicles.length > 0) {
      description += `\n\nDanh sách xe đã thanh toán:\n`;
      unpaidVehicles.forEach((item, index) => {
        description += `${index + 1}. ${item.vehicle.make} ${item.vehicle.model} (${item.vehicle.vin}): ${formatVND(item.remainingAmount)}\n`;
      });
    }
    
    const prefillData = {
      referenceId: selectedSupplier.id,
      referenceType: 'SUPPLIER' as const, // Phải là SUPPLIER để trigger cập nhật debt
      amount: selectedSupplier.debt,
      category: TransactionCategory.INVENTORY_PURCHASE,
      description: description,
      customerName: selectedSupplier.name, // Using customerName field for supplier name
      bankName: selectedSupplier.bankName,
      bankAccount: selectedSupplier.bankAccount
    };
    const prefillParam = encodeURIComponent(JSON.stringify(prefillData));
    router.push(`/finance/new?type=${TransactionType.EXPENSE}&prefill=${prefillParam}`);
  };

  // Check if user has any supplier permissions
  const hasSupplierPermissions = hasAnyPermission(user?.permissions, PermissionCategories.suppliers);
  const canCreateSupplier = hasAnyPermission(user?.permissions, ['supplierCreate']);
  const canUpdateSupplier = hasAnyPermission(user?.permissions, ['supplierUpdate']);
  const canDeleteSupplier = hasAnyPermission(user?.permissions, ['supplierDelete']);

  // Handle delete click
  const handleDeleteClick = (supplierId: string, supplierName: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click
    if (!canDeleteSupplier) {
      alert('Bạn không có quyền xóa nhà cung cấp. Vui lòng liên hệ quản trị viên để được cấp quyền.');
      return;
    }
    setDeleteConfirmModal({
      show: true,
      supplierId,
      supplierName
    });
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!deleteConfirmModal.supplierId) return;
    if (!canDeleteSupplier) {
      alert('Bạn không có quyền xóa nhà cung cấp. Vui lòng liên hệ quản trị viên để được cấp quyền.');
      return;
    }

    try {
      setDeleting(true);

      const response = await fetch(`/api/suppliers/${deleteConfirmModal.supplierId}`, {
        method: 'DELETE'
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || 'Có lỗi xảy ra khi xóa nhà cung cấp. Vui lòng thử lại.');
      }

      // Close modal and refresh list
      setDeleteConfirmModal({ show: false, supplierId: null, supplierName: null });
      fetchSuppliers();
      
      // If deleted supplier was selected, clear selection
      if (selectedSupplier?.id === deleteConfirmModal.supplierId) {
        setSelectedSupplier(null);
      }
    } catch (error: any) {
      console.error('Delete error:', error);
      alert(error.message || 'Có lỗi xảy ra khi xóa nhà cung cấp. Vui lòng thử lại.');
    } finally {
      setDeleting(false);
    }
  };
  
  // Detailed permission checks with proper fallback logic
  // IMPORTANT: supplierView only allows access to the tab, NOT full access to all details
  // Each detailed permission must be checked separately
  // Priority: specific permission > general permission > legacy permission
  // supplierView is NOT used for full access - it's only for tab access check
  
  const canViewBasicInfo = hasAnyPermission(user?.permissions, [
    'supplierBasicInfo',    // Specific permission (highest priority)
    'supplierRead',         // General read permission (fallback)
    'supplierInfo'          // Legacy info permission (fallback)
  ]);
  
  const canViewFinancialInfo = hasAnyPermission(user?.permissions, [
    'supplierFinancialInfo', // Specific permission (highest priority)
    'supplierDebt',          // Debt management permission (fallback)
    'supplierInfo'           // Legacy info permission (fallback)
  ]);
  
  const canViewLegalInfo = hasAnyPermission(user?.permissions, [
    'supplierLegalInfo',     // Specific permission (highest priority)
    'supplierInfo'           // Legacy info permission (fallback)
  ]);
  
  const canViewVehicles = hasAnyPermission(user?.permissions, [
    'supplierVehicles',      // Specific permission (highest priority)
    'supplierRead',          // General read permission (fallback)
    'supplierInfo'           // Legacy info permission (fallback)
  ]);
  
  const canViewPaymentHistory = hasAnyPermission(user?.permissions, [
    'supplierPaymentHistory', // Specific permission (highest priority)
    'supplierDebt',           // Debt management permission (fallback)
    'supplierInfo'            // Legacy info permission (fallback)
  ]);
  
  const canViewDebtHistory = hasAnyPermission(user?.permissions, [
    'supplierDebtHistory',    // Specific permission (highest priority)
    'supplierDebt'            // Debt management permission (fallback)
  ]);

  // Debug: Log permissions (remove in production)
  useEffect(() => {
    if (user?.permissions) {
      console.log('[Suppliers] User permissions:', {
        supplierView: user.permissions.supplierView,
        canViewBasicInfo,
        canViewFinancialInfo,
        canViewLegalInfo,
        canViewVehicles,
        canViewPaymentHistory,
        canViewDebtHistory,
        supplierPermissions: Object.keys(user.permissions)
          .filter(key => key.startsWith('supplier'))
          .reduce((acc, key) => {
            acc[key] = user.permissions[key];
            return acc;
          }, {} as Record<string, boolean>)
      });
    }
  }, [user?.permissions, canViewBasicInfo, canViewFinancialInfo, canViewLegalInfo, canViewVehicles, canViewPaymentHistory, canViewDebtHistory]);

  // Auto-switch to first available tab if current tab is not accessible
  useEffect(() => {
    if (!selectedSupplier) return;
    
    const availableTabs: Array<'overview' | 'inventory' | 'finance' | 'debt'> = [];
    if (canViewBasicInfo || canViewLegalInfo || canViewFinancialInfo || canViewVehicles) {
      availableTabs.push('overview');
    }
    if (canViewVehicles) {
      availableTabs.push('inventory');
    }
    if (canViewPaymentHistory) {
      availableTabs.push('finance');
    }
    if (canViewDebtHistory) {
      availableTabs.push('debt');
    }
    
    // If current activeTab is not in available tabs, switch to first available
    if (availableTabs.length > 0 && !availableTabs.includes(activeTab)) {
      setActiveTab(availableTabs[0]);
    }
  }, [selectedSupplier, activeTab, canViewBasicInfo, canViewLegalInfo, canViewFinancialInfo, canViewVehicles, canViewPaymentHistory, canViewDebtHistory]);

  if (selectedSupplier) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <button 
          onClick={() => setSelectedSupplier(null)}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold text-sm transition-colors"
        >
          <ChevronRight size={18} className="rotate-180" /> Quay lại danh sách
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Info */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center text-3xl font-black mb-4 ring-8 ring-blue-50">
                <Truck size={40} />
              </div>
              <h3 className="text-xl font-black text-slate-900">{selectedSupplier.name}</h3>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">{selectedSupplier.code}</p>
              
              {/* Always show basic contact info if user has any supplier permission */}
              {canViewBasicInfo && (
                <div className="mt-4 w-full pt-6 border-t border-slate-50 space-y-4 text-left">
                   <div className="flex items-start gap-3">
                     <Phone size={16} className="text-slate-400 mt-0.5" />
                     <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase">Liên hệ</p>
                       <p className="text-sm font-bold text-slate-900">{selectedSupplier.phone || 'Chưa cập nhật'}</p>
                     </div>
                   </div>
                   <div className="flex items-start gap-3">
                     <MapPin size={16} className="text-slate-400 mt-0.5" />
                     <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase">Địa chỉ</p>
                       <p className="text-xs font-medium text-slate-600 leading-relaxed">{selectedSupplier.address || 'Chưa cập nhật'}</p>
                     </div>
                   </div>
                   {canViewFinancialInfo && (
                     <div className="flex items-start gap-3">
                       <Landmark size={16} className="text-slate-400 mt-0.5" />
                       <div>
                         <p className="text-[10px] font-black text-slate-400 uppercase">Thanh toán</p>
                         <p className="text-xs font-bold text-slate-900">{selectedSupplier.bankName || 'Chưa cập nhật'}</p>
                         <p className="text-[10px] font-mono text-slate-400">{selectedSupplier.bankAccount || 'Chưa cập nhật'}</p>
                       </div>
                     </div>
                   )}
                </div>
              )}

            </div>

            {canViewFinancialInfo && (
              <div className="bg-rose-50 rounded-3xl p-6 border border-rose-100">
                 <div className="flex justify-between items-center mb-4">
                    <div className="w-10 h-10 bg-rose-500 text-white rounded-xl flex items-center justify-center">
                      <DollarSign size={20} />
                    </div>
                    <span className="text-[10px] font-black text-rose-600 uppercase">Phải trả NCC</span>
                 </div>
                 <p className="text-[10px] font-bold text-rose-700/60 uppercase tracking-widest">Công nợ hiện tại</p>
                 <h4 className="text-xl font-black text-rose-700">{formatVND(selectedSupplier.debt)}</h4>
                 <div className="mt-4 pt-4 border-t border-rose-100 flex justify-between items-center">
                    <span className="text-xs font-bold text-rose-700">Hình thức</span>
                    <span className="text-xs font-black text-rose-600 uppercase tracking-tighter">
                      {selectedSupplier.paymentTerms === 'DEFERRED' ? 'Trả chậm' : 'Trả ngay'}
                    </span>
                 </div>
              </div>
            )}
          </div>

          {/* Main Content Tabs */}
          <div className="lg:col-span-3 space-y-6">
            {/* Get available tabs */}
            {(() => {
              const availableTabs = [
                { id: 'overview' as const, label: 'Tổng quan', icon: <Building2 size={16} />, show: canViewBasicInfo || canViewLegalInfo || canViewFinancialInfo || canViewVehicles },
                { id: 'inventory' as const, label: 'Xe đã nhập', icon: <Car size={16} />, show: canViewVehicles },
                { id: 'finance' as const, label: 'Thanh toán', icon: <Receipt size={16} />, show: canViewPaymentHistory },
                { id: 'debt' as const, label: 'Lịch sử nợ', icon: <History size={16} />, show: canViewDebtHistory },
              ].filter(tab => tab.show !== false);
              
              // If no tabs available, show access denied message
              if (availableTabs.length === 0) {
                return (
                  <div className="bg-white rounded-[40px] border border-slate-200 p-20 text-center shadow-sm">
                    <ShieldCheck size={48} className="text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-black text-slate-900 mb-2">Không có quyền truy cập</h3>
                    <p className="text-slate-500 font-bold">Bạn không có quyền xem bất kỳ thông tin nào của nhà cung cấp này. Vui lòng liên hệ quản trị viên để được cấp quyền.</p>
                  </div>
                );
              }
              
              return (
                <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 w-fit">
                  {availableTabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        // Refresh data when switching to finance tab to ensure latest payment data
                        if (tab.id === 'finance' && selectedSupplier) {
                          fetchSupplierDetails();
                          fetchSuppliers();
                        }
                      }}
                      className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black transition-all ${
                        activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {tab.icon} {tab.label}
                    </button>
                  ))}
                </div>
              );
            })()}

            {activeTab === 'overview' && (canViewBasicInfo || canViewLegalInfo || canViewFinancialInfo || canViewVehicles) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-4">
                 {canViewLegalInfo && (
                   <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm col-span-2">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Thông tin pháp lý & Phụ trách</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                         <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Mã số thuế / CCCD</p>
                            <p className="text-sm font-black text-slate-900 font-mono">{selectedSupplier.taxCode || selectedSupplier.idCard}</p>
                         </div>
                         <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Người đại diện</p>
                            <p className="text-sm font-black text-slate-900">{selectedSupplier.representative || 'N/A'}</p>
                         </div>
                         {canViewBasicInfo && (
                           <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Nhân viên phụ trách</p>
                              <div className="flex items-center gap-2">
                                 <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-[10px] text-blue-600 font-black">AD</div>
                                 <p className="text-sm font-black text-slate-900">Quản trị viên</p>
                              </div>
                           </div>
                         )}
                      </div>
                   </div>
                 )}

                 {canViewVehicles && (
                   <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm flex flex-col justify-center gap-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hiệu suất nhập xe</p>
                      <div className="flex items-center gap-3">
                         <Car size={32} className="text-blue-600" />
                         <h5 className="text-4xl font-black text-slate-900">{selectedSupplier.totalVehicles}</h5>
                         <span className="text-[10px] font-bold text-slate-400 uppercase">Sản phẩm</span>
                      </div>
                   </div>
                 )}

                 {canViewFinancialInfo && (
                   <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm flex flex-col justify-center gap-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Giá trị nhập tích lũy</p>
                      <div className="flex items-center gap-3">
                         <ArrowUpRight size={32} className="text-emerald-600" />
                         <h5 className="text-2xl font-black text-slate-900">{formatVND(selectedSupplier.totalImportValue)}</h5>
                      </div>
                   </div>
                 )}
              </div>
            )}

            {activeTab === 'inventory' && !canViewVehicles ? (
              <div className="bg-white rounded-[40px] border border-slate-200 p-20 text-center shadow-sm">
                <ShieldCheck size={48} className="text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-black text-slate-900 mb-2">Không có quyền truy cập</h3>
                <p className="text-slate-500 font-bold">Bạn không có quyền xem danh sách xe đã nhập. Vui lòng liên hệ quản trị viên để được cấp quyền.</p>
              </div>
            ) : activeTab === 'inventory' && (
              <div className="bg-white rounded-[40px] border border-slate-200 overflow-hidden shadow-sm animate-in slide-in-from-bottom-4">
                 {loadingDetails ? (
                   <div className="py-20 text-center">
                     <Loader2 className="animate-spin mx-auto text-slate-400" size={32} />
                     <p className="text-sm text-slate-500 mt-4">Đang tải dữ liệu...</p>
                   </div>
                 ) : (
                   <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Xe & Số VIN</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Trạng thái</th>
                          {canViewFinancialInfo && (
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Giá nhập (Vốn)</th>
                          )}
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Bàn giao</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                         {supplierVehicles.map(v => (
                         <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                               <p className="text-sm font-bold text-slate-900">{v.make} {v.model}</p>
                               <p className="text-[10px] font-mono text-slate-400 uppercase">{v.vin}</p>
                            </td>
                            <td className="px-6 py-4">
                               <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                 v.status === VehicleStatus.AVAILABLE ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                               }`}>
                                 {v.status === VehicleStatus.AVAILABLE ? 'Còn trong kho' : 'Đã bán / Đã bàn giao'}
                               </span>
                            </td>
                            {canViewFinancialInfo && (
                              <td className="px-6 py-4 text-right">
                                 <p className="text-sm font-black text-slate-900">{formatVND(v.cost)}</p>
                              </td>
                            )}
                            <td className="px-6 py-4 text-center">
                               {v.status === VehicleStatus.DELIVERED ? <CheckCircle2 size={16} className="text-emerald-500 mx-auto" /> : <Clock size={16} className="text-slate-300 mx-auto" />}
                            </td>
                         </tr>
                       ))}
                         {supplierVehicles.length === 0 && (
                           <tr><td colSpan={canViewFinancialInfo ? 4 : 3} className="py-20 text-center text-slate-400 font-bold text-xs uppercase">Chưa có xe nào từ nguồn này</td></tr>
                         )}
                      </tbody>
                   </table>
                 )}
              </div>
            )}

            {activeTab === 'finance' && !canViewPaymentHistory ? (
              <div className="bg-white rounded-[40px] border border-slate-200 p-20 text-center shadow-sm">
                <ShieldCheck size={48} className="text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-black text-slate-900 mb-2">Không có quyền truy cập</h3>
                <p className="text-slate-500 font-bold">Bạn không có quyền xem lịch sử thanh toán. Vui lòng liên hệ quản trị viên để được cấp quyền.</p>
              </div>
            ) : activeTab === 'finance' && (
              <div className="space-y-4 animate-in slide-in-from-bottom-4">
                 {/* Payment Mode Tabs */}
                 <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 w-fit">
                   <button
                     onClick={() => setPaymentMode('per-vehicle')}
                     className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black transition-all ${
                       paymentMode === 'per-vehicle' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-500 hover:bg-slate-50'
                     }`}
                   >
                     <Car size={16} /> Thanh toán theo từng xe
                   </button>
                   <button
                     onClick={() => setPaymentMode('full')}
                     className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black transition-all ${
                       paymentMode === 'full' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-500 hover:bg-slate-50'
                     }`}
                   >
                     <DollarSign size={16} /> Thanh toán toàn bộ
                   </button>
                 </div>

                 {paymentMode === 'per-vehicle' ? (
                   /* Thanh toán theo từng xe */
                   <div className="space-y-4">
                     <div className="bg-white rounded-[40px] border border-slate-200 overflow-hidden shadow-sm">
                       <table className="w-full text-left">
                         <thead className="bg-slate-50 border-b border-slate-100">
                           <tr>
                             <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Xe & Số VIN</th>
                             {canViewFinancialInfo && (
                               <>
                                 <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Giá nhập (Vốn)</th>
                                 <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Số tiền đã trả</th>
                                 <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Còn lại</th>
                               </>
                             )}
                           </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-50">
                           {loadingDetails ? (
                             <tr>
                               <td colSpan={canViewFinancialInfo ? 4 : 1} className="py-20 text-center">
                                 <Loader2 className="animate-spin mx-auto text-slate-400" size={32} />
                                 <p className="text-sm text-slate-500 mt-4">Đang tải dữ liệu...</p>
                               </td>
                             </tr>
                           ) : supplierVehicles.length > 0 ? (
                             supplierVehicles.map(v => {
                               // Tính số tiền đã trả riêng cho từng xe
                               // Chỉ tính các transaction:
                               // 1. reference_id = vehicle.id (direct vehicle payment)
                               // 2. description chứa VIN của xe (supplier payment with vehicle info)
                               // Note: Các transaction thanh toán chung cho supplier (không có VIN) 
                               // sẽ không tính vào vehicle cụ thể, nhưng vẫn tính vào tổng debt của supplier
                               const vehiclePayments = supplierTransactions.filter(t => {
                                 const isApproved = t.status === 'APPROVED' || t.status === 'LOCKED';
                                 if (!isApproved) return false;
                                 
                                 // Direct vehicle payment
                                 if (t.referenceId === v.id) return true;
                                 
                                 // Payment with VIN in description (case-insensitive)
                                 if (t.description && t.description.toUpperCase().includes(v.vin.toUpperCase())) return true;
                                 
                                 return false;
                               });
                               
                               // Kiểm tra xem có transaction pending nào cho vehicle này hoặc cho supplier không
                               const vehiclePendingPayments = supplierTransactions.filter(t => {
                                 const isPending = t.status === 'DRAFT' || t.status === 'PENDING';
                                 if (!isPending || t.type !== TransactionType.EXPENSE) return false;
                                 
                                 // Direct vehicle payment
                                 if (t.referenceId === v.id) return true;
                                 
                                 // Payment with VIN in description (case-insensitive)
                                 if (t.description && t.description.toUpperCase().includes(v.vin.toUpperCase())) return true;
                                 
                                 // General supplier payment (không có VIN) - áp dụng cho tất cả vehicles còn nợ
                                 if ((t.referenceId === selectedSupplier?.id || t.referenceId === selectedSupplier?.code) &&
                                     (!t.description || !t.description.toUpperCase().includes(v.vin.toUpperCase()))) {
                                   return true;
                                 }
                                 
                                 return false;
                               });
                               
                               const hasVehiclePending = vehiclePendingPayments.length > 0;
                               
                               const paidAmount = vehiclePayments.reduce((sum, t) => sum + t.amount, 0);
                               const remainingAmount = Math.max(0, v.cost - paidAmount);

                               return (
                                 <tr key={v.id} className="hover:bg-slate-50">
                                   <td className="px-6 py-4">
                                     <p className="text-sm font-bold text-slate-900">{v.make} {v.model}</p>
                                     <p className="text-[10px] font-mono text-slate-400 uppercase">{v.vin}</p>
                                   </td>
                                   {canViewFinancialInfo && (
                                     <>
                                       <td className="px-6 py-4 text-right">
                                         <p className="text-sm font-black text-slate-900">{formatVND(v.cost)}</p>
                                       </td>
                                       <td className="px-6 py-4 text-right">
                                         <p className="text-sm font-black text-emerald-600">{formatVND(paidAmount)}</p>
                                       </td>
                                       <td className="px-6 py-4 text-right">
                                         <p className={`text-sm font-black ${remainingAmount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                                           {formatVND(remainingAmount)}
                                         </p>
                                       </td>
                                     </>
                                   )}
                                 </tr>
                               );
                             })
                           ) : (
                             <tr>
                               <td colSpan={canViewFinancialInfo ? 4 : 1} className="py-20 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">
                                 Chưa có xe nào từ nguồn này
                               </td>
                             </tr>
                           )}
                         </tbody>
                       </table>
                     </div>

                     {/* Lịch sử thanh toán - Thống nhất với phần thanh toán toàn bộ */}
                     {loadingDetails ? (
                       <div className="bg-white rounded-[40px] border border-slate-200 p-20 text-center">
                         <Loader2 className="animate-spin mx-auto text-slate-400" size={32} />
                         <p className="text-sm text-slate-500 mt-4">Đang tải dữ liệu...</p>
                       </div>
                     ) : (
                       <div className="bg-white rounded-[40px] border border-slate-200 overflow-hidden shadow-sm">
                         <table className="w-full text-left">
                           <thead className="bg-slate-50 border-b border-slate-100">
                             <tr>
                               <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngày phát sinh</th>
                               <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nội dung thanh toán</th>
                               <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Số tiền chi</th>
                               <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Trạng thái</th>
                             </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-50">
                             {supplierTransactions.length > 0 ? supplierTransactions.map(t => (
                               <tr key={t.id} className="hover:bg-slate-50">
                                 <td className="px-6 py-4 text-xs font-bold text-slate-600">{new Date(t.date).toLocaleDateString('vi-VN')}</td>
                                 <td className="px-6 py-4 text-xs font-medium">{t.description}</td>
                                 <td className="px-6 py-4 text-right text-sm font-black text-rose-600">-{formatVND(t.amount)}</td>
                                 <td className="px-6 py-4 text-center">
                                   <CheckCircle2 size={16} className="text-emerald-500 mx-auto" />
                                 </td>
                               </tr>
                             )) : (
                               <tr><td colSpan={4} className="py-20 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">Chưa có dữ liệu thanh toán</td></tr>
                             )}
                           </tbody>
                         </table>
                       </div>
                     )}
                   </div>
                 ) : (
                   /* Thanh toán toàn bộ */
                   <div className="space-y-4">
                     {canViewFinancialInfo && (
                       <div className="bg-slate-900 text-white p-8 rounded-3xl flex justify-between items-center relative overflow-hidden">
                         <div className="relative z-10">
                           {selectedSupplier.debt > 0 ? (
                             <>
                               <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">Tổng nợ cần thanh toán</p>
                               <h4 className="text-3xl font-black text-rose-400">{formatVND(selectedSupplier.debt)}</h4>
                             </>
                           ) : (
                             <>
                               <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">Tổng vốn đã thanh toán thực tế</p>
                               <h4 className="text-3xl font-black text-emerald-400">{formatVND(selectedSupplier.totalImportValue - selectedSupplier.debt)}</h4>
                             </>
                           )}
                         </div>
                         {selectedSupplier.debt > 0 && canViewPaymentHistory && (
                           hasPendingPayment ? (
                             <div className="relative z-10 px-8 py-3 bg-slate-700 text-slate-300 rounded-2xl text-xs font-black flex items-center gap-2 cursor-not-allowed">
                               <CheckCircle2 size={16} /> Đã tạo phiếu chi (Đang chờ duyệt)
                             </div>
                           ) : (
                             <button
                               onClick={() => handleCreateFullPayment()}
                               className="relative z-10 px-8 py-3 bg-white text-slate-900 rounded-2xl text-xs font-black hover:bg-slate-100 transition-all flex items-center gap-2"
                             >
                               <Plus size={16} /> Tạo phiếu chi (Trả nợ NCC)
                             </button>
                           )
                         )}
                         <DollarSign className="absolute -bottom-10 -right-10 text-white/5" size={200} />
                       </div>
                     )}

                     {loadingDetails ? (
                       <div className="bg-white rounded-[40px] border border-slate-200 p-20 text-center">
                         <Loader2 className="animate-spin mx-auto text-slate-400" size={32} />
                         <p className="text-sm text-slate-500 mt-4">Đang tải dữ liệu...</p>
                       </div>
                     ) : (
                       <div className="bg-white rounded-[40px] border border-slate-200 overflow-hidden shadow-sm">
                         <table className="w-full text-left">
                           <thead className="bg-slate-50 border-b border-slate-100">
                             <tr>
                               <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngày phát sinh</th>
                               <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nội dung thanh toán</th>
                               <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Số tiền chi</th>
                               <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Trạng thái</th>
                             </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-50">
                             {supplierTransactions.length > 0 ? supplierTransactions.map(t => (
                               <tr key={t.id} className="hover:bg-slate-50">
                                 <td className="px-6 py-4 text-xs font-bold text-slate-600">{new Date(t.date).toLocaleDateString('vi-VN')}</td>
                                 <td className="px-6 py-4 text-xs font-medium">{t.description}</td>
                                 <td className="px-6 py-4 text-right text-sm font-black text-rose-600">-{formatVND(t.amount)}</td>
                                 <td className="px-6 py-4 text-center">
                                   <CheckCircle2 size={16} className="text-emerald-500 mx-auto" />
                                 </td>
                               </tr>
                             )) : (
                               <tr><td colSpan={4} className="py-20 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">Chưa có dữ liệu thanh toán</td></tr>
                             )}
                           </tbody>
                         </table>
                       </div>
                     )}
                   </div>
                 )}
              </div>
            )}

            {activeTab === 'debt' && !canViewDebtHistory ? (
              <div className="bg-white rounded-[40px] border border-slate-200 p-20 text-center shadow-sm">
                <ShieldCheck size={48} className="text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-black text-slate-900 mb-2">Không có quyền truy cập</h3>
                <p className="text-slate-500 font-bold">Bạn không có quyền xem lịch sử nợ. Vui lòng liên hệ quản trị viên để được cấp quyền.</p>
              </div>
            ) : activeTab === 'debt' && (
              <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm animate-in slide-in-from-bottom-4 space-y-8">
                 {canViewFinancialInfo && (
                   <div className="flex justify-between items-start">
                      <div>
                         <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Trạng thái nợ hiện tại</h4>
                         <h3 className={`text-4xl font-black ${selectedSupplier.debt > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                           {formatVND(selectedSupplier.debt)}
                         </h3>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-right">
                         <p className="text-[10px] font-black text-slate-400 uppercase">Hạn thanh toán kế tiếp</p>
                         <p className="text-sm font-black text-slate-900">25 / 05 / 2024</p>
                      </div>
                   </div>
                 )}

                 <div className="space-y-4">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                       <FileText size={14} /> Biến động nợ từ nhập xe
                    </h5>
                    <div className="bg-slate-50 border border-slate-200 rounded-3xl overflow-hidden">
                       <table className="w-full text-left">
                          <thead className="bg-white/50 border-b border-slate-200">
                             <tr>
                                <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase">Ngày</th>
                                <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase">Xe liên kết</th>
                                {canViewFinancialInfo && (
                                  <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase text-right">Phát sinh nợ</th>
                                )}
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                             {supplierVehicles.map(v => (
                               <tr key={v.id} className="text-xs">
                                  <td className="px-6 py-3 font-medium">{v.createdAt.split('T')[0]}</td>
                                  <td className="px-6 py-3 font-bold">{v.make} {v.model}</td>
                                  {canViewFinancialInfo && (
                                    <td className="px-6 py-3 text-right font-black text-rose-600">+{formatVND(v.cost)}</td>
                                  )}
                               </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                 </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Calculate stats from suppliers data
  const totalSuppliers = suppliers.length;
  // Công nợ Hãng (OEM) = Tổng công nợ (debt) của các nhà cung cấp OEM từ database
  // Chỉ tính công nợ cho OEM có payment_terms = 'DEFERRED' và status = 'ACTIVE'
  const oemDebt = suppliers
    .filter(s => 
      s.type === SupplierType.OEM && 
      s.paymentTerms === 'DEFERRED' &&
      s.status === SupplierStatus.ACTIVE
    )
    .reduce((sum, s) => sum + Math.max(0, s.debt || 0), 0); // Đảm bảo debt >= 0
  // Tính tổng số lượng và tổng trị giá cho xe cá nhân ký gửi
  const individualSuppliers = suppliers.filter(s => s.type === SupplierType.INDIVIDUAL && s.status === SupplierStatus.ACTIVE);
  const individualCount = individualSuppliers.reduce((sum, s) => sum + (s.totalVehicles || 0), 0);
  const individualTotalValue = individualSuppliers.reduce((sum, s) => sum + (s.totalImportValue || 0), 0);
  const uniqueStaffCount = new Set(suppliers.map(s => s.assignedStaffId).filter(Boolean)).size;

  // Format số với đơn vị " đ" (không làm tròn)
  const formatVNDWithD = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto text-blue-600" size={48} />
          <p className="text-sm text-slate-500 mt-4">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center">
        <AlertCircle className="mx-auto text-rose-600" size={32} />
        <p className="text-rose-700 font-bold mt-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-6 py-2 bg-rose-600 text-white rounded-xl text-sm font-bold hover:bg-rose-700 transition-all"
        >
          Tải lại
        </button>
      </div>
    );
  }

  // If user doesn't have any supplier permissions, show access denied message
  if (!hasSupplierPermissions) {
    return (
      <AccessDenied 
        message="Bạn không có quyền xem nhà cung cấp. Vui lòng liên hệ quản trị viên để được cấp quyền."
        redirectTo="/dashboard"
        icon="shield"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Tổng đối tác', value: totalSuppliers.toString(), color: 'text-slate-900', icon: <Truck size={16} className="text-slate-400" />, show: canViewBasicInfo },
          { label: 'Công nợ Hãng (OEM)', value: formatVNDWithD(oemDebt), color: 'text-rose-600', icon: <Building2 size={16} className="text-rose-400" />, show: canViewFinancialInfo },
          { 
            label: 'Nhân viên phụ trách', 
            value: uniqueStaffCount.toString(), 
            color: 'text-blue-600', 
            icon: <User size={16} className="text-blue-400" />,
            show: canViewBasicInfo
          },
        ].filter(stat => stat.show !== false).map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
              {stat.icon}
            </div>
            <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
        
        {/* Card đặc biệt cho Xe ký gửi cá nhân với trị giá */}
        {canViewVehicles && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Xe ký gửi cá nhân</p>
              <Car size={16} className="text-amber-400" />
            </div>
            <p className="text-2xl font-black text-amber-600">{individualCount} xe</p>
            {individualCount > 0 && individualTotalValue > 0 && canViewFinancialInfo && (
              <p className="text-sm font-bold text-amber-700/70 mt-1">{formatVNDWithD(individualTotalValue)}</p>
            )}
          </div>
        )}
      </div>

      {/* Filter & Action */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Tìm theo tên đối tác, mã NCC, MST..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold focus:ring-4 focus:ring-blue-500/10 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex gap-3">
          {canCreateSupplier && (
            <Link
              href="/suppliers/new"
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-black text-sm shadow-lg shadow-blue-200 transition-all"
            >
              <Plus size={18} /> Thêm nhà cung cấp
            </Link>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nhà cung cấp</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Loại nguồn</th>
              {canViewVehicles && (
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Số xe đã nhập</th>
              )}
              {canViewFinancialInfo && (
                <>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Giá trị nhập</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Công nợ hiện tại</th>
                </>
              )}
              {canViewBasicInfo && (
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nhân viên phụ trách</th>
              )}
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredSuppliers.length === 0 ? (
              <tr>
                <td colSpan={
                  1 + // Nhà cung cấp
                  1 + // Loại nguồn
                  (canViewVehicles ? 1 : 0) + // Số xe đã nhập
                  (canViewFinancialInfo ? 2 : 0) + // Giá trị nhập + Công nợ
                  (canViewBasicInfo ? 1 : 0) + // Nhân viên phụ trách
                  1 // Thao tác
                } className="py-20 text-center text-slate-400 font-bold text-xs uppercase">
                  {search ? 'Không tìm thấy nhà cung cấp nào' : 'Chưa có nhà cung cấp nào'}
                </td>
              </tr>
            ) : (
              filteredSuppliers.map((s) => {
              const typeLabel = getSupplierTypeLabel(s.type);
              const assignedStaffName = s.assignedStaffId ? staffMap.get(s.assignedStaffId) : null;
              return (
                <tr key={s.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer group" onClick={(e) => {
                  // If user is selecting text, don't navigate
                  if (window.getSelection()?.toString()) return;
                  setSelectedSupplier(s);
                }}>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center font-black text-lg group-hover:bg-blue-600 group-hover:text-white transition-all">
                        <Truck size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 leading-none">{s.name || 'Chưa có tên'}</h4>
                        {canViewBasicInfo && (
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-2 font-bold uppercase">
                             {s.code && <span>{s.code}</span>}
                             {s.code && s.phone && <span className="text-slate-300">•</span>}
                             {s.phone && <span>{s.phone}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-tight ${typeLabel.color}`}>
                       {typeLabel.label}
                    </span>
                  </td>
                  {canViewVehicles && (
                    <td className="px-6 py-5 text-center">
                      <span className="w-8 h-8 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-xs font-black text-slate-600">
                         {s.totalVehicles}
                      </span>
                    </td>
                  )}
                  {canViewFinancialInfo && (
                    <>
                      <td className="px-6 py-5 text-right">
                        <p className="text-sm font-black text-slate-900">{formatVND(s.totalImportValue)}</p>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <p className={`text-sm font-black ${s.debt > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                          {formatVND(s.debt)}
                        </p>
                        {s.debt > 0 && <span className="text-[9px] font-bold text-rose-400 uppercase tracking-tighter">Hạn trả: 25/05</span>}
                      </td>
                    </>
                  )}
                  {canViewBasicInfo && (
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-slate-400" />
                        <p className="text-sm font-bold text-slate-700">{assignedStaffName || 'Chưa phân công'}</p>
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-5 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {canUpdateSupplier && (
                        <Link
                          href={`/suppliers/${s.id}/edit`}
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-all"
                          title="Sửa nhà cung cấp"
                        >
                          <Edit size={18} />
                        </Link>
                      )}
                      {canDeleteSupplier && (
                        <button
                          onClick={(e) => handleDeleteClick(s.id, s.name, e)}
                          className="p-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-all"
                          title="Xóa nhà cung cấp"
                        >
                          <Trash2 size={18} />
                        </button>
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

      {/* Delete Confirmation Modal */}
      {deleteConfirmModal.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[300] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="px-10 py-6 border-b border-slate-100 flex justify-between items-center bg-red-50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
                  <AlertCircle className="text-red-600" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">Xác nhận xóa nhà cung cấp</h2>
                  <p className="text-sm text-slate-500 mt-1">Hành động này không thể hoàn tác</p>
                </div>
              </div>
              <button 
                onClick={() => setDeleteConfirmModal({ show: false, supplierId: null, supplierName: null })}
                disabled={deleting}
                className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 hover:text-slate-900 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-10 space-y-6">
              <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6">
                <p className="text-sm font-bold text-red-900 mb-3">
                  Bạn có chắc chắn muốn xóa nhà cung cấp này?
                </p>
                <div className="bg-white rounded-xl p-4 border border-red-200">
                  <p className="text-base font-black text-slate-900">
                    {deleteConfirmModal.supplierName}
                  </p>
                </div>
                <p className="text-xs text-red-700 mt-4 leading-relaxed">
                  ⚠️ Tất cả thông tin của nhà cung cấp sẽ bị xóa vĩnh viễn khỏi hệ thống. 
                  Hành động này không thể hoàn tác.
                </p>
                <p className="text-xs text-red-600 mt-2 font-bold">
                  Lưu ý: Không thể xóa nhà cung cấp nếu đang có xe hoặc giao dịch thanh toán liên quan.
                </p>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="px-10 py-6 bg-slate-50 border-t border-slate-100 flex justify-end items-center gap-4">
              <button
                onClick={() => setDeleteConfirmModal({ show: false, supplierId: null, supplierName: null })}
                disabled={deleting}
                className="px-8 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Hủy
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting || !canDeleteSupplier}
                className="flex items-center gap-2 px-8 py-3 bg-red-600 text-white rounded-2xl text-sm font-black hover:bg-red-700 shadow-xl shadow-red-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Đang xóa...
                  </>
                ) : (
                  <>
                    <Trash2 size={18} />
                    Xác nhận xóa
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
