'use client'

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { ChangePasswordModal } from '@/components/ChangePasswordModal';
import { Loader2, Lock } from 'lucide-react';

export default function ChangePasswordPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (!loading && user && !user.must_change_password) {
      // Nếu không cần đổi mật khẩu, redirect về dashboard
      router.push('/dashboard');
    } else if (!loading && user && user.must_change_password && !showModal) {
      // Hiển thị modal khi user cần đổi mật khẩu
      setShowModal(true);
    }
  }, [user, loading, router, showModal]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-[#00d26a] mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!user.must_change_password) {
    return null;
  }

  const handlePasswordChanged = () => {
    // Modal đã refresh user data, check lại user để redirect
    setShowModal(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <ChangePasswordModal 
        isOpen={showModal}
        onClose={handlePasswordChanged}
        isRequired={true}
      />
    </div>
  );
}
