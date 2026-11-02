import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AdminLayout } from '@/layouts/admin-layout/AdminLayout'
import { LoadingState } from '@/shared/components/LoadingState'
import { NotFoundPage } from '@/shared/components/NotFoundPage'
import { RouteErrorPage } from '@/shared/components/RouteErrorPage'
import { RequireAuth } from '@/core/auth/RequireAuth'

const DashboardPage = lazy(() =>
  import('@/features/dashboard/DashboardPage').then((module) => ({
    default: module.DashboardPage,
  })),
)
const SettingsPage = lazy(() =>
  import('@/features/settings/SettingsPage').then((module) => ({ default: module.SettingsPage })),
)
const LoginPage = lazy(() =>
  import('@/features/auth/LoginPage').then((module) => ({ default: module.LoginPage })),
)
const ChangePasswordPage = lazy(() =>
  import('@/features/auth/ChangePasswordPage').then((module) => ({
    default: module.ChangePasswordPage,
  })),
)
const PermissionCatalogPage = lazy(() => import('@/features/authorization/PermissionCatalogPage').then((module) => ({ default: module.PermissionCatalogPage })))
const RoleListPage = lazy(() => import('@/features/authorization/RoleListPage').then((module) => ({ default: module.RoleListPage })))
const RoleDetailPage = lazy(() => import('@/features/authorization/RoleDetailPage').then((module) => ({ default: module.RoleDetailPage })))
const AssignmentsPage = lazy(() => import('@/features/authorization/AssignmentsPage').then((module) => ({ default: module.AssignmentsPage })))
const OrganizationsPage = lazy(() => import('@/features/organizations/OrganizationsPage').then((module) => ({ default: module.OrganizationsPage })))
const loadPage = (page: ReactNode) => <Suspense fallback={<LoadingState />}>{page}</Suspense>

export const router = createBrowserRouter([
  {
    path: '/dang-nhap',
    element: loadPage(<LoginPage />),
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/doi-mat-khau',
    element: <Navigate to="/" replace />,
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AdminLayout />
      </RequireAuth>
    ),
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: loadPage(<DashboardPage />), handle: { title: 'Tổng quan' } },
      { path: 'to-chuc', element: loadPage(<OrganizationsPage />), handle: { title: 'Cơ cấu tổ chức' } },
      { path: 'settings', element: loadPage(<SettingsPage />), handle: { title: 'Cài đặt' } },
      { path: 'settings/profile', element: loadPage(<SettingsPage />), handle: { title: 'Hồ sơ' } },
      {
        path: 'settings/security/change-password',
        element: loadPage(<ChangePasswordPage />),
        handle: { title: 'Đổi mật khẩu' },
      },
      {
        path: 'settings/appearance',
        element: loadPage(<SettingsPage />),
        handle: { title: 'Giao diện' },
      },
      { path: 'quan-tri-phan-quyen/quyen', element: loadPage(<PermissionCatalogPage />), handle: { title: 'Danh mục quyền' } },
      { path: 'quan-tri-phan-quyen/vai-tro', element: loadPage(<RoleListPage />), handle: { title: 'Vai trò và ma trận quyền' } },
      { path: 'quan-tri-phan-quyen/ma-tran', element: <Navigate to="/quan-tri-phan-quyen/vai-tro" replace />, handle: { title: 'Ma trận quyền' } },
      { path: 'quan-tri-phan-quyen/vai-tro/:maVaiTro', element: loadPage(<RoleDetailPage />), handle: { title: 'Ma trận vai trò' } },
      { path: 'quan-tri-phan-quyen/phan-cong', element: loadPage(<AssignmentsPage />), handle: { title: 'Phân công vai trò' } },
      { path: '*', element: <NotFoundPage />, handle: { title: 'Không tìm thấy' } },
    ],
  },
])
