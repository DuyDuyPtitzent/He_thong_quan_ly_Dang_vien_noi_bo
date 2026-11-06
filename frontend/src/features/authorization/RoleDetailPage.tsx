import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { CircleAlert, Pencil, RotateCcw, Save, Search, ShieldCheck, Trash2, UsersRound } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Badge } from '@/shared/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/shared/components/ui/resizable'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/shared/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { LoadingState } from '@/shared/components/LoadingState'
import { StatisticCard } from '@/shared/components/StatisticCard'
import { authorizationApi, groupPermissions } from './authorization.api'
import { AuthorizationPageHeader } from './AuthorizationPageHeader'

type ConfirmAction = 'save' | 'pause' | 'resume' | 'delete' | null
type ApiFilter = 'ALL' | 'DA_CO_API' | 'CHUA_CO_API'

export function RoleDetailPage() {
  const { maVaiTro = '' } = useParams()
  const navigate = useNavigate()
  const client = useQueryClient()
  const [isSmallScreen, setIsSmallScreen] = useState(() => window.matchMedia('(max-width: 1023px)').matches)
  const [selected, setSelected] = useState<string[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [permissionSearch, setPermissionSearch] = useState('')
  const [apiFilter, setApiFilter] = useState<ApiFilter>('ALL')
  const [activeGroup, setActiveGroup] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null)
  useEffect(() => {
    const media = window.matchMedia('(max-width: 1023px)')
    const updateLayout = () => setIsSmallScreen(media.matches)
    updateLayout()
    media.addEventListener('change', updateLayout)
    return () => media.removeEventListener('change', updateLayout)
  }, [])
  const roles = useQuery({ queryKey: ['authorization', 'roles'], queryFn: authorizationApi.roles })
  const permissions = useQuery({ queryKey: ['authorization', 'permissions'], queryFn: authorizationApi.permissions })
  const role = roles.data?.find((item) => item.ma === maVaiTro)

  useEffect(() => {
    if (role) {
      setSelected(role.quyen.map((item) => item.maQuyen))
      setName(role.ten)
      setDescription(role.moTa ?? '')
    }
  }, [role])

  const groups = useMemo(() => groupPermissions(permissions.data ?? []), [permissions.data])
  const firstGroup = groups[0]?.maNhom ?? ''
  const groupIds = groups.map((group) => group.maNhom).join('|')
  useEffect(() => {
    if (!groups.some((group) => group.maNhom === activeGroup)) setActiveGroup(firstGroup)
  }, [activeGroup, firstGroup, groupIds, groups])

  const saveMatrix = useMutation({
    mutationFn: (input: { themMaQuyen: string[]; boMaQuyen: string[] }) => authorizationApi.updateRolePermissions(maVaiTro, input),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ['authorization', 'roles'] }); setError(''); setConfirmAction(null); toast.success('Ma trận quyền đã được cập nhật.') },
    onError: (e: Error) => setError(e.message),
  })
  const saveRole = useMutation({
    mutationFn: (input: { ten?: string; moTa?: string | null; trangThai?: string }) => authorizationApi.updateRole(maVaiTro, input),
    onSuccess: async (_data, input) => { await client.invalidateQueries({ queryKey: ['authorization', 'roles'] }); setEditOpen(false); setConfirmAction(null); setError(''); toast.success(input.trangThai ? 'Trạng thái vai trò đã được cập nhật.' : 'Thông tin vai trò đã được cập nhật.') },
    onError: (e: Error) => setError(e.message),
  })
  const deleteRole = useMutation({
    mutationFn: () => authorizationApi.deleteRole(maVaiTro),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ['authorization', 'roles'] }); toast.success('Vai trò đã được xóa.'); navigate('/quan-tri-phan-quyen/vai-tro') },
    onError: (e: Error) => setError(e.message),
  })

  if (roles.isPending || permissions.isPending) return <LoadingState />
  if (roles.isError || permissions.isError) return <p role="alert" className="text-sm text-destructive">Không tải được thông tin vai trò hoặc danh mục quyền.</p>
  if (!role) return <p role="alert" className="text-sm text-muted-foreground">Không tìm thấy vai trò này. <Link className="underline" to="/quan-tri-phan-quyen/vai-tro">Quay lại danh sách</Link></p>

  const locked = role.laVaiTroHeThong
  const assigned = new Set(role.quyen.map((item) => item.maQuyen))
  const changed = selected.length !== assigned.size || selected.some((id) => !assigned.has(id))
  const addedCount = selected.filter((id) => !assigned.has(id)).length
  const removedCount = [...assigned].filter((id) => !selected.includes(id)).length
  const activePermissions = permissions.data?.filter((item) => item.maNhom === activeGroup) ?? []
  const filteredPermissions = activePermissions.filter((item) => {
    const matchesSearch = `${item.maDinhDanh} ${item.ten} ${item.moTa}`.toLocaleLowerCase('vi').includes(permissionSearch.toLocaleLowerCase('vi'))
    return matchesSearch && (apiFilter === 'ALL' || item.tinhTrangApi === apiFilter)
  })
  const allVisibleSelected = filteredPermissions.length > 0 && filteredPermissions.every((item) => selected.includes(item.ma))
  const toggleVisible = (checked: boolean) => {
    const ids = new Set(filteredPermissions.map((item) => item.ma))
    setSelected((current) => checked ? [...new Set([...current, ...ids])] : current.filter((id) => !ids.has(id)))
  }
  const confirmTitle = confirmAction === 'save' ? 'Xác nhận thay đổi ma trận quyền' : confirmAction === 'pause' ? 'Tạm ngừng vai trò này?' : confirmAction === 'resume' ? 'Cho phép sử dụng lại vai trò?' : 'Xóa vai trò này?'
  const confirmDescription = confirmAction === 'save'
    ? `Bạn đang thêm ${addedCount} quyền và bỏ ${removedCount} quyền. Thay đổi sẽ có hiệu lực với các tài khoản đang được giao vai trò này.`
    : confirmAction === 'pause'
      ? 'Các tài khoản đang được giao vai trò sẽ không thể sử dụng những quyền thuộc vai trò này trong thời gian tạm ngừng.'
      : confirmAction === 'resume'
        ? 'Các tài khoản đang được giao vai trò có thể tiếp tục sử dụng những quyền của vai trò theo phạm vi được giao.'
        : 'Chỉ có thể xóa vai trò chưa được giao cho tài khoản nào. Hệ thống sẽ kiểm tra điều kiện và ghi nhật ký thao tác.'

  return <>
    <AuthorizationPageHeader selectedRole={role.ten} />
    {error && <div role="alert" className="mb-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"><CircleAlert className="mt-0.5 size-4 shrink-0" />{error}</div>}

    <div className="min-w-0 space-y-3">
        <Card className="gap-0 border-border py-0 shadow-sm">
          <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-semibold tracking-tight">{role.ten}</h2><Badge variant={role.trangThai === 'DANG_HOAT_DONG' ? 'success' : 'outline'}>{role.trangThai === 'DANG_HOAT_DONG' ? 'Đang hoạt động' : 'Đang tạm ngừng'}</Badge>{locked && <Badge variant="outline">Vai trò hệ thống</Badge>}</div>
              <p className="mt-1 break-all font-mono text-xs text-muted-foreground">{role.maDinhDanh}</p>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{role.moTa || 'Chưa có mô tả cho vai trò này.'}</p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {!locked && <Button variant="outline" onClick={() => { setName(role.ten); setDescription(role.moTa ?? ''); setEditOpen(true) }}><Pencil /> Thông tin vai trò</Button>}
              {!locked && <Button disabled={!changed} onClick={() => setConfirmAction('save')}><Save /> Lưu thay đổi{changed ? ` (${addedCount + removedCount})` : ''}</Button>}
            </div>
          </CardContent>
        </Card>

        {locked && <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">Vai trò quản trị do hệ thống bảo vệ. Có thể xem ma trận nhưng không thể sửa tại đây.</div>}

        <div className="grid gap-3 sm:grid-cols-3">
          <StatisticCard label="Quyền được cấp" value={assigned.size} icon={<ShieldCheck aria-hidden="true" />} />
          <StatisticCard label="Tài khoản được giao" value={role._count.phanCong} icon={<UsersRound aria-hidden="true" className="text-muted-foreground" />} />
          <StatisticCard label="Thay đổi chưa lưu" value={addedCount + removedCount} icon={<span aria-hidden="true" className={`size-2 rounded-full ${changed ? 'bg-primary' : 'bg-muted-foreground/40'}`} />} />
        </div>

        <Card className="min-w-0">
          <CardHeader className="gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle>Ma trận quyền</CardTitle><CardDescription>Chọn nhóm, tìm quyền rồi chọn hoặc bỏ chọn nhiều quyền cùng lúc.</CardDescription></div><div className="text-sm"><span className="font-semibold">{selected.length}</span><span className="text-muted-foreground"> / {permissions.data?.length ?? 0} quyền đang chọn</span></div></div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input aria-label="Tìm trong ma trận quyền" className="pl-9" placeholder="Tìm theo tên, mã hoặc ý nghĩa quyền..." value={permissionSearch} onChange={(event) => setPermissionSearch(event.target.value)} /></div>
              <Select value={apiFilter} onValueChange={(value) => setApiFilter(value as ApiFilter)}><SelectTrigger aria-label="Lọc theo trạng thái chức năng" className="w-full sm:w-[210px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">Mọi trạng thái chức năng</SelectItem><SelectItem value="DA_CO_API">Đã có chức năng</SelectItem><SelectItem value="CHUA_CO_API">Chưa có chức năng</SelectItem></SelectContent></Select>
            </div>
          </CardHeader>
          <CardContent className="min-w-0 pt-0">
            <Tabs value={activeGroup || firstGroup} onValueChange={setActiveGroup} orientation="vertical" className="min-w-0">
              <ResizablePanelGroup orientation={isSmallScreen ? 'vertical' : 'horizontal'} resizeTargetMinimumSize={{ coarse: 32, fine: 24 }} className={`min-w-0 rounded-md border ${isSmallScreen ? 'h-[950px] min-h-[760px]' : 'h-[640px] min-h-[520px]'}`}>
              <ResizablePanel defaultSize={`${isSmallScreen ? 28 : 25}%`} minSize={`${isSmallScreen ? 20 : 18}%`} maxSize={`${isSmallScreen ? 42 : 38}%`} className="min-h-0 min-w-0">
              <TabsList variant="line" aria-label="Nhóm quyền" className={`h-full w-full flex-col items-stretch justify-start gap-1 overflow-y-auto p-2 ${isSmallScreen ? '' : 'border-r'}`}>
                {groups.map((group) => {
                  const count = group.permissions.filter((item) => selected.includes(item.ma)).length
                  return <TabsTrigger key={group.maNhom} value={group.maNhom} className="h-auto w-full flex-none justify-between gap-2 px-3 py-2.5 text-left">
                    <span className="min-w-0 truncate">{group.tenNhom}</span><span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{count}/{group.permissions.length}</span>
                  </TabsTrigger>
                })}
              </TabsList>
              </ResizablePanel>
              <ResizableHandle withHandle className={isSmallScreen ? 'z-10 h-1 w-full cursor-row-resize touch-none select-none hover:bg-primary/40' : 'z-10 w-1 cursor-col-resize touch-none select-none hover:bg-primary/40'} />
              <ResizablePanel defaultSize={`${isSmallScreen ? 72 : 75}%`} minSize={`${isSmallScreen ? 58 : 62}%`} maxSize={`${isSmallScreen ? 80 : 82}%`} className="min-h-0 min-w-0">
              {groups.map((group) => <TabsContent key={group.maNhom} value={group.maNhom} className="m-0 h-full min-w-0 overflow-auto p-3">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/40 px-3 py-2">
                  <Label className="flex cursor-pointer items-center gap-2 text-sm font-medium"><Checkbox disabled={locked || filteredPermissions.length === 0} checked={allVisibleSelected} onCheckedChange={(checked) => toggleVisible(checked === true)} />Chọn tất cả quyền đang hiển thị</Label>
                  <span className="text-xs text-muted-foreground">{filteredPermissions.length} / {activePermissions.length} quyền</span>
                </div>
                {filteredPermissions.length === 0 ? <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Không tìm thấy quyền phù hợp trong nhóm này.</div> : <div className="max-w-full overflow-hidden rounded-md border">
                  <Table className="w-full table-fixed">
                    <TableHeader><TableRow><TableHead className="w-[27%]">Quyền hạn</TableHead><TableHead className="w-[43%]">Ý nghĩa</TableHead><TableHead className="w-[18%]">Chức năng</TableHead><TableHead className="w-[12%] text-center">Được cấp</TableHead></TableRow></TableHeader>
                    <TableBody>{filteredPermissions.map((permission) => {
                      const isSelected = selected.includes(permission.ma)
                      return <TableRow key={permission.ma}>
                        <TableCell className="whitespace-normal align-top"><div className="break-words font-medium">{permission.ten}</div><div className="mt-1 break-all font-mono text-[11px] leading-4 text-muted-foreground">{permission.maDinhDanh}</div></TableCell>
                        <TableCell className="whitespace-normal align-top text-sm text-muted-foreground">{permission.moTa}</TableCell>
                        <TableCell className="whitespace-normal align-top"><Badge variant={permission.tinhTrangApi === 'DA_CO_API' ? 'secondary' : 'outline'} className="text-center">{permission.tinhTrangApi === 'DA_CO_API' ? 'Đã có' : 'Chưa có'}</Badge></TableCell>
                        <TableCell className="align-top text-center"><Checkbox aria-label={`${isSelected ? 'Bỏ quyền' : 'Cấp quyền'} ${permission.ten}`} disabled={locked} checked={isSelected} onCheckedChange={(checked) => setSelected((current) => checked ? [...new Set([...current, permission.ma])] : current.filter((id) => id !== permission.ma))} /></TableCell>
                      </TableRow>
                    })}</TableBody>
                  </Table>
                </div>}
              </TabsContent>)}
              </ResizablePanel>
              </ResizablePanelGroup>
            </Tabs>
          </CardContent>
        </Card>

        {!locked && <Card>
          <CardHeader><CardTitle className="text-base">Thao tác nhạy cảm</CardTitle><CardDescription>Tạm ngừng ảnh hưởng ngay đến tài khoản đang được giao vai trò. Chỉ xóa vai trò chưa được giao cho tài khoản.</CardDescription></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={saveRole.isPending} onClick={() => setConfirmAction(role.trangThai === 'DANG_HOAT_DONG' ? 'pause' : 'resume')}>{role.trangThai === 'DANG_HOAT_DONG' ? 'Tạm ngừng vai trò' : <><RotateCcw /> Cho phép sử dụng lại</>}</Button>
            {role._count.phanCong === 0 && <Button variant="destructive" disabled={deleteRole.isPending} onClick={() => setConfirmAction('delete')}><Trash2 /> Xóa vai trò</Button>}
          </CardContent>
        </Card>}
    </div>

    <Dialog open={editOpen} onOpenChange={setEditOpen}><DialogContent><DialogHeader><DialogTitle>Thông tin vai trò</DialogTitle><DialogDescription>Chỉnh tên và mô tả hiển thị. Mã kỹ thuật không thay đổi.</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); setError(''); saveRole.mutate({ ten: name.trim(), moTa: description.trim() || null }) }}>
      <div className="space-y-2"><Label htmlFor="detail-name">Tên vai trò</Label><Input id="detail-name" value={name} maxLength={200} required onChange={(event) => setName(event.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="detail-description">Mô tả vai trò</Label><Input id="detail-description" value={description} maxLength={1000} onChange={(event) => setDescription(event.target.value)} /></div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Hủy</Button><Button disabled={saveRole.isPending || !name.trim()}>{saveRole.isPending ? 'Đang lưu…' : 'Lưu thông tin'}</Button></div>
    </form></DialogContent></Dialog>

    <AlertDialog open={confirmAction !== null} onOpenChange={(open) => { if (!open) setConfirmAction(null) }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{confirmTitle}</AlertDialogTitle><AlertDialogDescription>{confirmDescription}</AlertDialogDescription></AlertDialogHeader>
      {confirmAction === 'save' && <div className="flex flex-wrap gap-2 text-sm"><Badge variant="secondary">Thêm {addedCount} quyền</Badge><Badge variant="outline">Bỏ {removedCount} quyền</Badge></div>}
      <AlertDialogFooter><AlertDialogCancel disabled={saveMatrix.isPending || saveRole.isPending || deleteRole.isPending}>Quay lại</AlertDialogCancel><AlertDialogAction disabled={saveMatrix.isPending || saveRole.isPending || deleteRole.isPending} variant={confirmAction === 'delete' ? 'destructive' : 'default'} onClick={(event) => {
        event.preventDefault()
        if (confirmAction === 'save') saveMatrix.mutate({ themMaQuyen: selected.filter((id) => !assigned.has(id)), boMaQuyen: [...assigned].filter((id) => !selected.includes(id)) })
        if (confirmAction === 'pause') saveRole.mutate({ trangThai: 'TAM_NGUNG' })
        if (confirmAction === 'resume') saveRole.mutate({ trangThai: 'DANG_HOAT_DONG' })
        if (confirmAction === 'delete') deleteRole.mutate()
      }}>{saveMatrix.isPending || saveRole.isPending || deleteRole.isPending ? 'Đang xử lý…' : confirmAction === 'save' ? 'Xác nhận lưu' : confirmAction === 'delete' ? 'Xóa vai trò' : confirmAction === 'pause' ? 'Tạm ngừng' : 'Cho phép sử dụng'}</AlertDialogAction></AlertDialogFooter>
    </AlertDialogContent></AlertDialog>
  </>
}
