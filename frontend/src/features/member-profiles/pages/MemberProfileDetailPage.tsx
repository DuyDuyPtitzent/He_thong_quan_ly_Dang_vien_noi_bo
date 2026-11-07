import { useLayoutEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Bell, CalendarDays, CircleAlert, Ellipsis, FileText, GraduationCap, History, Landmark, Pencil, UserRound } from 'lucide-react'
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
import { Progress } from '@/shared/components/ui/progress'
import { memberProfilesApi } from '../api/member-profiles.api'
import type { LichSuThayDoi, PhanCongChucVu, QuaTrinhDang } from '../types/member-profiles.types'
import { MemberProfileAvatar } from '../components/MemberProfileAvatar'

const statusNames: Record<string, string> = { DU_BI: 'Đảng viên dự bị', CHINH_THUC: 'Đảng viên chính thức', DA_RA_KHOI_DANG: 'Đã ra khỏi Đảng', TU_TRAN: 'Đã từ trần' }
const statusVariants: Record<string, 'secondary' | 'default' | 'destructive' | 'outline'> = { DU_BI: 'secondary', CHINH_THUC: 'default', DA_RA_KHOI_DANG: 'destructive', TU_TRAN: 'outline' }
const date = (value?: string | null) => value ? new Date(value).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Chưa cập nhật'
const value = (input?: string | null) => input?.trim() || 'Chưa cập nhật'
const tenSuKien: Record<string, string> = { VAO_DANG_DU_BI: 'Vào Đảng dự bị' }
const tenTruong: Record<string, string> = { maHoSoNoiBo: 'Mã hồ sơ', hoVaTen: 'Họ và tên', trangThai: 'Trạng thái hồ sơ', trangThaiDangVien: 'Trạng thái Đảng viên', ngayVaoDang: 'Ngày vào Đảng' }
const hienThiGiaTri = (item: unknown) => item == null ? 'Chưa cập nhật' : typeof item === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(item) ? date(item) : String(item)

function DataRows({ rows, columns = 2 }: { rows: [string, string | null | undefined][]; columns?: 1 | 2 }) {
  return <dl className={columns === 1 ? 'grid' : 'grid gap-x-10 md:grid-cols-2'}>{rows.map(([label, content]) => <div key={label} className="grid min-h-14 grid-cols-[minmax(7rem,0.8fr)_minmax(0,1.2fr)] items-center gap-3 border-b py-3 last:border-0"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="min-w-0 break-words text-sm font-medium">{value(content)}</dd></div>)}</dl>
}

function ProcessItem({ item }: { item: QuaTrinhDang }) {
  const label = tenSuKien[item.loaiSuKien] ?? item.loaiSuKien.replaceAll('_', ' ').toLocaleLowerCase('vi')
  return <li className="relative pb-6 pl-8 last:pb-0"><span className="absolute left-1.5 top-1.5 size-2.5 rounded-full bg-primary ring-4 ring-background"/><h3 className="font-medium">{label}</h3><p className="mt-1 text-sm text-muted-foreground">Ngày sự kiện: {date(item.ngaySuKien)}</p><DataRows rows={[["Số quyết định", item.soQuyetDinh], ["Ngày quyết định", date(item.ngayQuyetDinh)], ["Đơn vị ban hành", item.donViBanHanhQuyetDinh], ["Người giới thiệu thứ nhất", item.nguoiGioiThieuThuNhat], ["Người giới thiệu thứ hai", item.nguoiGioiThieuThuHai], ["Người ghi nhận", item.nguoiGhiNhan?.tenDangNhap], ["Nội dung", item.moTa]]} /></li>
}

