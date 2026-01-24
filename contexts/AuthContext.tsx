'use client'

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  phone?: string;
  role: string;
  branch: string;
  status: string;
  manager_id?: string;
  permissions: Record<string, boolean>;
  avatar_url?: string;
  last_login_at?: string;
  must_change_password?: boolean;
  created_at: string;
  updated_at: string;
  // Additional personal information fields
  date_of_birth?: string;
  id_card?: string;
  id_card_issue_date?: string;
  id_card_issue_place?: string;
  bank_name?: string;
  bank_account?: string;
  professional_level?: string;
  permanent_address?: string;
  current_address?: string;
  tax_code?: string;
  dependents?: number;
  join_date?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Kiểm tra session từ localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  // Idle timeout: tự động logout sau 15 phút không hoạt động
  useEffect(() => {
    if (!user) return;

    const IDLE_TIMEOUT = 15 * 60 * 1000; // 15 phút
    let idleTimer: ReturnType<typeof setTimeout>;

    const resetIdleTimer = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        // Tự động logout khi hết thời gian idle
        localStorage.removeItem('user');
        setUser(null);
        router.push('/login');
      }, IDLE_TIMEOUT);
    };

    // Các sự kiện để reset timer
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ];

    // Khởi tạo timer ban đầu
    resetIdleTimer();

    // Thêm event listeners
    events.forEach((event) => {
      window.addEventListener(event, resetIdleTimer, true);
    });

    // Cleanup
    return () => {
      clearTimeout(idleTimer);
      events.forEach((event) => {
        window.removeEventListener(event, resetIdleTimer, true);
      });
    };
  }, [user, router]);

  const signIn = async (username: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: { message: data.error || 'Đăng nhập thất bại' } };
      }

      // Lưu user vào localStorage
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);

      return { error: null };
    } catch (error: any) {
      return { error: { message: error.message || 'Đã xảy ra lỗi khi đăng nhập' } };
    }
  };

  const signOut = async () => {
    localStorage.removeItem('user');
    setUser(null);
    router.push('/login');
  };

  const refreshUser = async () => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        // Fetch updated user data from API
        const response = await fetch(`/api/auth/user?id=${userData.id}`);
        if (response.ok) {
          const data = await response.json();
          localStorage.setItem('user', JSON.stringify(data.user));
          setUser(data.user);
        }
      } catch (error) {
        console.error('Error refreshing user:', error);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

