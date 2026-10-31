import { isRouteErrorResponse, useRouteError } from 'react-router-dom'
import { Button } from '@/shared/components/ui/button'
import { Link } from 'react-router-dom'

export function RouteErrorPage() {
  const error = useRouteError()
  const message = isRouteErrorResponse(error)
    ? error.statusText || `Lỗi ${error.status}`
    : 'Đã xảy ra lỗi khi tải trang.'
  return (
    <div className="grid min-h-svh place-items-center p-6 text-center">
      <div>
        <h1 className="text-2xl font-semibold">Không thể mở trang</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <Button asChild className="mt-5">
          <Link to="/">Về trang tổng quan</Link>
        </Button>
      </div>
    </div>
  )
}
