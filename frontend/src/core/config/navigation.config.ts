import { BarChart3, BookOpenCheck, Building2, CalendarDays, LayoutDashboard, Network, Settings, ShieldCheck, UserRound, UsersRound, type LucideIcon } from 'lucide-react'

export type NavigationItem = {
  id: string
  title: string
  path?: string
  icon?: LucideIcon
  children?: NavigationItem[]
  permission?: string | string[]
  hidden?: boolean
  disabled?: boolean
}

export const navigationConfig: { title: string; items: NavigationItem[] }[] = [
  {
    title: 'Tổng quan',
    items: [{ id: 'dashboard', title: 'Tổng quan', path: '/', icon: LayoutDashboard }],
  },
  {
    title: 'Quản lý Đảng viên',
    items: [
      { id: 'member-profiles', title: 'Hồ sơ Đảng viên', path: '/ho-so-dang-vien', icon: UserRound, permission: 'HO_SO_DANG_VIEN_XEM_DANH_SACH' },
      { id: 'my-member-profile', title: 'Hồ sơ của tôi', path: '/ho-so-cua-toi', icon: UserRound, permission: 'HO_SO_CA_NHAN_XEM' },
      { id: 'profile-updates', title: 'Cập nhật hồ sơ', path: '/cap-nhat-ho-so', icon: CalendarDays, permission: ['HO_SO_CA_NHAN_MO_DOT_CAP_NHAT', 'HO_SO_CA_NHAN_XEM_YEU_CAU_CAP_NHAT', 'HO_SO_CA_NHAN_DUYET_CAP_NHAT'] },
      { id: 'resolution-learning', title: 'Học tập nghị quyết (Đang phát triển)', icon: BookOpenCheck, disabled: true },
    ],
  },
  {
    title: 'Tổ chức và danh mục',
    items: [
      { id: 'organizations', title: 'Cơ cấu tổ chức', path: '/to-chuc', icon: Building2, permission: 'TO_CHUC_XEM' },
      { id: 'school-years', title: 'Quản lý năm học', path: '/nam-hoc', icon: CalendarDays, permission: 'NAM_HOC_XEM' },
    ],
  },
  {
    title: 'Quản trị hệ thống',
    items: [
      { id: 'accounts', title: 'Quản lý tài khoản', path: '/tai-khoan', icon: UsersRound, permission: 'TAI_KHOAN_XEM' },
      { id: 'account-assignments', title: 'Phân quyền tài khoản', path: '/phan-quyen-tai-khoan', icon: Network, permission: 'PHAN_CONG_VAI_TRO_XEM' },
      { id: 'authorization-matrix', title: 'Ma trận phân quyền', path: '/quan-tri-phan-quyen/vai-tro', icon: ShieldCheck, permission: ['VAI_TRO_XEM', 'QUYEN_XEM_DANH_MUC'] },
      {
        id: 'settings',
        title: 'Cài đặt hệ thống',
        path: '/settings',
        icon: Settings,
        children: [
          { id: 'settings-profile', title: 'Hồ sơ', path: '/settings/profile' },
          { id: 'settings-appearance', title: 'Giao diện', path: '/settings/appearance' },
        ],
      },
      { id: 'system-logs', title: 'Nhật ký hệ thống (Đang phát triển)', icon: Network, permission: ['NHAT_KY_KIEM_TOAN_XEM', 'NHAT_KY_BAO_MAT_XEM'], disabled: true },
    ],
  },
  {
    title: 'Thống kê và báo cáo',
    items: [{ id: 'reports', title: 'Báo cáo, thống kê (Đang phát triển)', icon: BarChart3, disabled: true }],
  },
]
