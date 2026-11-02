import { IsArray, IsDateString, IsEnum, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, ArrayUnique, MinLength } from 'class-validator'
import { Type } from 'class-transformer'
import { LoaiPhamVi } from '../../infrastructure/database/generated/prisma/client'

export class TaoVaiTroDto {
  @IsString() @IsNotEmpty() @MaxLength(80) maDinhDanh!: string
  @IsString() @IsNotEmpty() @MaxLength(150) ten!: string
  @IsOptional() @IsString() @MaxLength(2000) moTa?: string
}

export class SuaVaiTroDto {
  @IsOptional() @IsString() @MaxLength(150) ten?: string
  @IsOptional() @IsString() @MaxLength(2000) moTa?: string | null
  @IsOptional() @IsIn(['DANG_HOAT_DONG', 'NGUNG_HOAT_DONG']) trangThai?: string
}

export class CapNhatQuyenVaiTroDto {
  @IsArray() @ArrayUnique() @IsUUID('4', { each: true }) themMaQuyen!: string[]
  @IsArray() @ArrayUnique() @IsUUID('4', { each: true }) boMaQuyen!: string[]
}

export class TaoPhanCongVaiTroDto {
  @IsUUID('4') maTaiKhoan!: string
  @IsUUID('4') maVaiTro!: string
  @IsEnum(LoaiPhamVi) loaiPhamVi!: LoaiPhamVi
  @IsOptional() @IsUUID('4') maDonViGoc?: string
  @IsOptional() @IsArray() @ArrayUnique() @IsUUID('4', { each: true }) danhSachMaDonVi?: string[]
  @IsOptional() @IsDateString() ngayHieuLucDen?: string
  @IsString() @IsNotEmpty() @MaxLength(1000) lyDo!: string
}

export class LocPhanCongVaiTroDto {
  @IsUUID('4') maTaiKhoan!: string
}

export class TimTaiKhoanPhanQuyenDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(100) tuKhoa?: string
  @IsOptional() @Type(() => Number) @IsIn([10, 20, 30, 40, 50]) gioiHan?: number = 20
}

export class SuaPhanCongVaiTroDto {
  @IsEnum(LoaiPhamVi) loaiPhamVi!: LoaiPhamVi
  @IsOptional() @IsUUID('4') maDonViGoc?: string
  @IsOptional() @IsArray() @ArrayUnique() @IsUUID('4', { each: true }) danhSachMaDonVi?: string[]
  @IsOptional() @IsDateString() ngayHieuLucDen?: string
  @IsString() @IsNotEmpty() @MaxLength(1000) lyDo!: string
}

export class ThuHoiPhanCongVaiTroDto {
  @IsString() @IsNotEmpty() @MaxLength(1000) lyDo!: string
}
