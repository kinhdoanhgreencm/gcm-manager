import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ConditionalHeader } from '@/components/ConditionalHeader'
import { SidebarProvider } from '@/contexts/SidebarContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { ReloadProvider } from '@/contexts/ReloadContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Cần Thơ GF OMS',
  description: 'Mô hình quản trị đa phân hệ',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider>
          <SidebarProvider>
            <ReloadProvider>
              <div className="app-bg">
                <div className="grid-pattern"></div>
              </div>
              <ConditionalHeader />
              {children}
            </ReloadProvider>
          </SidebarProvider>
        </AuthProvider>
      </body>
    </html>
  )
}

