import { Type } from 'class-transformer'
import { ArrayMaxSize, ArrayUnique, IsArray, IsIn, IsInt, IsISO8601, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator'

export class DanhSachNhatKyDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) trang = 1
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) kichThuoc = 20
  @IsOptional() @IsString() @MaxLength(120) tuKhoa?: string
  @IsOptional() @IsString() @MaxLength(120) hanhDong?: string
  @IsOptional() @IsString() @MaxLength(100) taiKhoan?: string
  @IsOptional() @IsUUID() maDonVi?: string
  @IsOptional() @IsIn(['THANH_CONG', 'THAT_BAI']) ketQua?: string
  @IsOptional() @IsISO8601() tuNgay?: string
  @IsOptional() @IsISO8601() denNgay?: string
}

export class XemTruocXoaNhatKyDto {
  @IsOptional() @IsArray() @ArrayUnique() @ArrayMaxSize(500) @IsUUID('all', { each: true }) maNhatKy?: string[]
  @IsOptional() @IsISO8601() tuNgay?: string
  @IsOptional() @IsISO8601() denNgay?: string
  @IsOptional() @IsUUID() maDonVi?: string
  @IsString() @MinLength(3) @MaxLength(1000) lyDo!: string
}
