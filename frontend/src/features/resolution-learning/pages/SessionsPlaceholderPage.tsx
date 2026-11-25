import { CalendarDays } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/core/auth/auth-context'
import { PageHeader } from '@/shared/components/PageHeader'
import { Badge } from '@/shared/components/ui/badge'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/shared/components/ui/breadcrumb'
import { Card, CardContent } from '@/shared/components/ui/card'

const sessionsPermission = 'HOC_TAP_NGHI_QUYET_BUOI_XEM'

export function SessionsPlaceholderPage() {
  const permissions = useAuth().taiKhoan?.quyenDangHoatDong ?? []
  if (!permissions.includes(sessionsPermission)) return <div className="space-y-5"><PageHeader title="Quản lý buổi học" description="Quản lý buổi học nghị quyết trong phạm vi được phân quyền." /><Card><CardContent className="py-12 text-center"><p className="font-medium">Bạn chưa được cấp quyền xem buổi học.</p><p className="mt-1 text-sm text-muted-foreground">Chọn Assignment có Permission phù hợp hoặc liên hệ quản trị viên.</p></CardContent></Card></div>
  return <div className="space-y-5 pb-8">
    <Breadcrumb><BreadcrumbList><BreadcrumbItem><BreadcrumbLink asChild><Link to="/">Tổng quan</Link></BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbLink asChild><Link to="/hoc-tap-nghi-quyet/dot">Học tập nghị quyết</Link></BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbPage>Quản lý buổi học</BreadcrumbPage></BreadcrumbItem></BreadcrumbList></Breadcrumb>
    <PageHeader title="Quản lý buổi học" description="Quản lý các buổi học nghị quyết, điểm danh, phê duyệt kết quả và biểu mẫu công khai." />
    <Card><CardContent className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-5 grid size-14 place-items-center rounded-full bg-muted text-muted-foreground"><CalendarDays className="size-7" aria-hidden="true" /></div>
      <Badge variant="secondary" className="mb-3">Đang phát triển</Badge>
      <h2 className="text-lg font-semibold">Giao diện Quản lý buổi học chưa hoàn tất</h2>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">Danh sách buổi học và các nghiệp vụ điểm danh sẽ được bổ sung ở giai đoạn tiếp theo. Hiện tại, bạn có thể xem buổi học tóm tắt trong trang chi tiết từng đợt.</p>
    </CardContent></Card>
  </div>
}
