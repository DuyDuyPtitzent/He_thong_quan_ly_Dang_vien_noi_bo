import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BadgeCheck, CalendarDays, CircleAlert, FileText, GraduationCap, History, Landmark, Pencil, Send, UserRound } from 'lucide-react'
import { memberProfilesApi } from '@/features/member-profiles/api/member-profiles.api'
import type { HoSoChiTiet } from '@/features/member-profiles/types/member-profiles.types'
import { PartyProcessRecordsSection, PositionAssignmentsSection } from '@/features/member-profiles/components/MemberProfileDetailSections'
import { OutsideMembershipSection, PartyTrainingSection } from '@/features/member-profiles/components/MemberProfileSupplementarySections'
import { formatMemberProfileDate as date, formatMemberProfileEnum as enumLabel } from '@/features/member-profiles/services/member-profile-display.service'
import { myProfileApi } from '../api/my-profile.api'
import { MyProfileAvatar } from '../components/MyProfileAvatar'
import { useAuth } from '@/core/auth/auth-context'
import { normalizeApiError } from '@/core/api/client'
import { PageHeader } from '@/shared/components/PageHeader'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/shared/components/ui/breadcrumb'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { RichTextContent } from '@/shared/components/RichTextContent'
import { EmptyState } from '@/shared/components/EmptyState'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
import { DatePicker } from '@/shared/components/date-time'
import { MemberProfileCompletion } from '@/features/member-profiles/components/MemberProfileCompletion'
import { profileCompletionFieldId, tinhTienDoHoSo } from '@/features/member-profiles/services/profile-completion.service'

