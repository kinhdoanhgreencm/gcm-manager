'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Filter,
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  Wallet,
  Scale,
  Package,
  Settings,
  ArrowLeft,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { notificationService } from '@/services/notificationService';

type NotificationType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'CONTRACT' | 'PAYMENT' | 'DEBT' | 'INVENTORY' | 'SYSTEM';

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string | null;
  type: NotificationType;
  reference_type: string | null;
  reference_id: string | null;
  is_read: boolean;
  read_at: string | null;
  action_url: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
}

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'SUCCESS':
      return <CheckCircle2 size={20} className="text-green-500" />;
    case 'WARNING':
      return <AlertTriangle size={20} className="text-yellow-500" />;
    case 'ERROR':
      return <XCircle size={20} className="text-red-500" />;
    case 'CONTRACT':
      return <FileText size={20} className="text-blue-500" />;
    case 'PAYMENT':
      return <Wallet size={20} className="text-emerald-500" />;
    case 'DEBT':
      return <Scale size={20} className="text-orange-500" />;
    case 'INVENTORY':
      return <Package size={20} className="text-purple-500" />;
    case 'SYSTEM':
      return <Settings size={20} className="text-slate-500" />;
    default:
      return <Info size={20} className="text-blue-500" />;
  }
};

const getNotificationTypeLabel = (type: NotificationType) => {
  switch (type) {
    case 'SUCCESS':
      return 'Thành công';
    case 'WARNING':
      return 'Cảnh báo';
    case 'ERROR':
      return 'Lỗi';
    case 'CONTRACT':
      return 'Hợp đồng';
    case 'PAYMENT':
      return 'Thanh toán';
    case 'DEBT':
      return 'Công nợ';
    case 'INVENTORY':
      return 'Kho hàng';
    case 'SYSTEM':
      return 'Hệ thống';
    default:
      return 'Thông tin';
  }
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [user?.id, filter]);

  const fetchNotifications = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      // Fetch all notifications (no limit for the detail page)
      const data = await notificationService.getNotifications(user.id, 1000);
      
      // Apply filter
      let filtered: Notification[] = data || [];
      if (filter === 'unread') {
        filtered = filtered.filter((n: Notification) => !n.is_read);
      } else if (filter === 'read') {
        filtered = filtered.filter((n: Notification) => n.is_read);
      }

      setNotifications(filtered);
    } catch (error: any) {
      // Error is already handled in notificationService, but log here for debugging
      console.error('Error in notifications page fetchNotifications:', error);
      // Set empty array to prevent UI issues
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    if (!user?.id) return;

    try {
      await notificationService.markAsRead(notificationId, user.id);
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;

    setIsMarkingAll(true);
    try {
      await notificationService.markAllAsRead(user.id);
      await fetchNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    if (notification.action_url) {
      router.push(notification.action_url);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    if (!dateString) return 'Vừa xong';
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Vừa xong';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} phút trước`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} giờ trước`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} ngày trước`;
    
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFullDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const filteredNotifications = notifications;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-600 hover:text-[#00d26a]"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#00d26a]/10 rounded-2xl">
                <Bell size={24} className="text-[#00d26a]" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-slate-900">Thông báo</h1>
                <p className="text-sm text-slate-500 mt-1">
                  {notifications.length} thông báo
                  {unreadCount > 0 && (
                    <span className="ml-2 text-[#00d26a] font-bold">
                      • {unreadCount} chưa đọc
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Filter */}
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1">
              <Filter size={16} className="text-slate-400 ml-2" />
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                  filter === 'all'
                    ? 'bg-[#00d26a] text-white'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Tất cả
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                  filter === 'unread'
                    ? 'bg-[#00d26a] text-white'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Chưa đọc ({notifications.filter(n => !n.is_read).length})
              </button>
              <button
                onClick={() => setFilter('read')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                  filter === 'read'
                    ? 'bg-[#00d26a] text-white'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Đã đọc
              </button>
            </div>

            {/* Mark all as read */}
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                disabled={isMarkingAll}
                className="flex items-center gap-2 px-4 py-2 bg-[#00d26a] text-white rounded-xl font-bold text-sm hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isMarkingAll ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  <>
                    <CheckCheck size={16} />
                    <span>Đánh dấu tất cả đã đọc</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center">
              <RefreshCw size={32} className="animate-spin text-slate-400 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">Đang tải thông báo...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-12 text-center">
              <Bell size={48} className="text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-bold text-lg mb-1">
                {filter === 'unread' 
                  ? 'Không có thông báo chưa đọc'
                  : filter === 'read'
                  ? 'Không có thông báo đã đọc'
                  : 'Không có thông báo nào'}
              </p>
              <p className="text-slate-400 text-sm">
                {filter === 'unread' 
                  ? 'Tất cả thông báo của bạn đã được đọc'
                  : 'Bạn sẽ nhận được thông báo tại đây khi có sự kiện mới'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredNotifications.map((notification, index) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 md:p-6 hover:bg-slate-50 transition-colors cursor-pointer ${
                    !notification.is_read ? 'bg-blue-50/30' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className={`text-base md:text-lg font-black ${
                              notification.is_read ? 'text-slate-600' : 'text-slate-900'
                            }`}>
                              {notification.title}
                            </h3>
                            {!notification.is_read && (
                              <span className="w-2 h-2 bg-[#00d26a] rounded-full flex-shrink-0"></span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg">
                              {getNotificationTypeLabel(notification.type)}
                            </span>
                            <span className="text-xs text-slate-400">
                              {formatTimeAgo(notification.created_at)}
                            </span>
                          </div>
                        </div>

                        {/* Mark as read button */}
                        {!notification.is_read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                            className="flex-shrink-0 p-2 hover:bg-[#00d26a]/10 rounded-lg transition-colors group"
                            title="Đánh dấu đã đọc"
                          >
                            <Check size={18} className="text-slate-400 group-hover:text-[#00d26a] transition-colors" />
                          </button>
                        )}
                        {notification.is_read && (
                          <div className="flex-shrink-0 p-2">
                            <Check size={18} className="text-[#00d26a]" />
                          </div>
                        )}
                      </div>

                      {notification.message && (
                        <p className={`text-sm md:text-base mb-3 whitespace-pre-line ${
                          notification.is_read ? 'text-slate-500' : 'text-slate-700'
                        }`}>
                          {notification.message}
                        </p>
                      )}

                      {/* Metadata */}
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <div>
                          {notification.read_at && (
                            <span>Đã đọc: {formatFullDate(notification.read_at)}</span>
                          )}
                        </div>
                        <div>
                          Tạo: {formatFullDate(notification.created_at)}
                        </div>
                      </div>

                      {/* Action URL hint */}
                      {notification.action_url && (
                        <div className="mt-3 pt-3 border-t border-slate-100">
                          <span className="text-xs text-[#00d26a] font-bold">
                            Nhấn để xem chi tiết →
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
