'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowUpRight, ArrowDownRight, Filter, 
  Download, Plus, Receipt, History, PieChart as PieChartIcon,
  CreditCard, Banknote, Building2, Search, ArrowLeftRight, Landmark,
  CheckCircle2, Clock, Lock, ArrowRight, Eye, Upload, X, CheckCircle,
  TrendingUp, TrendingDown
} from 'lucide-react';
import { TransactionType, TransactionCategory, TransactionStatus, Transaction, Account } from '@/types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { useReload } from '@/contexts/ReloadContext';
import { hasAnyPermission, PermissionCategories } from '@/utils/permissions';
import { AccessDenied } from './AccessDenied';

export const Finance: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { reloadKey } = useReload();
  const [activeView, setActiveView] = useState<'history' | 'cashflow'>('history');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState<TransactionType | 'ALL'>('ALL');
  const [filterStatus, setFilterStatus] = useState<TransactionStatus | 'ALL'>('ALL');
  const [filterCategory, setFilterCategory] = useState<TransactionCategory | 'ALL'>('ALL');
  const [filterAccount, setFilterAccount] = useState<string>('ALL');
  const [filterSearch, setFilterSearch] = useState<string>('');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  
  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // Calculate income and expense totals for each account
  // Chỉ tính các transaction đã APPROVED (đã hoàn tất thanh toán)
  const getAccountTotals = (accountId: string, initialBalance: number) => {
    const accountTransactions = transactions.filter(
      t => t.accountId === accountId && t.status === TransactionStatus.APPROVED
    );
    const income = accountTransactions
      .filter(t => t.type === TransactionType.INCOME)
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = accountTransactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((sum, t) => sum + t.amount, 0);
    const netBalance = initialBalance + income - expense; // Số dư ban đầu + Tổng thu - Tổng chi
    return { income, expense, netBalance };
  };

  // Calculate total balance across all accounts
  const getTotalBalance = () => {
    if (accounts.length === 0) return 0;
    return accounts.reduce((total, acc) => {
      const totals = getAccountTotals(acc.id, acc.balance);
      return total + totals.netBalance;
    }, 0);
  };

  // Calculate cashflow data by date for chart
  // Chỉ tính các transaction đã APPROVED (đã hoàn tất thanh toán)
  const getCashflowData = () => {
    // Group transactions by date - chỉ lấy các transaction đã APPROVED
    const dateMap = new Map<string, { income: number; expense: number; date: string }>();
    
    transactions
      .filter(t => t.status === TransactionStatus.APPROVED)
      .forEach(t => {
        const date = t.date;
        if (!dateMap.has(date)) {
          dateMap.set(date, { income: 0, expense: 0, date });
        }
        const data = dateMap.get(date)!;
        if (t.type === TransactionType.INCOME) {
          data.income += t.amount;
        } else if (t.type === TransactionType.EXPENSE) {
          data.expense += t.amount;
        }
      });

    // Convert to array and sort by date
    const data = Array.from(dateMap.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(item => ({
        date: new Date(item.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
        fullDate: item.date,
        Thu: item.income,
        Chi: item.expense,
        'Dòng tiền ròng': item.income - item.expense
      }));

    return data;
  };

  // Calculate summary statistics
  // Chỉ tính các transaction đã APPROVED (đã hoàn tất thanh toán)
  const getCashflowSummary = () => {
    const totalIncome = transactions
      .filter(t => t.type === TransactionType.INCOME && t.status === TransactionStatus.APPROVED)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpense = transactions
      .filter(t => t.type === TransactionType.EXPENSE && t.status === TransactionStatus.APPROVED)
      .reduce((sum, t) => sum + t.amount, 0);

    const netCashflow = totalIncome - totalExpense;

    return { totalIncome, totalExpense, netCashflow };
  };

  // Format date to "hh:mm dd/mm/yyyy"
  const formatDateTime = (date: string, createdAt?: string): string => {
    // Ưu tiên dùng created_at nếu có (có cả giờ), nếu không dùng date với giờ 00:00
    const dateTime = createdAt ? new Date(createdAt) : new Date(date + 'T00:00:00');
    
    if (isNaN(dateTime.getTime())) {
      return date; // Trả về nguyên bản nếu không parse được
    }

    const hours = dateTime.getHours().toString().padStart(2, '0');
    const minutes = dateTime.getMinutes().toString().padStart(2, '0');
    const day = dateTime.getDate().toString().padStart(2, '0');
    const month = (dateTime.getMonth() + 1).toString().padStart(2, '0');
    const year = dateTime.getFullYear();

    return `${hours}:${minutes} ${day}/${month}/${year}`;
  };

  const loadFinanceData = async () => {
    try {
      // Load accounts
      const accountsResponse = await fetch('/api/finance/accounts?status=ACTIVE', { cache: 'no-store' });
      const accountsResult = await accountsResponse.json();

      if (!accountsResponse.ok) {
        console.error('Error loading accounts:', accountsResult?.error || 'Unknown error');
        setAccounts([]);
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

        formattedAccounts.sort((a, b) => {
          if (a.name === 'Tiền mặt') return -1;
          if (b.name === 'Tiền mặt') return 1;
          if (a.type === 'CASH' && b.type !== 'CASH') return -1;
          if (b.type === 'CASH' && a.type !== 'CASH') return 1;
          return a.name.localeCompare(b.name);
        });

        setAccounts(formattedAccounts);
      }

      // Load transactions
      const transactionsResponse = await fetch(
        '/api/finance/transactions?limit=100&orderBy=date&order=desc',
        { cache: 'no-store' }
      );
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
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  // Load accounts and transactions from database
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await loadFinanceData();
      setIsLoading(false);
    };

    loadData();
  }, [reloadKey]); // Re-fetch when reloadKey changes

  const getStatusBadge = (status: TransactionStatus) => {
    switch(status) {
      case TransactionStatus.APPROVED:
        return { label: 'Đã hoàn tất thanh toán', class: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle2 size={12} /> };
      case TransactionStatus.PENDING:
        return { label: 'Đang chờ duyệt', class: 'bg-amber-100 text-amber-700', icon: <Clock size={12} /> };
      case TransactionStatus.LOCKED:
        return { label: 'Đã khóa sổ', class: 'bg-slate-200 text-slate-700', icon: <Lock size={12} /> };
      default:
        return { label: 'Bản nháp', class: 'bg-slate-100 text-slate-400', icon: <History size={12} /> };
    }
  };

  const openForm = (type: TransactionType) => {
    router.push(`/finance/new?type=${type}`);
  };

  const viewTransaction = (t: Transaction) => {
    router.push(`/finance/receipt/${t.id}`);
  };

  const handleRowClick = (t: Transaction) => {
    viewTransaction(t);
  };

  // Filter transactions based on filter criteria
  const getFilteredTransactions = () => {
    return transactions.filter(t => {
      // Filter by type
      if (filterType !== 'ALL' && t.type !== filterType) return false;
      
      // Filter by status
      if (filterStatus !== 'ALL' && t.status !== filterStatus) return false;
      
      // Filter by category
      if (filterCategory !== 'ALL' && t.category !== filterCategory) return false;
      
      // Filter by account
      if (filterAccount !== 'ALL' && t.accountId !== filterAccount) return false;
      
      // Filter by search text (description or ID)
      if (filterSearch) {
        const searchLower = filterSearch.toLowerCase();
        const matchesDescription = t.description?.toLowerCase().includes(searchLower);
        const matchesId = t.id.toLowerCase().includes(searchLower);
        if (!matchesDescription && !matchesId) return false;
      }
      
      // Filter by date range
      if (filterDateFrom && t.date < filterDateFrom) return false;
      if (filterDateTo && t.date > filterDateTo) return false;
      
      return true;
    });
  };

  const filteredTransactions = getFilteredTransactions();

  // Reset all filters
  const resetFilters = () => {
    setFilterType('ALL');
    setFilterStatus('ALL');
    setFilterCategory('ALL');
    setFilterAccount('ALL');
    setFilterSearch('');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  // Check if any filter is active
  const hasActiveFilters = filterType !== 'ALL' || 
    filterStatus !== 'ALL' || 
    filterCategory !== 'ALL' || 
    filterAccount !== 'ALL' || 
    filterSearch !== '' || 
    filterDateFrom !== '' || 
    filterDateTo !== '';

  const handleUploadReceipt = async (e: React.MouseEvent, t: Transaction) => {
    e.stopPropagation(); // Prevent row click
    setSelectedTransaction(t);
    setShowUploadModal(true);
    setUploadFiles([]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setUploadFiles(prev => [...prev, ...files]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== index));
  };

  /*
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleUploadSubmitLegacy = async () => {
    if (!selectedTransaction || uploadFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress('Đang upload chứng từ...');

    try {
      const uploadedUrls: string[] = [];
      const transactionId = selectedTransaction.id;

      // Upload từng file lên Supabase Storage
      for (let i = 0; i < uploadFiles.length; i++) {
        const file = uploadFiles[i];
        setUploadProgress(`Đang upload file ${i + 1}/${uploadFiles.length}: ${file.name}`);
        
        const fileExt = file.name.split('.').pop();
        const fileName = `transactions/${transactionId}/${Date.now()}-${i}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('ERP')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Error uploading file:', uploadError);
          throw new Error(`Lỗi upload file "${file.name}": ${uploadError.message}`);
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('ERP')
          .getPublicUrl(fileName);

        if (urlData?.publicUrl) {
          uploadedUrls.push(urlData.publicUrl);
        }
      }

      // Update transaction với attachments và status APPROVED
      const existingAttachments = selectedTransaction.attachments || [];
      const newAttachments = [...existingAttachments, ...uploadedUrls];

      // Get current account balance from database (lấy mới nhất)
      const { data: accountData, error: accountFetchError } = await supabase
        .from('accounts')
        .select('balance, name')
        .eq('id', selectedTransaction.accountId)
        .single();

      if (accountFetchError || !accountData) {
        console.error('Error fetching account:', accountFetchError);
        throw new Error('Không tìm thấy tài khoản');
      }

      console.log('Transaction info:', {
        id: selectedTransaction.id,
        type: selectedTransaction.type,
        amount: selectedTransaction.amount,
        status: selectedTransaction.status,
        accountId: selectedTransaction.accountId,
        accountName: accountData.name
      });

      // Calculate new balance (cộng cho INCOME, trừ cho EXPENSE)
      // Chỉ cập nhật nếu transaction chưa được approved (tránh cộng trừ nhiều lần)
      let currentBalance = Number(accountData.balance);
      let newBalance = currentBalance;
      
      console.log(`Current balance của ${accountData.name}: ${currentBalance}`);
      console.log(`Transaction status: ${selectedTransaction.status}`);
      
      if (selectedTransaction.status !== TransactionStatus.APPROVED) {
        // Chỉ cập nhật balance nếu transaction chưa được approved
        if (selectedTransaction.type === TransactionType.INCOME) {
          newBalance = currentBalance + Number(selectedTransaction.amount);
          console.log(`[INCOME] Cộng tiền: ${currentBalance} + ${selectedTransaction.amount} = ${newBalance}`);
        } else if (selectedTransaction.type === TransactionType.EXPENSE) {
          newBalance = currentBalance - Number(selectedTransaction.amount);
          console.log(`[EXPENSE] Trừ tiền: ${currentBalance} - ${selectedTransaction.amount} = ${newBalance}`);
        } else {
          console.log(`[TRANSFER] Không cập nhật balance cho TRANSFER`);
        }
      } else {
        console.log('⚠️ Transaction đã được approved từ trước, không cập nhật balance');
      }

      // Update account balance
      if (newBalance !== currentBalance) {
        console.log(`Đang cập nhật balance của ${accountData.name}: ${currentBalance} -> ${newBalance}`);
        const { error: accountUpdateError } = await supabase
          .from('accounts')
          .update({ balance: newBalance })
          .eq('id', selectedTransaction.accountId);

        if (accountUpdateError) {
          console.error('❌ Error updating account balance:', accountUpdateError);
          throw new Error(`Lỗi cập nhật số dư tài khoản: ${accountUpdateError.message}`);
        }
        console.log(`✅ Đã cập nhật balance thành công: ${currentBalance} -> ${newBalance}`);
      } else {
        console.log('⚠️ Balance không thay đổi, bỏ qua update');
      }

      // Update transaction với attachments và status APPROVED
      const { error: updateError } = await supabase
        .from('transactions')
        .update({ 
          attachments: newAttachments,
          status: TransactionStatus.APPROVED,
          approved_at: new Date().toISOString()
        })
        .eq('id', selectedTransaction.id);

      if (updateError) {
        throw updateError;
      }

      // Nếu transaction liên quan đến hợp đồng, kiểm tra và cập nhật transaction_status của xe
      if (selectedTransaction.referenceType === 'CONTRACT' && selectedTransaction.referenceId) {
        const { updateVehicleTransactionStatusIfNeeded } = await import('@/services/vehicleStatusService');
        await updateVehicleTransactionStatusIfNeeded(selectedTransaction.referenceId);

        // Kiểm tra và cập nhật contract status thành COMPLETED nếu thanh toán đủ 100%
        try {
          // Lấy thông tin contract
          const { data: contractData, error: contractError } = await supabase
            .from('contracts')
            .select('id, total_amount, status, customer_phone, customer_name')
            .eq('id', selectedTransaction.referenceId)
            .single();

          if (!contractError && contractData) {
            // Tính tổng số tiền đã thanh toán từ các transaction đã approved
            const { data: approvedTransactions, error: transactionsError } = await supabase
              .from('transactions')
              .select('amount')
              .eq('reference_type', 'CONTRACT')
              .eq('reference_id', selectedTransaction.referenceId)
              .in('status', ['APPROVED', 'LOCKED'])
              .eq('type', 'INCOME');

            if (!transactionsError && approvedTransactions) {
              const totalPaidAmount = approvedTransactions.reduce(
                (sum, t) => sum + Number(t.amount || 0),
                0
              );
              const totalAmount = Number(contractData.total_amount || 0);
              const currentStatus = contractData.status;

              // Nếu thanh toán đủ 100% và status chưa phải COMPLETED, cập nhật
              if (totalAmount > 0 && totalPaidAmount >= totalAmount && currentStatus !== 'COMPLETED') {
                // Get current user ID
                const getCurrentUser = () => {
                  try {
                    const storedUser = localStorage.getItem('user');
                    if (storedUser) {
                      const user = JSON.parse(storedUser);
                      return user.id;
                    }
                  } catch (error) {
                    console.error('Error getting current user:', error);
                  }
                  return null;
                };

                const userId = getCurrentUser();

                const { error: contractStatusError } = await supabase
                  .from('contracts')
                  .update({
                    status: 'COMPLETED',
                    updated_by: userId
                  })
                  .eq('id', selectedTransaction.referenceId);

                if (contractStatusError) {
                  console.error('Error updating contract status to COMPLETED:', contractStatusError);
                } else {
                  console.log(`✅ Đã cập nhật contract ${selectedTransaction.referenceId} status thành COMPLETED`);
                  
                  // Cập nhật trạng thái khách hàng thành LOYAL khi hợp đồng hoàn thành
                  try {
                    const { updateCustomerStatusOnContractCompleted } = await import('@/services/customerStatusService');
                    await updateCustomerStatusOnContractCompleted(contractData.customer_phone || '', contractData.customer_name);
                  } catch (customerStatusError) {
                    console.error('Error updating customer status to LOYAL:', customerStatusError);
                    // Không throw error vì contract đã được cập nhật
                  }
                }
              }
            }
          }
        } catch (err) {
          console.error('Error checking contract completion status:', err);
          // Không throw error để không ảnh hưởng đến flow approve transaction
        }

        // Cập nhật payment schedules khi transaction được approve
        try {
          if (selectedTransaction.type === TransactionType.INCOME) {
            // Lấy tất cả payment schedules chưa thanh toán
            const { data: schedules, error: schedulesError } = await supabase
              .from('payment_schedules')
              .select('id, amount, milestone_name, status, transaction_id')
              .eq('contract_id', selectedTransaction.referenceId)
              .in('status', ['PENDING', 'OVERDUE']);

            if (!schedulesError && schedules && schedules.length > 0) {
              // Tính tổng số tiền của tất cả payment schedules chưa thanh toán
              const totalPendingAmount = schedules.reduce((sum, s) => sum + Number(s.amount || 0), 0);
              const transactionAmount = Number(selectedTransaction.amount);

              // Kiểm tra xem số tiền transaction có đủ để thanh toán tất cả các schedule chưa thanh toán không
              // Cho phép sai số 1000 VND để xử lý làm tròn
              if (transactionAmount >= totalPendingAmount - 1000) {
                // Thanh toán một lần: Cập nhật tất cả payment schedules chưa thanh toán thành PAID
                const scheduleIds = schedules
                  .filter(s => !s.transaction_id || s.transaction_id === selectedTransaction.id)
                  .map(s => s.id);

                if (scheduleIds.length > 0) {
                  const { error: updateSchedulesError } = await supabase
                    .from('payment_schedules')
                    .update({
                      status: 'PAID',
                      transaction_id: selectedTransaction.id,
                      paid_at: new Date().toISOString()
                    })
                    .in('id', scheduleIds);

                  if (updateSchedulesError) {
                    console.error('Error updating payment schedules:', updateSchedulesError);
                  } else {
                    console.log(`✅ Đã cập nhật ${scheduleIds.length} payment schedule(s) thành PAID (thanh toán một lần)`);
                  }
                }
              } else {
                // Thanh toán từng phần: Tìm schedule khớp với amount
                const matchingSchedule = schedules.find(s => 
                  Math.abs(Number(s.amount) - transactionAmount) < 1000 &&
                  (!s.transaction_id || s.transaction_id === selectedTransaction.id)
                );

                if (matchingSchedule && matchingSchedule.status !== 'PAID') {
                  // Cập nhật payment schedule thành PAID
                  const { error: updateScheduleError } = await supabase
                    .from('payment_schedules')
                    .update({
                      status: 'PAID',
                      transaction_id: selectedTransaction.id,
                      paid_at: new Date().toISOString()
                    })
                    .eq('id', matchingSchedule.id);

                  if (updateScheduleError) {
                    console.error('Error updating payment schedule:', updateScheduleError);
                  } else {
                    console.log(`✅ Đã cập nhật payment schedule ${matchingSchedule.id} (${matchingSchedule.milestone_name}) thành PAID`);
                  }
                } else if (!matchingSchedule && schedules.length > 0) {
                  // Nếu không tìm thấy schedule khớp chính xác, thử match với schedule đầu tiên chưa thanh toán
                  // (trường hợp thanh toán trực tiếp từ phần công nợ với số tiền nhỏ hơn)
                  const firstPendingSchedule = schedules[0];
                  if (!firstPendingSchedule.transaction_id) {
                    // Chỉ cập nhật nếu schedule chưa có transaction_id
                    const { error: updateScheduleError } = await supabase
                      .from('payment_schedules')
                      .update({
                        status: 'PAID',
                        transaction_id: selectedTransaction.id,
                        paid_at: new Date().toISOString()
                      })
                      .eq('id', firstPendingSchedule.id);

                    if (updateScheduleError) {
                      console.error('Error updating payment schedule:', updateScheduleError);
                    } else {
                      console.log(`✅ Đã cập nhật payment schedule ${firstPendingSchedule.id} (${firstPendingSchedule.milestone_name}) thành PAID (matched by contract)`);
                    }
                  }
                }
              }
            }
          }
        } catch (scheduleError) {
          console.error('Error updating payment schedules:', scheduleError);
          // Không throw error để không ảnh hưởng đến flow approve transaction
        }
      }

      // Refresh accounts - chỉ select các cột cần thiết để tối ưu hiệu năng
      console.log('🔄 Đang refresh accounts...');
      const { data: accountsData, error: accountsRefreshError } = await supabase
        .from('accounts')
        .select('id, name, type, bank_name, account_number, balance, chart_of_account_id')
        .eq('status', 'ACTIVE');

      if (accountsRefreshError) {
        console.error('❌ Error refreshing accounts:', accountsRefreshError);
      }

      if (accountsData) {
        console.log('📊 Accounts data từ database:', accountsData);
        const formattedAccounts: Account[] = accountsData.map((acc: any) => {
          const balance = Number(acc.balance);
          console.log(`Account: ${acc.name}, Balance từ DB: ${acc.balance}, Converted: ${balance}`);
          return {
            id: acc.id,
            name: acc.name,
            type: acc.type as 'CASH' | 'BANK' | 'E_WALLET',
            bankName: acc.bank_name,
            accountNumber: acc.account_number,
            balance: balance,
            chartOfAccountId: acc.chart_of_account_id || undefined
          };
        });
        formattedAccounts.sort((a, b) => {
          if (a.name === 'Tiền mặt') return -1;
          if (b.name === 'Tiền mặt') return 1;
          if (a.type === 'CASH' && b.type !== 'CASH') return -1;
          if (b.type === 'CASH' && a.type !== 'CASH') return 1;
          return a.name.localeCompare(b.name);
        });
        console.log('✅ Formatted accounts sau sort:', formattedAccounts);
        const tienMat = formattedAccounts.find(a => a.name === 'Tiền mặt');
        if (tienMat) {
          console.log(`💰 Tiền mặt balance trong formatted accounts: ${tienMat.balance}`);
        }
        setAccounts(formattedAccounts);
        console.log('✅ Đã set accounts state với', formattedAccounts.length, 'accounts');
      } else {
        console.log('⚠️ Không có accounts data');
      }

      // Refresh transactions
      const { data: transactionsData } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(100);

      if (transactionsData) {
        const formattedTransactions: Transaction[] = transactionsData.map((t: any) => ({
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

      // Close modal
      setShowUploadModal(false);
      setUploadFiles([]);
      setSelectedTransaction(null);
      setUploadProgress('');
      
      alert('Upload chứng từ thành công!');
    } catch (error: any) {
      console.error('Error uploading receipts:', error);
      alert(error.message || 'Có lỗi xảy ra khi upload chứng từ');
    } finally {
      setIsUploading(false);
      setUploadProgress('');
    }
  };

  */
  const handleUploadSubmit = async () => {
    if (!selectedTransaction || uploadFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress('Đang upload chứng từ...');

    try {
      const formData = new FormData();
      uploadFiles.forEach(file => formData.append('files', file));
      if (user?.id) {
        formData.append('userId', user.id);
      }

      const response = await fetch(`/api/finance/transactions/${selectedTransaction.id}/approve`, {
        method: 'POST',
        body: formData
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || 'Có lỗi xảy ra khi upload chứng từ');
      }

      await loadFinanceData();

      setShowUploadModal(false);
      setUploadFiles([]);
      setSelectedTransaction(null);
      setUploadProgress('');

      alert('Upload chứng từ thành công!');
    } catch (error: any) {
      console.error('Error uploading receipts:', error);
      alert(error.message || 'Có lỗi xảy ra khi upload chứng từ');
    } finally {
      setIsUploading(false);
      setUploadProgress('');
    }
  };

  // Check if user has any finance permissions
  const hasFinancePermissions = hasAnyPermission(user?.permissions, PermissionCategories.finance);
  const canCreateFinance = hasAnyPermission(user?.permissions, ['financeCreate']);

  // If user doesn't have any finance permissions, show access denied message
  if (!hasFinancePermissions) {
    return (
      <AccessDenied 
        message="Bạn không có quyền xem thu chi & dòng tiền. Vui lòng liên hệ quản trị viên để được cấp quyền."
        redirectTo="/dashboard"
        icon="shield"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Total Balance Card */}
      {!isLoading && accounts.length > 0 && (
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-3xl border border-blue-500 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-xs font-bold uppercase tracking-widest mb-2">Tổng số tiền tất cả tài khoản</p>
              <p className={`text-4xl font-black leading-tight ${getTotalBalance() >= 0 ? 'text-white' : 'text-rose-200'}`}>
                {formatVND(getTotalBalance())}
              </p>
            </div>
            <div className="p-4 bg-white/20 rounded-2xl">
              <Landmark size={32} className="text-white" />
            </div>
          </div>
        </div>
      )}

      {/* Account Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {isLoading ? (
          <div className="md:col-span-4 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="text-slate-500 text-sm">Đang tải dữ liệu...</p>
              </div>
            </div>
          </div>
        ) : accounts.length === 0 ? (
          <div className="md:col-span-4 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-center">
              <p className="text-slate-500 text-sm mb-2">Chưa có tài khoản nào</p>
              <p className="text-slate-400 text-xs mb-4">Vui lòng chạy migration script để thêm tài khoản</p>
              <div className="text-left bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
                <p className="text-amber-800 text-xs font-bold mb-2">Khắc phục:</p>
                <ol className="text-amber-700 text-xs space-y-1 list-decimal list-inside">
                  <li>Chạy script: <code className="bg-amber-100 px-1 rounded">migration_fix_accounts_rls.sql</code></li>
                  <li>Chạy script: <code className="bg-amber-100 px-1 rounded">migration_add_company_bank_accounts.sql</code></li>
                  <li>Kiểm tra Console (F12) để xem lỗi chi tiết</li>
                </ol>
              </div>
            </div>
          </div>
        ) : (
          accounts.map(acc => {
            const totals = getAccountTotals(acc.id, acc.balance);
            return (
              <div key={acc.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-blue-300 transition-colors cursor-pointer">
                <div className="flex justify-between items-start">
                  <div className={`p-2 rounded-xl ${acc.type === 'CASH' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                    {acc.type === 'CASH' ? <Banknote size={20} /> : <Landmark size={20} />}
                  </div>
                  <ArrowRight size={14} className="text-slate-300" />
                </div>
                <div className="mt-4">
                  <p className="text-slate-500 text-xs font-medium">{acc.name}</p>
                  <p className={`text-lg font-bold leading-tight ${totals.netBalance >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                    {formatVND(totals.netBalance)}
                  </p>
                  {acc.accountNumber && <p className="text-[10px] text-slate-400 font-mono mt-1">{acc.accountNumber}</p>}
                  {acc.bankName && !acc.accountNumber && <p className="text-[10px] text-slate-400 mt-1">{acc.bankName}</p>}
                  
                  {/* Income and Expense Totals */}
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-500">Thu:</span>
                      <span className="text-[11px] font-bold text-emerald-600">+{formatVND(totals.income)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-500">Chi:</span>
                      <span className="text-[11px] font-bold text-rose-600">-{formatVND(totals.expense)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 flex-1 flex-wrap">
            {/* Action Buttons - Nổi bật ở bên trái */}
            <div className="flex gap-2">
              <button 
                onClick={() => openForm(TransactionType.INCOME)}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-black text-sm shadow-lg shadow-emerald-200 transition-all"
              >
                <Plus size={16} /> Tạo phiếu thu
              </button>
              <button 
                onClick={() => openForm(TransactionType.EXPENSE)}
                className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 text-white rounded-xl hover:bg-rose-700 font-black text-sm shadow-lg shadow-rose-200 transition-all"
              >
                <Plus size={16} /> Tạo phiếu chi
              </button>
            </div>

            {/* View Tabs */}
            <div className="flex bg-slate-100 p-1.5 rounded-2xl">
              <button 
                onClick={() => setActiveView('history')}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all ${activeView === 'history' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <History size={16} /> Lịch sử GD
              </button>
              <button 
                onClick={() => setActiveView('cashflow')}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all ${activeView === 'cashflow' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <PieChartIcon size={16} /> Biến động dòng tiền
              </button>
            </div>

            {/* Filter Button */}
            {activeView === 'history' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    showFilters || hasActiveFilters
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Filter size={16} />
                  Bộ lọc
                  {hasActiveFilters && (
                    <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-[10px]">
                      {[
                        filterType !== 'ALL' ? 1 : 0,
                        filterStatus !== 'ALL' ? 1 : 0,
                        filterCategory !== 'ALL' ? 1 : 0,
                        filterAccount !== 'ALL' ? 1 : 0,
                        filterSearch ? 1 : 0,
                        filterDateFrom || filterDateTo ? 1 : 0
                      ].reduce((a, b) => a + b, 0)}
                    </span>
                  )}
                </button>
                {hasActiveFilters && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      resetFilters();
                    }}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all"
                    title="Xóa bộ lọc"
                  >
                    <X size={16} />
                    Xóa bộ lọc
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Filter Panel */}
        {activeView === 'history' && showFilters && (
          <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="lg:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Tìm kiếm
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    type="text"
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                    placeholder="Tìm theo nội dung hoặc mã giao dịch..."
                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Type Filter */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Loại giao dịch
                </label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as TransactionType | 'ALL')}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="ALL">Tất cả</option>
                  <option value={TransactionType.INCOME}>Thu</option>
                  <option value={TransactionType.EXPENSE}>Chi</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Trạng thái
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as TransactionStatus | 'ALL')}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="ALL">Tất cả</option>
                  <option value={TransactionStatus.DRAFT}>Bản nháp</option>
                  <option value={TransactionStatus.PENDING}>Chờ duyệt</option>
                  <option value={TransactionStatus.APPROVED}>Đã hoàn tất</option>
                  <option value={TransactionStatus.LOCKED}>Đã khóa</option>
                </select>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Danh mục
                </label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value as TransactionCategory | 'ALL')}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="ALL">Tất cả</option>
                  {Object.values(TransactionCategory).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Account Filter */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Tài khoản
                </label>
                <select
                  value={filterAccount}
                  onChange={(e) => setFilterAccount(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="ALL">Tất cả</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              </div>

              {/* Date From */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Từ ngày
                </label>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Date To */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Đến ngày
                </label>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  min={filterDateFrom}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Filter Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <div className="text-xs text-slate-500 font-medium">
                Hiển thị <span className="font-black text-slate-700">{filteredTransactions.length}</span> / {transactions.length} giao dịch
              </div>
              <button
                onClick={resetFilters}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
              >
                <X size={14} /> Xóa bộ lọc
              </button>
            </div>
          </div>
        )}

        {/* Content based on active view */}
        {activeView === 'history' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Thời gian & Mã</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nguồn tiền</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Phân loại & Trạng thái</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nội dung chi tiết giao dịch</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Số tiền</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <p className="text-slate-500 text-sm">Đang tải dữ liệu...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <p className="text-slate-500 text-sm">
                      {hasActiveFilters ? 'Không tìm thấy giao dịch phù hợp với bộ lọc' : 'Chưa có giao dịch nào'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map(t => {
                  const account = accounts.find(a => a.id === t.accountId);
                  const status = getStatusBadge(t.status || TransactionStatus.DRAFT);
                  return (
                    <tr
                      key={t.id}
                      className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                      onClick={(e) => {
                        // If user is selecting text, don't navigate
                        if (window.getSelection()?.toString()) return;
                        handleRowClick(t);
                      }}
                    >
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-900">{formatDateTime(t.date, (t as any).createdAt)}</p>
                        <p className="text-[10px] text-slate-400 font-mono uppercase">#{t.id.substring(0, 8)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                           <div className={`w-2 h-2 rounded-full ${account?.type === 'CASH' ? 'bg-orange-500' : account?.type === 'BANK' ? 'bg-blue-500' : 'bg-purple-500'}`}></div>
                           <span className="text-sm font-medium text-slate-700">{account?.name || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5">
                          <span className={`w-fit px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            t.type === TransactionType.INCOME ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}>
                            {t.category}
                          </span>
                          <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${status.class}`}>
                            {status.icon} {status.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-slate-700 line-clamp-2 max-w-md">
                          {t.description || '—'}
                        </p>
                      </td>
                      <td className={`px-6 py-4 text-right font-black text-sm ${
                        t.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {t.type === TransactionType.INCOME ? '+' : '-'}{formatVND(t.amount)}
                      </td>
                      <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        {t.status === TransactionStatus.APPROVED ? (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              viewTransaction(t);
                            }}
                            className="px-4 py-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all"
                            title="Xem chi tiết"
                          >
                            <span className="flex items-center gap-1.5">
                              <Eye size={14} />
                              Xem chi tiết
                            </span>
                          </button>
                        ) : (
                          <button 
                            onClick={(e) => handleUploadReceipt(e, t)}
                            className="px-4 py-2 text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all"
                            title="Hoàn tất thanh toán"
                          >
                            <span className="flex items-center gap-1.5">
                              <Upload size={14} />
                              Hoàn tất
                            </span>
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Summary Cards */}
            {(() => {
              const summary = getCashflowSummary();
              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-6 rounded-2xl border border-emerald-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest">Tổng thu</span>
                      <ArrowUpRight className="text-emerald-600" size={20} />
                    </div>
                    <p className="text-2xl font-black text-emerald-700">{formatVND(summary.totalIncome)}</p>
                  </div>
                  <div className="bg-gradient-to-br from-rose-50 to-rose-100 p-6 rounded-2xl border border-rose-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-rose-700 uppercase tracking-widest">Tổng chi</span>
                      <ArrowDownRight className="text-rose-600" size={20} />
                    </div>
                    <p className="text-2xl font-black text-rose-700">{formatVND(summary.totalExpense)}</p>
                  </div>
                  <div className={`bg-gradient-to-br p-6 rounded-2xl border ${
                    summary.netCashflow >= 0 
                      ? 'from-blue-50 to-blue-100 border-blue-200' 
                      : 'from-amber-50 to-amber-100 border-amber-200'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-bold uppercase tracking-widest ${
                        summary.netCashflow >= 0 ? 'text-blue-700' : 'text-amber-700'
                      }`}>
                        Dòng tiền ròng
                      </span>
                      {summary.netCashflow >= 0 ? (
                        <TrendingUp className="text-blue-600" size={20} />
                      ) : (
                        <TrendingDown className="text-amber-600" size={20} />
                      )}
                    </div>
                    <p className={`text-2xl font-black ${
                      summary.netCashflow >= 0 ? 'text-blue-700' : 'text-amber-700'
                    }`}>
                      {formatVND(summary.netCashflow)}
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Cashflow Chart */}
            {isLoading ? (
              <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="text-slate-500 text-sm">Đang tải dữ liệu...</p>
                </div>
              </div>
            ) : transactions.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
                <p className="text-slate-500 text-sm">Chưa có dữ liệu giao dịch để hiển thị</p>
              </div>
            ) : (
              <div className="bg-white p-6 rounded-2xl border border-slate-200">
                <h3 className="text-lg font-black text-slate-900 mb-6">Biểu đồ biến động dòng tiền</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={getCashflowData()}>
                    <defs>
                      <linearGradient id="colorThu" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorChi" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#64748b"
                      style={{ fontSize: '12px', fontWeight: 'bold' }}
                    />
                    <YAxis 
                      stroke="#64748b"
                      style={{ fontSize: '12px', fontWeight: 'bold' }}
                      tickFormatter={(value) => {
                        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                        if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                        return value.toString();
                      }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '12px'
                      }}
                      formatter={(value: number | undefined) => formatVND(value || 0)}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="Thu" 
                      stroke="#10b981" 
                      fillOpacity={1} 
                      fill="url(#colorThu)"
                      strokeWidth={2}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="Chi" 
                      stroke="#ef4444" 
                      fillOpacity={1} 
                      fill="url(#colorChi)"
                      strokeWidth={2}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="Dòng tiền ròng" 
                      stroke="#3b82f6" 
                      fillOpacity={1} 
                      fill="url(#colorNet)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Monthly Summary Table */}
            {!isLoading && transactions.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                  <h3 className="text-lg font-black text-slate-900">Tóm tắt theo tháng</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tháng</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Tổng thu</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Tổng chi</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Dòng tiền ròng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(() => {
                        // Group by month - chỉ tính các transaction đã APPROVED (đã hoàn tất thanh toán)
                        const monthMap = new Map<string, { income: number; expense: number; month: string }>();
                        
                        transactions
                          .filter(t => t.status === TransactionStatus.APPROVED)
                          .forEach(t => {
                            const date = new Date(t.date);
                            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                            const monthLabel = date.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
                            
                            if (!monthMap.has(monthKey)) {
                              monthMap.set(monthKey, { income: 0, expense: 0, month: monthLabel });
                            }
                            const data = monthMap.get(monthKey)!;
                            if (t.type === TransactionType.INCOME) {
                              data.income += t.amount;
                            } else if (t.type === TransactionType.EXPENSE) {
                              data.expense += t.amount;
                            }
                          });

                        return Array.from(monthMap.values())
                          .sort((a, b) => b.month.localeCompare(a.month))
                          .map((item, index) => (
                            <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4">
                                <p className="text-sm font-bold text-slate-900 capitalize">{item.month}</p>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <p className="text-sm font-bold text-emerald-600">{formatVND(item.income)}</p>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <p className="text-sm font-bold text-rose-600">{formatVND(item.expense)}</p>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <p className={`text-sm font-black ${
                                  item.income - item.expense >= 0 ? 'text-blue-600' : 'text-amber-600'
                                }`}>
                                  {formatVND(item.income - item.expense)}
                                </p>
                              </td>
                            </tr>
                          ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Upload Receipt Modal */}
      {showUploadModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-xl font-black text-slate-900">Hoàn tất thanh toán</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Upload chứng từ thanh toán cho giao dịch #{selectedTransaction.id.substring(0, 8)}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadFiles([]);
                  setSelectedTransaction(null);
                }}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Transaction Info */}
              <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Thông tin giao dịch</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Số tiền</p>
                    <p className="text-lg font-black text-slate-900">
                      {selectedTransaction.type === TransactionType.INCOME ? '+' : '-'}
                      {formatVND(selectedTransaction.amount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Danh mục</p>
                    <p className="text-sm font-bold text-slate-700">{selectedTransaction.category}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Ngày</p>
                    <p className="text-sm font-medium text-slate-700">
                      {formatDateTime(selectedTransaction.date, (selectedTransaction as any).createdAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Mô tả</p>
                    <p className="text-sm font-medium text-slate-700 line-clamp-2">
                      {selectedTransaction.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* File Upload */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Chọn chứng từ thanh toán (Ảnh/PDF)
                  </label>
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="receipt-upload"
                  />
                  <label
                    htmlFor="receipt-upload"
                    className="block w-full p-8 border-2 border-dashed border-slate-300 rounded-2xl text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-all"
                  >
                    <Upload size={32} className="mx-auto text-slate-400 mb-2" />
                    <p className="text-sm font-bold text-slate-600">Click để chọn file</p>
                    <p className="text-xs text-slate-400 mt-1">Hỗ trợ: JPG, PNG, PDF (tối đa 10MB/file)</p>
                  </label>
                </div>

                {/* Uploaded Files List */}
                {uploadFiles.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-600">Files đã chọn ({uploadFiles.length})</p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {uploadFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-slate-50 rounded-xl"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Receipt size={20} className="text-slate-400 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-700 truncate">{file.name}</p>
                              <p className="text-xs text-slate-400">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveFile(index)}
                            className="p-1.5 hover:bg-rose-100 rounded-lg transition-colors text-slate-400 hover:text-rose-600"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Existing Attachments */}
                {selectedTransaction.attachments && selectedTransaction.attachments.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-600">
                      Chứng từ đã upload ({selectedTransaction.attachments.length})
                    </p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {selectedTransaction.attachments.map((url, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl"
                        >
                          <CheckCircle size={20} className="text-emerald-600 flex-shrink-0" />
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-emerald-700 hover:underline flex-1 truncate"
                          >
                            Chứng từ {index + 1}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {uploadProgress && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-sm font-medium text-blue-700">{uploadProgress}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex justify-end gap-4 bg-slate-50">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadFiles([]);
                  setSelectedTransaction(null);
                }}
                className="px-6 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all"
                disabled={isUploading}
              >
                Hủy
              </button>
              <button
                onClick={handleUploadSubmit}
                disabled={isUploading || uploadFiles.length === 0}
                className="px-6 py-3 bg-emerald-600 text-white rounded-xl text-sm font-black hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isUploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Đang upload...
                  </>
                ) : (
                  <>
                    <Upload size={18} />
                    Upload chứng từ
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
