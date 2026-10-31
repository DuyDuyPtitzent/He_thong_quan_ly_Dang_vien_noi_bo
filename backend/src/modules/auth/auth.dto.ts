import { IsString, Length } from 'class-validator'

export class DangNhapDto {
  @IsString()
  @Length(1, 100)
  tenDangNhap!: string

  @IsString()
  @Length(1, 256)
  matKhau!: string
}

export class DoiMatKhauDto {
  @IsString()
  @Length(1, 256)
  matKhauHienTai!: string

  @IsString()
  @Length(12, 128)
  matKhauMoi!: string
}
