'use client'

import React from 'react';
import { Smartphone, Monitor, AlertTriangle } from 'lucide-react';
import Image from 'next/image';

export default function MobileBlockedPage() {
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
        <div className="absolute inset-0 bg-gradient-to-br from-black/30 via-black/20 to-black/30"></div>
        <div className="absolute inset-0 bg-slate-900/10"></div>
      </div>
      
      <div className="w-full max-w-lg relative z-10">
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200/50 p-8 md:p-10 text-center">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl"></div>
              <div className="relative bg-red-50 p-6 rounded-full">
                <AlertTriangle className="w-16 h-16 text-red-500" />
              </div>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-black text-slate-900 mb-4">
            Truy cập bị chặn
          </h1>

          {/* Message */}
          <p className="text-slate-600 text-lg mb-8 leading-relaxed">
            Ứng dụng này chỉ hỗ trợ truy cập từ <span className="font-bold text-slate-900">máy tính</span>.
            Vui lòng sử dụng máy tính để bàn hoặc laptop để tiếp tục.
          </p>

          {/* Device Icons */}
          <div className="flex items-center justify-center gap-6 mb-8">
            <div className="flex flex-col items-center gap-2">
              <div className="bg-red-50 p-4 rounded-2xl border-2 border-red-200">
                <Smartphone className="w-8 h-8 text-red-500" />
              </div>
              <span className="text-sm font-semibold text-slate-500">Điện thoại</span>
              <span className="text-xs text-red-500 font-bold">Không hỗ trợ</span>
            </div>
            
            <div className="text-slate-300 text-2xl">→</div>
            
            <div className="flex flex-col items-center gap-2">
              <div className="bg-green-50 p-4 rounded-2xl border-2 border-green-200">
                <Monitor className="w-8 h-8 text-green-500" />
              </div>
              <span className="text-sm font-semibold text-slate-500">Máy tính</span>
              <span className="text-xs text-green-500 font-bold">Được hỗ trợ</span>
            </div>
          </div>

          {/* Additional Info */}
          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
            <p className="text-sm text-slate-600 leading-relaxed">
              <strong className="text-slate-900">Lý do:</strong> Ứng dụng được tối ưu hóa cho màn hình lớn và yêu cầu các tính năng chỉ có trên máy tính để đảm bảo trải nghiệm tốt nhất.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
