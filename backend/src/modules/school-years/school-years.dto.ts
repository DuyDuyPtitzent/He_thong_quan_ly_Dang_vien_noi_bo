import { Transform, Type } from 'class-transformer'
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator'

const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value

export class DanhSachNamHocDto {
  @Transform(trim) @IsOptional() @IsString() @MaxLength(100) tuKhoa?: string
  @IsOptional() @IsIn(['DANG_DIEN_RA', 'SAP_DIEN_RA', 'DA_KET_THUC', 'DANG_HOAT_DONG', 'NGUNG_HOAT_DONG']) trangThai?: string
  @IsOptional() @IsDateString() tuNgay?: string
  @IsOptional() @IsDateString() denNgay?: string
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) trang = 1
  @IsOptional() @Type(() => Number) @IsInt() @Min(10) @Max(100) gioiHan = 10
}

export class TaoNamHocDto {
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(30) maNamHoc!: string
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(100) tenNamHoc!: string
  @IsDateString() ngayBatDau!: string
  @IsDateString() ngayKetThuc!: string
  @IsOptional() @IsIn(['DANG_HOAT_DONG', 'NGUNG_HOAT_DONG']) trangThai = 'DANG_HOAT_DONG'
}

export class SuaNamHocDto {
  @Transform(trim) @IsOptional() @IsString() @MinLength(1) @MaxLength(30) maNamHoc?: string
  @Transform(trim) @IsOptional() @IsString() @MinLength(1) @MaxLength(100) tenNamHoc?: string
  @IsOptional() @IsDateString() ngayBatDau?: string
  @IsOptional() @IsDateString() ngayKetThuc?: string
  @IsOptional() @IsIn(['DANG_HOAT_DONG', 'NGUNG_HOAT_DONG']) trangThai?: string
}
