'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calculator, FileText, TrendingUp, DollarSign, Receipt, PieChart,
  Plus, Search, Filter, Calendar, Eye, Lock, Unlock, X, CheckCircle2,
  ArrowUpRight, ArrowDownRight, Download, RefreshCw, Loader2,
  BarChart3, BookOpen, FileCheck, ChevronRight, ChevronDown, Edit, Trash2,
  Landmark, Banknote, CreditCard
} from 'lucide-react';
import {
  AccountingVoucher, AccountingEntry, ChartOfAccount, VoucherType, VoucherStatus,
  AccountType, BalanceSheet, IncomeStatement, Account, NormalBalance
} from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { hasAnyPermission, PermissionCategories } from '@/utils/permissions';
import { AccessDenied } from './AccessDenied';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const supabase = null as any;

type ActiveTab = 'overview' | 'vouchers' | 'chart-of-accounts' | 'bank-accounts' | 'reports' | 'create-voucher';

export const Accounting: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [vouchers, setVouchers] = useState<AccountingVoucher[]>([]);
  const [chartOfAccounts, setChartOfAccounts] = useState<ChartOfAccount[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [accountsWithChartInfo, setAccountsWithChartInfo] = useState<Array<Account & { chartCode?: string; chartName?: string }>>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: number; failed: number; errors: any[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Permission checks
  const hasAccountingPermissions = hasAnyPermission(user?.permissions, PermissionCategories.accounting);
  const canCreateVoucher = hasAnyPermission(user?.permissions, ['accountingCreate']);
  
  // Stats
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalExpense: 0,
    netProfit: 0,
    voucherCount: 0
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<{ from: string; to: string }>({
    from: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Load vouchers
  const loadVouchers = async () => {
    try {
      const response = await fetch('/api/accounting/vouchers', { cache: 'no-store' });
      const result = await response.json();

      if (!response.ok) throw new Error(result?.error || 'Lỗi tải chứng từ');

      const transformedVouchers: AccountingVoucher[] = (result.vouchers || []).map((v: any) => ({
        id: v.id,
        voucherNumber: v.voucher_number,
        voucherDate: v.voucher_date,
        voucherType: v.voucher_type as VoucherType,
        description: v.description,
        totalAmount: Number(v.total_amount) || 0,
        referenceType: v.reference_type,
        referenceId: v.reference_id,
        status: v.status as VoucherStatus,
        postedBy: v.posted_by,
        postedAt: v.posted_at,
        lockedBy: v.locked_by,
        lockedAt: v.locked_at,
        attachments: v.attachments || [],
        notes: v.notes,
        createdAt: v.created_at,
        createdBy: v.created_by,
        updatedAt: v.updated_at,
        updatedBy: v.updated_by
      }));

      setVouchers(transformedVouchers);
      calculateStats(transformedVouchers);
    } catch (err: any) {
      console.error('Error loading vouchers:', err);
      setError(err.message);
    }
  };

  // If user doesn't have any accounting permissions, show access denied message
  if (!hasAccountingPermissions) {
    return (
      <AccessDenied 
        message="Bạn không có quyền xem kế toán. Vui lòng liên hệ quản trị viên để được cấp quyền."
        redirectTo="/dashboard"
        icon="shield"
      />
    );
  }

  // Load chart of accounts
  const loadChartOfAccounts = async () => {
    try {
      const response = await fetch('/api/accounting/chart-of-accounts', { cache: 'no-store' });
      const result = await response.json();

      if (!response.ok) throw new Error(result?.error || 'Lỗi tải tài khoản kế toán');

      const transformedAccounts: ChartOfAccount[] = (result.accounts || []).map((acc: any) => ({
        id: acc.id,
        code: acc.code,
        name: acc.name,
        parentId: acc.parent_id,
        accountType: acc.account_type as AccountType,
        normalBalance: acc.normal_balance as NormalBalance,
        level: acc.level || 1,
        isActive: acc.is_active,
        description: acc.description,
        createdAt: acc.created_at,
        updatedAt: acc.updated_at
      }));

      setChartOfAccounts(transformedAccounts);
    } catch (err: any) {
      console.error('Error loading chart of accounts:', err);
    }
  };

  // Load accounts (for sync)
  const loadAccounts = async () => {
    try {
      const response = await fetch('/api/accounting/accounts', { cache: 'no-store' });
      const result = await response.json();

      if (!response.ok) throw new Error(result?.error || 'Lỗi tải tài khoản');

      const transformedAccounts: Account[] = (result.accounts || []).map((acc: any) => ({
        id: acc.id,
        name: acc.name,
        type: acc.type as 'CASH' | 'BANK' | 'E_WALLET',
        bankName: acc.bank_name,
        accountNumber: acc.account_number,
        balance: Number(acc.balance) || 0,
        chartOfAccountId: acc.chart_of_account_id || undefined
      }));

      setAccounts(transformedAccounts);

      const accountsWithInfo = transformedAccounts.map((acc) => {
        if (acc.chartOfAccountId) {
          const chartAccount = chartOfAccounts.find(coa => coa.id === acc.chartOfAccountId);
          if (chartAccount) {
            return {
              ...acc,
              chartCode: chartAccount.code,
              chartName: chartAccount.name
            };
          }
        }
        return acc;
      });

      setAccountsWithChartInfo(accountsWithInfo);
    } catch (err: any) {
      console.error('Error loading accounts:', err);
    }
  };

  // Sync transactions to accounting
  const handleSyncTransactions = async () => {
    if (accounts.length === 0) {
      setError('Vui lòng đợi tải danh sách tài khoản');
      return;
    }

    setIsSyncing(true);
    setError(null);
    setSyncResult(null);

    try {
      const response = await fetch('/api/accounting/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accounts, userId: user?.id })
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || 'Lỗi đồng bộ kế toán');
      }

      setSyncResult(result);
      
      if (result.success > 0) {
        // Reload vouchers after sync
        await loadVouchers();
      }
      
      if (result.failed > 0 && result.errors.length > 0) {
        // Log chi tiết từng lỗi với đầy đủ thông tin
        console.group(`❌ Đồng bộ thất bại ${result.failed} giao dịch (tổng ${result.success + result.failed} giao dịch):`);
        result.errors.forEach((err: any, index: number) => {
          console.error(`${index + 1}. Transaction ID: ${err.transactionId || 'N/A'}`);
          console.error(`   Lỗi: ${err.error || 'Unknown error'}`);
        });
        console.groupEnd();
        
        // Hiển thị lỗi đầu tiên trong UI
        if (result.errors.length > 0) {
          const firstError = result.errors[0];
          const errorSummary = result.errors.length > 1 
            ? `${firstError.error} (+ ${result.errors.length - 1} lỗi khác)`
            : firstError.error;
          setError(`Đồng bộ thất bại ${result.failed} giao dịch. ${errorSummary}`);
        }
      }
    } catch (err: any) {
      console.error('Error syncing transactions:', err);
      setError(err.message || 'Có lỗi xảy ra khi đồng bộ');
    } finally {
      setIsSyncing(false);
    }
  };

  // Calculate statistics
  const calculateStats = (vouchersList: AccountingVoucher[]) => {
    const postedVouchers = vouchersList.filter(v => v.status === VoucherStatus.POSTED || v.status === VoucherStatus.LOCKED);
    
    let totalRevenue = 0;
    let totalExpense = 0;

    postedVouchers.forEach(voucher => {
      if (voucher.voucherType === VoucherType.RECEIPT || voucher.voucherType === VoucherType.SALES_INVOICE) {
        totalRevenue += voucher.totalAmount;
      } else if (voucher.voucherType === VoucherType.PAYMENT || voucher.voucherType === VoucherType.PURCHASE_INVOICE) {
        totalExpense += voucher.totalAmount;
      }
    });

    setStats({
      totalRevenue,
      totalExpense,
      netProfit: totalRevenue - totalExpense,
      voucherCount: vouchersList.length
    });
  };

  // Load all data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([loadVouchers(), loadChartOfAccounts()]);
      await loadAccounts(); // Load accounts after chart of accounts to get chart info
      setIsLoading(false);
    };
    loadData();
  }, []);

  // Reload accounts when chartOfAccounts changes
  useEffect(() => {
    if (chartOfAccounts.length > 0 && accounts.length > 0) {
      const accountsWithInfo = accounts.map(acc => {
        if (acc.chartOfAccountId) {
          const chartAccount = chartOfAccounts.find(coa => coa.id === acc.chartOfAccountId);
          if (chartAccount) {
            return {
              ...acc,
              chartCode: chartAccount.code,
              chartName: chartAccount.name
            };
          }
        }
        return acc;
      });
      setAccountsWithChartInfo(accountsWithInfo);
    }
  }, [chartOfAccounts, accounts]);

  // Filter vouchers
  const filteredVouchers = vouchers.filter(v => {
    const matchesSearch = !searchTerm || 
      v.voucherNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const voucherDate = new Date(v.voucherDate);
    const fromDate = new Date(dateFilter.from);
    const toDate = new Date(dateFilter.to);
    toDate.setHours(23, 59, 59, 999);
    
    const matchesDate = voucherDate >= fromDate && voucherDate <= toDate;
    
    return matchesSearch && matchesDate;
  });

  const getVoucherTypeLabel = (type: VoucherType) => {
    const labels: Record<VoucherType, string> = {
      [VoucherType.RECEIPT]: 'Phiếu thu',
      [VoucherType.PAYMENT]: 'Phiếu chi',
      [VoucherType.TRANSFER]: 'Chuyển khoản',
      [VoucherType.JOURNAL]: 'Bút toán',
      [VoucherType.SALES_INVOICE]: 'Hóa đơn bán',
      [VoucherType.PURCHASE_INVOICE]: 'Hóa đơn mua'
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: VoucherStatus) => {
    const styles: Record<VoucherStatus, { bg: string; text: string; label: string }> = {
      [VoucherStatus.DRAFT]: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Nháp' },
      [VoucherStatus.POSTED]: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Đã hạch toán' },
      [VoucherStatus.LOCKED]: { bg: 'bg-green-100', text: 'text-green-700', label: 'Đã khóa' },
      [VoucherStatus.CANCELLED]: { bg: 'bg-red-100', text: 'text-red-700', label: 'Đã hủy' }
    };
    const style = styles[status] || styles[VoucherStatus.DRAFT];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Tổng doanh thu</p>
          <p className="text-2xl font-black mt-1 tracking-tighter text-slate-900">
            {formatVND(stats.totalRevenue)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Tổng chi phí</p>
          <p className="text-2xl font-black mt-1 tracking-tighter text-rose-600">
            {formatVND(stats.totalExpense)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Lợi nhuận</p>
          <p className={`text-2xl font-black mt-1 tracking-tighter ${stats.netProfit >= 0 ? 'text-[#00d26a]' : 'text-rose-600'}`}>
            {formatVND(stats.netProfit)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Số chứng từ</p>
          <p className="text-2xl font-black mt-1 tracking-tighter text-slate-900">
            {stats.voucherCount}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-6 border-b border-slate-100">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'overview'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Tổng quan
          </button>
          <button
            onClick={() => setActiveTab('vouchers')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'vouchers'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Chứng từ
          </button>
          <button
            onClick={() => setActiveTab('chart-of-accounts')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'chart-of-accounts'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Hệ thống tài khoản
          </button>
          <button
            onClick={() => setActiveTab('bank-accounts')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'bank-accounts'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Tài khoản ngân hàng
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'reports'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Báo cáo tài chính
          </button>
          <div className="flex-1"></div>
          {activeTab === 'vouchers' && canCreateVoucher && (
            <button
              onClick={() => router.push('/accounting/vouchers/new')}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
            >
              <Plus size={16} />
              Tạo chứng từ
            </button>
          )}
          {activeTab === 'reports' && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Calendar size={16} />
              <input
                type="date"
                value={dateFilter.from}
                onChange={(e) => setDateFilter({ ...dateFilter, from: e.target.value })}
                className="px-3 py-1.5 border border-slate-200 rounded-lg"
              />
              <span>đến</span>
              <input
                type="date"
                value={dateFilter.to}
                onChange={(e) => setDateFilter({ ...dateFilter, to: e.target.value })}
                className="px-3 py-1.5 border border-slate-200 rounded-lg"
              />
            </div>
          )}
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-100 rounded-full mb-6">
                  <Calculator size={40} className="text-slate-400" />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2">Hệ thống Kế toán</h3>
                <p className="text-slate-500 text-sm max-w-md mx-auto mb-8">
                  Quản lý chứng từ, hạch toán kế toán và báo cáo tài chính
                </p>
                
                {/* Sync Section */}
                <div className="max-w-2xl mx-auto mb-8">
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-1">Đồng bộ từ Thu chi</h4>
                        <p className="text-sm text-slate-600">
                          Đồng bộ các giao dịch đã duyệt từ trang Thu chi & Dòng tiền sang Kế toán
                        </p>
                      </div>
                      <button
                        onClick={handleSyncTransactions}
                        disabled={isSyncing || accounts.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSyncing ? (
                          <>
                            <Loader2 className="animate-spin" size={16} />
                            Đang đồng bộ...
                          </>
                        ) : (
                          <>
                            <RefreshCw size={16} />
                            Đồng bộ ngay
                          </>
                        )}
                      </button>
                    </div>
                    
                    {syncResult && (
                      <div className={`mt-4 p-4 rounded-lg text-sm ${
                        syncResult.failed === 0 
                          ? 'bg-green-50 text-green-700 border border-green-200' 
                          : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-semibold">
                            Kết quả đồng bộ:
                          </p>
                        </div>
                        <p className="mb-2">
                          ✓ Thành công: <strong>{syncResult.success}</strong> giao dịch
                          {syncResult.failed > 0 && (
                            <> | ✗ Thất bại: <strong>{syncResult.failed}</strong> giao dịch</>
                          )}
                        </p>
                        {syncResult.errors.length > 0 && (
                          <details className="mt-3">
                            <summary className="cursor-pointer font-medium hover:underline">
                              Xem chi tiết lỗi ({syncResult.errors.length})
                            </summary>
                            <ul className="mt-2 space-y-1 text-xs max-h-60 overflow-y-auto">
                              {syncResult.errors.map((err, idx) => (
                                <li key={idx} className="pl-4 border-l-2 border-yellow-300">
                                  <span className="font-mono text-yellow-600">{err.transactionId}</span>
                                  <span className="ml-2">{err.error}</span>
                                </li>
                              ))}
                            </ul>
                          </details>
                        )}
                      </div>
                    )}
                    
                    {error && (
                      <div className="mt-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm">
                        {error}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
                  <div className="p-4 border border-slate-200 rounded-lg">
                    <FileCheck className="w-8 h-8 text-slate-400 mb-2 mx-auto" />
                    <h4 className="font-semibold text-slate-900 mb-1">Chứng từ</h4>
                    <p className="text-sm text-slate-500">Quản lý phiếu thu, phiếu chi, hóa đơn</p>
                  </div>
                  <div className="p-4 border border-slate-200 rounded-lg">
                    <BookOpen className="w-8 h-8 text-slate-400 mb-2 mx-auto" />
                    <h4 className="font-semibold text-slate-900 mb-1">Hệ thống tài khoản</h4>
                    <p className="text-sm text-slate-500">Hạch toán theo chuẩn Việt Nam</p>
                  </div>
                  <div className="p-4 border border-slate-200 rounded-lg">
                    <BarChart3 className="w-8 h-8 text-slate-400 mb-2 mx-auto" />
                    <h4 className="font-semibold text-slate-900 mb-1">Báo cáo</h4>
                    <p className="text-sm text-slate-500">Bảng cân đối kế toán, Kết quả KD</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'vouchers' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    placeholder="Tìm kiếm số chứng từ, diễn giải..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={dateFilter.from}
                    onChange={(e) => setDateFilter({ ...dateFilter, from: e.target.value })}
                    className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                  <input
                    type="date"
                    value={dateFilter.to}
                    onChange={(e) => setDateFilter({ ...dateFilter, to: e.target.value })}
                    className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <button
                  onClick={loadVouchers}
                  className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <RefreshCw size={18} />
                </button>
              </div>

              {/* Vouchers Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Số chứng từ</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Ngày</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Loại</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Diễn giải</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Số tiền</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-slate-600">Trạng thái</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-slate-600">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVouchers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-slate-400">
                          Không có chứng từ nào
                        </td>
                      </tr>
                    ) : (
                      filteredVouchers.map((voucher) => (
                        <tr key={voucher.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-4 text-sm font-medium text-slate-900">
                            {voucher.voucherNumber}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600">
                            {formatDate(voucher.voucherDate)}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600">
                            {getVoucherTypeLabel(voucher.voucherType)}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600">
                            {voucher.description}
                          </td>
                          <td className="py-3 px-4 text-sm font-medium text-right text-slate-900">
                            {formatVND(voucher.totalAmount)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {getStatusBadge(voucher.status)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => router.push(`/accounting/vouchers/${voucher.id}`)}
                                className="p-1.5 hover:bg-slate-100 rounded transition-colors"
                                title="Xem chi tiết"
                              >
                                <Eye size={16} className="text-slate-600" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'chart-of-accounts' && (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Mã TK</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Tên tài khoản</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Loại</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-slate-600">Số dư</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chartOfAccounts.map((account) => (
                      <tr key={account.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4 text-sm font-mono font-medium text-slate-900">
                          {account.code}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600">
                          {account.name}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600">
                          {account.accountType === AccountType.ASSET && 'Tài sản'}
                          {account.accountType === AccountType.LIABILITY && 'Nợ phải trả'}
                          {account.accountType === AccountType.EQUITY && 'Vốn chủ sở hữu'}
                          {account.accountType === AccountType.REVENUE && 'Doanh thu'}
                          {account.accountType === AccountType.EXPENSE && 'Chi phí'}
                          {account.accountType === AccountType.COST_OF_SALES && 'Giá vốn'}
                        </td>
                        <td className="py-3 px-4 text-sm text-center text-slate-600">
                          {account.normalBalance}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'bank-accounts' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Tài khoản từ Thu chi</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Danh sách tài khoản ngân hàng và tiền mặt được quản lý trong phần Thu chi & Dòng tiền
                  </p>
                </div>
                <button
                  onClick={loadAccounts}
                  className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <RefreshCw size={18} />
                  Làm mới
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Tên tài khoản</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Loại</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Ngân hàng</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Số tài khoản</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Số dư</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Tài khoản kế toán</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accountsWithChartInfo.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-slate-400">
                          Không có tài khoản nào
                        </td>
                      </tr>
                    ) : (
                      accountsWithChartInfo.map((account) => (
                        <tr key={account.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-4 text-sm font-medium text-slate-900">
                            {account.name}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600">
                            {account.type === 'CASH' && (
                              <span className="inline-flex items-center gap-1">
                                <Banknote size={14} className="text-slate-400" />
                                Tiền mặt
                              </span>
                            )}
                            {account.type === 'BANK' && (
                              <span className="inline-flex items-center gap-1">
                                <Landmark size={14} className="text-slate-400" />
                                Ngân hàng
                              </span>
                            )}
                            {account.type === 'E_WALLET' && (
                              <span className="inline-flex items-center gap-1">
                                <CreditCard size={14} className="text-slate-400" />
                                Ví điện tử
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600">
                            {account.bankName || '-'}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600 font-mono">
                            {account.accountNumber || '-'}
                          </td>
                          <td className="py-3 px-4 text-sm font-medium text-right text-slate-900">
                            {formatVND(account.balance)}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600">
                            {account.chartCode && account.chartName ? (
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-slate-700">{account.chartCode}</span>
                                <span className="text-slate-500">-</span>
                                <span>{account.chartName}</span>
                                <CheckCircle2 size={14} className="text-green-500" />
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Chưa liên kết</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {accountsWithChartInfo.length > 0 && (
                <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <BookOpen size={20} className="text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900 mb-1">Thông tin liên kết</h4>
                      <p className="text-sm text-slate-600 mb-2">
                        Các tài khoản từ Thu chi đã được liên kết với hệ thống tài khoản kế toán. 
                        Khi đồng bộ giao dịch, hệ thống sẽ tự động sử dụng tài khoản kế toán tương ứng.
                      </p>
                      <p className="text-xs text-slate-500">
                        Nếu tài khoản chưa được liên kết, vui lòng chạy migration_link_accounts_to_chart_of_accounts.sql
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div className="text-center py-12">
                <BarChart3 className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <h3 className="text-xl font-black text-slate-900 mb-2">Báo cáo Tài chính</h3>
                <p className="text-slate-500 text-sm max-w-md mx-auto">
                  Tính năng báo cáo tài chính đang được phát triển. Sẽ có Bảng cân đối kế toán và Báo cáo kết quả kinh doanh.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
