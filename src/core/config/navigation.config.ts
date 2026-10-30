import { LayoutDashboard, Settings, type LucideIcon } from 'lucide-react'
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
