# Hướng dẫn cấu hình hệ thống thông báo

## Tổng quan

Hệ thống thông báo cho phép gửi và quản lý các thông báo cho người dùng trong ứng dụng. Thông báo được hiển thị qua icon chuông ở header và có thể được đánh dấu đã đọc.

## Cài đặt

### Bước 1: Tạo bảng notifications trong database

Chạy file migration SQL để tạo bảng và các function cần thiết:

```bash
# Chạy migration trong Supabase SQL Editor hoặc psql
psql -h your-db-host -U postgres -d your-database -f sql/migration_create_notifications_table.sql
```

Hoặc copy nội dung file `sql/migration_create_notifications_table.sql` và chạy trong Supabase SQL Editor.

### Bước 2: Cấu hình trong code

#### 2.1. Cập nhật Header component để lấy thông báo từ database

File `components/Header.tsx` hiện đang sử dụng mock data. Cần cập nhật để fetch từ database:

```typescript
// Thêm vào Header component
const [notifications, setNotifications] = useState<any[]>([]);
const [unreadCount, setUnreadCount] = useState(0);

useEffect(() => {
  if (user) {
    fetchNotifications();
    // Polling mỗi 30 giây để cập nhật thông báo mới
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }
}, [user]);

const fetchNotifications = async () => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    
    setNotifications(data || []);
    setUnreadCount(data?.filter(n => !n.is_read).length || 0);
  } catch (err) {
    console.error('Error fetching notifications:', err);
  }
};

const markAsRead = async (notificationId: string) => {
  try {
    const { error } = await supabase
      .rpc('mark_notification_as_read', { p_notification_id: notificationId });
    
    if (error) throw error;
    
    // Cập nhật local state
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
    );
    setReadNotifications(prev => new Set([...prev, notificationId]));
  } catch (err) {
    console.error('Error marking notification as read:', err);
  }
};
```

#### 2.2. Tạo service để gửi thông báo

Tạo file `services/notificationService.ts`:

```typescript
import { supabase } from './supabaseClient';

export interface NotificationData {
  userId: string;
  title: string;
  message?: string;
  type?: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'CONTRACT' | 'PAYMENT' | 'DEBT' | 'INVENTORY' | 'SYSTEM';
  referenceType?: string;
  referenceId?: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export const notificationService = {
  // Tạo thông báo cho một người dùng
  async createNotification(data: NotificationData) {
    const { data: notification, error } = await supabase
      .rpc('create_notification', {
        p_user_id: data.userId,
        p_title: data.title,
        p_message: data.message || null,
        p_type: data.type || 'INFO',
        p_reference_type: data.referenceType || null,
        p_reference_id: data.referenceId || null,
        p_action_url: data.actionUrl || null,
        p_metadata: data.metadata || null
      });

    if (error) throw error;
    return notification;
  },

  // Tạo thông báo cho nhiều người dùng
  async createNotificationsForUsers(userIds: string[], data: Omit<NotificationData, 'userId'>) {
    const notifications = userIds.map(userId => ({
      user_id: userId,
      title: data.title,
      message: data.message || null,
      type: data.type || 'INFO',
      reference_type: data.referenceType || null,
      reference_id: data.referenceId || null,
      action_url: data.actionUrl || null,
      metadata: data.metadata || null
    }));

    const { data: result, error } = await supabase
      .from('notifications')
      .insert(notifications)
      .select();

    if (error) throw error;
    return result;
  },

  // Tạo thông báo cho tất cả người dùng có role cụ thể
  async createNotificationForRole(role: string, data: Omit<NotificationData, 'userId'>) {
    // Lấy danh sách user có role này
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id')
      .eq('role', role)
      .eq('status', 'ACTIVE');

    if (usersError) throw usersError;
    if (!users || users.length === 0) return [];

    const userIds = users.map(u => u.id);
    return this.createNotificationsForUsers(userIds, data);
  }
};
```

## Các loại thông báo

### 1. Thông báo hợp đồng (CONTRACT)

