'use client'

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  FileText, Plus, Search, Filter,
  User, Phone, Calendar, ShieldCheck,
  CheckCircle2, XCircle,
  ArrowRightLeft, Printer, MoreHorizontal,
  Car, CreditCard, ChevronRight, DollarSign,
  GanttChartSquare, Info, ArrowLeft, Clock,
  Receipt, Landmark, ChevronDown, UserCircle,
  CheckCircle, Trash2, AlertCircle, X
} from 'lucide-react';
import { ContractStatus, DepositContract, SalesContract, TransactionCategory, TransactionType, Vehicle, Transaction, TransactionStatus, StaffRole } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useReload } from '@/contexts/ReloadContext';
import { hasAnyPermission, hasPermission, PermissionCategories } from '@/utils/permissions';
import { getUserAndSuperiors, getAllSubordinates } from '@/utils/userHierarchy';
import { AccessDenied } from './AccessDenied';
import { ContractTemplate } from './ContractTemplate';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const supabase = null as any;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const updateVehicleStatusOnContractDeletedByVehicleId = async (_vehicleId: string) => {};

export const Contracts: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { reloadKey } = useReload();
  const [activeTab, setActiveTab] = useState<'deposit' | 'sales'>('sales');
  const [search, setSearch] = useState('');
  const [contracts, setContracts] = useState<SalesContract[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [allContractTransactions, setAllContractTransactions] = useState<Transaction[]>([]); // Chỉ chứa APPROVED/LOCKED để tính toán
  const [allTransactionsForDeleteCheck, setAllTransactionsForDeleteCheck] = useState<Transaction[]>([]); // Tất cả transactions để kiểm tra xóa
  const [staffMap, setStaffMap] = useState<Map<string, { id: string; name: string; username?: string }>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvingContract, setApprovingContract] = useState<SalesContract | null>(null);
  const [selectedVehicleIdForApproval, setSelectedVehicleIdForApproval] = useState<string | null>(null);
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);
  const [approvedContract, setApprovedContract] = useState<SalesContract | null>(null);
  const [approvedVehicle, setApprovedVehicle] = useState<Vehicle | null>(null);
  const [showContractTemplate, setShowContractTemplate] = useState(false);
  const [deletingContract, setDeletingContract] = useState<SalesContract | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [contractPromotions, setContractPromotions] = useState<Array<{ code: string; name: string; discount_type: string; discount_value: number }>>([]);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [tempVehicleInfo, setTempVehicleInfo] = useState<any | null>(null); // Store temporary vehicle info from contract

  // Read search param from URL on mount
  useEffect(() => {
    const searchQuery = searchParams.get('search');
    if (searchQuery) {
      setSearch(searchQuery);
    }
  }, [searchParams]);

  // Fetch contracts from database
  useEffect(() => {
    fetchContracts();
    fetchVehicles();
  }, [reloadKey]); // Re-fetch when reloadKey changes

  const fetchContracts = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user) {
        setError('Vui lòng đăng nhập để xem hợp đồng');
        setLoading(false);
        return;
      }

      const response = await fetch(
        `/api/contracts/overview?userId=${encodeURIComponent(user.id)}&role=${encodeURIComponent(user.role || '')}`,
        { cache: 'no-store' }
      );
      const result = await response.json();

      if (!response.ok) {
        console.error('❌ Error fetching contracts:', result?.error || 'Unknown error');
        setError('Có lỗi xảy ra khi tải dữ liệu hợp đồng');
        return;
      }

      setContracts(result.contracts || []);
      setAllContractTransactions(result.approvedTransactions || []);
      setAllTransactionsForDeleteCheck(result.allTransactions || []);
      setStaffMap(new Map(Object.entries(result.staffMap || {})));
    } catch (err: any) {
      console.error('❌ Error fetching contracts:', err);
      setError('Có lỗi xảy ra khi tải dữ liệu hợp đồng');
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicles = async () => {
    try {
      const response = await fetch('/api/contracts/vehicles', { cache: 'no-store' });
      const result = await response.json();

      if (!response.ok) {
        console.error('Error fetching vehicles:', result?.error || 'Unknown error');
        return;
      }

      if (result.vehicles) {
        const transformedVehicles: Vehicle[] = result.vehicles.map((v: any) => ({
          id: v.id,
          code: v.code || undefined,
          vin: v.vin,
          make: v.make || 'VinFast',
          model: v.model || '',
          year: v.year,
          type: v.type as any,
          price: Number(v.price) || 0,
          cost: Number(v.cost) || 0,
          status: v.status as any,
          transactionStatus: v.transaction_status || 'Sẵn sàng giao dịch',
          color: v.color || '',
          mileage: v.mileage || undefined,
          batteryHealth: v.battery_health || undefined,
          images: v.images || [],
          createdAt: v.created_at || new Date().toISOString(),
          supplierId: v.supplier_id || undefined
        }));

        setVehicles(transformedVehicles);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('vehicles')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Error fetching vehicles:', fetchError);
        return;
      }

      if (data) {
        const transformedVehicles: Vehicle[] = data.map((v: any) => ({
          id: v.id,
          code: v.code || undefined,
          vin: v.vin,
          make: v.make || 'VinFast',
          model: v.model || '',
          year: v.year,
          type: v.type as any,
          price: Number(v.price) || 0,
          cost: Number(v.cost) || 0,
          status: v.status as any,
          transactionStatus: v.transaction_status || 'Sẵn sàng giao dịch',
          color: v.color || '',
          mileage: v.mileage || undefined,
          batteryHealth: v.battery_health || undefined,
          images: v.images || [],
          createdAt: v.created_at || new Date().toISOString(),
          supplierId: v.supplier_id || undefined
        }));

        setVehicles(transformedVehicles);
      }
    } catch (err: any) {
      console.error('Error fetching vehicles:', err);
    }
  };

  const fetchTransactions = async () => {
    try {
      await fetchContracts();
    } catch (err: any) {
      console.error('Error fetching transactions:', err);
    }
  };

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    // Parse date string (YYYY-MM-DD) và tạo date ở local timezone để tránh lệch ngày
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const calculateProcessingDays = (signedDate: string, isCompleted: boolean, completedDate?: string): number => {
    if (!signedDate) return 0;
    const signed = new Date(signedDate);
    const endDate = isCompleted && completedDate ? new Date(completedDate) : new Date();
    
    // Reset time to midnight for accurate day calculation
    signed.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);
    const diffTime = endDate.getTime() - signed.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 ? diffDays : 0;
  };

  const getStatusBadge = (status: ContractStatus) => {
    switch(status) {
      case ContractStatus.DRAFT:
        return { label: 'Nháp', class: 'bg-slate-100 text-slate-500', icon: <FileText size={14} /> };
      case ContractStatus.PENDING_APPROVAL:
        return { label: 'Chờ duyệt', class: 'bg-orange-100 text-orange-600', icon: <Clock size={14} /> };
      case ContractStatus.SIGNED:
        return { label: 'Đã ký', class: 'bg-blue-100 text-blue-600', icon: <CheckCircle2 size={14} /> };
      case ContractStatus.ACTIVE:
        return { label: 'Đang hiệu lực', class: 'bg-emerald-100 text-emerald-700', icon: <ShieldCheck size={14} /> };
      case ContractStatus.PAYING:
        return { label: 'Đang thanh toán', class: 'bg-amber-100 text-amber-700', icon: <CreditCard size={14} /> };
      case ContractStatus.COMPLETED:
        return { label: 'Hoàn tất', class: 'bg-[#00d26a]/10 text-[#00d26a]', icon: <CheckCircle2 size={14} /> };
      default:
        return { label: status, class: 'bg-slate-100 text-slate-500', icon: <FileText size={14} /> };
    }
  };

  // Kiểm tra quyền duyệt hợp đồng (phân quyền contractsApprove)
  const canApproveContract = () => hasPermission(user?.permissions, 'contractsApprove');

  // Mở bước ghép xe & duyệt hợp đồng
  const openApproveContractModal = async (contract: SalesContract, e: React.MouseEvent) => {
    e.stopPropagation(); // Ngăn chặn sự kiện click lan ra card
    setApproveError(null);
    setApprovingContract(contract);
    setSelectedVehicleIdForApproval(contract.vehicleId || null);
    
    // Load promotions và tempVehicleInfo từ database
    try {
      const response = await fetch(`/api/contracts/${contract.id}/meta`, { cache: 'no-store' });
      const result = await response.json();

      if (response.ok) {
        setTempVehicleInfo(result.tempVehicleInfo || null);
        setContractPromotions(result.promotions || []);
        return;
      }

      console.error('Error loading promotions:', result?.error || 'Unknown error');
      const { data: contractData } = await supabase
        .from('contracts')
        .select('promotions_json, temp_vehicle_info')
        .eq('id', contract.id)
        .single();
      
      // Load temporary vehicle info if available
      if (contractData?.temp_vehicle_info) {
        setTempVehicleInfo(contractData.temp_vehicle_info);
      } else {
        setTempVehicleInfo(null);
      }
      
      if (contractData?.promotions_json) {
        try {
          const promotionsData = typeof contractData.promotions_json === 'string' 
            ? JSON.parse(contractData.promotions_json) 
            : contractData.promotions_json;
          
          if (Array.isArray(promotionsData) && promotionsData.length > 0) {
            // Load full promotion details from promotions table
            const promotionCodes = promotionsData.map((p: any) => p.code || p);
            const { data: fullPromotionsData, error: promotionsError } = await supabase
              .from('promotions')
              .select('*')
              .in('code', promotionCodes);
            
            if (!promotionsError && fullPromotionsData) {
              setContractPromotions(fullPromotionsData.map((p: any) => ({
                code: p.code,
                name: p.name,
                discount_type: p.discount_type,
                discount_value: Number(p.discount_value) || 0
              })));
            } else {
              setContractPromotions([]);
            }
          } else {
            setContractPromotions([]);
          }
        } catch (err) {
          console.error('Error parsing promotions:', err);
          setContractPromotions([]);
        }
      } else {
        setContractPromotions([]);
      }
    } catch (error) {
      console.error('Error loading promotions:', error);
      setContractPromotions([]);
    }
  };

  // Xác nhận ghép xe và duyệt hợp đồng
  const handleConfirmApproveContract = async () => {
    if (!approvingContract) return;

    if (!user?.id) {
      setApproveError('Không tìm thấy thông tin người dùng');
      return;
    }

    if (!confirm('Bạn có chắc chắn muốn ghép xe và duyệt hợp đồng này?')) {
      return;
    }

    // Nếu hợp đồng chưa có vehicleId thì bắt buộc chọn xe
    const vehicleIdToUse = selectedVehicleIdForApproval || approvingContract.vehicleId || null;
    if (!vehicleIdToUse) {
      setApproveError('Vui lòng chọn xe từ kho để ghép vào hợp đồng trước khi duyệt.');
      return;
    }

    try {
      setIsSubmittingApproval(true);
      setApproveError(null);

      // 1. Nếu hợp đồng đã có xe trước đó và giờ đổi sang xe khác, giải phóng xe cũ về "Sẵn sàng giao dịch"
      if (approvingContract.vehicleId && approvingContract.vehicleId !== vehicleIdToUse) {
        try {
          await fetch('/api/vehicles/reset-transaction-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vehicleId: approvingContract.vehicleId })
          });
        } catch (vehicleResetError) {
          console.error('Error resetting previous vehicle status on approve:', vehicleResetError);
          // Không throw error để không làm fail duyệt hợp đồng
        }
      }

      // 2. Cập nhật contracts.vehicle_id và giá xe nếu thay đổi
      const selectedVehicle = vehicleIdToUse ? vehicles.find(v => v.id === vehicleIdToUse) : null;
      const updateData: any = {
        updated_by: user.id,
        updated_at: new Date().toISOString()
      };

      if (vehicleIdToUse !== approvingContract.vehicleId) {
        updateData.vehicle_id = vehicleIdToUse;
      }

      // Nếu có xe được chọn, cập nhật giá xe và tổng giá trị
      if (selectedVehicle) {
        const newCarPrice = selectedVehicle.price;
        const newTotalAmount = newCarPrice + approvingContract.registrationFee + approvingContract.insuranceFee - approvingContract.discount;
        updateData.car_price = newCarPrice;
        updateData.total_amount = newTotalAmount;
      }

      // Chỉ update nếu có thay đổi
      if (Object.keys(updateData).length > 2) { // Ngoài updated_by và updated_at
        const response = await fetch(`/api/contracts/${approvingContract.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contract: updateData })
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.error || 'Lỗi khi ghép xe vào hợp đồng');
        }
      }

      // 3. Gọi API duyệt hợp đồng (giữ nguyên logic backend)
      const response = await fetch('/api/contracts/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contractId: approvingContract.id,
          userId: user.id
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Có lỗi xảy ra khi duyệt hợp đồng');
      }

      // Sử dụng dữ liệu từ API response
      if (data.contract && data.vehicle) {
        // Transform contract data
        const contractTransformed: SalesContract = {
          id: data.contract.id,
          contractCode: data.contract.contract_code || '',
          vehicleId: data.contract.vehicle_id || '',
          depositContractId: data.contract.deposit_contract_id || undefined,
          customerName: data.contract.customer_name || '',
          customerPhone: data.contract.customer_phone || '',
          customerIDCard: data.contract.customer_id_card || '',
          customerAddress: data.contract.customer_address || '',
          carPrice: Number(data.contract.car_price) || 0,
          vatAmount: Number(data.contract.vat_amount) || 0,
          registrationFee: Number(data.contract.registration_fee) || 0,
          insuranceFee: Number(data.contract.insurance_fee) || 0,
          discount: Number(data.contract.discount) || 0,
          totalAmount: Number(data.contract.total_amount) || 0,
          paidAmount: Number(data.contract.paid_amount) || 0,
          paymentType: data.contract.payment_type as 'INSTALLMENT' | 'CASH',
          bankName: data.contract.bank_name || undefined,
          loanAmount: data.contract.loan_amount ? Number(data.contract.loan_amount) : undefined,
          signedDate: data.contract.signed_date || '',
          status: data.contract.status as ContractStatus,
          responsibleStaffId: data.contract.responsible_staff_id || undefined,
          responsibleStaffName: staffMap.get(data.contract.updated_by || '')?.name || undefined,
          schedules: []
        };

        // Transform vehicle data từ API response
        const vehicleTransformed: Vehicle = {
          id: data.vehicle.id,
          code: data.vehicle.code,
          vin: data.vehicle.vin,
          make: data.vehicle.make || 'VinFast',
          model: data.vehicle.model || '',
          year: data.vehicle.year,
          type: data.vehicle.type as any,
          price: Number(data.vehicle.price) || 0,
          cost: Number(data.vehicle.cost) || 0,
          status: data.vehicle.status as any,
          transactionStatus: data.vehicle.transaction_status || 'Sẵn sàng giao dịch',
          color: data.vehicle.color || '',
          mileage: data.vehicle.mileage || undefined,
          batteryHealth: data.vehicle.battery_health || undefined,
          images: data.vehicle.images || [],
          createdAt: data.vehicle.created_at || new Date().toISOString(),
          supplierId: data.vehicle.supplier_id || undefined
        };

        // Lưu trữ thông tin để hiển thị mẫu hợp đồng
        setApprovedContract(contractTransformed);
        setApprovedVehicle(vehicleTransformed);
        setShowContractTemplate(true);
      }

      setApprovingContract(null);
      setSelectedVehicleIdForApproval(null);
      setTempVehicleInfo(null);
      // Refresh danh sách hợp đồng
      fetchContracts();
      // Refresh danh sách xe để cập nhật trạng thái
      fetchVehicles();
    } catch (error: any) {
      console.error('Error approving contract:', error);
      setApproveError(error.message || 'Có lỗi xảy ra khi ghép xe / duyệt hợp đồng');
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  const handleCreateReceipt = (contract: SalesContract, amount: number, milestone: string) => {
    // Kiểm tra nếu hợp đồng đang chờ duyệt thì không cho phép tạo phiếu thu
    if (contract.status === ContractStatus.PENDING_APPROVAL) {
      alert('Không thể tạo phiếu thu. Hợp đồng đang chờ duyệt và cần được duyệt trước khi tạo phiếu thu.');
      return;
    }
    
    const prefillData = {
      referenceId: contract.id,
      referenceType: 'CONTRACT',
      amount: amount,
      category: TransactionCategory.CAR_SALE,
      description: `Thu tiền: ${milestone} - Hợp đồng ${contract.contractCode}`,
      customerName: contract.customerName
    };
    const prefillParam = encodeURIComponent(JSON.stringify(prefillData));
    router.push(`/finance/new?type=${TransactionType.INCOME}&prefill=${prefillParam}`);
  };

  // Filter contracts based on search
  const filteredContracts = contracts.filter(contract => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      contract.contractCode.toLowerCase().includes(searchLower) ||
      contract.customerName.toLowerCase().includes(searchLower) ||
      contract.customerPhone.includes(search)
    );
  });

  // Debug logging for filtered contracts
  useEffect(() => {
    console.log(`🔍 Filtered contracts count: ${filteredContracts.length}`);
    console.log('🔍 Filtered contract IDs:', filteredContracts.map(c => c.id));
    console.log('🔍 Filtered contract codes:', filteredContracts.map(c => c.contractCode));
  }, [filteredContracts]);

  // Check if user has any contract permissions
  const hasContractPermissions = hasAnyPermission(user?.permissions, PermissionCategories.contracts);
  const canCreateContract = hasAnyPermission(user?.permissions, ['contractsCreate']);
  const canDeleteContract = hasAnyPermission(user?.permissions, ['contractsDelete']);

  // Kiểm tra xem hợp đồng có thể xóa được không (chưa có giao dịch thu chi được duyệt)
  const canDeleteContractCheck = (contract: SalesContract): boolean => {
    if (!canDeleteContract) {
      return false;
    }
    
    // Lấy tất cả giao dịch liên quan đến hợp đồng này (bao gồm cả DRAFT, PENDING)
    const contractTransactions = allTransactionsForDeleteCheck.filter(
      t => t.referenceId === contract.id && 
           (t.type === TransactionType.INCOME || t.type === TransactionType.EXPENSE)
    );
    
    // Kiểm tra xem có giao dịch nào đã được duyệt (APPROVED hoặc LOCKED) không
    const hasApprovedTransactions = contractTransactions.some(
      t => t.status === TransactionStatus.APPROVED || t.status === TransactionStatus.LOCKED
    );
    
    // Chỉ cho phép xóa nếu chưa có giao dịch thu chi được duyệt
    return !hasApprovedTransactions;
  };

  // Xử lý xóa hợp đồng
  const handleDeleteContract = async (contract: SalesContract) => {
    if (!canDeleteContract) {
      setDeleteError('Bạn không có quyền xóa hợp đồng. Vui lòng liên hệ quản trị viên để được cấp quyền.');
      return;
    }

    if (!canDeleteContractCheck(contract)) {
      setDeleteError('Không thể xóa hợp đồng đã có phiếu thu/chi được duyệt. Vui lòng hủy các phiếu thu/chi trước.');
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const response = await fetch(`/api/contracts/${contract.id}`, { method: 'DELETE' });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || 'Có lỗi xảy ra khi xóa hợp đồng');
      }

      setContracts(prevContracts => prevContracts.filter(c => c.id !== contract.id));
      setAllTransactionsForDeleteCheck(prev => prev.filter(t => t.referenceId !== contract.id));
      setAllContractTransactions(prev => prev.filter(t => t.referenceId !== contract.id));
      setDeletingContract(null);
      setDeleteError(null);

      await fetchContracts();
      await fetchVehicles();
      return;

      // Lấy danh sách payment schedules của hợp đồng
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('payment_schedules')
        .select('*')
        .eq('contract_id', contract.id);

      if (schedulesError) {
        console.error('Error fetching payment schedules:', schedulesError);
      }

      // Xóa payment schedules trước (do foreign key constraints)
      if (schedulesData && schedulesData.length > 0) {
        const { error: deleteSchedulesError } = await supabase
          .from('payment_schedules')
          .delete()
          .eq('contract_id', contract.id);

        if (deleteSchedulesError) {
          console.error('Error deleting payment schedules:', deleteSchedulesError);
          // Tiếp tục xóa hợp đồng ngay cả khi xóa schedules thất bại
        }
      }

      // Lưu vehicle_id trước khi xóa hợp đồng
      const vehicleIdToUpdate = contract.vehicleId;

      // Xóa hợp đồng
      console.log(`🗑️ Đang xóa hợp đồng ${contract.contractCode} (ID: ${contract.id}, Status: ${contract.status})...`);
      const { data: deleteData, error: deleteError } = await supabase
        .from('contracts')
        .delete()
        .eq('id', contract.id)
        .select(); // Select để kiểm tra xem có xóa được không

      if (deleteError) {
        console.error('❌ Lỗi khi xóa hợp đồng:', deleteError);
        console.error('❌ Error details:', JSON.stringify(deleteError, null, 2));
        
        // Kiểm tra xem có phải lỗi RLS policy không
        if (deleteError.message?.includes('policy') || deleteError.message?.includes('permission') || deleteError.code === '42501') {
          throw new Error(`Không có quyền xóa hợp đồng này. RLS policy có thể đang chặn việc xóa hợp đồng ở trạng thái ${contract.status}. Vui lòng liên hệ quản trị viên để cập nhật RLS policy.`);
        }
        
        throw new Error(`Lỗi khi xóa hợp đồng: ${deleteError.message}`);
      }

      // Kiểm tra xem hợp đồng có thực sự bị xóa không
      if (!deleteData || deleteData.length === 0) {
        console.warn(`⚠️ Không tìm thấy hợp đồng ${contract.contractCode} để xóa (có thể đã bị xóa trước đó hoặc RLS policy đang chặn)`);
        // Kiểm tra lại xem hợp đồng có còn tồn tại không
        const { data: verifyData, error: verifyError } = await supabase
          .from('contracts')
          .select('id, contract_code, status')
          .eq('id', contract.id)
          .single();
        
        if (verifyError && verifyError.code === 'PGRST116') {
          // PGRST116 = không tìm thấy row - hợp đồng đã bị xóa
          console.log(`✅ Xác nhận: Hợp đồng ${contract.contractCode} đã bị xóa khỏi database`);
        } else if (verifyData) {
          console.error(`❌ Hợp đồng ${contract.contractCode} vẫn còn tồn tại trong database! Status: ${verifyData.status}`);
          throw new Error(`Không thể xóa hợp đồng. RLS policy có thể đang chặn việc xóa hợp đồng ở trạng thái ${verifyData.status}. Vui lòng chạy migration: sql/migration_fix_contracts_delete_policy.sql`);
        }
      } else {
        console.log(`✅ Đã xóa hợp đồng ${contract.contractCode} thành công (${deleteData.length} row(s) deleted)`);
      }

      // Đợi một chút để đảm bảo database đã commit transaction
      await new Promise(resolve => setTimeout(resolve, 100));

      // Cập nhật trạng thái xe về "Sẵn sàng giao dịch" sau khi xóa hợp đồng
      if (vehicleIdToUpdate) {
        try {
          await updateVehicleStatusOnContractDeletedByVehicleId(vehicleIdToUpdate);
          console.log(`✅ Đã cập nhật xe ${vehicleIdToUpdate} về "Sẵn sàng giao dịch" sau khi xóa hợp đồng`);
        } catch (vehicleStatusError) {
          console.error('Error updating vehicle status after contract deletion:', vehicleStatusError);
          // Không throw error vì hợp đồng đã được xóa thành công
        }
      }

      // Xóa hợp đồng khỏi state ngay lập tức để UI cập nhật nhanh
      console.log(`🔄 Đang cập nhật UI: xóa hợp đồng ${contract.contractCode} khỏi state...`);
      setContracts(prevContracts => {
        const filtered = prevContracts.filter(c => c.id !== contract.id);
        console.log(`📊 Số hợp đồng trước khi xóa: ${prevContracts.length}, sau khi xóa: ${filtered.length}`);
        return filtered;
      });
      
      // Xóa transactions liên quan khỏi state để đồng bộ
      setAllTransactionsForDeleteCheck(prev => 
        prev.filter(t => t.referenceId !== contract.id)
      );
      setAllContractTransactions(prev => 
        prev.filter(t => t.referenceId !== contract.id)
      );
      
      // Đóng modal
      setDeletingContract(null);
      setDeleteError(null);

      // Refresh danh sách từ database để đảm bảo đồng bộ
      // Đợi thêm một chút để đảm bảo database đã commit hoàn toàn
      await new Promise(resolve => setTimeout(resolve, 200));
      
      console.log('🔄 Đang refresh danh sách hợp đồng từ database...');
      try {
        // Verify hợp đồng đã bị xóa bằng cách query trực tiếp
        const { data: verifyData, error: verifyError } = await supabase
          .from('contracts')
          .select('id, contract_code')
          .eq('id', contract.id);
        
        if (verifyError) {
          console.error('❌ Error verifying contract deletion:', verifyError);
        } else if (verifyData && verifyData.length > 0) {
          console.warn(`⚠️ Hợp đồng ${contract.contractCode} vẫn còn trong database sau khi xóa!`);
        } else {
          console.log(`✅ Đã xác nhận hợp đồng ${contract.contractCode} đã bị xóa khỏi database`);
        }

        await fetchContracts();
        console.log('✅ Đã refresh danh sách hợp đồng thành công');
        await fetchVehicles();
        console.log('✅ Đã refresh danh sách xe thành công');
      } catch (refreshError) {
        console.error('❌ Error refreshing contracts after deletion:', refreshError);
        // Không throw error vì hợp đồng đã được xóa thành công
        // UI đã được cập nhật bằng cách xóa khỏi state ở trên
      }
    } catch (err: any) {
      console.error('Error deleting contract:', err);
      setDeleteError(err.message || 'Có lỗi xảy ra khi xóa hợp đồng');
      // Không đóng modal nếu có lỗi để người dùng có thể thử lại
    } finally {
      setIsDeleting(false);
    }
  };

  // Tính toán thông tin dựa trên xe đã chọn cho modal duyệt hợp đồng
  const selectedVehicleForApproval = useMemo(() => {
    if (!approvingContract || !selectedVehicleIdForApproval) return null;
    return vehicles.find(v => v.id === selectedVehicleIdForApproval) || null;
  }, [approvingContract, selectedVehicleIdForApproval, vehicles]);

  // Tính giá xe sau khi áp dụng chương trình khuyến mãi
  const priceAfterPromotion = useMemo(() => {
    if (!approvingContract) return 0;
    
    // Lấy giá xe: ưu tiên xe đã chọn, nếu không thì dùng giá từ hợp đồng
    const basePrice = selectedVehicleForApproval 
      ? selectedVehicleForApproval.price 
      : approvingContract.carPrice;
    
    // Nếu không có promotions, trả về giá gốc
    if (contractPromotions.length === 0) {
      return basePrice;
    }
    
    // Áp dụng từng chương trình khuyến mãi
    let finalPrice = basePrice;
    contractPromotions.forEach(promo => {
      if (promo.discount_type === 'PERCENTAGE') {
        // Phần trăm
        finalPrice = finalPrice * (1 - promo.discount_value / 100);
      } else if (promo.discount_type === 'FIXED_AMOUNT') {
        // Số tiền cố định
        finalPrice = Math.max(0, finalPrice - promo.discount_value);
      }
      // Nếu GIFT (discount_type === 'GIFT'), chỉ là tặng quà, không giảm giá
    });
    
    return finalPrice;
  }, [approvingContract, selectedVehicleForApproval, contractPromotions]);

  // Tính tổng giá trị: giá xe sau khuyến mãi + phí đăng ký + phí bảo hiểm
  const calculatedTotalAmount = useMemo(() => {
    if (!approvingContract) return 0;
    return priceAfterPromotion + approvingContract.registrationFee + approvingContract.insuranceFee;
  }, [approvingContract, priceAfterPromotion]);

  // If user doesn't have any contract permissions, show access denied message
  if (!hasContractPermissions) {
    return (
      <AccessDenied 
        message="Bạn không có quyền xem hợp đồng. Vui lòng liên hệ quản trị viên để được cấp quyền."
        redirectTo="/dashboard"
        icon="shield"
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white/80 backdrop-blur-md p-6 rounded-[32px] border border-white shadow-xl shadow-slate-200/40">
        <div className="relative flex-1 w-full max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder={`Tìm theo mã hợp đồng, họ tên khách hàng Cần Thơ GF...`}
            className="w-full pl-12 pr-6 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#00d26a]/10 transition-all text-sm font-bold"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        {canCreateContract && (
          <div className="flex gap-4 w-full md:w-auto">
            <Link
              href="/contracts/new"
              className="flex items-center gap-3 px-10 py-3.5 bg-[#00d26a] text-white rounded-2xl hover:bg-emerald-600 font-black text-sm shadow-2xl shadow-[#00d26a]/30 transition-all"
            >
              <Plus size={22} /> TẠO HỢP ĐỒNG MỚI
            </Link>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-slate-500 font-bold">Đang tải...</div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <p className="text-red-900 font-bold">{error}</p>
        </div>
      ) : filteredContracts.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-md rounded-[40px] border border-white p-20 text-center shadow-xl">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <FileText size={40} className="text-slate-300" />
          </div>
          <h3 className="text-xl font-black text-slate-900 mb-2">Chưa có hợp đồng nào</h3>
          <p className="text-slate-500 font-bold">Tạo hợp đồng mới để bắt đầu quản lý giao dịch</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {filteredContracts.map(contract => {
            const vehicle = vehicles.find(v => v.id === contract.vehicleId);
            const progress = contract.totalAmount > 0 ? (contract.paidAmount / contract.totalAmount) * 100 : 0;
            const isCompleted = progress >= 100;
            
            // Tìm ngày transaction cuối cùng của hợp đồng để làm ngày hoàn thành
            // Sử dụng allContractTransactions (từ fetchContracts) thay vì transactions state
            const contractTransactions = allContractTransactions.filter(
              t => t.referenceId === contract.id && t.type === 'INCOME'
            );
            const lastTransaction = contractTransactions.length > 0 
              ? contractTransactions.sort((a, b) => {
                  const dateA = new Date(b.approvedAt || b.date).getTime();
                  const dateB = new Date(a.approvedAt || a.date).getTime();
                  return dateA - dateB;
                })[0]
              : null;
            // Nếu đã hoàn thành, dùng ngày transaction cuối cùng hoặc ngày hiện tại
            const completedDate = isCompleted 
              ? (lastTransaction ? (lastTransaction.approvedAt || lastTransaction.date) : new Date().toISOString().split('T')[0])
              : undefined;
            
            const processingDays = calculateProcessingDays(contract.signedDate, isCompleted, completedDate);
          const displayStatus = (() => {
            if (isCompleted) {
              return { label: 'Hoàn thành', class: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle2 size={14} /> };
            }
            if (contract.status === ContractStatus.DRAFT) {
              return { label: 'Nháp', class: 'bg-slate-100 text-slate-600', icon: <FileText size={14} /> };
            }
            if (contract.status === ContractStatus.PENDING_APPROVAL) {
              return { label: 'Chờ duyệt', class: 'bg-orange-100 text-orange-600', icon: <Clock size={14} /> };
            }
            // Theo yêu cầu: khi "đã ký" thì hiển thị "đang thanh toán"
            if (contract.status === ContractStatus.SIGNED || contract.status === ContractStatus.PAYING) {
              return { label: 'Đang thanh toán', class: 'bg-amber-100 text-amber-700', icon: <Clock size={14} /> };
            }
            // Fallback theo mapping cũ
            return getStatusBadge(contract.status);
          })();

          return (
            <div
              key={contract.id}
              onClick={(e) => {
                // If user is selecting text, don't navigate
                if (window.getSelection()?.toString()) return;
                router.push(`/contracts/${contract.id}`);
              }}
              className="bg-white/90 backdrop-blur-md rounded-[40px] border border-white p-8 hover:border-[#00d26a] transition-all cursor-pointer group shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-[#00d26a]/10 hover:scale-[1.02] relative overflow-hidden"
            >
              {/* Con dấu đỏ mờ khi hoàn tất */}
              {isCompleted && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <div className="relative w-40 h-40 flex items-center justify-center">
                    {/* Vòng tròn ngoài con dấu - mờ */}
                    <div className="absolute w-36 h-36 border-[3px] border-red-500/25 rounded-full blur-[2px]"></div>
                    <div className="absolute w-36 h-36 border-[2px] border-red-600/30 rounded-full blur-[1px]"></div>
                    
                    {/* Vòng tròn trong con dấu */}
                    <div className="absolute w-28 h-28 border-[2px] border-red-500/20 rounded-full blur-[1px]"></div>
                    
                    {/* Text "Đã hoàn tất" - hiệu ứng đóng dấu */}
                    <div className="relative flex flex-col items-center justify-center transform rotate-[-12deg]">
                      <div className="text-red-600/35 font-black text-[13px] uppercase tracking-[0.15em] leading-tight blur-[0.8px]">
                        ĐÃ
                      </div>
                      <div className="text-red-600/35 font-black text-[13px] uppercase tracking-[0.15em] leading-tight blur-[0.8px] mt-0.5">
                        HOÀN TẤT
                      </div>
                      {/* Lớp text phụ để tạo hiệu ứng đóng dấu */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className="text-red-500/25 font-black text-[12px] uppercase tracking-[0.15em] leading-tight blur-[1.2px]">
                          ĐÃ
                        </div>
                        <div className="text-red-500/25 font-black text-[12px] uppercase tracking-[0.15em] leading-tight blur-[1.2px] mt-0.5">
                          HOÀN TẤT
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-start mb-6 relative z-20">
                <div className="flex flex-col gap-1.5">
                  <span className="px-4 py-1.5 bg-slate-50 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest border border-slate-100">{contract.contractCode}</span>
                  {contract.signedDate && contract.status !== ContractStatus.DRAFT && (
                    <p className="text-[9px] text-slate-500 font-bold px-1">
                      <Calendar size={10} className="inline mr-1" />
                      {formatDate(contract.signedDate)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {contract.status === ContractStatus.PENDING_APPROVAL && canApproveContract() && (
                    <button
                      onClick={(e) => openApproveContractModal(contract, e)}
                      className="flex items-center gap-2 px-4 py-2 bg-[#00d26a] text-white rounded-xl hover:bg-emerald-600 transition-all shadow-sm text-[10px] font-black uppercase tracking-widest"
                      title="Duyệt hợp đồng"
                    >
                      <CheckCircle size={14} />
                      Duyệt
                    </button>
                  )}
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-2xl shadow-sm ${displayStatus.class}`}>
                    {displayStatus.icon}
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      {displayStatus.label}
                    </span>
                  </div>
                </div>
              </div>
              
              <h3 className="text-2xl font-black text-slate-900 mb-2 group-hover:text-[#00d26a] transition-colors tracking-tight relative z-20">{contract.customerName}</h3>
              <div className="flex items-center justify-between mb-4 relative z-20">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{vehicle?.make} {vehicle?.model}</p>
                {(processingDays >= 0 && contract.signedDate) && (
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border ${
                    isCompleted 
                      ? 'bg-emerald-50 border-emerald-200' 
                      : 'bg-slate-50 border-slate-200'
                  }`}>
                    <Clock size={12} className={isCompleted ? 'text-emerald-600' : 'text-slate-400'} />
                    <span className={`text-[10px] font-black uppercase tracking-wider ${
                      isCompleted ? 'text-emerald-700' : 'text-slate-600'
                    }`}>
                      {processingDays} ngày
                    </span>
                  </div>
                )}
              </div>
              <div className="mb-8 relative z-20 space-y-1.5">
                {contract.responsibleStaffName && (
                  <div className="flex items-center gap-2">
                    <UserCircle size={14} className="text-slate-400" />
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                      Nhân viên phụ trách: {contract.responsibleStaffName}
                    </span>
                  </div>
                )}
                {contract.approverName && contract.status !== ContractStatus.DRAFT && contract.status !== ContractStatus.PENDING_APPROVAL && (
                  <div className="flex items-center gap-2">
                    <UserCircle size={14} className="text-emerald-500" />
                    <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">
                      Người duyệt: {contract.approverName}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-5 relative z-20">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tiến độ dòng tiền</span>
                  <span className="text-xs font-black text-[#00d26a] bg-[#00d26a]/10 px-3 py-1 rounded-lg">{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden p-0.5 border border-slate-200/50">
                  <div className="bg-[#00d26a] h-full rounded-full transition-all duration-1000 shadow-sm" style={{ width: `${progress}%` }}></div>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                   <div className="text-left">
                      <p className="text-slate-400 font-black uppercase text-[9px] tracking-widest mb-0.5">Tổng giá trị</p>
                      <p className="font-black text-slate-900 text-lg tracking-tighter">{formatVND(contract.totalAmount)}</p>
                   </div>
                   <button className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl group-hover:bg-[#00d26a] group-hover:text-white transition-all flex items-center justify-center shadow-sm">
                      <ChevronRight size={24} />
                   </button>
                </div>
              </div>
            </div>
          );
        })}
        </div>
      )}
      {/* Modal ghép xe & duyệt hợp đồng */}
      {approvingContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  Ghép số xe từ kho & duyệt hợp đồng
                </h3>
                <p className="text-xs text-slate-500 font-bold mt-1">
                  Hợp đồng: <span className="font-black">{approvingContract.contractCode}</span> · Khách hàng: <span className="font-black">{approvingContract.customerName}</span>
                </p>
              </div>
              <button
                onClick={() => {
                  if (isSubmittingApproval) return;
                  setApprovingContract(null);
                  setSelectedVehicleIdForApproval(null);
                  setTempVehicleInfo(null);
                  setApproveError(null);
                }}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <XCircle size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Cột thông tin hợp đồng */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 lg:col-span-1">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
                  1. Thông tin hợp đồng
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold">Mã HĐ</span>
                    <span className="font-black text-slate-900">{approvingContract.contractCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold">Khách hàng</span>
                    <span className="font-black text-slate-900 text-right">{approvingContract.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold">Số điện thoại</span>
                    <span className="font-bold text-slate-800">{approvingContract.customerPhone}</span>
                  </div>
                  
                  {/* Hiển thị thông tin xe ghép tạm (nếu có) - luôn hiển thị */}
                  {(() => {
                    // Tìm xe ghép tạm từ vehicleId hoặc tempVehicleInfo
                    let tempVehicle: any = null;
                    let isFromTempInfo = false;
                    
                    if (approvingContract.vehicleId) {
                      // Ưu tiên tìm trong vehicles list
                      tempVehicle = vehicles.find(v => v.id === approvingContract.vehicleId);
                    }
                    
                    // Nếu không tìm thấy từ vehicleId, thử dùng tempVehicleInfo
                    if (!tempVehicle && tempVehicleInfo) {
                      tempVehicle = tempVehicleInfo;
                      isFromTempInfo = true;
                    }
                    
                    // Nếu vẫn không có, không hiển thị
                    if (!tempVehicle) {
                      return null;
                    }
                    
                    const hasSelectedNewVehicle = selectedVehicleIdForApproval && 
                      (approvingContract.vehicleId ? selectedVehicleIdForApproval !== approvingContract.vehicleId : true);
                    
                    // Lấy giá xe - ưu tiên từ tempVehicle, nếu không có thì dùng carPrice từ contract
                    const vehiclePrice = tempVehicle.price || approvingContract.carPrice || 0;
                    
                    return (
                      <div className="pt-2 border-t border-slate-200">
                        <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2">
                          {hasSelectedNewVehicle ? 'Xe ghép tạm (sẽ thay thế)' : 'Xe ghép tạm'}
                        </p>
                        <div className="space-y-1.5">
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-semibold text-xs">Model</span>
                            <span className="font-black text-slate-900 text-xs text-right">
                              {tempVehicle.make || 'VinFast'} {tempVehicle.model || ''}
                            </span>
                          </div>
                          {(tempVehicle.version || (tempVehicle as any).version) && (
                            <div className="flex justify-between">
                              <span className="text-slate-500 font-semibold text-xs">Phiên bản</span>
                              <span className="font-bold text-slate-800 text-xs">
                                {tempVehicle.version || (tempVehicle as any).version}
                              </span>
                            </div>
                          )}
                          {tempVehicle.year && (
                            <div className="flex justify-between">
                              <span className="text-slate-500 font-semibold text-xs">Năm sản xuất</span>
                              <span className="font-bold text-slate-800 text-xs">{tempVehicle.year}</span>
                            </div>
                          )}
                          {tempVehicle.color && (
                            <div className="flex justify-between">
                              <span className="text-slate-500 font-semibold text-xs">Màu ngoại thất</span>
                              <span className="font-bold text-slate-800 text-xs">{tempVehicle.color}</span>
                            </div>
                          )}
                          {(tempVehicle.interiorColor || (tempVehicle as any).interior_color) && (
                            <div className="flex justify-between">
                              <span className="text-slate-500 font-semibold text-xs">Màu nội thất</span>
                              <span className="font-bold text-slate-800 text-xs">
                                {tempVehicle.interiorColor || (tempVehicle as any).interior_color}
                              </span>
                            </div>
                          )}
                          {tempVehicle.code && (
                            <div className="flex justify-between">
                              <span className="text-slate-500 font-semibold text-xs">Mã xe</span>
                              <span className="font-bold text-slate-800 text-xs">{tempVehicle.code}</span>
                            </div>
                          )}
                          {tempVehicle.vin && (
                            <div className="flex justify-between">
                              <span className="text-slate-500 font-semibold text-xs">VIN</span>
                              <span className="font-bold text-slate-800 text-xs">{tempVehicle.vin}</span>
                            </div>
                          )}
                          <div className="flex justify-between pt-1 border-t border-slate-200">
                            <span className="text-slate-500 font-semibold text-xs">Giá xe</span>
                            <span className="font-black text-slate-900 text-xs">{formatVND(vehiclePrice)}</span>
                          </div>
                          {contractPromotions.length > 0 && (() => {
                            let promoPrice = vehiclePrice;
                            contractPromotions.forEach(promo => {
                              if (promo.discount_type === 'PERCENTAGE') {
                                promoPrice = promoPrice * (1 - promo.discount_value / 100);
                              } else if (promo.discount_type === 'FIXED_AMOUNT') {
                                promoPrice = Math.max(0, promoPrice - promo.discount_value);
                              }
                            });
                            if (promoPrice !== vehiclePrice) {
                              return (
                                <div className="flex justify-between pt-1 border-t border-amber-200">
                                  <span className="text-slate-500 font-semibold text-xs text-amber-700">Giá sau CTKM</span>
                                  <span className="font-black text-amber-700 text-xs">{formatVND(promoPrice)}</span>
                                </div>
                              );
                            }
                            return null;
                          })()}
                          {!hasSelectedNewVehicle && (
                            <div className="pt-1.5 border-t border-amber-200">
                              <p className="text-[9px] text-amber-600 font-bold italic">
                                ⚠️ Xe này sẽ được thay thế khi chọn xe mới từ kho
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                  
                  {/* Hiển thị thông tin xe đã chọn mới */}
                  {selectedVehicleIdForApproval && (() => {
                    const selectedVehicle = vehicles.find(v => v.id === selectedVehicleIdForApproval);
                    return selectedVehicle ? (
                      <>
                        <div className="pt-2 border-t border-slate-200">
                          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Xe đã chọn từ kho</p>
                          <div className="space-y-1.5">
                            <div className="flex justify-between">
                              <span className="text-slate-500 font-semibold text-xs">Model</span>
                              <span className="font-black text-slate-900 text-xs text-right">
                                {selectedVehicle.make} {selectedVehicle.model}
                              </span>
                            </div>
                            {(selectedVehicle as any).version && (
                              <div className="flex justify-between">
                                <span className="text-slate-500 font-semibold text-xs">Phiên bản</span>
                                <span className="font-bold text-slate-800 text-xs">{(selectedVehicle as any).version}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-slate-500 font-semibold text-xs">Năm sản xuất</span>
                              <span className="font-bold text-slate-800 text-xs">{selectedVehicle.year}</span>
                            </div>
                            {selectedVehicle.color && (
                              <div className="flex justify-between">
                                <span className="text-slate-500 font-semibold text-xs">Màu ngoại thất</span>
                                <span className="font-bold text-slate-800 text-xs">{selectedVehicle.color}</span>
                              </div>
                            )}
                            {(selectedVehicle as any).interiorColor && (
                              <div className="flex justify-between">
                                <span className="text-slate-500 font-semibold text-xs">Màu nội thất</span>
                                <span className="font-bold text-slate-800 text-xs">{(selectedVehicle as any).interiorColor}</span>
                              </div>
                            )}
                            {selectedVehicle.code && (
                              <div className="flex justify-between">
                                <span className="text-slate-500 font-semibold text-xs">Mã xe</span>
                                <span className="font-bold text-slate-800 text-xs">{selectedVehicle.code}</span>
                              </div>
                            )}
                            {selectedVehicle.vin && (
                              <div className="flex justify-between">
                                <span className="text-slate-500 font-semibold text-xs">VIN</span>
                                <span className="font-bold text-slate-800 text-xs">{selectedVehicle.vin}</span>
                              </div>
                            )}
                            <div className="flex justify-between pt-1 border-t border-slate-200">
                              <span className="text-slate-500 font-semibold text-xs">Giá xe</span>
                              <span className="font-black text-slate-900 text-xs">{formatVND(selectedVehicle.price)}</span>
                            </div>
                            {contractPromotions.length > 0 && (() => {
                              let promoPrice = selectedVehicle.price;
                              contractPromotions.forEach(promo => {
                                if (promo.discount_type === 'PERCENTAGE') {
                                  promoPrice = promoPrice * (1 - promo.discount_value / 100);
                                } else if (promo.discount_type === 'FIXED_AMOUNT') {
                                  promoPrice = Math.max(0, promoPrice - promo.discount_value);
                                }
                              });
                              if (promoPrice !== selectedVehicle.price) {
                                return (
                                  <div className="flex justify-between pt-1 border-t border-emerald-200">
                                    <span className="text-slate-500 font-semibold text-xs text-emerald-700">Giá sau CTKM</span>
                                    <span className="font-black text-emerald-700 text-xs">{formatVND(promoPrice)}</span>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                            {approvingContract.vehicleId && approvingContract.vehicleId !== selectedVehicleIdForApproval && (
                              <div className="pt-1.5 border-t border-emerald-200">
                                <p className="text-[9px] text-emerald-600 font-bold">
                                  ✓ Xe ghép tạm sẽ được thay thế bằng xe này
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    ) : null;
                  })()}
                  
                  {/* Hiển thị chương trình khuyến mãi */}
                  {contractPromotions.length > 0 && (
                    <div className="pt-2 border-t border-slate-200">
                      <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-2">Chương trình khuyến mãi đã áp dụng</p>
                      <div className="space-y-1.5">
                        {contractPromotions.map((promo, index) => (
                          <div key={index} className="bg-emerald-50 border border-emerald-200 rounded-lg p-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-xs font-black text-emerald-900">{promo.name}</p>
                                <p className="text-[10px] font-bold text-emerald-700">Mã: {promo.code}</p>
                              </div>
                              <div className="text-right">
                                {promo.discount_type === 'PERCENTAGE' ? (
                                  <p className="text-xs font-black text-emerald-700">-{promo.discount_value}%</p>
                                ) : promo.discount_type === 'FIXED_AMOUNT' ? (
                                  <p className="text-xs font-black text-emerald-700">-{formatVND(promo.discount_value)}</p>
                                ) : (
                                  <p className="text-xs font-black text-emerald-700">Quà tặng</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-slate-200">
                    <span className="text-slate-500 font-semibold">Tổng giá trị</span>
                    <span className={`font-black ${selectedVehicleForApproval ? 'text-emerald-600' : 'text-slate-900'}`}>
                      {formatVND(calculatedTotalAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold">Phương thức</span>
                    <span className="font-bold text-slate-800">
                      {approvingContract.paymentType === 'INSTALLMENT' ? 'Trả góp' : 'Trả thẳng'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cột chọn xe từ kho */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 lg:col-span-2">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
                  2. Chọn xe từ kho để ghép vào hợp đồng
                </h4>
                <p className="text-xs text-slate-500 mb-3">
                  Chỉ hiển thị các xe đang ở trạng thái <span className="font-bold">Sẵn sàng giao dịch / AVAILABLE</span> và chưa ghép vào hợp đồng khác.
                </p>

                <div className="max-h-[260px] overflow-y-auto space-y-2">
                  {(() => {
                    // Filter xe: AVAILABLE + transaction_status cho phép ghép
                    const availableVehicles = vehicles.filter(v => {
                      const isAvailable = v.status === 'AVAILABLE' || v.status === 'AVAILABLE'.toString();
                      const txStatus = (v.transactionStatus || '').trim();
                      
                      // Cho phép ghép nếu:
                      // - transaction_status là NULL/rỗng
                      // - transaction_status = 'Sẵn sàng giao dịch'
                      // - transaction_status = 'Đã ghép' (xe đã từng được ghép nhưng hợp đồng có thể đã bị xóa/hủy)
                      // KHÔNG cho phép: 'Đã cọc', 'Đã xuất hóa đơn', 'Đã giao xe', 'Đã bàn giao'
                      const allowedStatuses = ['', 'Sẵn sàng giao dịch', 'Đã ghép'];
                      const isReadyForTransaction = !txStatus || allowedStatuses.includes(txStatus);
                      
                      // Cho phép chọn xe đã được ghép vào hợp đồng này
                      const isCurrentContractVehicle = v.id === approvingContract.vehicleId;
                      
                      return isAvailable && (isReadyForTransaction || isCurrentContractVehicle);
                    });

                    if (availableVehicles.length === 0) {
                      return (
                        <div className="text-xs text-slate-500 bg-slate-100 border border-slate-200 rounded-xl p-3">
                          Hiện không có xe nào ở trạng thái <span className="font-bold">AVAILABLE</span> và <span className="font-bold">Sẵn sàng giao dịch</span> để ghép.
                          Vui lòng kiểm tra lại kho xe hoặc cập nhật trạng thái xe trước khi duyệt hợp đồng.
                        </div>
                      );
                    }

                    return availableVehicles.map(vehicle => (
                        <label
                          key={vehicle.id}
                          className={`flex items-start justify-between gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                            selectedVehicleIdForApproval === vehicle.id
                              ? 'border-emerald-500 bg-emerald-50/60'
                              : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/40'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="radio"
                              className="mt-1 accent-emerald-600"
                              checked={selectedVehicleIdForApproval === vehicle.id}
                              onChange={() => setSelectedVehicleIdForApproval(vehicle.id)}
                            />
                            <div>
                              <p className="text-sm font-black text-slate-900">
                                {vehicle.make} {vehicle.model}
                              </p>
                              {(vehicle as any).version && (
                                <p className="text-[11px] text-slate-500 font-bold">
                                  Phiên bản: <span className="font-black">{(vehicle as any).version}</span>
                                </p>
                              )}
                              <p className="text-[11px] text-slate-500 font-bold">
                                Năm: <span className="font-black">{vehicle.year}</span>
                                {vehicle.color && ` · ${vehicle.color}`}
                                {(vehicle as any).interiorColor && ` · Nội thất: ${(vehicle as any).interiorColor}`}
                              </p>
                              {vehicle.code && (
                                <p className="text-[11px] text-slate-500 font-bold mt-0.5">
                                  Mã xe: <span className="font-black">{vehicle.code}</span>
                                </p>
                              )}
                              {vehicle.vin && (
                                <p className="text-[11px] text-slate-500 font-bold mt-0.5">
                                  Số khung: <span className="font-black">{vehicle.vin}</span>
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-black text-slate-900">{formatVND(vehicle.price)}</p>
                          </div>
                        </label>
                      ));
                  })()}
                </div>
              </div>
            </div>

            {approveError && (
              <div className="px-6 pb-2">
                <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-2 text-xs text-red-700 font-bold">
                  {approveError}
                </div>
              </div>
            )}

            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => {
                  if (isSubmittingApproval) return;
                  setApprovingContract(null);
                  setSelectedVehicleIdForApproval(null);
                  setTempVehicleInfo(null);
                  setApproveError(null);
                }}
                className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all"
                disabled={isSubmittingApproval}
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmApproveContract}
                className="px-6 py-2.5 rounded-xl bg-[#00d26a] text-white text-sm font-black hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200/60 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                disabled={isSubmittingApproval}
              >
                {isSubmittingApproval && <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Ghép xe & duyệt hợp đồng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal xác nhận xóa hợp đồng */}
      {deletingContract && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl max-w-md w-full p-8 animate-in zoom-in-95 duration-300">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center">
                <AlertCircle className="text-rose-600" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">Xác nhận xóa hợp đồng</h3>
                <p className="text-sm text-slate-500 mt-1">Hành động này không thể hoàn tác</p>
              </div>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 mb-6 border border-slate-200">
              <p className="text-sm font-bold text-slate-700 mb-2">Hợp đồng sẽ bị xóa:</p>
              <p className="text-base font-black text-slate-900">{deletingContract.contractCode}</p>
              <p className="text-sm text-slate-600 mt-1">{deletingContract.customerName}</p>
            </div>
            {deleteError && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
                <p className="text-sm font-bold text-red-900">{deleteError}</p>
              </div>
            )}
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setDeletingContract(null);
                  setDeleteError(null);
                }}
                disabled={isDeleting}
                className="flex-1 px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl text-sm font-bold hover:bg-slate-100 transition-all disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                onClick={() => handleDeleteContract(deletingContract)}
                disabled={isDeleting || !canDeleteContractCheck(deletingContract)}
                className="flex-1 px-6 py-3 bg-rose-600 text-white rounded-2xl text-sm font-black hover:bg-rose-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Đang xóa...
                  </>
                ) : (
                  <>
                    <Trash2 size={18} /> Xóa hợp đồng
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal hiển thị mẫu hợp đồng */}
      {showContractTemplate && approvedContract && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 no-print">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  Hợp đồng đã duyệt - {approvedContract.contractCode}
                </h3>
                <p className="text-xs text-slate-500 font-bold mt-1">
                  Khách hàng: <span className="font-black">{approvedContract.customerName}</span>
                </p>
              </div>
              <button
                onClick={() => {
                  setShowContractTemplate(false);
                  setApprovedContract(null);
                  setApprovedVehicle(null);
                  // Refresh danh sách hợp đồng
                  fetchContracts();
                  fetchVehicles();
                  fetchTransactions();
                }}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <XCircle size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <ContractTemplate
                contract={approvedContract}
                vehicle={approvedVehicle}
              />
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 no-print">
              <button
                onClick={() => {
                  setShowContractTemplate(false);
                  setApprovedContract(null);
                  setApprovedVehicle(null);
                  // Refresh danh sách hợp đồng
                  fetchContracts();
                  fetchVehicles();
                  fetchTransactions();
                }}
                className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all"
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  // Xuất PDF
                  const { exportContractToPDF } = require('@/utils/pdfExport');
                  exportContractToPDF(`hop-dong-${approvedContract.contractCode}.pdf`);
                }}
                className="px-6 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200/60 flex items-center gap-2"
              >
                <FileText size={16} />
                Xuất PDF
              </button>
              <button
                onClick={() => {
                  // In hợp đồng
                  window.print();
                }}
                className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200/60 flex items-center gap-2"
              >
                <Printer size={16} />
                In hợp đồng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
