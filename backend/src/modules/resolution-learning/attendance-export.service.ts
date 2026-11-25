import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { Prisma } from '../../infrastructure/database/generated/prisma/client'
import { DichVuPrisma } from '../../infrastructure/database/prisma.service'
import { DataTransferService } from '../data-transfer/data-transfer.service'
import { PhanQuyenService } from '../authorization/authorization.service'
import type { TaiKhoanDaXacThuc } from '../auth/auth.types'
import { ATTENDANCE_EXPORT_FIELDS, ATTENDANCE_EXPORT_PERMISSION, type AttendanceExportField } from './attendance-export.fields'
import type { XuatKetQuaDiemDanhDto } from './attendance-export.dto'

type Access = { coQuyen: boolean; toanHeThong: boolean; maDonVi: string[] }
type RosterRow = {
  maHoSo: string; trangThai: string; maChiBoSnapshot: string; tenChiBoSnapshot: string; maToSnapshot: string | null; tenToSnapshot: string | null
  hoSo: { maHoSoNoiBo: string; hoVaTen: string }
}
type ExportRow = {
  stt: number; maHoSoNoiBo: string | null; hoVaTen: string | null; chiBoSnapshot: string | null; toSnapshot: string | null
  dotHoc: string | null; namHoc: string | null; buoiHoc: string | null; hinhThuc: string | null; thoiGianDuKien: string | null
  diaDiem: string | null; trangThaiBuoi: string; trangThaiRoster: string | null; ketQuaDiemDanh: string | null
  thoiDiemCoMat: string | null; soCccd: string | null; ngaySinh: Date | null
}

const labels: Record<string, string> = {
  NHAP: 'Bản nháp', DA_LEN_LICH: 'Đã lên lịch', DANG_DIEN_RA: 'Đang diễn ra', DA_KET_THUC: 'Đã kết thúc', DA_HUY: 'Đã hủy',
  TRONG_DANH_SACH: 'Trong danh sách', DA_LOAI: 'Đã loại', CO_MAT: 'Có mặt', VANG_CO_PHEP: 'Vắng có phép', VANG_KHONG_PHEP: 'Vắng không phép',
}

@Injectable()
export class XuatKetQuaDiemDanhService {
  constructor(
    @Inject(DichVuPrisma) private readonly prisma: DichVuPrisma,
    @Inject(PhanQuyenService) private readonly permissions: PhanQuyenService,
    @Inject(DataTransferService) private readonly transfer: DataTransferService,
  ) {}

  private async access(actor: TaiKhoanDaXacThuc, permission: string): Promise<Access> {
    if (!actor.maPhien) throw new ForbiddenException({ maLoi: 'PHIEN_DANG_NHAP_KHONG_HOP_LE', thongBao: 'Không xác định được Assignment đang hoạt động.' })
    const access = await this.permissions.layDonViTrongPhamVi(actor.maTaiKhoan, permission, actor.maPhien)
    if (!access.coQuyen) throw new ForbiddenException({ maLoi: 'KHONG_CO_QUYEN_XUAT_BAO_CAO', thongBao: 'Assignment đang hoạt động chưa được cấp quyền xuất báo cáo học tập nghị quyết.' })
    if (!access.toanHeThong && access.maDonVi.length === 0) throw new ForbiddenException({ maLoi: 'SCOPE_KHONG_HO_TRO_XUAT', thongBao: 'Scope hiện tại không cho phép xuất báo cáo quản trị.' })
    return access
  }

  private trongDonVi(access: Access, row: Pick<RosterRow, 'maChiBoSnapshot' | 'maToSnapshot'>) {
    return access.toanHeThong || access.maDonVi.includes(row.maChiBoSnapshot) || Boolean(row.maToSnapshot && access.maDonVi.includes(row.maToSnapshot))
  }

  private whereRosterScope(access: Access): Prisma.DanhSachThamGiaBuoiHocWhereInput {
    return access.toanHeThong ? {} : { OR: [{ maChiBoSnapshot: { in: access.maDonVi } }, { maToSnapshot: { in: access.maDonVi } }] }
  }

  private async fieldAccess(actor: TaiKhoanDaXacThuc) {
    const permissions = [...new Set(ATTENDANCE_EXPORT_FIELDS.map(field => field.permission))]
    if (!actor.maPhien) throw new ForbiddenException({ maLoi: 'PHIEN_DANG_NHAP_KHONG_HOP_LE', thongBao: 'Không xác định được Assignment đang hoạt động.' })
    const values = await Promise.all(permissions.map(async permission => [permission, await this.permissions.layDonViTrongPhamVi(actor.maTaiKhoan, permission, actor.maPhien)] as const))
    return new Map(values)
  }

