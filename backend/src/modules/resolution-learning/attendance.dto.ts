import { Transform } from 'class-transformer'
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, Min, MaxLength, MinLength, Matches } from 'class-validator'

const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value

export class TokenDiemDanhDto {
  @IsString() @IsNotEmpty() @MaxLength(4096) token!: string
}

export class GuiYeuCauCongKhaiDto extends TokenDiemDanhDto {
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(200) hoVaTen!: string
  @IsUUID() maChiBo!: string
  @IsInt() @Min(1900) @Max(2100) namSinh!: number
  @IsOptional() @Transform(trim) @IsString() @Matches(/^(?:\d{9}|\d{12})$/) cccd?: string
}

export class TaoLienKetBieuMauDto {
  @IsOptional() @IsInt() @Min(1) @Max(168) thoiHanGio?: number
}
