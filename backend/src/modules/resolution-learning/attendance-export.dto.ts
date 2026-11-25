import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsBoolean, IsOptional, IsUUID, MaxLength } from 'class-validator'

export class XuatKetQuaDiemDanhDto {
  @IsUUID() maBuoi!: string
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(17) @ArrayUnique() @MaxLength(80, { each: true }) truong!: string[]
  @IsOptional() @IsBoolean() baoGomBuoiDaHuy = false
}
