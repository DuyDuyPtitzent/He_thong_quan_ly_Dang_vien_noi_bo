import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Eye, MoreHorizontal, Pencil, Plus, RefreshCw, Search, ShieldCheck, Trash2, UsersRound } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Badge } from '@/shared/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Table, TableActionCell, TableActionHead, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/shared/components/ui/dropdown-menu'
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/shared/components/ui/sheet'
import { StatisticCard } from '@/shared/components/StatisticCard'
import { LoadingState } from '@/shared/components/LoadingState'
import { AuthorizationPageHeader } from './AuthorizationPageHeader'
import { authorizationApi, type RoleItem } from './authorization.api'
import { accountsApi } from '../accounts/accounts.api'

const pageSizes = ['10', '20', '50']
const isActive = (role: RoleItem) => role.trangThai === 'DANG_HOAT_DONG'

export function RoleListPage() {
  const [open, setOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<RoleItem | null>(null)
  const [editRole, setEditRole] = useState<RoleItem | null>(null)
  const [pendingAction, setPendingAction] = useState<{ role: RoleItem; action: 'pause' | 'resume' | 'delete' } | null>(null)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState('10')
  const client = useQueryClient()
  const roles = useQuery({ queryKey: ['authorization', 'roles'], queryFn: authorizationApi.roles })
  const accountRows = useQuery({
    queryKey: ['role-detail-accounts', selectedRole?.ma],
    queryFn: () => accountsApi.list({ maVaiTro: selectedRole!.ma, trang: 1, gioiHan: 50 }),
    enabled: Boolean(selectedRole),
  })
  const filteredRoles = useMemo(() => (roles.data ?? []).filter((role) => {
    const matchesSearch = `${role.ten} ${role.maDinhDanh}`.toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi'))
    return matchesSearch && (status === 'all' || (status === 'active' ? isActive(role) : !isActive(role)))
  }), [roles.data, search, status])
  const size = Number(pageSize)
  const pages = Math.max(1, Math.ceil(filteredRoles.length / size))
  const visibleRoles = filteredRoles.slice((page - 1) * size, page * size)
  const create = useMutation({ mutationFn: authorizationApi.createRole, onSuccess: async () => { await client.invalidateQueries({ queryKey: ['authorization', 'roles'] }); setOpen(false); setCode(''); setName(''); setDescription(''); setError(''); toast.success('Vai trò mới đã được tạo.') }, onError: (e: Error) => setError(e.message) })
  const update = useMutation({ mutationFn: ({ role, input }: { role: RoleItem; input: { ten?: string; moTa?: string | null; trangThai?: string } }) => authorizationApi.updateRole(role.ma, input), onSuccess: async (_data, { input }) => { await client.invalidateQueries({ queryKey: ['authorization', 'roles'] }); setEditRole(null); setPendingAction(null); setError(''); toast.success(input.trangThai ? 'Trạng thái vai trò đã được cập nhật.' : 'Thông tin vai trò đã được cập nhật.') }, onError: (e: Error) => setError(e.message) })
  const remove = useMutation({ mutationFn: (role: RoleItem) => authorizationApi.deleteRole(role.ma), onSuccess: async () => { await client.invalidateQueries({ queryKey: ['authorization', 'roles'] }); setPendingAction(null); toast.success('Vai trò đã được xóa.') }, onError: (e: Error) => { setError(e.message); toast.error(e.message) } })
  const stats = { total: roles.data?.length ?? 0, active: roles.data?.filter(isActive).length ?? 0, inactive: roles.data?.filter((role) => !isActive(role)).length ?? 0, system: roles.data?.filter((role) => role.laVaiTroHeThong).length ?? 0 }

  function beginEdit(role: RoleItem) { setEditRole(role); setEditName(role.ten); setEditDescription(role.moTa ?? ''); setError('') }
  function changeFilter(change: () => void) { change(); setPage(1) }

  return <>
    <AuthorizationPageHeader />
    {roles.isPending ? <LoadingState /> : <div className="space-y-4">
      {roles.isError && <p role="alert" className="text-sm text-destructive">Không tải được danh sách vai trò. {roles.error.message}</p>}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatisticCard label="Tổng vai trò" value={stats.total} icon={<ShieldCheck aria-hidden="true" />} />
        <StatisticCard label="Đang hoạt động" value={stats.active} icon={<span aria-hidden="true" className="size-2 rounded-full bg-primary" />} />
        <StatisticCard label="Ngừng hoạt động" value={stats.inactive} icon={<span aria-hidden="true" className="size-2 rounded-full bg-muted-foreground/50" />} />
        <StatisticCard label="Vai trò hệ thống" value={stats.system} icon={<ShieldCheck aria-hidden="true" className="text-muted-foreground" />} />
      </div>
      <Card className="min-w-0">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle>Quản lý vai trò</CardTitle><CardDescription>Vai trò tập hợp quyền; phạm vi và thời hạn được thiết lập khi giao vai trò cho tài khoản.</CardDescription></div><div className="flex shrink-0 gap-2"><Button type="button" variant="outline" onClick={() => void roles.refetch()} disabled={roles.isFetching}><RefreshCw className={roles.isFetching ? 'animate-spin' : ''} />Làm mới</Button><Button onClick={() => { setError(''); setOpen(true) }}><Plus />Tạo vai trò</Button></div></div>
          <div className="grid gap-3 md:grid-cols-[minmax(240px,1fr)_220px]">
            <div className="relative"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input aria-label="Tìm theo tên hoặc mã vai trò" className="pl-9" placeholder="Tìm theo tên hoặc mã vai trò..." value={search} onChange={(event) => changeFilter(() => setSearch(event.target.value))} /></div>
            <Select value={status} onValueChange={(value) => changeFilter(() => setStatus(value))}><SelectTrigger aria-label="Lọc trạng thái"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Mọi trạng thái</SelectItem><SelectItem value="active">Đang hoạt động</SelectItem><SelectItem value="inactive">Ngừng hoạt động</SelectItem></SelectContent></Select>
          </div>
        </CardHeader>
        <CardContent className="min-w-0 space-y-4">
          <div className="overflow-x-auto rounded-md border">
            <Table className="min-w-[920px]">
              <TableHeader><TableRow><TableHead className="w-16">STT</TableHead><TableHead className="min-w-[190px]">Tên vai trò</TableHead><TableHead className="min-w-[200px]">Mã vai trò</TableHead><TableHead className="w-28 text-right">Số quyền</TableHead><TableHead className="w-32 text-right">Số tài khoản</TableHead><TableHead className="w-44">Trạng thái</TableHead><TableActionHead className="w-16 text-center">Thao tác</TableActionHead></TableRow></TableHeader>
              <TableBody>{visibleRoles.map((role, index) => <TableRow key={role.ma}>
                <TableCell className="text-muted-foreground tabular-nums">{(page - 1) * size + index + 1}</TableCell>
                <TableCell className="font-medium">{role.ten}</TableCell>
                <TableCell className="font-mono text-xs">{role.maDinhDanh}</TableCell>
                <TableCell className="text-right tabular-nums">{role.quyen.length}</TableCell>
                <TableCell className="text-right tabular-nums">{role._count.phanCong}</TableCell>
                <TableCell><div className="flex flex-wrap items-center gap-1.5"><Badge variant={isActive(role) ? 'success' : 'outline'}>{isActive(role) ? 'Đang hoạt động' : 'Ngừng hoạt động'}</Badge>{role.laVaiTroHeThong && <Badge variant="secondary">Hệ thống</Badge>}</div></TableCell>
                <TableActionCell className="text-center"><DropdownMenu><DropdownMenuTrigger asChild><Button size="icon" variant="ghost" aria-label={`Thao tác vai trò ${role.ten}`}><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => { setSelectedRole(role); setError('') }}><Eye />Xem chi tiết</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => beginEdit(role)}><Pencil />Chỉnh sửa vai trò</DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to={`/quan-tri-phan-quyen/vai-tro/${role.ma}`}><ShieldCheck />Mở ma trận quyền</Link></DropdownMenuItem>
                  {!role.laVaiTroHeThong && <><DropdownMenuSeparator /><DropdownMenuItem onSelect={() => setPendingAction({ role, action: isActive(role) ? 'pause' : 'resume' })}>{isActive(role) ? 'Ngừng hoạt động' : 'Kích hoạt lại'}</DropdownMenuItem>{role._count.phanCong === 0 && <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setPendingAction({ role, action: 'delete' })}><Trash2 />Xóa vai trò</DropdownMenuItem>}</>}
                </DropdownMenuContent></DropdownMenu></TableActionCell>
              </TableRow>)}
              {visibleRoles.length === 0 && <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">{filteredRoles.length ? 'Không có vai trò trên trang này.' : 'Không tìm thấy vai trò phù hợp.'}</TableCell></TableRow>}</TableBody>
            </Table>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"><span>Hiển thị {filteredRoles.length ? (page - 1) * size + 1 : 0}–{Math.min(page * size, filteredRoles.length)} trong {filteredRoles.length} vai trò</span><Label htmlFor="role-page-size">Số dòng</Label><Select value={pageSize} onValueChange={(value) => { setPageSize(value); setPage(1) }}><SelectTrigger id="role-page-size" className="h-8 w-[82px]"><SelectValue /></SelectTrigger><SelectContent>{pageSizes.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
            <div className="flex items-center justify-end gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Trước</Button><span className="min-w-20 text-center text-sm text-muted-foreground">Trang {page} / {pages}</span><Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((current) => current + 1)}>Sau</Button></div>
          </div>
        </CardContent>
      </Card>
    </div>}

    <Sheet open={Boolean(selectedRole)} onOpenChange={(value) => { if (!value) setSelectedRole(null) }}>
      <SheetContent className="w-screen gap-0 p-0 sm:max-w-2xl">
        <SheetHeader className="border-b pr-14"><SheetTitle>{selectedRole?.ten ?? 'Chi tiết vai trò'}</SheetTitle><SheetDescription>Thông tin vai trò, quyền được cấp và tài khoản đang được phân công.</SheetDescription></SheetHeader>
        <SheetBody className="space-y-6 bg-background p-5">
          {selectedRole && <>
            <section className="space-y-3"><h3 className="text-sm font-semibold">Thông tin vai trò</h3><div className="grid gap-3 rounded-md border bg-card p-4 sm:grid-cols-2"><Info label="Tên vai trò" value={selectedRole.ten} /><Info label="Mã vai trò" value={selectedRole.maDinhDanh} mono /><Info label="Trạng thái" value={isActive(selectedRole) ? 'Đang hoạt động' : 'Ngừng hoạt động'} /><Info label="Loại vai trò" value={selectedRole.laVaiTroHeThong ? 'Vai trò hệ thống' : 'Vai trò nghiệp vụ'} /><Info label="Số quyền" value={selectedRole.quyen.length} /><Info label="Số tài khoản được phân công" value={selectedRole._count.phanCong} /><div className="sm:col-span-2"><Info label="Mô tả" value={selectedRole.moTa || 'Chưa có mô tả.'} /></div></div></section>
            <section className="space-y-3"><div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold">Danh sách quyền được cấp</h3><Badge variant="secondary">{selectedRole.quyen.length}</Badge></div>{selectedRole.quyen.length ? <ul className="divide-y rounded-md border bg-card">{selectedRole.quyen.map(({ maQuyen, quyen }) => <li key={maQuyen} className="flex items-start gap-2 p-3"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" /><span className="min-w-0"><span className="block text-sm font-medium">{quyen.ten}</span><span className="font-mono text-xs text-muted-foreground">{quyen.maDinhDanh}</span></span></li>)}</ul> : <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Vai trò chưa được cấp quyền nào.</p>}</section>
            <section className="space-y-3"><div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold">Tài khoản được phân công</h3><Badge variant="secondary">{selectedRole._count.phanCong}</Badge></div>{accountRows.isPending ? <p role="status" className="text-sm text-muted-foreground">Đang tải tài khoản trong phạm vi được phép xem…</p> : accountRows.isError ? <p role="alert" className="text-sm text-destructive">Không thể tải danh sách tài khoản. {accountRows.error.message}</p> : accountRows.data.duLieu.length ? <ul className="divide-y rounded-md border bg-card">{accountRows.data.duLieu.map((account) => <li key={account.maTaiKhoan} className="flex items-start gap-3 p-3"><UsersRound className="mt-0.5 size-4 shrink-0 text-muted-foreground" /><div className="min-w-0"><p className="text-sm font-medium">{account.hoVaTen ?? 'Chưa liên kết hồ sơ'}</p><p className="text-xs text-muted-foreground">{account.tenDangNhap}{account.chiBoHienTai ? ` · ${account.chiBoHienTai}` : ''}</p></div><Badge className="ml-auto shrink-0" variant={account.trangThai === 'DANG_HOAT_DONG' ? 'success' : 'outline'}>{account.trangThai === 'DANG_HOAT_DONG' ? 'Đang hoạt động' : 'Ngừng hoạt động'}</Badge></li>)}</ul> : <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Không có tài khoản nào đang được phân công trong phạm vi xem hiện tại.</p>}{accountRows.data && accountRows.data.phanTrang.tongSo > accountRows.data.duLieu.length && <p className="text-xs text-muted-foreground">Đang hiển thị {accountRows.data.duLieu.length} trên {accountRows.data.phanTrang.tongSo} tài khoản trong phạm vi xem được.</p>}</section>
          </>}
        </SheetBody>
        <SheetFooter className="border-t bg-card sm:flex-row sm:justify-between"><Button variant="outline" onClick={() => setSelectedRole(null)}>Đóng</Button>{selectedRole && <Button asChild><Link to={`/quan-tri-phan-quyen/vai-tro/${selectedRole.ma}`}><ShieldCheck />Mở ma trận quyền</Link></Button>}</SheetFooter>
      </SheetContent>
    </Sheet>

    <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Tạo vai trò mới</DialogTitle><DialogDescription>Vai trò mới chưa được giao quyền nào. Sau khi tạo, hãy mở ma trận để chọn quyền cần thiết.</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); setError(''); create.mutate({ maDinhDanh: code.trim().toUpperCase(), ten: name.trim(), ...(description.trim() ? { moTa: description.trim() } : {}) }) }}>
      <div className="space-y-2"><Label htmlFor="role-code">Mã vai trò (chữ không dấu, số và dấu gạch dưới)</Label><Input id="role-code" required minLength={2} maxLength={100} pattern="[A-Za-z0-9_]+" value={code} onChange={(event) => setCode(event.target.value)} placeholder="QUAN_TRI_CHI_BO" /></div><div className="space-y-2"><Label htmlFor="role-name">Tên vai trò</Label><Input id="role-name" required maxLength={200} value={name} onChange={(event) => setName(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="role-description">Mô tả (không bắt buộc)</Label><Input id="role-description" maxLength={1000} value={description} onChange={(event) => setDescription(event.target.value)} /></div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Hủy</Button><Button type="submit" disabled={create.isPending}>{create.isPending ? 'Đang tạo…' : 'Tạo vai trò'}</Button></div>
    </form></DialogContent></Dialog>

    <Dialog open={Boolean(editRole)} onOpenChange={(value) => { if (!value) setEditRole(null) }}><DialogContent><DialogHeader><DialogTitle>Chỉnh sửa vai trò</DialogTitle><DialogDescription>Chỉnh tên và mô tả hiển thị. Mã vai trò không thay đổi.</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); if (editRole) update.mutate({ role: editRole, input: { ten: editName.trim(), moTa: editDescription.trim() || null } }) }}><div className="space-y-2"><Label htmlFor="edit-role-name">Tên vai trò</Label><Input id="edit-role-name" value={editName} maxLength={200} required onChange={(event) => setEditName(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="edit-role-description">Mô tả vai trò</Label><Input id="edit-role-description" value={editDescription} maxLength={1000} onChange={(event) => setEditDescription(event.target.value)} /></div>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setEditRole(null)}>Hủy</Button><Button disabled={update.isPending || !editName.trim()}>{update.isPending ? 'Đang lưu…' : 'Lưu thông tin'}</Button></div></form></DialogContent></Dialog>

    <Dialog open={Boolean(pendingAction)} onOpenChange={(value) => { if (!value) { setPendingAction(null); setError('') } }}><DialogContent><DialogHeader><DialogTitle>{pendingAction?.action === 'delete' ? 'Xóa vai trò?' : pendingAction?.action === 'pause' ? 'Ngừng hoạt động vai trò?' : 'Kích hoạt lại vai trò?'}</DialogTitle><DialogDescription>{pendingAction?.action === 'delete' ? 'Chỉ có thể xóa vai trò hệ thống chưa phân công; Backend kiểm tra điều kiện và ghi nhật ký.' : pendingAction?.action === 'pause' ? 'Các tài khoản được phân công sẽ không thể sử dụng quyền thuộc vai trò này khi vai trò ngừng hoạt động.' : 'Vai trò hoạt động trở lại và quyền được áp dụng theo phạm vi đã phân công.'}</DialogDescription></DialogHeader>{pendingAction && <p className="rounded-md bg-muted/50 p-3 text-sm font-medium">{pendingAction.role.ten} · {pendingAction.role.maDinhDanh}</p>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setPendingAction(null)}>Quay lại</Button><Button variant={pendingAction?.action === 'delete' ? 'destructive' : 'default'} disabled={update.isPending || remove.isPending} onClick={() => { if (!pendingAction) return; if (pendingAction.action === 'delete') remove.mutate(pendingAction.role); else update.mutate({ role: pendingAction.role, input: { trangThai: pendingAction.action === 'pause' ? 'TAM_NGUNG' : 'DANG_HOAT_DONG' } }) }}>{remove.isPending || update.isPending ? 'Đang xử lý…' : pendingAction?.action === 'delete' ? 'Xóa vai trò' : pendingAction?.action === 'pause' ? 'Ngừng hoạt động' : 'Kích hoạt lại'}</Button></div></DialogContent></Dialog>
  </>
}

function Info({ label, value, mono = false }: { label: string; value: string | number; mono?: boolean }) {
  return <div className="min-w-0"><p className="text-xs text-muted-foreground">{label}</p><p className={`mt-1 break-words text-sm font-medium ${mono ? 'font-mono' : ''}`}>{value}</p></div>
}
