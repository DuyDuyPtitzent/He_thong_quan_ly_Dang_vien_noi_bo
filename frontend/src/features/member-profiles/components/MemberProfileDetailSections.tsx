import { useMemo, useState } from 'react'
import { Eye, Landmark } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { EmptyState } from '@/shared/components/EmptyState'
import { Table, TableActionCell, TableActionHead, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/components/ui/tooltip'
import type { PhanCongChucVu, QuaTrinhDang } from '../types/member-profiles.types'
import { formatMemberProfileDate } from '../services/member-profile-display.service'

const eventLabels: Record<string, string> = { VAO_DANG_DU_BI: 'Vào Đảng dự bị' }
const show = (value?: string | null) => value?.trim() || 'Chưa cập nhật'
const date = formatMemberProfileDate

function Rows({ rows }: { rows: [string, string | null | undefined][] }) {
  return <dl className="grid gap-x-8 md:grid-cols-2">{rows.map(([label, value]) => <div key={label} className="grid min-h-14 grid-cols-[minmax(8rem,0.8fr)_minmax(0,1.2fr)] items-center gap-3 border-b py-3 last:border-0"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="min-w-0 break-words text-sm font-medium">{show(value)}</dd></div>)}</dl>
}

export function PartyProcessRecordsSection({ canView, isPending, isError, events, onRetry }: { canView: boolean; isPending: boolean; isError: boolean; events: QuaTrinhDang[]; onRetry: () => void }) {
  const [selected, setSelected] = useState<QuaTrinhDang | null>(null)
  const sortedEvents = useMemo(() => [...events].sort((a, b) => {
    const aTime = a.ngaySuKien ? Date.parse(a.ngaySuKien) : Number.NaN
    const bTime = b.ngaySuKien ? Date.parse(b.ngaySuKien) : Number.NaN
    const aValid = Number.isFinite(aTime)
    const bValid = Number.isFinite(bTime)
    if (aValid && bValid && aTime !== bTime) return bTime - aTime
    if (aValid !== bValid) return aValid ? -1 : 1
    return a.ma.localeCompare(b.ma)
  }), [events])
  const eventLabel = (code: string) => eventLabels[code] ?? code.replaceAll('_', ' ').toLocaleLowerCase('vi')

  if (!canView) return <p className="rounded-md bg-muted p-4 text-sm text-muted-foreground">Bạn không có quyền truy cập thông tin này.</p>
  if (isPending) return <p role="status" className="py-8 text-center text-sm text-muted-foreground">Đang tải quá trình Đảng…</p>
  if (isError) return <div role="alert" className="space-y-2 text-sm text-destructive"><p>Không thể tải quá trình Đảng. Vui lòng kiểm tra quyền, phạm vi quản lý hoặc kết nối máy chủ.</p><Button variant="outline" onClick={onRetry}>Thử tải lại</Button></div>
  if (!sortedEvents.length) return <EmptyState title="Chưa có sự kiện quá trình Đảng" description="Các sự kiện sẽ hiển thị tại đây khi được ghi nhận." />

  return <>
    <TooltipProvider><Table><TableHeader><TableRow><TableHead>STT</TableHead><TableHead>Tên sự kiện</TableHead><TableHead>Ngày sự kiện</TableHead><TableHead>Số quyết định</TableHead><TableHead>Đơn vị ban hành</TableHead><TableActionHead className="text-right">Thao tác</TableActionHead></TableRow></TableHeader><TableBody>{sortedEvents.map((item, index) => <TableRow key={item.ma}><TableCell>{index + 1}</TableCell><TableCell>{eventLabel(item.loaiSuKien)}</TableCell><TableCell>{date(item.ngaySuKien)}</TableCell><TableCell>{show(item.soQuyetDinh)}</TableCell><TableCell>{show(item.donViBanHanhQuyetDinh)}</TableCell><TableActionCell className="text-right"><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" onClick={() => setSelected(item)}><Eye className="size-4" /><span>Xem chi tiết</span></Button></TooltipTrigger><TooltipContent>Xem đầy đủ thông tin sự kiện</TooltipContent></Tooltip></TableActionCell></TableRow>)}</TableBody></Table></TooltipProvider>
    <Dialog open={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null) }}><DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-4xl"><DialogHeader><DialogTitle>{selected ? eventLabel(selected.loaiSuKien) : 'Chi tiết quá trình Đảng'}</DialogTitle><DialogDescription>Ngày sự kiện: {date(selected?.ngaySuKien)}</DialogDescription></DialogHeader>{selected && <><Rows rows={[["Số quyết định", selected.soQuyetDinh], ["Ngày quyết định", selected.ngayQuyetDinh ? date(selected.ngayQuyetDinh) : null], ["Đơn vị ban hành", selected.donViBanHanhQuyetDinh], ["Người giới thiệu thứ nhất", selected.nguoiGioiThieuThuNhat], ["Người giới thiệu thứ hai", selected.nguoiGioiThieuThuHai], ["Người ghi nhận", selected.nguoiGhiNhan?.tenDangNhap], ["Nội dung", selected.moTa]]} /><div className="flex justify-end"><Button variant="outline" onClick={() => setSelected(null)}>Đóng</Button></div></>}</DialogContent></Dialog>
  </>
}

export function PositionAssignmentsSection({ canView, isPending, isError, items, onRetry, emptyTitle = 'Chưa có phân công chức vụ', emptyDescription = 'Chưa ghi nhận chức vụ hoặc nhiệm kỳ cho hồ sơ này.' }: { canView: boolean; isPending: boolean; isError: boolean; items: PhanCongChucVu[]; onRetry: () => void; emptyTitle?: string; emptyDescription?: string }) {
  if (!canView) return <p className="rounded-md bg-muted p-4 text-sm text-muted-foreground">Bạn không có quyền xem phân công chức vụ và nhiệm kỳ của hồ sơ này.</p>
  if (isPending) return <p role="status" className="py-8 text-center text-sm text-muted-foreground">Đang tải phân công chức vụ và nhiệm kỳ…</p>
  if (isError) return <div role="alert" className="space-y-2 text-sm text-destructive"><p>Không thể tải danh sách phân công do lỗi kết nối hoặc máy chủ. Hãy kiểm tra quyền và phạm vi quản lý nếu máy chủ từ chối truy cập.</p><Button variant="outline" onClick={onRetry}>Thử tải lại</Button></div>
  if (!items.length) return <EmptyState title={emptyTitle} description={emptyDescription} />

  return <div className="divide-y">{items.map((item) => <article key={item.ma} className="space-y-3 py-4 first:pt-0 last:pb-0"><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><Landmark className="size-4 text-primary"/><h3 className="font-medium">{item.tenChucVu}</h3></div><Badge variant={item.trangThai === 'DANG_HIEU_LUC' ? 'default' : 'secondary'}>{item.trangThai === 'DANG_HIEU_LUC' ? 'Đang hiệu lực' : item.trangThai === 'SAP_HIEU_LUC' ? 'Sắp hiệu lực' : 'Đã kết thúc'}</Badge></div><Rows rows={[["Đơn vị", item.tenDonVi], ["Nhiệm kỳ", item.nhiemKy?.ten], ["Thời gian nhiệm kỳ", item.nhiemKy ? `${date(item.nhiemKy.ngayBatDau)} – ${date(item.nhiemKy.ngayKetThuc)}` : null], ["Bắt đầu phân công", date(item.ngayHieuLucTu)], ["Kết thúc phân công", date(item.ngayHieuLucDen)], ["Số quyết định", item.soQuyetDinh], ["Ghi chú", item.ghiChu]]} /></article>)}</div>
}
