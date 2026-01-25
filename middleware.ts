import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const userAgent = request.headers.get('user-agent') || '';
  
  // Danh sách các pattern để phát hiện thiết bị di động
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

  // Kiểm tra xem có phải thiết bị di động không
  const isMobile = mobilePatterns.some(pattern => pattern.test(userAgent));

  // Nếu là thiết bị di động và không phải trang thông báo chặn, chuyển hướng đến trang chặn
  if (isMobile && !request.nextUrl.pathname.startsWith('/mobile-blocked')) {
    return NextResponse.redirect(new URL('/mobile-blocked', request.url));
  }

  return NextResponse.next();
}

// Cấu hình middleware để chạy trên tất cả các routes trừ static files
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
