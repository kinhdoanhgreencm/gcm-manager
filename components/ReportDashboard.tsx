'use client'

import React, { useState } from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, Car, 
  Scale, Calendar, Download, Filter, 
  ChevronRight, ArrowUpRight, ArrowDownRight,
  PieChart as PieIcon, BarChart3, LineChart as LineIcon,
  AlertCircle, CheckCircle2, Info, Zap
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area 
} from 'recharts';
import { MOCK_VEHICLES, MOCK_TRANSACTIONS, MOCK_DEBTS } from '@/constants';
import { VehicleStatus, DebtType } from '@/types';

export const ReportDashboard: React.FC = () => {
  const [dateRange, setDateRange] = useState('30days');

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const profitData = MOCK_VEHICLES
    .filter(v => v.status === VehicleStatus.SOLD || v.status === VehicleStatus.REGISTRATION)
    .map(v => ({
      name: v.model,
      profit: v.price - v.cost,
      margin: ((v.price - v.cost) / v.price) * 100
    }));

  const totalProfit = profitData.reduce((sum, item) => sum + item.profit, 0);

  const inventoryByModel = [
    { name: 'VF 3', value: MOCK_VEHICLES.filter(v => v.model === 'VF 3').length },
    { name: 'VF 7', value: MOCK_VEHICLES.filter(v => v.model === 'VF 7 Plus').length },
    { name: 'VF 8', value: MOCK_VEHICLES.filter(v => v.model === 'VF 8 Luxury').length },
    { name: 'VF 9', value: MOCK_VEHICLES.filter(v => v.model === 'VF 9 Eco').length },
    { name: 'Khác', value: MOCK_VEHICLES.filter(v => !['VF 3', 'VF 7 Plus', 'VF 8 Luxury', 'VF 9 Eco'].includes(v.model)).length },
  ].filter(item => item.value > 0);

  const COLORS = ['#00d26a', '#059669', '#10b981', '#34d399', '#6ee7b7'];

  const totalReceivable = MOCK_DEBTS.filter(d => d.type === DebtType.RECEIVABLE).reduce((sum, d) => sum + d.remainingAmount, 0);
  const totalPayable = MOCK_DEBTS.filter(d => d.type === DebtType.PAYABLE).reduce((sum, d) => sum + d.remainingAmount, 0);

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* Top Controls */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white/80 backdrop-blur-md p-5 rounded-[32px] border border-white shadow-sm">
        <div className="flex bg-slate-100 p-1.5 rounded-2xl">
          {['7days', '30days', 'quarter', 'year'].map(range => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                dateRange === range ? 'bg-white text-[#00d26a] shadow-lg' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {range === '7days' ? '1 Tuần' : range === '30days' ? '1 Tháng' : range === 'quarter' ? 'Quý' : 'Năm'}
            </button>
          ))}
        </div>
        <div className="flex gap-4">
          <button className="flex items-center gap-3 px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs hover:bg-slate-800 transition-all shadow-xl">
            <Download size={18} /> XUẤT BÁO CÁO (PDF/EXCEL)
          </button>
        </div>
      </div>

      {/* KPI Hero Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-gradient-to-br from-[#00d26a] to-emerald-800 p-10 rounded-[48px] text-white shadow-2xl shadow-[#00d26a]/20 relative overflow-hidden group">
          <div className="relative z-10">
            <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-3">Lợi nhuận gộp thực tế</p>
            <h3 className="text-5xl font-black tracking-tighter">{formatVND(totalProfit)}</h3>
            <div className="mt-8 flex items-center gap-2 text-white bg-white/10 px-4 py-1.5 rounded-xl w-fit backdrop-blur-md">
              <ArrowUpRight size={18} className="text-[#00d26a]" />
              <span className="text-xs font-black uppercase">+12.5% Month-over-Month</span>
            </div>
          </div>
          <TrendingUp className="absolute -bottom-10 -right-10 text-white/5 transition-transform group-hover:scale-110" size={240} />
        </div>

        <div className="bg-white/90 backdrop-blur-xl p-10 rounded-[48px] border border-white shadow-xl shadow-slate-200/50 flex flex-col justify-between">
          <div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-3">Vốn tồn kho lưu động</p>
            <h3 className="text-4xl font-black text-slate-900 tracking-tighter">
              {formatVND(MOCK_VEHICLES.filter(v => v.status === VehicleStatus.AVAILABLE).reduce((sum, v) => sum + v.cost, 0))}
            </h3>
          </div>
          <div className="mt-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-[#00d26a] animate-pulse"></div>
              <span className="text-xs font-black text-slate-500 uppercase">{MOCK_VEHICLES.filter(v => v.status === VehicleStatus.AVAILABLE).length} XE TRONG KHO</span>
            </div>
            <button className="text-[#00d26a] hover:underline text-[10px] font-black uppercase tracking-widest">Kiểm kho chi tiết</button>
          </div>
        </div>

        <div className="bg-slate-900 p-10 rounded-[48px] text-white shadow-2xl flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-4">Chỉ số Dòng tiền (Cash Flow)</p>
            <div className="space-y-5 mt-6">
               <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Công nợ Phải thu</span>
                  <span className="text-lg font-black text-[#00d26a] tracking-tight">{formatVND(totalReceivable)}</span>
               </div>
               <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Công nợ Phải trả</span>
                  <span className="text-lg font-black text-rose-400 tracking-tight">{formatVND(totalPayable)}</span>
               </div>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-center relative z-10">
             <span className="text-xs font-black uppercase tracking-widest text-white/60">Net Profitability</span>
             <span className="text-xl font-black text-emerald-400">{formatVND(totalReceivable - totalPayable)}</span>
          </div>
          <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/5" size={200} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="bg-white/90 backdrop-blur-xl p-10 rounded-[48px] border border-white shadow-xl shadow-slate-200/50">
           <div className="flex justify-between items-center mb-10">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                <BarChart3 size={20} className="text-[#00d26a]" /> Phân bổ lợi nhuận dòng xe
              </h4>
           </div>
           <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={profitData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} fontWeight="900" />
                  <YAxis axisLine={false} tickLine={false} fontSize={10} fontWeight="900" />
                  <Tooltip 
                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 30px -5px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [formatVND(value), 'Lợi nhuận']}
                  />
                  <Bar dataKey="profit" fill="#00d26a" radius={[10, 10, 0, 0]} barSize={45} />
                </BarChart>
              </ResponsiveContainer>
           </div>
        </div>

        <div className="bg-white/90 backdrop-blur-xl p-10 rounded-[48px] border border-white shadow-xl shadow-slate-200/50">
           <div className="flex justify-between items-center mb-10">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                <PieIcon size={20} className="text-emerald-600" /> Tỷ lệ danh mục tồn kho
              </h4>
           </div>
           <div className="h-80 flex flex-col md:flex-row items-center">
              <div className="flex-1 h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={inventoryByModel}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={8}
                      dataKey="value"
                    >
                      {inventoryByModel.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="white" strokeWidth={4} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full md:w-56 space-y-4">
                 {inventoryByModel.map((item, index) => (
                   <div key={item.name} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                         <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                         <span className="text-[11px] font-black text-slate-600 uppercase tracking-tight">{item.name}</span>
                      </div>
                      <span className="text-xs font-black text-slate-900">{item.value} Xe</span>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
