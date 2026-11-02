import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, RefreshCw, Search, ShieldCheck, UsersRound } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Badge } from '@/shared/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { LoadingState } from '@/shared/components/LoadingState'
import { AuthorizationPageHeader } from './AuthorizationPageHeader'
import { authorizationApi } from './authorization.api'

export function RoleListPage() {
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const client = useQueryClient()
  const roles = useQuery({ queryKey: ['authorization', 'roles'], queryFn: authorizationApi.roles })
  const filteredRoles = useMemo(() => (roles.data ?? []).filter((role) => `${role.ten} ${role.maDinhDanh} ${role.moTa ?? ''}`.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi'))), [roles.data, search])
  const create = useMutation({ mutationFn: authorizationApi.createRole, onSuccess: async () => { await client.invalidateQueries({ queryKey: ['authorization', 'roles'] }); setOpen(false); setCode(''); setName(''); setDescription(''); setError(''); toast.success('Vai trò mới đã được tạo.') }, onError: (e: Error) => setError(e.message) })
  if (roles.isPending) return <LoadingState />
  return <>
    <AuthorizationPageHeader />
    {roles.isError && <p role="alert" className="mb-4 text-sm text-destructive">Không tải được danh sách vai trò. {roles.error.message}</p>}
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle>Danh sách vai trò</CardTitle><CardDescription>Vai trò tập hợp quyền; phạm vi và thời hạn được thiết lập khi giao vai trò cho tài khoản.</CardDescription></div><div className="flex shrink-0 gap-2"><Button type="button" variant="outline" size="icon" aria-label="Tải lại danh sách" onClick={() => void roles.refetch()}><RefreshCw /></Button><Button onClick={() => setOpen(true)}><Plus /> Tạo vai trò</Button></div></div>
        <div className="relative max-w-xl"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input aria-label="Tìm vai trò" className="pl-9" placeholder="Tìm theo tên, mã kỹ thuật hoặc mô tả..." value={search} onChange={(event) => setSearch(event.target.value)} /></div>
      </CardHeader>
      <CardContent>
        {filteredRoles.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">{roles.data?.length ? 'Không tìm thấy vai trò phù hợp.' : 'Chưa có vai trò nào.'}</p> : <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
          {filteredRoles.map((role) => <article key={role.ma} className="flex min-w-0 flex-col rounded-lg border bg-card p-4 transition-colors hover:border-primary/40">
            <div className="flex items-start justify-between gap-2"><div className="min-w-0"><h2 className="truncate font-semibold" title={role.ten}>{role.ten}</h2><p className="mt-1 truncate font-mono text-xs text-muted-foreground" title={role.maDinhDanh}>{role.maDinhDanh}</p></div><Badge variant={role.trangThai === 'DANG_HOAT_DONG' ? 'success' : 'outline'} className="shrink-0">{role.trangThai === 'DANG_HOAT_DONG' ? 'Đang hoạt động' : 'Tạm ngừng'}</Badge></div>
            {role.laVaiTroHeThong && <Badge variant="outline" className="mt-3 w-fit">Vai trò hệ thống</Badge>}
            <p className="mt-3 min-h-10 text-sm text-muted-foreground">{role.moTa || 'Chưa có mô tả.'}</p>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t pt-3 text-sm"><span className="flex items-center gap-1.5"><ShieldCheck className="size-4 text-primary" />{role.quyen.length} quyền</span><span className="flex items-center gap-1.5"><UsersRound className="size-4 text-muted-foreground" />{role._count.phanCong} tài khoản</span><Button asChild size="sm" variant="outline" className="ml-auto"><Link to={`/quan-tri-phan-quyen/vai-tro/${role.ma}`}>{role.laVaiTroHeThong ? 'Xem vai trò' : 'Mở vai trò'}</Link></Button></div>
          </article>)}
        </div>}
      </CardContent>
    </Card>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Tạo vai trò mới</DialogTitle><DialogDescription>Vai trò mới chưa được giao quyền nào. Sau khi tạo, hãy mở vai trò để chọn các quyền cần thiết.</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); setError(''); create.mutate({ maDinhDanh: code.trim().toUpperCase(), ten: name.trim(), ...(description.trim() ? { moTa: description.trim() } : {}) }) }}>
      <div className="space-y-2"><Label htmlFor="role-code">Mã kỹ thuật (chỉ gồm chữ không dấu, số và dấu gạch dưới)</Label><Input id="role-code" required minLength={2} maxLength={100} pattern="[A-Za-z0-9_]+" value={code} onChange={(e) => setCode(e.target.value)} placeholder="QUAN_TRI_CHI_BO" /></div>
      <div className="space-y-2"><Label htmlFor="role-name">Tên vai trò</Label><Input id="role-name" required maxLength={200} value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="role-description">Mô tả (không bắt buộc)</Label><Input id="role-description" maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Hủy</Button><Button type="submit" disabled={create.isPending}>{create.isPending ? 'Đang tạo…' : 'Tạo vai trò'}</Button></div>
    </form></DialogContent></Dialog>
  </>
}
