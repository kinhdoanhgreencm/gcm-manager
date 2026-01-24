'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Scale, ArrowUpRight, ArrowDownRight, 
  Search, Filter, Calendar, History,
  CheckCircle2, AlertCircle, Clock,
  MoreVertical, Eye, Receipt, Plus,
  Users, Truck, FileText, ChevronRight,
  ShieldCheck, DollarSign, Loader2
} from 'lucide-react';
import { DebtRecord, DebtType, DebtStatus, TransactionType, TransactionCategory } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useReload } from '@/contexts/ReloadContext';
import { hasAnyPermission, PermissionCategories } from '@/utils/permissions';
import { AccessDenied } from './AccessDenied';

export const DebtManagement: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { reloadKey } = useReload();
  const [activeTab, setActiveTab] = useState<DebtType>(DebtType.RECEIVABLE);
  const [search, setSearch] = useState('');
  const [selectedDebt, setSelectedDebt] = useState<DebtRecord | null>(null);
  const [debts, setDebts] = useState<DebtRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingTransactions, setPendingTransactions] = useState<Map<string, boolean>>(new Map());

  // Chỉ Giám đốc vận hành, Giám đốc và Admin mới được truy cập trang quản lý công nợ
  const allowedRoles = ['OPERATIONS_DIRECTOR', 'DIRECTOR', 'ADMIN'];
  
  if (!user || !allowedRoles.includes(user.role || '')) {
    return (
      <AccessDenied 
        message="Chỉ Giám đốc vận hành, Giám đốc và Quản trị viên mới được phép truy cập trang quản lý công nợ."
        redirectTo="/dashboard"
        icon="alert"
      />
    );
  }

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };


  const getStatusBadge = (status: DebtStatus) => {
    switch(status) {
      case DebtStatus.PAID:
        return { label: 'Đã tất toán', class: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle2 size={12} /> };
      case DebtStatus.OVERDUE:
        return { label: 'Quá hạn', class: 'bg-rose-100 text-rose-700', icon: <AlertCircle size={12} /> };
      case DebtStatus.DUE:
        return { label: 'Đến hạn', class: 'bg-amber-100 text-amber-700', icon: <Clock size={12} /> };
      default:
        return { label: 'Chưa đến hạn', class: 'bg-slate-100 text-slate-500', icon: <Calendar size={12} /> };
    }
  };

  // Fetch tất cả công nợ
  const fetchDebts = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/debts', { cache: 'no-store' });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || 'Có lỗi xảy ra khi tải dữ liệu công nợ');
      }

      setDebts(result?.debts || []);

      const pendingMap = new Map<string, boolean>(
        Object.entries(result?.pendingTransactions || {}).map(([key, value]) => [key, Boolean(value)])
      );
      setPendingTransactions(pendingMap);
    } catch (err: any) {
      console.error('Error fetching debts:', err);
      setError(err.message || 'Có lỗi xảy ra khi tải dữ liệu công nợ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDebts();
  }, [reloadKey]); // Re-fetch when reloadKey changes


  const filteredDebts = debts.filter(d => 
    d.type === activeTab && 
    (d.partnerName.toLowerCase().includes(search.toLowerCase()) || 
     d.referenceCode.toLowerCase().includes(search.toLowerCase()) ||
     d.partnerCode.toLowerCase().includes(search.toLowerCase()))
  );

  const totalReceivable = debts
    .filter(d => d.type === DebtType.RECEIVABLE)
    .reduce((sum, d) => sum + d.remainingAmount, 0);

  const totalPayable = debts
    .filter(d => d.type === DebtType.PAYABLE)
    .reduce((sum, d) => sum + d.remainingAmount, 0);

  const overdueAmount = debts
    .filter(d => d.status === DebtStatus.OVERDUE)
    .reduce((sum, d) => sum + d.remainingAmount, 0);

  // Tính dự chi tuần tới (các khoản đến hạn trong 7 ngày tới)
  const upcomingDueAmount = debts
    .filter(d => {
      if (!d.dueDate || d.remainingAmount <= 0) return false;
      const due = new Date(d.dueDate.split('/').reverse().join('-'));
      const today = new Date();
      const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 7;
    })
    .reduce((sum, d) => sum + d.remainingAmount, 0);

  const handleCreatePayment = async (debt: DebtRecord) => {
    const isReceivable = debt.type === DebtType.RECEIVABLE;
    
    // Nếu là công nợ phải thu từ hợp đồng, tìm payment schedule chưa thanh toán để liên kết
    let milestoneName = '';
    if (isReceivable && debt.referenceId) {
      try {
        const response = await fetch(`/api/debts/payment-schedule?contractId=${debt.referenceId}`, { cache: 'no-store' });
        const result = await response.json();

        if (response.ok && result?.schedule) {
          milestoneName = result.schedule.milestone_name || '';
          const scheduleAmount = Number(result.schedule.amount || 0);
          const prefillData = {
            referenceId: debt.referenceId,
            referenceType: 'CONTRACT',
            amount: scheduleAmount > 0 ? scheduleAmount : debt.remainingAmount,
            category: TransactionCategory.CAR_SALE,
            description: `Thu tiền: ${milestoneName} - Hợp đồng mua bán xe - Khách hàng ${debt.partnerName}`,
            customerName: debt.partnerName
          };
          const prefillParam = encodeURIComponent(JSON.stringify(prefillData));
          router.push(`/finance/new?type=INCOME&prefill=${prefillParam}`);
          return;
        }
      } catch (error) {
        console.error('Error fetching payment schedule:', error);
      }
    }
    
    // Fallback: Tạo phiếu thu với thông tin cơ bản
    const prefillData = {
      referenceId: debt.referenceId,
      referenceType: isReceivable ? 'CONTRACT' : 'SUPPLIER',
      amount: debt.remainingAmount,
      category: isReceivable ? TransactionCategory.CAR_SALE : TransactionCategory.INVENTORY_PURCHASE,
      description: `${isReceivable ? 'Thu tiền' : 'Chi tiền'} công nợ: ${debt.partnerName} - ${debt.referenceCode}`,
      customerName: debt.partnerName
    };
    const prefillParam = encodeURIComponent(JSON.stringify(prefillData));
    const transactionType = isReceivable ? TransactionType.INCOME : TransactionType.EXPENSE;
    router.push(`/finance/new?type=${transactionType}&prefill=${prefillParam}`);
  };

  const handleViewDetails = (debt: DebtRecord) => {
    // Navigate to the related detail page based on debt type
    if (debt.type === DebtType.RECEIVABLE) {
      // For receivable debts (from contracts), navigate to contract detail page
      router.push(`/contracts/${debt.referenceId}`);
    } else {
      // For payable debts (from suppliers), navigate to suppliers page with supplier ID in query
      router.push(`/suppliers?supplierId=${debt.partnerId}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-[#00d26a] animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-600">Đang tải dữ liệu công nợ...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-[32px] p-6 flex items-start gap-4">
          <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={24} />
          <div className="flex-1">
            <h3 className="text-lg font-black text-red-900 mb-2">Lỗi tải dữ liệu</h3>
            <p className="text-sm text-red-700 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors"
            >
              Thử lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Check if user has any debt management permissions
  const hasDebtPermissions = hasAnyPermission(user?.permissions, PermissionCategories.debt);
  const canCreateDebt = hasAnyPermission(user?.permissions, ['debtManagementCreate']);

  // If user doesn't have any debt management permissions, show access denied message
  if (!hasDebtPermissions) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white/80 backdrop-blur-md rounded-[40px] border border-white p-20 text-center shadow-xl max-w-md">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck size={40} className="text-slate-300" />
          </div>
          <h3 className="text-xl font-black text-slate-900 mb-2">Không có quyền truy cập</h3>
          <p className="text-slate-500 font-bold">Bạn không có quyền xem quản lý công nợ. Vui lòng liên hệ quản trị viên để được cấp quyền.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Phải thu khách hàng', value: totalReceivable, icon: <ArrowDownRight className="text-emerald-500" />, color: 'text-emerald-600' },
          { label: 'Phải trả đối tác', value: totalPayable, icon: <ArrowUpRight className="text-rose-500" />, color: 'text-rose-600' },
          { label: 'Tổng quá hạn', value: overdueAmount, icon: <AlertCircle className="text-rose-500" />, color: 'text-rose-700' },
          { label: 'Dự chi (Tuần tới)', value: upcomingDueAmount, icon: <Clock className="text-amber-500" />, color: 'text-amber-600' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
              {stat.icon}
            </div>
            <p className={`text-xl font-black ${stat.color}`}>{formatVND(stat.value)}</p>
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm min-h-[600px] flex flex-col">
        {/* Tabs & Controls */}
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex bg-slate-100 p-1 rounded-2xl">
            <button 
              onClick={() => setActiveTab(DebtType.RECEIVABLE)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === DebtType.RECEIVABLE ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500'}`}
            >
              <Users size={16} /> CÔNG NỢ PHẢI THU
            </button>
            <button 
              onClick={() => setActiveTab(DebtType.PAYABLE)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === DebtType.PAYABLE ? 'bg-white text-rose-600 shadow-md' : 'text-slate-500'}`}
            >
              <Truck size={16} /> CÔNG NỢ PHẢI TRẢ
            </button>
          </div>

          <div className="flex gap-4 flex-1 w-full max-w-xl">
             <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Tìm kiếm đối tác, số chứng từ..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold focus:ring-4 focus:ring-blue-500/10 transition-all"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
             </div>
             <button className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 hover:text-slate-900 transition-colors">
                <Filter size={18} />
             </button>
          </div>
        </div>

        {/* List View */}
        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mã nợ & Chứng từ gốc</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Đối tác</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Tổng nợ</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Đã trả</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Còn lại</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Hạn trả</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Trạng thái</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDebts.map(debt => {
                const status = getStatusBadge(debt.status);
                const isOverdue = debt.status === DebtStatus.OVERDUE;
                const daysOverdue = isOverdue && debt.dueDate ? (() => {
                  const due = new Date(debt.dueDate.split('/').reverse().join('-'));
                  const today = new Date();
                  const diffTime = today.getTime() - due.getTime();
                  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                })() : 0;

                return (
                  <tr key={debt.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-5">
                       <p className="text-[10px] font-mono text-slate-400 uppercase">{debt.code}</p>
                       <p className="text-sm font-black text-slate-900 flex items-center gap-1.5 mt-0.5">
                          <FileText size={14} className="text-blue-600" /> {debt.referenceCode}
                       </p>
                    </td>
                    <td className="px-6 py-5">
                       <p className="text-sm font-bold text-slate-900 leading-none">{debt.partnerName}</p>
                       {debt.partnerCode && (
                         <p className="text-[10px] text-slate-500 font-bold uppercase mt-1.5 tracking-tighter">{debt.partnerCode}</p>
                       )}
                    </td>
                    <td className="px-6 py-5 text-right font-medium text-slate-400 text-sm">
                       {formatVND(debt.totalAmount)}
                    </td>
                    <td className="px-6 py-5 text-right font-bold text-emerald-600 text-sm">
                       {formatVND(debt.paidAmount)}
                    </td>
                    <td className="px-6 py-5 text-right">
                       <p className={`text-base font-black ${debt.remainingAmount > 0 ? (debt.status === DebtStatus.OVERDUE ? 'text-rose-600' : 'text-slate-900') : 'text-slate-300'}`}>
                          {formatVND(debt.remainingAmount)}
                       </p>
                    </td>
                    <td className="px-6 py-5 text-center">
                       <p className="text-xs font-black text-slate-700">{debt.dueDate || 'N/A'}</p>
                       {isOverdue && daysOverdue > 0 && (
                         <p className="text-[9px] font-bold text-rose-500 uppercase mt-0.5 animate-pulse">Trễ {daysOverdue} ngày</p>
                       )}
                    </td>
                    <td className="px-6 py-5 text-center">
                       <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black ${status.class}`}>
                          {status.icon} {status.label}
                       </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                       <div className="flex items-center justify-center gap-2">
                          {debt.remainingAmount > 0 && (
                            (() => {
                              const hasPending = debt.type === DebtType.PAYABLE ? pendingTransactions.get(debt.partnerId) : false;
                              return hasPending ? (
                                <button 
                                  disabled
                                  className="p-2 rounded-xl transition-all shadow-sm bg-slate-300 text-slate-500 cursor-not-allowed"
                                  title="Đã tạo phiếu chi, đang chờ duyệt"
                                >
                                  <Receipt size={16} />
                                </button>
                              ) : (
                                <button 
                                  onClick={() => handleCreatePayment(debt)}
                                  className={`p-2 rounded-xl transition-all shadow-sm ${
                                    debt.type === DebtType.RECEIVABLE 
                                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                                      : 'bg-rose-600 text-white hover:bg-rose-700'
                                  }`}
                                  title={debt.type === DebtType.RECEIVABLE ? "Thu tiền" : "Chi tiền"}
                                >
                                  <Receipt size={16} />
                                </button>
                              );
                            })()
                          )}
                          <button 
                            onClick={() => handleViewDetails(debt)}
                            className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
                            title="Xem chi tiết biến động"
                          >
                             <Eye size={18} />
                          </button>
                       </div>
                    </td>
                  </tr>
                )
              })}
              {filteredDebts.length === 0 && (
                <tr>
                   <td colSpan={8} className="py-32 text-center">
                      <div className="flex flex-col items-center gap-4 text-slate-300">
                         <Scale size={64} strokeWidth={1} />
                         <p className="text-sm font-bold uppercase tracking-widest">Không có dữ liệu công nợ phù hợp</p>
                      </div>
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
