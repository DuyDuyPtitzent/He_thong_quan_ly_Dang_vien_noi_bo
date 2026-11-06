import { Transform, Type } from 'class-transformer'
import { IsDateString, IsEmail, IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength, ValidateIf, ValidateNested } from 'class-validator'

const trimOptional = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() || undefined : value

const addressTypes = ['NOI_SINH', 'QUE_QUAN', 'THUONG_TRU'] as const
class DiaChiDto {
  @IsIn(addressTypes) loaiDiaChi!: typeof addressTypes[number]
  @IsOptional() @IsIn(['TRONG_NUOC', 'NUOC_NGOAI']) phanLoaiNoiSinh?: string
  @Transform(trimOptional) @IsOptional() @IsString() @MaxLength(100) quocGia?: string
  @Transform(trimOptional) @IsOptional() @IsString() @MaxLength(150) tinhThanhPho?: string
  @Transform(trimOptional) @IsOptional() @IsString() @MaxLength(150) quanHuyen?: string
  @Transform(trimOptional) @IsOptional() @IsString() @MaxLength(150) xaPhuong?: string
  @Transform(trimOptional) @IsOptional() @IsString() @MaxLength(500) diaChiChiTiet?: string
}
class SinhVienDto {
  @Transform(trimOptional) @IsString() @MinLength(1) @MaxLength(50) maSinhVien!: string
  @Transform(trimOptional) @IsOptional() @IsString() @MaxLength(50) trangThaiHocTap?: string
  @Transform(trimOptional) @IsOptional() @IsString() @MaxLength(50) khoaHoc?: string
  @Transform(trimOptional) @IsOptional() @IsString() @MaxLength(200) donViPhuTrach?: string
  @Transform(trimOptional) @IsOptional() @IsString() @MaxLength(250) chuongTrinhDaoTao?: string
  @Transform(trimOptional) @IsOptional() @IsString() @MaxLength(200) nganh?: string
  @Transform(trimOptional) @IsOptional() @IsString() @MaxLength(200) chuyenNganh?: string
  @Transform(trimOptional) @IsOptional() @IsString() @MaxLength(100) lopHanhChinh?: string
}
class TaiKhoanMoiDto {
  @Transform(trimOptional) @IsString() @MinLength(3) @MaxLength(100) tenDangNhap!: string
  @Transform(trimOptional) @IsOptional() @IsEmail() @MaxLength(254) email?: string
  @IsString() @MinLength(12) @MaxLength(128) matKhau!: string
}
export class TaoHoSoDto {
  @Transform(trimOptional) @IsString() @MinLength(1) @MaxLength(50) maHoSoNoiBo!: string
  @Transform(trimOptional) @IsString() @MinLength(1) @MaxLength(200) hoVaTen!: string
  @IsOptional() @IsIn(['DANG_HOAT_DONG', 'TAM_NGUNG', 'NGUNG_HOAT_DONG']) trangThai = 'DANG_HOAT_DONG'
  @IsIn(['DU_BI', 'CHINH_THUC', 'DA_RA_KHOI_DANG', 'TU_TRAN']) trangThaiDangVien!: string
  @Transform(trimOptional) @IsOptional() @IsDateString() ngayVaoDang?: string
  @Transform(trimOptional) @IsOptional() @IsString() @MaxLength(50) soPhieuLyLich?: string
  @Transform(trimOptional) @IsOptional() @IsString() @MaxLength(50) soTheDangVien?: string
  @Transform(trimOptional) @IsOptional() @IsString() @MaxLength(50) khoaDangVien?: string
  @Transform(trimOptional) @IsOptional() @IsDateString() ngayChinhThuc?: string
  @Transform(trimOptional) @IsOptional() @IsString() @MaxLength(100) soQuyetDinhKetNap?: string
  @Transform(trimOptional) @IsOptional() @IsDateString() ngayQuyetDinhKetNap?: string
  @Transform(trimOptional) @IsOptional() @IsString() @MaxLength(200) donViBanHanhQuyetDinh?: string
  @Transform(trimOptional) @IsOptional() @IsString() @MaxLength(200) nguoiGioiThieuThuNhat?: string
  @Transform(trimOptional) @IsOptional() @IsString() @MaxLength(200) nguoiGioiThieuThuHai?: string
  @Transform(trimOptional) @IsOptional() @IsDateString() ngaySinh?: string
  @Transform(trimOptional) @IsOptional() @IsString() @MaxLength(30) gioiTinh?: string
  @Transform(trimOptional) @ValidateIf((dto: TaoHoSoDto) => dto.taiKhoanMoi !== undefined || dto.soCccd !== undefined) @IsString() @Matches(/^\d{12}$/) soCccd?: string
  @Transform(trimOptional) @IsOptional() @IsDateString() ngayCapCccd?: string
  @Transform(trimOptional) @IsOptional() @IsString() @MaxLength(250) noiCapCccd?: string
  @Transform(trimOptional) @IsOptional() @IsString() @MaxLength(100) quocTich?: string
  @Transform(trimOptional) @IsOptional() @IsString() @MaxLength(100) danToc?: string
  @Transform(trimOptional) @IsOptional() @IsString() @MaxLength(100) tonGiao?: string
  @Transform(trimOptional) @IsOptional() @IsString() @MaxLength(30) soDienThoai?: string
  @Transform(trimOptional) @IsOptional() @IsEmail() @MaxLength(254) emailLienHe?: string
  @IsOptional() @ValidateNested({ each: true }) @Type(() => DiaChiDto) diaChi?: DiaChiDto[]
  @IsOptional() @ValidateNested() @Type(() => SinhVienDto) thongTinSinhVien?: SinhVienDto
  @IsUUID('4') maChiBo!: string
  @IsOptional() @IsUUID('4') maTo?: string
  @IsDateString() ngaySinhHoatTu!: string
  @IsOptional() @ValidateNested() @Type(() => TaiKhoanMoiDto) taiKhoanMoi?: TaiKhoanMoiDto
}
export class SuaHoSoDto {
  @Transform(trimOptional) @IsOptional() @IsString() @MinLength(1) @MaxLength(50) maHoSoNoiBo?: string
  @Transform(trimOptional) @IsOptional() @IsString() @MinLength(1) @MaxLength(200) hoVaTen?: string
  @Transform(trimOptional) @IsOptional() @IsString() @MaxLength(30) trangThai?: string
  @Transform(trimOptional) @IsOptional() @IsIn(['DU_BI', 'CHINH_THUC', 'DA_RA_KHOI_DANG', 'TU_TRAN']) trangThaiDangVien?: string
  @Transform(trimOptional) @IsOptional() @IsDateString() ngayVaoDang?: string
  @Transform(trimOptional) @IsOptional() @IsString() @MaxLength(50) soPhieuLyLich?: string
  @Transform(trimOptional) @IsOptional() @IsString() @MaxLength(50) soTheDangVien?: string
  @Transform(trimOptional) @IsOptional() @IsString() @MaxLength(50) khoaDangVien?: string
  @Transform(trimOptional) @IsOptional() @IsDateString() ngayChinhThuc?: string
  @Transform(trimOptional) @IsOptional() @IsDateString() ngaySinh?: string
  @Transform(trimOptional) @IsOptional() @IsString() @MaxLength(30) gioiTinh?: string
  @Transform(trimOptional) @IsOptional() @IsString() @Matches(/^\d{12}$/) soCccd?: string
  @Transform(trimOptional) @IsOptional() @IsDateString() ngayCapCccd?: string
  @Transform(trimOptional) @IsOptional() @IsString() @MaxLength(250) noiCapCccd?: string
  @Transform(trimOptional) @IsOptional() @IsString() @MaxLength(100) quocTich?: string
  @Transform(trimOptional) @IsOptional() @IsString() @MaxLength(100) danToc?: string
  @Transform(trimOptional) @IsOptional() @IsString() @MaxLength(100) tonGiao?: string
  @Transform(trimOptional) @IsOptional() @IsString() @MaxLength(30) soDienThoai?: string
  @Transform(trimOptional) @IsOptional() @IsEmail() @MaxLength(254) emailLienHe?: string
  @IsOptional() @ValidateNested({ each: true }) @Type(() => DiaChiDto) diaChi?: DiaChiDto[]
  @IsOptional() @ValidateNested() @Type(() => SinhVienDto) thongTinSinhVien?: SinhVienDto | null
}
export class DanhSachHoSoDto {
  @IsOptional() @IsString() @MaxLength(150) tuKhoa?: string
  @IsOptional() @IsUUID('4') maChiBo?: string
  @IsOptional() @IsUUID('4') maTo?: string
  @IsOptional() @IsIn(['DU_BI', 'CHINH_THUC', 'DA_RA_KHOI_DANG', 'TU_TRAN']) trangThaiDangVien?: string
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) trang = 1
  @IsOptional() @Type(() => Number) @IsInt() @Min(10) @Max(100) gioiHan = 20
}
