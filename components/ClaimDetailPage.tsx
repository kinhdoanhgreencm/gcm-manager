'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Calendar, Car, User, Phone, Mail,
  DollarSign, FileText, CheckCircle2, Clock, AlertCircle,
  Edit, Trash2, X, Eye, Hash, Building2, UserCircle,
  AlertTriangle, TrendingUp, TrendingDown, ShieldCheck
} from 'lucide-react';
import { Claim, ClaimStatus, ClaimType, ClaimPriority } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission } from '@/utils/permissions';
import { AccessDenied } from './AccessDenied';

interface ClaimDetailPageProps {
  claimId: string;
}

export const ClaimDetailPage: React.FC<ClaimDetailPageProps> = ({ claimId }) => {
  const router = useRouter();
  const { user } = useAuth();
  const [claim, setClaim] = useState<Claim | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Check permissions
  const canReadClaim = hasPermission(user?.permissions, 'claimsRead');
  const canUpdateClaim = hasPermission(user?.permissions, 'claimsUpdate');
  const canDeleteClaim = hasPermission(user?.permissions, 'claimsDelete');

  useEffect(() => {
    fetchClaim();
  }, [claimId]);

  const fetchClaim = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/claims/${claimId}`, { cache: 'no-store' });
      const result = await response.json();

      if (!response.ok) {
        console.error('Error fetching claim:', result?.error || 'Unknown error');
        setError('Không tìm thấy hồ sơ claim hoặc có lỗi xảy ra');
        return;
      }

      if (!result?.claim) {
        setError('Không tìm thấy hồ sơ claim');
        return;
      }

      setClaim(result.claim as Claim);
    } catch (err: any) {
      console.error('Error fetching claim:', err);
      setError('Có lỗi xảy ra khi tải dữ liệu hồ sơ claim');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!canDeleteClaim) {
      setDeleteError('Bạn không có quyền xóa hồ sơ claim');
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const response = await fetch(`/api/claims/${claimId}`, { method: 'DELETE' });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || 'Có lỗi xảy ra khi xóa hồ sơ claim');
      }

      router.push('/claims');
    } catch (error: any) {
      console.error('Error deleting claim:', error);
      setDeleteError(error.message || 'Có lỗi xảy ra khi xóa hồ sơ claim');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatVND = (amount: number | undefined) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  const getStatusBadge = (status: ClaimStatus) => {
    switch (status) {
      case ClaimStatus.PENDING:
        return { label: 'Chờ xử lý', class: 'bg-orange-100 text-orange-600', icon: <Clock size={14} /> };
      case ClaimStatus.IN_PROGRESS:
        return { label: 'Đang xử lý', class: 'bg-blue-100 text-blue-600', icon: <FileText size={14} /> };
      case ClaimStatus.RESOLVED:
        return { label: 'Đã giải quyết', class: 'bg-emerald-100 text-emerald-600', icon: <CheckCircle2 size={14} /> };
      case ClaimStatus.REJECTED:
        return { label: 'Từ chối', class: 'bg-red-100 text-red-600', icon: <X size={14} /> };
      case ClaimStatus.CLOSED:
        return { label: 'Đã đóng', class: 'bg-slate-100 text-slate-600', icon: <CheckCircle2 size={14} /> };
      default:
        return { label: status, class: 'bg-slate-100 text-slate-600', icon: <FileText size={14} /> };
    }
  };

  const getTypeBadge = (type: ClaimType) => {
    switch (type) {
      case ClaimType.WARRANTY:
        return { label: 'Bảo hành', class: 'bg-blue-100 text-blue-700' };
      case ClaimType.COMPLAINT:
        return { label: 'Khiếu nại', class: 'bg-red-100 text-red-700' };
      case ClaimType.REPAIR:
        return { label: 'Sửa chữa', class: 'bg-yellow-100 text-yellow-700' };
      case ClaimType.REPLACEMENT:
        return { label: 'Thay thế', class: 'bg-purple-100 text-purple-700' };
      case ClaimType.REFUND:
        return { label: 'Hoàn tiền', class: 'bg-orange-100 text-orange-700' };
      default:
        return { label: type, class: 'bg-slate-100 text-slate-700' };
    }
  };

  const getPriorityBadge = (priority: ClaimPriority) => {
    switch (priority) {
      case ClaimPriority.LOW:
        return { label: 'Thấp', class: 'bg-slate-100 text-slate-600' };
      case ClaimPriority.MEDIUM:
        return { label: 'Trung bình', class: 'bg-blue-100 text-blue-600' };
      case ClaimPriority.HIGH:
        return { label: 'Cao', class: 'bg-orange-100 text-orange-600' };
      case ClaimPriority.URGENT:
        return { label: 'Khẩn cấp', class: 'bg-red-100 text-red-600' };
      default:
        return { label: priority, class: 'bg-slate-100 text-slate-600' };
    }
  };

  if (!canReadClaim) {
    return <AccessDenied message="Bạn không có quyền xem chi tiết hồ sơ claim. Vui lòng liên hệ quản trị viên để được cấp quyền." />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00d26a] mx-auto mb-4"></div>
          <p className="text-slate-500 font-medium">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  if (error || !claim) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="text-red-600" size={20} />
          <p className="text-red-900 font-bold">{error || 'Không tìm thấy hồ sơ claim'}</p>
        </div>
      </div>
    );
  }

  const statusBadge = getStatusBadge(claim.status);
  const typeBadge = getTypeBadge(claim.type);
  const priorityBadge = getPriorityBadge(claim.priority);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
          >
            <ArrowLeft size={20} className="text-white" />
          </button>
          <div>
            <h1 className="text-3xl font-black text-white mb-2">{claim.title}</h1>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-lg text-xs font-bold ${statusBadge.class}`}>
                <span className="flex items-center gap-1.5">
                  {statusBadge.icon}
                  {statusBadge.label}
                </span>
              </span>
              <span className={`px-3 py-1 rounded-lg text-xs font-bold ${typeBadge.class}`}>
                {typeBadge.label}
              </span>
              <span className={`px-3 py-1 rounded-lg text-xs font-bold ${priorityBadge.class}`}>
                {priorityBadge.label}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canUpdateClaim && (
            <Link
              href={`/claims/${claim.id}/edit`}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white font-bold transition-colors flex items-center gap-2"
            >
              <Edit size={18} />
              <span>Sửa</span>
            </Link>
          )}
          {canDeleteClaim && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-xl text-red-400 font-bold transition-colors flex items-center gap-2"
            >
              <Trash2 size={18} />
              <span>Xóa</span>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          {/* Claim Details */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 space-y-6">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <FileText size={20} />
              Thông tin chi tiết
            </h2>

            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase mb-2">Mã claim</p>
                <p className="text-lg font-black text-white">{claim.claimCode}</p>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-400 uppercase mb-2">Mô tả</p>
                <p className="text-sm text-slate-300 whitespace-pre-wrap">{claim.description}</p>
              </div>

              {claim.resolution && (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-2">Giải pháp/Phương án xử lý</p>
                  <p className="text-sm text-slate-300 whitespace-pre-wrap">{claim.resolution}</p>
                </div>
              )}

              {claim.notes && (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-2">Ghi chú</p>
                  <p className="text-sm text-slate-300 whitespace-pre-wrap">{claim.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Financial Information */}
          {(claim.requestedAmount || claim.approvedAmount) && (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 space-y-4">
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <DollarSign size={20} />
                Thông tin tài chính
              </h2>

              <div className="grid grid-cols-2 gap-4">
                {claim.requestedAmount && (
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase mb-2">Số tiền yêu cầu</p>
                    <p className="text-lg font-black text-white">{formatVND(claim.requestedAmount)}</p>
                  </div>
                )}
                {claim.approvedAmount && (
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase mb-2">Số tiền được duyệt</p>
                    <p className="text-lg font-black text-emerald-400">{formatVND(claim.approvedAmount)}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Info */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 space-y-4">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <User size={18} />
              Khách hàng
            </h2>

            <div className="space-y-3">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Tên</p>
                <p className="text-sm font-bold text-white">{claim.customerName}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Số điện thoại</p>
                <p className="text-sm font-bold text-white">{claim.customerPhone}</p>
              </div>
              {claim.customerEmail && (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Email</p>
                  <p className="text-sm font-bold text-white">{claim.customerEmail}</p>
                </div>
              )}
            </div>
          </div>

          {/* Related Info */}
          {(claim.vehicleCode || claim.contractCode) && (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 space-y-4">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Car size={18} />
                Thông tin liên quan
              </h2>

              <div className="space-y-3">
                {claim.vehicleCode && (
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Xe</p>
                    <p className="text-sm font-bold text-white">{claim.vehicleCode}</p>
                  </div>
                )}
                {claim.contractCode && (
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Hợp đồng</p>
                    <p className="text-sm font-bold text-white">{claim.contractCode}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 space-y-4">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Calendar size={18} />
              Thời gian
            </h2>

            <div className="space-y-3">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Ngày báo cáo</p>
                <p className="text-sm font-bold text-white">{formatDate(claim.reportedDate)}</p>
              </div>
              {claim.dueDate && (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Ngày hạn xử lý</p>
                  <p className="text-sm font-bold text-white">{formatDate(claim.dueDate)}</p>
                </div>
              )}
              {claim.resolvedDate && (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Ngày giải quyết</p>
                  <p className="text-sm font-bold text-emerald-400">{formatDate(claim.resolvedDate)}</p>
                </div>
              )}
              {claim.closedDate && (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Ngày đóng</p>
                  <p className="text-sm font-bold text-slate-400">{formatDate(claim.closedDate)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Assignment */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 space-y-4">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <UserCircle size={18} />
              Phân công
            </h2>

            <div className="space-y-3">
              {claim.assignedToName && (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Giao cho</p>
                  <p className="text-sm font-bold text-white">{claim.assignedToName}</p>
                </div>
              )}
              {claim.createdByName && (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Người tạo</p>
                  <p className="text-sm font-bold text-white">{claim.createdByName}</p>
                </div>
              )}
              {claim.resolvedByName && (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Người giải quyết</p>
                  <p className="text-sm font-bold text-emerald-400">{claim.resolvedByName}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[300] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-10 py-6 border-b border-slate-100 flex justify-between items-center bg-red-50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
                  <AlertCircle className="text-red-600" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">Xác nhận xóa hồ sơ claim</h2>
                  <p className="text-sm text-slate-500 mt-1">Hành động này không thể hoàn tác</p>
                </div>
              </div>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 hover:text-slate-900 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-10 space-y-6">
              <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6">
                <p className="text-sm font-bold text-red-900 mb-2">
                  Bạn có chắc chắn muốn xóa hồ sơ claim này?
                </p>
                <div className="space-y-2 text-sm">
                  <p className="text-slate-700">
                    <span className="font-bold">Mã claim:</span> {claim.claimCode}
                  </p>
                  <p className="text-slate-700">
                    <span className="font-bold">Tiêu đề:</span> {claim.title}
                  </p>
                </div>
              </div>

              {deleteError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-sm text-red-900 font-bold">{deleteError}</p>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 px-6 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Đang xóa...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={18} />
                      <span>Xóa</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
