import { Transform, Type } from 'class-transformer'
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator'

const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value

export class DanhSachNhomDanhMucDto {
  @IsOptional() @Transform(({ value }) => value === true || value === 'true') @IsBoolean() baoGomNgungHoatDong = false
}

export class TaoNhomDanhMucDto {
  @Transform(trim) @IsString() @Matches(/^[A-Z][A-Z0-9_]{1,99}$/) maNhom!: string
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(200) ten!: string
  @IsOptional() @Transform(trim) @IsString() @MaxLength(1000) moTa?: string
}

export class SuaNhomDanhMucDto {
  @IsOptional() @Transform(trim) @IsString() @MinLength(1) @MaxLength(200) ten?: string
  @IsOptional() @Transform(trim) @IsString() @MaxLength(1000) moTa?: string | null
  @IsOptional() @IsIn(['DANG_HOAT_DONG', 'NGUNG_HOAT_DONG']) trangThai?: string
}

export class DanhSachGiaTriDanhMucDto {
  @IsOptional() @Transform(({ value }) => value === true || value === 'true') @IsBoolean() baoGomNgungHoatDong = false
}

export class TaoGiaTriDanhMucDto {
  @Transform(trim) @IsString() @Matches(/^[A-Z0-9][A-Z0-9_-]{0,99}$/) maGiaTri!: string
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(200) tenHienThi!: string
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(2147483647) thuTu = 0
}

export class SuaGiaTriDanhMucDto {
  @IsOptional() @Transform(trim) @IsString() @MinLength(1) @MaxLength(200) tenHienThi?: string
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(2147483647) thuTu?: number
  @IsOptional() @IsIn(['DANG_HOAT_DONG', 'NGUNG_HOAT_DONG']) trangThai?: string
}
