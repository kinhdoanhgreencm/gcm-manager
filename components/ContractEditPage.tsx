'use client'

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  User, Car, CreditCard, CheckCircle2, 
  ChevronRight, ChevronLeft, Search, Info, 
  AlertTriangle, Plus, Save, Receipt, 
  FileText, Calendar, MapPin, Mail, Hash,
  Phone, DollarSign, ArrowLeft, Building2,
  Landmark, UserCircle, Briefcase, Battery,
  Gauge, Gift, Tag, X
} from 'lucide-react';
import { VehicleStatus, TransactionCategory, Customer, CustomerType, Vehicle } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { getUserAndSuperiors, getAllSubordinates } from '@/utils/userHierarchy';
import { supabase } from '@/services/supabaseClient';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const updateVehicleStatusOnContractDeletedByVehicleId = async (_vehicleId: string) => {};

interface ContractEditPageProps {
  contractId: string;
}

export const ContractEditPage: React.FC<ContractEditPageProps> = ({ contractId }) => {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // Kiểm tra quyền xem thông tin đầy đủ (admin, director, operations_director)
  const canViewSensitiveInfo = () => {
    if (!user?.role) return false;
    const allowedRoles = ['ADMIN', 'DIRECTOR', 'OPERATIONS_DIRECTOR'];
    return allowedRoles.includes(user.role);
  };
  
  // Hàm làm mờ VIN và số máy
  const maskSensitiveInfo = (value: string): string => {
    if (!value || value.length === 0) return '--';
    if (canViewSensitiveInfo()) return value;
    
    // Giữ lại 3 ký tự đầu và 3 ký tự cuối, làm mờ phần giữa
    if (value.length <= 6) {
      return '*'.repeat(value.length);
    }
    const start = value.substring(0, 3);
    const end = value.substring(value.length - 3);
    const middle = '*'.repeat(Math.max(3, value.length - 6));
    return `${start}${middle}${end}`;
  };
  
  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Fetch customers from database
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        if (!user?.id) {
          setCustomers([]);
          return;
        }

        const response = await fetch(`/api/contracts/customers?userId=${encodeURIComponent(user.id)}`, { cache: 'no-store' });
        const result = await response.json();

        if (!response.ok) {
          console.error('Error fetching customers:', result?.error || 'Unknown error');
          return;
        }

        if (result.customers) {
          const transformedCustomers: Customer[] = result.customers.map((c: any) => ({
            id: c.id,
            code: c.code || '',
            type: c.type as CustomerType,
            name: c.name || '',
            phone: c.phone || '',
            email: c.email || undefined,
            address: c.address || '',
            idCard: c.id_card || undefined,
            taxCode: c.tax_code || undefined,
            companyName: c.company_name || undefined,
            representative: c.representative || undefined,
            position: c.position || undefined,
            source: c.source || '',
            assignedStaffId: c.assigned_staff_id || '',
            status: c.status as any,
            notes: c.notes || undefined,
            createdAt: c.created_at || new Date().toISOString(),
            totalContracts: c.total_contracts || 0,
            totalPurchased: c.total_purchased || 0,
            totalRevenue: Number(c.total_revenue) || 0,
            debt: Number(c.debt) || 0,
            dateOfBirth: c.date_of_birth || undefined,
            gender: c.gender || undefined,
            idCardIssueDate: c.id_card_issue_date || undefined,
            idCardIssuePlace: c.id_card_issue_place || undefined,
            bankName: c.bank_name || undefined,
            bankAccount: c.bank_account || undefined,
            bankBranch: c.bank_branch || undefined
          }));

          setCustomers(transformedCustomers);
        }
      } catch (err: any) {
        console.error('Unexpected error fetching customers:', err);
      }
    };

    fetchCustomers();
  }, []);

  // Fetch vehicles from database (include SOLD vehicles for editing)
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const response = await fetch('/api/contracts/vehicles', { cache: 'no-store' });
        const result = await response.json();

        if (!response.ok) {
          console.error('Error fetching vehicles:', result?.error || 'Unknown error');
          return;
        }

        if (result.vehicles) {
          setVehiclesRawData(result.vehicles);
          const transformed: Vehicle[] = result.vehicles.map((v: any) => ({
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
            supplierId: v.supplier_id || undefined,
            transactionStatus: v.transaction_status || 'Sẵn sàng giao dịch'
          }));
          setVehicles(transformed);
        }
        return;

        // First, get the contract's vehicle ID if loading
        let contractVehicleId: string | null = null;
        if (contractId) {
          const { data: contractData } = await supabase
            .from('contracts')
            .select('vehicle_id')
            .eq('id', contractId)
            .single();
          contractVehicleId = contractData?.vehicle_id || null;
        }

        // Load all contracts to check which vehicles are in use
        const { data: allContracts } = await supabase
          .from('contracts')
          .select('id, vehicle_id')
          .eq('contract_type', 'SALES');

        const vehicleIdsInUse = new Set(
          (allContracts || [])
            .filter((c: any) => c.id !== contractId && c.vehicle_id)
            .map((c: any) => c.vehicle_id)
        );

        // Build query - include AVAILABLE vehicles and the contract's vehicle if SOLD
        let query = supabase
          .from('vehicles')
          .select('*');

        if (contractVehicleId) {
          // Include both available vehicles and the contract's vehicle
          query = query.or(`status.eq.AVAILABLE,id.eq.${contractVehicleId}`);
        } else {
          // Only available vehicles
          query = query.eq('status', VehicleStatus.AVAILABLE);
        }

        query = query.order('created_at', { ascending: false });

        const { data, error: fetchError } = await query;

        if (fetchError) {
          console.error('Error fetching vehicles:', fetchError);
          return;
        }

        if (data) {
          // Store raw data to access additional fields
          setVehiclesRawData(data || []);
          
          // Transform Supabase data to Vehicle type
          const transformedVehicles: Vehicle[] = (data || [])
            .map((v: any) => ({
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
              transactionStatus: v.transaction_status || 'Sẵn sàng giao dịch',
              color: v.color || '',
              mileage: v.mileage || undefined,
              batteryHealth: v.battery_health || undefined,
              images: v.images || [],
              createdAt: v.created_at || new Date().toISOString(),
              supplierId: v.supplier_id || undefined
            }))
            // Filter: chỉ hiển thị xe sẵn sàng ghép hoặc xe của contract hiện tại
            .filter((v: Vehicle) => {
              const isContractVehicle = contractVehicleId && v.id === contractVehicleId;
              if (isContractVehicle) return true; // Luôn hiển thị xe của contract hiện tại
              
              const isAvailable = v.status === VehicleStatus.AVAILABLE;
              const txStatus = (v.transactionStatus || '').trim();
              
              // Cho phép ghép nếu:
              // - transaction_status là NULL/rỗng
              // - transaction_status = 'Sẵn sàng giao dịch'
              // - transaction_status = 'Đã ghép' (xe đã từng được ghép nhưng hợp đồng có thể đã bị xóa/hủy)
              // KHÔNG cho phép: 'Đã cọc', 'Đã xuất hóa đơn', 'Đã giao xe', 'Đã bàn giao'
              const allowedStatuses = ['', 'Sẵn sàng giao dịch', 'Đã ghép'];
              const isReadyForTransaction = !txStatus || allowedStatuses.includes(txStatus);
              const notInUse = !vehicleIdsInUse.has(v.id);
              
              return isAvailable && isReadyForTransaction && notInUse;
            });

          setVehicles(transformedVehicles);
        }
      } catch (err: any) {
        console.error('Unexpected error fetching vehicles:', err);
      }
    };

    fetchVehicles();
  }, []);

  // Fetch promotions from database
  useEffect(() => {
    const fetchPromotions = async () => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];

        const { data, error: fetchError } = await supabase
          .from('promotions')
          .select('*')
          .eq('status', 'ACTIVE')
          .order('created_at', { ascending: false });

        if (fetchError) {
          console.error('Error fetching promotions:', fetchError);
          return;
        }

        if (data) {
          // Filter promotions that are currently active based on dates
          const activePromotions = data.filter((promo: any) => {
            // If no dates, consider it always active
            if (!promo.start_date && !promo.end_date) return true;
            
            const startDate = promo.start_date ? new Date(promo.start_date + 'T00:00:00') : null;
            const endDate = promo.end_date ? new Date(promo.end_date + 'T00:00:00') : null;
            
            // Check if today is within the date range
            if (startDate && endDate) {
              return today >= startDate && today <= endDate;
            } else if (startDate) {
              return today >= startDate;
            } else if (endDate) {
              return today <= endDate;
            }
            
            return true;
          });

          // Transform to format needed by the form
          const transformedPromotions = activePromotions.map((promo: any) => ({
            code: promo.code,
            name: promo.name,
            discount: promo.discount_type === 'PERCENTAGE' 
              ? Number(promo.discount_value)
              : promo.discount_type === 'FIXED_AMOUNT'
              ? Number(promo.discount_value)
              : 0,
            discount_type: promo.discount_type,
            discount_value: Number(promo.discount_value)
          }));

          setAvailablePromotions(transformedPromotions);
        }
      } catch (err: any) {
        console.error('Unexpected error fetching promotions:', err);
      }
    };

    fetchPromotions();
  }, []);

  // Load contract data for editing
  useEffect(() => {
    const loadContract = async () => {
      if (!contractId) return;
      
      try {
        setLoading(true);
        
        const response = await fetch(`/api/contracts/${contractId}`, { cache: 'no-store' });
        const result = await response.json();

        if (!response.ok) {
          console.error('Error loading contract:', result?.error || 'Unknown error');
          setSubmitError('Không tìm thấy hợp đồng hoặc có lỗi xảy ra');
          setLoading(false);
          return;
        }

        const contractData = result?.contract;
        if (!contractData) {
          setSubmitError('Hợp đồng không tồn tại');
          setLoading(false);
          return;
        }

        // Kiểm tra quyền truy cập: chỉ user tạo hợp đồng hoặc cấp trên của user đó mới xem được
        if (!user) {
          setSubmitError('Vui lòng đăng nhập để chỉnh sửa hợp đồng');
          setLoading(false);
          return;
        }

        // Kiểm tra quyền: cho phép user, cấp trên và quản lý (cấp dưới) chỉnh sửa hợp đồng
        const superiors = await getUserAndSuperiors(user.id);
        const subordinates = await getAllSubordinates(user.id);
        // Kết hợp user, cấp trên và cấp dưới
        const allowedUserIds = [...superiors, ...subordinates];
        if (!contractData.created_by || !allowedUserIds.includes(contractData.created_by)) {
          setSubmitError('Bạn không có quyền chỉnh sửa hợp đồng này. Chỉ người tạo hợp đồng, cấp trên và quản lý có thể chỉnh sửa hợp đồng của cấp dưới.');
          setLoading(false);
          return;
        }

        // Kiểm tra nếu hợp đồng đã ký thì không cho phép chỉnh sửa
        // Cho phép sửa khi status = DRAFT hoặc PENDING_APPROVAL
        const contractStatusValue = contractData.status;
        setContractStatus(contractStatusValue);
        
        if (contractStatusValue === 'SIGNED' || contractStatusValue === 'PAYING' || contractStatusValue === 'COMPLETED') {
          setSubmitError('Hợp đồng đã được ký, không thể chỉnh sửa');
          setLoading(false);
          return;
        }
        
        // Chỉ cho phép sửa khi status = DRAFT hoặc PENDING_APPROVAL
        if (contractStatusValue !== 'DRAFT' && contractStatusValue !== 'PENDING_APPROVAL') {
          setSubmitError('Chỉ có thể chỉnh sửa hợp đồng ở trạng thái "Nháp" hoặc "Chờ duyệt"');
          setLoading(false);
          return;
        }

        // Format date from YYYY-MM-DD to dd/mm/yyyy for display
        const formatDateForInput = (dateString: string | null): string => {
          if (!dateString) return '';
          try {
            const date = new Date(dateString + 'T00:00:00');
            if (isNaN(date.getTime())) return '';
            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
          } catch {
            return '';
          }
        };

        // Load payment schedules
        const { data: schedulesData, error: schedulesError } = await supabase
          .from('payment_schedules')
          .select('*')
          .eq('contract_id', contractId)
          .order('due_date', { ascending: true });

        let installments = [
          { milestone: 'Đặt cọc', amount: 0, date: '' },
          { milestone: 'Thanh toán lần 1', amount: 0, date: '' },
          { milestone: 'Thanh toán lần 2', amount: 0, date: '' }
        ];

        if (!schedulesError && schedulesData && schedulesData.length > 0) {
          installments = schedulesData.map((s: any) => ({
            milestone: s.milestone_name,
            amount: Number(s.amount) || 0,
            date: formatDateForInput(s.due_date)
          }));
          // Pad to 3 items if less
          while (installments.length < 3) {
            installments.push({ milestone: `Thanh toán lần ${installments.length + 1}`, amount: 0, date: '' });
          }
        }

        // Load promotions if exists
        let promotions: Array<{ code: string; name: string; discount: number }> = [];
        if (contractData.promotions_json) {
          try {
            const promotionsData = typeof contractData.promotions_json === 'string' 
              ? JSON.parse(contractData.promotions_json) 
              : contractData.promotions_json;
            
            if (Array.isArray(promotionsData)) {
              promotions = promotionsData.map((p: any) => ({
                code: p.code || p,
                name: p.name || '',
                discount: 0 // Will be populated from availablePromotions
              }));
            }
          } catch (err) {
            console.error('Error parsing promotions:', err);
          }
        }

        // Pre-fill form data
        setFormData({
          customerName: contractData.customer_name || '',
          customerPhone: contractData.customer_phone || '',
          customerID: contractData.customer_id_card || '',
          customerAddress: contractData.customer_address || '',
          customerEmail: '',
          dateOfBirth: '',
          gender: '',
          idCardIssueDate: '',
          idCardIssuePlace: '',
          companyName: '',
          representative: '',
          position: '',
          bankName: contractData.bank_name || '',
          bankAccount: '',
          bankBranch: '',
          vehicleId: contractData.vehicle_id || '',
          carPrice: Number(contractData.car_price) || 0,
          registrationFee: Number(contractData.registration_fee) || 0,
          insuranceFee: Number(contractData.insurance_fee) || 0,
          discount: Number(contractData.discount) || 0,
          promotions: promotions,
          paymentType: (contractData.payment_type as 'CASH' | 'INSTALLMENT') || 'CASH',
          installments: installments
        });

        setLoading(false);
      } catch (err: any) {
        console.error('Error loading contract:', err);
        setSubmitError(err.message || 'Có lỗi xảy ra khi tải dữ liệu');
        setLoading(false);
      }
    };

    loadContract();
  }, [contractId]);

  // Handle customer selection and auto-fill form
  const handleCustomerSelect = (customerId: string) => {
    setSelectedCustomerId(customerId);
    
    if (!customerId) {
      // Clear form if no customer selected
      setSelectedCustomerType(null);
      setFormData({
        ...formData,
        customerName: '',
        customerPhone: '',
        customerID: '',
        customerAddress: '',
        customerEmail: '',
        dateOfBirth: '',
        gender: '',
        idCardIssueDate: '',
        idCardIssuePlace: '',
        companyName: '',
        representative: '',
        position: '',
        bankName: '',
        bankAccount: '',
        bankBranch: ''
      });
      return;
    }

    const selectedCustomer = customers.find(c => c.id === customerId);
    if (selectedCustomer) {
      setSelectedCustomerType(selectedCustomer.type);
      setFormData({
        ...formData,
        customerName: selectedCustomer.name || '',
        customerPhone: selectedCustomer.phone || '',
        customerID: selectedCustomer.type === CustomerType.CORPORATE 
          ? (selectedCustomer.taxCode || '') 
          : (selectedCustomer.idCard || ''),
        customerAddress: selectedCustomer.address || '',
        customerEmail: selectedCustomer.email || '',
        // Thông tin cá nhân
        dateOfBirth: selectedCustomer.dateOfBirth || '',
        gender: selectedCustomer.gender || '',
        idCardIssueDate: selectedCustomer.idCardIssueDate || '',
        idCardIssuePlace: selectedCustomer.idCardIssuePlace || '',
        // Thông tin doanh nghiệp
        companyName: selectedCustomer.companyName || '',
        representative: selectedCustomer.representative || '',
        position: selectedCustomer.position || '',
        // Thông tin ngân hàng
        bankName: selectedCustomer.bankName || '',
        bankAccount: selectedCustomer.bankAccount || '',
        bankBranch: selectedCustomer.bankBranch || ''
      });
    }
  };

  const [step, setStep] = useState(1);
  
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerID: '',
    customerAddress: '',
    customerEmail: '',
    // Thông tin cá nhân bổ sung
    dateOfBirth: '',
    gender: '',
    idCardIssueDate: '',
    idCardIssuePlace: '',
    // Thông tin doanh nghiệp
    companyName: '',
    representative: '',
    position: '',
    // Thông tin ngân hàng
    bankName: '',
    bankAccount: '',
    bankBranch: '',
    vehicleId: '',
    carPrice: 0,
    registrationFee: 0,
    insuranceFee: 0,
    discount: 0,
    promotions: [] as Array<{ code: string; name: string; discount: number }>,
    paymentType: 'CASH' as 'CASH' | 'INSTALLMENT',
    installments: [
      { milestone: 'Đặt cọc', amount: 0, date: '' },
      { milestone: 'Thanh toán lần 1', amount: 0, date: '' },
      { milestone: 'Thanh toán lần 2', amount: 0, date: '' }
    ]
  });

  const [selectedCustomerType, setSelectedCustomerType] = useState<CustomerType | null>(null);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclesRawData, setVehiclesRawData] = useState<any[]>([]);
  const [availablePromotions, setAvailablePromotions] = useState<Array<{ code: string; name: string; discount: number; discount_type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'GIFT'; discount_value: number }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [contractStatus, setContractStatus] = useState<string | null>(null);

  // Find and set customer from contract data after customers and formData are loaded
  useEffect(() => {
    if (customers.length > 0 && formData.customerName && formData.customerPhone) {
      // Find customer by name and phone
      const foundCustomer = customers.find(
        c => c.name === formData.customerName && c.phone === formData.customerPhone
      );
      
      if (foundCustomer) {
        setSelectedCustomerId(foundCustomer.id);
        setSelectedCustomerType(foundCustomer.type);
      }
    }
  }, [customers, formData.customerName, formData.customerPhone]);

  const selectedVehicle = useMemo(() => 
    vehicles.find(v => v.id === formData.vehicleId), 
    [formData.vehicleId, vehicles]
  );

  const selectedVehicleRaw = useMemo(() => 
    vehiclesRawData.find(v => v.id === formData.vehicleId), 
    [formData.vehicleId, vehiclesRawData]
  );

  // availablePromotions is now loaded from database in useEffect above

  // Tính giá xe sau khi trừ khuyến mãi
  const priceAfterPromotion = useMemo(() => {
    // Sử dụng giá bán thỏa thuận (formData.carPrice) làm giá gốc
    // Nếu chưa có giá bán thỏa thuận, sử dụng giá niêm yết của xe
    const basePrice = formData.carPrice > 0 ? formData.carPrice : (selectedVehicle?.price || 0);
    
    if (!selectedVehicle || formData.promotions.length === 0) {
      // Nếu có giá bán thỏa thuận nhưng chưa có khuyến mãi, vẫn hiển thị giá bán thỏa thuận
      return basePrice > 0 ? basePrice : null;
    }
    
    let finalPrice = basePrice;
    
    // Áp dụng từng chương trình khuyến mãi
    // Find full promotion data to get discount_type
    formData.promotions.forEach(promo => {
      const fullPromo = availablePromotions.find(p => p.code === promo.code);
      if (!fullPromo) return;

      if (fullPromo.discount_type === 'PERCENTAGE') {
        // Phần trăm
        finalPrice = finalPrice * (1 - fullPromo.discount_value / 100);
      } else if (fullPromo.discount_type === 'FIXED_AMOUNT') {
        // Số tiền cố định
        finalPrice = Math.max(0, finalPrice - fullPromo.discount_value);
      }
      // Nếu GIFT (discount_type === 'GIFT'), chỉ là tặng quà, không giảm giá
    });
    
    return finalPrice;
  }, [selectedVehicle, formData.promotions, formData.carPrice, availablePromotions]);

  // Giá trị giao dịch cuối cùng = giá sau khuyến mãi (nếu có) hoặc giá bán thỏa thuận
  const totalAmount = useMemo(() => {
    if (priceAfterPromotion !== null && priceAfterPromotion > 0) {
      return priceAfterPromotion;
    }
    return formData.carPrice;
  }, [priceAfterPromotion, formData.carPrice]);

  // Track previous totalAmount to detect changes (ví dụ khi đổi khuyến mãi)
  const prevTotalAmountRef = useRef<number | null>(null);
  const isInitialMountRef = useRef(true);

  // Khi giá trị giao dịch cuối cùng thay đổi (do đổi chương trình khuyến mãi, giá, v.v.)
  // thì reset lại toàn bộ kế hoạch thanh toán để người dùng nhập lại cho khớp.
  useEffect(() => {
    const currentTotalAmount = totalAmount;

    // Bỏ qua lần mount đầu tiên để không mất dữ liệu load từ DB
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      prevTotalAmountRef.current = currentTotalAmount;
      return;
    }

    // Nếu totalAmount thay đổi, reset lại installments theo loại thanh toán hiện tại
    if (
      prevTotalAmountRef.current !== null &&
      prevTotalAmountRef.current !== currentTotalAmount
    ) {
      setFormData(prev => {
        const resetInstallments =
          prev.paymentType === 'CASH'
            ? [
                { milestone: 'Đặt cọc', amount: 0, date: '' },
                { milestone: 'Thanh toán lần 1', amount: 0, date: '' },
                { milestone: 'Thanh toán lần 2', amount: 0, date: '' }
              ]
            : [
                { milestone: 'Đặt cọc', amount: 0, date: '' },
                { milestone: 'Thanh toán đối ứng', amount: 0, date: '' },
                { milestone: 'Ngân hàng giải ngân', amount: 0, date: '' }
              ];

        return {
          ...prev,
          installments: resetInstallments
        };
      });
    }

    // Cập nhật ref với giá trị hiện tại
    prevTotalAmountRef.current = currentTotalAmount;
  }, [totalAmount]);

  // Format số với dấu phẩy phân tách hàng nghìn
  const formatNumber = (value: number): string => {
    if (value === 0 || !value) return '';
    return new Intl.NumberFormat('vi-VN').format(value);
  };

  // Parse số từ string có dấu phẩy
  const parseNumber = (value: string): number => {
    const cleaned = value.replace(/[^\d]/g, '').trim();
    if (cleaned === '') return 0;
    const parsed = parseInt(cleaned, 10);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Format date from YYYY-MM-DD to dd/mm/yyyy
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString + 'T00:00:00'); // Add time to avoid timezone issues
      if (isNaN(date.getTime())) return '';
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return '';
    }
  };

  // Parse date from dd/mm/yyyy to YYYY-MM-DD
  const parseDate = (dateString: string): string => {
    if (!dateString) return '';
    const cleaned = dateString.trim();
    if (!cleaned) return '';
    
    // Match pattern: dd/mm/yyyy
    const match = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!match) return '';
    
    const [, day, month, year] = match;
    const dayNum = parseInt(day);
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);
    
    // Validate ranges
    if (dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12 || yearNum < 1900 || yearNum > 2100) {
      return '';
    }
    
    try {
      const date = new Date(yearNum, monthNum - 1, dayNum);
      if (isNaN(date.getTime())) return '';
      // Return YYYY-MM-DD format
      return `${yearNum}-${monthNum.toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
    } catch {
      return '';
    }
  };

  // Handle date input with auto-formatting for installments
  const handleInstallmentDateChange = (index: number, value: string) => {
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
    
    // Update installments with formatted string (store as dd/mm/yyyy for display)
    const newInstallments = [...formData.installments];
    newInstallments[index].date = formatted;
    setFormData({...formData, installments: newInstallments});
  };

  const isMarginLow = selectedVehicle ? formData.carPrice < selectedVehicle.cost : false;

  const handleNext = () => setStep(s => Math.min(s + 1, 4));
  const handleBack = () => setStep(s => Math.max(s - 1, 1));

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

  // Tính tổng giá trị hợp đồng
  const calculateTotalAmount = () => {
    const basePrice = priceAfterPromotion !== null && priceAfterPromotion > 0 
      ? priceAfterPromotion 
      : formData.carPrice;
    return basePrice + formData.registrationFee + formData.insuranceFee - formData.discount;
  };

  // Hàm lưu bản nháp
  const handleSaveDraft = async () => {
    if (!formData.customerName || !formData.customerPhone || !formData.vehicleId) {
      setSubmitError('Vui lòng nhập đầy đủ thông tin bắt buộc');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const userId = getCurrentUser();
      const finalTotalAmount = calculateTotalAmount();
      const promotionsData = formData.promotions.length > 0 
        ? formData.promotions.map(promo => ({
            code: promo.code,
            name: promo.name
          }))
        : null;

      const currentContractResponse = await fetch(`/api/contracts/${contractId}`, { cache: 'no-store' });
      const currentContractResult = await currentContractResponse.json();
      const previousVehicleId = currentContractResult?.contract?.vehicle_id || null;

      const newStatus = contractStatus === 'PENDING_APPROVAL' ? 'PENDING_APPROVAL' : 'DRAFT';
      const updatePayload: any = {
        customer_name: formData.customerName,
        customer_phone: formData.customerPhone,
        customer_id_card: formData.customerID || '',
        customer_address: formData.customerAddress || '',
        vehicle_id: formData.vehicleId,
        car_price: formData.carPrice,
        vat_amount: 0,
        registration_fee: formData.registrationFee,
        insurance_fee: formData.insuranceFee,
        discount: formData.discount,
        total_amount: finalTotalAmount,
        payment_type: formData.paymentType,
        bank_name: formData.paymentType === 'INSTALLMENT' ? (formData.bankName || null) : null,
        loan_amount: formData.paymentType === 'INSTALLMENT' 
          ? (formData.installments && formData.installments.length > 0 
              ? formData.installments[formData.installments.length - 1]?.amount || null 
              : null)
          : null,
        status: newStatus,
        updated_by: userId,
        promotions_json: promotionsData ? JSON.stringify(promotionsData) : null
      };

      const updateResponse = await fetch(`/api/contracts/${contractId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract: updatePayload })
      });
      const updateResult = await updateResponse.json();

      if (!updateResponse.ok) {
        throw new Error(updateResult?.error || 'Lỗi khi cập nhật hợp đồng');
      }

      if (previousVehicleId && previousVehicleId !== formData.vehicleId) {
        await fetch('/api/vehicles/reset-transaction-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vehicleId: previousVehicleId })
        });
      }

      const schedules = formData.installments
        .filter(inst => inst.amount > 0 && inst.date)
        .map(inst => ({
          contract_id: contractId,
          milestone_name: inst.milestone,
          amount: inst.amount,
          due_date: parseDate(inst.date),
          status: 'PENDING' as const
        }))
        .filter(schedule => schedule.due_date && schedule.due_date.trim() !== '');

      await fetch('/api/contracts/payment-schedules/replace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractId, schedules })
      });

      router.push('/contracts');
    } catch (error: any) {
      console.error('Save draft error:', error);
      setSubmitError(error.message || 'Có lỗi xảy ra khi lưu bản nháp. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalSave = async () => {
    if (!formData.customerName || !formData.customerPhone || !formData.vehicleId) {
      setSubmitError('Vui lòng nhập đầy đủ thông tin bắt buộc');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const userId = getCurrentUser();
      const finalTotalAmount = calculateTotalAmount();
      const promotionsData = formData.promotions.length > 0 
        ? formData.promotions.map(promo => ({
            code: promo.code,
            name: promo.name
          }))
        : null;

      const currentContractResponse = await fetch(`/api/contracts/${contractId}`, { cache: 'no-store' });
      const currentContractResult = await currentContractResponse.json();
      const previousVehicleId = currentContractResult?.contract?.vehicle_id || null;

      const updatePayload: any = {
        customer_name: formData.customerName,
        customer_phone: formData.customerPhone,
        customer_id_card: formData.customerID || '',
        customer_address: formData.customerAddress || '',
        vehicle_id: formData.vehicleId,
        car_price: formData.carPrice,
        vat_amount: 0,
        registration_fee: formData.registrationFee,
        insurance_fee: formData.insuranceFee,
        discount: formData.discount,
        total_amount: finalTotalAmount,
        payment_type: formData.paymentType,
        bank_name: formData.paymentType === 'INSTALLMENT' ? (formData.bankName || null) : null,
        loan_amount: formData.paymentType === 'INSTALLMENT' 
          ? (formData.installments && formData.installments.length > 0 
              ? formData.installments[formData.installments.length - 1]?.amount || null 
              : null)
          : null,
        status: 'PENDING_APPROVAL',
        updated_by: userId,
        promotions_json: promotionsData ? JSON.stringify(promotionsData) : null
      };

      const updateResponse = await fetch(`/api/contracts/${contractId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract: updatePayload })
      });
      const updateResult = await updateResponse.json();

      if (!updateResponse.ok) {
        throw new Error(updateResult?.error || 'Lỗi khi cập nhật hợp đồng');
      }

      if (previousVehicleId && previousVehicleId !== formData.vehicleId) {
        await fetch('/api/vehicles/reset-transaction-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vehicleId: previousVehicleId })
        });
      }

      const schedules = formData.installments
        .filter(inst => inst.amount > 0 && inst.date)
        .map(inst => ({
          contract_id: contractId,
          milestone_name: inst.milestone,
          amount: inst.amount,
          due_date: parseDate(inst.date),
          status: 'PENDING' as const
        }))
        .filter(schedule => schedule.due_date && schedule.due_date.trim() !== '');

      await fetch('/api/contracts/payment-schedules/replace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractId, schedules })
      });

      router.push('/contracts');
    } catch (error: any) {
      console.error('Submit error:', error);
      setSubmitError(error.message || 'Có lỗi xảy ra khi lưu dữ liệu. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignAndCreateReceipt = async () => {
    if (!formData.customerName || !formData.customerPhone || !formData.vehicleId) {
      setSubmitError('Vui lòng nhập đầy đủ thông tin bắt buộc');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const userId = getCurrentUser();
      const finalTotalAmount = calculateTotalAmount();
      const today = new Date().toISOString().split('T')[0];

      // Prepare promotions data for JSON storage
      const promotionsData = formData.promotions.length > 0 
        ? formData.promotions.map(promo => ({
            code: promo.code,
            name: promo.name
          }))
        : null;

      // Update contract trong database với status = PENDING_APPROVAL (chờ duyệt)
      // Giữ nguyên status PENDING_APPROVAL thay vì chuyển sang SIGNED/PAYING
      const { error: contractError } = await supabase
        .from('contracts')
        .update({
          customer_name: formData.customerName,
          customer_phone: formData.customerPhone,
          customer_id_card: formData.customerID || '',
          customer_address: formData.customerAddress || '',
          vehicle_id: formData.vehicleId,
          car_price: formData.carPrice,
          vat_amount: 0, // Có thể tính sau
          registration_fee: formData.registrationFee,
          insurance_fee: formData.insuranceFee,
          discount: formData.discount,
          total_amount: finalTotalAmount,
          payment_type: formData.paymentType,
          bank_name: formData.paymentType === 'INSTALLMENT' ? (formData.bankName || null) : null,
          loan_amount: formData.paymentType === 'INSTALLMENT' 
            ? (formData.installments && formData.installments.length > 0 
                ? formData.installments[formData.installments.length - 1]?.amount || null 
                : null)
            : null,
          status: 'PENDING_APPROVAL',
          updated_by: userId,
          promotions_json: promotionsData ? JSON.stringify(promotionsData) : null
        })
        .eq('id', contractId);

      if (contractError) {
        throw new Error(`Lỗi khi cập nhật hợp đồng: ${contractError.message}`);
      }

      // Xóa và tạo lại payment schedules
      const { error: deleteError } = await supabase
        .from('payment_schedules')
        .delete()
        .eq('contract_id', contractId);

      if (deleteError) {
        console.error('Error deleting payment schedules:', deleteError);
      }

      // Lưu payment schedules mới
      const schedules = formData.installments
        .filter(inst => inst.amount > 0 && inst.date)
        .map(inst => ({
          contract_id: contractId,
          milestone_name: inst.milestone,
          amount: inst.amount,
          due_date: parseDate(inst.date),
          status: 'PENDING' as const
        }))
        .filter(schedule => schedule.due_date && schedule.due_date.trim() !== ''); // Lọc bỏ các schedule có due_date rỗng

      if (schedules.length > 0) {
        const { error: schedulesError, data } = await supabase
          .from('payment_schedules')
          .insert(schedules);

        if (schedulesError) {
          console.error('Error saving payment schedules:', {
            error: schedulesError,
            message: schedulesError.message,
            details: schedulesError.details,
            hint: schedulesError.hint,
            code: schedulesError.code,
            schedules: schedules
          });
          // Không throw error vì contract đã được lưu
        }
      }

      // Cập nhật trạng thái xe thành SOLD (nếu chưa SOLD)
      const { error: vehicleError } = await supabase
        .from('vehicles')
        .update({ 
          status: VehicleStatus.SOLD,
          updated_by: userId
        })
        .eq('id', formData.vehicleId)
        .neq('status', VehicleStatus.SOLD);

      if (vehicleError) {
        console.error('Error updating vehicle status:', vehicleError);
        // Không throw error vì contract đã được lưu
      }

      // Lấy thông tin khách hàng để prefill
      const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
      
      // Tính số tiền cho phiếu thu (đợt thanh toán đầu tiên hoặc tổng tiền)
      const firstInstallment = formData.installments.find(inst => inst.amount > 0);
      const receiptAmount = firstInstallment && firstInstallment.amount > 0 
        ? firstInstallment.amount 
        : finalTotalAmount;

      // Tạo mô tả cho phiếu thu
      const receiptDescription = firstInstallment && firstInstallment.amount > 0
        ? `Thu tiền: ${firstInstallment.milestone} - Hợp đồng mua bán xe - Khách hàng ${formData.customerName}`
        : `Thu tiền: Hợp đồng mua bán xe - Khách hàng ${formData.customerName}`;

      // Tạo prefill data cho trang tạo phiếu thu
      const prefillData = {
        referenceId: contractId,
        referenceType: 'CONTRACT',
        amount: receiptAmount,
        category: TransactionCategory.CAR_SALE,
        description: receiptDescription,
        customerName: formData.customerName,
        bankName: selectedCustomer?.bankName || formData.bankName || undefined,
        bankAccount: selectedCustomer?.bankAccount || formData.bankAccount || undefined
      };

      // Encode prefill data và chuyển đến trang tạo phiếu thu
      const prefillParam = encodeURIComponent(JSON.stringify(prefillData));
      router.push(`/finance/new?type=INCOME&prefill=${prefillParam}`);
    } catch (error: any) {
      console.error('Submit error:', error);
      setSubmitError(error.message || 'Có lỗi xảy ra khi lưu dữ liệu. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-0">
      {[
        { s: 1, label: 'Khách hàng', icon: <User size={16} /> },
        { s: 2, label: 'Chọn xe và CTKM', icon: <Car size={16} /> },
        { s: 3, label: 'Thanh toán', icon: <CreditCard size={16} /> },
        { s: 4, label: 'Xác nhận', icon: <CheckCircle2 size={16} /> },
      ].map((item, idx) => (
        <React.Fragment key={item.s}>
          <div className="flex flex-col items-center relative">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
              step >= item.s ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white border-slate-200 text-slate-400'
            }`}>
              {step > item.s ? <CheckCircle2 size={20} /> : item.icon}
            </div>
            <span className={`absolute -bottom-6 whitespace-nowrap text-[10px] font-black uppercase tracking-widest ${
              step >= item.s ? 'text-blue-600' : 'text-slate-400'
            }`}>
              {item.label}
            </span>
          </div>
          {idx < 3 && (
            <div className={`w-12 md:w-20 h-0.5 mx-2 ${step > item.s ? 'bg-blue-600' : 'bg-slate-200'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-500">Đang tải dữ liệu hợp đồng...</p>
        </div>
      </div>
    );
  }

  // Nếu hợp đồng đã ký, hiển thị thông báo không cho phép chỉnh sửa
  if (contractStatus === 'SIGNED' || contractStatus === 'PAYING' || contractStatus === 'COMPLETED') {
    return (
      <div className="space-y-8">
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden p-10">
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={40} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-4">Không thể chỉnh sửa hợp đồng</h3>
            <p className="text-slate-600 mb-2 font-bold">
              Hợp đồng đã được ký và không thể chỉnh sửa.
            </p>
            <p className="text-sm text-slate-500 mb-8">
              Chỉ có thể chỉnh sửa các hợp đồng ở trạng thái "Nháp" (DRAFT) hoặc "Chờ duyệt" (PENDING_APPROVAL).
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => router.back()}
                className="px-8 py-3 bg-blue-600 text-white rounded-2xl text-sm font-bold hover:bg-blue-700 transition-all shadow-sm"
              >
                Quay lại
              </button>
              <button
                onClick={() => router.push(`/contracts/${contractId}`)}
                className="px-8 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all"
              >
                Xem chi tiết
              </button>
            </div>
          </div>
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
               <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-tighter">Hợp đồng điện tử</span>
               <span className="text-xs font-bold text-slate-500">Hợp đồng Mua bán xe</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900">Sửa hợp đồng</h2>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        {/* Step Indicator Section */}
        <div className="px-10 py-8 bg-slate-50/50 border-b border-slate-100">
          {renderStepIndicator()}
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-10 space-y-10">
          {step === 1 && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-2">
                 <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                   <User size={18} />
                 </div>
                 <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">1. Thông tin định danh khách hàng</h3>
              </div>
              
              {/* Customer Selection Dropdown */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 space-y-3">
                <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                  <Search size={14} /> Chọn khách hàng từ danh sách
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none" size={18} />
                  <select 
                    value={selectedCustomerId}
                    onChange={(e) => handleCustomerSelect(e.target.value)}
                    className="w-full pl-12 pr-10 py-3 bg-white border-2 border-blue-300 rounded-2xl text-sm font-bold outline-none appearance-none focus:ring-4 focus:ring-blue-500/20 transition-all cursor-pointer"
                  >
                    <option value="">-- Chọn khách hàng từ danh sách --</option>
                    {customers.map(customer => (
                      <option key={customer.id} value={customer.id}>
                        {customer.code} - {customer.name} ({customer.phone}) {customer.type === CustomerType.CORPORATE ? '- Doanh nghiệp' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedCustomerId && (
                  <div className="flex items-center gap-2 text-xs text-blue-700 font-bold">
                    <CheckCircle2 size={14} /> Đã chọn khách hàng - Thông tin sẽ tự động điền
                  </div>
                )}
              </div>

              {/* Thông tin cơ bản - Chỉ hiển thị khi đã chọn khách hàng */}
              {selectedCustomerId && (
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                    <User size={14} /> Thông tin cơ bản
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Họ và tên khách hàng *</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                        <input 
                          required
                          type="text" 
                          readOnly
                          placeholder="Nguyễn Văn A"
                          className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none transition-all cursor-not-allowed opacity-75"
                          value={formData.customerName}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Số điện thoại *</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                        <input 
                          required
                          type="text" 
                          readOnly
                          placeholder="09xx xxx xxx"
                          className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none transition-all cursor-not-allowed opacity-75"
                          value={formData.customerPhone}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {selectedCustomerType === CustomerType.CORPORATE ? 'Mã số thuế *' : 'CCCD / CMND *'}
                      </label>
                      <div className="relative">
                        <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                        <input 
                          required
                          type="text" 
                          readOnly
                          className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none transition-all cursor-not-allowed opacity-75"
                          value={formData.customerID}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                        <input 
                          type="email" 
                          readOnly
                          className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none transition-all cursor-not-allowed opacity-75"
                          value={formData.customerEmail}
                        />
                      </div>
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Địa chỉ liên hệ</label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-4 text-slate-400 pointer-events-none" size={18} />
                        <textarea 
                          rows={2}
                          readOnly
                          className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none transition-all cursor-not-allowed opacity-75"
                          value={formData.customerAddress}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Thông tin cá nhân (chỉ hiển thị cho cá nhân) */}
              {selectedCustomerType === CustomerType.INDIVIDUAL && (
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                    <UserCircle size={14} /> Thông tin cá nhân
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngày sinh</label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                        <input 
                          type="date" 
                          readOnly
                          className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none transition-all cursor-not-allowed opacity-75"
                          value={formData.dateOfBirth}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Giới tính</label>
                      <div className="relative">
                        <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                        <select 
                          disabled
                          className="w-full pl-12 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none appearance-none transition-all cursor-not-allowed opacity-75"
                          value={formData.gender}
                        >
                          <option value="">-- Chọn giới tính --</option>
                          <option value="Nam">Nam</option>
                          <option value="Nữ">Nữ</option>
                          <option value="Khác">Khác</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngày cấp CCCD</label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                        <input 
                          type="date" 
                          readOnly
                          className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none transition-all cursor-not-allowed opacity-75"
                          value={formData.idCardIssueDate}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nơi cấp CCCD</label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                        <input 
                          type="text" 
                          readOnly
                          placeholder="Công an tỉnh/TP..."
                          className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none transition-all cursor-not-allowed opacity-75"
                          value={formData.idCardIssuePlace}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Thông tin doanh nghiệp (chỉ hiển thị cho doanh nghiệp) */}
              {selectedCustomerType === CustomerType.CORPORATE && (
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                    <Building2 size={14} /> Thông tin doanh nghiệp
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tên doanh nghiệp *</label>
                      <div className="relative">
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                        <input 
                          type="text" 
                          readOnly
                          className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none transition-all cursor-not-allowed opacity-75"
                          value={formData.companyName}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Người đại diện</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                        <input 
                          type="text" 
                          readOnly
                          placeholder="Họ và tên người đại diện"
                          className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none transition-all cursor-not-allowed opacity-75"
                          value={formData.representative}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chức vụ</label>
                      <div className="relative">
                        <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                        <input 
                          type="text" 
                          readOnly
                          placeholder="Giám đốc, Chủ tịch..."
                          className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none transition-all cursor-not-allowed opacity-75"
                          value={formData.position}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Thông tin ngân hàng - Chỉ hiển thị khi đã chọn khách hàng */}
              {selectedCustomerId && (
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                    <Landmark size={14} /> Thông tin tài khoản ngân hàng
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tên ngân hàng</label>
                      <div className="relative">
                        <Landmark className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                        <input 
                          type="text" 
                          readOnly
                          placeholder="Techcombank, TPBank..."
                          className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none transition-all cursor-not-allowed opacity-75"
                          value={formData.bankName}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Số tài khoản</label>
                      <div className="relative">
                        <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                        <input 
                          type="text" 
                          readOnly
                          placeholder="0123456789"
                          className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none transition-all cursor-not-allowed opacity-75"
                          value={formData.bankAccount}
                        />
                      </div>
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chi nhánh ngân hàng</label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                        <input 
                          type="text" 
                          readOnly
                          placeholder="Chi nhánh / Phòng giao dịch..."
                          className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none transition-all cursor-not-allowed opacity-75"
                          value={formData.bankBranch}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-2">
                 <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
                   <Car size={18} />
                 </div>
                 <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">2. Chọn mẫu xe từ kho (chỉ làm mẫu, chưa ghép VIN)</h3>
              </div>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
                  <select 
                    className="w-full pl-12 pr-10 py-4 bg-slate-50 border border-slate-200 rounded-3xl text-sm font-black outline-none appearance-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                    value={formData.vehicleId}
                    onChange={e => {
                      const selectedVehicle = vehicles.find(v => v.id === e.target.value);
                      setFormData({
                        ...formData, 
                        vehicleId: e.target.value, 
                        carPrice: selectedVehicle?.price || 0
                      });
                    }}
                  >
                    <option value="">-- Tìm kiếm mẫu xe theo Model / màu / phiên bản --</option>
                    {vehicles.map(v => {
                      const rawData = vehiclesRawData.find(r => r.id === v.id);
                      const parts = [];
                      if (v.model) parts.push(`Model xe: ${v.model}`);
                      if (rawData?.version) parts.push(`Phiên bản: ${rawData.version}`);
                      if (v.year) parts.push(`Năm sản xuất: ${v.year}`);
                      if (v.color) parts.push(`Màu ngoại thất: ${v.color}`);
                      if (rawData?.interior_color) parts.push(`Màu nội thất: ${rawData.interior_color}`);
                      return (
                        <option key={v.id} value={v.id}>
                          {parts.join(' | ')}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {selectedVehicle ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Hình ảnh xe */}
                    <div className="md:col-span-1">
                      {selectedVehicle.images && selectedVehicle.images.length > 0 ? (
                        <div className="bg-slate-100 rounded-[32px] overflow-hidden border-2 border-slate-200 shadow-sm">
                          <img 
                            src={selectedVehicle.images[0]} 
                            alt={`${selectedVehicle.make} ${selectedVehicle.model}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="bg-slate-100 rounded-[32px] flex items-center justify-center p-8 text-slate-400 border-2 border-dashed border-slate-200 h-full min-h-[200px]">
                          <Car size={80} strokeWidth={1} />
                        </div>
                      )}
                    </div>

                    {/* Thông tin chi tiết */}
                    <div className="md:col-span-2 space-y-6">
                      <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-200 shadow-sm">
                        <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest mb-6 flex items-center gap-2">
                          <Car size={14} /> Thông tin cơ bản
                        </h4>
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Mã xe</p>
                            <p className="text-base font-black text-slate-900">{selectedVehicle.code || 'Mẫu tạm thời'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Model xe</p>
                            <p className="text-base font-black text-slate-900">{selectedVehicle.make} {selectedVehicle.model}</p>
                            {selectedVehicleRaw?.version && (
                              <p className="text-sm text-slate-600 font-bold mt-1">{selectedVehicleRaw.version}</p>
                            )}
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Số VIN</p>
                            {(contractStatus === 'SIGNED' || contractStatus === 'PAYING' || contractStatus === 'COMPLETED') ? (
                              <p className={`text-base font-mono font-bold tracking-tighter ${canViewSensitiveInfo() ? 'text-slate-900' : 'text-slate-400 blur-sm'}`}>
                                {maskSensitiveInfo(selectedVehicle.vin)}
                              </p>
                            ) : (
                              <p className="text-base font-mono font-bold tracking-tighter text-slate-400">
                                Sẽ được ghép sau khi duyệt hợp đồng (không hiển thị số khung thực tế)
                              </p>
                            )}
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Số máy</p>
                            {(contractStatus === 'SIGNED' || contractStatus === 'PAYING' || contractStatus === 'COMPLETED') ? (
                              selectedVehicleRaw?.engine_number ? (
                                <p className={`text-base font-mono font-bold tracking-tighter ${canViewSensitiveInfo() ? 'text-slate-900' : 'text-slate-400 blur-sm'}`}>
                                  {maskSensitiveInfo(selectedVehicleRaw.engine_number)}
                                </p>
                              ) : (
                                <p className="text-base font-bold text-slate-400">--</p>
                              )
                            ) : (
                              <p className="text-base font-mono font-bold tracking-tighter text-slate-400">
                                Sẽ được ghép sau khi duyệt hợp đồng (không hiển thị số máy thực tế)
                              </p>
                            )}
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Năm sản xuất</p>
                            <div className="flex items-center gap-2">
                              <Calendar size={16} className="text-slate-400" />
                              <p className="text-base font-bold text-slate-900">{selectedVehicle.year || '--'}</p>
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Loại xe</p>
                            <p className="text-base font-bold text-slate-900">
                              {selectedVehicle.type === 'NEW' ? 'Xe mới' : 
                               selectedVehicle.type === 'USED' ? 'Xe đã qua sử dụng' : 
                               selectedVehicle.type === 'EV' ? 'Xe điện' : '--'}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Màu sắc</p>
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded-full border border-slate-200 shadow-sm" style={{backgroundColor: selectedVehicle.color?.toLowerCase() || '#ccc'}}></div>
                              <p className="text-base font-bold text-slate-900">{selectedVehicle.color || '--'}</p>
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Giá niêm yết</p>
                            <p className="text-base font-black text-slate-900">
                              {selectedVehicle.price ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedVehicle.price) : '--'}
                            </p>
                          </div>
                          {selectedVehicle.mileage !== undefined && selectedVehicle.mileage !== null && (
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Số km đã đi</p>
                              <div className="flex items-center gap-2">
                                <Gauge size={16} className="text-slate-400" />
                                <p className="text-base font-bold text-slate-900">
                                  {new Intl.NumberFormat('vi-VN').format(selectedVehicle.mileage)} km
                                </p>
                              </div>
                            </div>
                          )}
                          {selectedVehicle.batteryHealth !== undefined && selectedVehicle.batteryHealth !== null && (
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Tình trạng pin</p>
                              <div className="flex items-center gap-2">
                                <Battery size={16} className="text-slate-400" />
                                <p className="text-base font-bold text-slate-900">{selectedVehicle.batteryHealth}%</p>
                              </div>
                            </div>
                          )}
                          {selectedVehicleRaw?.interior_color && (
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Màu nội thất</p>
                              <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full border border-slate-200 shadow-sm" style={{backgroundColor: selectedVehicleRaw.interior_color?.toLowerCase() || '#ccc'}}></div>
                                <p className="text-base font-bold text-slate-900">{selectedVehicleRaw.interior_color}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Áp dụng chương trình khuyến mãi */}
                      <div className="bg-gradient-to-br from-emerald-50 to-blue-50 p-8 rounded-[32px] border-2 border-emerald-200 shadow-sm">
                        <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest mb-6 flex items-center gap-2">
                          <Gift size={14} className="text-emerald-600" /> Áp dụng chương trình khuyến mãi
                        </h4>
                        
                        {/* Danh sách checkbox để chọn chương trình */}
                        <div className="space-y-3 mb-6">
                          {availablePromotions.map((promo) => {
                            const isSelected = formData.promotions.some(p => p.code === promo.code);
                            return (
                              <label
                                key={promo.code}
                                className={`flex items-center gap-3 p-4 bg-white border-2 rounded-2xl cursor-pointer transition-all hover:border-emerald-400 ${
                                  isSelected ? 'border-emerald-500 bg-emerald-50' : 'border-emerald-200'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      // Thêm vào danh sách nếu chưa có
                                      if (!formData.promotions.some(p => p.code === promo.code)) {
                                        setFormData({
                                          ...formData,
                                          promotions: [...formData.promotions, promo]
                                        });
                                      }
                                    } else {
                                      // Xóa khỏi danh sách
                                      setFormData({
                                        ...formData,
                                        promotions: formData.promotions.filter(p => p.code !== promo.code)
                                      });
                                    }
                                  }}
                                  className="w-5 h-5 text-emerald-600 border-2 border-emerald-300 rounded focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                                />
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-black text-slate-900">
                                      {promo.code} - {promo.name}
                                    </span>
                                    <span className="text-xs font-bold text-emerald-700">
                                      {promo.discount_type === 'PERCENTAGE'
                                        ? `Giảm ${promo.discount_value}%`
                                        : promo.discount_type === 'FIXED_AMOUNT'
                                        ? `Giảm ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(promo.discount_value)}`
                                        : 'Tặng quà'}
                                    </span>
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>

                        {/* Hiển thị danh sách chương trình đã chọn */}
                        {formData.promotions.length > 0 && (
                          <div className="space-y-3 pt-6 border-t border-emerald-200">
                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-3">
                              Các chương trình đã chọn ({formData.promotions.length})
                            </p>
                            <div className="space-y-2">
                              {formData.promotions.map((promo) => (
                                <div
                                  key={promo.code}
                                  className="flex items-center justify-between p-3 bg-white border border-emerald-300 rounded-xl"
                                >
                                  <div className="flex items-center gap-3">
                                    <Gift size={16} className="text-emerald-600" />
                                    <div>
                                      <p className="text-sm font-black text-slate-900">{promo.name}</p>
                                      <p className="text-xs text-slate-500 font-bold">{promo.code}</p>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFormData({
                                        ...formData,
                                        promotions: formData.promotions.filter(p => p.code !== promo.code)
                                      });
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Giá xe trên hợp đồng sau khuyến mãi */}
                        {priceAfterPromotion !== null && priceAfterPromotion > 0 && (
                          <div className="mt-6 pt-6 border-t-2 border-emerald-300">
                            <div className="bg-white/80 border-2 border-emerald-400 rounded-2xl p-6">
                              <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <DollarSign size={14} className="text-emerald-600" /> Giá xe trên hợp đồng (sau khuyến mãi)
                              </p>
                              <p className="text-3xl font-black text-emerald-700">
                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(priceAfterPromotion)}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-2">
                 <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                   <DollarSign size={18} />
                 </div>
                 <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">3. Định giá & Phương thức thanh toán</h3>
              </div>
              <div className="grid grid-cols-1 gap-8">
                <div className="bg-slate-900 text-white p-8 rounded-[40px] shadow-2xl overflow-hidden relative">
                   {/* Header - Giá trị giao dịch */}
                   <div className="relative z-10 mb-8">
                      <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-2">Giá trị giao dịch cuối cùng</p>
                      <h3 className="text-4xl font-black text-emerald-400">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalAmount)}</h3>
                   </div>
                   
                   {/* Kế hoạch thanh toán */}
                   <div className="relative z-10 space-y-6">
                      <div className="flex justify-between items-center">
                        <span className="text-white/60 text-xs font-bold uppercase tracking-tight">Kế hoạch thanh toán</span>
                        <div className="flex bg-white/10 p-1 rounded-xl gap-1">
                           <button 
                             type="button"
                             onClick={() => {
                               setFormData({
                                 ...formData, 
                                 paymentType: 'CASH',
                                 installments: [
                                   { milestone: 'Đặt cọc', amount: 0, date: '' },
                                   { milestone: 'Thanh toán lần 1', amount: 0, date: '' },
                                   { milestone: 'Thanh toán lần 2', amount: 0, date: '' }
                                 ]
                               });
                             }}
                             className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${formData.paymentType === 'CASH' ? 'bg-white text-slate-900 shadow-md' : 'text-white/60'}`}
                           >Trả thẳng</button>
                           <button 
                             type="button"
                             onClick={() => {
                               setFormData({
                                 ...formData, 
                                 paymentType: 'INSTALLMENT',
                                 installments: [
                                   { milestone: 'Đặt cọc', amount: 0, date: '' },
                                   { milestone: 'Thanh toán đối ứng', amount: 0, date: '' },
                                   { milestone: 'Ngân hàng giải ngân', amount: 0, date: '' }
                                 ]
                               });
                             }}
                             className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${formData.paymentType === 'INSTALLMENT' ? 'bg-white text-slate-900 shadow-md' : 'text-white/60'}`}
                           >Trả góp</button>
                        </div>
                      </div>
                      
                      {/* Form nhập 3 lần thanh toán */}
                      {(formData.paymentType === 'CASH' || formData.paymentType === 'INSTALLMENT') && (
                        <div className="pt-6 border-t border-white/10 space-y-4">
                          <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-4">
                            {formData.paymentType === 'CASH' ? 'Kế hoạch thanh toán (3 lần)' : 'Kế hoạch thanh toán trả góp (3 lần)'}
                          </p>
                          <div className="space-y-4">
                            {formData.installments.map((installment, index) => (
                              <div key={index} className="bg-white/5 rounded-xl p-4 space-y-3">
                                <label className="text-white/80 text-xs font-black uppercase block mb-2">{installment.milestone}</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-white/40 text-[10px] font-bold uppercase mb-1.5 block">Số tiền (VNĐ)</label>
                                    <div className="relative">
                                      <input
                                        type="text"
                                        inputMode="numeric"
                                        className="w-full px-3 py-2.5 pr-16 bg-white/10 border border-white/20 rounded-lg text-sm font-bold text-white placeholder-white/30 outline-none focus:bg-white/20 focus:border-white/40 transition-all"
                                        placeholder="0"
                                        value={formatNumber(installment.amount)}
                                        onChange={(e) => {
                                          const numValue = parseNumber(e.target.value);
                                          const newInstallments = [...formData.installments];
                                          newInstallments[index].amount = numValue;
                                          
                                          // Khi nhập lần thanh toán thứ 1 (index 0) hoặc thứ 2 (index 1),
                                          // tự động tính lần thanh toán thứ 3 (index 2) = tổng giá trị - lần 1 - lần 2
                                          if ((index === 0 || index === 1) && newInstallments.length > 2) {
                                            const firstPayment = index === 0 ? numValue : newInstallments[0].amount;
                                            const secondPayment = index === 1 ? numValue : newInstallments[1].amount;
                                            const thirdPayment = totalAmount - firstPayment - secondPayment;
                                            newInstallments[2].amount = Math.max(0, thirdPayment);
                                          }
                                          
                                          setFormData({...formData, installments: newInstallments});
                                        }}
                                      />
                                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-white/60">VNĐ</span>
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-white/40 text-[10px] font-bold uppercase mb-1.5 block">Ngày thanh toán</label>
                                    <input
                                      type="text"
                                      placeholder="dd/mm/yyyy"
                                      maxLength={10}
                                      className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-sm font-bold text-white placeholder-white/30 outline-none focus:bg-white/20 focus:border-white/40 transition-all"
                                      value={installment.date || ''}
                                      onChange={(e) => handleInstallmentDateChange(index, e.target.value)}
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                   </div>
                   <DollarSign className="absolute -bottom-10 -right-10 text-white/5" size={200} />
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300 text-center py-10">
               <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-50">
                  <CheckCircle2 size={40} />
               </div>
               <h4 className="text-2xl font-black text-slate-900">Kiểm tra thông tin hợp đồng</h4>
               <p className="text-slate-500 max-w-md mx-auto">Vui lòng rà soát lại thông tin khách hàng và xe trước khi tiến hành tạo phiếu thu và khóa xe trên kho hàng.</p>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left mt-10">
                  <div className="p-8 bg-slate-50 rounded-[32px] border border-slate-100 space-y-4">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Khách hàng</h5>
                    
                    {/* Thông tin cơ bản */}
                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Họ và tên</p>
                        <p className="text-lg font-black text-slate-900">{formData.customerName || '--'}</p>
                      </div>
                      
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Số điện thoại</p>
                        <p className="text-sm text-slate-700 font-bold">{formData.customerPhone || '--'}</p>
                      </div>
                      
                      {formData.customerEmail && (
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Email</p>
                          <p className="text-sm text-slate-700 font-bold">{formData.customerEmail}</p>
                        </div>
                      )}
                      
                      {formData.customerAddress && (
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Địa chỉ</p>
                          <p className="text-sm text-slate-700 font-bold">{formData.customerAddress}</p>
                        </div>
                      )}
                      
                      {formData.customerID && (
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                            {selectedCustomerType === CustomerType.CORPORATE ? 'Mã số thuế' : 'CCCD / CMND'}
                          </p>
                          <p className="text-sm text-slate-700 font-bold font-mono">{formData.customerID}</p>
                        </div>
                      )}
                    </div>

                    {/* Thông tin cá nhân (nếu là cá nhân) */}
                    {selectedCustomerType === CustomerType.INDIVIDUAL && (
                      <div className="pt-4 border-t border-slate-200 space-y-3">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Thông tin cá nhân</p>
                        {formData.dateOfBirth && (
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ngày sinh</p>
                            <p className="text-sm text-slate-700 font-bold">{formData.dateOfBirth}</p>
                          </div>
                        )}
                        {formData.gender && (
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Giới tính</p>
                            <p className="text-sm text-slate-700 font-bold">{formData.gender}</p>
                          </div>
                        )}
                        {formData.idCardIssueDate && (
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ngày cấp CCCD</p>
                            <p className="text-sm text-slate-700 font-bold">{formData.idCardIssueDate}</p>
                          </div>
                        )}
                        {formData.idCardIssuePlace && (
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nơi cấp CCCD</p>
                            <p className="text-sm text-slate-700 font-bold">{formData.idCardIssuePlace}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Thông tin doanh nghiệp (nếu là doanh nghiệp) */}
                    {selectedCustomerType === CustomerType.CORPORATE && (
                      <div className="pt-4 border-t border-slate-200 space-y-3">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Thông tin doanh nghiệp</p>
                        {formData.companyName && (
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tên công ty</p>
                            <p className="text-sm text-slate-700 font-bold">{formData.companyName}</p>
                          </div>
                        )}
                        {formData.representative && (
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Người đại diện</p>
                            <p className="text-sm text-slate-700 font-bold">{formData.representative}</p>
                          </div>
                        )}
                        {formData.position && (
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Chức vụ</p>
                            <p className="text-sm text-slate-700 font-bold">{formData.position}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Thông tin ngân hàng */}
                    {(formData.bankName || formData.bankAccount || formData.bankBranch) && (
                      <div className="pt-4 border-t border-slate-200 space-y-3">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Thông tin ngân hàng</p>
                        {formData.bankName && (
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tên ngân hàng</p>
                            <p className="text-sm text-slate-700 font-bold">{formData.bankName}</p>
                          </div>
                        )}
                        {formData.bankAccount && (
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Số tài khoản</p>
                            <p className="text-sm text-slate-700 font-bold font-mono">{formData.bankAccount}</p>
                          </div>
                        )}
                        {formData.bankBranch && (
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Chi nhánh</p>
                            <p className="text-sm text-slate-700 font-bold">{formData.bankBranch}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="p-8 bg-slate-50 rounded-[32px] border border-slate-100 space-y-4">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Xe giao dịch</h5>
                    
                    {/* Thông tin cơ bản */}
                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Mã xe</p>
                        <p className="text-sm text-slate-700 font-bold font-mono">{selectedVehicle?.code || 'Mẫu tạm thời'}</p>
                      </div>
                      
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Model xe</p>
                        <p className="text-lg font-black text-slate-900">{selectedVehicle?.make} {selectedVehicle?.model}</p>
                        {selectedVehicleRaw?.version && (
                          <p className="text-sm text-slate-600 font-bold mt-1">{selectedVehicleRaw.version}</p>
                        )}
                      </div>
                      
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Số VIN (Khung)</p>
                        {(contractStatus === 'SIGNED' || contractStatus === 'PAYING' || contractStatus === 'COMPLETED') ? (
                          <p className={`text-sm font-mono font-black uppercase tracking-tighter ${canViewSensitiveInfo() ? 'text-blue-600' : 'text-slate-400 blur-sm'}`}>
                            {maskSensitiveInfo(selectedVehicle?.vin || '--')}
                          </p>
                        ) : (
                          <p className="text-sm font-mono font-bold tracking-tighter text-slate-400">
                            Sẽ được ghép sau khi duyệt hợp đồng (không hiển thị số khung thực tế)
                          </p>
                        )}
                      </div>
                      
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Số máy</p>
                        {(contractStatus === 'SIGNED' || contractStatus === 'PAYING' || contractStatus === 'COMPLETED') ? (
                          selectedVehicleRaw?.engine_number ? (
                            <p className={`text-sm font-mono font-black uppercase tracking-tighter ${canViewSensitiveInfo() ? 'text-slate-700' : 'text-slate-400 blur-sm'}`}>
                              {maskSensitiveInfo(selectedVehicleRaw.engine_number)}
                            </p>
                          ) : (
                            <p className="text-sm font-bold text-slate-400">--</p>
                          )
                        ) : (
                          <p className="text-sm font-mono font-bold tracking-tighter text-slate-400">
                            Sẽ được ghép sau khi duyệt hợp đồng (không hiển thị số máy thực tế)
                          </p>
                        )}
                      </div>
                      
                      {selectedVehicle?.year && (
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Năm sản xuất</p>
                          <p className="text-sm text-slate-700 font-bold">{selectedVehicle.year}</p>
                        </div>
                      )}
                      
                      {selectedVehicle?.type && (
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Loại xe</p>
                          <p className="text-sm text-slate-700 font-bold">
                            {selectedVehicle.type === 'NEW' ? 'Xe mới' : 
                             selectedVehicle.type === 'USED' ? 'Xe đã qua sử dụng' : 
                             selectedVehicle.type === 'EV' ? 'Xe điện' : '--'}
                          </p>
                        </div>
                      )}
                      
                      {selectedVehicle?.color && (
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Màu ngoại thất</p>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full border border-slate-200 shadow-sm" style={{backgroundColor: selectedVehicle.color.toLowerCase()}}></div>
                            <p className="text-sm text-slate-700 font-bold">{selectedVehicle.color}</p>
                          </div>
                        </div>
                      )}
                      
                      {selectedVehicleRaw?.interior_color && (
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Màu nội thất</p>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full border border-slate-200 shadow-sm" style={{backgroundColor: selectedVehicleRaw.interior_color.toLowerCase()}}></div>
                            <p className="text-sm text-slate-700 font-bold">{selectedVehicleRaw.interior_color}</p>
                          </div>
                        </div>
                      )}
                      
                      {selectedVehicle?.mileage !== undefined && selectedVehicle.mileage !== null && (
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Số km đã đi</p>
                          <p className="text-sm text-slate-700 font-bold">{new Intl.NumberFormat('vi-VN').format(selectedVehicle.mileage)} km</p>
                        </div>
                      )}
                      
                      {selectedVehicle?.batteryHealth !== undefined && selectedVehicle.batteryHealth !== null && (
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tình trạng pin</p>
                          <p className="text-sm text-slate-700 font-bold">{selectedVehicle.batteryHealth}%</p>
                        </div>
                      )}
                    </div>

                    {/* Thông tin giá và vị trí */}
                    <div className="pt-4 border-t border-slate-200 space-y-3">
                      {selectedVehicle?.price && (
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Giá niêm yết</p>
                          <p className="text-sm text-slate-900 font-black">
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedVehicle.price)}
                          </p>
                        </div>
                      )}
                      
                      {selectedVehicleRaw?.vehicle_position && (
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Vị trí xe</p>
                          <p className="text-sm text-slate-700 font-bold">{selectedVehicleRaw.vehicle_position}</p>
                        </div>
                      )}
                      
                      {selectedVehicle?.transactionStatus && (
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Trạng thái giao dịch</p>
                          <p className="text-sm text-slate-700 font-bold">{selectedVehicle.transactionStatus}</p>
                        </div>
                      )}
                    </div>
                  </div>
               </div>
            </div>
          )}
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
          <div className="flex justify-between items-center">
            <button 
              onClick={handleBack}
              disabled={step === 1}
              className={`flex items-center gap-2 px-8 py-3 rounded-2xl text-sm font-bold transition-all ${
                step === 1 ? 'opacity-0 pointer-events-none' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 shadow-sm'
              }`}
            >
              <ChevronLeft size={18} /> Quay lại
            </button>
            
            <div className="flex gap-4">
              {step < 4 ? (
                <button 
                  type="button"
                  onClick={handleNext}
                  disabled={
                    (step === 1 && !selectedCustomerId) || 
                    (step === 2 && !formData.vehicleId)
                  }
                  className="flex items-center gap-2 px-10 py-3 bg-blue-600 text-white rounded-2xl text-sm font-black hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed"
                >
                  Tiếp tục thiết lập <ChevronRight size={18} />
                </button>
              ) : (
                <button 
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-10 py-3 bg-emerald-600 text-white rounded-2xl text-sm font-black hover:bg-emerald-700 shadow-xl shadow-emerald-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <Save size={18} /> Lưu lại
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

