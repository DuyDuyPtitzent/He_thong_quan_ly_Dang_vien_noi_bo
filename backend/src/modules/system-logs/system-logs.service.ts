import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '../../infrastructure/database/generated/prisma/client'
import { DichVuPrisma } from '../../infrastructure/database/prisma.service'
import type { TaiKhoanDaXacThuc } from '../auth/auth.types'
import { PhanQuyenService } from '../authorization/authorization.service'
import type { DanhSachNhatKyDto, XemTruocXoaNhatKyDto } from './system-logs.dto'

const securityActions = ['DANG_NHAP', 'DANG_XUAT', 'DOI_MAT_KHAU', 'TAI_KHOAN_DOI_TRANG_THAI', 'TAI_KHOAN_KHOA_DO_XOA_HO_SO_LIEN_KET', 'TAI_KHOAN_THU_HOI_PHIEN']
const actionLabel: Record<string, string> = {
  DANG_NHAP: 'Đăng nhập', DANG_XUAT: 'Đăng xuất', DOI_MAT_KHAU: 'Đổi mật khẩu', TAI_KHOAN_DOI_TRANG_THAI: 'Thay đổi trạng thái tài khoản', TAI_KHOAN_KHOA_DO_XOA_HO_SO_LIEN_KET: 'Khóa tài khoản khi xóa hồ sơ', TAI_KHOAN_THU_HOI_PHIEN: 'Thu hồi phiên đăng nhập',
  HO_SO_DANG_VIEN_TAO: 'Tạo hồ sơ Đảng viên', HO_SO_DANG_VIEN_SUA: 'Cập nhật hồ sơ Đảng viên', HO_SO_DANG_VIEN_XOA: 'Xóa hồ sơ Đảng viên', HO_SO_DANG_VIEN_NHAP_HANG_LOAT: 'Nhập hồ sơ hàng loạt', HO_SO_DANG_VIEN_XUAT_DU_LIEU: 'Xuất hồ sơ Đảng viên',
  TAI_KHOAN_TAO: 'Tạo tài khoản', TAI_KHOAN_TAO_KEM_HO_SO: 'Tạo tài khoản cùng hồ sơ', TAI_KHOAN_SUA: 'Cập nhật tài khoản', TAI_KHOAN_XOA: 'Xóa tài khoản', TAI_KHOAN_LIEN_KET_HO_SO: 'Liên kết hồ sơ', TAI_KHOAN_TU_CAP_NHAT_THONG_TIN: 'Tự cập nhật thông tin tài khoản',
  VAI_TRO_TAO: 'Tạo vai trò', VAI_TRO_SUA: 'Cập nhật vai trò', VAI_TRO_XOA: 'Xóa vai trò', VAI_TRO_GAN_QUYEN: 'Cập nhật quyền vai trò', PHAN_CONG_VAI_TRO_TAO: 'Gán vai trò', PHAN_CONG_VAI_TRO_SUA: 'Sửa phân công vai trò', PHAN_CONG_VAI_TRO_THU_HOI: 'Thu hồi vai trò',
  TO_CHUC_TAO: 'Tạo đơn vị', TO_CHUC_SUA: 'Cập nhật đơn vị', TO_CHUC_DOI_TRANG_THAI: 'Thay đổi trạng thái đơn vị', TO_CHUC_KHOI_PHUC: 'Khôi phục đơn vị', TO_CHUC_DOI_TEN: 'Đổi tên đơn vị', TO_CHUC_DOI_DON_VI_CHA: 'Thay đổi đơn vị cấp trên', TO_CHUC_XOA: 'Xóa đơn vị',
  NAM_HOC_TAO: 'Tạo năm học', NAM_HOC_SUA: 'Cập nhật năm học', NAM_HOC_XOA: 'Xóa năm học',
  HO_SO_CA_NHAN_GUI_YEU_CAU: 'Gửi yêu cầu cập nhật hồ sơ', HO_SO_CA_NHAN_DUYET_YEU_CAU: 'Duyệt yêu cầu cập nhật', HO_SO_CA_NHAN_AP_DUNG_YEU_CAU: 'Áp dụng thay đổi hồ sơ', HO_SO_CA_NHAN_TU_CHOI_YEU_CAU: 'Từ chối yêu cầu cập nhật', HO_SO_CA_NHAN_HUY_YEU_CAU: 'Hủy yêu cầu cập nhật',
  HO_SO_CA_NHAN_TAO_NHAP_DOT: 'Tạo đợt cập nhật bản nháp', HO_SO_CA_NHAN_TAO_VA_KICH_HOAT_DOT: 'Tạo và mở đợt cập nhật', HO_SO_CA_NHAN_MO_DOT_CAP_NHAT: 'Mở đợt cập nhật', HO_SO_CA_NHAN_SUA_DOT: 'Sửa đợt cập nhật', HO_SO_CA_NHAN_KICH_HOAT_DOT: 'Kích hoạt đợt cập nhật', HO_SO_CA_NHAN_KET_THUC_SOM_DOT: 'Kết thúc sớm đợt cập nhật', HO_SO_CA_NHAN_XOA_DOT: 'Xóa đợt cập nhật', HO_SO_CA_NHAN_TU_CAP_NHAT: 'Gửi cập nhật hồ sơ cá nhân', HO_SO_CA_NHAN_SUA: 'Cập nhật hồ sơ cá nhân',
}

