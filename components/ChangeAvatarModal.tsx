'use client'

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, Image as ImageIcon, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ImageCropper } from '@/components/ImageCropper';

interface ChangeAvatarModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangeAvatarModal: React.FC<ChangeAvatarModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user, refreshUser } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen && user) {
      setAvatarUrl(user.avatar_url || '');
      setPreview(user.avatar_url || null);
      setError('');
      setSuccess('');
      setShowCropper(false);
      setOriginalImage(null);
    }
  }, [isOpen, user]);

  if (!isOpen || !mounted) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn file ảnh hợp lệ');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Kích thước file không được vượt quá 5MB');
      return;
    }

    // Create preview and show cropper
    const reader = new FileReader();
    reader.onloadend = () => {
      const imageData = reader.result as string;
      setOriginalImage(imageData);
      setShowCropper(true);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setAvatarUrl(url);
    setPreview(url || null);
    setError('');
    setShowCropper(false);
  };

  const handleCropped = (croppedImage: string) => {
    setPreview(croppedImage);
    setAvatarUrl(croppedImage);
    setShowCropper(false);
    setOriginalImage(null);
  };

  const handleCancelCrop = () => {
    setShowCropper(false);
    setOriginalImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!avatarUrl.trim()) {
      setError('Vui lòng chọn ảnh hoặc nhập URL ảnh');
      setLoading(false);
      return;
    }

    // Validate URL if it's a URL
    if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
      try {
        new URL(avatarUrl);
      } catch {
        setError('URL không hợp lệ');
        setLoading(false);
        return;
      }
    }

    try {
      const response = await fetch('/api/auth/update-avatar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id,
          avatarUrl: avatarUrl.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Update avatar API error:', data);
        setError(data.error || 'Đã xảy ra lỗi khi cập nhật avatar');
        setLoading(false);
        return;
      }

      setSuccess('Cập nhật avatar thành công!');
      
      // Refresh user data
      await refreshUser();
      
      // Close modal after 1 second
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error: any) {
      console.error('Update avatar error:', error);
      setError('Đã xảy ra lỗi khi cập nhật avatar. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/update-avatar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id,
          avatarUrl: null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Đã xảy ra lỗi khi xóa avatar');
        setLoading(false);
        return;
      }

      setSuccess('Xóa avatar thành công!');
      setPreview(null);
      setAvatarUrl('');
      
      // Refresh user data
      await refreshUser();
      
      // Close modal after 1 second
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error: any) {
      console.error('Remove avatar error:', error);
      setError('Đã xảy ra lỗi khi xóa avatar. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h3 className="text-xl font-black text-slate-900">Đổi avatar</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-900"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Image Cropper */}
          {showCropper && originalImage ? (
            <ImageCropper
              imageSrc={originalImage}
              onCrop={handleCropped}
              onCancel={handleCancelCrop}
              aspectRatio={1}
            />
          ) : (
            <>
              {/* Preview */}
              <div className="flex justify-center">
                <div className="relative">
                  <div className="w-32 h-32 rounded-3xl overflow-hidden border-4 border-slate-200 bg-slate-100 flex items-center justify-center">
                    {preview ? (
                      <img 
                        src={preview} 
                        alt="Avatar preview" 
                        className="w-full h-full object-cover"
                        onError={() => {
                          setError('Không thể tải ảnh. Vui lòng kiểm tra lại URL hoặc chọn file khác.');
                          setPreview(null);
                        }}
                      />
                    ) : (
                      <ImageIcon size={48} className="text-slate-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* File Upload */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Tải ảnh lên</label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-400 transition-colors text-slate-600 hover:text-slate-900"
                >
                  <Upload size={20} />
                  <span className="text-sm font-bold">Chọn file ảnh</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <p className="text-xs text-slate-500">Hỗ trợ: JPG, PNG, GIF (tối đa 5MB)</p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-600">
                  <AlertCircle size={18} />
                  <span className="font-medium">{error}</span>
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-sm text-emerald-600">
                  <CheckCircle2 size={18} />
                  <span className="font-medium">{success}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                {preview && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    disabled={loading}
                    className="flex-1 px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <Loader2 size={18} className="animate-spin mx-auto" />
                    ) : (
                      'Xóa avatar'
                    )}
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold transition-colors disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading || !avatarUrl.trim()}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 size={18} className="animate-spin mx-auto" />
                  ) : (
                    'Lưu'
                  )}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>,
    document.body
  );
};
