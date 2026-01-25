'use client'

import React, { useState, useEffect } from 'react';
import { 
  DollarSign,
  Quote, 
  Users, 
  ShieldCheck, 
  Target,
  HeartHandshake,
  Edit2,
  Save,
  X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface DailyMessage {
  id: string;
  message: string;
  department: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

const InspirationalCard = ({ 
  icon: Icon, 
  department, 
  quote, 
  color, 
  messageId,
  canEdit,
  onEdit,
  isEditing,
  onSave,
  onCancel,
  onMessageChange
}: any) => {
  const [editValue, setEditValue] = useState(quote);

  useEffect(() => {
    setEditValue(quote);
  }, [quote]);

  const handleSave = () => {
    onSave(messageId, editValue);
  };

  const handleCancel = () => {
    setEditValue(quote);
    onCancel();
  };

  return (
    <div className="bg-white p-6 md:p-7 lg:p-8 rounded-[32px] md:rounded-[36px] lg:rounded-[40px] border border-slate-100 shadow-sm hover:border-[#00d26a]/30 transition-all duration-300 group flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center group-hover:rotate-12 transition-transform`}>
            <Icon size={24} className="text-white" />
          </div>
          {canEdit && !isEditing && (
            <button
              onClick={onEdit}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-900"
              title="Chỉnh sửa lời nhắc"
            >
              <Edit2 size={16} />
            </button>
          )}
        </div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">{department}</p>
        <div className="relative">
          <Quote className="absolute -top-2 -left-2 text-slate-100 w-10 h-10 -z-0" />
          {isEditing ? (
            <div className="space-y-3">
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="relative z-10 w-full text-lg font-bold text-slate-800 leading-relaxed italic p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#00d26a] focus:border-[#00d26a] outline-none resize-none"
                rows={4}
                placeholder="Nhập lời nhắc..."
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-bold text-slate-600 transition-colors flex items-center gap-2"
                >
                  <X size={16} />
                  Hủy
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-[#00d26a] hover:bg-[#00b85a] rounded-xl text-sm font-bold text-white transition-colors flex items-center gap-2"
                >
                  <Save size={16} />
                  Lưu
                </button>
              </div>
            </div>
          ) : (
            <p className="relative z-10 text-lg font-bold text-slate-800 leading-relaxed italic">
              "{quote}"
            </p>
          )}
        </div>
      </div>
      <div className="mt-8 pt-6 border-t border-slate-50 flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-[#00d26a]"></div>
        <span className="text-[10px] font-black text-[#00d26a] uppercase tracking-widest">Tin nhắn từ Ban Giám Đốc</span>
      </div>
    </div>
  );
};

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<DailyMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Kiểm tra quyền chỉnh sửa
  const canEdit = user && ['ADMIN', 'DIRECTOR', 'OPERATIONS_DIRECTOR', 'STRATEGIC_DIRECTOR', 'BUSINESS_DIRECTOR'].includes(user.role);

  // Mapping department với icon và color
  const departmentConfig: Record<string, { icon: any; color: string }> = {
    'Bộ phận Kinh doanh': { icon: Target, color: 'bg-[#00d26a]' },
    'Quản lý Kho hàng': { icon: ShieldCheck, color: 'bg-slate-900' },
    'Kế toán & Tài chính': { icon: DollarSign, color: 'bg-[#00d26a]' },
    'Chăm sóc khách hàng': { icon: HeartHandshake, color: 'bg-slate-900' }
  };

  // Fetch messages từ API
  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/daily-messages');
      const data = await response.json();
      
      if (response.ok) {
        setMessages(data.messages || []);
      } else {
        setError(data.error || 'Không thể tải lời nhắc');
      }
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      setError('Lỗi khi tải lời nhắc');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (messageId: string) => {
    setEditingId(messageId);
    setError(null);
  };

  const handleCancel = () => {
    setEditingId(null);
    setError(null);
  };

  const handleSave = async (messageId: string, newMessage: string) => {
    if (!user?.id) return;

    if (!newMessage.trim()) {
      setError('Lời nhắc không được để trống');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const message = messages.find(m => m.id === messageId);
      if (!message) {
        setError('Không tìm thấy lời nhắc');
        return;
      }

      const response = await fetch('/api/daily-messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: messageId,
          message: newMessage.trim(),
          department: message.department,
          userId: user.id
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Cập nhật message trong state
        setMessages(prev => prev.map(m => 
          m.id === messageId 
            ? { ...m, message: newMessage.trim(), updated_at: new Date().toISOString() }
            : m
        ));
        setEditingId(null);
      } else {
        setError(data.error || 'Không thể cập nhật lời nhắc');
      }
    } catch (error: any) {
      console.error('Error saving message:', error);
      setError('Lỗi khi cập nhật lời nhắc');
    } finally {
      setSaving(false);
    }
  };

  // Sắp xếp messages theo thứ tự mong muốn
  const sortedMessages = [...messages].sort((a, b) => {
    const order = ['Bộ phận Kinh doanh', 'Quản lý Kho hàng', 'Kế toán & Tài chính', 'Chăm sóc khách hàng'];
    const indexA = order.indexOf(a.department);
    const indexB = order.indexOf(b.department);
    if (indexA === -1 && indexB === -1) return 0;
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  return (
    <div className="space-y-10">
      {/* Inspirational Quotes Section - Thay thế cho phần biểu đồ báo cáo */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <Users size={20} className="text-[#00d26a]" />
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.3em]">Lời nhắn từ Ban Giám Đốc</h3>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
            <X className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <p className="text-sm font-bold text-red-900">Lỗi</p>
              <p className="text-xs text-red-700 mt-1">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800"
            >
              <X size={16} />
            </button>
          </div>
        )}
        
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 md:gap-7 lg:gap-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white p-6 md:p-7 lg:p-8 rounded-[32px] border border-slate-100 shadow-sm animate-pulse">
                <div className="h-12 w-12 bg-slate-200 rounded-2xl mb-6"></div>
                <div className="h-4 bg-slate-200 rounded mb-3"></div>
                <div className="h-20 bg-slate-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 md:gap-7 lg:gap-8">
            {sortedMessages.map((message) => {
              const config = departmentConfig[message.department] || { icon: Quote, color: 'bg-slate-900' };
              return (
                <InspirationalCard 
                  key={message.id}
                  icon={config.icon}
                  department={message.department}
                  quote={message.message}
                  color={config.color}
                  messageId={message.id}
                  canEdit={canEdit}
                  isEditing={editingId === message.id}
                  onEdit={() => handleEdit(message.id)}
                  onSave={handleSave}
                  onCancel={handleCancel}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
