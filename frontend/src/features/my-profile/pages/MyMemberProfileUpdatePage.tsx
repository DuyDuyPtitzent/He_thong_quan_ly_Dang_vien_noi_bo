import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, ArrowLeft, CalendarClock, CheckCircle2, Clock3, ImagePlus, RotateCcw, Send, ShieldCheck, Trash2 } from 'lucide-react'
import type { HoSoChiTiet } from '@/features/member-profiles/types/member-profiles.types'
import { myProfileApi } from '../api/my-profile.api'
import { MyProfileAvatar } from '../components/MyProfileAvatar'
import { useAuth } from '@/core/auth/auth-context'
import { PageHeader } from '@/shared/components/PageHeader'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Badge } from '@/shared/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/shared/components/ui/alert-dialog'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/shared/components/ui/breadcrumb'
import { RichTextContent } from '@/shared/components/RichTextContent'
import { DatePicker } from '@/shared/components/date-time'

const labels: Record<string, string> = {
  trangThaiDangVien: 'Trạng thái Đảng viên', ngayVaoDang: 'Ngày vào Đảng',
  hoVaTen: 'Họ và tên', khoaDangVien: 'Khóa Đảng viên', 'thongTinCaNhan.ngaySinh': 'Ngày sinh', 'thongTinCaNhan.gioiTinh': 'Giới tính',
  'thongTinCaNhan.soCccd': 'Số CCCD', 'thongTinCaNhan.ngayCapCccd': 'Ngày cấp CCCD', 'thongTinCaNhan.noiCapCccd': 'Nơi cấp CCCD',
  'thongTinCaNhan.quocTich': 'Quốc tịch', 'thongTinCaNhan.danToc': 'Dân tộc', 'thongTinCaNhan.tonGiao': 'Tôn giáo',
  'thongTinCaNhan.soDienThoai': 'Số điện thoại', 'thongTinCaNhan.emailLienHe': 'Thư điện tử',
  'diaChi.NOI_SINH': 'Nơi sinh', 'diaChi.QUE_QUAN': 'Quê quán', 'diaChi.THUONG_TRU': 'Địa chỉ thường trú', anhDaiDien: 'Ảnh đại diện',
}
const statusLabels: Record<string, string> = { CHO_DUYET: 'Chờ phê duyệt', DA_DUYET: 'Đã phê duyệt', DA_TU_CHOI: 'Đã từ chối', DA_HUY: 'Đã hủy' }
const personalFields = ['thongTinCaNhan.ngaySinh', 'thongTinCaNhan.gioiTinh', 'thongTinCaNhan.soCccd', 'thongTinCaNhan.ngayCapCccd', 'thongTinCaNhan.noiCapCccd', 'thongTinCaNhan.quocTich', 'thongTinCaNhan.danToc', 'thongTinCaNhan.tonGiao', 'thongTinCaNhan.soDienThoai', 'thongTinCaNhan.emailLienHe']
const addressFields = ['diaChi.NOI_SINH', 'diaChi.QUE_QUAN', 'diaChi.THUONG_TRU']
const display = (value: unknown) => value == null || value === '' ? 'Chưa cập nhật' : String(value)
const dateTime = (value: string) => new Date(value).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' })

function getCurrentValue(profile: HoSoChiTiet, field: string): string {
  if (field === 'hoVaTen') return profile.hoVaTen ?? ''
  if (field === 'khoaDangVien') return profile.khoaDangVien ?? ''
  if (field === 'trangThaiDangVien') return profile.trangThaiDangVien ?? ''
  if (field === 'ngayVaoDang') return profile.ngayVaoDang ?? ''
  if (field.startsWith('thongTinCaNhan.')) {
    const key = field.slice('thongTinCaNhan.'.length) as keyof NonNullable<HoSoChiTiet['thongTinCaNhan']>
    const value = profile.thongTinCaNhan?.[key]
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) ? value.slice(0, 10) : value ?? ''
  }
  if (field.startsWith('diaChi.')) {
    const type = field.slice('diaChi.'.length)
    const address = profile.diaChi?.find((item) => item.loaiDiaChi === type)
    return address ? [address.diaChiChiTiet, address.xaPhuong, address.quanHuyen, address.tinhThanhPho, address.quocGia].filter(Boolean).join(', ') : ''
  }
  return ''
}

function fieldType(field: string) {
  if (field.endsWith('.ngaySinh') || field.endsWith('.ngayCapCccd')) return 'date'
  if (field.endsWith('.emailLienHe')) return 'email'
  if (field.endsWith('.soDienThoai')) return 'tel'
  return 'text'
}

