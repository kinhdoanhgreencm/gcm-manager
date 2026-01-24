export interface NotificationData {
  userId?: string;
  title: string;
  message: string;
  type?: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'CONTRACT' | 'PAYMENT' | 'DEBT' | 'INVENTORY' | 'SYSTEM';
  referenceType?: string;
  referenceId?: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export const notificationService = {
  /**
   * Tạo thông báo cho một user cụ thể
   */
  async createNotification(data: NotificationData & { userId: string }) {
    try {
      const response = await fetch('/api/notifications/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userIds: [data.userId],
          title: data.title,
          message: data.message,
          type: data.type || 'INFO',
          referenceType: data.referenceType,
          referenceId: data.referenceId,
          actionUrl: data.actionUrl,
          metadata: data.metadata,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create notification');
      }

      const result = await response.json();
      return result.notifications?.[0] || null;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  },

  /**
   * Tạo thông báo cho nhiều users
   */
  async createNotificationsForUsers(userIds: string[], data: Omit<NotificationData, 'userId'>) {
    try {
      // Sử dụng API route để bypass RLS
      const response = await fetch('/api/notifications/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userIds,
          title: data.title,
          message: data.message,
          type: data.type || 'INFO',
          referenceType: data.referenceType,
          referenceId: data.referenceId,
          actionUrl: data.actionUrl,
          metadata: data.metadata,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create notifications');
      }

      const result = await response.json();
      return result.notifications || [];
    } catch (error: any) {
      console.error('Error creating notifications for users:', error);
      // Log chi tiết lỗi để debug
      if (error.message) {
        console.error('Error message:', error.message);
      }
      throw error;
    }
  },

  /**
   * Tạo thông báo cho tất cả users có role cụ thể
   */
  async createNotificationForRoles(roles: string[], data: Omit<NotificationData, 'userId'>) {
    try {
      const response = await fetch('/api/notifications/create-by-roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roles,
          title: data.title,
          message: data.message,
          type: data.type || 'INFO',
          referenceType: data.referenceType,
          referenceId: data.referenceId,
          actionUrl: data.actionUrl,
          metadata: data.metadata,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create notifications for roles');
      }

      const result = await response.json();
      return result.notifications || [];
    } catch (error) {
      console.error('Error creating notification for roles:', error);
      throw error;
    }
  },

  /**
   * Tạo thông báo cho tất cả users có permission cụ thể
   */
  async createNotificationForPermission(permissionKey: string, data: Omit<NotificationData, 'userId'>) {
    try {
      const response = await fetch('/api/notifications/create-by-permission', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          permissionKey,
          title: data.title,
          message: data.message,
          type: data.type || 'INFO',
          referenceType: data.referenceType,
          referenceId: data.referenceId,
          actionUrl: data.actionUrl,
          metadata: data.metadata,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create notifications for permission');
      }

      const result = await response.json();
      return result.notifications || [];
    } catch (error) {
      console.error('Error creating notification for permission:', error);
      throw error;
    }
  },

  /**
   * Đánh dấu thông báo đã đọc
   */
  async markAsRead(notificationId: string, userId?: string) {
    try {
      let currentUserId = userId;
      if (!currentUserId && typeof window !== 'undefined') {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            currentUserId = parsed.id;
          } catch (e) {
            console.error('Error parsing stored user:', e);
          }
        }
      }

      if (!currentUserId) {
        throw new Error('Không tìm thấy userId để đánh dấu thông báo đã đọc');
      }

      // Sử dụng API route để đảm bảo cập nhật database đúng cách
      const response = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notificationId,
          userId: currentUserId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to mark notification as read');
      }

      const result = await response.json();
      return result.notification || true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },

  /**
   * Đánh dấu tất cả thông báo đã đọc cho user hiện tại
   */
  async markAllAsRead(userId: string) {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to mark all notifications as read');
      }

      return true;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  },

  /**
   * Lấy danh sách thông báo cho user
   */
  async getNotifications(userId: string, limit: number = 20) {
    try {
      const response = await fetch(`/api/notifications?userId=${encodeURIComponent(userId)}&limit=${limit}`, {
        cache: 'no-store'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch notifications');
      }

      const result = await response.json();
      return result.notifications || [];
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  },

  /**
   * Lấy số lượng thông báo chưa đọc
   */
  async getUnreadCount(userId: string) {
    try {
      const response = await fetch(`/api/notifications/unread-count?userId=${encodeURIComponent(userId)}`, {
        cache: 'no-store'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch unread count');
      }

      const result = await response.json();
      return result.count || 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      throw error;
    }
  },
};
