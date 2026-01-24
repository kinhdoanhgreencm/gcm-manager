'use client'

import { useRouter } from 'next/navigation';
import { ShieldAlert, AlertCircle } from 'lucide-react';

interface AccessDeniedProps {
  message?: string;
  redirectTo?: string;
  icon?: 'shield' | 'alert';
}

export function AccessDenied({ 
  message = 'Bạn không có quyền truy cập vào trang này. Vui lòng liên hệ quản trị viên để được cấp quyền.',
  redirectTo = '/dashboard',
  icon = 'shield'
}: AccessDeniedProps) {
  const router = useRouter();
  const IconComponent = icon === 'shield' ? ShieldAlert : AlertCircle;

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="bg-white/80 backdrop-blur-md rounded-[40px] border border-white p-20 text-center shadow-xl max-w-md">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
          <IconComponent size={40} className="text-red-500" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-3">Không có quyền truy cập</h2>
        <p className="text-slate-600 font-medium mb-8">
          {message}
        </p>
        <button
          onClick={() => router.push(redirectTo)}
          className="px-8 py-3 bg-blue-600 text-white rounded-2xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg"
        >
          Về trang tổng quan
        </button>
      </div>
    </div>
  );
}
