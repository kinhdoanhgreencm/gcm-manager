'use client'

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Plus, Search, Filter, UserCheck, 
  MoreVertical, ChevronRight, Phone, 
  Mail, Briefcase, Calendar, 
  TrendingUp, FileText, CheckCircle2,
  Users, BarChart3, Activity, Info,
  Building2, ArrowLeft, ArrowUpRight
} from 'lucide-react';
import { MOCK_STAFF, MOCK_SALES_CONTRACTS, MOCK_CUSTOMERS } from '@/constants';
import { Staff, StaffRole, StaffStatus } from '@/types';

export const StaffManagement: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'activities' | 'performance'>('overview');

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const getRoleBadge = (role: StaffRole) => {
    switch(role) {
      case StaffRole.MANAGER: return { label: 'Quản lý', class: 'bg-rose-100 text-rose-700' };
      case StaffRole.SALES: return { label: 'Kinh doanh', class: 'bg-blue-100 text-blue-700' };
      case StaffRole.ACCOUNTANT: return { label: 'Kế toán', class: 'bg-indigo-100 text-indigo-700' };
      case StaffRole.INVENTORY: return { label: 'Kho xe', class: 'bg-amber-100 text-amber-700' };
      default: return { label: 'Hồ sơ', class: 'bg-slate-100 text-slate-700' };
    }
  };

  const filteredStaff = MOCK_STAFF.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.code.includes(search)
  );

  if (selectedStaff) {
    const staffContracts = MOCK_SALES_CONTRACTS.filter(c => c.customerName.includes('')); // Trong thực tế filter theo staffId
    const staffCustomers = MOCK_CUSTOMERS.filter(c => c.assignedStaffId === selectedStaff.id);

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <button 
          onClick={() => setSelectedStaff(null)}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold text-sm transition-colors"
        >
          <ArrowLeft size={18} /> Quay lại danh sách
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Staff Header Card */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-[40px] border border-slate-200 p-8 shadow-sm text-center">
              <div className="w-24 h-24 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-3xl font-black mb-4 mx-auto ring-8 ring-blue-50">
                {selectedStaff.name.charAt(0)}
              </div>
              <h3 className="text-xl font-black text-slate-900">{selectedStaff.name}</h3>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">{selectedStaff.code}</p>
              
              <div className="mt-6 inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 text-blue-700 rounded-full text-[10px] font-black uppercase tracking-tighter">
                {getRoleBadge(selectedStaff.role).label}
              </div>

              <div className="mt-8 pt-8 border-t border-slate-50 space-y-4 text-left">
                 <div className="flex items-center gap-3">
                   <Phone size={16} className="text-slate-400" />
                   <span className="text-sm font-bold text-slate-900">{selectedStaff.phone}</span>
                 </div>
                 <div className="flex items-center gap-3">
                   <Mail size={16} className="text-slate-400" />
                   <span className="text-sm font-bold text-slate-900 truncate">{selectedStaff.email}</span>
                 </div>
                 <div className="flex items-center gap-3">
                   <Calendar size={16} className="text-slate-400" />
                   <span className="text-sm font-bold text-slate-900">Vào làm: {selectedStaff.joinDate}</span>
                 </div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-[32px] p-6 text-white overflow-hidden relative">
               <div className="relative z-10">
                  <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1">Hiệu suất bán hàng</p>
                  <h4 className="text-2xl font-black text-emerald-400">{formatVND(selectedStaff.totalRevenue || 0)}</h4>
                  <div className="mt-4 pt-4 border-t border-white/10">
                     <div className="flex justify-between items-center text-xs">
                        <span className="text-white/60">Số hợp đồng</span>
                        <span className="font-bold">{selectedStaff.totalContracts || 0}</span>
                     </div>
                  </div>
               </div>
               <BarChart3 className="absolute -bottom-4 -right-4 text-white/5" size={100} />
            </div>
          </div>

          {/* Details Content */}
          <div className="lg:col-span-3 space-y-6">
            <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 w-fit">
              {[
                { id: 'overview', label: 'Hồ sơ chuyên môn', icon: <UserCheck size={16} /> },
                { id: 'activities', label: 'Hoạt động nghiệp vụ', icon: <Activity size={16} /> },
                { id: 'performance', label: 'Báo cáo hiệu suất', icon: <TrendingUp size={16} /> },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all ${
                    activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'overview' && (
              <div className="space-y-6 animate-in slide-in-from-bottom-4">
                 <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Quyền hạn hệ thống</h4>
                       <div className="grid grid-cols-1 gap-3">
                          {Object.entries(selectedStaff.permissions).map(([key, val]) => (
                            <div key={key} className={`flex items-center gap-3 p-3 rounded-xl border ${val ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-slate-50 border-slate-100 text-slate-400 opacity-50'}`}>
                               <CheckCircle2 size={16} />
                               <span className="text-xs font-bold">{key.replace('can', 'Quyền ')}</span>
                            </div>
                          ))}
                       </div>
                    </div>
                    <div className="space-y-6">
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Tài khoản & Phụ trách</h4>
                       <div className="space-y-4">
                          <div>
                             <p className="text-[10px] font-bold text-slate-400 uppercase">Tên đăng nhập</p>
                             <p className="text-sm font-black text-slate-900">{selectedStaff.username}</p>
                          </div>
                          <div>
                             <p className="text-[10px] font-bold text-slate-400 uppercase">Người quản lý</p>
                             <p className="text-sm font-bold text-blue-600">Trần Văn Quản Lý</p>
                          </div>
                          <div>
                             <p className="text-[10px] font-bold text-slate-400 uppercase">Ghi chú nhân sự</p>
                             <p className="text-xs italic text-slate-500 leading-relaxed">Nhân viên xuất sắc tháng 01/2024. Có khả năng chốt hợp đồng xe điện tốt.</p>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
            )}

            {activeTab === 'activities' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-4">
                 <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                       <h4 className="text-xs font-black text-slate-900 uppercase">Khách hàng phụ trách</h4>
                       <span className="text-xs font-bold text-blue-600">{staffCustomers.length} KH</span>
                    </div>
                    <div className="space-y-4">
                       {staffCustomers.map(c => (
                         <div key={c.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl hover:bg-blue-50 transition-colors cursor-pointer">
                            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm">
                               {c.name.charAt(0)}
                            </div>
                            <div className="flex-1">
                               <p className="text-xs font-black text-slate-900">{c.name}</p>
                               <p className="text-[10px] text-slate-500">{c.phone}</p>
                            </div>
                            <ChevronRight size={14} className="text-slate-300" />
                         </div>
                       ))}
                    </div>
                 </div>
                 
                 <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                       <h4 className="text-xs font-black text-slate-900 uppercase">Giao dịch thực hiện gần đây</h4>
                    </div>
                    <div className="space-y-4">
                       <div className="p-4 border-l-4 border-emerald-500 bg-emerald-50 rounded-r-2xl">
                          <p className="text-[10px] font-black text-emerald-600 uppercase">Phiếu thu tiền cọc</p>
                          <p className="text-xs font-bold text-slate-900 mt-1">Hợp đồng #HDMB-001</p>
                          <p className="text-[9px] text-slate-500 mt-0.5">Thời gian: 15/05/2024 14:30</p>
                       </div>
                       <div className="p-4 border-l-4 border-blue-500 bg-blue-50 rounded-r-2xl">
                          <p className="text-[10px] font-black text-blue-600 uppercase">Cập nhật hồ sơ xe</p>
                          <p className="text-xs font-bold text-slate-900 mt-1">VIN: VN123456789</p>
                          <p className="text-[9px] text-slate-500 mt-0.5">Thời gian: 15/05/2024 10:15</p>
                       </div>
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
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Tổng nhân sự', value: MOCK_STAFF.length, color: 'text-slate-900', icon: <Users size={16} /> },
          { label: 'Đang làm việc', value: MOCK_STAFF.filter(s => s.status === StaffStatus.ACTIVE).length, color: 'text-emerald-600', icon: <UserCheck size={16} /> },
          { label: 'Đội ngũ Sales', value: MOCK_STAFF.filter(s => s.role === StaffRole.SALES).length, color: 'text-blue-600', icon: <TrendingUp size={16} /> },
          { label: 'Hệ thống Admin', value: 1, color: 'text-rose-600', icon: <Info size={16} /> },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-xl ${stat.color.replace('text', 'bg').replace('600', '50')} ${stat.color}`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-slate-200">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Tìm theo tên, mã nhân viên..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold focus:ring-4 focus:ring-blue-500/10 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Link
          href="/staff/new"
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-black text-sm shadow-lg shadow-blue-200 transition-all"
        >
          <Plus size={18} /> Thêm nhân sự
        </Link>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <tr>
              <th className="px-6 py-4">Hồ sơ nhân viên</th>
              <th className="px-6 py-4">Vai trò</th>
              <th className="px-6 py-4">Chi nhánh</th>
              <th className="px-6 py-4 text-center">Trạng thái</th>
              <th className="px-6 py-4 text-right">Hiệu suất (Sales)</th>
              <th className="px-6 py-4">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredStaff.map((s) => {
              const roleInfo = getRoleBadge(s.role);
              return (
                <tr key={s.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer group" onClick={() => setSelectedStaff(s)}>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center font-black text-lg group-hover:bg-blue-600 group-hover:text-white transition-all">
                        {s.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 leading-none">{s.name}</h4>
                        <p className="text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-tighter">
                          {s.code} <span className="text-slate-300 mx-1">•</span> {s.phone}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight ${roleInfo.class}`}>
                      {roleInfo.label}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                       <Building2 size={14} className="text-slate-400" /> {s.branch}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black ${
                      s.status === StaffStatus.ACTIVE ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                    }`}>
                       <div className={`w-1.5 h-1.5 rounded-full ${s.status === StaffStatus.ACTIVE ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                       {s.status === StaffStatus.ACTIVE ? 'ĐANG LÀM' : 'ĐÃ NGHỈ'}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    {s.role === StaffRole.SALES ? (
                      <div>
                         <p className="text-sm font-black text-slate-900">{formatVND(s.totalRevenue || 0)}</p>
                         <p className="text-[9px] font-bold text-slate-400 uppercase">{s.totalContracts || 0} Hợp đồng</p>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-300 font-bold uppercase">N/A</span>
                    )}
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
