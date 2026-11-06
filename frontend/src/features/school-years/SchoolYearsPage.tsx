import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, Ellipsis, Plus, RefreshCw, Search, Trash2, Pencil, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { normalizeApiError } from '@/core/api/client'
import { useAuth } from '@/core/auth/auth-context'
import { PageHeader } from '@/shared/components/PageHeader'
import { StatisticCard } from '@/shared/components/StatisticCard'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Badge } from '@/shared/components/ui/badge'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Table, TableActionCell, TableActionHead, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/components/ui/dropdown-menu'
import { StandardSheet } from '@/shared/components/StandardSheet'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/shared/components/ui/alert-dialog'
import { schoolYearsApi, type NamHoc, type NamHocInput } from './school-years.api'

const blank = (): NamHocInput => ({ maNamHoc: '', tenNamHoc: '', ngayBatDau: '', ngayKetThuc: '', trangThai: 'DANG_HOAT_DONG' })
const dateText = (value: string) => new Date(value).toLocaleDateString('vi-VN', { timeZone: 'UTC' })
const textStatus: Record<string, string> = { DANG_DIEN_RA: 'Đang diễn ra', SAP_DIEN_RA: 'Sắp diễn ra', DA_KET_THUC: 'Đã kết thúc', DANG_HOAT_DONG: 'Đang quản lý', NGUNG_HOAT_DONG: 'Ngừng quản lý' }