  private fieldCovers(scopes: Map<string, Access>, permission: string, row: RosterRow) {
    const access = scopes.get(permission)
    return Boolean(access?.coQuyen && (access.toanHeThong || this.trongDonVi(access, row)))
  }

  async cauHinh(actor: TaiKhoanDaXacThuc) {
    const access = await this.access(actor, ATTENDANCE_EXPORT_PERMISSION)
    await this.access(actor, 'HOC_TAP_NGHI_QUYET_DANH_SACH_XEM')
    const fields = await this.fieldAccess(actor)
    return {
      truong: ATTENDANCE_EXPORT_FIELDS.filter(field => {
        const fieldScope = fields.get(field.permission)
        return fieldScope?.coQuyen && Boolean(fieldScope.toanHeThong || fieldScope.maDonVi.length)
      }).map(({ key, label, group }) => ({ key, label, group })),
      boLoc: { maBuoi: { batBuoc: true }, baoGomBuoiDaHuy: { macDinh: false, moTa: 'Chỉ bật khi cần xuất buổi đã hủy còn dữ liệu roster hoặc kết quả lịch sử.' } },
      phamVi: access.toanHeThong ? 'TOAN_HE_THONG' : 'ASSIGNMENT_HIEN_HANH',
    }
  }

  private assertFields(dto: XuatKetQuaDiemDanhDto, fieldAccess: Map<string, Access>) {
    if (!Array.isArray(dto.truong) || dto.truong.length < 1 || dto.truong.length > ATTENDANCE_EXPORT_FIELDS.length) throw new BadRequestException({ maLoi: 'TRUONG_XUAT_KHONG_HOP_LE', thongBao: 'Hãy chọn từ 1 đến 17 trường trong danh mục được hỗ trợ.' })
    const unique = [...new Set(dto.truong)]
    if (unique.length !== dto.truong.length) throw new BadRequestException({ maLoi: 'TRUONG_XUAT_BI_TRUNG', thongBao: 'Danh sách trường xuất có giá trị lặp.' })
    const selected = unique.map(key => ATTENDANCE_EXPORT_FIELDS.find(field => field.key === key))
    if (selected.some(field => !field)) throw new BadRequestException({ maLoi: 'TRUONG_XUAT_KHONG_HOP_LE', thongBao: 'Có trường không thuộc danh mục xuất học tập nghị quyết.' })
    const valid = selected as AttendanceExportField[]
    if (valid.some(field => !fieldAccess.get(field.permission)?.coQuyen || (!fieldAccess.get(field.permission)?.toanHeThong && !fieldAccess.get(field.permission)?.maDonVi.length))) throw new ForbiddenException({ maLoi: 'KHONG_DU_QUYEN_XUAT_TRUONG', thongBao: 'Assignment hiện hành không có đủ Permission và Scope cho một hoặc nhiều trường đã chọn.' })
    return valid
  }

  private time(date: Date | null | undefined) { return date ? date.toISOString() : null }

  private async personalData(rows: RosterRow[], access: Access, selected: AttendanceExportField[]) {
    const needsPersonal = selected.some(field => field.key === 'soCccd' || field.key === 'ngaySinh')
    if (!needsPersonal || !rows.length) return new Map<string, { soCccd: string | null; ngaySinh: Date | null }>()
    const memberIds = [...new Set(rows.map(row => row.maHoSo))]
    let permittedIds = memberIds
    if (!access.toanHeThong) {
      const memberships = await this.prisma.lichSuDonViDangVien.findMany({
        where: { maHoSo: { in: memberIds }, ngayHieuLucTu: { lte: new Date() }, OR: [{ ngayHieuLucDen: null }, { ngayHieuLucDen: { gt: new Date() } }] },
        select: { maHoSo: true, maChiBo: true, maTo: true },
      })
      const byProfile = new Map<string, typeof memberships>()
      for (const membership of memberships) byProfile.set(membership.maHoSo, [...(byProfile.get(membership.maHoSo) ?? []), membership])
      permittedIds = memberIds.filter(id => {
        const current = byProfile.get(id) ?? []
        if (current.length !== 1) return false
        const membership = current[0]
        if (!membership) return false
        return access.maDonVi.includes(membership.maChiBo) || Boolean(membership.maTo && access.maDonVi.includes(membership.maTo))
      })
    }
    if (!permittedIds.length) return new Map()
    const personal = await this.prisma.thongTinCaNhanDangVien.findMany({
      where: { maHoSo: { in: permittedIds } },
      select: { maHoSo: true, ...(selected.some(field => field.key === 'soCccd') ? { soCccd: true } : {}), ...(selected.some(field => field.key === 'ngaySinh') ? { ngaySinh: true } : {}) },
    })
    return new Map(personal.map(row => [row.maHoSo, { soCccd: row.soCccd ?? null, ngaySinh: row.ngaySinh ?? null }]))
  }

