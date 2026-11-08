import { Outlet } from 'react-router-dom'
import { Bell, Moon, Sun } from 'lucide-react'
import { AppSidebar } from './AppSidebar'
import { PageContainer } from '@/shared/components/PageContainer'
import { Button } from '@/shared/components/ui/button'
import { useTheme } from 'next-themes'
import { useAuth } from '@/core/auth/auth-context'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/shared/components/ui/sidebar'
import { UserDropdown } from './UserDropdown'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import type { PhanCongPhien } from '@/core/auth/auth.types'

function scopeText(assignment: PhanCongPhien | undefined) {
  if (!assignment) return 'Chưa có phạm vi đang hoạt động'
  if (assignment.loaiPhamVi === 'TOAN_HE_THONG') return 'Toàn hệ thống'
  if (assignment.loaiPhamVi === 'CA_NHAN') return 'Phạm vi cá nhân'
  if (assignment.loaiPhamVi === 'CAY_DON_VI') return assignment.tenDonViGoc?.trim() || 'Phạm vi tổ chức chưa xác định'
  if (assignment.loaiPhamVi === 'DON_VI_CHI_DINH') {
    if (assignment.donViChiDinh.length > 1) return `${assignment.donViChiDinh.length} đơn vị được phân quyền`
    if (assignment.donViChiDinh.length === 1) return assignment.donViChiDinh[0]?.trim() || 'Đơn vị được phân quyền'
    return 'Chưa có đơn vị được chỉ định'
  }
  return 'Phạm vi chưa xác định'
}

export function AdminLayout() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const { taiKhoan, dangTaiPhien, loiTaiPhien } = useAuth()
  const activeAssignment = taiKhoan?.phanCongHopLe.find((item) => item.maPhanCong === taiKhoan.maPhanCongVaiTroDangHoatDong)
  const currentTheme = resolvedTheme ?? theme
  const activeScope = dangTaiPhien
    ? 'Đang tải phạm vi…'
    : loiTaiPhien
      ? 'Không tải được phạm vi'
      : scopeText(activeAssignment)
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background/90 px-4 backdrop-blur md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Tooltip><TooltipTrigger asChild><SidebarTrigger aria-label="Mở menu" /></TooltipTrigger><TooltipContent>Mở hoặc thu gọn menu</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger asChild><span tabIndex={0} className="max-w-[42vw] truncate text-sm font-medium text-muted-foreground sm:max-w-[32rem]" aria-label={`Phạm vi quản lý: ${activeScope}`}>{activeScope}</span></TooltipTrigger><TooltipContent>{activeScope}</TooltipContent></Tooltip>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" aria-label="Thông báo"><Bell className="size-4" /></Button></TooltipTrigger><TooltipContent>Chức năng thông báo đang được phát triển.</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger asChild><Button
              variant="ghost"
              size="icon"
              aria-label={`Chuyển sang giao diện ${currentTheme === 'dark' ? 'sáng' : 'tối'}`}
              onClick={() => setTheme(currentTheme === 'dark' ? 'light' : 'dark')}
            >
              {currentTheme === 'dark' ? <Moon className="size-4" /> : <Sun className="size-4" />}
            </Button></TooltipTrigger><TooltipContent>Giao diện hiện tại: {currentTheme === 'dark' ? 'tối' : 'sáng'}</TooltipContent></Tooltip>
            <UserDropdown />
          </div>
        </header>
        <PageContainer>
          <Outlet />
        </PageContainer>
      </SidebarInset>
    </SidebarProvider>
  )
}
