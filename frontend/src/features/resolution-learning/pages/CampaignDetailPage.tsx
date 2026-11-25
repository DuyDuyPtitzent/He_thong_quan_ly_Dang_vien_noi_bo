import { useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, BookOpenCheck, CalendarDays, Check, CircleAlert, Clock3, Download, FileText, Paperclip, Pencil, RefreshCw, Upload, UsersRound } from 'lucide-react'
import { toast } from 'sonner'
import { normalizeApiError } from '@/core/api/client'
import { useAuth } from '@/core/auth/auth-context'
import { EmptyState } from '@/shared/components/EmptyState'
import { PageHeader } from '@/shared/components/PageHeader'
import { StatisticCard } from '@/shared/components/StatisticCard'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Progress } from '@/shared/components/ui/progress'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { CampaignForm } from '../components/CampaignForm'
import { CampaignBreadcrumb } from '../components/CampaignBreadcrumb'
import { CampaignSessionTable } from '../components/CampaignSessionTable'
import { CampaignAttachmentTable } from '../components/CampaignAttachmentTable'
import { campaignsApi } from '../api/campaigns.api'
import { campaignStatusLabels, flattenUnits, formatDate, formatDateTime, formatSize } from '../services/campaign-format'
import type { CampaignStatus } from '../types/campaign'

type SessionState = 'NHAP' | 'DA_LEN_LICH' | 'DANG_DIEN_RA' | 'DA_KET_THUC' | 'DA_HUY'
const sessionStates: SessionState[] = ['NHAP', 'DA_LEN_LICH', 'DANG_DIEN_RA', 'DA_KET_THUC', 'DA_HUY']
const sessionLabels: Record<SessionState, string> = { NHAP: 'Bản nháp', DA_LEN_LICH: 'Sắp diễn ra', DANG_DIEN_RA: 'Đang diễn ra', DA_KET_THUC: 'Đã kết thúc', DA_HUY: 'Đã hủy' }
const campaignStateStyles: Partial<Record<CampaignStatus, string>> = { SAP_DIEN_RA: 'border-transparent bg-warning-container text-warning-foreground', DANG_DIEN_RA: 'border-transparent bg-success text-success-foreground', DA_KET_THUC: 'border-transparent bg-muted text-muted-foreground', DA_HUY: 'border-transparent bg-destructive/10 text-destructive' }
const pageSize = 10
const durationDays = (start: string, end: string) => { const a = new Date(start); const b = new Date(end); a.setHours(0, 0, 0, 0); b.setHours(0, 0, 0, 0); return Math.max(1, Math.floor((b.getTime() - a.getTime()) / 86_400_000) + 1) }
const percentText = (value: number | null | undefined) => value == null ? 'Chưa có dữ liệu' : new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(value) + '%'