function paginationNumber(value: unknown, field: string, fallback: number, max?: number) {
  const parsed = value === undefined
    ? fallback
    : typeof value === 'number'
      ? value
      : typeof value === 'string' && /^\d+$/.test(value)
        ? Number(value)
        : Number.NaN
  if (!Number.isSafeInteger(parsed) || parsed < 1 || (max !== undefined && parsed > max)) {
    throw new BadRequestException({ maLoi: 'THAM_SO_PHAN_TRANG_KHONG_HOP_LE', thongBao: `Tham số ${field} phải là số nguyên dương${max ? ` không vượt quá ${max}` : ''}.` })
  }
  return parsed
}

@Injectable()
export class NhatKyHeThongService {
  constructor(
    @Inject(DichVuPrisma) private readonly prisma: DichVuPrisma,
    @Inject(PhanQuyenService) private readonly permissions: PhanQuyenService,
  ) {}

  private async context(actor: TaiKhoanDaXacThuc, type: string, selectedUnit?: string) {
    if (type !== 'thao-tac' && type !== 'bao-mat') throw new NotFoundException()
    await this.permissions.kiemTraQuanTriVienToanHeThong(actor.maTaiKhoan, actor.maPhien)
    const permission = type === 'thao-tac' ? 'NHAT_KY_KIEM_TOAN_XEM' : 'NHAT_KY_BAO_MAT_XEM'
    const scope = await this.permissions.layDonViTrongPhamVi(actor.maTaiKhoan, permission, actor.maPhien)
    if (!scope.coQuyen) throw new ForbiddenException({ maLoi: 'KHONG_DU_QUYEN', thongBao: 'Không đủ quyền xem loại nhật ký này.' })
    if (scope.toanHeThong && !selectedUnit) return { security: type === 'bao-mat', where: {} as Prisma.NhatKyKiemToanWhereInput }
    if (selectedUnit && !scope.toanHeThong && !scope.maDonVi.includes(selectedUnit)) throw new ForbiddenException({ maLoi: 'KHONG_DU_QUYEN', thongBao: 'Đơn vị lọc nằm ngoài phạm vi nhật ký được giao.' })
    if (selectedUnit && scope.toanHeThong && !await this.prisma.donViToChuc.findUnique({ where: { ma: selectedUnit }, select: { ma: true } })) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_DON_VI', thongBao: 'Không tìm thấy đơn vị.' })
    const unitIds = selectedUnit ? [selectedUnit] : scope.maDonVi
    const profiles = unitIds.length ? await this.prisma.hoSoDangVien.findMany({
      where: { lichSuDonVi: { some: { AND: [{ ngayHieuLucTu: { lte: new Date() } }, { OR: [{ ngayHieuLucDen: null }, { ngayHieuLucDen: { gt: new Date() } }] }, { OR: [{ maChiBo: { in: unitIds } }, { maTo: { in: unitIds } }] }] } } },
      select: { ma: true, maTaiKhoan: true },
    }) : []
    const accountIds = [...new Set(profiles.map((p) => p.maTaiKhoan).filter((id): id is string => Boolean(id)))]; if (!unitIds.length) accountIds.push(actor.maTaiKhoan)
    const targetIds = [...new Set([...unitIds, ...profiles.map((p) => p.ma), ...(!unitIds.length ? [actor.maTaiKhoan] : [])])]
    const access: Prisma.NhatKyKiemToanWhereInput = { OR: [
      ...(accountIds.length ? [{ maNguoiThucHien: { in: accountIds } }, { maDoiTuong: { in: accountIds } }] : []),
      ...(targetIds.length ? [{ maDoiTuong: { in: targetIds } }] : []),
    ] }
    return { security: type === 'bao-mat', where: access }
  }

