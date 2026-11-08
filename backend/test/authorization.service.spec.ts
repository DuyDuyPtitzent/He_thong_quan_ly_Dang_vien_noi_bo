import { ForbiddenException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { PhanQuyenService } from '../src/modules/authorization/authorization.service'

function setup(assignments: any[] = []) {
  const prisma = {
    phienDangNhap: { findFirst: vi.fn().mockResolvedValue({ maPhanCongVaiTroDangHoatDong: 'assignment-active' }) },
    phanCongVaiTro: { findMany: vi.fn(({ where }: { where?: { ma?: string } }) => Promise.resolve(where?.ma ? assignments.filter((item) => item.ma === where.ma) : assignments)) },
    hoSoDangVien: { findFirst: vi.fn() },
    lichSuDonViDangVien: { findFirst: vi.fn() },
    $queryRaw: vi.fn().mockResolvedValue([{ found: true }]),
  }
  return { service: new PhanQuyenService(prisma as never), prisma }
}

const grant = (scope: string, maDonViGoc: string | null = null, permissions = ['P_READ']) => ({
  maTaiKhoan: 'account-1',
  loaiPhamVi: scope,
  maDonViGoc,
  phamViDonViChiDinh: [{ maDonVi: 'unit-1' }],
  vaiTro: { maDinhDanh: 'ROLE_THUONG', laVaiTroHeThong: false, quyen: permissions.map((maDinhDanh) => ({ quyen: { maDinhDanh } })) },
})

describe('PhanQuyenService', () => {
  it.each(['CAY_DON_VI', 'DON_VI_CHI_DINH', 'TOAN_HE_THONG'])('allows %s Assignment with its NAM_HOC permission for the shared catalog', async (scope) => {
    const { service } = setup([{ ...grant(scope, null, ['NAM_HOC_TAO']), ma: 'assignment-active' }])
    await expect(service.kiemTraQuyenDanhMucNamHoc('account-1', 'NAM_HOC_TAO', 'session-1')).resolves.toBeUndefined()
  })

  it('rejects a personal Scope, missing Permission, or no selected active Assignment for the catalog', async () => {
    const personal = setup([{ ...grant('CA_NHAN', null, ['NAM_HOC_XEM']), ma: 'assignment-active' }])
    await expect(personal.service.kiemTraQuyenDanhMucNamHoc('account-1', 'NAM_HOC_XEM', 'session-1')).rejects.toBeInstanceOf(ForbiddenException)
    const missingPermission = setup([{ ...grant('CAY_DON_VI', null, ['NAM_HOC_XEM']), ma: 'assignment-active' }])
    await expect(missingPermission.service.kiemTraQuyenDanhMucNamHoc('account-1', 'NAM_HOC_TAO', 'session-1')).rejects.toBeInstanceOf(ForbiddenException)
    const noAssignment = setup([])
    await expect(noAssignment.service.kiemTraQuyenDanhMucNamHoc('account-1', 'NAM_HOC_XEM', 'session-1')).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('uses the selected Assignment and live Role-Permission rows for the shared catalog', async () => {
    let active = 'assignment-a'
    let permission = 'NAM_HOC_TAO'
    const assignments = [
      { ...grant('CAY_DON_VI', null, ['NAM_HOC_TAO']), ma: 'assignment-a' },
      { ...grant('DON_VI_CHI_DINH', null, ['NAM_HOC_SUA']), ma: 'assignment-b' },
    ]
    const prisma = {
      phienDangNhap: { findFirst: vi.fn(async () => ({ maPhanCongVaiTroDangHoatDong: active })) },
      phanCongVaiTro: { findMany: vi.fn(({ where }: { where?: { ma?: string } }) => Promise.resolve(assignments.filter(item => item.ma === where?.ma).map(item => ({ ...item, vaiTro: { ...item.vaiTro, quyen: item.vaiTro.quyen.filter(({ quyen }: any) => quyen.maDinhDanh === permission) } })))) },
      hoSoDangVien: { findFirst: vi.fn() }, lichSuDonViDangVien: { findFirst: vi.fn() }, $queryRaw: vi.fn(),
    }
    const service = new PhanQuyenService(prisma as never)
    await expect(service.kiemTraQuyenDanhMucNamHoc('account-1', 'NAM_HOC_TAO', 'session-1')).resolves.toBeUndefined()
    await expect(service.kiemTraQuyenDanhMucNamHoc('account-1', 'NAM_HOC_SUA', 'session-1')).rejects.toBeInstanceOf(ForbiddenException)
    active = 'assignment-b'
    permission = 'NAM_HOC_SUA'
    await expect(service.kiemTraQuyenDanhMucNamHoc('account-1', 'NAM_HOC_SUA', 'session-1')).resolves.toBeUndefined()
    permission = 'NAM_HOC_TAO'
    await expect(service.kiemTraQuyenDanhMucNamHoc('account-1', 'NAM_HOC_TAO', 'session-1')).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('requires Permission and Scope on the same Assignment', async () => {
    const { service } = setup([
      grant('TOAN_HE_THONG', null, ['P_OTHER']),
      grant('DON_VI_CHI_DINH', null, ['P_READ']),
    ])
    await expect(service.kiemTra('account-1', 'P_READ', { maDonVi: 'unit-outside' }))
      .rejects.toBeInstanceOf(ForbiddenException)
  })

  it('uses only the Assignment selected in the current session and reflects a switch immediately', async () => {
    let active = 'assignment-a'
    const prisma = {
      phienDangNhap: { findFirst: vi.fn(async () => ({ maPhanCongVaiTroDangHoatDong: active })) },
      phanCongVaiTro: { findMany: vi.fn(({ where }: { where?: { ma?: string } }) => Promise.resolve([
        { ...grant('TOAN_HE_THONG', null, ['P_A']), ma: 'assignment-a' },
        { ...grant('TOAN_HE_THONG', null, ['P_B']), ma: 'assignment-b' },
      ].filter((item) => item.ma === where?.ma))) },
      hoSoDangVien: { findFirst: vi.fn() },
      lichSuDonViDangVien: { findFirst: vi.fn() },
      $queryRaw: vi.fn(),
    }
    const service = new PhanQuyenService(prisma as never)
    await expect(service.kiemTra('account-1', 'P_A', {}, 'session-1')).resolves.toBeUndefined()
    await expect(service.kiemTra('account-1', 'P_B', {}, 'session-1')).rejects.toBeInstanceOf(ForbiddenException)
    active = 'assignment-b'
    await expect(service.kiemTra('account-1', 'P_B', {}, 'session-1')).resolves.toBeUndefined()
    await expect(service.kiemTra('account-1', 'P_A', {}, 'session-1')).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('does not treat a root organization tree as TOAN_HE_THONG', async () => {
    const { service, prisma } = setup([
      { ...grant('CAY_DON_VI', 'ptit-root', ['NAM_HOC_XEM']), ma: 'assignment-active' },
      { ...grant('TOAN_HE_THONG', null, ['NAM_HOC_TAO']), ma: 'assignment-other' },
    ])
    await expect(service.kiemTra('account-1', 'NAM_HOC_XEM', { maDonVi: 'unit-1' }, 'session-1')).resolves.toBeUndefined()
    await expect(service.kiemTra('account-1', 'NAM_HOC_TAO', { maDonVi: 'unit-1' }, 'session-1')).rejects.toBeInstanceOf(ForbiddenException)
    expect(prisma.phanCongVaiTro.findMany.mock.calls[0][0].where.ma).toBe('assignment-active')
  })

  it('allows only the current valid full-system administrator Assignment for system-log access', async () => {
    const adminAssignment = {
      ...grant('TOAN_HE_THONG', null, ['NHAT_KY_KIEM_TOAN_XEM']),
      ma: 'assignment-active',
      vaiTro: { ...grant('TOAN_HE_THONG').vaiTro, maDinhDanh: 'QUAN_TRI_VIEN_TOAN_HE_THONG', laVaiTroHeThong: true },
    }
    const { service, prisma } = setup([adminAssignment])
    await expect(service.kiemTraQuanTriVienToanHeThong('account-1', 'session-1')).resolves.toBeUndefined()
    expect(prisma.phanCongVaiTro.findMany.mock.calls[0][0].where).toMatchObject({
      ma: 'assignment-active', thuHoiLuc: null, taiKhoan: { trangThai: 'DANG_HOAT_DONG' },
      ngayHieuLucTu: { lte: expect.any(Date) }, vaiTro: { trangThai: 'DANG_HOAT_DONG' },
    })
    expect(prisma.phanCongVaiTro.findMany.mock.calls[0][0].where.OR[1].ngayHieuLucDen.gt).toBeInstanceOf(Date)
  })

  it.each([
    ['ordinary permission administrator', { ...grant('TOAN_HE_THONG', null, ['NHAT_KY_KIEM_TOAN_XEM']), ma: 'assignment-active' }],
    ['organization tree assignment', { ...grant('CAY_DON_VI', 'root', ['NHAT_KY_KIEM_TOAN_XEM']), ma: 'assignment-active', vaiTro: { ...grant('CAY_DON_VI').vaiTro, maDinhDanh: 'QUAN_TRI_VIEN_TOAN_HE_THONG', laVaiTroHeThong: true } }],
    ['a role with the display name but a different identifier', { ...grant('TOAN_HE_THONG', null, ['NHAT_KY_KIEM_TOAN_XEM']), ma: 'assignment-active', vaiTro: { ...grant('TOAN_HE_THONG').vaiTro, ten: 'Quản trị viên toàn hệ thống' } }],
  ])('denies system-log access to %s', async (_label, assignment) => {
    const { service } = setup([assignment])
    await expect(service.kiemTraQuanTriVienToanHeThong('account-1', 'session-1')).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('denies system-log access when the administrator Assignment is expired, revoked, absent, or no session is selected', async () => {
    const { service } = setup([])
    await expect(service.kiemTraQuanTriVienToanHeThong('account-1', 'session-1')).rejects.toBeInstanceOf(ForbiddenException)
    await expect(service.kiemTraQuanTriVienToanHeThong('account-1')).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('allows only an explicitly selected unit for DON_VI_CHI_DINH', async () => {
    const { service } = setup([grant('DON_VI_CHI_DINH')])
    await expect(service.kiemTra('account-1', 'P_READ', { maDonVi: 'unit-1' })).resolves.toBeUndefined()
    await expect(service.kiemTra('account-1', 'P_READ', { maDonVi: 'child-unit' }))
      .rejects.toBeInstanceOf(ForbiddenException)
  })

  it('checks current party membership under organizational Scope', async () => {
    const { service, prisma } = setup([grant('CAY_DON_VI', 'root-unit')])
    prisma.lichSuDonViDangVien.findFirst.mockResolvedValue({ maChiBo: 'unit-1', maTo: 'unit-2' })
    await expect(service.kiemTra('account-1', 'P_READ', { maHoSo: 'profile-1' })).resolves.toBeUndefined()
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1)
  })

  it('matches CA_NHAN only through the authenticated account profile link', async () => {
    const { service, prisma } = setup([grant('CA_NHAN')])
    prisma.hoSoDangVien.findFirst.mockResolvedValue({ ma: 'profile-1' })
    await expect(service.kiemTra('account-1', 'P_READ', { maHoSo: 'profile-1' })).resolves.toBeUndefined()
    expect(prisma.hoSoDangVien.findFirst).toHaveBeenCalledWith({
      where: { ma: 'profile-1', maTaiKhoan: 'account-1' },
      select: { ma: true },
    })
  })

  it('does not grant access when an Assignment is expired or revoked', async () => {
    const { service, prisma } = setup([])
    await expect(service.kiemTra('account-1', 'P_READ', { maDonVi: 'unit-1' }))
      .rejects.toBeInstanceOf(ForbiddenException)
    const where = prisma.phanCongVaiTro.findMany.mock.calls[0][0].where
    expect(where.thuHoiLuc).toBeNull()
    expect(where.ngayHieuLucTu.lte).toBeInstanceOf(Date)
    expect(where.OR[1].ngayHieuLucDen.gt).toBeInstanceOf(Date)
  })
})
