import type { ReactNode, Dispatch, SetStateAction } from 'react'
import { CircleCheck } from 'lucide-react'
import { toast } from 'sonner'
import type { HoSoInput, DonViSinhHoat } from '../../types/member-profiles.types'
import type { LoiTruong } from '../../validation/member-profiles.validation'
import { kiemTraSuaHoSo } from '../../validation/member-profiles.validation'
import { trangThaiText } from '../../constants/member-profile.constants'
import { StandardSheet } from '@/shared/components/StandardSheet'
import { DatePicker } from '@/shared/components/date-time'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { OrganizationUnitPicker } from '@/shared/components/OrganizationUnitPicker'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/shared/components/ui/alert-dialog'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  confirmOpen: boolean
  onConfirmOpenChange: (open: boolean) => void
  editing: string | null
  save: { isPending: boolean; mutate: () => void }
  can: (permission: string) => boolean
  form: HoSoInput
  setForm: Dispatch<SetStateAction<HoSoInput>>
  formErrors: LoiTruong
  setFormErrors: Dispatch<SetStateAction<LoiTruong>>
  createAccount: boolean
  setCreateAccount: (value: boolean) => void
  withStudent: boolean
  setWithStudent: (value: boolean) => void
  chiBo: DonViSinhHoat[]
  to: DonViSinhHoat[]
  field: (key: keyof HoSoInput, label: string, type?: string, required?: boolean) => ReactNode
  submitCreate: () => void
}

export function MemberProfileFormSheet({ open, onOpenChange, confirmOpen, onConfirmOpenChange, editing, save, can, form, setForm, formErrors, setFormErrors, createAccount, setCreateAccount, withStudent, setWithStudent, chiBo, to, field, submitCreate }: Props) {
  const setOpen = onOpenChange
  const setConfirmOpen = onConfirmOpenChange
  return <>      <StandardSheet
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
                  <Label htmlFor="maChiBo">Mã chi bộ sinh hoạt {!editing && <Required />}</Label>
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
                  {editing ? <div className="space-y-1.5"><Label htmlFor="ngaySinhHoatTu">Bắt đầu sinh hoạt tại đơn vị hiện tại</Label><DatePicker id="ngaySinhHoatTu" aria-label="Ngày bắt đầu sinh hoạt tại đơn vị hiện tại" className="h-10 bg-muted" value={form.ngaySinhHoatTu || undefined} disabled readOnly clearable={false} onChange={() => undefined} /></div> : field('ngaySinhHoatTu', 'Ngày bắt đầu sinh hoạt tại Chi bộ', 'date', true)}
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
  </>
}

function Required() {
  return <span aria-hidden="true" className="ml-1 font-bold text-destructive">*</span>
}

function FormSection({ title, aside, children }: { title: string; aside?: string; children: ReactNode }) {
  return <section className="space-y-4 rounded-xl border bg-card p-4 shadow-sm sm:p-6"><header className="flex flex-wrap items-center justify-between gap-3 pb-2"><div className="flex min-w-0 items-center gap-3"><span className="h-5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true"/><h2 className="text-sm font-semibold text-foreground">{title}</h2></div>{aside && <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{aside}</span>}</header>{children}</section>
}