  private filters(dto: DanhSachNhatKyDto, security: boolean): Prisma.NhatKyKiemToanWhereInput {
    const and: Prisma.NhatKyKiemToanWhereInput[] = []
    and.push(security ? { hanhDong: { in: securityActions } } : { NOT: { hanhDong: { in: securityActions } } })
    if (dto.hanhDong) and.push({ hanhDong: dto.hanhDong })
    if (dto.taiKhoan?.trim()) and.push({ nguoiThucHien: { is: { tenDangNhap: { contains: dto.taiKhoan.trim(), mode: 'insensitive' } } } })
    if (dto.ketQua) and.push({ ketQua: dto.ketQua })
    if (dto.tuNgay || dto.denNgay) and.push({ thoiDiem: { ...(dto.tuNgay ? { gte: new Date(dto.tuNgay) } : {}), ...(dto.denNgay ? { lte: new Date(/^\d{4}-\d{2}-\d{2}$/.test(dto.denNgay) ? `${dto.denNgay}T23:59:59.999Z` : dto.denNgay) } : {}) } })
    if (dto.tuKhoa?.trim()) {
      const keyword = dto.tuKhoa.trim()
      const matchedActions = Object.entries(actionLabel).filter(([, label]) => label.toLocaleLowerCase('vi-VN').includes(keyword.toLocaleLowerCase('vi-VN'))).map(([code]) => code)
      and.push({ OR: [
      { hanhDong: { contains: dto.tuKhoa.trim(), mode: 'insensitive' } },
      ...(matchedActions.length ? [{ hanhDong: { in: matchedActions } }] : []),
      { nguoiThucHien: { is: { tenDangNhap: { contains: dto.tuKhoa.trim(), mode: 'insensitive' } } } },
      { nguoiThucHien: { is: { hoSoDangVien: { is: { hoVaTen: { contains: dto.tuKhoa.trim(), mode: 'insensitive' } } } } } },
      ] })
    }
    return { AND: and }
  }

