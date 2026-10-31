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
      { path: 'settings', element: loadPage(<SettingsPage />), handle: { title: 'Cài đặt' } },
      { path: 'settings/profile', element: loadPage(<SettingsPage />), handle: { title: 'Hồ sơ' } },
      {
        path: 'settings/appearance',
        element: loadPage(<SettingsPage />),
        handle: { title: 'Giao diện' },
      },
      { path: '*', element: <NotFoundPage />, handle: { title: 'Không tìm thấy' } },
    ],
  },
])
