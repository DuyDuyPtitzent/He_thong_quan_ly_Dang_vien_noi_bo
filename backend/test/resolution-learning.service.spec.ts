import { BadRequestException, ConflictException } from '@nestjs/common'
import { plainToInstance } from 'class-transformer'
import { validateSync } from 'class-validator'
import { describe, expect, it, vi } from 'vitest'
import { HocTapNghiQuyetService } from '../src/modules/resolution-learning/learning.service'
import { TaoBuoiHocDto } from '../src/modules/resolution-learning/learning.dto'

const actor = { maTaiKhoan: '00000000-0000-4000-8000-000000000001', maPhien: '00000000-0000-4000-8000-000000000002' } as never
const unit = '00000000-0000-4000-8000-000000000011'
const dotId = '00000000-0000-4000-8000-000000000012'

function setup() {
  const tx = {
    $queryRaw: vi.fn().mockResolvedValue([]),
    buoiHocNghiQuyet: { findUnique: vi.fn().mockResolvedValue({ trangThai: 'NHAP', phamVi: [{ maDonVi: unit }] }), create: vi.fn().mockResolvedValue({ ma: 'session' }), update: vi.fn().mockResolvedValue({ ma: 'session' }) },
    dotHocNghiQuyet: { create: vi.fn(), update: vi.fn() },
    nhatKyKiemToan: { create: vi.fn().mockResolvedValue({}) },
  }
  const prisma = {
    dotHocNghiQuyet: { findUnique: vi.fn().mockResolvedValue({ ma: dotId, trangThai: 'NHAP', phamVi: [{ maDonVi: unit }] }) },
    buoiHocNghiQuyet: { findUnique: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
    namHoc: { findUnique: vi.fn() }, donViToChuc: { count: vi.fn().mockResolvedValue(1) },
    taiKhoanNguoiDung: { findFirst: vi.fn() }, yeuCauDiemDanh: { count: vi.fn() },
    $transaction: vi.fn(async (cb: (client: unknown) => Promise<unknown>) => cb(tx)),
  }
  const authorization = { layDonViTrongPhamVi: vi.fn().mockResolvedValue({ coQuyen: true, toanHeThong: false, maDonVi: [unit] }) }
  const catalogs = { kiemTraHinhThucBuoiHoc: vi.fn().mockResolvedValue({ ma: '00000000-0000-4000-8000-000000000099', maGiaTri: 'HINH_THUC_TRUC_TIEP' }) }
  return { service: new HocTapNghiQuyetService(prisma as never, authorization as never, catalogs as never), prisma, tx, authorization, catalogs }
}

const valid = {
  ten: 'Buổi học', hinhThuc: 'HINH_THUC_TRUC_TIEP', batDauLuc: '2026-11-20T08:00:00+07:00', ketThucLuc: '2026-11-20T10:00:00+07:00', phamViDonVi: [unit],
  moTheoKeHoachLuc: '2026-11-20T08:00:00+07:00', dongTheoKeHoachLuc: '2026-11-20T10:00:00+07:00',
} as never

describe('HocTapNghiQuyetService', () => {
  it('marks hinhThuc as required in the request DTO', () => {
    const dto = plainToInstance(TaoBuoiHocDto, { ...valid, hinhThuc: undefined })
    expect(validateSync(dto).some(error => error.property === 'hinhThuc')).toBe(true)
  })

  it('persists planned attendance configuration without creating an operational window or QR session', async () => {
    const { service, tx, catalogs } = setup()
    await service.taoBuoi(actor, dotId, valid, null)
    const data = tx.buoiHocNghiQuyet.create.mock.calls[0][0].data
    expect(data.cauHinhDiemDanh.create).toMatchObject({ choPhepTrucTuyen: true, choPhepQr: true, choPhepBieuMau: true, chuKyQrGiay: 15 })
    expect(data).not.toHaveProperty('cuaSoDiemDanh')
    expect(data.cauHinhDiemDanh.create).not.toHaveProperty('maPhienQr')
    expect(catalogs.kiemTraHinhThucBuoiHoc).toHaveBeenCalledWith(expect.anything(), 'HINH_THUC_TRUC_TIEP')
    expect(data.maGiaTriHinhThuc).toBe('00000000-0000-4000-8000-000000000099')
  })

  it('rejects a session whose attendance schedule falls outside the session schedule', async () => {
    const { service, tx } = setup()
    await expect(service.taoBuoi(actor, dotId, { ...valid, moTheoKeHoachLuc: '2026-11-20T07:00:00+07:00' } as never, null)).rejects.toBeInstanceOf(BadRequestException)
    expect(tx.buoiHocNghiQuyet.create).not.toHaveBeenCalled()
  })

  it('does not create a session when the selected catalog value is missing or inactive', async () => {
    const { service, tx, catalogs } = setup()
    catalogs.kiemTraHinhThucBuoiHoc.mockRejectedValueOnce({ response: { maLoi: 'HINH_THUC_BUOI_HOC_KHONG_HOP_LE' } })
    await expect(service.taoBuoi(actor, dotId, valid, null)).rejects.toMatchObject({ response: { maLoi: 'HINH_THUC_BUOI_HOC_KHONG_HOP_LE' } })
    expect(tx.buoiHocNghiQuyet.create).not.toHaveBeenCalled()
  })

  it('rejects a new session when hinhThuc is missing, even if the TypeScript DTO was bypassed', async () => {
    const { service, tx, catalogs } = setup()
    await expect(service.taoBuoi(actor, dotId, { ...valid, hinhThuc: undefined } as never, null)).rejects.toMatchObject({ response: { maLoi: 'THIEU_HINH_THUC_BUOI_HOC' } })
    expect(catalogs.kiemTraHinhThucBuoiHoc).not.toHaveBeenCalled()
    expect(tx.buoiHocNghiQuyet.create).not.toHaveBeenCalled()
  })

  it('rejects an unknown or inactive form code when changing hinhThuc', async () => {
    const { service, prisma, tx, catalogs } = setup()
    prisma.buoiHocNghiQuyet.findUnique.mockResolvedValue(sessionWithHistoricalType())
    catalogs.kiemTraHinhThucBuoiHoc.mockRejectedValueOnce({ response: { maLoi: 'HINH_THUC_BUOI_HOC_KHONG_HOP_LE' } })
    await expect(service.suaBuoi(actor, 'session-id', { hinhThuc: 'UNKNOWN_CODE' }, null)).rejects.toMatchObject({ response: { maLoi: 'HINH_THUC_BUOI_HOC_KHONG_HOP_LE' } })
    expect(tx.buoiHocNghiQuyet.update).not.toHaveBeenCalled()
  })

  it('accepts an active catalog value when changing hinhThuc', async () => {
    const { service, prisma, tx, catalogs } = setup()
    prisma.buoiHocNghiQuyet.findUnique.mockResolvedValue(sessionWithHistoricalType())
    await service.suaBuoi(actor, 'session-id', { hinhThuc: 'TRUC_TIEP' }, null)
    expect(catalogs.kiemTraHinhThucBuoiHoc).toHaveBeenCalledWith(expect.anything(), 'TRUC_TIEP')
    expect(tx.buoiHocNghiQuyet.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ hinhThuc: 'TRUC_TIEP', maGiaTriHinhThuc: '00000000-0000-4000-8000-000000000099' }) }))
  })

  it('rejects an inactive catalog value when changing hinhThuc', async () => {
    const { service, prisma, tx, catalogs } = setup()
    prisma.buoiHocNghiQuyet.findUnique.mockResolvedValue(sessionWithHistoricalType())
    catalogs.kiemTraHinhThucBuoiHoc.mockRejectedValueOnce({ response: { maLoi: 'HINH_THUC_BUOI_HOC_KHONG_HOP_LE' } })
    await expect(service.suaBuoi(actor, 'session-id', { hinhThuc: 'NGUNG_SU_DUNG' }, null)).rejects.toMatchObject({ response: { maLoi: 'HINH_THUC_BUOI_HOC_KHONG_HOP_LE' } })
    expect(tx.buoiHocNghiQuyet.update).not.toHaveBeenCalled()
  })

  it('allows editing other fields while retaining a historical inactive form code without revalidating it', async () => {
    const { service, prisma, tx, catalogs } = setup()
    prisma.buoiHocNghiQuyet.findUnique.mockResolvedValue(sessionWithHistoricalType())
    await service.suaBuoi(actor, 'session-id', { noiDung: 'Cập nhật nội dung' }, null)
    expect(catalogs.kiemTraHinhThucBuoiHoc).not.toHaveBeenCalled()
    expect(tx.buoiHocNghiQuyet.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ hinhThuc: undefined, maGiaTriHinhThuc: undefined, noiDung: 'Cập nhật nội dung' }) }))
  })

  it('rejects ending a campaign while a session is still active', async () => {
    const { service, prisma } = setup()
    prisma.buoiHocNghiQuyet.findMany = vi.fn().mockResolvedValue([{ ma: 'session', trangThai: 'DANG_DIEN_RA' }])
    await expect(service.chuyenDot(actor, dotId, 'DA_KET_THUC', null)).rejects.toBeInstanceOf(ConflictException)
  })
})

function sessionWithHistoricalType() {
  return {
    ma: 'session-id', trangThai: 'NHAP', hinhThuc: 'HINH_THUC_CU',
    batDauLuc: new Date('2026-11-20T01:00:00Z'), ketThucLuc: new Date('2026-11-20T03:00:00Z'),
    maDot: dotId, yeuCauPheDuyet: false,
    phamVi: [{ maDonVi: unit }], dotHoc: { phamVi: [{ maDonVi: unit }] },
    giaTriHinhThuc: { maGiaTri: 'HINH_THUC_CU', tenHienThi: 'Hình thức cũ', trangThai: 'NGUNG_HOAT_DONG' },
    cauHinhDiemDanh: {
      choPhepTrucTuyen: true, choPhepQr: true, choPhepBieuMau: true, choPhepKhongDangNhap: true, chuKyQrGiay: 15,
      moTheoKeHoachLuc: new Date('2026-11-20T01:00:00Z'), dongTheoKeHoachLuc: new Date('2026-11-20T03:00:00Z'),
    },
  }
}
