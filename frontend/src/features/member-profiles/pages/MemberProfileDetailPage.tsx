import { useLayoutEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Bell, CalendarDays, CircleAlert, Ellipsis, Eye, FileText, GraduationCap, History, Landmark, Pencil, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/core/auth/auth-context'
import { normalizeApiError } from '@/core/api/client'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import { PageHeader } from '@/shared/components/PageHeader'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/shared/components/ui/breadcrumb'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/shared/components/ui/dropdown-menu'
import { MemberProfileCompletion } from '@/features/member-profiles/components/MemberProfileCompletion'
import { tinhTienDoHoSo } from '@/features/member-profiles/services/profile-completion.service'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
import { EmptyState } from '@/shared/components/EmptyState'
import { memberProfilesApi } from '../api/member-profiles.api'
import type { LichSuThayDoi } from '../types/member-profiles.types'
import { MemberProfileAvatar } from '../components/MemberProfileAvatar'
import { OutsideMembershipSection, PartyTrainingSection } from '../components/MemberProfileSupplementarySections'
import { PartyProcessRecordsSection, PositionAssignmentsSection } from '../components/MemberProfileDetailSections'
import { formatMemberProfileDate as date, formatMemberProfileEnum as enumLabel } from '../services/member-profile-display.service'

const statusNames: Record<string, string> = { DU_BI: 'Đảng viên dự bị', CHINH_THUC: 'Đảng viên chính thức', DA_RA_KHOI_DANG: 'Đã ra khỏi Đảng', TU_TRAN: 'Đã từ trần' }
const statusVariants: Record<string, 'secondary' | 'default' | 'destructive' | 'outline'> = { DU_BI: 'secondary', CHINH_THUC: 'default', DA_RA_KHOI_DANG: 'destructive', TU_TRAN: 'outline' }
const value = (input?: string | null) => input?.trim() || 'Chưa cập nhật'
const tenTruong: Record<string, string> = { maHoSoNoiBo: 'Mã hồ sơ', hoVaTen: 'Họ và tên', trangThai: 'Trạng thái hồ sơ', trangThaiDangVien: 'Trạng thái Đảng viên', ngayVaoDang: 'Ngày vào Đảng' }

function DataRows({ rows, columns = 2 }: { rows: [string, string | null | undefined][]; columns?: 1 | 2 }) {
  return <dl className={columns === 1 ? 'grid' : 'grid gap-x-10 md:grid-cols-2'}>{rows.map(([label, content]) => <div key={label} className="grid min-h-14 grid-cols-[minmax(7rem,0.8fr)_minmax(0,1.2fr)] items-center gap-3 border-b py-3 last:border-0"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="min-w-0 break-words text-sm font-medium">{value(content)}</dd></div>)}</dl>
}

const tenHanhDong: Record<string, string> = { HO_SO_DANG_VIEN_TAO: 'Tạo hồ sơ', HO_SO_DANG_VIEN_SUA: 'Cập nhật hồ sơ' }
const tenKetQua: Record<string, string> = { THANH_CONG: 'Thành công', THAT_BAI: 'Thất bại', TU_CHOI: 'Từ chối' }
const tenGiaTri: Record<string, string> = { DU_BI: 'Dự bị', CHINH_THUC: 'Chính thức', DA_RA_KHOI_DANG: 'Đã ra khỏi Đảng', TU_TRAN: 'Đã từ trần', DANG_HOAT_DONG: 'Đang hoạt động', NGUNG_HOAT_DONG: 'Ngừng hoạt động' }
const truongAnToan = (key: string) => !/cccd|canCuocCongDan|soDinhDanh/i.test(key)
const coKhacNhau = (a: unknown, b: unknown) => JSON.stringify(a ?? null) !== JSON.stringify(b ?? null)
const nhanTruong = (key: string) => tenTruong[key] ?? key.replace(/([a-z])([A-Z])/g, '$1 $2')
const giaTriAudit = (input: unknown) => {
  if (input == null || input === '') return 'Chưa cập nhật'
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(input)) return new Date(input).toLocaleString('vi-VN')
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) return date(input)
  if (typeof input === 'string') return tenGiaTri[input] ?? input
  if (typeof input === 'object') return '[Dữ liệu]'
  return String(input)
}

type ProfileTab = { value: string; label: string }

