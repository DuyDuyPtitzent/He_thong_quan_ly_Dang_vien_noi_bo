import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { Badge } from '@/shared/components/ui/badge'
import { LoadingState } from '@/shared/components/LoadingState'
import { EmptyState } from '@/shared/components/EmptyState'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
import { authorizationApi, groupPermissions } from './authorization.api'
import { AuthorizationPageHeader } from './AuthorizationPageHeader'

export function PermissionCatalogPage() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'ALL' | 'DA_CO_API' | 'CHUA_CO_API'>('ALL')
  const [activeGroup, setActiveGroup] = useState('')
  const query = useQuery({ queryKey: ['authorization', 'permissions'], queryFn: authorizationApi.permissions })
  const groups = useMemo(() => groupPermissions(query.data ?? []), [query.data])
  const visiblePermissions = useMemo(() => groups.map((group) => ({
    ...group,
    permissions: group.permissions.filter((item) => {
      const matchesSearch = `${item.maDinhDanh} ${item.ten} ${item.moTa}`.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi'))
      return matchesSearch && (filter === 'ALL' || item.tinhTrangApi === filter)
    }),
  })), [groups, search, filter])
  const visibleCount = visiblePermissions.reduce((total, group) => total + group.permissions.length, 0)
  const firstVisibleGroup = visiblePermissions.find((group) => group.permissions.length > 0)?.maNhom ?? ''
  useEffect(() => {
    if (!visiblePermissions.some((group) => group.maNhom === activeGroup && group.permissions.length > 0)) {
      setActiveGroup(firstVisibleGroup)
    }
  }, [activeGroup, firstVisibleGroup, visiblePermissions])
  if (query.isPending) return <LoadingState />
  return <>
    <AuthorizationPageHeader />
    {query.isError && <p role="alert" className="mb-4 text-sm text-destructive">Không tải được danh mục quyền. {query.error.message}</p>}
    <Card>
      <CardHeader>
        <CardTitle>{visibleCount === query.data?.length ? visibleCount : `${visibleCount} / ${query.data?.length ?? 0}`} quyền</CardTitle>
        <CardDescription>Quyền chưa có chức năng tương ứng chưa thể thực hiện nghiệp vụ đó, dù đã được chọn trong vai trò.</CardDescription>
        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <div className="relative flex-1"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input aria-label="Tìm quyền" className="pl-9" placeholder="Tìm theo mã kỹ thuật, tên hoặc mô tả" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
          <Select value={filter} onValueChange={(value) => setFilter(value as typeof filter)}><SelectTrigger aria-label="Lọc theo trạng thái chức năng" className="w-full sm:w-[220px]"><SelectValue placeholder="Lọc trạng thái" /></SelectTrigger><SelectContent><SelectItem value="ALL">Tất cả chức năng</SelectItem><SelectItem value="DA_CO_API">Đã có chức năng</SelectItem><SelectItem value="CHUA_CO_API">Chưa có chức năng</SelectItem></SelectContent></Select>
        </div>
      </CardHeader>
      <CardContent>
        {visibleCount === 0 ? <EmptyState title="Không tìm thấy quyền phù hợp" description="Hãy thử từ khóa khác hoặc thay đổi bộ lọc." /> : <Tabs value={activeGroup || firstVisibleGroup} onValueChange={setActiveGroup}>
          <TabsList variant="line" className="h-auto w-full flex-wrap justify-start gap-x-4 gap-y-1 border-b px-0" aria-label="Nhóm quyền">
            {visiblePermissions.map((group) => <TabsTrigger key={group.maNhom} value={group.maNhom} className="flex-none px-3">{group.tenNhom}<span className="ml-1 text-xs text-muted-foreground">{group.permissions.length}</span></TabsTrigger>)}
          </TabsList>
          {visiblePermissions.map((group) => <TabsContent key={group.maNhom} value={group.maNhom} className="pt-4">
            {group.permissions.length === 0 ? <EmptyState title="Nhóm này không có quyền khớp điều kiện" description="Hãy xóa bớt từ khóa hoặc thay đổi bộ lọc để xem các quyền khác." /> : <Table className="min-w-[680px]"><TableHeader><TableRow><TableHead>Mã kỹ thuật</TableHead><TableHead>Tên quyền và ý nghĩa</TableHead><TableHead>Chức năng tương ứng</TableHead></TableRow></TableHeader><TableBody>
              {group.permissions.map((permission) => <TableRow key={permission.ma}><TableCell className="align-top font-mono text-xs">{permission.maDinhDanh}</TableCell><TableCell className="whitespace-normal"><div className="font-medium">{permission.ten}</div><p className="mt-1 text-muted-foreground">{permission.moTa}</p></TableCell><TableCell className="align-top"><Badge variant={permission.tinhTrangApi === 'DA_CO_API' ? 'default' : 'secondary'}>{permission.tinhTrangApi === 'DA_CO_API' ? 'Đã có' : 'Chưa có'}</Badge></TableCell></TableRow>)}
            </TableBody></Table>}
          </TabsContent>)}
        </Tabs>}
      </CardContent>
    </Card>
  </>
}
