'use client'

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Package, Plus, Search, Truck, 
  Phone, Mail, MapPin, MoreVertical,
  CheckCircle2, Clock, AlertCircle, Loader2,
  Edit, Trash2, X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useReload } from '@/contexts/ReloadContext';
import { hasAnyPermission, PermissionCategories } from '@/utils/permissions';
import { AccessDenied } from './AccessDenied';

export const Carriers: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { reloadKey } = useReload();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [carriers, setCarriers] = useState<any[]>([]);
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    show: boolean;
    carrierId: string | null;
    carrierName: string;
  }>({
    show: false,
    carrierId: null,
    carrierName: ''
  });
  const [deleting, setDeleting] = useState(false);
  const [carrierUsers, setCarrierUsers] = useState<Record<string, { createdBy?: { full_name: string }; updatedBy?: { full_name: string } }>>({});

  useEffect(() => {
    fetchCarriers();
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

  const fetchCarriers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/carriers', { cache: 'no-store' });
      const result = await response.json();

      if (!response.ok) {
        console.error('Error fetching carriers:', result?.error || 'Unknown error');
        if (result?.error?.includes('42P01')) {
          console.warn('Carriers table does not exist yet. Please run migration_create_carriers_table.sql first.');
        }
        setCarriers([]);
        return;
      }

      const data = result.carriers || [];
      setCarriers(data);

      const usersMap = result.users || {};
      if (Object.keys(usersMap).length > 0) {
        const carrierUsersMap: Record<string, { createdBy?: { full_name: string }; updatedBy?: { full_name: string } }> = {};
        data.forEach((carrier: any) => {
          carrierUsersMap[carrier.id] = {};
          if (carrier.created_by && usersMap[carrier.created_by]) {
            carrierUsersMap[carrier.id].createdBy = usersMap[carrier.created_by];
          }
          if (carrier.updated_by && usersMap[carrier.updated_by]) {
            carrierUsersMap[carrier.id].updatedBy = usersMap[carrier.updated_by];
          }
        });
        setCarrierUsers(carrierUsersMap);
      } else {
        setCarrierUsers({});
      }
    } catch (err: any) {
      console.error('Error fetching carriers:', err);
      setCarriers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (carrierId: string, carrierName: string) => {
    if (!canDeleteCarrier) {
      alert('Bạn không có quyền xóa đơn vị vận chuyển. Vui lòng liên hệ quản trị viên để được cấp quyền.');
      return;
    }
    setOpenActionMenu(null);
    setDeleteConfirmModal({
      show: true,
      carrierId,
      carrierName
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmModal.carrierId) return;
    if (!canDeleteCarrier) {
      alert('Bạn không có quyền xóa đơn vị vận chuyển. Vui lòng liên hệ quản trị viên để được cấp quyền.');
      return;
    }

    try {
      setDeleting(true);
      
      const response = await fetch(`/api/carriers/${deleteConfirmModal.carrierId}`, {
        method: 'DELETE'
      });
      const result = await response.json();

      if (!response.ok) {
        console.error('Error deleting carrier:', result?.error || 'Unknown error');
        throw new Error(result?.error || 'Lỗi xóa đơn vị vận chuyển');
      }

      // Refresh list after deletion
      await fetchCarriers();
      
      // Close modal
      setDeleteConfirmModal({
        show: false,
        carrierId: null,
        carrierName: ''
      });
    } catch (error: any) {
      console.error('Delete error:', error);
      alert(error.message || 'Có lỗi xảy ra khi xóa đơn vị vận chuyển');
    } finally {
      setDeleting(false);
    }
  };

  // Filter carriers based on search
  const filteredCarriers = carriers.filter(c => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(searchLower) ||
      c.code?.toLowerCase().includes(searchLower) ||
      c.phone?.toLowerCase().includes(searchLower) ||
      c.email?.toLowerCase().includes(searchLower) ||
      c.contact_person?.toLowerCase().includes(searchLower) ||
      c.address?.toLowerCase().includes(searchLower)
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

  // Check if user has any carrier permissions
  const hasCarrierPermissions = hasAnyPermission(user?.permissions, PermissionCategories.carriers);
  const canCreateCarrier = hasAnyPermission(user?.permissions, ['carriersCreate']);
  const canUpdateCarrier = hasAnyPermission(user?.permissions, ['carriersUpdate']);
  const canDeleteCarrier = hasAnyPermission(user?.permissions, ['carriersDelete']);

  // If user doesn't have any carrier permissions, show access denied message
  if (!hasCarrierPermissions) {
    return (
      <AccessDenied 
        message="Bạn không có quyền xem đơn vị vận chuyển. Vui lòng liên hệ quản trị viên để được cấp quyền."
        redirectTo="/dashboard"
        icon="shield"
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Tổng số đơn vị</p>
          <p className="text-2xl font-black mt-1 tracking-tighter text-slate-900">{carriers.length}</p>
        </div>
        <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Đang hoạt động</p>
          <p className="text-2xl font-black mt-1 tracking-tighter text-[#00d26a]">
            {carriers.filter(c => c.status === 'ACTIVE').length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Đã dừng</p>
          <p className="text-2xl font-black mt-1 tracking-tighter text-slate-400">
            {carriers.filter(c => c.status === 'INACTIVE').length}
          </p>
        </div>
      </div>

      {/* Search and Add Button */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm">
        <div className="relative flex-1 w-full max-w-lg">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Tìm kiếm đơn vị vận chuyển..."
            className="w-full pl-12 pr-6 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-sm font-bold focus:ring-4 focus:ring-[#00d26a]/10 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        {canCreateCarrier && (
          <Link
            href="/carriers/new"
            className="flex items-center gap-2 px-10 py-3.5 bg-[#00d26a] text-white rounded-2xl hover:bg-emerald-600 font-black text-sm transition-all shadow-xl shadow-[#00d26a]/20"
          >
            <Plus size={20} /> Thêm đơn vị vận chuyển
          </Link>
        )}
      </div>

      {/* Carriers Table */}
      <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-x-auto">
        <table className="w-full text-left min-w-[800px]">
          <thead className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <tr>
              <th className="px-10 py-5">Đơn vị vận chuyển</th>
              <th className="px-10 py-5">Liên hệ</th>
              <th className="px-10 py-5">Địa chỉ</th>
              <th className="px-10 py-5">Trạng thái</th>
              <th className="px-10 py-5">Thông tin người nhập</th>
              <th className="px-10 py-5 text-center">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredCarriers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-10 py-20 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <Package className="text-slate-300" size={48} />
                    <div>
                      <p className="text-sm font-black text-slate-600 mb-1">
                        {search ? 'Không tìm thấy đơn vị vận chuyển nào' : 'Chưa có đơn vị vận chuyển nào'}
                      </p>
                      <p className="text-xs text-slate-400">
                        {search ? 'Thử tìm kiếm với từ khóa khác' : 'Nhấn nút "Thêm đơn vị vận chuyển" để thêm mới'}
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              filteredCarriers.map((carrier) => (
                <tr 
                  key={carrier.id} 
                  className="hover:bg-slate-50/50 transition-colors group"
                >
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
                        <Truck size={24} />
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900">{carrier.name || 'N/A'}</h4>
                        {carrier.code && (
                          <p className="text-[10px] text-slate-400 font-medium mt-1">Mã: {carrier.code}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <div className="space-y-1">
                      {carrier.phone && (
                        <div className="flex items-center gap-2 text-sm text-slate-700">
                          <Phone size={14} className="text-slate-400" />
                          <span>{carrier.phone}</span>
                        </div>
                      )}
                      {carrier.email && (
                        <div className="flex items-center gap-2 text-sm text-slate-700">
                          <Mail size={14} className="text-slate-400" />
                          <span>{carrier.email}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    {carrier.address ? (
                      <div className="flex items-start gap-2 text-sm text-slate-700">
                        <MapPin size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                        <span>{carrier.address}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400">N/A</span>
                    )}
                  </td>
                  <td className="px-10 py-6">
                    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tight ${
                      carrier.status === 'ACTIVE' 
                        ? 'bg-emerald-50 text-emerald-700' 
                        : 'bg-slate-100 text-slate-400'
                    }`}>
                      {carrier.status === 'ACTIVE' ? (
                        <CheckCircle2 size={12} />
                      ) : (
                        <Clock size={12} />
                      )}
                      {carrier.status === 'ACTIVE' ? 'Hoạt động' : 'Dừng hoạt động'}
                    </span>
                  </td>
                  <td className="px-10 py-6">
                    <div className="space-y-1 text-xs">
                      {carrierUsers[carrier.id]?.createdBy && (
                        <div className="flex items-center gap-2 text-slate-700">
                          <span className="text-[10px] text-slate-400 uppercase">Người tạo:</span>
                          <span className="font-medium">{carrierUsers[carrier.id]?.createdBy?.full_name}</span>
                        </div>
                      )}
                      {carrierUsers[carrier.id]?.updatedBy && carrierUsers[carrier.id]?.updatedBy?.full_name !== carrierUsers[carrier.id]?.createdBy?.full_name && (
                        <div className="flex items-center gap-2 text-slate-700">
                          <span className="text-[10px] text-slate-400 uppercase">Cập nhật:</span>
                          <span className="font-medium">{carrierUsers[carrier.id]?.updatedBy?.full_name}</span>
                        </div>
                      )}
                      {carrier.updated_at && (
                        <div className="flex items-center gap-1 text-slate-500 mt-1">
                          <Clock size={12} />
                          <span className="text-[10px]">
                            {new Date(carrier.updated_at).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-10 py-6 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="relative inline-block action-menu-container">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenActionMenu(openActionMenu === carrier.id ? null : carrier.id);
                        }}
                        className="p-2 text-slate-400 hover:text-[#00d26a] hover:bg-[#00d26a]/10 rounded-2xl transition-all"
                      >
                        <MoreVertical size={20} />
                      </button>
                      
                      {openActionMenu === carrier.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-[200] animate-in fade-in slide-in-from-top-2 duration-200">
                          {canUpdateCarrier && (
                            <Link
                              href={`/carriers/${carrier.id}/edit`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenActionMenu(null);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                            >
                              <Edit size={18} className="text-slate-600" />
                              <span className="text-sm font-bold text-slate-700">Sửa</span>
                            </Link>
                          )}
                          {canDeleteCarrier && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(carrier.id, carrier.name);
                                setOpenActionMenu(null);
                              }}
                              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition-colors text-left ${
                                canUpdateCarrier ? 'border-t border-slate-100' : ''
                              } text-red-600`}
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
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmModal.show && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] border border-slate-200 shadow-2xl max-w-md w-full p-8 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
                <AlertCircle className="text-red-600" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Xác nhận xóa</h3>
                <p className="text-xs text-slate-500 font-medium">Thao tác này không thể hoàn tác</p>
              </div>
            </div>
            
            <div className="mb-8">
              <p className="text-sm font-bold text-slate-700 mb-2">
                Bạn có chắc chắn muốn xóa đơn vị vận chuyển:
              </p>
              <p className="text-base font-black text-slate-900 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                {deleteConfirmModal.carrierName}
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setDeleteConfirmModal({
                  show: false,
                  carrierId: null,
                  carrierName: ''
                })}
                disabled={deleting}
                className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 rounded-2xl text-sm font-bold text-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Hủy
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting || !canDeleteCarrier}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-sm font-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Đang xóa...
                  </>
                ) : (
                  <>
                    <Trash2 size={18} />
                    Xóa
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

