import { Link } from 'react-router-dom'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/shared/components/ui/breadcrumb'

export function CampaignBreadcrumb({ detail = false }: { detail?: boolean }) {
  return <Breadcrumb className="mb-3"><BreadcrumbList><BreadcrumbItem><BreadcrumbLink asChild><Link to="/">Tổng quan</Link></BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator /><BreadcrumbItem>{detail ? <BreadcrumbLink asChild><Link to="/hoc-tap-nghi-quyet/dot">Học tập nghị quyết</Link></BreadcrumbLink> : <BreadcrumbPage>Học tập nghị quyết</BreadcrumbPage>}</BreadcrumbItem><BreadcrumbSeparator /><BreadcrumbItem>{detail ? <BreadcrumbLink asChild><Link to="/hoc-tap-nghi-quyet/dot">Quản lý đợt học</Link></BreadcrumbLink> : <BreadcrumbPage>Quản lý đợt học</BreadcrumbPage>}</BreadcrumbItem>{detail && <><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbPage>Chi tiết đợt học</BreadcrumbPage></BreadcrumbItem></>}</BreadcrumbList></Breadcrumb>
}
