import { describe, expect, it } from 'vitest'
import { tinhTienDoHoSo } from '@/features/member-profiles/services/profile-completion.service'

const completeProbationaryProfile = () => ({
  maHoSoNoiBo: '002', hoVaTen: 'Nguyễn Ngọc Duy', trangThaiDangVien: 'DU_BI',
  ngayVaoDang: '2025-10-10', soPhieuLyLich: 'PL-002', soTheDangVien: 'THE-002', khoaDangVien: 'D25',
  thongTinCaNhan: {
    ngaySinh: '2000-01-01', gioiTinh: 'NAM', soCccd: '034205003981', ngayCapCccd: '2020-01-01',
    noiCapCccd: 'Thái Bình', quocTich: 'Việt Nam', danToc: 'Kinh', tonGiao: 'Không', soDienThoai: '0385062005',
    soDienThoaiBoNguoiNuoiDuong: '0385062006', soDienThoaiMeNguoiNuoiDuong: '0385062007', emailLienHe: 'duy@example.vn',
  },
  diaChi: ['NOI_SINH', 'QUE_QUAN', 'THUONG_TRU', 'NOI_O_HIEN_NAY'].map((loaiDiaChi) => ({ loaiDiaChi, diaChiChiTiet: 'Hà Nội' })),
})

describe('tinhTienDoHoSo', () => {
  it('counts the confirmed required fields and excludes official date for a probationary member', () => {
    const result = tinhTienDoHoSo(completeProbationaryProfile())

    expect(result).toMatchObject({ soTruongDaHoanThien: 23, tongSoTruongBatBuoc: 23, tyLe: 100, truongConThieu: [] })
  })

  it('counts student fields only when the profile has student information', () => {
    const result = tinhTienDoHoSo({ ...completeProbationaryProfile(), thongTinSinhVien: {
      maSinhVien: 'B23DCCC049', khoaHoc: 'D23CQ', nganh: 'Công nghệ thông tin', chuyenNganh: 'Hệ thống thông tin',
      chuongTrinhDaoTao: 'Chính quy', lopHanhChinh: 'D23CCHT01',
    } })

    expect(result).toMatchObject({ soTruongDaHoanThien: 29, tongSoTruongBatBuoc: 29, tyLe: 100 })
  })

  it('does not count invalid values and requires an official date only for official members', () => {
    const profile = { ...completeProbationaryProfile(), trangThaiDangVien: 'CHINH_THUC', ngayChinhThuc: null, thongTinCaNhan: { ...completeProbationaryProfile().thongTinCaNhan, soCccd: '123' } }
    const result = tinhTienDoHoSo(profile)

    expect(result.tongSoTruongBatBuoc).toBe(24)
    expect(result.soTruongDaHoanThien).toBe(22)
    expect(result.tyLe).toBe(92)
    expect(result.truongConThieu.map((field) => field.ma)).toContain('ngayChinhThuc')
    expect(result.truongConThieu.map((field) => field.ma)).toContain('thongTinCaNhan.soCccd')
  })
})