```typescript
// Khi có hợp đồng mới cần duyệt
await notificationService.createNotificationForRole('MANAGER', {
  title: 'Hợp đồng mới cần duyệt',
  message: `Hợp đồng ${contractCode} đã được tạo và cần duyệt`,
  type: 'CONTRACT',
  referenceType: 'CONTRACT',
  referenceId: contractId,
  actionUrl: `/contracts/${contractId}`
});

// Khi hợp đồng được duyệt
await notificationService.createNotification({
  userId: contractCreatorId,
  title: 'Hợp đồng đã được duyệt',
  message: `Hợp đồng ${contractCode} đã được duyệt`,
  type: 'SUCCESS',
  referenceType: 'CONTRACT',
  referenceId: contractId,
  actionUrl: `/contracts/${contractId}`
});
```

### 2. Thông báo thanh toán (PAYMENT)

```typescript
// Khi có thanh toán mới
await notificationService.createNotification({
  userId: userId,
  title: 'Thanh toán thành công',
  message: `Đã nhận thanh toán ${amount} VND cho hợp đồng ${contractCode}`,
  type: 'SUCCESS',
  referenceType: 'TRANSACTION',
  referenceId: transactionId,
  actionUrl: `/finance/transactions/${transactionId}`
});

// Khi thanh toán sắp đến hạn
await notificationService.createNotification({
  userId: userId,
  title: 'Thanh toán sắp đến hạn',
  message: `Thanh toán đợt ${installmentNumber} của hợp đồng ${contractCode} sẽ đến hạn vào ${dueDate}`,
  type: 'WARNING',
  referenceType: 'PAYMENT_SCHEDULE',
  referenceId: scheduleId,
  actionUrl: `/contracts/${contractId}`
});
```

### 3. Thông báo công nợ (DEBT)

```typescript
// Khi công nợ quá hạn
await notificationService.createNotification({
  userId: userId,
  title: 'Công nợ quá hạn',
  message: `Công nợ ${debtAmount} VND từ ${partnerName} đã quá hạn`,
  type: 'ERROR',
  referenceType: 'DEBT',
  referenceId: debtId,
  actionUrl: `/debt/${debtId}`
});
```

### 4. Thông báo kho (INVENTORY)

```typescript
// Khi có xe mới nhập kho
await notificationService.createNotificationForRole('INVENTORY', {
  title: 'Xe mới đã nhập kho',
  message: `Xe ${vehicleMake} ${vehicleModel} (${vin}) đã được nhập kho`,
  type: 'INVENTORY',
  referenceType: 'VEHICLE',
  referenceId: vehicleId,
  actionUrl: `/inventory/${vehicleId}`
});

// Khi tồn kho thấp
await notificationService.createNotificationForRole('MANAGER', {
  title: 'Cảnh báo tồn kho thấp',
  message: `Số lượng xe trong kho đang ở mức thấp (${currentCount} xe)`,
  type: 'WARNING',
  referenceType: 'INVENTORY',
  actionUrl: '/inventory'
});
```

### 5. Thông báo hệ thống (SYSTEM)

```typescript
// Thông báo bảo trì hệ thống
await notificationService.createNotificationsForUsers(allUserIds, {
  title: 'Bảo trì hệ thống',
  message: 'Hệ thống sẽ được bảo trì từ 22:00 - 02:00 ngày mai',
  type: 'SYSTEM',
  actionUrl: '/settings'
});
```

## Tích hợp với các module

### Tích hợp với Contracts

Thêm vào file `components/ContractFormPage.tsx` sau khi tạo hợp đồng thành công:

```typescript
// Sau khi tạo hợp đồng thành công
if (contractId) {
  await notificationService.createNotificationForRole('MANAGER', {
    title: 'Hợp đồng mới cần duyệt',
    message: `Hợp đồng ${contractCode} đã được tạo`,
    type: 'CONTRACT',
    referenceType: 'CONTRACT',
    referenceId: contractId,
    actionUrl: `/contracts/${contractId}`
  });
}
```

### Tích hợp với Transactions

Thêm vào file `components/TransactionFormPage.tsx` sau khi tạo giao dịch:

```typescript
// Sau khi tạo giao dịch thành công
if (transactionId && transactionType === 'INCOME') {
  await notificationService.createNotification({
    userId: relatedUserId,
    title: 'Thanh toán thành công',
    message: `Đã nhận thanh toán ${amount} VND`,
    type: 'SUCCESS',
    referenceType: 'TRANSACTION',
    referenceId: transactionId,
    actionUrl: `/finance/transactions/${transactionId}`
  });
}
```

