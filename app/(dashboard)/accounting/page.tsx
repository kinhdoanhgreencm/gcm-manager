'use client'

import React from 'react';
import { Calculator, Clock } from 'lucide-react';

export default function AccountingPage() {
  return (
    <div className="space-y-8">
      {/* Stats Cards - Placeholder */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Tổng doanh thu</p>
          <p className="text-2xl font-black mt-1 tracking-tighter text-slate-900">
            -
          </p>
        </div>
        <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Tổng chi phí</p>
          <p className="text-2xl font-black mt-1 tracking-tighter text-rose-600">
            -
          </p>
        </div>
        <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Lợi nhuận</p>
          <p className="text-2xl font-black mt-1 tracking-tighter text-slate-900">
            -
          </p>
        </div>
        <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Số chứng từ</p>
          <p className="text-2xl font-black mt-1 tracking-tighter text-slate-900">
            -
          </p>
        </div>
      </div>

      {/* Main Content - Placeholder */}
      <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-12">
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-100 rounded-full mb-6">
            <Calculator size={40} className="text-slate-400" />
          </div>
          <h3 className="text-xl font-black text-slate-900 mb-2">Hệ thống Kế toán</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto mb-8">
            Tính năng kế toán đang được phát triển và sẽ có sẵn trong phiên bản tiếp theo.
          </p>
          
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-sm">
            <Clock size={16} />
            <span>Đang phát triển</span>
          </div>
        </div>
      </div>
    </div>
  );
}
