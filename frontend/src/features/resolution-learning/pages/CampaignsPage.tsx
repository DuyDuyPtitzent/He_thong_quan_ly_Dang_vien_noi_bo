import { useEffect, useMemo, useState } from 'react'
import { useQueries, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { BookOpenCheck, CalendarDays, CircleCheck, Clock3, Ellipsis, Eye, Pencil, Plus, RefreshCw, Search, XCircle } from 'lucide-react'
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
import { Skeleton } from '@/shared/components/ui/skeleton'
import { CampaignForm } from '../components/CampaignForm'
import { CampaignBreadcrumb } from '../components/CampaignBreadcrumb'
import { campaignsApi } from '../api/campaigns.api'
import { campaignStatusLabels, flattenUnits, formatDate } from '../services/campaign-format'
import type { Campaign, CampaignInput, CampaignStatus } from '../types/campaign'

const statuses: CampaignStatus[] = ['NHAP', 'SAP_DIEN_RA', 'DANG_DIEN_RA', 'DA_KET_THUC', 'DA_HUY']
const statusStyle: Partial<Record<CampaignStatus, string>> = { SAP_DIEN_RA: 'border-transparent bg-warning-container text-warning-foreground', DANG_DIEN_RA: 'border-transparent bg-success text-success-foreground', DA_KET_THUC: 'border-transparent bg-muted text-muted-foreground', DA_HUY: 'border-transparent bg-destructive/10 text-destructive' }
const permissionCodes = { xem: 'HOC_TAP_NGHI_QUYET_DOT_XEM', tao: 'HOC_TAP_NGHI_QUYET_DOT_TAO', sua: 'HOC_TAP_NGHI_QUYET_DOT_SUA' }

export function CampaignsPage() {
  const { taiKhoan } = useAuth()
  const permissions = taiKhoan?.quyenDangHoatDong ?? []
  const can = (permission: string) => permissions.includes(permission)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(10)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [year, setYear] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Campaign | null>(null)
  useEffect(() => { const timer = window.setTimeout(() => { setDebouncedSearch(search.trim()); setPage(1) }, 300); return () => window.clearTimeout(timer) }, [search])
  const queryParams = { trang: page, gioiHan: size, tuKhoa: debouncedSearch || undefined, trangThai: status === 'all' ? undefined : status, maNamHoc: year === 'all' ? undefined : year, sapXep: 'ngayTao', thuTu: 'desc' }
  const assignmentId = taiKhoan?.maPhanCongVaiTroDangHoatDong
  const listQuery = useQuery({ queryKey: ['resolution-learning', 'campaigns', assignmentId, queryParams], queryFn: () => campaignsApi.list(queryParams), enabled: can(permissionCodes.xem) })
  const yearsQuery = useQuery({ queryKey: ['resolution-learning', 'years', assignmentId], queryFn: () => campaignsApi.years(), enabled: can('NAM_HOC_XEM') })
  const unitsQuery = useQuery({ queryKey: ['resolution-learning', 'units', assignmentId], queryFn: () => campaignsApi.units(), enabled: can('TO_CHUC_XEM') })
  const statsQueries = useQueries({ queries: (['SAP_DIEN_RA', 'DANG_DIEN_RA', 'DA_KET_THUC'] as CampaignStatus[]).map((currentStatus) => ({ queryKey: ['resolution-learning', 'campaign-count', assignmentId, currentStatus], queryFn: () => campaignsApi.list({ trang: 1, gioiHan: 10, trangThai: currentStatus, sapXep: 'ngayTao', thuTu: 'desc' }), enabled: can(permissionCodes.xem), staleTime: 30_000 })) })
  const total = listQuery.data?.phanTrang.tongSo
  const pages = Math.max(1, Math.ceil((total ?? 0) / size))
  useEffect(() => { if (page > pages) setPage(pages) }, [page, pages])
  const yearOptions = useMemo(() => yearsQuery.data?.duLieu ?? [], [yearsQuery.data])
  const unitNames = useMemo(() => new Map(flattenUnits(unitsQuery.data ?? []).map((unit) => [unit.id, unit.name])), [unitsQuery.data])
  const refresh = async () => { await queryClient.invalidateQueries({ queryKey: ['resolution-learning'] }) }
  const mutation = useMutation({ mutationFn: (value: CampaignInput) => editing ? campaignsApi.update(editing.ma, value) : campaignsApi.create(value), onSuccess: async () => { await refresh(); setFormOpen(false); setEditing(null); toast.success(editing ? 'Đã cập nhật thông tin đợt học.' : 'Đã tạo đợt học mới.') }, onError: (error) => toast.error(normalizeApiError(error).message) })
  const openCreate = () => { setEditing(null); setFormOpen(true) }
  const openEdit = (campaign: Campaign) => { setEditing(campaign); setFormOpen(true) }
  const resetFilters = () => { setSearch(''); setDebouncedSearch(''); setStatus('all'); setYear('all'); setPage(1) }
  const rows = listQuery.data?.duLieu ?? []

  if (!can(permissionCodes.xem)) return <div className="space-y-5"><CampaignBreadcrumb /><PageHeader title="Quản lý đợt học nghị quyết" description="Quản lý các đợt học tập nghị quyết trong phạm vi được phân quyền." /><Card><CardContent className="py-12 text-center"><p className="font-medium">Bạn chưa được cấp quyền xem đợt học.</p><p className="mt-1 text-sm text-muted-foreground">Chọn Assignment có Permission phù hợp hoặc liên hệ quản trị viên.</p></CardContent></Card></div>

  return <div className="min-w-0 space-y-5 pb-8"><CampaignBreadcrumb />
    <PageHeader title="Quản lý đợt học nghị quyết" description="Quản lý các đợt học tập nghị quyết trong phạm vi được phân quyền." actions={<div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => void listQuery.refetch()} disabled={listQuery.isFetching}><RefreshCw className={listQuery.isFetching ? 'animate-spin' : ''} />Làm mới</Button>{can(permissionCodes.tao) && <Button onClick={openCreate}><Plus />Tạo đợt học</Button>}</div>} />
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <button type="button" aria-pressed={status === 'all'} className={`cursor-pointer rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${status === 'all' ? 'ring-2 ring-primary/30' : ''}`} onClick={() => { setStatus('all'); setPage(1) }}><StatisticCard label="Tổng số đợt học" value={total ?? '—'} icon={<BookOpenCheck />} description="Theo phạm vi và bộ lọc hiện tại" /></button>
      {(['SAP_DIEN_RA', 'DANG_DIEN_RA', 'DA_KET_THUC'] as CampaignStatus[]).map((value, index) => <button key={value} type="button" aria-pressed={status === value} className={`cursor-pointer rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${status === value ? 'ring-2 ring-primary/30' : ''}`} onClick={() => { setStatus(value); setPage(1) }}><StatisticCard label={campaignStatusLabels[value]} value={statsQueries[index]?.data?.phanTrang.tongSo ?? '—'} icon={index === 0 ? <Clock3 /> : index === 1 ? <CalendarDays /> : <CircleCheck />} description="Trong phạm vi được cấp" /></button>)}
    </div>
    <Card className="gap-0 py-0"><CardContent className="p-4 md:p-5"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(16rem,1.5fr)_minmax(12rem,.9fr)_minmax(12rem,.9fr)_auto] xl:items-end">
      <div className="space-y-2"><Label htmlFor="campaign-search">Tìm tên hoặc mã đợt</Label><div className="relative"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input id="campaign-search" className="pl-9" placeholder="Nhập tên hoặc mã đợt học" value={search} onChange={(event) => setSearch(event.target.value)} /></div></div>
      <div className="space-y-2"><Label htmlFor="campaign-status">Trạng thái</Label><Select value={status} onValueChange={(value) => { setStatus(value); setPage(1) }}><SelectTrigger id="campaign-status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Tất cả trạng thái</SelectItem>{statuses.map((value) => <SelectItem key={value} value={value}>{campaignStatusLabels[value]}</SelectItem>)}</SelectContent></Select></div>
      {can('NAM_HOC_XEM') && <div className="space-y-2"><Label htmlFor="campaign-year">Năm học</Label><Select value={year} onValueChange={(value) => { setYear(value); setPage(1) }}><SelectTrigger id="campaign-year"><SelectValue placeholder="Tất cả năm học" /></SelectTrigger><SelectContent><SelectItem value="all">Tất cả năm học</SelectItem>{yearOptions.map((item) => <SelectItem key={item.ma} value={item.ma}>{item.tenNamHoc}</SelectItem>)}</SelectContent></Select></div>}
      <Button variant="outline" className="min-h-10" onClick={resetFilters}><XCircle />Đặt lại</Button>
    </div></CardContent></Card>
    {listQuery.isLoading ? <Card><CardContent className="space-y-3 py-5">{Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-10 w-full" />)}</CardContent></Card> : listQuery.isError ? <Card><CardContent className="py-10 text-center"><p className="mb-3 text-sm text-destructive">{normalizeApiError(listQuery.error).message}</p><Button variant="outline" onClick={() => void listQuery.refetch()}>Thử tải lại</Button></CardContent></Card> : !rows.length ? <Card><CardContent className="py-12 text-center"><BookOpenCheck className="mx-auto mb-3 size-8 text-muted-foreground" /><p className="font-medium">{debouncedSearch || status !== 'all' || year !== 'all' ? 'Không có đợt học phù hợp.' : 'Chưa có đợt học trong phạm vi của bạn.'}</p><p className="mt-1 text-sm text-muted-foreground">Thử thay đổi bộ lọc hoặc tạo đợt học nếu bạn có quyền.</p></CardContent></Card> : <Card className="min-w-0 gap-0 py-0"><CardContent className="space-y-0 p-0"><div className="overflow-x-auto rounded-lg"><Table className="min-w-[940px]"><TableHeader><TableRow><TableHead className="w-14">STT</TableHead><TableHead>Tên đợt học</TableHead><TableHead>Đơn vị tổ chức</TableHead><TableHead>Năm học</TableHead><TableHead>Thời gian</TableHead><TableHead>Trạng thái</TableHead><TableActionHead className="sticky right-0 bg-card">Thao tác</TableActionHead></TableRow></TableHeader><TableBody>{rows.map((row, index) => <TableRow key={row.ma}><TableCell>{(page - 1) * size + index + 1}</TableCell><TableCell><button type="button" className="max-w-[22rem] truncate text-left font-medium text-primary underline-offset-4 hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" title={row.ten} onClick={() => navigate(`/hoc-tap-nghi-quyet/dot/${row.ma}`)}>{row.ten}</button></TableCell><TableCell className="max-w-52 truncate">{unitNames.get(row.maDonViToChuc) ?? 'Đơn vị theo phạm vi được cấp'}</TableCell><TableCell>{row.namHoc?.tenNamHoc ?? '—'}</TableCell><TableCell className="whitespace-nowrap">{formatDate(row.ngayBatDau)} – {formatDate(row.ngayKetThuc)}</TableCell><TableCell><Badge variant="outline" className={statusStyle[row.trangThai]}>{campaignStatusLabels[row.trangThai] ?? row.trangThai}</Badge></TableCell><TableActionCell className="sticky right-0 bg-card"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Thao tác đợt học"><Ellipsis /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => navigate(`/hoc-tap-nghi-quyet/dot/${row.ma}`)}><Eye />Xem chi tiết</DropdownMenuItem>{can(permissionCodes.sua) && !['DA_KET_THUC', 'DA_HUY'].includes(row.trangThai) && <DropdownMenuItem onClick={() => openEdit(row)}><Pencil />Chỉnh sửa</DropdownMenuItem>}</DropdownMenuContent></DropdownMenu></TableActionCell></TableRow>)}</TableBody></Table></div>
      <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-muted-foreground">Đang xem {total ? (page - 1) * size + 1 : 0}–{Math.min(page * size, total ?? 0)} trong {total ?? 0} đợt học</p><div className="flex flex-wrap items-center gap-2"><Label htmlFor="campaign-page-size" className="text-sm text-muted-foreground">Số dòng</Label><Select value={String(size)} onValueChange={(value) => { setSize(Number(value)); setPage(1) }}><SelectTrigger id="campaign-page-size" className="w-20"><SelectValue /></SelectTrigger><SelectContent>{[10, 25, 50, 100].map((value) => <SelectItem key={value} value={String(value)}>{value}</SelectItem>)}</SelectContent></Select><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Trước</Button><Label htmlFor="campaign-page-input" className="sr-only">Chuyển đến trang</Label><Input id="campaign-page-input" aria-label="Số trang hiện tại" className="h-9 w-16 text-center" type="number" min={1} max={pages} value={page} onChange={(event) => { const next = Number(event.target.value); if (Number.isInteger(next) && next >= 1 && next <= pages) setPage(next) }} /><span className="text-sm text-muted-foreground">/ {pages}</span><Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Sau</Button></div></div>
    </CardContent></Card>}
    <CampaignForm key={`${formOpen}-${editing?.ma ?? 'new'}`} open={formOpen} onOpenChange={setFormOpen} campaign={editing} years={yearsQuery.data?.duLieu ?? []} units={unitsQuery.data ?? []} yearsError={!can('NAM_HOC_XEM') || Boolean(yearsQuery.isError)} unitsError={!can('TO_CHUC_XEM') || Boolean(unitsQuery.isError)} saving={mutation.isPending} onSubmit={(value) => mutation.mutate(value)} />
  </div>
}
