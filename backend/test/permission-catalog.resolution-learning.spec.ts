import { describe, expect, it } from 'vitest'
import { permissionCatalog, permissionMetadata } from '../src/modules/authorization/permission-catalog'

describe('Permission Catalog học tập nghị quyết', () => {
  it('uses the existing scoped personal-information Permission without a CCCD-specific Permission', () => {
    expect(permissionCatalog).toContain('HO_SO_CA_NHAN_XEM')
    expect(permissionMetadata.HO_SO_CA_NHAN_XEM).toMatchObject({
      ten: 'Xem thông tin cá nhân trong phạm vi',
      tinhTrangApi: 'DA_CO_API',
    })
    expect(permissionCatalog).not.toContain('HO_SO_CCCD_XEM_DAY_DU')
  })

  it('đăng ký đầy đủ mã quyền, không trùng và có metadata', () => {
    const hocTap = permissionCatalog.filter((code) => code.startsWith('HOC_TAP_') || code === 'TAO_LIEN_KET_BIEU_MAU')
    expect(hocTap).toHaveLength(28)
    expect(new Set(permissionCatalog).size).toBe(permissionCatalog.length)

    for (const code of hocTap) {
      expect(permissionMetadata[code]).toBeDefined()
      expect(permissionMetadata[code].tinhTrangApi).toBe(
        code.startsWith('HOC_TAP_NGHI_QUYET_DOT_') || code.startsWith('HOC_TAP_NGHI_QUYET_BUOI_') || ['HOC_TAP_TEP_TAI_LEN', 'HOC_TAP_TEP_TAI_XUONG', 'HOC_TAP_TEP_XOA'].includes(code)
          ? 'DA_CO_API'
            : ['HOC_TAP_NGHI_QUYET_DANH_SACH_XEM', 'HOC_TAP_NGHI_QUYET_DANH_SACH_QUAN_LY', 'HOC_TAP_NGHI_QUYET_NGOAI_LE_BO_SUNG', 'HOC_TAP_NGHI_QUYET_PHAN_CONG_QUAN_LY', 'HOC_TAP_NGHI_QUYET_DIEM_DANH_XEM', 'HOC_TAP_NGHI_QUYET_DIEM_DANH_DONG_MO', 'HOC_TAP_NGHI_QUYET_TU_DIEM_DANH', 'HOC_TAP_NGHI_QUYET_DIEM_DANH_THU_CONG', 'HOC_TAP_NGHI_QUYET_DIEM_DANH_XAC_MINH', 'HOC_TAP_NGHI_QUYET_DIEM_DANH_PHE_DUYET', 'HOC_TAP_NGHI_QUYET_DIEM_DANH_CHOT', 'HOC_TAP_NGHI_QUYET_DIEM_DANH_DIEU_CHINH', 'HOC_TAP_NGHI_QUYET_YEU_CAU_DIEM_DANH_XOA', 'HOC_TAP_NGHI_QUYET_THONG_KE_XEM', 'HOC_TAP_NGHI_QUYET_BAO_CAO_XUAT', 'HOC_TAP_NGHI_QUYET_CA_NHAN_XEM', 'TAO_LIEN_KET_BIEU_MAU'].includes(code)
            ? 'DA_CO_API'
          : 'CHUA_CO_API',
      )
      expect(permissionMetadata[code].maNhom.startsWith('HOC_TAP_NGHI_QUYET')).toBe(true)
    }
  })

  it('giữ riêng các quyền phê duyệt, chốt, hậu kiểm và xuất', () => {
    for (const code of [
      'HOC_TAP_NGHI_QUYET_DIEM_DANH_PHE_DUYET',
      'HOC_TAP_NGHI_QUYET_YEU_CAU_DIEM_DANH_XOA',
      'HOC_TAP_NGHI_QUYET_DIEM_DANH_CHOT',
      'HOC_TAP_NGHI_QUYET_DIEM_DANH_DIEU_CHINH',
      'HOC_TAP_NGHI_QUYET_BAO_CAO_XUAT',
      'HOC_TAP_TEP_TAI_XUONG',
    ]) {
      expect(permissionCatalog).toContain(code)
    }
    expect(permissionMetadata.HOC_TAP_NGHI_QUYET_DIEM_DANH_PHE_DUYET.ten)
      .not.toBe(permissionMetadata.HOC_TAP_NGHI_QUYET_DIEM_DANH_CHOT.ten)
    expect(permissionMetadata.HOC_TAP_NGHI_QUYET_BAO_CAO_XUAT.ten)
      .not.toBe(permissionMetadata.HOC_TAP_NGHI_QUYET_THONG_KE_XEM.ten)
  })

  it('marks self-attendance implemented only after its permission and CA_NHAN check exist', () => {
    expect(permissionCatalog).toContain('HOC_TAP_NGHI_QUYET_TU_DIEM_DANH')
    expect(permissionMetadata.HOC_TAP_NGHI_QUYET_TU_DIEM_DANH.tinhTrangApi).toBe('DA_CO_API')
    expect(permissionMetadata.HOC_TAP_NGHI_QUYET_TU_DIEM_DANH.maNhom).toBe('HOC_TAP_NGHI_QUYET_DIEM_DANH')
  })
})
