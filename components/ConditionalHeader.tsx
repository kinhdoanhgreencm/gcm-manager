'use client'

import { usePathname } from 'next/navigation';
import { Header } from './Header';

export function ConditionalHeader() {
  const pathname = usePathname();
  
  // Không hiển thị Header trên trang login
  if (pathname === '/login') {
    return null;
  }
  
  return <Header />;
}

