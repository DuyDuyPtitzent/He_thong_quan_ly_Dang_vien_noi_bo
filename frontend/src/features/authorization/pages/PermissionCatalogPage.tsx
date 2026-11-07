import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Eye, Search } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Label } from '@/shared/components/ui/label'
import { LoadingState } from '@/shared/components/LoadingState'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Table, TableActionCell, TableActionHead, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/shared/components/ui/sheet'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/shared/components/ui/resizable'
import { authorizationApi, groupPermissions } from '../api/authorization.api'
import type { PermissionItem } from '../types/authorization.types'
import { AuthorizationPageHeader } from '../components/AuthorizationPageHeader'

const pageSizes = ['10', '20', '50']
type FunctionFilter = 'ALL' | 'DA_CO_API' | 'CHUA_CO_API'

export function PermissionCatalogPage() {
  const [search, setSearch] = useState('')
  const [groupSearch, setGroupSearch] = useState('')
  const [filter, setFilter] = useState<FunctionFilter>('ALL')
  const [activeGroup, setActiveGroup] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState('10')
  const [selectedPermission, setSelectedPermission] = useState<PermissionItem | null>(null)
  const [isSmallScreen, setIsSmallScreen] = useState(() => window.matchMedia('(max-width: 1023px)').matches)
  const query = useQuery({ queryKey: ['authorization', 'permissions'], queryFn: authorizationApi.permissions })
  useEffect(() => {
    const media = window.matchMedia('(max-width: 1023px)')
    const updateLayout = () => setIsSmallScreen(media.matches)
    updateLayout()
    media.addEventListener('change', updateLayout)
    return () => media.removeEventListener('change', updateLayout)
  }, [])
  const groups = useMemo(() => groupPermissions(query.data ?? []), [query.data])
  const visibleGroups = useMemo(() => groups.filter((group) => group.tenNhom.toLocaleLowerCase('vi').includes(groupSearch.trim().toLocaleLowerCase('vi'))), [groups, groupSearch])
  const matchingPermissions = useMemo(() => (query.data ?? []).filter((permission) => {
    const matchesGroup = activeGroup === 'all' || permission.maNhom === activeGroup
    const matchesSearch = `${permission.ten} ${permission.maDinhDanh} ${permission.moTa}`.toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi'))
    return matchesGroup && matchesSearch && (filter === 'ALL' || permission.tinhTrangApi === filter)
  }), [query.data, activeGroup, search, filter])
  const size = Number(pageSize)
  const pages = Math.max(1, Math.ceil(matchingPermissions.length / size))
  const rows = matchingPermissions.slice((page - 1) * size, page * size)
  const activeGroupInfo = groups.find((group) => group.maNhom === activeGroup)
  const shownGroupName = activeGroup === 'all' ? 'Tất cả quyền' : activeGroupInfo?.tenNhom ?? 'Nhóm quyền'
  const groupCount = (groupId: string) => groupId === 'all' ? query.data?.length ?? 0 : groups.find((group) => group.maNhom === groupId)?.permissions.length ?? 0

  if (query.isPending) return <LoadingState />
  return <>
    <AuthorizationPageHeader />
    {query.isError && <p role="alert" className="mb-4 text-sm text-destructive">Không tải được danh mục quyền. {query.error.message}</p>}
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Danh mục quyền</CardTitle>
        <CardDescription>Danh sách quyền và chức năng tương ứng lấy từ danh mục do Backend cung cấp.</CardDescription>
      </CardHeader>
      <CardContent className="min-w-0">
        <ResizablePanelGroup orientation={isSmallScreen ? 'vertical' : 'horizontal'} resizeTargetMinimumSize={{ coarse: 32, fine: 24 }} className="h-[900px] min-h-0 min-w-0 rounded-md border lg:h-[720px]">
          <ResizablePanel defaultSize={`${isSmallScreen ? 30 : 25}%`} minSize={`${isSmallScreen ? 20 : 18}%`} maxSize={`${isSmallScreen ? 45 : 38}%`} className="min-h-0 min-w-0">
          <aside aria-label="Nhóm quyền" className={`flex h-full min-h-0 flex-col p-4 ${isSmallScreen ? '' : 'border-r'}`}>
            <div className="mb-3 shrink-0 space-y-2"><h2 className="text-sm font-semibold">Nhóm quyền</h2><div className="relative"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input aria-label="Tìm nhóm quyền" className="pl-9" placeholder="Tìm nhóm quyền..." value={groupSearch} onChange={(event) => setGroupSearch(event.target.value)} /></div></div>
            <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1" aria-label="Chọn nhóm quyền">
              <GroupButton active={activeGroup === 'all'} label="Tất cả quyền" count={groupCount('all')} onClick={() => { setActiveGroup('all'); setPage(1) }} />
              {visibleGroups.map((group) => <GroupButton key={group.maNhom} active={activeGroup === group.maNhom} label={group.tenNhom} count={group.permissions.length} onClick={() => { setActiveGroup(group.maNhom); setPage(1) }} />)}
              {visibleGroups.length === 0 && <p className="px-3 py-4 text-sm text-muted-foreground">Không tìm thấy nhóm quyền.</p>}
            </nav>
          </aside>
          </ResizablePanel>
          <ResizableHandle withHandle className={isSmallScreen ? 'z-10 h-1 w-full cursor-row-resize touch-none select-none hover:bg-primary/40' : 'z-10 w-1 cursor-col-resize touch-none select-none hover:bg-primary/40'} />
          <ResizablePanel defaultSize={`${isSmallScreen ? 70 : 75}%`} minSize={`${isSmallScreen ? 55 : 62}%`} maxSize={`${isSmallScreen ? 80 : 82}%`} className="min-h-0 min-w-0">
          <section className="flex h-full min-h-0 min-w-0 flex-col gap-4 overflow-y-auto p-4" aria-label="Danh sách quyền">
            <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h2 className="text-lg font-semibold">{shownGroupName}</h2><p className="mt-1 text-sm text-muted-foreground">{activeGroup === 'all' ? `${query.data?.length ?? 0} quyền trong danh mục` : `${groupCount(activeGroup)} quyền trong nhóm`}</p></div><Badge variant="secondary">{matchingPermissions.length} kết quả</Badge></div>
            <div className="grid gap-3 sm:grid-cols-[minmax(220px,1fr)_220px]">
              <div className="relative"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input aria-label="Tìm quyền theo tên, mã hoặc mô tả" className="pl-9" placeholder="Tìm theo tên, mã kỹ thuật hoặc mô tả..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} /></div>
              <Select value={filter} onValueChange={(value) => { setFilter(value as FunctionFilter); setPage(1) }}><SelectTrigger aria-label="Lọc theo chức năng tương ứng"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">Mọi trạng thái chức năng</SelectItem><SelectItem value="DA_CO_API">Đã có chức năng</SelectItem><SelectItem value="CHUA_CO_API">Chưa có chức năng</SelectItem></SelectContent></Select>
            </div>
            <div className="overflow-x-auto rounded-md border">
              <Table className="min-w-[900px]">
                <TableHeader><TableRow><TableHead className="w-16">STT</TableHead><TableHead className="min-w-[200px]">Tên quyền</TableHead><TableHead className="min-w-[220px]">Mã kỹ thuật</TableHead><TableHead className="min-w-[180px]">Chức năng tương ứng</TableHead><TableActionHead className="w-28 text-center">Thao tác</TableActionHead></TableRow></TableHeader>
                <TableBody>{rows.map((permission, index) => <TableRow key={permission.ma}>
                  <TableCell className="text-muted-foreground tabular-nums">{(page - 1) * size + index + 1}</TableCell>
                  <TableCell className="whitespace-normal font-medium">{permission.ten}</TableCell>
                  <TableCell className="font-mono text-xs">{permission.maDinhDanh}</TableCell>
                  <TableCell><Badge variant={permission.tinhTrangApi === 'DA_CO_API' ? 'secondary' : 'outline'}>{permission.tinhTrangApi === 'DA_CO_API' ? 'Đã có chức năng' : 'Chưa có chức năng'}</Badge></TableCell>
                  <TableActionCell className="text-center"><Button variant="ghost" size="sm" onClick={() => setSelectedPermission(permission)} aria-label={`Xem chi tiết quyền ${permission.ten}`}><Eye />Xem chi tiết</Button></TableActionCell>
                </TableRow>)}
                  {rows.length === 0 && <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Không tìm thấy quyền phù hợp trong nhóm này.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"><span>Hiển thị {matchingPermissions.length ? (page - 1) * size + 1 : 0}–{Math.min(page * size, matchingPermissions.length)} trong {matchingPermissions.length} quyền</span><Label htmlFor="permission-page-size">Số dòng</Label><Select value={pageSize} onValueChange={(value) => { setPageSize(value); setPage(1) }}><SelectTrigger id="permission-page-size" className="h-8 w-[82px]"><SelectValue /></SelectTrigger><SelectContent>{pageSizes.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
              <div className="flex items-center justify-end gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Trước</Button><span className="min-w-20 text-center text-sm text-muted-foreground">Trang {page} / {pages}</span><Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((current) => current + 1)}>Sau</Button></div>
            </div>
          </section>
          </ResizablePanel>
        </ResizablePanelGroup>
      </CardContent>
    </Card>

    <Sheet open={Boolean(selectedPermission)} onOpenChange={(open) => { if (!open) setSelectedPermission(null) }}>
      <SheetContent className="w-screen gap-0 p-0 sm:max-w-xl"><SheetHeader className="border-b pr-14"><SheetTitle>Chi tiết quyền</SheetTitle><SheetDescription>Thông tin chỉ đọc lấy từ danh mục Permission của Backend.</SheetDescription></SheetHeader>
        <SheetBody className="space-y-5 bg-background p-5">{selectedPermission && <>
          <Detail label="Tên quyền" value={selectedPermission.ten} />
          <Detail label="Mã kỹ thuật" value={selectedPermission.maDinhDanh} mono />
          <Detail label="Nhóm quyền" value={selectedPermission.tenNhom} />
          <Detail label="Mô tả đầy đủ" value={selectedPermission.moTa || 'Backend chưa cung cấp mô tả.'} />
          <Detail label="Chức năng tương ứng" value={selectedPermission.tinhTrangApi === 'DA_CO_API' ? 'Đã có chức năng' : 'Chưa có chức năng'} badge={selectedPermission.tinhTrangApi === 'DA_CO_API' ? 'secondary' : 'outline'} />
        </>}</SheetBody>
      </SheetContent>
    </Sheet>
  </>
}

function GroupButton({ active, label, count, onClick }: { active: boolean; label: string; count: number; onClick: () => void }) {
  return <button type="button" onClick={onClick} aria-current={active ? 'true' : undefined} className={`flex min-h-10 w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? 'bg-accent font-medium text-accent-foreground' : 'text-foreground hover:bg-muted'}`}><span className="min-w-0 truncate">{label}</span><span className={`shrink-0 rounded-full px-2 py-0.5 text-xs tabular-nums ${active ? 'bg-background text-foreground' : 'bg-muted text-muted-foreground'}`}>{count}</span></button>
}

function Detail({ label, value, mono = false, badge }: { label: string; value: string; mono?: boolean; badge?: 'secondary' | 'outline' }) {
  return <div className="space-y-2 rounded-md border bg-card p-4"><p className="text-xs font-medium text-muted-foreground">{label}</p>{badge ? <Badge variant={badge}>{value}</Badge> : <p className={`break-words text-sm leading-6 ${mono ? 'font-mono' : ''}`}>{value}</p>}</div>
}