export function SchoolYearsPage() {
  const currentAccount = useAuth().taiKhoan
  const permissions = currentAccount?.quyenDangHoatDong ?? []
  const activeAssignment = currentAccount?.phanCongHopLe?.find(item => item.maPhanCong === currentAccount.maPhanCongVaiTroDangHoatDong)
  const canManageCatalog = activeAssignment?.loaiPhamVi === 'TOAN_HE_THONG'
  const can = (code: string) => permissions.includes(code)
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(10)
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [sheet, setSheet] = useState(false)
  const [editing, setEditing] = useState<NamHoc | null>(null)
  const [form, setForm] = useState<NamHocInput>(blank())
  const [detail, setDetail] = useState<NamHoc | null>(null)
  const [deleting, setDeleting] = useState<NamHoc | null>(null)
  const query = useQuery({ queryKey: ['school-years', page, size, keyword, status, from, to], queryFn: () => schoolYearsApi.list({ trang: page, gioiHan: size, tuKhoa: keyword || undefined, trangThai: status === 'all' ? undefined : status, tuNgay: from || undefined, denNgay: to || undefined }) })
  const refresh = () => qc.invalidateQueries({ queryKey: ['school-years'] })
  const mutation = useMutation({ mutationFn: () => editing ? schoolYearsApi.update(editing.ma, form) : schoolYearsApi.create(form), onSuccess: async () => { await refresh(); setSheet(false); toast.success(editing ? 'Đã cập nhật năm học.' : 'Đã tạo năm học.') }, onError: e => toast.error(normalizeApiError(e).message) })
  const remove = useMutation({ mutationFn: (id: string) => schoolYearsApi.remove(id), onSuccess: async () => { await refresh(); setDeleting(null); toast.success('Đã xóa năm học.') }, onError: e => toast.error(normalizeApiError(e).message) })
  const openCreate = () => { setEditing(null); setForm(blank()); setSheet(true) }
  const openEdit = (row: NamHoc) => { setEditing(row); setForm({ maNamHoc: row.maNamHoc, tenNamHoc: row.tenNamHoc, ngayBatDau: row.ngayBatDau.slice(0, 10), ngayKetThuc: row.ngayKetThuc.slice(0, 10), trangThai: row.trangThai }); setSheet(true) }
  const reset = () => { setKeyword(''); setStatus('all'); setFrom(''); setTo(''); setPage(1) }
  const stats = query.data?.thongKe
  const currentPage = query.data?.phanTrang
  const pages = Math.max(1, Math.ceil((currentPage?.tongSo ?? 0) / size))
  useEffect(() => { if (page > pages) setPage(pages) }, [page, pages])
  return <div className="min-w-0 space-y-5 pb-8">
    <PageHeader title="Quản lý năm học" description="Quản lý danh mục năm học phục vụ công tác quản lý hồ sơ và theo dõi biến động Đảng viên." actions={<div className="flex gap-2"><Button variant="outline" onClick={() => void query.refetch()} disabled={query.isFetching}><RefreshCw className={query.isFetching ? 'animate-spin' : ''} />Làm mới</Button>{canManageCatalog && can('NAM_HOC_TAO') && <Button onClick={openCreate}><Plus />Tạo năm học</Button>}</div>} />
    {!canManageCatalog && (can('NAM_HOC_TAO') || can('NAM_HOC_SUA') || can('NAM_HOC_XOA')) && <p className="text-sm text-muted-foreground">Danh mục năm học dùng chung. Tạo, sửa và xóa cần Assignment có Scope Toàn hệ thống.</p>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <button className="text-left" onClick={() => { setStatus('all'); setPage(1) }}><StatisticCard label="Tổng số năm học" value={stats?.tongSo ?? '—'} icon={<CalendarDays />} /></button>
      <button className="text-left" onClick={() => { setStatus('DANG_DIEN_RA'); setPage(1) }}><StatisticCard label="Đang diễn ra" value={stats?.dangDienRa ?? '—'} /></button>
      <button className="text-left" onClick={() => { setStatus('SAP_DIEN_RA'); setPage(1) }}><StatisticCard label="Sắp diễn ra" value={stats?.sapDienRa ?? '—'} /></button>
      <button className="text-left" onClick={() => { setStatus('DA_KET_THUC'); setPage(1) }}><StatisticCard label="Đã kết thúc" value={stats?.daKetThuc ?? '—'} /></button>
    </div>
    <Card className="gap-0 py-0"><CardContent className="p-4 md:p-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(15rem,1.5fr)_minmax(12rem,1fr)_minmax(12rem,.9fr)_minmax(12rem,.9fr)_auto] xl:items-end">
        <div className="min-w-0 space-y-2"><Label htmlFor="school-search">Tìm mã hoặc tên năm học</Label><div className="relative"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input id="school-search" className="pl-9" placeholder="Nhập mã hoặc tên năm học" value={keyword} onChange={e => { setKeyword(e.target.value); setPage(1) }} /></div></div>
        <div className="min-w-0 space-y-2"><Label htmlFor="school-status">Trạng thái</Label><Select value={status} onValueChange={v => { setStatus(v); setPage(1) }}><SelectTrigger id="school-status"><SelectValue placeholder="Trạng thái" /></SelectTrigger><SelectContent><SelectItem value="all">Tất cả trạng thái</SelectItem><SelectItem value="DANG_DIEN_RA">Đang diễn ra</SelectItem><SelectItem value="SAP_DIEN_RA">Sắp diễn ra</SelectItem><SelectItem value="DA_KET_THUC">Đã kết thúc</SelectItem><SelectItem value="NGUNG_HOAT_DONG">Ngừng quản lý</SelectItem></SelectContent></Select></div>
        <div className="min-w-0 space-y-2"><Label htmlFor="school-from">Từ ngày</Label><Input id="school-from" type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1) }} /></div>
        <div className="min-w-0 space-y-2"><Label htmlFor="school-to">Đến ngày</Label><Input id="school-to" type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1) }} /></div>
        <Button variant="outline" className="min-h-10" onClick={reset}>Đặt lại bộ lọc</Button>
      </div>
    </CardContent></Card>
    {query.isLoading ? <Card className="gap-0 py-0"><CardContent className="py-12 text-center text-sm text-muted-foreground">Đang tải danh sách năm học…</CardContent></Card> : query.isError ? <Card className="gap-0 py-0"><CardContent className="py-10 text-center"><p className="mb-3 text-sm text-destructive">{normalizeApiError(query.error).message}</p><Button variant="outline" onClick={() => void query.refetch()}>Thử tải lại</Button></CardContent></Card> : !query.data?.duLieu.length ? <Card className="gap-0 py-0"><CardContent className="py-12 text-center text-sm text-muted-foreground">Chưa có năm học phù hợp với bộ lọc.</CardContent></Card> : <Card className="min-w-0 gap-0 py-0"><CardContent className="space-y-0 p-0">
        <div className="overflow-x-auto rounded-lg"><Table className="min-w-[900px]"><TableHeader><TableRow><TableHead className="w-14">STT</TableHead><TableHead>Mã năm học</TableHead><TableHead>Tên năm học</TableHead><TableHead>Ngày bắt đầu</TableHead><TableHead>Ngày kết thúc</TableHead><TableHead>Trạng thái</TableHead><TableActionHead>Thao tác</TableActionHead></TableRow></TableHeader><TableBody>{query.data.duLieu.map((row, i) => <TableRow key={row.ma}><TableCell>{(page - 1) * size + i + 1}</TableCell><TableCell className="font-medium">{row.maNamHoc}</TableCell><TableCell>{row.tenNamHoc}</TableCell><TableCell>{dateText(row.ngayBatDau)}</TableCell><TableCell>{dateText(row.ngayKetThuc)}</TableCell><TableCell><Badge variant="outline" className={row.trangThaiThoiGian === 'DANG_DIEN_RA' ? 'border-transparent bg-success text-success-foreground' : row.trangThaiThoiGian === 'SAP_DIEN_RA' ? 'border-transparent bg-warning-container text-warning-foreground' : ''}>{textStatus[row.trangThaiThoiGian ?? ''] ?? textStatus[row.trangThai]}</Badge></TableCell><TableActionCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`Thao tác ${row.maNamHoc}`}><Ellipsis /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => setDetail(row)}><Eye />Xem chi tiết</DropdownMenuItem>{canManageCatalog && can('NAM_HOC_SUA') && <DropdownMenuItem onClick={() => openEdit(row)}><Pencil />Chỉnh sửa</DropdownMenuItem>}{canManageCatalog && can('NAM_HOC_XOA') && <DropdownMenuItem className="text-destructive" onClick={() => setDeleting(row)}><Trash2 />Xóa</DropdownMenuItem>}</DropdownMenuContent></DropdownMenu></TableActionCell></TableRow>)}</TableBody></Table></div>
        <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-muted-foreground">Đang xem {(page - 1) * size + 1}–{Math.min(page * size, currentPage?.tongSo ?? 0)} trong {currentPage?.tongSo ?? 0} năm học</p><div className="flex flex-wrap items-center gap-2"><Label htmlFor="page-size" className="text-sm text-muted-foreground">Số dòng</Label><Select value={String(size)} onValueChange={v => { setSize(Number(v)); setPage(1) }}><SelectTrigger id="page-size" className="w-20"><SelectValue /></SelectTrigger><SelectContent>{[10, 25, 50, 100].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent></Select><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Trước</Button><span className="min-w-20 text-center text-sm">Trang {page}/{pages}</span><Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Sau</Button></div></div>
    </CardContent></Card>}
    <StandardSheet open={sheet} onOpenChange={setSheet} title={editing ? 'Chỉnh sửa năm học' : 'Tạo năm học'} description="Mã phải duy nhất; khoảng ngày không được chồng lấn với năm học đã khai báo." size="compact" footer={<><Button variant="outline" onClick={() => setSheet(false)}>Hủy</Button><Button disabled={mutation.isPending || !form.maNamHoc || !form.tenNamHoc || !form.ngayBatDau || !form.ngayKetThuc || form.ngayBatDau >= form.ngayKetThuc} onClick={() => mutation.mutate()}>{mutation.isPending ? 'Đang lưu…' : 'Lưu năm học'}</Button></>}>
      <div className="space-y-4"><div className="space-y-2"><Label htmlFor="school-code">Mã năm học</Label><Input id="school-code" maxLength={30} value={form.maNamHoc} onChange={e => setForm({ ...form, maNamHoc: e.target.value })} /></div><div className="space-y-2"><Label htmlFor="school-name">Tên năm học</Label><Input id="school-name" maxLength={100} placeholder="Ví dụ: 2026–2027" value={form.tenNamHoc} onChange={e => setForm({ ...form, tenNamHoc: e.target.value })} /></div><div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label htmlFor="school-start">Ngày bắt đầu</Label><Input id="school-start" type="date" value={form.ngayBatDau} onChange={e => setForm({ ...form, ngayBatDau: e.target.value })} /></div><div className="space-y-2"><Label htmlFor="school-end">Ngày kết thúc</Label><Input id="school-end" type="date" value={form.ngayKetThuc} onChange={e => setForm({ ...form, ngayKetThuc: e.target.value })} /></div></div><div className="space-y-2"><Label>Trạng thái quản lý</Label><Select value={form.trangThai} onValueChange={v => setForm({ ...form, trangThai: v as NamHocInput['trangThai'] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="DANG_HOAT_DONG">Đang quản lý</SelectItem><SelectItem value="NGUNG_HOAT_DONG">Ngừng quản lý</SelectItem></SelectContent></Select></div></div>
    </StandardSheet>
    <Dialog open={Boolean(detail)} onOpenChange={open => !open && setDetail(null)}><DialogContent><DialogHeader><DialogTitle>Chi tiết năm học</DialogTitle><DialogDescription>Thông tin danh mục năm học dùng chung toàn hệ thống.</DialogDescription></DialogHeader>{detail && <dl className="grid grid-cols-2 gap-4 text-sm"><dt className="text-muted-foreground">Mã năm học</dt><dd>{detail.maNamHoc}</dd><dt className="text-muted-foreground">Tên</dt><dd>{detail.tenNamHoc}</dd><dt className="text-muted-foreground">Bắt đầu</dt><dd>{dateText(detail.ngayBatDau)}</dd><dt className="text-muted-foreground">Kết thúc</dt><dd>{dateText(detail.ngayKetThuc)}</dd><dt className="text-muted-foreground">Trạng thái quản lý</dt><dd>{textStatus[detail.trangThai]}</dd><dt className="text-muted-foreground">Tạo lúc</dt><dd>{detail.ngayTao ? new Date(detail.ngayTao).toLocaleString('vi-VN') : '—'}</dd></dl>}</DialogContent></Dialog>
    <AlertDialog open={Boolean(deleting)} onOpenChange={open => !open && setDeleting(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Xóa năm học?</AlertDialogTitle><AlertDialogDescription>Năm học {deleting?.maNamHoc} sẽ bị xóa vĩnh viễn nếu không có dữ liệu nghiệp vụ liên quan.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Hủy</AlertDialogCancel><AlertDialogAction disabled={remove.isPending} onClick={() => deleting && remove.mutate(deleting.ma)}>Xóa năm học</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>
}
