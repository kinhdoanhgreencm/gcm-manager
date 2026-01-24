'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Banknote, Calendar, Tag, CreditCard,
  Building, FileText, Download, Eye, CheckCircle2, Receipt, X, Landmark, Trash2, AlertCircle
} from 'lucide-react';
import { TransactionType, TransactionCategory, TransactionStatus, Transaction, Account, Supplier } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { hasAnyPermission } from '@/utils/permissions';

interface ReceiptDetailPageProps {
  transactionId: string;
}

export const ReceiptDetailPage: React.FC<ReceiptDetailPageProps> = ({ transactionId }) => {
  const router = useRouter();
  const { user } = useAuth();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Format datetime to "hh:mm dd/mm/yyyy"
  const formatDateTime = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${hours}:${minutes} ${day}/${month}/${year}`;
  };

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // Get payment method display text
  const getPaymentMethodText = (method: 'CASH' | 'BANK_TRANSFER' | 'E_WALLET'): string => {
    switch (method) {
      case 'CASH':
        return 'Tiền mặt tại quỹ';
      case 'BANK_TRANSFER':
        return 'Chuyển khoản ngân hàng';
      case 'E_WALLET':
        return 'Ví điện tử / Khác';
      default:
        return '-- Chưa chọn tài khoản --';
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      setSupplier(null);

      try {
        const accountsResponse = await fetch('/api/finance/accounts?status=ACTIVE', { cache: 'no-store' });
        const accountsResult = await accountsResponse.json();

        if (!accountsResponse.ok) {
          console.error('Error loading accounts:', accountsResult?.error || 'Unknown error');
        } else {
          const formattedAccounts: Account[] = (accountsResult.accounts || []).map((acc: any) => ({
            id: acc.id,
            name: acc.name,
            type: acc.type as 'CASH' | 'BANK' | 'E_WALLET',
            bankName: acc.bank_name,
            accountNumber: acc.account_number,
            balance: Number(acc.balance)
          }));
          setAccounts(formattedAccounts);
        }

        const transactionResponse = await fetch(`/api/finance/transactions/${transactionId}?includeSupplier=1`, { cache: 'no-store' });
        const transactionResult = await transactionResponse.json();

        if (!transactionResponse.ok) {
          console.error('Error loading transaction:', transactionResult?.error || 'Unknown error');
          setError('Không tìm thấy phiếu thu hoặc có lỗi xảy ra');
        } else if (transactionResult?.transaction) {
          const transactionData = transactionResult.transaction;
          const trans: Transaction = {
            id: transactionData.id,
            date: transactionData.date,
            amount: Number(transactionData.amount),
            type: transactionData.type as TransactionType,
            category: transactionData.category as TransactionCategory,
            description: transactionData.description,
            accountId: transactionData.account_id,
            toAccountId: transactionData.to_account_id,
            referenceId: transactionData.reference_id,
            referenceType: transactionData.reference_type as any,
            paymentMethod: transactionData.payment_method as any,
            status: transactionData.status as TransactionStatus,
            creatorId: transactionData.creator_id,
            approverId: transactionData.approver_id,
            attachments: transactionData.attachments,
            approvedAt: transactionData.approved_at,
            createdAt: transactionData.created_at
          };
          setTransaction(trans);

          if (transactionResult?.supplier) {
            const supplierData = transactionResult.supplier;
            const supplierInfo: Supplier = {
              id: supplierData.id,
              code: supplierData.code,
              name: supplierData.name,
              type: 'OEM' as any,
              phone: '',
              address: '',
              paymentTerms: 'DEFERRED',
              assignedStaffId: '',
              status: 'ACTIVE' as any,
              createdAt: '',
              totalVehicles: 0,
              totalImportValue: 0,
              debt: 0,
              bankName: supplierData.bank_name,
              bankAccount: supplierData.bank_account
            };
            setSupplier(supplierInfo);
          }
        }
      } catch (err: any) {
        console.error('Error loading data:', err);
        setError(err.message || 'Có lỗi xảy ra khi tải dữ liệu');
      } finally {
        setIsLoading(false);
      }
    };

    if (transactionId) {
      loadData();
    }
  }, [transactionId]);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Check if user has permission to delete transactions
  const canDeleteTransaction = hasAnyPermission(user?.permissions, ['financeDelete']);

  // Check if transaction can be deleted (only DRAFT or PENDING status)
  const canDelete = transaction && canDeleteTransaction && 
    (transaction.status === TransactionStatus.DRAFT || transaction.status === TransactionStatus.PENDING);

  // Handle delete transaction
  const handleDeleteTransaction = async () => {
    if (!transaction || !canDelete) {
      setDeleteError('Không thể xóa phiếu thu/chi này. Chỉ có thể xóa phiếu ở trạng thái Nháp hoặc Chờ duyệt.');
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const response = await fetch(`/api/finance/transactions/${transaction.id}`, {
        method: 'DELETE'
      });
      const result = await response.json();

      if (!response.ok) {
        console.error('Error deleting transaction:', result?.error || 'Unknown error');
        throw new Error(result?.error || 'Có lỗi xảy ra khi xóa phiếu thu/chi');
      }

      router.push('/finance');
    } catch (err: any) {
      console.error('Error deleting transaction:', err);
      setDeleteError(err.message || 'Có lỗi xảy ra khi xóa phiếu thu/chi');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-500">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="bg-white rounded-[40px] shadow-2xl overflow-hidden p-10">
          <div className="text-center py-12">
            <div className="text-rose-500 mb-4">
              <Receipt size={48} className="mx-auto" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">Không tìm thấy phiếu thu</h3>
            <p className="text-slate-500 mb-6">{error || 'Phiếu thu không tồn tại hoặc đã bị xóa'}</p>
            <button
              onClick={() => router.back()}
              className="px-6 py-3 bg-blue-600 text-white rounded-2xl text-sm font-bold hover:bg-blue-700 transition-all"
            >
              Quay lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  const account = accounts.find(a => a.id === transaction.accountId);
  const transactionDate = transaction.date ? new Date(transaction.date + 'T00:00:00') : new Date();
  const displayDate = transaction.createdAt 
    ? formatDateTime(new Date(transaction.createdAt))
    : formatDateTime(transactionDate);

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
                {transaction.type === TransactionType.INCOME ? 'Chi tiết phiếu THU' : 'Chi tiết phiếu CHI'}
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Xem lại thông tin và chứng từ thanh toán
              </p>
            </div>
          </div>
        </div>

        <div className="p-10 space-y-8">
          {/* Header Info - Compact */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Amount - Compact */}
            <div className="md:col-span-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                Số tiền giao dịch
              </label>
              <div className="relative">
                <div className={`absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-xl z-10 ${
                  transaction.type === TransactionType.INCOME ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                }`}>
                  <Banknote size={18} />
                </div>
                <div className={`pl-14 pr-12 py-4 rounded-2xl text-2xl font-black ${
                  transaction.type === TransactionType.INCOME ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                }`}>
                  {new Intl.NumberFormat('vi-VN').format(transaction.amount)}
                </div>
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl font-black text-slate-400 pointer-events-none">
                  đ
                </span>
              </div>
            </div>

            {/* Status & Date - Compact */}
            <div className="md:col-span-2 grid grid-cols-2 gap-4">
              {transaction.status === TransactionStatus.APPROVED && (
                <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Trạng thái</p>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    <p className="text-sm font-black text-emerald-600">Đã hoàn tất</p>
                  </div>
                </div>
              )}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ngày hạch toán</p>
                <p className="text-sm font-bold text-slate-700 font-mono">{displayDate}</p>
              </div>
            </div>
          </div>

          {/* Transaction Details - Compact Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Account */}
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {transaction.type === TransactionType.INCOME ? 'Tài khoản thu' : 'Tài khoản chi'}
              </label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <div className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700">
                  {account?.name || 'N/A'}
                </div>
              </div>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Danh mục thu chi</label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <div className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700">
                  {transaction.category}
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Phương thức thanh toán</label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <div className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700">
                  {getPaymentMethodText(transaction.paymentMethod)}
                </div>
              </div>
            </div>

            {/* Description - Full width */}
            <div className="md:col-span-3 space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Nội dung chi tiết giao dịch</label>
              <div className="w-full p-4 rounded-2xl text-sm font-medium bg-slate-50 border border-slate-200 text-slate-700">
                {transaction.description || 'Không có mô tả'}
              </div>
            </div>

            {/* Supplier Bank Information */}
            {supplier && (supplier.bankName || supplier.bankAccount) && (
              <div className="md:col-span-3 space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Thông tin ngân hàng nhà cung cấp</label>
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 space-y-4">
                  {supplier.bankName && (
                    <div className="flex items-center gap-3">
                      <Landmark className="text-blue-600 flex-shrink-0" size={18} />
                      <div className="flex-1">
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Tên ngân hàng</p>
                        <p className="text-sm font-bold text-slate-900">{supplier.bankName}</p>
                      </div>
                    </div>
                  )}
                  {supplier.bankAccount && (
                    <div className="flex items-center gap-3">
                      <CreditCard className="text-blue-600 flex-shrink-0" size={18} />
                      <div className="flex-1">
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Số tài khoản</p>
                        <p className="text-sm font-bold text-slate-900 font-mono">{supplier.bankAccount}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Chi tiết phiếu thu đã hoàn tất thanh toán */}
          {transaction.status === TransactionStatus.APPROVED && (
            <div className="mt-8 pt-8 border-t-2 border-slate-200">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 size={18} className="text-emerald-600" />
                <h4 className="text-base font-black text-slate-900">Chi tiết phiếu thu đã hoàn tất</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Mã phiếu thu</p>
                  <p className="text-sm font-black text-slate-900 font-mono">#{transaction.id.substring(0, 8).toUpperCase()}</p>
                </div>
                {transaction.approvedAt && (
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Thời gian hoàn tất</p>
                    <p className="text-xs font-bold text-slate-700">
                      {new Date(transaction.approvedAt).toLocaleString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                )}
                
                {/* Chứng từ đã upload - Compact */}
                {transaction.attachments && transaction.attachments.length > 0 && (
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText size={14} className="text-slate-600" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Chứng từ ({transaction.attachments.length})
                      </p>
                    </div>
                    <div className="space-y-2">
                      {transaction.attachments.map((url, index) => {
                        const fileName = url.split('/').pop() || `Chứng từ ${index + 1}`;
                        const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
                        return (
                          <div key={index} className="flex items-center justify-between gap-2 bg-white rounded-lg p-2 border border-slate-200">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <FileText size={12} className="text-slate-400 flex-shrink-0" />
                              <p className="text-xs font-bold text-slate-700 truncate">{fileName}</p>
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              {isImage ? (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setSelectedImage(url);
                                  }}
                                  className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                                  title="Xem"
                                >
                                  <Eye size={12} />
                                </button>
                              ) : (
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                                  title="Xem"
                                >
                                  <Eye size={12} />
                                </a>
                              )}
                              <a
                                href={url}
                                download
                                className="p-1.5 bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100 transition-colors"
                                title="Tải"
                              >
                                <Download size={12} />
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-10 py-8 bg-slate-50 border-t border-slate-100 flex justify-between items-center gap-4">
          {canDeleteTransaction && (
            <button 
              onClick={() => {
                if (canDelete) {
                  setShowDeleteModal(true);
                } else {
                  alert('Chỉ có thể xóa phiếu thu/chi ở trạng thái Nháp hoặc Chờ duyệt.');
                }
              }}
              disabled={!canDelete}
              className={`px-6 py-3 rounded-2xl text-sm font-bold transition-all flex items-center gap-2 ${
                canDelete
                  ? 'bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100'
                  : 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Trash2 size={18} />
              Xóa phiếu thu/chi
            </button>
          )}
          <div className="flex gap-4 ml-auto">
            <button 
              onClick={() => router.back()} 
              className="px-8 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all"
            >
              Quay lại
            </button>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[150] p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-4xl max-h-[90vh] w-full flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-black text-slate-900">Xem chứng từ</h3>
              <button
                onClick={() => setSelectedImage(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-slate-600" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-50">
              <img
                src={selectedImage}
                alt="Chứng từ"
                className="max-w-full max-h-[calc(90vh-120px)] object-contain rounded-lg"
              />
            </div>
            <div className="p-4 border-t border-slate-200 flex justify-end gap-3">
              <a
                href={selectedImage}
                download
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors"
              >
                <Download size={16} /> Tải xuống
              </a>
              <button
                onClick={() => setSelectedImage(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && transaction && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl max-w-md w-full p-8 animate-in zoom-in-95 duration-300">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center">
                <AlertCircle className="text-rose-600" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">Xác nhận xóa phiếu thu/chi</h3>
                <p className="text-sm text-slate-500 mt-1">Hành động này không thể hoàn tác</p>
              </div>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 mb-6 border border-slate-200">
              <p className="text-sm font-bold text-slate-700 mb-2">Phiếu thu/chi sẽ bị xóa:</p>
              <p className="text-base font-black text-slate-900">
                {transaction.type === TransactionType.INCOME ? 'Phiếu THU' : 'Phiếu CHI'}
              </p>
              <p className="text-sm text-slate-600 mt-1">{transaction.description || 'Không có mô tả'}</p>
              <p className="text-sm font-bold text-slate-700 mt-2">
                Số tiền: {formatVND(transaction.amount)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Trạng thái: {transaction.status === TransactionStatus.DRAFT ? 'Nháp' : transaction.status === TransactionStatus.PENDING ? 'Chờ duyệt' : transaction.status}
              </p>
            </div>
            {deleteError && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
                <p className="text-sm font-bold text-red-900">{deleteError}</p>
              </div>
            )}
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteError(null);
                }}
                disabled={isDeleting}
                className="flex-1 px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl text-sm font-bold hover:bg-slate-100 transition-all disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                onClick={handleDeleteTransaction}
                disabled={isDeleting || !canDelete}
                className="flex-1 px-6 py-3 bg-rose-600 text-white rounded-2xl text-sm font-black hover:bg-rose-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Đang xóa...
                  </>
                ) : (
                  <>
                    <Trash2 size={18} /> Xóa phiếu thu/chi
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

