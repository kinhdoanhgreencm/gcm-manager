'use client'

import { useAuth } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation';
import { hasAnyPermission, PermissionCategories } from '@/utils/permissions';
import { Loader2 } from 'lucide-react';
import { AccessDenied } from './AccessDenied';

/**
 * Mapping between routes and their required permission categories
 * Empty array means accessible to all logged-in users
 */
const routePermissions: Record<string, string[]> = {
  '/dashboard': [], // Dashboard - always accessible to all logged-in users
  '/inventory': PermissionCategories.inventory,
  '/suppliers': PermissionCategories.suppliers,
  '/crm': PermissionCategories.customers,
  '/staff': PermissionCategories.staff,
  '/debt': PermissionCategories.debt,
  '/finance': PermissionCategories.finance,
  '/accounting': PermissionCategories.accounting,
  '/contracts': PermissionCategories.contracts,
  '/promotions': PermissionCategories.promotions,
  '/carriers': PermissionCategories.carriers,
  '/registration': PermissionCategories.registration,
  '/claims': PermissionCategories.claims,
  '/reports': PermissionCategories.reports,
  '/profile': [], // Profile page - accessible to all logged-in users
  '/settings': [], // Settings page - accessible to all logged-in users
};

/**
 * Get required permissions for a given pathname
 */
function getRequiredPermissions(pathname: string): string[] {
  // Action-level route checks (new/edit) must be evaluated BEFORE module-level prefix checks
  // Inventory
  if (pathname.startsWith('/inventory/new')) return ['inventoryCreate'];
  if (pathname.includes('/inventory/') && pathname.endsWith('/edit')) return ['inventoryUpdate'];

  // Suppliers
  if (pathname.startsWith('/suppliers/new')) return ['supplierCreate'];
  if (pathname.includes('/suppliers/') && pathname.endsWith('/edit')) return ['supplierUpdate'];

  // CRM (Customers)
  if (pathname.startsWith('/crm/new')) return ['customerCreate'];
  if (pathname.includes('/crm/') && pathname.endsWith('/edit')) return ['customerUpdate'];

  // Staff
  if (pathname.startsWith('/staff/new')) return ['staffCreate'];
  if (pathname.includes('/staff/') && pathname.endsWith('/edit')) return ['staffUpdate'];

  // Carriers
  if (pathname.startsWith('/carriers/new')) return ['carriersCreate'];
  if (pathname.includes('/carriers/') && pathname.endsWith('/edit')) return ['carriersUpdate'];

  // Promotions
  if (pathname.startsWith('/promotions/new')) return ['promotionsCreate'];
  if (pathname.startsWith('/promotions/edit')) return ['promotionsUpdate'];

  // Finance
  if (pathname.startsWith('/finance/new')) return ['financeCreate'];

  // Contracts
  if (pathname.startsWith('/contracts/new')) return ['contractsCreate'];
  if (pathname.includes('/contracts/') && pathname.endsWith('/edit')) return ['contractsUpdate'];

  // Claims
  if (pathname.startsWith('/claims/new')) return ['claimsCreate'];
  if (pathname.includes('/claims/') && pathname.endsWith('/edit')) return ['claimsUpdate'];

  // Check exact match first
  if (routePermissions[pathname]) {
    return routePermissions[pathname];
  }

  // Check if pathname starts with any route (for nested routes)
  for (const [route, permissions] of Object.entries(routePermissions)) {
    if (pathname.startsWith(route)) {
      return permissions;
    }
  }

  // Default: no permissions required (allow access)
  return [];
}

interface PermissionGuardProps {
  children: React.ReactNode;
}

/**
 * Component to guard routes based on user permissions
 * Shows access denied message if user doesn't have required permissions
 */
export function PermissionGuard({ children }: PermissionGuardProps) {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  // Show loading while checking permissions
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-[#00d26a] mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Đang kiểm tra quyền truy cập...</p>
        </div>
      </div>
    );
  }

  // If no user, ProtectedRoute will handle this
  if (!user) {
    return null;
  }

  // Get required permissions for current route
  const requiredPermissions = getRequiredPermissions(pathname);

  // If no permissions required, allow access
  if (requiredPermissions.length === 0) {
    return <>{children}</>;
  }

  // Check if user has required permissions
  const hasAccess = hasAnyPermission(user.permissions, requiredPermissions);

  // If user doesn't have access, show access denied message
  if (!hasAccess) {
    return (
      <AccessDenied 
        message="Bạn không có quyền truy cập vào trang này. Vui lòng liên hệ quản trị viên để được cấp quyền."
        redirectTo="/dashboard"
        icon="shield"
      />
    );
  }

  // User has access, render children
  return <>{children}</>;
}
