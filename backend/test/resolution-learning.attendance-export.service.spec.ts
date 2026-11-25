import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common'
import ExcelJS from 'exceljs'
import { describe, expect, it, vi } from 'vitest'
import { DataTransferService } from '../src/modules/data-transfer/data-transfer.service'
import { XuatKetQuaDiemDanhService } from '../src/modules/resolution-learning/attendance-export.service'
import { ATTENDANCE_EXPORT_FIELDS, ATTENDANCE_EXPORT_PERMISSION } from '../src/modules/resolution-learning/attendance-export.fields'

const actor = { maTaiKhoan: 'actor-id', maPhien: 'session-id' }
const buoiId = '00000000-0000-4000-8000-000000000030'
const units = ['unit-branch', 'unit-team']
const rosterRows = [
  { maHoSo: 'profile-1', trangThai: 'DA_LOAI', maChiBoSnapshot: 'unit-branch', tenChiBoSnapshot: 'Chi bộ A', maToSnapshot: 'unit-team', tenToSnapshot: 'Tổ A', hoSo: { maHoSoNoiBo: '000123', hoVaTen: '=Nguyễn An' } },
]
function setup(options: { scope?: { coQuyen: boolean; toanHeThong: boolean; maDonVi: string[] }; personalScope?: { coQuyen: boolean; toanHeThong: boolean; maDonVi: string[] }; state?: string; roster?: typeof rosterRows; fieldGrants?: string[] } = {}) {
  const scope = options.scope ?? { coQuyen: true, toanHeThong: true, maDonVi: [] }
  const personalScope = options.personalScope ?? scope
  const fieldGrants = options.fieldGrants ?? [...new Set(ATTENDANCE_EXPORT_FIELDS.map(field => field.permission))]
  const permissions = { layDonViTrongPhamVi: vi.fn(async (_account: string, permission: string) => permission === ATTENDANCE_EXPORT_PERMISSION || fieldGrants.includes(permission) ? permission === 'HO_SO_CA_NHAN_XEM' ? personalScope : scope : { coQuyen: false, toanHeThong: false, maDonVi: [] }) }
  const prisma = {
    buoiHocNghiQuyet: { findUnique: vi.fn().mockResolvedValue({ ma: buoiId, maBuoi: 'BQ-001', ten: 'Buổi một', hinhThuc: 'TRUC_TIEP', batDauLuc: new Date('2026-11-12T01:00:00Z'), ketThucLuc: new Date('2026-11-12T03:00:00Z'), diaDiem: 'Hội trường', trangThai: options.state ?? 'DA_KET_THUC', giaTriHinhThuc: { tenHienThi: 'Trực tiếp' }, phamVi: [{ maDonVi: 'unit-branch' }], dotHoc: { ten: 'Đợt 1', maNamHoc: 'year-id', namHoc: { tenNamHoc: '2026-2027' }, phamVi: [{ maDonVi: 'unit-branch' }] } }) },
    danhSachThamGiaBuoiHoc: { findMany: vi.fn().mockResolvedValue(options.roster ?? rosterRows) },
    ketQuaDiemDanh: { findMany: vi.fn().mockResolvedValue([{ maHoSo: 'profile-1', trangThai: null, thoiDiemCoMat: null }]) },
    lichSuDonViDangVien: { findMany: vi.fn().mockResolvedValue([{ maHoSo: 'profile-1', maChiBo: 'unit-branch', maTo: 'unit-team' }]) },
    thongTinCaNhanDangVien: { findMany: vi.fn().mockResolvedValue([{ maHoSo: 'profile-1', soCccd: '001234567890', ngaySinh: new Date('2000-04-15T00:00:00Z') }]) },
    nhatKyKiemToan: { create: vi.fn().mockResolvedValue({}) },
  }
  const service = new XuatKetQuaDiemDanhService(prisma as never, permissions as never, new DataTransferService())
  return { service, permissions, prisma }
}

