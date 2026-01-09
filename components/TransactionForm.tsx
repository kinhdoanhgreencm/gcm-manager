'use client'

import React, { useState, useEffect } from 'react';
import { 
  X, Save, CheckCircle2, AlertCircle, 
  DollarSign, Calendar, Tag, CreditCard,
  Building, User, Car, Info, Lock, ShieldCheck,
  Link2
} from 'lucide-react';
import { TransactionType, TransactionCategory, TransactionStatus, Transaction } from '@/types';
import { MOCK_ACCOUNTS, MOCK_VEHICLES } from '@/constants';

interface PrefillData {
  referenceId: string;
  referenceType: 'CONTRACT' | 'VEHICLE';
  amount: number;
  category: TransactionCategory;
  description: string;
  customerName: string;
}

interface TransactionFormProps {
  onClose: () => void;
  initialType?: TransactionType;
  existingTransaction?: Transaction;
  prefill?: PrefillData; // Dữ liệu tự động đổ từ Hợp đồng
}

export const TransactionForm: React.FC<TransactionFormProps> = ({ onClose, initialType = TransactionType.INCOME, existingTransaction, prefill }) => {
  const [type, setType] = useState<TransactionType>(existingTransaction?.type || initialType);
  const isLocked = existingTransaction?.status === TransactionStatus.APPROVED || 
                   existingTransaction?.status === TransactionStatus.LOCKED;
  const isPrefilled = !!prefill;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[120] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-300">
        
        {isPrefilled && !isLocked && (
          <div className="bg-blue-600 text-white px-10 py-2 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest">
            <Link2 size={14} /> Phiếu thu được tạo tự động từ Hợp đồng
          </div>
        )}

        <div className="px-10 py-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div>
            <h3 className="text-2xl font-black text-slate-900">
              {type === TransactionType.INCOME ? 'Tạo phiếu THU' : 'Tạo phiếu CHI'}
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              {prefill ? `Đang xử lý tài chính cho: ${prefill.customerName}` : 'Ghi nhận biến động dòng tiền vào hệ thống'}
            </p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-100 rounded-full transition-colors">
            <X size={24} className="text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-10 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Amount - Hero Section in Form */}
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Số tiền giao dịch (VND) *</label>
              <div className="relative">
                <div className={`absolute left-5 top-1/2 -translate-y-1/2 p-3 rounded-2xl ${type === TransactionType.INCOME ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                   {(isLocked || isPrefilled) ? <Lock size={24} /> : <DollarSign size={24} />}
                </div>
                <input 
                  type="number" 
                  readOnly={isLocked || isPrefilled}
                  defaultValue={existingTransaction?.amount || prefill?.amount}
                  className={`w-full pl-20 pr-8 py-6 rounded-[32px] text-4xl font-black outline-none transition-all ${
                    (isLocked || isPrefilled) ? 'bg-slate-50 text-slate-500 border-none' : 'bg-slate-50 border border-slate-200 focus:ring-8 focus:ring-blue-500/5 focus:bg-white'
                  }`}
                  placeholder="0"
                />
              </div>
              {isPrefilled && <p className="mt-3 text-[10px] text-blue-600 font-black uppercase tracking-tighter flex items-center gap-2">
                <Info size={12} /> Số tiền được bảo mật theo giá trị hợp đồng
              </p>}
            </div>

            <div className="space-y-6">
              {/* Account Selection */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Tài khoản thanh toán</label>
                <div className="relative">
                  <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <select 
                    disabled={isLocked}
                    className="w-full pl-12 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none appearance-none focus:ring-4 focus:ring-blue-500/5 transition-all"
                  >
                    <option value="">-- Chọn tài khoản nhận/chi --</option>
                    {MOCK_ACCOUNTS.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name} ({new Intl.NumberFormat('vi-VN').format(acc.balance)})</option>
                    ))}
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
                    defaultValue={existingTransaction?.category || prefill?.category}
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
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="date" 
                    disabled={isLocked}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5" 
                    defaultValue={new Date().toISOString().split('T')[0]} 
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Phương thức thanh toán</label>
                <div className="relative">
                  <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <select 
                    disabled={isLocked}
                    className="w-full pl-12 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none appearance-none focus:ring-4 focus:ring-blue-500/5 transition-all"
                  >
                    <option value="BANK_TRANSFER">Chuyển khoản ngân hàng</option>
                    <option value="CASH">Tiền mặt tại quỹ</option>
                    <option value="E_WALLET">Ví điện tử / Khác</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="md:col-span-2 space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Nội dung chi tiết giao dịch</label>
              <textarea 
                rows={3} 
                readOnly={isLocked || isPrefilled}
                className={`w-full p-6 rounded-3xl text-sm font-medium outline-none transition-all ${
                  (isLocked || isPrefilled) ? 'bg-slate-50 text-slate-500 border-none italic' : 'bg-slate-50 border border-slate-200 focus:ring-8 focus:ring-blue-500/5 focus:bg-white'
                }`}
                placeholder="Nhập ghi chú diễn giải cho phiếu này..."
                defaultValue={existingTransaction?.description || prefill?.description}
              ></textarea>
            </div>
          </div>
        </div>

        <div className="px-10 py-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-4">
          <button onClick={onClose} className="px-8 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all">
            Đóng
          </button>
          {!isLocked && (
            <button className="flex items-center gap-2 px-12 py-3 bg-blue-600 text-white rounded-2xl text-sm font-black hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all">
              <Save size={18} /> Xác nhận & Lưu chứng từ
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
