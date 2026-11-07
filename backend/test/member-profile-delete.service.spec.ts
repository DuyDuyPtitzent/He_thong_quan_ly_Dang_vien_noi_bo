import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { HoSoDangVienService } from '../src/modules/member-profiles/member-profiles.service'

const profileId = '00000000-0000-4000-8000-000000000001'
const actorId = '00000000-0000-4000-8000-000000000002'
const accountId = '00000000-0000-4000-8000-000000000003'
const createdAt = new Date('2026-01-02T03:04:05.000Z')

function makeProfile(overrides: Record<string, unknown> = {}) {
  return {
    ma: profileId,
    maHoSoNoiBo: 'HS-001',
    ngayTao: createdAt,
    ngayVaoDang: null,
    maTaiKhoan: null,
    taiKhoan: null,
    lichSuDonVi: [{ ma: 'membership-1', maNguoiGhiNhan: actorId, ngayTao: createdAt, ngayHieuLucDen: null, lyDoChuyen: null }],
    quaTrinh: [],
    phanCongChucVu: [],
    yeuCauCapNhat: [],
    ...overrides,
  }
}

function makeContext(profile: unknown, options: { permissionError?: Error; transaction?: (callback: (tx: never) => unknown) => unknown } = {}) {
  const tx = {
    $queryRaw: vi.fn().mockResolvedValue([]),
    $executeRaw: vi.fn().mockResolvedValue(0),
    hoSoDangVien: { findUnique: vi.fn().mockResolvedValue(profile), delete: vi.fn().mockResolvedValue({ ma: profileId }) },
    nhatKyKiemToan: {
      findFirst: vi.fn().mockResolvedValue({ maNguoiThucHien: actorId, thoiDiem: createdAt }),
      create: vi.fn().mockResolvedValue({}),
    },
    diaChiDangVien: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
    thongTinSinhVien: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
    thongTinCaNhanDangVien: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
    lichSuDonViDangVien: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
    quaTrinhDangVien: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
    taiKhoanNguoiDung: { update: vi.fn().mockResolvedValue({}) },
    phienDangNhap: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    phanCongVaiTro: { count: vi.fn().mockResolvedValue(0), updateMany: vi.fn().mockResolvedValue({ count: 0 }), findMany: vi.fn().mockResolvedValue([]) },
  }
  const permissions = { kiemTra: vi.fn().mockImplementation(() => options.permissionError ? Promise.reject(options.permissionError) : Promise.resolve()) }
  const prisma = {
    $transaction: options.transaction ?? vi.fn(async (callback: (transaction: never) => unknown) => callback(tx as never)),
  }
  return {
    service: new HoSoDangVienService(prisma as never, permissions as never, {} as never, {} as never),
    tx,
    prisma,
    permissions,
  }
}

const actor = { maTaiKhoan: actorId, maPhien: 'session-id' } as never

