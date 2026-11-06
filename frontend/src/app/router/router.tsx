import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter, Navigate, useLocation } from 'react-router-dom'
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
const OrganizationsPage = lazy(() => import('@/features/organizations/OrganizationsPage').then((module) => ({ default: module.OrganizationsPage })))
const AccountsPage = lazy(() => import('@/features/accounts/AccountsPage').then((module) => ({ default: module.AccountsPage })))
const AccountAssignmentsPage = lazy(() => import('@/features/accounts/AccountAssignmentsPage').then((module) => ({ default: module.AccountAssignmentsPage })))
const MemberProfilesPage = lazy(() => import('@/features/accounts/MemberProfilesPage').then((module) => ({ default: module.MemberProfilesPage })))
const MemberProfileDetailPage = lazy(() => import('@/features/accounts/MemberProfileDetailPage').then((module) => ({ default: module.MemberProfileDetailPage })))
const MyMemberProfilePage = lazy(() => import('@/features/accounts/MyMemberProfilePage').then((module) => ({ default: module.MyMemberProfilePage })))
const MemberProfileUpdatesPage = lazy(() => import('@/features/accounts/MemberProfileUpdatesPage').then((module) => ({ default: module.MemberProfileUpdatesPage })))
const SchoolYearsPage = lazy(() => import('@/features/school-years/SchoolYearsPage').then((module) => ({ default: module.SchoolYearsPage })))
const ComponentLibraryPage = import.meta.env.DEV
  ? lazy(() => import('@/features/developer/ComponentLibraryPage').then((module) => ({ default: module.ComponentLibraryPage })))
  : null
const loadPage = (page: ReactNode) => <Suspense fallback={<LoadingState />}>{page}</Suspense>

function RedirectLegacyAssignmentsPage() {
  const location = useLocation()
  return <Navigate to={{ pathname: '/phan-quyen-tai-khoan', search: location.search }} replace />
}

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
      { path: 'nam-hoc', element: loadPage(<SchoolYearsPage />), handle: { title: 'Quản lý năm học' } },
      { path: 'ho-so-dang-vien', element: loadPage(<MemberProfilesPage />), handle: { title: 'Hồ sơ Đảng viên' } },
      { path: 'ho-so-cua-toi', element: loadPage(<MyMemberProfilePage />), handle: { title: 'Hồ sơ của tôi' } },
      { path: 'ho-so-cua-toi/cap-nhat', element: <Navigate to="/ho-so-cua-toi" replace />, handle: { title: 'Hồ sơ của tôi' } },
      { path: 'cap-nhat-ho-so', element: loadPage(<MemberProfileUpdatesPage />), handle: { title: 'Cập nhật hồ sơ cá nhân' } },
      { path: 'ho-so-dang-vien/:profileId', element: loadPage(<MemberProfileDetailPage />), handle: { title: 'Chi tiết hồ sơ Đảng viên' } },
      { path: 'tai-khoan', element: loadPage(<AccountsPage />), handle: { title: 'Quản lý tài khoản' } },
      ...(ComponentLibraryPage
        ? [{ path: 'dev/component-library', element: loadPage(<ComponentLibraryPage />), handle: { title: 'Thư viện thành phần giao diện' } }]
        : []),
      { path: 'phan-quyen-tai-khoan', element: loadPage(<AccountAssignmentsPage />), handle: { title: 'Phân quyền tài khoản' } },
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
      { path: 'quan-tri-phan-quyen/phan-cong', element: <RedirectLegacyAssignmentsPage />, handle: { title: 'Phân quyền tài khoản' } },
      { path: '*', element: <NotFoundPage />, handle: { title: 'Không tìm thấy' } },
    ],
  },
])
