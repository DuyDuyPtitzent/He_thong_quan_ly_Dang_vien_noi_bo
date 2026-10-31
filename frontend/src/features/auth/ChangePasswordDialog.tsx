import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, KeyRound } from 'lucide-react'
import { normalizeApiError } from '@/core/api/client'
import { useAuth } from '@/core/auth/auth-context'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Dialog, DialogContent } from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Separator } from '@/shared/components/ui/separator'

export function ChangePasswordDialog() {
  const { taiKhoan, doiMatKhau, dangXuat } = useAuth()
  const navigate = useNavigate()
  const [matKhauHienTai, setMatKhauHienTai] = useState('')
  const [matKhauMoi, setMatKhauMoi] = useState('')
  const [xacNhanMatKhau, setXacNhanMatKhau] = useState('')
  const [hienMatKhau, setHienMatKhau] = useState(false)
  const [dangGui, setDangGui] = useState(false)
  const [loi, setLoi] = useState('')

  async function xuLyDoiMatKhau(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoi('')
    if (matKhauMoi.length < 12 || matKhauMoi.length > 128) {
      setLoi('Mật khẩu mới cần có từ 12 đến 128 ký tự.')
      return
    }
    if (matKhauMoi !== xacNhanMatKhau) {
      setLoi('Mật khẩu xác nhận chưa khớp.')
      return
    }
    if (matKhauMoi === matKhauHienTai) {
      setLoi('Mật khẩu mới phải khác mật khẩu hiện tại.')
      return
    }

    setDangGui(true)
    try {
      await doiMatKhau({ matKhauHienTai, matKhauMoi })
    } catch (error) {
      setLoi(normalizeApiError(error).message)
    } finally {
      setDangGui(false)
    }
  }

  async function xuLyDangXuat() {
    setLoi('')
    setDangGui(true)
    try {
      await dangXuat()
      navigate('/dang-nhap', { replace: true })
    } catch (error) {
      setLoi(normalizeApiError(error).message)
    } finally {
      setDangGui(false)
    }
  }

  return (
    <Dialog open>
      <DialogContent
        className="max-h-[min(90svh,760px)] overflow-y-auto border-outline-variant/50 bg-card p-0 sm:max-w-[620px]"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        aria-describedby="doi-mat-khau-mo-ta"
      >
        <Card className="gap-0 border-0 bg-transparent py-0 shadow-none">
          <CardHeader className="space-y-3 p-6 pb-4 text-center sm:p-8 sm:pb-5">
            <div className="space-y-2">
              <CardTitle className="text-2xl font-bold">Đổi mật khẩu lần đầu</CardTitle>
              <CardDescription id="doi-mat-khau-mo-ta" className="leading-6">
                Vì lý do bảo mật, tài khoản {taiKhoan?.tenDangNhap} cần đổi mật khẩu trước khi tiếp
                tục sử dụng hệ thống.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 px-6 pb-6 sm:px-8 sm:pb-8">
            {loi ? (
              <div
                className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive"
                role="alert"
                aria-live="polite"
              >
                {loi}
              </div>
            ) : null}
            <form className="space-y-5" onSubmit={xuLyDoiMatKhau}>
              <div className="space-y-2">
                <Label htmlFor="mat-khau-hien-tai">Mật khẩu hiện tại</Label>
                <Input
                  id="mat-khau-hien-tai"
                  type={hienMatKhau ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={matKhauHienTai}
                  onChange={(event) => setMatKhauHienTai(event.target.value)}
                  required
                  maxLength={256}
                  disabled={dangGui}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mat-khau-moi">Mật khẩu mới</Label>
                <div className="relative">
                  <Input
                    id="mat-khau-moi"
                    type={hienMatKhau ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={matKhauMoi}
                    onChange={(event) => setMatKhauMoi(event.target.value)}
                    required
                    minLength={12}
                    maxLength={128}
                    disabled={dangGui}
                    className="pr-12"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-1/2 right-1 -translate-y-1/2"
                    onClick={() => setHienMatKhau((hien) => !hien)}
                    aria-label={hienMatKhau ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    aria-pressed={hienMatKhau}
                    disabled={dangGui}
                  >
                    {hienMatKhau ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Dùng từ 12 đến 128 ký tự.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="xac-nhan-mat-khau">Nhập lại mật khẩu mới</Label>
                <Input
                  id="xac-nhan-mat-khau"
                  type={hienMatKhau ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={xacNhanMatKhau}
                  onChange={(event) => setXacNhanMatKhau(event.target.value)}
                  required
                  minLength={12}
                  maxLength={128}
                  disabled={dangGui}
                />
              </div>
              <Button type="submit" className="h-11 w-full" disabled={dangGui}>
                {dangGui ? (
                  <span className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                ) : (
                  <KeyRound aria-hidden="true" />
                )}
                Cập nhật mật khẩu
              </Button>
            </form>
            <Separator />
            <div className="text-center">
              <Button type="button" variant="link" onClick={() => void xuLyDangXuat()} disabled={dangGui}>
                Đăng xuất khỏi tài khoản này
              </Button>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  )
}