function ResponsiveProfileTabsList({ tabs, activeTab, onTabChange }: { tabs: ProfileTab[]; activeTab: string; onTabChange: (value: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const measurementRef = useRef<HTMLDivElement>(null)
  const tabsRef = useRef(tabs)
  const measureNodes = useRef(new Map<string, HTMLSpanElement>())
  const overflowMeasureRef = useRef<HTMLSpanElement>(null)
  const [visibleCount, setVisibleCount] = useState(tabs.length)
  const signature = tabs.map(({ value, label }) => `${value}:${label}`).join('|')
  tabsRef.current = tabs
  const visibleTabs = tabs.slice(0, visibleCount)
  const hiddenTabs = tabs.slice(visibleCount)
  const activeTabIsHidden = hiddenTabs.some(({ value }) => value === activeTab)
  const activeTabLabel = tabs.find(({ value }) => value === activeTab)?.label

  useLayoutEffect(() => {
    const recalculate = () => {
      const currentTabs = tabsRef.current
      const availableWidth = containerRef.current?.clientWidth ?? 0
      const widths = currentTabs.map(({ value }) => measureNodes.current.get(value)?.getBoundingClientRect().width ?? 0)
      const overflowWidth = overflowMeasureRef.current?.getBoundingClientRect().width ?? 40
      if (availableWidth <= 0 || widths.some((width) => width <= 0)) return

      const gap = 4
      const fullWidth = widths.reduce((total, width) => total + width, 0) + gap * Math.max(0, widths.length - 1)
      if (fullWidth <= availableWidth) {
        setVisibleCount(currentTabs.length)
        return
      }

      const tabsWidth = Math.max(0, availableWidth - overflowWidth - gap)
      let usedWidth = 0
      let count = 0
      for (const width of widths) {
        const nextWidth = width + (count > 0 ? gap : 0)
        if (usedWidth + nextWidth > tabsWidth) break
        usedWidth += nextWidth
        count += 1
      }
      setVisibleCount(count)
    }

    recalculate()
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(recalculate)
    if (containerRef.current) resizeObserver?.observe(containerRef.current)
    if (measurementRef.current) resizeObserver?.observe(measurementRef.current)
    window.addEventListener('resize', recalculate)
    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', recalculate)
    }
  }, [signature])

  return (
    <div ref={containerRef} className="relative flex min-w-0 items-end gap-1 border-b">
      <TabsList variant="line" className="h-auto min-w-0 flex-1 justify-start overflow-hidden border-0">
        {visibleTabs.map(({ value, label }) => <TabsTrigger key={value} value={value} className="min-h-11 flex-none px-4">{label}</TabsTrigger>)}
      </TabsList>
      {hiddenTabs.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={`size-10 shrink-0 rounded-md ${activeTabIsHidden ? 'bg-accent text-primary ring-1 ring-primary/30' : ''}`}
              aria-label={activeTabIsHidden ? `Thẻ đang chọn: ${activeTabLabel}. Mở danh sách thẻ khác` : 'Mở các thẻ đang ẩn'}
              title={activeTabIsHidden ? `Đang chọn: ${activeTabLabel}` : 'Các thẻ khác'}
            >
              <Ellipsis aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel>Các mục hồ sơ khác</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={activeTab} onValueChange={onTabChange}>
              {hiddenTabs.map(({ value, label }) => <DropdownMenuRadioItem key={value} value={value} className={value === activeTab ? 'font-semibold text-primary' : ''}>{label}</DropdownMenuRadioItem>)}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <div ref={measurementRef} aria-hidden="true" className="pointer-events-none invisible absolute left-0 top-0 -z-10 flex w-max gap-1">
        {tabs.map(({ value, label }) => (
          <span key={value} data-measure-tab={value} ref={(node) => { if (node) measureNodes.current.set(value, node); else measureNodes.current.delete(value) }} className="inline-flex min-h-11 flex-none items-center whitespace-nowrap px-4 text-sm font-medium">{label}</span>
        ))}
        <span ref={overflowMeasureRef} className="inline-flex size-10 shrink-0 items-center justify-center"><Ellipsis aria-hidden="true" /></span>
      </div>
    </div>
  )
}

export function MemberProfileDetailPage() {
  const { profileId = '' } = useParams()
  const navigate = useNavigate()
  const auth = useAuth()
  const [tab, setTab] = useState('party')
  const [selectedAudit, setSelectedAudit] = useState<LichSuThayDoi | null>(null)
  const [auditPage, setAuditPage] = useState(1)
  const permissions = auth.taiKhoan?.quyenDangHoatDong ?? []
  const can = (permission: string) => permissions.includes(permission)
  const profileTabs: ProfileTab[] = [
    { value: 'party', label: 'Thông tin Đảng viên' },
    { value: 'personal', label: 'Thông tin cá nhân' },
    { value: 'student', label: 'Thông tin sinh viên' },
    ...(can('SINH_HOAT_XEM_LICH_SU') ? [{ value: 'membership', label: 'Sinh hoạt Đảng' }] : []),
    ...(can('PHAN_CONG_CHUC_VU_XEM') ? [{ value: 'positions', label: 'Chức vụ & Nhiệm kỳ' }] : []),
    ...(can('QUA_TRINH_DANG_XEM') || can('DAO_TAO_DANG_XEM') || can('DAO_TAO_DANG_TAO') || can('DAO_TAO_DANG_SUA') || can('HO_SO_TAI_LIEU_XEM') || can('HO_SO_TAI_LIEU_TAI_LEN') || can('HO_SO_TAI_LIEU_TAI_XUONG') ? [{ value: 'history', label: 'Quá trình Đảng' }] : []),
    ...(can('HO_SO_XEM_LICH_SU_THAY_DOI') ? [{ value: 'audit', label: 'Lịch sử thay đổi' }] : []),
  ]
  const detail = useQuery({ queryKey: ['member-profile-detail', profileId], queryFn: () => memberProfilesApi.detail(profileId), enabled: Boolean(profileId) })
  const membershipHistory = useQuery({ queryKey: ['member-profile-membership-history', profileId], queryFn: () => memberProfilesApi.membershipHistory(profileId), enabled: detail.isSuccess && tab === 'membership' && can('SINH_HOAT_XEM_LICH_SU') })
  const partyProcess = useQuery({ queryKey: ['member-profile-party-process', profileId], queryFn: () => memberProfilesApi.partyProcess(profileId), enabled: detail.isSuccess && tab === 'history' && can('QUA_TRINH_DANG_XEM') })
  const positions = useQuery({ queryKey: ['member-profile-positions', profileId], queryFn: () => memberProfilesApi.positionAssignments(profileId), enabled: detail.isSuccess && tab === 'positions' && can('PHAN_CONG_CHUC_VU_XEM') })
  const changeHistory = useQuery({ queryKey: ['member-profile-change-history', profileId], queryFn: () => memberProfilesApi.changeHistory(profileId), enabled: detail.isSuccess && tab === 'audit' && can('HO_SO_XEM_LICH_SU_THAY_DOI') })

  const actions = <div className="flex flex-wrap items-center gap-2"><Button variant="outline" onClick={() => navigate('/ho-so-dang-vien')}><ArrowLeft />Quay lại danh sách</Button>{can('HO_SO_DANG_VIEN_SUA_THONG_TIN_CO_BAN') && detail.data && <Button onClick={() => navigate('/ho-so-dang-vien', { state: { editProfileId: profileId } })}><Pencil />Cập nhật hồ sơ</Button>}</div>

  if (detail.isPending) return <main className="space-y-5"><PageHeader title="Chi tiết hồ sơ Đảng viên" actions={actions} /><Card className="gap-0 py-0"><CardContent className="flex min-h-48 items-center justify-center text-muted-foreground" aria-live="polite">Đang tải thông tin hồ sơ…</CardContent></Card></main>
  if (detail.isError) {
    const error = normalizeApiError(detail.error)
    const message = error.status === 403 ? 'Bạn không có quyền xem hồ sơ này hoặc hồ sơ nằm ngoài phạm vi được cấp.' : error.status === 404 ? 'Không tìm thấy hồ sơ Đảng viên.' : error.status === undefined ? 'Không thể kết nối máy chủ. Vui lòng thử lại.' : 'Không thể tải hồ sơ. Vui lòng thử lại sau.'
    return <main className="space-y-5"><PageHeader title="Chi tiết hồ sơ Đảng viên" actions={actions} /><Card className="gap-0 py-0"><CardContent className="flex min-h-52 flex-col items-center justify-center gap-3 p-8 text-center"><CircleAlert className="size-8 text-destructive" /><p role="alert">{message}</p><Button variant="outline" onClick={() => void detail.refetch()}>Thử tải lại</Button></CardContent></Card></main>
  }

  const profile = detail.data
  const personal = profile.thongTinCaNhan
  const student = profile.thongTinSinhVien
  const admission = profile.quaTrinh?.[0]
  const currentUnit = profile.lichSuDonVi?.[0]
  const currentMembership = membershipHistory.data?.donViHienTai ?? null
  const sortedAudit = [...(changeHistory.data ?? [])].sort((a, b) => new Date(b.thoiDiem).getTime() - new Date(a.thoiDiem).getTime())
  const auditPageSize = 10
  const auditPageCount = Math.max(1, Math.ceil(sortedAudit.length / auditPageSize))
  const visibleAudit = sortedAudit.slice((Math.min(auditPage, auditPageCount) - 1) * auditPageSize, Math.min(auditPage, auditPageCount) * auditPageSize)
  const auditChanges = selectedAudit ? [...new Set([...Object.keys(selectedAudit.duLieuTruoc ?? {}), ...Object.keys(selectedAudit.duLieuSau ?? {})])].filter((key) => truongAnToan(key) && coKhacNhau(selectedAudit.duLieuTruoc?.[key], selectedAudit.duLieuSau?.[key])) : []
  const pastMemberships = (membershipHistory.data?.lichSu ?? []).filter((item) => item.ma !== currentMembership?.ma)
  const canPersonal = can('HO_SO_CA_NHAN_XEM') || can('HO_SO_CA_NHAN_SUA')
  const canAddress = can('HO_SO_DIA_CHI_XEM') || can('HO_SO_DIA_CHI_SUA')
  const canStudent = can('HO_SO_SINH_VIEN_XEM') || can('HO_SO_SINH_VIEN_SUA')
  const canCurrentMembership = can('SINH_HOAT_XEM_HIEN_TAI')
  const addressLabel = (kind: string) => ({ NOI_SINH: 'Nơi sinh, cấp giấy khai sinh', QUE_QUAN: 'Quê quán', THUONG_TRU: 'Nơi thường trú', NOI_O_HIEN_NAY: 'Nơi ở hiện nay' }[kind] ?? kind)
  const addressRows: [string, string | null | undefined][] = Array.isArray(profile.diaChi) && profile.diaChi.length
    ? profile.diaChi.map((address) => [addressLabel(address.loaiDiaChi), [address.phanLoaiNoiSinh === 'TRONG_NUOC' ? 'Trong nước' : address.phanLoaiNoiSinh === 'NUOC_NGOAI' ? 'Nước ngoài' : null, address.diaChiChiTiet, address.xaPhuong, address.quanHuyen, address.tinhThanhPho, address.quocGia].filter(Boolean).join(', ') || null])
    : [['Nơi sinh, cấp giấy khai sinh', null], ['Quê quán', null], ['Nơi thường trú', null], ['Nơi ở hiện nay', null]]
  const branchName = currentUnit?.chiBo?.tenDonVi?.[0]?.ten ?? currentUnit?.chiBo?.maDinhDanh ?? currentUnit?.maChiBo
  const groupName = currentUnit?.to?.tenDonVi?.[0]?.ten ?? currentUnit?.to?.maDinhDanh ?? currentUnit?.maTo
  const canCalculateCompletion = canPersonal && canAddress && canStudent
    && profile.thongTinCaNhan !== undefined && profile.diaChi !== undefined && profile.thongTinSinhVien !== undefined

  return <main className="space-y-5 pb-8">
    <Breadcrumb><BreadcrumbList><BreadcrumbItem><BreadcrumbLink asChild><Link to="/">Trang chủ</Link></BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbLink asChild><Link to="/ho-so-dang-vien">Hồ sơ Đảng viên</Link></BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbPage>{profile.maHoSoNoiBo}</BreadcrumbPage></BreadcrumbItem></BreadcrumbList></Breadcrumb>
    <PageHeader title="Chi tiết hồ sơ Đảng viên" actions={actions} />

    <Card className="gap-0 py-0"><CardContent className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:p-8">
      <MemberProfileAvatar name={profile.hoVaTen} profileId={profileId} className="size-24 shrink-0 border-4 border-muted bg-primary/5 text-2xl text-primary" />
      <div className="min-w-0 flex-1 space-y-3"><div className="flex flex-wrap items-center gap-3"><h2 className="text-2xl font-semibold">{profile.hoVaTen}</h2><Badge variant={statusVariants[profile.trangThaiDangVien ?? ''] ?? 'outline'}>{statusNames[profile.trangThaiDangVien ?? ''] ?? 'Chưa cập nhật trạng thái'}</Badge></div><p className="text-sm text-muted-foreground">Mã hồ sơ: <span className="font-medium text-foreground">{profile.maHoSoNoiBo}</span>{canCurrentMembership && <><span className="px-2">·</span>Chi bộ sinh hoạt: <span className="font-medium text-foreground">{branchName ?? 'Chưa ghi nhận'}</span>{currentUnit?.maTo && <><span className="px-2">·</span>Tổ: <span className="font-medium text-foreground">{groupName}</span></>}</>}</p><div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground"><span className="inline-flex items-center gap-2"><CalendarDays className="size-4" />Ngày vào Đảng: {date(profile.ngayVaoDang)}</span>{canCurrentMembership && <span className="inline-flex items-center gap-2"><Landmark className="size-4" />Sinh hoạt từ: {date(currentUnit?.ngayHieuLucTu)}</span>}</div><MemberProfileCompletion mode="summary" progress={canCalculateCompletion ? tinhTienDoHoSo(profile) : undefined} unavailableReason="Cần quyền xem thông tin cá nhân, địa chỉ và sinh viên để tính mức độ hoàn thiện chính xác." /></div>
    </CardContent></Card>

    <div className="grid gap-5 xl:grid-cols-[minmax(16rem,0.28fr)_minmax(0,1fr)]">
      <aside className="space-y-4">
        <Card className="gap-0 py-0"><CardContent className="space-y-4 p-5"><h2 className="font-semibold">Sinh hoạt hiện tại</h2>{canCurrentMembership ? currentUnit ? <DataRows columns={1} rows={[["Đảng ủy", currentUnit.tenDangUy], ["Chi bộ", branchName], ["Tổ", groupName], ["Bắt đầu từ", date(currentUnit.ngayHieuLucTu)], ["Số phiếu lý lịch", profile.soPhieuLyLich], ["Số thẻ Đảng viên", profile.soTheDangVien], ["Trạng thái hồ sơ", profile.trangThai === 'DANG_HOAT_DONG' ? 'Đang hoạt động' : profile.trangThai]]} /> : <EmptyState title="Chưa có thông tin sinh hoạt hiện tại" description="Hồ sơ chưa ghi nhận đơn vị sinh hoạt đang có hiệu lực." /> : <p className="text-sm text-muted-foreground">Bạn không có quyền xem thông tin sinh hoạt hiện tại.</p>}</CardContent></Card>
        <Card className="gap-0 py-0"><CardContent className="space-y-3 p-5"><h2 className="font-semibold">Thao tác nhanh</h2><div className="grid gap-2">{can('HO_SO_DANG_VIEN_XEM_TONG_QUAN') && <Button variant="outline" className="w-full justify-start" onClick={() => toast.info('Chức năng đang phát triển')}><Bell />Gửi thông báo nhanh</Button>}{can('HO_SO_DANG_VIEN_SUA_THONG_TIN_CO_BAN') && <Button className="w-full justify-start" onClick={() => navigate('/ho-so-dang-vien', { state: { editProfileId: profileId } })}><Pencil />Chỉnh sửa hồ sơ</Button>}{can('HO_SO_XEM_LICH_SU_THAY_DOI') && <Button variant="outline" className="w-full justify-start" onClick={() => setTab('audit')}><History />Xem lịch sử hồ sơ</Button>}</div></CardContent></Card>
      </aside>

      <section className="min-w-0 space-y-4">
        <Tabs value={tab} onValueChange={setTab}>
          <ResponsiveProfileTabsList tabs={profileTabs} activeTab={tab} onTabChange={setTab} />
          <MemberProfileCompletion mode="notice" progress={canCalculateCompletion ? tinhTienDoHoSo(profile) : undefined} unavailableReason="Cần quyền xem thông tin cá nhân, địa chỉ và sinh viên để tính mức độ hoàn thiện chính xác." />
          <TabsContent value="party" className="pt-5"><Card className="gap-0 py-0"><CardContent className="space-y-4 p-5 md:p-7"><div className="flex items-center gap-3"><Landmark className="size-5 text-primary" /><h2 className="font-semibold">Thông tin Đảng viên</h2></div><DataRows rows={[["Mã hồ sơ", profile.maHoSoNoiBo], ["Số phiếu lý lịch", profile.soPhieuLyLich], ["Số thẻ Đảng viên", profile.soTheDangVien], ["Khóa Đảng viên", profile.khoaDangVien], ["Loại Đảng viên", statusNames[profile.trangThaiDangVien ?? '']], ["Ngày vào Đảng", date(profile.ngayVaoDang)], ["Ngày chính thức", date(profile.ngayChinhThuc)], ["Số quyết định kết nạp", admission?.soQuyetDinh], ["Ngày quyết định", date(admission?.ngayQuyetDinh)], ["Đơn vị ban hành", admission?.donViBanHanhQuyetDinh], ["Người giới thiệu thứ nhất", admission?.nguoiGioiThieuThuNhat], ["Người giới thiệu thứ hai", admission?.nguoiGioiThieuThuHai]]} /></CardContent></Card></TabsContent>
          <TabsContent value="personal" className="pt-5"><Card className="gap-0 py-0"><CardContent className="space-y-4 p-5 md:p-7"><div className="flex items-center gap-3"><UserRound className="size-5 text-primary" /><h2 className="font-semibold">Thông tin cá nhân</h2></div>{canPersonal ? <DataRows rows={[["Họ và tên", profile.hoVaTen], ["Ngày sinh", date(personal?.ngaySinh)], ["Giới tính", enumLabel(personal?.gioiTinh)], ["Số CCCD", personal?.soCccd], ["Ngày cấp CCCD", personal?.ngayCapCccd], ["Nơi cấp CCCD", personal?.noiCapCccd], ["Quốc tịch", personal?.quocTich], ["Dân tộc", personal?.danToc], ["Tôn giáo", personal?.tonGiao], ["Số điện thoại", personal?.soDienThoai], ["Số điện thoại bố/người nuôi dưỡng", personal?.soDienThoaiBoNguoiNuoiDuong], ["Số điện thoại mẹ/người nuôi dưỡng", personal?.soDienThoaiMeNguoiNuoiDuong], ["Thư điện tử liên hệ", personal?.emailLienHe]]} /> : <p className="rounded-md bg-muted p-4 text-sm text-muted-foreground">Bạn không có quyền xem thông tin cá nhân của hồ sơ này.</p>}{canAddress && <><h3 className="pt-4 font-medium">Địa chỉ</h3>{!Array.isArray(profile.diaChi) ? <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Không thể hiển thị địa chỉ vì quyền hoặc phạm vi quản lý chưa áp dụng cho hồ sơ này.</p> : <DataRows rows={addressRows} />}</>}</CardContent></Card></TabsContent>
          <TabsContent value="student" className="pt-5"><Card className="gap-0 py-0"><CardContent className="space-y-4 p-5 md:p-7"><div className="flex items-center gap-3"><GraduationCap className="size-5 text-primary" /><h2 className="font-semibold">Thông tin sinh viên</h2></div>{!canStudent ? <p className="rounded-md bg-muted p-4 text-sm text-muted-foreground">Bạn không có quyền xem thông tin sinh viên của hồ sơ này.</p> : student ? <DataRows rows={[["Mã sinh viên", student.maSinhVien], ["Khóa học", student.khoaHoc], ["Đơn vị phụ trách", student.donViPhuTrach], ["Chương trình đào tạo", student.chuongTrinhDaoTao], ["Ngành", student.nganh], ["Chuyên ngành", student.chuyenNganh], ["Lớp hành chính", student.lopHanhChinh], ["Trạng thái học tập", enumLabel(student.trangThaiHocTap)]]} /> : <p className="rounded-md bg-muted p-4 text-sm text-muted-foreground">Hồ sơ này chưa có thông tin sinh viên liên kết.</p>}</CardContent></Card></TabsContent>
          <TabsContent value="membership" className="pt-5"><Card className="gap-0 py-0"><CardContent className="space-y-5 p-5 md:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-3"><Landmark className="size-5 text-primary"/><h2 className="text-lg font-semibold">Sinh hoạt Đảng</h2></div><p className="mt-1 text-sm text-muted-foreground">Thông tin chi tiết của Đảng viên {profile.hoVaTen}</p></div><Badge variant="secondary">Chỉ xem</Badge></div>{membershipHistory.isPending ? <p role="status" className="py-8 text-center text-sm text-muted-foreground">Đang tải thông tin sinh hoạt…</p> : membershipHistory.isError ? <div role="alert" className="space-y-2 text-sm text-destructive"><p>Không thể tải thông tin sinh hoạt.</p><Button variant="outline" onClick={() => void membershipHistory.refetch()}>Thử tải lại</Button></div> : <>{canCurrentMembership ? <DataRows columns={1} rows={[["Đảng ủy", currentMembership?.tenDangUy ?? "Chưa ghi nhận Đảng ủy"], ["Chi bộ hiện tại", currentMembership?.tenChiBo ?? "Chưa ghi nhận Chi bộ"], ["Tổ sinh hoạt", currentMembership?.tenTo ?? "Chưa phân tổ"], ["Bắt đầu sinh hoạt", date(currentMembership?.ngayHieuLucTu)], ["Trạng thái sinh hoạt", currentMembership ? "Đang sinh hoạt" : "Chưa ghi nhận sinh hoạt hiện tại"]]} /> : <p className="text-sm text-muted-foreground">Bạn không có quyền xem thông tin sinh hoạt hiện tại.</p>}<div className="space-y-4 border-t pt-5"><h3 className="text-lg font-semibold">Lịch sử chuyển sinh hoạt</h3>{pastMemberships.length ? <ol className="relative space-y-0 before:absolute before:bottom-4 before:left-2 before:top-2 before:w-px before:bg-border">{pastMemberships.map((item) => <li key={item.ma} className="relative pb-6 pl-8 last:pb-0"><span className="absolute left-1.5 top-1.5 size-2.5 rounded-full bg-primary ring-4 ring-background"/><h4 className="font-medium">{item.tenChiBo ?? "Chưa xác định Chi bộ"}{item.tenTo ? ` · ${item.tenTo}` : " · Chưa phân tổ"}</h4><p className="mt-1 text-sm text-muted-foreground">{date(item.ngayHieuLucTu)} – {date(item.ngayHieuLucDen)}</p>{item.lyDoChuyen && <p className="mt-1 text-sm">Lý do chuyển: {item.lyDoChuyen}</p>}</li>)}</ol> : <div className="flex items-start gap-3 py-4 text-sm text-muted-foreground"><History className="mt-0.5 size-5 shrink-0"/><p>Chưa có dữ liệu lịch sử chuyển sinh hoạt được ghi nhận.</p></div>}<OutsideMembershipSection profileId={profileId} canView={can('SINH_HOAT_XEM_LICH_SU')} canEdit={false} memberships={(membershipHistory.data?.lichSu ?? []).map((item) => ({ ma: item.ma, ngayHieuLucTu: item.ngayHieuLucTu, tenChiBo: item.tenChiBo }))} /></div></>}</CardContent></Card></TabsContent>
          <TabsContent value="positions" className="pt-5"><Card className="gap-0 py-0"><CardContent className="space-y-4 p-5 md:p-7"><div className="flex items-center gap-3"><Landmark className="size-5 text-primary" /><h2 className="font-semibold">Chức vụ và nhiệm kỳ</h2></div><PositionAssignmentsSection canView={can('PHAN_CONG_CHUC_VU_XEM')} isPending={positions.isPending} isError={positions.isError} items={positions.data ?? []} onRetry={() => void positions.refetch()} /></CardContent></Card></TabsContent>
          <TabsContent value="history" className="pt-5"><Card className="gap-0 py-0"><CardContent className="space-y-5 p-5 md:p-7"><div className="flex items-center gap-3"><FileText className="size-5 text-primary" /><h2 className="font-semibold">Quá trình Đảng</h2></div><PartyProcessRecordsSection canView={can('QUA_TRINH_DANG_XEM')} isPending={partyProcess.isPending} isError={partyProcess.isError} events={partyProcess.data ?? []} onRetry={() => void partyProcess.refetch()} /><PartyTrainingSection profileId={profileId} canView={can('DAO_TAO_DANG_XEM')} canCreate={can('DAO_TAO_DANG_TAO')} canEdit={can('DAO_TAO_DANG_SUA')} canViewDocuments={can('HO_SO_TAI_LIEU_XEM')} canUpload={can('HO_SO_TAI_LIEU_TAI_LEN')} canDownload={can('HO_SO_TAI_LIEU_TAI_XUONG')} events={partyProcess.data ?? []} /></CardContent></Card></TabsContent>
          <TabsContent value="audit" className="pt-5"><Card className="gap-0 py-0"><CardContent className="space-y-4 p-5 md:p-7"><div className="flex items-center gap-3"><History className="size-5 text-primary" /><h2 className="font-semibold">Lịch sử thay đổi hồ sơ</h2></div>{changeHistory.isPending ? <p role="status" className="text-sm text-muted-foreground">Đang tải lịch sử thay đổi…</p> : changeHistory.isError ? <div role="alert" className="space-y-2 text-sm text-destructive"><p>Không thể tải lịch sử thay đổi. Vui lòng kiểm tra quyền, phạm vi quản lý hoặc kết nối máy chủ.</p><Button variant="outline" onClick={() => void changeHistory.refetch()}>Thử tải lại</Button></div> : sortedAudit.length ? <><Table><TableHeader><TableRow><TableHead>STT</TableHead><TableHead>Thời điểm</TableHead><TableHead>Người thực hiện</TableHead><TableHead>Thao tác</TableHead><TableHead>Kết quả</TableHead><TableHead className="text-right">Chi tiết</TableHead></TableRow></TableHeader><TableBody>{visibleAudit.map((item, index) => <TableRow key={`${item.thoiDiem}-${index}`}><TableCell>{(Math.min(auditPage, auditPageCount) - 1) * auditPageSize + index + 1}</TableCell><TableCell>{new Date(item.thoiDiem).toLocaleString('vi-VN')}</TableCell><TableCell>{item.nguoiThucHien}</TableCell><TableCell>{tenHanhDong[item.hanhDong] ?? item.hanhDong.replaceAll('_', ' ')}</TableCell><TableCell><Badge variant={item.ketQua === 'THANH_CONG' ? 'secondary' : 'destructive'}>{tenKetQua[item.ketQua] ?? item.ketQua}</Badge></TableCell><TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => setSelectedAudit(item)}><Eye />Xem</Button></TableCell></TableRow>)}</TableBody></Table><div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground"><span>{sortedAudit.length} bản ghi</span><div className="flex items-center gap-2"><Button variant="outline" size="sm" disabled={auditPage <= 1} onClick={() => setAuditPage((page) => Math.max(1, page - 1))}>Trước</Button><span>Trang {Math.min(auditPage, auditPageCount)} / {auditPageCount}</span><Button variant="outline" size="sm" disabled={auditPage >= auditPageCount} onClick={() => setAuditPage((page) => Math.min(auditPageCount, page + 1))}>Sau</Button></div></div></> : <p className="text-sm text-muted-foreground">Chưa có nhật ký thay đổi hồ sơ.</p>}</CardContent></Card></TabsContent>
        </Tabs>
        <Dialog open={selectedAudit !== null} onOpenChange={(open) => { if (!open) setSelectedAudit(null) }}><DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle>Chi tiết thay đổi hồ sơ</DialogTitle><DialogDescription>{selectedAudit && `${new Date(selectedAudit.thoiDiem).toLocaleString('vi-VN')} · ${selectedAudit.nguoiThucHien} · ${tenHanhDong[selectedAudit.hanhDong] ?? selectedAudit.hanhDong.replaceAll('_', ' ')}`}</DialogDescription></DialogHeader>{selectedAudit && <div className="space-y-4"><Badge variant={selectedAudit.ketQua === 'THANH_CONG' ? 'secondary' : 'destructive'}>{tenKetQua[selectedAudit.ketQua] ?? selectedAudit.ketQua}</Badge>{selectedAudit.lyDo && <p className="text-sm">Lý do: {selectedAudit.lyDo}</p>}{auditChanges.length ? <Table><TableHeader><TableRow><TableHead>Thông tin</TableHead><TableHead>Giá trị trước</TableHead><TableHead>Giá trị sau</TableHead></TableRow></TableHeader><TableBody>{auditChanges.map((key) => <TableRow key={key}><TableCell className="whitespace-normal font-medium">{nhanTruong(key)}</TableCell><TableCell className="max-w-60 whitespace-normal break-words">{giaTriAudit(selectedAudit.duLieuTruoc?.[key])}</TableCell><TableCell className="max-w-60 whitespace-normal break-words">{giaTriAudit(selectedAudit.duLieuSau?.[key])}</TableCell></TableRow>)}</TableBody></Table> : <p className="text-sm text-muted-foreground">Bản ghi này không có thông tin thay đổi có thể hiển thị.</p>}</div>}</DialogContent></Dialog>
      </section>
    </div>
  </main>
}

