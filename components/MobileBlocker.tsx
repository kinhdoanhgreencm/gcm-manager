'use client'

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export function MobileBlocker() {
  const [isMobile, setIsMobile] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Kiểm tra User-Agent
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    
    const mobilePatterns = [
      /Android/i,
      /webOS/i,
      /iPhone/i,
      /iPad/i,
      /iPod/i,
      /BlackBerry/i,
      /Windows Phone/i,
      /Mobile/i,
      /Opera Mini/i,
      /IEMobile/i,
    ];

    const isMobileDevice = mobilePatterns.some(pattern => pattern.test(userAgent));
    
    // Nếu là mobile và không phải trang mobile-blocked, chuyển hướng
    if (isMobileDevice && !pathname.startsWith('/mobile-blocked')) {
      setIsMobile(true);
      router.push('/mobile-blocked');
    } else {
      setIsMobile(false);
    }
    
    setIsChecking(false);
  }, [pathname, router]);

  // Không render gì nếu đang kiểm tra hoặc không phải mobile
  if (isChecking || !isMobile) {
    return null;
  }

  return null; // Redirect đã được xử lý trong useEffect
}
