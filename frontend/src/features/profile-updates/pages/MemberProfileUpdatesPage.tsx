import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarClock, CalendarDays, Check, CircleAlert, Clock3, Eye, ListFilter, MoreHorizontal, Pencil, Play, Plus, RefreshCw, Search, ShieldCheck, Square, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { profileUpdatesApi } from '../api/profile-updates.api'
import type { DotCapNhatHoSo, YeuCauCapNhatHoSo } from '../types/profile-updates.types'
import { useAuth } from '@/core/auth/auth-context'
import { normalizeApiError } from '@/core/api/client'
import { PageHeader } from '@/shared/components/PageHeader'
import { OrganizationUnitPicker, type OrganizationUnitChoice } from '@/shared/components/OrganizationUnitPicker'
import { StatisticCard } from '@/shared/components/StatisticCard'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import { Label } from '@/shared/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/shared/components/ui/sheet'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/shared/components/ui/alert-dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/components/ui/dropdown-menu'
import { Table, TableActionCell, TableActionHead, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { RichTextEditor } from '@/shared/components/RichTextEditor'
import { RichTextContent } from '@/shared/components/RichTextContent'
import { DateRangePicker, DateTimeRangePicker } from '@/shared/components/date-time'
import { hasRichTextContent, sanitizeRichTextHtml } from '@/shared/lib/rich-text'

type FieldChoice = readonly [string, string]
const fieldGroups: { label: string; fields: FieldChoice[] }[] = [
  { label: 'Thông tin Đảng viên', fields: [['hoVaTen', 'Họ và tên'], ['khoaDangVien', 'Khóa Đảng viên']] },
  { label: 'Thông tin cá nhân', fields: [['thongTinCaNhan.ngaySinh', 'Ngày sinh'], ['thongTinCaNhan.gioiTinh', 'Giới tính'], ['thongTinCaNhan.soCccd', 'Số căn cước công dân'], ['thongTinCaNhan.ngayCapCccd', 'Ngày cấp căn cước công dân'], ['thongTinCaNhan.noiCapCccd', 'Nơi cấp căn cước công dân'], ['thongTinCaNhan.quocTich', 'Quốc tịch'], ['thongTinCaNhan.danToc', 'Dân tộc'], ['thongTinCaNhan.tonGiao', 'Tôn giáo'], ['thongTinCaNhan.soDienThoai', 'Số điện thoại'], ['thongTinCaNhan.emailLienHe', 'Thư điện tử']] },
  { label: 'Địa chỉ', fields: [['diaChi.NOI_SINH', 'Nơi sinh'], ['diaChi.QUE_QUAN', 'Quê quán'], ['diaChi.THUONG_TRU', 'Địa chỉ thường trú']] },
  { label: 'Ảnh đại diện', fields: [['anhDaiDien', 'Ảnh đại diện']] },
]
const allFields = fieldGroups.flatMap((group) => group.fields)
const fieldLabels = Object.fromEntries(allFields)
type FilterState = 'ALL' | 'BAN_NHAP' | 'DANG_MO' | 'CHUA_BAT_DAU' | 'DA_KET_THUC'
const statusText: Record<FilterState, string> = { ALL: 'Tất cả', BAN_NHAP: 'Bản nháp', DANG_MO: 'Đang mở', CHUA_BAT_DAU: 'Sắp diễn ra', DA_KET_THUC: 'Đã kết thúc' }
const statusVariant: Record<Exclude<FilterState, 'ALL'>, 'default' | 'secondary' | 'outline'> = { BAN_NHAP: 'secondary', DANG_MO: 'default', CHUA_BAT_DAU: 'outline', DA_KET_THUC: 'secondary' }
const pageSizes = [10, 20, 50]
const requestPageSizes = [10, 25, 50]
const dateTime = (value: string) => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value))
const stateOf = (item: DotCapNhatHoSo, now = Date.now()): Exclude<FilterState, 'ALL'> => {
  if (item.trangThai) return item.trangThai
  if (item.trangThaiQuanLy === 'BAN_NHAP') return 'BAN_NHAP'
  if (item.trangThaiQuanLy === 'KET_THUC_SOM') return 'DA_KET_THUC'
  if (new Date(item.ngayBatDau).getTime() > now) return 'CHUA_BAT_DAU'
  if (new Date(item.ngayKetThuc).getTime() < now) return 'DA_KET_THUC'
  return 'DANG_MO'
}

function StatusBadge({ item }: { item: DotCapNhatHoSo }) {
  const status = item.trangThai ?? stateOf(item)
  return <Badge variant={statusVariant[status]}>{statusText[status]}</Badge>
}

function StatButton({ label, value, icon, active, onClick, disabled = false }: { label: string; value: number | string; icon: React.ReactNode; active: boolean; onClick: () => void; disabled?: boolean }) {
  return <button type="button" aria-pressed={active} onClick={onClick} disabled={disabled} className={`rounded-lg text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60 ${active ? 'ring-2 ring-primary' : 'hover:ring-1 hover:ring-border'}`}><StatisticCard label={label} value={value} icon={icon}/></button>
}

