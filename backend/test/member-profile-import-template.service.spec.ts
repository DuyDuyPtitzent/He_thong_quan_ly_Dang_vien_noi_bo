import { describe, expect, it, vi } from 'vitest'
import ExcelJS from 'exceljs'
import { DataTransferService } from '../src/modules/data-transfer/data-transfer.service'
import { HoSoDangVienService } from '../src/modules/member-profiles/member-profiles.service'
import { normalizeExcelDate, normalizeMemberStatus } from '../src/modules/member-profiles/member-profile-import-normalization'

describe('Member profile Excel import template', () => {
  const actor = { maTaiKhoan: 'actor-1', maPhien: 'session-1' }

  const fillValidImportRow = (sheet: ExcelJS.Worksheet) => {
    Object.entries({ A3:'HS-001', B3:'Nguyễn Văn An', D3:'Chính thức', E3:'CB-01', H3:'19/05/2023', R3:'15/08/2003', T3:'012345678901', L3:'D23' }).forEach(([cell, value]) => { sheet.getCell(cell).value = value })
  }

  const createService = () => {
    const transfer = new DataTransferService()
    const prisma = {
      $transaction: vi.fn(),
      donViToChuc: { findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn() },
      hoSoDangVien: { findUnique: vi.fn().mockResolvedValue(null) },
      thongTinCaNhanDangVien: { findUnique: vi.fn().mockResolvedValue(null) },
      thongTinSinhVien: { findUnique: vi.fn().mockResolvedValue(null) },
      taiKhoanNguoiDung: { findUnique: vi.fn().mockResolvedValue(null) },
    }
    const permissions = {
      kiemTra: vi.fn().mockResolvedValue(undefined),
      kiemTraQuyenDuocPhanCong: vi.fn().mockResolvedValue({ toanHeThong: true, maDonVi: [] }),
      layDonViTrongPhamVi: vi.fn().mockResolvedValue({ toanHeThong: true, maDonVi: [] }),
    }
    return { service: new HoSoDangVienService(prisma as never, permissions as never, {} as never, transfer), transfer, prisma }
  }

  it('marks required fields with asterisks without color coding or a visible template version', async () => {
    const { service, transfer } = createService()
    const workbook = await transfer.read(await service.taoMauNhap(actor as never))
    const sheet = workbook.getWorksheet('Danh sách Đảng viên')!
    const guide = workbook.getWorksheet('Hướng dẫn nhập')!

    expect(sheet.getCell('A1').text).toContain('(*) Trường bắt buộc phải nhập')
    expect(sheet.getCell('A2').text).toBe('Mã hồ sơ nội bộ (*)')
    expect(sheet.getCell('T2').text).toBe('Số CCCD (*)')
    expect(sheet.getCell('E2').text).toBe('Mã Chi bộ sinh hoạt (*)')
    expect(sheet.getCell('G2').text).toBe('Ngày bắt đầu sinh hoạt')
    expect(sheet.getCell('A2').font?.bold).toBe(true)
    expect(sheet.getCell('A2').fill?.fgColor).toBeUndefined()
    expect(sheet.getCell('G2').fill?.fgColor).toBeUndefined()
    expect(sheet.getCell('C2').fill?.fgColor).toBeUndefined()
    expect(sheet.getColumn(20).numFmt).toBe('@')
    expect(sheet.getColumn(1).numFmt).toBe('@')
    expect(sheet.getColumn(18).numFmt).toBe('dd/mm/yyyy')
    expect(sheet.getCell('S3').dataValidation).toMatchObject({ type: 'list', formulae: ['"NAM,NU"'] })
    expect(sheet.getCell('D3').dataValidation?.type).toBe('list')
    expect(sheet.getCell('D3').dataValidation?.formulae).toEqual(['"Dự bị,Chính thức,Đã ra khỏi Đảng,Từ trần"'])
    expect(sheet.getCell('T3').dataValidation?.type).toBe('custom')
    expect(sheet.getCell('S2').text).toBe('Giới tính')
    expect(sheet.getCell('S3').dataValidation).toMatchObject({ type: 'list', allowBlank: true })
    expect(guide.getCell('A1').text).toBe('HƯỚNG DẪN NHẬP EXCEL ĐẢNG VIÊN')
    expect(guide.getColumn(1).values.some((value) => String(value).includes('Nền vàng'))).toBe(false)
    expect(guide.getRow(2).values).toEqual([undefined, 'Tên trường', 'Mức độ bắt buộc', 'Định dạng', 'Giá trị hợp lệ', 'Ví dụ'])
    expect(guide.getColumn(1).values).toContain('Ngày bắt đầu sinh hoạt')
    expect(guide.getColumn(1).values).toContain('Mã Chi bộ sinh hoạt')
    expect(guide.getCell(21, 2).text).toBe('Không bắt buộc')
  })

  it('returns missing mandatory columns with their Excel row and field names', async () => {
    const { service, transfer } = createService()
    const workbook = await transfer.read(await service.taoMauNhap(actor as never))
    workbook.getWorksheet('Danh sách Đảng viên')!.getCell('A3').value = 'HS-ONLY'
    const buffer = await transfer.write(workbook)

    const preview = await service.kiemTraNhap(actor as never, { buffer, originalname: 'members.xlsx', size: buffer.length })

    expect(preview.loi).toEqual(expect.arrayContaining([
      expect.objectContaining({ row: 3, field: 'hoVaTen', message: expect.stringContaining('Họ và tên') }),
      expect.objectContaining({ row: 3, field: 'ngaySinh', message: expect.stringContaining('Ngày sinh') }),
      expect.objectContaining({ row: 3, field: 'soCccd', message: expect.stringContaining('CCCD') }),
      expect.objectContaining({ row: 3, field: 'maChiBo', message: 'Chưa nhập Chi bộ sinh hoạt.' }),
      expect.objectContaining({ row: 3, field: 'khoaDangVien', message: expect.stringContaining('Khóa Đảng viên') }),
    ]))
  })

  it('reports a missing internal profile code without sending an undefined unique selector to Prisma', async () => {
    const { service, transfer, prisma } = createService()
    const workbook = await transfer.read(await service.taoMauNhap(actor as never))
    const sheet = workbook.getWorksheet('Danh sách Đảng viên')!
    Object.entries({ B3:'Nguyễn Văn An', D3:'Chính thức', E3:'CB-01', H3:'19/05/2023', R3:'15/08/2003', T3:'012345678901', L3:'D23' }).forEach(([cell, value]) => { sheet.getCell(cell).value = value })

    const preview = await service.kiemTraNhap(actor as never, { buffer: await transfer.write(workbook), originalname: 'members.xlsx', size: 1 })

    expect(preview.loi).toContainEqual(expect.objectContaining({ row:3, field:'maHoSoNoiBo', message:'Mã hồ sơ nội bộ là trường bắt buộc.' }))
    expect(prisma.hoSoDangVien.findUnique).not.toHaveBeenCalled()
  })

  it('normalizes Vietnamese statuses and strict date-only formats', () => {
    expect(normalizeMemberStatus('  đÃ   ra KHỎI ĐẢNG ')).toBe('DA_RA_KHOI_DANG')
    expect(normalizeMemberStatus(' Dự bị ')).toBe('DU_BI')
    expect(normalizeMemberStatus('trạng thái lạ')).toBeUndefined()
    expect(normalizeExcelDate('15/08/2003')).toBe('2003-08-15')
    expect(normalizeExcelDate('19/05/2023')).toBe('2023-05-19')
    expect(normalizeExcelDate('31/02/2023')).toBeUndefined()
    expect(normalizeExcelDate(45153, true)).toBe('2023-08-15')
    expect(normalizeExcelDate(new Date('2023-05-19T00:00:00.000Z'))).toBe('2023-05-19')
  })

  it('maps branch identifiers and spreadsheet labels before DTO and permission checks', async () => {
    const branchId = '7e22c52f-51e5-4efd-82e5-9d1830324418'
    const { service, transfer } = createService()
    const prisma = (service as unknown as { prisma: { donViToChuc: { findMany: ReturnType<typeof vi.fn> } } }).prisma
    prisma.donViToChuc.findMany.mockResolvedValue([{ ma: branchId, maDinhDanh: 'CB-01', loaiDonVi: 'CHI_BO', quanHeCon: [] }])
    const workbook = await transfer.read(await service.taoMauNhap(actor as never))
    const sheet = workbook.getWorksheet('Danh sách Đảng viên')!
    Object.entries({ A3:'HS-001', B3:'Nguyễn Văn An', D3:'  Chính   thức ', E3:' CB-01 ', H3:'19/05/2023', R3:'15/08/2003', T3:'012345678901', L3:'D23' }).forEach(([cell, value]) => { sheet.getCell(cell).value = value })

    const preview = await service.kiemTraNhap(actor as never, { buffer: await transfer.write(workbook), originalname: 'members.xlsx', size: 1 })

    expect(preview.loi).toEqual([])
    expect(preview.duLieu[0]).toMatchObject({ maChiBo: 'CB-01', trangThaiDangVien: 'CHINH_THUC', ngaySinh: '2003-08-15', ngayVaoDang: '2023-05-19', gioiTinh: null })
  })

  it('counts persisted identifier collisions by row, marks only database matches as existing, and keeps workbook duplicates separate', async () => {
    const branchId = '7e22c52f-51e5-4efd-82e5-9d1830324418'
    const { service, transfer, prisma } = createService()
    prisma.donViToChuc.findMany.mockResolvedValue([{ ma: branchId, maDinhDanh: 'CB-01', loaiDonVi: 'CHI_BO', quanHeCon: [] }])
    prisma.hoSoDangVien.findUnique.mockImplementation(async ({ where }: { where: Record<string, string> }) => where.maHoSoNoiBo === 'HS-EXISTS' ? { ma: 'stored-profile' } : null)
    prisma.thongTinCaNhanDangVien.findUnique.mockImplementation(async ({ where }: { where: Record<string, string> }) => where.soCccd === '012345678901' ? { maHoSo: 'stored-profile' } : null)
    const workbook = await transfer.read(await service.taoMauNhap(actor as never))
    const sheet = workbook.getWorksheet('Danh sách Đảng viên')!
    Object.entries({ A3:'HS-EXISTS', B3:'Nguyễn An', D3:'Chính thức', E3:'CB-01', H3:'19/05/2023', R3:'15/08/2003', T3:'012345678901', L3:'D23', A4:'HS-VALID', B4:'Trần Bình', D4:'Dự bị', E4:'CB-01', H4:'19/05/2023', R4:'15/08/2003', T4:'012345678902', L4:'D23' }).forEach(([cell, value]) => { sheet.getCell(cell).value = value })

    const preview = await service.kiemTraNhap(actor as never, { buffer: await transfer.write(workbook), originalname: 'members.xlsx', size: 1 })

    expect(preview).toMatchObject({ tongSo: 2, hopLe: 1, coLoi: 1, soDaTonTai: 1 })
    expect(preview.tongSo).toBe(preview.hopLe + preview.coLoi)
    expect(preview.duLieu.map((row) => [row.hopLe, row.daTonTai])).toEqual([[false, true], [true, false]])
    expect(preview.loi.filter((error) => error.row === 3)).toHaveLength(2)
    expect(preview.loi.some((error) => error.message.includes('Mã hồ sơ HS-EXISTS đã tồn tại'))).toBe(true)
    expect(preview.loi.some((error) => error.message.includes('Số CCCD này đã được sử dụng'))).toBe(true)
  })

  it('rechecks persisted identifiers before confirmation and rejects data that appeared after preview', async () => {
    const branchId = '7e22c52f-51e5-4efd-82e5-9d1830324418'
    const { service, transfer, prisma } = createService()
    prisma.donViToChuc.findMany.mockResolvedValue([{ ma: branchId, maDinhDanh: 'CB-01', loaiDonVi: 'CHI_BO', quanHeCon: [] }])
    const workbook = await transfer.read(await service.taoMauNhap(actor as never))
    const sheet = workbook.getWorksheet('Danh sách Đảng viên')!
    Object.entries({ A3:'HS-NEW', B3:'Nguyễn An', D3:'Chính thức', E3:'CB-01', G3:'01/09/2024', H3:'19/05/2023', R3:'15/08/2003', T3:'012345678901', L3:'D23' }).forEach(([cell, value]) => { sheet.getCell(cell).value = value })
    const preview = await service.kiemTraNhap(actor as never, { buffer: await transfer.write(workbook), originalname: 'members.xlsx', size: 1 })
    prisma.hoSoDangVien.findUnique.mockResolvedValueOnce({ ma: 'inserted-after-preview' })

    await expect(service.xacNhanNhap(actor as never, preview.maPhienNhap!, null)).rejects.toMatchObject({ response: { maLoi: 'DU_LIEU_NHAP_DA_THAY_DOI', dongExcel: 3 } })
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it.each([
    ['a formula without a cached result', { formula: '="HS-001"' }, 'chưa có kết quả được lưu'],
    ['a formula with an error result', { formula: '=NA()', result: { error: '#N/A' } }, 'lỗi Excel'],
    ['a formula with an external workbook reference', { formula: "='[external.xlsx]Sheet1'!A1", result: 'HS-001' }, 'không an toàn'],
  ])('rejects %s without stringifying its formula object', async (_case, formulaValue, expectedMessage) => {
    const branchId = '7e22c52f-51e5-4efd-82e5-9d1830324418'
    const { service, transfer } = createService()
    const prisma = (service as unknown as { prisma: { donViToChuc: { findMany: ReturnType<typeof vi.fn> } } }).prisma
    prisma.donViToChuc.findMany.mockResolvedValue([{ ma: branchId, maDinhDanh: 'CB-01', loaiDonVi: 'CHI_BO', quanHeCon: [] }])
    const workbook = await transfer.read(await service.taoMauNhap(actor as never))
    const sheet = workbook.getWorksheet('Danh sách Đảng viên')!
    fillValidImportRow(sheet)
    sheet.getCell('A3').value = formulaValue as never

    const preview = await service.kiemTraNhap(actor as never, { buffer: await transfer.write(workbook), originalname: 'members.xlsx', size: 1 })

    expect(preview.loi).toContainEqual(expect.objectContaining({ row:3, field:'maHoSoNoiBo', message:expect.stringContaining(expectedMessage as string) }))
    expect(preview.loi.some((error) => /\[object object\]/i.test(error.message))).toBe(false)
  })

  it('normalizes cached formula results across profile fields using their domain validators', async () => {
    const branchId = '7e22c52f-51e5-4efd-82e5-9d1830324418'
    const { service, transfer } = createService()
    const prisma = (service as unknown as { prisma: { donViToChuc: { findMany: ReturnType<typeof vi.fn> } } }).prisma
    prisma.donViToChuc.findMany.mockResolvedValue([{ ma: branchId, maDinhDanh: 'CB-01', loaiDonVi: 'CHI_BO', quanHeCon: [] }])
    const workbook = await transfer.read(await service.taoMauNhap(actor as never))
    const sheet = workbook.getWorksheet('Danh sách Đảng viên')!
    Object.entries({ A3:{formula:'="HS-CACHED"',result:'HS-CACHED'}, B3:{formula:'="Nguyễn Văn An"',result:'Nguyễn Văn An'}, D3:{formula:'="Chính thức"',result:'Chính thức'}, E3:{formula:'="CB-01"',result:'CB-01'}, H3:{formula:'=DATE(2023,5,19)',result:45065}, L3:{formula:'="D23"',result:'D23'}, R3:{formula:'=DATE(2003,8,15)',result:37848}, S3:{formula:'="Nam"',result:'Nam'}, T3:{formula:'="012345678901"',result:'012345678901'} }).forEach(([cell, value]) => { sheet.getCell(cell).value = value as never })

    const preview = await service.kiemTraNhap(actor as never, { buffer: await transfer.write(workbook), originalname: 'members.xlsx', size: 1 })

    expect(preview.loi).toEqual([])
    expect(preview.duLieu[0]).toMatchObject({ maHoSoNoiBo:'HS-CACHED', hoVaTen:'Nguyễn Văn An', trangThaiDangVien:'CHINH_THUC', maChiBo:'CB-01', ngayVaoDang:'2023-05-19', khoaDangVien:'D23', ngaySinh:'2003-08-15', gioiTinh:'NAM', soCccd:'012345678901' })
  })

  it('validates 100 rows containing cached formula values through the regular import pipeline', async () => {
    const branchId = '7e22c52f-51e5-4efd-82e5-9d1830324418'
    const { service, transfer } = createService()
    const prisma = (service as unknown as { prisma: { donViToChuc: { findMany: ReturnType<typeof vi.fn> } } }).prisma
    prisma.donViToChuc.findMany.mockResolvedValue([{ ma: branchId, maDinhDanh: 'CB-01', loaiDonVi: 'CHI_BO', quanHeCon: [] }])
    const workbook = await transfer.read(await service.taoMauNhap(actor as never))
    const sheet = workbook.getWorksheet('Danh sách Đảng viên')!
    for (let index = 1; index <= 100; index++) {
      const row = index + 2
      sheet.getCell(row, 1).value = { formula: `="HS-${index}"`, result: `HS-${index}` }
      sheet.getCell(row, 2).value = { formula: `="Đảng viên ${index}"`, result: `Đảng viên ${index}` }
      sheet.getCell(row, 4).value = { formula: '="Dự bị"', result: 'Dự bị' }
      sheet.getCell(row, 5).value = { formula: '="CB-01"', result: 'CB-01' }
      sheet.getCell(row, 8).value = { formula: '=DATE(2023,5,19)', result: 45065 }
      sheet.getCell(row, 12).value = { formula: '="D23"', result: 'D23' }
      sheet.getCell(row, 18).value = { formula: '=DATE(2003,8,15)', result: 37848 }
      sheet.getCell(row, 20).value = { formula: `="${String(index).padStart(12, '0')}"`, result: String(index).padStart(12, '0') }
    }

    const preview = await service.kiemTraNhap(actor as never, { buffer: await transfer.write(workbook), originalname: 'members.xlsx', size: 1 })

    expect(preview.tongSo).toBe(100)
    expect(preview.loi).toEqual([])
    expect(preview.duLieu[99]).toMatchObject({ maHoSoNoiBo:'HS-100', soCccd:'000000000100', ngaySinh:'2003-08-15' })
  })

  it('validates a cached formula result in the party-member cohort field as ordinary data', async () => {
    const branchId = '7e22c52f-51e5-4efd-82e5-9d1830324418'
    const { service, transfer } = createService()
    const prisma = (service as unknown as { prisma: { donViToChuc: { findMany: ReturnType<typeof vi.fn> } } }).prisma
    prisma.donViToChuc.findMany.mockResolvedValue([{ ma: branchId, maDinhDanh: 'CB-01', loaiDonVi: 'CHI_BO', quanHeCon: [] }])
    const workbook = await transfer.read(await service.taoMauNhap(actor as never))
    const sheet = workbook.getWorksheet('Danh sách Đảng viên')!
    fillValidImportRow(sheet)
    sheet.getCell('L3').value = { formula: '="D23"', result: 'D23' }

    const preview = await service.kiemTraNhap(actor as never, { buffer: await transfer.write(workbook), originalname: 'members.xlsx', size: 1 })

    expect(preview.loi).toEqual([])
    expect(preview.duLieu[0].khoaDangVien).toBe('D23')
    expect(preview.loi.some((error) => /\[object object\]/i.test(error.message))).toBe(false)
    expect(preview.loi.some((error) => error.message.includes('Dxx'))).toBe(false)
  })

  it('rejects external hyperlinks with a values-only instruction', async () => {
    const branchId = '7e22c52f-51e5-4efd-82e5-9d1830324418'
    const { service, transfer } = createService()
    const prisma = (service as unknown as { prisma: { donViToChuc: { findMany: ReturnType<typeof vi.fn> } } }).prisma
    prisma.donViToChuc.findMany.mockResolvedValue([{ ma: branchId, maDinhDanh: 'CB-01', loaiDonVi: 'CHI_BO', quanHeCon: [] }])
    const workbook = await transfer.read(await service.taoMauNhap(actor as never))
    const sheet = workbook.getWorksheet('Danh sách Đảng viên')!
    fillValidImportRow(sheet)
    sheet.getCell('A3').value = { text:'HS-001', hyperlink:'https://example.invalid/member-code' }

    const preview = await service.kiemTraNhap(actor as never, { buffer: await transfer.write(workbook), originalname: 'members.xlsx', size: 1 })

    expect(preview.loi).toContainEqual(expect.objectContaining({ row:3, field:'maHoSoNoiBo', message:expect.stringContaining('Không chấp nhận ô chứa liên kết ngoài') }))
    expect(preview.loi.some((error) => /\[object object\]/i.test(error.message))).toBe(false)
  })

  it('returns actionable row errors and skips permission checks for unresolved branches', async () => {
    const { service, transfer } = createService()
    const permissions = (service as unknown as { phanQuyen: { kiemTra: ReturnType<typeof vi.fn> } }).phanQuyen
    const workbook = await transfer.read(await service.taoMauNhap(actor as never))
    const sheet = workbook.getWorksheet('Danh sách Đảng viên')!
    Object.entries({ A3:'HS-001', B3:'Nguyễn Văn An', D3:'unknown status', E3:'NO-SUCH-BRANCH', H3:'31/02/2023', R3:'31/02/2003', S3:'NAM', T3:'012345678901', L3:'D23' }).forEach(([cell, value]) => { sheet.getCell(cell).value = value })

    const preview = await service.kiemTraNhap(actor as never, { buffer: await transfer.write(workbook), originalname: 'members.xlsx', size: 1 })

    expect(preview.loi).toEqual(expect.arrayContaining([
      expect.objectContaining({ row:3, field:'trangThaiDangVien', message:'Trạng thái Đảng viên không hợp lệ. Vui lòng chọn giá trị trong danh mục.' }),
      expect.objectContaining({ row:3, field:'ngayVaoDang', message:'Ngày vào Đảng không hợp lệ. Vui lòng nhập theo định dạng ngày/tháng/năm.' }),
      expect.objectContaining({ row:3, field:'ngaySinh', message:'Ngày sinh không hợp lệ. Vui lòng nhập theo định dạng ngày/tháng/năm.' }),
      expect.objectContaining({ row:3, field:'maChiBo', message:'Không tìm thấy Chi bộ tương ứng với mã đã nhập.' }),
    ]))
    expect(preview.loi.some((error) => /UUID|ISO 8601|must be one of/i.test(error.message))).toBe(false)
    expect(permissions.kiemTra).not.toHaveBeenCalled()
  })

  it('reports lack of Scope as an actionable permission error after resolving a real branch', async () => {
    const branchId = '7e22c52f-51e5-4efd-82e5-9d1830324418'
    const { service, transfer } = createService()
    const prisma = (service as unknown as { prisma: { donViToChuc: { findMany: ReturnType<typeof vi.fn> } } }).prisma
    prisma.donViToChuc.findMany.mockResolvedValue([{ ma: branchId, maDinhDanh: 'CB-01', loaiDonVi: 'CHI_BO', quanHeCon: [] }])
    const permissions = (service as unknown as { phanQuyen: { kiemTra: ReturnType<typeof vi.fn> } }).phanQuyen
    permissions.kiemTra.mockRejectedValue(new Error('forbidden'))
    const workbook = await transfer.read(await service.taoMauNhap(actor as never))
    Object.entries({ A3:'HS-001', B3:'Nguyễn Văn An', D3:'Dự bị', E3:'CB-01', H3:'19/05/2023', R3:'15/08/2003', S3:'NAM', T3:'012345678901', L3:'D23' }).forEach(([cell, value]) => { workbook.getWorksheet('Danh sách Đảng viên')!.getCell(cell).value = value })

    const preview = await service.kiemTraNhap(actor as never, { buffer: await transfer.write(workbook), originalname: 'members.xlsx', size: 1 })

    expect(preview.loi).toContainEqual(expect.objectContaining({ row:3, field:'maChiBo', message:'Bạn không có quyền tạo hồ sơ tại Chi bộ này.' }))
    expect(permissions.kiemTra).toHaveBeenCalledWith(actor.maTaiKhoan, 'HO_SO_DANG_VIEN_TAO', { maDonVi:branchId }, actor.maPhien)
  })

  it('keeps a valid preview session after a failed write so the error is not misreported as expired', async () => {
    const branchId = '7e22c52f-51e5-4efd-82e5-9d1830324418'
    const { service, transfer, prisma } = createService()
    prisma.donViToChuc.findMany.mockResolvedValue([{ ma: branchId, maDinhDanh: 'CB-01', loaiDonVi: 'CHI_BO', quanHeCon: [] }])
    prisma.$transaction = vi.fn().mockRejectedValue(new Error('simulated database failure'))
    const workbook = await transfer.read(await service.taoMauNhap(actor as never))
    Object.entries({ A3:'HS-001', B3:'Nguyễn Văn An', D3:'Chính thức', E3:'CB-01', G3:'01/09/2024', H3:'19/05/2023', R3:'15/08/2003', S3:'NAM', T3:'012345678901', L3:'D23' }).forEach(([cell, value]) => { workbook.getWorksheet('Danh sách Đảng viên')!.getCell(cell).value = value })
    const preview = await service.kiemTraNhap(actor as never, { buffer: await transfer.write(workbook), originalname: 'members.xlsx', size: 1 })
    expect(preview.maPhienNhap).toBeTruthy()

    await expect(service.xacNhanNhap(actor as never, preview.maPhienNhap!, null)).rejects.toThrow('simulated database failure')
    await expect(service.xacNhanNhap(actor as never, preview.maPhienNhap!, null)).rejects.toThrow('simulated database failure')
  })

  it('writes the batch audit without putting a non-UUID label in the UUID target column', async () => {
    const branchId = '7e22c52f-51e5-4efd-82e5-9d1830324418'
    const { service, transfer, prisma } = createService()
    const branch = { ma: branchId, maDinhDanh: 'CB-01', loaiDonVi: 'CHI_BO', trangThai: 'DANG_HOAT_DONG', quanHeCon: [] }
    prisma.donViToChuc.findMany.mockResolvedValue([branch])
    prisma.donViToChuc.findUnique.mockResolvedValue(branch)
    const tx = {
      hoSoDangVien: { create: vi.fn().mockResolvedValue({ ma: '1a86ca17-329c-415a-b87c-3b800bb138f5', maHoSoNoiBo:'HS-001', hoVaTen:'Nguyễn Văn An' }) },
      lichSuDonViDangVien: { create: vi.fn().mockResolvedValue({}) },
      nhatKyKiemToan: { create: vi.fn().mockResolvedValue({}) },
    }
    prisma.$transaction.mockImplementation(async (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx))
    const workbook = await transfer.read(await service.taoMauNhap(actor as never))
    Object.entries({ A3:'HS-001', B3:'Nguyễn Văn An', D3:'Chính thức', E3:'CB-01', G3:'01/09/2024', H3:'19/05/2023', R3:'15/08/2003', S3:'NAM', T3:'012345678901', L3:'D23' }).forEach(([cell, value]) => { workbook.getWorksheet('Danh sách Đảng viên')!.getCell(cell).value = value })
    const preview = await service.kiemTraNhap(actor as never, { buffer: await transfer.write(workbook), originalname: 'members.xlsx', size: 1 })

    const result = await service.xacNhanNhap(actor as never, preview.maPhienNhap!, null)

    expect(result.tongSo).toBe(1)
    expect(tx.nhatKyKiemToan.create).toHaveBeenCalledTimes(2)
    expect(tx.nhatKyKiemToan.create.mock.calls[1][0].data).toMatchObject({
      hanhDong: 'HO_SO_DANG_VIEN_NHAP_HANG_LOAT',
      loaiDoiTuong: 'HO_SO_DANG_VIEN',
      maDoiTuong: null,
    })
  })
})
