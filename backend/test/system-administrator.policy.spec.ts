import { describe, expect, it, vi } from 'vitest'
import { demQuanTriVienToanHeThongHopLe, khoaKiemTraQuanTriVienCuoi, yeuCauConQuanTriVienHopLe } from '../src/modules/authorization/system-administrator.policy'

function setup(rows: Array<{ maTaiKhoan: string }> = []) {
  return {
    phanCongVaiTro: { findMany: vi.fn().mockResolvedValue(rows) },
    $executeRaw: vi.fn().mockResolvedValue(0),
  } as never
}

describe('system administrator invariant', () => {
  it('counts distinct accounts with valid system-wide assignments', async () => {
    const tx = setup([{ maTaiKhoan: 'admin-1' }, { maTaiKhoan: 'admin-1' }, { maTaiKhoan: 'admin-2' }])
    await expect(demQuanTriVienToanHeThongHopLe(tx)).resolves.toBe(2)
  })

  it('rejects operations that would remove the final valid administrator', async () => {
    await expect(yeuCauConQuanTriVienHopLe(setup([]))).rejects.toMatchObject({
      response: { maLoi: 'KHONG_THE_THU_HOI_QUAN_TRI_VIEN_CUOI_CUNG' },
    })
  })

  it('serializes administrator checks against concurrent changes', async () => {
    const tx = setup()
    await khoaKiemTraQuanTriVienCuoi(tx)
    expect((tx as any).$executeRaw).toHaveBeenCalledOnce()
  })
})
