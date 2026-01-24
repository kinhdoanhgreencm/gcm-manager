'use client'

import { useParams } from 'next/navigation';
import { ClaimEditPage } from '@/components/ClaimEditPage';

export default function EditClaimPage() {
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
  
  return <ClaimEditPage claimId={id} />;
}
