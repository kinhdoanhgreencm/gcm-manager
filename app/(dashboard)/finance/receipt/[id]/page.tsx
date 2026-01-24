'use client'

import { useParams } from 'next/navigation';
import { ReceiptDetailPage } from '@/components/ReceiptDetailPage';

export default function ReceiptPage() {
  const params = useParams();
  const id = params?.id as string;
  
  if (!id) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-slate-500">Đang tải...</p>
        </div>
      </div>
    );
  }
  
  return <ReceiptDetailPage transactionId={id} />;
}

