import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
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
const sessionBadgeStyles: Record<SessionState, string> = { NHAP: 'border-transparent bg-muted text-muted-foreground', DA_LEN_LICH: 'border-transparent bg-warning-container text-warning-foreground', DANG_DIEN_RA: 'border-transparent bg-primary text-primary-foreground', DA_KET_THUC: 'border-transparent bg-success text-success-foreground', DA_HUY: 'border-transparent bg-destructive text-destructive-foreground' }
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
  const countsUnavailable = !canViewSessions || sessionCounts.some(query => query.isPending || query.isError)
  const totalSessions = countsUnavailable ? null : sessionStates.filter(status => status !== 'DA_HUY').reduce((sum, status) => sum + (counts.get(status) ?? 0), 0)
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
    <PageHeader layout="split" titleClassName="text-base" leading={<span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><BookOpenCheck className="size-5" /></span>} title={campaign.ten} actions={<div className="flex flex-wrap gap-2 xl:flex-nowrap xl:justify-end"><Button className="px-2 text-xs" size="sm" variant="outline" asChild><Link to="/hoc-tap-nghi-quyet/dot"><ArrowLeft />Quay lại danh sách</Link></Button><Button className="px-2 text-xs" size="sm" variant="outline" onClick={() => void detail.refetch()} disabled={detail.isFetching}><RefreshCw className={detail.isFetching ? 'animate-spin' : ''} />Làm mới</Button>{canEdit && <Button className="px-2 text-xs" size="sm" variant="outline" onClick={() => setFormOpen(true)}><Pencil />Chỉnh sửa đợt</Button>}{canTransition && <><ConfirmDialog trigger={<Button className="px-2 text-xs" size="sm">Kết thúc đợt</Button>} title="Kết thúc đợt học?" description="Đợt chỉ được kết thúc khi thỏa điều kiện nghiệp vụ. Dữ liệu liên quan được giữ nguyên." confirmLabel="Kết thúc đợt" loading={transition.isPending} onConfirm={() => transition.mutate('end')} /><ConfirmDialog trigger={<Button className="px-2 text-xs" size="sm" variant="destructive">Hủy đợt</Button>} title="Hủy đợt học?" description="Đợt được chuyển sang trạng thái Đã hủy; hệ thống không xóa dữ liệu liên quan." confirmLabel="Hủy đợt" destructive loading={transition.isPending} onConfirm={() => transition.mutate('cancel')} /></>}</div>} />

    <section aria-label="Tổng quan đợt học" className="grid items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <Card className="h-full gap-0 py-0"><CardContent className="p-3"><p className="text-xs text-muted-foreground">Trạng thái</p><Badge variant="outline" className={'mt-2 ' + (campaignStateStyles[campaign.trangThai] ?? '')}>{campaignStatusLabels[campaign.trangThai] ?? 'Chưa xác định'}</Badge></CardContent></Card>
      <StatisticCard equalHeight compact label="Thời gian" value={formatDate(campaign.ngayBatDau) + ' – ' + formatDate(campaign.ngayKetThuc)} icon={<CalendarDays />} description={duration + ' ngày theo lịch'} />
      <StatisticCard equalHeight compact label="Tiến độ buổi học" value={totalSessions == null ? 'Đang tải…' : completedSessions + '/' + totalSessions} icon={<BookOpenCheck />} description={(totalSessions == null ? '—' : percentText(totalSessions ? completion : 0)) + ' hoàn thành'} />
      <StatisticCard equalHeight compact label="Tỷ lệ tham gia" value={canViewStatistics ? percentText(stat?.tyLeThamGia) : '—'} icon={<UsersRound />} description={canViewStatistics ? statistics.isLoading ? 'Đang tải số liệu thống kê' : stat?.tongLuot ? stat.coMat + '/' + stat.tongLuot + ' lượt dự kiến có mặt' : 'Chưa có dữ liệu roster' : 'Cần quyền xem thống kê'} />
      <StatisticCard equalHeight compact label="Đơn vị tổ chức" value={organizer} icon={<BookOpenCheck />} />
    </section>

    <Tabs value={tab} onValueChange={setTab} className="min-w-0">
      <div className="w-full overflow-x-auto border-b"><TabsList variant="line" aria-label="Nội dung đợt học" className="w-fit min-w-max justify-start border-b-0"><TabsTrigger className="flex-none" value="overview">Tổng quan</TabsTrigger><TabsTrigger className="flex-none" value="sessions">Buổi học</TabsTrigger><TabsTrigger className="flex-none" value="files">Tệp đính kèm</TabsTrigger>{canViewStatistics && <TabsTrigger className="flex-none" value="statistics">Thống kê</TabsTrigger>}</TabsList></div>
      <TabsContent value="overview" className="mt-4 space-y-5">
        <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(17rem,1fr)]">
          <div className="min-w-0 space-y-5">
            <Card className="gap-0 py-0"><CardHeader className="px-4 pb-0 pt-4"><SectionTitle icon={<FileText />} label="Thông tin đợt học" /></CardHeader><CardContent className="px-4 pb-4 pt-3"><dl className="grid gap-x-6 sm:grid-cols-2"><DetailField label="Tên đợt học" value={campaign.ten} /><DetailField label="Mã đợt" value={campaign.maDot} /><DetailField label="Năm học" value={campaign.namHoc?.tenNamHoc ?? 'Chưa xác định'} /><DetailField label="Đơn vị tổ chức" value={organizer} /><DetailField label="Ngày bắt đầu" value={formatDate(campaign.ngayBatDau)} /><DetailField label="Ngày kết thúc" value={formatDate(campaign.ngayKetThuc)} /><DetailField label="Người phụ trách" value={campaign.nguoiPhuTrach?.tenDangNhap ?? 'Chưa phân công'} /><DetailField label="Phạm vi áp dụng" value={applyScope} /><div className="sm:col-span-2"><DetailField wide label="Mô tả" value={campaign.moTa || 'Chưa cập nhật'} /></div><DetailField label="Tạo lúc" value={formatDateTime(campaign.ngayTao)} /><DetailField label="Cập nhật lúc" value={formatDateTime(campaign.ngayCapNhat)} /></dl></CardContent></Card>
            <Card className="gap-0 py-0"><CardContent className="grid grid-cols-[minmax(9rem,auto)_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 p-3"><SectionTitle icon={<BookOpenCheck />} label="Tiến độ triển khai" /><Progress value={completion} aria-label="Tỷ lệ buổi học đã hoàn thành" /><span className="whitespace-nowrap text-xs font-semibold tabular-nums">{totalSessions == null ? '—' : completedSessions + '/' + totalSessions + ' buổi (' + percentText(completion) + ')'}</span><div className="col-start-2 col-span-2 flex flex-wrap gap-2">{sessionStates.map((status, index) => <Badge key={status} variant="outline" className={sessionBadgeStyles[status]}>{sessionLabels[status]}: {sessionCounts[index]?.isPending ? '…' : sessionCounts[index]?.isError ? '—' : counts.get(status)}</Badge>)}</div></CardContent></Card>
            <Card><CardHeader><SectionTitle icon={<CalendarDays />} label="Buổi học trong đợt" /></CardHeader><CardContent>{!canViewSessions ? <EmptyState title="Chưa được cấp quyền xem buổi học" description="Danh sách buổi học không được tải khi Assignment hiện tại thiếu Permission." /> : sessions.isError ? <div role="alert" className="space-y-3 text-sm text-destructive"><p>{normalizeApiError(sessions.error).message}</p><Button variant="outline" onClick={() => void sessions.refetch()}>Thử tải lại</Button></div> : <CampaignSessionTable rows={sessions.data?.duLieu ?? []} total={sessions.data?.phanTrang.tongSo ?? 0} page={sessionPage} pageSize={pageSize} loading={sessions.isLoading} formNames={formNames} onPageChange={setSessionPage} />}</CardContent></Card>
          </div>
          <aside className="min-w-0 space-y-3" aria-label="Thông tin nhanh">
            <Card className="gap-0 py-0"><CardHeader className="px-3 pb-0 pt-3"><SectionTitle icon={<BookOpenCheck />} label="Tổng quan nhanh" /></CardHeader><CardContent className="space-y-1 p-3 text-xs"><QuickLine label="Trạng thái" value={campaignStatusLabels[campaign.trangThai] ?? 'Chưa xác định'} /><QuickLine label="Năm học" value={campaign.namHoc?.tenNamHoc ?? 'Chưa xác định'} /><QuickLine label="Thời lượng" value={duration + ' ngày'} /><QuickLine label="Số buổi học" value={totalSessions == null ? 'Đang tải…' : totalSessions + ' buổi'} /><QuickLine label="Tổng lượt dự kiến" value={canViewStatistics ? stat ? stat.tongLuot + ' lượt' : statistics.isLoading ? 'Đang tải…' : 'Chưa có dữ liệu' : 'Cần quyền xem thống kê'} /><QuickLine label="Tiến độ hoàn thành" value={totalSessions == null ? 'Đang tải…' : percentText(completion) + ' (' + completedSessions + '/' + totalSessions + ')'} /><Progress value={completion} aria-label="Tiến độ hoàn thành đợt học" /></CardContent></Card>
            <Card className="gap-0 py-0"><CardHeader className="px-3 pb-0 pt-3"><SectionTitle icon={<Clock3 />} label="Mốc thời gian" /></CardHeader><CardContent className="p-3"><ol className="relative space-y-3 before:absolute before:bottom-3 before:left-3 before:top-3 before:w-0.5 before:bg-border before:content-['']"><TimelineItem title="Tạo đợt học" time={formatDateTime(campaign.ngayTao)} done /><TimelineItem title="Bắt đầu đợt học" time={formatDateTime(campaign.ngayBatDau)} done={campaign.trangThai === 'DANG_DIEN_RA' || campaign.trangThai === 'DA_KET_THUC'} current={campaign.trangThai === 'DANG_DIEN_RA'} /><TimelineItem title={campaign.trangThai === 'DA_HUY' ? 'Đợt học đã hủy' : 'Kết thúc đợt học'} time={formatDateTime(campaign.ngayKetThuc)} done={campaign.trangThai === 'DA_KET_THUC' || campaign.trangThai === 'DA_HUY'} current={campaign.trangThai === 'SAP_DIEN_RA'} /></ol></CardContent></Card>
            <Card className="gap-0 py-0"><CardHeader className="px-3 pb-0 pt-3"><SectionTitle icon={<CircleAlert />} label="Việc cần xử lý" /></CardHeader><CardContent className="p-3">{actionItems.length ? <ul className="space-y-2">{actionItems.map((item, index) => <li key={item.text + index} className="flex items-start justify-between gap-2 text-xs"><span>{item.text}</span><Button variant="ghost" size="sm" onClick={item.action}>Mở</Button></li>)}</ul> : <p className="text-xs text-muted-foreground">Không có mục cần lưu ý từ dữ liệu đợt và lịch buổi hiện tải.</p>}</CardContent></Card>
            <Card className="gap-0 py-0"><CardHeader className="grid-cols-[minmax(0,1fr)_auto] grid-rows-1 flex-row items-center justify-between gap-2 px-3 pb-0 pt-3"><SectionTitle icon={<Paperclip />} label={`Tệp đính kèm (${canDownload ? files.length : '—'})`} /><Button variant="link" size="sm" onClick={() => setTab('files')}>Xem tất cả</Button></CardHeader><CardContent className="p-3">{!canDownload ? <p className="text-xs text-muted-foreground">Cần quyền tải xuống để xem danh sách tệp.</p> : !files.length ? <p className="text-xs text-muted-foreground">Chưa có tệp đính kèm.</p> : <ul className="divide-y">{files.slice(0, 3).map(file => <li key={file.ma} className="flex items-center justify-between gap-2 py-2 first:pt-0 last:pb-0"><span className="flex min-w-0 items-center gap-2"><FileText className="size-4 shrink-0 text-muted-foreground" /><span className="min-w-0"><span className="block truncate text-xs font-medium" title={file.tenTepGoc}>{file.tenTepGoc}</span><span className="text-[10px] text-muted-foreground">{formatSize(file.kichThuoc)}</span></span></span><TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" aria-label={'Tải xuống ' + file.tenTepGoc} onClick={() => downloadFile(file)} disabled={download.isPending}><Download /></Button></TooltipTrigger><TooltipContent>Tải xuống tệp</TooltipContent></Tooltip></TooltipProvider></li>)}</ul>}</CardContent></Card>
          </aside>
        </div>
      </TabsContent>
      <TabsContent value="sessions" className="mt-4"><Card><CardHeader><SectionTitle icon={<CalendarDays />} label="Buổi học thuộc đợt" /></CardHeader><CardContent>{!canViewSessions ? <EmptyState title="Chưa được cấp quyền xem buổi học" description="Chọn Assignment có Permission phù hợp để tiếp tục." /> : sessions.isError ? <div role="alert" className="space-y-3 text-sm text-destructive"><p>{normalizeApiError(sessions.error).message}</p><Button variant="outline" onClick={() => void sessions.refetch()}>Thử tải lại</Button></div> : <CampaignSessionTable rows={sessions.data?.duLieu ?? []} total={sessions.data?.phanTrang.tongSo ?? 0} page={sessionPage} pageSize={pageSize} loading={sessions.isLoading} formNames={formNames} onPageChange={setSessionPage} />}</CardContent></Card></TabsContent>
      <TabsContent value="files" className="mt-4"><Card><CardHeader className="flex-row items-center justify-between gap-3"><div><SectionTitle icon={<Paperclip />} label="Tệp đính kèm của đợt" /><p className="mt-1 text-sm text-muted-foreground">PDF, JPG/JPEG hoặc PNG; tối đa 10 MB mỗi tệp.</p></div>{canUpload && <><input ref={fileInput} type="file" className="sr-only" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={event => { const file = event.target.files?.[0]; if (file) upload.mutate(file); event.currentTarget.value = '' }} /><Button onClick={() => fileInput.current?.click()} disabled={upload.isPending}><Upload />{upload.isPending ? 'Đang tải lên…' : 'Tải tệp lên'}</Button></>}</CardHeader><CardContent>{!canDownload ? <EmptyState title="Bạn chưa được cấp quyền tải tệp" description="Danh sách tệp chỉ hiển thị khi Permission tải xuống được cấp." /> : !files.length ? <EmptyState title="Chưa có tệp đính kèm" description="Tệp sẽ xuất hiện tại đây sau khi được tải lên thành công." /> : <CampaignAttachmentTable files={files} canDelete={canDelete} deleting={remove.isPending} onDownload={downloadFile} onDelete={fileId => remove.mutate(fileId)} />}</CardContent></Card></TabsContent>
      {canViewStatistics && <TabsContent value="statistics" className="mt-4 space-y-5">{statistics.isError ? <Card><CardContent className="space-y-3 py-8 text-center"><p className="text-sm text-destructive">{normalizeApiError(statistics.error).message}</p><Button variant="outline" onClick={() => void statistics.refetch()}>Thử tải lại</Button></CardContent></Card> : statistics.isLoading ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div> : stat ? <><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><StatisticCard label="Tổng lượt dự kiến" value={stat.tongLuot} icon={<UsersRound />} description="Roster đang hiệu lực qua các buổi" /><StatisticCard label="Có mặt" value={stat.coMat} icon={<Check />} description="Kết quả chính thức hiện hành" /><StatisticCard label="Tỷ lệ tham gia" value={percentText(stat.tyLeThamGia)} icon={<BookOpenCheck />} description="Có mặt / tổng lượt dự kiến" /><StatisticCard label="Buổi không bị hủy" value={stat.tongSoBuoi} icon={<CalendarDays />} description="Trong phạm vi được cấp" /></div><Card><CardHeader><SectionTitle icon={<UsersRound />} label="Phân bố kết quả hiện hành" /></CardHeader><CardContent className="grid gap-3 sm:grid-cols-3"><StatisticCard label="Vắng có phép" value={stat.vangCoPhep} /><StatisticCard label="Vắng không phép" value={stat.vangKhongPhep} /><StatisticCard label="Chưa có kết quả chính thức" value={stat.chuaDiemDanh} description="Có thể gồm yêu cầu đang chờ phê duyệt" /></CardContent></Card></> : <EmptyState title="Chưa có dữ liệu thống kê" description="Chưa có lượt roster phù hợp để tổng hợp trong phạm vi này." />}</TabsContent>}
    </Tabs>

    <CampaignForm key={formOpen + '-' + campaign.ma} open={formOpen} onOpenChange={setFormOpen} campaign={campaign} years={years.data?.duLieu ?? []} units={organizationTree.data ?? []} yearsError={!can('NAM_HOC_XEM') || Boolean(years.isError)} unitsError={!can('TO_CHUC_XEM') || Boolean(organizationTree.isError)} saving={save.isPending} onSubmit={input => save.mutate(input)} />
  </div>
}

function SectionTitle({ icon, label }: { icon: ReactNode; label: string }) { return <CardTitle className="flex min-w-0 items-center gap-2 text-sm"><span className="shrink-0 text-primary [&>svg]:size-4">{icon}</span><span className="min-w-0">{label}</span></CardTitle> }
function DetailField({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) { return <div className={`grid min-w-0 ${wide ? 'grid-cols-[minmax(6.5rem,0.21fr)_minmax(0,1fr)]' : 'grid-cols-[minmax(6.5rem,0.42fr)_minmax(0,1fr)]'} items-start gap-2 border-b py-1.5 last:border-b-0`}><dt className="text-[11px] font-medium text-muted-foreground">{label}</dt><dd className="min-w-0 whitespace-pre-wrap break-words text-xs leading-snug">{value}</dd></div> }
function QuickLine({ label, value }: { label: string; value: string }) { return <div className="flex items-start justify-between gap-3"><span className="shrink-0 text-muted-foreground">{label}</span><span className="min-w-0 break-words text-right font-medium">{value}</span></div> }
function TimelineItem({ title, time, done, current = false }: { title: string; time: string; done: boolean; current?: boolean }) { const markerStyle = done ? 'border-success bg-success text-success-foreground' : current ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-muted text-muted-foreground'; return <li className="relative grid grid-cols-[1.5rem_minmax(0,1fr)] items-start gap-2"><span className={'relative z-10 mt-0.5 grid size-6 place-items-center rounded-full border ' + markerStyle}>{done ? <Check className="size-3" /> : <span className="size-1.5 rounded-full bg-current" />}</span><div className="min-w-0 pt-0.5"><p className={'text-xs font-medium leading-snug ' + (current ? 'text-primary' : '')}>{title}</p><p className="text-xs leading-snug text-muted-foreground">{time}</p></div></li> }
