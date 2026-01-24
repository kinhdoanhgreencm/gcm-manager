'use client'

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { 
  LayoutDashboard, 
  Car, 
  Wallet, 
  FileText, 
  ClipboardCheck, 
  TrendingUp,
  Settings,
  ChevronRight,
  Users,
  Truck,
  Scale,
  UserCheck,
  Package,
  Tag,
  Calculator,
  X
} from 'lucide-react';
import { useSidebar } from '@/contexts/SidebarContext';
import { useAuth } from '@/contexts/AuthContext';
import { hasAnyPermission, PermissionCategories } from '@/utils/permissions';

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  isCollapsed: boolean;
  href: string;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon, label, active, isCollapsed, href }) => (
  <Link 
    href={href}
    title={isCollapsed ? label : undefined}
    className={`w-full flex items-center transition-all duration-300 group relative ${
      isCollapsed ? 'justify-center h-14' : 'gap-3 px-5 py-3.5 rounded-2xl'
    } ${
      active 
        ? (isCollapsed ? 'text-white' : 'bg-[#00d26a] text-white shadow-lg shadow-[#00d26a]/20 scale-[1.02] rounded-2xl') 
        : 'text-slate-400 hover:bg-white/5 hover:text-white rounded-2xl'
    }`}
  >
    {isCollapsed && active && (
      <div className="absolute inset-0 m-1 bg-[#00d26a] rounded-2xl shadow-lg shadow-[#00d26a]/20 animate-in zoom-in-75 duration-300"></div>
    )}

    <div className={`relative z-10 flex items-center justify-center shrink-0 ${
      active ? 'text-white' : 'text-slate-500 group-hover:text-[#00d26a]'
    }`}>
      {icon}
    </div>

    {!isCollapsed && (
      <>
        <span className="font-bold text-sm flex-1 text-left whitespace-nowrap overflow-hidden text-ellipsis animate-in fade-in slide-in-from-left-2 duration-300 min-w-0">
          {label}
        </span>
        {active && <ChevronRight size={14} className="flex-shrink-0" />}
      </>
    )}
  </Link>
);

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isSidebarOpen, setIsSidebarOpen } = useSidebar();
  const { user } = useAuth();
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);

  // Tự động scroll to top khi chuyển trang
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  // Detect screen size for responsive behavior
  useEffect(() => {
    const checkScreenSize = () => {
      const isSmallScreen = window.innerWidth < 1024;
      setIsMobile(isSmallScreen);
    };

    const isSmallScreen = window.innerWidth < 1024;
    setIsMobile(isSmallScreen);
    // Initialize sidebar state: closed on mobile/tablet, open on desktop
    if (isSmallScreen) {
      setIsSidebarOpen(false);
    }

    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, [setIsSidebarOpen]); // Include setIsSidebarOpen as dependency

  // Auto-close sidebar on mobile/tablet when navigating
  useEffect(() => {
    if (isMobile && isSidebarOpen) {
      setIsSidebarOpen(false);
    }
  }, [pathname, isMobile, isSidebarOpen, setIsSidebarOpen]); // Close when pathname changes on mobile

  // Close sidebar when clicking outside on mobile/tablet
  useEffect(() => {
    if (isMobile && isSidebarOpen) {
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!target.closest('aside') && !target.closest('button[aria-label="Toggle sidebar"]')) {
          setIsSidebarOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMobile, isSidebarOpen, setIsSidebarOpen]);

  // Define menu items with their permission checks
  const allMenuItems = [
    { id: 'dashboard', label: 'Tổng quan', icon: <LayoutDashboard size={20} />, href: '/dashboard', permissions: PermissionCategories.dashboard },
    { id: 'inventory', label: 'Kho xe', icon: <Car size={20} />, href: '/inventory', permissions: PermissionCategories.inventory },
    { id: 'suppliers', label: 'Nhà cung cấp', icon: <Truck size={20} />, href: '/suppliers', permissions: PermissionCategories.suppliers },
    { id: 'crm', label: 'Khách hàng', icon: <Users size={20} />, href: '/crm', permissions: PermissionCategories.customers },
    { id: 'staff', label: 'Nhân sự', icon: <UserCheck size={20} />, href: '/staff', permissions: PermissionCategories.staff },
    { id: 'debt', label: 'Quản lý Công nợ', icon: <Scale size={20} />, href: '/debt', permissions: PermissionCategories.debt },
    { id: 'finance', label: 'Thu chi & Dòng tiền', icon: <Wallet size={20} />, href: '/finance', permissions: PermissionCategories.finance },
    { id: 'accounting', label: 'Kế toán', icon: <Calculator size={20} />, href: '/accounting', permissions: PermissionCategories.accounting },
    { id: 'contracts', label: 'Hợp đồng', icon: <FileText size={20} />, href: '/contracts', permissions: PermissionCategories.contracts },
    { id: 'promotions', label: 'CTKM', icon: <Tag size={20} />, href: '/promotions', permissions: PermissionCategories.promotions },
    { id: 'carriers', label: 'Đơn vị vận chuyển', icon: <Package size={20} />, href: '/carriers', permissions: PermissionCategories.carriers },
    { id: 'registration', label: 'Hồ sơ đăng kiểm', icon: <ClipboardCheck size={20} />, href: '/registration', permissions: PermissionCategories.registration },
    { id: 'claims', label: 'Hồ sơ Claim', icon: <ClipboardCheck size={20} />, href: '/claims', permissions: PermissionCategories.claims },
    { id: 'reports', label: 'Báo cáo', icon: <TrendingUp size={20} />, href: '/reports', permissions: PermissionCategories.reports },
  ];

  // Filter menu items based on user permissions
  // Only show menu items that user has permission to access
  const menuItems = allMenuItems.filter(item => {
    // Dashboard should always be visible for logged-in users
    if (item.id === 'dashboard' && user) {
      return true;
    }
    
    // Staff tab chỉ dành cho Giám đốc vận hành, Giám đốc và Admin
    if (item.id === 'staff') {
      return user?.role === 'OPERATIONS_DIRECTOR' || user?.role === 'DIRECTOR' || user?.role === 'ADMIN';
    }
    
    // Debt tab (Quản lý công nợ) chỉ dành cho Giám đốc vận hành, Giám đốc và Admin
    if (item.id === 'debt') {
      return user?.role === 'OPERATIONS_DIRECTOR' || user?.role === 'DIRECTOR' || user?.role === 'ADMIN';
    }
    
    // If user doesn't exist or has no permissions, hide other items
    if (!user || !user.permissions) {
      return false;
    }
    
    // Check if user has any permission in the required category
    return hasAnyPermission(user.permissions, item.permissions);
  });

  const activeTab = menuItems.find(item => pathname.startsWith(item.href))?.id || 'dashboard';

  return (
    <div className="flex min-h-screen">
      {/* Overlay for mobile/tablet when sidebar is open */}
      {isMobile && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[90] lg:hidden transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside 
        className={`${
          isSidebarOpen ? 'w-72 p-6' : 'w-20 p-3'
        } bg-[#0f172a] flex flex-col fixed top-0 left-0 h-screen z-[100] shadow-2xl transition-all duration-300 ease-in-out overflow-x-hidden overflow-y-auto ${
          isMobile && !isSidebarOpen ? '-translate-x-full lg:translate-x-0' : ''
        }`}
      >
        {/* Close button for mobile/tablet */}
        {isMobile && isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors lg:hidden"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        )}
        {/* Logo */}
        <div className={`mb-4 md:mb-6 lg:mb-8 ${isSidebarOpen ? 'px-2' : 'flex justify-center'} flex-shrink-0 overflow-hidden`}>
          <Link href="/dashboard" className="flex items-center gap-3 group min-w-0">
            <div className={`${isSidebarOpen ? 'w-12 h-12' : 'w-10 h-10'} bg-white rounded-2xl flex items-center justify-center p-0.5 shadow-lg group-hover:scale-105 transition-transform flex-shrink-0`}>
              <Image 
                src="/favicon.png" 
                alt="GCM Logo" 
                width={isSidebarOpen ? 48 : 40} 
                height={isSidebarOpen ? 48 : 40}
                className="object-contain"
              />
            </div>
            {isSidebarOpen && (
              <div className="flex flex-col min-w-0">
                <span className="text-white font-black text-lg leading-tight truncate">Cần Thơ GF</span>
                <span className="text-slate-400 text-xs font-medium truncate">VinFast Dealer</span>
              </div>
            )}
          </Link>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden min-w-0">
          {menuItems.map(item => (
            <SidebarItem 
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={pathname.startsWith(item.href)}
              isCollapsed={!isSidebarOpen}
              href={item.href}
            />
          ))}
        </nav>

        <div className={`mt-4 md:mt-6 lg:mt-8 pt-4 md:pt-6 lg:pt-8 border-t border-white/5 ${isSidebarOpen ? '' : 'flex justify-center'} flex-shrink-0 overflow-hidden`}>
          <button 
            className={`flex items-center gap-3 text-slate-500 hover:text-white transition-colors font-bold text-sm min-w-0 ${
              !isSidebarOpen ? 'justify-center p-0 h-12 w-12 hover:bg-white/5 rounded-2xl' : 'w-full px-5 py-3'
            }`}
          >
            <Settings size={20} className="flex-shrink-0" />
            {isSidebarOpen && <span className="truncate">Cấu hình</span>}
          </button>
          {isSidebarOpen && (
            <div className="mt-6 pt-6 border-t border-white/5 text-center">
              <p className="text-xs text-slate-400 font-semibold mb-2">
                Developed by <span className="text-slate-300">KTDev</span>
              </p>
              <p className="text-xs text-slate-600 font-medium">Version 1.0</p>
            </div>
          )}
        </div>
      </aside>

      <main 
        className={`flex-1 ${
          // Desktop: always show margin based on sidebar state
          isSidebarOpen ? 'lg:ml-72' : 'lg:ml-20'
          // Mobile/Tablet: no margin (sidebar is overlay)
        } ml-0 p-4 md:p-6 lg:p-10 relative transition-all duration-300 ease-in-out`}
        style={{
          backgroundImage: 'url(/nenlogin.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed'
        }}
      >
        {/* Overlay đen mờ */}
        <div className="absolute inset-0 bg-black/40 pointer-events-none"></div>
        
        <div className="relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>
      </main>
    </div>
  );
};
