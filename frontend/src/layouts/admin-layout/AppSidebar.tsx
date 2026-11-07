import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Check, ChevronDown, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/core/auth/auth-context'
import { coQuyenTruyCapNhatKyToanHeThong } from '@/core/auth/system-log-access'
import { appConfig } from '@/core/config/app.config'
import { navigationConfig } from '@/core/config/navigation.config'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarTrigger,
} from '@/shared/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/components/ui/collapsible'

export function AppSidebar() {
  const location = useLocation()
  const { taiKhoan, chonPhanCong } = useAuth()
  const [switching, setSwitching] = useState(false)
  const activeAssignment = taiKhoan?.phanCongHopLe.find((assignment) => assignment.maPhanCong === taiKhoan.maPhanCongVaiTroDangHoatDong)
  const activeScope = activeAssignment?.loaiPhamVi === 'TOAN_HE_THONG'
    ? 'Toàn hệ thống'
    : activeAssignment?.loaiPhamVi === 'CAY_DON_VI'
      ? `${activeAssignment.tenDonViGoc ?? 'Đơn vị được chọn'} và đơn vị trực thuộc`
      : activeAssignment?.loaiPhamVi === 'DON_VI_CHI_DINH'
        ? activeAssignment.donViChiDinh.filter(Boolean).join(', ') || 'Đơn vị được chỉ định'
        : activeAssignment ? 'Cá nhân' : 'Chưa chọn vai trò'
  async function switchAssignment(maPhanCong: string) {
    if (switching || maPhanCong === taiKhoan?.maPhanCongVaiTroDangHoatDong) return
    setSwitching(true)
    try {
      await chonPhanCong(maPhanCong)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể chuyển vai trò. Hãy thử lại.')
    } finally {
      setSwitching(false)
    }
  }
  const permissions = new Set(taiKhoan?.quyenDangHoatDong ?? [])
  const hasPermission = (permission?: string | string[]) =>
    !permission || (Array.isArray(permission)
      ? permission.some((code) => permissions.has(code))
      : permissions.has(permission))
  const canAccessSystemLogs = coQuyenTruyCapNhatKyToanHeThong(taiKhoan)
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex min-h-10 items-center gap-3 px-2 py-2">
          <div className="grid size-8 shrink-0 place-items-center rounded-md bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground">
            A
          </div>
          <span className="font-semibold leading-tight group-data-[collapsible=icon]:hidden">
            {appConfig.name}
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {navigationConfig.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items
                .map((item) => ({
                  ...item,
                  children: item.children?.filter((child) => !child.hidden && hasPermission(child.permission)),
                }))
                  .filter((item) => !item.hidden && (!item.systemAdministratorOnly || canAccessSystemLogs) && hasPermission(item.permission) && (!item.children || item.children.length > 0))
                  .map((item) => {
                    const Icon = item.icon
                    if (!Icon) return null
                    if (item.disabled) {
                      return (
                        <SidebarMenuItem key={item.id}>
                          <SidebarMenuButton disabled tooltip={item.title}>
                            <Icon />
                            <span>{item.title}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )
                    }
                    const active =
                      location.pathname === item.path ||
                      Boolean(item.children?.some((child) => child.path === location.pathname))
                    return (
                      <Collapsible
                        key={item.id}
                        asChild
                        defaultOpen={active && Boolean(item.children?.length)}
                      >
                        <SidebarMenuItem>
                          {item.children?.length ? (
                            <>
                              <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                                <CollapsibleTrigger aria-label={item.title} className="relative pr-8" aria-controls={`sidebar-submenu-${item.id}`}>
                                  <Icon />
                                  <span>{item.title}</span>
                                  <span aria-hidden="true" className="absolute top-1.5 right-1 flex size-5 items-center justify-center">
                                    <ChevronDown className="size-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                                  </span>
                                </CollapsibleTrigger>
                              </SidebarMenuButton>
                              <CollapsibleContent>
                                <SidebarMenuSub id={`sidebar-submenu-${item.id}`}>
                                  {item.children.map((child) => (
                                    <SidebarMenuSubItem key={child.id}>
                                      <SidebarMenuSubButton
                                        asChild
                                        isActive={location.pathname === child.path}
                                      >
                                        <Link to={child.path ?? '#'}>{child.title}</Link>
                                      </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                  ))}
                                </SidebarMenuSub>
                              </CollapsibleContent>
                            </>
                          ) : (
                            <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                              <Link to={item.path ?? '#'} aria-current={active ? 'page' : undefined}>
                                <Icon />
                                <span>{item.title}</span>
                              </Link>
                            </SidebarMenuButton>
                          )}
                        </SidebarMenuItem>
                      </Collapsible>
                    )
                  })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" disabled={!taiKhoan?.phanCongHopLe.length || switching} className="flex min-h-11 w-full min-w-0 items-center gap-2 rounded-md border bg-sidebar-accent/40 px-2 py-1.5 text-left outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring disabled:cursor-default disabled:opacity-70 group-data-[collapsible=icon]:justify-center" title={activeAssignment ? `${activeAssignment.tenVaiTro} · ${activeScope}` : 'Chưa chọn vai trò'}>
              <ShieldCheck aria-hidden="true" className="size-4 shrink-0 text-sidebar-foreground/70" />
              <span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                <span className="block text-[11px] leading-4 text-muted-foreground">Vai trò đang dùng</span>
                <span className="block truncate text-xs font-medium">{activeAssignment?.tenVaiTro ?? 'Chưa chọn vai trò'}</span>
                {activeAssignment && <span className="block truncate text-[11px] text-muted-foreground">{activeScope}</span>}
              </span>
              <ChevronDown aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-64">
            <DropdownMenuLabel>Chọn vai trò làm việc</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {taiKhoan?.phanCongHopLe.map((assignment) => {
              const scope = assignment.loaiPhamVi === 'TOAN_HE_THONG'
                ? 'Toàn hệ thống'
                : assignment.loaiPhamVi === 'CAY_DON_VI'
                  ? `${assignment.tenDonViGoc ?? 'Đơn vị được chọn'} và đơn vị trực thuộc`
                  : assignment.loaiPhamVi === 'DON_VI_CHI_DINH'
                    ? assignment.donViChiDinh.filter(Boolean).join(', ') || 'Đơn vị được chỉ định'
                    : 'Cá nhân'
              return <DropdownMenuItem key={assignment.maPhanCong} disabled={switching} onSelect={() => void switchAssignment(assignment.maPhanCong)}>
                <span className="min-w-0 flex-1"><span className="block truncate">{assignment.tenVaiTro}</span><span className="block truncate text-xs text-muted-foreground">{scope}</span></span>
                {taiKhoan?.maPhanCongVaiTroDangHoatDong === assignment.maPhanCong && <Check aria-hidden="true" className="size-4" />}
              </DropdownMenuItem>
            })}
          </DropdownMenuContent>
        </DropdownMenu>
        <SidebarTrigger className="w-full justify-start" />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
