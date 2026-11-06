import { Type } from 'class-transformer'
import { IsDateString, IsEmail, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator'

export class DanhSachTaiKhoanDto {
  @IsOptional() @IsUUID('4') maTaiKhoan?: string
  @IsOptional() @IsString() @MaxLength(150) tuKhoa?: string
  @IsOptional() @IsIn(['DANG_HOAT_DONG', 'TAM_KHOA', 'NGUNG_HOAT_DONG']) trangThai?: string
  @IsOptional() @IsIn(['DA_LIEN_KET', 'CHUA_LIEN_KET']) tinhTrangLienKet?: string
  @IsOptional() @IsUUID('4') maChiBo?: string
  @IsOptional() @IsUUID('4') maVaiTro?: string
  @IsOptional() @IsIn(['CO', 'KHONG']) coPhanCong?: string
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) trang = 1
  @IsOptional() @Type(() => Number) @IsInt() @Min(10) @Max(100) gioiHan = 20
}

export class TaoTaiKhoanDto {
  @IsString() @MinLength(3) @MaxLength(100) tenDangNhap!: string
  @IsOptional() @IsEmail() @MaxLength(254) email?: string | null
  @IsString() @MinLength(12) @MaxLength(128) matKhauBanDau!: string
  @IsOptional() @IsUUID('4') maHoSo?: string
  @IsOptional() @IsIn(['DANG_HOAT_DONG', 'TAM_KHOA', 'NGUNG_HOAT_DONG']) trangThai?: string
}

export class SuaTaiKhoanDto {
  @IsOptional() @IsString() @MinLength(3) @MaxLength(100) tenDangNhap?: string
  @IsOptional() @IsEmail() @MaxLength(254) email?: string | null
  @IsOptional() @IsIn(['DANG_HOAT_DONG', 'TAM_KHOA', 'NGUNG_HOAT_DONG']) trangThai?: string
  @IsOptional() @IsString() @MinLength(12) @MaxLength(128) matKhauMoi?: string
  @IsOptional() yeuCauDoiMatKhau?: boolean
}

export class DoiTrangThaiTaiKhoanDto {
  @IsIn(['DANG_HOAT_DONG', 'TAM_KHOA', 'NGUNG_HOAT_DONG']) trangThai!: string
  @IsOptional() @IsString() @MaxLength(1000) lyDo?: string
}

export class LienKetHoSoDto {
  @IsOptional() @IsUUID('4') maHoSo?: string | null
}

export class TimHoSoChuaLienKetDto {
  @IsString() @MinLength(2) @MaxLength(100) tuKhoa!: string
}