function PositionItem({ item }: { item: PhanCongChucVu }) {
  const state = item.trangThai === 'DANG_HIEU_LUC' ? 'Đang hiệu lực' : item.trangThai === 'SAP_HIEU_LUC' ? 'Sắp hiệu lực' : 'Đã kết thúc'
  return <article className="space-y-3 py-4 first:pt-0 last:pb-0"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-medium">{item.tenChucVu}</h3><Badge variant={item.trangThai === 'DANG_HIEU_LUC' ? 'default' : 'secondary'}>{state}</Badge></div><DataRows rows={[["Đơn vị", item.tenDonVi], ["Nhiệm kỳ", item.nhiemKy?.ten], ["Thời gian nhiệm kỳ", item.nhiemKy ? `${date(item.nhiemKy.ngayBatDau)} – ${date(item.nhiemKy.ngayKetThuc)}` : null], ["Bắt đầu phân công", date(item.ngayHieuLucTu)], ["Kết thúc phân công", date(item.ngayHieuLucDen)], ["Số quyết định", item.soQuyetDinh], ["Ghi chú", item.ghiChu]]} /></article>
}

function AuditItem({ item }: { item: LichSuThayDoi }) {
  const changes = [...new Set([...Object.keys(item.duLieuTruoc ?? {}), ...Object.keys(item.duLieuSau ?? {})])]
  return <article className="space-y-3 py-4 first:pt-0 last:pb-0"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-medium">{item.hanhDong === 'HO_SO_DANG_VIEN_TAO' ? 'Tạo hồ sơ' : item.hanhDong === 'HO_SO_DANG_VIEN_SUA' ? 'Cập nhật hồ sơ' : item.hanhDong}</h3><Badge variant={item.ketQua === 'THANH_CONG' ? 'secondary' : 'destructive'}>{item.ketQua === 'THANH_CONG' ? 'Thành công' : item.ketQua}</Badge></div><p className="text-sm text-muted-foreground">{new Date(item.thoiDiem).toLocaleString('vi-VN')} · {item.nguoiThucHien}</p>{item.lyDo && <p className="text-sm">Lý do: {item.lyDo}</p>}{changes.length > 0 && <dl className="space-y-2 rounded-md bg-muted/50 p-3">{changes.map((key) => <div key={key} className="grid gap-1 text-sm sm:grid-cols-[minmax(9rem,0.7fr)_1.3fr]"><dt className="text-muted-foreground">{tenTruong[key] ?? key}</dt><dd className="break-words">{hienThiGiaTri(item.duLieuTruoc?.[key])} → {hienThiGiaTri(item.duLieuSau?.[key])}</dd></div>)}</dl>}</article>
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
  const permissions = auth.taiKhoan?.quyenDangHoatDong ?? []
  const can = (permission: string) => permissions.includes(permission)
  const profileTabs: ProfileTab[] = [
    { value: 'party', label: 'Thông tin Đảng viên' },
    { value: 'personal', label: 'Thông tin cá nhân' },
    { value: 'student', label: 'Thông tin sinh viên' },
    ...(can('SINH_HOAT_XEM_LICH_SU') ? [{ value: 'membership', label: 'Sinh hoạt Đảng' }] : []),
    ...(can('PHAN_CONG_CHUC_VU_XEM') ? [{ value: 'positions', label: 'Chức vụ & Nhiệm kỳ' }] : []),
    ...(can('QUA_TRINH_DANG_XEM') ? [{ value: 'history', label: 'Quá trình Đảng' }] : []),
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
  const pastMemberships = (membershipHistory.data?.lichSu ?? []).filter((item) => item.ma !== currentMembership?.ma)
  const canPersonal = can('HO_SO_CA_NHAN_XEM') || can('HO_SO_CA_NHAN_SUA')
  const canAddress = can('HO_SO_DIA_CHI_XEM') || can('HO_SO_DIA_CHI_SUA')
  const canStudent = can('HO_SO_SINH_VIEN_XEM') || can('HO_SO_SINH_VIEN_SUA')
  const canCurrentMembership = can('SINH_HOAT_XEM_HIEN_TAI')
  const addressLabel = (kind: string) => ({ NOI_SINH: 'Nơi sinh', QUE_QUAN: 'Quê quán', THUONG_TRU: 'Nơi thường trú' }[kind] ?? kind)
  const addressRows = (profile.diaChi ?? []).map((address) => [addressLabel(address.loaiDiaChi), [address.phanLoaiNoiSinh === 'TRONG_NUOC' ? 'Trong nước' : address.phanLoaiNoiSinh === 'NUOC_NGOAI' ? 'Nước ngoài' : null, address.diaChiChiTiet, address.xaPhuong, address.quanHuyen, address.tinhThanhPho, address.quocGia].filter(Boolean).join(', ') || 'Chưa cập nhật'] as [string, string])
  const branchName = currentUnit?.chiBo?.tenDonVi?.[0]?.ten ?? currentUnit?.chiBo?.maDinhDanh ?? currentUnit?.maChiBo
  const groupName = currentUnit?.to?.tenDonVi?.[0]?.ten ?? currentUnit?.to?.maDinhDanh ?? currentUnit?.maTo
  const requiredProfileValues = [profile.maHoSoNoiBo, profile.hoVaTen, profile.trangThaiDangVien, currentUnit?.maChiBo, currentUnit?.ngayHieuLucTu]
  const completedRequiredValues = requiredProfileValues.filter((item) => item != null && String(item).trim() !== '').length
  const completion = Math.round(completedRequiredValues / requiredProfileValues.length * 100)

  return <main className="space-y-5 pb-8">
    <Breadcrumb><BreadcrumbList><BreadcrumbItem><BreadcrumbLink asChild><Link to="/">Trang chủ</Link></BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbLink asChild><Link to="/ho-so-dang-vien">Hồ sơ Đảng viên</Link></BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbPage>{profile.maHoSoNoiBo}</BreadcrumbPage></BreadcrumbItem></BreadcrumbList></Breadcrumb>
    <PageHeader title="Chi tiết hồ sơ Đảng viên" actions={actions} />

    <Card className="gap-0 py-0"><CardContent className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:p-8">
      <MemberProfileAvatar name={profile.hoVaTen} profileId={profileId} className="size-24 shrink-0 border-4 border-muted bg-primary/5 text-2xl text-primary" />
      <div className="min-w-0 flex-1 space-y-3"><div className="flex flex-wrap items-center gap-3"><h2 className="text-2xl font-semibold">{profile.hoVaTen}</h2><Badge variant={statusVariants[profile.trangThaiDangVien ?? ''] ?? 'outline'}>{statusNames[profile.trangThaiDangVien ?? ''] ?? 'Chưa cập nhật trạng thái'}</Badge></div><p className="text-sm text-muted-foreground">Mã hồ sơ: <span className="font-medium text-foreground">{profile.maHoSoNoiBo}</span>{canCurrentMembership && <><span className="px-2">·</span>Chi bộ sinh hoạt: <span className="font-medium text-foreground">{branchName ?? 'Chưa ghi nhận'}</span>{currentUnit?.maTo && <><span className="px-2">·</span>Tổ: <span className="font-medium text-foreground">{groupName}</span></>}</>}</p><div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground"><span className="inline-flex items-center gap-2"><CalendarDays className="size-4" />Ngày vào Đảng: {date(profile.ngayVaoDang)}</span>{canCurrentMembership && <span className="inline-flex items-center gap-2"><Landmark className="size-4" />Sinh hoạt từ: {date(currentUnit?.ngayHieuLucTu)}</span>}</div>{canCurrentMembership && <div className="space-y-1.5 pt-1"><div className="flex items-center justify-between gap-3 text-sm"><span className="text-muted-foreground">Mức độ hoàn thiện hồ sơ</span><span className="font-medium">{completion}% <span className="font-normal text-muted-foreground">({completedRequiredValues}/5 thông tin bắt buộc)</span></span></div><Progress value={completion} role="progressbar" aria-label={`Mức độ hoàn thiện hồ sơ: ${completion}%`} aria-valuenow={completion} aria-valuemin={0} aria-valuemax={100} /></div>}</div>
    </CardContent></Card>

    <div className="grid gap-5 xl:grid-cols-[minmax(16rem,0.28fr)_minmax(0,1fr)]">
      <aside className="space-y-4">
        <Card className="gap-0 py-0"><CardContent className="space-y-4 p-5"><h2 className="font-semibold">Sinh hoạt hiện tại</h2>{canCurrentMembership ? <DataRows columns={1} rows={[["Đảng ủy", currentUnit?.tenDangUy], ["Chi bộ", branchName], ["Tổ", groupName], ["Bắt đầu từ", date(currentUnit?.ngayHieuLucTu)], ["Số phiếu lý lịch", profile.soPhieuLyLich], ["Số thẻ Đảng viên", profile.soTheDangVien], ["Trạng thái hồ sơ", profile.trangThai === 'DANG_HOAT_DONG' ? 'Đang hoạt động' : profile.trangThai]]} /> : <p className="text-sm text-muted-foreground">Bạn không có quyền xem thông tin sinh hoạt hiện tại.</p>}</CardContent></Card>
        <Card className="gap-0 py-0"><CardContent className="space-y-3 p-5"><h2 className="font-semibold">Thao tác nhanh</h2><div className="grid gap-2">{can('HO_SO_DANG_VIEN_XEM_TONG_QUAN') && <Button variant="outline" className="w-full justify-start" onClick={() => toast.info('Chức năng đang phát triển')}><Bell />Gửi thông báo nhanh</Button>}{can('HO_SO_DANG_VIEN_SUA_THONG_TIN_CO_BAN') && <Button className="w-full justify-start" onClick={() => navigate('/ho-so-dang-vien', { state: { editProfileId: profileId } })}><Pencil />Chỉnh sửa hồ sơ</Button>}{can('HO_SO_XEM_LICH_SU_THAY_DOI') && <Button variant="outline" className="w-full justify-start" onClick={() => setTab('audit')}><History />Xem lịch sử hồ sơ</Button>}</div></CardContent></Card>
      </aside>

      <section className="min-w-0 space-y-4">
        <Tabs value={tab} onValueChange={setTab}>
          <ResponsiveProfileTabsList tabs={profileTabs} activeTab={tab} onTabChange={setTab} />
          <TabsContent value="party" className="pt-5"><Card className="gap-0 py-0"><CardContent className="space-y-4 p-5 md:p-7"><div className="flex items-center gap-3"><Landmark className="size-5 text-primary" /><h2 className="font-semibold">Thông tin Đảng viên</h2></div><DataRows rows={[["Mã hồ sơ", profile.maHoSoNoiBo], ["Số phiếu lý lịch", profile.soPhieuLyLich], ["Số thẻ Đảng viên", profile.soTheDangVien], ["Khóa Đảng viên", profile.khoaDangVien], ["Loại Đảng viên", statusNames[profile.trangThaiDangVien ?? '']], ["Ngày vào Đảng", date(profile.ngayVaoDang)], ["Ngày chính thức", date(profile.ngayChinhThuc)], ["Số quyết định kết nạp", admission?.soQuyetDinh], ["Ngày quyết định", date(admission?.ngayQuyetDinh)], ["Đơn vị ban hành", admission?.donViBanHanhQuyetDinh], ["Người giới thiệu thứ nhất", admission?.nguoiGioiThieuThuNhat], ["Người giới thiệu thứ hai", admission?.nguoiGioiThieuThuHai]]} /></CardContent></Card></TabsContent>
          <TabsContent value="personal" className="pt-5"><Card className="gap-0 py-0"><CardContent className="space-y-4 p-5 md:p-7"><div className="flex items-center gap-3"><UserRound className="size-5 text-primary" /><h2 className="font-semibold">Thông tin cá nhân</h2></div>{canPersonal ? <DataRows rows={[["Họ và tên", profile.hoVaTen], ["Ngày sinh", date(personal?.ngaySinh)], ["Giới tính", personal?.gioiTinh], ["Số CCCD", personal?.soCccd], ["Ngày cấp CCCD", date(personal?.ngayCapCccd)], ["Nơi cấp CCCD", personal?.noiCapCccd], ["Quốc tịch", personal?.quocTich], ["Dân tộc", personal?.danToc], ["Tôn giáo", personal?.tonGiao], ["Số điện thoại", personal?.soDienThoai], ["Thư điện tử liên hệ", personal?.emailLienHe]]} /> : <p className="rounded-md bg-muted p-4 text-sm text-muted-foreground">Bạn không có quyền xem thông tin cá nhân của hồ sơ này.</p>}{canAddress && <><h3 className="pt-4 font-medium">Địa chỉ</h3><DataRows rows={addressRows} /></>}</CardContent></Card></TabsContent>
          <TabsContent value="student" className="pt-5"><Card className="gap-0 py-0"><CardContent className="space-y-4 p-5 md:p-7"><div className="flex items-center gap-3"><GraduationCap className="size-5 text-primary" /><h2 className="font-semibold">Thông tin sinh viên</h2></div>{!canStudent ? <p className="rounded-md bg-muted p-4 text-sm text-muted-foreground">Bạn không có quyền xem thông tin sinh viên của hồ sơ này.</p> : student ? <DataRows rows={[["Mã sinh viên", student.maSinhVien], ["Khóa học", student.khoaHoc], ["Đơn vị phụ trách", student.donViPhuTrach], ["Chương trình đào tạo", student.chuongTrinhDaoTao], ["Ngành", student.nganh], ["Chuyên ngành", student.chuyenNganh], ["Lớp hành chính", student.lopHanhChinh], ["Trạng thái học tập", student.trangThaiHocTap]]} /> : <p className="rounded-md bg-muted p-4 text-sm text-muted-foreground">Hồ sơ này chưa có thông tin sinh viên liên kết.</p>}</CardContent></Card></TabsContent>
          <TabsContent value="membership" className="pt-5"><Card className="gap-0 py-0"><CardContent className="space-y-5 p-5 md:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-3"><Landmark className="size-5 text-primary"/><h2 className="text-lg font-semibold">Sinh hoạt Đảng</h2></div><p className="mt-1 text-sm text-muted-foreground">Thông tin chi tiết của {profile.hoVaTen}</p></div><Badge variant="secondary">Chỉ xem</Badge></div>{membershipHistory.isPending ? <p role="status" className="py-8 text-center text-sm text-muted-foreground">Đang tải thông tin sinh hoạt…</p> : membershipHistory.isError ? <div role="alert" className="space-y-2 text-sm text-destructive"><p>Không thể tải thông tin sinh hoạt.</p><Button variant="outline" onClick={() => void membershipHistory.refetch()}>Thử tải lại</Button></div> : <>{canCurrentMembership ? <DataRows columns={1} rows={[["Đảng ủy", currentMembership?.tenDangUy ?? "Chưa ghi nhận Đảng ủy"], ["Chi bộ hiện tại", currentMembership?.tenChiBo ?? "Chưa ghi nhận Chi bộ"], ["Tổ sinh hoạt", currentMembership?.tenTo ?? "Chưa phân tổ"], ["Bắt đầu sinh hoạt", date(currentMembership?.ngayHieuLucTu)], ["Trạng thái sinh hoạt", currentMembership ? "Đang sinh hoạt" : "Chưa ghi nhận sinh hoạt hiện tại"]]} /> : <p className="text-sm text-muted-foreground">Bạn không có quyền xem thông tin sinh hoạt hiện tại.</p>}<div className="space-y-4 border-t pt-5"><h3 className="text-lg font-semibold">Lịch sử chuyển sinh hoạt</h3>{pastMemberships.length ? <ol className="relative space-y-0 before:absolute before:bottom-4 before:left-2 before:top-2 before:w-px before:bg-border">{pastMemberships.map((item) => <li key={item.ma} className="relative pb-6 pl-8 last:pb-0"><span className="absolute left-1.5 top-1.5 size-2.5 rounded-full bg-primary ring-4 ring-background"/><h4 className="font-medium">{item.tenChiBo ?? "Chưa xác định Chi bộ"}{item.tenTo ? ` · ${item.tenTo}` : " · Chưa phân tổ"}</h4><p className="mt-1 text-sm text-muted-foreground">{date(item.ngayHieuLucTu)} – {date(item.ngayHieuLucDen)}</p>{item.lyDoChuyen && <p className="mt-1 text-sm">Lý do chuyển: {item.lyDoChuyen}</p>}</li>)}</ol> : <div className="flex items-start gap-3 py-4 text-sm text-muted-foreground"><History className="mt-0.5 size-5 shrink-0"/><p>Chưa có dữ liệu lịch sử chuyển sinh hoạt được ghi nhận.</p></div>}</div></>}</CardContent></Card></TabsContent>
          <TabsContent value="positions" className="pt-5"><Card className="gap-0 py-0"><CardContent className="space-y-4 p-5 md:p-7"><div className="flex items-center gap-3"><Landmark className="size-5 text-primary" /><h2 className="font-semibold">Chức vụ và nhiệm kỳ</h2></div>{positions.isPending ? <p role="status" className="text-sm text-muted-foreground">Đang tải phân công…</p> : positions.isError ? <div role="alert" className="space-y-2 text-sm text-destructive"><p>Không thể tải danh sách phân công.</p><Button variant="outline" onClick={() => void positions.refetch()}>Thử tải lại</Button></div> : positions.data?.length ? <div className="divide-y">{positions.data.map((item) => <PositionItem key={item.ma} item={item} />)}</div> : <p className="text-sm text-muted-foreground">Chưa có phân công chức vụ được ghi nhận.</p>}</CardContent></Card></TabsContent>
          <TabsContent value="history" className="pt-5"><Card className="gap-0 py-0"><CardContent className="space-y-4 p-5 md:p-7"><div className="flex items-center gap-3"><FileText className="size-5 text-primary" /><h2 className="font-semibold">Quá trình Đảng</h2></div>{partyProcess.isPending ? <p role="status" className="text-sm text-muted-foreground">Đang tải quá trình Đảng…</p> : partyProcess.isError ? <div role="alert" className="space-y-2 text-sm text-destructive"><p>Không thể tải quá trình Đảng.</p><Button variant="outline" onClick={() => void partyProcess.refetch()}>Thử tải lại</Button></div> : partyProcess.data?.length ? <ol className="relative space-y-0 before:absolute before:bottom-4 before:left-2 before:top-2 before:w-px before:bg-border">{partyProcess.data.map((item) => <ProcessItem key={item.ma} item={item} />)}</ol> : <p className="text-sm text-muted-foreground">Chưa có sự kiện quá trình Đảng được ghi nhận.</p>}</CardContent></Card></TabsContent>
          <TabsContent value="audit" className="pt-5"><Card className="gap-0 py-0"><CardContent className="space-y-4 p-5 md:p-7"><div className="flex items-center gap-3"><History className="size-5 text-primary" /><h2 className="font-semibold">Lịch sử thay đổi hồ sơ</h2></div>{changeHistory.isPending ? <p role="status" className="text-sm text-muted-foreground">Đang tải lịch sử thay đổi…</p> : changeHistory.isError ? <div role="alert" className="space-y-2 text-sm text-destructive"><p>Không thể tải lịch sử thay đổi.</p><Button variant="outline" onClick={() => void changeHistory.refetch()}>Thử tải lại</Button></div> : changeHistory.data?.length ? <div className="divide-y">{changeHistory.data.map((item, index) => <AuditItem key={`${item.thoiDiem}-${index}`} item={item} />)}</div> : <p className="text-sm text-muted-foreground">Chưa có nhật ký thay đổi hồ sơ.</p>}</CardContent></Card></TabsContent>
        </Tabs>
        <div className="flex items-start gap-2 rounded-md border bg-muted/40 p-4 text-sm text-muted-foreground"><CircleAlert className="mt-0.5 size-4 shrink-0" /><p>Chỉ những mục có quyền tương ứng mới xuất hiện. Nội dung lịch sử lấy từ bản ghi thực tế và không tạo sự kiện thay thế.</p></div>
      </section>
    </div>
  </main>
}

