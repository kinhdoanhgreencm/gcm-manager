import { AppLayout } from '@/components/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PermissionGuard } from '@/components/PermissionGuard';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <PermissionGuard>
        <AppLayout>{children}</AppLayout>
      </PermissionGuard>
    </ProtectedRoute>
  )
}

