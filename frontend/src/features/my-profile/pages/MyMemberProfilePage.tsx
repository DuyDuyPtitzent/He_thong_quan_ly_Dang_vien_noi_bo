import type { ReactNode } from 'react'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BadgeCheck, CalendarDays, CircleAlert, FileText, GraduationCap, Landmark, Pencil, Send, UserRound } from 'lucide-react'
import { memberProfilesApi } from '@/features/member-profiles/api/member-profiles.api'
import type { HoSoChiTiet } from '@/features/member-profiles/types/member-profiles.types'
import { myProfileApi } from '../api/my-profile.api'
import { MyProfileAvatar } from '../components/MyProfileAvatar'
import { useAuth } from '@/core/auth/auth-context'
import { normalizeApiError } from '@/core/api/client'
import { PageHeader } from '@/shared/components/PageHeader'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Progress } from '@/shared/components/ui/progress'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/shared/components/ui/breadcrumb'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { RichTextContent } from '@/shared/components/RichTextContent'

const date = (value?: string | null) => value ? new Date(value).toLocaleDateString('vi-VN') : null
const show = (value?: string | null) => value?.trim() || 'Chưa cập nhật'
type FieldRenderer = (key: string, label: string, value: string | null | undefined) => ReactNode
function Rows({ rows, renderField }: { rows: [string, string | null | undefined, string?][]; renderField?: FieldRenderer }) {
  return <dl className="grid gap-x-10 md:grid-cols-2">{rows.map(([label, value, field]) => <div key={label} className="grid min-h-14 grid-cols-[minmax(8rem,0.8fr)_minmax(0,1.2fr)] items-center gap-3 border-b py-3 last:border-0"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="min-w-0 break-words text-sm font-medium">{field && renderField ? renderField(field, label, value) : show(value)}</dd></div>)}</dl>
}
function Section({ title, icon: Icon, children }: { title: string; icon: typeof UserRound; children: ReactNode }) {
  return <Card className="gap-0 py-0"><CardContent className="space-y-5 p-5 md:p-7"><div className="flex items-center gap-3"><Icon className="size-5 text-primary"/><h2 className="text-lg font-semibold">{title}</h2></div>{children}</CardContent></Card>
}
const fieldLabelsForDialog: Record<string, string> = {
  hoVaTen: 'Họ và tên', khoaDangVien: 'Khóa Đảng viên', 'thongTinCaNhan.ngaySinh': 'Ngày sinh', 'thongTinCaNhan.gioiTinh': 'Giới tính',
  'thongTinCaNhan.soCccd': 'Số căn cước công dân', 'thongTinCaNhan.ngayCapCccd': 'Ngày cấp căn cước công dân',
  'thongTinCaNhan.noiCapCccd': 'Nơi cấp căn cước công dân', 'thongTinCaNhan.quocTich': 'Quốc tịch',
  'thongTinCaNhan.danToc': 'Dân tộc', 'thongTinCaNhan.tonGiao': 'Tôn giáo', 'thongTinCaNhan.soDienThoai': 'Số điện thoại',
  'thongTinCaNhan.emailLienHe': 'Thư điện tử', 'diaChi.NOI_SINH': 'Nơi sinh', 'diaChi.QUE_QUAN': 'Quê quán',
  'diaChi.THUONG_TRU': 'Địa chỉ thường trú',
}
function InlineUpdateFlow({ profile, children }: { profile: HoSoChiTiet; children: (renderField: FieldRenderer, submitError: ReactNode) => ReactNode }) {
  const auth = useAuth()
  const permissions = auth.taiKhoan?.quyenDangHoatDong ?? []
  const can = (key: string) => permissions.includes(key)
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<string | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [dialogOpen, setDialogOpen] = useState(false)
  const windowQuery = useQuery({ queryKey: ['my-profile-update-window'], queryFn: myProfileApi.updateWindow, enabled: can('HO_SO_CA_NHAN_TU_CAP_NHAT'), retry: false })
  const requests = useQuery({ queryKey: ['my-profile-update-requests'], queryFn: myProfileApi.updateRequests, enabled: can('HO_SO_CA_NHAN_TU_CAP_NHAT'), retry: false })
  const submit = useMutation({ mutationFn: () => myProfileApi.submitUpdateRequest(changes), onSuccess: async () => { setEditing(null); setValues({}); setDialogOpen(false); await Promise.all([queryClient.invalidateQueries({ queryKey: ['my-member-profile'] }), queryClient.invalidateQueries({ queryKey: ['my-profile-update-requests'] }), queryClient.invalidateQueries({ queryKey: ['my-profile-update-window'] })]) }, onError: () => setDialogOpen(false) })
  const window = windowQuery.data?.dotCapNhat
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
  const changes = Object.fromEntries(Object.entries(values).filter(([field, value]) => value !== currentValue(field)).map(([field, value]) => [field, field.startsWith('diaChi.') ? { diaChiChiTiet: value || null } : value || null]))
  const latest = requests.data?.[0]
  const pendingValues = pending?.giaTriDeNghi ?? {}
  const draftCount = Object.keys(changes).length
  const activeWindowAlert = can('HO_SO_CA_NHAN_TU_CAP_NHAT') && !windowQuery.isPending && !requests.isPending && !windowQuery.isError && !requests.isError && window?.trangThai === 'DANG_MO' ? <Alert variant="success"><CalendarDays/><AlertTitle>Đang mở cập nhật hồ sơ · {window.ten}</AlertTitle><AlertDescription><span className="block">Thời gian: {date(window.ngayBatDau)} – {date(window.ngayKetThuc)}.</span><span className="mt-1 block">Bạn có thể đề nghị chỉnh sửa các thông tin được cấp trên cho phép. Những thay đổi chỉ có hiệu lực sau khi Chi bộ phê duyệt.</span></AlertDescription></Alert> : null
  const statusAlerts = <div className="space-y-3">
    {!can('HO_SO_CA_NHAN_TU_CAP_NHAT') ? <Alert variant="warning"><CircleAlert/><AlertTitle>Hồ sơ của bạn</AlertTitle><AlertDescription>Bạn chưa được cấp quyền gửi đề nghị cập nhật hồ sơ.</AlertDescription></Alert> : windowQuery.isPending || requests.isPending ? <Alert><CalendarDays/><AlertTitle>Thông tin đợt cập nhật</AlertTitle><AlertDescription role="status">Đang tải thời hạn và trạng thái yêu cầu của bạn…</AlertDescription></Alert> : windowQuery.isError || requests.isError ? <Alert variant="destructive"><CircleAlert/><AlertTitle>Chưa tải được trạng thái cập nhật</AlertTitle><AlertDescription>Không thể lấy thông tin đợt hoặc yêu cầu. Hãy tải lại trang để thử lại.</AlertDescription></Alert> : window && window.trangThai !== 'DANG_MO' ? <Alert variant="warning"><CalendarDays/><AlertTitle>{window.trangThai === 'CHUA_BAT_DAU' ? 'Đợt cập nhật sắp diễn ra' : 'Đợt cập nhật đã kết thúc'} · {window.ten}</AlertTitle><AlertDescription><span className="block">Thời gian: {date(window.ngayBatDau)} – {date(window.ngayKetThuc)}.</span><span className="mt-1 block">Các trường chỉ có thể được đề nghị cập nhật trong thời gian đợt mở.</span></AlertDescription></Alert> : !window && !windowQuery.isPending && !windowQuery.isError && can('HO_SO_CA_NHAN_TU_CAP_NHAT') ? <Alert variant="warning"><CalendarDays/><AlertTitle>Hiện chưa có đợt cập nhật hồ sơ</AlertTitle><AlertDescription>Khi Chi bộ mở đợt mới, thông tin thời hạn và các trường được phép đề nghị sẽ hiển thị tại đây.</AlertDescription></Alert> : null}
    {submit.isError && <Alert variant="destructive"><CircleAlert/><AlertTitle>Không gửi được yêu cầu</AlertTitle><AlertDescription>{normalizeApiError(submit.error).message || 'Vui lòng kiểm tra dữ liệu và thử lại.'}</AlertDescription></Alert>}
    {pending && <Alert variant="warning"><CalendarDays/><AlertTitle>Yêu cầu đang chờ Chi bộ phê duyệt</AlertTitle><AlertDescription>Các giá trị đề nghị được lưu trên máy chủ. Hồ sơ chính thức vẫn giữ nguyên cho đến khi được duyệt.</AlertDescription></Alert>}
    {latest?.trangThai === 'DA_TU_CHOI' && <Alert variant="destructive"><CircleAlert/><AlertTitle>Yêu cầu gần nhất đã bị từ chối</AlertTitle><AlertDescription>{latest.lyDoXuLy ? <><p>Lý do:</p><RichTextContent html={latest.lyDoXuLy}/></> : 'Chi bộ chưa ghi lý do từ chối.'}</AlertDescription></Alert>}
    {requests.data?.filter((item) => item.trangThai === 'DA_DUYET').slice(0, 1).map((item) => <Alert key={item.ma} variant="success"><BadgeCheck/><AlertTitle>Yêu cầu cập nhật đã được phê duyệt</AlertTitle><AlertDescription>Hồ sơ chính thức đã được cập nhật theo đề nghị.</AlertDescription></Alert>)}
  </div>
  const displayProposal = (value: unknown) => typeof value === 'string' ? value : value && typeof value === 'object' ? Object.values(value).filter((part) => typeof part === 'string' && part).join(', ') || 'Chưa cập nhật' : 'Chưa cập nhật'
  const renderField: FieldRenderer = (field, label, official) => {
    const editable = canEditField(field)
    const proposed = pending ? pendingValues[field] : changes[field]
    const hasProposal = proposed !== undefined
    const isEditing = editing === field
    const type = field.endsWith('.ngaySinh') || field.endsWith('.ngayCapCccd') ? 'date' : field.endsWith('.emailLienHe') ? 'email' : field.endsWith('.soDienThoai') ? 'tel' : 'text'
    if (isEditing) return <div className="space-y-2"><Input autoFocus id={`update-${field}`} aria-label={`Giá trị đề nghị: ${label}`} type={type} value={values[field] ?? currentValue(field)} onChange={(event) => setValues((state) => ({ ...state, [field]: event.target.value }))} maxLength={field === 'hoVaTen' ? 200 : 500}/><div className="flex flex-wrap gap-2"><Button size="sm" onClick={() => setEditing(null)}>Ghi nhận đề nghị</Button><Button size="sm" variant="outline" onClick={() => { setEditing(null); setValues((state) => { const next = { ...state }; delete next[field]; return next }) }}>Hủy</Button></div></div>
    return <div className="space-y-1"><div className="flex items-start justify-between gap-2"><p className="min-w-0 break-words">{show(official)}</p>{editable && <Button type="button" variant="ghost" size="icon" className="-my-2 size-10 shrink-0" aria-label={`Sửa ${label}`} onClick={() => { setEditing(field); setValues((state) => ({ ...state, [field]: currentValue(field) })) }}><Pencil aria-hidden="true"/></Button>}</div>{hasProposal && <div className="rounded-md bg-muted/60 p-2 text-xs"><p><span className="font-medium">Giá trị đề nghị:</span> {displayProposal(proposed)}</p><p className="mt-1 text-muted-foreground">Giá trị hiện tại: {show(official)}</p><Badge variant={pending ? 'outline' : 'secondary'} className="mt-2">{pending ? 'Chờ phê duyệt' : 'Chưa gửi'}</Badge></div>}</div>
  }
  return <>
    {activeWindowAlert}
    {children(renderField, statusAlerts)}
    {draftCount > 0 && !pending && <div className="flex justify-end"><Button className="min-h-11" onClick={() => setDialogOpen(true)} disabled={!window || window.trangThai !== 'DANG_MO' || editing !== null || submit.isPending}><Send/>Lưu thay đổi</Button></div>}
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent><DialogHeader><DialogTitle>Xác nhận lưu và gửi đề nghị</DialogTitle><DialogDescription><span className="block"><strong>{draftCount} trường</strong> đã thay đổi và chưa được gửi.</span><span className="mt-2 block">Giá trị đề nghị:</span><span className="mt-1 block">{Object.keys(changes).map((field) => fieldLabelsForDialog[field] ?? field).join(', ')}</span><span className="mt-2 block">Đề nghị sẽ được chuyển đến Chi bộ phê duyệt. Hồ sơ chính thức chưa thay đổi cho đến khi được duyệt.</span></DialogDescription></DialogHeader><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="outline" onClick={() => setDialogOpen(false)}>Quay lại chỉnh sửa</Button><Button onClick={() => submit.mutate()} disabled={submit.isPending}><Send/>{submit.isPending ? 'Đang gửi…' : 'Xác nhận gửi'}</Button></div></DialogContent></Dialog>
  </>
}
function CurrentUnit({ profile }: { profile: HoSoChiTiet }) {
  const item = profile.lichSuDonVi?.[0]
  const rows: [string, string | null | undefined][] = []
  if (item?.tenDangUy) rows.push(["Đảng ủy", item.tenDangUy])
  rows.push(["Chi bộ sinh hoạt hiện tại", item?.chiBo?.tenDonVi?.[0]?.ten ?? item?.chiBo?.maDinhDanh], ["Tổ sinh hoạt", item?.to?.tenDonVi?.[0]?.ten ?? item?.to?.maDinhDanh], ["Bắt đầu sinh hoạt", date(item?.ngayHieuLucTu)])
  return <Rows rows={rows}/>
}
function ProfileContent({ profile, renderField, statusAlerts }: { profile: HoSoChiTiet; renderField: FieldRenderer; statusAlerts: ReactNode }) {
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
    { id: 'personal', label: 'Thông tin cá nhân', icon: UserRound },
    { id: 'student', label: 'Thông tin sinh viên', icon: GraduationCap },
    { id: 'party', label: 'Thông tin Đảng viên', icon: Landmark },
    { id: 'process', label: 'Quá trình Đảng', icon: FileText },
    { id: 'position', label: 'Chức vụ và nhiệm kỳ', icon: BadgeCheck },
  ]
  const personal = profile.thongTinCaNhan
  const address = (type: string) => profile.diaChi?.find((item) => item.loaiDiaChi === type)
  const addressText = (type: string) => { const item = address(type); return item ? [item.diaChiChiTiet, item.xaPhuong, item.quanHuyen, item.tinhThanhPho, item.quocGia].filter(Boolean).join(', ') : null }
  const student = profile.thongTinSinhVien
  return <Tabs defaultValue="personal" className="min-w-0">
    <TabsList variant="line" className="grid h-auto w-full min-w-0 grid-cols-2 gap-1 rounded-none border-b bg-transparent p-0 sm:grid-cols-3 xl:grid-cols-5">
      {tabs.map(({ id, label, icon: Icon }) => <TabsTrigger key={id} value={id} className="min-h-11 min-w-0 gap-2 whitespace-normal px-2 py-2 text-center text-xs sm:text-sm"><Icon aria-hidden="true" className="size-4 shrink-0"/><span className="leading-snug">{label}</span></TabsTrigger>)}
    </TabsList>
    {statusAlerts}
    <TabsContent value="personal" className="pt-5">
      <Section title="Thông tin cá nhân" icon={UserRound}>
        {!canPersonal ? <p className="text-sm text-muted-foreground">Bạn không có quyền truy cập thông tin này.</p> : <Rows renderField={renderField} rows={[["Họ và tên", profile.hoVaTen, 'hoVaTen'], ["Ngày sinh", date(personal?.ngaySinh), 'thongTinCaNhan.ngaySinh'], ["Giới tính", personal?.gioiTinh, 'thongTinCaNhan.gioiTinh'], ["Số CCCD", personal?.soCccd, 'thongTinCaNhan.soCccd'], ["Ngày cấp CCCD", date(personal?.ngayCapCccd), 'thongTinCaNhan.ngayCapCccd'], ["Nơi cấp CCCD", personal?.noiCapCccd, 'thongTinCaNhan.noiCapCccd'], ["Quốc tịch", personal?.quocTich, 'thongTinCaNhan.quocTich'], ["Dân tộc", personal?.danToc, 'thongTinCaNhan.danToc'], ["Tôn giáo", personal?.tonGiao, 'thongTinCaNhan.tonGiao'], ["Số điện thoại", personal?.soDienThoai, 'thongTinCaNhan.soDienThoai'], ["Thư điện tử", personal?.emailLienHe, 'thongTinCaNhan.emailLienHe']]} />}
        <div className="border-t pt-4"><h3 className="mb-2 font-medium">Địa chỉ</h3>{canAddress ? <Rows renderField={renderField} rows={[["Nơi sinh", addressText('NOI_SINH'), 'diaChi.NOI_SINH'], ["Quê quán", addressText('QUE_QUAN'), 'diaChi.QUE_QUAN'], ["Địa chỉ thường trú", addressText('THUONG_TRU'), 'diaChi.THUONG_TRU']]} /> : <p className="text-sm text-muted-foreground">Bạn không có quyền truy cập thông tin này.</p>}</div>
      </Section>
    </TabsContent>
    <TabsContent value="student" className="pt-5"><Section title="Thông tin sinh viên" icon={GraduationCap}>{!canStudent ? <p className="text-sm text-muted-foreground">Bạn không có quyền truy cập thông tin này.</p> : student ? <Rows rows={[["Mã sinh viên", student.maSinhVien], ["Khóa học", student.khoaHoc], ["Ngành", student.nganh], ["Chuyên ngành", student.chuyenNganh], ["Chương trình đào tạo", student.chuongTrinhDaoTao], ["Lớp hành chính", student.lopHanhChinh], ["Trạng thái học tập", student.trangThaiHocTap]]}/> : <p className="rounded-md bg-muted p-4 text-sm text-muted-foreground">Thông tin chưa được cập nhật.</p>}</Section></TabsContent>
    <TabsContent value="party" className="pt-5"><Section title="Thông tin Đảng viên" icon={Landmark}><Rows rows={[["Mã hồ sơ Đảng viên", profile.maHoSoNoiBo], ["Số phiếu lý lịch", profile.soPhieuLyLich], ["Số thẻ Đảng viên", profile.soTheDangVien], ["Khóa Đảng viên", profile.khoaDangVien, 'khoaDangVien'], ["Loại Đảng viên", profile.trangThaiDangVien === 'DU_BI' ? 'Dự bị' : profile.trangThaiDangVien === 'CHINH_THUC' ? 'Chính thức' : profile.trangThaiDangVien], ["Trạng thái hồ sơ", profile.trangThai], ["Ngày vào Đảng", date(profile.ngayVaoDang)], ["Ngày chính thức", date(profile.ngayChinhThuc)]]}/><div className="border-t pt-4"><h3 className="mb-2 font-medium">Sinh hoạt hiện tại</h3>{can('SINH_HOAT_XEM_HIEN_TAI') ? <CurrentUnit profile={profile}/> : <p className="text-sm text-muted-foreground">Bạn không có quyền truy cập thông tin này.</p>}</div><div className="space-y-3 border-t pt-4"><h3 className="font-medium">Lịch sử chuyển sinh hoạt</h3>{!can('SINH_HOAT_XEM_LICH_SU') ? <p className="text-sm text-muted-foreground">Bạn không có quyền truy cập thông tin này.</p> : membership.isPending ? <p role="status" className="text-sm text-muted-foreground">Đang tải lịch sử sinh hoạt…</p> : membership.isError ? <p role="alert" className="text-sm text-destructive">Không thể tải lịch sử sinh hoạt.</p> : membership.data?.lichSu.length ? <ol className="space-y-3 border-l pl-5">{membership.data.lichSu.map((item) => <li key={item.ma}><p className="font-medium">{item.tenChiBo ?? 'Chưa cập nhật'}{item.tenTo ? ` · ${item.tenTo}` : ''}</p><p className="text-sm text-muted-foreground">{date(item.ngayHieuLucTu)} – {date(item.ngayHieuLucDen) ?? 'Hiện tại'}</p>{item.lyDoChuyen && <p className="text-sm">Lý do: {item.lyDoChuyen}</p>}</li>)}</ol> : <p className="text-sm text-muted-foreground">Thông tin chưa được cập nhật.</p>}</div></Section></TabsContent>
    <TabsContent value="process" className="pt-5"><Section title="Quá trình Đảng" icon={FileText}>{!can('QUA_TRINH_DANG_XEM') ? <p className="text-sm text-muted-foreground">Bạn không có quyền truy cập thông tin này.</p> : process.isPending ? <p role="status" className="text-sm text-muted-foreground">Đang tải quá trình Đảng…</p> : process.isError ? <p role="alert" className="text-sm text-destructive">Không thể tải quá trình Đảng.</p> : process.data?.length ? <ol className="space-y-4 border-l pl-5">{process.data.map((item) => <li key={item.ma}><h3 className="font-medium">{item.loaiSuKien.replaceAll('_', ' ').toLocaleLowerCase('vi')}</h3><p className="text-sm text-muted-foreground">{date(item.ngaySuKien)}</p>{item.moTa && <p className="mt-1 text-sm">{item.moTa}</p>}</li>)}</ol> : <p className="text-sm text-muted-foreground">Thông tin chưa được cập nhật.</p>}</Section></TabsContent>
    <TabsContent value="position" className="pt-5"><Section title="Chức vụ và nhiệm kỳ" icon={BadgeCheck}>{!can('PHAN_CONG_CHUC_VU_XEM') ? <p className="text-sm text-muted-foreground">Bạn không có quyền truy cập thông tin này.</p> : positions.isPending ? <p role="status" className="text-sm text-muted-foreground">Đang tải chức vụ…</p> : positions.isError ? <p role="alert" className="text-sm text-destructive">Không thể tải phân công chức vụ.</p> : positions.data?.length ? <div className="divide-y">{positions.data.map((item) => <article key={item.ma} className="space-y-2 py-4 first:pt-0"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-medium">{item.tenChucVu}</h3><Badge variant={item.trangThai === 'DANG_HIEU_LUC' ? 'default' : 'secondary'}>{item.trangThai === 'DANG_HIEU_LUC' ? 'Đang hiệu lực' : item.trangThai === 'SAP_HIEU_LUC' ? 'Sắp hiệu lực' : 'Đã kết thúc'}</Badge></div><Rows rows={[["Đơn vị đảm nhiệm", item.tenDonVi], ["Nhiệm kỳ", item.nhiemKy?.ten], ["Thời gian hiệu lực", `${date(item.ngayHieuLucTu) ?? 'Chưa cập nhật'} – ${date(item.ngayHieuLucDen) ?? 'Chưa xác định'}`]]}/></article>)}</div> : <p className="text-sm text-muted-foreground">Thông tin chưa được cập nhật.</p>}</Section></TabsContent>
  </Tabs>
}
export function MyMemberProfilePage() {
  const auth = useAuth()
  const query = useQuery({ queryKey: ['my-member-profile', auth.taiKhoan?.maTaiKhoan], queryFn: myProfileApi.profile, retry: false })
  const canViewMembership = auth.taiKhoan?.quyenDangHoatDong?.includes('SINH_HOAT_XEM_HIEN_TAI') ?? false
  const profile = query.data?.hoSo
  const required = profile ? [[profile.maHoSoNoiBo, 'Mã hồ sơ Đảng viên'], [profile.hoVaTen, 'Họ và tên'], [profile.trangThaiDangVien, 'Trạng thái Đảng viên'], [profile.lichSuDonVi?.[0]?.maChiBo, 'Chi bộ hiện tại'], [profile.lichSuDonVi?.[0]?.ngayHieuLucTu, 'Ngày bắt đầu sinh hoạt']] as const : []
  const complete = required.filter(([value]) => Boolean(value)).length
  const percent = required.length ? Math.round(complete * 100 / required.length) : 0
  return <main className="min-w-0 space-y-5 pb-8">
    <Breadcrumb><BreadcrumbList><BreadcrumbItem><BreadcrumbLink href="/">Tổng quan</BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator/><BreadcrumbItem><BreadcrumbPage>Hồ sơ của tôi</BreadcrumbPage></BreadcrumbItem></BreadcrumbList></Breadcrumb>
    <PageHeader title="Hồ sơ của tôi" description="Thông tin hồ sơ Đảng viên liên kết với tài khoản đang đăng nhập." />
    {query.isPending && <Card className="gap-0 py-0"><CardContent className="py-12 text-center text-sm text-muted-foreground" role="status">Đang tải hồ sơ của bạn…</CardContent></Card>}
    {query.isError && <Card className="gap-0 py-0"><CardContent className="space-y-3 py-8 text-center"><CircleAlert className="mx-auto size-6 text-destructive"/><p role="alert" className="text-sm">{normalizeApiError(query.error).message || 'Không thể tải hồ sơ của bạn.'}</p><Button variant="outline" onClick={() => void query.refetch()}>Thử tải lại</Button></CardContent></Card>}
    {!query.isPending && !query.isError && !profile && <Card className="gap-0 py-0"><CardContent className="py-10 text-center"><CircleAlert className="mx-auto mb-3 size-7 text-muted-foreground"/><p className="font-medium">Tài khoản của bạn chưa được liên kết với hồ sơ Đảng viên. Vui lòng liên hệ người quản trị để được hỗ trợ.</p></CardContent></Card>}
    {profile && <InlineUpdateFlow profile={profile}>{(renderField, statusAlerts) => <>
      <Card className="gap-0 py-0"><CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center md:p-6"><MyProfileAvatar name={profile.hoVaTen} className="size-20 shrink-0 border-4 border-muted bg-primary/5 text-2xl text-primary"/><div className="min-w-0 flex-1 space-y-2"><div className="flex flex-wrap items-center gap-3"><h2 className="text-xl font-semibold">{profile.hoVaTen}</h2><Badge variant={profile.trangThaiDangVien === 'CHINH_THUC' ? 'default' : 'secondary'}>{profile.trangThaiDangVien === 'CHINH_THUC' ? 'Đảng viên chính thức' : profile.trangThaiDangVien === 'DU_BI' ? 'Đảng viên dự bị' : show(profile.trangThaiDangVien)}</Badge></div><p className="text-sm text-muted-foreground">Mã hồ sơ: <span className="font-medium text-foreground">{profile.maHoSoNoiBo}</span></p></div></CardContent></Card>
      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(16rem,0.28fr)_minmax(0,1fr)]">
      <aside className="space-y-4">
        <Card className="gap-0 py-0"><CardContent className="space-y-4 p-5"><h2 className="font-semibold">Mức độ hoàn thiện hồ sơ</h2>{canViewMembership ? <><div className="flex items-center justify-between gap-2"><span className="text-sm text-muted-foreground">Thông tin đã có</span><span className="text-sm font-semibold tabular-nums">{percent}%</span></div><Progress value={percent} aria-label={`Mức độ hoàn thiện hồ sơ ${percent}%`}/><p className="text-sm text-muted-foreground">{complete}/{required.length} thông tin đã có</p><ul className="space-y-2">{required.filter(([value]) => !value).map(([, label]) => <li key={label} className="text-sm text-muted-foreground">• Thiếu {label.toLocaleLowerCase('vi')}</li>)}</ul></> : <p className="text-sm text-muted-foreground">Không thể tính tiến độ vì bạn chưa được cấp quyền xem thông tin sinh hoạt hiện tại.</p>}</CardContent></Card>
      </aside>
      <section className="min-w-0 space-y-4"><ProfileContent profile={profile} renderField={renderField} statusAlerts={statusAlerts}/><div className="flex items-start gap-2 rounded-md border bg-muted/40 p-4 text-sm text-muted-foreground"><CircleAlert className="mt-0.5 size-4 shrink-0"/><p>Ngày vào Đảng, trạng thái Đảng viên, sinh hoạt, chức vụ và phân quyền chỉ được cập nhật qua quy trình nghiệp vụ tương ứng.</p></div></section>
      </div>
    </>}</InlineUpdateFlow>}
  </main>
}


