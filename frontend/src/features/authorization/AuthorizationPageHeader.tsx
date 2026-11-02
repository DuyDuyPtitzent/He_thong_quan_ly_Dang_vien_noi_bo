import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Home, KeyRound, Network, ShieldCheck, UsersRound } from 'lucide-react'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/shared/components/ui/breadcrumb'
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'

const root = '/quan-tri-phan-quyen'

export function AuthorizationPageHeader({ selectedRole }: { selectedRole?: string }) {
  const location = useLocation()
  const navigate = useNavigate()
  const value = location.pathname.endsWith('/quyen')
    ? 'permissions'
    : location.pathname.endsWith('/phan-cong')
      ? 'assignments'
      : location.pathname.endsWith('/ma-tran') || /^\/quan-tri-phan-quyen\/vai-tro\/[^/]+$/.test(location.pathname)
        ? 'matrix'
        : 'roles'
  const title = value === 'matrix' && selectedRole ? `Ma trận quyền: ${selectedRole}` : 'Cấu hình phân quyền'
  const description = value === 'matrix' && selectedRole
    ? 'Chọn những quyền mà vai trò này được phép thực hiện.'
    : 'Quản lý vai trò, quyền được giao và phạm vi áp dụng trong hệ thống.'

  return <header className="mb-6 space-y-4">
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem><BreadcrumbLink asChild><Link to="/"><Home className="size-4" /><span className="sr-only">Trang chủ</span></Link></BreadcrumbLink></BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem><BreadcrumbLink asChild><Link to={`${root}/vai-tro`}>Cấu hình hệ thống</Link></BreadcrumbLink></BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem><BreadcrumbPage>{title}</BreadcrumbPage></BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
    <div className="flex items-start gap-3">
      <ShieldCheck className="mt-0.5 size-8 text-primary" aria-hidden="true" />
      <div><h1 className="text-2xl font-semibold tracking-tight">{title}</h1><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>
    </div>
    <Tabs value={value} onValueChange={(next) => {
      const paths: Record<string, string> = {
        roles: `${root}/vai-tro`,
        matrix: `${root}/ma-tran`,
        permissions: `${root}/quyen`,
        assignments: `${root}/phan-cong`,
      }
      navigate(paths[next] ?? `${root}/vai-tro`)
    }}>
      <TabsList variant="line" className="h-auto w-full flex-wrap justify-start gap-2 border-b px-0">
        <TabsTrigger value="roles" className="flex-none gap-2 px-4 py-3"><UsersRound />Quản lý vai trò</TabsTrigger>
        <TabsTrigger value="matrix" disabled={!selectedRole} className="flex-none gap-2 px-4 py-3"><ShieldCheck />{selectedRole ? `Ma trận: ${selectedRole}` : 'Ma trận'}</TabsTrigger>
        <TabsTrigger value="permissions" className="flex-none gap-2 px-4 py-3"><KeyRound />Danh mục quyền</TabsTrigger>
        <TabsTrigger value="assignments" className="flex-none gap-2 px-4 py-3"><Network />Giao vai trò</TabsTrigger>
      </TabsList>
    </Tabs>
  </header>
}
