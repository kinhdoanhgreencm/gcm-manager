'use client'

import React, { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Bell, Settings, LogOut, 
  User, ChevronDown, Menu, X,
  CarFront, Sun, Moon, ChevronLeft, Check,
  LayoutDashboard, 
  Car, 
  Wallet, 
  FileText, 
  ClipboardCheck, 
  TrendingUp,
  Users,
  Truck,
  Scale,
  UserCheck,
  Package,
  Tag,
  Lock,
  RefreshCw
} from 'lucide-react';
import { useSidebar } from '@/contexts/SidebarContext';
import { useAuth } from '@/contexts/AuthContext';
import { useReload } from '@/contexts/ReloadContext';
import { ChangePasswordModal } from '@/components/ChangePasswordModal';
import { notificationService } from '@/services/notificationService';

export const Header: React.FC = () => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set());
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const { isSidebarOpen, setIsSidebarOpen } = useSidebar();
  const { user, signOut } = useAuth();
  const { triggerReload, isReloading } = useReload();
  const pathname = usePathname();
  const router = useRouter();
  const notificationsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const userMenuDropdownRef = useRef<HTMLDivElement>(null);

  const menuItems = [
    { id: 'dashboard', label: 'Tổng quan', icon: <LayoutDashboard size={20} />, href: '/dashboard' },
    { id: 'inventory', label: 'Kho xe', icon: <Car size={20} />, href: '/inventory' },
    { id: 'suppliers', label: 'Nhà cung cấp', icon: <Truck size={20} />, href: '/suppliers' },
    { id: 'crm', label: 'Khách hàng', icon: <Users size={20} />, href: '/crm' },
    { id: 'staff', label: 'Nhân sự', icon: <UserCheck size={20} />, href: '/staff' },
    { id: 'debt', label: 'Quản lý Công nợ', icon: <Scale size={20} />, href: '/debt' },
    { id: 'finance', label: 'Thu chi & Dòng tiền', icon: <Wallet size={20} />, href: '/finance' },
    { id: 'contracts', label: 'Hợp đồng', icon: <FileText size={20} />, href: '/contracts' },
    { id: 'promotions', label: 'CTKM', icon: <Tag size={20} />, href: '/promotions' },
    { id: 'carriers', label: 'Đơn vị vận chuyển', icon: <Package size={20} />, href: '/carriers' },
    { id: 'registration', label: 'Hồ sơ đăng kiểm', icon: <ClipboardCheck size={20} />, href: '/registration' },
    { id: 'reports', label: 'Báo cáo', icon: <TrendingUp size={20} />, href: '/reports' },
  ];

  const activeTab = menuItems.find(item => pathname.startsWith(item.href))?.id || 'dashboard';
  const currentPageLabel = menuItems.find(i => i.id === activeTab)?.label || 'Tổng quan';

  // Fetch notifications from database
  useEffect(() => {
    if (!user?.id) return;

    const fetchNotifications = async () => {
      setIsLoadingNotifications(true);
      try {
        const data = await notificationService.getNotifications(user.id, 20);
        setNotifications(data || []);
        
        // Lấy read notifications từ database - đảm bảo đồng bộ với database
        const readIds = new Set<string>(
          (data || [])
            .filter((n: any) => n.is_read === true)
            .map((n: any) => n.id as string)
        );
        setReadNotifications(readIds);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setIsLoadingNotifications(false);
      }
    };

    fetchNotifications();

    // Polling mỗi 30 giây để cập nhật thông báo mới
    const interval = setInterval(fetchNotifications, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [user?.id]);

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

  // Ensure dropdown stays within viewport bounds
  useEffect(() => {
    if (showUserMenu && userMenuDropdownRef.current && userMenuRef.current) {
      const dropdown = userMenuDropdownRef.current;
      const button = userMenuRef.current;
      const rect = button.getBoundingClientRect();
      const dropdownRect = dropdown.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Reset any previous adjustments
      dropdown.style.right = '';
      dropdown.style.left = '';

      // Check if dropdown overflows on the right
      if (rect.right - dropdownRect.width < 0) {
        // If dropdown would overflow on left, align to left edge of button
        dropdown.style.left = '0';
        dropdown.style.right = 'auto';
      } else if (dropdownRect.right > viewportWidth) {
        // If dropdown overflows on right, adjust right position
        const overflow = dropdownRect.right - viewportWidth;
        dropdown.style.right = `-${overflow + 8}px`;
      }

      // Check if dropdown overflows on bottom
      if (dropdownRect.bottom > viewportHeight) {
        // Flip to top if there's more space
        if (rect.top > viewportHeight - dropdownRect.height) {
          dropdown.style.bottom = '100%';
          dropdown.style.top = 'auto';
          dropdown.style.marginBottom = '0.5rem';
          dropdown.style.marginTop = '0';
        }
      }
    }
  }, [showUserMenu]);

  const markAsRead = async (notificationId: string) => {
    if (!user?.id) return;
    
    // Optimistic update: Cập nhật UI ngay lập tức
    const now = new Date().toISOString();
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId
          ? { ...n, is_read: true, read_at: now }
          : n
      )
    );
    
    setReadNotifications(prev => new Set([...prev, notificationId]));
    
    // Gọi API để cập nhật database
    try {
      await notificationService.markAsRead(notificationId, user.id);
      
      // Sau khi API thành công, fetch lại để đảm bảo đồng bộ với database
      // (Có thể bỏ qua nếu real-time subscription hoạt động tốt)
      const data = await notificationService.getNotifications(user.id, 20);
      if (data) {
        setNotifications(data);
        const readIds = new Set<string>(
          data
            .filter((n: any) => n.is_read === true)
            .map((n: any) => n.id as string)
        );
        setReadNotifications(readIds);
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      // Nếu API thất bại, revert lại UI (hoặc giữ optimistic update)
      // Ở đây chúng ta giữ optimistic update để UX tốt hơn
      // Database sẽ được sync khi fetch lại
    }
  };

  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    if (!dateString) return 'Vừa xong';
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Vừa xong';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} phút trước`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} giờ trước`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} ngày trước`;
    
    // Format date if older than a week
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Không hiển thị header nếu chưa đăng nhập
  if (!user) {
    return null;
  }

  return (
    <header 
      className={`sticky top-0 z-[110] bg-white/80 backdrop-blur-lg border-b border-slate-200/50 shadow-sm transition-all duration-300 ${
        // Desktop: margin based on sidebar state
        isSidebarOpen ? 'lg:ml-72' : 'lg:ml-20'
        // Mobile/Tablet: no margin (sidebar is overlay)
      } ml-0 w-full lg:w-auto ${
        isSidebarOpen ? 'lg:w-[calc(100%-288px)]' : 'lg:w-[calc(100%-80px)]'
      }`}
    >
      <div className="px-4 md:px-5 lg:px-6 py-3 md:py-3.5 lg:py-4">
        {/* Top Row - Title & Actions */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-4 mb-3 md:mb-4">
          {/* Left - Sidebar Toggle & Page Title */}
          <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0 w-full md:w-auto">
            {/* Sidebar Toggle Button */}
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="flex-shrink-0 p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-[#00d26a] hover:border-[#00d26a]/30 transition-all shadow-sm group"
            >
              {isSidebarOpen ? (
                <ChevronLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
              ) : (
                <Menu size={18} className="group-hover:scale-110 transition-transform" />
              )}
            </button>

            {/* Page Title & Description */}
            <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
              <div className="min-w-0">
                <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight truncate">
                  {currentPageLabel}
                </h2>
                <div className="hidden md:flex items-center gap-2 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#00d26a] animate-pulse flex-shrink-0"></div>
                  <p className="text-slate-500 text-xs font-medium truncate">Hiểu xe – Hiểu thị trường – Hiểu khách hàng.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right - Showroom, Reload, Notifications & User */}
          <div className="flex items-center gap-2 md:gap-3 flex-shrink-0 w-full md:w-auto justify-end">
            {/* Showroom Info */}
            <div className="hidden xl:flex bg-white border border-slate-200 rounded-xl px-3 md:px-4 py-2 items-center gap-2 md:gap-2.5 shadow-sm">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Showroom:</span>
              <span className="text-xs font-bold text-slate-900 whitespace-nowrap">Cần Thơ GF</span>
            </div>

            {/* Reload Button */}
            <button
              onClick={triggerReload}
              disabled={isReloading}
              className="relative p-2 md:p-2.5 hover:bg-slate-100 rounded-xl transition-colors text-slate-600 hover:text-[#00d26a] disabled:opacity-50 disabled:cursor-not-allowed"
              title="Làm mới dữ liệu"
            >
              <RefreshCw 
                size={18} 
                className={`transition-transform duration-500 ${isReloading ? 'animate-spin' : ''}`}
              />
            </button>

            {/* Notifications */}
            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 md:p-2.5 hover:bg-slate-100 rounded-xl transition-colors text-slate-600 hover:text-[#00d26a]"
              >
                <Bell size={18} />
                {notifications.filter(n => !n.is_read && !readNotifications.has(n.id)).length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-72 md:w-80 bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-4 border-b border-slate-100 bg-slate-50">
                    <h3 className="text-sm font-black text-slate-900">Thông báo</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {isLoadingNotifications ? (
                      <div className="p-8 text-center">
                        <RefreshCw size={20} className="animate-spin text-slate-400 mx-auto mb-2" />
                        <p className="text-xs text-slate-500">Đang tải thông báo...</p>
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <Bell size={24} className="text-slate-300 mx-auto mb-2" />
                        <p className="text-xs text-slate-500">Không có thông báo nào</p>
                      </div>
                    ) : (
                      notifications.map((notification, index) => {
                        // Kiểm tra trạng thái đã đọc: ưu tiên từ database (is_read), sau đó mới đến local state
                        const isRead = notification.is_read === true || readNotifications.has(notification.id);
                        return (
                          <div 
                            key={notification.id}
                            onClick={() => {
                              if (notification.action_url) {
                                router.push(notification.action_url);
                                setShowNotifications(false);
                              }
                              if (!isRead) {
                                markAsRead(notification.id);
                              }
                            }}
                            className={`p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer ${
                              index === notifications.length - 1 ? 'border-b-0' : ''
                            } ${isRead ? 'bg-slate-50/50' : 'bg-white'}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-bold ${isRead ? 'text-slate-600' : 'text-slate-900'}`}>
                                  {notification.title}
                                </p>
                                {notification.message && (
                                  <p 
                                    className={`text-xs mt-1 ${isRead ? 'text-slate-400' : 'text-slate-600'}`}
                                    style={{
                                      display: '-webkit-box',
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: 'vertical',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      lineHeight: '1.4'
                                    }}
                                  >
                                    {(() => {
                                      const cleanMessage = notification.message.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
                                      return cleanMessage.length > 60 
                                        ? cleanMessage.substring(0, 60) + '...'
                                        : cleanMessage;
                                    })()}
                                  </p>
                                )}
                                <p className="text-xs text-slate-500 mt-1">
                                  {formatTimeAgo(notification.created_at)}
                                </p>
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
                      })
                    )}
                  </div>
                  <div className="p-3 border-t border-slate-100 bg-slate-50 text-center">
                    <button 
                      onClick={() => {
                        router.push('/notifications');
                        setShowNotifications(false);
                      }}
                      className="text-xs font-bold text-[#00d26a] hover:text-emerald-600 transition-colors"
                    >
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
                className="flex items-center gap-2 md:gap-2.5 px-2 md:px-2.5 py-1.5 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <div className="relative">
                  <img 
                    src={user?.avatar_url || "https://picsum.photos/seed/vinfast/40/40"} 
                    className="w-9 h-9 rounded-full shadow-inner border-2 border-slate-200 object-cover"
                    alt="User"
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[#00d26a] rounded-full border-2 border-white"></div>
                </div>
                <div className="hidden md:block text-left min-w-0">
                  <p className="text-xs font-black text-slate-900 leading-tight truncate max-w-[120px] md:max-w-[150px] lg:max-w-none">
                    {user?.full_name || 'User'}
                  </p>
                  <p className="text-[10px] font-bold text-[#00d26a] uppercase leading-tight truncate max-w-[120px] md:max-w-[150px] lg:max-w-none">
                    {user?.role === 'MANAGER' ? 'Quản lý' : 
                     user?.role === 'SALES' ? 'Kinh doanh' :
                     user?.role === 'ACCOUNTANT' ? 'Kế toán' :
                     user?.role === 'INVENTORY' ? 'Kho' :
                     user?.role === 'LEGAL' ? 'Hồ sơ' : user?.role || 'User'}
                  </p>
                </div>
                <ChevronDown 
                  size={14} 
                  className={`text-slate-400 transition-transform flex-shrink-0 ${showUserMenu ? 'rotate-180' : ''}`}
                />
              </button>

              {showUserMenu && (
                <div 
                  ref={userMenuDropdownRef}
                  className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-[300px] sm:w-72 md:w-80 lg:w-96 bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200"
                     style={{ 
                       maxWidth: 'min(300px, calc(100vw - 2rem))'
                     }}>
                    <div className="p-4 md:p-5 border-b border-slate-100">
                      <div className="flex items-start gap-3 md:gap-4">
                        <img 
                          src={user?.avatar_url || "https://picsum.photos/seed/vinfast/48/48"} 
                          className="w-12 h-12 md:w-14 md:h-14 rounded-full shadow-inner flex-shrink-0 object-cover"
                          alt="User"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm md:text-base font-black text-slate-900 break-words">
                            {user?.full_name || 'User'}
                          </p>
                          <p className="text-xs md:text-sm text-slate-500 font-medium break-all mt-0.5 leading-relaxed">
                            {user?.email || 'No email'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="p-2 md:p-2.5">
                      <button 
                        onClick={() => {
                          router.push('/profile');
                          setShowUserMenu(false);
                        }}
                        className="w-full flex items-center gap-3 md:gap-3.5 px-4 md:px-5 py-2.5 md:py-3 hover:bg-slate-50 rounded-2xl transition-colors text-left"
                      >
                        <User size={18} className="text-slate-600 flex-shrink-0" />
                        <span className="text-sm md:text-base font-bold text-slate-700">Hồ sơ của tôi</span>
                      </button>
                      <button 
                        onClick={() => {
                          setShowChangePasswordModal(true);
                          setShowUserMenu(false);
                        }}
                        className="w-full flex items-center gap-3 md:gap-3.5 px-4 md:px-5 py-2.5 md:py-3 hover:bg-slate-50 rounded-2xl transition-colors text-left"
                      >
                        <Lock size={18} className="text-slate-600 flex-shrink-0" />
                        <span className="text-sm md:text-base font-bold text-slate-700">Đổi mật khẩu</span>
                      </button>
                      <button 
                        onClick={() => {
                          router.push('/settings');
                          setShowUserMenu(false);
                        }}
                        className="w-full flex items-center gap-3 md:gap-3.5 px-4 md:px-5 py-2.5 md:py-3 hover:bg-slate-50 rounded-2xl transition-colors text-left"
                      >
                        <Settings size={18} className="text-slate-600 flex-shrink-0" />
                        <span className="text-sm md:text-base font-bold text-slate-700">Cài đặt</span>
                      </button>
                      <button 
                        onClick={() => setIsDarkMode(!isDarkMode)}
                        className="w-full flex items-center gap-3 md:gap-3.5 px-4 md:px-5 py-2.5 md:py-3 hover:bg-slate-50 rounded-2xl transition-colors text-left group"
                      >
                        {isDarkMode ? (
                          <Sun size={20} className="text-amber-500 group-hover:text-amber-600 transition-colors flex-shrink-0" />
                        ) : (
                          <Moon size={20} className="text-slate-600 group-hover:text-slate-700 transition-colors flex-shrink-0" />
                        )}
                        <span className="text-sm md:text-base font-bold text-slate-700">
                          {isDarkMode ? 'Chế độ sáng' : 'Chế độ tối'}
                        </span>
                      </button>
                    </div>
                    <div className="p-2 md:p-2.5 border-t border-slate-100">
                      <button 
                        onClick={signOut}
                        className="w-full flex items-center gap-3 md:gap-3.5 px-4 md:px-5 py-2.5 md:py-3 hover:bg-red-50 rounded-2xl transition-colors text-left text-red-600"
                      >
                        <LogOut size={18} className="flex-shrink-0" />
                        <span className="text-sm md:text-base font-bold">Đăng xuất</span>
                      </button>
                    </div>
                  </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal 
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        isRequired={false}
      />
    </header>
  );
};

