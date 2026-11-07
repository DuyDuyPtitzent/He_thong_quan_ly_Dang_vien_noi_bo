import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import ExcelJS from 'exceljs'
import { validate } from 'class-validator'
import { plainToInstance } from 'class-transformer'
import { randomUUID } from 'node:crypto'
import { Prisma } from '../../infrastructure/database/generated/prisma/client'
import { DichVuPrisma } from '../../infrastructure/database/prisma.service'
import { BamMatKhauService } from '../auth/password-hasher'
import type { TaiKhoanDaXacThuc } from '../auth/auth.types'
import { PhanQuyenService } from '../authorization/authorization.service'
import { DataTransferService } from '../data-transfer/data-transfer.service'
import { demQuanTriVienToanHeThongHopLe, khoaKiemTraQuanTriVienCuoi, systemAdministratorRoleCode } from '../authorization/system-administrator.policy'
import { DanhSachTaiKhoanDto, DoiTrangThaiTaiKhoanDto, LienKetHoSoDto, SuaTaiKhoanDto, TaoTaiKhoanDto, TimHoSoChuaLienKetDto } from './accounts.dto'

const statusValues = ['DANG_HOAT_DONG', 'TAM_KHOA', 'NGUNG_HOAT_DONG'] as const
const nowFilter = (now: Date) => ({ ngayHieuLucTu: { lte: now }, OR: [{ ngayHieuLucDen: null }, { ngayHieuLucDen: { gt: now } }] })
const activeAssignmentFilter = (now: Date) => ({ ...nowFilter(now), thuHoiLuc: null })

@Injectable()
export class TaiKhoanService {
  private readonly importSessions = new Map<string, { actor: string; expiresAt: number; mode: 'LIEN_KET_HO_SO' | 'DOC_LAP'; rows: { row: number; dto: Omit<TaoTaiKhoanDto, 'matKhauBanDau'>; passwordHash: string; login: string; email: string | null }[] }>()
  private readonly importsInProgress = new Set<string>()
  constructor(
    @Inject(DichVuPrisma) private readonly prisma: DichVuPrisma,
    @Inject(PhanQuyenService) private readonly phanQuyen: PhanQuyenService,
    @Inject(BamMatKhauService) private readonly bamMatKhau: BamMatKhauService,
    @Inject(DataTransferService) private readonly transfer: DataTransferService,
  ) {}

