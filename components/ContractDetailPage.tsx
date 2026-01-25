'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Calendar, Car, User, Phone, MapPin,
  DollarSign, CreditCard, CheckCircle2, Clock, AlertCircle,
  Receipt, Building2, Hash, Mail, Landmark, ChevronRight, Gift, Tag, Edit, Trash2, UserCircle, Eye, X, Printer, FileText, CheckCheck, XCircle, GanttChartSquare
} from 'lucide-react';
import { SalesContract, ContractStatus, PaymentSchedule, Vehicle, Transaction, TransactionStatus, TransactionCategory, VehicleStatus } from '@/types';
import { getVehicleTransactionStatusConfig } from '@/utils/vehicleTransactionStatus';
import { useAuth } from '@/contexts/AuthContext';
import { hasAnyPermission, hasPermission } from '@/utils/permissions';
import { getUserAndSuperiors, getAllSubordinates } from '@/utils/userHierarchy';
import { ContractTemplate } from './ContractTemplate';
import { exportContractToPDF } from '@/utils/pdfExport';
import { amountToWordsCapitalized } from '@/utils/format';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const supabase = null as any;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const updateVehicleStatusOnContractDeletedByVehicleId = async (_vehicleId: string) => {};

/** Trích thông báo lỗi rõ ràng từ Supabase/PostgREST hoặc Error để hiển thị cho người dùng */
function formatContractLoadError(err: unknown, fallback: string): string {
  if (!err) return fallback;
  const e = err as { message?: string; code?: string; details?: string; error_description?: string };
  const msg = e.message || e.error_description || (typeof err === 'string' ? err : null);
  const s = msg ? String(msg).trim() : '';
  if (e.code === 'PGRST116' || (s && /no rows|0 rows|not found/i.test(s)))
    return 'Không tìm thấy hợp đồng. Mã hợp đồng có thể không đúng hoặc đã bị xóa.';
  if (e.code === '42501' || (s && /permission|policy|unauthorized|access denied/i.test(s)))
    return 'Bạn không có quyền truy cập hợp đồng này. Vui lòng liên hệ quản trị viên.';
  if (s) return s;
  if (e.details && String(e.details).trim()) return `${fallback} Chi tiết: ${e.details}`;
  return fallback;
}

interface ContractDetailPageProps {
  contractId: string;
}

