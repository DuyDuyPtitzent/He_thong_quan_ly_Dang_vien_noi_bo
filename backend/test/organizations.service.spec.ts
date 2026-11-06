import { describe, expect, it, vi } from 'vitest'
import { ToChucService } from '../src/modules/organizations/organizations.service'
import { TaoDonViDto } from '../src/modules/organizations/organizations.dto'

const actor = { maTaiKhoan: 'admin-1', tenDangNhap: 'admin', doiMatKhauLanDau: false, maPhien: 'session-1' }

describe('ToChucService', () => {
  it('defaults new units to active', () => {
    expect(new TaoDonViDto().trangThai).toBe('DANG_HOAT_DONG')
  })

  it('returns an existing root with a configurable business identifier without creating a duplicate', async () => {
    const root = {
      ma: 'root-1', maDinhDanh: 'DANG_UY_HOC_VIEN', loaiDonVi: 'DANG_UY', trangThai: 'TAM_NGUNG',
      tenDonVi: [{ ten: 'Đảng ủy Học viện' }], quanHeCha: [],
    }
    const tx = {
      $executeRaw: vi.fn(),
      donViToChuc: { findFirst: vi.fn().mockResolvedValue(root), create: vi.fn() },
    }
    const prisma = { $transaction: vi.fn((callback: (tx: any) => unknown) => callback(tx)) }
    const permissions = { kiemTra: vi.fn().mockResolvedValue(undefined) }
    const service = new ToChucService(prisma as never, permissions as never)
    const result = await service.tao(actor, Object.assign(new TaoDonViDto(), {
      loaiDonVi: 'DANG_UY', maDinhDanh: 'DANG_UY_HOC_VIEN',
      tenDonVi: 'Đảng ủy Học viện', ngayHieuLucTu: new Date().toISOString(),
    }))
    expect(result).toMatchObject({ maDonVi: 'root-1', trangThai: 'TAM_NGUNG' })
    expect(tx.donViToChuc.create).not.toHaveBeenCalled()
  })

  it('creates an organization root using its supplied business identifier', async () => {
    const tx = {
      $executeRaw: vi.fn(),
      donViToChuc: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ ma: 'root-2', maDinhDanh: 'ROOT_DOAN_VIEN', loaiDonVi: 'DANG_UY', trangThai: 'DANG_HOAT_DONG' }),
      },
      lichSuTenDonVi: { create: vi.fn().mockResolvedValue({}) },
      nhatKyKiemToan: { create: vi.fn().mockResolvedValue({}) },
    }
    const prisma = { $transaction: vi.fn((callback: (tx: any) => unknown) => callback(tx)) }
    const permissions = { kiemTra: vi.fn().mockResolvedValue(undefined) }
    const service = new ToChucService(prisma as never, permissions as never)
    await service.tao(actor, Object.assign(new TaoDonViDto(), {
      loaiDonVi: 'DANG_UY', maDinhDanh: 'ROOT_DOAN_VIEN',
      tenDonVi: 'Đảng ủy Học viện Công nghệ Bưu chính Viễn thông', ngayHieuLucTu: new Date().toISOString(),
    }), { lyDo: 'KHOI_TAO_DON_VI_GOC', maTuongQuan: 'correlation-1' })
    expect(tx.nhatKyKiemToan.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      maNguoiThucHien: actor.maTaiKhoan,
      lyDo: 'KHOI_TAO_DON_VI_GOC',
      maTuongQuan: 'correlation-1',
      duLieuSau: expect.objectContaining({ maDinhDanh: 'ROOT_DOAN_VIEN', tenDonVi: 'Đảng ủy Học viện Công nghệ Bưu chính Viễn thông', trangThai: 'DANG_HOAT_DONG' }),
    }) }))
  })

  it('allows changing the root business code without replacing its internal identity', async () => {
    const tx = {
      donViToChuc: {
        findUnique: vi.fn().mockResolvedValue({ ma: 'root-stable-uuid', loaiDonVi: 'DANG_UY', maDinhDanh: 'OLD_ROOT_CODE' }),
        update: vi.fn().mockResolvedValue({ ma: 'root-stable-uuid', maDinhDanh: 'NEW_ROOT_CODE', loaiDonVi: 'DANG_UY' }),
      },
      nhatKyKiemToan: { create: vi.fn().mockResolvedValue({}) },
    }
    const prisma = { $transaction: vi.fn((callback: (tx: any) => unknown) => callback(tx)) }
    const permissions = { kiemTra: vi.fn().mockResolvedValue(undefined) }
    const service = new ToChucService(prisma as never, permissions as never)
    await service.sua(actor, 'root-stable-uuid', { maDinhDanh: 'NEW_ROOT_CODE' })
    expect(tx.donViToChuc.update).toHaveBeenCalledWith({ where: { ma: 'root-stable-uuid' }, data: { maDinhDanh: 'NEW_ROOT_CODE', loaiDonVi: undefined } })
    expect(permissions.kiemTra).not.toHaveBeenCalled()
  })

  it('requires the restore Permission and audits NGUNG_HOAT_DONG restoration', async () => {
    const tx = {
      donViToChuc: {
        findUnique: vi.fn().mockResolvedValue({ ma: 'unit-1', trangThai: 'NGUNG_HOAT_DONG' }),
        update: vi.fn().mockResolvedValue({ ma: 'unit-1', trangThai: 'DANG_HOAT_DONG' }),
      },
      nhatKyKiemToan: { create: vi.fn().mockResolvedValue({}) },
    }
    const prisma = { $transaction: vi.fn((callback: (tx: any) => unknown) => callback(tx)) }
    const permissions = { kiemTra: vi.fn().mockResolvedValue(undefined) }
    const service = new ToChucService(prisma as never, permissions as never)
    await service.capNhatTrangThai(actor, 'unit-1', { trangThai: 'DANG_HOAT_DONG' })
    expect(permissions.kiemTra).toHaveBeenCalledWith('admin-1', 'TO_CHUC_KHOI_PHUC', { maDonVi: 'unit-1' }, 'session-1')
    expect(tx.nhatKyKiemToan.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ hanhDong: 'TO_CHUC_KHOI_PHUC' }) }))
  })
})
