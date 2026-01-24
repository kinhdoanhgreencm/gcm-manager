'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Plus, X, Loader2, AlertCircle } from 'lucide-react';
import { VoucherType, ChartOfAccount, AccountingEntry, AccountType } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const supabase = null as any;

export const VoucherFormPage: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();

  const [voucherType, setVoucherType] = useState<VoucherType>(VoucherType.RECEIPT);
  const [voucherDate, setVoucherDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [entries, setEntries] = useState<Array<{
    accountId: string;
    accountCode?: string;
    accountName?: string;
    debitAmount: number;
    creditAmount: number;
    description: string;
  }>>([
    { accountId: '', debitAmount: 0, creditAmount: 0, description: '' },
    { accountId: '', debitAmount: 0, creditAmount: 0, description: '' }
  ]);
  
  const [chartOfAccounts, setChartOfAccounts] = useState<ChartOfAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadChartOfAccounts();
  }, []);

  const loadChartOfAccounts = async () => {
    try {
      const response = await fetch('/api/accounting/chart-of-accounts', { cache: 'no-store' });
      const result = await response.json();

      if (!response.ok) throw new Error(result?.error || 'Lỗi tải tài khoản kế toán');

      const transformedAccounts: ChartOfAccount[] = (result.accounts || []).map((acc: any) => ({
        id: acc.id,
        code: acc.code,
        name: acc.name,
        parentId: acc.parent_id,
        accountType: acc.account_type as AccountType,
        normalBalance: acc.normal_balance as 'DEBIT' | 'CREDIT',
        level: acc.level || 1,
        isActive: acc.is_active,
        description: acc.description,
        createdAt: acc.created_at,
        updatedAt: acc.updated_at
      }));

      setChartOfAccounts(transformedAccounts);
    } catch (err: any) {
      console.error('Error loading chart of accounts:', err);
    }
  };

  const addEntry = () => {
    setEntries([...entries, { accountId: '', debitAmount: 0, creditAmount: 0, description: '' }]);
  };

  const removeEntry = (index: number) => {
    if (entries.length > 2) {
      setEntries(entries.filter((_, i) => i !== index));
    }
  };

  const updateEntry = (index: number, field: string, value: any) => {
    const newEntries = [...entries];
    const entry = newEntries[index];
    
    if (field === 'accountId') {
      const account = chartOfAccounts.find(a => a.id === value);
      entry.accountId = value;
      entry.accountCode = account?.code;
      entry.accountName = account?.name;
      // Clear amounts when account changes
      entry.debitAmount = 0;
      entry.creditAmount = 0;
    } else {
      (entry as any)[field] = value;
    }

    // Ensure only one side has amount
    if (field === 'debitAmount' && value > 0) {
      entry.creditAmount = 0;
    }
    if (field === 'creditAmount' && value > 0) {
      entry.debitAmount = 0;
    }

    setEntries(newEntries);
  };

  const calculateTotal = () => {
    const totalDebit = entries.reduce((sum, e) => sum + (e.debitAmount || 0), 0);
    const totalCredit = entries.reduce((sum, e) => sum + (e.creditAmount || 0), 0);
    return { totalDebit, totalCredit, isBalanced: Math.abs(totalDebit - totalCredit) < 0.01 };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!description.trim()) {
      setError('Vui lòng nhập diễn giải');
      return;
    }

    const { totalDebit, totalCredit, isBalanced } = calculateTotal();
    if (!isBalanced) {
      setError(`Tổng Nợ (${totalDebit.toLocaleString('vi-VN')}) phải bằng Tổng Có (${totalCredit.toLocaleString('vi-VN')})`);
      return;
    }

    const validEntries = entries.filter(e => e.accountId && (e.debitAmount > 0 || e.creditAmount > 0));
    if (validEntries.length < 2) {
      setError('Cần ít nhất 2 bút toán (1 bên Nợ và 1 bên Có)');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/accounting/vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voucherType,
          voucherDate,
          description,
          notes,
          totalAmount: totalDebit,
          entries: validEntries,
          userId: user?.id || null
        })
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || 'Có lỗi xảy ra khi tạo chứng từ');
      }

      router.push('/accounting');
    } catch (err: any) {
      console.error('Error creating voucher:', err);
      setError(err.message || 'Có lỗi xảy ra khi tạo chứng từ');
    } finally {
      setIsLoading(false);
    }
  };

  const { totalDebit, totalCredit, isBalanced } = calculateTotal();

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-black text-slate-900">Tạo chứng từ kế toán</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="text-red-600" size={20} />
          <span className="text-red-700 text-sm">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-8 space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Loại chứng từ *</label>
            <select
              value={voucherType}
              onChange={(e) => setVoucherType(e.target.value as VoucherType)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              required
            >
              <option value={VoucherType.RECEIPT}>Phiếu thu</option>
              <option value={VoucherType.PAYMENT}>Phiếu chi</option>
              <option value={VoucherType.TRANSFER}>Chuyển khoản</option>
              <option value={VoucherType.JOURNAL}>Bút toán</option>
              <option value={VoucherType.SALES_INVOICE}>Hóa đơn bán hàng</option>
              <option value={VoucherType.PURCHASE_INVOICE}>Hóa đơn mua hàng</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Ngày chứng từ *</label>
            <input
              type="date"
              value={voucherDate}
              onChange={(e) => setVoucherDate(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Diễn giải *</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Nhập diễn giải chứng từ"
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            required
          />
        </div>

        {/* Entries */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <label className="block text-sm font-semibold text-slate-700">Bút toán kế toán *</label>
            <button
              type="button"
              onClick={addEntry}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <Plus size={16} />
              Thêm dòng
            </button>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-12 gap-3 text-xs font-semibold text-slate-600 pb-2 border-b">
              <div className="col-span-4">Tài khoản</div>
              <div className="col-span-2 text-right">Nợ</div>
              <div className="col-span-2 text-right">Có</div>
              <div className="col-span-3">Diễn giải</div>
              <div className="col-span-1"></div>
            </div>

            {entries.map((entry, index) => (
              <div key={index} className="grid grid-cols-12 gap-3 items-center">
                <div className="col-span-4">
                  <select
                    value={entry.accountId}
                    onChange={(e) => updateEntry(index, 'accountId', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                    required
                  >
                    <option value="">Chọn tài khoản</option>
                    {chartOfAccounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.code} - {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    value={entry.debitAmount || ''}
                    onChange={(e) => updateEntry(index, 'debitAmount', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    min="0"
                    step="1000"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 text-right"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    value={entry.creditAmount || ''}
                    onChange={(e) => updateEntry(index, 'creditAmount', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    min="0"
                    step="1000"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 text-right"
                  />
                </div>
                <div className="col-span-3">
                  <input
                    type="text"
                    value={entry.description}
                    onChange={(e) => updateEntry(index, 'description', e.target.value)}
                    placeholder="Diễn giải"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div className="col-span-1">
                  {entries.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeEntry(index)}
                      className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="mt-4 pt-4 border-t grid grid-cols-12 gap-3">
            <div className="col-span-6"></div>
            <div className="col-span-2 text-right">
              <div className="text-sm font-semibold text-slate-900">
                {formatVND(totalDebit)}
              </div>
            </div>
            <div className="col-span-2 text-right">
              <div className="text-sm font-semibold text-slate-900">
                {formatVND(totalCredit)}
              </div>
            </div>
            <div className="col-span-2">
              {!isBalanced && (
                <div className="text-xs text-red-600">Chưa cân đối</div>
              )}
              {isBalanced && totalDebit > 0 && (
                <div className="text-xs text-green-600">✓ Cân đối</div>
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Ghi chú</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div className="flex items-center justify-end gap-4 pt-4 border-t">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={isLoading || !isBalanced}
            className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                Đang lưu...
              </>
            ) : (
              <>
                <Save size={16} />
                Lưu chứng từ
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
