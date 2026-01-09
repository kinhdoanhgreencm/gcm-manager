'use client'

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Truck, Plus, Search, Filter, Building2, 
  MoreVertical, ChevronRight, Phone, Mail, 
  MapPin, Landmark, CreditCard, History, 
  Car, Receipt, DollarSign, AlertCircle,
  ShieldCheck, ArrowUpRight, ArrowDownRight,
  Clock, CheckCircle2, User, FileText
} from 'lucide-react';
import { MOCK_SUPPLIERS, MOCK_VEHICLES, MOCK_TRANSACTIONS } from '@/constants';
import { Supplier, SupplierType, SupplierStatus, VehicleStatus, TransactionType } from '@/types';

export const Suppliers: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'inventory' | 'finance' | 'debt'>('overview');

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const getSupplierTypeLabel = (type: SupplierType) => {
    switch(type) {
      case SupplierType.OEM: return { label: 'Hãng / Nhà phân phối', color: 'bg-blue-100 text-blue-700' };
      case SupplierType.DEALER: return { label: 'Đại lý trung gian', color: 'bg-indigo-100 text-indigo-700' };
      case SupplierType.INDIVIDUAL: return { label: 'Cá nhân ký gửi', color: 'bg-amber-100 text-amber-700' };
      case SupplierType.AUCTION: return { label: 'Nguồn đấu giá', color: 'bg-rose-100 text-rose-700' };
      default: return { label: 'Khác', color: 'bg-slate-100 text-slate-700' };
    }
  };

  const filteredSuppliers = MOCK_SUPPLIERS.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.code.toLowerCase().includes(search.toLowerCase())
  );


  if (selectedSupplier) {
    const supplierVehicles = MOCK_VEHICLES.filter(v => v.supplierId === selectedSupplier.id);
    const supplierTransactions = MOCK_TRANSACTIONS.filter(t => t.description.includes(selectedSupplier.name) || t.referenceId === selectedSupplier.id);

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <button 
          onClick={() => setSelectedSupplier(null)}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold text-sm transition-colors"
        >
          <ChevronRight size={18} className="rotate-180" /> Quay lại danh sách
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Info */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center text-3xl font-black mb-4 ring-8 ring-blue-50">
                <Truck size={40} />
              </div>
              <h3 className="text-xl font-black text-slate-900">{selectedSupplier.name}</h3>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">{selectedSupplier.code}</p>
              
              <div className="mt-4 w-full pt-6 border-t border-slate-50 space-y-4 text-left">
                 <div className="flex items-start gap-3">
                   <Phone size={16} className="text-slate-400 mt-0.5" />
                   <div>
                     <p className="text-[10px] font-black text-slate-400 uppercase">Liên hệ</p>
                     <p className="text-sm font-bold text-slate-900">{selectedSupplier.phone}</p>
                   </div>
                 </div>
                 <div className="flex items-start gap-3">
                   <MapPin size={16} className="text-slate-400 mt-0.5" />
                   <div>
                     <p className="text-[10px] font-black text-slate-400 uppercase">Địa chỉ</p>
                     <p className="text-xs font-medium text-slate-600 leading-relaxed">{selectedSupplier.address}</p>
                   </div>
                 </div>
                 <div className="flex items-start gap-3">
                   <Landmark size={16} className="text-slate-400 mt-0.5" />
                   <div>
                     <p className="text-[10px] font-black text-slate-400 uppercase">Thanh toán</p>
                     <p className="text-xs font-bold text-slate-900">{selectedSupplier.bankName || 'Chưa cập nhật'}</p>
                     <p className="text-[10px] font-mono text-slate-400">{selectedSupplier.bankAccount}</p>
                   </div>
                 </div>
              </div>

              <button className="w-full mt-8 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black hover:bg-slate-800 transition-all">
                Sửa thông tin NCC
              </button>
            </div>

            <div className="bg-rose-50 rounded-3xl p-6 border border-rose-100">
               <div className="flex justify-between items-center mb-4">
                  <div className="w-10 h-10 bg-rose-500 text-white rounded-xl flex items-center justify-center">
                    <DollarSign size={20} />
                  </div>
                  <span className="text-[10px] font-black text-rose-600 uppercase">Phải trả NCC</span>
               </div>
               <p className="text-[10px] font-bold text-rose-700/60 uppercase tracking-widest">Công nợ hiện tại</p>
               <h4 className="text-xl font-black text-rose-700">{formatVND(selectedSupplier.debt)}</h4>
               <div className="mt-4 pt-4 border-t border-rose-100 flex justify-between items-center">
                  <span className="text-xs font-bold text-rose-700">Hình thức</span>
                  <span className="text-xs font-black text-rose-600 uppercase tracking-tighter">
                    {selectedSupplier.paymentTerms === 'DEFERRED' ? 'Trả chậm' : 'Trả ngay'}
                  </span>
               </div>
            </div>
          </div>

          {/* Main Content Tabs */}
          <div className="lg:col-span-3 space-y-6">
            <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 w-fit">
              {[
                { id: 'overview', label: 'Tổng quan', icon: <Building2 size={16} /> },
                { id: 'inventory', label: 'Xe đã nhập', icon: <Car size={16} /> },
                { id: 'finance', label: 'Thanh toán', icon: <Receipt size={16} /> },
                { id: 'debt', label: 'Lịch sử nợ', icon: <History size={16} /> },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black transition-all ${
                    activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-4">
                 <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm col-span-2">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Thông tin pháp lý & Phụ trách</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                       <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Mã số thuế / CCCD</p>
                          <p className="text-sm font-black text-slate-900 font-mono">{selectedSupplier.taxCode || selectedSupplier.idCard}</p>
                       </div>
                       <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Người đại diện</p>
                          <p className="text-sm font-black text-slate-900">{selectedSupplier.representative || 'N/A'}</p>
                       </div>
                       <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Nhân viên phụ trách</p>
                          <div className="flex items-center gap-2">
                             <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-[10px] text-blue-600 font-black">AD</div>
                             <p className="text-sm font-black text-slate-900">Quản trị viên</p>
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm flex flex-col justify-center gap-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hiệu suất nhập xe</p>
                    <div className="flex items-center gap-3">
                       <Car size={32} className="text-blue-600" />
                       <h5 className="text-4xl font-black text-slate-900">{selectedSupplier.totalVehicles}</h5>
                       <span className="text-[10px] font-bold text-slate-400 uppercase">Sản phẩm</span>
                    </div>
                 </div>

                 <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm flex flex-col justify-center gap-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Giá trị nhập tích lũy</p>
                    <div className="flex items-center gap-3">
                       <ArrowUpRight size={32} className="text-emerald-600" />
                       <h5 className="text-2xl font-black text-slate-900">{formatVND(selectedSupplier.totalImportValue)}</h5>
                    </div>
                 </div>
              </div>
            )}

            {activeTab === 'inventory' && (
              <div className="bg-white rounded-[40px] border border-slate-200 overflow-hidden shadow-sm animate-in slide-in-from-bottom-4">
                 <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Xe & Số VIN</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Trạng thái</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Giá nhập (Vốn)</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Bàn giao</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                       {supplierVehicles.map(v => (
                         <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                               <p className="text-sm font-bold text-slate-900">{v.make} {v.model}</p>
                               <p className="text-[10px] font-mono text-slate-400 uppercase">{v.vin}</p>
                            </td>
                            <td className="px-6 py-4">
                               <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                 v.status === VehicleStatus.AVAILABLE ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                               }`}>
                                 {v.status === VehicleStatus.AVAILABLE ? 'Còn trong kho' : 'Đã bán / Đã bàn giao'}
                               </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                               <p className="text-sm font-black text-slate-900">{formatVND(v.cost)}</p>
                            </td>
                            <td className="px-6 py-4 text-center">
                               {v.status === VehicleStatus.DELIVERED ? <CheckCircle2 size={16} className="text-emerald-500 mx-auto" /> : <Clock size={16} className="text-slate-300 mx-auto" />}
                            </td>
                         </tr>
                       ))}
                       {supplierVehicles.length === 0 && (
                         <tr><td colSpan={4} className="py-20 text-center text-slate-400 font-bold text-xs uppercase">Chưa có xe nào từ nguồn này</td></tr>
                       )}
                    </tbody>
                 </table>
              </div>
            )}

            {activeTab === 'finance' && (
              <div className="space-y-4 animate-in slide-in-from-bottom-4">
                 <div className="bg-slate-900 text-white p-8 rounded-3xl flex justify-between items-center relative overflow-hidden">
                    <div className="relative z-10">
                      <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">Tổng vốn đã thanh toán thực tế</p>
                      <h4 className="text-3xl font-black text-emerald-400">{formatVND(selectedSupplier.totalImportValue - selectedSupplier.debt)}</h4>
                    </div>
                    <button className="relative z-10 px-8 py-3 bg-white text-slate-900 rounded-2xl text-xs font-black hover:bg-slate-100 transition-all flex items-center gap-2">
                      <Plus size={16} /> Tạo phiếu chi (Trả nợ NCC)
                    </button>
                    <DollarSign className="absolute -bottom-10 -right-10 text-white/5" size={200} />
                 </div>

                 <div className="bg-white rounded-[40px] border border-slate-200 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                       <thead className="bg-slate-50 border-b border-slate-100">
                         <tr>
                           <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngày phát sinh</th>
                           <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nội dung thanh toán</th>
                           <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Số tiền chi</th>
                           <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Trạng thái</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-50">
                          {supplierTransactions.length > 0 ? supplierTransactions.map(t => (
                            <tr key={t.id} className="hover:bg-slate-50">
                               <td className="px-6 py-4 text-xs font-bold text-slate-600">{t.date}</td>
                               <td className="px-6 py-4 text-xs font-medium">{t.description}</td>
                               <td className="px-6 py-4 text-right text-sm font-black text-rose-600">-{formatVND(t.amount)}</td>
                               <td className="px-6 py-4 text-center">
                                  <CheckCircle2 size={16} className="text-emerald-500 mx-auto" />
                               </td>
                            </tr>
                          )) : (
                            <tr><td colSpan={4} className="py-20 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">Chưa có dữ liệu thanh toán</td></tr>
                          )}
                       </tbody>
                    </table>
                 </div>
              </div>
            )}

            {activeTab === 'debt' && (
              <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm animate-in slide-in-from-bottom-4 space-y-8">
                 <div className="flex justify-between items-start">
                    <div>
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Trạng thái nợ hiện tại</h4>
                       <h3 className={`text-4xl font-black ${selectedSupplier.debt > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                         {formatVND(selectedSupplier.debt)}
                       </h3>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-right">
                       <p className="text-[10px] font-black text-slate-400 uppercase">Hạn thanh toán kế tiếp</p>
                       <p className="text-sm font-black text-slate-900">25 / 05 / 2024</p>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                       <FileText size={14} /> Biến động nợ từ nhập xe
                    </h5>
                    <div className="bg-slate-50 border border-slate-200 rounded-3xl overflow-hidden">
                       <table className="w-full text-left">
                          <thead className="bg-white/50 border-b border-slate-200">
                             <tr>
                                <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase">Ngày</th>
                                <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase">Xe liên kết</th>
                                <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase text-right">Phát sinh nợ</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                             {supplierVehicles.map(v => (
                               <tr key={v.id} className="text-xs">
                                  <td className="px-6 py-3 font-medium">{v.createdAt.split('T')[0]}</td>
                                  <td className="px-6 py-3 font-bold">{v.make} {v.model}</td>
                                  <td className="px-6 py-3 text-right font-black text-rose-600">+{formatVND(v.cost)}</td>
                               </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                 </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Tổng đối tác', value: MOCK_SUPPLIERS.length, color: 'text-slate-900', icon: <Truck size={16} className="text-slate-400" /> },
          { label: 'Công nợ Hãng (OEM)', value: '12 tỷ', color: 'text-rose-600', icon: <Building2 size={16} className="text-rose-400" /> },
          { label: 'Xe ký gửi cá nhân', value: '8 xe', color: 'text-amber-600', icon: <Car size={16} className="text-amber-400" /> },
          { label: 'Nhân viên phụ trách', value: '3', color: 'text-blue-600', icon: <User size={16} className="text-blue-400" /> },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
              {stat.icon}
            </div>
            <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filter & Action */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Tìm theo tên đối tác, mã NCC, MST..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold focus:ring-4 focus:ring-blue-500/10 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex gap-3">
          <Link
            href="/suppliers/new"
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-black text-sm shadow-lg shadow-blue-200 transition-all"
          >
            <Plus size={18} /> Thêm nhà cung cấp
          </Link>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nhà cung cấp</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Loại nguồn</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Số xe đã nhập</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Giá trị nhập</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Công nợ hiện tại</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredSuppliers.map((s) => {
              const typeLabel = getSupplierTypeLabel(s.type);
              return (
                <tr key={s.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer group" onClick={() => setSelectedSupplier(s)}>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center font-black text-lg group-hover:bg-blue-600 group-hover:text-white transition-all">
                        <Truck size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 leading-none">{s.name}</h4>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-2 font-bold uppercase">
                           <span>{s.code}</span>
                           <span className="text-slate-300">•</span>
                           <span>{s.phone}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-tight ${typeLabel.color}`}>
                       {typeLabel.label}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="w-8 h-8 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-xs font-black text-slate-600">
                       {s.totalVehicles}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <p className="text-sm font-black text-slate-900">{formatVND(s.totalImportValue)}</p>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <p className={`text-sm font-black ${s.debt > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                      {formatVND(s.debt)}
                    </p>
                    {s.debt > 0 && <span className="text-[9px] font-bold text-rose-400 uppercase tracking-tighter">Hạn trả: 25/05</span>}
                  </td>
                  <td className="px-6 py-5 text-center">
                    <button className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all">
                      <MoreVertical size={18} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