export const ContractDetailPage: React.FC<ContractDetailPageProps> = ({ contractId }) => {
  const router = useRouter();
  const { user } = useAuth();
  const [contract, setContract] = useState<SalesContract | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [vehicleRawData, setVehicleRawData] = useState<any | null>(null); // Store raw vehicle data to access additional fields
  const [tempVehicleInfo, setTempVehicleInfo] = useState<any | null>(null); // Store temporary vehicle info from contract
  const [paymentSchedules, setPaymentSchedules] = useState<PaymentSchedule[]>([]);
  const [relatedTransactions, setRelatedTransactions] = useState<Transaction[]>([]);
  const [promotions, setPromotions] = useState<Array<{ code: string; name: string; discount_type: string; discount_value: number }>>([]);
  const [responsibleStaff, setResponsibleStaff] = useState<{ id: string; name: string; username?: string } | null>(null);
  const [fullCustomerData, setFullCustomerData] = useState<any | null>(null); // Store full customer data from customers table
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [showContractPreview, setShowContractPreview] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleIdForApproval, setSelectedVehicleIdForApproval] = useState<string | null>(null);
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);
  
  // Hàm tính giá xe sau khi áp dụng promotions
  const calculatePriceAfterPromotions = (basePrice: number, promotionsList: Array<{ discount_type: string; discount_value: number }>): number => {
    let finalPrice = basePrice;
    promotionsList.forEach(promo => {
      if (promo.discount_type === 'PERCENTAGE') {
        finalPrice = finalPrice * (1 - promo.discount_value / 100);
      } else if (promo.discount_type === 'FIXED_AMOUNT') {
        finalPrice = Math.max(0, finalPrice - promo.discount_value);
      }
    });
    return finalPrice;
  };

  // Kiểm tra quyền xem thông tin đầy đủ (admin, director, operations_director)
  // Chỉ làm mờ khi hợp đồng chưa được duyệt (DRAFT hoặc PENDING_APPROVAL)
  const canViewSensitiveInfo = () => {
    // Nếu hợp đồng đã được duyệt (SIGNED, PAYING, etc.) thì hiển thị cho tất cả
    if (contract && contract.status !== ContractStatus.DRAFT && contract.status !== ContractStatus.PENDING_APPROVAL) {
      return true;
    }
    
    // Nếu hợp đồng chưa được duyệt, chỉ admin/director/operations_director mới xem được
    if (!user?.role) return false;
    const allowedRoles = ['ADMIN', 'DIRECTOR', 'OPERATIONS_DIRECTOR'];
    return allowedRoles.includes(user.role);
  };
  
  // Hàm làm mờ VIN và số máy
  // Chỉ làm mờ khi hợp đồng chưa được duyệt và người dùng không có quyền
  const maskSensitiveInfo = (value: string): string => {
    if (!value || value.length === 0) return '--';
    
    // Nếu hợp đồng đã được duyệt, hiển thị đầy đủ cho tất cả
    if (contract && contract.status !== ContractStatus.DRAFT && contract.status !== ContractStatus.PENDING_APPROVAL) {
      return value;
    }
    
    // Nếu hợp đồng chưa được duyệt và người dùng có quyền, hiển thị đầy đủ
    if (canViewSensitiveInfo()) return value;
    
    // Nếu hợp đồng chưa được duyệt và người dùng không có quyền, làm mờ
    // Giữ lại 3 ký tự đầu và 3 ký tự cuối, làm mờ phần giữa
    if (value.length <= 6) {
      return '*'.repeat(value.length);
    }
    const start = value.substring(0, 3);
    const end = value.substring(value.length - 3);
    const middle = '*'.repeat(Math.max(3, value.length - 6));
    return `${start}${middle}${end}`;
  };
  // Format date từ YYYY-MM-DD sang dd/mm/yyyy
  const formatDateToDDMMYYYY = (dateString: string): string => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    if (!year || !month || !day) return '';
    return `${day}/${month}/${year}`;
  };

  // Parse date từ dd/mm/yyyy sang YYYY-MM-DD
  const parseDateFromDDMMYYYY = (value: string): string => {
    if (!value) return '';
    // Remove all non-digit characters except /
    const cleaned = value.replace(/[^\d\/]/g, '');
    const parts = cleaned.split('/');
    if (parts.length !== 3) return '';
    
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    
    // Validate
    if (day.length !== 2 || month.length !== 2 || year.length !== 4) return '';
    const dayNum = parseInt(day);
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);
    
    if (dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12 || yearNum < 2000 || yearNum > 2100) {
      return '';
    }
    
    return `${year}-${month}-${day}`;
  };

  const [selectedSignDate, setSelectedSignDate] = useState<string>(() => {
    // Mặc định là ngày hiện tại, format dd/mm/yyyy
    const today = new Date();
    const day = today.getDate().toString().padStart(2, '0');
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const year = today.getFullYear();
    return `${day}/${month}/${year}`;
  });

  // Handle date input change với auto-format
  const handleSignDateChange = (value: string) => {
    // Remove all non-digit characters except /
    let cleaned = value.replace(/[^\d\/]/g, '');
    
    // Auto-format as user types: dd/mm/yyyy
    let digits = cleaned.replace(/\//g, '');
    let formatted = '';
    
    if (digits.length > 0) {
      // Day (2 digits)
      formatted = digits.slice(0, 2);
      if (digits.length > 2) {
        formatted += '/' + digits.slice(2, 4);
      }
      if (digits.length > 4) {
        formatted += '/' + digits.slice(4, 8);
      }
    }
    
    // Limit to 10 characters (dd/mm/yyyy)
    if (formatted.length > 10) {
      formatted = formatted.slice(0, 10);
    }
    
    setSelectedSignDate(formatted);
  };

  // Action-level permissions
  const canUpdateContract = hasAnyPermission(user?.permissions, ['contractsUpdate']);
  const canDeleteContract = hasAnyPermission(user?.permissions, ['contractsDelete']);
  const canApproveContract = hasPermission(user?.permissions, 'contractsApprove');
  const canCreateFinance = hasAnyPermission(user?.permissions, ['financeCreate']);

  // Kiểm tra xem hợp đồng có thể xóa được không (chưa có giao dịch thu chi được duyệt)
  const canDeleteContractCheck = (): boolean => {
    if (!canDeleteContract) {
      return false;
    }
    
    // Kiểm tra xem có giao dịch nào đã được duyệt (APPROVED hoặc LOCKED) không
    const hasApprovedTransactions = relatedTransactions.some(
      t => (t.status === TransactionStatus.APPROVED || t.status === TransactionStatus.LOCKED) &&
           (t.type === 'INCOME' || t.type === 'EXPENSE')
    );
    
    // Chỉ cho phép xóa nếu chưa có giao dịch thu chi được duyệt
    return !hasApprovedTransactions;
  };

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    // Parse date string (YYYY-MM-DD) và tạo date ở local timezone để tránh lệch ngày
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    // Nếu dateString chỉ có ngày (YYYY-MM-DD), thêm thời gian hiện tại
    let date: Date;
    if (dateString.includes('T')) {
      date = new Date(dateString);
    } else {
      // Nếu chỉ có ngày, sử dụng ngày đó với thời gian hiện tại
      date = new Date(dateString + 'T' + new Date().toTimeString().split(' ')[0]);
    }
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: ContractStatus, paidAmount: number, totalAmount: number) => {
    switch (status) {
      case ContractStatus.DRAFT:
        return { label: 'Nháp', class: 'bg-slate-100 text-slate-500', icon: <FileText size={14} /> };
      case ContractStatus.PENDING_APPROVAL:
        return { label: 'Chờ duyệt', class: 'bg-orange-100 text-orange-600', icon: <Clock size={14} /> };
      case ContractStatus.SIGNED:
        // Nếu đã thanh toán 100% thì hiển thị "ĐÃ HOÀN THÀNH"
        if (totalAmount > 0 && paidAmount >= totalAmount) {
          return { label: 'ĐÃ HOÀN THÀNH', class: 'bg-emerald-100 text-emerald-600', icon: <CheckCircle2 size={14} /> };
        }
        return { label: 'Đã ký', class: 'bg-blue-100 text-blue-600', icon: <CheckCircle2 size={14} /> };
      case ContractStatus.PAYING:
        // Nếu đang thanh toán nhưng đã thanh toán 100% thì hiển thị "ĐÃ HOÀN THÀNH"
        if (totalAmount > 0 && paidAmount >= totalAmount) {
          return { label: 'ĐÃ HOÀN THÀNH', class: 'bg-emerald-100 text-emerald-600', icon: <CheckCircle2 size={14} /> };
        }
        return { label: 'Đang thanh toán', class: 'bg-amber-100 text-amber-600', icon: <Clock size={14} /> };
      case ContractStatus.COMPLETED:
        return { label: 'Hoàn tất', class: 'bg-emerald-100 text-emerald-600', icon: <CheckCircle2 size={14} /> };
      case ContractStatus.CANCELLED:
        return { label: 'Đã hủy', class: 'bg-rose-100 text-rose-600', icon: <AlertCircle size={14} /> };
      default:
        return { label: status, class: 'bg-slate-100 text-slate-500', icon: <FileText size={14} /> };
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/contracts/${contractId}/detail`, { cache: 'no-store' });
        const result = await response.json();

        if (!response.ok) {
          const userMsg = formatContractLoadError(
            result,
            'Không thể tải hợp đồng. Vui lòng kiểm tra kết nối và thử lại.'
          );
          setError(userMsg);
          setIsLoading(false);
          return;
        }

        const contractData = result?.contract;
        if (!contractData) {
          setError('Không tìm thấy nội dung');
          setIsLoading(false);
          return;
        }

        if (!user) {
          setError('Vui lòng đăng nhập để xem hợp đồng');
          setIsLoading(false);
          return;
        }

        const allowedRoles = ['ADMIN', 'DIRECTOR', 'OPERATIONS_DIRECTOR'];
        const canViewAllContracts = user.role && allowedRoles.includes(user.role);

        if (!canViewAllContracts) {
          const superiors = await getUserAndSuperiors(user.id);
          const subordinates = await getAllSubordinates(user.id);
          const allowedUserIds = [...superiors, ...subordinates];
          if (!contractData.created_by || !allowedUserIds.includes(contractData.created_by)) {
            setError('Bạn không có quyền xem hợp đồng này. Chỉ người tạo hợp đồng, cấp trên và quản lý có thể xem hợp đồng của cấp dưới.');
            setIsLoading(false);
            return;
          }
        }

        if (result.responsibleStaff) {
          setResponsibleStaff(result.responsibleStaff);
        }

        const contractTransformed: SalesContract = {
          id: contractData.id,
          contractCode: contractData.contract_code || '',
          vehicleId: contractData.vehicle_id || '',
          depositContractId: contractData.deposit_contract_id || undefined,
          customerName: contractData.customer_name || '',
          customerPhone: contractData.customer_phone || '',
          customerIDCard: contractData.customer_id_card || '',
          customerAddress: contractData.customer_address || '',
          carPrice: Number(contractData.car_price) || 0,
          vatAmount: Number(contractData.vat_amount) || 0,
          registrationFee: Number(contractData.registration_fee) || 0,
          insuranceFee: Number(contractData.insurance_fee) || 0,
          discount: Number(contractData.discount) || 0,
          totalAmount: Number(contractData.total_amount) || 0,
          paidAmount: Number(contractData.paid_amount) || 0,
          paymentType: contractData.payment_type as 'INSTALLMENT' | 'CASH',
          bankName: contractData.bank_name || undefined,
          loanAmount: contractData.loan_amount ? Number(contractData.loan_amount) : undefined,
          signedDate: contractData.signed_date || '',
          status: contractData.status as ContractStatus,
          responsibleStaffId: contractData.responsible_staff_id || undefined,
          responsibleStaffName: result.responsibleStaff?.name || undefined,
          schedules: (result.schedules || []).map((s: any) => ({
            id: s.id,
            contractId: s.contract_id,
            milestoneName: s.milestone_name || '',
            amount: Number(s.amount) || 0,
            dueDate: s.due_date || '',
            status: s.status
          }))
        };

        setContract(contractTransformed);
        setPaymentSchedules((result.schedules || []).map((s: any) => ({
          id: s.id,
          contractId: s.contract_id,
          milestoneName: s.milestone_name || '',
          amount: Number(s.amount) || 0,
          dueDate: s.due_date || '',
          status: s.status
        })));

        if (result.vehicle) {
          const vehicleTransformed: Vehicle = {
            id: result.vehicle.id,
            code: result.vehicle.code || undefined,
            vin: result.vehicle.vin,
            make: result.vehicle.make || 'VinFast',
            model: result.vehicle.model || '',
            year: result.vehicle.year,
            type: result.vehicle.type as any,
            price: Number(result.vehicle.price) || 0,
            cost: Number(result.vehicle.cost) || 0,
            status: result.vehicle.status as VehicleStatus,
            transactionStatus: result.vehicle.transaction_status || 'Sẵn sàng giao dịch',
            color: result.vehicle.color || '',
            mileage: result.vehicle.mileage || undefined,
            batteryHealth: result.vehicle.battery_health || undefined,
            images: result.vehicle.images || [],
            createdAt: result.vehicle.created_at || new Date().toISOString(),
            supplierId: result.vehicle.supplier_id || undefined
          };
          setVehicle(vehicleTransformed);
          setVehicleRawData(result.vehicle);
        }

        setRelatedTransactions((result.transactions || []).map((t: any) => ({
          id: t.id,
          date: t.date,
          amount: Number(t.amount) || 0,
          type: t.type as any,
          category: t.category as TransactionCategory,
          description: t.description || '',
          accountId: t.account_id,
          toAccountId: t.to_account_id || undefined,
          referenceId: t.reference_id || undefined,
          referenceType: t.reference_type as any,
          paymentMethod: t.payment_method as any,
          status: t.status as any,
          creatorId: t.creator_id,
          approverId: t.approver_id || undefined,
          attachments: t.attachments || undefined,
          approvedAt: t.approved_at || undefined
        })));

        setPromotions(result.promotions || []);
        setFullCustomerData(result.customer || null);
        setTempVehicleInfo(result.tempVehicleInfo || null);

        setIsLoading(false);
        return;
      } catch (err: unknown) {
        const userMsg = formatContractLoadError(
          err,
          'Có lỗi xảy ra khi tải dữ liệu hợp đồng. Vui lòng tải lại trang hoặc thử lại sau.'
        );
        // Log error details một cách an toàn
        const errorInfo: Record<string, unknown> = {};
        const e = err as { message?: string; code?: string; details?: string; name?: string; stack?: string };
        if (e.message) errorInfo.message = e.message;
        if (e.code) errorInfo.code = e.code;
        if (e.details) errorInfo.details = e.details;
        if (e.name) errorInfo.name = e.name;
        if (Object.keys(errorInfo).length > 0) {
          console.error('[ContractDetail] Load data error:', errorInfo);
        } else {
          // Nếu không có thông tin, log toàn bộ error object
          try {
            if (err instanceof Error) {
              console.error('[ContractDetail] Load data error:', err.name, err.message, err.stack);
            } else {
              console.error('[ContractDetail] Load data error:', String(err));
            }
          } catch {
            console.error('[ContractDetail] Load data error: Unknown error');
          }
        }
        setError(userMsg);
      } finally {
        setIsLoading(false);
      }
    };

    if (contractId) {
      loadData();
    }
  }, [contractId]);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Check for URL parameters to auto-open modal
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');

    if (action === 'pdf' && contract && vehicle) {
      // Auto-open PDF export modal
      setTimeout(() => {
        setShowContractPreview(true);
        // Auto-export PDF after modal opens
        setTimeout(() => {
          exportContractToPDF(`hop-dong-${contract.contractCode}.pdf`);
        }, 1000);
      }, 500);
    }
  }, [contract, vehicle]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-500">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (error || !contract) {
    const isNotFound = error === 'Không tìm thấy nội dung' || !contract;
    
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="bg-white rounded-[40px] shadow-2xl overflow-hidden p-10">
          <div className="text-center py-12">
            <div className={`mb-4 ${isNotFound ? 'text-slate-400' : 'text-rose-500'}`}>
              {isNotFound ? (
                <FileText size={48} className="mx-auto opacity-50" />
              ) : (
                <FileText size={48} className="mx-auto" />
              )}
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">
              {isNotFound ? 'Không tìm thấy nội dung' : 'Không tìm thấy hợp đồng'}
            </h3>
            <p className="text-slate-500 mb-6">
              {isNotFound 
                ? 'Hợp đồng này không tồn tại hoặc đã bị xóa. Vui lòng kiểm tra lại đường dẫn.' 
                : (error || 'Hợp đồng không tồn tại hoặc đã bị xóa')}
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => router.back()}
                className="px-6 py-3 bg-slate-100 text-slate-700 rounded-2xl text-sm font-bold hover:bg-slate-200 transition-all"
              >
                Quay lại
              </button>
              <button
                onClick={() => router.push('/contracts')}
                className="px-6 py-3 bg-blue-600 text-white rounded-2xl text-sm font-bold hover:bg-blue-700 transition-all"
              >
                Danh sách hợp đồng
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const statusBadge = getStatusBadge(contract.status, contract.paidAmount, contract.totalAmount);
  const progress = contract.totalAmount > 0 ? (contract.paidAmount / contract.totalAmount) * 100 : 0;
  const remainingAmount = contract.totalAmount - contract.paidAmount;

  // Tính toán "TRẠNG THÁI GIAO DỊCH" dựa trên logic business:
  // - Khi hợp đồng đã có xe + VIN và KHÔNG còn ở trạng thái DRAFT → tối thiểu là "Đã ghép"
  // - Khi có thanh toán lần 1 → "Đã cọc"
  // - Khi có thanh toán lần 2 → "Đã xuất hóa đơn"
  // - Khi có thanh toán lần 3 trở lên → "Đã giao xe"
  // Đồng thời vẫn tôn trọng giá trị transaction_status trong DB nếu đã được set cao hơn.
  const getDerivedVehicleTransactionStatus = (): string => {
    if (!vehicle) return 'Sẵn sàng giao dịch';

    let baseStatus = (vehicle.transactionStatus || '').trim();

    const hasVin = !!vehicle.vin;

    // Nếu đã ghép VIN vào hợp đồng và hợp đồng không còn DRAFT
    if (hasVin && contract.status !== ContractStatus.DRAFT) {
      // Nếu DB chưa set hoặc vẫn là "Sẵn sàng giao dịch" thì nâng tối thiểu lên "Đã ghép"
      if (!baseStatus || baseStatus === 'Sẵn sàng giao dịch') {
        baseStatus = 'Đã ghép';
      }
    }

    // Đếm số lần thanh toán đã hoàn thành (INCOME + APPROVED/LOCKED)
    const approvedIncomeCount = relatedTransactions.filter(
      (t) =>
        (t.status === TransactionStatus.APPROVED || t.status === TransactionStatus.LOCKED) &&
        t.type === 'INCOME'
    ).length;

    // Nếu đã có thanh toán thì ưu tiên logic theo số lần thanh toán
    if (approvedIncomeCount >= 3) return 'Đã giao xe';
    if (approvedIncomeCount === 2) return 'Đã xuất hóa đơn';
    if (approvedIncomeCount === 1) return 'Đã cọc';

    // Không có thanh toán nào: dùng baseStatus (đã nâng tối thiểu lên "Đã ghép" nếu cần)
    return baseStatus || 'Sẵn sàng giao dịch';
  };

  // Lấy user hiện tại từ localStorage
  const getCurrentUser = () => {
    try {
      const storedUser = sessionStorage.getItem('user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        return user.id;
      }
    } catch (error) {
      console.error('Error getting current user:', error);
    }
    return null;
  };

  // Handle sign contract: always move to PENDING_APPROVAL (chờ duyệt)
  const handleSignContract = async () => {
    if (!contract) return;

    try {
      const userId = getCurrentUser();
      if (!userId) {
        setError('Không thể xác định người dùng');
        return;
      }

      // In all cases, when user clicks "Ký", move contract to waiting approval
      const newStatus = ContractStatus.PENDING_APPROVAL;

      // Parse ngày từ dd/mm/yyyy sang YYYY-MM-DD
      const signedDate = parseDateFromDDMMYYYY(selectedSignDate) || new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD

      const updateResponse = await fetch(`/api/contracts/${contractId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contract: {
            status: newStatus,
            signed_date: signedDate,
            updated_by: userId
          }
        })
      });
      const updateResult = await updateResponse.json();

      if (!updateResponse.ok) {
        setError(updateResult?.error || 'Có lỗi xảy ra khi ký hợp đồng');
        return;
      }

      setContract(prev => prev ? { 
        ...prev, 
        status: newStatus,
        signedDate: signedDate
      } : null);

      await fetch('/api/customers/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: contract.customerPhone,
          name: contract.customerName,
          status: 'TRADING'
        })
      });

      if (contract.vehicleId) {
        await fetch(`/api/vehicles/${contract.vehicleId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            update: {
              status: VehicleStatus.RESERVED,
              transaction_status: 'Đã ghép',
              updated_by: userId
            }
          })
        });
      }

      return;

      // Update contract status
      const { error: updateError } = await supabase
        .from('contracts')
        .update({
          status: newStatus,
          signed_date: signedDate, // Set signed date to current date at time of signing
          updated_by: userId
        })
        .eq('id', contractId);

      if (updateError) {
        console.error('Error signing contract:', updateError);
        setError('Có lỗi xảy ra khi ký hợp đồng');
        return;
      }

      // Cập nhật state ngay lập tức để hiển thị ngày ký
      setContract(prev => {
        // Cập nhật trạng thái khách hàng thành TRADING khi hợp đồng được ký
        if (prev) {
          const customerPhone = prev.customerPhone;
          const customerName = prev.customerName;
          // Call async function but don't await (fire and forget)
          import('@/services/customerStatusService').then(({ updateCustomerStatusOnContractSigned }) => {
            updateCustomerStatusOnContractSigned(customerPhone, customerName).catch((customerStatusError) => {
              console.error('Error updating customer status:', customerStatusError);
            });
          });
        }
        return prev ? { 
          ...prev, 
          status: newStatus,
          signedDate: signedDate
        } : null;
      });

      // Update vehicle status to RESERVED when contract is signed
      const vehicleId = contract?.vehicleId;
      if (vehicleId) {
        const { error: vehicleError } = await supabase
          .from('vehicles')
          .update({
            status: VehicleStatus.RESERVED,
            updated_by: userId
          })
          .eq('id', vehicleId);

        if (vehicleError) {
          console.error('Error updating vehicle status:', vehicleError);
          // Don't fail the operation, just log the error
        } else {
          // Cập nhật transaction_status của xe thành "Đã ghép" khi hợp đồng được ký
          const { updateVehicleStatusOnContractSigned } = await import('@/services/vehicleStatusService');
          await updateVehicleStatusOnContractSigned(contractId);
          // Reload vehicle data to reflect the update
          const { data: vehicleData, error: vehicleReloadError } = await supabase
            .from('vehicles')
            .select('*')
            .eq('id', vehicleId)
            .single();

          if (!vehicleReloadError && vehicleData) {
            // Store raw data to access additional fields
            setVehicleRawData(vehicleData);
            
            const vehicleTransformed: Vehicle = {
              id: vehicleData.id,
              code: vehicleData.code,
              vin: vehicleData.vin,
              make: vehicleData.make || 'VinFast',
              model: vehicleData.model || '',
              version: vehicleData.version || undefined,
              year: vehicleData.year,
              type: vehicleData.type as any,
              price: Number(vehicleData.price) || 0,
              cost: Number(vehicleData.cost) || 0,
              status: vehicleData.status as any,
              transactionStatus: vehicleData.transaction_status || 'Sẵn sàng giao dịch',
              color: vehicleData.color || '',
              interiorColor: vehicleData.interior_color || undefined,
              mileage: vehicleData.mileage || undefined,
              batteryHealth: vehicleData.battery_health || undefined,
              images: vehicleData.images || [],
              createdAt: vehicleData.created_at || new Date().toISOString(),
              supplierId: vehicleData.supplier_id || undefined
            };
            setVehicle(vehicleTransformed);
          }
        }
      }

      // Reload contract data to reflect the update
      const { data: contractData, error: contractError } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', contractId)
        .single();

      if (!contractError && contractData) {
        const contractTransformed: SalesContract = {
          id: contractData.id,
          contractCode: contractData.contract_code || '',
          vehicleId: contractData.vehicle_id || '',
          depositContractId: contractData.deposit_contract_id || undefined,
          customerName: contractData.customer_name || '',
          customerPhone: contractData.customer_phone || '',
          customerIDCard: contractData.customer_id_card || '',
          customerAddress: contractData.customer_address || '',
          carPrice: Number(contractData.car_price) || 0,
          vatAmount: Number(contractData.vat_amount) || 0,
          registrationFee: Number(contractData.registration_fee) || 0,
          insuranceFee: Number(contractData.insurance_fee) || 0,
          discount: Number(contractData.discount) || 0,
          totalAmount: Number(contractData.total_amount) || 0,
          paidAmount: Number(contractData.paid_amount) || 0,
          paymentType: contractData.payment_type as 'INSTALLMENT' | 'CASH',
          bankName: contractData.bank_name || undefined,
          loanAmount: contractData.loan_amount ? Number(contractData.loan_amount) : undefined,
          signedDate: contractData.signed_date || '',
          status: contractData.status as ContractStatus,
          schedules: []
        };
        setContract(contractTransformed);
      }
    } catch (err: any) {
      console.error('Error signing contract:', err);
      setError(err.message || 'Có lỗi xảy ra khi ký hợp đồng');
    }
  };

  // Fetch vehicles for approval modal
  const fetchVehicles = async () => {
    try {
      const response = await fetch('/api/contracts/vehicles', { cache: 'no-store' });
      const result = await response.json();

      if (!response.ok) {
        console.error('Error fetching vehicles:', result?.error || 'Unknown error');
        return;
      }

      if (result.vehicles) {
        const vehiclesTransformed: Vehicle[] = result.vehicles.map((v: any) => ({
          id: v.id,
          code: v.code,
          vin: v.vin,
          make: v.make || 'VinFast',
          model: v.model || '',
          version: v.version || undefined,
          year: v.year,
          type: v.type as any,
          price: Number(v.price) || 0,
          cost: Number(v.cost) || 0,
          status: v.status as any,
          transactionStatus: v.transaction_status || 'Sẵn sàng giao dịch',
          color: v.color || '',
          interiorColor: v.interior_color || undefined,
          mileage: v.mileage || undefined,
          batteryHealth: v.battery_health || undefined,
          images: v.images || [],
          createdAt: v.created_at || new Date().toISOString(),
          supplierId: v.supplier_id || undefined
        }));
        setVehicles(vehiclesTransformed);
      }
      return;

      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('*')
        .order('created_at', { ascending: false });

      if (vehiclesError) {
        console.error('Error fetching vehicles:', vehiclesError);
        return;
      }

      if (vehiclesData) {
        const vehiclesTransformed: Vehicle[] = vehiclesData.map((v: any) => ({
          id: v.id,
          code: v.code,
          vin: v.vin,
          make: v.make || 'VinFast',
          model: v.model || '',
          version: v.version || undefined,
          year: v.year,
          type: v.type as any,
          price: Number(v.price) || 0,
          cost: Number(v.cost) || 0,
          status: v.status as any,
          transactionStatus: v.transaction_status || 'Sẵn sàng giao dịch',
          color: v.color || '',
          interiorColor: v.interior_color || undefined,
          mileage: v.mileage || undefined,
          batteryHealth: v.battery_health || undefined,
          images: v.images || [],
          createdAt: v.created_at || new Date().toISOString(),
          supplierId: v.supplier_id || undefined
        }));
        setVehicles(vehiclesTransformed);
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    }
  };

  // Handle approve contract: Mở modal để chọn xe từ kho
  const handleApproveContract = async () => {
    if (!contract || contract.status !== ContractStatus.PENDING_APPROVAL) return;
    if (!canUpdateContract) return;

    setApproveError(null);
    setSelectedVehicleIdForApproval(contract.vehicleId || null);
    
    // Load danh sách xe từ kho
    await fetchVehicles();

    if (contract.vehicleId && !vehicle) {
      try {
        const detailResponse = await fetch(`/api/contracts/${contractId}/detail`, { cache: 'no-store' });
        const detailResult = await detailResponse.json();
        if (detailResponse.ok && detailResult?.vehicle) {
          const vehicleData = detailResult.vehicle;
          const vehicleTransformed: Vehicle = {
            id: vehicleData.id,
            code: vehicleData.code,
            vin: vehicleData.vin,
            make: vehicleData.make || 'VinFast',
            model: vehicleData.model || '',
            year: vehicleData.year,
            type: vehicleData.type as any,
            price: Number(vehicleData.price) || 0,
            cost: Number(vehicleData.cost) || 0,
            status: vehicleData.status as any,
            transactionStatus: vehicleData.transaction_status || 'Sẵn sàng giao dịch',
            color: vehicleData.color || '',
            mileage: vehicleData.mileage || undefined,
            batteryHealth: vehicleData.battery_health || undefined,
            images: vehicleData.images || [],
            createdAt: vehicleData.created_at || new Date().toISOString(),
            supplierId: vehicleData.supplier_id || undefined
          };
          setVehicle(vehicleTransformed);
        }
      } catch (error) {
        console.error('Error loading temporary vehicle:', error);
      }
    }

    setShowApproveModal(true);
    return;
  };

  // Xác nhận ghép xe và duyệt hợp đồng
  const handleConfirmApproveContract = async () => {
    if (!contract) return;

    if (!user?.id) {
      setApproveError('Không tìm thấy thông tin người dùng');
      return;
    }

    if (!confirm('Bạn có chắc chắn muốn ghép xe và duyệt hợp đồng này?')) {
      return;
    }

    // Nếu hợp đồng chưa có vehicleId thì bắt buộc chọn xe
    const vehicleIdToUse = selectedVehicleIdForApproval || contract.vehicleId || null;
    if (!vehicleIdToUse) {
      setApproveError('Vui lòng chọn xe từ kho để ghép vào hợp đồng trước khi duyệt.');
      return;
    }

    try {
      setIsSubmittingApproval(true);
      setApproveError(null);

      // 1. Nếu hợp đồng đã có xe trước đó và giờ đổi sang xe khác, giải phóng xe cũ về "Sẵn sàng giao dịch"
      if (contract.vehicleId && contract.vehicleId !== vehicleIdToUse) {
        try {
          await fetch('/api/vehicles/reset-transaction-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vehicleId: contract.vehicleId })
          });
        } catch (vehicleResetError) {
          console.error('Error resetting previous vehicle status on approve:', vehicleResetError);
        }
      }

      // 2. Cập nhật contracts.vehicle_id và giá xe nếu thay đổi
      const selectedVehicle = vehicleIdToUse ? vehicles.find(v => v.id === vehicleIdToUse) : null;
      const updateData: any = {
        updated_by: user.id,
        updated_at: new Date().toISOString()
      };

      if (vehicleIdToUse !== contract.vehicleId) {
        updateData.vehicle_id = vehicleIdToUse;
      }

      // Nếu có xe được chọn, cập nhật giá xe và tổng giá trị
      if (selectedVehicle) {
        const newCarPrice = selectedVehicle.price;
        
        // Tính giá xe sau khi áp dụng promotions
        const priceAfterPromotions = promotions.length > 0
          ? calculatePriceAfterPromotions(newCarPrice, promotions)
          : newCarPrice;
        
        // Tính tổng giá trị: giá xe sau CTKM + phí đăng ký + phí bảo hiểm
        const newTotalAmount = priceAfterPromotions + contract.registrationFee + contract.insuranceFee;
        
        updateData.car_price = newCarPrice;
        updateData.total_amount = newTotalAmount;
      }

      // Chỉ update nếu có thay đổi
      if (Object.keys(updateData).length > 2) { // Ngoài updated_by và updated_at
        const updateResponse = await fetch(`/api/contracts/${contract.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contract: updateData })
        });
        const updateResult = await updateResponse.json();

        if (!updateResponse.ok) {
          throw new Error(updateResult?.error || 'Lỗi khi ghép xe vào hợp đồng');
        }
      }

      // 3. Gọi API duyệt hợp đồng (giữ nguyên logic backend)
      const response = await fetch('/api/contracts/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contractId: contract.id,
          userId: user.id
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Có lỗi xảy ra khi duyệt hợp đồng');
      }

      const detailResponse = await fetch(`/api/contracts/${contractId}/detail`, { cache: 'no-store' });
      const detailResult = await detailResponse.json();

      if (detailResponse.ok && detailResult?.contract) {
        const contractData = detailResult.contract;
        const contractTransformed: SalesContract = {
          id: contractData.id,
          contractCode: contractData.contract_code || '',
          vehicleId: contractData.vehicle_id || '',
          depositContractId: contractData.deposit_contract_id || undefined,
          customerName: contractData.customer_name || '',
          customerPhone: contractData.customer_phone || '',
          customerIDCard: contractData.customer_id_card || '',
          customerAddress: contractData.customer_address || '',
          carPrice: Number(contractData.car_price) || 0,
          vatAmount: Number(contractData.vat_amount) || 0,
          registrationFee: Number(contractData.registration_fee) || 0,
          insuranceFee: Number(contractData.insurance_fee) || 0,
          discount: Number(contractData.discount) || 0,
          totalAmount: Number(contractData.total_amount) || 0,
          paidAmount: Number(contractData.paid_amount) || 0,
          paymentType: contractData.payment_type as 'INSTALLMENT' | 'CASH',
          bankName: contractData.bank_name || undefined,
          loanAmount: contractData.loan_amount ? Number(contractData.loan_amount) : undefined,
          signedDate: contractData.signed_date || '',
          status: contractData.status as ContractStatus,
          responsibleStaffId: contractData.responsible_staff_id || undefined,
          responsibleStaffName: responsibleStaff?.name || undefined,
          schedules: []
        };
        setContract(contractTransformed);

        if (detailResult.vehicle) {
          const vehicleData = detailResult.vehicle;
          const vehicleTransformed: Vehicle = {
            id: vehicleData.id,
            code: vehicleData.code,
            vin: vehicleData.vin,
            make: vehicleData.make || 'VinFast',
            model: vehicleData.model || '',
            year: vehicleData.year,
            type: vehicleData.type as any,
            price: Number(vehicleData.price) || 0,
            cost: Number(vehicleData.cost) || 0,
            status: vehicleData.status as any,
            transactionStatus: vehicleData.transaction_status || 'Sẵn sàng giao dịch',
            color: vehicleData.color || '',
            mileage: vehicleData.mileage || undefined,
            batteryHealth: vehicleData.battery_health || undefined,
            images: vehicleData.images || [],
            createdAt: vehicleData.created_at || new Date().toISOString(),
            supplierId: vehicleData.supplier_id || undefined
          };
          setVehicle(vehicleTransformed);
        }
      }

      setShowApproveModal(false);
      setSelectedVehicleIdForApproval(null);
      return;

      // Refresh contract data
      const { data: contractData, error: contractError } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', contractId)
        .single();

      if (!contractError && contractData) {
        const contractTransformed: SalesContract = {
          id: contractData.id,
          contractCode: contractData.contract_code || '',
          vehicleId: contractData.vehicle_id || '',
          depositContractId: contractData.deposit_contract_id || undefined,
          customerName: contractData.customer_name || '',
          customerPhone: contractData.customer_phone || '',
          customerIDCard: contractData.customer_id_card || '',
          customerAddress: contractData.customer_address || '',
          carPrice: Number(contractData.car_price) || 0,
          vatAmount: Number(contractData.vat_amount) || 0,
          registrationFee: Number(contractData.registration_fee) || 0,
          insuranceFee: Number(contractData.insurance_fee) || 0,
          discount: Number(contractData.discount) || 0,
          totalAmount: Number(contractData.total_amount) || 0,
          paidAmount: Number(contractData.paid_amount) || 0,
          paymentType: contractData.payment_type as 'INSTALLMENT' | 'CASH',
          bankName: contractData.bank_name || undefined,
          loanAmount: contractData.loan_amount ? Number(contractData.loan_amount) : undefined,
          signedDate: contractData.signed_date || '',
          status: contractData.status as ContractStatus,
          responsibleStaffId: contractData.responsible_staff_id || undefined,
          responsibleStaffName: responsibleStaff?.name || undefined,
          schedules: []
        };
        setContract(contractTransformed);
      }

      setShowApproveModal(false);
      setSelectedVehicleIdForApproval(null);
      // Reload vehicle data
      const contractVehicleId = contract?.vehicleId;
      if (contractVehicleId || vehicleIdToUse) {
        const vehicleId = vehicleIdToUse || contractVehicleId;
        const { data: vehicleData, error: vehicleError } = await supabase
          .from('vehicles')
          .select('*')
          .eq('id', vehicleId)
          .single();

        if (!vehicleError && vehicleData) {
          const vehicleTransformed: Vehicle = {
            id: vehicleData.id,
            code: vehicleData.code,
            vin: vehicleData.vin,
            make: vehicleData.make || 'VinFast',
            model: vehicleData.model || '',
            year: vehicleData.year,
            type: vehicleData.type as any,
            price: Number(vehicleData.price) || 0,
            cost: Number(vehicleData.cost) || 0,
            status: vehicleData.status as any,
            transactionStatus: vehicleData.transaction_status || 'Sẵn sàng giao dịch',
            color: vehicleData.color || '',
            mileage: vehicleData.mileage || undefined,
            batteryHealth: vehicleData.battery_health || undefined,
            images: vehicleData.images || [],
            createdAt: vehicleData.created_at || new Date().toISOString(),
            supplierId: vehicleData.supplier_id || undefined
          };
          setVehicle(vehicleTransformed);
          setVehicleRawData(vehicleData);
        }
      }
    } catch (error: any) {
      console.error('Error approving contract:', error);
      setApproveError(error.message || 'Có lỗi xảy ra khi ghép xe / duyệt hợp đồng');
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  // Handle create receipt from payment schedule
  const handleCreateReceiptFromSchedule = (schedule: PaymentSchedule) => {
    // Kiểm tra quyền tạo phiếu thu
    if (!canCreateFinance) {
      setError('Bạn không có quyền tạo phiếu thu. Vui lòng liên hệ quản trị viên để được cấp quyền.');
      return;
    }
    
    // Kiểm tra nếu hợp đồng đang chờ duyệt thì không cho phép tạo phiếu thu
    if (contract.status === ContractStatus.PENDING_APPROVAL) {
      setError('Không thể tạo phiếu thu. Hợp đồng đang chờ duyệt và cần được duyệt trước khi tạo phiếu thu.');
      return;
    }
    
    const prefillData = {
      referenceId: contractId,
      referenceType: 'CONTRACT',
      amount: schedule.amount,
      category: TransactionCategory.CAR_SALE,
      description: `Thu tiền: ${schedule.milestoneName} - Hợp đồng mua bán xe - Khách hàng ${contract.customerName}`,
      customerName: contract.customerName
    };

    const prefillParam = encodeURIComponent(JSON.stringify(prefillData));
    router.push(`/finance/new?type=INCOME&prefill=${prefillParam}`);
  };

  // Handle delete contract
  const handleDeleteContract = async () => {
    if (!contract) return;
    if (!canDeleteContract) {
      setError('Bạn không có quyền xóa hợp đồng. Vui lòng liên hệ quản trị viên để được cấp quyền.');
      setShowDeleteConfirm(false);
      return;
    }

    if (!canDeleteContractCheck()) {
      setError('Không thể xóa hợp đồng đã có phiếu thu/chi được duyệt. Vui lòng hủy các phiếu thu/chi trước.');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/contracts/${contractId}`, { method: 'DELETE' });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || 'Lỗi khi xóa hợp đồng');
      }

      router.push('/contracts');
      return;

      // Delete payment schedules first (due to foreign key constraints)
      if (paymentSchedules.length > 0) {
        const { error: schedulesError } = await supabase
          .from('payment_schedules')
          .delete()
          .eq('contract_id', contractId);

        if (schedulesError) {
          console.error('Error deleting payment schedules:', schedulesError);
          // Continue with contract deletion even if schedules deletion fails
        }
      }

      // Lưu vehicle_id trước khi xóa hợp đồng
      const vehicleIdToUpdate = contract?.vehicleId;

      // Delete the contract
      const { error: deleteError } = await supabase
        .from('contracts')
        .delete()
        .eq('id', contractId);

      if (deleteError) {
        throw new Error(`Lỗi khi xóa hợp đồng: ${deleteError.message}`);
      }

      // Cập nhật trạng thái xe về "Sẵn sàng giao dịch" sau khi xóa hợp đồng
      if (vehicleIdToUpdate) {
        try {
          await updateVehicleStatusOnContractDeletedByVehicleId(vehicleIdToUpdate!);
        } catch (vehicleStatusError) {
          console.error('Error updating vehicle status after contract deletion:', vehicleStatusError);
          // Không throw error vì hợp đồng đã được xóa thành công
        }
      }

      // Redirect to contracts list
      router.push('/contracts');
    } catch (err: any) {
      console.error('Error deleting contract:', err);
      setError(err.message || 'Có lỗi xảy ra khi xóa hợp đồng');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
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
              <p className="text-base font-black text-slate-900">{contract?.contractCode}</p>
              <p className="text-sm text-slate-600 mt-1">{contract?.customerName}</p>
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
                <p className="text-sm font-bold text-red-900">{error}</p>
              </div>
            )}
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setError(null);
                }}
                disabled={isDeleting}
                className="flex-1 px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl text-sm font-bold hover:bg-slate-100 transition-all disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                onClick={handleDeleteContract}
                disabled={isDeleting || !canDeleteContract || !canDeleteContractCheck()}
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

      {/* Modal ghép xe & duyệt hợp đồng */}
      {showApproveModal && contract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  Ghép số xe từ kho & duyệt hợp đồng
                </h3>
                <p className="text-xs text-slate-500 font-bold mt-1">
                  Hợp đồng: <span className="font-black">{contract.contractCode}</span> · Khách hàng: <span className="font-black">{contract.customerName}</span>
                </p>
              </div>
              <button
                onClick={() => {
                  if (isSubmittingApproval) return;
                  setShowApproveModal(false);
                  setSelectedVehicleIdForApproval(null);
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
                    <span className="font-black text-slate-900">{contract.contractCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold">Khách hàng</span>
                    <span className="font-black text-slate-900 text-right">{contract.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold">Số điện thoại</span>
                    <span className="font-bold text-slate-800">{contract.customerPhone}</span>
                  </div>
                  
                  {/* Hiển thị thông tin xe ghép tạm (nếu có) - luôn hiển thị */}
                  {(() => {
                    // Tìm xe ghép tạm từ vehicleId hoặc tempVehicleInfo
                    let tempVehicle: any = null;
                    let isFromTempInfo = false;
                    
                    if (contract.vehicleId) {
                      // Ưu tiên tìm trong vehicle state hoặc vehicles list
                      tempVehicle = vehicle || vehicles.find(v => v.id === contract.vehicleId);
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
                      (contract.vehicleId ? selectedVehicleIdForApproval !== contract.vehicleId : true);
                    
                    // Lấy giá xe - ưu tiên từ tempVehicle, nếu không có thì dùng carPrice từ contract
                    const vehiclePrice = tempVehicle.price || contract.carPrice || 0;
                    
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
                          {(tempVehicle.version || (vehicleRawData && vehicleRawData.version)) && (
                            <div className="flex justify-between">
                              <span className="text-slate-500 font-semibold text-xs">Phiên bản</span>
                              <span className="font-bold text-slate-800 text-xs">
                                {tempVehicle.version || (vehicleRawData && vehicleRawData.version)}
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
                          {(tempVehicle.interiorColor || (vehicleRawData && vehicleRawData.interior_color)) && (
                            <div className="flex justify-between">
                              <span className="text-slate-500 font-semibold text-xs">Màu nội thất</span>
                              <span className="font-bold text-slate-800 text-xs">
                                {tempVehicle.interiorColor || (vehicleRawData && vehicleRawData.interior_color)}
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
                          {promotions.length > 0 && (() => {
                            const promoPrice = calculatePriceAfterPromotions(vehiclePrice, promotions);
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
                            {selectedVehicle.version && (
                              <div className="flex justify-between">
                                <span className="text-slate-500 font-semibold text-xs">Phiên bản</span>
                                <span className="font-bold text-slate-800 text-xs">{selectedVehicle.version}</span>
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
                            {selectedVehicle.interiorColor && (
                              <div className="flex justify-between">
                                <span className="text-slate-500 font-semibold text-xs">Màu nội thất</span>
                                <span className="font-bold text-slate-800 text-xs">{selectedVehicle.interiorColor}</span>
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
                            {/* Hiển thị giá sau khuyến mãi nếu có promotions */}
                            {promotions.length > 0 && (
                              <div className="flex justify-between pt-1 border-t border-emerald-200">
                                <span className="text-slate-500 font-semibold text-xs">Giá sau CTKM</span>
                                <span className="font-black text-emerald-600 text-xs">
                                  {formatVND(calculatePriceAfterPromotions(selectedVehicle.price, promotions))}
                                </span>
                              </div>
                            )}
                            {contract.vehicleId && contract.vehicleId !== selectedVehicleIdForApproval && (
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
                  <div className="flex justify-between pt-2 border-t border-slate-200">
                    <span className="text-slate-500 font-semibold">Tổng giá trị</span>
                    <span className={`font-black ${selectedVehicleIdForApproval ? 'text-emerald-600' : 'text-slate-900'}`}>
                      {formatVND(
                        selectedVehicleIdForApproval
                          ? (() => {
                              const selectedVehicle = vehicles.find(v => v.id === selectedVehicleIdForApproval);
                              if (!selectedVehicle) return contract.totalAmount;
                              
                              // Tính giá xe sau khi áp dụng promotions
                              const priceAfterPromotions = promotions.length > 0
                                ? calculatePriceAfterPromotions(selectedVehicle.price, promotions)
                                : selectedVehicle.price;
                              
                              // Tính tổng giá trị: giá xe sau CTKM + phí đăng ký + phí bảo hiểm
                              return priceAfterPromotions + contract.registrationFee + contract.insuranceFee;
                            })()
                          : contract.totalAmount
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold">Phương thức</span>
                    <span className="font-bold text-slate-800">
                      {contract.paymentType === 'INSTALLMENT' ? 'Trả góp' : 'Trả thẳng'}
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
                      const isCurrentContractVehicle = v.id === contract.vehicleId;
                      
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
                              {vehicle.version && (
                                <p className="text-[11px] text-slate-500 font-bold">
                                  Phiên bản: <span className="font-black">{vehicle.version}</span>
                                </p>
                              )}
                              <p className="text-[11px] text-slate-500 font-bold">
                                Năm: <span className="font-black">{vehicle.year}</span>
                                {vehicle.color && ` · ${vehicle.color}`}
                                {vehicle.interiorColor && ` · Nội thất: ${vehicle.interiorColor}`}
                              </p>
                              {vehicle.code && (
                                <p className="text-[11px] text-slate-500 font-bold mt-0.5">
                                  Mã xe: <span className="font-black">{vehicle.code}</span>
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-black text-slate-900">{formatVND(vehicle.price)}</p>
                            {promotions.length > 0 && (
                              <p className="text-[10px] font-bold text-emerald-600 mt-0.5">
                                Sau CTKM: {formatVND(calculatePriceAfterPromotions(vehicle.price, promotions))}
                              </p>
                            )}
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
                  setShowApproveModal(false);
                  setSelectedVehicleIdForApproval(null);
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

      <div className="bg-white rounded-[40px] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-10 py-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.back()}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <ArrowLeft size={24} className="text-slate-400" />
            </button>
            <div>
              <h3 className="text-2xl font-black text-slate-900">Chi tiết hợp đồng</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                {contract.contractCode}
              </p>
            </div>
          </div>
          <div className={`px-4 py-2 rounded-xl flex items-center gap-2 ${statusBadge.class}`}>
            {statusBadge.icon}
            <span className="text-xs font-black uppercase tracking-widest">{statusBadge.label}</span>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
              <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1.5">Tổng giá trị</p>
              <p className="text-xl font-black text-blue-900">{formatVND(contract.totalAmount)}</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200">
              <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1.5">Đã thanh toán</p>
              <p className="text-xl font-black text-emerald-900">{formatVND(contract.paidAmount)}</p>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200">
              <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1.5">Còn lại</p>
              <p className="text-xl font-black text-amber-900">{formatVND(remainingAmount)}</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tiến độ thanh toán</span>
              <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-lg">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200">
              <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
            </div>
          </div>

          {/* Contract Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Customer Information */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                <User size={14} /> Thông tin khách hàng
              </h4>
              <div className="space-y-2">
                {/* Basic Information - Luôn hiển thị */}
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Họ và tên</p>
                  <p className="text-sm font-black text-slate-900">{fullCustomerData?.name || contract.customerName || '--'}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Số điện thoại</p>
                  <p className="text-sm font-bold text-slate-700">{contract.customerPhone || '--'}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Email</p>
                  <p className="text-xs font-bold text-slate-700">{fullCustomerData?.email || '--'}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Địa chỉ</p>
                  <p className="text-xs font-bold text-slate-700">{fullCustomerData?.address || contract.customerAddress || '--'}</p>
                </div>
                
                {/* Personal Information (for INDIVIDUAL) - Hiển thị tất cả trường */}
                {(fullCustomerData?.type === 'INDIVIDUAL' || !fullCustomerData) && (
                  <>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Ngày sinh</p>
                      <p className="text-xs font-bold text-slate-700">
                        {fullCustomerData?.date_of_birth ? formatDate(fullCustomerData.date_of_birth) : '--'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Giới tính</p>
                      <p className="text-xs font-bold text-slate-700">{fullCustomerData?.gender || '--'}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">CCCD/CMND</p>
                      <p className="text-sm font-bold text-slate-700 font-mono">
                        {fullCustomerData?.id_card || contract.customerIDCard || '--'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Ngày cấp CCCD</p>
                      <p className="text-xs font-bold text-slate-700">
                        {fullCustomerData?.id_card_issue_date ? formatDate(fullCustomerData.id_card_issue_date) : '--'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Nơi cấp CCCD</p>
                      <p className="text-xs font-bold text-slate-700">{fullCustomerData?.id_card_issue_place || '--'}</p>
                    </div>
                  </>
                )}

                {/* Corporate Information (for CORPORATE) - Hiển thị tất cả trường */}
                {fullCustomerData?.type === 'CORPORATE' && (
                  <>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Tên công ty</p>
                      <p className="text-sm font-black text-slate-900">{fullCustomerData?.company_name || '--'}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Mã số thuế</p>
                      <p className="text-sm font-bold text-slate-700 font-mono">{fullCustomerData?.tax_code || '--'}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Người đại diện</p>
                      <p className="text-sm font-bold text-slate-700">{fullCustomerData?.representative || '--'}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Chức vụ</p>
                      <p className="text-xs font-bold text-slate-700">{fullCustomerData?.position || '--'}</p>
                    </div>
                  </>
                )}

                {/* Bank Information - Luôn hiển thị section này */}
                <div className="pt-2 mt-2 border-t border-slate-200">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Thông tin ngân hàng</p>
                  <div className="space-y-1.5">
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Tên ngân hàng</p>
                      <p className="text-xs font-bold text-slate-700">{fullCustomerData?.bank_name || contract.bankName || '--'}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Số tài khoản</p>
                      <p className="text-xs font-bold text-slate-700 font-mono">{fullCustomerData?.bank_account || '--'}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Chi nhánh</p>
                      <p className="text-xs font-bold text-slate-700">{fullCustomerData?.bank_branch || '--'}</p>
                    </div>
                  </div>
                </div>

                {/* Additional Information - Hiển thị tất cả trường */}
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Nguồn khách hàng</p>
                  <p className="text-xs font-bold text-slate-700">{fullCustomerData?.source || '--'}</p>
                </div>
                {fullCustomerData?.status && (
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Trạng thái khách hàng</p>
                    <p className="text-xs font-bold text-slate-700">
                      {fullCustomerData.status === 'LOYAL' ? 'Thân thiết' :
                       fullCustomerData.status === 'TRADING' ? 'Đang giao dịch' :
                       fullCustomerData.status === 'PROSPECT' ? 'Tiềm năng' :
                       fullCustomerData.status}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Ghi chú</p>
                  <p className="text-xs font-bold text-slate-700">{fullCustomerData?.notes || '--'}</p>
                </div>

                {/* Contract-specific Information */}
                <div className="pt-2 mt-2 border-t border-slate-200">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Ngày ký hợp đồng</p>
                  <p className="text-xs font-bold text-slate-700">
                    {contract.status === ContractStatus.DRAFT 
                      ? 'Chưa ký' 
                      : contract.status === ContractStatus.PENDING_APPROVAL
                      ? 'Đang chờ duyệt'
                      : (contract.signedDate ? formatDate(contract.signedDate) : 'Chưa ký')}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Phương thức thanh toán</p>
                  <p className="text-xs font-bold text-slate-700">
                    {contract.paymentType === 'INSTALLMENT' ? 'Trả góp' : 'Trả thẳng'}
                  </p>
                </div>
                {contract.loanAmount && contract.loanAmount > 0 && (
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Số tiền vay</p>
                    <p className="text-xs font-bold text-slate-700">{formatVND(contract.loanAmount)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Vehicle Information */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Car size={14} /> Thông tin xe
              </h4>
              {(() => {
                if (!vehicle && !tempVehicleInfo) {
                  return <p className="text-xs text-slate-500">Không có thông tin xe</p>;
                }

                const vehicleData = vehicle || tempVehicleInfo;
                const isTempInfo = !vehicle && !!tempVehicleInfo;

                return (
                  <div className="space-y-2">
                    {/* Mã xe */}
                    {(vehicle?.code || tempVehicleInfo?.code) && (
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Mã xe</p>
                        <p className="text-sm font-black text-slate-900">{vehicle?.code || tempVehicleInfo?.code}</p>
                      </div>
                    )}

                    {/* Model */}
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Model</p>
                      <p className="text-sm font-black text-slate-900">{(vehicle?.make || tempVehicleInfo?.make || 'VinFast')} {(vehicle?.model || tempVehicleInfo?.model || '')}</p>
                    </div>

                    {/* Phiên bản */}
                    {(vehicleRawData?.version || tempVehicleInfo?.version) && (
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Phiên bản</p>
                        <p className="text-sm font-bold text-slate-700">{vehicleRawData?.version || tempVehicleInfo?.version}</p>
                      </div>
                    )}

                    {/* Năm sản xuất */}
                    {(vehicle?.year || tempVehicleInfo?.year) && (
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Năm sản xuất</p>
                        <p className="text-sm font-bold text-slate-700">{vehicle?.year || tempVehicleInfo?.year}</p>
                      </div>
                    )}

                    {/* Số VIN - chỉ hiển thị nếu có xe thật */}
                    {vehicle && (
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Số VIN</p>
                        <p className={`text-sm font-bold font-mono ${canViewSensitiveInfo() ? 'text-slate-700' : 'text-slate-400 blur-sm'}`}>
                          {maskSensitiveInfo(vehicle.vin)}
                        </p>
                      </div>
                    )}

                    {/* Số máy - chỉ hiển thị nếu có xe thật */}
                    {vehicle && (
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Số máy</p>
                        <p className={`text-sm font-bold font-mono ${canViewSensitiveInfo() ? 'text-slate-700' : 'text-slate-400 blur-sm'}`}>
                          {maskSensitiveInfo(vehicleRawData?.engine_number || '--')}
                        </p>
                      </div>
                    )}

                    {/* Màu ngoại thất */}
                    {(vehicle?.color || tempVehicleInfo?.color) && (
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Màu ngoại thất</p>
                        <div className="flex items-center gap-2">
                          <div className="w-3.5 h-3.5 rounded-full border border-slate-200" style={{backgroundColor: (vehicle?.color || tempVehicleInfo?.color || '#ccc').toLowerCase()}}></div>
                          <p className="text-xs font-bold text-slate-700">{vehicle?.color || tempVehicleInfo?.color}</p>
                        </div>
                      </div>
                    )}

                    {/* Màu nội thất */}
                    {(vehicleRawData?.interior_color || tempVehicleInfo?.interior_color) && (
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Màu nội thất</p>
                        <div className="flex items-center gap-2">
                          <div className="w-3.5 h-3.5 rounded-full border border-slate-200" style={{backgroundColor: (vehicleRawData?.interior_color || tempVehicleInfo?.interior_color || '#ccc').toLowerCase()}}></div>
                          <p className="text-xs font-bold text-slate-700">{vehicleRawData?.interior_color || tempVehicleInfo?.interior_color}</p>
                        </div>
                      </div>
                    )}

                    {/* Số km đã đi */}
                    {((vehicle?.mileage !== undefined && vehicle?.mileage !== null) || tempVehicleInfo?.mileage) && (
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Số km đã đi</p>
                        <p className="text-sm font-bold text-slate-700">{(vehicle?.mileage || tempVehicleInfo?.mileage || 0).toLocaleString('vi-VN')} km</p>
                      </div>
                    )}

                    {/* Tình trạng pin */}
                    {((vehicle?.batteryHealth !== undefined && vehicle?.batteryHealth !== null) || tempVehicleInfo?.battery_health) && (
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Tình trạng pin (SOH %)</p>
                        <p className="text-sm font-bold text-slate-700">{vehicle?.batteryHealth || tempVehicleInfo?.battery_health}%</p>
                      </div>
                    )}

                    {/* Trạng thái */}
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Trạng thái</p>
                      <p className="text-sm font-bold text-slate-700">
                        {vehicle ? (
                          vehicle.status === 'AVAILABLE' ? 'Sẵn sàng' :
                          vehicle.status === 'RESERVED' ? 'Đã đặt cọc' :
                          vehicle.status === 'SOLD' ? 'Đã bán' :
                          vehicle.status === 'REGISTRATION' ? 'Đang đăng ký' :
                          vehicle.status === 'DELIVERED' ? 'Đã bàn giao' :
                          vehicle.status
                        ) : (
                          'Thông tin mẫu (chưa ghép xe từ kho)'
                        )}
                      </p>
                    </div>

                    {/* Trạng thái giao dịch */}
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Trạng thái giao dịch</p>
                      {vehicle ? (() => {
                        const derivedStatus = getDerivedVehicleTransactionStatus();
                        const vehicleTxStatus = getVehicleTransactionStatusConfig(derivedStatus);
                        return (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black ${vehicleTxStatus.color}`}>
                            {vehicleTxStatus.icon} {vehicleTxStatus.label}
                          </span>
                        );
                      })() : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black bg-slate-100 text-slate-600">
                          📋 Thông tin mẫu
                        </span>
                      )}
                    </div>

                    {/* Thông báo cho thông tin tạm thời */}
                    {isTempInfo && (
                      <div className="mt-3 text-xs text-slate-500 italic">
                        Số VIN và số máy sẽ được cập nhật khi xe được ghép từ kho
                      </div>
                    )}
                  </div>
                );
              })()}
              {tempVehicleInfo && !vehicle && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs text-amber-700 font-medium">
                    📋 Đây là thông tin xe mẫu được chọn khi tạo hợp đồng. Xe thật sẽ được ghép từ kho trong quá trình duyệt hợp đồng.
                  </p>
                </div>
              )}
            </div>

            {/* Responsible Staff & Price Breakdown - Combined */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              {/* Responsible Staff Information */}
              {responsibleStaff && (
                <div className="mb-6 pb-6 border-b border-slate-200">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <UserCircle size={14} /> Nhân viên phụ trách
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Họ và tên</p>
                      <p className="text-sm font-black text-slate-900">{responsibleStaff.name}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Price Breakdown */}
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <DollarSign size={14} /> Chi tiết giá
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-600">Giá xe</span>
                    <span className="text-sm font-black text-slate-900">{formatVND(contract.carPrice)}</span>
                  </div>
                  
                  {/* Chương trình khuyến mãi */}
                  {promotions.length > 0 && (
                    <div className="bg-gradient-to-br from-emerald-50 to-blue-50 rounded-lg p-3 border-2 border-emerald-200 mt-3 mb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Gift size={14} className="text-emerald-600" />
                        <h5 className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Chương trình khuyến mãi đã áp dụng</h5>
                      </div>
                      <div className="space-y-2">
                        {promotions.map((promo, index) => {
                          const discountText = promo.discount_type === 'PERCENTAGE'
                            ? `Giảm ${promo.discount_value}%`
                            : promo.discount_type === 'FIXED_AMOUNT'
                            ? `Giảm ${formatVND(promo.discount_value)}`
                            : 'Tặng quà';
                          
                          return (
                            <div key={index} className="bg-white rounded-lg p-2.5 border border-emerald-200">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <p className="text-xs font-black text-slate-900">{promo.name}</p>
                                  <p className="text-[10px] text-slate-500 font-bold mt-0.5">{promo.code}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs font-black text-emerald-600">{discountText}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Giá sau khuyến mãi (nếu có promotions) */}
                  {promotions.length > 0 && vehicle && (
                    <div className="bg-emerald-50 rounded-lg p-3 border-2 border-emerald-300 mb-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-emerald-700 uppercase tracking-widest">Giá xe sau khuyến mãi</span>
                        <span className="text-sm font-black text-emerald-700">
                          {(() => {
                            let finalPrice = contract.carPrice;
                            promotions.forEach(promo => {
                              if (promo.discount_type === 'PERCENTAGE') {
                                finalPrice = finalPrice * (1 - promo.discount_value / 100);
                              } else if (promo.discount_type === 'FIXED_AMOUNT') {
                                finalPrice = Math.max(0, finalPrice - promo.discount_value);
                              }
                            });
                            return formatVND(finalPrice);
                          })()}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {contract.vatAmount > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-600">Thuế VAT</span>
                      <span className="text-sm font-black text-slate-900">{formatVND(contract.vatAmount)}</span>
                    </div>
                  )}
                  {contract.registrationFee > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-600">Phí đăng ký</span>
                      <span className="text-sm font-black text-slate-900">{formatVND(contract.registrationFee)}</span>
                    </div>
                  )}
                  {contract.insuranceFee > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-600">Phí bảo hiểm</span>
                      <span className="text-sm font-black text-slate-900">{formatVND(contract.insuranceFee)}</span>
                    </div>
                  )}
                  {contract.discount > 0 && promotions.length === 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-emerald-600">Giảm giá</span>
                      <span className="text-sm font-black text-emerald-600">-{formatVND(contract.discount)}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-slate-300">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-black text-slate-900">Tổng cộng</span>
                      <span className="text-lg font-black text-slate-900">{formatVND(contract.totalAmount)}</span>
                    </div>
                    <div className="pt-1.5 border-t border-slate-200">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Bằng chữ</p>
                      <p className="text-xs font-bold text-slate-700 italic leading-relaxed">
                        {amountToWordsCapitalized(contract.totalAmount)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Tiến độ thanh toán */}
                  {contract.totalAmount > 0 && (
                    <div className="pt-4 border-t border-slate-300 mt-4">
                      <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <GanttChartSquare size={14} /> Tiến độ thanh toán
                      </h5>
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-blue-50 rounded-lg p-2 border border-blue-200">
                            <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1">Tổng giá trị</p>
                            <p className="text-sm font-black text-blue-900">{formatVND(contract.totalAmount)}</p>
                          </div>
                          <div className="bg-emerald-50 rounded-lg p-2 border border-emerald-200">
                            <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Đã thanh toán</p>
                            <p className="text-sm font-black text-emerald-900">{formatVND(contract.paidAmount)}</p>
                          </div>
                          <div className="bg-amber-50 rounded-lg p-2 border border-amber-200">
                            <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1">Còn lại</p>
                            <p className="text-sm font-black text-amber-900">{formatVND(remainingAmount)}</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tiến độ</span>
                            <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-lg">{Math.round(progress)}%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
                            <div 
                              className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-full rounded-full transition-all duration-1000" 
                              style={{ width: `${Math.min(progress, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Lịch trình thanh toán */}
                  {paymentSchedules.length > 0 && (
                    <div className="pt-4 border-t border-slate-300 mt-4">
                      <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Calendar size={14} /> Lịch trình thanh toán
                      </h5>
                      <div className="space-y-2">
                        {paymentSchedules.map((schedule) => {
                          const scheduleStatus = schedule.status === 'PAID' 
                            ? { label: 'Đã thanh toán', class: 'bg-emerald-100 text-emerald-600' }
                            : schedule.status === 'OVERDUE'
                            ? { label: 'Quá hạn', class: 'bg-rose-100 text-rose-600' }
                            : { label: 'Chờ thanh toán', class: 'bg-amber-100 text-amber-600' };
                          
                          return (
                            <div key={schedule.id} className="bg-white rounded-lg p-3 border border-slate-200">
                              <div className="flex justify-between items-start mb-1.5">
                                <div>
                                  <p className="text-xs font-black text-slate-900">{schedule.milestoneName}</p>
                                  <p className="text-[10px] text-slate-500 font-bold mt-0.5">{formatDate(schedule.dueDate)}</p>
                                </div>
                                <div className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${scheduleStatus.class}`}>
                                  {scheduleStatus.label}
                                </div>
                              </div>
                              <div className="flex justify-between items-center mt-2">
                                <p className="text-sm font-black text-slate-900">{formatVND(schedule.amount)}</p>
                                {(() => {
                                  // Kiểm tra xem đã có transaction được tạo cho milestone này chưa
                                  const hasTransaction = schedule.transactionId && 
                                    relatedTransactions.some(t => t.id === schedule.transactionId);
                                  
                                  // Kiểm tra xem có transaction nào khớp với milestone này không (fallback check)
                                  const hasMatchingTransaction = relatedTransactions.some(t => 
                                    t.description && t.description.includes(schedule.milestoneName) && 
                                    Math.abs(t.amount - schedule.amount) < 1000 // Allow 1000 VND difference
                                  );
                                  
                                  const hasReceipt = hasTransaction || hasMatchingTransaction;
                                  
                                  // Chỉ hiển thị nút nếu chưa thanh toán, hợp đồng không phải DRAFT hoặc PENDING_APPROVAL, chưa có phiếu thu, và user có quyền tạo phiếu thu
                                  const shouldShowButton = schedule.status !== 'PAID' && 
                                                            contract.status !== ContractStatus.DRAFT && 
                                                            contract.status !== ContractStatus.PENDING_APPROVAL &&
                                                            !hasReceipt &&
                                                            canCreateFinance;
                                  
                                  // Hiển thị thông báo nếu đã có phiếu thu
                                  if (hasReceipt && schedule.status !== 'PAID') {
                                    return (
                                      <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold">
                                        <CheckCircle2 size={16} /> Đã tạo phiếu thu
                                      </div>
                                    );
                                  }
                                  
                                  return shouldShowButton ? (
                                    <button
                                      onClick={() => handleCreateReceiptFromSchedule(schedule)}
                                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all shadow-sm"
                                    >
                                      <Receipt size={16} /> Tạo phiếu thu
                                    </button>
                                  ) : null;
                                })()}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Related Transactions */}
          {relatedTransactions.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Receipt size={14} /> Phiếu thu liên quan ({relatedTransactions.length})
                </h4>
                <div className="space-y-2">
                  {relatedTransactions.map((transaction) => (
                    <Link
                      key={transaction.id}
                      href={`/finance/receipt/${transaction.id}`}
                      className="block bg-white rounded-lg p-3 border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-xs font-black text-slate-900">{transaction.description}</p>
                          <p className="text-[10px] text-slate-500 font-bold mt-0.5">{formatDate(transaction.date)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className="text-sm font-black text-emerald-600">{formatVND(transaction.amount)}</p>
                            {transaction.status === TransactionStatus.APPROVED && (
                              <p className="text-[10px] text-emerald-600 font-bold">Đã duyệt</p>
                            )}
                          </div>
                          <ChevronRight size={20} className="text-slate-400" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-10 py-8 bg-slate-50 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-6">
            {/* Left: Quay lại */}
            <button
              onClick={() => router.back()}
              className="order-2 sm:order-1 flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-100 hover:border-slate-300 transition-all shadow-sm"
            >
              <ArrowLeft size={18} /> Quay lại
            </button>

            {/* Right: Nhóm hành động */}
            <div className="order-1 sm:order-2 flex flex-wrap items-center justify-end gap-3">
              {/* Xem hợp đồng - luôn hiển thị */}
              <button
                onClick={() => setShowContractPreview(true)}
                className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-2xl text-sm font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-200/40 hover:shadow-lg hover:shadow-blue-200/50"
              >
                <Eye size={18} /> Xem
              </button>

              {/* Duyệt hợp đồng - chỉ khi PENDING_APPROVAL và có quyền contractsApprove */}
              {contract.status === ContractStatus.PENDING_APPROVAL && canApproveContract && (
                <button
                  onClick={handleApproveContract}
                  className="flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-2xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-md shadow-emerald-200/40 hover:shadow-lg hover:shadow-emerald-200/50"
                >
                  <CheckCheck size={18} /> Duyệt hợp đồng
                </button>
              )}

              {/* Sửa hợp đồng - chỉ khi DRAFT hoặc PENDING_APPROVAL */}
              {(contract.status === ContractStatus.DRAFT || contract.status === ContractStatus.PENDING_APPROVAL) && canUpdateContract && (
                <button
                  onClick={() => router.push(`/contracts/${contractId}/edit`)}
                  className="flex items-center gap-2 px-5 py-3 bg-white border-2 border-blue-200 text-blue-600 rounded-2xl text-sm font-bold hover:bg-blue-50 hover:border-blue-300 transition-all"
                >
                  <Edit size={18} /> Sửa
                </button>
              )}

              {/* Xóa - khi có quyền và chưa có giao dịch duyệt */}
              {canDeleteContractCheck() && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 px-5 py-3 bg-white border-2 border-rose-200 text-rose-600 rounded-2xl text-sm font-bold hover:bg-rose-50 hover:border-rose-300 transition-all"
                >
                  <Trash2 size={18} /> Xóa
                </button>
              )}

              {/* Khối Ký: ngày ký + nút Ký - chỉ khi DRAFT */}
              {contract.status === ContractStatus.DRAFT && (
                <div className="flex flex-wrap items-end gap-3 pl-3 border-l border-slate-200">
                  <div className="flex flex-col gap-1.5 min-w-[150px]">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">
                      Ngày ký
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                      <input
                        type="text"
                        value={selectedSignDate}
                        onChange={(e) => handleSignDateChange(e.target.value)}
                        onBlur={(e) => {
                          const parsed = parseDateFromDDMMYYYY(e.target.value);
                          if (parsed) {
                            const today = new Date().toISOString().split('T')[0];
                            if (parsed > today) {
                              const d = new Date();
                              setSelectedSignDate(
                                `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`
                              );
                            } else {
                              setSelectedSignDate(formatDateToDDMMYYYY(parsed));
                            }
                          } else if (e.target.value) {
                            const match = e.target.value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
                            if (!match) {
                              const d = new Date();
                              setSelectedSignDate(
                                `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`
                              );
                            }
                          }
                        }}
                        placeholder="dd/mm/yyyy"
                        maxLength={10}
                        className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono placeholder:text-slate-300"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleSignContract}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-black hover:bg-emerald-700 transition-all shadow-md shadow-emerald-200/40 hover:shadow-lg"
                  >
                    <CheckCircle2 size={16} /> Ký
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal xem hợp đồng */}
      {showContractPreview && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  Xem trước hợp đồng - {contract.contractCode}
                </h3>
                <p className="text-xs text-slate-500 font-bold mt-1">
                  Khách hàng: <span className="font-black">{contract.customerName}</span>
                </p>
              </div>
              <button
                onClick={() => setShowContractPreview(false)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <ContractTemplate
                contract={contract}
                vehicle={vehicle}
              />
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setShowContractPreview(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all"
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  // Xuất PDF
                  exportContractToPDF(`hop-dong-${contract.contractCode}.pdf`);
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
