import { Suspense } from 'react';
import { Contracts } from '@/components/Contracts';

export default function ContractsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="text-slate-500">Đang tải...</div></div>}>
      <Contracts />
    </Suspense>
  );
}

