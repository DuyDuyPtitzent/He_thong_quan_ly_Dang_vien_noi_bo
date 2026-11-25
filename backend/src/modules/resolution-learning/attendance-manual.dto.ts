import { Type } from 'class-transformer'
import { ArrayMinSize, ArrayUnique, IsArray, IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator'

export const KET_QUA_THU_CONG = ['CO_MAT', 'VANG_CO_PHEP', 'VANG_KHONG_PHEP'] as const
export type KetQuaThuCong = typeof KET_QUA_THU_CONG[number]

export class DanhSachKetQuaThuCongDto {
  @IsOptional() @IsUUID() maChiBo?: string
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) trang = 1
  @IsOptional() @Type(() => Number) @IsInt() @Min(10) @Max(100) gioiHan = 50
}

export class NoiDungKetQuaThuCongDto {
  @IsIn([...KET_QUA_THU_CONG, 'CHUA_DIEM_DANH']) ketQua!: KetQuaThuCong | 'CHUA_DIEM_DANH'
  @IsOptional() @IsInt() @Min(1) version?: number
  @IsOptional() @IsString() @MaxLength(1000) ghiChu?: string
}

export class DieuChinhSauChotDto extends NoiDungKetQuaThuCongDto {}

export class XacNhanChotDiemDanhDto {
  @IsString() @Matches(/^[a-f0-9]{64}$/i) phienBanXemTruoc!: string
}

export class LichSuDiemDanhDto {
  @IsOptional() @IsUUID() maHoSo?: string
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) trang = 1
  @IsOptional() @Type(() => Number) @IsInt() @Min(10) @Max(100) gioiHan = 50
}

export class DongKetQuaThuCongDto extends NoiDungKetQuaThuCongDto {
  @IsUUID() maHoSo!: string
}

export class GhiKetQuaThuCongLoDto {
  @IsArray() @ArrayMinSize(1) @ArrayUnique((row: DongKetQuaThuCongDto) => row.maHoSo) @ValidateNested({ each: true }) @Type(() => DongKetQuaThuCongDto) ketQua!: DongKetQuaThuCongDto[]
}
