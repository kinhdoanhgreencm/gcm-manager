'use client'

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ArrowLeft, Save, Tag, Percent, DollarSign, Gift,
  Calendar, FileText, AlertCircle, X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export const PromotionFormPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const promotionId = searchParams.get('id');
  const isEditing = !!promotionId;

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    discount_type: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED_AMOUNT' | 'GIFT',
    discount_value: 0,
    description: '',
    start_date: '',
    end_date: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' | 'EXPIRED'
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Format date from YYYY-MM-DD to dd/mm/yyyy
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString + 'T00:00:00'); // Add time to avoid timezone issues
      if (isNaN(date.getTime())) return '';
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return '';
    }
  };

  // Parse date from dd/mm/yyyy to YYYY-MM-DD
  const parseDate = (dateString: string): string => {
    if (!dateString) return '';
    const cleaned = dateString.trim();
    if (!cleaned) return '';
    
    // Match pattern: dd/mm/yyyy
    const match = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!match) return '';
    
    const [, day, month, year] = match;
    const dayNum = parseInt(day);
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);
    
    // Validate ranges
    if (dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12 || yearNum < 1900 || yearNum > 2100) {
      return '';
    }
    
    try {
      const date = new Date(yearNum, monthNum - 1, dayNum);
      if (isNaN(date.getTime())) return '';
      // Return YYYY-MM-DD format
      return `${yearNum}-${monthNum.toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
    } catch {
      return '';
    }
  };

  // Handle date input with auto-formatting
  const handleDateChange = (field: 'start_date' | 'end_date', value: string) => {
    // Remove all non-digit characters except /
    let cleaned = value.replace(/[^\d\/]/g, '');
    
    // Auto-format as user types: dd/mm/yyyy
    let digits = cleaned.replace(/\//g, '');
    let formatted = '';
    
    if (digits.length > 0) {
      // Day (2 digits)
      formatted = digits.slice(0, 2);
      if (digits.length > 2) {
        formatted += '/' + digits.slice(2, 4);
      }
      if (digits.length > 4) {
        formatted += '/' + digits.slice(4, 8);
      }
    }
    
    // Limit to 10 characters (dd/mm/yyyy)
    if (formatted.length > 10) {
      formatted = formatted.slice(0, 10);
    }
    
    // Update form data with formatted string
    setFormData({...formData, [field]: formatted});
  };

  useEffect(() => {
    if (isEditing && promotionId) {
      fetchPromotion();
    }
  }, [isEditing, promotionId]);

  const fetchPromotion = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/promotions/${promotionId}`, { cache: 'no-store' });
      const result = await response.json();

      if (!response.ok) {
        console.error('Error fetching promotion:', result?.error || 'Unknown error');
        setError('Không tìm thấy chương trình khuyến mãi');
        return;
      }

      if (result.promotion) {
        setFormData({
          code: result.promotion.code || '',
          name: result.promotion.name || '',
          discount_type: result.promotion.discount_type || 'PERCENTAGE',
          discount_value: Number(result.promotion.discount_value) || 0,
          description: result.promotion.description || '',
          start_date: formatDate(result.promotion.start_date),
          end_date: formatDate(result.promotion.end_date),
          status: result.promotion.status || 'ACTIVE'
        });
      }
    } catch (err: any) {
      console.error('Error:', err);
      setError('Có lỗi xảy ra khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.code.trim()) {
      setError('Vui lòng nhập mã chương trình khuyến mãi');
      return;
    }

    if (!formData.name.trim()) {
      setError('Vui lòng nhập tên chương trình khuyến mãi');
      return;
    }

    if (formData.discount_type !== 'GIFT' && formData.discount_value <= 0) {
      setError('Vui lòng nhập giá trị giảm giá hợp lệ');
      return;
    }

    // Parse dates from dd/mm/yyyy to YYYY-MM-DD for validation and saving
    const parsedStartDate = parseDate(formData.start_date);
    const parsedEndDate = parseDate(formData.end_date);

    if (parsedStartDate && parsedEndDate && parsedStartDate > parsedEndDate) {
      setError('Ngày kết thúc phải sau ngày bắt đầu');
      return;
    }

    setIsSubmitting(true);

    try {
      const storedUser = localStorage.getItem('user');
      let creatorId = null;
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          creatorId = userData.id;
        } catch (e) {
          console.error('Error parsing user:', e);
        }
      }

      const promotionData: any = {
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        discount_type: formData.discount_type,
        discount_value: formData.discount_value,
        description: formData.description.trim() || null,
        start_date: parsedStartDate || null,
        end_date: parsedEndDate || null,
        status: formData.status
      };

      if (!isEditing && creatorId) {
        promotionData.created_by = creatorId;
      }

      const response = await fetch(
        isEditing ? `/api/promotions/${promotionId}` : '/api/promotions',
        {
          method: isEditing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ promotion: promotionData })
        }
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || 'Có lỗi xảy ra khi lưu chương trình khuyến mãi');
      }

      // Success - redirect to promotions page
      router.push('/promotions');
    } catch (err: any) {
      console.error('Error saving promotion:', err);
      setError(err.message || 'Có lỗi xảy ra khi lưu chương trình khuyến mãi. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-slate-500">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white rounded-[40px] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-10 py-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.back()}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <ArrowLeft size={24} className="text-slate-400" />
            </button>
            <div>
              <h3 className="text-2xl font-black text-slate-900">
                {isEditing ? 'Chỉnh sửa chương trình khuyến mãi' : 'Thêm chương trình khuyến mãi mới'}
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                {isEditing ? 'Cập nhật thông tin chương trình khuyến mãi' : 'Tạo chương trình khuyến mãi mới cho hệ thống'}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-10 space-y-8">
            {error && (
              <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-700 px-6 py-4 flex items-center gap-3 rounded-2xl">
                <AlertCircle size={20} />
                <p className="text-sm font-bold">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Code */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Mã chương trình khuyến mãi *
                </label>
                <div className="relative">
                  <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    required
                    disabled={isEditing}
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none disabled:bg-slate-100 focus:ring-4 focus:ring-blue-500/5 transition-all"
                    placeholder="KM001"
                  />
                </div>
              </div>

              {/* Name */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Tên chương trình *
                </label>
                <div className="relative">
                  <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 transition-all"
                    placeholder="Giảm giá đầu năm - 5%"
                  />
                </div>
              </div>

              {/* Discount Type */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Loại giảm giá *
                </label>
                <div className="relative">
                  <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <select 
                    value={formData.discount_type}
                    onChange={(e) => setFormData({...formData, discount_type: e.target.value as any, discount_value: 0})}
                    className="w-full pl-12 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none appearance-none focus:ring-4 focus:ring-blue-500/5 transition-all"
                  >
                    <option value="PERCENTAGE">Phần trăm (%)</option>
                    <option value="FIXED_AMOUNT">Số tiền cố định (VND)</option>
                    <option value="GIFT">Tặng quà</option>
                  </select>
                </div>
              </div>

              {/* Discount Value */}
              {formData.discount_type !== 'GIFT' && (
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Giá trị giảm giá *
                  </label>
                  <div className="relative">
                    {formData.discount_type === 'PERCENTAGE' ? (
                      <Percent className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    ) : (
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    )}
                    <input 
                      type="number" 
                      required
                      min="0"
                      step={formData.discount_type === 'PERCENTAGE' ? '0.01' : '1'}
                      value={formData.discount_value}
                      onChange={(e) => setFormData({...formData, discount_value: Number(e.target.value)})}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 transition-all"
                      placeholder={formData.discount_type === 'PERCENTAGE' ? '5' : '10000000'}
                    />
                  </div>
                  {formData.discount_type === 'FIXED_AMOUNT' && formData.discount_value > 0 && (
                    <p className="text-xs text-slate-500 mt-1">{formatVND(formData.discount_value)}</p>
                  )}
                </div>
              )}

              {/* Start Date */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Ngày bắt đầu
                </label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    value={formData.start_date}
                    onChange={(e) => handleDateChange('start_date', e.target.value)}
                    placeholder="dd/mm/yyyy"
                    maxLength={10}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 transition-all"
                  />
                </div>
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Ngày kết thúc
                </label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    value={formData.end_date}
                    onChange={(e) => handleDateChange('end_date', e.target.value)}
                    placeholder="dd/mm/yyyy"
                    maxLength={10}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 transition-all"
                  />
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Trạng thái *
                </label>
                <div className="relative">
                  <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <select 
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                    className="w-full pl-12 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none appearance-none focus:ring-4 focus:ring-blue-500/5 transition-all"
                  >
                    <option value="ACTIVE">Đang áp dụng</option>
                    <option value="INACTIVE">Tạm ngưng</option>
                    <option value="EXPIRED">Hết hạn</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Mô tả chi tiết
              </label>
              <textarea 
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full p-6 rounded-3xl text-sm font-medium outline-none bg-slate-50 border border-slate-200 focus:ring-8 focus:ring-blue-500/5 focus:bg-white transition-all"
                placeholder="Nhập mô tả chi tiết về chương trình khuyến mãi..."
              ></textarea>
            </div>
          </div>

          {/* Footer */}
          <div className="px-10 py-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-4">
            <button 
              type="button"
              onClick={() => router.back()} 
              className="px-8 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all"
            >
              Hủy
            </button>
            <button 
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-3 bg-[#00d26a] text-white rounded-2xl text-sm font-black hover:bg-emerald-600 transition-all shadow-xl shadow-[#00d26a]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Đang lưu...
                </>
              ) : (
                <>
                  <Save size={16} />
                  {isEditing ? 'Cập nhật' : 'Tạo mới'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