  async danhSach(actor: TaiKhoanDaXacThuc, query: DanhSachTaiKhoanDto) {
    const trang = Number(query.trang ?? 1)
    const gioiHan = Number(query.gioiHan ?? 20)
    const scope = await this.phanQuyen.layDonViTrongPhamVi(actor.maTaiKhoan, 'TAI_KHOAN_XEM', actor.maPhien)
    if (!scope.coQuyen) throw this.forbidden()
    const ids = scope.toanHeThong ? undefined : await this.layTaiKhoanTrongDonVi(scope.maDonVi)
    if (ids && ids.length === 0) return { duLieu: [], phanTrang: { trang, gioiHan, tongSo: 0 }, thongKe: this.thongKeRong(), thongKePhanQuyen: this.thongKePhanQuyenRong(), danhMucChiBo: [] }
    const now = new Date()
    const scopeWhere: Prisma.TaiKhoanNguoiDungWhereInput = ids ? { ma: { in: ids } } : {}
    const assignmentFilters: Prisma.TaiKhoanNguoiDungWhereInput[] = []
    if (query.coPhanCong === 'CO') assignmentFilters.push({ phanCongVaiTroDuocGan: { some: activeAssignmentFilter(now) } })
    if (query.coPhanCong === 'KHONG') assignmentFilters.push({ phanCongVaiTroDuocGan: { none: activeAssignmentFilter(now) } })
    if (query.maVaiTro) assignmentFilters.push({ phanCongVaiTroDuocGan: { some: { ...activeAssignmentFilter(now), maVaiTro: query.maVaiTro } } })
    const accountConditions: Prisma.TaiKhoanNguoiDungWhereInput[] = []
    if (query.maTaiKhoan) accountConditions.push({ ma: query.maTaiKhoan })
    if (query.tuKhoa?.trim()) accountConditions.push({ OR: [
        { tenDangNhap: { contains: query.tuKhoa.trim(), mode: 'insensitive' } },
        { email: { contains: query.tuKhoa.trim(), mode: 'insensitive' } },
        { hoSoDangVien: { is: { hoVaTen: { contains: query.tuKhoa.trim(), mode: 'insensitive' } } } },
      ] })
    if (query.trangThai === 'TAM_KHOA_HOAC_NGUNG_HOAT_DONG') accountConditions.push({ trangThai: { in: ['TAM_KHOA', 'NGUNG_HOAT_DONG'] } })
    else if (query.trangThai) accountConditions.push({ trangThai: query.trangThai })
    if (query.tinhTrangLienKet === 'DA_LIEN_KET') accountConditions.push({ hoSoDangVien: { isNot: null } })
    if (query.tinhTrangLienKet === 'CHUA_LIEN_KET') accountConditions.push({ hoSoDangVien: { is: null } })
    if (query.maChiBo) accountConditions.push({ hoSoDangVien: { is: { lichSuDonVi: { some: { AND: [nowFilter(now), { maChiBo: query.maChiBo }] } } } } })
    accountConditions.push(...assignmentFilters)
    const base: Prisma.TaiKhoanNguoiDungWhereInput = {
      ...(ids ? { ma: { in: ids } } : {}),
      ...(accountConditions.length ? { AND: accountConditions } : {}),
    }
    const [total, accounts, statusCounts, unlinked, totalInScope, assignedInScope, expiringAssignments, branchRows] = await Promise.all([
      this.prisma.taiKhoanNguoiDung.count({ where: base }),
      this.prisma.taiKhoanNguoiDung.findMany({
        where: base,
        orderBy: { tenDangNhap: 'asc' },
        skip: (trang - 1) * gioiHan,
        take: gioiHan,
        select: {
          ma: true, tenDangNhap: true, email: true, trangThai: true, dangNhapCuoiLuc: true, ngayTao: true, ngayCapNhat: true, khoaDen: true, doiMatKhauLanDau: true,
        hoSoDangVien: { select: {
            ma: true, maHoSoNoiBo: true, hoVaTen: true, trangThai: true,
            lichSuDonVi: {
              where: nowFilter(now), take: 1,
              select: { chiBo: { select: {
                ma: true, maDinhDanh: true,
                tenDonVi: {
                  where: { ngayHieuLucTu: { lte: now }, OR: [{ ngayHieuLucDen: null }, { ngayHieuLucDen: { gt: now } }] },
                  take: 1, select: { ten: true },
                },
              } } },
            },
          } },
          phanCongVaiTroDuocGan: {
            where: activeAssignmentFilter(now),
            select: {
              ma: true, maVaiTro: true, loaiPhamVi: true, maDonViGoc: true, ngayHieuLucTu: true, ngayHieuLucDen: true,
              donViGoc: { select: { ma: true, maDinhDanh: true, tenDonVi: { where: { ngayHieuLucTu: { lte: now }, OR: [{ ngayHieuLucDen: null }, { ngayHieuLucDen: { gt: now } }] }, take: 1, select: { ten: true } } } },
              vaiTro: { select: { maDinhDanh: true, ten: true } },
              phamViDonViChiDinh: { select: { donVi: { select: {
                ma: true, maDinhDanh: true,
                tenDonVi: {
                  where: { ngayHieuLucTu: { lte: now }, OR: [{ ngayHieuLucDen: null }, { ngayHieuLucDen: { gt: now } }] },
                  take: 1, select: { ten: true },
                },
              } } } },
            },
          },
        },
      }),
      this.prisma.taiKhoanNguoiDung.groupBy({ by: ['trangThai'], where: scopeWhere, _count: { _all: true } }),
      this.prisma.taiKhoanNguoiDung.count({ where: { ...scopeWhere, hoSoDangVien: { is: null } } }),
      this.prisma.taiKhoanNguoiDung.count({ where: scopeWhere }),
      this.prisma.taiKhoanNguoiDung.count({ where: { ...scopeWhere, phanCongVaiTroDuocGan: { some: activeAssignmentFilter(now) } } }),
      this.prisma.phanCongVaiTro.count({ where: { ...(ids ? { maTaiKhoan: { in: ids } } : {}), ...activeAssignmentFilter(now), ngayHieuLucDen: { gt: now, lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) } } }),
      this.prisma.lichSuDonViDangVien.findMany({
        where: { ...nowFilter(now), hoSoDangVien: { is: { maTaiKhoan: ids ? { in: ids } : { not: null } } } },
        distinct: ['maChiBo'],
        select: { maChiBo: true, chiBo: { select: { ma: true, maDinhDanh: true, tenDonVi: { where: { ngayHieuLucTu: { lte: now }, OR: [{ ngayHieuLucDen: null }, { ngayHieuLucDen: { gt: now } }] }, take: 1, select: { ten: true } } } } },
        orderBy: { maChiBo: 'asc' },
      }),
    ])
    const counts = new Map(statusCounts.map(({ trangThai, _count }) => [trangThai, _count._all]))
    const profileIds = accounts.flatMap((row) => row.hoSoDangVien ? [row.hoSoDangVien.ma] : [])
    const cccdPermission = await Promise.all(profileIds.map(async (id) => await this.coQuyen(actor, 'HO_SO_CA_NHAN_XEM', id) ? id : null))
    const visibleProfileIds = cccdPermission.filter((id): id is string => id !== null)
    const cccdRows = visibleProfileIds.length
      ? await this.prisma.thongTinCaNhanDangVien.findMany({ where: { maHoSo: { in: visibleProfileIds } }, select: { maHoSo: true, soCccd: true } })
      : []
    const cccdByProfile = new Map(cccdRows.map(({ maHoSo, soCccd }) => [maHoSo, soCccd]))
    return {
      duLieu: accounts.map((row) => ({
        maTaiKhoan: row.ma, tenDangNhap: row.tenDangNhap, email: row.email, trangThai: row.trangThai, ngayTao: row.ngayTao, ngayCapNhat: row.ngayCapNhat, khoaDen: row.khoaDen, doiMatKhauLanDau: row.doiMatKhauLanDau,
        hoSoDangVien: row.hoSoDangVien ? { ma: row.hoSoDangVien.ma, maHoSoNoiBo: row.hoSoDangVien.maHoSoNoiBo, hoVaTen: row.hoSoDangVien.hoVaTen, trangThai: row.hoSoDangVien.trangThai, cccd: cccdByProfile.get(row.hoSoDangVien.ma) ?? null, chiBoHienTai: row.hoSoDangVien.lichSuDonVi[0]?.chiBo.tenDonVi[0]?.ten ?? row.hoSoDangVien.lichSuDonVi[0]?.chiBo.maDinhDanh ?? null, maChiBoHienTai: row.hoSoDangVien.lichSuDonVi[0]?.chiBo.ma ?? null } : null,
        hoVaTen: row.hoSoDangVien?.hoVaTen ?? null,
        chiBoHienTai: row.hoSoDangVien?.lichSuDonVi[0]?.chiBo.tenDonVi[0]?.ten ?? row.hoSoDangVien?.lichSuDonVi[0]?.chiBo.maDinhDanh ?? null,
        maChiBoHienTai: row.hoSoDangVien?.lichSuDonVi[0]?.chiBo.ma ?? null,
        vaiTroDangPhanCong: row.phanCongVaiTroDuocGan.map(({ vaiTro }) => vaiTro.ten),
        phamViPhanCong: row.phanCongVaiTroDuocGan.map((assignment) => ({ maPhanCong: assignment.ma, maVaiTro: assignment.maVaiTro, maDinhDanhVaiTro: assignment.vaiTro.maDinhDanh, tenVaiTro: assignment.vaiTro.ten, loaiPhamVi: assignment.loaiPhamVi, maDonViGoc: assignment.maDonViGoc, tenDonViGoc: assignment.donViGoc?.tenDonVi[0]?.ten ?? assignment.donViGoc?.maDinhDanh ?? null, ngayHieuLucTu: assignment.ngayHieuLucTu, ngayHieuLucDen: assignment.ngayHieuLucDen, danhSachMaDonVi: assignment.phamViDonViChiDinh.map((item) => item.donVi.ma), donViChiDinh: assignment.phamViDonViChiDinh.map((item) => item.donVi.tenDonVi[0]?.ten ?? item.donVi.maDinhDanh ?? item.donVi.ma) })),
        soPhanCongHieuLuc: row.phanCongVaiTroDuocGan.length,
        dangNhapCuoiLuc: row.dangNhapCuoiLuc,
      })),
      phanTrang: { trang, gioiHan, tongSo: total },
      thongKe: {
        tongTaiKhoan: [...counts.values()].reduce((sum, value) => sum + value, 0),
        dangHoatDong: counts.get('DANG_HOAT_DONG') ?? 0,
        khoaHoacVoHieuHoa: (counts.get('TAM_KHOA') ?? 0) + (counts.get('NGUNG_HOAT_DONG') ?? 0),
        chuaLienKetHoSo: unlinked,
      },
      thongKePhanQuyen: { tongTaiKhoan: totalInScope, daPhanQuyen: assignedInScope, chuaPhanQuyen: Math.max(0, totalInScope - assignedInScope), sapHetHan: expiringAssignments },
      danhMucChiBo: branchRows.map(({ maChiBo, chiBo }) => ({ ma: maChiBo, ten: chiBo.tenDonVi[0]?.ten ?? chiBo.maDinhDanh })),
    }
  }

  async chiTiet(actor: TaiKhoanDaXacThuc, maTaiKhoan: string) {
    await this.kiemTraTaiKhoanTrongPhamVi(actor, maTaiKhoan)
    const account = await this.prisma.taiKhoanNguoiDung.findUnique({
      where: { ma: maTaiKhoan },
      select: { ma: true, tenDangNhap: true, email: true, trangThai: true, dangNhapCuoiLuc: true, doiMatKhauLanDau: true, ngayTao: true, ngayCapNhat: true, khoaDen: true,
        hoSoDangVien: { select: { ma: true } } },
    })
    if (!account) throw this.notFound()
    let hoSoDangVien: Record<string, unknown> | null = null
    if (account.hoSoDangVien && await this.coQuyen(actor, 'HO_SO_DANG_VIEN_XEM_TONG_QUAN', account.hoSoDangVien.ma)) {
      const now = new Date()
      const caNhanDuocXem = await this.coQuyen(actor, 'HO_SO_CA_NHAN_XEM', account.hoSoDangVien.ma)
      const profile = await this.prisma.hoSoDangVien.findUnique({ where: { ma: account.hoSoDangVien.ma }, select: {
        ma: true, maHoSoNoiBo: true, hoVaTen: true, trangThai: true,
        thongTinCaNhan: caNhanDuocXem ? { select: { ngaySinh: true, soCccd: true } } : false,
        lichSuDonVi: { where: nowFilter(now), take: 1, select: {
          maChiBo: true, maTo: true,
          chiBo: { select: { maDinhDanh: true, tenDonVi: { where: nowFilter(now), take: 1, select: { ten: true } } } },
          to: { select: { maDinhDanh: true, tenDonVi: { where: nowFilter(now), take: 1, select: { ten: true } } } },
        } },
      } })
      if (profile) {
        const currentUnit = profile.lichSuDonVi[0]
        hoSoDangVien = {
          ma: profile.ma, maHoSoNoiBo: profile.maHoSoNoiBo, hoVaTen: profile.hoVaTen, trangThai: profile.trangThai,
          ngaySinh: profile.thongTinCaNhan?.ngaySinh ?? null, cccd: profile.thongTinCaNhan?.soCccd ?? null,
          chiBoHienTai: currentUnit?.chiBo.tenDonVi[0]?.ten ?? currentUnit?.chiBo.maDinhDanh ?? null,
          maChiBoHienTai: currentUnit?.maChiBo ?? null,
          toHienTai: currentUnit?.to ? currentUnit.to.tenDonVi[0]?.ten ?? currentUnit.to.maDinhDanh : null,
        }
      }
    }
    let phienDangNhap: { ngayTao: Date; hetHanLuc: Date; diaChiIp: string | null }[] = []
    try {
      await this.phanQuyen.kiemTraQuanTriVienToanHeThong(actor.maTaiKhoan, actor.maPhien)
      await this.phanQuyen.kiemTra(actor.maTaiKhoan, 'NHAT_KY_BAO_MAT_XEM', {}, actor.maPhien)
      phienDangNhap = await this.prisma.phienDangNhap.findMany({ where: { maTaiKhoan, thuHoiLuc: null, hetHanLuc: { gt: new Date() } }, orderBy: { ngayTao: 'desc' }, take: 20, select: { ngayTao: true, hetHanLuc: true, diaChiIp: true } })
    } catch (error) { if (!(error instanceof ForbiddenException)) throw error }
    return { ...account, maTaiKhoan: account.ma, daLienKetHoSo: Boolean(account.hoSoDangVien), hoSoDangVien, phienDangNhap }
  }

  async taoMauNhap(actor: TaiKhoanDaXacThuc, mode: 'LIEN_KET_HO_SO' | 'DOC_LAP') {
    await this.phanQuyen.kiemTraQuyenDuocPhanCong(actor.maTaiKhoan, 'TAI_KHOAN_TAO', actor.maPhien)
    const workbook = this.transfer.createWorkbook()
    const sheet = workbook.addWorksheet('Tài khoản')
    const headers = [...(mode === 'LIEN_KET_HO_SO' ? ['Mã hồ sơ nội bộ'] : []), 'Tên đăng nhập', 'Email đăng nhập', 'Mật khẩu khởi tạo', 'Trạng thái ban đầu']
    sheet.addRow(headers)
    sheet.getRow(1).font = { bold: true }
    sheet.views = [{ state: 'frozen', ySplit: 1 }]
    sheet.columns = headers.map((header) => ({ header, key: header, width: header.includes('Mật khẩu') ? 24 : 28, style: { numFmt: '@' } }))
    sheet.addRow(headers.map(() => null))
    if (headers.includes('Trạng thái ban đầu')) {
      const column = headers.indexOf('Trạng thái ban đầu') + 1
      for (let row = 2; row <= 201; row++) sheet.getCell(row, column).dataValidation = { type: 'list', allowBlank: true, formulae: ['"DANG_HOAT_DONG,TAM_KHOA,NGUNG_HOAT_DONG"'] }
    }
    const guide = workbook.addWorksheet('Hướng dẫn nhập')
    guide.addRows([
      ['Trường', 'Bắt buộc', 'Định dạng / giá trị hợp lệ', 'Ví dụ'],
      ...(mode === 'LIEN_KET_HO_SO' ? [['Mã hồ sơ nội bộ', 'Có', 'Mã hồ sơ đã tồn tại, chưa liên kết và thuộc phạm vi được cấp', 'DV0001']] : []),
      ['Tên đăng nhập', 'Có', '3–100 ký tự; không trùng hệ thống hoặc trong tệp', 'canbo.ptit'],
      ['Email đăng nhập', 'Không', 'Email hợp lệ; duy nhất nếu có nhập', 'canbo@example.edu.vn'],
      ['Mật khẩu khởi tạo', 'Có', '12–128 ký tự; không được ghi vào báo cáo lỗi', 'Nhập mật khẩu do quản trị viên thiết lập'],
      ['Trạng thái ban đầu', 'Không', 'DANG_HOAT_DONG, TAM_KHOA, NGUNG_HOAT_DONG; mặc định DANG_HOAT_DONG', 'DANG_HOAT_DONG'],
      ['Lưu ý bảo mật', '', 'Không chia sẻ tệp có mật khẩu; xóa tệp sau khi nhập xong.', ''],
    ])
    guide.getRow(1).font = { bold: true }
    guide.columns = [{ width: 28 }, { width: 14 }, { width: 76 }, { width: 36 }]
    return this.transfer.write(workbook)
  }

  async kiemTraNhap(actor: TaiKhoanDaXacThuc, file: { buffer: Buffer; originalname: string; size: number } | undefined, mode: 'LIEN_KET_HO_SO' | 'DOC_LAP') {
    for (const [key, session] of this.importSessions) if (session.expiresAt < Date.now()) this.importSessions.delete(key)
    await this.phanQuyen.kiemTraQuyenDuocPhanCong(actor.maTaiKhoan, 'TAI_KHOAN_TAO', actor.maPhien)
    if (!file || file.size > 5 * 1024 * 1024 || !file.originalname.toLocaleLowerCase('vi-VN').endsWith('.xlsx')) throw new BadRequestException({ maLoi: 'TEP_KHONG_HOP_LE', thongBao: 'Chọn tệp .xlsx hợp lệ, tối đa 5 MB.' })
    const workbook = await this.transfer.read(file.buffer)
    const sheet = workbook.getWorksheet('Tài khoản')
    if (!sheet) throw new BadRequestException({ maLoi: 'SAI_MAU_EXCEL', thongBao: 'Thiếu sheet “Tài khoản”. Hãy sử dụng đúng tệp Excel mẫu.' })
    const headers = [...(mode === 'LIEN_KET_HO_SO' ? ['Mã hồ sơ nội bộ'] : []), 'Tên đăng nhập', 'Email đăng nhập', 'Mật khẩu khởi tạo', 'Trạng thái ban đầu']
    const actual = headers.map((_, index) => String(this.transfer.readCell(sheet.getRow(1).getCell(index + 1)).value ?? '').trim())
    if (actual.length !== headers.length || headers.some((header, index) => actual[index] !== header)) throw new BadRequestException({ maLoi: 'SAI_MAU_EXCEL', thongBao: 'Tiêu đề cột không khớp mẫu đã chọn.' })
    if (sheet.rowCount < 2 || sheet.rowCount > 202) throw new BadRequestException({ maLoi: 'SO_DONG_KHONG_HOP_LE', thongBao: 'Tệp phải có từ 1 đến 200 dòng tài khoản.' })

    const errors: { row: number; field: string; message: string }[] = []
    const candidates: { row: number; dto: TaoTaiKhoanDto; login: string; email: string | null; trangThaiNhap: string }[] = []
    const clean = (value: string) => value.trim().toLocaleLowerCase('vi-VN')
    const cellText = (row: ExcelJS.Row, index: number, field: string) => {
      const cell = row.getCell(index)
      const read = this.transfer.readCell(cell)
      const message = this.transfer.cellReadError(read, cell)
      if (message) { errors.push({ row: row.number, field, message: message.replace(/^Dòng \d+, cột [A-Z]+: /, '') }); return '' }
      if (read.value === null || read.value === '') return ''
      if (typeof read.value === 'string') return read.value.trim()
      if (typeof read.value === 'number' || typeof read.value === 'boolean') return String(read.value)
      if (read.value instanceof Date) return read.value.toISOString()
      return ''
    }
    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
      const row = sheet.getRow(rowNumber)
      if (headers.every((_, index) => row.getCell(index + 1).value === null || row.getCell(index + 1).value === undefined || row.getCell(index + 1).value === '')) continue
      const offset = mode === 'LIEN_KET_HO_SO' ? 1 : 0
      const profileCode = mode === 'LIEN_KET_HO_SO' ? cellText(row, 1, 'Mã hồ sơ nội bộ') : ''
      const login = cellText(row, offset + 1, 'Tên đăng nhập')
      const emailInput = cellText(row, offset + 2, 'Email đăng nhập')
      const password = cellText(row, offset + 3, 'Mật khẩu khởi tạo')
      const statusRaw = cellText(row, offset + 4, 'Trạng thái ban đầu').toLocaleUpperCase('en-US')
      if (mode === 'LIEN_KET_HO_SO' && !profileCode) errors.push({ row: rowNumber, field: 'Mã hồ sơ nội bộ', message: 'Nhập mã hồ sơ Đảng viên cần liên kết.' })
      if (!login) errors.push({ row: rowNumber, field: 'Tên đăng nhập', message: 'Chưa nhập tên đăng nhập.' })
      if (!password) errors.push({ row: rowNumber, field: 'Mật khẩu khởi tạo', message: 'Chưa nhập mật khẩu khởi tạo.' })
      if (statusRaw && !statusValues.includes(statusRaw as typeof statusValues[number])) errors.push({ row: rowNumber, field: 'Trạng thái ban đầu', message: 'Trạng thái không hợp lệ. Chọn DANG_HOAT_DONG, TAM_KHOA hoặc NGUNG_HOAT_DONG.' })
      const dto = plainToInstance(TaoTaiKhoanDto, { tenDangNhap: login, ...(emailInput ? { email: emailInput } : {}), matKhauBanDau: password, ...(statusRaw ? { trangThai: statusRaw } : {}) })
      const dtoErrors = await validate(dto)
      for (const issue of dtoErrors) {
        const field = issue.property === 'tenDangNhap' ? 'Tên đăng nhập' : issue.property === 'email' ? 'Email đăng nhập' : issue.property === 'matKhauBanDau' ? 'Mật khẩu khởi tạo' : issue.property === 'trangThai' ? 'Trạng thái ban đầu' : issue.property
        if (issue.property === 'email' && !emailInput) continue
        if (errors.some((error) => error.row === rowNumber && error.field === field)) continue
        errors.push({ row: rowNumber, field, message: issue.property === 'tenDangNhap' ? 'Tên đăng nhập phải có từ 3 đến 100 ký tự.' : issue.property === 'email' ? 'Email đăng nhập không đúng định dạng.' : 'Mật khẩu khởi tạo phải có từ 12 đến 128 ký tự.' })
      }
      if (dto.trangThai && dto.trangThai !== 'DANG_HOAT_DONG') {
        try { await this.phanQuyen.kiemTraQuyenDuocPhanCong(actor.maTaiKhoan, 'TAI_KHOAN_KHOA_MO_KHOA', actor.maPhien) }
        catch (error) { if (error instanceof ForbiddenException) errors.push({ row: rowNumber, field: 'Trạng thái ban đầu', message: 'Bạn không có quyền tạo tài khoản ở trạng thái bị khóa hoặc ngừng hoạt động.' }); else throw error }
      }
      candidates.push({ row: rowNumber, dto: { ...dto, ...(mode === 'LIEN_KET_HO_SO' ? { maHoSoNoiBo: profileCode } : {}) } as TaoTaiKhoanDto & { maHoSoNoiBo?: string }, login, email: emailInput || null, trangThaiNhap: statusRaw })
    }
    const fileErrors = !candidates.length && !errors.length
      ? [{ field: 'Tệp', message: 'Tệp chưa có dòng tài khoản.' }]
      : []

    const loginRows = new Map<string, number[]>(), emailRows = new Map<string, number[]>()
    const existingRows = new Set<number>()
    for (const candidate of candidates) {
      const key = clean(candidate.login); if (key) loginRows.set(key, [...(loginRows.get(key) ?? []), candidate.row])
      const email = candidate.email ? clean(candidate.email) : ''; if (email) emailRows.set(email, [...(emailRows.get(email) ?? []), candidate.row])
    }
    for (const [value, rows] of loginRows) if (rows.length > 1) for (const row of rows) errors.push({ row, field: 'Tên đăng nhập', message: 'Tên đăng nhập bị trùng trong tệp.' })
    for (const [, rows] of emailRows) if (rows.length > 1) for (const row of rows) errors.push({ row, field: 'Email đăng nhập', message: 'Email bị trùng trong tệp.' })
    const [existingLogins, existingEmails] = await Promise.all([
      this.prisma.taiKhoanNguoiDung.findMany({ where: { tenDangNhap: { in: [...loginRows.keys()] } }, select: { tenDangNhap: true } }),
      this.prisma.taiKhoanNguoiDung.findMany({ where: { email: { in: [...emailRows.keys()] } }, select: { email: true } }),
    ])
    for (const account of existingLogins) for (const row of loginRows.get(clean(account.tenDangNhap)) ?? []) { errors.push({ row, field: 'Tên đăng nhập', message: 'Tên đăng nhập đã tồn tại trong hệ thống.' }); existingRows.add(row) }
    for (const account of existingEmails) if (account.email) for (const row of emailRows.get(clean(account.email)) ?? []) { errors.push({ row, field: 'Email đăng nhập', message: 'Email đã tồn tại trong hệ thống.' }); existingRows.add(row) }

    const profilesByCode = new Map<string, string>()
    if (mode === 'LIEN_KET_HO_SO') {
      const codes = [...new Set(candidates.map((item) => (item.dto as TaoTaiKhoanDto & { maHoSoNoiBo?: string }).maHoSoNoiBo).filter((item): item is string => Boolean(item)))]
      const codeRows = new Map<string, number[]>()
      for (const candidate of candidates) {
        const code = (candidate.dto as TaoTaiKhoanDto & { maHoSoNoiBo?: string }).maHoSoNoiBo
        if (code) codeRows.set(code, [...(codeRows.get(code) ?? []), candidate.row])
      }
      for (const rows of codeRows.values()) if (rows.length > 1) for (const row of rows) errors.push({ row, field: 'Mã hồ sơ nội bộ', message: 'Mã hồ sơ bị lặp trong tệp; mỗi hồ sơ chỉ được liên kết với một tài khoản.' })
      const profiles = await this.prisma.hoSoDangVien.findMany({ where: { maHoSoNoiBo: { in: codes } }, select: { ma: true, maHoSoNoiBo: true, maTaiKhoan: true } })
      for (const profile of profiles) profilesByCode.set(profile.maHoSoNoiBo, profile.ma)
      for (const candidate of candidates) {
        const code = (candidate.dto as TaoTaiKhoanDto & { maHoSoNoiBo?: string }).maHoSoNoiBo ?? ''
        const profileId = profilesByCode.get(code)
        if (!profileId) errors.push({ row: candidate.row, field: 'Mã hồ sơ nội bộ', message: 'Không tìm thấy hồ sơ Đảng viên tương ứng.' })
        else {
          const profile = profiles.find(({ ma }) => ma === profileId)
          if (profile?.maTaiKhoan) { errors.push({ row: candidate.row, field: 'Mã hồ sơ nội bộ', message: 'Hồ sơ Đảng viên này đã được liên kết với tài khoản khác.' }); existingRows.add(candidate.row) }
          else try { await this.phanQuyen.kiemTra(actor.maTaiKhoan, 'TAI_KHOAN_LIEN_KET_HO_SO', { maHoSo: profileId }, actor.maPhien) }
            catch (error) { if (error instanceof ForbiddenException) errors.push({ row: candidate.row, field: 'Mã hồ sơ nội bộ', message: 'Bạn không có quyền liên kết tài khoản với hồ sơ này.' }); else throw error }
        }
      }
    }
    const loiTheoDong = new Map<number, typeof errors>()
    for (const error of errors) loiTheoDong.set(error.row, [...(loiTheoDong.get(error.row) ?? []), error])
    const duLieuXemTruoc = candidates.map(({ row, login, email, dto, trangThaiNhap }) => {
      const loi = loiTheoDong.get(row) ?? []
      return {
        dong: row,
        maHoSoNoiBo: (dto as TaoTaiKhoanDto & { maHoSoNoiBo?: string }).maHoSoNoiBo ?? null,
        tenDangNhap: login,
        email,
        trangThai: dto.trangThai ?? (trangThaiNhap || 'DANG_HOAT_DONG'),
        lienKetHoSo: mode === 'LIEN_KET_HO_SO',
        hopLe: loi.length === 0,
        daTonTai: existingRows.has(row),
        trangThaiTonTai: existingRows.has(row) ? 'DA_TON_TAI' as const : 'CHUA_TON_TAI' as const,
        trangThaiKiemTra: loi.length === 0 ? 'HOP_LE' as const : 'CO_LOI' as const,
        loi,
      }
    })
    const soDongCoLoi = duLieuXemTruoc.filter((row) => row.trangThaiKiemTra === 'CO_LOI').length
    if (errors.length || fileErrors.length) return {
      maPhienNhap: null,
      hetHanSauGiay: 0,
      tongSo: candidates.length,
      hopLe: candidates.length - soDongCoLoi,
      coLoi: soDongCoLoi,
      soDaTonTai: existingRows.size,
      soDongChuaKiemTra: 0,
      soTaiKhoanLienKet: mode === 'LIEN_KET_HO_SO' ? candidates.length : 0,
      soTaiKhoanDocLap: mode === 'DOC_LAP' ? candidates.length : 0,
      loi: errors,
      loiTep: fileErrors,
      duLieu: duLieuXemTruoc,
    }

    const rows: { row: number; dto: Omit<TaoTaiKhoanDto, 'matKhauBanDau'>; passwordHash: string; login: string; email: string | null }[] = []
    for (let start = 0; start < candidates.length; start += 4) {
      const batch = await Promise.all(candidates.slice(start, start + 4).map(async ({ row, dto, login, email }) => {
        const { matKhauBanDau, ...safeDto } = dto
        return { row, dto: { ...safeDto, ...(mode === 'LIEN_KET_HO_SO' ? { maHoSo: profilesByCode.get((dto as TaoTaiKhoanDto & { maHoSoNoiBo?: string }).maHoSoNoiBo ?? '') } : {}) }, passwordHash: await this.bamMatKhau.tao(matKhauBanDau), login, email }
      }))
      rows.push(...batch)
    }
    const id = randomUUID()
    this.importSessions.set(id, { actor: actor.maTaiKhoan, expiresAt: Date.now() + 10 * 60_000, mode, rows })
    return { maPhienNhap: id, hetHanSauGiay: 600, tongSo: rows.length, hopLe: rows.length, coLoi: 0, soDaTonTai: 0, soDongChuaKiemTra: 0, soTaiKhoanLienKet: mode === 'LIEN_KET_HO_SO' ? rows.length : 0, soTaiKhoanDocLap: mode === 'DOC_LAP' ? rows.length : 0, loi: [], loiTep: [], duLieu: rows.map(({ row, login, email, dto }) => ({ dong: row, tenDangNhap: login, email, trangThai: dto.trangThai ?? 'DANG_HOAT_DONG', lienKetHoSo: mode === 'LIEN_KET_HO_SO', hopLe: true, daTonTai: false, trangThaiTonTai: 'CHUA_TON_TAI' as const, trangThaiKiemTra: 'HOP_LE' as const, loi: [] })) }
  }

  async xacNhanNhap(actor: TaiKhoanDaXacThuc, sessionId: string, ip: string | null) {
    const session = this.importSessions.get(sessionId)
    if (!session || session.actor !== actor.maTaiKhoan || session.expiresAt < Date.now()) throw new BadRequestException({ maLoi: 'PHIEN_NHAP_HET_HAN', thongBao: 'Phiên kiểm tra đã hết hạn. Vui lòng tải và kiểm tra lại tệp.' })
    if (this.importsInProgress.has(sessionId)) throw new ConflictException({ maLoi: 'PHIEN_NHAP_DANG_XU_LY', thongBao: 'Phiên nhập này đang được xử lý. Vui lòng chờ kết quả.' })
    this.importsInProgress.add(sessionId)
    try {
      await this.phanQuyen.kiemTraQuyenDuocPhanCong(actor.maTaiKhoan, 'TAI_KHOAN_TAO', actor.maPhien)
      if (session.rows.some(({ dto }) => dto.trangThai && dto.trangThai !== 'DANG_HOAT_DONG')) await this.phanQuyen.kiemTraQuyenDuocPhanCong(actor.maTaiKhoan, 'TAI_KHOAN_KHOA_MO_KHOA', actor.maPhien)
      const logins = session.rows.map(({ login }) => login.toLocaleLowerCase('vi-VN'))
      const emails = session.rows.flatMap(({ email }) => email ? [email.toLocaleLowerCase('vi-VN')] : [])
      if (await this.prisma.taiKhoanNguoiDung.count({ where: { OR: [{ tenDangNhap: { in: logins } }, ...(emails.length ? [{ email: { in: emails } }] : [])] } })) throw new ConflictException({ maLoi: 'DU_LIEU_NHAP_DA_THAY_DOI', thongBao: 'Tên đăng nhập hoặc email đã được sử dụng sau bước kiểm tra. Hãy tải và kiểm tra lại tệp.' })
      if (session.mode === 'LIEN_KET_HO_SO') {
        for (const row of session.rows) if (row.dto.maHoSo) {
          await this.phanQuyen.kiemTra(actor.maTaiKhoan, 'TAI_KHOAN_LIEN_KET_HO_SO', { maHoSo: row.dto.maHoSo }, actor.maPhien)
          await this.kiemTraHoSoChuaLienKet(row.dto.maHoSo)
        }
      }
      const created = await this.prisma.$transaction(async (tx) => {
        const result: { ma: string; tenDangNhap: string; email: string | null; trangThai: string; lienKetHoSo: boolean; dong: number }[] = []
        for (const row of session.rows) {
          const account = await tx.taiKhoanNguoiDung.create({ data: { tenDangNhap: row.dto.tenDangNhap.trim(), email: row.dto.email?.trim() || null, matKhauBam: row.passwordHash, trangThai: row.dto.trangThai ?? 'DANG_HOAT_DONG', doiMatKhauLanDau: false, ...(row.dto.maHoSo ? { hoSoDangVien: { connect: { ma: row.dto.maHoSo } } } : {}) }, select: { ma: true, tenDangNhap: true, email: true, trangThai: true } })
          await this.audit(tx, actor, account.ma, 'TAI_KHOAN_TAO', ip, undefined, { tenDangNhap: account.tenDangNhap, emailDaThietLap: Boolean(account.email), nhapHangLoat: true, lienKetHoSo: Boolean(row.dto.maHoSo) })
          result.push({ ...account, lienKetHoSo: Boolean(row.dto.maHoSo), dong: row.row })
        }
        return result
      })
      this.importSessions.delete(sessionId)
      return { tongSo: created.length, soTaiKhoanLienKet: created.filter((item) => item.lienKetHoSo).length, soTaiKhoanDocLap: created.filter((item) => !item.lienKetHoSo).length, duLieu: created.map((item) => ({ dong: item.dong, tenDangNhap: item.tenDangNhap, email: item.email, trangThai: item.trangThai, lienKetHoSo: item.lienKetHoSo, hopLe: true, daTonTai: true, trangThaiTonTai: 'DA_TON_TAI' as const, trangThaiKiemTra: 'HOP_LE' as const, loi: [] })) }
    } catch (error) { this.mapError(error) }
    finally { this.importsInProgress.delete(sessionId) }
  }

  async taoBaoCaoLoiNhap(actor: TaiKhoanDaXacThuc, errors: { row: number; field: string; message: string }[] = []) {
    await this.phanQuyen.kiemTraQuyenDuocPhanCong(actor.maTaiKhoan, 'TAI_KHOAN_TAO', actor.maPhien)
    if (!Array.isArray(errors) || errors.length > 1000) throw new BadRequestException({ maLoi: 'BAO_CAO_KHONG_HOP_LE', thongBao: 'Danh sách lỗi không hợp lệ.' })
    const workbook = this.transfer.createWorkbook(), sheet = workbook.addWorksheet('Lỗi nhập tài khoản')
    sheet.addRow(['Dòng Excel', 'Trường', 'Chi tiết lỗi'])
    const safe = (value: unknown) => String(value ?? '').slice(0, 500).replace(/^[=+\-@]/, '’$&')
    for (const error of errors) sheet.addRow([Number.isInteger(error.row) ? error.row : '', safe(error.field).slice(0, 150), safe(error.message)])
    return this.transfer.write(workbook)
  }

  async tao(actor: TaiKhoanDaXacThuc, dto: TaoTaiKhoanDto, ip: string | null) {
    await this.phanQuyen.kiemTra(actor.maTaiKhoan, 'TAI_KHOAN_TAO', {}, actor.maPhien)
    if (dto.trangThai && dto.trangThai !== 'DANG_HOAT_DONG') await this.phanQuyen.kiemTra(actor.maTaiKhoan, 'TAI_KHOAN_KHOA_MO_KHOA', {}, actor.maPhien)
    if (dto.maHoSo) {
      await this.phanQuyen.kiemTra(actor.maTaiKhoan, 'TAI_KHOAN_LIEN_KET_HO_SO', { maHoSo: dto.maHoSo }, actor.maPhien)
      await this.kiemTraHoSoChuaLienKet(dto.maHoSo)
    }
    const passwordHash = await this.bamMatKhau.tao(dto.matKhauBanDau)
    try {
      return await this.prisma.$transaction(async (tx) => {
        const created = await tx.taiKhoanNguoiDung.create({ data: {
          tenDangNhap: dto.tenDangNhap.trim(), email: dto.email?.trim() || null, matKhauBam: passwordHash,
        trangThai: dto.trangThai ?? 'DANG_HOAT_DONG', doiMatKhauLanDau: false,
          ...(dto.maHoSo ? { hoSoDangVien: { connect: { ma: dto.maHoSo } } } : {}),
        }, select: { ma: true, tenDangNhap: true, email: true, trangThai: true } })
        await this.audit(tx, actor, created.ma, 'TAI_KHOAN_TAO', ip, undefined, { tenDangNhap: created.tenDangNhap, emailDaThietLap: Boolean(created.email) })
        return { ...created, maTaiKhoan: created.ma }
      })
    } catch (error) { this.mapError(error) }
  }

  async sua(actor: TaiKhoanDaXacThuc, maTaiKhoan: string, dto: SuaTaiKhoanDto, ip: string | null) {
    await this.phanQuyen.kiemTra(actor.maTaiKhoan, 'TAI_KHOAN_SUA_THONG_TIN', {}, actor.maPhien)
    if (dto.trangThai !== undefined) await this.phanQuyen.kiemTra(actor.maTaiKhoan, 'TAI_KHOAN_KHOA_MO_KHOA', {}, actor.maPhien)
    await this.kiemTraTaiKhoanTrongPhamVi(actor, maTaiKhoan)
    const before = await this.prisma.taiKhoanNguoiDung.findUnique({ where: { ma: maTaiKhoan }, select: { ma: true, tenDangNhap: true, email: true, doiMatKhauLanDau: true, trangThai: true } })
    if (!before) throw this.notFound()
    const matKhauBam = dto.matKhauMoi ? await this.bamMatKhau.tao(dto.matKhauMoi) : undefined
    try {
      return await this.prisma.$transaction(async (tx) => {
        if (before.trangThai === 'DANG_HOAT_DONG' && dto.trangThai !== undefined && dto.trangThai !== 'DANG_HOAT_DONG') {
          await khoaKiemTraQuanTriVienCuoi(tx)
          const isSystemAdmin = await tx.phanCongVaiTro.count({ where: { maTaiKhoan, vaiTro: { maDinhDanh: systemAdministratorRoleCode, laVaiTroHeThong: true } } })
          if (isSystemAdmin && await demQuanTriVienToanHeThongHopLe(tx, new Date(), { maTaiKhoan }) === 0) throw new ConflictException({ maLoi: 'KHONG_THE_THU_HOI_QUAN_TRI_VIEN_CUOI_CUNG', thongBao: 'Không thể khóa hoặc vô hiệu hóa Quản trị viên toàn hệ thống hợp lệ cuối cùng.' })
        }
        const updated = await tx.taiKhoanNguoiDung.update({
          where: { ma: maTaiKhoan },
          data: { tenDangNhap: dto.tenDangNhap?.trim(), email: dto.email === undefined ? undefined : dto.email?.trim() || null, trangThai: dto.trangThai, matKhauBam, doiMatKhauLanDau: dto.yeuCauDoiMatKhau ?? (matKhauBam ? false : undefined) },
          select: { ma: true, tenDangNhap: true, email: true, trangThai: true, doiMatKhauLanDau: true },
        })
        if (matKhauBam || (dto.trangThai !== undefined && dto.trangThai !== 'DANG_HOAT_DONG')) await tx.phienDangNhap.updateMany({ where: { maTaiKhoan, thuHoiLuc: null }, data: { thuHoiLuc: new Date(), maPhanCongVaiTroDangHoatDong: null } })
        await this.audit(tx, actor, maTaiKhoan, 'TAI_KHOAN_SUA', ip,
          { tenDangNhap: before.tenDangNhap, emailDaThietLap: Boolean(before.email), doiMatKhauLanDau: before.doiMatKhauLanDau, trangThai: before.trangThai },
          { tenDangNhap: updated.tenDangNhap, emailDaThietLap: Boolean(updated.email), doiMatKhauLanDau: updated.doiMatKhauLanDau, trangThai: updated.trangThai })
        return { ...updated, maTaiKhoan: updated.ma }
      })
    } catch (error) { this.mapError(error) }
  }

  async doiTrangThai(actor: TaiKhoanDaXacThuc, maTaiKhoan: string, dto: DoiTrangThaiTaiKhoanDto, ip: string | null) {
    await this.phanQuyen.kiemTra(actor.maTaiKhoan, 'TAI_KHOAN_KHOA_MO_KHOA', {}, actor.maPhien)
    await this.kiemTraTaiKhoanTrongPhamVi(actor, maTaiKhoan)
    const before = await this.prisma.taiKhoanNguoiDung.findUnique({ where: { ma: maTaiKhoan }, select: { ma: true, trangThai: true } })
    if (!before) throw this.notFound()
    if (!(statusValues as readonly string[]).includes(dto.trangThai)) throw new ConflictException({ maLoi: 'TRANG_THAI_TAI_KHOAN_KHONG_HOP_LE', thongBao: 'Trạng thái tài khoản không hợp lệ.' })
    if (before.trangThai === dto.trangThai) return before
    return this.prisma.$transaction(async (tx) => {
      if (before.trangThai === 'DANG_HOAT_DONG' && dto.trangThai !== 'DANG_HOAT_DONG') {
        await khoaKiemTraQuanTriVienCuoi(tx)
        const isSystemAdmin = await tx.phanCongVaiTro.count({ where: { maTaiKhoan, vaiTro: { maDinhDanh: systemAdministratorRoleCode, laVaiTroHeThong: true } } })
        if (isSystemAdmin && await demQuanTriVienToanHeThongHopLe(tx, new Date(), { maTaiKhoan }) === 0) {
          throw new ConflictException({ maLoi: 'KHONG_THE_THU_HOI_QUAN_TRI_VIEN_CUOI_CUNG', thongBao: 'Không thể khóa hoặc vô hiệu hóa Quản trị viên toàn hệ thống hợp lệ cuối cùng.' })
        }
      }
      const updated = await tx.taiKhoanNguoiDung.update({ where: { ma: maTaiKhoan }, data: { trangThai: dto.trangThai }, select: { ma: true, trangThai: true } })
      if (dto.trangThai !== 'DANG_HOAT_DONG') await tx.phienDangNhap.updateMany({ where: { maTaiKhoan, thuHoiLuc: null }, data: { thuHoiLuc: new Date(), maPhanCongVaiTroDangHoatDong: null } })
      await this.audit(tx, actor, maTaiKhoan, 'TAI_KHOAN_DOI_TRANG_THAI', ip, { trangThai: before.trangThai }, { trangThai: updated.trangThai, lyDo: dto.lyDo ?? null })
      return { ...updated, maTaiKhoan: updated.ma }
    })
  }

  async xoa(actor: TaiKhoanDaXacThuc, maTaiKhoan: string, ip: string | null) {
    if (actor.maTaiKhoan === maTaiKhoan) throw new ConflictException({ maLoi: 'KHONG_THE_TU_XOA_TAI_KHOAN', thongBao: 'Không thể xóa tài khoản đang đăng nhập bằng luồng quản trị thông thường.' })
    await this.phanQuyen.kiemTra(actor.maTaiKhoan, 'TAI_KHOAN_XOA', {}, actor.maPhien)
    await this.kiemTraTaiKhoanTrongPhamVi(actor, maTaiKhoan)
    return this.prisma.$transaction(async (tx) => {
      await khoaKiemTraQuanTriVienCuoi(tx)
      const target = await tx.taiKhoanNguoiDung.findUnique({ where: { ma: maTaiKhoan }, select: { ma: true, tenDangNhap: true, trangThai: true } })
      if (!target) throw this.notFound()
      const isSystemAdmin = await tx.phanCongVaiTro.count({ where: { maTaiKhoan, vaiTro: { maDinhDanh: systemAdministratorRoleCode, laVaiTroHeThong: true } } })
      if (isSystemAdmin && await demQuanTriVienToanHeThongHopLe(tx, new Date(), { maTaiKhoan }) === 0) {
        throw new ConflictException({ maLoi: 'KHONG_THE_THU_HOI_QUAN_TRI_VIEN_CUOI_CUNG', thongBao: 'Không thể xóa Quản trị viên toàn hệ thống hợp lệ cuối cùng.' })
      }
      const deps = await Promise.all([
        tx.hoSoDangVien.count({ where: { maTaiKhoan } }),
        tx.phienDangNhap.count({ where: { maTaiKhoan } }),
        tx.phanCongVaiTro.count({ where: { OR: [{ maTaiKhoan }, { maNguoiCap: maTaiKhoan }, { maNguoiThuHoi: maTaiKhoan }] } }),
        tx.lichSuTenDonVi.count({ where: { maNguoiGhiNhan: maTaiKhoan } }),
        tx.lichSuQuanHeDonVi.count({ where: { maNguoiGhiNhan: maTaiKhoan } }),
        tx.quaTrinhDangVien.count({ where: { maNguoiGhiNhan: maTaiKhoan } }),
        tx.lichSuDonViDangVien.count({ where: { maNguoiGhiNhan: maTaiKhoan } }),
        tx.phanCongChucVu.count({ where: { maNguoiGhiNhan: maTaiKhoan } }),
        tx.vaiTroQuyen.count({ where: { maNguoiGhiNhan: maTaiKhoan } }),
        tx.nhatKyKiemToan.count({ where: { maNguoiThucHien: maTaiKhoan } }),
      ])
      const labels = ['hồ sơ Đảng viên', 'phiên đăng nhập', 'Assignment/phân công', 'lịch sử tên đơn vị', 'lịch sử quan hệ tổ chức', 'quá trình Đảng', 'lịch sử sinh hoạt', 'phân công chức vụ', 'lịch sử Role–Permission', 'nhật ký do tài khoản thực hiện']
      const retained = deps.flatMap((count, index) => count ? [labels[index]] : [])
      if (retained.length) throw new ConflictException({ maLoi: 'TAI_KHOAN_CON_DU_LIEU_THAM_CHIEU', thongBao: `Không thể xóa vì còn ${retained.join(', ')} cần bảo toàn.` })
      await this.audit(tx, actor, maTaiKhoan, 'TAI_KHOAN_XOA', ip, { tenDangNhap: target.tenDangNhap, trangThai: target.trangThai }, undefined)
      await tx.taiKhoanNguoiDung.delete({ where: { ma: maTaiKhoan } })
      return { daXoa: true, maTaiKhoan }
    })
  }

  async lienKetHoSo(actor: TaiKhoanDaXacThuc, maTaiKhoan: string, dto: LienKetHoSoDto, ip: string | null) {
    await this.phanQuyen.kiemTra(actor.maTaiKhoan, 'TAI_KHOAN_LIEN_KET_HO_SO', {}, actor.maPhien)
    await this.kiemTraTaiKhoanTrongPhamVi(actor, maTaiKhoan)
    const account = await this.prisma.taiKhoanNguoiDung.findUnique({ where: { ma: maTaiKhoan }, include: { hoSoDangVien: true } })
    if (!account) throw this.notFound()
    if (dto.maHoSo) {
      await this.phanQuyen.kiemTra(actor.maTaiKhoan, 'TAI_KHOAN_LIEN_KET_HO_SO', { maHoSo: dto.maHoSo }, actor.maPhien)
      await this.kiemTraHoSoChuaLienKet(dto.maHoSo)
    }
    const previous = account.hoSoDangVien?.ma ?? null
    if (previous === (dto.maHoSo ?? null)) return { maTaiKhoan, maHoSo: previous }
    return this.prisma.$transaction(async (tx) => {
      await tx.hoSoDangVien.updateMany({ where: { maTaiKhoan }, data: { maTaiKhoan: null } })
      if (dto.maHoSo) await tx.hoSoDangVien.update({ where: { ma: dto.maHoSo }, data: { maTaiKhoan } })
      await this.audit(tx, actor, maTaiKhoan, 'TAI_KHOAN_LIEN_KET_HO_SO', ip, { maHoSo: previous }, { maHoSo: dto.maHoSo ?? null })
      return { maTaiKhoan, maHoSo: dto.maHoSo ?? null }
    })
  }

  async hoSoChuaLienKet(actor: TaiKhoanDaXacThuc, query: TimHoSoChuaLienKetDto) {
    const allowed = await this.phanQuyen.layDonViTrongPhamVi(actor.maTaiKhoan, 'TAI_KHOAN_LIEN_KET_HO_SO', actor.maPhien)
    if (!allowed.coQuyen) throw this.forbidden()
    const now = new Date()
    const rows = await this.prisma.hoSoDangVien.findMany({
      where: { maTaiKhoan: null, ...(allowed.toanHeThong ? {} : { lichSuDonVi: { some: { AND: [nowFilter(new Date()), { OR: [{ maChiBo: { in: allowed.maDonVi } }, { maTo: { in: allowed.maDonVi } }] }] } } }), OR: [
        { hoVaTen: { contains: query.tuKhoa, mode: 'insensitive' } },
        { maHoSoNoiBo: { contains: query.tuKhoa, mode: 'insensitive' } },
      ] }, orderBy: { hoVaTen: 'asc' }, take: 20,
      select: {
        ma: true, maHoSoNoiBo: true, hoVaTen: true,
        lichSuDonVi: {
          where: nowFilter(now), take: 1,
          select: { chiBo: { select: {
            ma: true, maDinhDanh: true,
            tenDonVi: { where: { ngayHieuLucTu: { lte: now }, OR: [{ ngayHieuLucDen: null }, { ngayHieuLucDen: { gt: now } }] }, take: 1, select: { ten: true } },
          } } },
        },
      },
    })
    return rows.map(({ lichSuDonVi, ...row }) => ({ ...row, chiBoHienTai: lichSuDonVi[0]?.chiBo.tenDonVi[0]?.ten ?? lichSuDonVi[0]?.chiBo.maDinhDanh ?? null, maChiBoHienTai: lichSuDonVi[0]?.chiBo.ma ?? null }))
  }

  async lichSu(actor: TaiKhoanDaXacThuc, maTaiKhoan: string) {
    await this.phanQuyen.kiemTraQuanTriVienToanHeThong(actor.maTaiKhoan, actor.maPhien)
    await this.kiemTraTaiKhoanTrongPhamVi(actor, maTaiKhoan)
    await this.phanQuyen.kiemTra(actor.maTaiKhoan, 'NHAT_KY_KIEM_TOAN_XEM', {}, actor.maPhien)
    return this.prisma.nhatKyKiemToan.findMany({
      where: { loaiDoiTuong: 'TAI_KHOAN', maDoiTuong: maTaiKhoan },
      orderBy: { thoiDiem: 'desc' }, take: 100,
      select: { hanhDong: true, ketQua: true, lyDo: true, duLieuTruoc: true, duLieuSau: true, thoiDiem: true, maNguoiThucHien: true },
    })
  }

  private async kiemTraHoSoChuaLienKet(maHoSo: string) {
    const profile = await this.prisma.hoSoDangVien.findUnique({ where: { ma: maHoSo }, select: { maTaiKhoan: true } })
    if (!profile) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_HO_SO', thongBao: 'Không tìm thấy hồ sơ Đảng viên.' })
    if (profile.maTaiKhoan) throw new ConflictException({ maLoi: 'HO_SO_DA_LIEN_KET_TAI_KHOAN', thongBao: 'Hồ sơ này đã được liên kết với tài khoản khác.' })
  }

  private async kiemTraTaiKhoanTrongPhamVi(actor: TaiKhoanDaXacThuc, maTaiKhoan: string) {
    const scope = await this.phanQuyen.layDonViTrongPhamVi(actor.maTaiKhoan, 'TAI_KHOAN_XEM', actor.maPhien)
    if (!scope.coQuyen) throw this.forbidden()
    const ids = scope.toanHeThong ? null : await this.layTaiKhoanTrongDonVi(scope.maDonVi)
    if (ids && !ids.includes(maTaiKhoan)) throw this.notFound()
  }

  private async coQuyen(actor: TaiKhoanDaXacThuc, permission: string, maHoSo: string) {
    try { await this.phanQuyen.kiemTra(actor.maTaiKhoan, permission, { maHoSo }, actor.maPhien); return true }
    catch (error) { if (error instanceof ForbiddenException) return false; throw error }
  }

  private async layTaiKhoanTrongDonVi(maDonVi: string[]) {
    if (!maDonVi.length) return []
    const now = new Date()
    const assignments = await this.prisma.phanCongVaiTro.findMany({
      where: { ...activeAssignmentFilter(now), vaiTro: { trangThai: 'DANG_HOAT_DONG' }, loaiPhamVi: { in: ['CAY_DON_VI', 'DON_VI_CHI_DINH'] } },
      select: { maTaiKhoan: true, loaiPhamVi: true, maDonViGoc: true, phamViDonViChiDinh: { select: { maDonVi: true } } },
    })
    const ids = new Set<string>()
    for (const row of assignments) {
      const inside = row.loaiPhamVi === 'CAY_DON_VI'
        ? Boolean(row.maDonViGoc && maDonVi.includes(row.maDonViGoc))
        : row.phamViDonViChiDinh.some(({ maDonVi: id }) => maDonVi.includes(id))
      if (inside) ids.add(row.maTaiKhoan)
    }
    const profiles = await this.prisma.hoSoDangVien.findMany({
      where: { maTaiKhoan: { not: null }, lichSuDonVi: { some: { ...nowFilter(now), OR: [{ maChiBo: { in: maDonVi } }, { maTo: { in: maDonVi } }] } } },
      select: { maTaiKhoan: true },
    })
    for (const { maTaiKhoan } of profiles) if (maTaiKhoan) ids.add(maTaiKhoan)
    return [...ids]
  }

  private async audit(tx: Prisma.TransactionClient, actor: TaiKhoanDaXacThuc, target: string, action: string, ip: string | null, before?: object, after?: object) {
    await tx.nhatKyKiemToan.create({ data: {
      maNguoiThucHien: actor.maTaiKhoan, hanhDong: action, loaiDoiTuong: 'TAI_KHOAN', maDoiTuong: target,
      ketQua: 'THANH_CONG', duLieuTruoc: before as Prisma.InputJsonValue, duLieuSau: after as Prisma.InputJsonValue,
      maTuongQuan: randomUUID(), diaChiIp: ip,
    } })
  }

  private thongKeRong() { return { tongTaiKhoan: 0, dangHoatDong: 0, khoaHoacVoHieuHoa: 0, chuaLienKetHoSo: 0 } }
  private thongKePhanQuyenRong() { return { tongTaiKhoan: 0, daPhanQuyen: 0, chuaPhanQuyen: 0, sapHetHan: 0 } }
  private forbidden() { return new ForbiddenException({ maLoi: 'KHONG_DU_QUYEN', thongBao: 'Không đủ Permission hoặc Scope để quản lý tài khoản.' }) }
  private notFound() { return new NotFoundException({ maLoi: 'KHONG_TIM_THAY_TAI_KHOAN', thongBao: 'Không tìm thấy tài khoản trong phạm vi được phép.' }) }
  private mapError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException({ maLoi: 'TAI_KHOAN_DA_TON_TAI', thongBao: 'Tên đăng nhập hoặc email đã được sử dụng.' })
    throw error
  }
}