function ProfileField({ profile, field, editable, value, onChange }: { profile: HoSoChiTiet; field: string; editable: boolean; value: string; onChange: (value: string) => void }) {
  const current = getCurrentValue(profile, field)
  return <div className="grid gap-2 border-b py-3 last:border-0 sm:grid-cols-[minmax(9rem,0.65fr)_minmax(0,1fr)] sm:items-center">
    <Label htmlFor={`profile-field-${field}`} className="text-sm text-muted-foreground">{labels[field] ?? field}</Label>
    {editable ? fieldType(field) === 'date' ? <DatePicker id={`profile-field-${field}`} aria-label={labels[field] ?? field} value={value || undefined} onChange={(next) => onChange(next ?? '')} /> : <Input id={`profile-field-${field}`} type={fieldType(field)} value={value} onChange={(event) => onChange(event.target.value)} maxLength={field === 'hoVaTen' ? 200 : 500} /> : <p className="min-w-0 break-words text-sm font-medium">{display(current)}</p>}
  </div>
}

export function MyMemberProfileUpdatePage() {
  const auth = useAuth()
  const permissions = auth.taiKhoan?.quyenDangHoatDong ?? []
  const canSelfUpdate = permissions.includes('HO_SO_CA_NHAN_TU_CAP_NHAT')
  const canPersonal = permissions.includes('HO_SO_CA_NHAN_XEM') || permissions.includes('HO_SO_CA_NHAN_SUA')
  const canAddress = permissions.includes('HO_SO_DIA_CHI_XEM') || permissions.includes('HO_SO_DIA_CHI_SUA')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [values, setValues] = useState<Record<string, string>>({})
  const [image, setImage] = useState<File>()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const profileQuery = useQuery({ queryKey: ['my-member-profile'], queryFn: myProfileApi.profile, retry: false, enabled: canSelfUpdate })
  const windowQuery = useQuery({ queryKey: ['my-profile-update-window'], queryFn: myProfileApi.updateWindow, retry: false, enabled: canSelfUpdate })
  const requestsQuery = useQuery({ queryKey: ['my-profile-update-requests'], queryFn: myProfileApi.updateRequests, retry: false, enabled: canSelfUpdate })
  const submit = useMutation({
    mutationFn: () => myProfileApi.submitUpdateRequest(changes, image),
    onSuccess: async () => {
      setConfirmOpen(false)
      setValues({})
      setImage(undefined)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-profile-update-requests'] }),
        queryClient.invalidateQueries({ queryKey: ['my-profile-update-window'] }),
      ])
    },
  })
  const cancel = useMutation({
    mutationFn: myProfileApi.cancelUpdateRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-profile-update-requests'] }),
  })
  const profile = profileQuery.data?.hoSo
  const window = windowQuery.data?.dotCapNhat
  const requests = requestsQuery.data ?? []
  const pending = requests.find((request) => request.trangThai === 'CHO_DUYET')
  const editableFields = useMemo(() => (window?.cacTruongDuocPhep ?? []).filter((field) => Boolean(labels[field]) && (!field.startsWith('thongTinCaNhan.') || canPersonal) && (!field.startsWith('diaChi.') || canAddress)), [window?.cacTruongDuocPhep, canPersonal, canAddress])
  const changes = useMemo(() => {
    if (!profile) return {}
    return Object.fromEntries(editableFields.filter((field) => Object.hasOwn(values, field) && values[field] !== getCurrentValue(profile, field)).map((field) => [field, field.startsWith('diaChi.') ? { diaChiChiTiet: values[field] || null } : values[field] || null]))
  }, [editableFields, profile, values])
  const canSubmit = window?.trangThai === 'DANG_MO' && !pending && (Object.keys(changes).length > 0 || Boolean(image)) && !submit.isPending
  const reset = () => { setValues({}); setImage(undefined); submit.reset() }

  return <main className="mx-auto min-w-0 max-w-7xl space-y-5 p-4 md:p-6">
    <Breadcrumb><BreadcrumbList><BreadcrumbItem><BreadcrumbLink asChild><Link to="/">Tổng quan</Link></BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator/><BreadcrumbItem><BreadcrumbLink asChild><Link to="/ho-so-cua-toi">Hồ sơ của tôi</Link></BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator/><BreadcrumbItem><BreadcrumbPage>Cập nhật hồ sơ</BreadcrumbPage></BreadcrumbItem></BreadcrumbList></Breadcrumb>
    <div className="flex flex-wrap items-start justify-between gap-3"><PageHeader title="Cập nhật hồ sơ Đảng viên" description="Cập nhật thông tin cá nhân trong thời gian được cho phép. Các thay đổi chỉ có hiệu lực sau khi được Chi bộ phê duyệt."/><Button variant="outline" asChild><Link to="/ho-so-cua-toi"><ArrowLeft/>Về hồ sơ của tôi</Link></Button></div>

    {!canSelfUpdate ? <Card className="gap-0 py-0"><CardContent className="flex items-center gap-3 p-6 text-sm"><ShieldCheck className="size-5 text-muted-foreground"/><span>Bạn chưa được cấp quyền gửi yêu cầu cập nhật hồ sơ.</span></CardContent></Card> : <>
      {(profileQuery.isPending || windowQuery.isPending || requestsQuery.isPending) && <Card className="gap-0 py-0"><CardContent className="p-6 text-sm text-muted-foreground" role="status">Đang tải hồ sơ và thông tin đợt cập nhật…</CardContent></Card>}
      {(profileQuery.isError || windowQuery.isError || requestsQuery.isError) && <Card className="gap-0 py-0"><CardContent className="flex items-center gap-3 p-5 text-sm text-destructive" role="alert"><AlertCircle className="size-5 shrink-0"/>Không thể tải đầy đủ dữ liệu cập nhật. Vui lòng thử tải lại trang.</CardContent></Card>}
      {profile && !profileQuery.isError && !windowQuery.isPending && !windowQuery.isError && <>
        <Card className="gap-0 py-0"><CardContent className="space-y-4 p-5 md:p-6">
          <div className="flex items-start gap-3"><CalendarClock className="mt-0.5 size-5 shrink-0 text-primary"/><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{window?.ten ?? 'Đợt cập nhật hồ sơ'}</h2><Badge variant={window?.trangThai === 'DANG_MO' ? 'default' : 'secondary'}>{window?.trangThai === 'DANG_MO' ? 'Đang mở' : window?.trangThai === 'CHUA_BAT_DAU' ? 'Chưa đến thời gian mở' : window?.trangThai === 'DA_KET_THUC' ? 'Đã kết thúc' : 'Chưa có đợt'}</Badge></div>
            {window ? <><p className="mt-1 text-sm text-muted-foreground">{window.tenDonVi ?? 'Toàn phạm vi'} · {dateTime(window.ngayBatDau)} – {dateTime(window.ngayKetThuc)}</p><p className="mt-2 text-sm">{window.trangThai === 'DANG_MO' ? 'Chỉ các trường được mở bên dưới mới có thể gửi đề nghị.' : window.trangThai === 'CHUA_BAT_DAU' ? 'Đợt cập nhật chưa bắt đầu. Bạn chưa thể gửi yêu cầu.' : 'Đợt cập nhật hồ sơ đã kết thúc.'}</p></> : <p className="mt-1 text-sm text-muted-foreground">Hiện chưa có đợt cập nhật hồ sơ dành cho bạn.</p>}
          </div></div>
          {pending && <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-primary/30 bg-primary/5 p-3"><div className="flex items-center gap-2 text-sm"><Clock3 className="size-4 text-primary"/><span><strong>Chờ phê duyệt</strong> · Gửi lúc {dateTime(pending.ngayTao)}</span></div><Button variant="outline" size="sm" disabled={cancel.isPending} onClick={() => cancel.mutate(pending.ma)}><Trash2/>{cancel.isPending ? 'Đang hủy…' : 'Hủy yêu cầu'}</Button></div>}
          {requestsQuery.data?.filter((item) => item.trangThai === 'DA_TU_CHOI').slice(0, 1).map((item) => <div key={item.ma} className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm"><p className="font-medium">Yêu cầu gần nhất đã bị từ chối</p>{item.lyDoXuLy && <div className="mt-1"><p className="text-muted-foreground">Lý do:</p><RichTextContent html={item.lyDoXuLy} className="text-muted-foreground"/></div>}</div>)}
        </CardContent></Card>

        <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,0.72fr)]">
          <section className="min-w-0 space-y-4">
            <Card className="gap-0 py-0"><CardContent className="space-y-4 p-5 md:p-6"><div><h2 className="font-semibold">Thông tin hồ sơ</h2><p className="mt-1 text-sm text-muted-foreground">Trường không được mở quyền sẽ ở chế độ chỉ đọc.</p></div>
              <div className="grid gap-x-8 md:grid-cols-2"><div><h3 className="mb-1 text-sm font-semibold">Thông tin Đảng viên</h3><ProfileField profile={profile} field="hoVaTen" editable={window?.trangThai === 'DANG_MO' && editableFields.includes('hoVaTen')} value={values.hoVaTen ?? getCurrentValue(profile, 'hoVaTen')} onChange={(value) => setValues((state) => ({ ...state, hoVaTen: value }))}/><ProfileField profile={profile} field="trangThaiDangVien" editable={false} value="" onChange={() => undefined}/><ProfileField profile={profile} field="ngayVaoDang" editable={false} value="" onChange={() => undefined}/></div>
                <div><h3 className="mb-1 text-sm font-semibold">Thông tin cá nhân</h3>{canPersonal ? personalFields.map((field) => <ProfileField key={field} profile={profile} field={field} editable={window?.trangThai === 'DANG_MO' && !pending && editableFields.includes(field)} value={values[field] ?? getCurrentValue(profile, field)} onChange={(value) => setValues((state) => ({ ...state, [field]: value }))}/>) : <p className="py-3 text-sm text-muted-foreground">Bạn không có quyền truy cập thông tin này.</p>}</div></div>
              <div><h3 className="mb-1 text-sm font-semibold">Địa chỉ</h3>{canAddress ? addressFields.map((field) => <ProfileField key={field} profile={profile} field={field} editable={window?.trangThai === 'DANG_MO' && !pending && editableFields.includes(field)} value={values[field] ?? getCurrentValue(profile, field)} onChange={(value) => setValues((state) => ({ ...state, [field]: value }))}/>) : <p className="py-3 text-sm text-muted-foreground">Bạn không có quyền truy cập thông tin này.</p>}</div>
              <div className="grid gap-4 md:grid-cols-2"><div><h3 className="mb-1 text-sm font-semibold">Thông tin sinh viên</h3>{permissions.includes('HO_SO_SINH_VIEN_XEM') || permissions.includes('HO_SO_SINH_VIEN_SUA') ? <p className="text-sm text-muted-foreground">{profile.thongTinSinhVien ? [profile.thongTinSinhVien.maSinhVien, profile.thongTinSinhVien.lopHanhChinh, profile.thongTinSinhVien.nganh].filter(Boolean).join(' · ') || 'Thông tin chưa được cập nhật.' : 'Thông tin chưa được cập nhật.'}</p> : <p className="text-sm text-muted-foreground">Bạn không có quyền truy cập thông tin này.</p>}</div><div><h3 className="mb-1 text-sm font-semibold">Sinh hoạt Đảng</h3><p className="text-sm text-muted-foreground">{profile.lichSuDonVi?.[0] ? `${profile.lichSuDonVi[0].tenDangUy ?? ''}${profile.lichSuDonVi[0].chiBo?.tenDonVi?.[0]?.ten ? ` · ${profile.lichSuDonVi[0].chiBo.tenDonVi[0].ten}` : ''}` : 'Thông tin chưa được cập nhật.'}</p></div></div>
              {editableFields.includes('anhDaiDien') && <div className="space-y-3 border-t pt-4"><h3 className="text-sm font-semibold">Ảnh đại diện</h3><div className="flex flex-wrap items-center gap-4"><MyProfileAvatar name={profile.hoVaTen} className="size-16 bg-muted text-xl"/><div className="flex flex-wrap gap-2"><Label htmlFor="profile-update-image" className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border bg-background px-3 text-sm font-medium hover:bg-accent"><ImagePlus className="size-4"/>Chọn ảnh</Label><Input className="sr-only" id="profile-update-image" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setImage(event.target.files?.[0])}/>{image && <Button type="button" variant="outline" onClick={() => setImage(undefined)}>Hủy lựa chọn</Button>}</div></div><p className="text-xs text-muted-foreground">JPEG, PNG hoặc WebP; tối đa 5 MB. Ảnh chính thức chỉ đổi sau khi Chi bộ phê duyệt.</p>{image && <p className="text-sm">Ảnh đề nghị: {image.name}</p>}</div>}
              {!editableFields.length && <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">Đợt này chưa mở trường nào bạn có quyền xem và đề nghị cập nhật.</p>}
            </CardContent></Card>
          </section>
          <aside className="min-w-0 space-y-4">
            <Card className="gap-0 py-0"><CardContent className="space-y-4 p-5 md:p-6"><div><h2 className="font-semibold">Nội dung đề nghị cập nhật</h2><p className="mt-1 text-sm text-muted-foreground">Chỉ hiển thị các trường bạn đã thay đổi.</p></div>{Object.keys(changes).length || image ? <div className="space-y-3">{Object.entries(changes).map(([field, next]) => <div key={field} className="rounded-md border p-3 text-sm"><p className="font-medium">{labels[field] ?? field}</p><dl className="mt-2 grid gap-2 sm:grid-cols-2"><div><dt className="text-xs text-muted-foreground">Giá trị hiện tại</dt><dd className="break-words">{display(getCurrentValue(profile, field))}</dd></div><div><dt className="text-xs text-muted-foreground">Giá trị đề nghị</dt><dd className="break-words font-medium">{display(typeof next === 'object' ? (next as { diaChiChiTiet?: string }).diaChiChiTiet : next)}</dd></div></dl></div>)}{image && <div className="rounded-md border p-3 text-sm"><p className="font-medium">Ảnh đại diện</p><p className="mt-1 text-muted-foreground">Ảnh đề nghị: {image.name}</p></div>}</div> : <div className="rounded-md bg-muted/50 p-4 text-sm text-muted-foreground">Chưa có nội dung thay đổi.</div>}
              <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:justify-end"><Button variant="outline" onClick={() => navigate('/ho-so-cua-toi')}>Hủy</Button><Button variant="outline" disabled={!Object.keys(values).length && !image} onClick={reset}><RotateCcw/>Đặt lại thay đổi</Button><AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}><AlertDialogTrigger asChild><Button disabled={!canSubmit}><Send/>{submit.isPending ? 'Đang gửi…' : 'Gửi yêu cầu cập nhật'}</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Xác nhận gửi yêu cầu</AlertDialogTitle><AlertDialogDescription>Yêu cầu sẽ được chuyển đến Chi bộ để xem xét. Hồ sơ chính thức không thay đổi cho đến khi yêu cầu được phê duyệt.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Tiếp tục chỉnh sửa</AlertDialogCancel><AlertDialogAction onClick={(event) => { event.preventDefault(); submit.mutate() }}>Gửi yêu cầu</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div>
              {submit.isError && <p role="alert" className="text-sm text-destructive">Không gửi được yêu cầu. Đợt có thể đã kết thúc hoặc dữ liệu không còn hợp lệ; vui lòng tải lại trang.</p>}
              {submit.isSuccess && <p role="status" className="flex items-center gap-2 text-sm text-primary"><CheckCircle2 className="size-4"/>Yêu cầu đã được gửi đến Chi bộ phê duyệt.</p>}
            </CardContent></Card>
            <Card className="gap-0 py-0"><CardContent className="space-y-3 p-5"><div className="flex items-center gap-2"><ShieldCheck className="size-4 text-primary"/><h2 className="font-semibold">Nguyên tắc cập nhật</h2></div><p className="text-sm text-muted-foreground">Thông tin sinh hoạt, trạng thái Đảng viên, chức vụ, nhiệm kỳ và phân quyền chỉ được thay đổi bằng quy trình nghiệp vụ tương ứng.</p></CardContent></Card>
          </aside>
        </div>

        {requests.length > 0 && <Card className="gap-0 py-0"><CardContent className="space-y-3 p-5 md:p-6"><h2 className="font-semibold">Lịch sử yêu cầu cập nhật</h2><div className="divide-y">{requests.map((request) => <article key={request.ma} className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0"><div><div className="flex flex-wrap items-center gap-2"><Badge variant={request.trangThai === 'CHO_DUYET' ? 'outline' : 'secondary'}>{statusLabels[request.trangThai] ?? request.trangThai}</Badge><span className="text-sm text-muted-foreground">Gửi lúc {dateTime(request.ngayTao)}</span></div><p className="mt-1 text-sm">{Object.keys(request.giaTriDeNghi).map((field) => labels[field] ?? field).join(', ')}{request.coAnhDaiDienDuocDeNghi ? `${Object.keys(request.giaTriDeNghi).length ? ', ' : ''}Ảnh đại diện` : ''}</p>{request.lyDoXuLy && <div className="mt-1 text-sm"><p className="text-muted-foreground">Lý do xử lý:</p><RichTextContent html={request.lyDoXuLy} className="text-muted-foreground"/></div>}</div></article>)}</div></CardContent></Card>}
      </>}
    </>}
  </main>
}