  async danhSach(actor: TaiKhoanDaXacThuc, type: string, dto: DanhSachNhatKyDto) {
    const trang = paginationNumber(dto.trang as unknown, 'trang', 1)
    const kichThuoc = paginationNumber(dto.kichThuoc as unknown, 'kichThuoc', 20, 100)
    if (dto.tuNgay && dto.denNgay && new Date(dto.tuNgay) > new Date(dto.denNgay)) throw new BadRequestException({ maLoi: 'KHOANG_NGAY_KHONG_HOP_LE', thongBao: 'Ngày bắt đầu phải trước ngày kết thúc.' })
    const ctx = await this.context(actor, type, dto.maDonVi)
    const where = { AND: [ctx.where, this.filters(dto, ctx.security)] } satisfies Prisma.NhatKyKiemToanWhereInput
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.nhatKyKiemToan.count({ where }),
      this.prisma.nhatKyKiemToan.findMany({ where, orderBy: [{ thoiDiem: 'desc' }, { ma: 'desc' }], skip: (trang - 1) * kichThuoc, take: kichThuoc,
        select: { ma: true, maNguoiThucHien: true, hanhDong: true, loaiDoiTuong: true, maDoiTuong: true, ketQua: true, lyDo: true, thoiDiem: true, nguoiThucHien: { select: { tenDangNhap: true, hoSoDangVien: { select: { hoVaTen: true } } } } },
      }),
    ])
    return { items: rows.map((row) => ({ ...row, tenHanhDong: actionLabel[row.hanhDong] ?? row.hanhDong.replaceAll('_', ' ').toLocaleLowerCase('vi-VN') })), tongSo: total, trang, kichThuoc }
  }

  async thongKe(actor: TaiKhoanDaXacThuc, type: string, selectedUnit?: string) {
    const ctx = await this.context(actor, type, selectedUnit)
    const base = { AND: [ctx.where, this.filters({} as DanhSachNhatKyDto, ctx.security)] } satisfies Prisma.NhatKyKiemToanWhereInput
    const outcomes = await this.prisma.nhatKyKiemToan.groupBy({ by: ['ketQua'], where: base, _count: { _all: true } })
    const tong = outcomes.reduce((total, outcome) => total + outcome._count._all, 0)
    const thanhCong = outcomes.find(({ ketQua }) => ketQua === 'THANH_CONG')?._count._all ?? 0
    const thatBai = outcomes.find(({ ketQua }) => ketQua === 'THAT_BAI')?._count._all ?? 0
    return { tong, thanhCong, thatBai, ketQuaKhac: tong - thanhCong - thatBai, baoMat: ctx.security ? tong : 0 }
  }

  async hanhDong(actor: TaiKhoanDaXacThuc, type: string, selectedUnit?: string) {
    const ctx = await this.context(actor, type, selectedUnit)
    const rows = await this.prisma.nhatKyKiemToan.findMany({ where: { AND: [ctx.where, this.filters({} as DanhSachNhatKyDto, ctx.security)] }, distinct: ['hanhDong'], orderBy: { hanhDong: 'asc' }, select: { hanhDong: true } })
    return rows.map(({ hanhDong }) => ({ ma: hanhDong, ten: actionLabel[hanhDong] ?? hanhDong.replaceAll('_', ' ').toLocaleLowerCase('vi-VN') }))
  }

  async xemTruocXoa(actor: TaiKhoanDaXacThuc, type: string, dto: XemTruocXoaNhatKyDto) {
    if (type !== 'thao-tac' && type !== 'bao-mat') throw new NotFoundException()
    await this.permissions.kiemTraQuanTriVienToanHeThong(actor.maTaiKhoan, actor.maPhien)
    if (typeof dto.lyDo !== 'string' || dto.lyDo.trim().length < 3) throw new BadRequestException({ maLoi: 'LY_DO_KHONG_HOP_LE', thongBao: 'Lý do cần có ít nhất 3 ký tự.' })
    const ids = dto.maNhatKy
    const hasIds = Boolean(ids?.length)
    const hasRange = Boolean(dto.tuNgay || dto.denNgay)
    if (hasIds === hasRange || (hasRange && (!dto.tuNgay || !dto.denNgay))) throw new BadRequestException({ maLoi: 'PHAM_VI_XOA_KHONG_HOP_LE', thongBao: 'Chọn một nhóm bản ghi hoặc nhập đầy đủ khoảng ngày.' })
    if (dto.tuNgay && dto.denNgay && new Date(dto.tuNgay) > new Date(dto.denNgay)) throw new BadRequestException({ maLoi: 'KHOANG_NGAY_KHONG_HOP_LE', thongBao: 'Ngày bắt đầu phải trước ngày kết thúc.' })

    const deletionScope = await this.permissions.layDonViTrongPhamVi(actor.maTaiKhoan, 'NHAT_KY_XOA', actor.maPhien)
    if (!deletionScope.coQuyen) throw new ForbiddenException({ maLoi: 'KHONG_DU_QUYEN', thongBao: 'Cần Permission NHAT_KY_XOA riêng để xem trước yêu cầu này.' })
    if (!deletionScope.toanHeThong && (!dto.maDonVi || !deletionScope.maDonVi.includes(dto.maDonVi))) throw new ForbiddenException({ maLoi: 'KHONG_DU_QUYEN', thongBao: 'Phải chọn một đơn vị nằm trong Scope xóa nhật ký được giao.' })
    const ctx = await this.context(actor, type, dto.maDonVi)
    const filters = this.filters({ tuNgay: dto.tuNgay, denNgay: dto.denNgay } as DanhSachNhatKyDto, ctx.security)
    const where = { AND: [ctx.where, filters, ...(ids ? [{ ma: { in: ids } }] : [])] } satisfies Prisma.NhatKyKiemToanWhereInput
    const matchingCount = await this.prisma.nhatKyKiemToan.count({ where })
    return {
      loaiNhatKy: type,
      cheDo: hasIds ? 'BAN_GHI_DA_CHON' : 'KHOANG_THOI_GIAN',
      soBanGhiYeuCau: hasIds ? ids!.length : null,
      soBanGhiKhopTrongPhamVi: matchingCount,
      soBanGhiDuDieuKienXoa: null,
      tuNgay: dto.tuNgay ?? null,
      denNgay: dto.denNgay ?? null,
      maDonVi: dto.maDonVi ?? null,
      lyDo: dto.lyDo.trim(),
      coTheXoa: false,
      lyDoKhongTheXoa: 'Chưa có chính sách lưu trữ PTIT được phê duyệt; cơ sở dữ liệu hiện còn chặn xóa audit bằng trigger append-only.',
    }
  }

  async donVi(actor: TaiKhoanDaXacThuc, type: string) {
    if (type !== 'thao-tac' && type !== 'bao-mat') throw new NotFoundException()
    await this.permissions.kiemTraQuanTriVienToanHeThong(actor.maTaiKhoan, actor.maPhien)
    const scope = await this.permissions.layDonViTrongPhamVi(actor.maTaiKhoan, type === 'thao-tac' ? 'NHAT_KY_KIEM_TOAN_XEM' : 'NHAT_KY_BAO_MAT_XEM', actor.maPhien)
    if (!scope.coQuyen) throw new ForbiddenException({ maLoi: 'KHONG_DU_QUYEN', thongBao: 'Không đủ quyền xem loại nhật ký này.' })
    if (!scope.toanHeThong && !scope.maDonVi.length) return []
    const now = new Date()
    const rows = await this.prisma.donViToChuc.findMany({
      where: scope.toanHeThong ? {} : { ma: { in: scope.maDonVi } }, orderBy: [{ loaiDonVi: 'asc' }, { maDinhDanh: 'asc' }],
      select: { ma: true, maDinhDanh: true, loaiDonVi: true, tenDonVi: { where: { ngayHieuLucTu: { lte: now }, OR: [{ ngayHieuLucDen: null }, { ngayHieuLucDen: { gt: now } }] }, orderBy: { ngayHieuLucTu: 'desc' }, take: 1, select: { ten: true } } },
    })
    return rows.map(({ tenDonVi, ...unit }) => ({ ...unit, ten: tenDonVi[0]?.ten ?? unit.maDinhDanh ?? 'Đơn vị chưa có tên' }))
  }

  async chiTiet(actor: TaiKhoanDaXacThuc, type: string, id: string) {
    const ctx = await this.context(actor, type)
    const row = await this.prisma.nhatKyKiemToan.findFirst({ where: { AND: [ctx.where, this.filters({} as DanhSachNhatKyDto, ctx.security), { ma: id }] },
      select: { ma: true, maNguoiThucHien: true, hanhDong: true, loaiDoiTuong: true, maDoiTuong: true, ketQua: true, lyDo: true, thoiDiem: true, nguoiThucHien: { select: { tenDangNhap: true, hoSoDangVien: { select: { hoVaTen: true } } } } },
    })
    if (!row) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_NHAT_KY', thongBao: 'Không tìm thấy bản ghi nhật ký trong phạm vi được phép.' })
    return { ...row, tenHanhDong: actionLabel[row.hanhDong] ?? row.hanhDong.replaceAll('_', ' ').toLocaleLowerCase('vi-VN'), duLieuThayDoi: null }
  }
}
