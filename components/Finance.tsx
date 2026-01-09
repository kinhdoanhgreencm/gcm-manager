'use client'

import React, { useState } from 'react';
import { 
  ArrowUpRight, ArrowDownRight, Wallet, Filter, 
  Download, Plus, Receipt, History, PieChart as PieChartIcon,
  CreditCard, Banknote, Building2, Search, ArrowLeftRight, Landmark,
  CheckCircle2, Clock, Lock, ArrowRight, Eye
} from 'lucide-react';
import { MOCK_TRANSACTIONS, MOCK_ACCOUNTS } from '@/constants';
import { TransactionType, TransactionCategory, TransactionStatus, Transaction } from '@/types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TransactionForm } from './TransactionForm';

export const Finance: React.FC = () => {
  const [activeView, setActiveView] = useState<'history' | 'cashflow'>('history');
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<TransactionType>(TransactionType.INCOME);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | undefined>();
  
  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const totalBalance = MOCK_ACCOUNTS.reduce((sum, acc) => sum + acc.balance, 0);

  const getStatusBadge = (status: TransactionStatus) => {
    switch(status) {
      case TransactionStatus.APPROVED:
        return { label: 'Đã khớp dòng tiền', class: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle2 size={12} /> };
      case TransactionStatus.PENDING:
        return { label: 'Đang chờ duyệt', class: 'bg-amber-100 text-amber-700', icon: <Clock size={12} /> };
      case TransactionStatus.LOCKED:
        return { label: 'Đã khóa sổ', class: 'bg-slate-200 text-slate-700', icon: <Lock size={12} /> };
      default:
        return { label: 'Bản nháp', class: 'bg-slate-100 text-slate-400', icon: <History size={12} /> };
    }
  };

  const openForm = (type: TransactionType) => {
    setFormType(type);
    setSelectedTransaction(undefined);
    setShowForm(true);
  };

  const viewTransaction = (t: Transaction) => {
    setSelectedTransaction(t);
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      {showForm && (
        <TransactionForm 
          onClose={() => setShowForm(false)} 
          initialType={formType} 
          existingTransaction={selectedTransaction} 
        />
      )}
      
      {/* Account Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-1 bg-slate-900 text-white p-6 rounded-2xl shadow-xl flex flex-col justify-between overflow-hidden relative">
          <div className="relative z-10">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Tổng tài sản tiền mặt</p>
            <h3 className="text-2xl font-black">{formatVND(totalBalance)}</h3>
          </div>
          <Wallet className="absolute -bottom-4 -right-4 text-white/10" size={100} />
          <div className="mt-8 flex gap-2 z-10">
            <button className="flex-1 bg-white/10 hover:bg-white/20 py-2 rounded-lg text-[10px] font-bold transition-colors uppercase tracking-widest">Đối soát ngân hàng</button>
          </div>
        </div>

        {MOCK_ACCOUNTS.map(acc => (
          <div key={acc.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-blue-300 transition-colors cursor-pointer">
            <div className="flex justify-between items-start">
              <div className={`p-2 rounded-xl ${acc.type === 'CASH' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                {acc.type === 'CASH' ? <Banknote size={20} /> : <Landmark size={20} />}
              </div>
              <ArrowRight size={14} className="text-slate-300" />
            </div>
            <div className="mt-4">
              <p className="text-slate-500 text-xs font-medium">{acc.name}</p>
              <p className="text-lg font-bold text-slate-900 leading-tight">{formatVND(acc.balance)}</p>
              {acc.accountNumber && <p className="text-[10px] text-slate-400 font-mono mt-1">{acc.accountNumber}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex bg-slate-100 p-1.5 rounded-2xl">
            <button 
              onClick={() => setActiveView('history')}
              className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeView === 'history' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <History size={18} /> Lịch sử GD
            </button>
            <button 
              onClick={() => setActiveView('cashflow')}
              className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeView === 'cashflow' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <PieChartIcon size={18} /> Biến động dòng tiền
            </button>
          </div>

          <div className="flex gap-3">
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button 
                onClick={() => openForm(TransactionType.INCOME)}
                className="flex items-center gap-2 px-5 py-2.5 bg-white text-emerald-600 rounded-lg hover:bg-emerald-50 font-bold text-xs shadow-sm transition-all"
              >
                + Thu tiền
              </button>
              <button 
                onClick={() => openForm(TransactionType.EXPENSE)}
                className="flex items-center gap-2 px-5 py-2.5 text-rose-600 rounded-lg hover:bg-rose-50 font-bold text-xs transition-all"
              >
                - Chi tiền
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Thời gian & Mã</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nguồn tiền</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Phân loại & Trạng thái</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Số tiền</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {MOCK_TRANSACTIONS.map(t => {
                const account = MOCK_ACCOUNTS.find(a => a.id === t.accountId);
                const status = getStatusBadge(t.status || TransactionStatus.APPROVED);
                return (
                  <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-900">{t.date}</p>
                      <p className="text-[10px] text-slate-400 font-mono uppercase">#{t.id}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                         <div className={`w-2 h-2 rounded-full ${account?.type === 'CASH' ? 'bg-orange-500' : 'bg-blue-500'}`}></div>
                         <span className="text-sm font-medium text-slate-700">{account?.name}</span>
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
                    <td className={`px-6 py-4 text-right font-black text-sm ${
                      t.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {t.type === TransactionType.INCOME ? '+' : '-'}{formatVND(t.amount)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => viewTransaction(t)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                        title="Xem chi tiết phiếu"
                      >
                         <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
