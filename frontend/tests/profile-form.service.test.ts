import { describe, expect, it } from 'vitest'
import type { HoSoInput } from '../src/features/member-profiles/types/member-profiles.types'
import { profileDetailToForm, profileFormToCreatePayload, profileFormToUpdatePayload } from '../src/features/member-profiles/services/profile-form.service'

const form: HoSoInput = {
  maHoSoNoiBo: 'HS-01', hoVaTen: 'Nguyễn An', trangThai: 'DANG_HOAT_DONG',
  trangThaiDangVien: 'DU_BI', maChiBo: 'branch-1', ngaySinhHoatTu: '2026-11-01',
  soCccd: '012345678901', diaChi: [{ loaiDiaChi: 'THUONG_TRU', diaChiChiTiet: 'Số 1' }],
  thongTinSinhVien: { maSinhVien: 'SV-01' }, taiKhoanMoi: { tenDangNhap: 'an', matKhau: 'secret' },
}

describe('member profile form service', () => {
  it('builds create payloads only with optional account/student sections that were selected', () => {
    const base = { ...form }
    delete base.taiKhoanMoi
    delete base.thongTinSinhVien
    expect(profileFormToCreatePayload(base, false, false)).not.toHaveProperty('taiKhoanMoi')
    expect(profileFormToCreatePayload(base, false, false)).not.toHaveProperty('thongTinSinhVien')
    expect(profileFormToCreatePayload(form, true, true)).toMatchObject({ taiKhoanMoi: form.taiKhoanMoi, thongTinSinhVien: form.thongTinSinhVien })
  })

  it('limits update payload sections to the active permissions', () => {
    const payload = profileFormToUpdatePayload(form, (permission) => permission === 'HO_SO_CA_NHAN_SUA')
    expect(payload).toMatchObject({ hoVaTen: form.hoVaTen, soCccd: form.soCccd })
    expect(payload).not.toHaveProperty('diaChi')
    expect(payload).not.toHaveProperty('thongTinSinhVien')
    expect(profileFormToUpdatePayload(form, () => true)).toHaveProperty('diaChi')
  })

  it('maps API detail values and current organization into editable form values', () => {
    const blank = { ...form, maChiBo: '', maTo: undefined, hoVaTen: '', ngaySinhHoatTu: '' }
    const result = profileDetailToForm({
      ...form,
      ngayVaoDang: '2020-01-02T00:00:00.000Z',
      thongTinCaNhan: { ngaySinh: '2000-02-03T00:00:00.000Z', soCccd: '098765432101' },
      lichSuDonVi: [{ maChiBo: 'branch-current', maTo: 'group-current', ngayHieuLucTu: '2021-03-04T00:00:00.000Z' }],
    }, blank)
    expect(result).toMatchObject({ ngayVaoDang: '2020-01-02', ngaySinh: '2000-02-03', maChiBo: 'branch-current', maTo: 'group-current', ngaySinhHoatTu: '2021-03-04' })
  })
})
