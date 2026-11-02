import {
  ConflictException, ForbiddenException, Inject, Injectable, NotFoundException,
} from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { Prisma } from '../../infrastructure/database/generated/prisma/client'
import { DichVuPrisma } from '../../infrastructure/database/prisma.service'
import { PhanQuyenService } from '../authorization/authorization.service'
import type { TaiKhoanDaXacThuc } from '../auth/auth.types'
import { CapNhatTrangThaiDonViDto, DoiQuanHeChaDto, DoiTenDonViDto, DanhSachDonViDto, SuaDonViDto, TaoDonViDto, trangThaiDonViHopLe } from './organizations.dto'

const permissions = {
  read: 'TO_CHUC_XEM', create: 'TO_CHUC_TAO', edit: 'TO_CHUC_SUA_THONG_TIN',
  editType: 'TO_CHUC_SUA_LOAI', changeParent: 'TO_CHUC_DOI_DON_VI_CHA',
  history: 'TO_CHUC_XEM_LICH_SU', delete: 'TO_CHUC_XOA', changeStatus: 'TO_CHUC_DOI_TRANG_THAI',
  restore: 'TO_CHUC_KHOI_PHUC',
} as const

const rootUnit = {
  code: 'PTIT_DANG_UY',
  name: 'Đảng ủy Học viện Công nghệ Bưu chính Viễn thông',
  type: 'DANG_UY' as const,
  status: 'DANG_HOAT_DONG',
}

@Injectable()
export class ToChucService {
  constructor(
    @Inject(DichVuPrisma) private readonly prisma: DichVuPrisma,
    @Inject(PhanQuyenService) private readonly phanQuyen: PhanQuyenService,
  ) {}

  async danhSach(taiKhoan: TaiKhoanDaXacThuc, query: DanhSachDonViDto) {
    const allowed = await this.phanQuyen.layDonViTrongPhamVi(taiKhoan.maTaiKhoan, permissions.read)
    if (!allowed.coQuyen) throw new ForbiddenException({ maLoi: 'KHONG_DU_QUYEN', thongBao: 'Không có quyền xem tổ chức.' })
    const where: Prisma.DonViToChucWhereInput = {
      ...(query.loaiDonVi ? { loaiDonVi: query.loaiDonVi } : {}),
      ...(query.trangThai ? { trangThai: query.trangThai } : {}),
      ...(allowed.toanHeThong ? {} : { ma: { in: allowed.maDonVi } }),
      ...(query.tuKhoa ? { OR: [
        { maDinhDanh: { contains: query.tuKhoa, mode: 'insensitive' } },
        { tenDonVi: { some: { ten: { contains: query.tuKhoa, mode: 'insensitive' } } } },
      ] } : {}),
    }
    const [tongSo, donVi] = await this.prisma.$transaction([
      this.prisma.donViToChuc.count({ where }),
      this.prisma.donViToChuc.findMany({
        where,
        orderBy: [{ loaiDonVi: 'asc' }, { maDinhDanh: 'asc' }],
        skip: ((query.trang ?? 1) - 1) * (query.gioiHan ?? 20),
        take: query.gioiHan ?? 20,
        include: { tenDonVi: { where: { ngayHieuLucDen: null }, take: 1 } },
      }),
    ])
    return {
      duLieu: donVi.map(({ tenDonVi, ...row }) => ({ ...row, tenDonVi: tenDonVi[0]?.ten ?? null })),
      phanTrang: { trang: query.trang ?? 1, gioiHan: query.gioiHan ?? 20, tongSo },
    }
  }

