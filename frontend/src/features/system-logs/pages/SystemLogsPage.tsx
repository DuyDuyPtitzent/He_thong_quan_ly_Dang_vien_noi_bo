import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AlertCircle, CheckCircle2, ClipboardList, Eye, RotateCcw, ShieldAlert, Trash2, XCircle } from 'lucide-react'
import { normalizeApiError } from '@/core/api/client'
import { useAuth } from '@/core/auth/auth-context'
import { coQuyenTruyCapNhatKyToanHeThong } from '@/core/auth/system-log-access'
import { PageHeader } from '@/shared/components/PageHeader'
import { StatisticCard } from '@/shared/components/StatisticCard'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/shared/components/ui/alert-dialog'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Table, TableActionCell, TableActionHead, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { DateRangePicker } from '@/shared/components/date-time'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { useSystemLogDetail, useSystemLogs } from '../hooks/useSystemLogs'
import { systemLogsApi } from '../api/system-logs.api'
import type { LogFilters, LogType, RemovalPreview, SystemLog } from '../types/system-logs'

const initialFilters: LogFilters = { trang: 1, kichThuoc: 20, tuKhoa: '', hanhDong: '', ketQua: '', tuNgay: '', denNgay: '', taiKhoan: '', maDonVi: '' }
const formatDate = (value: string) => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(value))
const objectLabels: Record<string, string> = { HO_SO_DANG_VIEN: 'Hồ sơ Đảng viên', TAI_KHOAN: 'Tài khoản', VAI_TRO: 'Vai trò', DON_VI_TO_CHUC: 'Đơn vị tổ chức', PHAN_CONG_VAI_TRO: 'Phân công vai trò', YEU_CAU_CAP_NHAT_HO_SO: 'Yêu cầu cập nhật hồ sơ', NAM_HOC: 'Năm học', DOT_CAP_NHAT_HO_SO: 'Đợt cập nhật hồ sơ' }
const objectLabel = (value: string) => objectLabels[value] ?? value.replaceAll('_', ' ').toLocaleLowerCase('vi-VN')
const failureReason = (value: string | null) => value === 'THONG_TIN_DANG_NHAP_KHONG_HOP_LE' ? 'Tên đăng nhập hoặc mật khẩu không hợp lệ.' : value ?? 'Không có'

