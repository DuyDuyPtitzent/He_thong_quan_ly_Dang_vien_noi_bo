import { Transform, Type } from 'class-transformer'
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator'

const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value

export class DanhSachYeuCauDiemDanhDto {
  @IsOptional() @Transform(trim) @IsString() @MaxLength(120) tuKhoa?: string
  @IsOptional() @IsIn(['CHO_XAC_MINH', 'CHO_PHE_DUYET', 'DA_DUYET', 'TU_CHOI']) trangThai?: string
  @IsOptional() @IsUUID() maDonVi?: string
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) trang = 1
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) gioiHan = 20
}

export class XacMinhYeuCauDiemDanhDto {
  @IsIn(['HOP_LE', 'KHONG_HOP_LE']) ketQuaXacMinh!: 'HOP_LE' | 'KHONG_HOP_LE'
  @IsOptional() @IsUUID() maHoSo?: string
  @IsOptional() @Transform(trim) @IsString() @MaxLength(1000) ghiChu?: string
}

export class XuLyYeuCauDiemDanhDto {
  @IsOptional() @Transform(trim) @IsString() @MaxLength(1000) ghiChu?: string
}
