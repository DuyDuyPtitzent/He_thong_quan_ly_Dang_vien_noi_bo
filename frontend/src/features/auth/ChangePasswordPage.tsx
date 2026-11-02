import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import { normalizeApiError } from '@/core/api/client'
import { useAuth } from '@/core/auth/auth-context'
import { PageHeader } from '@/shared/components/PageHeader'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'

export function ChangePasswordPage() {
  const { doiMatKhau } = useAuth()
  const navigate = useNavigate()
  const [matKhauHienTai, setMatKhauHienTai] = useState('')
  const [matKhauMoi, setMatKhauMoi] = useState('')
  const [xacNhanMatKhau, setXacNhanMatKhau] = useState('')
  const [hienMatKhau, setHienMatKhau] = useState(false)
  const [loi, setLoi] = useState('')
  const [dangGui, setDangGui] = useState(false)

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
      toast.success('Mật khẩu đã được cập nhật.')
      navigate('/', { replace: true })
    } catch (error) {
      setLoi(normalizeApiError(error).message)
    } finally {
      setDangGui(false)
    }
  }

  const loaiTruongMatKhau = hienMatKhau ? 'text' : 'password'

  return (
    <>
      <PageHeader title="Đổi mật khẩu" description="Cập nhật mật khẩu đăng nhập cho tài khoản của bạn." />
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Bảo mật tài khoản</CardTitle>
          <CardDescription>
            Mật khẩu mới cần có từ 12 đến 128 ký tự. Bạn có thể dán mật khẩu vào các ô bên dưới.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={xuLyDoiMatKhau}>
            {loi ? (
              <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
                {loi}
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="mat-khau-hien-tai">Mật khẩu hiện tại</Label>
              <Input
                id="mat-khau-hien-tai"
                type={loaiTruongMatKhau}
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
              <Input
                id="mat-khau-moi"
                type={loaiTruongMatKhau}
                autoComplete="new-password"
                value={matKhauMoi}
                onChange={(event) => setMatKhauMoi(event.target.value)}
                required
                minLength={12}
                maxLength={128}
                disabled={dangGui}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="xac-nhan-mat-khau">Nhập lại mật khẩu mới</Label>
              <Input
                id="xac-nhan-mat-khau"
                type={loaiTruongMatKhau}
                autoComplete="new-password"
                value={xacNhanMatKhau}
                onChange={(event) => setXacNhanMatKhau(event.target.value)}
                required
                minLength={12}
                maxLength={128}
                disabled={dangGui}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setHienMatKhau((visible) => !visible)}
                aria-pressed={hienMatKhau}
                disabled={dangGui}
              >
                {hienMatKhau ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                {hienMatKhau ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              </Button>
              <Button type="submit" disabled={dangGui}>
                {dangGui ? (
                  <span className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                ) : (
                  <KeyRound aria-hidden="true" />
                )}
                Cập nhật mật khẩu
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  )
}
