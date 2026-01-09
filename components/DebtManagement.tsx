'use client'

import React, { useState } from 'react';
import { 
  Scale, ArrowUpRight, ArrowDownRight, 
  Search, Filter, Calendar, History,
  CheckCircle2, AlertCircle, Clock,
  MoreVertical, Eye, Receipt, Plus,
  Users, Truck, FileText, ChevronRight,
  ShieldCheck, DollarSign
} from 'lucide-react';
import { MOCK_DEBTS } from '@/constants';
import { DebtRecord, DebtType, DebtStatus, TransactionType, TransactionCategory } from '@/types';
import { TransactionForm } from './TransactionForm';

export const DebtManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DebtType>(DebtType.RECEIVABLE);
  const [search, setSearch] = useState('');
  const [selectedDebt, setSelectedDebt] = useState<DebtRecord | null>(null);
  const [showReceiptForm, setShowReceiptForm] = useState(false);
  const [prefillData, setPrefillData] = useState<any>(null);

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

  const filteredDebts = MOCK_DEBTS.filter(d => 
    d.type === activeTab && 
    (d.partnerName.toLowerCase().includes(search.toLowerCase()) || d.referenceCode.includes(search))
  );

  const totalReceivable = MOCK_DEBTS
    .filter(d => d.type === DebtType.RECEIVABLE)
    .reduce((sum, d) => sum + d.remainingAmount, 0);

  const totalPayable = MOCK_DEBTS
    .filter(d => d.type === DebtType.PAYABLE)
    .reduce((sum, d) => sum + d.remainingAmount, 0);

  const overdueAmount = MOCK_DEBTS
    .filter(d => d.status === DebtStatus.OVERDUE)
    .reduce((sum, d) => sum + d.remainingAmount, 0);

  const handleCreatePayment = (debt: DebtRecord) => {
    const isReceivable = debt.type === DebtType.RECEIVABLE;
    setPrefillData({
      referenceId: debt.referenceId,
      referenceType: isReceivable ? 'CONTRACT' : 'SUPPLIER',
      amount: debt.remainingAmount,
      category: isReceivable ? TransactionCategory.CAR_SALE : TransactionCategory.INVENTORY_PURCHASE,
      description: `${isReceivable ? 'Thu tiền' : 'Chi tiền'} công nợ: ${debt.partnerName} - ${debt.referenceCode}`,
      customerName: debt.partnerName
    });
    setShowReceiptForm(true);
  };

  return (
    <div className="space-y-6">
      {showReceiptForm && (
        <TransactionForm 
          onClose={() => setShowReceiptForm(false)} 
          prefill={prefillData} 
          initialType={activeTab === DebtType.RECEIVABLE ? TransactionType.INCOME : TransactionType.EXPENSE} 
        />
      )}

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Phải thu khách hàng', value: totalReceivable, icon: <ArrowDownRight className="text-emerald-500" />, color: 'text-emerald-600' },
          { label: 'Phải trả đối tác', value: totalPayable, icon: <ArrowUpRight className="text-rose-500" />, color: 'text-rose-600' },
          { label: 'Tổng quá hạn', value: overdueAmount, icon: <AlertCircle className="text-rose-500" />, color: 'text-rose-700' },
          { label: 'Dự chi (Tuần tới)', value: 450000000, icon: <Clock className="text-amber-500" />, color: 'text-amber-600' },
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
                       <p className="text-[10px] text-slate-500 font-bold uppercase mt-1.5 tracking-tighter">{debt.partnerCode}</p>
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
                       <p className="text-xs font-black text-slate-700">{debt.dueDate}</p>
                       {debt.status === DebtStatus.OVERDUE && (
                         <p className="text-[9px] font-bold text-rose-500 uppercase mt-0.5 animate-pulse">Trễ 3 ngày</p>
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
                          )}
                          <button 
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
