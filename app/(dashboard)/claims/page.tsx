import { Suspense } from 'react';
import { Claims } from '@/components/Claims';

export default function ClaimsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="text-slate-500">Đang tải...</div></div>}>
      <Claims />
    </Suspense>
  );
}

