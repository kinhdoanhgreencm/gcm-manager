import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ConditionalHeader } from '@/components/ConditionalHeader'
import { SidebarProvider } from '@/contexts/SidebarContext'
import { AuthProvider } from '@/contexts/AuthContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'GCM | All About Cars - Quản trị Đại lý VinFast',
  description: 'Hệ thống quản lý đại lý VinFast',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi">
      <body className={inter.className}>
        <AuthProvider>
          <SidebarProvider>
            <div className="app-bg">
              <div className="grid-pattern"></div>
            </div>
            <ConditionalHeader />
            {children}
          </SidebarProvider>
        </AuthProvider>
      </body>
    </html>
  )
}

