'use client'

import React, { useState } from 'react';
import { 
  X, Save, User, Phone, Mail, MapPin, 
  Hash, Building2, UserCircle, Briefcase, 
  Target, Info, ShieldCheck, FileText,
  Smartphone, Globe, Users
} from 'lucide-react';
import { CustomerType, CustomerStatus } from '@/types';

interface CustomerFormProps {
  onClose: () => void;
  onSave: (data: any) => void;
}

export const CustomerForm: React.FC<CustomerFormProps> = ({ onClose, onSave }) => {
  const [formData, setFormData] = useState({
    type: CustomerType.INDIVIDUAL,
    name: '',
    phone: '',
    email: '',
    address: '',
    idCard: '',
    taxCode: '',
    companyName: '',
    representative: '',
    position: '',
    source: 'Quảng cáo Facebook',
    assignedStaffId: 'staff_sale_1',
    notes: ''
  });

  const isCorporate = formData.type === CustomerType.CORPORATE;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      id: 'cust_' + Math.random().toString(36).substr(2, 9),
      code: 'KH-' + Math.floor(1000 + Math.random() * 9000),
      status: CustomerStatus.PROSPECT,
      createdAt: new Date().toISOString(),
      totalContracts: 0,
      totalPurchased: 0,
      totalRevenue: 0,
      debt: 0
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[150] flex items-center justify-center p-4">
      <form 
        onSubmit={handleSubmit}
        className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-300"
      >
        {/* Header */}
        <div className="px-10 py-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div>
            <div className="flex items-center gap-3 mb-1">
               <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-tighter">CRM Database</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900">Khai báo thông tin khách hàng</h2>
            <p className="text-xs text-slate-500 font-medium">Lưu trữ thông tin liên hệ và lịch sử giao dịch khách hàng</p>
          </div>
          <button type="button" onClick={onClose} className="p-3 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-10 space-y-10">
          
          <section className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
               <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                 <User size={18} />
               </div>
               <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">1. Phân loại & Liên hệ</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đối tượng khách hàng</label>
                <div className="flex bg-slate-100 p-1 rounded-2xl">
                  <button 
                    type="button"
                    onClick={() => setFormData({...formData, type: CustomerType.INDIVIDUAL})}
                    className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${!isCorporate ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
                  >Cá nhân</button>
                  <button 
                    type="button"
                    onClick={() => setFormData({...formData, type: CustomerType.CORPORATE})}
                    className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${isCorporate ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                  >Doanh nghiệp</button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tên khách hàng / Đơn vị *</label>
                <input 
                  required
                  type="text" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Số điện thoại *</label>
                <div className="relative">
                  <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    required
                    type="tel" 
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hòm thư điện tử (Email)</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="email" 
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Địa chỉ đăng ký</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none"
                    value={formData.address}
                    onChange={e => setFormData({...formData, address: e.target.value})}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
               <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
                 <ShieldCheck size={18} />
               </div>
               <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">2. Thông tin pháp lý & Phụ trách</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-8 rounded-[32px] border border-slate-100">
              {isCorporate ? (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mã số thuế *</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-mono font-black tracking-tight"
                      value={formData.taxCode}
                      onChange={e => setFormData({...formData, taxCode: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Người đại diện pháp luật</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold"
                      value={formData.representative}
                      onChange={e => setFormData({...formData, representative: e.target.value})}
                    />
                  </div>
                </>
              ) : (
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Số CCCD / Hộ chiếu *</label>
                  <div className="relative">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      required
                      type="text" 
                      className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-mono font-black"
                      value={formData.idCard}
                      onChange={e => setFormData({...formData, idCard: e.target.value})}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nguồn khách hàng</label>
                <select 
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none"
                  value={formData.source}
                  onChange={e => setFormData({...formData, source: e.target.value})}
                >
                  <option value="Quảng cáo Facebook">Facebook Ads</option>
                  <option value="Khách tự đến">Khách tự đến</option>
                  <option value="Người quen giới thiệu">Người giới thiệu</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">NV Sales phụ trách</label>
                <select 
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none"
                  value={formData.assignedStaffId}
                  onChange={e => setFormData({...formData, assignedStaffId: e.target.value})}
                >
                  <option value="staff_sale_1">Nguyễn Thị Sale 1</option>
                  <option value="staff_admin">Quản lý trực tiếp</option>
                </select>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-10 py-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-4 sticky bottom-0">
          <button type="button" onClick={onClose} className="px-8 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-100 shadow-sm transition-all">Hủy</button>
          <button type="submit" className="flex items-center gap-2 px-12 py-3 bg-blue-600 text-white rounded-2xl text-sm font-black hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all">
            <Save size={18} /> Xác nhận lưu khách hàng
          </button>
        </div>
      </form>
    </div>
  );
};
