'use client'

import React, { useState } from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, Car, 
  Scale, Calendar, Download, Filter, 
  ChevronRight, ArrowUpRight, ArrowDownRight,
  PieChart as PieIcon, BarChart3, LineChart as LineIcon,
  AlertCircle, CheckCircle2, Info
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area 
} from 'recharts';
import { MOCK_VEHICLES, MOCK_TRANSACTIONS, MOCK_DEBTS } from '@/constants';
import { VehicleStatus, DebtType } from '@/types';

export const ReportDashboard: React.FC = () => {
  const [dateRange, setDateRange] = useState('7days');

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // 1. Tính toán Lãi/Lỗ theo xe (Dựa trên xe đã bán hoặc làm hồ sơ)
  const profitData = MOCK_VEHICLES
    .filter(v => v.status === VehicleStatus.SOLD || v.status === VehicleStatus.REGISTRATION || v.status === VehicleStatus.DELIVERED)
    .map(v => ({
      name: v.model,
      profit: v.price - v.cost,
      margin: ((v.price - v.cost) / v.price) * 100
    }));

  const totalProfit = profitData.reduce((sum, item) => sum + item.profit, 0);

  // 2. Dữ liệu Tồn kho theo dòng xe
  const inventoryByModel = [
    { name: 'VF 3', value: MOCK_VEHICLES.filter(v => v.model === 'VF 3').length },
    { name: 'VF 7', value: MOCK_VEHICLES.filter(v => v.model === 'VF 7 Plus').length },
    { name: 'VF 8', value: MOCK_VEHICLES.filter(v => v.model === 'VF 8 Luxury').length },
    { name: 'VF 9', value: MOCK_VEHICLES.filter(v => v.model === 'VF 9 Eco').length },
    { name: 'Khác', value: MOCK_VEHICLES.filter(v => !['VF 3', 'VF 7 Plus', 'VF 8 Luxury', 'VF 9 Eco'].includes(v.model)).length },
  ].filter(item => item.value > 0);

  const COLORS = ['#2563eb', '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e'];

  // 3. Công nợ
  const totalReceivable = MOCK_DEBTS.filter(d => d.type === DebtType.RECEIVABLE).reduce((sum, d) => sum + d.remainingAmount, 0);
  const totalPayable = MOCK_DEBTS.filter(d => d.type === DebtType.PAYABLE).reduce((sum, d) => sum + d.remainingAmount, 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Top Controls */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-[32px] border border-slate-200 shadow-sm">
        <div className="flex bg-slate-100 p-1 rounded-2xl">
          {['7days', '30days', 'quarter', 'year'].map(range => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-6 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                dateRange === range ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {range === '7days' ? '7 Ngày' : range === '30days' ? '30 Ngày' : range === 'quarter' ? 'Quý này' : 'Năm nay'}
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl font-black text-xs hover:bg-slate-800 transition-all">
            <Download size={16} /> Xuất Báo cáo PDF
          </button>
        </div>
      </div>

      {/* KPI Hero Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-[40px] text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-2">Tổng Lợi nhuận gộp</p>
            <h3 className="text-4xl font-black">{formatVND(totalProfit)}</h3>
            <div className="mt-6 flex items-center gap-2 text-emerald-300">
              <ArrowUpRight size={20} />
              <span className="text-sm font-bold">+12.5% so với tháng trước</span>
            </div>
          </div>
          <TrendingUp className="absolute -bottom-6 -right-6 text-white/10" size={140} />
        </div>

        <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Giá trị Tồn kho</p>
            <h3 className="text-3xl font-black text-slate-900">
              {formatVND(MOCK_VEHICLES.filter(v => v.status === VehicleStatus.AVAILABLE).reduce((sum, v) => sum + v.cost, 0))}
            </h3>
          </div>
          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-600"></div>
              <span className="text-xs font-bold text-slate-500">{MOCK_VEHICLES.filter(v => v.status === VehicleStatus.AVAILABLE).length} xe sẵn sàng</span>
            </div>
            <button className="text-blue-600 hover:underline text-xs font-black uppercase">Chi tiết kho</button>
          </div>
        </div>

        <div className="bg-slate-900 p-8 rounded-[40px] text-white shadow-xl flex flex-col justify-between">
          <div>
            <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-2">Chỉ số Sức khỏe Tài chính</p>
            <div className="space-y-4 mt-4">
               <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-white/60 uppercase">Phải thu (AR)</span>
                  <span className="text-sm font-black text-emerald-400">{formatVND(totalReceivable)}</span>
               </div>
               <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-white/60 uppercase">Phải trả (AP)</span>
                  <span className="text-sm font-black text-rose-400">{formatVND(totalPayable)}</span>
               </div>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-center">
             <span className="text-xs font-bold uppercase">Net Cash Position</span>
             <span className="text-lg font-black">{formatVND(totalReceivable - totalPayable)}</span>
          </div>
        </div>
      </div>

      {/* Detailed Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Lãi lỗ theo xe */}
        <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
           <div className="flex justify-between items-center mb-8">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <BarChart3 size={18} className="text-blue-600" /> Phân tích Lợi nhuận theo dòng xe
              </h4>
           </div>
           <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={profitData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} fontWeight="bold" />
                  <YAxis axisLine={false} tickLine={false} fontSize={10} fontWeight="bold" />
                  <Tooltip 
                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [formatVND(value), 'Lợi nhuận']}
                  />
                  <Bar dataKey="profit" fill="#2563eb" radius={[6, 6, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* Cơ cấu kho xe */}
        <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
           <div className="flex justify-between items-center mb-8">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <PieIcon size={18} className="text-indigo-600" /> Cơ cấu danh mục tồn kho
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
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {inventoryByModel.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full md:w-48 space-y-3">
                 {inventoryByModel.map((item, index) => (
                   <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                         <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                         <span className="text-xs font-bold text-slate-600">{item.name}</span>
                      </div>
                      <span className="text-xs font-black text-slate-900">{item.value} xe</span>
                   </div>
                 ))}
              </div>
           </div>
        </div>

        {/* Báo cáo Lãi Lỗ Chi Tiết Theo Xe (Table) */}
        <div className="lg:col-span-2 bg-white rounded-[40px] border border-slate-200 overflow-hidden shadow-sm">
           <div className="p-8 border-b border-slate-100 flex justify-between items-center">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <Car size={18} className="text-blue-600" /> Bảng kê hiệu quả kinh doanh từng xe
              </h4>
           </div>
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                 <thead className="bg-slate-50">
                    <tr>
                       <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Thông tin xe (VIN)</th>
                       <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Giá vốn</th>
                       <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Giá bán</th>
                       <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Lợi nhuận gộp</th>
                       <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Biên (%)</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {MOCK_VEHICLES.filter(v => v.price > 0 && (v.status === VehicleStatus.SOLD || v.status === VehicleStatus.REGISTRATION || v.status === VehicleStatus.DELIVERED)).map(v => {
                      const profit = v.price - v.cost;
                      const margin = (profit / v.price) * 100;
                      return (
                        <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                           <td className="px-8 py-5">
                              <p className="text-sm font-black text-slate-900">{v.model}</p>
                              <p className="text-[10px] font-mono text-slate-400 uppercase">{v.vin}</p>
                           </td>
                           <td className="px-8 py-5 text-right text-xs font-bold text-slate-500">{formatVND(v.cost)}</td>
                           <td className="px-8 py-5 text-right text-sm font-black text-slate-900">{formatVND(v.price)}</td>
                           <td className="px-8 py-5 text-right">
                              <span className={`text-sm font-black ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {profit >= 0 ? '+' : ''}{formatVND(profit)}
                              </span>
                           </td>
                           <td className="px-8 py-5 text-center">
                              <span className={`px-2 py-1 rounded text-[10px] font-black ${margin > 10 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                {margin.toFixed(1)}%
                              </span>
                           </td>
                        </tr>
                      )
                    })}
                 </tbody>
              </table>
           </div>
        </div>
      </div>
    </div>
  );
};
