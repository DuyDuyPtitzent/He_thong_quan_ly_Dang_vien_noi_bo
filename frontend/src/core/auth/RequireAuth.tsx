import { AlertCircle, RotateCw } from 'lucide-react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './auth-context'
import { Button } from '@/shared/components/ui/button'
import { LoadingState } from '@/shared/components/LoadingState'
import { ChangePasswordDialog } from '@/features/auth/ChangePasswordDialog'

type RequireAuthProps = {
  children?: React.ReactNode
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { taiKhoan, dangTaiPhien, loiTaiPhien, taiLaiPhien } = useAuth()
  const location = useLocation()

  if (dangTaiPhien) {
    return (
      <main className="grid min-h-svh place-items-center bg-background p-6">
        <div className="w-full max-w-md">
          <LoadingState />
        </div>
      </main>
    )
  }

  if (loiTaiPhien) {
    return (
      <main className="grid min-h-svh place-items-center bg-background p-6">
        <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-xl border bg-card p-8 text-center shadow-sm">
          <AlertCircle className="size-8 text-destructive" aria-hidden="true" />
          <div className="space-y-1">
            <h1 className="font-semibold">Không thể kiểm tra phiên đăng nhập</h1>
            <p className="text-sm text-muted-foreground">Kiểm tra kết nối rồi thử tải lại phiên.</p>
          </div>
          <Button type="button" onClick={() => void taiLaiPhien()}>
            <RotateCw aria-hidden="true" />
            Thử lại
          </Button>
        </div>
      </main>
    )
  }

  if (!taiKhoan) {
    return <Navigate to="/dang-nhap" replace state={{ from: location }} />
  }

  return (
    <>
      {children ?? <Outlet />}
      {taiKhoan.doiMatKhauLanDau ? <ChangePasswordDialog /> : null}
    </>
  )
}
