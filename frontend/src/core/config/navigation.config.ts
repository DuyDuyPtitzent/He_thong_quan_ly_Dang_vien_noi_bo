import { Building2, LayoutDashboard, Network, Settings, ShieldCheck, type LucideIcon } from 'lucide-react'
export type NavigationItem = {
  id: string
  title: string
  path?: string
  icon?: LucideIcon
  children?: NavigationItem[]
  permission?: string
  hidden?: boolean
}
export const navigationConfig: { title: string; items: NavigationItem[] }[] = [
  {
    title: 'Không gian làm việc',
    items: [
      { id: 'dashboard', title: 'Tổng quan', path: '/', icon: LayoutDashboard },
      { id: 'organizations', title: 'Cơ cấu tổ chức', path: '/to-chuc', icon: Building2 },
      {
        id: 'authorization',
        title: 'Quản trị phân quyền',
        path: '/quan-tri-phan-quyen/vai-tro',
        icon: ShieldCheck,
        children: [
          { id: 'authorization-roles', title: 'Vai trò và ma trận', path: '/quan-tri-phan-quyen/vai-tro', icon: ShieldCheck },
          { id: 'authorization-assignments', title: 'Phân công vai trò', path: '/quan-tri-phan-quyen/phan-cong', icon: Network },
        ],
      },
      {
        id: 'settings',
        title: 'Cài đặt',
        path: '/settings',
        icon: Settings,
        children: [
          { id: 'settings-profile', title: 'Hồ sơ', path: '/settings/profile' },
          { id: 'settings-appearance', title: 'Giao diện', path: '/settings/appearance' },
        ],
      },
    ],
  },
]
