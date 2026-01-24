'use client'

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import Image from 'next/image';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await signIn(username, password);

    if (error) {
      setError(error.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
      setLoading(false);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4 relative">
      <div className="absolute inset-0 z-0">
        <Image 
          src="/nenlogin.png" 
          alt="Background" 
          fill
          className="object-cover"
          priority
          quality={90}
        />
        {/* Overlay layer để tăng độ tương phản và dễ đọc */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/30 via-black/20 to-black/30"></div>
        <div className="absolute inset-0 bg-slate-900/10"></div>
      </div>
      
      <div className="w-full max-w-md relative z-10">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-3xl shadow-2xl mb-6 transform hover:scale-105 transition-transform p-2">
            <Image 
              src="/logocanthogf.png" 
              alt="Cần Thơ GF Logo" 
              width={64} 
              height={64}
              className="object-contain"
            />
          </div>
          <h1 className="text-3xl font-black text-white mb-2 drop-shadow-lg">
            Cần Thơ GF Manager
          </h1>
          <p className="text-white/90 font-medium drop-shadow-md">
            Hệ thống vận hành doanh nghiệp công khai minh bạch
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200/50 p-8">
          <h2 className="text-2xl font-black text-slate-900 mb-6 text-center">
            Đăng nhập
          </h2>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
              <AlertCircle size={20} className="text-red-600 flex-shrink-0" />
              <p className="text-sm font-bold text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username/Email Input */}
            <div>
              <label className="block text-sm font-black text-slate-700 mb-2">
                Tên đăng nhập hoặc Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="username hoặc email@example.com"
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-medium focus:ring-2 focus:ring-[#00d26a]/20 focus:border-[#00d26a]/30 transition-all"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-black text-slate-700 mb-2">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full pl-12 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-medium focus:ring-2 focus:ring-[#00d26a]/20 focus:border-[#00d26a]/30 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 focus:outline-none"
                >
                  {showPassword ? 'Ẩn' : 'Hiện'}
                </button>
              </div>

              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() =>
                    alert('Nếu bạn quên mật khẩu, vui lòng liên hệ quản trị hệ thống để được hỗ trợ đặt lại.')
                  }
                  className="text-xs font-semibold text-slate-500 hover:text-[#00d26a] hover:underline transition-colors"
                >
                  Quên mật khẩu?
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-[#00d26a] to-emerald-600 text-white font-black rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>Đang đăng nhập...</span>
                </>
              ) : (
                <span>Đăng nhập</span>
              )}
            </button>
          </form>

        </div>

        {/* Demo Credentials Hint */}
        <div className="mt-6 text-center">
          <p className="text-xs text-white/80 font-medium drop-shadow-sm">
            Sử dụng tên đăng nhập hoặc email để đăng nhập
          </p>
        </div>
      </div>
    </div>
  );
};

