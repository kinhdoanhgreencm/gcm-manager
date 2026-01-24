import React from 'react';
import { CheckCircle2, Link2, Clock, FileText, PackageCheck } from 'lucide-react';

export type VehicleTransactionStatusConfig = {
  label: string;
  color: string;
  icon: React.ReactNode;
};

/**
 * Map vehicles.transaction_status (text) -> badge config (label/color/icon)
 * Keep this in one place to ensure consistent UI across pages.
 */
export function getVehicleTransactionStatusConfig(status?: string | null): VehicleTransactionStatusConfig {
  const normalized = (status || '').trim();

  switch (normalized) {
    case 'Sẵn sàng giao dịch':
      return { label: 'Sẵn sàng giao dịch', color: 'bg-emerald-50 text-emerald-700', icon: <CheckCircle2 size={12} /> };
    case 'Đã ghép':
      return { label: 'Đã ghép', color: 'bg-purple-50 text-purple-700', icon: <Link2 size={12} /> };
    case 'Đã cọc':
      return { label: 'Đã cọc', color: 'bg-amber-50 text-amber-700', icon: <Clock size={12} /> };
    case 'Đã xuất hóa đơn':
      return { label: 'Đã xuất hóa đơn', color: 'bg-blue-50 text-blue-700', icon: <FileText size={12} /> };
    case 'Đã giao xe':
    case 'Đã bàn giao':
      return { label: normalized, color: 'bg-slate-100 text-slate-700', icon: <PackageCheck size={12} /> };
    default:
      // fall back to default "ready" styling, but keep the provided text if any
      return {
        label: normalized || 'Sẵn sàng giao dịch',
        color: 'bg-emerald-50 text-emerald-700',
        icon: <CheckCircle2 size={12} />,
      };
  }
}


