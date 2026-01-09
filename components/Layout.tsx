'use client'

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
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
  UserCheck
} from 'lucide-react';
import { useSidebar } from '@/contexts/SidebarContext';

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
        <span className="font-bold text-sm flex-1 text-left whitespace-nowrap overflow-hidden animate-in fade-in slide-in-from-left-2 duration-300">
          {label}
        </span>
        {active && <ChevronRight size={14} />}
      </>
    )}
  </Link>
);

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isSidebarOpen, setIsSidebarOpen } = useSidebar();
  const pathname = usePathname();

  // Tự động scroll to top khi chuyển trang
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  const menuItems = [
    { id: 'dashboard', label: 'Tổng quan', icon: <LayoutDashboard size={20} />, href: '/dashboard' },
    { id: 'inventory', label: 'Kho xe', icon: <Car size={20} />, href: '/inventory' },
    { id: 'suppliers', label: 'Nhà cung cấp', icon: <Truck size={20} />, href: '/suppliers' },
    { id: 'crm', label: 'Khách hàng', icon: <Users size={20} />, href: '/crm' },
    { id: 'staff', label: 'Nhân sự & Phân quyền', icon: <UserCheck size={20} />, href: '/staff' },
    { id: 'debt', label: 'Quản lý Công nợ', icon: <Scale size={20} />, href: '/debt' },
    { id: 'finance', label: 'Thu chi & Dòng tiền', icon: <Wallet size={20} />, href: '/finance' },
    { id: 'contracts', label: 'Hợp đồng', icon: <FileText size={20} />, href: '/contracts' },
    { id: 'registration', label: 'Hồ sơ pháp lý', icon: <ClipboardCheck size={20} />, href: '/registration' },
    { id: 'reports', label: 'Báo cáo', icon: <TrendingUp size={20} />, href: '/reports' },
  ];

  const activeTab = menuItems.find(item => pathname.startsWith(item.href))?.id || 'dashboard';

  return (
    <div className="flex min-h-screen">
      <aside 
        className={`${
          isSidebarOpen ? 'w-72 p-6' : 'w-20 p-3'
        } bg-[#0f172a] flex flex-col fixed top-0 left-0 h-screen z-[100] shadow-2xl transition-all duration-300 ease-in-out`}
      >
        {/* New Logo Section */}
        <div className={`flex items-center justify-center mb-12 ${isSidebarOpen ? 'px-2' : ''}`}>
          {isSidebarOpen && (
            <div className="animate-in fade-in slide-in-from-left-2 duration-500 text-center">
              <h1 className="text-2xl font-black tracking-tighter text-white leading-none">GCM</h1>
              <p className="text-[8px] font-black text-[#00d26a] uppercase tracking-[0.2em] mt-1 whitespace-nowrap">All About Cars</p>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto pr-1 custom-scrollbar">
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

        <div className={`mt-8 pt-8 border-t border-white/5 ${isSidebarOpen ? '' : 'flex justify-center'}`}>
          <button 
            className={`flex items-center gap-3 text-slate-500 hover:text-white transition-colors font-bold text-sm ${
              !isSidebarOpen ? 'justify-center p-0 h-12 w-12 hover:bg-white/5 rounded-2xl' : 'w-full px-5 py-3'
            }`}
          >
            <Settings size={20} />
            {isSidebarOpen && <span>Cấu hình</span>}
          </button>
          {isSidebarOpen && (
            <div className="mt-6 pt-6 border-t border-white/5 text-center">
              <p className="text-xs text-slate-400 font-semibold mb-2">
                Developed by <span className="text-slate-300">Trần Quang Khái</span>
              </p>
              <p className="text-xs text-slate-600 font-medium">Version 1.0</p>
            </div>
          )}
        </div>
      </aside>

      <main 
        className={`flex-1 ${
          isSidebarOpen ? 'ml-72' : 'ml-20'
        } p-10 relative transition-all duration-300 ease-in-out`}
      >
        <div className="mb-10">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              {menuItems.find(i => i.id === activeTab)?.label}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-2 h-2 rounded-full bg-[#00d26a] animate-pulse"></div>
              <p className="text-slate-500 text-sm font-semibold">Hiểu xe – Hiểu thị trường – Hiểu khách hàng.</p>
            </div>
          </div>
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>
      </main>
    </div>
  );
};