  async cay(taiKhoan: TaiKhoanDaXacThuc, thoiDiem = new Date()) {
    const allowed = await this.phanQuyen.layDonViTrongPhamVi(taiKhoan.maTaiKhoan, permissions.read)
    if (!allowed.coQuyen) throw new ForbiddenException({ maLoi: 'KHONG_DU_QUYEN', thongBao: 'Không có quyền xem tổ chức.' })
    const donVi = await this.prisma.donViToChuc.findMany({
      where: allowed.toanHeThong ? {} : { ma: { in: allowed.maDonVi } },
      include: {
        tenDonVi: {
          where: { ngayHieuLucTu: { lte: thoiDiem }, OR: [{ ngayHieuLucDen: null }, { ngayHieuLucDen: { gt: thoiDiem } }] },
          take: 1,
        },
      },
    })
    const relations = await this.prisma.lichSuQuanHeDonVi.findMany({
      where: { ngayHieuLucTu: { lte: thoiDiem }, OR: [{ ngayHieuLucDen: null }, { ngayHieuLucDen: { gt: thoiDiem } }] },
      select: { maDonViCha: true, maDonViCon: true },
    })
    const parentByChild = new Map(relations.map(({ maDonViCon, maDonViCha }) => [maDonViCon, maDonViCha]))
    const map = new Map(donVi.map((row) => [row.ma, {
      maDonVi: row.ma, maDinhDanh: row.maDinhDanh, loaiDonVi: row.loaiDonVi,
      trangThai: row.trangThai, tenDonVi: row.tenDonVi[0]?.ten ?? null,
      donViCon: [] as ReturnType<typeof Object>[]
    }]))
    const roots: any[] = []
    for (const row of donVi) {
      const node = map.get(row.ma) as any
      const parentId = parentByChild.get(row.ma)
      const parentNode = parentId ? map.get(parentId) : undefined
      if (parentNode) (parentNode as any).donViCon.push(node)
      else roots.push(node)
    }
    return roots
  }

  async chiTiet(maDonVi: string) {
    const row = await this.prisma.donViToChuc.findUnique({
      where: { ma: maDonVi },
      include: {
        tenDonVi: { where: { ngayHieuLucDen: null }, take: 1 },
        quanHeCon: { where: { ngayHieuLucDen: null }, take: 1 },
        quanHeCha: { where: { ngayHieuLucDen: null }, take: 1 },
      },
    })
    if (!row) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_DON_VI', thongBao: 'Không tìm thấy đơn vị.' })
    return {
      maDonVi: row.ma, maDinhDanh: row.maDinhDanh, loaiDonVi: row.loaiDonVi,
      trangThai: row.trangThai, tenDonVi: row.tenDonVi[0]?.ten ?? null,
      maDonViCha: row.quanHeCha[0]?.maDonViCha ?? null,
      maDonViCon: row.quanHeCon.map(({ maDonViCon }) => maDonViCon),
    }
  }

  async lichSuQuanHe(maDonVi: string) {
    const exists = await this.prisma.donViToChuc.findUnique({ where: { ma: maDonVi }, select: { ma: true } })
    if (!exists) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_DON_VI', thongBao: 'Không tìm thấy đơn vị.' })
    return this.prisma.lichSuQuanHeDonVi.findMany({
      where: { OR: [{ maDonViCha: maDonVi }, { maDonViCon: maDonVi }] },
      orderBy: { ngayHieuLucTu: 'desc' },
    })
  }

