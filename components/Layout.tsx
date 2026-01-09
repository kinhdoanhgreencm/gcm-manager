'use client'

import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
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
  UserCheck,
  Menu,
  ChevronLeft,
  CarFront
} from 'lucide-react';

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const pathname = usePathname();

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
        } bg-[#0f172a] flex flex-col fixed h-full z-[100] shadow-2xl transition-all duration-300 ease-in-out`}
      >
        {/* New Logo Section based on the image provided */}
        <div className={`flex items-center gap-4 mb-12 ${isSidebarOpen ? 'px-2' : 'justify-center'}`}>
          <div className="relative flex items-center justify-center shrink-0">
             <CarFront 
               size={isSidebarOpen ? 36 : 28} 
               className="text-[#00d26a]" 
               strokeWidth={2}
             />
          </div>
          {isSidebarOpen && (
            <div className="animate-in fade-in slide-in-from-left-2 duration-500">
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
        </div>
      </aside>

      <main 
        className={`flex-1 ${
          isSidebarOpen ? 'ml-72' : 'ml-20'
        } p-10 relative transition-all duration-300 ease-in-out`}
      >
        <header className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-500 hover:text-[#00d26a] hover:border-[#00d26a]/30 transition-all shadow-sm group"
            >
              {isSidebarOpen ? <ChevronLeft size={24} className="group-hover:-translate-x-0.5 transition-transform" /> : <Menu size={24} className="group-hover:scale-110 transition-transform" />}
            </button>
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                {menuItems.find(i => i.id === activeTab)?.label}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 rounded-full bg-[#00d26a] animate-pulse"></div>
                <p className="text-slate-500 text-sm font-semibold">Kết nối VinFast V-Hub ổn định</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
             <div className="hidden xl:flex bg-white border border-slate-200 rounded-2xl px-5 py-3 items-center gap-3 shadow-sm">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Showroom:</span>
               <span className="text-sm font-bold text-slate-900">GCM Miền Nam</span>
             </div>
             <div className="flex items-center gap-3 bg-white p-1.5 pr-5 rounded-2xl border border-slate-200 shadow-sm">
               <img 
                 src="https://picsum.photos/seed/vinfast/48/48" 
                 className="w-10 h-10 rounded-xl shadow-inner"
                 alt="User"
               />
               <div className="hidden sm:block text-left">
                 <p className="text-xs font-black text-slate-900 leading-none">Sử Duy Linh</p>
                 <p className="text-[10px] font-bold text-[#00d26a] uppercase mt-1">Tổng Giám Đốc</p>
               </div>
             </div>
          </div>
        </header>

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>
      </main>
    </div>
  );
};
