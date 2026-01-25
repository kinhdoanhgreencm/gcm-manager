'use client'

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Save, ArrowLeft,
  Banknote, Calendar, Tag, CreditCard,
  Building, Info, Lock,
  Link2, AlertCircle, FileText, Download, Eye, CheckCircle2, X, Landmark, Search, Clock
} from 'lucide-react';
import { TransactionType, TransactionCategory, TransactionStatus, Transaction, Account } from '@/types';
import { notificationService } from '@/services/notificationService';
import { useAuth } from '@/contexts/AuthContext';

interface PrefillData {
  referenceId: string;
  referenceType: 'CONTRACT' | 'VEHICLE';
  amount: number;
  category: TransactionCategory;
  description: string;
  customerName: string;
  bankName?: string;
  bankAccount?: string;
}

export const TransactionFormPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  
  // Get data from URL params
  const typeParam = searchParams.get('type') as TransactionType | null;
  const transactionId = searchParams.get('transactionId');
  
  const initialType = typeParam || TransactionType.INCOME;
  
  // Parse prefill data from URL if available
  const prefillParam = searchParams.get('prefill');
  const prefill: PrefillData | undefined = prefillParam ? JSON.parse(decodeURIComponent(prefillParam)) : undefined;
  
  const [type, setType] = useState<TransactionType>(initialType);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [existingTransaction, setExistingTransaction] = useState<Transaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const initialLoadComplete = useRef(false);
  const isLoadingExistingTransaction = useRef(false);
  
  // Pending payment schedules modal (for INCOME)
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [pendingSchedules, setPendingSchedules] = useState<any[]>([]);
  const [isLoadingPending, setIsLoadingPending] = useState(false);
  const [selectedContractReference, setSelectedContractReference] = useState<{ id: string; type: 'CONTRACT' } | null>(null);
  const [isAmountLockedFromSelection, setIsAmountLockedFromSelection] = useState(false);
  
  // Pending supplier debts modal (for EXPENSE)
  const [showPendingSupplierModal, setShowPendingSupplierModal] = useState(false);
  const [pendingSuppliers, setPendingSuppliers] = useState<any[]>([]);
  const [isLoadingPendingSuppliers, setIsLoadingPendingSuppliers] = useState(false);
  const [selectedSupplierReference, setSelectedSupplierReference] = useState<{ id: string; type: 'SUPPLIER' } | null>(null);
  
  const isPrefilled = !!prefill;
  const isLocked = existingTransaction?.status === TransactionStatus.APPROVED || 
                   existingTransaction?.status === TransactionStatus.LOCKED;

  // Format datetime to "hh:mm dd/mm/yyyy"
  const formatDateTime = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${hours}:${minutes} ${day}/${month}/${year}`;
  };

  // Parse "hh:mm dd/mm/yyyy" to ISO date string (YYYY-MM-DD) for database
  const parseDateTime = (value: string): string => {
    // Remove extra spaces
    const cleaned = value.trim();
    if (!cleaned) return new Date().toISOString().split('T')[0];
    
    // Match pattern: hh:mm dd/mm/yyyy
    const match = cleaned.match(/(\d{1,2}):(\d{1,2})\s+(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (!match) {
      // If partial input, try to keep current date/time
      return new Date().toISOString().split('T')[0];
    }
    
    const [, hours, minutes, day, month, year] = match;
    const hour = parseInt(hours);
    const minute = parseInt(minutes);
    const dayNum = parseInt(day);
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);
    
    // Validate ranges
    if (hour > 23 || minute > 59 || dayNum > 31 || monthNum > 12 || yearNum < 2000 || yearNum > 2100) {
      return new Date().toISOString().split('T')[0];
    }
    
    const date = new Date(
      yearNum,
      monthNum - 1,
      dayNum,
      hour,
      minute
    );
    
    if (isNaN(date.getTime())) return new Date().toISOString().split('T')[0];
    return date.toISOString().split('T')[0];
  };

  // Form state
  const [accountId, setAccountId] = useState<string>('');
  const [category, setCategory] = useState<TransactionCategory>(prefill?.category || TransactionCategory.CAR_SALE);
  const [dateValue, setDateValue] = useState<string>(formatDateTime(new Date())); // Format: "hh:mm dd/mm/yyyy"
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]); // For database: "YYYY-MM-DD"
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'E_WALLET'>('BANK_TRANSFER');
  const [description, setDescription] = useState<string>(prefill?.description || '');

  // Amount state management
  const initialAmount = existingTransaction?.amount || prefill?.amount || 0;
  const [amountValue, setAmountValue] = useState<string>(() => {
    if (initialAmount) {
      return new Intl.NumberFormat('vi-VN').format(initialAmount);
    }
    return '';
  });

  // Calculate account balance from approved transactions
  const getAccountBalance = (accountId: string, initialBalance: number): number => {
    const accountTransactions = transactions.filter(
      t => t.accountId === accountId && t.status === TransactionStatus.APPROVED
    );
    const income = accountTransactions
      .filter(t => t.type === TransactionType.INCOME)
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = accountTransactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((sum, t) => sum + t.amount, 0);
    return initialBalance + income - expense;
  };

  // Check contract status if prefill is from contract
  useEffect(() => {
    const checkContractStatus = async () => {
      if (prefill?.referenceType === 'CONTRACT' && prefill?.referenceId) {
        try {
          const response = await fetch(`/api/finance/contracts/${prefill.referenceId}`, { cache: 'no-store' });
          const result = await response.json();

          if (response.ok && result?.contract) {
            if (result.contract.status === 'PENDING_APPROVAL') {
              setSubmitError(`Không thể tạo phiếu thu. Hợp đồng ${result.contract.contract_code || prefill.referenceId} đang chờ duyệt và cần được duyệt trước khi tạo phiếu thu.`);
            }
          }
        } catch (err) {
          console.error('Error checking contract status:', err);
        }
      }
    };

    checkContractStatus();
  }, [prefill]);

  // Load accounts and existing transaction
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const accountsResponse = await fetch('/api/finance/accounts?status=ACTIVE', { cache: 'no-store' });
        const accountsResult = await accountsResponse.json();

        if (!accountsResponse.ok) {
          console.error('Error loading accounts:', accountsResult?.error || 'Unknown error');
        } else {
          const formattedAccounts: Account[] = (accountsResult.accounts || []).map((acc: any) => ({
            id: acc.id,
            name: acc.name,
            type: acc.type as 'CASH' | 'BANK' | 'E_WALLET',
            bankName: acc.bank_name,
            accountNumber: acc.account_number,
            balance: Number(acc.balance),
            chartOfAccountId: acc.chart_of_account_id || undefined
          }));
          setAccounts(formattedAccounts);
        }

        const transactionsResponse = await fetch('/api/finance/transactions?limit=1000&orderBy=date&order=desc', { cache: 'no-store' });
        const transactionsResult = await transactionsResponse.json();

        if (!transactionsResponse.ok) {
          console.error('Error loading transactions:', transactionsResult?.error || 'Unknown error');
        } else {
          const formattedTransactions: Transaction[] = (transactionsResult.transactions || []).map((t: any) => ({
            id: t.id,
            date: t.date,
            amount: Number(t.amount),
            type: t.type as TransactionType,
            category: t.category as TransactionCategory,
            description: t.description,
            accountId: t.account_id,
            toAccountId: t.to_account_id,
            referenceId: t.reference_id,
            referenceType: t.reference_type as any,
            paymentMethod: t.payment_method as any,
            status: t.status as TransactionStatus,
            creatorId: t.creator_id,
            approverId: t.approver_id,
            attachments: t.attachments,
            approvedAt: t.approved_at,
            createdAt: t.created_at
          }));
          setTransactions(formattedTransactions);
        }

        // Load existing transaction if transactionId is provided
        if (transactionId) {
          isLoadingExistingTransaction.current = true;
          const transactionResponse = await fetch(`/api/finance/transactions/${transactionId}`, { cache: 'no-store' });
          const transactionResult = await transactionResponse.json();

          if (!transactionResponse.ok) {
            console.error('Error loading transaction:', transactionResult?.error || 'Unknown error');
            isLoadingExistingTransaction.current = false;
          } else if (transactionResult?.transaction) {
            const transactionData = transactionResult.transaction;
            const transaction: Transaction = {
              id: transactionData.id,
              date: transactionData.date,
              amount: Number(transactionData.amount),
              type: transactionData.type as TransactionType,
              category: transactionData.category as TransactionCategory,
              description: transactionData.description,
              accountId: transactionData.account_id,
              toAccountId: transactionData.to_account_id,
              referenceId: transactionData.reference_id,
              referenceType: transactionData.reference_type as any,
              paymentMethod: transactionData.payment_method as any,
              status: transactionData.status as TransactionStatus,
              creatorId: transactionData.creator_id,
              approverId: transactionData.approver_id,
              attachments: transactionData.attachments,
              approvedAt: transactionData.approved_at
            };
            setExistingTransaction(transaction);
            setAccountId(transaction.accountId);
            setCategory(transaction.category);
            // Format transaction date to "hh:mm dd/mm/yyyy"
            const transactionDate = transaction.date ? new Date(transaction.date + 'T00:00:00') : new Date();
            if (transactionData.created_at) {
              const createdAt = new Date(transactionData.created_at);
              setDateValue(formatDateTime(createdAt));
            } else {
              setDateValue(formatDateTime(transactionDate));
            }
            setDate(transaction.date);
            setPaymentMethod(transaction.paymentMethod);
            setDescription(transaction.description);
            setAmountValue(new Intl.NumberFormat('vi-VN').format(transaction.amount));
            // Set contract or supplier reference if exists
            if (transaction.referenceId && transaction.referenceType === 'CONTRACT') {
              setSelectedContractReference({ id: transaction.referenceId, type: 'CONTRACT' });
              setSelectedSupplierReference(null);
            } else if (transaction.referenceId && transaction.referenceType === 'SUPPLIER') {
              setSelectedSupplierReference({ id: transaction.referenceId, type: 'SUPPLIER' });
              setSelectedContractReference(null);
            } else {
              setSelectedContractReference(null);
              setSelectedSupplierReference(null);
            }
            // Reset flag after a short delay to allow state updates to complete
            setTimeout(() => {
              isLoadingExistingTransaction.current = false;
            }, 100);
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
        initialLoadComplete.current = true;
      }
    };

    loadData();
  }, [transactionId]);

  // Format number with thousand separators
  const formatAmount = (value: string): string => {
    // Remove all non-digit characters
    const numericValue = value.replace(/\D/g, '');
    if (!numericValue) return '';
    
    // Format with thousand separators (dots)
    return new Intl.NumberFormat('vi-VN').format(Number(numericValue));
  };

  // Parse formatted string to number
  const parseAmount = (value: string): number => {
    const numericValue = value.replace(/\D/g, '');
    return numericValue ? Number(numericValue) : 0;
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const formatted = formatAmount(inputValue);
    setAmountValue(formatted);
  };

  // Auto-update payment method based on selected account
  useEffect(() => {
    // Only auto-update after initial load is complete and when user changes account
    // Skip if we're currently loading an existing transaction
    if (!initialLoadComplete.current || !accountId || accounts.length === 0 || isLocked || isLoadingExistingTransaction.current) {
      return;
    }

    const selectedAccount = accounts.find(acc => acc.id === accountId);
    if (!selectedAccount) {
      return;
    }

    // Update payment method based on account type
    if (selectedAccount.type === 'CASH' || selectedAccount.name.toLowerCase().includes('tiền mặt')) {
      setPaymentMethod('CASH');
    } else if (selectedAccount.type === 'BANK') {
      setPaymentMethod('BANK_TRANSFER');
    } else if (selectedAccount.type === 'E_WALLET') {
      setPaymentMethod('E_WALLET');
    }
  }, [accountId, accounts, isLocked]);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Load pending payment schedules
  const loadPendingSchedules = async () => {
    setIsLoadingPending(true);
    try {
      const response = await fetch('/api/finance/payment-schedules/pending', { cache: 'no-store' });
      const result = await response.json();

      if (!response.ok) {
        console.error('Error loading pending schedules:', result?.error || 'Unknown error');
        setPendingSchedules([]);
      } else {
        setPendingSchedules(result.schedules || []);
      }
    } catch (error) {
      console.error('Error loading pending schedules:', error);
      setPendingSchedules([]);
    } finally {
      setIsLoadingPending(false);
    }
  };

  // Open modal and load pending schedules (for INCOME)
  const handleOpenPendingModal = () => {
    setShowPendingModal(true);
    loadPendingSchedules();
  };

  // Load pending supplier debts (for EXPENSE)
  const loadPendingSuppliers = async () => {
    setIsLoadingPendingSuppliers(true);
    try {
      const response = await fetch('/api/finance/suppliers/pending', { cache: 'no-store' });
      const result = await response.json();

      if (!response.ok) {
        console.error('Error loading pending suppliers:', result?.error || 'Unknown error');
        setPendingSuppliers([]);
      } else {
        setPendingSuppliers(result.suppliers || []);
      }
    } catch (error) {
      console.error('Error loading pending suppliers:', error);
      setPendingSuppliers([]);
    } finally {
      setIsLoadingPendingSuppliers(false);
    }
  };

  // Open modal and load pending suppliers (for EXPENSE)
  const handleOpenPendingSupplierModal = () => {
    setShowPendingSupplierModal(true);
    loadPendingSuppliers();
  };

  // Select a pending supplier and populate form
  const handleSelectPendingSupplier = (supplier: any) => {
    const paymentNumber = supplier.paymentNumber || 1;
    const remainingDebt = supplier.remainingDebt || 0;
    
    // Populate description theo format: số lần thanh toán + mã nhà cung cấp + tên nhà cung cấp
    const parts = [];
    parts.push(`Đợt ${paymentNumber}`);
    parts.push(supplier.code || supplier.id);
    if (supplier.name) {
      parts.push(supplier.name);
    }
    const newDescription = parts.join(' + ');
    
    setDescription(newDescription);
    
    // Populate amount if it's an expense transaction and lock it
    if (type === TransactionType.EXPENSE && remainingDebt > 0) {
      setAmountValue(new Intl.NumberFormat('vi-VN').format(remainingDebt));
      setIsAmountLockedFromSelection(true);
    }
    
    // Store supplier reference for linking when saving
    setSelectedSupplierReference({ id: supplier.id, type: 'SUPPLIER' });
    
    // Close modal
    setShowPendingSupplierModal(false);
  };

  // Select a pending schedule and populate form
  const handleSelectPendingSchedule = (schedule: any) => {
    const contract = schedule.contracts;
    const amount = Number(schedule.amount || 0);
    const paymentNumber = schedule.paymentNumber || 1;
    
    // Populate description theo format: số lần thanh toán + số hợp đồng + tên khách hàng
    let newDescription = '';
    if (contract) {
      const parts = [];
      parts.push(`Đợt ${paymentNumber}`);
      parts.push(contract.contract_code || '');
      if (contract.customer_name) {
        parts.push(contract.customer_name);
      }
      newDescription = parts.join(' + ');
      
      // Store contract reference for linking when saving
      setSelectedContractReference({ id: contract.id, type: 'CONTRACT' });
    } else {
      // Fallback nếu không có contract info
      newDescription = `Đợt ${paymentNumber}`;
    }
    
    setDescription(newDescription);
    
    // Populate amount if it's an income transaction and lock it
    if (type === TransactionType.INCOME && amount > 0) {
      setAmountValue(new Intl.NumberFormat('vi-VN').format(amount));
      setIsAmountLockedFromSelection(true);
    }
    
    // Close modal
    setShowPendingModal(false);
  };

  const handleSave = async () => {
    const amount = parseAmount(amountValue);
    
    // Validation
    if (amount <= 0) {
      setSubmitError('Vui lòng nhập số tiền hợp lệ');
      return;
    }
    
    // Kiểm tra trạng thái hợp đồng nếu đang tạo phiếu thu từ hợp đồng
    if (prefill?.referenceType === 'CONTRACT' && prefill?.referenceId) {
      try {
        const response = await fetch(`/api/finance/contracts/${prefill.referenceId}`, { cache: 'no-store' });
        const result = await response.json();

        if (response.ok && result?.contract?.status === 'PENDING_APPROVAL') {
          setSubmitError(`Không thể tạo phiếu thu. Hợp đồng ${result.contract.contract_code || prefill.referenceId} đang chờ duyệt và cần được duyệt trước khi tạo phiếu thu.`);
          return;
        }
      } catch (err) {
        console.error('Error checking contract status:', err);
        // Không block nếu có lỗi khi kiểm tra, nhưng log để debug
      }
    }
    
    // Kiểm tra trạng thái hợp đồng nếu đang tạo phiếu thu từ selectedContractReference
    if (selectedContractReference?.type === 'CONTRACT' && selectedContractReference?.id) {
      try {
        const response = await fetch(`/api/finance/contracts/${selectedContractReference.id}`, { cache: 'no-store' });
        const result = await response.json();

        if (response.ok && result?.contract?.status === 'PENDING_APPROVAL') {
          setSubmitError(`Không thể tạo phiếu thu. Hợp đồng ${result.contract.contract_code || selectedContractReference.id} đang chờ duyệt và cần được duyệt trước khi tạo phiếu thu.`);
          return;
        }
      } catch (err) {
        console.error('Error checking contract status:', err);
        // Không block nếu có lỗi khi kiểm tra, nhưng log để debug
      }
    }
    
    if (!accountId) {
      setSubmitError('Vui lòng chọn tài khoản thanh toán');
      return;
    }
    
    if (!category) {
      setSubmitError('Vui lòng chọn danh mục thu chi');
      return;
    }
    
    if (!date) {
      setSubmitError('Vui lòng chọn ngày hạch toán');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Get current user ID
      const storedUser = sessionStorage.getItem('user');
      let creatorId = null;
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          creatorId = user.id;
        } catch (e) {
          console.error('Error parsing user:', e);
        }
      }

      // Prepare transaction data in database format (snake_case)
      const transactionData: any = {
        date: date,
        amount: amount,
        type: type,
        category: category,
        description: description || (prefill?.description || ''),
        account_id: accountId,
        payment_method: paymentMethod,
        status: TransactionStatus.DRAFT,
        creator_id: creatorId
      };

      // Add reference data if available
      if (prefill) {
        transactionData.reference_id = prefill.referenceId;
        transactionData.reference_type = prefill.referenceType;
      } else if (selectedContractReference) {
        transactionData.reference_id = selectedContractReference.id;
        transactionData.reference_type = selectedContractReference.type;
      } else if (selectedSupplierReference) {
        transactionData.reference_id = selectedSupplierReference.id;
        transactionData.reference_type = selectedSupplierReference.type;
      } else if (existingTransaction?.referenceId) {
        transactionData.reference_id = existingTransaction.referenceId;
        transactionData.reference_type = existingTransaction.referenceType;
      }

      // Insert or update transaction
      let result;
      if (existingTransaction) {
        const response = await fetch(`/api/finance/transactions/${existingTransaction.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transaction: transactionData })
        });
        const responseData = await response.json();
        if (!response.ok) {
          throw new Error(responseData?.error || 'Lỗi cập nhật phiếu thu/chi');
        }
        result = responseData?.transaction;
      } else {
        const response = await fetch('/api/finance/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transaction: transactionData })
        });
        const responseData = await response.json();
        if (!response.ok) {
          throw new Error(responseData?.error || 'Lỗi tạo phiếu thu/chi');
        }
        result = responseData?.transaction;
      }

      // Gửi thông báo cho ADMIN, DIRECTOR và OPERATIONS_DIRECTOR khi tạo phiếu thu chi mới
      // Chỉ gửi khi là transaction mới (không phải update)
      if (!existingTransaction && result) {
        try {
          const transactionTypeText = type === TransactionType.INCOME ? 'Phiếu thu' : 'Phiếu chi';
          
          // Mapping payment method to Vietnamese text
          const paymentMethodTextMap: { [key: string]: string } = {
            'CASH': 'Tiền mặt tại quỹ',
            'BANK_TRANSFER': 'Chuyển khoản ngân hàng',
            'E_WALLET': 'Ví điện tử / Khác'
          };
          const paymentMethodText = paymentMethodTextMap[paymentMethod] || paymentMethod;
          
          const formattedAmount = new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
          }).format(amount);

          // Lấy tên tài khoản
          const selectedAccount = accounts.find(acc => acc.id === accountId);
          const accountName = selectedAccount?.name || 'N/A';

          const message = 
            `${transactionTypeText} mới đã được tạo:\n` +
            `• Loại: ${transactionTypeText}\n` +
            `• Danh mục: ${category}\n` +
            `• Số tiền: ${formattedAmount}\n` +
            `• Tài khoản: ${accountName}\n` +
            `• Phương thức: ${paymentMethodText}\n` +
            `• Ngày: ${new Date(date).toLocaleDateString('vi-VN')}\n` +
            `${description ? `• Mô tả: ${description}\n` : ''}` +
            `• Trạng thái: Nháp`;

          await notificationService.createNotificationForRoles(
            ['ADMIN', 'DIRECTOR', 'OPERATIONS_DIRECTOR'],
            {
              title: `${transactionTypeText} mới: ${formattedAmount}`,
              message: message,
              type: type === TransactionType.INCOME ? 'SUCCESS' : 'INFO',
              referenceType: 'TRANSACTION',
              referenceId: result.id,
              actionUrl: `/finance`,
              metadata: {
                transactionId: result.id,
                transactionType: type,
                transactionTypeText: transactionTypeText,
                category: category,
                amount: amount,
                accountId: accountId,
                accountName: accountName,
                paymentMethod: paymentMethod,
                paymentMethodText: paymentMethodText,
                date: date,
                description: description,
                status: TransactionStatus.DRAFT,
                createdBy: user?.id,
                createdByName: user?.full_name || user?.username
              }
            }
          );
        } catch (notificationError) {
          // Log lỗi nhưng không chặn việc tạo transaction
          console.error('Error sending notification:', notificationError);
        }
      }

      // Success - redirect to finance page
      router.push('/finance');
    } catch (error: any) {
      console.error('Error saving transaction:', error);
      setSubmitError(error.message || 'Có lỗi xảy ra khi lưu giao dịch. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  // Get payment method display text
  const getPaymentMethodText = (method: 'CASH' | 'BANK_TRANSFER' | 'E_WALLET'): string => {
    switch (method) {
      case 'CASH':
        return 'Tiền mặt tại quỹ';
      case 'BANK_TRANSFER':
        return 'Chuyển khoản ngân hàng';
      case 'E_WALLET':
        return 'Ví điện tử / Khác';
      default:
        return '-- Chưa chọn tài khoản --';
    }
  };

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

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white rounded-[40px] shadow-2xl overflow-hidden">
        
        {isPrefilled && (
          <div className="bg-blue-600 text-white px-10 py-2 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest">
            <Link2 size={14} /> Phiếu thu được tạo tự động từ Hợp đồng
          </div>
        )}

        {submitError && (
          <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-700 px-10 py-4 flex items-center gap-3">
            <AlertCircle size={20} />
            <p className="text-sm font-bold">{submitError}</p>
          </div>
        )}

        <div className="px-10 py-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={handleCancel}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <ArrowLeft size={24} className="text-slate-400" />
            </button>
            <div>
              <h3 className="text-2xl font-black text-slate-900">
                {type === TransactionType.INCOME ? 'Tạo phiếu THU' : 'Tạo phiếu CHI'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {prefill ? `Đang xử lý tài chính cho: ${prefill.customerName}` : 'Ghi nhận biến động dòng tiền vào hệ thống'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-10 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Amount - Hero Section in Form */}
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Số tiền giao dịch (VND) *</label>
              <div className="relative">
                <div className={`absolute left-5 top-1/2 -translate-y-1/2 p-3 rounded-2xl z-10 ${type === TransactionType.INCOME ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                   {(isLocked || isPrefilled || isAmountLockedFromSelection) ? <Lock size={24} /> : <Banknote size={24} />}
                </div>
                <div className="relative">
                  <input 
                    type="text" 
                    readOnly={isLocked || isPrefilled || isAmountLockedFromSelection}
                    value={amountValue}
                    onChange={handleAmountChange}
                    className={`w-full pl-20 pr-20 py-6 rounded-[32px] text-4xl font-black outline-none transition-all ${
                      (isLocked || isPrefilled || isAmountLockedFromSelection) ? 'bg-slate-50 text-slate-500 border-none' : 'bg-slate-50 border border-slate-200 focus:ring-8 focus:ring-blue-500/5 focus:bg-white'
                    }`}
                    placeholder="0"
                  />
                  <span className="absolute right-8 top-1/2 -translate-y-1/2 text-4xl font-black text-slate-400 pointer-events-none">
                    đ
                  </span>
                </div>
              </div>
              {(isPrefilled || isAmountLockedFromSelection) && (
                <p className="mt-3 text-[10px] text-blue-600 font-black uppercase tracking-tighter flex items-center gap-2">
                  <Info size={12} /> {isPrefilled ? 'Số tiền được bảo mật theo giá trị hợp đồng' : 'Số tiền được khóa từ danh sách đã chọn'}
                </p>
              )}
            </div>

            <div className="space-y-6">
              {/* Account Selection */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {type === TransactionType.INCOME ? 'Tài khoản thu' : 'Tài khoản chi'}
                </label>
                <div className="relative">
                  <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <select 
                    disabled={isLocked}
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full pl-12 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none appearance-none disabled:bg-slate-100 focus:ring-4 focus:ring-blue-500/5 transition-all"
                  >
                    <option value="">-- Chọn tài khoản nhận/chi --</option>
                    {accounts.map(acc => {
                      const balance = getAccountBalance(acc.id, Number(acc.balance));
                      return (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({new Intl.NumberFormat('vi-VN').format(balance)})
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Category */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Danh mục thu chi</label>
                <div className="relative">
                  <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <select 
                    disabled={isLocked || isPrefilled}
                    value={category}
                    onChange={(e) => setCategory(e.target.value as TransactionCategory)}
                    className="w-full pl-12 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none appearance-none disabled:bg-slate-100 focus:ring-4 focus:ring-blue-500/5 transition-all"
                  >
                    {Object.values(TransactionCategory).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Date */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngày hạch toán</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                  <input 
                    type="text" 
                    disabled={isLocked}
                    value={dateValue}
                    onChange={(e) => {
                      setDateValue(e.target.value);
                      // Parse và cập nhật date cho database
                      const parsedDate = parseDateTime(e.target.value);
                      setDate(parsedDate);
                    }}
                    onBlur={(e) => {
                      // Đảm bảo format đúng khi blur
                      const parsedDate = parseDateTime(e.target.value);
                      const timeMatch = e.target.value.match(/(\d{1,2}):(\d{1,2})/);
                      if (timeMatch) {
                        const dateObj = new Date(parsedDate + 'T' + timeMatch[0] + ':00');
                        if (!isNaN(dateObj.getTime())) {
                          setDateValue(formatDateTime(dateObj));
                          setDate(parsedDate);
                        } else {
                          // Nếu không parse được, reset về thời gian hiện tại
                          const now = new Date();
                          setDateValue(formatDateTime(now));
                          setDate(now.toISOString().split('T')[0]);
                        }
                      } else {
                        // Nếu không có giờ, dùng ngày với giờ hiện tại
                        const now = new Date();
                        const dateOnly = new Date(parsedDate + 'T' + now.toTimeString().slice(0, 8));
                        if (!isNaN(dateOnly.getTime())) {
                          setDateValue(formatDateTime(dateOnly));
                          setDate(parsedDate);
                        } else {
                          const now = new Date();
                          setDateValue(formatDateTime(now));
                          setDate(now.toISOString().split('T')[0]);
                        }
                      }
                    }}
                    placeholder="hh:mm dd/mm/yyyy"
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none disabled:bg-slate-100 focus:ring-4 focus:ring-blue-500/5 font-mono" 
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Phương thức thanh toán</label>
                <div className="relative">
                  <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    readOnly
                    value={accountId ? getPaymentMethodText(paymentMethod) : '-- Chưa chọn tài khoản --'}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none cursor-default text-slate-700"
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="md:col-span-2 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Nội dung chi tiết giao dịch</label>
                {!isLocked && !isPrefilled && (
                  type === TransactionType.INCOME ? (
                    <button
                      onClick={handleOpenPendingModal}
                      type="button"
                      className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl text-xs font-bold transition-all"
                    >
                      <Search size={14} />
                      Chọn giao dịch chờ thanh toán
                    </button>
                  ) : (
                    <button
                      onClick={handleOpenPendingSupplierModal}
                      type="button"
                      className="flex items-center gap-2 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition-all"
                    >
                      <Search size={14} />
                      Chọn công nợ nhà cung cấp
                    </button>
                  )
                )}
              </div>
              <textarea 
                rows={3} 
                readOnly={isLocked || isPrefilled}
                value={description || (prefill?.description || '')}
                onChange={(e) => setDescription(e.target.value)}
                className={`w-full p-6 rounded-3xl text-sm font-medium outline-none transition-all ${
                  (isLocked || isPrefilled) ? 'bg-slate-50 text-slate-500 border-none italic' : 'bg-slate-50 border border-slate-200 focus:ring-8 focus:ring-blue-500/5 focus:bg-white'
                }`}
                placeholder="Nhập ghi chú diễn giải cho phiếu này..."
              ></textarea>
            </div>

            {/* Supplier Bank Information */}
            {prefill && (prefill.bankName || prefill.bankAccount) && (
              <div className="md:col-span-2 space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Thông tin ngân hàng của khách hàng</label>
                <div className="bg-blue-50 border border-blue-200 rounded-3xl p-6 space-y-3">
                  {prefill.bankName && (
                    <div className="flex items-center gap-3">
                      <Landmark className="text-blue-600" size={18} />
                      <div>
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Tên ngân hàng</p>
                        <p className="text-sm font-bold text-slate-900">{prefill.bankName}</p>
                      </div>
                    </div>
                  )}
                  {prefill.bankAccount && (
                    <div className="flex items-center gap-3">
                      <CreditCard className="text-blue-600" size={18} />
                      <div>
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Số tài khoản</p>
                        <p className="text-sm font-bold text-slate-900 font-mono">{prefill.bankAccount}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Chi tiết phiếu thu đã hoàn tất thanh toán */}
          {isLocked && existingTransaction && existingTransaction.status === TransactionStatus.APPROVED && (
            <div className="mt-10 pt-10 border-t-2 border-slate-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h4 className="text-lg font-black text-slate-900">Chi tiết phiếu thu đã hoàn tất</h4>
                  <p className="text-xs text-slate-500">Thông tin và chứng từ thanh toán</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Mã phiếu thu</p>
                  <p className="text-lg font-black text-slate-900 font-mono">#{existingTransaction.id.substring(0, 8).toUpperCase()}</p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Trạng thái</p>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    <p className="text-lg font-black text-emerald-600">Đã hoàn tất thanh toán</p>
                  </div>
                </div>
                {existingTransaction.approvedAt && (
                  <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Thời gian hoàn tất</p>
                    <p className="text-sm font-bold text-slate-700">
                      {new Date(existingTransaction.approvedAt).toLocaleString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                )}
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tài khoản</p>
                  <p className="text-sm font-bold text-slate-700">
                    {accounts.find(a => a.id === existingTransaction.accountId)?.name || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Chứng từ đã upload */}
              {existingTransaction.attachments && existingTransaction.attachments.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <FileText size={18} className="text-slate-600" />
                    <h5 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                      Chứng từ thanh toán ({existingTransaction.attachments.length})
                    </h5>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {existingTransaction.attachments.map((url, index) => {
                      const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
                      const fileName = url.split('/').pop() || `Chứng từ ${index + 1}`;
                      
                      return (
                        <div key={index} className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow">
                          {isImage ? (
                            <div className="relative aspect-video bg-slate-100">
                              <img 
                                src={url} 
                                alt={`Chứng từ ${index + 1}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                              <div className="hidden absolute inset-0 flex items-center justify-center bg-slate-100">
                                <FileText size={32} className="text-slate-400" />
                              </div>
                              <div className="absolute top-2 right-2 flex gap-2">
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="p-2 bg-white/90 hover:bg-white rounded-lg shadow-md transition-colors"
                                  title="Xem"
                                >
                                  <Eye size={16} className="text-blue-600" />
                                </a>
                                <a
                                  href={url}
                                  download
                                  onClick={(e) => e.stopPropagation()}
                                  className="p-2 bg-white/90 hover:bg-white rounded-lg shadow-md transition-colors"
                                  title="Tải xuống"
                                >
                                  <Download size={16} className="text-emerald-600" />
                                </a>
                              </div>
                            </div>
                          ) : (
                            <div className="p-6 flex flex-col items-center justify-center bg-slate-50">
                              <FileText size={48} className="text-slate-400 mb-3" />
                              <p className="text-xs font-bold text-slate-600 text-center truncate w-full px-2">{fileName}</p>
                            </div>
                          )}
                          <div className="p-3 border-t border-slate-100">
                            <p className="text-xs font-bold text-slate-700 truncate">{fileName}</p>
                            <div className="flex gap-2 mt-2">
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold hover:bg-blue-100 transition-colors"
                              >
                                <Eye size={12} /> Xem
                              </a>
                              <a
                                href={url}
                                download
                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold hover:bg-emerald-100 transition-colors"
                              >
                                <Download size={12} /> Tải
                              </a>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pending Payment Schedules Modal */}
        {showPendingModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="px-10 py-6 border-b border-slate-100 flex justify-between items-center bg-white">
                <div>
                  <h3 className="text-2xl font-black text-slate-900">Chọn giao dịch chờ thanh toán</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    Chọn một giao dịch để tự động điền thông tin thanh toán
                  </p>
                </div>
                <button
                  onClick={() => setShowPendingModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={24} className="text-slate-400" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-10">
                {isLoadingPending ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-slate-500">Đang tải danh sách...</p>
                    </div>
                  </div>
                ) : pendingSchedules.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <Clock size={48} className="text-slate-300 mb-4" />
                    <p className="text-slate-500 font-bold">Không có giao dịch nào đang chờ thanh toán</p>
                    <p className="text-xs text-slate-400 mt-2">Tất cả các khoản thanh toán đã được xử lý</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingSchedules.map((schedule) => {
                      const contract = schedule.contracts;
                      const isOverdue = schedule.status === 'OVERDUE';
                      const dueDate = schedule.due_date ? new Date(schedule.due_date).toLocaleDateString('vi-VN') : 'N/A';
                      const paymentNumber = schedule.paymentNumber || 1;
                      
                      return (
                        <button
                          key={schedule.id}
                          onClick={() => handleSelectPendingSchedule(schedule)}
                          className="w-full text-left p-6 bg-slate-50 hover:bg-blue-50 border-2 border-slate-200 hover:border-blue-300 rounded-2xl transition-all group"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl ${isOverdue ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                                  <Clock size={16} />
                                </div>
                                <h4 className="text-lg font-black text-slate-900 group-hover:text-blue-600">
                                  Đợt {paymentNumber} - {schedule.milestone_name || 'Không có tên'}
                                </h4>
                                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                                  isOverdue 
                                    ? 'bg-rose-100 text-rose-600' 
                                    : 'bg-amber-100 text-amber-600'
                                }`}>
                                  {isOverdue ? 'Quá hạn' : 'Chờ thanh toán'}
                                </span>
                              </div>
                              
                              {contract && (
                                <div className="flex items-center gap-4 text-sm text-slate-600">
                                  <div className="flex items-center gap-2">
                                    <FileText size={14} />
                                    <span className="font-bold">Hợp đồng: {contract.contract_code}</span>
                                  </div>
                                  {contract.customer_name && (
                                    <div className="flex items-center gap-2">
                                      <Building size={14} />
                                      <span>{contract.customer_name}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              <div className="flex items-center gap-4 text-xs text-slate-500">
                                <div className="flex items-center gap-2">
                                  <Calendar size={12} />
                                  <span>Hạn thanh toán: {dueDate}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <div className="text-2xl font-black text-emerald-600">
                                {new Intl.NumberFormat('vi-VN').format(Number(schedule.amount || 0))} đ
                              </div>
                              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                                Số tiền
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-10 py-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setShowPendingModal(false)}
                  className="px-8 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pending Supplier Debts Modal (for EXPENSE) */}
        {showPendingSupplierModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="px-10 py-6 border-b border-slate-100 flex justify-between items-center bg-white">
                <div>
                  <h3 className="text-2xl font-black text-slate-900">Chọn công nợ nhà cung cấp</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    Chọn một nhà cung cấp để tự động điền thông tin thanh toán công nợ
                  </p>
                </div>
                <button
                  onClick={() => setShowPendingSupplierModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={24} className="text-slate-400" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-10">
                {isLoadingPendingSuppliers ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600 mx-auto mb-4"></div>
                      <p className="text-slate-500">Đang tải danh sách...</p>
                    </div>
                  </div>
                ) : pendingSuppliers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <Clock size={48} className="text-slate-300 mb-4" />
                    <p className="text-slate-500 font-bold">Không có công nợ nhà cung cấp nào đang chờ thanh toán</p>
                    <p className="text-xs text-slate-400 mt-2">Tất cả các khoản nợ đã được thanh toán</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingSuppliers.map((supplier) => {
                      const paymentNumber = supplier.paymentNumber || 1;
                      const remainingDebt = supplier.remainingDebt || 0;
                      
                      return (
                        <button
                          key={supplier.id}
                          onClick={() => handleSelectPendingSupplier(supplier)}
                          className="w-full text-left p-6 bg-slate-50 hover:bg-rose-50 border-2 border-slate-200 hover:border-rose-300 rounded-2xl transition-all group"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-rose-100 text-rose-600">
                                  <Building size={16} />
                                </div>
                                <h4 className="text-lg font-black text-slate-900 group-hover:text-rose-600">
                                  Đợt {paymentNumber} - {supplier.name || 'N/A'}
                                </h4>
                                <span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-600">
                                  Chờ thanh toán
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-4 text-sm text-slate-600">
                                <div className="flex items-center gap-2">
                                  <FileText size={14} />
                                  <span className="font-bold">Mã NCC: {supplier.code || supplier.id}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <div className="text-2xl font-black text-rose-600">
                                {new Intl.NumberFormat('vi-VN').format(remainingDebt)} đ
                              </div>
                              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                                Công nợ còn lại
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-10 py-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setShowPendingSupplierModal(false)}
                  className="px-8 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="px-10 py-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-4">
          <button onClick={handleCancel} className="px-8 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all">
            Hủy
          </button>
          {!isLocked && (
            <button 
              onClick={handleSave}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-12 py-3 bg-blue-600 text-white rounded-2xl text-sm font-black hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={18} /> {isSubmitting ? 'Đang lưu...' : 'Xác nhận & Lưu chứng từ'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