  async xuat(actor: TaiKhoanDaXacThuc, dto: XuatKetQuaDiemDanhDto) {
    const reportAccess = await this.access(actor, ATTENDANCE_EXPORT_PERMISSION)
    await this.access(actor, 'HOC_TAP_NGHI_QUYET_DANH_SACH_XEM')
    const fieldScopes = await this.fieldAccess(actor)
    const selected = this.assertFields(dto, fieldScopes)
    const buoi = await this.prisma.buoiHocNghiQuyet.findUnique({
      where: { ma: dto.maBuoi },
      select: {
        ma: true, maBuoi: true, ten: true, hinhThuc: true, batDauLuc: true, ketThucLuc: true, diaDiem: true, trangThai: true,
        giaTriHinhThuc: { select: { tenHienThi: true } },
        dotHoc: { select: { ten: true, maNamHoc: true, namHoc: { select: { tenNamHoc: true } }, phamVi: { select: { maDonVi: true } } } },
        phamVi: { select: { maDonVi: true } },
      },
    })
    if (!buoi) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_BUOI', thongBao: 'Không tìm thấy buổi học cần xuất.' })
    if (buoi.trangThai === 'DA_HUY' && dto.baoGomBuoiDaHuy !== true) throw new ConflictException({ maLoi: 'BUOI_DA_HUY_CAN_CHON_BO_LOC', thongBao: 'Buổi đã hủy chỉ được xuất khi bật bộ lọc bao gồm buổi đã hủy.' })

    const roster = await this.prisma.danhSachThamGiaBuoiHoc.findMany({
      where: { maBuoi: buoi.ma, ...this.whereRosterScope(reportAccess) },
      orderBy: [{ tenChiBoSnapshot: 'asc' }, { tenToSnapshot: 'asc' }, { hoSo: { hoVaTen: 'asc' } }, { maHoSo: 'asc' }],
      select: { maHoSo: true, trangThai: true, maChiBoSnapshot: true, tenChiBoSnapshot: true, maToSnapshot: true, tenToSnapshot: true, hoSo: { select: { maHoSoNoiBo: true, hoVaTen: true } } },
    }) as RosterRow[]
    const hasUnitIntersection = reportAccess.toanHeThong
      || buoi.phamVi.some(scope => reportAccess.maDonVi.includes(scope.maDonVi))
      || buoi.dotHoc.phamVi.some(scope => reportAccess.maDonVi.includes(scope.maDonVi))
    if (!hasUnitIntersection && roster.length === 0) throw new ForbiddenException({ maLoi: 'BUOI_NGOAI_PHAM_VI_XUAT', thongBao: 'Buổi học không có dữ liệu thuộc Scope xuất hiện hành.' })

    const needsResults = selected.some(field => field.key === 'ketQuaDiemDanh' || field.key === 'thoiDiemCoMat')
    const rowsWithResultPermission = needsResults ? roster.filter(row => this.fieldCovers(fieldScopes, 'HOC_TAP_NGHI_QUYET_DIEM_DANH_XEM', row)) : []
    const results = rowsWithResultPermission.length ? await this.prisma.ketQuaDiemDanh.findMany({
      where: { maBuoi: buoi.ma, maHoSo: { in: rowsWithResultPermission.map(row => row.maHoSo) } },
      select: { maHoSo: true, trangThai: true, thoiDiemCoMat: true },
    }) : []
    const resultByProfile = new Map(results.map(row => [row.maHoSo, row]))
    const personalAccess = fieldScopes.get('HO_SO_CA_NHAN_XEM') ?? { coQuyen: false, toanHeThong: false, maDonVi: [] }
    const personal = await this.personalData(roster, personalAccess, selected)
    const rowData: ExportRow[] = roster.map((row, index) => {
      const result = resultByProfile.get(row.maHoSo)
      const currentResult = result?.trangThai ? labels[result.trangThai] ?? result.trangThai : 'Chưa điểm danh'
      const resultAllowed = this.fieldCovers(fieldScopes, 'HOC_TAP_NGHI_QUYET_DIEM_DANH_XEM', row)
      const rosterAllowed = this.fieldCovers(fieldScopes, 'HOC_TAP_NGHI_QUYET_DANH_SACH_XEM', row)
      const buoiAllowed = this.fieldCovers(fieldScopes, 'HOC_TAP_NGHI_QUYET_BUOI_XEM', row)
      const dotAllowed = this.fieldCovers(fieldScopes, 'HOC_TAP_NGHI_QUYET_DOT_XEM', row)
      const memberAllowed = personal.has(row.maHoSo)
      const values: ExportRow = {
        stt: index + 1,
        maHoSoNoiBo: rosterAllowed ? row.hoSo.maHoSoNoiBo : null,
        hoVaTen: rosterAllowed ? row.hoSo.hoVaTen : null,
        chiBoSnapshot: rosterAllowed ? row.tenChiBoSnapshot : null,
        toSnapshot: rosterAllowed ? row.tenToSnapshot : null,
        dotHoc: dotAllowed ? buoi.dotHoc.ten : null,
        namHoc: dotAllowed ? buoi.dotHoc.namHoc.tenNamHoc : null,
        buoiHoc: buoiAllowed ? buoi.ten : null,
        hinhThuc: buoiAllowed ? buoi.giaTriHinhThuc?.tenHienThi ?? buoi.hinhThuc : null,
        thoiGianDuKien: buoiAllowed ? `${this.time(buoi.batDauLuc)} — ${this.time(buoi.ketThucLuc)}` : null,
        diaDiem: buoiAllowed ? buoi.diaDiem : null,
        trangThaiBuoi: buoiAllowed ? labels[buoi.trangThai] ?? buoi.trangThai : '',
        trangThaiRoster: rosterAllowed ? labels[row.trangThai] ?? row.trangThai : null,
        ketQuaDiemDanh: resultAllowed ? currentResult : null,
        thoiDiemCoMat: resultAllowed ? this.time(result?.thoiDiemCoMat) : null,
        soCccd: memberAllowed ? personal.get(row.maHoSo)?.soCccd ?? null : null,
        ngaySinh: memberAllowed ? personal.get(row.maHoSo)?.ngaySinh ?? null : null,
      }
      return values
    })
    const workbook = this.transfer.createWorkbook()
    const sheet = workbook.addWorksheet('Kết quả điểm danh')
    sheet.addRow(selected.map(field => field.label))
    for (const row of rowData) sheet.addRow(selected.map(field => this.transfer.sanitizeCellValue(row[field.key as keyof ExportRow] ?? null)))
    selected.forEach((field, index) => {
      const column = sheet.getColumn(index + 1)
      column.width = Math.min(42, Math.max(12, field.label.length + 4))
      if (field.kind === 'text') column.numFmt = '@'
      if (field.kind === 'date') column.numFmt = 'dd/mm/yyyy'
    })
    sheet.views = [{ state: 'frozen', ySplit: 1 }]
    sheet.autoFilter = { from: 'A1', to: `${this.columnName(selected.length)}${Math.max(1, rowData.length + 1)}` }
    const buffer = await this.transfer.write(workbook)
    await this.prisma.nhatKyKiemToan.create({ data: {
      maNguoiThucHien: actor.maTaiKhoan, hanhDong: 'HOC_TAP_NGHI_QUYET_XUAT_DU_LIEU', loaiDoiTuong: 'BUOI_HOC_NGHI_QUYET', maDoiTuong: buoi.ma,
      ketQua: 'THANH_CONG', duLieuSau: { maBuoi: buoi.ma, baoGomBuoiDaHuy: dto.baoGomBuoiDaHuy === true, soLuong: rowData.length, truong: selected.map(field => field.key) } as Prisma.InputJsonValue,
      maTuongQuan: randomUUID(),
    } })
    return buffer
  }

  private columnName(index: number) {
    let value = index; let name = ''
    while (value > 0) { const remainder = (value - 1) % 26; name = String.fromCharCode(65 + remainder) + name; value = Math.floor((value - 1) / 26) }
    return name
  }
}