const show = (value?: string | null) => value?.trim() || 'Chưa cập nhật'
type FieldRenderer = (key: string, label: string, value: string | null | undefined) => ReactNode
function Rows({ rows, renderField }: { rows: [string, string | null | undefined, string?][]; renderField?: FieldRenderer }) {
  return <dl className="grid gap-x-10 md:grid-cols-2">{rows.map(([label, value, field]) => <div id={field ? profileCompletionFieldId(field) : undefined} key={label} className="grid min-h-14 grid-cols-[minmax(8rem,0.8fr)_minmax(0,1.2fr)] items-center gap-3 border-b py-3 last:border-0 transition-colors"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="min-w-0 break-words text-sm font-medium">{field && renderField ? renderField(field, label, value) : show(value)}</dd></div>)}</dl>
}
function Section({ title, icon: Icon, children }: { title: string; icon: typeof UserRound; children: ReactNode }) {
  return <Card className="gap-0 py-0"><CardContent className="space-y-5 p-5 md:p-7"><div className="flex items-center gap-3"><Icon className="size-5 text-primary"/><h2 className="text-lg font-semibold">{title}</h2></div>{children}</CardContent></Card>
}
const fieldLabelsForDialog: Record<string, string> = {
  hoVaTen: 'Họ và tên', khoaDangVien: 'Khóa Đảng viên', 'thongTinCaNhan.ngaySinh': 'Ngày sinh', 'thongTinCaNhan.gioiTinh': 'Giới tính',
  'thongTinCaNhan.soCccd': 'Số căn cước công dân', 'thongTinCaNhan.ngayCapCccd': 'Ngày cấp căn cước công dân',
  'thongTinCaNhan.noiCapCccd': 'Nơi cấp căn cước công dân', 'thongTinCaNhan.quocTich': 'Quốc tịch',
  'thongTinCaNhan.danToc': 'Dân tộc', 'thongTinCaNhan.tonGiao': 'Tôn giáo', 'thongTinCaNhan.soDienThoai': 'Số điện thoại',
  'thongTinCaNhan.soDienThoaiBoNguoiNuoiDuong': 'Số điện thoại bố/người nuôi dưỡng', 'thongTinCaNhan.soDienThoaiMeNguoiNuoiDuong': 'Số điện thoại mẹ/người nuôi dưỡng',
  'thongTinCaNhan.emailLienHe': 'Thư điện tử', 'diaChi.NOI_SINH': 'Nơi sinh, cấp giấy khai sinh', 'diaChi.QUE_QUAN': 'Quê quán',
  'diaChi.THUONG_TRU': 'Địa chỉ thường trú', 'diaChi.NOI_O_HIEN_NAY': 'Nơi ở hiện nay',
}
function InlineUpdateFlow({ profile, children }: { profile: HoSoChiTiet; children: (renderField: FieldRenderer, submitError: ReactNode, activeTab: string, setActiveTab: (value: string) => void, onSelectMissingField: (field: string) => void) => ReactNode }) {
  const auth = useAuth()
  const permissions = auth.taiKhoan?.quyenDangHoatDong ?? []
  const can = (key: string) => permissions.includes(key)
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<string | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [dialogOpen, setDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('personal')
  const [scrollToField, setScrollToField] = useState<string | null>(null)
  const windowQuery = useQuery({ queryKey: ['my-profile-update-window'], queryFn: myProfileApi.updateWindow, enabled: can('HO_SO_CA_NHAN_TU_CAP_NHAT'), retry: false, refetchInterval: (query) => query.state.data?.dotCapNhat?.trangThai === 'DANG_MO' ? 15_000 : false })
  const requests = useQuery({ queryKey: ['my-profile-update-requests'], queryFn: myProfileApi.updateRequests, enabled: can('HO_SO_CA_NHAN_TU_CAP_NHAT'), retry: false })
  const [clock, setClock] = useState(() => Date.now())
  const submit = useMutation({ mutationFn: () => myProfileApi.submitUpdateRequest(changes), onSuccess: async () => { setEditing(null); setValues({}); setDialogOpen(false); await Promise.all([queryClient.invalidateQueries({ queryKey: ['my-member-profile'] }), queryClient.invalidateQueries({ queryKey: ['my-profile-update-requests'] }), queryClient.invalidateQueries({ queryKey: ['my-profile-update-window'] })]) }, onError: () => setDialogOpen(false) })
  const window = windowQuery.data?.dotCapNhat
  useEffect(() => {
    if (!window || window.trangThai !== 'DANG_MO') return
    const remaining = new Date(window.ngayKetThuc).getTime() - Date.now()
    if (remaining <= 0) return
    const timer = globalThis.setTimeout(() => setClock(Date.now()), remaining)
    return () => globalThis.clearTimeout(timer)
  }, [window])
  useEffect(() => {
    if (!scrollToField) return
    const frame = globalThis.requestAnimationFrame(() => {
      const target = document.getElementById(profileCompletionFieldId(scrollToField))
      if (target) {
        target.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
        target.classList.add('rounded-md', 'bg-accent/60', 'ring-2', 'ring-primary/40')
        globalThis.setTimeout(() => target.classList.remove('bg-accent/60', 'ring-2', 'ring-primary/40'), 1800)
      }
      setScrollToField(null)
    })
    return () => globalThis.cancelAnimationFrame(frame)
  }, [scrollToField, activeTab])
  const pending = requests.data?.find((item) => item.trangThai === 'CHO_DUYET')
  const personal = profile.thongTinCaNhan
  const currentValue = (field: string) => {
    if (field === 'hoVaTen') return profile.hoVaTen
    if (field === 'khoaDangVien') return profile.khoaDangVien ?? ''
    if (field.startsWith('thongTinCaNhan.')) {
      const key = field.split('.')[1] as keyof NonNullable<typeof personal>
      const value = personal?.[key]
      return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) ? value.slice(0, 10) : value ?? ''
    }
    if (field.startsWith('diaChi.')) {
      const type = field.split('.')[1]
      const row = profile.diaChi?.find((item) => item.loaiDiaChi === type)
      return row?.diaChiChiTiet ?? ''
    }
    return ''
  }
  const allowed = window?.cacTruongDuocPhep ?? []
  const canEditField = (field: string) => allowed.includes(field) && can('HO_SO_CA_NHAN_TU_CAP_NHAT') && window?.trangThai === 'DANG_MO' && !pending && !windowQuery.isPending && !requests.isPending
  const onSelectMissingField = (field: string) => {
    const tab = field.startsWith('thongTinSinhVien.') ? 'student' : field.startsWith('thongTinDangVien.') || ['maHoSoNoiBo', 'soPhieuLyLich', 'soTheDangVien', 'khoaDangVien', 'trangThaiDangVien', 'ngayVaoDang', 'ngayChinhThuc'].includes(field) ? 'party' : 'personal'
    setActiveTab(tab)
    setScrollToField(field)
  }
  const changes = Object.fromEntries(Object.entries(values).filter(([field, value]) => value !== currentValue(field)).map(([field, value]) => [field, field.startsWith('diaChi.') ? { diaChiChiTiet: value || null } : value || null]))
  const latest = requests.data?.[0]
  const campaignIsOpen = window?.trangThai === 'DANG_MO' && clock >= new Date(window.ngayBatDau).getTime() && clock < new Date(window.ngayKetThuc).getTime()
  const openCampaignId = campaignIsOpen ? window?.ma : undefined
  const approvedRequestsInOpenCampaign = openCampaignId ? requests.data?.filter((item) => item.trangThai === 'DA_DUYET' && item.maDotCapNhat === openCampaignId).slice(0, 1) : []
  const pendingValues = pending?.giaTriDeNghi ?? {}
  const draftCount = Object.keys(changes).length
  const activeWindowAlert = can('HO_SO_CA_NHAN_TU_CAP_NHAT') && !windowQuery.isPending && !requests.isPending && !windowQuery.isError && !requests.isError && window?.trangThai === 'DANG_MO' ? <Alert variant="success"><CalendarDays/><AlertTitle>Đang mở cập nhật hồ sơ · {window.ten}</AlertTitle><AlertDescription><span className="block">Thời gian: {date(window.ngayBatDau)} – {date(window.ngayKetThuc)}.</span><span className="mt-1 block">Bạn có thể đề nghị chỉnh sửa các thông tin được cấp trên cho phép. Những thay đổi chỉ có hiệu lực sau khi Chi bộ phê duyệt.</span></AlertDescription></Alert> : null
  const statusAlerts = <div className="space-y-3">
    {!can('HO_SO_CA_NHAN_TU_CAP_NHAT') ? <Alert variant="warning"><CircleAlert/><AlertTitle>Hồ sơ của bạn</AlertTitle><AlertDescription>Bạn chưa được cấp quyền gửi đề nghị cập nhật hồ sơ.</AlertDescription></Alert> : windowQuery.isPending || requests.isPending ? <Alert><CalendarDays/><AlertTitle>Thông tin đợt cập nhật</AlertTitle><AlertDescription role="status">Đang tải thời hạn và trạng thái yêu cầu của bạn…</AlertDescription></Alert> : windowQuery.isError || requests.isError ? <Alert variant="destructive"><CircleAlert/><AlertTitle>Chưa tải được trạng thái cập nhật</AlertTitle><AlertDescription>Không thể lấy thông tin đợt hoặc yêu cầu. Hãy tải lại trang để thử lại.</AlertDescription></Alert> : window && window.trangThai !== 'DANG_MO' ? <Alert variant="warning"><CalendarDays/><AlertTitle>{window.trangThai === 'CHUA_BAT_DAU' ? 'Đợt cập nhật sắp diễn ra' : 'Đợt cập nhật đã kết thúc'} · {window.ten}</AlertTitle><AlertDescription><span className="block">Thời gian: {date(window.ngayBatDau)} – {date(window.ngayKetThuc)}.</span><span className="mt-1 block">Các trường chỉ có thể được đề nghị cập nhật trong thời gian đợt mở.</span></AlertDescription></Alert> : !window && !windowQuery.isPending && !windowQuery.isError && can('HO_SO_CA_NHAN_TU_CAP_NHAT') ? <Alert variant="warning"><CalendarDays/><AlertTitle>Hiện chưa có đợt cập nhật hồ sơ</AlertTitle><AlertDescription>Khi Chi bộ mở đợt mới, thông tin thời hạn và các trường được phép đề nghị sẽ hiển thị tại đây.</AlertDescription></Alert> : null}
    {submit.isError && <Alert variant="destructive"><CircleAlert/><AlertTitle>Không gửi được yêu cầu</AlertTitle><AlertDescription>{normalizeApiError(submit.error).message || 'Vui lòng kiểm tra dữ liệu và thử lại.'}</AlertDescription></Alert>}
    {pending && <Alert variant="warning"><CalendarDays/><AlertTitle>Yêu cầu đang chờ Chi bộ phê duyệt</AlertTitle><AlertDescription>Các giá trị đề nghị được lưu trên máy chủ. Hồ sơ chính thức vẫn giữ nguyên cho đến khi được duyệt.</AlertDescription></Alert>}
    {latest?.trangThai === 'DA_TU_CHOI' && <Alert variant="destructive"><CircleAlert/><AlertTitle>Yêu cầu gần nhất đã bị từ chối</AlertTitle><AlertDescription>{latest.lyDoXuLy ? <><p>Lý do:</p><RichTextContent html={latest.lyDoXuLy}/></> : 'Chi bộ chưa ghi lý do từ chối.'}</AlertDescription></Alert>}
    {approvedRequestsInOpenCampaign?.map((item) => <Alert key={item.ma} variant="success"><BadgeCheck/><AlertTitle>Yêu cầu cập nhật đã được phê duyệt</AlertTitle><AlertDescription>Hồ sơ chính thức đã được cập nhật theo đề nghị.</AlertDescription></Alert>)}
  </div>
  const displayProposal = (value: unknown) => typeof value === 'string' ? value : value && typeof value === 'object' ? Object.values(value).filter((part) => typeof part === 'string' && part).join(', ') || 'Chưa cập nhật' : 'Chưa cập nhật'
  const renderField: FieldRenderer = (field, label, official) => {
    const editable = canEditField(field)
    const proposed = pending ? pendingValues[field] : changes[field]
    const hasProposal = proposed !== undefined
    const isEditing = editing === field
    const type = field.endsWith('.ngaySinh') || field.endsWith('.ngayCapCccd') ? 'date' : field.endsWith('.emailLienHe') ? 'email' : field.includes('.soDienThoai') ? 'tel' : 'text'
    if (isEditing) return <div className="space-y-2">{type === 'date' ? <DatePicker id={`update-${field}`} aria-label={`Giá trị đề nghị: ${label}`} value={(values[field] ?? currentValue(field)) || undefined} onChange={(value) => setValues((state) => ({ ...state, [field]: value ?? '' }))} /> : <Input autoFocus id={`update-${field}`} aria-label={`Giá trị đề nghị: ${label}`} type={type} value={values[field] ?? currentValue(field)} onChange={(event) => setValues((state) => ({ ...state, [field]: event.target.value }))} maxLength={field === 'hoVaTen' ? 200 : 500}/>}<div className="flex flex-wrap gap-2"><Button size="sm" onClick={() => setEditing(null)}>Ghi nhận đề nghị</Button><Button size="sm" variant="outline" onClick={() => { setEditing(null); setValues((state) => { const next = { ...state }; delete next[field]; return next }) }}>Hủy</Button></div></div>
    return <div className="space-y-1"><div className="flex items-start justify-between gap-2"><p className="min-w-0 break-words">{show(official)}</p>{editable && <Button type="button" variant="ghost" size="icon" className="-my-2 size-10 shrink-0" aria-label={`Sửa ${label}`} onClick={() => { setEditing(field); setValues((state) => ({ ...state, [field]: currentValue(field) })) }}><Pencil aria-hidden="true"/></Button>}</div>{hasProposal && <div className="rounded-md bg-muted/60 p-2 text-xs"><p><span className="font-medium">Giá trị đề nghị:</span> {displayProposal(proposed)}</p><p className="mt-1 text-muted-foreground">Giá trị hiện tại: {show(official)}</p><Badge variant={pending ? 'outline' : 'secondary'} className="mt-2">{pending ? 'Chờ phê duyệt' : 'Chưa gửi'}</Badge></div>}</div>
  }
  return <>
    {activeWindowAlert}
    {children(renderField, statusAlerts, activeTab, setActiveTab, onSelectMissingField)}
    {draftCount > 0 && !pending && <div className="flex justify-end"><Button className="min-h-11" onClick={() => setDialogOpen(true)} disabled={!window || window.trangThai !== 'DANG_MO' || editing !== null || submit.isPending}><Send/>Lưu thay đổi</Button></div>}
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent><DialogHeader><DialogTitle>Xác nhận lưu và gửi đề nghị</DialogTitle><DialogDescription><span className="block"><strong>{draftCount} trường</strong> đã thay đổi và chưa được gửi.</span><span className="mt-2 block">Giá trị đề nghị:</span><span className="mt-1 block">{Object.keys(changes).map((field) => fieldLabelsForDialog[field] ?? field).join(', ')}</span><span className="mt-2 block">Đề nghị sẽ được chuyển đến Chi bộ phê duyệt. Hồ sơ chính thức chưa thay đổi cho đến khi được duyệt.</span></DialogDescription></DialogHeader><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="outline" onClick={() => setDialogOpen(false)}>Quay lại chỉnh sửa</Button><Button onClick={() => submit.mutate()} disabled={submit.isPending}><Send/>{submit.isPending ? 'Đang gửi…' : 'Xác nhận gửi'}</Button></div></DialogContent></Dialog>
  </>
}
function CurrentUnit({ profile }: { profile: HoSoChiTiet }) {
  const item = profile.lichSuDonVi?.[0]
  if (!item) return <EmptyState title="Chưa có thông tin sinh hoạt hiện tại" description="Hồ sơ chưa ghi nhận đơn vị sinh hoạt đang có hiệu lực." />
  return <Rows rows={[["Đảng ủy", item.tenDangUy], ["Chi bộ", item.chiBo?.tenDonVi?.[0]?.ten ?? item.chiBo?.maDinhDanh], ["Tổ", item.to?.tenDonVi?.[0]?.ten ?? item.to?.maDinhDanh], ["Bắt đầu từ", date(item.ngayHieuLucTu)]]}/>
}
function ProfileContent({ profile, renderField, statusAlerts, activeTab, setActiveTab }: { profile: HoSoChiTiet; renderField: FieldRenderer; statusAlerts: ReactNode; activeTab: string; setActiveTab: (value: string) => void }) {
  const auth = useAuth()
  const permissions = auth.taiKhoan?.quyenDangHoatDong ?? []
  const can = (permission: string) => permissions.includes(permission)
  const canPersonal = can('HO_SO_CA_NHAN_XEM') || can('HO_SO_CA_NHAN_SUA')
  const canAddress = can('HO_SO_DIA_CHI_XEM') || can('HO_SO_DIA_CHI_SUA')
  const canStudent = can('HO_SO_SINH_VIEN_XEM') || can('HO_SO_SINH_VIEN_SUA')
  const membership = useQuery({ queryKey: ['my-member-profile-membership', profile.ma], queryFn: () => memberProfilesApi.membershipHistory(profile.ma), enabled: can('SINH_HOAT_XEM_LICH_SU') })
  const process = useQuery({ queryKey: ['my-member-profile-process', profile.ma], queryFn: () => memberProfilesApi.partyProcess(profile.ma), enabled: can('QUA_TRINH_DANG_XEM') })
  const positions = useQuery({ queryKey: ['my-member-profile-positions', profile.ma], queryFn: () => memberProfilesApi.positionAssignments(profile.ma), enabled: can('PHAN_CONG_CHUC_VU_XEM') })
  const tabs = [
    { id: 'personal', label: 'Thông tin cá nhân' },
    { id: 'student', label: 'Thông tin sinh viên' },
    { id: 'party', label: 'Thông tin Đảng viên' },
    { id: 'process', label: 'Quá trình Đảng' },
    { id: 'membership-history', label: 'Lịch sử chuyển sinh hoạt' },
    { id: 'position', label: 'Chức vụ và nhiệm kỳ' },
  ]
  const personal = profile.thongTinCaNhan
  const address = (type: string) => profile.diaChi?.find((item) => item.loaiDiaChi === type)
  const addressText = (type: string) => { const item = address(type); return item ? [item.diaChiChiTiet, item.xaPhuong, item.quanHuyen, item.tinhThanhPho, item.quocGia].filter(Boolean).join(', ') : null }
  const student = profile.thongTinSinhVien
  return <Tabs value={activeTab} onValueChange={setActiveTab} className="min-w-0">
    <TabsList variant="line" className="grid h-auto w-full min-w-0 grid-cols-2 gap-x-1 gap-y-0 rounded-none border-b bg-transparent p-0 sm:grid-cols-3 xl:grid-cols-6">
      {tabs.map(({ id, label }) => <TabsTrigger key={id} value={id} className="min-h-11 min-w-0 rounded-none px-2 py-2 text-center text-xs leading-tight sm:px-3 sm:text-sm xl:whitespace-nowrap">{label}</TabsTrigger>)}
    </TabsList>
    {statusAlerts}
    <TabsContent value="personal" className="pt-5">
      <Section title="Thông tin cá nhân" icon={UserRound}>
        {!canPersonal ? <p className="text-sm text-muted-foreground">Bạn không có quyền truy cập thông tin này.</p> : <Rows renderField={renderField} rows={[["Họ và tên", profile.hoVaTen, 'hoVaTen'], ["Ngày sinh", date(personal?.ngaySinh), 'thongTinCaNhan.ngaySinh'], ["Giới tính", enumLabel(personal?.gioiTinh), 'thongTinCaNhan.gioiTinh'], ["Số CCCD", personal?.soCccd, 'thongTinCaNhan.soCccd'], ["Ngày cấp CCCD", date(personal?.ngayCapCccd), 'thongTinCaNhan.ngayCapCccd'], ["Nơi cấp CCCD", personal?.noiCapCccd, 'thongTinCaNhan.noiCapCccd'], ["Quốc tịch", personal?.quocTich, 'thongTinCaNhan.quocTich'], ["Dân tộc", personal?.danToc, 'thongTinCaNhan.danToc'], ["Tôn giáo", personal?.tonGiao, 'thongTinCaNhan.tonGiao'], ["Số điện thoại", personal?.soDienThoai, 'thongTinCaNhan.soDienThoai'], ["Số điện thoại bố/người nuôi dưỡng", personal?.soDienThoaiBoNguoiNuoiDuong, 'thongTinCaNhan.soDienThoaiBoNguoiNuoiDuong'], ["Số điện thoại mẹ/người nuôi dưỡng", personal?.soDienThoaiMeNguoiNuoiDuong, 'thongTinCaNhan.soDienThoaiMeNguoiNuoiDuong'], ["Thư điện tử liên hệ", personal?.emailLienHe, 'thongTinCaNhan.emailLienHe']]} />}
        <div className="border-t pt-4"><h3 className="mb-2 font-medium">Địa chỉ</h3>{canAddress ? <Rows renderField={renderField} rows={[["Nơi sinh, cấp giấy khai sinh", addressText('NOI_SINH'), 'diaChi.NOI_SINH'], ["Quê quán", addressText('QUE_QUAN'), 'diaChi.QUE_QUAN'], ["Nơi thường trú", addressText('THUONG_TRU'), 'diaChi.THUONG_TRU'], ["Nơi ở hiện nay", addressText('NOI_O_HIEN_NAY'), 'diaChi.NOI_O_HIEN_NAY']]} /> : <p className="text-sm text-muted-foreground">Bạn không có quyền truy cập thông tin này.</p>}</div>
      </Section>
    </TabsContent>
    <TabsContent value="student" className="pt-5"><Section title="Thông tin sinh viên" icon={GraduationCap}>{!canStudent ? <p className="text-sm text-muted-foreground">Bạn không có quyền truy cập thông tin này.</p> : student ? <Rows rows={[["Mã sinh viên", student.maSinhVien, 'thongTinSinhVien.maSinhVien'], ["Khóa học", student.khoaHoc, 'thongTinSinhVien.khoaHoc'], ["Ngành", student.nganh, 'thongTinSinhVien.nganh'], ["Chuyên ngành", student.chuyenNganh, 'thongTinSinhVien.chuyenNganh'], ["Chương trình đào tạo", student.chuongTrinhDaoTao, 'thongTinSinhVien.chuongTrinhDaoTao'], ["Lớp hành chính", student.lopHanhChinh, 'thongTinSinhVien.lopHanhChinh'], ["Trạng thái học tập", enumLabel(student.trangThaiHocTap)]]}/> : <p className="rounded-md bg-muted p-4 text-sm text-muted-foreground">Thông tin chưa được cập nhật.</p>}</Section></TabsContent>
    <TabsContent value="party" className="pt-5"><Section title="Thông tin Đảng viên" icon={Landmark}><Rows rows={[["Mã hồ sơ", profile.maHoSoNoiBo, 'maHoSoNoiBo'], ["Số phiếu lý lịch", profile.soPhieuLyLich, 'soPhieuLyLich'], ["Số thẻ Đảng viên", profile.soTheDangVien, 'soTheDangVien'], ["Khóa Đảng viên", profile.khoaDangVien, 'khoaDangVien'], ["Loại Đảng viên", enumLabel(profile.trangThaiDangVien), 'trangThaiDangVien'], ["Trạng thái hồ sơ", enumLabel(profile.trangThai)], ["Ngày vào Đảng", date(profile.ngayVaoDang), 'ngayVaoDang'], ["Ngày chính thức", date(profile.ngayChinhThuc), 'ngayChinhThuc']]}/><Tabs defaultValue="current" className="border-t pt-4"><TabsList variant="line" className="h-auto w-full justify-start gap-4 rounded-none border-b bg-transparent p-0"><TabsTrigger value="current" className="min-h-11 rounded-none px-3 text-sm">Sinh hoạt hiện tại</TabsTrigger><TabsTrigger value="outside" className="min-h-11 rounded-none px-3 text-sm">Chuyển sinh hoạt từ ngoài PTIT</TabsTrigger></TabsList><TabsContent value="current" forceMount className="pt-4 data-[state=inactive]:hidden">{can('SINH_HOAT_XEM_HIEN_TAI') ? <CurrentUnit profile={profile}/> : <p className="text-sm text-muted-foreground">Bạn không có quyền truy cập thông tin này.</p>}</TabsContent><TabsContent value="outside" forceMount className="pt-4 data-[state=inactive]:hidden"><OutsideMembershipSection profileId={profile.ma} canView={can('SINH_HOAT_XEM_LICH_SU')} canEdit={can('SINH_HOAT_SUA_LICH_SU')} memberships={(membership.data?.lichSu ?? []).map((item) => ({ ma: item.ma, ngayHieuLucTu: item.ngayHieuLucTu, tenDangUy: item.tenDangUy, tenChiBo: item.tenChiBo, tenTo: item.tenTo }))} /></TabsContent></Tabs></Section></TabsContent>
    <TabsContent value="membership-history" className="pt-5"><Section title="Lịch sử chuyển sinh hoạt" icon={History}>{!can('SINH_HOAT_XEM_LICH_SU') ? <p className="text-sm text-muted-foreground">Bạn không có quyền truy cập thông tin này.</p> : membership.isPending ? <p role="status" className="text-sm text-muted-foreground">Đang tải lịch sử sinh hoạt…</p> : membership.isError ? <div role="alert" className="space-y-2 text-sm text-destructive"><p>Không thể tải lịch sử sinh hoạt. Vui lòng kiểm tra quyền, phạm vi quản lý hoặc kết nối máy chủ.</p><Button variant="outline" size="sm" onClick={() => void membership.refetch()}>Thử tải lại</Button></div> : membership.data?.lichSu.length ? <Table><TableHeader><TableRow><TableHead>STT</TableHead><TableHead>Đảng ủy</TableHead><TableHead>Chi bộ</TableHead><TableHead>Tổ</TableHead><TableHead>Bắt đầu</TableHead><TableHead>Kết thúc</TableHead><TableHead>Lý do chuyển</TableHead></TableRow></TableHeader><TableBody>{[...membership.data.lichSu].sort((a, b) => (b.ngayHieuLucTu || '').localeCompare(a.ngayHieuLucTu || '') || a.ma.localeCompare(b.ma)).map((item, index) => <TableRow key={item.ma}><TableCell>{index + 1}</TableCell><TableCell>{show(item.tenDangUy)}</TableCell><TableCell>{show(item.tenChiBo)}</TableCell><TableCell>{show(item.tenTo)}</TableCell><TableCell>{date(item.ngayHieuLucTu)}</TableCell><TableCell>{item.ngayHieuLucDen ? date(item.ngayHieuLucDen) : 'Hiện tại'}</TableCell><TableCell className="whitespace-normal">{show(item.lyDoChuyen)}</TableCell></TableRow>)}</TableBody></Table> : <EmptyState title="Chưa có lịch sử chuyển sinh hoạt" description="Các lần sinh hoạt được ghi nhận sẽ hiển thị tại đây." />}</Section></TabsContent>
    <TabsContent value="process" className="pt-5"><Section title="Quá trình Đảng" icon={FileText}><PartyProcessRecordsSection canView={can('QUA_TRINH_DANG_XEM')} isPending={process.isPending} isError={process.isError} events={process.data ?? []} onRetry={() => void process.refetch()} /><PartyTrainingSection profileId={profile.ma} canView={can('DAO_TAO_DANG_XEM')} canCreate={can('DAO_TAO_DANG_TAO')} canEdit={can('DAO_TAO_DANG_SUA')} canViewDocuments={can('HO_SO_TAI_LIEU_XEM')} canUpload={can('HO_SO_TAI_LIEU_TAI_LEN')} canDownload={can('HO_SO_TAI_LIEU_TAI_XUONG')} events={process.data ?? []} /></Section></TabsContent>
    <TabsContent value="position" className="pt-5"><Section title="Chức vụ và nhiệm kỳ" icon={BadgeCheck}><PositionAssignmentsSection canView={can('PHAN_CONG_CHUC_VU_XEM')} isPending={positions.isPending} isError={positions.isError} items={positions.data ?? []} onRetry={() => void positions.refetch()} emptyTitle="Chưa có thông tin chức vụ và nhiệm kỳ." emptyDescription="Chức vụ, nhiệm kỳ và thời gian phân công sẽ hiển thị tại đây khi được ghi nhận." /></Section></TabsContent>
  </Tabs>
}
export function MyMemberProfilePage() {
  const auth = useAuth()
  const query = useQuery({ queryKey: ['my-member-profile', auth.taiKhoan?.maTaiKhoan], queryFn: myProfileApi.profile, retry: false })
  const permissions = auth.taiKhoan?.quyenDangHoatDong ?? []
  const canSeeCompletion = (['HO_SO_CA_NHAN_XEM', 'HO_SO_DIA_CHI_XEM', 'HO_SO_SINH_VIEN_XEM'] as const).every((permission) => permissions.includes(permission) || permissions.includes(permission.replace('_XEM', '_SUA')))
  const profile = query.data?.hoSo
  const completionProgress = profile && canSeeCompletion && profile.thongTinCaNhan !== undefined && profile.diaChi !== undefined && profile.thongTinSinhVien !== undefined ? tinhTienDoHoSo(profile) : undefined
  return <main className="min-w-0 space-y-5 pb-8">
    <Breadcrumb><BreadcrumbList><BreadcrumbItem><BreadcrumbLink href="/">Tổng quan</BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator/><BreadcrumbItem><BreadcrumbPage>Hồ sơ của tôi</BreadcrumbPage></BreadcrumbItem></BreadcrumbList></Breadcrumb>
    <PageHeader title="Hồ sơ của tôi" description="Thông tin hồ sơ Đảng viên liên kết với tài khoản đang đăng nhập." />
    {query.isPending && <Card className="gap-0 py-0"><CardContent className="py-12 text-center text-sm text-muted-foreground" role="status">Đang tải hồ sơ của bạn…</CardContent></Card>}
    {query.isError && <Card className="gap-0 py-0"><CardContent className="space-y-3 py-8 text-center"><CircleAlert className="mx-auto size-6 text-destructive"/><p role="alert" className="text-sm">{normalizeApiError(query.error).message || 'Không thể tải hồ sơ của bạn.'}</p><Button variant="outline" onClick={() => void query.refetch()}>Thử tải lại</Button></CardContent></Card>}
    {!query.isPending && !query.isError && !profile && <Card className="gap-0 py-0"><CardContent className="py-10 text-center"><CircleAlert className="mx-auto mb-3 size-7 text-muted-foreground"/><p className="font-medium">Tài khoản của bạn chưa được liên kết với hồ sơ Đảng viên. Vui lòng liên hệ người quản trị để được hỗ trợ.</p></CardContent></Card>}
    {profile && <InlineUpdateFlow profile={profile}>{(renderField, statusAlerts, activeTab, setActiveTab, onSelectMissingField) => <>
      <Card className="gap-0 py-0"><CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center md:p-6"><MyProfileAvatar name={profile.hoVaTen} className="size-20 shrink-0 border-4 border-muted bg-primary/5 text-2xl text-primary"/><div className="min-w-0 flex-1 space-y-2"><div className="flex flex-wrap items-center gap-3"><h2 className="text-xl font-semibold">{profile.hoVaTen}</h2><Badge variant={profile.trangThaiDangVien === 'CHINH_THUC' ? 'default' : 'secondary'}>{profile.trangThaiDangVien === 'CHINH_THUC' ? 'Đảng viên chính thức' : profile.trangThaiDangVien === 'DU_BI' ? 'Đảng viên dự bị' : show(profile.trangThaiDangVien)}</Badge></div><p className="text-sm text-muted-foreground">Mã hồ sơ: <span className="font-medium text-foreground">{profile.maHoSoNoiBo}</span></p></div></CardContent></Card>
      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(16rem,0.28fr)_minmax(0,1fr)]">
      <aside className="space-y-4">
        <Card className="gap-0 py-0"><CardContent className="p-5"><MemberProfileCompletion mode="summary" progress={completionProgress} unavailableReason="Cần quyền xem thông tin cá nhân, địa chỉ và sinh viên để tính mức độ hoàn thiện chính xác."/></CardContent></Card>
        <MemberProfileCompletion mode="notice" progress={completionProgress} unavailableReason="Cần quyền xem thông tin cá nhân, địa chỉ và sinh viên để tính mức độ hoàn thiện chính xác." onSelectField={onSelectMissingField}/>
      </aside>
      <section className="min-w-0 space-y-4"><ProfileContent profile={profile} renderField={renderField} statusAlerts={statusAlerts} activeTab={activeTab} setActiveTab={setActiveTab}/></section>
      </div>
    </>}</InlineUpdateFlow>}
  </main>
}


