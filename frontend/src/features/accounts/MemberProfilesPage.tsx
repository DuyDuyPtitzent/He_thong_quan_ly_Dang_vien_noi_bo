import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CircleCheck, Ellipsis, Plus, RefreshCw, Search, UsersRound } from 'lucide-react'
import { normalizeApiError } from '@/core/api/client'
import { useAuth } from '@/core/auth/auth-context'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { OrganizationUnitPicker } from '@/shared/components/OrganizationUnitPicker'
import { PageHeader } from '@/shared/components/PageHeader'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/shared/components/ui/breadcrumb'
import { StatisticCard } from '@/shared/components/StatisticCard'
import {
  Table,
  TableActionCell,
  TableActionHead,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { StandardSheet } from '@/shared/components/StandardSheet'
import { memberProfilesApi, type HoSoInput } from './member-profiles.api'
import { kiemTraSuaHoSo, kiemTraTaoHoSo, type LoiTruong } from './member-profiles.validation'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog'

const trangThaiText: Record<string, string> = {
  DU_BI: 'Dự bị',
  CHINH_THUC: 'Chính thức',
  DA_RA_KHOI_DANG: 'Đã ra khỏi Đảng',
  TU_TRAN: 'Đã từ trần',
}
const trangThaiBadgeClass: Record<string, string> = {
  DU_BI: 'border-transparent bg-secondary text-secondary-foreground',
  CHINH_THUC: 'border-transparent bg-success text-success-foreground',
  DA_RA_KHOI_DANG: 'border-transparent bg-destructive text-background',
  TU_TRAN: 'border-border bg-muted text-muted-foreground',
}
const ngay = (value?: string | null) => (value ? new Date(value).toLocaleDateString('vi-VN') : '—')
const homNay = () => {
  const value = new Date()
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}
const blank: HoSoInput = {
  maHoSoNoiBo: '',
  hoVaTen: '',
  trangThai: 'DANG_HOAT_DONG',
  trangThaiDangVien: '',
  khoaDangVien: '',
  maChiBo: '',
  ngaySinhHoatTu: homNay(),
}

const loiTuPhanHoi = (error: unknown): LoiTruong => {
  if (typeof error !== 'object' || error === null || !('response' in error)) return {}
  const data = (error as { response?: { data?: { chiTietLoi?: { tenTruong?: string; maLoi?: string[] }[] } } }).response?.data
  const responseData = (error as { response?: { data?: { maLoi?: string } } }).response?.data
  const messages: Record<string, string> = {
    isString: 'Vui lòng nhập nội dung hợp lệ.',
    minLength: 'Thông tin chưa đủ độ dài tối thiểu.',
    maxLength: 'Thông tin vượt quá độ dài cho phép.',
    isEmail: 'Vui lòng nhập địa chỉ thư điện tử hợp lệ.',
    isDateString: 'Vui lòng chọn ngày hợp lệ.',
    matches: 'Dữ liệu không đúng định dạng yêu cầu.',
    isIn: 'Vui lòng chọn một giá trị trong danh sách.',
    isUuid: 'Vui lòng chọn đơn vị hợp lệ.',
    unique: 'Giá trị này đã được sử dụng.',
  }
  const fieldErrors = Object.fromEntries((data?.chiTietLoi ?? []).flatMap((item) => {
    if (!item.tenTruong) return []
    const key = item.tenTruong
    const message = item.maLoi?.map((code) => messages[code]).find(Boolean) ?? 'Thông tin chưa hợp lệ.'
    return [[key, message]]
  }))
  if (responseData?.maLoi === 'CHI_BO_KHONG_HOP_LE') fieldErrors.maChiBo = 'Chi bộ không hợp lệ hoặc chưa hoạt động.'
  if (responseData?.maLoi === 'TO_KHONG_THUOC_CHI_BO') fieldErrors.maTo = 'Tổ không thuộc Chi bộ đã chọn.'
  return fieldErrors
}

export function MemberProfilesPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const auth = useAuth()
  const qc = useQueryClient()
  const permissions = auth.taiKhoan?.quyenDangHoatDong ?? []
  const can = (p: string) => permissions.includes(p)
  const activeRoleName = auth.taiKhoan?.phanCongHopLe.find((assignment) => assignment.maPhanCong === auth.taiKhoan?.maPhanCongVaiTroDangHoatDong)?.tenVaiTro ?? 'chưa chọn vai trò'
  const [page, setPage] = useState(1),
    [keyword, setKeyword] = useState(''),
    [branch, setBranch] = useState('all'),
    [unit, setUnit] = useState('all'),
    [status, setStatus] = useState('all')
  const [open, setOpen] = useState(false),
    [confirmOpen, setConfirmOpen] = useState(false),
    [editing, setEditing] = useState<string | null>(null),
    [form, setForm] = useState<HoSoInput>(blank),
    [formErrors, setFormErrors] = useState<LoiTruong>({}),
    [createAccount, setCreateAccount] = useState(false),
    [withStudent, setWithStudent] = useState(false)
  const list = useQuery({
    queryKey: ['member-profiles', page, keyword, branch, unit, status],
    queryFn: () =>
      memberProfilesApi.list({
        trang: page,
        gioiHan: 10,
        ...(keyword ? { tuKhoa: keyword } : {}),
        ...(branch !== 'all' ? { maChiBo: branch } : {}),
        ...(unit !== 'all' ? { maTo: unit } : {}),
        ...(status !== 'all' ? { trangThaiDangVien: status } : {}),
      }),
    enabled: true,
  })
  const units = useQuery({
    queryKey: ['member-profile-units'],
    queryFn: memberProfilesApi.units,
    enabled: true,
  })
  const save = useMutation({
    mutationFn: () =>
      editing
        ? memberProfilesApi.update(editing, {
            maHoSoNoiBo: form.maHoSoNoiBo,
            soPhieuLyLich: form.soPhieuLyLich,
            soTheDangVien: form.soTheDangVien,
            khoaDangVien: form.khoaDangVien,
            hoVaTen: form.hoVaTen,
            trangThai: form.trangThai,
            trangThaiDangVien: form.trangThaiDangVien,
            ngayVaoDang: form.ngayVaoDang,
            ngayChinhThuc: form.ngayChinhThuc,
            ...(can('HO_SO_CA_NHAN_SUA')
              ? {
                  ngaySinh: form.ngaySinh,
                  gioiTinh: form.gioiTinh,
                  ngayCapCccd: form.ngayCapCccd,
                  noiCapCccd: form.noiCapCccd,
                  quocTich: form.quocTich,
                  danToc: form.danToc,
                  tonGiao: form.tonGiao,
                  soDienThoai: form.soDienThoai,
                  emailLienHe: form.emailLienHe,
                  ...(form.soCccd ? { soCccd: form.soCccd } : {}),
                }
              : {}),
            ...(can('HO_SO_DIA_CHI_SUA') ? { diaChi: form.diaChi?.map(({ loaiDiaChi, phanLoaiNoiSinh, quocGia, tinhThanhPho, quanHuyen, xaPhuong, diaChiChiTiet }) => ({ loaiDiaChi, phanLoaiNoiSinh, quocGia, tinhThanhPho, quanHuyen, xaPhuong, diaChiChiTiet })) } : {}),
            ...(can('HO_SO_SINH_VIEN_SUA') ? { thongTinSinhVien: form.thongTinSinhVien ? {
              maSinhVien: form.thongTinSinhVien.maSinhVien,
              trangThaiHocTap: form.thongTinSinhVien.trangThaiHocTap,
              khoaHoc: form.thongTinSinhVien.khoaHoc,
              donViPhuTrach: form.thongTinSinhVien.donViPhuTrach,
              chuongTrinhDaoTao: form.thongTinSinhVien.chuongTrinhDaoTao,
              nganh: form.thongTinSinhVien.nganh,
              chuyenNganh: form.thongTinSinhVien.chuyenNganh,
              lopHanhChinh: form.thongTinSinhVien.lopHanhChinh,
            } : undefined } : {}),
          })
        : memberProfilesApi.create({
            ...form,
            maChiBo: form.maChiBo,
            ...(withStudent ? { thongTinSinhVien: form.thongTinSinhVien } : {}),
            ...(createAccount ? { taiKhoanMoi: form.taiKhoanMoi } : {}),
          }),
    onSuccess: async () => {
      if (editing) {
        await qc.invalidateQueries({ queryKey: ['member-profile-detail', editing] })
      }
      toast.success(editing ? 'Đã cập nhật hồ sơ Đảng viên.' : 'Đã tạo hồ sơ Đảng viên.')
      setConfirmOpen(false)
      setOpen(false)
      setFormErrors({})
      void qc.invalidateQueries({ queryKey: ['member-profiles'] })
    },
    onError: (error) => {
      const fieldErrors = loiTuPhanHoi(error)
      setConfirmOpen(false)
      setFormErrors(fieldErrors)
      const apiError = normalizeApiError(error)
      const thongBao = Object.keys(fieldErrors).length
        ? 'Vui lòng kiểm tra các trường được đánh dấu.'
        : apiError.status === undefined
          ? 'Không thể kết nối máy chủ. Vui lòng thử lại.'
          : apiError.status === 400
            ? 'Vui lòng nhập đầy đủ các thông tin bắt buộc và kiểm tra dữ liệu.'
            : apiError.status === 403
              ? 'Bạn không có quyền chỉnh sửa hồ sơ này.'
              : apiError.status === 404
                ? 'Không tìm thấy hồ sơ Đảng viên.'
                : apiError.status >= 500
                  ? 'Không thể cập nhật hồ sơ do lỗi hệ thống. Vui lòng thử lại sau.'
                  : apiError.message
      toast.error(thongBao)
      const first = Object.keys(fieldErrors)[0]
      if (first) requestAnimationFrame(() => document.getElementById(first)?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
    },
  })
  const chiBo = units.data?.filter((x) => x.loaiDonVi === 'CHI_BO') ?? []
  const to = units.data?.filter((x) => x.loaiDonVi === 'TO' && x.maChiBo === form.maChiBo) ?? []
  const choices = useMemo(() => units.data ?? [], [units.data])
  const start = useCallback((id?: string) => {
    setEditing(id ?? null)
    setCreateAccount(false)
    setWithStudent(false)
    setFormErrors({})
    setForm({ ...blank })
    setOpen(true)
    if (id)
      void qc
        .fetchQuery({
          queryKey: ['member-profile-detail', id],
          queryFn: () => memberProfilesApi.detail(id),
        })
        .then((row) => {
          setWithStudent(Boolean(row.thongTinSinhVien))
          setForm({
            ...blank,
            ...row,
          ngayVaoDang: row.ngayVaoDang?.slice(0, 10),
            soPhieuLyLich: row.soPhieuLyLich ?? '',
            soTheDangVien: row.soTheDangVien ?? '',
            khoaDangVien: row.khoaDangVien ?? '',
            ngayChinhThuc: row.ngayChinhThuc?.slice(0, 10),
            soQuyetDinhKetNap: row.quaTrinh?.[0]?.soQuyetDinh ?? '',
            ngayQuyetDinhKetNap: row.quaTrinh?.[0]?.ngayQuyetDinh?.slice(0, 10),
            donViBanHanhQuyetDinh: row.quaTrinh?.[0]?.donViBanHanhQuyetDinh ?? '',
            nguoiGioiThieuThuNhat: row.quaTrinh?.[0]?.nguoiGioiThieuThuNhat ?? '',
            nguoiGioiThieuThuHai: row.quaTrinh?.[0]?.nguoiGioiThieuThuHai ?? '',
            ngaySinh: row.thongTinCaNhan?.ngaySinh?.slice(0, 10),
            gioiTinh: row.thongTinCaNhan?.gioiTinh ?? '',
            ngayCapCccd: row.thongTinCaNhan?.ngayCapCccd?.slice(0, 10),
            noiCapCccd: row.thongTinCaNhan?.noiCapCccd ?? '',
            quocTich: row.thongTinCaNhan?.quocTich ?? '',
            danToc: row.thongTinCaNhan?.danToc ?? '',
            tonGiao: row.thongTinCaNhan?.tonGiao ?? '',
            soDienThoai: row.thongTinCaNhan?.soDienThoai ?? '',
            emailLienHe: row.thongTinCaNhan?.emailLienHe ?? '',
            soCccd: row.thongTinCaNhan?.soCccd ?? '',
            diaChi: row.diaChi ?? [],
            maChiBo: row.lichSuDonVi?.[0]?.maChiBo ?? '',
            maTo: row.lichSuDonVi?.[0]?.maTo ?? undefined,
            ngaySinhHoatTu: row.lichSuDonVi?.[0]?.ngayHieuLucTu?.slice(0, 10) ?? '',
            thongTinSinhVien: row.thongTinSinhVien ?? undefined,
          })
        })
  }, [qc])
  useEffect(() => {
    const editProfileId = (location.state as { editProfileId?: string } | null)?.editProfileId
    if (!editProfileId) return
    navigate(location.pathname, { replace: true, state: null })
    start(editProfileId)
  }, [location.pathname, location.state, navigate, start])
  const field = (key: keyof HoSoInput, label: string, type = 'text', required = false) => (
    <div className="space-y-1.5">
      <Label htmlFor={String(key)}>
        {label}{required && <span aria-hidden="true" className="ml-1 text-destructive">*</span>}
      </Label>
        <Input
        id={String(key)}
        type={type}
        maxLength={key === 'khoaDangVien' ? 50 : undefined}
        className="h-10 bg-muted"
        aria-invalid={Boolean(formErrors[String(key)])}
        aria-describedby={formErrors[String(key)] ? `${String(key)}-error` : undefined}
        value={(form[key] as string | undefined) ?? ''}
        onChange={(e) => {
          setForm((f) => ({ ...f, [key]: e.target.value }))
          setFormErrors((errors) => ({ ...errors, [String(key)]: '' }))
        }}
      />
      {formErrors[String(key)] && <p id={`${String(key)}-error`} role="alert" className="text-sm text-destructive">{formErrors[String(key)]}</p>}
    </div>
  )

  const submitCreate = () => {
    const errors = kiemTraTaoHoSo(form, {
      coThongTinSinhVien: withStudent,
      taoTaiKhoan: createAccount,
      maChiBoHopLe: chiBo.some((item) => item.ma === form.maChiBo),
      maToHopLe: !form.maTo || to.some((item) => item.ma === form.maTo),
    })
    setFormErrors(errors)
    const first = Object.keys(errors)[0]
    if (first) {
      requestAnimationFrame(() => document.getElementById(first)?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
      toast.error('Vui lòng kiểm tra các thông tin được đánh dấu.')
      return
    }
    setConfirmOpen(true)
  }
  return (
    <main className="space-y-5 pb-8">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/">Trang chủ</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Hồ sơ Đảng viên</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <PageHeader
        title="Quản lý hồ sơ Đảng viên"
        description="Quản lý, tra cứu và cập nhật thông tin Đảng viên trong phạm vi được phân quyền."
        actions={
          <>
            <Button variant="outline" onClick={() => void list.refetch()}>
              <RefreshCw />
              Làm mới
            </Button>
            {can('HO_SO_DANG_VIEN_TAO') && (
              <Button onClick={() => start()}>
                <Plus />
                Thêm Đảng viên
              </Button>
            )}
          </>
        }
      />
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatisticCard
          label="Tổng số Đảng viên"
          value={list.data?.thongKe.tongSo ?? '—'}
          icon={<UsersRound />}
        />
        <StatisticCard
          label="Đảng viên chính thức"
          value={list.data?.thongKe.chinhThuc ?? '—'}
          icon={<UsersRound />}
        />
        <StatisticCard
          label="Đảng viên dự bị"
          value={list.data?.thongKe.duBi ?? '—'}
          icon={<UsersRound />}
        />
        <StatisticCard
          label="Đảng viên đang sinh hoạt"
          value={list.data?.thongKe.dangSinhHoat ?? '—'}
          icon={<UsersRound />}
        />
      </section>
      <Card className="gap-0 py-0">
        <CardContent className="space-y-4 p-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder={can('HO_SO_CA_NHAN_XEM') ? 'Tìm họ tên, mã hồ sơ hoặc số CCCD' : 'Tìm họ tên hoặc mã hồ sơ'}
                value={keyword}
                onChange={(e) => {
                  setKeyword(e.target.value)
                  setPage(1)
                }}
              />
            </div>
            <OrganizationUnitPicker label="Chi bộ" value={branch} onValueChange={(value) => { setBranch(value); setUnit('all'); setPage(1) }} allOption={{ value: 'all', label: 'Tất cả Chi bộ' }} options={chiBo.map((x) => ({ value: x.ma, label: x.ten ?? x.maDinhDanh ?? x.ma }))} placeholder="Tất cả Chi bộ" />
            <OrganizationUnitPicker label="Tổ" value={unit} onValueChange={(value) => { setUnit(value); setPage(1) }} allOption={{ value: 'all', label: 'Tất cả Tổ' }} options={choices.filter((x) => x.loaiDonVi === 'TO' && (branch === 'all' || x.maChiBo === branch)).map((x) => ({ value: x.ma, label: x.ten ?? x.maDinhDanh ?? x.ma }))} placeholder="Tất cả Tổ" />
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v)
                setPage(1)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Trạng thái Đảng viên" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                {Object.entries(trangThaiText).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(keyword || branch !== 'all' || unit !== 'all' || status !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setKeyword('')
                setBranch('all')
                setUnit('all')
                setStatus('all')
                setPage(1)
              }}
            >
              Đặt lại bộ lọc
            </Button>
          )}
          {list.isError && (
            <p role="alert" className="text-sm text-destructive">
              {normalizeApiError(list.error).status === 403
                ? `Vai trò đang dùng “${activeRoleName}” chưa được cấp quyền Xem danh sách hồ sơ trong phạm vi phù hợp.`
                : normalizeApiError(list.error).message}
            </p>
          )}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>STT</TableHead>
                  <TableHead>Mã hồ sơ</TableHead>
                  <TableHead>Họ và tên</TableHead>
                  <TableHead>Ngày sinh</TableHead>
                  <TableHead>Số CCCD</TableHead>
                  <TableHead>Chi bộ</TableHead>
                  <TableHead>Tổ</TableHead>
                  <TableHead>Trạng thái Đảng viên</TableHead>
                  <TableHead>Ngày vào Đảng</TableHead>
                  <TableHead>Tài khoản</TableHead>
                  <TableActionHead>Thao tác</TableActionHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={11} className="h-24 text-center">
                      Đang tải danh sách hồ sơ…
                    </TableCell>
                  </TableRow>
                ) : !list.data?.duLieu.length ? (
                  <TableRow>
                    <TableCell colSpan={11} className="h-24 text-center">
                      Chưa có hồ sơ Đảng viên phù hợp.
                    </TableCell>
                  </TableRow>
                ) : (
                  list.data.duLieu.map((row) => (
                    <TableRow key={row.maHoSo}>
                      <TableCell>{row.stt}</TableCell>
                      <TableCell>{row.maHoSoNoiBo}</TableCell>
                      <TableCell className="font-medium">{row.hoVaTen}</TableCell>
                      <TableCell>{ngay(row.ngaySinh)}</TableCell>
                      <TableCell>{row.coQuyenXemCaNhan ? row.soCccd ?? 'Chưa cập nhật' : 'Không có quyền xem'}</TableCell>
                      <TableCell>{row.chiBo ?? '—'}</TableCell>
                      <TableCell>{row.to ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={trangThaiBadgeClass[row.trangThaiDangVien] ?? 'border-border bg-muted text-muted-foreground'}>
                          {trangThaiText[row.trangThaiDangVien] ?? 'Chưa cập nhật'}
                        </Badge>
                      </TableCell>
                      <TableCell>{ngay(row.ngayVaoDang)}</TableCell>
                      <TableCell>
                        {row.daLienKetTaiKhoan ? 'Đã liên kết' : 'Chưa liên kết'}
                      </TableCell>
                      <TableActionCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label={`Thao tác với ${row.hoVaTen}`}
                            >
                              <Ellipsis />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {can('HO_SO_DANG_VIEN_XEM_TONG_QUAN') && (
                              <DropdownMenuItem asChild>
                                <Link to={`/ho-so-dang-vien/${row.maHoSo}`}>Xem chi tiết</Link>
                              </DropdownMenuItem>
                            )}
                            {can('HO_SO_DANG_VIEN_SUA_THONG_TIN_CO_BAN') && (
                              <DropdownMenuItem onSelect={() => start(row.maHoSo)}>
                                Chỉnh sửa hồ sơ
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableActionCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <span>Tổng số {list.data?.phanTrang.tongSo ?? 0} kết quả</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Trang trước
              </Button>
              <span>
                Trang {page} / {Math.max(1, Math.ceil((list.data?.phanTrang.tongSo ?? 0) / 10))}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page * 10 >= (list.data?.phanTrang.tongSo ?? 0)}
                onClick={() => setPage((p) => p + 1)}
              >
                Trang sau
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      <StandardSheet
        open={open}
        onOpenChange={setOpen}
        title={
          <span className="flex flex-wrap items-center gap-2">
            <span>{editing ? 'Chỉnh sửa Hồ sơ Đảng viên' : 'Thêm mới Hồ sơ Đảng viên'}</span>
            {!editing && <Badge variant="secondary" className="rounded px-2 py-0.5 text-[11px] uppercase tracking-wider">Mẫu 1-HSĐV</Badge>}
          </span>
        }
        description="Nhập thông tin Đảng viên mới kết nạp hoặc chuyển đến Đảng bộ Học viện."
        footer={
          <>
            <Button variant="outline" className="h-10 px-5" onClick={() => setOpen(false)}>
              Hủy bỏ
            </Button>
            <Button
              className="h-10 gap-2 px-6"
              disabled={
                save.isPending ||
                (editing
                  ? !can('HO_SO_DANG_VIEN_SUA_THONG_TIN_CO_BAN')
                  : !can('HO_SO_DANG_VIEN_TAO'))
              }
              onClick={() => {
                if (editing) {
                  const errors = kiemTraSuaHoSo(form, withStudent)
                  setFormErrors(errors)
                  const first = Object.keys(errors)[0]
                  if (first) {
                    requestAnimationFrame(() => document.getElementById(first)?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
                    toast.error('Vui lòng kiểm tra các trường được đánh dấu.')
                    return
                  }
                  save.mutate()
                }
                else submitCreate()
              }}
            >
              {!save.isPending && !editing && <CircleCheck className="size-[19px]" aria-hidden="true" />}
              {save.isPending ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Lưu hồ sơ Đảng viên'}
            </Button>
          </>
        }
      >
            <FormSection title="1. Thông tin tổ chức Đảng & Trạng thái" aside={editing ? 'Thông tin hồ sơ' : 'Thông tin bắt buộc'}>
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12 min-w-0 space-y-1.5 md:col-span-7">
                  <Label htmlFor="maChiBo">Chi bộ sinh hoạt {!editing && <Required />}</Label>
                  <OrganizationUnitPicker id="maChiBo" label="Chi bộ sinh hoạt" disabled={Boolean(editing)} required={!editing} value={form.maChiBo || 'none'} onValueChange={(v) => { setForm((f) => ({ ...f, maChiBo: v === 'none' ? '' : v, maTo: undefined })); setFormErrors((errors) => ({ ...errors, maChiBo: '', maTo: '' })) }} options={[...chiBo.map((x) => ({ value: x.ma, label: x.ten ?? x.maDinhDanh ?? x.ma })), ...(editing && form.maChiBo && !chiBo.some((x) => x.ma === form.maChiBo) ? [{ value: form.maChiBo, label: `Đơn vị hiện tại (${form.maChiBo})` }] : [])]} clearOption={{ value: 'none', label: editing ? 'Chưa ghi nhận Chi bộ' : 'Chọn Chi bộ' }} placeholder="Chọn Chi bộ" className="w-full bg-muted" />
                  {!editing && <p className="text-xs text-muted-foreground">Cơ cấu tổ chức trực thuộc Đảng bộ Học viện PTIT.</p>}
                  {formErrors.maChiBo && <p role="alert" className="text-sm text-destructive">{formErrors.maChiBo}</p>}
                </div>
                <div className="col-span-12 min-w-0 space-y-1.5 md:col-span-5">
                  <Label htmlFor="maTo">Tổ Đảng trực thuộc <span className="text-muted-foreground">(nếu có)</span></Label>
                  <OrganizationUnitPicker id="maTo" label="Tổ Đảng trực thuộc" disabled={Boolean(editing)} value={form.maTo ?? 'none'} onValueChange={(v) => setForm((f) => ({ ...f, maTo: v === 'none' ? undefined : v }))} options={[...to.map((x) => ({ value: x.ma, label: x.ten ?? x.maDinhDanh ?? x.ma })), ...(editing && form.maTo && !to.some((x) => x.ma === form.maTo) ? [{ value: form.maTo, label: `Tổ hiện tại (${form.maTo})` }] : [])]} clearOption={{ value: 'none', label: 'Không chọn Tổ' }} placeholder="Chọn Tổ Đảng" className="w-full bg-muted" />
                  {formErrors.maTo && <p role="alert" className="text-sm text-destructive">{formErrors.maTo}</p>}
                </div>
                <div className="col-span-12 space-y-1.5 md:col-span-4">
                  <Label htmlFor="trangThaiDangVien">Trạng thái Đảng viên {!editing && <Required />}</Label>
                  <Select value={form.trangThaiDangVien || 'unselected'} onValueChange={(v) => { setForm((f) => ({ ...f, trangThaiDangVien: v === 'unselected' ? '' : v })); setFormErrors((errors) => ({ ...errors, trangThaiDangVien: '' })) }}>
                  <SelectTrigger id="trangThaiDangVien" className="h-10 w-full bg-muted" aria-invalid={Boolean(formErrors.trangThaiDangVien)}><SelectValue placeholder="Chọn trạng thái" /></SelectTrigger>
                    <SelectContent><SelectItem value="unselected">Chưa chọn</SelectItem>{Object.entries(trangThaiText).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                  {formErrors.trangThaiDangVien && <p role="alert" className="text-sm text-destructive">{formErrors.trangThaiDangVien}</p>}
                </div>
                <div className="col-span-12 md:col-span-4">{field('ngayVaoDang', 'Ngày vào Đảng (Dự bị)', 'date', !editing)}</div>
                <div className="col-span-12 md:col-span-4">{field('ngayChinhThuc', 'Ngày chính thức (để trống nếu là Dự bị)', 'date')}</div>
                <div className="col-span-12 md:col-span-4">{field('soPhieuLyLich', 'Số phiếu lý lịch')}</div>
                <div className="col-span-12 md:col-span-4">{field('soTheDangVien', 'Số thẻ Đảng viên')}</div>
                <div className="col-span-12 md:col-span-4">{field('khoaDangVien', 'Khóa Đảng viên')}</div>
                <div className="col-span-12 md:col-span-4">{field('maHoSoNoiBo', 'Mã hồ sơ lưu trữ nội bộ', 'text', true)}</div>
                <div className="col-span-12 md:col-span-6">
                  {editing ? <div className="space-y-1.5"><Label htmlFor="ngaySinhHoatTu">Bắt đầu sinh hoạt tại đơn vị hiện tại</Label><Input id="ngaySinhHoatTu" type="date" className="h-10 bg-muted" value={form.ngaySinhHoatTu} disabled readOnly /></div> : field('ngaySinhHoatTu', 'Ngày bắt đầu sinh hoạt tại Chi bộ', 'date', true)}
                </div>
              </div>
            </FormSection>
            <FormSection title="2. Thông tin cá nhân & Nhân thân" aside="Theo giấy tờ định danh">
              <div className="grid gap-4 sm:grid-cols-2">
                {field('hoVaTen', 'Họ và tên khai sinh', 'text', true)}
                {(!editing || can('HO_SO_CA_NHAN_SUA')) && <>
                  {field('ngaySinh', 'Ngày sinh', 'date')}
                  <fieldset className="space-y-2">
                    <legend className="text-sm font-medium">Giới tính</legend>
                    <RadioGroup className="flex min-h-10 items-center gap-5 rounded-lg border border-input bg-muted px-3" value={form.gioiTinh ?? ''} onValueChange={(value) => setForm((f) => ({ ...f, gioiTinh: value }))}>
                      <Label className="font-normal"><RadioGroupItem value="NAM" />Nam</Label>
                      <Label className="font-normal"><RadioGroupItem value="NU" />Nữ</Label>
                    </RadioGroup>
                  </fieldset>
                  {field('soCccd', 'Số CCCD / Mã định danh', 'text', !editing && createAccount)}
                  {field('ngayCapCccd', 'Ngày cấp CCCD', 'date')}
                  {field('noiCapCccd', 'Nơi cấp')}
                  {field('danToc', 'Dân tộc')}
                  {field('tonGiao', 'Tôn giáo')}
                  {field('soDienThoai', 'Số điện thoại liên hệ', 'tel')}
                  {field('emailLienHe', 'Email liên hệ', 'email')}
                  {field('quocTich', 'Quốc tịch')}
                </>}
              </div>
            </FormSection>
            {(!editing || can('HO_SO_DIA_CHI_SUA')) && (
              <FormSection title="Địa chỉ" aside="Nơi sinh · Quê quán · Thường trú">
                <div className="space-y-3">
                  {(['QUE_QUAN', 'THUONG_TRU', 'NOI_SINH'] as const).map((type) => (
                    <div key={type} className="grid gap-3 sm:grid-cols-2">
                      <h4 className="font-medium sm:col-span-2">{{ QUE_QUAN: 'Quê quán', THUONG_TRU: 'Địa chỉ thường trú', NOI_SINH: 'Nơi sinh' }[type]}</h4>
                      {(['tinhThanhPho', 'quanHuyen', 'xaPhuong', 'diaChiChiTiet'] as const).map((key) => (
                        <div key={key} className="space-y-1.5">
                          <Label>{({ tinhThanhPho: 'Tỉnh/Thành phố', quanHuyen: 'Quận/Huyện', xaPhuong: 'Xã/Phường', diaChiChiTiet: 'Địa chỉ chi tiết' } as const)[key]}</Label>
                          <Input className="h-10 bg-muted" value={form.diaChi?.find((a) => a.loaiDiaChi === type)?.[key] ?? ''} onChange={(e) => setForm((f) => { const entries = (f.diaChi ?? []).filter((a) => a.loaiDiaChi !== type); const current = f.diaChi?.find((a) => a.loaiDiaChi === type); return { ...f, diaChi: [...entries, { loaiDiaChi: type, ...current, [key]: e.target.value }] } })} />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </FormSection>
            )}
            {(!editing || can('HO_SO_SINH_VIEN_SUA')) && (
              <FormSection title="3. Thông tin liên thông Sinh viên / Cán bộ PTIT" aside="Tùy chọn">
                <Label className="flex items-center gap-2 font-medium">
                  <Checkbox
                    checked={withStudent}
                    onCheckedChange={(checked) => setWithStudent(checked === true)}
                  />
                  Hồ sơ có thông tin sinh viên
                </Label>
                {withStudent && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(
                      [
                        'maSinhVien',
                        'khoaHoc',
                        'chuongTrinhDaoTao',
                        'nganh',
                        'chuyenNganh',
                        'lopHanhChinh',
                        'trangThaiHocTap',
                      ] as const
                    ).map((key) => (
                      <div key={key} className="space-y-1.5">
                        <Label htmlFor={`thongTinSinhVien.${key}`}>
                          {
                            (
                              {
                                maSinhVien: 'Mã sinh viên',
                                khoaHoc: 'Khóa học',
                                chuongTrinhDaoTao: 'Chương trình đào tạo',
                                nganh: 'Ngành',
                                chuyenNganh: 'Chuyên ngành',
                                lopHanhChinh: 'Lớp hành chính',
                                trangThaiHocTap: 'Trạng thái học tập',
                              } as const
                            )[key]
                          }
                          {key === 'maSinhVien' && <span aria-hidden="true" className="ml-1 text-destructive">*</span>}
                        </Label>
                        <Input
                          id={`thongTinSinhVien.${key}`}
                          className="h-10 bg-muted"
                          value={form.thongTinSinhVien?.[key] ?? ''}
                          onChange={(e) =>
                            {
                              setForm((f) => ({
                                ...f,
                                thongTinSinhVien: {
                                  maSinhVien: f.thongTinSinhVien?.maSinhVien ?? '',
                                  ...f.thongTinSinhVien,
                                  [key]: e.target.value,
                                },
                              }))
                              if (key === 'maSinhVien') setFormErrors((errors) => ({ ...errors, 'thongTinSinhVien.maSinhVien': '' }))
                            }
                          }
                        />
                        {key === 'maSinhVien' && formErrors['thongTinSinhVien.maSinhVien'] && <p role="alert" className="text-sm text-destructive">{formErrors['thongTinSinhVien.maSinhVien']}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </FormSection>
            )}
            {!editing && (
              <FormSection title="4. Quyết định kết nạp / Chuyển Đảng" aside="Thông tin bổ sung">
                <div className="grid gap-4 sm:grid-cols-2">
                  {field('soQuyetDinhKetNap', 'Số quyết định kết nạp')}
                  {field('ngayQuyetDinhKetNap', 'Ngày quyết định', 'date')}
                  {field('donViBanHanhQuyetDinh', 'Đơn vị ban hành quyết định')}
                  {field('nguoiGioiThieuThuNhat', 'Đảng viên giới thiệu thứ nhất')}
                  {field('nguoiGioiThieuThuHai', 'Đảng viên / Đoàn thể giới thiệu thứ hai')}
                </div>
              </FormSection>
            )}
            {!editing && can('TAI_KHOAN_TAO') && can('TAI_KHOAN_LIEN_KET_HO_SO') && (
              <section className="space-y-3">
                <Label className="flex items-center gap-2 font-medium">
                  <Checkbox
                    checked={createAccount}
                    onCheckedChange={(checked) => setCreateAccount(checked === true)}
                  />
                  Đồng thời tạo tài khoản đăng nhập cho Đảng viên này
                </Label>
                {createAccount && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <p className="text-sm text-muted-foreground sm:col-span-2">CCCD gồm 12 chữ số, bắt buộc để kiểm tra trùng hồ sơ và tài khoản trên toàn hệ thống.</p>
                    {(['tenDangNhap', 'email', 'matKhau'] as const).map((key) => (
                      <div key={key} className="space-y-1.5">
                        <Label htmlFor={`taiKhoanMoi.${key}`}>
                          {key === 'tenDangNhap'
                            ? 'Tên đăng nhập'
                            : key === 'email'
                              ? 'Email đăng nhập'
                              : 'Mật khẩu khởi tạo'}
                          {key !== 'email' && <span aria-hidden="true" className="ml-1 text-destructive">*</span>}
                        </Label>
                        <Input
                          id={`taiKhoanMoi.${key}`}
                          type={key === 'matKhau' ? 'password' : key === 'email' ? 'email' : 'text'}
                          aria-invalid={Boolean(formErrors[`taiKhoanMoi.${key}`])}
                          value={form.taiKhoanMoi?.[key] ?? ''}
                          onChange={(e) =>
                            {
                              setForm((f) => ({
                                ...f,
                                taiKhoanMoi: {
                                  tenDangNhap: f.taiKhoanMoi?.tenDangNhap ?? '',
                                  matKhau: f.taiKhoanMoi?.matKhau ?? '',
                                  ...f.taiKhoanMoi,
                                  [key]: e.target.value,
                                },
                              }))
                              setFormErrors((errors) => ({ ...errors, [`taiKhoanMoi.${key}`]: '' }))
                            }
                          }
                        />
                        {formErrors[`taiKhoanMoi.${key}`] && <p role="alert" className="text-sm text-destructive">{formErrors[`taiKhoanMoi.${key}`]}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
      </StandardSheet>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận tạo hồ sơ Đảng viên</AlertDialogTitle>
            <AlertDialogDescription>
              Kiểm tra thông tin trước khi lưu. Mật khẩu sẽ không được hiển thị.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <dl className="grid gap-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Họ và tên</dt>
              <dd className="font-medium">{form.hoVaTen || 'Chưa nhập'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Mã hồ sơ</dt>
              <dd>{form.maHoSoNoiBo || 'Chưa nhập'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Chi bộ</dt>
              <dd>{chiBo.find((x) => x.ma === form.maChiBo)?.ten ?? 'Chưa chọn'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Tổ</dt>
              <dd>{to.find((x) => x.ma === form.maTo)?.ten ?? 'Không chọn'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Trạng thái hồ sơ</dt>
              <dd>{form.trangThai}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Trạng thái Đảng viên</dt>
              <dd>{trangThaiText[form.trangThaiDangVien] ?? 'Chưa chọn'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Tạo tài khoản</dt>
              <dd>{createAccount ? `Có — ${form.taiKhoanMoi?.tenDangNhap ?? ''}` : 'Không'}</dd>
            </div>
          </dl>
          <AlertDialogFooter>
            <AlertDialogCancel>Quay lại biểu mẫu</AlertDialogCancel>
            <AlertDialogAction disabled={save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? 'Đang lưu…' : 'Xác nhận lưu'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  )
}

function Required() {
  return <span aria-hidden="true" className="ml-1 font-bold text-destructive">*</span>
}

function FormSection({
  title,
  aside,
  children,
}: {
  title: string
  aside?: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-4 rounded-xl border bg-card p-4 shadow-sm sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3 pb-2">
        <div className="flex min-w-0 items-center gap-3">
          <span className="h-5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        </div>
        {aside && <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{aside}</span>}
      </header>
      {children}
    </section>
  )
}

