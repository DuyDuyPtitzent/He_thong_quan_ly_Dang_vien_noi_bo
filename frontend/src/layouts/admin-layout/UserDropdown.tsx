import { useEffect, useState } from 'react'
import { Check, KeyRound, LogOut, Settings, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/core/auth/auth-context'
import { Avatar, AvatarFallback } from '@/shared/components/ui/avatar'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'

export function UserDropdown() {
  const { taiKhoan, dangXuat, chonPhanCong } = useAuth()
  const navigate = useNavigate()
  const assignments = taiKhoan?.phanCongHopLe ?? []
  const [dangChuyen, setDangChuyen] = useState(false)
  const [dangLuu, setDangLuu] = useState(false)
  const [loiChuyen, setLoiChuyen] = useState('')

  useEffect(() => {
    setDangChuyen(assignments.length > 1 && !taiKhoan?.maPhanCongVaiTroDangHoatDong)
  }, [assignments.length, taiKhoan?.maPhanCongVaiTroDangHoatDong])

  async function chon(maPhanCong: string) {
    if (maPhanCong === taiKhoan?.maPhanCongVaiTroDangHoatDong) return
    setDangLuu(true)
    setLoiChuyen('')
    try {
      await chonPhanCong(maPhanCong)
      setDangChuyen(false)
    } catch (error) {
      setLoiChuyen(error instanceof Error ? error.message : 'Không thể chuyển vai trò. Hãy thử lại.')
    } finally {
      setDangLuu(false)
    }
  }

  async function xuLyDangXuat() {
    try {
      await dangXuat()
      navigate('/dang-nhap', { replace: true })
    } catch {
      toast.error('Không thể đăng xuất. Vui lòng thử lại.')
    }
  }

  const kyTuDaiDien = taiKhoan?.tenDangNhap.slice(0, 1).toLocaleUpperCase('vi-VN') ?? 'T'
  const nhanPhamVi = (assignment: (typeof assignments)[number]) => assignment.loaiPhamVi === 'TOAN_HE_THONG'
    ? 'Toàn hệ thống'
    : assignment.loaiPhamVi === 'CAY_DON_VI'
      ? `${assignment.tenDonViGoc ?? 'Đơn vị được chọn'} và các đơn vị con`
      : assignment.loaiPhamVi === 'DON_VI_CHI_DINH'
        ? assignment.donViChiDinh.filter(Boolean).join(', ') || 'Đơn vị chỉ định'
        : 'Cá nhân'

  return <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Mở menu tài khoản">
          <Avatar className="size-8"><AvatarFallback>{kyTuDaiDien}</AvatarFallback></Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>
          <span className="block">{taiKhoan?.tenDangNhap ?? 'Tài khoản'}</span>
          <span className="block text-xs font-normal text-muted-foreground">Tài khoản nội bộ</span>
        </DropdownMenuLabel>
        {assignments.length > 0 && <>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Vai trò và phạm vi</DropdownMenuLabel>
          {assignments.map((assignment) => <DropdownMenuItem key={assignment.maPhanCong} disabled={dangLuu} onSelect={() => void chon(assignment.maPhanCong)}>
            <span className="min-w-0 flex-1"><span className="block truncate">{assignment.tenVaiTro}</span><span className="block truncate text-xs text-muted-foreground">{nhanPhamVi(assignment)}</span></span>
            {taiKhoan?.maPhanCongVaiTroDangHoatDong === assignment.maPhanCong && <Check aria-hidden="true" className="size-4" />}
          </DropdownMenuItem>)}
        </>}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate('/settings/profile')}><UserRound />Tài khoản</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate('/settings/security/change-password')}><KeyRound />Đổi mật khẩu</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate('/settings')}><Settings />Cài đặt</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void xuLyDangXuat()}><LogOut />Đăng xuất</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <Dialog open={dangChuyen} onOpenChange={(open) => {
      if (!open && assignments.length > 1 && !taiKhoan?.maPhanCongVaiTroDangHoatDong) return
      setDangChuyen(open)
    }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Chọn vai trò làm việc</DialogTitle><DialogDescription>Chọn một phân công còn hiệu lực để tiếp tục. Quyền và phạm vi không được cộng dồn.</DialogDescription></DialogHeader>
        {loiChuyen && <p role="alert" className="text-sm text-destructive">{loiChuyen}</p>}
        <div className="space-y-2">{assignments.map((assignment) => <Button key={assignment.maPhanCong} variant="outline" className="h-auto w-full justify-start whitespace-normal p-3 text-left" disabled={dangLuu} onClick={() => void chon(assignment.maPhanCong)}><span><span className="block font-medium">{assignment.tenVaiTro}</span><span className="block text-sm text-muted-foreground">{nhanPhamVi(assignment)}</span></span></Button>)}</div>
      </DialogContent>
    </Dialog>
  </>
}
