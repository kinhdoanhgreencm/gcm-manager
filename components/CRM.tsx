'use client'

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Plus, Search, Filter, User, Phone, 
  Mail, MapPin, 
  ChevronRight, ArrowUpRight, 
  FileText, Receipt, Car, Clock,
  History, Building2, UserCircle,
  AlertCircle, CheckCircle2, BadgeCheck,
  Users, Loader2, Landmark, CreditCard,
  Calendar, Hash, Briefcase, Target, ShieldCheck,
  Edit, Trash2, X
} from 'lucide-react';
import { MOCK_SALES_CONTRACTS, MOCK_TRANSACTIONS } from '@/constants';
import { Customer, CustomerType, CustomerStatus, SalesContract, ContractStatus, TransactionStatus } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useReload } from '@/contexts/ReloadContext';
import { hasAnyPermission, PermissionCategories } from '@/utils/permissions';
import { AccessDenied } from './AccessDenied';

interface CustomerPaymentRow {
  id: string;
  date: string;
  amount: number;
  description: string;
  status: TransactionStatus;
}

export const CRM: React.FC = () => {
  const { user } = useAuth();
  const { reloadKey } = useReload();
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'contracts' | 'payments' | 'history'>('overview');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deliveredCount, setDeliveredCount] = useState(0);
  const [runningCount, setRunningCount] = useState(0);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [customerContracts, setCustomerContracts] = useState<SalesContract[]>([]);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [customerPayments, setCustomerPayments] = useState<CustomerPaymentRow[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [allContractsData, setAllContractsData] = useState<Map<string, { totalPaid: number; signedCount: number }>>(new Map());
  const [totalDebtFromContracts, setTotalDebtFromContracts] = useState(0);
  const [customerVehicles, setCustomerVehicles] = useState<Map<string, any>>(new Map());
  const [historyLoading, setHistoryLoading] = useState(false);
  const [staffMap, setStaffMap] = useState<Map<string, string>>(new Map());
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ show: boolean; customerId: string | null; customerName: string | null }>({
    show: false,
    customerId: null,
    customerName: null
  });
  const [deleting, setDeleting] = useState(false);

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const getStatusBadge = (status: CustomerStatus) => {
    switch(status) {
      case CustomerStatus.LOYAL:
        return { label: 'Thân thiết', color: 'bg-indigo-100 text-indigo-700', icon: <BadgeCheck size={14} /> };
      case CustomerStatus.TRADING:
        return { label: 'Đang giao dịch', color: 'bg-emerald-100 text-emerald-700', icon: <Clock size={14} /> };
      case CustomerStatus.PROSPECT:
        return { label: 'Tiềm năng', color: 'bg-blue-100 text-blue-700', icon: <UserCircle size={14} /> };
      default:
        return { label: 'Ngừng hoạt động', color: 'bg-slate-100 text-slate-500', icon: <AlertCircle size={14} /> };
    }
  };

  // Fetch staff list from database
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const response = await fetch('/api/customers/staff', { cache: 'no-store' });
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
  }, [reloadKey]); // Re-fetch when reloadKey changes

  // Fetch customers from database (theo phân quyền dữ liệu)
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setLoading(true);
        setError(null);

        // Bắt buộc phải có user mới xác định được phạm vi khách hàng
        if (!user?.id) {
          setCustomers([]);
          setLoading(false);
          return;
        }

        // Nếu không có quyền xem tất cả khách hàng thì lọc theo nhân viên phụ trách
        const canViewAllCustomers = hasAnyPermission(user.permissions, ['customerAll']);
        const canViewOwnCustomers = hasAnyPermission(user.permissions, ['customerSelf', 'customerAll']);
        const canViewSubordinateCustomers = hasAnyPermission(user.permissions, ['customerSubordinates', 'customerAll']);

        let allowedStaffIds: string[] = [];

        if (!canViewAllCustomers) {
          // Danh sách id nhân viên mà user hiện tại có thể xem dữ liệu khách hàng:
          // - Luôn bao gồm chính họ (customerSelf)
          // - Nếu có quyền customerSubordinates: thêm nhân viên cấp dưới (dựa trên trường manager_id trong bảng users)
          if (canViewOwnCustomers || !canViewSubordinateCustomers) {
            allowedStaffIds.push(user.id);
          }

          if (canViewSubordinateCustomers) {
            try {
              const response = await fetch(`/api/customers/subordinates?managerId=${user.id}`, { cache: 'no-store' });
              const result = await response.json();

              if (!response.ok) {
                console.error('Error fetching subordinate users:', result?.error || 'Unknown error');
              } else if (Array.isArray(result?.subordinates) && result.subordinates.length > 0) {
                allowedStaffIds = [
                  ...allowedStaffIds,
                  ...result.subordinates,
                ];
              }
            } catch (subErr) {
              console.error('Unexpected error fetching subordinate users:', subErr);
            }
          }

          // Nếu không xác định được bất kỳ staff id nào, mặc định chỉ lấy theo chính user
          if (allowedStaffIds.length === 0) {
            allowedStaffIds = [user.id];
          }
        }

        const params = new URLSearchParams();
        if (!canViewAllCustomers && allowedStaffIds.length > 0) {
          params.set('assignedStaffIds', allowedStaffIds.join(','));
        }

        const response = await fetch(`/api/customers${params.toString() ? `?${params.toString()}` : ''}`, { cache: 'no-store' });
        const result = await response.json();

        if (!response.ok) {
          console.error('Error fetching customers:', result?.error || 'Unknown error');
          setError(`Lỗi tải dữ liệu: ${result?.error || 'Không thể tải dữ liệu khách hàng'}`);
          return;
        }

        const data = result?.customers || [];

        if (data) {
          // Transform Supabase data to Customer type
          const transformedCustomers: Customer[] = await Promise.all(
            data.map(async (c: any) => {
              // Kiểm tra trạng thái hợp đồng của khách hàng để xác định status đúng
              let finalStatus = c.status as CustomerStatus;
              let needsUpdate = false;
              
              if (c.phone || c.name) {
                const contractParams = new URLSearchParams({
                  contractType: 'SALES',
                  fields: 'status'
                });

                if (c.phone) {
                  contractParams.set('customerPhone', c.phone);
                } else if (c.name) {
                  contractParams.set('customerName', c.name);
                }

                const contractsResponse = await fetch(`/api/customers/contracts?${contractParams.toString()}`, { cache: 'no-store' });
                const contractsResult = await contractsResponse.json();
                const contractsData = contractsResponse.ok ? (contractsResult?.contracts || []) : null;

                if (contractsResponse.ok && contractsData) {
                  // Kiểm tra xem có hợp đồng COMPLETED không
                  const hasCompletedContract = contractsData.some(
                    (contract: any) => contract.status === 'COMPLETED'
                  );
                  
                  // Kiểm tra xem có hợp đồng SIGNED hoặc PAYING không
                  const hasActiveContract = contractsData.some(
                    (contract: any) => contract.status === 'SIGNED' || contract.status === 'PAYING'
                  );

                  // Logic cập nhật status:
                  // 1. Nếu có hợp đồng COMPLETED → status phải là LOYAL
                  // 2. Nếu không có COMPLETED nhưng có SIGNED/PAYING → status phải là TRADING
                  // 3. Nếu không có hợp đồng hợp lệ nào → status phải là PROSPECT
                  
                  if (hasCompletedContract) {
                    // Có hợp đồng hoàn thành → phải là LOYAL
                    if (c.status !== 'LOYAL') {
                      finalStatus = CustomerStatus.LOYAL;
                      needsUpdate = true;
                    }
                  } else if (hasActiveContract) {
                    // Có hợp đồng đang chạy → phải là TRADING
                    if (c.status !== 'TRADING' && c.status !== 'LOYAL') {
                      finalStatus = CustomerStatus.TRADING;
                      needsUpdate = true;
                    }
                  } else {
                    // Không có hợp đồng hợp lệ → phải là PROSPECT
                    if (c.status !== 'PROSPECT') {
                      finalStatus = CustomerStatus.PROSPECT;
                      needsUpdate = true;
                    }
                  }
                } else {
                  // Không tìm thấy hợp đồng nào → phải là PROSPECT
                  if (c.status !== 'PROSPECT') {
                    finalStatus = CustomerStatus.PROSPECT;
                    needsUpdate = true;
                  }
                }
              }

              // Cập nhật trong database nếu cần
              if (needsUpdate) {
                try {
                  await fetch(`/api/customers/${c.id}`, {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ status: finalStatus })
                  });
                } catch (updateError) {
                  console.error(`Error updating customer ${c.id} status to ${finalStatus}:`, updateError);
                }
              }

              return {
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
                status: finalStatus,
                notes: c.notes || undefined,
                createdAt: c.created_at || new Date().toISOString(),
                totalContracts: c.total_contracts || 0,
                totalPurchased: c.total_purchased || 0,
                totalRevenue: Number(c.total_revenue) || 0,
                debt: Number(c.debt) || 0,
                // Additional fields for display
                dateOfBirth: c.date_of_birth || undefined,
                gender: c.gender || undefined,
                idCardIssueDate: c.id_card_issue_date || undefined,
                idCardIssuePlace: c.id_card_issue_place || undefined,
                bankName: c.bank_name || undefined,
                bankAccount: c.bank_account || undefined,
                bankBranch: c.bank_branch || undefined
              };
            })
          );

          setCustomers(transformedCustomers);
        }
      } catch (err: any) {
        console.error('Unexpected error:', err);
        setError('Có lỗi xảy ra khi tải dữ liệu. Vui lòng thử lại.');
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, [user, reloadKey]); // Re-fetch when reloadKey changes

  // Fetch contracts and transactions for all customers to calculate stats
  useEffect(() => {
    const fetchAllContractsData = async () => {
      if (customers.length === 0) return;

      try {
        // Fetch all sales contracts
        const contractsResponse = await fetch('/api/customers/contracts?contractType=SALES&fields=summary', { cache: 'no-store' });
        const contractsResult = await contractsResponse.json();

        if (!contractsResponse.ok) {
          console.error('Error fetching all contracts:', contractsResult?.error || 'Unknown error');
          return;
        }

        const allContracts = contractsResult?.contracts || [];

        // Fetch all transactions related to contracts
        const contractIds = (allContracts || []).map((c: any) => c.id);
        if (contractIds.length === 0) {
          setAllContractsData(new Map());
          return;
        }

        let allTransactions: any[] = [];
        if (contractIds.length > 0) {
          const transactionsResponse = await fetch(
            `/api/customers/transactions?referenceType=CONTRACT&referenceIds=${contractIds.join(',')}&types=INCOME&statuses=APPROVED,LOCKED`,
            { cache: 'no-store' }
          );
          const transactionsResult = await transactionsResponse.json();

          if (!transactionsResponse.ok) {
            console.error('Error fetching all transactions:', transactionsResult?.error || 'Unknown error');
          } else {
            allTransactions = transactionsResult?.transactions || [];
          }
        }

        // Calculate stats for each customer
        const statsMap = new Map<string, { totalPaid: number; signedCount: number }>();

        customers.forEach(customer => {
          // Find contracts for this customer (by name or phone)
          const customerContracts = (allContracts || []).filter((contract: any) => 
            (customer.phone && contract.customer_phone === customer.phone) ||
            (contract.customer_name && contract.customer_name.toLowerCase() === customer.name.toLowerCase())
          );

          // Count signed contracts (SIGNED, PAYING, COMPLETED)
          const signedContracts = customerContracts.filter((c: any) => 
            c.status === 'SIGNED' || c.status === 'PAYING' || c.status === 'COMPLETED'
          );
          const signedCount = signedContracts.length;

          // Calculate total paid amount from transactions
          const customerContractIds = customerContracts.map((c: any) => c.id);
          const customerTransactions = (allTransactions || []).filter(t => 
            customerContractIds.includes(t.reference_id)
          );
          const totalPaidFromTransactions = customerTransactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

          // Use paid_amount from contracts if no transactions found
          const totalPaidFromContracts = customerContracts.reduce((sum: number, c: any) => 
            sum + (Number(c.paid_amount) || 0), 0
          );
          // Prefer transactions data if available, otherwise use paid_amount from contracts
          const finalTotalPaid = customerTransactions.length > 0 ? totalPaidFromTransactions : totalPaidFromContracts;

          // Calculate debt for this customer: totalAmount - paidAmount for each contract
          const customerDebt = customerContracts.reduce((sum: number, contract: any) => {
            const totalAmount = Number(contract.total_amount) || 0;
            const contractId = contract.id;
            
            // Find transactions for this specific contract
            const contractTransactions = customerTransactions.filter(t => t.reference_id === contractId);
            const paidFromTransactions = contractTransactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
            
            // Use paid_amount from contract if no transactions for this contract
            const paidAmount = contractTransactions.length > 0 
              ? paidFromTransactions 
              : (Number(contract.paid_amount) || 0);
            
            const remaining = totalAmount - paidAmount;
            return sum + (remaining > 0 ? remaining : 0);
          }, 0);

          statsMap.set(customer.id, {
            totalPaid: finalTotalPaid,
            signedCount: signedCount
          });
        });

        setAllContractsData(statsMap);

        // Calculate total debt from all contracts
        let totalDebt = 0;
        (allContracts || []).forEach((contract: any) => {
          const totalAmount = Number(contract.total_amount) || 0;
          const contractId = contract.id;
          
          // Find transactions for this contract
          const contractTransactions = (allTransactions || []).filter(t => t.reference_id === contractId);
          const paidFromTransactions = contractTransactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
          
          // Use paid_amount from contract if no transactions
          const paidAmount = contractTransactions.length > 0 
            ? paidFromTransactions 
            : (Number(contract.paid_amount) || 0);
          
          const remaining = totalAmount - paidAmount;
          if (remaining > 0) {
            totalDebt += remaining;
          }
        });

        setTotalDebtFromContracts(totalDebt);
      } catch (err) {
        console.error('Error fetching all contracts data:', err);
      }
    };

    fetchAllContractsData();
  }, [customers]);

  // Tính toán số liệu Tổng quan từ bảng contracts theo khách hàng đang chọn
  useEffect(() => {
    const fetchOverviewFromContracts = async () => {
      if (!selectedCustomer) {
        setDeliveredCount(0);
        setRunningCount(0);
        setOverviewLoading(false);
        return;
      }

      try {
        setOverviewLoading(true);

        // Load contracts của khách hàng
        const overviewParams = new URLSearchParams({
          contractType: 'SALES',
          customerName: selectedCustomer.name,
          fields: 'overview'
        });
        const contractsResponse = await fetch(`/api/customers/contracts?${overviewParams.toString()}`, { cache: 'no-store' });
        const contractsResult = await contractsResponse.json();

        if (!contractsResponse.ok || !contractsResult?.contracts) {
          console.error('Error fetching contracts for overview:', contractsResult?.error || 'Unknown error');
          setDeliveredCount(0);
          setRunningCount(0);
          return;
        }

        const contractsData = contractsResult.contracts;

        // Hợp đồng đã ký hoặc đang thanh toán -> Hợp đồng đang chạy
        const running = contractsData.filter(
          (c: any) => c.status === 'SIGNED' || c.status === 'PAYING'
        ).length;

        // Đếm xe đã bàn giao dựa trên transaction_status của vehicles
        const vehicleIds = contractsData
          .filter((c: any) => c.vehicle_id)
          .map((c: any) => c.vehicle_id);

        if (vehicleIds.length === 0) {
          setDeliveredCount(0);
          setRunningCount(running);
          return;
        }

        // Load vehicles để kiểm tra transaction_status
        const vehiclesResponse = await fetch(`/api/customers/vehicles?ids=${vehicleIds.join(',')}&fields=overview`, { cache: 'no-store' });
        const vehiclesResult = await vehiclesResponse.json();

        if (!vehiclesResponse.ok) {
          console.error('Error fetching vehicles for overview:', vehiclesResult?.error || 'Unknown error');
          setDeliveredCount(0);
          setRunningCount(running);
          return;
        }

        const vehiclesData = vehiclesResult?.vehicles || [];

        // Đếm số xe có transaction_status là "Đã giao xe" hoặc "Đã bàn giao"
        const delivered = (vehiclesData || []).filter((v: any) => {
          const status = (v.transaction_status || '').trim();
          return status === 'Đã giao xe' || status === 'Đã bàn giao';
        }).length;

        setDeliveredCount(delivered);
        setRunningCount(running);
      } catch (err) {
        console.error('Unexpected error fetching overview:', err);
        setDeliveredCount(0);
        setRunningCount(0);
      } finally {
        setOverviewLoading(false);
      }
    };

    fetchOverviewFromContracts();
  }, [selectedCustomer]);

  // Fetch contracts & payments for selected customer
  useEffect(() => {
    const fetchCustomerContractsAndPayments = async () => {
      if (!selectedCustomer) {
        setCustomerContracts([]);
        setCustomerPayments([]);
        setCustomerVehicles(new Map());
        setContractsLoading(false);
        setPaymentsLoading(false);
        return;
      }

      try {
        setContractsLoading(true);
        setPaymentsLoading(true);

        // Fetch contracts from database matching customer name
        const contractsParams = new URLSearchParams({
          contractType: 'SALES',
          customerName: selectedCustomer.name,
          fields: 'details',
          orderBy: 'signed_date',
          order: 'desc'
        });
        const contractsResponse = await fetch(`/api/customers/contracts?${contractsParams.toString()}`, { cache: 'no-store' });
        const contractsResult = await contractsResponse.json();

        if (!contractsResponse.ok) {
          console.error('Error fetching customer contracts:', contractsResult?.error || 'Unknown error');
          setCustomerContracts([]);
          setCustomerPayments([]);
          return;
        }

        const contractsData = contractsResult?.contracts || [];

        if (!contractsData || contractsData.length === 0) {
          setCustomerContracts([]);
          setCustomerPayments([]);
          return;
        }

        // Fetch payment schedules for these contracts
        const contractIds = contractsData.map((c: any) => c.id);
        let schedulesData: any[] = [];
        if (contractIds.length > 0) {
          const schedulesResponse = await fetch(`/api/customers/payment-schedules?contractIds=${contractIds.join(',')}`, { cache: 'no-store' });
          const schedulesResult = await schedulesResponse.json();

          if (!schedulesResponse.ok) {
            console.error('Error fetching payment schedules:', schedulesResult?.error || 'Unknown error');
          } else {
            schedulesData = schedulesResult?.schedules || [];
          }
        }

        // Fetch transactions related to contracts to calculate actual paid amount
        let contractTransactions: any[] = [];
        if (contractIds.length > 0) {
          const transactionsResponse = await fetch(
            `/api/customers/transactions?referenceType=CONTRACT&referenceIds=${contractIds.join(',')}&statuses=APPROVED,LOCKED`,
            { cache: 'no-store' }
          );
          const transactionsResult = await transactionsResponse.json();

          if (!transactionsResponse.ok) {
            console.error('Error fetching contract transactions:', transactionsResult?.error || 'Unknown error');
          } else {
            contractTransactions = transactionsResult?.transactions || [];
          }
        }

        // Transform Supabase data to SalesContract type
        const transformedContracts: SalesContract[] = contractsData.map((c: any) => {
          const contractSchedules = schedulesData?.filter((s: any) => s.contract_id === c.id) || [];
          
          const contractRelatedTransactions = (contractTransactions || []).filter(
            (t: any) => t.reference_id === c.id && t.type === 'INCOME'
          );
          const actualPaidAmount = contractRelatedTransactions.reduce(
            (sum: number, t: any) => sum + (Number(t.amount) || 0), 
            0
          );
          
          const finalPaidAmount = actualPaidAmount > 0 ? actualPaidAmount : (Number(c.paid_amount) || 0);
          
          return {
            id: c.id,
            contractCode: c.contract_code || '',
            vehicleId: c.vehicle_id || '',
            depositContractId: c.deposit_contract_id || undefined,
            customerName: c.customer_name || '',
            customerPhone: c.customer_phone || '',
            customerIDCard: c.customer_id_card || '',
            customerAddress: c.customer_address || '',
            carPrice: Number(c.car_price) || 0,
            vatAmount: Number(c.vat_amount) || 0,
            registrationFee: Number(c.registration_fee) || 0,
            insuranceFee: Number(c.insurance_fee) || 0,
            discount: Number(c.discount) || 0,
            totalAmount: Number(c.total_amount) || 0,
            paidAmount: finalPaidAmount,
            paymentType: c.payment_type as 'INSTALLMENT' | 'CASH',
            bankName: c.bank_name || undefined,
            loanAmount: c.loan_amount ? Number(c.loan_amount) : undefined,
            signedDate: c.signed_date || '',
            status: c.status as ContractStatus,
            schedules: contractSchedules.map((s: any) => ({
              id: s.id,
              contractId: s.contract_id,
              milestoneName: s.milestone_name || '',
              amount: Number(s.amount) || 0,
              dueDate: s.due_date || '',
              status: s.status as 'PENDING' | 'PAID' | 'OVERDUE',
              transactionId: s.transaction_id || undefined
            }))
          };
        });

        setCustomerContracts(transformedContracts);

        // Fetch vehicle information for contracts
        const vehicleIds = transformedContracts
          .filter(c => c.vehicleId)
          .map(c => c.vehicleId);
        
        if (vehicleIds.length > 0) {
          const vehiclesResponse = await fetch(`/api/customers/vehicles?ids=${vehicleIds.join(',')}&fields=details`, { cache: 'no-store' });
          const vehiclesResult = await vehiclesResponse.json();

          if (vehiclesResponse.ok && vehiclesResult?.vehicles) {
            const vehiclesMap = new Map<string, any>();
            vehiclesResult.vehicles.forEach((v: any) => {
              vehiclesMap.set(v.id, v);
            });
            setCustomerVehicles(vehiclesMap);
          }
        }

        // Build payments list from related INCOME transactions
        const incomeTransactions: CustomerPaymentRow[] = (contractTransactions || [])
          .filter((t: any) => t.type === 'INCOME')
          .map((t: any) => ({
            id: t.id,
            date: t.date || t.created_at,
            amount: Number(t.amount) || 0,
            description: t.description || '',
            status: t.status as TransactionStatus
          }))
          .sort((a, b) => (new Date(b.date).getTime() - new Date(a.date).getTime()));

        setCustomerPayments(incomeTransactions);
      } catch (err: any) {
        console.error('Error fetching customer contracts & payments:', err);
        setCustomerContracts([]);
        setCustomerPayments([]);
      } finally {
        setContractsLoading(false);
        setPaymentsLoading(false);
      }
    };

    fetchCustomerContractsAndPayments();
  }, [selectedCustomer]);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    (c.phone && c.phone.includes(search)) ||
    (c.code && c.code.toLowerCase().includes(search.toLowerCase()))
  );

  // Calculate stats from actual data
  const totalCustomers = customers.length;
  const prospectCount = customers.filter(c => c.status === CustomerStatus.PROSPECT).length;
  const loyalCount = customers.filter(c => c.status === CustomerStatus.LOYAL).length;
  // Total debt is calculated from all contracts (totalAmount - paidAmount)
  const totalDebt = totalDebtFromContracts;

  // Calculate total revenue and debt from contracts and transactions
  const { totalRevenue, totalDebt: calculatedDebt } = useMemo(() => {
    if (!selectedCustomer || customerContracts.length === 0) {
      return { totalRevenue: 0, totalDebt: 0 };
    }

    // Tổng doanh thu = tổng số tiền khách hàng đã hoàn tất thanh toán (transactions với status APPROVED hoặc LOCKED)
    const totalRevenue = customerPayments
      .filter(p => p.status === TransactionStatus.APPROVED || p.status === TransactionStatus.LOCKED)
      .reduce((sum, p) => sum + p.amount, 0);

    // Công nợ = tổng (totalAmount - paidAmount) của tất cả hợp đồng
    const totalDebt = customerContracts.reduce((sum, contract) => {
      const remaining = contract.totalAmount - contract.paidAmount;
      return sum + (remaining > 0 ? remaining : 0);
    }, 0);

    return { totalRevenue, totalDebt };
  }, [selectedCustomer, customerContracts, customerPayments]);

  // Check if user has any customer permissions
  const hasCustomerPermissions = hasAnyPermission(user?.permissions, PermissionCategories.customers);
  const canCreateCustomer = hasAnyPermission(user?.permissions, ['customerCreate']);
  const canUpdateCustomer = hasAnyPermission(user?.permissions, ['customerUpdate']);
  const canDeleteCustomer = hasAnyPermission(user?.permissions, ['customerDelete']);

  // Detailed customer permissions (giữ tương thích với các quyền tổng like customerAll)
  const canViewCustomerBasicInfo = hasAnyPermission(user?.permissions, [
    'customerBasicInfo',
    'customerView',
    'customerAll',
  ]);
  const canViewCustomerFinancialInfo = hasAnyPermission(user?.permissions, [
    'customerFinancialInfo',
    'customerAll',
  ]);
  const canViewCustomerLegalInfo = hasAnyPermission(user?.permissions, [
    'customerLegalInfo',
    'customerAll',
  ]);
  const canViewCustomerBankInfo = hasAnyPermission(user?.permissions, [
    'customerBankInfo',
    'customerAll',
  ]);
  const canViewCustomerContracts = hasAnyPermission(user?.permissions, [
    'customerContracts',
    'customerAll',
  ]);
  const canViewCustomerPaymentHistory = hasAnyPermission(user?.permissions, [
    'customerPaymentHistory',
    'customerAll',
  ]);
  const canViewCustomerPurchaseHistory = hasAnyPermission(user?.permissions, [
    'customerPurchaseHistory',
    'customerAll',
  ]);

  // Handle delete click
  const handleDeleteClick = (customerId: string, customerName: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click
    if (!canDeleteCustomer) {
      alert('Bạn không có quyền xóa khách hàng. Vui lòng liên hệ quản trị viên để được cấp quyền.');
      return;
    }
    setDeleteConfirmModal({
      show: true,
      customerId,
      customerName
    });
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!deleteConfirmModal.customerId) return;
    if (!canDeleteCustomer) {
      alert('Bạn không có quyền xóa khách hàng. Vui lòng liên hệ quản trị viên để được cấp quyền.');
      return;
    }

    try {
      setDeleting(true);
      
      const response = await fetch(`/api/customers/${deleteConfirmModal.customerId}`, {
        method: 'DELETE'
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || 'Có lỗi xảy ra khi xóa khách hàng. Vui lòng thử lại.');
      }

      // Close modal and refresh list
      setDeleteConfirmModal({ show: false, customerId: null, customerName: null });
      
      // Remove customer from local state immediately
      setCustomers(prevCustomers => prevCustomers.filter(c => c.id !== deleteConfirmModal.customerId));
      
      // If deleted customer was selected, clear selection
      if (selectedCustomer?.id === deleteConfirmModal.customerId) {
        setSelectedCustomer(null);
      }
    } catch (error: any) {
      console.error('Delete error:', error);
      alert(error.message || 'Có lỗi xảy ra khi xóa khách hàng. Vui lòng thử lại.');
    } finally {
      setDeleting(false);
    }
  };

  if (selectedCustomer) {

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setSelectedCustomer(null)}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold text-sm transition-colors"
          >
            <ChevronRight size={18} className="rotate-180" /> Quay lại danh sách
          </button>
          {canUpdateCustomer && (
            <Link 
              href={`/crm/${selectedCustomer.id}/edit`}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black hover:bg-slate-800 transition-all"
            >
              Chỉnh sửa thông tin
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Info */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <div className="flex flex-col items-center text-center mb-4 pb-4 border-b border-slate-100">
                <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-2xl font-black mb-3 ring-2 ring-blue-50">
                  {selectedCustomer.name.charAt(0)}
                </div>
                <h3 className="text-lg font-black text-slate-900 leading-tight">{selectedCustomer.name}</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{selectedCustomer.code}</p>
              </div>
              
              <div className="w-full space-y-3 text-left">
                 {/* Thông tin liên hệ - Grid 2 cột */}
                 <>
                   <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-100">
                     <div className="space-y-1">
                       <div className="flex items-center gap-1.5">
                         <Phone size={12} className="text-slate-400" />
                         <p className="text-[9px] font-black text-slate-400 uppercase">Điện thoại</p>
                       </div>
                       <p className="text-xs font-bold text-slate-900 leading-tight">{selectedCustomer.phone}</p>
                     </div>
                     <div className="space-y-1">
                       <div className="flex items-center gap-1.5">
                         <UserCircle size={12} className="text-slate-400" />
                         <p className="text-[9px] font-black text-slate-400 uppercase">Loại</p>
                       </div>
                       <p className="text-xs font-bold text-slate-900">
                         {selectedCustomer.type === CustomerType.INDIVIDUAL ? 'Cá nhân' : 'Doanh nghiệp'}
                       </p>
                     </div>
                   </div>

                   <div className="space-y-2 pb-3 border-b border-slate-100">
                     {selectedCustomer.email && (
                       <div className="space-y-1">
                         <div className="flex items-center gap-1.5">
                           <Mail size={12} className="text-slate-400" />
                           <p className="text-[9px] font-black text-slate-400 uppercase">Email</p>
                         </div>
                         <p className="text-xs font-bold text-slate-900 break-words leading-tight">
                           {selectedCustomer.email}
                         </p>
                       </div>
                     )}
                     {selectedCustomer.address && (
                       <div className="space-y-1">
                         <div className="flex items-center gap-1.5">
                           <MapPin size={12} className="text-slate-400" />
                           <p className="text-[9px] font-black text-slate-400 uppercase">Địa chỉ</p>
                         </div>
                         <p className="text-xs font-medium text-slate-600 leading-tight break-words">
                           {selectedCustomer.address}
                         </p>
                       </div>
                     )}
                     {selectedCustomer.source && (
                       <div className="space-y-1">
                         <div className="flex items-center gap-1.5">
                           <Target size={12} className="text-slate-400" />
                           <p className="text-[9px] font-black text-slate-400 uppercase">Nguồn</p>
                         </div>
                         <p className="text-xs font-bold text-slate-900">{selectedCustomer.source}</p>
                       </div>
                     )}
                   </div>
                 </>

                 {/* Thông tin pháp lý - Compact */}
                 {(selectedCustomer.idCard ||
                   selectedCustomer.taxCode ||
                   selectedCustomer.dateOfBirth ||
                   selectedCustomer.gender ||
                   selectedCustomer.representative) && (
                   <div className="space-y-2 pb-3 border-b border-slate-100">
                     {selectedCustomer.type === CustomerType.INDIVIDUAL ? (
                       <>
                         {selectedCustomer.idCard && (
                           <div className="space-y-1">
                             <div className="flex items-center gap-1.5">
                               <Hash size={12} className="text-slate-400" />
                               <p className="text-[9px] font-black text-slate-400 uppercase">CCCD/Hộ chiếu</p>
                             </div>
                             <p className="text-xs font-mono font-bold text-slate-900">{selectedCustomer.idCard}</p>
                           </div>
                         )}
                         {selectedCustomer.dateOfBirth && (
                           <div className="grid grid-cols-2 gap-2">
                             <div className="space-y-1">
                               <div className="flex items-center gap-1.5">
                                 <Calendar size={12} className="text-slate-400" />
                                 <p className="text-[9px] font-black text-slate-400 uppercase">Ngày sinh</p>
                               </div>
                               <p className="text-xs font-bold text-slate-900">
                                 {new Date(selectedCustomer.dateOfBirth).toLocaleDateString('vi-VN')}
                               </p>
                             </div>
                             {selectedCustomer.gender && (
                               <div className="space-y-1">
                                 <div className="flex items-center gap-1.5">
                                   <User size={12} className="text-slate-400" />
                                   <p className="text-[9px] font-black text-slate-400 uppercase">Giới tính</p>
                                 </div>
                                 <p className="text-xs font-bold text-slate-900">{selectedCustomer.gender}</p>
                               </div>
                             )}
                           </div>
                         )}
                       </>
                     ) : (
                       <>
                         {selectedCustomer.taxCode && (
                           <div className="space-y-1">
                             <div className="flex items-center gap-1.5">
                               <Hash size={12} className="text-slate-400" />
                               <p className="text-[9px] font-black text-slate-400 uppercase">Mã số thuế</p>
                             </div>
                             <p className="text-xs font-mono font-bold text-slate-900">
                               {selectedCustomer.taxCode}
                             </p>
                           </div>
                         )}
                         {selectedCustomer.representative && (
                           <div className="space-y-1">
                             <div className="flex items-center gap-1.5">
                               <Briefcase size={12} className="text-slate-400" />
                               <p className="text-[9px] font-black text-slate-400 uppercase">Người đại diện</p>
                             </div>
                             <p className="text-xs font-bold text-slate-900">
                               {selectedCustomer.representative}
                             </p>
                             {selectedCustomer.position && (
                               <p className="text-[10px] font-medium text-slate-500">
                                 ({selectedCustomer.position})
                               </p>
                             )}
                           </div>
                         )}
                       </>
                     )}
                   </div>
                 )}

                 {/* Thông tin ngân hàng - Compact */}
                 {(selectedCustomer.bankName ||
                   selectedCustomer.bankAccount ||
                   selectedCustomer.bankBranch) && (
                   <div className="space-y-2">
                     <p className="text-[9px] font-black text-slate-400 uppercase mb-2">
                       Thông tin ngân hàng
                     </p>
                     {selectedCustomer.bankName && (
                       <div className="space-y-1">
                         <div className="flex items-center gap-1.5">
                           <Landmark size={12} className="text-slate-400" />
                           <p className="text-[9px] font-black text-slate-400 uppercase">Tên ngân hàng</p>
                         </div>
                         <p className="text-xs font-bold text-slate-900">
                           {selectedCustomer.bankName}
                         </p>
                       </div>
                     )}
                     {selectedCustomer.bankAccount && (
                       <div className="space-y-1">
                         <div className="flex items-center gap-1.5">
                           <CreditCard size={12} className="text-slate-400" />
                           <p className="text-[9px] font-black text-slate-400 uppercase">
                             Số tài khoản
                           </p>
                         </div>
                         <p className="text-xs font-mono font-bold text-slate-900">
                           {selectedCustomer.bankAccount}
                         </p>
                       </div>
                     )}
                     {selectedCustomer.bankBranch && (
                       <div className="space-y-1">
                         <div className="flex items-center gap-1.5">
                           <Building2 size={12} className="text-slate-400" />
                           <p className="text-[9px] font-black text-slate-400 uppercase">
                             Chi nhánh
                           </p>
                         </div>
                         <p className="text-xs font-bold text-slate-900">
                           {selectedCustomer.bankBranch}
                         </p>
                       </div>
                     )}
                   </div>
                 )}
              </div>
            </div>

            <div className="bg-emerald-50 rounded-3xl p-5 border border-emerald-100">
              <div className="flex justify-between items-center mb-4">
                <div className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center">
                  <ArrowUpRight size={20} />
                </div>
                <span className="text-[10px] font-black text-emerald-600 uppercase">
                  Dòng tiền thu
                </span>
              </div>
              <p className="text-[10px] font-bold text-emerald-700/60 uppercase tracking-widest">
                Tổng doanh thu
              </p>
              <h4 className="text-xl font-black text-emerald-700">
                {formatVND(totalRevenue)}
              </h4>
              <div className="mt-4 pt-4 border-t border-emerald-100 flex justify-between items-center">
                <span className="text-xs font-bold text-emerald-700">Công nợ hiện tại</span>
                <span className="text-sm font-black text-rose-600">
                  {formatVND(calculatedDebt)}
                </span>
              </div>
            </div>
          </div>

          {/* Tab Content */}
          <div className="lg:col-span-3 space-y-4">
            <div className="flex bg-white p-1 rounded-xl border border-slate-200 w-fit">
              {[
                { id: 'overview', label: 'Tổng quan', icon: <Building2 size={14} /> },
                { id: 'contracts', label: 'Hợp đồng', icon: <FileText size={14} /> },
                { id: 'payments', label: 'Thanh toán', icon: <Receipt size={14} /> },
                { id: 'history', label: 'Lịch sử', icon: <History size={14} /> },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[11px] font-black transition-all ${
                    activeTab === tab.id ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* Sub-tab: Overview */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-bottom-4">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center gap-3">
                  <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                    <Car size={28} />
                  </div>
                  <div>
                    <h5 className="text-xl font-black text-slate-900">
                      {overviewLoading ? '...' : deliveredCount}
                    </h5>
                    <p className="text-[10px] font-black text-slate-400 uppercase">Xe đã bàn giao</p>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center gap-3">
                  <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center">
                    <FileText size={28} />
                  </div>
                  <div>
                    <h5 className="text-xl font-black text-slate-900">
                      {overviewLoading ? '...' : runningCount}
                    </h5>
                    <p className="text-[10px] font-black text-slate-400 uppercase">Hợp đồng đang chạy</p>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-tab: Contracts */}
            {activeTab === 'contracts' && (
              <div className="space-y-4 animate-in slide-in-from-bottom-4">
                 {contractsLoading ? (
                   <div className="py-20 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-[40px]">
                     <div className="flex flex-col items-center gap-4">
                       <Loader2 className="animate-spin text-blue-600" size={32} />
                       <p className="text-sm font-bold text-slate-400">Đang tải hợp đồng...</p>
                     </div>
                   </div>
                 ) : customerContracts.length > 0 ? (
                   customerContracts.map(sc => {
                     // Đảm bảo status được lấy từ database và xử lý đúng
                     const contractStatus = sc.status || ContractStatus.DRAFT;
                     
                     const getStatusLabel = (status: ContractStatus | string) => {
                       // Xử lý cả trường hợp status là string từ database
                       const normalizedStatus = typeof status === 'string' 
                         ? (status.toUpperCase() as ContractStatus)
                         : status;
                       
                       switch(normalizedStatus) {
                         case ContractStatus.DRAFT:
                         case 'DRAFT':
                           return 'Nháp';
                         case ContractStatus.ACTIVE:
                         case 'ACTIVE':
                           return 'Đang hiệu lực';
                         case ContractStatus.SIGNED:
                         case 'SIGNED':
                           return 'Đã ký';
                         case ContractStatus.PAYING:
                         case 'PAYING':
                           return 'Đang thanh toán';
                         case ContractStatus.COMPLETED:
                         case 'COMPLETED':
                           return 'Hoàn tất';
                         case ContractStatus.CANCELLED:
                         case 'CANCELLED':
                           return 'Đã hủy';
                         case ContractStatus.CONVERTED:
                         case 'CONVERTED':
                           return 'Đã chuyển đổi';
                         default:
                           // Nếu không khớp, trả về giá trị từ database
                           return String(status || 'N/A');
                       }
                     };

                     const getStatusColor = (status: ContractStatus | string) => {
                       const normalizedStatus = typeof status === 'string' 
                         ? (status.toUpperCase() as ContractStatus)
                         : status;
                       
                       switch(normalizedStatus) {
                         case ContractStatus.PAYING:
                         case 'PAYING':
                           return 'text-blue-600';
                         case ContractStatus.COMPLETED:
                         case 'COMPLETED':
                           return 'text-emerald-600';
                         case ContractStatus.CANCELLED:
                         case 'CANCELLED':
                           return 'text-rose-600';
                         case ContractStatus.SIGNED:
                         case 'SIGNED':
                           return 'text-blue-600';
                         case ContractStatus.ACTIVE:
                         case 'ACTIVE':
                           return 'text-indigo-600';
                         default:
                           return 'text-slate-600';
                       }
                     };

                     return (
                       <Link
                         key={sc.id}
                         href={`/contracts/${sc.id}`}
                         className="bg-white p-6 rounded-3xl border border-slate-200 flex justify-between items-center hover:border-blue-300 transition-all cursor-pointer block"
                       >
                         <div className="flex items-center gap-4">
                           <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center">
                             <FileText size={24} />
                           </div>
                           <div>
                             <p className="text-[10px] font-black text-slate-400 uppercase">{sc.contractCode}</p>
                             <h5 className="font-black text-slate-900">Hợp đồng Mua bán xe</h5>
                             <p className="text-xs text-slate-500 font-medium">
                               {sc.signedDate ? new Date(sc.signedDate).toLocaleDateString('vi-VN') : ''}
                             </p>
                           </div>
                         </div>
                         <div className="text-right">
                           <p className="text-sm font-black text-slate-900">{formatVND(sc.totalAmount)}</p>
                           <span className={`text-[10px] font-bold uppercase ${getStatusColor(contractStatus)}`}>
                             {getStatusLabel(contractStatus)}
                           </span>
                           {sc.paidAmount > 0 && (
                             <p className="text-[10px] text-slate-500 mt-1">
                               Đã thanh toán: {formatVND(sc.paidAmount)}
                             </p>
                           )}
                         </div>
                         <ChevronRight size={18} className="text-slate-300" />
                       </Link>
                     );
                   })
                 ) : (
                   <div className="py-20 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-[40px]">
                     <p className="text-sm font-bold text-slate-400">Chưa có hợp đồng nào phát sinh</p>
                   </div>
                 )}
              </div>
            )}

            {/* Sub-tab: Payments */}
            {activeTab === 'payments' && (
              <div className="bg-white rounded-[40px] border border-slate-200 overflow-hidden shadow-sm animate-in slide-in-from-bottom-4">
                 <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Ngày & Mã phiếu</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Nội dung</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase text-right">Số tiền</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase text-center">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                       {paymentsLoading ? (
                         <tr>
                           <td colSpan={4} className="px-6 py-10 text-center">
                             <div className="flex flex-col items-center gap-3">
                               <Loader2 className="animate-spin text-blue-600" size={28} />
                               <p className="text-sm font-bold text-slate-400">Đang tải phiếu thanh toán...</p>
                             </div>
                           </td>
                         </tr>
                       ) : customerPayments.length === 0 ? (
                         <tr>
                           <td colSpan={4} className="px-6 py-10 text-center text-sm font-bold text-slate-400">
                             Chưa có phiếu thanh toán nào
                           </td>
                         </tr>
                       ) : (
                         customerPayments.map(p => {
                           const getPaymentStatusBadge = (status: TransactionStatus) => {
                             switch (status) {
                               case TransactionStatus.APPROVED:
                                 return { 
                                   label: 'Đã duyệt', 
                                   class: 'bg-emerald-100 text-emerald-700', 
                                   icon: <CheckCircle2 size={12} /> 
                                 };
                               case TransactionStatus.LOCKED:
                                 return { 
                                   label: 'Đã khóa sổ', 
                                   class: 'bg-slate-200 text-slate-700', 
                                   icon: <History size={12} /> 
                                 };
                               case TransactionStatus.PENDING:
                                 return { 
                                   label: 'Chờ duyệt', 
                                   class: 'bg-amber-100 text-amber-700', 
                                   icon: <Clock size={12} /> 
                                 };
                               case TransactionStatus.CANCELLED:
                                 return { 
                                   label: 'Đã hủy', 
                                   class: 'bg-rose-100 text-rose-700', 
                                   icon: <AlertCircle size={12} /> 
                                 };
                               default:
                                 return { 
                                   label: 'Nháp', 
                                   class: 'bg-slate-100 text-slate-500', 
                                   icon: <History size={12} /> 
                                 };
                             }
                           };

                           const badge = getPaymentStatusBadge(p.status);

                           return (
                             <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                               <td className="px-6 py-4">
                                 <p className="text-xs font-bold text-slate-900">
                                   {p.date ? new Date(p.date).toLocaleDateString('vi-VN') : ''}
                                 </p>
                                 <p className="text-[9px] font-mono text-slate-400 uppercase">#{p.id}</p>
                               </td>
                               <td className="px-6 py-4 text-xs font-medium text-slate-600 truncate max-w-[200px]">
                                 {p.description}
                               </td>
                               <td className="px-6 py-4 text-right">
                                 <p className="text-sm font-black text-emerald-600">{formatVND(p.amount)}</p>
                               </td>
                               <td className="px-6 py-4 text-center">
                                 <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase ${badge.class}`}>
                                   {badge.icon} {badge.label}
                                 </span>
                               </td>
                             </tr>
                           );
                         })
                       )}
                    </tbody>
                 </table>
              </div>
            )}

            {/* Sub-tab: History */}
            {activeTab === 'history' && (
              <div className="space-y-4 animate-in slide-in-from-bottom-4">
                {historyLoading ? (
                  <div className="py-20 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-[40px]">
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="animate-spin text-blue-600" size={32} />
                      <p className="text-sm font-bold text-slate-400">Đang tải lịch sử mua hàng...</p>
                    </div>
                  </div>
                ) : (() => {
                  // Filter completed contracts for purchase history
                  const completedContracts = customerContracts.filter(
                    c => c.status === ContractStatus.COMPLETED
                  );

                  if (completedContracts.length === 0) {
                    return (
                      <div className="py-20 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-[40px]">
                        <p className="text-sm font-bold text-slate-400">Chưa có lịch sử mua hàng</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {completedContracts.map(contract => {
                        const vehicle = contract.vehicleId ? customerVehicles.get(contract.vehicleId) : null;
                        
                        return (
                          <Link
                            key={contract.id}
                            href={`/contracts/${contract.id}`}
                            className="bg-white p-6 rounded-3xl border border-slate-200 hover:border-blue-300 transition-all cursor-pointer block"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                                    <Car size={24} />
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase">{contract.contractCode}</p>
                                    <h5 className="font-black text-slate-900">Hợp đồng mua bán xe</h5>
                                    {contract.signedDate && (
                                      <p className="text-xs text-slate-500 font-medium">
                                        Ngày ký: {new Date(contract.signedDate).toLocaleDateString('vi-VN')}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {vehicle && (
                                  <div className="ml-16 space-y-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold text-slate-600">Xe:</span>
                                      <span className="text-sm font-black text-slate-900">
                                        {vehicle.make} {vehicle.model} {vehicle.year}
                                      </span>
                                      {vehicle.color && (
                                        <span className="text-xs text-slate-500">({vehicle.color})</span>
                                      )}
                                    </div>
                                    {vehicle.vin && (
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-600">VIN:</span>
                                        <span className="text-xs font-mono text-slate-700">{vehicle.vin}</span>
                                      </div>
                                    )}
                                    {vehicle.code && (
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-600">Mã xe:</span>
                                        <span className="text-xs font-mono text-slate-700">{vehicle.code}</span>
                                      </div>
                                    )}
                                  </div>
                                )}

                                <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Tổng giá trị</p>
                                    <p className="text-lg font-black text-slate-900">{formatVND(contract.totalAmount)}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Đã thanh toán</p>
                                    <p className="text-lg font-black text-emerald-600">{formatVND(contract.paidAmount)}</p>
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase bg-emerald-100 text-emerald-700">
                                  <CheckCircle2 size={12} /> Hoàn tất
                                </span>
                                <ChevronRight size={18} className="text-slate-300" />
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // If user doesn't have any customer permissions, show access denied message
  if (!hasCustomerPermissions) {
    return (
      <AccessDenied 
        message="Bạn không có quyền xem khách hàng. Vui lòng liên hệ quản trị viên để được cấp quyền."
        redirectTo="/dashboard"
        icon="shield"
      />
    );
  }

  return (
    <div className="space-y-6">

      {/* Quick CRM Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Tổng khách hàng', value: totalCustomers, color: 'text-slate-900', icon: <Users size={16} className="text-slate-400" /> },
          { label: 'Khách tiềm năng', value: prospectCount, color: 'text-blue-600', icon: <UserCircle size={16} className="text-blue-400" /> },
          { label: 'Khách thân thiết', value: loyalCount, color: 'text-indigo-600', icon: <BadgeCheck size={16} className="text-indigo-400" /> },
          { label: 'Tổng công nợ', value: formatVND(totalDebt), color: 'text-rose-600', icon: <AlertCircle size={16} className="text-rose-400" /> },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
              {stat.icon}
            </div>
            <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-slate-200">
        <div className="relative flex-1 w-full max-md:max-w-none max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Tìm theo tên, số điện thoại, mã khách..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold focus:ring-4 focus:ring-blue-500/10 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        {canCreateCustomer && (
          <div className="flex gap-3">
            <Link
              href="/crm/new"
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-black text-sm shadow-lg shadow-blue-200 transition-all"
            >
              <Plus size={18} /> Thêm khách hàng
            </Link>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
          <div className="flex-1">
            <p className="text-sm font-bold text-red-900">Lỗi khi tải dữ liệu</p>
            <p className="text-xs text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="animate-spin text-blue-600" size={32} />
              <p className="text-sm font-bold text-slate-500">Đang tải dữ liệu...</p>
            </div>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Khách hàng</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Phân loại</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Trạng thái</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Người phụ trách</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Tổng chi tiêu</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Hợp đồng</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Users className="text-slate-300" size={48} />
                      <p className="text-sm font-bold text-slate-400">Chưa có khách hàng nào</p>
                      <Link
                        href="/crm/new"
                        className="text-sm text-blue-600 hover:text-blue-700 font-bold"
                      >
                        Thêm khách hàng đầu tiên
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => {
                  const status = getStatusBadge(c.status);
                  const assignedStaffName = c.assignedStaffId ? staffMap.get(c.assignedStaffId) : null;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer group" onClick={(e) => {
                      // If user is selecting text, don't navigate
                      if (window.getSelection()?.toString()) return;
                      setSelectedCustomer(c);
                    }}>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-lg group-hover:scale-110 transition-transform">
                            {c.name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 leading-none">{c.name}</h4>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-2 font-bold">
                               <Phone size={10} /> {c.phone}
                               <span className="text-slate-300">•</span>
                               <span className="font-mono text-slate-400">{c.code}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-tight ${c.type === CustomerType.INDIVIDUAL ? 'text-blue-600 bg-blue-50' : 'text-indigo-600 bg-indigo-50'}`}>
                           {c.type === CustomerType.INDIVIDUAL ? 'Cá nhân' : 'Doanh nghiệp'}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-black ${status.color}`}>
                          {status.icon} {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        {assignedStaffName ? (
                          <div className="flex items-center gap-2">
                            <UserCircle size={14} className="text-slate-400" />
                            <span className="text-xs font-bold text-slate-700">{assignedStaffName}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Chưa phân công</span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-right">
                        {(() => {
                          const stats = allContractsData.get(c.id);
                          const totalPaid = stats?.totalPaid || 0;
                          return (
                            <>
                              <p className="text-sm font-black text-slate-900">{formatVND(totalPaid)}</p>
                              {c.debt > 0 && <p className="text-[10px] text-rose-500 font-bold uppercase tracking-tighter">Nợ: {formatVND(c.debt)}</p>}
                            </>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-5 text-center">
                         {(() => {
                           const stats = allContractsData.get(c.id);
                           const signedCount = stats?.signedCount || 0;
                           return (
                             <span className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-xs font-bold text-slate-600">
                               {signedCount}
                             </span>
                           );
                         })()}
                      </td>
                      <td className="px-6 py-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {canUpdateCustomer && (
                            <Link
                              href={`/crm/${c.id}/edit`}
                              onClick={(e) => e.stopPropagation()}
                              className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-all"
                              title="Chỉnh sửa khách hàng"
                            >
                              <Edit size={18} />
                            </Link>
                          )}
                          {canDeleteCustomer && (
                            <button
                              onClick={(e) => handleDeleteClick(c.id, c.name, e)}
                              className="p-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-all"
                              title="Xóa khách hàng"
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
        )}
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
                  <h2 className="text-xl font-black text-slate-900">Xác nhận xóa khách hàng</h2>
                  <p className="text-sm text-slate-500 mt-1">Hành động này không thể hoàn tác</p>
                </div>
              </div>
              <button 
                onClick={() => setDeleteConfirmModal({ show: false, customerId: null, customerName: null })}
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
                  Bạn có chắc chắn muốn xóa khách hàng này?
                </p>
                <div className="bg-white rounded-xl p-4 border border-red-200">
                  <p className="text-base font-black text-slate-900">
                    {deleteConfirmModal.customerName}
                  </p>
                </div>
                <p className="text-xs text-red-700 mt-4 leading-relaxed">
                  ⚠️ Tất cả thông tin của khách hàng sẽ bị xóa vĩnh viễn khỏi hệ thống. 
                  Hành động này không thể hoàn tác.
                </p>
                <p className="text-xs text-red-600 mt-2 font-bold">
                  Lưu ý: Không thể xóa khách hàng nếu đang có hợp đồng hoặc giao dịch thanh toán liên quan.
                </p>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="px-10 py-6 bg-slate-50 border-t border-slate-100 flex justify-end items-center gap-4">
              <button
                onClick={() => setDeleteConfirmModal({ show: false, customerId: null, customerName: null })}
                disabled={deleting}
                className="px-8 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Hủy
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting || !canDeleteCustomer}
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
