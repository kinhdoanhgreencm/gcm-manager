'use client'

import { useParams } from 'next/navigation';
import { ClaimDetailPage } from '@/components/ClaimDetailPage';

export default function ClaimPage() {
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
  
  return <ClaimDetailPage claimId={id} />;
}
