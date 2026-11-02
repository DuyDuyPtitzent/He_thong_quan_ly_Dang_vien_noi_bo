import { IsDateString, IsEnum, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min, MaxLength } from 'class-validator'
import { LoaiDonVi } from '../../infrastructure/database/generated/prisma/client'

export const trangThaiDonViHopLe = ['DANG_HOAT_DONG', 'TAM_NGUNG', 'NGUNG_HOAT_DONG'] as const

export class DanhSachDonViDto {
  @IsOptional() @IsEnum(LoaiDonVi) loaiDonVi?: LoaiDonVi
  @IsOptional() @IsString() trangThai?: string
  @IsOptional() @IsString() @MaxLength(200) tuKhoa?: string
  @IsOptional() @IsInt() @Min(1) trang?: number = 1
  @IsOptional() @IsInt() @Min(1) @Max(100) gioiHan?: number = 20
}

export class CayDonViDto {
  @IsOptional() @IsDateString() thoiDiem?: string
}

export class TaoDonViDto {
  @IsEnum(LoaiDonVi) loaiDonVi!: LoaiDonVi
  @IsString() @MaxLength(50) @IsOptional() maDinhDanh?: string
  @IsString() @MaxLength(200) tenDonVi!: string
  @IsOptional() @IsString() @IsIn(trangThaiDonViHopLe) trangThai = 'DANG_HOAT_DONG'
  @IsOptional() @IsUUID() maDonViCha?: string
  @IsDateString() ngayHieuLucTu!: string
}

export class SuaDonViDto {
  @IsOptional() @IsString() @MaxLength(50) maDinhDanh?: string | null
  @IsOptional() @IsEnum(LoaiDonVi) loaiDonVi?: LoaiDonVi
}

export class CapNhatTrangThaiDonViDto {
  @IsString() @IsIn(trangThaiDonViHopLe) trangThai!: string
}

export class DoiTenDonViDto {
  @IsString() @MaxLength(200) tenDonVi!: string
  @IsDateString() ngayHieuLucTu!: string
}

export class DoiQuanHeChaDto {
  @IsOptional() @IsUUID() maDonViCha?: string
  @IsDateString() ngayHieuLucTu!: string
}