  async tao(taiKhoan: TaiKhoanDaXacThuc, dto: TaoDonViDto, auditContext?: { lyDo?: string; maTuongQuan?: string }) {
    const status = dto.trangThai ?? 'DANG_HOAT_DONG'
    if (dto.loaiDonVi === 'DANG_UY') {
      await this.phanQuyen.kiemTra(taiKhoan.maTaiKhoan, permissions.create)
      if (dto.maDonViCha || dto.maDinhDanh !== rootUnit.code || dto.tenDonVi !== rootUnit.name || status !== rootUnit.status) {
        throw this.xungDot('Đảng ủy gốc phải dùng đúng mã, tên và trạng thái đã được cấu hình; không có đơn vị cha.')
      }
    } else if (dto.maDonViCha) await this.phanQuyen.kiemTra(taiKhoan.maTaiKhoan, permissions.create, { maDonVi: dto.maDonViCha })
    else await this.phanQuyen.kiemTra(taiKhoan.maTaiKhoan, permissions.create)
    this.kiemTraThoiDiem(dto.ngayHieuLucTu)
    await this.kiemTraTrangThaiDonVi(status)
    const parent = dto.maDonViCha
      ? await this.prisma.donViToChuc.findUnique({ where: { ma: dto.maDonViCha }, select: { ma: true, loaiDonVi: true } })
      : null
    if (dto.maDonViCha && !parent) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_DON_VI_CHA', thongBao: 'Không tìm thấy đơn vị cha.' })
    if (!this.quanHeHopLe(dto.loaiDonVi, parent?.loaiDonVi ?? null)) throw this.xungDot('Quan hệ cha-con không đúng tầng tổ chức.')
    if ((dto.loaiDonVi === 'DANG_UY') !== !parent) throw this.xungDot('Đảng ủy là tầng gốc; Chi bộ và Tổ phải có đơn vị cha.')
    try {
      return await this.prisma.$transaction(async (tx) => {
        if (dto.loaiDonVi === 'DANG_UY') {
          await tx.$executeRaw`LOCK TABLE "don_vi_to_chuc" IN EXCLUSIVE MODE`
          const existing = await tx.donViToChuc.findFirst({
            where: { loaiDonVi: 'DANG_UY' },
            include: { tenDonVi: { where: { ngayHieuLucDen: null }, take: 1 }, quanHeCha: true },
          })
          if (existing) {
            const matches = existing.maDinhDanh === rootUnit.code
              && existing.tenDonVi[0]?.ten === rootUnit.name && existing.quanHeCha.length === 0
            if (!matches) throw this.xungDot('Đã có Đảng ủy gốc khác cấu hình; không tạo trùng.')
            return { maDonVi: existing.ma, tenDonVi: rootUnit.name, loaiDonVi: existing.loaiDonVi, trangThai: existing.trangThai }
          }
        }
        const unit = await tx.donViToChuc.create({ data: {
          maDinhDanh: dto.loaiDonVi === 'DANG_UY' ? rootUnit.code : dto.maDinhDanh,
          loaiDonVi: dto.loaiDonVi,
          trangThai: status,
        } })
        await tx.lichSuTenDonVi.create({ data: {
          maDonVi: unit.ma, ten: dto.tenDonVi, ngayHieuLucTu: this.ngay(dto.ngayHieuLucTu), maNguoiGhiNhan: taiKhoan.maTaiKhoan,
        } })
        if (parent) await tx.lichSuQuanHeDonVi.create({ data: {
          maDonViCha: parent.ma, maDonViCon: unit.ma, ngayHieuLucTu: new Date(dto.ngayHieuLucTu), maNguoiGhiNhan: taiKhoan.maTaiKhoan,
        } })
        await this.audit(tx, taiKhoan.maTaiKhoan, unit.ma, 'TO_CHUC_TAO', undefined,
          { maDinhDanh: dto.maDinhDanh, loaiDonVi: dto.loaiDonVi, tenDonVi: dto.tenDonVi, trangThai: status }, auditContext)
        return { maDonVi: unit.ma, tenDonVi: dto.tenDonVi, loaiDonVi: unit.loaiDonVi, trangThai: unit.trangThai }
      })
    } catch (error) { this.mapDbError(error) }
  }

  async sua(taiKhoan: TaiKhoanDaXacThuc, maDonVi: string, dto: SuaDonViDto) {
    if (dto.loaiDonVi) await this.phanQuyen.kiemTra(taiKhoan.maTaiKhoan, permissions.editType, { maDonVi })
    try {
      return await this.prisma.$transaction(async (tx) => {
        const before = await tx.donViToChuc.findUnique({ where: { ma: maDonVi } })
        if (!before) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_DON_VI', thongBao: 'Không tìm thấy đơn vị.' })
        if (before.loaiDonVi === 'DANG_UY' && (dto.loaiDonVi && dto.loaiDonVi !== 'DANG_UY' || dto.maDinhDanh && dto.maDinhDanh !== rootUnit.code)) {
          throw this.xungDot('Không thể thay đổi loại hoặc mã định danh Đảng ủy gốc đã được xác định.')
        }
        const after = await tx.donViToChuc.update({ where: { ma: maDonVi }, data: {
          maDinhDanh: dto.maDinhDanh, loaiDonVi: dto.loaiDonVi,
        } })
        await this.audit(tx, taiKhoan.maTaiKhoan, maDonVi, 'TO_CHUC_SUA', { maDinhDanh: before.maDinhDanh, loaiDonVi: before.loaiDonVi }, { maDinhDanh: after.maDinhDanh, loaiDonVi: after.loaiDonVi })
        return after
      })
    } catch (error) { this.mapDbError(error) }
  }

