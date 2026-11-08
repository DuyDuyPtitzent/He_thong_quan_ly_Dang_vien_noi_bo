import { Transform, Type } from 'class-transformer'
import { ArrayMaxSize, ArrayMinSize, IsArray, IsDateString, IsIn, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator'
import { sanitizeRejectionHtml } from './rich-text-sanitizer'

export const editableProfileFields = [
  'hoVaTen', 'khoaDangVien', 'thongTinCaNhan.ngaySinh', 'thongTinCaNhan.gioiTinh', 'thongTinCaNhan.soCccd',
  'thongTinCaNhan.ngayCapCccd', 'thongTinCaNhan.noiCapCccd', 'thongTinCaNhan.quocTich',
  'thongTinCaNhan.danToc', 'thongTinCaNhan.tonGiao', 'thongTinCaNhan.soDienThoai',
  'thongTinCaNhan.soDienThoaiBoNguoiNuoiDuong', 'thongTinCaNhan.soDienThoaiMeNguoiNuoiDuong', 'thongTinCaNhan.emailLienHe',
  'diaChi.NOI_SINH', 'diaChi.QUE_QUAN', 'diaChi.THUONG_TRU', 'diaChi.NOI_O_HIEN_NAY',
  'anhDaiDien',
] as const

export class TaoDotCapNhatDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value) @IsString() @IsNotEmpty() @MaxLength(200) ten!: string
  @IsOptional() @IsString() @MaxLength(2000) moTa?: string | null
  @IsOptional() @IsUUID('4') maDonVi?: string
  @IsDateString() ngayBatDau!: string
  @IsDateString() ngayKetThuc!: string
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(editableProfileFields.length) @IsIn(editableProfileFields, { each: true }) cacTruongDuocPhep!: string[]
}

export class SuaDotCapNhatDto {
  @IsOptional() @Transform(({ value }) => typeof value === 'string' ? value.trim() : value) @IsString() @IsNotEmpty() @MaxLength(200) ten?: string
  @IsOptional() @IsString() @MaxLength(2000) moTa?: string | null
  @IsOptional() @IsUUID('4') maDonVi?: string | null
  @IsOptional() @IsDateString() ngayBatDau?: string
  @IsOptional() @IsDateString() ngayKetThuc?: string
  @IsOptional() @IsArray() @ArrayMinSize(1) @ArrayMaxSize(editableProfileFields.length) @IsIn(editableProfileFields, { each: true }) cacTruongDuocPhep?: string[]
}

export class DanhSachDotCapNhatDto { @IsOptional() @IsUUID('4') maDonVi?: string }

export class DanhSachYeuCauCapNhatDto {
  @IsOptional() @IsUUID('4') maHoSo?: string
  @IsOptional() @IsUUID('4') maDotCapNhat?: string
  @IsOptional() @IsUUID('4') maDonViDuyet?: string
  @IsOptional() @IsIn(['CHO_DUYET', 'DA_DUYET', 'DA_TU_CHOI', 'DA_HUY']) trangThai?: string
  @IsOptional() @Transform(({ value }) => typeof value === 'string' ? value.trim().slice(0, 100) : value) @IsString() tuKhoa?: string
  @IsOptional() @IsDateString() tuNgay?: string
  @IsOptional() @IsDateString() denNgay?: string
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) trang = 1
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) gioiHan = 25
}

export class GuiYeuCauCapNhatDto {
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value
    try { return JSON.parse(value) } catch { return null }
  })
  @IsObject() thayDoi!: Record<string, unknown>
}

export class TuChoiYeuCauDto {
  @Transform(({ value }) => typeof value === 'string' ? sanitizeRejectionHtml(value) : value) @IsString() @IsNotEmpty() @MaxLength(1000) lyDo!: string
}
