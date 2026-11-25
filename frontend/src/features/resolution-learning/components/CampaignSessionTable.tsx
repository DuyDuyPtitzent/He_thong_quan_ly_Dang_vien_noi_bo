import { CalendarDays } from 'lucide-react'
import { DataTable, type DataColumn } from '@/shared/components/DataTable'
import { Badge } from '@/shared/components/ui/badge'
import { EmptyState } from '@/shared/components/EmptyState'
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '@/shared/components/ui/pagination'
import { formatDateTime } from '../services/campaign-format'
import type { SessionSummary } from '../types/campaign'

const sessionStatus: Record<string, { label: string; variant: 'outline' | 'success' | 'secondary' | 'destructive' }> = {
  NHAP: { label: 'Bản nháp', variant: 'outline' },
  DA_LEN_LICH: { label: 'Sắp diễn ra', variant: 'secondary' },
  DANG_DIEN_RA: { label: 'Đang diễn ra', variant: 'success' },
  DA_KET_THUC: { label: 'Đã kết thúc', variant: 'secondary' },
  DA_HUY: { label: 'Đã hủy', variant: 'destructive' },
}

export function CampaignSessionTable({
  rows,
  total,
  page,
  pageSize,
  loading,
  formNames,
  onPageChange,
}: {
  rows: SessionSummary[]
  total: number
  page: number
  pageSize: number
  loading: boolean
  formNames: Map<string, string>
  onPageChange: (page: number) => void
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const indexedRows = rows.map((row, index) => ({ ...row, stt: index + 1 + (page - 1) * pageSize }))
  const columns: DataColumn<(typeof indexedRows)[number]>[] = [
    { id: 'index', header: 'STT', className: 'w-14', cell: row => row.stt },
    { id: 'ten', header: 'Tên buổi học', className: 'min-w-52 whitespace-normal', cell: row => <span className="font-medium">{row.ten}</span> },
    { id: 'thoi-gian', header: 'Thời gian', className: 'min-w-52', cell: row => <span className="inline-flex items-start gap-2"><CalendarDays className="mt-0.5 size-4 shrink-0 text-muted-foreground" /><span>{formatDateTime(row.batDauLuc)}<br /><span className="text-muted-foreground">đến {formatDateTime(row.ketThucLuc)}</span></span></span> },
    { id: 'hinh-thuc', header: 'Hình thức', className: 'min-w-32', cell: row => formNames.get(row.hinhThuc) ?? 'Chưa có tên danh mục' },
    { id: 'dia-diem', header: 'Địa điểm', className: 'min-w-32 whitespace-normal', cell: row => row.diaDiem || 'Chưa cập nhật' },
    { id: 'trang-thai', header: 'Trạng thái', className: 'min-w-32', cell: row => { const status = sessionStatus[row.trangThai]; return <Badge variant={status?.variant ?? 'outline'}>{status?.label ?? 'Chưa xác định'}</Badge> } },
  ]

  if (loading) return <div className="p-5" role="status">Đang tải danh sách buổi học…</div>
  if (!total) return <EmptyState title="Chưa có buổi học" description="Các buổi thuộc đợt này sẽ hiển thị tại đây sau khi được tạo." />

  return <div className="space-y-3">
    <div className="overflow-x-auto"><DataTable columns={columns} rows={indexedRows} getRowId={row => row.ma} emptyTitle="Trang này chưa có buổi học" /></div>
    <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-sm text-muted-foreground">
      <span>Đang xem {Math.min(total, (page - 1) * pageSize + 1)}–{Math.min(total, page * pageSize)} trong {total} buổi học</span>
      {totalPages > 1 && <Pagination className="mx-0 w-auto justify-end"><PaginationContent><PaginationItem><PaginationPrevious href="#" aria-disabled={page <= 1} onClick={event => { event.preventDefault(); if (page > 1) onPageChange(page - 1) }}>Trước</PaginationPrevious></PaginationItem><PaginationItem><span className="px-3" aria-live="polite">Trang {page} / {totalPages}</span></PaginationItem><PaginationItem><PaginationNext href="#" aria-disabled={page >= totalPages} onClick={event => { event.preventDefault(); if (page < totalPages) onPageChange(page + 1) }}>Sau</PaginationNext></PaginationItem></PaginationContent></Pagination>}
    </div>
    <p className="text-xs text-muted-foreground">Thông tin tham gia và thao tác nghiệp vụ từng buổi chưa có trong API tóm tắt hiện tại.</p>
  </div>
}