describe('XuatKetQuaDiemDanhService', () => {
  it('exposes only allowed fields in config and denies personal-only Scope for management export', async () => {
    const { service } = setup({ fieldGrants: [ATTENDANCE_EXPORT_PERMISSION, 'HOC_TAP_NGHI_QUYET_DANH_SACH_XEM'] })
    const config = await service.cauHinh(actor as never)
    expect(config.truong.map(field => field.key)).toEqual(expect.arrayContaining(['stt', 'maHoSoNoiBo', 'hoVaTen', 'chiBoSnapshot']))
    expect(config.truong.map(field => field.key)).not.toContain('soCccd')
    const personalOnly = setup({ scope: { coQuyen: true, toanHeThong: false, maDonVi: [] } })
    await expect(personalOnly.service.cauHinh(actor as never)).rejects.toBeInstanceOf(ForbiddenException)
    expect(personalOnly.prisma.buoiHocNghiQuyet.findUnique).not.toHaveBeenCalled()
  })

  it('creates a real xlsx with selected ordered fields, independent roster/result labels, leading zeros, PII permission, and safe formulas', async () => {
    const { service, prisma } = setup()
    const file = await service.xuat(actor as never, { maBuoi: buoiId, truong: ['stt', 'maHoSoNoiBo', 'hoVaTen', 'chiBoSnapshot', 'trangThaiRoster', 'ketQuaDiemDanh', 'soCccd', 'ngaySinh'] } as never)
    const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(file as never)
    const sheet = workbook.getWorksheet('Kết quả điểm danh')!
    expect(sheet.getRow(1).values).toEqual([, 'STT', 'Mã hồ sơ', 'Họ và tên', 'Chi bộ snapshot', 'Trạng thái roster', 'Kết quả điểm danh', 'CCCD', 'Ngày sinh'])
    expect(sheet.getRow(2).values).toEqual([, 1, '000123', '’=Nguyễn An', 'Chi bộ A', 'Đã loại', 'Chưa điểm danh', '001234567890', new Date('2000-04-15T00:00:00Z')])
    expect(sheet.getColumn(2).numFmt).toBe('@')
    expect(prisma.danhSachThamGiaBuoiHoc.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { maBuoi: buoiId } }))
    expect(prisma.nhatKyKiemToan.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ hanhDong: 'HOC_TAP_NGHI_QUYET_XUAT_DU_LIEU', duLieuSau: expect.objectContaining({ soLuong: 1 }) }) }))
    expect(JSON.stringify(prisma.nhatKyKiemToan.create.mock.calls[0]?.[0])).not.toContain('001234')
    expect(JSON.stringify(prisma.nhatKyKiemToan.create.mock.calls[0]?.[0])).not.toContain('Nguyễn An')
  })

  it('applies Assignment snapshot Scope in the database query and does not export out-of-scope rows', async () => {
    const { service, prisma, permissions } = setup({ scope: { coQuyen: true, toanHeThong: false, maDonVi: units } })
    prisma.danhSachThamGiaBuoiHoc.findMany.mockResolvedValue([rosterRows[0]!] as never)
    const workbookBytes = await service.xuat(actor as never, { maBuoi: buoiId, truong: ['maHoSoNoiBo', 'ketQuaDiemDanh'] } as never)
    const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(workbookBytes as never)
    expect(workbook.getWorksheet('Kết quả điểm danh')?.rowCount).toBe(2)
    expect(prisma.danhSachThamGiaBuoiHoc.findMany.mock.calls[0]?.[0]).toMatchObject({ where: { maBuoi: buoiId, OR: [{ maChiBoSnapshot: { in: units } }, { maToSnapshot: { in: units } }] } })
    expect(permissions.layDonViTrongPhamVi).toHaveBeenCalledWith(actor.maTaiKhoan, ATTENDANCE_EXPORT_PERMISSION, actor.maPhien)
  })

  it('exports full CCCD under an organizational personal-information Scope that covers the active membership', async () => {
    const scope = { coQuyen: true, toanHeThong: false, maDonVi: units }
    const { service, permissions } = setup({ scope })
    const bytes = await service.xuat(actor as never, { maBuoi: buoiId, truong: ['soCccd'] } as never)
    const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(bytes as never)
    expect(workbook.getWorksheet('Kết quả điểm danh')?.getCell('A2').value).toBe('001234567890')
    expect(permissions.layDonViTrongPhamVi).toHaveBeenCalledWith(actor.maTaiKhoan, 'HO_SO_CA_NHAN_XEM', actor.maPhien)
  })

  it('does not export personal data for a roster row outside the personal-information Scope', async () => {
    const { service, prisma } = setup({
      scope: { coQuyen: true, toanHeThong: false, maDonVi: units },
      personalScope: { coQuyen: true, toanHeThong: false, maDonVi: ['another-unit'] },
    })
    const bytes = await service.xuat(actor as never, { maBuoi: buoiId, truong: ['soCccd'] } as never)
    const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(bytes as never)
    expect(workbook.getWorksheet('Kết quả điểm danh')?.getCell('A2').value).toBeNull()
    expect(prisma.thongTinCaNhanDangVien.findMany).not.toHaveBeenCalled()
  })

  it('excludes canceled sessions by default and includes them only when explicitly selected', async () => {
    const denied = setup({ state: 'DA_HUY' })
    await expect(denied.service.xuat(actor as never, { maBuoi: buoiId, truong: ['stt'] } as never)).rejects.toMatchObject({ response: { maLoi: 'BUOI_DA_HUY_CAN_CHON_BO_LOC' } })
    expect(denied.prisma.danhSachThamGiaBuoiHoc.findMany).not.toHaveBeenCalled()
    const allowed = setup({ state: 'DA_HUY' })
    const file = await allowed.service.xuat(actor as never, { maBuoi: buoiId, baoGomBuoiDaHuy: true, truong: ['trangThaiBuoi'] } as never)
    const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(file as never)
    expect(workbook.getWorksheet('Kết quả điểm danh')?.getCell('A2').value).toBe('Đã hủy')
  })

  it('rejects unknown/unauthorized fields and does not fetch the session', async () => {
    const unknown = setup()
    await expect(unknown.service.xuat(actor as never, { maBuoi: buoiId, truong: ['cccd'] } as never)).rejects.toBeInstanceOf(BadRequestException)
    const noPermission = setup({ fieldGrants: [ATTENDANCE_EXPORT_PERMISSION] })
    await expect(noPermission.service.xuat(actor as never, { maBuoi: buoiId, truong: ['soCccd'] } as never)).rejects.toBeInstanceOf(ForbiddenException)
    expect(noPermission.prisma.buoiHocNghiQuyet.findUnique).not.toHaveBeenCalled()
  })
})
