import { BarChart3 } from 'lucide-react'
import { useAuth } from '@/core/auth/auth-context'
import { PageHeader } from '@/shared/components/PageHeader'
import { Badge } from '@/shared/components/ui/badge'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/shared/components/ui/breadcrumb'
import { Link } from 'react-router-dom'

const statisticsPermission = 'HOC_TAP_NGHI_QUYET_THONG_KE_XEM'

export function StatisticsPlaceholderPage() {
  const permissions = useAuth().taiKhoan?.quyenDangHoatDong ?? []
  if (!permissions.includes(statisticsPermission)) return <div className="space-y-5"><PageHeader title="Thống kê và báo cáo" description="Chức năng thống kê học tập nghị quyết." /><Card><CardContent className="py-12 text-center"><p className="font-medium">Bạn chưa được cấp quyền xem thống kê học tập nghị quyết.</p><p className="mt-1 text-sm text-muted-foreground">Chọn Assignment có Permission phù hợp hoặc liên hệ quản trị viên.</p></CardContent></Card></div>
  return <div className="space-y-5 pb-8">
    <Breadcrumb><BreadcrumbList><BreadcrumbItem><BreadcrumbLink asChild><Link to="/">Tổng quan</Link></BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbLink asChild><Link to="/hoc-tap-nghi-quyet/dot">Học tập nghị quyết</Link></BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbPage>Thống kê và báo cáo</BreadcrumbPage></BreadcrumbItem></BreadcrumbList></Breadcrumb>
    <PageHeader title="Thống kê và báo cáo" description="Tổng hợp kết quả học tập nghị quyết trong phạm vi được phân quyền." />
    <Card><CardContent className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-5 grid size-14 place-items-center rounded-full bg-muted text-muted-foreground"><BarChart3 className="size-7" aria-hidden="true" /></div>
      <Badge variant="secondary" className="mb-3">Đang phát triển</Badge>
      <h2 className="text-lg font-semibold">Thống kê và báo cáo</h2>
      <p className="mt-2 max-w-lg text-sm text-muted-foreground">Chức năng thống kê và báo cáo học tập nghị quyết sẽ được cập nhật trong thời gian tới.</p>
    </CardContent></Card>
  </div>
}
