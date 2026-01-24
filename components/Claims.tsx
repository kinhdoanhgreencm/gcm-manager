'use client'

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  FileText, Plus, Search, Filter,
  User, Phone, Calendar, ShieldCheck,
  CheckCircle2, XCircle, AlertCircle,
  ArrowRightLeft, Printer, MoreHorizontal,
  Car, CreditCard, ChevronRight, DollarSign,
  GanttChartSquare, Info, ArrowLeft, Clock,
  Receipt, Landmark, ChevronDown, UserCircle,
  CheckCircle, Trash2, X, Eye, Edit, Mail,
  TrendingUp, TrendingDown, AlertTriangle
} from 'lucide-react';
import { Claim, ClaimStatus, ClaimType, ClaimPriority } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useReload } from '@/contexts/ReloadContext';
import { hasAnyPermission, hasPermission, PermissionCategories } from '@/utils/permissions';
import { AccessDenied } from './AccessDenied';

export const Claims: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { reloadKey } = useReload();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ClaimStatus | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<ClaimType | 'ALL'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<ClaimPriority | 'ALL'>('ALL');
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingClaim, setDeletingClaim] = useState<Claim | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Read search param from URL on mount
  useEffect(() => {
    const searchQuery = searchParams.get('search');
    if (searchQuery) {
      setSearch(searchQuery);
    }
  }, [searchParams]);

  // Fetch claims from database
  useEffect(() => {
    fetchClaims();
  }, [reloadKey]);

  const fetchClaims = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user) {
        setError('Vui lòng đăng nhập để xem hồ sơ claim');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/claims', { cache: 'no-store' });
      const result = await response.json();

      if (!response.ok) {
        console.error('❌ Error fetching claims:', result?.error || 'Unknown error');
        setError('Có lỗi xảy ra khi tải dữ liệu hồ sơ claim');
        return;
      }

      setClaims(result.claims || []);
    } catch (err: any) {
      console.error('❌ Error fetching claims:', err);
      setError('Có lỗi xảy ra khi tải dữ liệu hồ sơ claim');
    } finally {
      setLoading(false);
    }
  };

  // Filter claims based on search and filters
  const filteredClaims = useMemo(() => {
    return claims.filter(claim => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch = 
          claim.claimCode.toLowerCase().includes(searchLower) ||
          claim.customerName.toLowerCase().includes(searchLower) ||
          claim.customerPhone.includes(search) ||
          claim.title.toLowerCase().includes(searchLower) ||
          (claim.vehicleCode && claim.vehicleCode.toLowerCase().includes(searchLower)) ||
          (claim.contractCode && claim.contractCode.toLowerCase().includes(searchLower));
        
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter !== 'ALL' && claim.status !== statusFilter) {
        return false;
      }

      // Type filter
      if (typeFilter !== 'ALL' && claim.type !== typeFilter) {
        return false;
      }

      // Priority filter
      if (priorityFilter !== 'ALL' && claim.priority !== priorityFilter) {
        return false;
      }

      return true;
    });
  }, [claims, search, statusFilter, typeFilter, priorityFilter]);

  // Format currency
  const formatVND = (amount: number | undefined) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  };

  // Get status badge
  const getStatusBadge = (status: ClaimStatus) => {
    switch (status) {
      case ClaimStatus.PENDING:
        return { label: 'Chờ xử lý', class: 'bg-orange-100 text-orange-600', icon: <Clock size={14} /> };
      case ClaimStatus.IN_PROGRESS:
        return { label: 'Đang xử lý', class: 'bg-blue-100 text-blue-600', icon: <GanttChartSquare size={14} /> };
      case ClaimStatus.RESOLVED:
        return { label: 'Đã giải quyết', class: 'bg-emerald-100 text-emerald-600', icon: <CheckCircle2 size={14} /> };
      case ClaimStatus.REJECTED:
        return { label: 'Từ chối', class: 'bg-red-100 text-red-600', icon: <XCircle size={14} /> };
      case ClaimStatus.CLOSED:
        return { label: 'Đã đóng', class: 'bg-slate-100 text-slate-600', icon: <CheckCircle size={14} /> };
      default:
        return { label: status, class: 'bg-slate-100 text-slate-600', icon: <FileText size={14} /> };
    }
  };

  // Get type badge
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

  // Get priority badge
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

  // Check permissions
  const hasClaimsPermissions = hasAnyPermission(user?.permissions, PermissionCategories.claims);
  const canCreateClaim = hasPermission(user?.permissions, 'claimsCreate');
  const canUpdateClaim = hasPermission(user?.permissions, 'claimsUpdate');
  const canDeleteClaim = hasPermission(user?.permissions, 'claimsDelete');
  const canReadClaim = hasPermission(user?.permissions, 'claimsRead');

  // Handle delete
  const handleDelete = async (claim: Claim) => {
    if (!canDeleteClaim) {
      setDeleteError('Bạn không có quyền xóa hồ sơ claim. Vui lòng liên hệ quản trị viên để được cấp quyền.');
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const response = await fetch(`/api/claims/${claim.id}`, { method: 'DELETE' });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || 'Có lỗi xảy ra khi xóa hồ sơ claim');
      }

      // Refresh list
      fetchClaims();
      setDeletingClaim(null);
    } catch (error: any) {
      console.error('Error deleting claim:', error);
      setDeleteError(error.message || 'Có lỗi xảy ra khi xóa hồ sơ claim');
    } finally {
      setIsDeleting(false);
    }
  };

  // Show access denied if no permissions
  if (!hasClaimsPermissions) {
    return <AccessDenied message="Bạn không có quyền truy cập module Hồ sơ Claim. Vui lòng liên hệ quản trị viên để được cấp quyền." />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00d26a] mx-auto mb-4"></div>
          <p className="text-slate-500 font-medium">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="text-red-600" size={20} />
          <p className="text-red-900 font-bold">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-white mb-2">Hồ sơ Claim</h1>
          <p className="text-slate-300/80 text-sm">Quản lý các hồ sơ khiếu nại, bảo hành và yêu cầu của khách hàng</p>
        </div>
        {canCreateClaim && (
          <Link
            href="/claims/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#00d26a] text-white font-bold rounded-2xl hover:bg-[#00b85a] transition-all shadow-lg shadow-[#00d26a]/20"
          >
            <Plus size={20} />
            <span>Tạo hồ sơ claim mới</span>
          </Link>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
          <p className="text-xs font-bold text-slate-400 uppercase mb-1">Tổng số</p>
          <p className="text-2xl font-black text-white">{claims.length}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
          <p className="text-xs font-bold text-slate-400 uppercase mb-1">Chờ xử lý</p>
          <p className="text-2xl font-black text-orange-400">
            {claims.filter(c => c.status === ClaimStatus.PENDING).length}
          </p>
        </div>
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
          <p className="text-xs font-bold text-slate-400 uppercase mb-1">Đang xử lý</p>
          <p className="text-2xl font-black text-blue-400">
            {claims.filter(c => c.status === ClaimStatus.IN_PROGRESS).length}
          </p>
        </div>
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
          <p className="text-xs font-bold text-slate-400 uppercase mb-1">Đã giải quyết</p>
          <p className="text-2xl font-black text-emerald-400">
            {claims.filter(c => c.status === ClaimStatus.RESOLVED).length}
          </p>
        </div>
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
          <p className="text-xs font-bold text-slate-400 uppercase mb-1">Khẩn cấp</p>
          <p className="text-2xl font-black text-red-400">
            {claims.filter(c => c.priority === ClaimPriority.URGENT).length}
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Tìm kiếm theo mã, tên khách hàng, số điện thoại, tiêu đề..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00d26a] focus:border-transparent"
            />
          </div>
        </div>

        {/* Filter buttons */}
        <div className="flex flex-wrap gap-2">
          {/* Status filter */}
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-400" />
            <span className="text-sm font-bold text-slate-300">Trạng thái:</span>
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-[#00d26a] text-white'
                  : 'bg-white/10 text-slate-300 hover:bg-white/20'
              }`}
            >
              Tất cả
            </button>
            {Object.values(ClaimStatus).map((status) => {
              const badge = getStatusBadge(status);
              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    statusFilter === status
                      ? badge.class + ' ring-2 ring-offset-2 ring-offset-slate-900'
                      : 'bg-white/10 text-slate-300 hover:bg-white/20'
                  }`}
                >
                  {badge.label}
                </button>
              );
            })}
          </div>

          {/* Type filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-300">Loại:</span>
            <button
              onClick={() => setTypeFilter('ALL')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                typeFilter === 'ALL'
                  ? 'bg-[#00d26a] text-white'
                  : 'bg-white/10 text-slate-300 hover:bg-white/20'
              }`}
            >
              Tất cả
            </button>
            {Object.values(ClaimType).map((type) => {
              const badge = getTypeBadge(type);
              return (
                <button
                  key={type}
                  onClick={() => setTypeFilter(type)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    typeFilter === type
                      ? badge.class + ' ring-2 ring-offset-2 ring-offset-slate-900'
                      : 'bg-white/10 text-slate-300 hover:bg-white/20'
                  }`}
                >
                  {badge.label}
                </button>
              );
            })}
          </div>

          {/* Priority filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-300">Độ ưu tiên:</span>
            <button
              onClick={() => setPriorityFilter('ALL')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                priorityFilter === 'ALL'
                  ? 'bg-[#00d26a] text-white'
                  : 'bg-white/10 text-slate-300 hover:bg-white/20'
              }`}
            >
              Tất cả
            </button>
            {Object.values(ClaimPriority).map((priority) => {
              const badge = getPriorityBadge(priority);
              return (
                <button
                  key={priority}
                  onClick={() => setPriorityFilter(priority)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    priorityFilter === priority
                      ? badge.class + ' ring-2 ring-offset-2 ring-offset-slate-900'
                      : 'bg-white/10 text-slate-300 hover:bg-white/20'
                  }`}
                >
                  {badge.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Claims List */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden">
        {filteredClaims.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="mx-auto text-slate-400 mb-4" size={48} />
            <p className="text-slate-300 font-bold text-lg mb-2">Không tìm thấy hồ sơ claim nào</p>
            <p className="text-slate-400 text-sm">
              {search || statusFilter !== 'ALL' || typeFilter !== 'ALL' || priorityFilter !== 'ALL'
                ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm'
                : canCreateClaim
                ? 'Bắt đầu tạo hồ sơ claim mới'
                : 'Liên hệ quản trị viên để được cấp quyền tạo hồ sơ claim'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {filteredClaims.map((claim) => {
              const statusBadge = getStatusBadge(claim.status);
              const typeBadge = getTypeBadge(claim.type);
              const priorityBadge = getPriorityBadge(claim.priority);

              return (
                <div
                  key={claim.id}
                  className="p-6 hover:bg-white/5 transition-colors group"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    {/* Left: Claim Info */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-black text-white">{claim.title}</h3>
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
                          <p className="text-sm text-slate-300 mb-3 line-clamp-2">{claim.description}</p>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                            <div>
                              <p className="text-slate-400 font-semibold mb-1">Mã claim</p>
                              <p className="text-white font-bold">{claim.claimCode}</p>
                            </div>
                            <div>
                              <p className="text-slate-400 font-semibold mb-1">Khách hàng</p>
                              <p className="text-white font-bold">{claim.customerName}</p>
                              <p className="text-slate-400">{claim.customerPhone}</p>
                            </div>
                            {claim.vehicleCode && (
                              <div>
                                <p className="text-slate-400 font-semibold mb-1">Xe</p>
                                <p className="text-white font-bold">{claim.vehicleCode}</p>
                              </div>
                            )}
                            {claim.contractCode && (
                              <div>
                                <p className="text-slate-400 font-semibold mb-1">Hợp đồng</p>
                                <p className="text-white font-bold">{claim.contractCode}</p>
                              </div>
                            )}
                          </div>

                          {claim.requestedAmount && (
                            <div className="mt-3 flex items-center gap-2">
                              <DollarSign size={14} className="text-slate-400" />
                              <span className="text-xs text-slate-400">Yêu cầu:</span>
                              <span className="text-sm font-bold text-white">{formatVND(claim.requestedAmount)}</span>
                              {claim.approvedAmount && (
                                <>
                                  <ChevronRight size={14} className="text-slate-400" />
                                  <span className="text-xs text-slate-400">Duyệt:</span>
                                  <span className="text-sm font-bold text-emerald-400">{formatVND(claim.approvedAmount)}</span>
                                </>
                              )}
                            </div>
                          )}

                          <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                            <span className="flex items-center gap-1.5">
                              <Calendar size={14} />
                              Báo cáo: {formatDate(claim.reportedDate)}
                            </span>
                            {claim.dueDate && (
                              <span className="flex items-center gap-1.5">
                                <Clock size={14} />
                                Hạn: {formatDate(claim.dueDate)}
                              </span>
                            )}
                            {claim.assignedToName && (
                              <span className="flex items-center gap-1.5">
                                <User size={14} />
                                Giao cho: {claim.assignedToName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2">
                      {canReadClaim && (
                        <Link
                          href={`/claims/${claim.id}`}
                          className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors"
                          title="Xem chi tiết"
                        >
                          <Eye size={18} />
                        </Link>
                      )}
                      {canUpdateClaim && (
                        <Link
                          href={`/claims/${claim.id}/edit`}
                          className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors"
                          title="Sửa"
                        >
                          <Edit size={18} />
                        </Link>
                      )}
                      {canDeleteClaim && (
                        <button
                          onClick={() => setDeletingClaim(claim)}
                          className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-xl text-red-400 transition-colors"
                          title="Xóa"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deletingClaim && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[300] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Header */}
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
                onClick={() => setDeletingClaim(null)}
                disabled={isDeleting}
                className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 hover:text-slate-900 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-10 space-y-6">
              <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6">
                <p className="text-sm font-bold text-red-900 mb-2">
                  Bạn có chắc chắn muốn xóa hồ sơ claim này?
                </p>
                <div className="space-y-2 text-sm">
                  <p className="text-slate-700">
                    <span className="font-bold">Mã claim:</span> {deletingClaim.claimCode}
                  </p>
                  <p className="text-slate-700">
                    <span className="font-bold">Tiêu đề:</span> {deletingClaim.title}
                  </p>
                  <p className="text-slate-700">
                    <span className="font-bold">Khách hàng:</span> {deletingClaim.customerName}
                  </p>
                </div>
              </div>

              {deleteError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-sm text-red-900 font-bold">{deleteError}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-4">
                <button
                  onClick={() => setDeletingClaim(null)}
                  disabled={isDeleting}
                  className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  onClick={() => handleDelete(deletingClaim)}
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