export function SystemLogsPage() {
  const queryClient = useQueryClient()
  const account = useAuth().taiKhoan
  const permissions = account?.quyenDangHoatDong ?? []
  const isSystemAdministrator = coQuyenTruyCapNhatKyToanHeThong(account)
  const canAudit = permissions.includes('NHAT_KY_KIEM_TOAN_XEM')
  const canSecurity = permissions.includes('NHAT_KY_BAO_MAT_XEM')
  const canDelete = permissions.includes('NHAT_KY_XOA')
  const [type, setType] = useState<LogType>(canAudit ? 'thao-tac' : 'bao-mat')
  const [filters, setFilters] = useState(initialFilters)
  const [searchInput, setSearchInput] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedLogs, setSelectedLogs] = useState<string[]>([])
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteMode, setDeleteMode] = useState<'selected' | 'range'>('selected')
  const [deleteFrom, setDeleteFrom] = useState('')
  const [deleteTo, setDeleteTo] = useState('')
  const [deleteReason, setDeleteReason] = useState('')
  const [deletePreview, setDeletePreview] = useState<RemovalPreview | null>(null)
  const [deletePreviewError, setDeletePreviewError] = useState('')
  const [previewPending, setPreviewPending] = useState(false)
  useEffect(() => {
    if (!isSystemAdministrator) {
      setSelectedId(null)
      setSelectedLogs([])
      setDeleteOpen(false)
      setDeletePreview(null)
      void queryClient.cancelQueries({ queryKey: ['system-logs'] }).then(() => queryClient.removeQueries({ queryKey: ['system-logs'] }))
    }
  }, [isSystemAdministrator, queryClient])
  useEffect(() => { const timer = window.setTimeout(() => setFilters((old) => ({ ...old, tuKhoa: searchInput, trang: 1 })), 300); return () => window.clearTimeout(timer) }, [searchInput])
  const update = (key: keyof LogFilters, value: string) => setFilters((old) => ({ ...old, [key]: value, trang: 1 }))
  const reset = () => { setFilters(initialFilters); setSearchInput('') }
  const chooseTab = (value: string) => { setType(value as LogType); setSelectedLogs([]); reset() }
  function openDeleteDialog() {
    setDeleteMode(selectedLogs.length ? 'selected' : 'range')
    setDeleteFrom(filters.tuNgay); setDeleteTo(filters.denNgay); setDeleteReason('')
    setDeletePreview(null); setDeletePreviewError(''); setDeleteOpen(true)
  }
  async function previewDelete() {
    if (deleteReason.trim().length < 3 || previewPending) return
    setPreviewPending(true); setDeletePreviewError('')
    try {
      const result = await systemLogsApi.previewRemoval(type, {
        ...(deleteMode === 'selected' ? { maNhatKy: selectedLogs } : { tuNgay: deleteFrom, denNgay: deleteTo }),
        ...(filters.maDonVi ? { maDonVi: filters.maDonVi } : {}), lyDo: deleteReason.trim(),
      })
      setDeletePreview(result)
    } catch { setDeletePreviewError('Không thể xem trước. Kiểm tra Permission, Scope và lựa chọn rồi thử lại.') }
    finally { setPreviewPending(false) }
  }
  if (!isSystemAdministrator || (!canAudit && !canSecurity)) return <div className="space-y-5"><PageHeader title="Không có quyền truy cập" description="Nhật ký hệ thống chỉ dành cho Quản trị viên toàn hệ thống có phân công hợp lệ." /><Card><CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground"><ShieldAlert className="size-5" />Bạn không có quyền truy cập Nhật ký hệ thống.</CardContent></Card></div>
  return <div className="space-y-5">
    <PageHeader title="Nhật ký hệ thống" description="Theo dõi lịch sử thao tác và các sự kiện được ghi nhận trong hệ thống." />
    <Tabs value={type} onValueChange={chooseTab}>
      <TabsList>{canAudit && <TabsTrigger value="thao-tac">Nhật ký thao tác</TabsTrigger>}{canSecurity && <TabsTrigger value="bao-mat">Nhật ký bảo mật</TabsTrigger>}</TabsList>
      {(['thao-tac', 'bao-mat'] as const).filter((tab) => tab === 'thao-tac' ? canAudit : canSecurity).map((tab) => <TabsContent value={tab} key={tab} className="space-y-5 pt-1">
        <LogContent type={tab} filters={filters} update={update} reset={reset} searchInput={searchInput} setSearchInput={setSearchInput} setSelectedId={setSelectedId} setFilters={setFilters} canDelete={canDelete} showDeleteControls selectedLogs={selectedLogs} setSelectedLogs={setSelectedLogs} onDelete={openDeleteDialog} />
      </TabsContent>)}
    </Tabs>
    <LogDetailDialog type={type} id={selectedId} onClose={() => setSelectedId(null)} />
    <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}><AlertDialogContent className="sm:max-w-xl"><AlertDialogHeader><AlertDialogTitle>Xem trước xóa nhật ký</AlertDialogTitle><AlertDialogDescription>Đây chỉ là bước kiểm tra. Hệ thống chưa thực hiện xóa bản ghi nào.</AlertDialogDescription></AlertDialogHeader>
      <div className="space-y-4 text-sm">
        <div className="grid gap-3 sm:grid-cols-2"><div><p className="text-muted-foreground">Loại nhật ký</p><p className="font-medium">{type === 'thao-tac' ? 'Nhật ký thao tác' : 'Nhật ký bảo mật'}</p></div><div><p className="text-muted-foreground">Phạm vi đơn vị</p><p className="font-medium">{filters.maDonVi ? 'Đơn vị theo bộ lọc hiện tại' : 'Scope đang hoạt động'}</p></div></div>
        <label className="space-y-1.5"><span>Chọn phạm vi xem trước</span><Select value={deleteMode} onValueChange={(v) => { setDeleteMode(v as 'selected' | 'range'); setDeletePreview(null) }}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="selected">Các bản ghi đã chọn ({selectedLogs.length})</SelectItem><SelectItem value="range">Khoảng thời gian</SelectItem></SelectContent></Select></label>
        {deleteMode === 'range' && <div className="space-y-1.5"><label htmlFor="log-delete-range">Khoảng ngày</label><DateRangePicker id="log-delete-range" aria-label="Khoảng ngày nhật ký cần xem trước" value={{ from: deleteFrom || undefined, to: deleteTo || undefined }} onChange={(range) => { setDeleteFrom(range?.from ?? ''); setDeleteTo(range?.to ?? ''); setDeletePreview(null) }} /></div>}
        <label className="space-y-1.5"><span>Lý do yêu cầu</span><Textarea value={deleteReason} onChange={(e) => { setDeleteReason(e.target.value); setDeletePreview(null) }} maxLength={1000} rows={3} placeholder="Nhập lý do cho yêu cầu kiểm tra" /><span className="text-xs text-muted-foreground">Lý do chỉ được gửi kèm yêu cầu xem trước; hiện chưa ghi thành dấu vết kiểm toán.</span></label>
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm"><p className="font-medium">Cảnh báo: thao tác xóa vật lý không thể khôi phục.</p><p className="mt-1 text-muted-foreground">Hiện thao tác này đang bị khóa vì chưa có chính sách lưu trữ PTIT được phê duyệt và CSDL còn trigger bảo vệ audit append-only.</p></div>
        {deletePreview && <div role="status" className="rounded-md bg-muted p-3"><p>Bản ghi khớp trong Scope: <strong>{deletePreview.soBanGhiKhopTrongPhamVi}</strong></p><p>Bản ghi đủ điều kiện xóa: <strong>Chưa xác định</strong></p><p className="mt-1 text-destructive">{deletePreview.lyDoKhongTheXoa}</p></div>}
        {deletePreviewError && <p role="alert" className="text-destructive">{deletePreviewError}</p>}
      </div>
      <AlertDialogFooter><AlertDialogCancel disabled={previewPending}>Đóng</AlertDialogCancel><Button type="button" variant="outline" disabled={previewPending || deleteReason.trim().length < 3 || (deleteMode === 'selected' ? selectedLogs.length === 0 : !deleteFrom || !deleteTo)} onClick={() => void previewDelete()}>{previewPending ? 'Đang kiểm tra…' : 'Kiểm tra số lượng'}</Button><Tooltip><TooltipTrigger asChild><span tabIndex={0} aria-label="Xóa nhật ký đang bị khóa vì chưa có chính sách lưu trữ được phê duyệt"><Button type="button" variant="destructive" disabled>Xóa nhật ký</Button></span></TooltipTrigger><TooltipContent>Chưa có chính sách lưu trữ được phê duyệt</TooltipContent></Tooltip></AlertDialogFooter>
    </AlertDialogContent></AlertDialog>
  </div>
}