export function CampaignDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const fileInput = useRef<HTMLInputElement>(null)
  const { taiKhoan } = useAuth()
  const permissions = taiKhoan?.quyenDangHoatDong ?? []
  const can = (permission: string) => permissions.includes(permission)
  const assignment = taiKhoan?.maPhanCongVaiTroDangHoatDong
  const [tab, setTab] = useState('overview')
  const [sessionPage, setSessionPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const detail = useQuery({ queryKey: ['resolution-learning', 'campaign', assignment, id], queryFn: () => campaignsApi.detail(id), enabled: Boolean(id && can('HOC_TAP_NGHI_QUYET_DOT_XEM')) })
  const canViewSessions = can('HOC_TAP_NGHI_QUYET_BUOI_XEM')
  const sessions = useQuery({ queryKey: ['resolution-learning', 'campaign-sessions', assignment, id, sessionPage], queryFn: () => campaignsApi.sessions(id, { trang: sessionPage, gioiHan: pageSize }), enabled: Boolean(id && canViewSessions && can('HOC_TAP_NGHI_QUYET_DOT_XEM')) })
  const sessionCounts = useQueries({ queries: sessionStates.map(status => ({ queryKey: ['resolution-learning', 'campaign-session-count', assignment, id, status], queryFn: () => campaignsApi.sessions(id, { trang: 1, gioiHan: pageSize, trangThai: status }), enabled: Boolean(id && canViewSessions && can('HOC_TAP_NGHI_QUYET_DOT_XEM')), staleTime: 30_000 })) })
  const canViewStatistics = can('HOC_TAP_NGHI_QUYET_THONG_KE_XEM')
  const statistics = useQuery({ queryKey: ['resolution-learning', 'campaign-statistics', assignment, id], queryFn: () => campaignsApi.statistics(id), enabled: Boolean(id && canViewStatistics) })
  const canReadCatalog = can('CAU_HINH_DANH_MUC_XEM') || can('HOC_TAP_NGHI_QUYET_BUOI_TAO')
  const catalog = useQuery({ queryKey: ['resolution-learning', 'session-type-catalog', assignment], queryFn: () => campaignsApi.sessionTypeCatalog(), enabled: canReadCatalog, staleTime: 60_000 })
  const years = useQuery({ queryKey: ['resolution-learning', 'years', assignment], queryFn: () => campaignsApi.years(), enabled: formOpen && can('NAM_HOC_XEM') })
  const organizationTree = useQuery({ queryKey: ['resolution-learning', 'units', assignment], queryFn: () => campaignsApi.units(), enabled: can('TO_CHUC_XEM') })
  const refresh = async () => { await queryClient.invalidateQueries({ queryKey: ['resolution-learning'] }) }
  const save = useMutation({ mutationFn: (input: import('../types/campaign').CampaignInput) => campaignsApi.update(id, input), onSuccess: async () => { await refresh(); setFormOpen(false); toast.success('Đã cập nhật thông tin đợt học.') }, onError: error => toast.error(normalizeApiError(error).message) })
  const transition = useMutation({ mutationFn: (action: 'end' | 'cancel') => action === 'end' ? campaignsApi.end(id) : campaignsApi.cancel(id), onSuccess: async (_, action) => { await refresh(); toast.success(action === 'end' ? 'Đợt học đã được kết thúc.' : 'Đợt học đã được hủy. Dữ liệu nghiệp vụ được giữ nguyên.') }, onError: error => toast.error(normalizeApiError(error).message) })
  const upload = useMutation({ mutationFn: (file: File) => campaignsApi.upload(id, file), onSuccess: async file => { await refresh(); toast.success('Đã tải lên tệp “' + file.tenTepGoc + '”.') }, onError: error => toast.error(normalizeApiError(error).message) })
  const download = useMutation({ mutationFn: async (file: { id: string; name: string }) => ({ file, blob: await campaignsApi.download(file.id) }), onSuccess: ({ file, blob }) => { const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = file.name; anchor.click(); URL.revokeObjectURL(url); toast.success('Đã tải xuống “' + file.name + '”.') }, onError: error => toast.error(normalizeApiError(error).message) })
  const remove = useMutation({ mutationFn: (fileId: string) => campaignsApi.removeAttachment(fileId), onSuccess: async () => { await refresh(); toast.success('Tệp đã được đánh dấu xóa.') }, onError: error => toast.error(normalizeApiError(error).message) })

  if (!can('HOC_TAP_NGHI_QUYET_DOT_XEM')) return <Card><CardContent className="py-12 text-center"><p className="font-medium">Bạn chưa được cấp quyền xem đợt học.</p><p className="mt-1 text-sm text-muted-foreground">Chọn Assignment có Permission phù hợp hoặc liên hệ quản trị viên.</p><Button className="mt-4" variant="outline" onClick={() => navigate('/hoc-tap-nghi-quyet/dot')}>Về danh sách</Button></CardContent></Card>
  if (detail.isLoading) return <div className="space-y-5"><Skeleton className="h-16 w-full" /><Skeleton className="h-32 w-full" /><Skeleton className="h-72 w-full" /></div>
  if (detail.isError || !detail.data) return <Card><CardContent className="py-10 text-center"><p className="mb-3 text-sm text-destructive">{detail.isError ? normalizeApiError(detail.error).message : 'Không tìm thấy thông tin đợt học.'}</p><Button variant="outline" onClick={() => void detail.refetch()}>Thử tải lại</Button><Button className="ml-2" variant="ghost" onClick={() => navigate('/hoc-tap-nghi-quyet/dot')}>Về danh sách</Button></CardContent></Card>

  const campaign = detail.data
  const unitNames = new Map(flattenUnits(organizationTree.data ?? []).map(unit => [unit.id, unit.name]))
  const files = campaign.tepDinhKem ?? []
  const mutable = !['DA_KET_THUC', 'DA_HUY'].includes(campaign.trangThai)
  const canEdit = can('HOC_TAP_NGHI_QUYET_DOT_SUA') && mutable
  const canTransition = can('HOC_TAP_NGHI_QUYET_DOT_KET_THUC') && mutable
  const canUpload = can('HOC_TAP_TEP_TAI_LEN') && mutable
  const canDownload = can('HOC_TAP_TEP_TAI_XUONG')
  const canDelete = can('HOC_TAP_TEP_XOA')
  const counts = new Map(sessionStates.map((status, index) => [status, sessionCounts[index]?.data?.phanTrang.tongSo ?? 0]))
  const countsLoading = sessionCounts.some(query => query.isPending)
  const totalSessions = countsLoading ? null : sessionStates.filter(status => status !== 'DA_HUY').reduce((sum, status) => sum + (counts.get(status) ?? 0), 0)
  const completedSessions = counts.get('DA_KET_THUC') ?? 0
  const completion = totalSessions ? Math.round(completedSessions * 1000 / totalSessions) / 10 : 0
  const formNames = new Map((catalog.data?.giaTri ?? []).map(item => [item.maGiaTri, item.tenHienThi]))
  const stat = statistics.data
  const organizer = campaign.donViToChuc?.tenDonVi?.[0]?.ten ?? 'Chưa cập nhật'
  const duration = durationDays(campaign.ngayBatDau, campaign.ngayKetThuc)
  const upcoming = (sessions.data?.duLieu ?? []).filter(item => item.trangThai === 'DA_LEN_LICH' && new Date(item.batDauLuc).getTime() > Date.now() && new Date(item.batDauLuc).getTime() < Date.now() + 3 * 86_400_000)
  const actionItems = [
    ...(!campaign.maNguoiPhuTrach && mutable ? [{ text: 'Chưa phân công người phụ trách đợt học', action: () => setFormOpen(true) }] : []),
    ...upcoming.map(item => ({ text: 'Buổi học sắp diễn ra: ' + item.ten, action: () => setTab('sessions') })),
  ]
  const applyScope = campaign.phamVi.map(unit => unitNames.get(unit.maDonVi)).filter(Boolean).join(', ') || (campaign.phamVi.length ? campaign.phamVi.length + ' đơn vị thuộc phạm vi' : 'Chưa khai báo')
  const downloadFile = (file: { ma: string; tenTepGoc: string }) => download.mutate({ id: file.ma, name: file.tenTepGoc })

  return <div className="min-w-0 space-y-5 pb-8">
    <CampaignBreadcrumb detail />
    <PageHeader title={campaign.ten} description={campaign.maDot + ' · ' + (campaign.namHoc?.tenNamHoc ?? 'Năm học chưa xác định')} actions={<div className="flex flex-wrap gap-2"><Button variant="outline" asChild><Link to="/hoc-tap-nghi-quyet/dot"><ArrowLeft />Quay lại danh sách</Link></Button><Button variant="outline" onClick={() => void detail.refetch()} disabled={detail.isFetching}><RefreshCw className={detail.isFetching ? 'animate-spin' : ''} />Làm mới</Button>{canEdit && <Button variant="outline" onClick={() => setFormOpen(true)}><Pencil />Chỉnh sửa đợt</Button>}{canTransition && <><ConfirmDialog trigger={<Button>Kết thúc đợt</Button>} title="Kết thúc đợt học?" description="Đợt chỉ được kết thúc khi thỏa điều kiện nghiệp vụ. Dữ liệu liên quan được giữ nguyên." confirmLabel="Kết thúc đợt" loading={transition.isPending} onConfirm={() => transition.mutate('end')} /><ConfirmDialog trigger={<Button variant="destructive">Hủy đợt</Button>} title="Hủy đợt học?" description="Đợt được chuyển sang trạng thái Đã hủy; hệ thống không xóa dữ liệu liên quan." confirmLabel="Hủy đợt" destructive loading={transition.isPending} onConfirm={() => transition.mutate('cancel')} /></>}</div>} />

    <section aria-label="Tổng quan đợt học" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <Card className="h-fit self-start"><CardContent className="p-4"><p className="text-sm text-muted-foreground">Trạng thái</p><Badge variant="outline" className={'mt-2 ' + (campaignStateStyles[campaign.trangThai] ?? '')}>{campaignStatusLabels[campaign.trangThai] ?? 'Chưa xác định'}</Badge></CardContent></Card>
      <StatisticCard label="Thời gian" value={formatDate(campaign.ngayBatDau) + ' – ' + formatDate(campaign.ngayKetThuc)} icon={<CalendarDays />} description={duration + ' ngày theo lịch'} />
      <StatisticCard label="Tiến độ buổi học" value={totalSessions == null ? 'Đang tải…' : completedSessions + '/' + totalSessions} icon={<BookOpenCheck />} description={(totalSessions == null ? '—' : percentText(totalSessions ? completion : 0)) + ' hoàn thành'} />
      <StatisticCard label="Tỷ lệ tham gia" value={canViewStatistics ? percentText(stat?.tyLeThamGia) : '—'} icon={<UsersRound />} description={canViewStatistics ? stat?.tongLuot ? stat.coMat + '/' + stat.tongLuot + ' lượt dự kiến có mặt' : 'Chưa có dữ liệu roster' : 'Cần quyền xem thống kê'} />
      <StatisticCard label="Đơn vị tổ chức" value={organizer} icon={<BookOpenCheck />} />
    </section>

    <Tabs value={tab} onValueChange={setTab} className="min-w-0">
      <TabsList variant="line" aria-label="Nội dung đợt học" className="w-full justify-start overflow-x-auto border-b"><TabsTrigger value="overview">Tổng quan</TabsTrigger><TabsTrigger value="sessions">Buổi học</TabsTrigger><TabsTrigger value="files">Tệp đính kèm</TabsTrigger>{canViewStatistics && <TabsTrigger value="statistics">Thống kê</TabsTrigger>}</TabsList>
      <TabsContent value="overview" className="mt-4 space-y-5">
        <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(17rem,1fr)]">
          <div className="min-w-0 space-y-5">
            <Card><CardHeader className="pb-3"><CardTitle className="text-base">Thông tin đợt học</CardTitle></CardHeader><CardContent><dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2"><DetailField label="Tên đợt học" value={campaign.ten} /><DetailField label="Mã đợt" value={campaign.maDot} /><DetailField label="Năm học" value={campaign.namHoc?.tenNamHoc ?? 'Chưa xác định'} /><DetailField label="Đơn vị tổ chức" value={organizer} /><DetailField label="Ngày bắt đầu" value={formatDate(campaign.ngayBatDau)} /><DetailField label="Ngày kết thúc" value={formatDate(campaign.ngayKetThuc)} /><DetailField label="Người phụ trách" value={campaign.nguoiPhuTrach?.tenDangNhap ?? 'Chưa phân công'} /><DetailField label="Phạm vi áp dụng" value={applyScope} /><div className="sm:col-span-2"><DetailField label="Mô tả" value={campaign.moTa || 'Chưa cập nhật'} /></div><DetailField label="Tạo lúc" value={formatDateTime(campaign.ngayTao)} /><DetailField label="Cập nhật lúc" value={formatDateTime(campaign.ngayCapNhat)} /></dl></CardContent></Card>
            <Card><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><BookOpenCheck className="size-4 text-primary" />Tiến độ triển khai</CardTitle></CardHeader><CardContent className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span>{totalSessions == null ? 'Đang tải số buổi…' : completedSessions + '/' + totalSessions + ' buổi đã hoàn thành'}</span><span className="font-semibold tabular-nums">{totalSessions == null ? '—' : percentText(completion)}</span></div><Progress value={completion} aria-label="Tỷ lệ buổi học đã hoàn thành" /><div className="flex flex-wrap gap-2">{sessionStates.map((status, index) => <Badge key={status} variant={status === 'DANG_DIEN_RA' ? 'success' : status === 'DA_HUY' ? 'destructive' : 'secondary'}>{sessionLabels[status]}: {sessionCounts[index]?.isPending ? '…' : counts.get(status)}</Badge>)}</div></CardContent></Card>
            <Card><CardHeader className="flex-row items-center justify-between gap-3"><CardTitle className="text-base">Buổi học trong đợt</CardTitle><Button variant="outline" size="sm" onClick={() => setTab('sessions')}>Xem danh sách</Button></CardHeader><CardContent>{!canViewSessions ? <EmptyState title="Chưa được cấp quyền xem buổi học" description="Danh sách buổi học không được tải khi Assignment hiện tại thiếu Permission." /> : sessions.isError ? <div role="alert" className="space-y-3 text-sm text-destructive"><p>{normalizeApiError(sessions.error).message}</p><Button variant="outline" onClick={() => void sessions.refetch()}>Thử tải lại</Button></div> : <CampaignSessionTable rows={sessions.data?.duLieu ?? []} total={sessions.data?.phanTrang.tongSo ?? 0} page={sessionPage} pageSize={pageSize} loading={sessions.isLoading} formNames={formNames} onPageChange={setSessionPage} />}</CardContent></Card>
          </div>
          <aside className="min-w-0 space-y-4" aria-label="Thông tin nhanh">
            <Card><CardHeader className="pb-2"><CardTitle className="text-base">Tổng quan nhanh</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><QuickLine label="Trạng thái" value={campaignStatusLabels[campaign.trangThai] ?? 'Chưa xác định'} /><QuickLine label="Năm học" value={campaign.namHoc?.tenNamHoc ?? 'Chưa xác định'} /><QuickLine label="Thời lượng" value={duration + ' ngày'} /><QuickLine label="Số buổi học" value={totalSessions == null ? 'Đang tải…' : totalSessions + ' buổi'} /><QuickLine label="Tổng lượt dự kiến" value={canViewStatistics ? stat ? stat.tongLuot + ' lượt' : statistics.isLoading ? 'Đang tải…' : 'Chưa có dữ liệu' : 'Cần quyền xem thống kê'} /><QuickLine label="Tiến độ hoàn thành" value={totalSessions == null ? 'Đang tải…' : percentText(completion) + ' (' + completedSessions + '/' + totalSessions + ')'} /><Progress value={completion} aria-label="Tiến độ hoàn thành đợt học" /></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Clock3 className="size-4 text-primary" />Mốc thời gian</CardTitle></CardHeader><CardContent><ol className="space-y-4 border-l pl-4 text-sm"><TimelineItem title="Tạo đợt học" time={formatDateTime(campaign.ngayTao)} done /><TimelineItem title="Bắt đầu đợt học" time={formatDateTime(campaign.ngayBatDau)} done={campaign.trangThai === 'DANG_DIEN_RA' || campaign.trangThai === 'DA_KET_THUC'} current={campaign.trangThai === 'DANG_DIEN_RA'} /><TimelineItem title={campaign.trangThai === 'DA_HUY' ? 'Đợt học đã hủy' : 'Kết thúc đợt học'} time={formatDateTime(campaign.ngayKetThuc)} done={campaign.trangThai === 'DA_KET_THUC' || campaign.trangThai === 'DA_HUY'} current={campaign.trangThai === 'SAP_DIEN_RA'} /></ol></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><CircleAlert className="size-4 text-primary" />Việc cần xử lý</CardTitle></CardHeader><CardContent>{actionItems.length ? <ul className="space-y-3">{actionItems.map((item, index) => <li key={item.text + index} className="flex items-start justify-between gap-2 text-sm"><span>{item.text}</span><Button variant="ghost" size="sm" onClick={item.action}>Mở</Button></li>)}</ul> : <p className="text-sm text-muted-foreground">Không có mục cần lưu ý từ dữ liệu đợt và lịch buổi hiện tải.</p>}</CardContent></Card>
            <Card><CardHeader className="flex-row items-center justify-between gap-2 pb-2"><CardTitle className="flex items-center gap-2 text-base"><Paperclip className="size-4 text-primary" />Tệp đính kèm ({canDownload ? files.length : '—'})</CardTitle><Button variant="link" size="sm" onClick={() => setTab('files')}>Xem tất cả</Button></CardHeader><CardContent>{!canDownload ? <p className="text-sm text-muted-foreground">Cần quyền tải xuống để xem danh sách tệp.</p> : !files.length ? <p className="text-sm text-muted-foreground">Chưa có tệp đính kèm.</p> : <ul className="divide-y">{files.slice(0, 3).map(file => <li key={file.ma} className="flex items-center justify-between gap-2 py-2 first:pt-0 last:pb-0"><span className="flex min-w-0 items-center gap-2"><FileText className="size-4 shrink-0 text-muted-foreground" /><span className="min-w-0"><span className="block truncate text-sm font-medium" title={file.tenTepGoc}>{file.tenTepGoc}</span><span className="text-xs text-muted-foreground">{formatSize(file.kichThuoc)}</span></span></span><TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" aria-label={'Tải xuống ' + file.tenTepGoc} onClick={() => downloadFile(file)} disabled={download.isPending}><Download /></Button></TooltipTrigger><TooltipContent>Tải xuống tệp</TooltipContent></Tooltip></TooltipProvider></li>)}</ul>}</CardContent></Card>
          </aside>
        </div>
      </TabsContent>
      <TabsContent value="sessions" className="mt-4"><Card><CardHeader><CardTitle className="text-base">Buổi học thuộc đợt</CardTitle></CardHeader><CardContent>{!canViewSessions ? <EmptyState title="Chưa được cấp quyền xem buổi học" description="Chọn Assignment có Permission phù hợp để tiếp tục." /> : sessions.isError ? <div role="alert" className="space-y-3 text-sm text-destructive"><p>{normalizeApiError(sessions.error).message}</p><Button variant="outline" onClick={() => void sessions.refetch()}>Thử tải lại</Button></div> : <CampaignSessionTable rows={sessions.data?.duLieu ?? []} total={sessions.data?.phanTrang.tongSo ?? 0} page={sessionPage} pageSize={pageSize} loading={sessions.isLoading} formNames={formNames} onPageChange={setSessionPage} />}</CardContent></Card></TabsContent>
      <TabsContent value="files" className="mt-4"><Card><CardHeader className="flex-row items-center justify-between gap-3"><div><CardTitle className="text-base">Tệp đính kèm của đợt</CardTitle><p className="mt-1 text-sm text-muted-foreground">PDF, JPG/JPEG hoặc PNG; tối đa 10 MB mỗi tệp.</p></div>{canUpload && <><input ref={fileInput} type="file" className="sr-only" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={event => { const file = event.target.files?.[0]; if (file) upload.mutate(file); event.currentTarget.value = '' }} /><Button onClick={() => fileInput.current?.click()} disabled={upload.isPending}><Upload />{upload.isPending ? 'Đang tải lên…' : 'Tải tệp lên'}</Button></>}</CardHeader><CardContent>{!canDownload ? <EmptyState title="Bạn chưa được cấp quyền tải tệp" description="Danh sách tệp chỉ hiển thị khi Permission tải xuống được cấp." /> : !files.length ? <EmptyState title="Chưa có tệp đính kèm" description="Tệp sẽ xuất hiện tại đây sau khi được tải lên thành công." /> : <CampaignAttachmentTable files={files} canDelete={canDelete} deleting={remove.isPending} onDownload={downloadFile} onDelete={fileId => remove.mutate(fileId)} />}</CardContent></Card></TabsContent>
      {canViewStatistics && <TabsContent value="statistics" className="mt-4 space-y-5">{statistics.isError ? <Card><CardContent className="space-y-3 py-8 text-center"><p className="text-sm text-destructive">{normalizeApiError(statistics.error).message}</p><Button variant="outline" onClick={() => void statistics.refetch()}>Thử tải lại</Button></CardContent></Card> : statistics.isLoading ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div> : stat ? <><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><StatisticCard label="Tổng lượt dự kiến" value={stat.tongLuot} icon={<UsersRound />} description="Roster đang hiệu lực qua các buổi" /><StatisticCard label="Có mặt" value={stat.coMat} icon={<Check />} description="Kết quả chính thức hiện hành" /><StatisticCard label="Tỷ lệ tham gia" value={percentText(stat.tyLeThamGia)} icon={<BookOpenCheck />} description="Có mặt / tổng lượt dự kiến" /><StatisticCard label="Buổi không bị hủy" value={stat.tongSoBuoi} icon={<CalendarDays />} description="Trong phạm vi được cấp" /></div><Card><CardHeader><CardTitle className="text-base">Phân bố kết quả hiện hành</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-3"><StatisticCard label="Vắng có phép" value={stat.vangCoPhep} /><StatisticCard label="Vắng không phép" value={stat.vangKhongPhep} /><StatisticCard label="Chưa điểm danh" value={stat.chuaDiemDanh} /></CardContent></Card></> : <EmptyState title="Chưa có dữ liệu thống kê" description="Chưa có lượt roster phù hợp để tổng hợp trong phạm vi này." />}</TabsContent>}
    </Tabs>

    <CampaignForm key={formOpen + '-' + campaign.ma} open={formOpen} onOpenChange={setFormOpen} campaign={campaign} years={years.data?.duLieu ?? []} units={organizationTree.data ?? []} yearsError={!can('NAM_HOC_XEM') || Boolean(years.isError)} unitsError={!can('TO_CHUC_XEM') || Boolean(organizationTree.isError)} saving={save.isPending} onSubmit={input => save.mutate(input)} />
  </div>
}

function DetailField({ label, value }: { label: string; value: string }) { return <div className="min-w-0"><dt className="text-xs font-medium text-muted-foreground">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm">{value}</dd></div> }
function QuickLine({ label, value }: { label: string; value: string }) { return <div className="flex items-start justify-between gap-3"><span className="text-muted-foreground">{label}</span><span className="text-right font-medium">{value}</span></div> }
function TimelineItem({ title, time, done, current = false }: { title: string; time: string; done: boolean; current?: boolean }) { return <li className="relative"><span className={'absolute -left-[1.32rem] top-0.5 grid size-5 place-items-center rounded-full border bg-background ' + (done ? 'border-success text-success' : current ? 'border-primary text-primary' : 'border-muted-foreground/40 text-muted-foreground')}>{done ? <Check className="size-3" /> : <span className="size-1.5 rounded-full bg-current" />}</span><p className={'font-medium ' + (current ? 'text-primary' : '')}>{title}</p><p className="text-xs text-muted-foreground">{time}</p></li> }