describe('HoSoDangVienService.xoa', () => {
  it('physically removes eligible profile data in one transaction and keeps audit records', async () => {
    const { service, tx, permissions } = makeContext(makeProfile())

    await expect(service.xoa(actor, profileId, '127.0.0.1')).resolves.toEqual({ daXoa: true, maHoSo: profileId, taiKhoanLienKetDaKhoa: false })
    expect(permissions.kiemTra).toHaveBeenCalledWith(actorId, 'HO_SO_DANG_VIEN_XOA', { maHoSo: profileId }, 'session-id')
    expect(tx.$queryRaw).toHaveBeenCalledOnce()
    expect(tx.hoSoDangVien.delete).toHaveBeenCalledWith({ where: { ma: profileId } })
    expect(tx.lichSuDonViDangVien.deleteMany).toHaveBeenCalledWith({ where: { maHoSo: profileId } })
    expect(tx.nhatKyKiemToan.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ hanhDong: 'HO_SO_DANG_VIEN_XOA', ketQua: 'THANH_CONG' }) }))
    expect(tx.nhatKyKiemToan).not.toHaveProperty('deleteMany')
  })

  it('removes the initial admission process entry together with the initial membership entry', async () => {
    const profile = makeProfile({
      ngayVaoDang: new Date('2020-05-06T00:00:00.000Z'),
      quaTrinh: [{ ma: 'process-1', loaiSuKien: 'VAO_DANG_DU_BI', ngaySuKien: new Date('2020-05-06T00:00:00.000Z'), maNguoiGhiNhan: actorId, ngayTao: createdAt }],
    })
    const { service, tx } = makeContext(profile)
    await expect(service.xoa(actor, profileId, null)).resolves.toMatchObject({ daXoa: true })
    expect(tx.quaTrinhDangVien.deleteMany).toHaveBeenCalledWith({ where: { maHoSo: profileId } })
  })

  it('rejects a profile outside the caller permission and scope before opening a transaction', async () => {
    const { service, prisma } = makeContext(makeProfile(), { permissionError: new ForbiddenException() })
    await expect(service.xoa(actor, profileId, null)).rejects.toBeInstanceOf(ForbiddenException)
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('returns not found for an unknown profile', async () => {
    const { service } = makeContext(null)
    await expect(service.xoa(actor, profileId, null)).rejects.toBeInstanceOf(NotFoundException)
  })

  it('does not delete twice when repeated requests race or are retried', async () => {
    const { service, tx } = makeContext(makeProfile())
    tx.hoSoDangVien.findUnique.mockResolvedValueOnce(makeProfile()).mockResolvedValueOnce(null)

    await expect(service.xoa(actor, profileId, null)).resolves.toMatchObject({ daXoa: true })
    await expect(service.xoa(actor, profileId, null)).rejects.toBeInstanceOf(NotFoundException)
    expect(tx.hoSoDangVien.delete).toHaveBeenCalledTimes(1)
  })

  it('keeps profiles with later membership history and audits the refusal', async () => {
    const profile = makeProfile({ lichSuDonVi: [
      { ma: 'membership-1', maNguoiGhiNhan: actorId, ngayTao: createdAt, ngayHieuLucDen: createdAt, lyDoChuyen: null },
      { ma: 'membership-2', maNguoiGhiNhan: actorId, ngayTao: new Date(createdAt.getTime() + 1000), ngayHieuLucDen: null, lyDoChuyen: 'Chuyển Chi bộ' },
    ] })
    const { service, tx } = makeContext(profile)
    await expect(service.xoa(actor, profileId, null)).rejects.toBeInstanceOf(ConflictException)
    expect(tx.hoSoDangVien.delete).not.toHaveBeenCalled()
    expect(tx.nhatKyKiemToan.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ ketQua: 'TU_CHOI', lyDo: expect.stringContaining('lịch sử sinh hoạt') }) }))
  })

  it.each([
    ['quá trình Đảng ngoài bản ghi ban đầu', { quaTrinh: [{ ma: 'process-2', loaiSuKien: 'DU_BI_CHINH_THUC', ngaySuKien: createdAt, maNguoiGhiNhan: actorId, ngayTao: createdAt }] }],
    ['phân công chức vụ', { phanCongChucVu: [{ ma: 'assignment-1' }] }],
    ['yêu cầu cập nhật hồ sơ', { yeuCauCapNhat: [{ ma: 'request-1' }] }],
  ])('retains hồ sơ with %s', async (_label, overrides) => {
    const { service, tx } = makeContext(makeProfile(overrides))
    await expect(service.xoa(actor, profileId, null)).rejects.toBeInstanceOf(ConflictException)
    expect(tx.hoSoDangVien.delete).not.toHaveBeenCalled()
    expect(tx.nhatKyKiemToan.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ ketQua: 'TU_CHOI' }) }))
  })

  it('keeps a linked account, locks it, revokes assignments and sessions', async () => {
    const linkedAccount = { ma: accountId, trangThai: 'DANG_HOAT_DONG' }
    const { service, tx } = makeContext(makeProfile({ maTaiKhoan: accountId, taiKhoan: linkedAccount }))
    tx.phanCongVaiTro.updateMany.mockResolvedValue({ count: 2 })

    await expect(service.xoa(actor, profileId, null)).resolves.toMatchObject({ daXoa: true, taiKhoanLienKetDaKhoa: true })
    expect(tx.taiKhoanNguoiDung.update).toHaveBeenCalledWith({ where: { ma: accountId }, data: { trangThai: 'TAM_KHOA' } })
    expect(tx.phanCongVaiTro.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { maTaiKhoan: accountId, thuHoiLuc: null }, data: expect.objectContaining({ maNguoiThuHoi: actorId }) }))
    expect(tx.phienDangNhap.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { maTaiKhoan: accountId, thuHoiLuc: null }, data: expect.objectContaining({ thuHoiLuc: expect.any(Date) }) }))
  })

  it('does not lock the only active system administrator account', async () => {
    const linkedAccount = { ma: accountId, trangThai: 'DANG_HOAT_DONG' }
    const { service, tx } = makeContext(makeProfile({ maTaiKhoan: accountId, taiKhoan: linkedAccount }))
    tx.phanCongVaiTro.count.mockResolvedValue(1)
    tx.phanCongVaiTro.findMany.mockResolvedValue([])

    await expect(service.xoa(actor, profileId, null)).rejects.toBeInstanceOf(ConflictException)
    expect(tx.taiKhoanNguoiDung.update).not.toHaveBeenCalled()
    expect(tx.hoSoDangVien.delete).not.toHaveBeenCalled()
    expect(tx.nhatKyKiemToan.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ ketQua: 'TU_CHOI', duLieuSau: expect.objectContaining({ maLoi: 'KHONG_THE_KHOA_QUAN_TRI_VIEN_CUOI_CUNG' }) }) }))
  })

  it('does not report success when the deletion transaction fails', async () => {
    const failure = new Error('transaction failed')
    const { service } = makeContext(makeProfile(), { transaction: vi.fn().mockRejectedValue(failure) })
    await expect(service.xoa(actor, profileId, null)).rejects.toBe(failure)
  })
})
