import 'reflect-metadata'
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PrivateFileStorageService } from '../src/common/private-storage/private-file-storage.service'
import { TepDinhKemHocTapService } from '../src/modules/resolution-learning/learning-files.service'

const actor = { maTaiKhoan: '00000000-0000-4000-8000-000000000001', maPhien: '00000000-0000-4000-8000-000000000002' }
const dotId = '00000000-0000-4000-8000-000000000010'
const buoiId = '00000000-0000-4000-8000-000000000011'
const unitId = '00000000-0000-4000-8000-000000000020'
const fileId = '00000000-0000-4000-8000-000000000030'
const pdf = Buffer.from('%PDF-1.7\nfixture')

describe('Resolution learning attachment service', () => {
  let root = ''
  let storage: PrivateFileStorageService
  let prisma: any
  let permissions: any
  let service: TepDinhKemHocTapService
  let created: any
  let tx: any
  let fileRecord: any

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'learning-files-'))
    storage = new PrivateFileStorageService({ get: () => root } as never)
    permissions = { layDonViTrongPhamVi: vi.fn().mockResolvedValue({ coQuyen: true, toanHeThong: false, maDonVi: [unitId] }) }
    created = { ma: fileId, tenTepGoc: 'Báo cáo.pdf', kieuNoiDung: 'application/pdf', kichThuoc: pdf.length, ngayTao: new Date(), trangThai: 'DANG_SU_DUNG' }
    tx = { dotHocNghiQuyet: { findUnique: vi.fn().mockResolvedValue({ trangThai: 'DANG_DIEN_RA', phamVi: [{ maDonVi: unitId }] }) }, tepDinhKemHocTap: { create: vi.fn().mockResolvedValue(created), findUnique: vi.fn(), update: vi.fn().mockResolvedValue({ ma: fileId, trangThai: 'DA_XOA', ngayXoa: new Date() }) }, nhatKyKiemToan: { create: vi.fn().mockResolvedValue({}) }, $queryRaw: vi.fn() }
    fileRecord = { ma: fileId, maDot: dotId, maBuoi: null, khoaLuuTru: '00000000-0000-4000-8000-000000000031.pdf', tenTepGoc: 'Báo cáo.pdf', kieuNoiDung: 'application/pdf', kichThuoc: pdf.length, maSha256: createHash('sha256').update(pdf).digest('hex'), trangThai: 'DANG_SU_DUNG' }
    prisma = {
      dotHocNghiQuyet: { findUnique: vi.fn().mockResolvedValue({ ma: dotId, trangThai: 'DANG_DIEN_RA', phamVi: [{ maDonVi: unitId }] }) },
      buoiHocNghiQuyet: { findUnique: vi.fn().mockResolvedValue({ ma: buoiId, trangThai: 'DANG_DIEN_RA', phamVi: [{ maDonVi: unitId }], dotHoc: { ma: dotId, trangThai: 'DANG_DIEN_RA', phamVi: [{ maDonVi: unitId }] } }) },
      tepDinhKemHocTap: { findUnique: vi.fn().mockResolvedValue(fileRecord) },
      $transaction: vi.fn((callback: (tx: any) => unknown) => callback(tx)),
    }
    service = new TepDinhKemHocTapService(prisma, permissions, storage)
  })

  afterEach(async () => { await rm(root, { recursive: true, force: true }) })

  it('uploads PDF by signature, sanitizes name, records SHA-256 and audits metadata only', async () => {
    const result = await service.taiLenDot(actor as never, dotId, { buffer: pdf, originalname: '..\\Báo cáo.pdf\r\n', mimetype: 'application/pdf', size: pdf.length }, null)
    expect(result).toEqual(created)
    expect(tx.tepDinhKemHocTap.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ maDot: dotId, maBuoi: undefined, tenTepGoc: 'Báo cáo.pdf', maSha256: createHash('sha256').update(pdf).digest('hex'), kieuNoiDung: 'application/pdf' }) }))
    expect(tx.nhatKyKiemToan.create.mock.calls[0][0].data.duLieuSau).not.toHaveProperty('khoaLuuTru')
    expect(permissions.layDonViTrongPhamVi).toHaveBeenCalledWith(actor.maTaiKhoan, 'HOC_TAP_TEP_TAI_LEN', actor.maPhien)
  })

  it('rejects empty, oversized, forged MIME and unsupported signature data', async () => {
    await expect(service.taiLenDot(actor as never, dotId, undefined, null)).rejects.toBeInstanceOf(BadRequestException)
    await expect(service.taiLenDot(actor as never, dotId, { buffer: pdf, originalname: 'x.pdf', mimetype: 'application/pdf', size: 10 * 1024 * 1024 + 1 }, null)).rejects.toBeInstanceOf(BadRequestException)
    await expect(service.taiLenDot(actor as never, dotId, { buffer: pdf, originalname: 'x.png', mimetype: 'image/png', size: pdf.length }, null)).rejects.toBeInstanceOf(BadRequestException)
    await expect(service.taiLenDot(actor as never, dotId, { buffer: Buffer.from('MZ executable'), originalname: 'x.pdf', mimetype: 'application/pdf', size: 13 }, null)).rejects.toBeInstanceOf(BadRequestException)
  })

  it('accepts JPG and PNG signatures from the approved formats', async () => {
    const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xd9])
    const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
    await expect(service.taiLenDot(actor as never, dotId, { buffer: jpg, originalname: 'anh.jpg', mimetype: 'image/jpeg', size: jpg.length }, null)).resolves.toBeDefined()
    await expect(service.taiLenDot(actor as never, dotId, { buffer: png, originalname: 'anh.png', mimetype: 'image/png', size: png.length }, null)).resolves.toBeDefined()
  })

  it('requires one active Assignment permission whose Scope covers the complete owner', async () => {
    permissions.layDonViTrongPhamVi.mockResolvedValueOnce({ coQuyen: false, toanHeThong: false, maDonVi: [] })
    await expect(service.taiLenDot(actor as never, dotId, { buffer: pdf, originalname: 'x.pdf', mimetype: 'application/pdf', size: pdf.length }, null)).rejects.toBeInstanceOf(ForbiddenException)
    permissions.layDonViTrongPhamVi.mockResolvedValueOnce({ coQuyen: true, toanHeThong: false, maDonVi: [] })
    await expect(service.taiLenDot(actor as never, dotId, { buffer: pdf, originalname: 'x.pdf', mimetype: 'application/pdf', size: pdf.length }, null)).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('requires the dedicated delete Permission and owner Scope', async () => {
    permissions.layDonViTrongPhamVi.mockResolvedValueOnce({ coQuyen: false, toanHeThong: false, maDonVi: [] })
    await expect(service.xoa(actor as never, fileId, null)).rejects.toBeInstanceOf(NotFoundException)
    expect(permissions.layDonViTrongPhamVi).toHaveBeenCalledWith(actor.maTaiKhoan, 'HOC_TAP_TEP_XOA', actor.maPhien)
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('does not upload to a finished or cancelled owner', async () => {
    prisma.dotHocNghiQuyet.findUnique.mockResolvedValueOnce({ ma: dotId, trangThai: 'DA_KET_THUC', phamVi: [{ maDonVi: unitId }] })
    await expect(service.taiLenDot(actor as never, dotId, { buffer: pdf, originalname: 'x.pdf', mimetype: 'application/pdf', size: pdf.length }, null)).rejects.toBeInstanceOf(ConflictException)
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('requires Scope over both the session and campaign when uploading to a session', async () => {
    prisma.buoiHocNghiQuyet.findUnique.mockResolvedValueOnce({ ma: buoiId, trangThai: 'DA_LEN_LICH', phamVi: [{ maDonVi: unitId }], dotHoc: { ma: dotId, trangThai: 'DANG_DIEN_RA', phamVi: [{ maDonVi: '00000000-0000-4000-8000-000000000099' }] } })
    await expect(service.taiLenBuoi(actor as never, buoiId, { buffer: pdf, originalname: 'x.pdf', mimetype: 'application/pdf', size: pdf.length }, null)).rejects.toBeInstanceOf(ForbiddenException)
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('removes the just-written file if the metadata/audit transaction fails', async () => {
    prisma.$transaction.mockRejectedValueOnce(new Error('db write failed'))
    await expect(service.taiLenDot(actor as never, dotId, { buffer: pdf, originalname: 'x.pdf', mimetype: 'application/pdf', size: pdf.length }, null)).rejects.toThrow('db write failed')
    const files = await import('node:fs/promises').then(fs => fs.readdir(root))
    expect(files).toEqual([])
  })

  it('streams a hash-verified file and hides unavailable or out-of-scope UUIDs', async () => {
    const key = '00000000-0000-4000-8000-000000000031.pdf'
    await storage.ghi(key, pdf)
    prisma.tepDinhKemHocTap.findUnique.mockResolvedValueOnce({ ...fileRecord, khoaLuuTru: key })
    const downloaded = await service.taiXuong(actor as never, fileId)
    const chunks: Buffer[] = []
    for await (const chunk of downloaded.stream) chunks.push(Buffer.from(chunk))
    expect(Buffer.concat(chunks)).toEqual(pdf)
    expect(permissions.layDonViTrongPhamVi).toHaveBeenLastCalledWith(actor.maTaiKhoan, 'HOC_TAP_TEP_TAI_XUONG', actor.maPhien)

    permissions.layDonViTrongPhamVi.mockResolvedValueOnce({ coQuyen: false, toanHeThong: false, maDonVi: [] })
    await expect(service.taiXuong(actor as never, fileId)).rejects.toBeInstanceOf(NotFoundException)
  })

  it('rejects tampered file contents before opening the download stream', async () => {
    const key = '00000000-0000-4000-8000-000000000031.pdf'
    await storage.ghi(key, Buffer.from('different bytes'))
    prisma.tepDinhKemHocTap.findUnique.mockResolvedValueOnce({ ma: fileId, maDot: dotId, maBuoi: null, khoaLuuTru: key, tenTepGoc: 'Báo cáo.pdf', kieuNoiDung: 'application/pdf', maSha256: createHash('sha256').update(pdf).digest('hex'), trangThai: 'DANG_SU_DUNG' })
    await expect(service.taiXuong(actor as never, fileId)).rejects.toBeInstanceOf(ConflictException)
  })

  it('soft deletes transactionally, records actor/time, and blocks download after deletion', async () => {
    const tx = { tepDinhKemHocTap: { findUnique: vi.fn().mockResolvedValue({ ma: fileId, maDot: dotId, maBuoi: null, trangThai: 'DANG_SU_DUNG', ngayXoa: null }), update: vi.fn().mockResolvedValue({ ma: fileId, trangThai: 'DA_XOA', ngayXoa: expect.any(Date) }) }, nhatKyKiemToan: { create: vi.fn().mockResolvedValue({}) }, $queryRaw: vi.fn() }
    prisma.$transaction.mockImplementationOnce((callback: (value: any) => unknown) => callback(tx))
    const result = await service.xoa(actor as never, fileId, null)
    expect(result.trangThai).toBe('DA_XOA')
    expect(tx.tepDinhKemHocTap.update).toHaveBeenCalledWith(expect.objectContaining({ where: { ma: fileId }, data: expect.objectContaining({ trangThai: 'DA_XOA', maNguoiXoa: actor.maTaiKhoan, ngayXoa: expect.any(Date) }) }))
    expect(tx.nhatKyKiemToan.create).toHaveBeenCalledOnce()

    prisma.tepDinhKemHocTap.findUnique.mockResolvedValueOnce({ ma: fileId, maDot: dotId, maBuoi: null, trangThai: 'DA_XOA', ngayXoa: new Date() })
    await expect(service.taiXuong(actor as never, fileId)).rejects.toBeInstanceOf(NotFoundException)
  })

  it('treats a repeated authorized delete as a no-op without duplicating audit', async () => {
    prisma.tepDinhKemHocTap.findUnique.mockResolvedValueOnce({ ...fileRecord, trangThai: 'DA_XOA', ngayXoa: new Date() })
    const result = await service.xoa(actor as never, fileId, null)
    expect(result.trangThai).toBe('DA_XOA')
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('rejects storage keys containing traversal and never accepts client-supplied keys', async () => {
    expect(() => storage.duongDanAnToan('../outside.pdf')).toThrow()
    expect(() => storage.duongDanAnToan('00000000-0000-4000-8000-000000000001.pdf/../../outside')).toThrow()
    await expect(readFile(join(root, 'outside.pdf'))).rejects.toThrow()
  })
})
