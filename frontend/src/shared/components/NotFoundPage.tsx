import { Link } from 'react-router-dom'
import { Button } from '@/shared/components/ui/button'
export function NotFoundPage() {
  return (
    <div className="grid min-h-[60vh] place-items-center text-center">
      <div>
        <p className="text-sm font-medium text-primary">404</p>
        <h1 className="mt-2 text-3xl font-semibold">Không tìm thấy trang</h1>
        <p className="mt-2 text-muted-foreground">
          Đường dẫn này không tồn tại hoặc đã được thay đổi.
        </p>
        <Button asChild className="mt-6">
          <Link to="/">Về trang tổng quan</Link>
        </Button>
      </div>
    </div>
  )
}