function LogContent({ type, filters, update, reset, searchInput, setSearchInput, setSelectedId, setFilters, canDelete, showDeleteControls, selectedLogs, setSelectedLogs, onDelete }: {
  type: LogType; filters: LogFilters; update: (key: keyof LogFilters, value: string) => void; reset: () => void
  searchInput: string; setSearchInput: (value: string) => void; setSelectedId: (value: string | null) => void
  setFilters: React.Dispatch<React.SetStateAction<LogFilters>>
  canDelete: boolean; showDeleteControls: boolean; selectedLogs: string[]; setSelectedLogs: React.Dispatch<React.SetStateAction<string[]>>; onDelete: () => void
}) {
  const { list, stats, actions, units } = useSystemLogs(type, filters)
  const pages = Math.max(1, Math.ceil((list.data?.tongSo ?? 0) / filters.kichThuoc))
  return <>
    <section aria-label="Thống kê nhật ký" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatisticCard label={type === 'thao-tac' ? 'Tổng nhật ký thao tác' : 'Tổng nhật ký bảo mật'} description="Gồm mọi giá trị kết quả của loại nhật ký đang xem." value={stats.data?.tong ?? '—'} icon={<ClipboardList className="size-5" />} />
      <StatisticCard label="Thành công" description="Chỉ gồm kết quả THANH_CONG." value={stats.data?.thanhCong ?? '—'} icon={<CheckCircle2 className="size-5" />} />
      <StatisticCard label="Thất bại" description="Chỉ gồm kết quả THAT_BAI." value={stats.data?.thatBai ?? '—'} icon={<XCircle className="size-5" />} />
      <StatisticCard label="Kết quả khác" description="Các kết quả ngoài thành công và thất bại; cộng ba thẻ kết quả bằng tổng." value={stats.data?.ketQuaKhac ?? '—'} icon={<ShieldAlert className="size-5" />} />
    </section>
    <Card><CardContent className="space-y-4 p-5"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      <label className="space-y-1.5 text-sm xl:col-span-2"><span>Tìm người thực hiện hoặc nội dung</span><Input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Nhập tên hoặc hành động" /></label>
      <label className="space-y-1.5 text-sm"><span>Tài khoản thực hiện</span><Input value={filters.taiKhoan} onChange={(e) => update('taiKhoan', e.target.value)} placeholder="Tên đăng nhập" /></label>
      <label className="space-y-1.5 text-sm"><span>Loại sự kiện</span><Select value={filters.hanhDong || '__all__'} onValueChange={(value) => update('hanhDong', value === '__all__' ? '' : value)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__all__">Tất cả loại</SelectItem>{actions.data?.map(({ ma, ten }) => <SelectItem key={ma} value={ma}>{ten}</SelectItem>)}</SelectContent></Select></label>
      <label className="space-y-1.5 text-sm"><span>Đơn vị tổ chức</span><Select value={filters.maDonVi || '__all__'} onValueChange={(value) => update('maDonVi', value === '__all__' ? '' : value)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__all__">Tất cả đơn vị trong phạm vi</SelectItem>{units.data?.map((unit) => <SelectItem key={unit.ma} value={unit.ma}>{unit.ten} {unit.maDinhDanh ? `(${unit.maDinhDanh})` : ''}</SelectItem>)}</SelectContent></Select></label>
      <label className="space-y-1.5 text-sm"><span>Kết quả</span><Select value={filters.ketQua || '__all__'} onValueChange={(value) => update('ketQua', value === '__all__' ? '' : value)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__all__">Tất cả</SelectItem><SelectItem value="THANH_CONG">Thành công</SelectItem><SelectItem value="THAT_BAI">Thất bại</SelectItem></SelectContent></Select></label>
      <div className="flex items-end"><Button variant="outline" className="w-full" onClick={reset}><RotateCcw />Đặt lại</Button></div>
      <div className="space-y-1.5 text-sm"><label htmlFor="log-date-range">Khoảng ngày</label><DateRangePicker id="log-date-range" aria-label="Lọc nhật ký theo khoảng ngày" value={{ from: filters.tuNgay || undefined, to: filters.denNgay || undefined }} onChange={(range) => { update('tuNgay', range?.from ?? ''); update('denNgay', range?.to ?? '') }} /></div>
    </div></CardContent></Card>
    <Card className="gap-0 py-0"><CardContent className="p-0">{list.isError ? <div role="alert" className="flex flex-wrap items-center justify-between gap-3 p-5 text-sm text-destructive"><div className="space-y-1"><p className="flex items-center gap-2"><AlertCircle className="size-4" />{normalizeApiError(list.error).message || 'Không thể tải nhật ký.'}</p><p className="pl-6 text-xs text-muted-foreground">{normalizeApiError(list.error).status ? `Mã HTTP ${normalizeApiError(list.error).status}` : ''}{normalizeApiError(list.error).correlationId ? ` · Mã tra cứu ${normalizeApiError(list.error).correlationId}` : ''}</p></div><Button variant="outline" onClick={() => void list.refetch()}>Thử lại</Button></div> : list.isPending ? <p role="status" className="p-6 text-sm text-muted-foreground">Đang tải nhật ký…</p> : <>
      {showDeleteControls && <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4"><div className="space-y-1"><p className="text-sm text-muted-foreground">Đã chọn {selectedLogs.length} bản ghi</p>{!canDelete && <p role="status" className="text-xs text-muted-foreground">Chức năng đang khóa: tài khoản chưa được cấp Permission NHAT_KY_XOA. Việc cấp quyền phải theo quy trình quản trị phân quyền.</p>}</div><Button variant="outline" disabled={!canDelete} onClick={onDelete}><Trash2 />Xóa nhật ký</Button></div>}
      <Table><TableHeader><TableRow>{showDeleteControls && <TableHead><Checkbox aria-label="Chọn nhật ký trên trang này" disabled={!canDelete} checked={list.data?.items.length ? list.data.items.every((row) => selectedLogs.includes(row.ma)) ? true : list.data.items.some((row) => selectedLogs.includes(row.ma)) ? 'indeterminate' : false : false} onCheckedChange={(checked) => { const ids = list.data?.items.map((row) => row.ma) ?? []; setSelectedLogs((current) => checked ? [...new Set([...current, ...ids])] : current.filter((id) => !ids.includes(id))) }} /></TableHead>}<TableHead>STT</TableHead><TableHead>Thời gian</TableHead><TableHead>Người thực hiện</TableHead><TableHead>Chức năng</TableHead><TableHead>Hành động</TableHead><TableHead>Kết quả</TableHead><TableActionHead>Thao tác</TableActionHead></TableRow></TableHeader><TableBody>
        {list.data?.items.length ? list.data.items.map((row: SystemLog, index) => <TableRow key={row.ma}>{showDeleteControls && <TableCell><Checkbox aria-label={`Chọn nhật ký ${row.tenHanhDong}`} disabled={!canDelete} checked={selectedLogs.includes(row.ma)} onCheckedChange={(checked) => setSelectedLogs((current) => checked ? [...new Set([...current, row.ma])] : current.filter((id) => id !== row.ma))} /></TableCell>}<TableCell>{(filters.trang - 1) * filters.kichThuoc + index + 1}</TableCell><TableCell>{formatDate(row.thoiDiem)}</TableCell><TableCell><span className="block">{row.nguoiThucHien?.hoSoDangVien?.hoVaTen ?? 'Không xác định'}</span><span className="text-xs text-muted-foreground">{row.nguoiThucHien?.tenDangNhap ?? 'Tài khoản không còn liên kết'}</span></TableCell><TableCell>{objectLabel(row.loaiDoiTuong)}</TableCell><TableCell>{row.tenHanhDong}</TableCell><TableCell><Badge variant={row.ketQua === 'THANH_CONG' ? 'default' : 'destructive'}>{row.ketQua === 'THANH_CONG' ? 'Thành công' : 'Thất bại'}</Badge></TableCell><TableActionCell><Button variant="ghost" size="sm" onClick={() => setSelectedId(row.ma)}><Eye />Xem chi tiết</Button></TableActionCell></TableRow>) : <TableRow><TableCell colSpan={showDeleteControls ? 8 : 7} className="h-28 text-center text-muted-foreground">Không có nhật ký phù hợp.</TableCell></TableRow>}
      </TableBody></Table>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t p-4 text-sm text-muted-foreground"><span>{list.data?.tongSo ?? 0} sự kiện · Trang {filters.trang}/{pages}</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={filters.trang <= 1 || list.isFetching} onClick={() => setFilters((old) => ({ ...old, trang: old.trang - 1 }))}>Trước</Button><Button variant="outline" size="sm" disabled={filters.trang >= pages || list.isFetching} onClick={() => setFilters((old) => ({ ...old, trang: old.trang + 1 }))}>Tiếp</Button></div></div>
    </>}</CardContent></Card>
  </>
}

function LogDetailDialog({ type, id, onClose }: { type: LogType; id: string | null; onClose: () => void }) {
  const query = useSystemLogDetail(type, id)
  const row = query.data
  return <Dialog open={Boolean(id)} onOpenChange={(open) => { if (!open) onClose() }}><DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle>Chi tiết nhật ký</DialogTitle><DialogDescription>Thông tin đã được hệ thống ghi nhận cho sự kiện này.</DialogDescription></DialogHeader>
    {query.isPending ? <p role="status" className="text-sm text-muted-foreground">Đang tải chi tiết…</p> : query.isError ? <p role="alert" className="text-sm text-destructive">Không thể tải chi tiết nhật ký trong phạm vi hiện tại.</p> : row && <dl className="grid gap-4 text-sm sm:grid-cols-2"><Detail label="Thời điểm" value={formatDate(row.thoiDiem)} /><Detail label="Người thực hiện" value={row.nguoiThucHien?.hoSoDangVien?.hoVaTen ?? 'Không xác định'} /><Detail label="Tài khoản" value={row.nguoiThucHien?.tenDangNhap ?? 'Tài khoản không còn liên kết'} /><Detail label="Chức năng" value={objectLabel(row.loaiDoiTuong)} /><Detail label="Hành động" value={row.tenHanhDong} /><Detail label="Đối tượng" value={row.maDoiTuong ?? 'Không có'} /><Detail label="Kết quả" value={row.ketQua === 'THANH_CONG' ? 'Thành công' : 'Thất bại'} /><Detail label="Lý do thất bại" value={failureReason(row.lyDo)} /><p className="text-xs text-muted-foreground sm:col-span-2">Dữ liệu trước và sau được ẩn do chưa xác định quyền xem dữ liệu nghiệp vụ tương ứng.</p></dl>}
  </DialogContent></Dialog>
}
function Detail({ label, value }: { label: string; value: string }) { return <div className="space-y-1"><dt className="text-muted-foreground">{label}</dt><dd className="break-words font-medium">{value}</dd></div> }
