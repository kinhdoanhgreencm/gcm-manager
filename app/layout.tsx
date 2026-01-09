import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

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
        <div className="app-bg">
          <div className="grid-pattern"></div>
        </div>
        {children}
      </body>
    </html>
  )
}