const toDateTimeLocal = (value?: string | null) => {
  if (!value) return ''
  const date = new Date(value)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

function CreateWindowSheet({ open, onOpenChange, canOpen, initialItem, onSaved }: { open: boolean; onOpenChange: (open: boolean) => void; canOpen: boolean; initialItem?: DotCapNhatHoSo | null; onSaved: () => void }) {
  const unitsQuery = useQuery({ queryKey: ['update-window-units'], queryFn: profileUpdatesApi.updateUnits, enabled: open && canOpen, retry: false })
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [unitId, setUnitId] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [confirmMode, setConfirmMode] = useState<'draft' | 'activate' | null>(null)
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)
  const queryClient = useQueryClient()
  const canOpenWholeScope = unitsQuery.data?.coTheMoToanPhamVi ?? false
  const canEditConfiguration = !initialItem || initialItem.trangThai === 'BAN_NHAP' || (initialItem.trangThai === 'CHUA_BAT_DAU' && initialItem.soYeuCau === 0)
  const isReadOnlyWindow = initialItem?.trangThai === 'DANG_MO' || initialItem?.trangThai === 'DA_KET_THUC'
  const units: OrganizationUnitChoice[] = (unitsQuery.data?.donVi ?? []).map((unit) => ({ value: unit.ma, label: unit.ten ?? unit.maDinhDanh ?? 'Đơn vị chưa có tên', keywords: unit.maDinhDanh ?? '' }))
  useEffect(() => {
    if (!open) return
    setName(initialItem?.ten ?? '')
    setDescription(initialItem?.moTa ?? '')
    setUnitId(initialItem?.maDonVi ?? '')
    setStart(toDateTimeLocal(initialItem?.ngayBatDau))
    setEnd(toDateTimeLocal(initialItem?.ngayKetThuc))
    setSelected(initialItem?.cacTruongDuocPhep ?? [])
    setConfirmMode(null)
    setResetConfirmOpen(false)
  // Reset the shared form when a different campaign is opened.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialItem])
  const create = useMutation({
    mutationFn: (mode: 'draft' | 'activate') => {
      const body = { ten: name.trim(), moTa: description.trim() || null, maDonVi: unitId || null, ngayBatDau: new Date(start).toISOString(), ngayKetThuc: new Date(end).toISOString(), cacTruongDuocPhep: selected }
      if (initialItem) return profileUpdatesApi.updateUpdateWindow(initialItem.ma, body)
      return mode === 'activate' ? profileUpdatesApi.createAndActivateUpdateWindow(body) : profileUpdatesApi.createUpdateWindow(body)
    },
    onSuccess: async (_result, mode) => {
      await queryClient.invalidateQueries({ queryKey: ['update-windows'] })
      setConfirmMode(null)
      onOpenChange(false)
      toast.success(initialItem ? 'Đợt cập nhật đã được lưu.' : mode === 'activate' ? 'Đợt cập nhật đã được tạo và kích hoạt.' : 'Đợt đã được lưu ở trạng thái Bản nháp.')
      onSaved()
    },
    onError: (error) => {
      const apiError = normalizeApiError(error)
      if (apiError.code === 'KHONG_DU_QUYEN') {
        toast.error(unitId ? 'Bạn không có quyền mở đợt cho Chi bộ đã chọn. Hãy chọn Chi bộ khác trong phạm vi được giao.' : 'Bạn chưa được cấp phạm vi toàn hệ thống. Hãy chọn một Chi bộ trong phạm vi được giao.')
      } else {
        toast.error(apiError.message || 'Không thể tạo đợt cập nhật. Vui lòng kiểm tra thời gian và các trường đã chọn.')
      }
    },
  })
  const validDates = Boolean(start && end && Number.isFinite(new Date(start).getTime()) && Number.isFinite(new Date(end).getTime()) && new Date(end) > new Date(start))
  const validActivationTime = validDates && new Date(end).getTime() > Date.now()
  const canSubmit = Boolean(name.trim() && validDates && selected.length && (unitId || canOpenWholeScope) && !create.isPending && !unitsQuery.isPending && !unitsQuery.isError)
  const toggle = (field: string, checked: boolean) => setSelected((current) => checked ? [...new Set([...current, field])] : current.filter((value) => value !== field))
  const resetValues = () => {
    if (initialItem) {
      setName(initialItem.ten); setDescription(initialItem.moTa ?? ''); setUnitId(initialItem.maDonVi ?? '')
      setStart(toDateTimeLocal(initialItem.ngayBatDau)); setEnd(toDateTimeLocal(initialItem.ngayKetThuc)); setSelected(initialItem.cacTruongDuocPhep)
    } else { setName(''); setDescription(''); setUnitId(''); setStart(''); setEnd(''); setSelected([]) }
    create.reset()
    setResetConfirmOpen(false)
  }

  return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent className="w-[min(96vw,620px)] gap-0 p-0 sm:max-w-[620px]">
    <SheetHeader className="border-b px-5 py-5"><SheetTitle>{initialItem ? 'Chỉnh sửa đợt cập nhật' : 'Tạo đợt cập nhật'}</SheetTitle><SheetDescription>{initialItem ? 'Điều chỉnh thông tin đợt theo trạng thái và các yêu cầu đã phát sinh.' : 'Lưu bản nháp với phạm vi, thời hạn và các trường dự kiến được phép đề nghị.'}</SheetDescription></SheetHeader>
    <SheetBody className="space-y-5 px-5 py-5">
      {unitsQuery.isError && <p role="alert" className="rounded-md border border-destructive/30 p-3 text-sm text-destructive">Không tải được danh sách đơn vị trong phạm vi của bạn.</p>}
      <div className="space-y-4"><h3 className="text-sm font-semibold">Thông tin chung</h3><div className="space-y-2"><Label htmlFor="campaign-name">Tên đợt cập nhật <span className="text-destructive">*</span></Label><Input id="campaign-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={200} required placeholder="Ví dụ: Rà soát thông tin cá nhân năm 2026"/></div>
        <div className="space-y-2"><Label htmlFor="campaign-description">Mô tả</Label><Textarea id="campaign-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} rows={3} placeholder="Thông tin thêm về đợt cập nhật"/></div>
        <div className="space-y-2"><Label>Đơn vị tổ chức {!canOpenWholeScope && <span className="text-destructive">*</span>}</Label><OrganizationUnitPicker label="Đơn vị tổ chức" options={units} value={unitId} onValueChange={setUnitId} disabled={!canEditConfiguration} allOption={canOpenWholeScope ? { value: '', label: 'Toàn hệ thống' } : undefined} placeholder={canOpenWholeScope ? 'Chọn Chi bộ hoặc toàn hệ thống' : 'Chọn Chi bộ trong phạm vi được giao'} required={!canOpenWholeScope}/><p className="text-xs text-muted-foreground">{canOpenWholeScope ? 'Bạn có thể mở đợt cho một Chi bộ hoặc toàn hệ thống.' : 'Tài khoản của bạn cần chọn một Chi bộ được giao quản lý.'}</p>{unitsQuery.isError && <p role="alert" className="text-sm text-destructive">Không tải được danh sách Chi bộ. Hãy làm mới phiên đăng nhập hoặc kiểm tra quyền và phạm vi quản lý.</p>}</div>
        <div className="space-y-2"><Label htmlFor="campaign-datetime-range">Khoảng thời gian <span className="text-destructive">*</span></Label><DateTimeRangePicker id="campaign-datetime-range" aria-label="Khoảng ngày giờ đợt cập nhật" value={{ from: start || undefined, to: end || undefined }} onChange={(range) => { setStart(range?.from ?? ''); setEnd(range?.to ?? '') }} disabled={!canEditConfiguration} required clearable={false}/></div>{start && end && !validDates && <p role="alert" className="text-sm text-destructive">Thời điểm kết thúc phải sau thời điểm bắt đầu.</p>}
      </div>
      <div className="space-y-3"><div><h3 className="text-sm font-semibold">Các trường được phép đề nghị cập nhật</h3><p className="mt-1 text-xs text-muted-foreground">Chỉ chọn được những thông tin hệ thống hỗ trợ. Quyền và phạm vi sẽ được kiểm tra khi tạo đợt.</p></div>
        <div className="space-y-4">{fieldGroups.map((group) => <fieldset key={group.label} className="space-y-2"><legend className="mb-2 text-sm font-medium">{group.label}</legend><div className="grid gap-2 sm:grid-cols-2">{group.fields.map(([field, label]) => <label key={field} className={`flex min-h-10 items-center gap-3 rounded-md border px-3 py-2 text-sm ${canEditConfiguration ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}`}><Checkbox checked={selected.includes(field)} disabled={!canEditConfiguration} onCheckedChange={(checked) => toggle(field, checked === true)} aria-label={`Cho phép đề nghị thay đổi ${label}`}/><span>{label}</span></label>)}</div></fieldset>)}</div>
        <p className="rounded-md bg-muted/60 p-3 text-xs leading-5 text-muted-foreground">Không thể mở quyền tự sửa ngày vào Đảng, ngày chính thức, trạng thái Đảng viên, Chi bộ, Tổ sinh hoạt, chức vụ, nhiệm kỳ hoặc phân quyền.</p>
      </div>
      {isReadOnlyWindow && <p className="rounded-md bg-muted/60 p-3 text-sm text-muted-foreground">Đợt đang mở: chỉ có thể đổi tên và mô tả; phạm vi, thời hạn và danh sách trường được giữ nguyên.</p>}
      {initialItem?.trangThai === 'CHUA_BAT_DAU' && !canEditConfiguration && <p className="rounded-md bg-muted/60 p-3 text-sm text-muted-foreground">Đợt đã có yêu cầu gửi: không thể đổi phạm vi, thời hạn hoặc danh sách trường.</p>}
      <Card className="gap-0 py-0"><CardContent className="space-y-2 p-4"><h3 className="text-sm font-semibold">Tóm tắt đợt</h3><p className="text-sm">{name.trim() || 'Chưa nhập tên đợt'}</p><p className="text-sm text-muted-foreground">{unitId ? units.find((item) => item.value === unitId)?.label : canOpenWholeScope ? 'Toàn hệ thống' : 'Chưa chọn Chi bộ'}</p><p className="text-sm text-muted-foreground">{start && end && validDates ? `${dateTime(new Date(start).toISOString())} – ${dateTime(new Date(end).toISOString())}` : 'Chưa xác định thời gian'}</p><p className="text-sm text-muted-foreground">{selected.length} trường được mở</p></CardContent></Card>
    </SheetBody>
    <SheetFooter className="border-t px-4 py-3 sm:px-5 sm:py-4">
      <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-end">
        <Button variant="outline" className="min-h-11 whitespace-normal leading-tight sm:mr-auto" disabled={create.isPending} onClick={() => setResetConfirmOpen(true)}>Đặt lại biểu mẫu</Button>
        <Button variant="outline" className="min-h-11 whitespace-normal leading-tight" disabled={create.isPending} onClick={() => onOpenChange(false)}>Hủy</Button>
        {initialItem ? <Button className="col-span-2 min-h-11 whitespace-normal leading-tight sm:col-span-1" disabled={!canSubmit} onClick={() => create.mutate('draft')}><Pencil/>{create.isPending ? 'Đang lưu…' : 'Lưu thay đổi'}</Button> : <>
          <Button variant="outline" className="min-h-11 whitespace-normal leading-tight" disabled={!canSubmit} onClick={() => setConfirmMode('draft')}><Plus/>Lưu bản nháp</Button>
          <Button className="min-h-11 whitespace-normal leading-tight" disabled={!canSubmit || !validActivationTime} onClick={() => setConfirmMode('activate')}><Play/>Lưu và kích hoạt</Button>
        </>}
      </div>
      {!initialItem && validDates && !validActivationTime && <p className="w-full text-xs text-destructive sm:text-right">Không thể kích hoạt đợt đã hết thời gian. Hãy chọn thời điểm kết thúc trong tương lai.</p>}
    </SheetFooter>
    {!initialItem && <AlertDialog open={Boolean(confirmMode)} onOpenChange={(isOpen) => { if (!isOpen && !create.isPending) setConfirmMode(null) }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{confirmMode === 'activate' ? 'Xác nhận lưu và kích hoạt' : 'Xác nhận lưu bản nháp'}</AlertDialogTitle><AlertDialogDescription>{confirmMode === 'activate' ? <>Hệ thống sẽ kiểm tra quyền, phạm vi, thời hạn và đợt bị trùng rồi tạo và kích hoạt <strong>{name.trim()}</strong> trong cùng một giao dịch. Nếu có lỗi, đợt sẽ không được lưu.</> : <>Đợt <strong>{name.trim()}</strong> sẽ được lưu ở trạng thái Bản nháp, chưa tiếp nhận yêu cầu. Bạn có thể chỉnh sửa hoặc kích hoạt sau.</>}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={create.isPending}>Quay lại biểu mẫu</AlertDialogCancel><Button type="button" disabled={create.isPending} onClick={() => { if (confirmMode) create.mutate(confirmMode) }}>{create.isPending ? 'Đang xử lý…' : confirmMode === 'activate' ? 'Lưu và kích hoạt' : 'Lưu bản nháp'}</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>}
    <AlertDialog open={resetConfirmOpen} onOpenChange={(isOpen) => { if (!create.isPending) setResetConfirmOpen(isOpen) }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Đặt lại biểu mẫu?</AlertDialogTitle><AlertDialogDescription>Các giá trị bạn đang nhập sẽ bị xóa và khôi phục theo dữ liệu ban đầu.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={create.isPending}>Tiếp tục nhập</AlertDialogCancel><AlertDialogAction disabled={create.isPending} onClick={(event) => { event.preventDefault(); resetValues() }}>Đặt lại biểu mẫu</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </SheetContent></Sheet>
}

function CampaignDetails({ item, open, onOpenChange, canViewRequests, onViewRequests }: { item: DotCapNhatHoSo | null; open: boolean; onOpenChange: (open: boolean) => void; canViewRequests: boolean; onViewRequests: (campaignId: string, status: RequestFilter) => void }) {
  const stats = useQuery({ queryKey: ['update-window-stats', item?.ma], queryFn: () => profileUpdatesApi.updateWindowStats(item!.ma), enabled: open && Boolean(item) && canViewRequests, retry: false })
  if (!item) return null
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="grid max-h-[90dvh] max-w-[min(94vw,900px)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-[min(94vw,900px)]">
    <DialogHeader className="border-b px-5 py-5 text-left sm:px-6"><DialogTitle>Chi tiết đợt cập nhật</DialogTitle><DialogDescription>Thông tin đợt và các trường được mở trong phạm vi quản lý.</DialogDescription></DialogHeader>
    <div className="min-h-0 space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
      <section className="space-y-3"><h3 className="text-sm font-semibold">Thông tin đợt</h3><dl className="grid gap-x-6 gap-y-4 rounded-lg border p-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">Tên đợt cập nhật</dt><dd className="mt-1 font-medium">{item.ten}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Đơn vị tổ chức</dt><dd className="mt-1">{item.tenDonVi ?? 'Toàn hệ thống'}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Trạng thái hiện tại</dt><dd className="mt-1"><StatusBadge item={item}/></dd></div>
        <div><dt className="text-xs text-muted-foreground">Thời gian bắt đầu</dt><dd className="mt-1">{dateTime(item.ngayBatDau)}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Thời gian kết thúc</dt><dd className="mt-1">{dateTime(item.ngayKetThuc)}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Phạm vi áp dụng</dt><dd className="mt-1">{item.tenDonVi ?? 'Toàn hệ thống'}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Người tạo</dt><dd className="mt-1">{item.nguoiTao}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Thời gian tạo</dt><dd className="mt-1">{dateTime(item.ngayTao)}</dd></div>
        {item.moTa && <div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">Mô tả</dt><dd className="mt-1 whitespace-pre-wrap">{item.moTa}</dd></div>}
        {item.thoiDiemKichHoat && <div><dt className="text-xs text-muted-foreground">Người kích hoạt</dt><dd className="mt-1">{item.nguoiKichHoat ?? 'Không xác định'} · {dateTime(item.thoiDiemKichHoat)}</dd></div>}
        {item.thoiDiemKetThucSom && <div><dt className="text-xs text-muted-foreground">Kết thúc sớm</dt><dd className="mt-1">{item.nguoiKetThucSom ?? 'Không xác định'} · {dateTime(item.thoiDiemKetThucSom)}</dd></div>}
      </dl></section>
      <section className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">Thống kê yêu cầu</h3><Button variant="outline" size="sm" disabled={!canViewRequests} onClick={() => onViewRequests(item.ma, 'ALL')}>Xem các yêu cầu</Button></div>
        {!canViewRequests ? <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Bạn chưa được cấp quyền xem danh sách yêu cầu trong phạm vi này.</p> : stats.isPending ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{['Tổng yêu cầu', 'Chờ xử lý', 'Đã phê duyệt', 'Đã từ chối'].map((label) => <Card key={label}><CardContent className="p-4"><p className="text-sm text-muted-foreground">{label}</p><div className="mt-3 h-7 w-12 animate-pulse rounded bg-muted"/></CardContent></Card>)}</div> : stats.isError ? <p className="rounded-md border border-destructive/30 p-4 text-sm text-destructive" role="alert">Không tải được số liệu yêu cầu trong phạm vi được giao.</p> : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatButton label="Tổng yêu cầu" value={stats.data.tongYeuCau} icon={<ShieldCheck/>} active={false} onClick={() => onViewRequests(item.ma, 'ALL')}/>
          <StatButton label="Chờ xử lý" value={stats.data.choXuLy} icon={<Clock3/>} active={false} onClick={() => onViewRequests(item.ma, 'CHO_DUYET')}/>
          <StatButton label="Đã phê duyệt" value={stats.data.daPheDuyet} icon={<Check/>} active={false} onClick={() => onViewRequests(item.ma, 'DA_DUYET')}/>
          <StatButton label="Đã từ chối" value={stats.data.daTuChoi} icon={<X/>} active={false} onClick={() => onViewRequests(item.ma, 'DA_TU_CHOI')}/>
        </div>}
      </section>
      <section className="space-y-3"><h3 className="text-sm font-semibold">Các trường được phép đề nghị cập nhật ({item.cacTruongDuocPhep.length})</h3>
        {item.cacTruongDuocPhep.length ? <div className="space-y-4">{fieldGroups.map((group) => {
          const fields = group.fields.filter(([field]) => item.cacTruongDuocPhep.includes(field))
          if (!fields.length) return null
          return <div key={group.label} className="space-y-2"><h4 className="text-sm text-muted-foreground">{group.label}</h4><ul className="grid gap-2 sm:grid-cols-2">{fields.map(([field, label]) => <li key={field} className="rounded-md border px-3 py-2 text-sm">{label}</li>)}</ul></div>
        })}</div> : <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Đợt này chưa mở trường thông tin nào.</p>}
      </section>
    </div>
    <div className="flex justify-end border-t px-5 py-4 sm:px-6"><Button variant="outline" onClick={() => onOpenChange(false)}>Đóng</Button></div>
  </DialogContent></Dialog>
}

const requestStatus: Record<string, string> = { CHO_DUYET: 'Chờ phê duyệt', DA_DUYET: 'Đã phê duyệt', DA_TU_CHOI: 'Đã từ chối', DA_HUY: 'Đã hủy' }
type RequestFilter = 'ALL' | YeuCauCapNhatHoSo['trangThai']
const requestStatusVariant: Record<YeuCauCapNhatHoSo['trangThai'], 'outline' | 'default' | 'secondary' | 'destructive'> = { CHO_DUYET: 'outline', DA_DUYET: 'default', DA_TU_CHOI: 'destructive', DA_HUY: 'secondary' }
const requestFilterText: Record<RequestFilter, string> = { ALL: 'Tất cả trạng thái', CHO_DUYET: 'Chờ xử lý', DA_DUYET: 'Đã phê duyệt', DA_TU_CHOI: 'Đã từ chối', DA_HUY: 'Đã hủy' }
const formatRequestValue = (value: unknown) => {
  if (value == null || value === '') return 'Chưa cập nhật'
  if (typeof value === 'object') return Object.values(value).filter((item) => typeof item === 'string' && item).join(', ') || 'Chưa cập nhật'
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) return dateTime(value)
  return String(value)
}

type ReviewFilterJump = { campaign: string; status: RequestFilter; revision: number } | null

function ReviewQueue({ filterJump }: { filterJump: ReviewFilterJump }) {
  const permissions = useAuth().taiKhoan?.quyenDangHoatDong ?? []
  const canList = permissions.includes('HO_SO_CA_NHAN_XEM_YEU_CAU_CAP_NHAT')
  const canDecide = permissions.includes('HO_SO_CA_NHAN_DUYET_CAP_NHAT')
  const client = useQueryClient()
  const [status, setStatus] = useState<RequestFilter>(filterJump?.status ?? 'CHO_DUYET')
  const [search, setSearch] = useState('')
  const [unit, setUnit] = useState('')
  const [campaign, setCampaign] = useState(filterJump?.campaign ?? '')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [selected, setSelected] = useState<YeuCauCapNhatHoSo | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [approveTarget, setApproveTarget] = useState<YeuCauCapNhatHoSo | null>(null)
  const [rejectTarget, setRejectTarget] = useState<YeuCauCapNhatHoSo | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [search])
  const queryParams = { maDotCapNhat: campaign || undefined, maDonViDuyet: unit || undefined, trangThai: status === 'ALL' ? undefined : status, tuKhoa: debouncedSearch || undefined, tuNgay: from || undefined, denNgay: to || undefined, trang: page, gioiHan: pageSize }
  const query = useQuery({ queryKey: ['profile-update-review-queue', queryParams], queryFn: () => profileUpdatesApi.reviewRequests(queryParams), enabled: canList || canDecide, retry: false })
  useEffect(() => {
    if (!filterJump) return
    setCampaign(filterJump.campaign)
    setStatus(filterJump.status)
    setSearch('')
    setUnit('')
    setFrom('')
    setTo('')
    setPage(1)
  }, [filterJump?.revision])
  const rows = query.data?.duLieu ?? []
  const stats = query.data?.thongKe ?? { tongYeuCau: 0, choXuLy: 0, daPheDuyet: 0, daTuChoi: 0, daHuy: 0 }
  const queueError = query.isError ? normalizeApiError(query.error) : null
  const units: OrganizationUnitChoice[] = (query.data?.boLoc.donVi ?? []).map((item) => ({ value: item.ma, label: item.ten, keywords: item.ma }))
  const campaigns = (query.data?.boLoc.dotCapNhat ?? []).map((item) => [item.ma, item.ten] as const)
  const total = query.data?.phanTrang.tongSo ?? 0
  const pages = Math.max(1, query.data?.phanTrang.tongTrang ?? 0)
  const visible = rows
  useEffect(() => { if (query.data && page > pages) setPage(pages) }, [page, pages, query.data])
  const resetFilters = () => { setSearch(''); setUnit(''); setCampaign(''); setStatus('CHO_DUYET'); setFrom(''); setTo(''); setPage(1) }
  const selectStatus = (next: RequestFilter) => { setStatus(next); setPage(1) }
  const approve = useMutation({ mutationFn: (id: string) => profileUpdatesApi.approveUpdateRequest(id), onSuccess: async () => { setApproveTarget(null); setDetailOpen(false); await client.invalidateQueries({ queryKey: ['profile-update-review-queue'] }); toast.success('Yêu cầu đã được phê duyệt.') }, onError: (error) => toast.error(normalizeApiError(error).message || 'Không thể phê duyệt yêu cầu trong phạm vi hiện tại.') })
  const reject = useMutation({ mutationFn: ({ id, reason }: { id: string; reason: string }) => profileUpdatesApi.rejectUpdateRequest(id, reason), onSuccess: async () => { setRejectTarget(null); setDetailOpen(false); setRejectReason(''); await client.invalidateQueries({ queryKey: ['profile-update-review-queue'] }); toast.success('Yêu cầu đã bị từ chối.') }, onError: (error) => toast.error(normalizeApiError(error).message || 'Không thể từ chối yêu cầu trong phạm vi hiện tại.') })
  const openDetails = (item: YeuCauCapNhatHoSo) => { setSelected(item); setDetailOpen(true) }
  const startReject = (item: YeuCauCapNhatHoSo) => { setRejectTarget(item); setRejectReason('') }
  const isPending = (item: YeuCauCapNhatHoSo) => item.trangThai === 'CHO_DUYET'
  const openCampaign = (item: YeuCauCapNhatHoSo) => campaigns.find(([id]) => id === item.maDotCapNhat)?.[1] ?? item.maDotCapNhat
  const fieldCount = (item: YeuCauCapNhatHoSo) => Object.keys(item.giaTriDeNghi ?? {}).length + Number(item.coAnhDaiDienDuocDeNghi)
  if (!canList && !canDecide) return null
  return <div className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatButton label="Tổng yêu cầu" value={query.isError ? '—' : query.isPending ? '…' : stats.tongYeuCau} icon={<ShieldCheck/>} active={status === 'ALL'} onClick={() => selectStatus('ALL')} disabled={query.isError || query.isPending}/>
      <StatButton label="Chờ xử lý" value={query.isError ? '—' : query.isPending ? '…' : stats.choXuLy} icon={<Clock3/>} active={status === 'CHO_DUYET'} onClick={() => selectStatus('CHO_DUYET')} disabled={query.isError || query.isPending}/>
      <StatButton label="Đã phê duyệt" value={query.isError ? '—' : query.isPending ? '…' : stats.daPheDuyet} icon={<Check/>} active={status === 'DA_DUYET'} onClick={() => selectStatus('DA_DUYET')} disabled={query.isError || query.isPending}/>
      <StatButton label="Đã từ chối" value={query.isError ? '—' : query.isPending ? '…' : stats.daTuChoi} icon={<X/>} active={status === 'DA_TU_CHOI'} onClick={() => selectStatus('DA_TU_CHOI')} disabled={query.isError || query.isPending}/>
    </div>
    <Card className="gap-0 py-0"><CardContent className="space-y-4 p-4 md:p-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(15rem,1.5fr)_minmax(12rem,1fr)_minmax(12rem,1fr)_minmax(10rem,.8fr)_minmax(10rem,.8fr)_auto] xl:items-end">
        <div className="min-w-0 space-y-2"><Label htmlFor="request-search">Tìm theo họ tên hoặc mã hồ sơ</Label><div className="relative"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground"/><Input id="request-search" className="pl-9" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Nhập họ tên hoặc mã hồ sơ…"/></div></div>
        <div className="min-w-0 space-y-2"><Label>Chi bộ</Label><OrganizationUnitPicker label="Lọc theo Chi bộ" options={units} value={unit} onValueChange={(value) => { setUnit(value); setPage(1) }} allOption={{ value: '', label: 'Tất cả Chi bộ' }} placeholder="Tất cả Chi bộ"/></div>
        <div className="min-w-0 space-y-2"><Label htmlFor="request-campaign">Đợt cập nhật</Label><Select value={campaign || 'ALL'} onValueChange={(value) => { setCampaign(value === 'ALL' ? '' : value); setPage(1) }}><SelectTrigger id="request-campaign"><SelectValue placeholder="Tất cả đợt"/></SelectTrigger><SelectContent><SelectItem value="ALL">Tất cả đợt</SelectItem>{campaigns.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}</SelectContent></Select></div>
        <div className="min-w-0 space-y-2"><Label htmlFor="request-status">Trạng thái</Label><Select value={status} onValueChange={(value) => selectStatus(value as RequestFilter)}><SelectTrigger id="request-status"><SelectValue/></SelectTrigger><SelectContent>{Object.entries(requestFilterText).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
        <div className="min-w-0 space-y-2"><Label htmlFor="request-range">Khoảng ngày gửi</Label><DateRangePicker id="request-range" aria-label="Lọc yêu cầu theo khoảng ngày gửi" value={{ from: from || undefined, to: to || undefined }} onChange={(range) => { setFrom(range?.from ?? ""); setTo(range?.to ?? ""); setPage(1) }}/></div>
        <Button variant="outline" className="min-h-10" onClick={resetFilters}><ListFilter/>Đặt lại bộ lọc</Button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground"><span>{total} yêu cầu phù hợp · {requestFilterText[status]}</span><span>Danh sách và số liệu được tính trên toàn bộ yêu cầu trong phạm vi được giao.</span></div>
    </CardContent></Card>
    <Card className="min-w-0 gap-0 py-0"><CardContent className="space-y-4 p-0"><div className="overflow-x-auto rounded-lg"><Table className="min-w-[1100px]"><TableHeader><TableRow><TableHead className="w-14">STT</TableHead><TableHead className="min-w-52">Họ và tên</TableHead><TableHead className="min-w-40">Chi bộ</TableHead><TableHead className="min-w-52">Đợt cập nhật</TableHead><TableHead className="min-w-40">Thời gian gửi</TableHead><TableHead className="w-32 text-center">Số trường thay đổi</TableHead><TableHead className="w-32">Trạng thái</TableHead><TableActionHead className="w-20 text-center">Thao tác</TableActionHead></TableRow></TableHeader>
        <TableBody>{query.isPending ? <TableRow><TableCell colSpan={8} className="h-32 text-center text-muted-foreground">Đang tải yêu cầu…</TableCell></TableRow> : query.isError ? <TableRow><TableCell colSpan={8} className="h-40 text-center"><div role="alert" className="mx-auto flex max-w-2xl flex-col items-center gap-2 px-4 text-sm"><CircleAlert className="size-5 text-destructive"/><p className="font-medium text-destructive">{queueError?.message || 'Không thể tải danh sách yêu cầu.'}</p>{queueError?.status === 403 && <p className="text-muted-foreground">Vai trò đang chọn cần quyền xem hoặc duyệt yêu cầu và phạm vi phải bao gồm Chi bộ nhận yêu cầu.</p>}{(queueError?.status || queueError?.code || queueError?.correlationId) && <p className="text-xs text-muted-foreground">{[queueError.status ? `Mã HTTP ${queueError.status}` : null, queueError.code ? `Mã lỗi ${queueError.code}` : null, queueError.correlationId ? `Mã tra cứu ${queueError.correlationId}` : null].filter(Boolean).join(' · ')}</p>}<Button variant="outline" size="sm" onClick={() => void query.refetch()}>Thử tải lại</Button></div></TableCell></TableRow> : visible.length === 0 ? <TableRow><TableCell colSpan={8} className="h-36 text-center"><div className="mx-auto flex max-w-sm flex-col items-center gap-2 text-muted-foreground"><CircleAlert className="size-6"/><span>{total ? 'Không có yêu cầu nào phù hợp với bộ lọc.' : 'Chưa có yêu cầu cập nhật trong phạm vi được giao.'}</span>{(search || unit || campaign || status !== 'CHO_DUYET' || from || to) && <Button variant="link" onClick={resetFilters}>Đặt lại bộ lọc</Button>}</div></TableCell></TableRow> : visible.map((item, index) => <TableRow key={item.ma}><TableCell>{(page - 1) * pageSize + index + 1}</TableCell><TableCell className="whitespace-normal font-medium">{item.hoSo?.hoVaTen ?? 'Hồ sơ Đảng viên'}<span className="mt-1 block text-xs font-normal text-muted-foreground">{item.hoSo?.maHoSoNoiBo ?? 'Chưa có mã hồ sơ'}</span></TableCell><TableCell className="whitespace-normal">{item.tenChiBo}</TableCell><TableCell className="whitespace-normal">{item.tenDotCapNhat ?? item.maDotCapNhat}</TableCell><TableCell>{dateTime(item.ngayTao)}</TableCell><TableCell className="text-center"><Badge variant="outline">{fieldCount(item)}</Badge></TableCell><TableCell><Badge variant={requestStatusVariant[item.trangThai]}>{requestStatus[item.trangThai]}</Badge></TableCell><TableActionCell className="text-center"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`Thao tác yêu cầu của ${item.hoSo?.hoVaTen ?? item.ma}`}><MoreHorizontal/></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => openDetails(item)}><Eye/>Xem chi tiết</DropdownMenuItem>{canDecide && isPending(item) && <><DropdownMenuItem onSelect={() => setApproveTarget(item)}><Check/>Phê duyệt</DropdownMenuItem><DropdownMenuItem onSelect={() => startReject(item)} className="text-destructive focus:text-destructive"><X/>Từ chối</DropdownMenuItem></>}</DropdownMenuContent></DropdownMenu></TableActionCell></TableRow>)}</TableBody>
      </Table></div>
      {total > 0 && <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-muted-foreground">Đang xem {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} trong {total} yêu cầu</p><div className="flex flex-wrap items-center gap-2"><Label htmlFor="request-page-size" className="text-sm text-muted-foreground">Số dòng</Label><Select value={String(pageSize)} onValueChange={(value) => { setPageSize(Number(value)); setPage(1) }}><SelectTrigger id="request-page-size" className="w-20"><SelectValue/></SelectTrigger><SelectContent>{requestPageSizes.map((size) => <SelectItem key={size} value={String(size)}>{size}</SelectItem>)}</SelectContent></Select><Button variant="outline" size="sm" disabled={page <= 1 || query.isFetching} onClick={() => setPage((current) => Math.max(1, current - 1))}>Trước</Button><span className="min-w-20 text-center text-sm">Trang {page}/{pages}</span><Button variant="outline" size="sm" disabled={page >= pages || query.isFetching} onClick={() => setPage((current) => Math.min(pages, current + 1))}>Sau</Button></div></div>}
    </CardContent></Card>

    <Dialog open={detailOpen} onOpenChange={setDetailOpen}><DialogContent className="grid max-h-[90dvh] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden p-0 sm:max-w-5xl"><DialogHeader className="border-b px-5 py-4 text-left"><DialogTitle>Chi tiết yêu cầu cập nhật</DialogTitle><DialogDescription>Đối chiếu thông tin hiện tại với nội dung được đề nghị.</DialogDescription></DialogHeader>{selected && <div className="min-h-0 space-y-5 overflow-y-auto px-5 py-4"><dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3"><div><dt className="text-xs text-muted-foreground">Họ và tên</dt><dd className="mt-1 font-medium">{selected.hoSo?.hoVaTen ?? 'Hồ sơ Đảng viên'}</dd></div><div><dt className="text-xs text-muted-foreground">Mã hồ sơ</dt><dd className="mt-1">{selected.hoSo?.maHoSoNoiBo ?? 'Chưa cập nhật'}</dd></div><div><dt className="text-xs text-muted-foreground">Chi bộ</dt><dd className="mt-1">{selected.tenChiBo}</dd></div><div><dt className="text-xs text-muted-foreground">Đợt cập nhật</dt><dd className="mt-1">{openCampaign(selected)}</dd></div><div><dt className="text-xs text-muted-foreground">Thời gian gửi</dt><dd className="mt-1">{dateTime(selected.ngayTao)}</dd></div><div><dt className="text-xs text-muted-foreground">Trạng thái</dt><dd className="mt-1"><Badge variant={requestStatusVariant[selected.trangThai]}>{requestStatus[selected.trangThai]}</Badge></dd></div></dl>
      <section className="space-y-2"><h3 className="font-semibold">Nội dung thay đổi</h3><div className="overflow-x-auto rounded-md border"><Table className="min-w-[720px]"><TableHeader><TableRow><TableHead className="w-14">STT</TableHead><TableHead>Trường thông tin</TableHead><TableHead>Giá trị hiện tại</TableHead><TableHead>Giá trị đề nghị</TableHead></TableRow></TableHeader><TableBody>{[...new Set([...Object.keys(selected.giaTriTruoc ?? {}), ...Object.keys(selected.giaTriDeNghi ?? {})])].map((key, index) => <TableRow key={key}><TableCell>{index + 1}</TableCell><TableCell>{fieldLabels[key] ?? key}</TableCell><TableCell className="max-w-72 whitespace-normal break-words">{formatRequestValue(selected.giaTriTruoc[key])}</TableCell><TableCell className="max-w-72 whitespace-normal break-words">{formatRequestValue(selected.giaTriDeNghi[key])}</TableCell></TableRow>)}{selected.coAnhDaiDienDuocDeNghi && <TableRow><TableCell colSpan={2}>Ảnh đại diện</TableCell><TableCell>Ảnh hiện tại</TableCell><TableCell>Ảnh mới được đính kèm</TableCell></TableRow>}</TableBody></Table></div></section>
      <section className="grid gap-3 sm:grid-cols-2"><div className="rounded-md bg-muted/50 p-3 text-sm"><p className="font-medium">Người gửi</p><p className="mt-1 text-muted-foreground">{selected.nguoiGui ?? 'Đảng viên'}</p></div><div className="rounded-md bg-muted/50 p-3 text-sm"><p className="font-medium">Người xử lý</p><p className="mt-1 text-muted-foreground">{selected.tenNguoiXuLy ?? 'Chưa xử lý'}</p></div><div className="rounded-md bg-muted/50 p-3 text-sm"><p className="font-medium">Thời gian xử lý</p><p className="mt-1 text-muted-foreground">{selected.thoiDiemXuLy ? dateTime(selected.thoiDiemXuLy) : 'Chưa xử lý'}</p></div>{selected.lyDoXuLy && <div className="rounded-md bg-muted/50 p-3 text-sm sm:col-span-2"><p className="font-medium">Lý do xử lý</p><RichTextContent html={selected.lyDoXuLy} className="mt-1 text-muted-foreground"/></div>}</section>
      </div>}<div className="flex flex-col-reverse gap-2 border-t px-5 py-3 sm:flex-row sm:justify-end"><Button variant="outline" onClick={() => setDetailOpen(false)}>Đóng</Button>{canDecide && selected && isPending(selected) && <><Button variant="destructive" onClick={() => startReject(selected)}><X/>Từ chối</Button><Button onClick={() => setApproveTarget(selected)}><Check/>Phê duyệt</Button></>}</div></DialogContent></Dialog>
    <AlertDialog open={Boolean(approveTarget)} onOpenChange={(open) => { if (!open) setApproveTarget(null) }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Xác nhận phê duyệt</AlertDialogTitle><AlertDialogDescription>Phê duyệt sẽ cập nhật {approveTarget ? fieldCount(approveTarget) : 0} trường vào hồ sơ chính thức. Thao tác này chỉ hoàn tất khi hệ thống xác nhận.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={approve.isPending}>Hủy</AlertDialogCancel><AlertDialogAction disabled={approve.isPending} onClick={(event) => { event.preventDefault(); if (approveTarget) approve.mutate(approveTarget.ma) }}>{approve.isPending ? 'Đang phê duyệt…' : 'Xác nhận phê duyệt'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <Dialog open={Boolean(rejectTarget)} onOpenChange={(open) => { if (!open) setRejectTarget(null) }}><DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle>Từ chối yêu cầu cập nhật</DialogTitle><DialogDescription>Hồ sơ chính thức sẽ được giữ nguyên. Vui lòng ghi rõ lý do để Đảng viên biết nội dung cần điều chỉnh.</DialogDescription></DialogHeader><RichTextEditor id="request-rejection-reason" label="Lý do từ chối" value={rejectReason} onChange={setRejectReason} mode="simple" required maxLength={1000} height={190} placeholder="Nhập lý do từ chối"/><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="outline" onClick={() => setRejectTarget(null)}>Hủy</Button><Button variant="destructive" disabled={reject.isPending || !hasRichTextContent(rejectReason) || sanitizeRichTextHtml(rejectReason).length > 1000} onClick={() => rejectTarget && reject.mutate({ id: rejectTarget.ma, reason: rejectReason })}>{reject.isPending ? 'Đang từ chối…' : 'Xác nhận từ chối'}</Button></div></DialogContent></Dialog>
  </div>
}

export function MemberProfileUpdatesPage() {
  const permissions = useAuth().taiKhoan?.quyenDangHoatDong ?? []
  const canOpen = permissions.includes('HO_SO_CA_NHAN_MO_DOT_CAP_NHAT')
  const canList = permissions.includes('HO_SO_CA_NHAN_XEM_YEU_CAU_CAP_NHAT')
  const canDecide = permissions.includes('HO_SO_CA_NHAN_DUYET_CAP_NHAT')
  const client = useQueryClient()
  const [activeTab, setActiveTab] = useState(canOpen ? 'campaigns' : 'requests')
  const windows = useQuery({ queryKey: ['update-windows'], queryFn: profileUpdatesApi.updateWindows, enabled: canOpen, retry: false })
  const unitsQuery = useQuery({ queryKey: ['update-window-units'], queryFn: profileUpdatesApi.updateUnits, enabled: canOpen, retry: false })
  const [search, setSearch] = useState('')
  const [unitFilter, setUnitFilter] = useState('')
  const [status, setStatus] = useState<FilterState>('ALL')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [createOpen, setCreateOpen] = useState(false)
  const [editItem, setEditItem] = useState<DotCapNhatHoSo | null>(null)
  const [selected, setSelected] = useState<DotCapNhatHoSo | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [reviewFilterJump, setReviewFilterJump] = useState<ReviewFilterJump>(null)
  const [pendingAction, setPendingAction] = useState<{ type: 'activate' | 'finish' | 'delete'; item: DotCapNhatHoSo } | null>(null)
  const campaignAction = useMutation({
    mutationFn: ({ type, item }: { type: 'activate' | 'finish' | 'delete'; item: DotCapNhatHoSo }) => type === 'activate'
      ? profileUpdatesApi.activateUpdateWindow(item.ma)
      : type === 'finish' ? profileUpdatesApi.finishUpdateWindow(item.ma) : profileUpdatesApi.deleteUpdateWindow(item.ma),
    onSuccess: async (_result, { type, item }) => {
      setPendingAction(null)
      await Promise.all([client.invalidateQueries({ queryKey: ['update-windows'] }), client.invalidateQueries({ queryKey: ['update-window-stats', item.ma] })])
      toast.success(type === 'activate' ? 'Đợt cập nhật đã được kích hoạt.' : type === 'finish' ? 'Đợt cập nhật đã kết thúc.' : 'Bản nháp đã được xóa.')
    },
    onError: (error) => toast.error(normalizeApiError(error).message || 'Không thể thực hiện thao tác với đợt cập nhật.'),
  })
  const now = Date.now()
  const all = windows.data ?? []
  const stats = { ALL: all.length, BAN_NHAP: all.filter((item) => stateOf(item, now) === 'BAN_NHAP').length, DANG_MO: all.filter((item) => stateOf(item, now) === 'DANG_MO').length, CHUA_BAT_DAU: all.filter((item) => stateOf(item, now) === 'CHUA_BAT_DAU').length, DA_KET_THUC: all.filter((item) => stateOf(item, now) === 'DA_KET_THUC').length }
  const unitOptions: OrganizationUnitChoice[] = (unitsQuery.data?.donVi ?? []).map((unit) => ({ value: unit.ma, label: unit.ten ?? unit.maDinhDanh ?? 'Đơn vị chưa có tên', keywords: unit.maDinhDanh ?? '' }))
  const filtered = useMemo(() => {
    const query = search.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLocaleLowerCase('vi-VN').trim()
    return all.filter((item) => {
      const name = item.ten.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLocaleLowerCase('vi-VN')
      const matchesName = !query || name.includes(query)
      const matchesUnit = !unitFilter || item.maDonVi === unitFilter
      const matchesStatus = status === 'ALL' || stateOf(item, now) === status
      const start = new Date(item.ngayBatDau).getTime()
      const matchesFrom = !from || start >= new Date(`${from}T00:00:00`).getTime()
      const matchesTo = !to || start <= new Date(`${to}T23:59:59.999`).getTime()
      return matchesName && matchesUnit && matchesStatus && matchesFrom && matchesTo
    }).sort((a, b) => new Date(b.ngayBatDau).getTime() - new Date(a.ngayBatDau).getTime())
  }, [all, search, unitFilter, status, from, to, now])
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize)
  const resetFilters = () => { setSearch(''); setUnitFilter(''); setStatus('ALL'); setFrom(''); setTo(''); setPage(1) }
  const setFilter = (next: FilterState) => { setStatus(next); setPage(1) }
  const openRequestsForCampaign = (campaign: string, requestStatus: RequestFilter) => {
    setReviewFilterJump({ campaign, status: requestStatus, revision: Date.now() })
    setActiveTab('requests')
    setDetailsOpen(false)
  }
  const refresh = async () => {
    if (activeTab === 'requests') {
      await client.invalidateQueries({ queryKey: ['profile-update-review-queue'] })
      toast.success('Danh sách yêu cầu đã được làm mới.')
      return
    }
    await Promise.all([windows.refetch(), unitsQuery.refetch()])
    toast.success('Danh sách đợt cập nhật đã được làm mới.')
  }

  if (!canOpen && !canList && !canDecide) return <main className="min-w-0 space-y-5 pb-8"><PageHeader title="Quản lý đợt cập nhật hồ sơ" description="Quản lý thời gian mở quyền, phạm vi áp dụng và các trường thông tin Đảng viên được phép đề nghị cập nhật."/><Card className="gap-0 py-0"><CardContent className="p-6 text-sm text-muted-foreground">Bạn chưa được cấp quyền quản lý đợt hoặc xử lý yêu cầu cập nhật trong phạm vi nào.</CardContent></Card></main>

  return <main className="min-w-0 space-y-5 pb-8">
    <PageHeader title="Quản lý đợt cập nhật hồ sơ" description="Quản lý thời gian mở quyền, phạm vi áp dụng và các trường thông tin Đảng viên được phép đề nghị cập nhật."
      actions={<div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => void refresh()} disabled={windows.isFetching}><RefreshCw className={windows.isFetching ? 'animate-spin' : ''}/>Làm mới</Button>{canOpen && activeTab === 'campaigns' && <Button onClick={() => { setEditItem(null); setCreateOpen(true) }}><Plus/>Tạo đợt cập nhật</Button>}</div>}/>
    <Tabs value={activeTab} onValueChange={setActiveTab} className="min-w-0 space-y-5">
      <TabsList variant="line" className="h-auto w-full justify-start gap-2 overflow-x-auto rounded-none border-b bg-transparent p-0">
        {canOpen && <TabsTrigger value="campaigns" className="min-h-11 flex-none px-4">Quản lý đợt cập nhật</TabsTrigger>}
        {(canList || canDecide) && <TabsTrigger value="requests" className="min-h-11 flex-none px-4">Yêu cầu đang chờ xử lý</TabsTrigger>}
      </TabsList>
      {canOpen && <TabsContent value="campaigns" className="mt-0 space-y-5">
      {windows.isPending ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{['Tổng số đợt', 'Bản nháp', 'Đang mở', 'Sắp diễn ra', 'Đã kết thúc'].map((label) => <Card key={label}><CardContent className="p-5"><p className="text-sm text-muted-foreground">{label}</p><div className="mt-3 h-7 w-14 animate-pulse rounded bg-muted"/></CardContent></Card>)}</div> : windows.isError ? <Card className="gap-0 py-0"><CardContent className="p-5 text-sm text-destructive" role="alert">Không tải được danh sách đợt trong phạm vi của bạn.</CardContent></Card> : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatButton label="Tổng số đợt" value={stats.ALL} icon={<CalendarDays/>} active={status === 'ALL'} onClick={() => setFilter('ALL')}/>
        <StatButton label="Bản nháp" value={stats.BAN_NHAP} icon={<Pencil/>} active={status === 'BAN_NHAP'} onClick={() => setFilter('BAN_NHAP')}/>
        <StatButton label="Đang mở" value={stats.DANG_MO} icon={<Clock3/>} active={status === 'DANG_MO'} onClick={() => setFilter('DANG_MO')}/>
        <StatButton label="Sắp diễn ra" value={stats.CHUA_BAT_DAU} icon={<CalendarClock/>} active={status === 'CHUA_BAT_DAU'} onClick={() => setFilter('CHUA_BAT_DAU')}/>
        <StatButton label="Đã kết thúc" value={stats.DA_KET_THUC} icon={<Check/>} active={status === 'DA_KET_THUC'} onClick={() => setFilter('DA_KET_THUC')}/>
      </div>}
      <Card className="gap-0 py-0"><CardContent className="space-y-4 p-4 md:p-5"><div className="flex flex-col gap-3 xl:flex-row xl:items-end"><div className="min-w-0 flex-1 space-y-2"><Label htmlFor="campaign-search">Tìm theo tên đợt</Label><div className="relative"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground"/><Input id="campaign-search" className="pl-9" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Nhập tên đợt cập nhật…"/></div></div><div className="min-w-0 space-y-2 xl:w-64"><Label>Đơn vị tổ chức</Label><OrganizationUnitPicker label="Lọc theo đơn vị tổ chức" options={unitOptions} value={unitFilter} onValueChange={(value) => { setUnitFilter(value); setPage(1) }} allOption={{ value: '', label: 'Tất cả đơn vị' }} placeholder="Tất cả đơn vị"/></div><div className="min-w-0 space-y-2 sm:w-52"><Label htmlFor="campaign-status">Trạng thái</Label><Select value={status} onValueChange={(value) => setFilter(value as FilterState)}><SelectTrigger id="campaign-status"><SelectValue/></SelectTrigger><SelectContent>{Object.entries(statusText).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div><div className="min-w-0 space-y-2 sm:w-64"><Label htmlFor="campaign-range">Khoảng thời gian</Label><DateRangePicker id="campaign-range" aria-label="Lọc đợt theo khoảng ngày" value={{ from: from || undefined, to: to || undefined }} onChange={(range) => { setFrom(range?.from ?? ""); setTo(range?.to ?? ""); setPage(1) }}/></div><Button variant="outline" onClick={resetFilters}><ListFilter/>Đặt lại bộ lọc</Button></div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground"><span>{filtered.length} đợt phù hợp · {statusText[status]}</span><span>Thống kê được tính từ danh sách trong phạm vi quản lý của bạn.</span></div>
      </CardContent></Card>
      <Card className="min-w-0 gap-0 py-0"><CardContent className="space-y-4 p-0"><div className="overflow-x-auto rounded-lg"><Table className="min-w-[1100px]"><TableHeader><TableRow><TableHead className="w-14">STT</TableHead><TableHead className="min-w-52">Tên đợt cập nhật</TableHead><TableHead className="min-w-40">Đơn vị tổ chức</TableHead><TableHead className="min-w-40">Thời gian bắt đầu</TableHead><TableHead className="min-w-40">Thời gian kết thúc</TableHead><TableHead className="w-28 text-center">Số trường mở</TableHead><TableHead className="w-32">Trạng thái</TableHead><TableActionHead className="w-20 text-center">Thao tác</TableActionHead></TableRow></TableHeader>
        <TableBody>{windows.isPending ? <TableRow><TableCell colSpan={8} className="h-32 text-center text-muted-foreground">Đang tải danh sách đợt…</TableCell></TableRow> : windows.isError ? <TableRow><TableCell colSpan={8} className="h-32 text-center text-destructive">Có lỗi khi tải dữ liệu.</TableCell></TableRow> : visible.length === 0 ? <TableRow><TableCell colSpan={8} className="h-36 text-center"><div className="mx-auto flex max-w-sm flex-col items-center gap-2 text-muted-foreground"><CalendarDays className="size-6"/><span>{all.length ? 'Không có đợt nào phù hợp với bộ lọc.' : 'Chưa có đợt cập nhật nào trong phạm vi quản lý.'}</span>{(search || unitFilter || status !== 'ALL' || from || to) && <Button variant="link" onClick={resetFilters}>Đặt lại bộ lọc</Button>}</div></TableCell></TableRow> : visible.map((item, index) => {
          const currentStatus = stateOf(item, now)
          const canEditItem = currentStatus === 'BAN_NHAP' || currentStatus === 'DANG_MO' || (currentStatus === 'CHUA_BAT_DAU' && item.soYeuCau === 0)
          return <TableRow key={item.ma}><TableCell>{(page - 1) * pageSize + index + 1}</TableCell><TableCell className="whitespace-normal font-medium">{item.ten}</TableCell><TableCell className="whitespace-normal">{item.tenDonVi ?? 'Toàn hệ thống'}</TableCell><TableCell>{dateTime(item.ngayBatDau)}</TableCell><TableCell>{dateTime(item.ngayKetThuc)}</TableCell><TableCell className="text-center"><Badge variant="outline">{item.cacTruongDuocPhep.length}</Badge></TableCell><TableCell><StatusBadge item={item}/></TableCell><TableActionCell className="text-center"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`Thao tác: ${item.ten}`}><MoreHorizontal/></Button></DropdownMenuTrigger><DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => { setSelected(item); setDetailsOpen(true) }}><Eye/>Xem chi tiết</DropdownMenuItem>
            {canEditItem && <DropdownMenuItem onSelect={() => { setEditItem(item); setCreateOpen(true) }}><Pencil/>Chỉnh sửa</DropdownMenuItem>}
            {currentStatus === 'BAN_NHAP' && <DropdownMenuItem onSelect={() => setPendingAction({ type: 'activate', item })}><Play/>Kích hoạt đợt</DropdownMenuItem>}
            {(currentStatus === 'CHUA_BAT_DAU' || currentStatus === 'DANG_MO') && <DropdownMenuItem onSelect={() => setPendingAction({ type: 'finish', item })}><Square/>Kết thúc đợt</DropdownMenuItem>}
            {currentStatus === 'BAN_NHAP' && <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setPendingAction({ type: 'delete', item })}><Trash2/>Xóa đợt</DropdownMenuItem>}
          </DropdownMenuContent></DropdownMenu></TableActionCell></TableRow>
        })}</TableBody>
      </Table></div>
      {filtered.length > 0 && <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-muted-foreground">Đang xem {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} trong {filtered.length} đợt</p><div className="flex flex-wrap items-center gap-2"><Label htmlFor="campaign-page-size" className="text-sm text-muted-foreground">Số dòng</Label><Select value={String(pageSize)} onValueChange={(value) => { setPageSize(Number(value)); setPage(1) }}><SelectTrigger id="campaign-page-size" className="w-20"><SelectValue/></SelectTrigger><SelectContent>{pageSizes.map((size) => <SelectItem key={size} value={String(size)}>{size}</SelectItem>)}</SelectContent></Select><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Trước</Button><span className="min-w-20 text-center text-sm">Trang {page}/{pages}</span><Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((current) => Math.min(pages, current + 1))}>Sau</Button></div></div>}
      </CardContent></Card>
      </TabsContent>}
      {(canList || canDecide) && <TabsContent value="requests" className="mt-0"><ReviewQueue filterJump={reviewFilterJump}/></TabsContent>}
    </Tabs>
    <CreateWindowSheet open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) setEditItem(null) }} canOpen={canOpen} initialItem={editItem} onSaved={() => void client.invalidateQueries({ queryKey: ['update-windows'] })}/>
    <CampaignDetails item={selected} open={detailsOpen} onOpenChange={setDetailsOpen} canViewRequests={canList || canDecide} onViewRequests={openRequestsForCampaign}/>
    <AlertDialog open={Boolean(pendingAction)} onOpenChange={(open) => { if (!open && !campaignAction.isPending) setPendingAction(null) }}>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>{pendingAction?.type === 'activate' ? 'Xác nhận kích hoạt đợt' : pendingAction?.type === 'finish' ? 'Xác nhận kết thúc đợt' : 'Xác nhận xóa bản nháp'}</AlertDialogTitle>
          <AlertDialogDescription>{pendingAction?.type === 'activate' ? <><strong>{pendingAction.item.ten}</strong><br/>Phạm vi: {pendingAction.item.tenDonVi ?? 'Toàn hệ thống'}<br/>Thời gian: {dateTime(pendingAction.item.ngayBatDau)} – {dateTime(pendingAction.item.ngayKetThuc)}<br/>{pendingAction.item.cacTruongDuocPhep.length} trường được mở. Sau khi kích hoạt, đợt sẽ tiếp nhận yêu cầu theo thời hạn đã chọn.</> : pendingAction?.type === 'finish' ? <>Kết thúc đợt <strong>{pendingAction.item.ten}</strong> sẽ dừng tiếp nhận yêu cầu mới. Các yêu cầu đã gửi vẫn được giữ nguyên để Chi bộ tiếp tục xử lý.</> : <>Bản nháp <strong>{pendingAction?.item.ten}</strong> sẽ bị xóa. Chỉ xóa được khi chưa có yêu cầu phát sinh và không có lịch sử cần bảo toàn.</>}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel disabled={campaignAction.isPending}>Hủy</AlertDialogCancel><AlertDialogAction disabled={campaignAction.isPending} onClick={(event) => { event.preventDefault(); if (pendingAction) campaignAction.mutate(pendingAction) }}>{campaignAction.isPending ? 'Đang xử lý…' : pendingAction?.type === 'activate' ? 'Kích hoạt đợt' : pendingAction?.type === 'finish' ? 'Kết thúc đợt' : 'Xóa bản nháp'}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </main>
}

