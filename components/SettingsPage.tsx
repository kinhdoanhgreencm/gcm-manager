'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Settings, Sun, Moon, Bell, Globe, 
  Shield, Database, Palette, Volume2, VolumeX,
  CheckCircle2, XCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export const SettingsPage: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [language, setLanguage] = useState('vi');
  const [autoSave, setAutoSave] = useState(true);
  const [compactMode, setCompactMode] = useState(false);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Load settings from localStorage
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    const savedNotifications = localStorage.getItem('notificationsEnabled') !== 'false';
    const savedEmailNotifications = localStorage.getItem('emailNotifications') !== 'false';
    const savedSound = localStorage.getItem('soundEnabled') !== 'false';
    const savedLanguage = localStorage.getItem('language') || 'vi';
    const savedAutoSave = localStorage.getItem('autoSave') !== 'false';
    const savedCompactMode = localStorage.getItem('compactMode') === 'true';

    setIsDarkMode(savedDarkMode);
    setNotificationsEnabled(savedNotifications);
    setEmailNotifications(savedEmailNotifications);
    setSoundEnabled(savedSound);
    setLanguage(savedLanguage);
    setAutoSave(savedAutoSave);
    setCompactMode(savedCompactMode);
  }, []);

  const handleDarkModeToggle = (enabled: boolean) => {
    setIsDarkMode(enabled);
    localStorage.setItem('darkMode', enabled.toString());
    // Apply dark mode class to document
    if (enabled) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleNotificationsToggle = (enabled: boolean) => {
    setNotificationsEnabled(enabled);
    localStorage.setItem('notificationsEnabled', enabled.toString());
  };

  const handleEmailNotificationsToggle = (enabled: boolean) => {
    setEmailNotifications(enabled);
    localStorage.setItem('emailNotifications', enabled.toString());
  };

  const handleSoundToggle = (enabled: boolean) => {
    setSoundEnabled(enabled);
    localStorage.setItem('soundEnabled', enabled.toString());
  };

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    localStorage.setItem('language', lang);
  };

  const handleAutoSaveToggle = (enabled: boolean) => {
    setAutoSave(enabled);
    localStorage.setItem('autoSave', enabled.toString());
  };

  const handleCompactModeToggle = (enabled: boolean) => {
    setCompactMode(enabled);
    localStorage.setItem('compactMode', enabled.toString());
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-slate-500 font-medium">Đang tải thông tin...</p>
        </div>
      </div>
    );
  }

  const SettingToggle: React.FC<{
    label: string;
    description?: string;
    enabled: boolean;
    onToggle: (enabled: boolean) => void;
    icon?: React.ReactNode;
  }> = ({ label, description, enabled, onToggle, icon }) => (
    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200 hover:bg-slate-100 transition-colors">
      <div className="flex items-center gap-3 flex-1">
        {icon && <div className="text-slate-600">{icon}</div>}
        <div className="flex-1">
          <p className="text-sm font-bold text-slate-900">{label}</p>
          {description && (
            <p className="text-xs text-slate-500 mt-0.5">{description}</p>
          )}
        </div>
      </div>
      <button
        onClick={() => onToggle(!enabled)}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          enabled ? 'bg-[#00d26a]' : 'bg-slate-300'
        }`}
      >
        <span
          className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );

  const SettingSelect: React.FC<{
    label: string;
    description?: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
    icon?: React.ReactNode;
  }> = ({ label, description, value, options, onChange, icon }) => (
    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
      <div className="flex items-center gap-3 mb-3">
        {icon && <div className="text-slate-600">{icon}</div>}
        <div className="flex-1">
          <p className="text-sm font-bold text-slate-900">{label}</p>
          {description && (
            <p className="text-xs text-slate-500 mt-0.5">{description}</p>
          )}
        </div>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00d26a] focus:border-transparent"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-3 hover:bg-slate-100 rounded-2xl transition-colors text-slate-400 hover:text-slate-900"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-tighter">Cài đặt hệ thống</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900">Cài đặt</h2>
            <p className="text-xs text-slate-500 font-medium">Tùy chỉnh trải nghiệm của bạn</p>
          </div>
        </div>
      </div>

      {/* Settings Content */}
      <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-10 space-y-12">
          {/* Appearance Settings */}
          <section className="space-y-6">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <Palette size={18} className="text-blue-600" /> Giao diện
            </h3>
            <div className="space-y-4">
              <SettingToggle
                label="Chế độ tối"
                description="Chuyển đổi giữa chế độ sáng và tối"
                enabled={isDarkMode}
                onToggle={handleDarkModeToggle}
                icon={<Moon size={18} />}
              />
              <SettingToggle
                label="Chế độ compact"
                description="Hiển thị nhiều thông tin hơn trong không gian nhỏ hơn"
                enabled={compactMode}
                onToggle={handleCompactModeToggle}
                icon={<Settings size={18} />}
              />
            </div>
          </section>

          {/* Notification Settings */}
          <section className="space-y-6">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <Bell size={18} className="text-blue-600" /> Thông báo
            </h3>
            <div className="space-y-4">
              <SettingToggle
                label="Bật thông báo"
                description="Nhận thông báo từ hệ thống"
                enabled={notificationsEnabled}
                onToggle={handleNotificationsToggle}
                icon={<Bell size={18} />}
              />
              <SettingToggle
                label="Thông báo qua email"
                description="Nhận thông báo qua email"
                enabled={emailNotifications}
                onToggle={handleEmailNotificationsToggle}
                icon={<Bell size={18} />}
              />
              <SettingToggle
                label="Âm thanh thông báo"
                description="Phát âm thanh khi có thông báo mới"
                enabled={soundEnabled}
                onToggle={handleSoundToggle}
                icon={soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
              />
            </div>
          </section>

          {/* General Settings */}
          <section className="space-y-6">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <Settings size={18} className="text-blue-600" /> Chung
            </h3>
            <div className="space-y-4">
              <SettingSelect
                label="Ngôn ngữ"
                description="Chọn ngôn ngữ hiển thị"
                value={language}
                options={[
                  { value: 'vi', label: 'Tiếng Việt' },
                  { value: 'en', label: 'English' }
                ]}
                onChange={handleLanguageChange}
                icon={<Globe size={18} />}
              />
              <SettingToggle
                label="Tự động lưu"
                description="Tự động lưu các thay đổi khi bạn làm việc"
                enabled={autoSave}
                onToggle={handleAutoSaveToggle}
                icon={<Database size={18} />}
              />
            </div>
          </section>

          {/* Security Settings */}
          <section className="space-y-6">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <Shield size={18} className="text-blue-600" /> Bảo mật
            </h3>
            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-200">
              <p className="text-sm font-bold text-slate-900 mb-2">Quản lý bảo mật tài khoản</p>
              <p className="text-xs text-slate-600 mb-4">
                Để thay đổi mật khẩu và các cài đặt bảo mật khác, vui lòng truy cập trang hồ sơ của bạn.
              </p>
              <button
                onClick={() => router.push('/profile')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors"
              >
                Đi đến hồ sơ
              </button>
            </div>
          </section>

          {/* System Info */}
          <section className="space-y-6">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <Database size={18} className="text-blue-600" /> Thông tin hệ thống
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                  Phiên bản
                </label>
                <p className="text-sm font-bold text-slate-900">1.0.0</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                  Cập nhật lần cuối
                </label>
                <p className="text-sm font-bold text-slate-900">
                  {new Date().toLocaleDateString('vi-VN')}
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
