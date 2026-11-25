import { Type } from 'class-transformer'
import { IsDateString, IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator'

export class LichHocCaNhanQueryDto {
  @IsOptional() @IsIn(['SAP_DIEN_RA', 'DANG_DIEN_RA', 'DA_KET_THUC']) phanLoai?: string
  @IsOptional() @IsDateString({ strict: true }) tuLuc?: string
  @IsOptional() @IsDateString({ strict: true }) denLuc?: string
  @IsOptional() @IsUUID() maDot?: string
  @IsOptional() @IsUUID() maNamHoc?: string
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) trang = 1
  @IsOptional() @Type(() => Number) @IsInt() @Min(10) @Max(100) gioiHan = 20
}

export class LichSuThamGiaCaNhanQueryDto {
  @IsOptional() @IsUUID() maDot?: string
  @IsOptional() @IsUUID() maNamHoc?: string
  @IsOptional() @IsDateString({ strict: true }) tuLuc?: string
  @IsOptional() @IsDateString({ strict: true }) denLuc?: string
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) trang = 1
  @IsOptional() @Type(() => Number) @IsInt() @Min(10) @Max(100) gioiHan = 20
}
