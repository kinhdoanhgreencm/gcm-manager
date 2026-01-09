'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Save, User, Phone, Mail, 
  Calendar, ShieldCheck, Briefcase, 
  Building2, Lock, Eye, EyeOff,
  CheckCircle2, Info, LayoutDashboard,
  ShieldAlert, Settings, FileText, Wallet, ArrowLeft
} from 'lucide-react';
import { StaffRole, StaffStatus, StaffPermissions } from '@/types';

export const StaffFormPage: React.FC = () => {
  const router = useRouter();
  
  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const [formData, setFormData] = useState<Partial<any>>({
    name: '',
    phone: '',
    email: '',
    role: StaffRole.SALES,
    branch: 'GCM-Tổng',
    status: StaffStatus.ACTIVE,
    joinDate: new Date().toISOString().split('T')[0],
    username: '',
    permissions: {
      canManageContract: false,
      canApproveFinance: false,
      canViewReports: false,
      canManageInventory: false,
      canManageStaff: false
    }
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const togglePermission = (key: keyof StaffPermissions) => {
    if (!formData.permissions) return;
    setFormData({
      ...formData,
      permissions: {
        ...formData.permissions,
        [key]: !formData.permissions[key]
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.phone || !formData.email || !formData.username) {
      setSubmitError('Vui lòng nhập đầy đủ thông tin bắt buộc');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // TODO: Save to Supabase
      const staffData = {
        ...formData,
        id: 'staff_' + Math.random().toString(36).substr(2, 9),
        code: 'NV-' + Math.floor(100 + Math.random() * 900)
      };

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Success - redirect to staff page
      router.push('/staff');
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
               <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-tighter">Staff Management</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900">Thêm nhân sự mới</h2>
            <p className="text-xs text-slate-500 font-medium">Khai báo thông tin hồ sơ và cấu hình quyền hạn hệ thống</p>
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            
            {/* Left Column: Personal & Job Info */}
            <div className="space-y-10">
              <section className="space-y-6">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <User size={18} className="text-blue-600" /> A. Thông tin cá nhân
                </h3>
                <div className="grid grid-cols-1 gap-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Họ và tên *</label>
                      <input 
                        required
                        type="text" 
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                      />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Số điện thoại *</label>
                        <input 
                          required
                          type="tel" 
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none"
                          value={formData.phone}
                          onChange={e => setFormData({...formData, phone: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email *</label>
                        <input 
                          required
                          type="email" 
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none"
                          value={formData.email}
                          onChange={e => setFormData({...formData, email: e.target.value})}
                        />
                      </div>
                   </div>
                </div>
              </section>

              <section className="space-y-6">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <Briefcase size={18} className="text-indigo-600" /> B. Thông tin công việc
                </h3>
                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vai trò công việc</label>
                      <select 
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none"
                        value={formData.role}
                        onChange={e => setFormData({...formData, role: e.target.value as StaffRole})}
                      >
                        <option value={StaffRole.MANAGER}>Quản lý / Chủ đại lý</option>
                        <option value={StaffRole.SALES}>Nhân viên Sale</option>
                        <option value={StaffRole.ACCOUNTANT}>Kế toán</option>
                        <option value={StaffRole.INVENTORY}>Nhân viên Kho</option>
                        <option value={StaffRole.LEGAL}>Nhân viên Hồ sơ</option>
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chi nhánh</label>
                      <input 
                        readOnly
                        type="text" 
                        className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-2xl text-sm font-bold text-slate-500"
                        value={formData.branch}
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngày vào làm</label>
                      <input 
                        type="date" 
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none"
                        value={formData.joinDate}
                        onChange={e => setFormData({...formData, joinDate: e.target.value})}
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trạng thái</label>
                      <div className="flex bg-slate-100 p-1 rounded-2xl">
                        <button 
                          type="button"
                          onClick={() => setFormData({...formData, status: StaffStatus.ACTIVE})}
                          className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${formData.status === StaffStatus.ACTIVE ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}
                        >Đang làm</button>
                        <button 
                          type="button"
                          onClick={() => setFormData({...formData, status: StaffStatus.INACTIVE})}
                          className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${formData.status === StaffStatus.INACTIVE ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400'}`}
                        >Đã nghỉ</button>
                      </div>
                   </div>
                </div>
              </section>
            </div>

            {/* Right Column: Security & Permissions */}
            <div className="space-y-10">
              <section className="space-y-6">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <Lock size={18} className="text-rose-600" /> C. Tài khoản hệ thống
                </h3>
                <div className="p-8 bg-slate-900 rounded-[32px] space-y-6 shadow-xl">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Tên đăng nhập *</label>
                      <input 
                        required
                        type="text" 
                        className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-2xl text-sm font-bold text-white outline-none focus:bg-white/20 transition-all"
                        value={formData.username}
                        onChange={e => setFormData({...formData, username: e.target.value})}
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Mật khẩu khởi tạo</label>
                      <div className="relative">
                        <input 
                          type={showPassword ? "text" : "password"}
                          className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-2xl text-sm font-bold text-white outline-none"
                          placeholder="••••••••"
                        />
                        <button 
                          type="button" 
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                   </div>
                </div>
              </section>

              <section className="space-y-6">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <ShieldCheck size={18} className="text-emerald-600" /> D. Phân quyền nghiệp vụ
                </h3>
                <div className="grid grid-cols-1 gap-3">
                   {([
                     { key: 'canManageContract' as keyof StaffPermissions, label: 'Quản lý hợp đồng (Tạo/Sửa)', icon: <FileText size={16} /> },
                     { key: 'canApproveFinance' as keyof StaffPermissions, label: 'Duyệt thu chi & Tài chính', icon: <Wallet size={16} /> },
                     { key: 'canViewReports' as keyof StaffPermissions, label: 'Xem báo cáo doanh nghiệp', icon: <LayoutDashboard size={16} /> },
                     { key: 'canManageInventory' as keyof StaffPermissions, label: 'Quản lý kho xe', icon: <Settings size={16} /> },
                     { key: 'canManageStaff' as keyof StaffPermissions, label: 'Quản trị nhân sự', icon: <ShieldAlert size={16} /> },
                   ] as const).map(item => (
                     <button
                        key={item.key}
                        type="button"
                        onClick={() => togglePermission(item.key)}
                        className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                          formData.permissions?.[item.key] 
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                            : 'bg-white border-slate-200 text-slate-500'
                        }`}
                     >
                        <div className="flex items-center gap-3">
                           {item.icon}
                           <span className="text-xs font-bold">{item.label}</span>
                        </div>
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                          formData.permissions?.[item.key]
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'bg-white border-slate-300'
                        }`}>
                           {formData.permissions?.[item.key] && <CheckCircle2 size={14} />}
                        </div>
                     </button>
                   ))}
                </div>
              </section>
            </div>
          </div>
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
                  <Save size={18} /> Lưu hồ sơ nhân sự
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