  async capNhatTrangThai(taiKhoan: TaiKhoanDaXacThuc, maDonVi: string, dto: CapNhatTrangThaiDonViDto) {
    await this.kiemTraTrangThaiDonVi(dto.trangThai)
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.donViToChuc.findUnique({ where: { ma: maDonVi } })
      if (!before) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_DON_VI', thongBao: 'Không tìm thấy đơn vị.' })
      if (before.trangThai === dto.trangThai) return before
      const restoring = before.trangThai === 'NGUNG_HOAT_DONG' && dto.trangThai === 'DANG_HOAT_DONG'
      await this.phanQuyen.kiemTra(taiKhoan.maTaiKhoan, restoring ? permissions.restore : permissions.changeStatus, { maDonVi })
      const after = await tx.donViToChuc.update({ where: { ma: maDonVi }, data: { trangThai: dto.trangThai } })
      await this.audit(tx, taiKhoan.maTaiKhoan, maDonVi, restoring ? 'TO_CHUC_KHOI_PHUC' : 'TO_CHUC_DOI_TRANG_THAI',
        { trangThai: before.trangThai }, { trangThai: after.trangThai })
      return after
    })
  }

  async doiTen(taiKhoan: TaiKhoanDaXacThuc, maDonVi: string, dto: DoiTenDonViDto) {
    this.kiemTraThoiDiem(dto.ngayHieuLucTu)
    await this.phanQuyen.kiemTra(taiKhoan.maTaiKhoan, permissions.edit, { maDonVi })
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.lichSuTenDonVi.findFirst({ where: { maDonVi, ngayHieuLucDen: null } })
      if (!current) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_TEN_HIEN_HANH', thongBao: 'Không tìm thấy tên hiện hành.' })
      const start = this.ngay(dto.ngayHieuLucTu)
      if (start <= current.ngayHieuLucTu) throw this.xungDot('Thời điểm đổi tên phải sau ngày bắt đầu tên hiện hành.')
      await tx.lichSuTenDonVi.update({ where: { ma: current.ma }, data: { ngayHieuLucDen: start } })
      await tx.lichSuTenDonVi.create({ data: { maDonVi, ten: dto.tenDonVi, ngayHieuLucTu: start, maNguoiGhiNhan: taiKhoan.maTaiKhoan } })
      await this.audit(tx, taiKhoan.maTaiKhoan, maDonVi, 'TO_CHUC_DOI_TEN', { ten: current.ten }, { ten: dto.tenDonVi })
      return { maDonVi, tenDonVi: dto.tenDonVi, ngayHieuLucTu: start }
    })
  }

  async doiQuanHeCha(taiKhoan: TaiKhoanDaXacThuc, maDonVi: string, dto: DoiQuanHeChaDto) {
    this.kiemTraThoiDiem(dto.ngayHieuLucTu)
    await this.phanQuyen.kiemTra(taiKhoan.maTaiKhoan, permissions.changeParent, { maDonVi })
    if (dto.maDonViCha) await this.phanQuyen.kiemTra(taiKhoan.maTaiKhoan, permissions.changeParent, { maDonVi: dto.maDonViCha })
    const target = await this.prisma.donViToChuc.findUnique({ where: { ma: maDonVi } })
    if (!target) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_DON_VI', thongBao: 'Không tìm thấy đơn vị.' })
    const parent = dto.maDonViCha ? await this.prisma.donViToChuc.findUnique({ where: { ma: dto.maDonViCha } }) : null
    if (dto.maDonViCha && !parent) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_DON_VI_CHA', thongBao: 'Không tìm thấy đơn vị cha.' })
    if (!this.quanHeHopLe(target.loaiDonVi, parent?.loaiDonVi ?? null) || (target.loaiDonVi === 'DANG_UY') !== !parent) throw this.xungDot('Quan hệ cha-con không đúng tầng tổ chức.')
    if (parent && await this.laHauDueCua(maDonVi, parent.ma, new Date(dto.ngayHieuLucTu))) throw this.xungDot('Thay đổi này tạo chu trình trong cây tổ chức.')
    return this.prisma.$transaction(async (tx) => {
      const start = new Date(dto.ngayHieuLucTu)
      const old = await tx.lichSuQuanHeDonVi.findFirst({ where: { maDonViCon: maDonVi, ngayHieuLucDen: null } })
      if (old && start <= old.ngayHieuLucTu) throw this.xungDot('Thời điểm đổi cha phải sau lúc bắt đầu quan hệ hiện hành.')
      if (old) await tx.lichSuQuanHeDonVi.update({ where: { ma: old.ma }, data: { ngayHieuLucDen: start } })
      if (parent) await tx.lichSuQuanHeDonVi.create({ data: { maDonViCha: parent.ma, maDonViCon: maDonVi, ngayHieuLucTu: start, maNguoiGhiNhan: taiKhoan.maTaiKhoan } })
      await this.audit(tx, taiKhoan.maTaiKhoan, maDonVi, 'TO_CHUC_DOI_DON_VI_CHA', { maDonViCha: old?.maDonViCha }, { maDonViCha: parent?.ma ?? null })
      return { maDonVi, maDonViCha: parent?.ma ?? null, ngayHieuLucTu: start }
    })
  }

  async xoa(taiKhoan: TaiKhoanDaXacThuc, maDonVi: string) {
    await this.phanQuyen.kiemTra(taiKhoan.maTaiKhoan, permissions.delete, { maDonVi })
    try {
      return await this.prisma.$transaction(async (tx) => {
        const unit = await tx.donViToChuc.findUnique({ where: { ma: maDonVi } })
        if (!unit) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_DON_VI', thongBao: 'Không tìm thấy đơn vị.' })
        await this.audit(tx, taiKhoan.maTaiKhoan, maDonVi, 'TO_CHUC_XOA', { loaiDonVi: unit.loaiDonVi })
        await tx.donViToChuc.delete({ where: { ma: maDonVi } })
        return { daXoa: true, maDonVi }
      })
    } catch (error) { this.mapDbError(error) }
  }

  private async laHauDueCua(maTo: string, maUngVienCha: string, thoiDiem: Date) {
    const rows = await this.prisma.$queryRaw<Array<{ found: boolean }>>`
      WITH RECURSIVE to_tien(ma_don_vi) AS (
        SELECT ${maUngVienCha}::uuid
        UNION
        SELECT q.ma_don_vi_cha FROM lich_su_quan_he_don_vi q JOIN to_tien t ON q.ma_don_vi_con=t.ma_don_vi
        WHERE q.ngay_hieu_luc_tu <= ${thoiDiem} AND (q.ngay_hieu_luc_den IS NULL OR q.ngay_hieu_luc_den > ${thoiDiem})
      ) SELECT EXISTS(SELECT 1 FROM to_tien WHERE ma_don_vi=${maTo}::uuid) AS found
    `
    return rows[0]?.found === true
  }

  private quanHeHopLe(child: string, parent: string | null) {
    return (child === 'CHI_BO' && parent === 'DANG_UY') || (child === 'TO' && parent === 'CHI_BO') || (child === 'DANG_UY' && parent === null)
  }

  private async kiemTraTrangThaiDonVi(trangThai: string) {
    if (!(trangThaiDonViHopLe as readonly string[]).includes(trangThai)) {
      throw new ConflictException({
        maLoi: 'TRANG_THAI_DON_VI_KHONG_HOP_LE',
        thongBao: 'Trạng thái đơn vị không thuộc danh mục đã được xác nhận.',
      })
    }
  }

  private kiemTraThoiDiem(value: string) {
    if (new Date(value).getTime() > Date.now()) throw new ForbiddenException({ maLoi: 'KHONG_CHO_PHEP_TUONG_LAI', thongBao: 'Không cho phép nhập hiệu lực trong tương lai.' })
  }

  private ngay(value: string) { return new Date(`${value.slice(0, 10)}T00:00:00.000Z`) }
  private xungDot(message: string) { return new ConflictException({ maLoi: 'XUNG_DOT_TO_CHUC', thongBao: message }) }

  private async audit(
    tx: Prisma.TransactionClient, actor: string, target: string, action: string,
    before?: object, after?: object, context?: { lyDo?: string; maTuongQuan?: string },
  ) {
    await tx.nhatKyKiemToan.create({ data: {
      maNguoiThucHien: actor, hanhDong: action, loaiDoiTuong: 'DON_VI_TO_CHUC', maDoiTuong: target,
      ketQua: 'THANH_CONG', lyDo: context?.lyDo,
      duLieuTruoc: before as Prisma.InputJsonValue, duLieuSau: after as Prisma.InputJsonValue,
      maTuongQuan: context?.maTuongQuan ?? randomUUID(),
    } })
  }

  private mapDbError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002' || error.code === 'P2003' || error.code === 'P2004' || error.code === 'P2014') {
        throw this.xungDot('Thao tác xung đột với dữ liệu hoặc quan hệ hiện có.')
      }
    }
    throw error
  }
}
