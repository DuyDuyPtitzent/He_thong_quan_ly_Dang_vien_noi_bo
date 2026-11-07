import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Ellipsis, Plus, RefreshCw, Search, UsersRound } from 'lucide-react'
import { normalizeApiError } from '@/core/api/client'
import { useAuth } from '@/core/auth/auth-context'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
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
import { memberProfilesApi } from '../api/member-profiles.api'
import type { HoSoInput, HoSoRow } from '../types/member-profiles.types'
import { kiemTraTaoHoSo, type LoiTruong } from '../validation/member-profiles.validation'
import { profileDetailToForm, profileFormToCreatePayload, profileFormToUpdatePayload } from '../services/profile-form.service'
import { MemberProfileFormSheet } from '../components/forms/MemberProfileFormSheet'
import { MemberProfileDeleteDialog } from '../components/MemberProfileDeleteDialog'
import { MemberProfilesImportExport } from '../components/import-export/MemberProfilesImportExport'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { DatePicker } from '@/shared/components/date-time'

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
    [pageSize, setPageSize] = useState(10),
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
  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>([])
  const [deleteTarget, setDeleteTarget] = useState<HoSoRow | null>(null)
  const list = useQuery({
    queryKey: ['member-profiles', page, pageSize, keyword, branch, unit, status],
    queryFn: () =>
      memberProfilesApi.list({
        trang: page,
        gioiHan: pageSize,
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
  const totalRecords = list.data?.phanTrang.tongSo ?? 0
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize))
  const save = useMutation({
    mutationFn: () =>
      editing
        ? memberProfilesApi.update(editing, profileFormToUpdatePayload(form, can))
        : memberProfilesApi.create(profileFormToCreatePayload(form, withStudent, createAccount)),
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
          setForm(profileDetailToForm(row, blank))
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
        {type === 'date' ? <DatePicker
        id={String(key)}
        aria-label={label}
        required={required}
        clearable={!required}
        className="h-10 bg-muted"
        aria-invalid={Boolean(formErrors[String(key)])}
        aria-describedby={formErrors[String(key)] ? `${String(key)}-error` : undefined}
        value={(form[key] as string | undefined) || undefined}
        onChange={(value) => {
          setForm((f) => ({ ...f, [key]: value ?? '' }))
          setFormErrors((errors) => ({ ...errors, [String(key)]: '' }))
        }}
      /> : <Input
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
      />}
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
          <div className="flex flex-wrap items-center gap-2">
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
            <MemberProfilesImportExport canImport={can('HO_SO_DANG_VIEN_TAO')} canExport={can('HO_SO_XUAT_DU_LIEU')} selectedIds={selectedProfileIds} onImported={() => void qc.invalidateQueries({ queryKey: ['member-profiles'] })} filters={{ ...(keyword ? { tuKhoa: keyword } : {}), ...(branch !== 'all' ? { maChiBo: branch } : {}), ...(unit !== 'all' ? { maTo: unit } : {}), ...(status !== 'all' ? { trangThaiDangVien: status } : {}) }} />
          </div>
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
                  {can('HO_SO_XUAT_DU_LIEU') && <TableHead><Checkbox aria-label="Chọn toàn bộ hồ sơ trên trang" checked={Boolean(list.data?.duLieu.length) && (list.data?.duLieu.every((row) => selectedProfileIds.includes(row.maHoSo)) ?? false)} onCheckedChange={(checked) => setSelectedProfileIds((current) => checked ? [...new Set([...current, ...(list.data?.duLieu.map((row) => row.maHoSo) ?? [])])] : current.filter((id) => !(list.data?.duLieu.some((row) => row.maHoSo === id) ?? false)))} /></TableHead>}
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
                    <TableCell colSpan={can('HO_SO_XUAT_DU_LIEU') ? 12 : 11} className="h-24 text-center">
                      Đang tải danh sách hồ sơ…
                    </TableCell>
                  </TableRow>
                ) : !list.data?.duLieu.length ? (
                  <TableRow>
                    <TableCell colSpan={can('HO_SO_XUAT_DU_LIEU') ? 12 : 11} className="h-24 text-center">
                      Chưa có hồ sơ Đảng viên phù hợp.
                    </TableCell>
                  </TableRow>
                ) : (
                  list.data.duLieu.map((row) => (
                    <TableRow key={row.maHoSo}>
                      <TableCell>{row.stt}</TableCell>
                      {can('HO_SO_XUAT_DU_LIEU') && <TableCell><Checkbox aria-label={`Chọn ${row.hoVaTen}`} checked={selectedProfileIds.includes(row.maHoSo)} onCheckedChange={(checked) => setSelectedProfileIds((current) => checked ? [...new Set([...current, row.maHoSo])] : current.filter((id) => id !== row.maHoSo))} /></TableCell>}
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
                            {can('HO_SO_DANG_VIEN_XOA') && <DropdownMenuItem variant="destructive" onSelect={() => setDeleteTarget(row)}>Xóa hồ sơ</DropdownMenuItem>}
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
            <div className="flex flex-wrap items-center gap-4">
              <span>Tổng số {totalRecords} kết quả</span>
              <div className="flex items-center gap-2">
                <label htmlFor="member-profiles-page-size" className="whitespace-nowrap">Số dòng mỗi trang</label>
                <Select value={String(pageSize)} onValueChange={(value) => { setPageSize(Number(value)); setPage(1) }}>
                  <SelectTrigger id="member-profiles-page-size" aria-label="Số dòng mỗi trang" className="w-[76px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 20, 50, 100].map((size) => <SelectItem key={size} value={String(size)}>{size}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
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
                Trang {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Trang sau
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      <MemberProfileFormSheet open={open} onOpenChange={setOpen} confirmOpen={confirmOpen} onConfirmOpenChange={setConfirmOpen} editing={editing} save={save} can={can} form={form} setForm={setForm} formErrors={formErrors} setFormErrors={setFormErrors} createAccount={createAccount} setCreateAccount={setCreateAccount} withStudent={withStudent} setWithStudent={setWithStudent} chiBo={chiBo} to={to} field={field} submitCreate={submitCreate} />
      <MemberProfileDeleteDialog profile={deleteTarget} onOpenChange={(nextOpen) => { if (!nextOpen) setDeleteTarget(null) }} onDeleted={(id) => setSelectedProfileIds((current) => current.filter((selected) => selected !== id))} />
    </main>
  )
}
