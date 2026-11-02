import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BadgeCheck,
  CircleAlert,
  Eye,
  EyeOff,
  Info,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { toast } from 'sonner'
import { normalizeApiError } from '@/core/api/client'
import { useAuth } from '@/core/auth/auth-context'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'


type TrangThaiDieuHuong = { from?: { pathname?: string } }

export function LoginPage() {
  const { taiKhoan, dangTaiPhien, dangNhap } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [tenDangNhap, setTenDangNhap] = useState('')
  const [matKhau, setMatKhau] = useState('')
  const [hienMatKhau, setHienMatKhau] = useState(false)
  const [ghiNhoThietBi, setGhiNhoThietBi] = useState(false)
  const [dangGui, setDangGui] = useState(false)
  const [loiDangNhap, setLoiDangNhap] = useState('')

  const denSauDangNhap = useCallback(
    () => {
      const from = (location.state as TrangThaiDieuHuong | null)?.from?.pathname
      return from && from !== '/dang-nhap' && from !== '/doi-mat-khau' ? from : '/'
    },
    [location.state],
  )

  useEffect(() => {
    if (taiKhoan && !dangTaiPhien) {
      navigate(denSauDangNhap(), { replace: true })
    }
  }, [dangTaiPhien, denSauDangNhap, navigate, taiKhoan])

  async function xuLyDangNhap(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoiDangNhap('')
    setDangGui(true)
    try {
      await dangNhap({ tenDangNhap: tenDangNhap.trim(), matKhau })
      navigate(denSauDangNhap(), { replace: true })
    } catch (error) {
      setLoiDangNhap(normalizeApiError(error).message)
    } finally {
      setDangGui(false)
    }
  }

  return (
    <div className="relative isolate flex min-h-svh flex-col overflow-hidden bg-background text-foreground">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-primary/10 via-background to-accent/30"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -top-36 left-[8%] -z-10 size-[34rem] rounded-full bg-primary/10 blur-[100px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-1/3 right-[-8rem] -z-10 size-[32rem] rounded-full bg-secondary-container/10 blur-[110px]"
        aria-hidden="true"
      />
      <div className="login-grid-pattern pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />

      <main className="flex flex-1 items-center px-4 py-5 sm:px-6 lg:px-8 xl:px-8">
        <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 items-center gap-6 xl:grid-cols-12 xl:gap-10">
          <section className="flex flex-col gap-4 sm:gap-5 xl:col-span-6" aria-labelledby="brand-title">
            <Badge
              variant="outline"
              className="w-fit gap-2 rounded-full border-outline-variant/50 bg-card/90 px-3 py-1.5 text-primary shadow-sm hover:bg-card/90"
            >
              <span className="text-xs font-bold uppercase tracking-[0.08em] sm:text-sm">
                HỆ THỐNG NỘI BỘ HỌC VIỆN
              </span> 
            </Badge>

            <div className="space-y-3">
              <h1
                id="brand-title"
                className="max-w-2xl text-2xl font-extrabold leading-tight tracking-tight text-primary sm:text-3xl xl:text-3xl"
              >
                HỆ THỐNG QUẢN LÝ ĐẢNG VIÊN NỘI BỘ
              </h1>
              
            </div>

            <Card className="max-w-[640px] gap-0 rounded-lg border-secondary-container/40 bg-accent/80 py-0 shadow-sm">
              <CardContent className="flex flex-col items-start justify-between gap-2.5 p-3 sm:flex-row sm:items-center sm:p-3">
                <div className="flex items-start gap-3">
                  <Info className="mt-1 size-5 shrink-0 text-secondary" aria-hidden="true" />
                  <div className="space-y-1">
                    <h2 className="text-sm font-semibold text-foreground sm:text-base">Thông báo hướng dẫn đăng nhập nội bộ</h2>
                    <p className="max-w-2xl text-xs leading-5 text-muted-foreground sm:text-sm">
                      Đảng viên là cán bộ, sinh viên sử dụng tài khoản email Học viện cấp để đăng nhập.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="link"
                  className="h-auto shrink-0 gap-1 px-1 text-xs text-primary sm:text-sm"
                  onClick={() => toast.info('Vui lòng liên hệ quản trị viên hệ thống để được hướng dẫn.')}
                >
                  Hướng dẫn PTIT
                  <ArrowRight aria-hidden="true" />
                </Button>
              </CardContent>
            </Card>
          </section>

          <section className="w-full xl:col-span-6" aria-labelledby="login-title">
            <Card className="mx-auto w-full max-w-[440px] gap-0 rounded-2xl border-0 bg-card/95 p-4 shadow-xl backdrop-blur-2xl sm:p-5">
              <CardHeader className="space-y-2 px-0 pt-0 text-center">
                <CardTitle
                  id="login-title"
                  className="text-xl font-extrabold uppercase tracking-tight text-primary sm:text-2xl"
                >
                  ĐĂNG NHẬP HỆ THỐNG
                </CardTitle>
                <CardDescription className="text-xs leading-5 text-muted-foreground sm:text-sm">
                  Cổng thông tin Đảng bộ Học viện Công nghệ Bưu chính Viễn thông
                </CardDescription>
              </CardHeader>

            

              <CardContent className="space-y-4 px-0 pb-0">
                {loiDangNhap ? (
                  <Card
                    className="rounded-lg border-destructive/25 bg-destructive/5 py-0 text-destructive shadow-none"
                    role="alert"
                    aria-live="polite"
                  >
                    <CardContent className="flex items-start gap-2 p-3 text-sm">
                      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                      <span>{loiDangNhap}</span>
                    </CardContent>
                  </Card>
                ) : null}
                <form className="space-y-4" onSubmit={xuLyDangNhap}>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="ten-dang-nhap" className="gap-1 text-xs font-semibold text-foreground sm:text-sm">
                        <UserRound className="size-4 text-primary" aria-hidden="true" />
                        Tài khoản PTIT (Mã SV / Mã Cán bộ / Email)
                      </Label>
                      <span className="text-destructive" aria-hidden="true">*</span>
                    </div>
                    <div className="relative">
                      <Input
                        id="ten-dang-nhap"
                        name="tenDangNhap"
                        autoComplete="username"
                        autoCapitalize="none"
                        spellCheck={false}
                        placeholder="Nhập Mã cán bộ / Mã sinh viên / Số thẻ Đảng"
                        value={tenDangNhap}
                        onChange={(event) => setTenDangNhap(event.target.value)}
                        required
                        maxLength={100}
                        disabled={dangGui}
                        className="h-10 pl-10 text-sm placeholder:text-outline/70"
                      />
                      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-outline-variant">
                        <BadgeCheck className="size-4" aria-hidden="true" />
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="mat-khau" className="gap-1 text-xs font-semibold text-foreground sm:text-sm">
                        <LockKeyhole className="size-4 text-primary" aria-hidden="true" />
                        Mật khẩu truy cập
                      </Label>
                      <Button
                        type="button"
                        variant="link"
                        className="h-auto p-0 text-xs font-semibold text-secondary sm:text-sm"
                        onClick={() => toast.info('Chức năng đặt lại mật khẩu chưa được tích hợp.')}
                      >
                        Quên mật khẩu?
                      </Button>
                    </div>
                    <div className="relative">
                      <Input
                        id="mat-khau"
                        name="matKhau"
                        type={hienMatKhau ? 'text' : 'password'}
                        autoComplete="current-password"
                        placeholder="Nhập mật khẩu tài khoản PTIT hoặc Thẻ Đảng"
                        value={matKhau}
                        onChange={(event) => setMatKhau(event.target.value)}
                        required
                        maxLength={256}
                        disabled={dangGui}
                        className="h-10 px-10 pr-11 text-sm placeholder:text-outline/70"
                      />
                      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-outline-variant">
                        <KeyRound className="size-4" aria-hidden="true" />
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-1/2 right-0.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setHienMatKhau((hien) => !hien)}
                        aria-label={hienMatKhau ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                        aria-pressed={hienMatKhau}
                        disabled={dangGui}
                      >
                        {hienMatKhau ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="ghi-nho-thiet-bi"
                      checked={ghiNhoThietBi}
                      onCheckedChange={(checked) => setGhiNhoThietBi(checked === true)}
                      className="mt-0.5"
                    />
                    <Label
                      htmlFor="ghi-nho-thiet-bi"
                      className="cursor-pointer select-none text-xs font-normal leading-5 text-muted-foreground sm:text-sm"
                    >
                      Ghi nhớ thiết bị cá nhân (Không tích chọn trên máy tính phòng máy/công cộng).
                    </Label>
                  </div>

                  <Button
                    type="submit"
                    className="mt-1 h-10 w-full bg-gradient-to-r from-primary-container to-primary text-sm font-bold uppercase tracking-wide shadow-md hover:from-primary hover:to-primary-container"
                    disabled={dangGui}
                  >
                    {dangGui ? (
                      <>
                        <LoaderCircle className="animate-spin" aria-hidden="true" />
                        Đang xác thực…
                      </>
                    ) : (
                      <>
                        <ShieldCheck aria-hidden="true" />
                        ĐĂNG NHẬP HỆ THỐNG PTIT
                      </>
                    )}
                  </Button>
                </form>

                <Card className="gap-0 rounded-lg border-destructive/20 bg-error-container/30 py-0 shadow-none">
                  <CardContent className="flex items-start gap-2 p-2.5 text-xs leading-5 text-on-error-container sm:text-sm">
                    <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                    <p>
                      <strong>Lưu ý nội bộ:</strong> Cổng thông tin giới hạn cho Đảng viên thuộc
                      Đảng bộ Học viện Công nghệ Bưu chính Viễn thông. Mọi hoạt động đăng nhập được
                      ghi nhận nhật ký an toàn thông tin theo quy chế của Học viện.
                    </p>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>

      <footer className="border-t border-outline-variant/30 bg-muted px-4 py-3 shadow-sm sm:px-8 lg:px-12 xl:px-10">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center justify-between gap-2 text-center text-xs text-muted-foreground sm:flex-row sm:text-left sm:text-sm">
          <span>Văn phòng Đảng ủy PTIT: Km10, Đường Nguyễn Trãi, Q. Hà Đông, Hà Nội</span>
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-4">
            <span>
              Email: <strong className="text-foreground">vanphongdanguy@ptit.edu.vn</strong>
            </span>
            <span className="hidden text-outline-variant sm:inline" aria-hidden="true">
              •
            </span>
            <span>
              Hotline nội bộ: <strong className="text-secondary">(024) 3854 4264</strong>
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
