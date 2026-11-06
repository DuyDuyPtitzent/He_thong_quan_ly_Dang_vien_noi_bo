import { describe, expect, it, vi } from 'vitest'
import { YeuCauCapNhatHoSoService } from '../src/modules/member-profiles/member-profile-updates.service'
import { editableProfileFields } from '../src/modules/member-profiles/member-profile-updates.dto'

describe('YeuCauCapNhatHoSoService', () => {
  it('includes the independently managed party cohort among approvable profile fields', async () => {
    expect(editableProfileFields).toContain('khoaDangVien')
    const update = vi.fn().mockResolvedValue({})
    const tx = { hoSoDangVien: { findUnique: vi.fn().mockResolvedValue({ khoaDangVien: 'D23', thongTinCaNhan: null, diaChi: [] }), update } }
    const service = new YeuCauCapNhatHoSoService({} as never, {} as never, { get: vi.fn().mockReturnValue('./storage/private') } as never)
    const internal = service as unknown as { apDungThayDoi: (...args: unknown[]) => Promise<void> }

    await internal.apDungThayDoi(tx, 'profile-a', { khoaDangVien: 'D23' }, { khoaDangVien: 'D25' })

    expect(update).toHaveBeenCalledWith({ where: { ma: 'profile-a' }, data: { khoaDangVien: 'D25' } })
    expect(update).toHaveBeenCalledWith({ where: { ma: 'profile-a' }, data: { ngayCapNhat: expect.any(Date) } })
  })

  it('creates and activates a campaign in one transaction after validating scope and overlap', async () => {
    const start = new Date(Date.now() + 60 * 60_000)
    const end = new Date(Date.now() + 2 * 60 * 60_000)
    const saved = { ma: 'campaign-a', ten: 'Đợt rà soát', maDonVi: null, ngayBatDau: start, ngayKetThuc: end, cacTruongDuocPhep: ['thongTinCaNhan.soDienThoai'], trangThaiQuanLy: 'DA_KICH_HOAT', maNguoiTao: 'account-a', maNguoiKichHoat: 'account-a', thoiDiemKichHoat: expect.any(Date) }
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      dotCapNhatHoSo: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue(saved) },
      nhatKyKiemToan: { create: vi.fn().mockResolvedValue({}) },
    }
    const prisma = { $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) }
    const permissions = { kiemTra: vi.fn().mockResolvedValue(undefined) }
    const service = new YeuCauCapNhatHoSoService(prisma as never, permissions as never, { get: vi.fn().mockReturnValue('./storage/private') } as never)

    const result = await service.taoVaKichHoatDot({ maTaiKhoan: 'account-a', maPhien: 'session-a' } as never, {
      ten: 'Đợt rà soát', ngayBatDau: start.toISOString(), ngayKetThuc: end.toISOString(), cacTruongDuocPhep: ['thongTinCaNhan.soDienThoai'],
    }, null)

    expect(result).toEqual(saved)
    expect(prisma.$transaction).toHaveBeenCalledOnce()
    expect(tx.dotCapNhatHoSo.create).toHaveBeenCalledWith({ data: expect.objectContaining({ trangThaiQuanLy: 'DA_KICH_HOAT', maNguoiTao: 'account-a', maNguoiKichHoat: 'account-a' }) })
    expect(tx.dotCapNhatHoSo.findFirst).toHaveBeenCalledOnce()
    expect(tx.nhatKyKiemToan.create).toHaveBeenCalledOnce()
    expect(permissions.kiemTra).toHaveBeenCalledWith('account-a', 'HO_SO_CA_NHAN_MO_DOT_CAP_NHAT', {}, 'session-a')
  })

  it('rejects an activation whose end time has passed before creating any campaign', async () => {
    const tx = { $queryRaw: vi.fn(), dotCapNhatHoSo: { findFirst: vi.fn(), create: vi.fn() } }
    const prisma = { $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) }
    const permissions = { kiemTra: vi.fn().mockResolvedValue(undefined) }
    const service = new YeuCauCapNhatHoSoService(prisma as never, permissions as never, { get: vi.fn().mockReturnValue('./storage/private') } as never)
    const start = new Date(Date.now() - 2 * 60 * 60_000)
    const end = new Date(Date.now() - 60 * 60_000)

    await expect(service.taoVaKichHoatDot({ maTaiKhoan: 'account-a' } as never, {
      ten: 'Đợt đã hết hạn', ngayBatDau: start.toISOString(), ngayKetThuc: end.toISOString(), cacTruongDuocPhep: ['hoVaTen'],
    }, null)).rejects.toMatchObject({ response: expect.objectContaining({ thongBao: expect.stringContaining('đã kết thúc') }) })
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('returns a filtered database page and exact counts without loading the full queue', async () => {
    const tx = {
      yeuCauCapNhatHoSo: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(1000),
        groupBy: vi.fn(({ by }: { by: string[] }) => Promise.resolve(by[0] === 'trangThai'
          ? [{ trangThai: 'CHO_DUYET', _count: { _all: 996 } }, { trangThai: 'DA_DUYET', _count: { _all: 2 } }, { trangThai: 'DA_TU_CHOI', _count: { _all: 1 } }, { trangThai: 'DA_HUY', _count: { _all: 1 } }]
          : by[0] === 'maDonViDuyet' ? [{ maDonViDuyet: 'branch-a' }] : [{ maDotCapNhat: 'campaign-a' }])),
      },
    }
    const prisma = {
      $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
      donViToChuc: { findMany: vi.fn().mockResolvedValue([{ ma: 'branch-a', maDinhDanh: 'CB-A', tenDonVi: [{ ten: 'Chi bộ A' }] }]) },
      dotCapNhatHoSo: { findMany: vi.fn().mockResolvedValue([{ ma: 'campaign-a', ten: 'Rà soát hồ sơ' }]) },
    }
    const permissions = { layDonViTrongPhamVi: vi.fn().mockResolvedValue({ coQuyen: true, toanHeThong: true, maDonVi: [] }) }
    const service = new YeuCauCapNhatHoSoService(prisma as never, permissions as never, { get: vi.fn().mockReturnValue('./storage/private') } as never)

    const result = await service.danhSachYeuCau({ maTaiKhoan: 'account-a', maPhien: 'session-a' } as never, {
      trang: '3' as unknown as number, gioiHan: '50' as unknown as number, trangThai: 'CHO_DUYET', maDonViDuyet: 'branch-a', maDotCapNhat: 'campaign-a',
      tuKhoa: 'Nguyễn', tuNgay: '2026-01-01', denNgay: '2026-01-31',
    })

    expect(result).toEqual(expect.objectContaining({
      duLieu: [], phanTrang: { trang: 3, gioiHan: 50, tongSo: 1000, tongTrang: 20 },
      thongKe: { tongYeuCau: 1000, choXuLy: 996, daPheDuyet: 2, daTuChoi: 1, daHuy: 1 },
      boLoc: { donVi: [{ ma: 'branch-a', ten: 'Chi bộ A' }], dotCapNhat: [{ ma: 'campaign-a', ten: 'Rà soát hồ sơ' }] },
    }))
    expect(tx.yeuCauCapNhatHoSo.findMany).toHaveBeenCalledWith(expect.objectContaining({
      skip: 100, take: 50, orderBy: [{ ngayTao: 'desc' }, { ma: 'desc' }],
      where: expect.objectContaining({ trangThai: 'CHO_DUYET', maDonViDuyet: 'branch-a', maDotCapNhat: 'campaign-a' }),
    }))
    expect(tx.yeuCauCapNhatHoSo.count).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ trangThai: 'CHO_DUYET' }) }))
  })

  it('rejects queue access when the account has neither list nor approval permission', async () => {
    const prisma = { $transaction: vi.fn() }
    const permissions = { layDonViTrongPhamVi: vi.fn().mockResolvedValue({ coQuyen: false, toanHeThong: false, maDonVi: [] }) }
    const service = new YeuCauCapNhatHoSoService(prisma as never, permissions as never, { get: vi.fn().mockReturnValue('./storage/private') } as never)

    await expect(service.danhSachYeuCau({ maTaiKhoan: 'account-a', maPhien: 'session-a' } as never, {} as never))
      .rejects.toMatchObject({ response: expect.objectContaining({ maLoi: 'KHONG_DU_QUYEN' }) })
    expect(permissions.layDonViTrongPhamVi).toHaveBeenNthCalledWith(1, 'account-a', 'HO_SO_CA_NHAN_XEM_YEU_CAU_CAP_NHAT', 'session-a')
    expect(permissions.layDonViTrongPhamVi).toHaveBeenNthCalledWith(2, 'account-a', 'HO_SO_CA_NHAN_DUYET_CAP_NHAT', 'session-a')
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('aggregates campaign request totals in the database and excludes cancelled requests', async () => {
    const campaign = {
      ma: 'campaign-a', maDonVi: null, trangThaiQuanLy: 'DA_KICH_HOAT',
      ngayBatDau: new Date('2026-11-01T00:00:00.000Z'), ngayKetThuc: new Date('2026-11-10T00:00:00.000Z'),
    }
    const prisma = {
      dotCapNhatHoSo: { findUnique: vi.fn().mockResolvedValue(campaign) },
      yeuCauCapNhatHoSo: { groupBy: vi.fn().mockResolvedValue([
        { trangThai: 'CHO_DUYET', _count: { _all: 2 } },
        { trangThai: 'DA_DUYET', _count: { _all: 3 } },
        { trangThai: 'DA_TU_CHOI', _count: { _all: 1 } },
      ]) },
    }
    const permissions = {
      kiemTra: vi.fn().mockResolvedValue(undefined),
      layDonViTrongPhamVi: vi.fn().mockResolvedValue({ coQuyen: true, toanHeThong: true, maDonVi: [] }),
    }
    const service = new YeuCauCapNhatHoSoService(prisma as never, permissions as never, { get: vi.fn().mockReturnValue('./storage/private') } as never)

    await expect(service.thongKeDot({ maTaiKhoan: 'account-a', maPhien: 'session-a' } as never, campaign.ma)).resolves.toEqual({
      tongYeuCau: 6, choXuLy: 2, daPheDuyet: 3, daTuChoi: 1,
    })
    expect(prisma.yeuCauCapNhatHoSo.groupBy).toHaveBeenCalledWith(expect.objectContaining({
      by: ['trangThai'],
      where: { maDotCapNhat: campaign.ma, trangThai: { in: ['CHO_DUYET', 'DA_DUYET', 'DA_TU_CHOI'] } },
    }))
    expect(permissions.layDonViTrongPhamVi).toHaveBeenCalledWith('account-a', 'HO_SO_CA_NHAN_XEM_YEU_CAU_CAP_NHAT', 'session-a')
    expect(permissions.layDonViTrongPhamVi).toHaveBeenCalledWith('account-a', 'HO_SO_CA_NHAN_DUYET_CAP_NHAT', 'session-a')
  })

  it('allows an authorized officer to approve a request they sent using another active role', async () => {
    const request = {
      ma: 'request-a', maHoSo: 'profile-a', maDonViDuyet: 'branch-a', maNguoiGui: 'account-a',
      trangThai: 'CHO_DUYET', giaTriTruoc: {}, giaTriDeNghi: {}, anhDaiDienTamKhoa: null,
    }
    const saved = { ma: request.ma, trangThai: 'DA_DUYET', thoiDiemXuLy: new Date('2026-11-04T00:00:00.000Z') }
    const transaction = {
      $queryRaw: vi.fn(),
      yeuCauCapNhatHoSo: { findUnique: vi.fn().mockResolvedValue(request), update: vi.fn().mockResolvedValue(saved) },
      hoSoDangVien: { findUnique: vi.fn().mockResolvedValue({ anhDaiDienKhoa: null }) },
      nhatKyKiemToan: { create: vi.fn() },
    }
    const prisma = {
      yeuCauCapNhatHoSo: { findUnique: vi.fn().mockResolvedValue(request) },
      $transaction: vi.fn(async (callback: (tx: typeof transaction) => Promise<unknown>) => callback(transaction)),
    }
    const permissions = { kiemTra: vi.fn().mockResolvedValue(undefined) }
    const service = new YeuCauCapNhatHoSoService(prisma as never, permissions as never, { get: vi.fn().mockReturnValue('./storage/private') } as never)
    const internal = service as unknown as { apDungThayDoi: (...args: unknown[]) => Promise<void> }
    vi.spyOn(internal, 'apDungThayDoi').mockResolvedValue(undefined)

    await expect(service.duyet({ maTaiKhoan: 'account-a', maPhien: 'session-a' } as never, request.ma, null)).resolves.toEqual({
      ma: request.ma, trangThai: 'DA_DUYET', thoiDiemXuLy: saved.thoiDiemXuLy,
    })
    expect(permissions.kiemTra).toHaveBeenCalledWith('account-a', 'HO_SO_CA_NHAN_DUYET_CAP_NHAT', { maDonVi: 'branch-a' }, 'session-a')
    expect(transaction.yeuCauCapNhatHoSo.update).toHaveBeenCalledWith({
      where: { ma: request.ma }, data: expect.objectContaining({ trangThai: 'DA_DUYET', maNguoiXuLy: 'account-a' }),
    })
  })
})
