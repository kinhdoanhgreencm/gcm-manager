'use client'

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Plus, Search, Filter, User, Phone, 
  Mail, MapPin, MoreVertical, 
  ChevronRight, ArrowUpRight, 
  FileText, Receipt, Car, Clock,
  History, Building2, UserCircle,
  AlertCircle, CheckCircle2, BadgeCheck,
  Users
} from 'lucide-react';
import { MOCK_CUSTOMERS, MOCK_SALES_CONTRACTS, MOCK_TRANSACTIONS } from '@/constants';
import { Customer, CustomerType, CustomerStatus } from '@/types';

export const CRM: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'contracts' | 'payments' | 'history'>('overview');

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const getStatusBadge = (status: CustomerStatus) => {
    switch(status) {
      case CustomerStatus.LOYAL:
        return { label: 'Thân thiết', color: 'bg-indigo-100 text-indigo-700', icon: <BadgeCheck size={14} /> };
      case CustomerStatus.TRADING:
        return { label: 'Đang giao dịch', color: 'bg-emerald-100 text-emerald-700', icon: <Clock size={14} /> };
      case CustomerStatus.PROSPECT:
        return { label: 'Tiềm năng', color: 'bg-blue-100 text-blue-700', icon: <UserCircle size={14} /> };
      default:
        return { label: 'Ngừng hoạt động', color: 'bg-slate-100 text-slate-500', icon: <AlertCircle size={14} /> };
    }
  };


  const filteredCustomers = MOCK_CUSTOMERS.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.phone.includes(search)
  );

  if (selectedCustomer) {
    const customerContracts = MOCK_SALES_CONTRACTS.filter(sc => sc.customerName === selectedCustomer.name);
    const customerPayments = MOCK_TRANSACTIONS.filter(t => t.description.includes(selectedCustomer.name));

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <button 
          onClick={() => setSelectedCustomer(null)}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold text-sm transition-colors"
        >
          <ChevronRight size={18} className="rotate-180" /> Quay lại danh sách
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Info */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-3xl font-black mb-4 ring-4 ring-blue-50">
                {selectedCustomer.name.charAt(0)}
              </div>
              <h3 className="text-xl font-black text-slate-900">{selectedCustomer.name}</h3>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">{selectedCustomer.code}</p>
              
              <div className="mt-4 w-full pt-6 border-t border-slate-50 space-y-4 text-left">
                 <div className="flex items-start gap-3">
                   <Phone size={16} className="text-slate-400 mt-0.5" />
                   <div>
                     <p className="text-[10px] font-black text-slate-400 uppercase">Điện thoại</p>
                     <p className="text-sm font-bold text-slate-900">{selectedCustomer.phone}</p>
                   </div>
                 </div>
                 <div className="flex items-start gap-3">
                   <Mail size={16} className="text-slate-400 mt-0.5" />
                   <div>
                     <p className="text-[10px] font-black text-slate-400 uppercase">Email</p>
                     <p className="text-sm font-bold text-slate-900 truncate max-w-[150px]">{selectedCustomer.email || 'Chưa cập nhật'}</p>
                   </div>
                 </div>
                 <div className="flex items-start gap-3">
                   <MapPin size={16} className="text-slate-400 mt-0.5" />
                   <div>
                     <p className="text-[10px] font-black text-slate-400 uppercase">Địa chỉ</p>
                     <p className="text-xs font-medium text-slate-600 leading-relaxed">{selectedCustomer.address}</p>
                   </div>
                 </div>
              </div>

              <button className="w-full mt-8 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black hover:bg-slate-800 transition-all">
                Chỉnh sửa thông tin
              </button>
            </div>

            <div className="bg-emerald-50 rounded-3xl p-6 border border-emerald-100">
               <div className="flex justify-between items-center mb-4">
                  <div className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center">
                    <ArrowUpRight size={20} />
                  </div>
                  <span className="text-[10px] font-black text-emerald-600 uppercase">Dòng tiền thu</span>
               </div>
               <p className="text-[10px] font-bold text-emerald-700/60 uppercase tracking-widest">Tổng doanh thu</p>
               <h4 className="text-xl font-black text-emerald-700">{formatVND(selectedCustomer.totalRevenue)}</h4>
               <div className="mt-4 pt-4 border-t border-emerald-100 flex justify-between items-center">
                  <span className="text-xs font-bold text-emerald-700">Công nợ hiện tại</span>
                  <span className="text-sm font-black text-rose-600">{formatVND(selectedCustomer.debt)}</span>
               </div>
            </div>
          </div>

          {/* Tab Content */}
          <div className="lg:col-span-3 space-y-6">
            <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 w-fit">
              {[
                { id: 'overview', label: 'Tổng quan', icon: <Building2 size={16} /> },
                { id: 'contracts', label: 'Hợp đồng', icon: <FileText size={16} /> },
                { id: 'payments', label: 'Thanh toán', icon: <Receipt size={16} /> },
                { id: 'history', label: 'Lịch sử', icon: <History size={16} /> },
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

            {/* Sub-tab: Overview */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-4">
                <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm col-span-2">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Thông tin pháp lý</h4>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <div>
                         <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Loại khách hàng</p>
                         <p className="text-sm font-black text-slate-900">{selectedCustomer.type === CustomerType.INDIVIDUAL ? 'Cá nhân' : 'Doanh nghiệp'}</p>
                      </div>
                      <div>
                         <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                            {selectedCustomer.type === CustomerType.INDIVIDUAL ? 'CCCD / Hộ chiếu' : 'Mã số thuế'}
                         </p>
                         <p className="text-sm font-black text-slate-900 font-mono">{selectedCustomer.idCard || selectedCustomer.taxCode}</p>
                      </div>
                      <div>
                         <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Nguồn khách hàng</p>
                         <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold">{selectedCustomer.source}</span>
                      </div>
                      {selectedCustomer.type === CustomerType.CORPORATE && (
                        <>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Người đại diện</p>
                            <p className="text-sm font-black text-slate-900">{selectedCustomer.representative}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Chức vụ</p>
                            <p className="text-sm font-bold text-slate-600">{selectedCustomer.position}</p>
                          </div>
                        </>
                      )}
                   </div>
                </div>

                <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center gap-4">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                      <Car size={32} />
                    </div>
                    <div>
                      <h5 className="text-2xl font-black text-slate-900">{selectedCustomer.totalPurchased}</h5>
                      <p className="text-[10px] font-black text-slate-400 uppercase">Xe đã bàn giao</p>
                    </div>
                </div>
                
                <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center gap-4">
                    <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center">
                      <FileText size={32} />
                    </div>
                    <div>
                      <h5 className="text-2xl font-black text-slate-900">{selectedCustomer.totalContracts}</h5>
                      <p className="text-[10px] font-black text-slate-400 uppercase">Hợp đồng đang chạy</p>
                    </div>
                </div>
              </div>
            )}

            {/* Sub-tab: Contracts */}
            {activeTab === 'contracts' && (
              <div className="space-y-4 animate-in slide-in-from-bottom-4">
                 {customerContracts.map(sc => (
                   <div key={sc.id} className="bg-white p-6 rounded-3xl border border-slate-200 flex justify-between items-center hover:border-blue-300 transition-all cursor-pointer">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center">
                            <FileText size={24} />
                         </div>
                         <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase">{sc.contractCode}</p>
                            <h5 className="font-black text-slate-900">Hợp đồng Mua bán xe</h5>
                            <p className="text-xs text-slate-500 font-medium">{sc.signedDate}</p>
                         </div>
                      </div>
                      <div className="text-right">
                         <p className="text-sm font-black text-slate-900">{formatVND(sc.totalAmount)}</p>
                         <span className="text-[10px] font-bold text-blue-600 uppercase">Đang thanh toán</span>
                      </div>
                      <ChevronRight size={18} className="text-slate-300" />
                   </div>
                 ))}
                 {customerContracts.length === 0 && (
                    <div className="py-20 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-[40px]">
                       <p className="text-sm font-bold text-slate-400">Chưa có hợp đồng nào phát sinh</p>
                    </div>
                 )}
              </div>
            )}

            {/* Sub-tab: Payments */}
            {activeTab === 'payments' && (
              <div className="bg-white rounded-[40px] border border-slate-200 overflow-hidden shadow-sm animate-in slide-in-from-bottom-4">
                 <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Ngày & Mã phiếu</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Nội dung</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase text-right">Số tiền</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase text-center">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                       {customerPayments.map(p => (
                         <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                               <p className="text-xs font-bold text-slate-900">{p.date}</p>
                               <p className="text-[9px] font-mono text-slate-400 uppercase">#{p.id}</p>
                            </td>
                            <td className="px-6 py-4 text-xs font-medium text-slate-600 truncate max-w-[200px]">
                               {p.description}
                            </td>
                            <td className="px-6 py-4 text-right">
                               <p className="text-sm font-black text-emerald-600">{formatVND(p.amount)}</p>
                            </td>
                            <td className="px-6 py-4 text-center">
                               <CheckCircle2 size={16} className="text-emerald-500 mx-auto" />
                            </td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Quick CRM Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Tổng khách hàng', value: MOCK_CUSTOMERS.length, color: 'text-slate-900', icon: <Users size={16} className="text-slate-400" /> },
          { label: 'Khách tiềm năng', value: 12, color: 'text-blue-600', icon: <UserCircle size={16} className="text-blue-400" /> },
          { label: 'Khách thân thiết', value: 5, color: 'text-indigo-600', icon: <BadgeCheck size={16} className="text-indigo-400" /> },
          { label: 'Công nợ quá hạn', value: '1.2 tỷ', color: 'text-rose-600', icon: <AlertCircle size={16} className="text-rose-400" /> },
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

      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-slate-200">
        <div className="relative flex-1 w-full max-md:max-w-none max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Tìm theo tên, số điện thoại, mã khách..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold focus:ring-4 focus:ring-blue-500/10 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex gap-3">
          <Link
            href="/crm/new"
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-black text-sm shadow-lg shadow-blue-200 transition-all"
          >
            <Plus size={18} /> Thêm khách hàng
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Khách hàng</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Phân loại</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Trạng thái</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Tổng chi tiêu</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Hợp đồng</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredCustomers.map((c) => {
              const status = getStatusBadge(c.status);
              return (
                <tr key={c.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer group" onClick={() => setSelectedCustomer(c)}>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-lg group-hover:scale-110 transition-transform">
                        {c.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 leading-none">{c.name}</h4>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-2 font-bold">
                           <Phone size={10} /> {c.phone}
                           <span className="text-slate-300">•</span>
                           <span className="font-mono text-slate-400">{c.code}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-tight ${c.type === CustomerType.INDIVIDUAL ? 'text-blue-600 bg-blue-50' : 'text-indigo-600 bg-indigo-50'}`}>
                       {c.type === CustomerType.INDIVIDUAL ? 'Cá nhân' : 'Doanh nghiệp'}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-black ${status.color}`}>
                      {status.icon} {status.label}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <p className="text-sm font-black text-slate-900">{formatVND(c.totalRevenue)}</p>
                    {c.debt > 0 && <p className="text-[10px] text-rose-500 font-bold uppercase tracking-tighter">Nợ: {formatVND(c.debt)}</p>}
                  </td>
                  <td className="px-6 py-5 text-center">
                     <span className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-xs font-bold text-slate-600">
                       {c.totalContracts}
                     </span>
                  </td>
                  <td className="px-6 py-5">
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
