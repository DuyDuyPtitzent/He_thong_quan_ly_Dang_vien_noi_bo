import type { HoSoChiTiet } from '../types/member-profiles.types'

type CompletionProfile = {
  maHoSoNoiBo?: string | null
  hoVaTen?: string | null
  trangThaiDangVien?: string | null
  ngayVaoDang?: string | null
  ngayChinhThuc?: string | null
  soPhieuLyLich?: string | null
  soTheDangVien?: string | null
  khoaDangVien?: string | null
  thongTinCaNhan?: HoSoChiTiet['thongTinCaNhan']
  diaChi?: {
    loaiDiaChi: 'NOI_SINH' | 'QUE_QUAN' | 'THUONG_TRU' | 'NOI_O_HIEN_NAY'
    phanLoaiNoiSinh?: string | null
    quocGia?: string | null
    tinhThanhPho?: string | null
    quanHuyen?: string | null
    xaPhuong?: string | null
    diaChiChiTiet?: string | null
  }[] | null
  thongTinSinhVien?: {
    maSinhVien?: string | null
    khoaHoc?: string | null
    nganh?: string | null
    chuyenNganh?: string | null
    chuongTrinhDaoTao?: string | null
    lopHanhChinh?: string | null
  } | null
  ngaySinh?: string | null
  gioiTinh?: string | null
  soCccd?: string | null
  ngayCapCccd?: string | null
  noiCapCccd?: string | null
  quocTich?: string | null
  danToc?: string | null
  tonGiao?: string | null
  soDienThoai?: string | null
  soDienThoaiBoNguoiNuoiDuong?: string | null
  soDienThoaiMeNguoiNuoiDuong?: string | null
  emailLienHe?: string | null
}

export type TruongTienDoHoSo = {
  ma: string
  ten: string
  nhom: 'THONG_TIN_CA_NHAN' | 'THONG_TIN_SINH_VIEN' | 'THONG_TIN_DANG_VIEN'
}

export type TienDoHoSo = {
  soTruongDaHoanThien: number
  tongSoTruongBatBuoc: number
  tyLe: number
  truongConThieu: TruongTienDoHoSo[]
}

type FieldDefinition = TruongTienDoHoSo & { get: (profile: CompletionProfile) => unknown; valid?: (value: unknown) => boolean }

