import { IsDateString, IsOptional, IsUUID } from 'class-validator'

export class ThongKeHocTapQueryDto {
  @IsOptional() @IsUUID() maDot?: string
  @IsOptional() @IsUUID() maNamHoc?: string
  @IsOptional() @IsUUID() maChiBo?: string
  @IsOptional() @IsDateString({ strict: true }) tuLuc?: string
  @IsOptional() @IsDateString({ strict: true }) denLuc?: string
}

export class ThongKeDotQueryDto {
  @IsOptional() @IsUUID() maChiBo?: string
  @IsOptional() @IsDateString({ strict: true }) tuLuc?: string
  @IsOptional() @IsDateString({ strict: true }) denLuc?: string
}

export class MucDoThamGiaQueryDto {
  @IsUUID() maDot!: string
  @IsOptional() @IsUUID() maChiBo?: string
}
