import { LogOut, Settings, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/core/auth/auth-context'
import { Avatar, AvatarFallback } from '@/shared/components/ui/avatar'
import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'

export function UserDropdown() {
  const { taiKhoan, dangXuat } = useAuth()
  const navigate = useNavigate()

  async function xuLyDangXuat() {
    try {
      await dangXuat()
      navigate('/dang-nhap', { replace: true })
    } catch {
      toast.error('Không thể đăng xuất. Vui lòng thử lại.')
    }
  }

  const kyTuDaiDien = taiKhoan?.tenDangNhap.slice(0, 1).toLocaleUpperCase('vi-VN') ?? 'T'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Mở menu tài khoản">
          <Avatar className="size-8">
            <AvatarFallback>{kyTuDaiDien}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <span className="block">{taiKhoan?.tenDangNhap ?? 'Tài khoản'}</span>
          <span className="block text-xs font-normal text-muted-foreground">Tài khoản nội bộ</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate('/settings/profile')}>
          <UserRound />
          Tài khoản
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate('/settings')}>
          <Settings />
          Cài đặt
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void xuLyDangXuat()}>
          <LogOut />
          Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
