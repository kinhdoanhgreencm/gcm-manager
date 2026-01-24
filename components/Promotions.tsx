'use client'

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Tag, Plus, Search, MoreVertical,
  CheckCircle2, Clock, X, Edit, Trash2,
  Percent, DollarSign, Gift, Loader2,
  Calendar, AlertCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useReload } from '@/contexts/ReloadContext';
import { hasAnyPermission, PermissionCategories } from '@/utils/permissions';
import { AccessDenied } from './AccessDenied';

interface Promotion {
  id: string;
  code: string;
  name: string;
  discount_type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'GIFT';
  discount_value: number;
  description?: string;
  start_date?: string;
  end_date?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
  created_at: string;
  updated_at: string;
}

export const Promotions: React.FC = () => {
  const { user } = useAuth();
  const { reloadKey } = useReload();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);

  useEffect(() => {
    fetchPromotions();
  }, [reloadKey]); // Re-fetch when reloadKey changes

  // Handle click outside to close action menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (openActionMenu && !target.closest('.action-menu-container')) {
        setOpenActionMenu(null);
      }
    };

    if (openActionMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openActionMenu]);

  const fetchPromotions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/promotions', { cache: 'no-store' });
      const result = await response.json();

      if (!response.ok) {
        console.error('Error fetching promotions:', result?.error || 'Unknown error');
        return;
      }

      setPromotions(result.promotions || []);
    } catch (err: any) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString + 'T00:00:00'); // Add time to avoid timezone issues
      if (isNaN(date.getTime())) return 'N/A';
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return 'N/A';
    }
  };

  const getDiscountTypeIcon = (type: string) => {
    switch(type) {
      case 'PERCENTAGE':
        return <Percent size={16} className="text-blue-600" />;
      case 'FIXED_AMOUNT':
        return <DollarSign size={16} className="text-emerald-600" />;
      case 'GIFT':
        return <Gift size={16} className="text-amber-600" />;
      default:
        return <Tag size={16} />;
    }
  };

  const getDiscountTypeLabel = (type: string) => {
    switch(type) {
      case 'PERCENTAGE':
        return 'Phần trăm';
      case 'FIXED_AMOUNT':
        return 'Số tiền cố định';
      case 'GIFT':
        return 'Tặng quà';
      default:
        return type;
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'ACTIVE':
        return { label: 'Đang áp dụng', class: 'bg-emerald-50 text-emerald-700', icon: <CheckCircle2 size={12} /> };
      case 'INACTIVE':
        return { label: 'Tạm ngưng', class: 'bg-slate-100 text-slate-600', icon: <Clock size={12} /> };
      case 'EXPIRED':
        return { label: 'Hết hạn', class: 'bg-rose-50 text-rose-700', icon: <X size={12} /> };
      default:
        return { label: 'N/A', class: 'bg-slate-100 text-slate-600', icon: <AlertCircle size={12} /> };
    }
  };

  const formatDiscountValue = (type: string, value: number) => {
    switch(type) {
      case 'PERCENTAGE':
        return `${value}%`;
      case 'FIXED_AMOUNT':
        return formatVND(value);
      case 'GIFT':
        return 'Tặng quà';
      default:
        return value.toString();
    }
  };

  const handleDelete = async (id: string) => {
    if (!canDeletePromotion) {
      alert('Bạn không có quyền xóa chương trình khuyến mãi. Vui lòng liên hệ quản trị viên để được cấp quyền.');
      return;
    }
    if (!confirm('Bạn có chắc chắn muốn xóa chương trình khuyến mãi này?')) {
      return;
    }

    try {
      const response = await fetch(`/api/promotions/${id}`, { method: 'DELETE' });
      const result = await response.json();

      if (!response.ok) {
        console.error('Error deleting promotion:', result?.error || 'Unknown error');
        alert('Có lỗi xảy ra khi xóa chương trình khuyến mãi');
        return;
      }

      await fetchPromotions();
      setOpenActionMenu(null);
    } catch (err: any) {
      console.error('Error:', err);
      alert('Có lỗi xảy ra khi xóa chương trình khuyến mãi');
    }
  };

  const handleEdit = (promotion: Promotion) => {
    window.location.href = `/promotions/edit?id=${promotion.id}`;
  };

  // Filter promotions based on search
  const filteredPromotions = promotions.filter(p => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      p.code.toLowerCase().includes(searchLower) ||
      p.name.toLowerCase().includes(searchLower) ||
      (p.description && p.description.toLowerCase().includes(searchLower))
    );
  });

  // Show loading state
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

  // Check if user has any promotion permissions
  const hasPromotionPermissions = hasAnyPermission(user?.permissions, PermissionCategories.promotions);
  const canCreatePromotion = hasAnyPermission(user?.permissions, ['promotionsCreate']);
  const canUpdatePromotion = hasAnyPermission(user?.permissions, ['promotionsUpdate']);
  const canDeletePromotion = hasAnyPermission(user?.permissions, ['promotionsDelete']);

  // If user doesn't have any promotion permissions, show access denied message
  if (!hasPromotionPermissions) {
    return (
      <AccessDenied 
        message="Bạn không có quyền xem chương trình khuyến mãi. Vui lòng liên hệ quản trị viên để được cấp quyền."
        redirectTo="/dashboard"
        icon="alert"
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Tổng số CTKM</p>
          <p className="text-2xl font-black mt-1 tracking-tighter text-slate-900">{promotions.length}</p>
        </div>
        <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Đang áp dụng</p>
          <p className="text-2xl font-black mt-1 tracking-tighter text-[#00d26a]">
            {promotions.filter(p => p.status === 'ACTIVE').length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Tạm ngưng</p>
          <p className="text-2xl font-black mt-1 tracking-tighter text-slate-400">
            {promotions.filter(p => p.status === 'INACTIVE').length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Hết hạn</p>
          <p className="text-2xl font-black mt-1 tracking-tighter text-rose-600">
            {promotions.filter(p => p.status === 'EXPIRED').length}
          </p>
        </div>
      </div>

      {/* Search and Add Button */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm">
        <div className="relative flex-1 w-full max-w-lg">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Tìm kiếm chương trình khuyến mãi..."
            className="w-full pl-12 pr-6 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-sm font-bold focus:ring-4 focus:ring-[#00d26a]/10 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {canCreatePromotion && (
          <Link
            href="/promotions/new"
            className="flex items-center gap-2 px-10 py-3.5 bg-[#00d26a] text-white rounded-2xl hover:bg-emerald-600 font-black text-sm transition-all shadow-xl shadow-[#00d26a]/20"
          >
            <Plus size={16} /> Thêm chương trình khuyến mãi
          </Link>
        )}
      </div>

      {/* Promotions Table */}
      <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-x-auto">
        <table className="w-full text-left min-w-[800px]">
          <thead className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <tr>
              <th className="px-10 py-5">Mã CTKM</th>
              <th className="px-10 py-5">Tên chương trình</th>
              <th className="px-10 py-5">Loại giảm giá</th>
              <th className="px-10 py-5 text-right">Giá trị</th>
              <th className="px-10 py-5">Thời gian áp dụng</th>
              <th className="px-10 py-5">Trạng thái</th>
              <th className="px-10 py-5 text-center">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredPromotions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-10 py-20 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <Tag className="text-slate-300" size={48} />
                    <div>
                      <p className="text-sm font-black text-slate-600 mb-1">
                        {search ? 'Không tìm thấy chương trình khuyến mãi nào' : 'Chưa có chương trình khuyến mãi'}
                      </p>
                      <p className="text-xs text-slate-400">
                        {search ? 'Thử tìm kiếm với từ khóa khác' : 'Nhấn nút "Thêm chương trình khuyến mãi" để tạo mới'}
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              filteredPromotions.map((promo) => {
                const status = getStatusBadge(promo.status);
                return (
                  <tr 
                    key={promo.id} 
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-10 py-6">
                      <p className="text-sm font-black text-slate-900 font-mono">{promo.code}</p>
                    </td>
                    <td className="px-10 py-6">
                      <p className="text-sm font-bold text-slate-900">{promo.name}</p>
                      {promo.description && (
                        <p className="text-xs text-slate-500 mt-1">{promo.description}</p>
                      )}
                    </td>
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-2">
                        {getDiscountTypeIcon(promo.discount_type)}
                        <span className="text-xs font-bold text-slate-700">{getDiscountTypeLabel(promo.discount_type)}</span>
                      </div>
                    </td>
                    <td className="px-10 py-6 text-right">
                      <p className="text-sm font-black text-slate-900">
                        {formatDiscountValue(promo.discount_type, promo.discount_value)}
                      </p>
                    </td>
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Calendar size={14} />
                        <span>
                          {promo.start_date && promo.end_date 
                            ? `${formatDate(promo.start_date)} - ${formatDate(promo.end_date)}`
                            : promo.start_date 
                            ? `Từ ${formatDate(promo.start_date)}`
                            : 'Không giới hạn'}
                        </span>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tight ${status.class}`}>
                        {status.icon} {status.label}
                      </span>
                    </td>
                    <td className="px-10 py-6 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="relative inline-block action-menu-container">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenActionMenu(openActionMenu === promo.id ? null : promo.id);
                          }}
                          className="p-3 text-slate-400 hover:text-[#00d26a] hover:bg-[#00d26a]/10 rounded-2xl transition-all"
                        >
                          <MoreVertical size={20} />
                        </button>
                        
                        {openActionMenu === promo.id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-[9999] animate-in fade-in slide-in-from-top-2 duration-200">
                            {canUpdatePromotion && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(promo);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                              >
                                <Edit size={18} className="text-slate-600" />
                                <span className="text-sm font-bold text-slate-700">Chỉnh sửa</span>
                              </button>
                            )}
                            {canDeletePromotion && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(promo.id);
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left ${
                                  canUpdatePromotion ? 'border-t border-slate-100' : ''
                                } text-rose-600`}
                              >
                                <Trash2 size={18} />
                                <span className="text-sm font-bold">Xóa</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

