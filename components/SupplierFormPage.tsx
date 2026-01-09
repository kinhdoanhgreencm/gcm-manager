'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Save, Truck, Building2, User, Phone, 
  Mail, MapPin, Hash, Landmark, CreditCard, 
  Clock, Info, ShieldCheck, Briefcase, FileText, ArrowLeft
} from 'lucide-react';
import { SupplierType, SupplierStatus } from '@/types';

export const SupplierFormPage: React.FC = () => {
  const router = useRouter();
  
  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const [formData, setFormData] = useState({
    type: SupplierType.OEM,
    name: '',
    phone: '',
    email: '',
    address: '',
    taxCode: '',
    idCard: '',
    companyName: '',
    representative: '',
    position: '',
    bankName: '',
    bankAccount: '',
    paymentTerms: 'DEFERRED' as 'IMMEDIATE' | 'DEFERRED',
    assignedStaffId: 'staff_admin',
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isCorporate = formData.type !== SupplierType.INDIVIDUAL;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      setSubmitError('Vui lòng nhập tên nhà cung cấp');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // TODO: Save to Supabase
      const supplierData = {
        ...formData,
        id: 'sup_' + Math.random().toString(36).substr(2, 9),
        code: 'NCC-' + Math.floor(1000 + Math.random() * 9000),
        status: SupplierStatus.ACTIVE,
        createdAt: new Date().toISOString(),
        totalVehicles: 0,
        totalImportValue: 0,
        debt: 0
      };

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Success - redirect to suppliers page
      router.push('/suppliers');
    } catch (error: any) {
      console.error('Submit error:', error);
      setSubmitError(error.message || 'Có lỗi xảy ra khi lưu dữ liệu. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-3 hover:bg-slate-100 rounded-2xl transition-colors text-slate-400 hover:text-slate-900"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
               <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-tighter">Supplier Management</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900">Thiết lập Nhà cung cấp mới</h2>
            <p className="text-xs text-slate-500 font-medium">Khai báo nguồn nhập xe và thông tin đối soát tài chính</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form 
        onSubmit={handleSubmit}
        className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden"
      >
        {/* Scrollable Content */}
        <div className="p-10 space-y-12">
          {/* A. Thông tin cơ bản */}
          <section className="space-y-6">
            <div className="flex items-center gap-2">
               <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                 <Truck size={18} />
               </div>
               <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">A. Thông tin cơ bản</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loại nhà cung cấp</label>
                <select 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10"
                  value={formData.type}
                  onChange={e => setFormData({...formData, type: e.target.value as SupplierType})}
                >
                  <option value={SupplierType.OEM}>Hãng / Nhà phân phối chính hãng</option>
                  <option value={SupplierType.DEALER}>Đại lý trung gian</option>
                  <option value={SupplierType.INDIVIDUAL}>Cá nhân ký gửi xe</option>
                  <option value={SupplierType.AUCTION}>Nguồn đấu giá / Khác</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tên hiển thị NCC *</label>
                <input 
                  required
                  type="text" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10"
                  placeholder="VD: Toyota Long Biên"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Số điện thoại</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</label>
                <input 
                  type="email" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Địa chỉ trụ sở</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10"
                  value={formData.address}
                  onChange={e => setFormData({...formData, address: e.target.value})}
                />
              </div>
            </div>
          </section>

          {/* B. Thông tin pháp lý */}
          <section className="space-y-6">
            <div className="flex items-center gap-2">
               <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
                 <ShieldCheck size={18} />
               </div>
               <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">B. Thông tin pháp lý</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-8 rounded-[32px] border border-slate-100">
              {isCorporate ? (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mã số thuế doanh nghiệp *</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-mono font-bold"
                      value={formData.taxCode}
                      onChange={e => setFormData({...formData, taxCode: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tên công ty (Theo GPKD)</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold"
                      value={formData.companyName}
                      onChange={e => setFormData({...formData, companyName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Người đại diện</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold"
                      value={formData.representative}
                      onChange={e => setFormData({...formData, representative: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chức vụ</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold"
                      value={formData.position}
                      onChange={e => setFormData({...formData, position: e.target.value})}
                    />
                  </div>
                </>
              ) : (
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Số CCCD / Hộ chiếu *</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-mono font-bold"
                    value={formData.idCard}
                    onChange={e => setFormData({...formData, idCard: e.target.value})}
                  />
                </div>
              )}
            </div>
          </section>

          {/* C. Thông tin thanh toán */}
          <section className="space-y-6">
            <div className="flex items-center gap-2">
               <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                 <CreditCard size={18} />
               </div>
               <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">C. Thông tin thanh toán</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Điều khoản thanh toán</label>
                <div className="flex bg-slate-100 p-1 rounded-2xl">
                  <button 
                    type="button"
                    onClick={() => setFormData({...formData, paymentTerms: 'IMMEDIATE'})}
                    className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${formData.paymentTerms === 'IMMEDIATE' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}
                  >Trả ngay</button>
                  <button 
                    type="button"
                    onClick={() => setFormData({...formData, paymentTerms: 'DEFERRED'})}
                    className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${formData.paymentTerms === 'DEFERRED' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
                  >Trả chậm (Công nợ)</button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngân hàng</label>
                <div className="relative">
                  <Landmark className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                  <input 
                    type="text" 
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10"
                    placeholder="Tên ngân hàng"
                    value={formData.bankName}
                    onChange={e => setFormData({...formData, bankName: e.target.value})}
                  />
                </div>
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Số tài khoản hưởng thụ</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-mono font-bold"
                  value={formData.bankAccount}
                  onChange={e => setFormData({...formData, bankAccount: e.target.value})}
                />
              </div>
            </div>
          </section>

          {/* D. Thông tin bổ sung */}
          <section className="space-y-6">
            <div className="flex items-center gap-2">
               <div className="w-8 h-8 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center">
                 <Briefcase size={18} />
               </div>
               <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">D. Thông tin bổ sung</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nhân viên phụ trách đối tác</label>
                <select 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none"
                  value={formData.assignedStaffId}
                  onChange={e => setFormData({...formData, assignedStaffId: e.target.value})}
                >
                  <option value="staff_admin">Quản lý kho</option>
                  <option value="staff_sale_1">Trưởng phòng kinh doanh</option>
                  <option value="staff_accountant">Kế toán thanh toán</option>
                </select>
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ghi chú nội bộ</label>
                <textarea 
                  rows={3}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-3xl text-sm font-medium outline-none"
                  value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                />
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-10 py-8 bg-slate-50 border-t border-slate-100 space-y-4">
          {/* Error Message */}
          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
              <Info className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
              <div className="flex-1">
                <p className="text-sm font-bold text-red-900">Lỗi khi lưu dữ liệu</p>
                <p className="text-xs text-red-700 mt-1">{submitError}</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-4">
            <button 
              type="button" 
              onClick={() => router.back()}
              disabled={isSubmitting}
              className="px-8 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Hủy
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="flex items-center gap-2 px-12 py-3 bg-blue-600 text-white rounded-2xl text-sm font-black hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Đang lưu...
                </>
              ) : (
                <>
                  <Save size={18} /> Lưu thông tin đối tác
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