const hasText = (value: unknown) => typeof value === 'string' && value.trim().length > 0
const text = (maxLength: number) => (value: unknown) => hasText(value) && (value as string).trim().length <= maxLength
const date = (value: unknown) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value)) return false
  const day = value.slice(0, 10)
  const parsed = new Date(`${day}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && !Number.isNaN(Date.parse(value)) && parsed.toISOString().slice(0, 10) === day
}

const fields: FieldDefinition[] = [
  { ma: 'hoVaTen', ten: 'Họ và tên', nhom: 'THONG_TIN_CA_NHAN', get: (p) => p.hoVaTen, valid: text(200) },
  { ma: 'thongTinCaNhan.ngaySinh', ten: 'Ngày sinh', nhom: 'THONG_TIN_CA_NHAN', get: (p) => p.thongTinCaNhan?.ngaySinh ?? p.ngaySinh, valid: date },
  { ma: 'thongTinCaNhan.gioiTinh', ten: 'Giới tính', nhom: 'THONG_TIN_CA_NHAN', get: (p) => p.thongTinCaNhan?.gioiTinh ?? p.gioiTinh, valid: (v) => v === 'NAM' || v === 'NU' },
  { ma: 'thongTinCaNhan.soCccd', ten: 'Số CCCD', nhom: 'THONG_TIN_CA_NHAN', get: (p) => p.thongTinCaNhan?.soCccd ?? p.soCccd, valid: (v) => typeof v === 'string' && /^\d{12}$/.test(v) },
  { ma: 'thongTinCaNhan.ngayCapCccd', ten: 'Ngày cấp CCCD', nhom: 'THONG_TIN_CA_NHAN', get: (p) => p.thongTinCaNhan?.ngayCapCccd ?? p.ngayCapCccd, valid: date },
  { ma: 'thongTinCaNhan.noiCapCccd', ten: 'Nơi cấp CCCD', nhom: 'THONG_TIN_CA_NHAN', get: (p) => p.thongTinCaNhan?.noiCapCccd ?? p.noiCapCccd, valid: text(250) },
  { ma: 'thongTinCaNhan.quocTich', ten: 'Quốc tịch', nhom: 'THONG_TIN_CA_NHAN', get: (p) => p.thongTinCaNhan?.quocTich ?? p.quocTich, valid: text(100) },
  { ma: 'thongTinCaNhan.danToc', ten: 'Dân tộc', nhom: 'THONG_TIN_CA_NHAN', get: (p) => p.thongTinCaNhan?.danToc ?? p.danToc, valid: text(100) },
  { ma: 'thongTinCaNhan.tonGiao', ten: 'Tôn giáo', nhom: 'THONG_TIN_CA_NHAN', get: (p) => p.thongTinCaNhan?.tonGiao ?? p.tonGiao, valid: text(100) },
  { ma: 'thongTinCaNhan.soDienThoai', ten: 'Số điện thoại', nhom: 'THONG_TIN_CA_NHAN', get: (p) => p.thongTinCaNhan?.soDienThoai ?? p.soDienThoai, valid: text(30) },
  { ma: 'thongTinCaNhan.soDienThoaiBoNguoiNuoiDuong', ten: 'Số điện thoại bố/người nuôi dưỡng', nhom: 'THONG_TIN_CA_NHAN', get: (p) => p.thongTinCaNhan?.soDienThoaiBoNguoiNuoiDuong ?? p.soDienThoaiBoNguoiNuoiDuong, valid: (v) => typeof v === 'string' && /^\+?[0-9 ().-]{7,30}$/.test(v) },
  { ma: 'thongTinCaNhan.soDienThoaiMeNguoiNuoiDuong', ten: 'Số điện thoại mẹ/người nuôi dưỡng', nhom: 'THONG_TIN_CA_NHAN', get: (p) => p.thongTinCaNhan?.soDienThoaiMeNguoiNuoiDuong ?? p.soDienThoaiMeNguoiNuoiDuong, valid: (v) => typeof v === 'string' && /^\+?[0-9 ().-]{7,30}$/.test(v) },
  { ma: 'thongTinCaNhan.emailLienHe', ten: 'Thư điện tử liên hệ', nhom: 'THONG_TIN_CA_NHAN', get: (p) => p.thongTinCaNhan?.emailLienHe ?? p.emailLienHe, valid: (v) => typeof v === 'string' && v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) },
  ...([
    ['NOI_SINH', 'Nơi sinh, cấp giấy khai sinh'], ['QUE_QUAN', 'Quê quán'], ['THUONG_TRU', 'Nơi thường trú'], ['NOI_O_HIEN_NAY', 'Nơi ở hiện nay'],
  ] as const).map(([kind, name]) => ({
    ma: `diaChi.${kind}`, ten: name, nhom: 'THONG_TIN_CA_NHAN' as const,
    get: (p: CompletionProfile) => p.diaChi?.find((row) => row.loaiDiaChi === kind),
    valid: (value: unknown) => {
      if (!value || typeof value !== 'object') return false
      const row = value as NonNullable<HoSoChiTiet['diaChi']>[number]
      if (row.phanLoaiNoiSinh && !['TRONG_NUOC', 'NUOC_NGOAI'].includes(row.phanLoaiNoiSinh)) return false
      return [row.diaChiChiTiet, row.xaPhuong, row.quanHuyen, row.tinhThanhPho, row.quocGia].some(hasText)
        && (row.diaChiChiTiet?.length ?? 0) <= 500 && (row.xaPhuong?.length ?? 0) <= 150
        && (row.quanHuyen?.length ?? 0) <= 150 && (row.tinhThanhPho?.length ?? 0) <= 150 && (row.quocGia?.length ?? 0) <= 100
    },
  })),
  ...([
    ['maSinhVien', 'Mã sinh viên', 50], ['khoaHoc', 'Khóa học', 50], ['nganh', 'Ngành', 200],
    ['chuyenNganh', 'Chuyên ngành', 200], ['chuongTrinhDaoTao', 'Chương trình đào tạo', 250], ['lopHanhChinh', 'Lớp hành chính', 100],
  ] as const).map(([key, name, maxLength]) => ({
    ma: `thongTinSinhVien.${key}`, ten: name, nhom: 'THONG_TIN_SINH_VIEN' as const,
    get: (p: CompletionProfile) => p.thongTinSinhVien?.[key], valid: text(maxLength),
  })),
  { ma: 'maHoSoNoiBo', ten: 'Mã hồ sơ', nhom: 'THONG_TIN_DANG_VIEN', get: (p) => p.maHoSoNoiBo, valid: text(50) },
  { ma: 'soPhieuLyLich', ten: 'Số phiếu lý lịch', nhom: 'THONG_TIN_DANG_VIEN', get: (p) => p.soPhieuLyLich, valid: text(50) },
  { ma: 'soTheDangVien', ten: 'Số thẻ Đảng viên', nhom: 'THONG_TIN_DANG_VIEN', get: (p) => p.soTheDangVien, valid: text(50) },
  { ma: 'khoaDangVien', ten: 'Khóa Đảng viên', nhom: 'THONG_TIN_DANG_VIEN', get: (p) => p.khoaDangVien, valid: (v) => typeof v === 'string' && /^D\d{2}$/.test(v) },
  { ma: 'trangThaiDangVien', ten: 'Loại Đảng viên', nhom: 'THONG_TIN_DANG_VIEN', get: (p) => p.trangThaiDangVien, valid: (v) => ['DU_BI', 'CHINH_THUC', 'DA_RA_KHOI_DANG', 'TU_TRAN'].includes(String(v)) },
  { ma: 'ngayVaoDang', ten: 'Ngày vào Đảng', nhom: 'THONG_TIN_DANG_VIEN', get: (p) => p.ngayVaoDang, valid: date },
  { ma: 'ngayChinhThuc', ten: 'Ngày chính thức', nhom: 'THONG_TIN_DANG_VIEN', get: (p) => p.ngayChinhThuc, valid: date },
]

export function tinhTienDoHoSo(profile: CompletionProfile): TienDoHoSo {
  const applicable = fields.filter((field) => !field.ma.startsWith('thongTinSinhVien.') || Boolean(profile.thongTinSinhVien))
    .filter((field) => field.ma !== 'ngayChinhThuc' || profile.trangThaiDangVien === 'CHINH_THUC')
  const truongConThieu = applicable.filter((field) => !(field.valid ?? hasText)(field.get(profile))).map(({ ma, ten, nhom }) => ({ ma, ten, nhom }))
  const tongSoTruongBatBuoc = applicable.length
  const soTruongDaHoanThien = tongSoTruongBatBuoc - truongConThieu.length
  return { soTruongDaHoanThien, tongSoTruongBatBuoc, tyLe: tongSoTruongBatBuoc ? Math.round(soTruongDaHoanThien / tongSoTruongBatBuoc * 100) : 100, truongConThieu }
}

export const profileCompletionFieldId = (field: string) => `profile-field-${field.replaceAll('.', '-')}`
