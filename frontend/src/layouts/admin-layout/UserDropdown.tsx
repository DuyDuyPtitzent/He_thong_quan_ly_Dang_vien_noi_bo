import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, KeyRound, LogOut, Settings, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/core/auth/auth-context'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { adminHeaderApi } from './admin-header.api'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'

export function UserDropdown() {
  const { taiKhoan, dangTaiPhien, loiTaiPhien, dangXuat, chonPhanCong } = useAuth()
  const navigate = useNavigate()
  const assignments = taiKhoan?.phanCongHopLe ?? []
  const activeAssignment = assignments.find((assignment) => assignment.maPhanCong === taiKhoan?.maPhanCongVaiTroDangHoatDong)
  const tenHienThi = taiKhoan?.hoVaTen?.trim() || taiKhoan?.tenDangNhap || ''
  const tenVaiTroHienTai = activeAssignment?.tenVaiTro ?? (activeAssignment ? 'Vai trò chưa xác định' : 'Chưa chọn vai trò')
  const [dangChuyen, setDangChuyen] = useState(false)
  const [dangLuu, setDangLuu] = useState(false)
  const [loiChuyen, setLoiChuyen] = useState('')
  const [anhDaiDien, setAnhDaiDien] = useState<string>()
  const coQuyenXemAnh = taiKhoan?.quyenDangHoatDong.includes('HO_SO_DANG_VIEN_XEM_TONG_QUAN') ?? false
  const anh = useQuery({
    queryKey: ['admin-header-avatar', taiKhoan?.maTaiKhoan, taiKhoan?.maPhanCongVaiTroDangHoatDong],
    queryFn: adminHeaderApi.avatar,
    enabled: Boolean(taiKhoan && coQuyenXemAnh),
    retry: false,
    staleTime: 60_000,
  })

  useEffect(() => {
    if (!anh.data) { setAnhDaiDien(undefined); return }
    const source = URL.createObjectURL(anh.data)
    setAnhDaiDien(source)
    return () => URL.revokeObjectURL(source)
  }, [anh.data])

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

  const nhanPhamVi = (assignment: (typeof assignments)[number]) => assignment.loaiPhamVi === 'TOAN_HE_THONG'
    ? 'Toàn hệ thống'
    : assignment.loaiPhamVi === 'CAY_DON_VI'
      ? `${assignment.tenDonViGoc ?? 'Đơn vị được chọn'} và các đơn vị con`
      : assignment.loaiPhamVi === 'DON_VI_CHI_DINH'
        ? assignment.donViChiDinh.filter(Boolean).join(', ') || 'Đơn vị chỉ định'
        : 'Cá nhân'

  if (!taiKhoan) return <div className="flex items-center gap-2" aria-label={loiTaiPhien ? 'Không tải được thông tin người dùng' : dangTaiPhien ? 'Đang tải thông tin người dùng' : 'Chưa có thông tin người dùng'}>
    <Skeleton className="size-8 rounded-full" />
    <div className="hidden space-y-1 sm:block"><Skeleton className="h-3 w-24"/><Skeleton className="h-3 w-16"/></div>
  </div>

  const kyTuDaiDien = tenHienThi.trim().slice(0, 1).toLocaleUpperCase('vi-VN')

  return <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-auto max-w-[min(13rem,38vw)] justify-start gap-2 px-1.5 py-1 sm:max-w-60" aria-label="Mở menu tài khoản">
          <Avatar className="size-8 shrink-0">
            <AvatarImage src={anhDaiDien} alt={`Ảnh đại diện của ${tenHienThi}`} />
            <AvatarFallback>{kyTuDaiDien}</AvatarFallback>
          </Avatar>
          <span className="min-w-0 text-left leading-tight">
            <span className="block truncate text-sm font-medium">{tenHienThi}</span>
            <span className="block truncate text-xs font-normal text-muted-foreground">{tenVaiTroHienTai}</span>
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>
          <span className="block truncate">{tenHienThi}</span>
          <span className="block truncate text-xs font-normal text-muted-foreground">{tenVaiTroHienTai}</span>
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
