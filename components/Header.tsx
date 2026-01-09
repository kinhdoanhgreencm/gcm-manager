'use client'

import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, Search, Settings, LogOut, 
  User, ChevronDown, Menu, X,
  CarFront, Sun, Moon, ChevronLeft, Check
} from 'lucide-react';
import { useSidebar } from '@/contexts/SidebarContext';
import { useAuth } from '@/contexts/AuthContext';

export const Header: React.FC = () => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set());
  const { isSidebarOpen, setIsSidebarOpen } = useSidebar();
  const { user, signOut } = useAuth();
  const notificationsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Mock notifications data
  const notifications = [
    { id: '1', title: 'Hợp đồng mới cần duyệt', time: '5 phút trước' },
    { id: '2', title: 'Xe mới đã nhập kho', time: '1 giờ trước' },
    { id: '3', title: 'Thanh toán công nợ sắp đến hạn', time: '2 giờ trước' },
  ];

  // Handle click outside for notifications
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showNotifications || showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications, showUserMenu]);

  const markAsRead = (notificationId: string) => {
    setReadNotifications(prev => new Set([...prev, notificationId]));
  };

  // Không hiển thị header nếu chưa đăng nhập
  if (!user) {
    return null;
  }

  return (
    <header 
      className="sticky top-0 z-[110] bg-white/80 backdrop-blur-lg border-b border-slate-200/50 shadow-sm transition-all duration-300"
      style={{ 
        marginLeft: isSidebarOpen ? '288px' : '80px',
        width: isSidebarOpen ? 'calc(100% - 288px)' : 'calc(100% - 80px)'
      }}
    >
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left Section - Sidebar Toggle & Search */}
          <div className="flex items-center gap-6 flex-1">
            {/* Sidebar Toggle Button */}
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-500 hover:text-[#00d26a] hover:border-[#00d26a]/30 transition-all shadow-sm group"
            >
              {isSidebarOpen ? (
                <ChevronLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
              ) : (
                <Menu size={20} className="group-hover:scale-110 transition-transform" />
              )}
            </button>

            {/* Search Bar */}
            <div className="hidden md:flex relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Tìm kiếm nhanh..."
                className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-medium focus:ring-2 focus:ring-[#00d26a]/20 focus:border-[#00d26a]/30 transition-all"
              />
            </div>
          </div>

          {/* Right Section - Actions & User */}
          <div className="flex items-center gap-3">
            {/* Showroom Info */}
            <div className="hidden xl:flex bg-white border border-slate-200 rounded-2xl px-5 py-2.5 items-center gap-3 shadow-sm">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Showroom:</span>
              <span className="text-sm font-bold text-slate-900">GCM & Cần Thơ GF</span>
            </div>

            {/* Notifications */}
            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2.5 hover:bg-slate-100 rounded-2xl transition-colors text-slate-600 hover:text-[#00d26a]"
              >
                <Bell size={20} />
                {notifications.filter(n => !readNotifications.has(n.id)).length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-4 border-b border-slate-100 bg-slate-50">
                    <h3 className="text-sm font-black text-slate-900">Thông báo</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.map((notification, index) => {
                      const isRead = readNotifications.has(notification.id);
                      return (
                        <div 
                          key={notification.id}
                          className={`p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                            index === notifications.length - 1 ? 'border-b-0' : ''
                          } ${isRead ? 'bg-slate-50/50' : ''}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <p className={`text-sm font-bold ${isRead ? 'text-slate-600' : 'text-slate-900'}`}>
                                {notification.title}
                              </p>
                              <p className="text-xs text-slate-500 mt-1">{notification.time}</p>
                            </div>
                            {!isRead && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(notification.id);
                                }}
                                className="flex-shrink-0 p-1.5 hover:bg-[#00d26a]/10 rounded-lg transition-colors group"
                                title="Đánh dấu đã đọc"
                              >
                                <Check size={16} className="text-slate-400 group-hover:text-[#00d26a] transition-colors" />
                              </button>
                            )}
                            {isRead && (
                              <div className="flex-shrink-0 p-1.5">
                                <Check size={16} className="text-[#00d26a]" />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="p-3 border-t border-slate-100 bg-slate-50 text-center">
                    <button className="text-xs font-bold text-[#00d26a] hover:text-emerald-600">
                      Xem tất cả
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-3 px-3 py-2 hover:bg-slate-100 rounded-2xl transition-colors"
              >
                <div className="relative">
                  <img 
                    src={user?.avatar_url || "https://picsum.photos/seed/vinfast/40/40"} 
                    className="w-10 h-10 rounded-xl shadow-inner border-2 border-slate-200"
                    alt="User"
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#00d26a] rounded-full border-2 border-white"></div>
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-black text-slate-900 leading-none">
                    {user?.full_name || 'User'}
                  </p>
                  <p className="text-[10px] font-bold text-[#00d26a] uppercase mt-0.5">
                    {user?.role === 'MANAGER' ? 'Quản lý' : 
                     user?.role === 'SALES' ? 'Kinh doanh' :
                     user?.role === 'ACCOUNTANT' ? 'Kế toán' :
                     user?.role === 'INVENTORY' ? 'Kho' :
                     user?.role === 'LEGAL' ? 'Hồ sơ' : user?.role || 'User'}
                  </p>
                </div>
                <ChevronDown 
                  size={16} 
                  className={`text-slate-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`}
                />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-4 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <img 
                          src={user?.avatar_url || "https://picsum.photos/seed/vinfast/48/48"} 
                          className="w-12 h-12 rounded-xl shadow-inner"
                          alt="User"
                        />
                        <div>
                          <p className="text-sm font-black text-slate-900">
                            {user?.full_name || 'User'}
                          </p>
                          <p className="text-xs text-slate-500 font-medium">
                            {user?.email || 'No email'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="p-2">
                      <button className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 rounded-2xl transition-colors text-left">
                        <User size={18} className="text-slate-600" />
                        <span className="text-sm font-bold text-slate-700">Hồ sơ của tôi</span>
                      </button>
                      <button className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 rounded-2xl transition-colors text-left">
                        <Settings size={18} className="text-slate-600" />
                        <span className="text-sm font-bold text-slate-700">Cài đặt</span>
                      </button>
                      <button 
                        onClick={() => setIsDarkMode(!isDarkMode)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 rounded-2xl transition-colors text-left group"
                      >
                        {isDarkMode ? (
                          <Sun size={20} className="text-amber-500 group-hover:text-amber-600 transition-colors" />
                        ) : (
                          <Moon size={20} className="text-slate-600 group-hover:text-slate-700 transition-colors" />
                        )}
                        <span className="text-sm font-bold text-slate-700">
                          {isDarkMode ? 'Chế độ sáng' : 'Chế độ tối'}
                        </span>
                      </button>
                    </div>
                    <div className="p-2 border-t border-slate-100">
                      <button 
                        onClick={signOut}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 rounded-2xl transition-colors text-left text-red-600"
                      >
                        <LogOut size={18} />
                        <span className="text-sm font-bold">Đăng xuất</span>
                      </button>
                    </div>
                  </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

