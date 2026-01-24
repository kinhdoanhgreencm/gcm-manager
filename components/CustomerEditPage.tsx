'use client'

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  Save, User, Phone, Mail, MapPin, 
  Hash, Building2, UserCircle, Briefcase, 
  Target, Info, ShieldCheck, FileText,
  Smartphone, Globe, Users, ArrowLeft, Calendar,
  Loader2, Landmark, CreditCard
} from 'lucide-react';
import { CustomerType, CustomerStatus } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

export const CustomerEditPage: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;
  const { user } = useAuth();

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    type: CustomerType.INDIVIDUAL,
    name: '',
    phone: '',
    email: '',
    address: '',
    dateOfBirth: '',
    gender: '',
    idCard: '',
    idCardIssueDate: '',
    idCardIssuePlace: '',
    taxCode: '',
    companyName: '',
    representative: '',
    position: '',
    bankName: '',
    bankAccount: '',
    bankBranch: '',
    source: 'Facebook',
    assignedStaffId: '',
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [assignedStaffName, setAssignedStaffName] = useState<string>('');

  const isCorporate = formData.type === CustomerType.CORPORATE;

  // Load customer data
  useEffect(() => {
    const loadCustomer = async () => {
      if (!customerId) return;
      
      try {
        setLoading(true);
        const response = await fetch(`/api/customers/${customerId}?include=staff`, { cache: 'no-store' });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.error || 'Không thể tải thông tin khách hàng');
        }

        const data = result?.customer;
        if (data) {
          // Format date for date input (YYYY-MM-DD)
          const formatDate = (dateString: string | null) => {
            if (!dateString) return '';
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '';
            return date.toISOString().split('T')[0];
          };

          setFormData({
            type: data.type as CustomerType,
            name: data.name || '',
            phone: data.phone || '',
            email: data.email || '',
            address: data.address || '',
            dateOfBirth: formatDate(data.date_of_birth),
            gender: data.gender || '',
            idCard: data.id_card || '',
            idCardIssueDate: formatDate(data.id_card_issue_date),
            idCardIssuePlace: data.id_card_issue_place || '',
            taxCode: data.tax_code || '',
            companyName: data.company_name || '',
            representative: data.representative || '',
            position: data.position || '',
            bankName: data.bank_name || '',
            bankAccount: data.bank_account || '',
            bankBranch: data.bank_branch || '',
            source: data.source || 'Facebook',
            assignedStaffId: data.assigned_staff_id || '',
            notes: data.notes || ''
          });

          if (result?.assignedStaffName) {
            setAssignedStaffName(result.assignedStaffName);
          } else {
            setAssignedStaffName('');
          }
        }
      } catch (error: any) {
        console.error('Error loading customer:', error);
        setSubmitError(`Lỗi tải dữ liệu: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    loadCustomer();
  }, [customerId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name || !formData.phone) {
      setSubmitError('Vui lòng nhập đầy đủ thông tin bắt buộc');
      return;
    }

    // Validate legal information based on type
    if (isCorporate && !formData.taxCode) {
      setSubmitError('Vui lòng nhập mã số thuế doanh nghiệp');
      return;
    }

    if (!isCorporate && !formData.idCard) {
      setSubmitError('Vui lòng nhập số CCCD / Hộ chiếu');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Prepare customer data in database format (snake_case)
      const customerData: any = {
        type: formData.type,
        name: formData.name,
        phone: formData.phone || null,
        email: formData.email || null,
        address: formData.address || null,
        source: formData.source || null,
        assigned_staff_id: formData.assignedStaffId || null,
        notes: formData.notes || null,
        // Personal information (for INDIVIDUAL)
        date_of_birth: formData.dateOfBirth || null,
        gender: formData.gender || null,
        id_card: !isCorporate ? (formData.idCard || null) : null,
        id_card_issue_date: !isCorporate ? (formData.idCardIssueDate || null) : null,
        id_card_issue_place: !isCorporate ? (formData.idCardIssuePlace || null) : null,
        // Corporate information (for CORPORATE)
        tax_code: isCorporate ? (formData.taxCode || null) : null,
        company_name: isCorporate ? (formData.companyName || null) : null,
        representative: isCorporate ? (formData.representative || null) : null,
        position: isCorporate ? (formData.position || null) : null,
        // Bank information (for both INDIVIDUAL and CORPORATE)
        bank_name: formData.bankName || null,
        bank_account: formData.bankAccount || null,
        bank_branch: formData.bankBranch || null,
        updated_at: new Date().toISOString()
      };

      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ customer: customerData })
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || 'Lỗi cập nhật dữ liệu khách hàng');
      }

      // Success - redirect to CRM page
      router.push('/crm');
    } catch (error: any) {
      console.error('Submit error:', error);
      setSubmitError(error.message || 'Có lỗi xảy ra khi cập nhật dữ liệu. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-blue-600" size={32} />
          <p className="text-sm font-bold text-slate-500">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

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
               <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-tighter">CRM Database</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900">Chỉnh sửa thông tin khách hàng</h2>
            <p className="text-xs text-slate-500 font-medium">Cập nhật thông tin liên hệ và lịch sử giao dịch khách hàng</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form 
        onSubmit={handleSubmit}
        className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden"
      >
        {/* Scrollable Content */}
        <div className="p-10 space-y-10">
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
                  <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
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
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                  <input 
                    type="email" 
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Địa chỉ đăng ký</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                  <input 
                    type="text" 
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10"
                    value={formData.address}
                    onChange={e => setFormData({...formData, address: e.target.value})}
                  />
                </div>
              </div>

              {/* Thông tin ngân hàng */}
              <div className="md:col-span-2 space-y-4 pt-2">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Thông tin ngân hàng</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tên ngân hàng</label>
                    <div className="relative">
                      <Landmark className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                      <input 
                        type="text" 
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10"
                        placeholder="Ví dụ: Techcombank, Vietcombank..."
                        value={formData.bankName}
                        onChange={e => setFormData({...formData, bankName: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Số tài khoản</label>
                    <div className="relative">
                      <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                      <input 
                        type="text" 
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-mono font-bold outline-none focus:ring-4 focus:ring-blue-500/10"
                        placeholder="Nhập số tài khoản"
                        value={formData.bankAccount}
                        onChange={e => setFormData({...formData, bankAccount: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chi nhánh</label>
                    <div className="relative">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                      <input 
                        type="text" 
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10"
                        placeholder="Ví dụ: Chi nhánh Cần Thơ"
                        value={formData.bankBranch}
                        onChange={e => setFormData({...formData, bankBranch: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {!isCorporate && (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngày tháng năm sinh</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                      <input 
                        type="date" 
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10"
                        value={formData.dateOfBirth}
                        onChange={e => setFormData({...formData, dateOfBirth: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Giới tính</label>
                    <div className="relative">
                      <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                      <select 
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 appearance-none"
                        value={formData.gender}
                        onChange={e => setFormData({...formData, gender: e.target.value})}
                      >
                        <option value="">-- Chọn giới tính --</option>
                        <option value="Nam">Nam</option>
                        <option value="Nữ">Nữ</option>
                        <option value="Khác">Khác</option>
                      </select>
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>

          <section className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
               <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
                 <ShieldCheck size={18} />
               </div>
               <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">2. Thông tin pháp lý & Phụ trách</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-8 rounded-[32px] border border-slate-100">
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
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Số CCCD / Hộ chiếu *</label>
                    <div className="relative">
                      <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                      <input 
                        required
                        type="text" 
                        className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-mono font-black"
                        value={formData.idCard}
                        onChange={e => setFormData({...formData, idCard: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngày cấp CCCD</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                      <input 
                        type="date" 
                        className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none"
                        value={formData.idCardIssueDate}
                        onChange={e => setFormData({...formData, idCardIssueDate: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nơi cấp</label>
                    <select 
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none"
                      value={formData.idCardIssuePlace}
                      onChange={e => setFormData({...formData, idCardIssuePlace: e.target.value})}
                    >
                      <option value="">-- Chọn nơi cấp --</option>
                      <option value="Cục cảnh sát quản lý hành chính về trật tự xã hội">Cục cảnh sát quản lý hành chính về trật tự xã hội</option>
                      <option value="Bộ Công An">Bộ Công An</option>
                    </select>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nguồn khách hàng</label>
                <select 
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none"
                  value={formData.source}
                  onChange={e => setFormData({...formData, source: e.target.value})}
                >
                  <option value="Tiktok">Tiktok</option>
                  <option value="Facebook">Facebook</option>
                  <option value="Google">Google</option>
                  <option value="Khách hàng cũ">Khách hàng cũ</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">NV Sales phụ trách</label>
                <div className="relative">
                  <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                  <input 
                    type="text"
                    readOnly
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none cursor-not-allowed opacity-75"
                    value={assignedStaffName || 'Đang tải...'}
                  />
                </div>
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
                <p className="text-sm font-bold text-red-900">Lỗi khi cập nhật dữ liệu</p>
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
              className="px-8 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-100 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                  Đang cập nhật...
                </>
              ) : (
                <>
                  <Save size={18} /> Cập nhật thông tin khách hàng
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