### Tích hợp với Debt Management

Thêm vào file `components/DebtManagement.tsx` khi có công nợ quá hạn:

```typescript
// Kiểm tra công nợ quá hạn định kỳ
useEffect(() => {
  const checkOverdueDebts = async () => {
    const { data: overdueDebts } = await supabase
      .from('debt_records')
      .select('*')
      .eq('status', 'OVERDUE')
      .eq('is_notified', false); // Thêm field này để tránh gửi trùng

    if (overdueDebts && overdueDebts.length > 0) {
      for (const debt of overdueDebts) {
        await notificationService.createNotification({
          userId: debt.partnerId, // Hoặc userId liên quan
          title: 'Công nợ quá hạn',
          message: `Công nợ ${debt.remainingAmount} VND đã quá hạn`,
          type: 'ERROR',
          referenceType: 'DEBT',
          referenceId: debt.id,
          actionUrl: `/debt/${debt.id}`
        });
        
        // Đánh dấu đã gửi thông báo
        await supabase
          .from('debt_records')
          .update({ is_notified: true })
          .eq('id', debt.id);
      }
    }
  };

  // Chạy mỗi giờ
  const interval = setInterval(checkOverdueDebts, 3600000);
  checkOverdueDebts(); // Chạy ngay lần đầu

  return () => clearInterval(interval);
}, []);
```

## Cấu hình thông báo real-time (Tùy chọn)

Để nhận thông báo real-time mà không cần polling, sử dụng Supabase Realtime:

```typescript
// Trong Header component
useEffect(() => {
  if (!user) return;

  const channel = supabase
    .channel(`notifications:${user.id}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      },
      (payload) => {
        // Thêm thông báo mới vào danh sách
        setNotifications(prev => [payload.new, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        // Hiển thị toast notification (tùy chọn)
        // toast.success(payload.new.title);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [user]);
```

## Tùy chỉnh giao diện

### Thêm icon cho từng loại thông báo

Cập nhật trong `components/Header.tsx`:

```typescript
const getNotificationIcon = (type: string) => {
  switch(type) {
    case 'CONTRACT':
      return <FileText size={16} className="text-blue-500" />;
    case 'PAYMENT':
      return <Wallet size={16} className="text-green-500" />;
    case 'DEBT':
      return <Scale size={16} className="text-red-500" />;
    case 'INVENTORY':
      return <Car size={16} className="text-purple-500" />;
    default:
      return <Bell size={16} className="text-slate-500" />;
  }
};
```

### Thêm màu sắc cho từng loại

```typescript
const getNotificationColor = (type: string) => {
  switch(type) {
    case 'SUCCESS':
      return 'bg-green-50 border-green-200';
    case 'WARNING':
      return 'bg-amber-50 border-amber-200';
    case 'ERROR':
      return 'bg-red-50 border-red-200';
    case 'CONTRACT':
      return 'bg-blue-50 border-blue-200';
    default:
      return 'bg-slate-50 border-slate-200';
  }
};
```

## Best Practices

1. **Không spam thông báo**: Chỉ gửi thông báo cho các sự kiện quan trọng
2. **Thông báo rõ ràng**: Tiêu đề và nội dung phải dễ hiểu
3. **Action URL**: Luôn cung cấp URL để người dùng có thể điều hướng đến chi tiết
4. **Đánh dấu đã đọc**: Cho phép người dùng đánh dấu đã đọc hoặc tự động đánh dấu sau khi click
5. **Giới hạn số lượng**: Chỉ hiển thị 20-50 thông báo gần nhất
6. **Xóa thông báo cũ**: Tự động xóa thông báo cũ hơn 30 ngày

## Troubleshooting

### Thông báo không hiển thị

1. Kiểm tra RLS policies trong Supabase
2. Kiểm tra user_id có đúng không
3. Kiểm tra console để xem có lỗi không

### Thông báo không real-time

1. Đảm bảo đã enable Realtime trong Supabase
2. Kiểm tra subscription channel có hoạt động không
3. Fallback về polling nếu Realtime không hoạt động

## Tài liệu tham khảo

- [Supabase Realtime Documentation](https://supabase.com/docs/guides/realtime)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
