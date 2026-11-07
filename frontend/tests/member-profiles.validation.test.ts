import { describe, expect, it } from 'vitest'
import type { HoSoInput } from '../src/features/member-profiles/types/member-profiles.types'
import { kiemTraSuaHoSo, kiemTraTaoHoSo } from '../src/features/member-profiles/validation/member-profiles.validation'

const hopLe: HoSoInput = {
  maHoSoNoiBo: 'HS-001', hoVaTen: 'Nguyễn An', trangThai: 'DANG_HOAT_DONG',
  trangThaiDangVien: 'DU_BI', maChiBo: 'branch-id', ngaySinhHoatTu: '2026-11-03',
}
const options = { coThongTinSinhVien: false, taoTaiKhoan: false, maChiBoHopLe: true, maToHopLe: true }

describe('kiểm tra biểu mẫu thêm hồ sơ Đảng viên', () => {
  it('accepts a valid profile without optional email, student data, or account', () => {
    expect(kiemTraTaoHoSo(hopLe, options)).toEqual({})
  })

  it('reports each missing required value under its own field', () => {
    const errors = kiemTraTaoHoSo({ ...hopLe, maHoSoNoiBo: '', hoVaTen: '', trangThaiDangVien: '', ngaySinhHoatTu: '' }, { ...options, maChiBoHopLe: false })
    expect(Object.keys(errors)).toEqual(['maHoSoNoiBo', 'hoVaTen', 'trangThaiDangVien', 'maChiBo', 'ngaySinhHoatTu'])
  })

  it('requires a student code and account credentials only when those options are selected', () => {
    const errors = kiemTraTaoHoSo(hopLe, { ...options, coThongTinSinhVien: true, taoTaiKhoan: true })
    expect(errors).toMatchObject({
      'thongTinSinhVien.maSinhVien': expect.any(String),
      'taiKhoanMoi.tenDangNhap': expect.any(String),
      'taiKhoanMoi.matKhau': expect.any(String),
    })
  })

  it('accepts blank optional emails and rejects malformed ones', () => {
    expect(kiemTraTaoHoSo({ ...hopLe, emailLienHe: '' }, options)).not.toHaveProperty('emailLienHe')
    expect(kiemTraTaoHoSo({ ...hopLe, emailLienHe: 'khong-hop-le' }, options).emailLienHe).toBeTruthy()
  })

  it('requires a valid 12-digit CCCD only when creating an account', () => {
    expect(kiemTraTaoHoSo(hopLe, { ...options, taoTaiKhoan: true }).soCccd).toBeTruthy()
    expect(kiemTraTaoHoSo({ ...hopLe, soCccd: '012345678901' }, { ...options, taoTaiKhoan: true })).not.toHaveProperty('soCccd')
    expect(kiemTraTaoHoSo(hopLe, options)).not.toHaveProperty('soCccd')
  })
})

describe('kiểm tra biểu mẫu sửa hồ sơ Đảng viên', () => {
  it('chỉ yêu cầu trường lõi và chấp nhận trường tùy chọn trống', () => {
    expect(kiemTraSuaHoSo(hopLe, false)).toEqual({})
    expect(kiemTraSuaHoSo({ ...hopLe, maHoSoNoiBo: '', hoVaTen: '' }, false)).toMatchObject({
      maHoSoNoiBo: expect.any(String), hoVaTen: expect.any(String),
    })
  })

  it('kiểm tra định dạng ngày, email, CCCD và mã sinh viên khi bật thông tin sinh viên', () => {
    const errors = kiemTraSuaHoSo({ ...hopLe, ngayVaoDang: 'sai-ngay', emailLienHe: 'sai-email', soCccd: '123', thongTinSinhVien: undefined }, true)
    expect(errors).toMatchObject({
      ngayVaoDang: expect.any(String), emailLienHe: expect.any(String), soCccd: expect.any(String),
      'thongTinSinhVien.maSinhVien': expect.any(String),
    })
  })
})
