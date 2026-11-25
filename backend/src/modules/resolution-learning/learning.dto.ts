import { Transform, Type } from 'class-transformer'
import { IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator'

const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value

export class DanhSachHocTapDto {
  @IsOptional() @Transform(trim) @IsString() @MaxLength(100) tuKhoa?: string
  @IsOptional() @IsString() trangThai?: string
  @IsOptional() @IsUUID() maNamHoc?: string
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) trang = 1
  @IsOptional() @Type(() => Number) @IsInt() @Min(10) @Max(100) gioiHan = 10
  @IsOptional() @IsIn(['ten', 'batDauLuc', 'ngayTao', 'trangThai']) sapXep = 'batDauLuc'
  @IsOptional() @IsIn(['asc', 'desc']) thuTu = 'desc'
}

export class DanhSachThamGiaDto {
  @IsOptional() @Transform(trim) @IsString() @MaxLength(100) tuKhoa?: string
  @IsOptional() @IsIn(['TRONG_DANH_SACH', 'DA_LOAI']) trangThai?: string
  @IsOptional() @IsUUID() maChiBo?: string
  @IsOptional() @IsUUID() maTo?: string
  @IsOptional() @IsIn(['maHoSoNoiBo', 'hoVaTen', 'tenChiBoSnapshot', 'trangThai', 'themLuc']) sapXep = 'themLuc'
  @IsOptional() @IsIn(['asc', 'desc']) thuTu = 'asc'
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) trang = 1
  @IsOptional() @Type(() => Number) @IsInt() @Min(10) @Max(100) gioiHan = 10
}

export class HoSoNgoaiLeDto { @IsUUID() maHoSo!: string }

export class XacNhanDanhSachDuKienDto { @Type(() => Number) @IsInt() @Min(0) phienBanDanhSach!: number }

export class TaoPhanCongNhiemVuDto {
  @IsUUID() maTaiKhoan!: string
  @IsIn(['QUAN_LY_DIEM_DANH', 'XAC_MINH', 'PHE_DUYET', 'CHOT_DANH_SACH']) nhiemVu!: string
  @IsOptional() @IsDateString({ strict: true }) hieuLucTu?: string
  @IsOptional() @IsDateString({ strict: true }) hieuLucDen?: string | null
}

export class SuaPhanCongNhiemVuDto {
  @IsOptional() @IsUUID() maTaiKhoan?: string
  @IsOptional() @IsIn(['QUAN_LY_DIEM_DANH', 'XAC_MINH', 'PHE_DUYET', 'CHOT_DANH_SACH']) nhiemVu?: string
  @IsOptional() @IsDateString({ strict: true }) hieuLucTu?: string
  @ValidateIf((_object, value) => value !== undefined && value !== null) @IsDateString({ strict: true }) hieuLucDen?: string | null
}

export class TaoDotHocDto {
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(200) ten!: string
  @IsOptional() @Transform(trim) @IsString() @MaxLength(2000) moTa?: string
  @IsUUID() maNamHoc!: string
  @IsUUID() maDonViToChuc!: string
  @IsOptional() @IsUUID() maNguoiPhuTrach?: string
  @IsArray() @IsUUID(undefined, { each: true }) phamViDonVi!: string[]
  @IsDateString({ strict: true }) ngayBatDau!: string
  @IsDateString({ strict: true }) ngayKetThuc!: string
}

export class SuaDotHocDto {
  @IsOptional() @Transform(trim) @IsString() @MinLength(1) @MaxLength(200) ten?: string
  @IsOptional() @Transform(trim) @IsString() @MaxLength(2000) moTa?: string | null
  @IsOptional() @IsUUID() maNamHoc?: string
  @IsOptional() @IsUUID() maDonViToChuc?: string
  @IsOptional() @IsUUID() maNguoiPhuTrach?: string | null
  @IsOptional() @IsArray() @IsUUID(undefined, { each: true }) phamViDonVi?: string[]
  @IsOptional() @IsDateString({ strict: true }) ngayBatDau?: string
  @IsOptional() @IsDateString({ strict: true }) ngayKetThuc?: string
}

export class TaoBuoiHocDto {
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(200) ten!: string
  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(50) hinhThuc!: string
  @IsOptional() @Transform(trim) @IsString() @MaxLength(2000) noiDung?: string
  @IsOptional() @Transform(trim) @IsString() @MaxLength(500) diaDiem?: string
  @IsDateString({ strict: true }) batDauLuc!: string
  @IsDateString({ strict: true }) ketThucLuc!: string
  @IsOptional() @IsUUID() maNguoiPhuTrach?: string
  @IsArray() @IsUUID(undefined, { each: true }) phamViDonVi!: string[]
  @IsOptional() @IsBoolean() choPhepTrucTuyen = true
  @IsOptional() @IsBoolean() choPhepQr = true
  @IsOptional() @IsBoolean() choPhepBieuMau = true
  @IsOptional() @IsBoolean() choPhepKhongDangNhap = true
  @IsOptional() @IsInt() @IsIn([15, 30, 60]) chuKyQrGiay = 15
  @IsDateString({ strict: true }) moTheoKeHoachLuc!: string
  @IsDateString({ strict: true }) dongTheoKeHoachLuc!: string
  @IsOptional() @IsBoolean() yeuCauPheDuyet = false
}

export class SuaBuoiHocDto {
  @IsOptional() @Transform(trim) @IsString() @MinLength(1) @MaxLength(200) ten?: string
  @ValidateIf((_object, value) => value !== undefined) @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(50) hinhThuc?: string
  @IsOptional() @Transform(trim) @IsString() @MaxLength(2000) noiDung?: string | null
  @IsOptional() @Transform(trim) @IsString() @MaxLength(500) diaDiem?: string | null
  @IsOptional() @IsDateString({ strict: true }) batDauLuc?: string
  @IsOptional() @IsDateString({ strict: true }) ketThucLuc?: string
  @IsOptional() @IsUUID() maNguoiPhuTrach?: string | null
  @IsOptional() @IsArray() @IsUUID(undefined, { each: true }) phamViDonVi?: string[]
  @IsOptional() @IsBoolean() choPhepTrucTuyen?: boolean
  @IsOptional() @IsBoolean() choPhepQr?: boolean
  @IsOptional() @IsBoolean() choPhepBieuMau?: boolean
  @IsOptional() @IsBoolean() choPhepKhongDangNhap?: boolean
  @IsOptional() @IsInt() @IsIn([15, 30, 60]) chuKyQrGiay?: number
  @IsOptional() @IsDateString({ strict: true }) moTheoKeHoachLuc?: string
  @IsOptional() @IsDateString({ strict: true }) dongTheoKeHoachLuc?: string
  @IsOptional() @IsBoolean() yeuCauPheDuyet?: boolean
}

export class ChuyenTrangThaiHocTapDto {
  @IsIn(['DA_LEN_LICH', 'DANG_DIEN_RA', 'DA_KET_THUC', 'DA_HUY']) trangThai!: string
}
