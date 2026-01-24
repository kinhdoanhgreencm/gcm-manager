'use client'

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  Save, Package, Phone, Mail, MapPin, 
  Info, FileText, ArrowLeft, Building2,
  Hash, Loader2, AlertCircle, CheckCircle2,
  User, Clock, Calendar
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export const CarrierEditPage: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const carrierId = params.id as string;

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    contactPerson: '',
    notes: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [carrierHistory, setCarrierHistory] = useState<{
    createdBy?: { full_name: string; email?: string };
    updatedBy?: { full_name: string; email?: string };
    created_at?: string;
    updated_at?: string;
  } | null>(null);

  // Load carrier data
  useEffect(() => {
    const loadCarrier = async () => {
      if (!carrierId) return;
      
      try {
        setLoading(true);
        const response = await fetch(`/api/carriers/${carrierId}`, { cache: 'no-store' });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.error || 'Lỗi tải dữ liệu');
        }

        const data = result?.carrier;
        if (data) {
          setFormData({
            name: data.name || '',
            phone: data.phone || '',
            email: data.email || '',
            address: data.address || '',
            contactPerson: data.contact_person || '',
            notes: data.notes || '',
            status: (data.status || 'ACTIVE') as 'ACTIVE' | 'INACTIVE'
          });

          const historyData: any = {
            created_at: data.created_at,
            updated_at: data.updated_at
          };

          const usersMap = result?.users || {};
          if (data.created_by && usersMap[data.created_by]) {
            historyData.createdBy = usersMap[data.created_by];
          }
          if (data.updated_by && usersMap[data.updated_by]) {
            historyData.updatedBy = usersMap[data.updated_by];
          }

          setCarrierHistory(historyData);
        }
      } catch (error: any) {
        console.error('Error loading carrier:', error);
        setSubmitError(`Lỗi tải dữ liệu: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    loadCarrier();
  }, [carrierId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation - All fields are required
    if (!formData.name || !formData.phone || !formData.email || !formData.contactPerson || !formData.address) {
      setSubmitError('Vui lòng nhập đầy đủ thông tin bắt buộc');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Prepare carrier data in database format (snake_case)
      const carrierData: any = {
        name: formData.name,
        phone: formData.phone || null,
        email: formData.email || null,
        address: formData.address || null,
        contact_person: formData.contactPerson || null,
        status: formData.status,
        notes: formData.notes || null,
        updated_by: user?.id || null,
        updated_at: new Date().toISOString()
      };

      // Update carrier in Supabase
      const response = await fetch(`/api/carriers/${carrierId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ carrier: carrierData })
      });
      const result = await response.json();

      if (!response.ok) {
        console.error('Error updating carrier:', result?.error || 'Unknown error');
        throw new Error(result?.error || 'Lỗi cập nhật dữ liệu đơn vị vận chuyển');
      }

      // Success - redirect to carriers page
      router.push('/carriers');
    } catch (error: any) {
      console.error('Submit error:', error);
      setSubmitError(error.message || 'Có lỗi xảy ra khi cập nhật dữ liệu. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-[#00d26a] animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-600">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-slate-100 rounded-2xl transition-colors"
        >
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <div>
          <h2 className="text-2xl font-black text-slate-900">Sửa đơn vị vận chuyển</h2>
          <p className="text-xs text-slate-500 font-medium">Cập nhật thông tin đơn vị vận chuyển</p>
        </div>
      </div>

      {/* Error Message */}
      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-bold text-red-900">{submitError}</p>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
        {/* Form Sections */}
        <div className="p-10 space-y-10">
          {/* Section 1: Thông tin liên hệ */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="p-2 bg-emerald-100 rounded-xl">
                <Phone size={18} className="text-emerald-600" />
              </div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">1. Thông tin liên hệ</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tên đơn vị vận chuyển */}
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Tên đơn vị vận chuyển *
                </label>
                <div className="relative">
                  <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nhập tên đơn vị vận chuyển"
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-medium focus:ring-2 focus:ring-[#00d26a]/20 focus:border-[#00d26a]/30 transition-all"
                  />
                </div>
              </div>

              {/* Số điện thoại */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Số điện thoại *
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    required
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Nhập số điện thoại"
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-medium focus:ring-2 focus:ring-[#00d26a]/20 focus:border-[#00d26a]/30 transition-all"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Nhập email"
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-medium focus:ring-2 focus:ring-[#00d26a]/20 focus:border-[#00d26a]/30 transition-all"
                  />
                </div>
              </div>

              {/* Người liên hệ */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Người liên hệ *
                </label>
                <div className="relative">
                  <Info className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    required
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    placeholder="Nhập tên người liên hệ"
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-medium focus:ring-2 focus:ring-[#00d26a]/20 focus:border-[#00d26a]/30 transition-all"
                  />
                </div>
              </div>

              {/* Địa chỉ */}
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Địa chỉ *
                </label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-4 text-slate-400" size={18} />
                  <textarea
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Nhập địa chỉ"
                    rows={3}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-medium focus:ring-2 focus:ring-[#00d26a]/20 focus:border-[#00d26a]/30 transition-all resize-none"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Thông tin bổ sung */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="p-2 bg-amber-100 rounded-xl">
                <Info size={18} className="text-amber-600" />
              </div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">2. Thông tin bổ sung</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Trạng thái */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Trạng thái
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'ACTIVE' | 'INACTIVE' })}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-medium focus:ring-2 focus:ring-[#00d26a]/20 focus:border-[#00d26a]/30 transition-all"
                >
                  <option value="ACTIVE">Hoạt động</option>
                  <option value="INACTIVE">Dừng hoạt động</option>
                </select>
              </div>

              {/* Ghi chú */}
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Ghi chú
                </label>
                <div className="relative">
                  <FileText className="absolute left-4 top-4 text-slate-400" size={18} />
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Nhập ghi chú (nếu có)"
                    rows={4}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-medium focus:ring-2 focus:ring-[#00d26a]/20 focus:border-[#00d26a]/30 transition-all resize-none"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: Thông tin người nhập và lịch sử cập nhật */}
          {carrierHistory && (
            <section className="space-y-6 pt-6 border-t border-slate-200">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <div className="p-2 bg-blue-100 rounded-xl">
                  <Clock size={18} className="text-blue-600" />
                </div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">3. Thông tin người nhập và lịch sử cập nhật</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Người tạo */}
                {carrierHistory.createdBy && (
                  <div className="p-5 border border-slate-200 rounded-2xl bg-white shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <User size={16} className="text-slate-400" />
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Người tạo</p>
                    </div>
                    <p className="text-sm font-black text-slate-900">{carrierHistory.createdBy.full_name}</p>
                    {carrierHistory.createdBy.email && (
                      <p className="text-xs text-slate-500 mt-0.5">{carrierHistory.createdBy.email}</p>
                    )}
                    {carrierHistory.created_at && (
                      <div className="flex items-center gap-1 mt-2">
                        <Calendar size={12} className="text-slate-400" />
                        <p className="text-xs text-slate-500">
                          {new Date(carrierHistory.created_at).toLocaleString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Người cập nhật */}
                {carrierHistory.updatedBy && (
                  <div className="p-5 border border-slate-200 rounded-2xl bg-white shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <User size={16} className="text-slate-400" />
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Người cập nhật lần cuối</p>
                    </div>
                    <p className="text-sm font-black text-slate-900">{carrierHistory.updatedBy.full_name}</p>
                    {carrierHistory.updatedBy.email && (
                      <p className="text-xs text-slate-500 mt-0.5">{carrierHistory.updatedBy.email}</p>
                    )}
                    {carrierHistory.updated_at && (
                      <div className="flex items-center gap-1 mt-2">
                        <Clock size={12} className="text-slate-400" />
                        <p className="text-xs text-slate-500">
                          {new Date(carrierHistory.updated_at).toLocaleString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Nếu chưa có người cập nhật, hiển thị thời gian cập nhật */}
                {!carrierHistory.updatedBy && carrierHistory.updated_at && (
                  <div className="p-5 border border-slate-200 rounded-2xl bg-white shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock size={16} className="text-slate-400" />
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Cập nhật lần cuối</p>
                    </div>
                    <p className="text-sm font-black text-slate-900">
                      {new Date(carrierHistory.updated_at).toLocaleString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-10 py-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-8 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all shadow-sm"
            disabled={isSubmitting}
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-10 py-3 bg-[#00d26a] text-white rounded-2xl text-sm font-black hover:bg-emerald-600 transition-all shadow-xl shadow-[#00d26a]/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Đang lưu...
              </>
            ) : (
              <>
                <Save size={18} />
                Lưu thay đổi
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
