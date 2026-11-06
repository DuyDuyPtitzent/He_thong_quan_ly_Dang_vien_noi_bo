import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { Prisma } from '../../infrastructure/database/generated/prisma/client'
import { DichVuPrisma } from '../../infrastructure/database/prisma.service'
import { BamMatKhauService } from '../auth/password-hasher'
import type { TaiKhoanDaXacThuc } from '../auth/auth.types'
import { PhanQuyenService } from '../authorization/authorization.service'
import type { DanhSachHoSoDto, SuaHoSoDto, TaoHoSoDto } from './member-profiles.dto'

const hieuLuc = (now: Date) => ({ ngayHieuLucTu: { lte: now }, OR: [{ ngayHieuLucDen: null }, { ngayHieuLucDen: { gt: now } }] })
const dateOnly = (value?: string) => value ? new Date(`${value.slice(0, 10)}T00:00:00.000Z`) : undefined

@Injectable()
export class HoSoDangVienService {
  constructor(@Inject(DichVuPrisma) private readonly prisma: DichVuPrisma, @Inject(PhanQuyenService) private readonly phanQuyen: PhanQuyenService, @Inject(BamMatKhauService) private readonly bamMatKhau: BamMatKhauService) {}

  async hoSoCuaToi(actor: TaiKhoanDaXacThuc) {
    const profile = await this.prisma.hoSoDangVien.findUnique({ where: { maTaiKhoan: actor.maTaiKhoan }, select: { ma: true } })
    if (!profile) return { hoSo: null }
    return { hoSo: await this.chiTiet(actor, profile.ma, true) }
  }

  async danhSach(actor: TaiKhoanDaXacThuc, q: DanhSachHoSoDto) {
    const access = await this.phanQuyen.layDonViTrongPhamVi(actor.maTaiKhoan, 'HO_SO_DANG_VIEN_XEM_DANH_SACH', actor.maPhien)
    if (!access.coQuyen) throw this.forbidden()
    const personalAccess = await this.phanQuyen.layDonViTrongPhamVi(actor.maTaiKhoan, 'HO_SO_CA_NHAN_XEM', actor.maPhien)
    const now = new Date()
    const where: Prisma.HoSoDangVienWhereInput = {
      ...(q.trangThaiDangVien ? { trangThaiDangVien: q.trangThaiDangVien } : {}),
      ...(q.tuKhoa ? { OR: [
        { hoVaTen: { contains: q.tuKhoa, mode: 'insensitive' } },
        { maHoSoNoiBo: { contains: q.tuKhoa, mode: 'insensitive' } },
        ...(personalAccess.coQuyen ? [{ AND: [
          { thongTinCaNhan: { is: { soCccd: { contains: q.tuKhoa } } } },
          { lichSuDonVi: { some: { AND: [hieuLuc(now), ...(personalAccess.toanHeThong ? [] : [{ OR: [{ maChiBo: { in: personalAccess.maDonVi } }, { maTo: { in: personalAccess.maDonVi } }] }])] } } },
        ] }] : []),
      ] } : {}),
      lichSuDonVi: { some: { AND: [hieuLuc(now), ...(access.toanHeThong ? [] : [{ OR: [{ maChiBo: { in: access.maDonVi } }, { maTo: { in: access.maDonVi } }] }]), ...(q.maChiBo ? [{ maChiBo: q.maChiBo }] : []), ...(q.maTo ? [{ maTo: q.maTo }] : [])] } },
    }
    // Query parameters arrive as strings unless the global ValidationPipe transforms them.
    const page = Number(q.trang ?? 1)
    const size = Number(q.gioiHan ?? 20)
    const [total, rows, statusCounts] = await Promise.all([
      this.prisma.hoSoDangVien.count({ where }),
      this.prisma.hoSoDangVien.findMany({ where, orderBy: [{ hoVaTen: 'asc' }, { ma: 'asc' }], skip: (page - 1) * size, take: size,
        select: { ma: true, maHoSoNoiBo: true, hoVaTen: true, trangThai: true, trangThaiDangVien: true, ngayVaoDang: true, thongTinCaNhan: { select: { ngaySinh: true, ...(personalAccess.coQuyen ? { soCccd: true } : {}) } }, taiKhoan: { select: { ma: true } }, lichSuDonVi: { where: hieuLuc(now), take: 1, select: { maChiBo: true, maTo: true, chiBo: { select: { maDinhDanh: true, tenDonVi: { where: hieuLuc(now), take: 1, select: { ten: true } } } }, to: { select: { maDinhDanh: true, tenDonVi: { where: hieuLuc(now), take: 1, select: { ten: true } } } } } } },
      }),
      this.prisma.hoSoDangVien.groupBy({ by: ['trangThaiDangVien'], where: { lichSuDonVi: { some: { AND: [hieuLuc(now), ...(access.toanHeThong ? [] : [{ OR: [{ maChiBo: { in: access.maDonVi } }, { maTo: { in: access.maDonVi } }] }])] } } }, _count: { _all: true } }),
    ])
    const count = (status: string) => statusCounts.find((item) => item.trangThaiDangVien === status)?._count._all ?? 0
    const data = await Promise.all(rows.map(async (r, i) => {
      const canViewPersonal = await this.coQuyen(actor, 'HO_SO_CA_NHAN_XEM', r.ma)
      return { stt: (page - 1) * size + i + 1, maHoSo: r.ma, maHoSoNoiBo: r.maHoSoNoiBo, hoVaTen: r.hoVaTen, trangThai: r.trangThai, trangThaiDangVien: r.trangThaiDangVien, ngayVaoDang: r.ngayVaoDang, ngaySinh: canViewPersonal ? r.thongTinCaNhan?.ngaySinh : null, soCccd: canViewPersonal ? r.thongTinCaNhan?.soCccd ?? null : null, coQuyenXemCaNhan: canViewPersonal, daLienKetTaiKhoan: Boolean(r.taiKhoan), chiBo: r.lichSuDonVi[0]?.chiBo.tenDonVi[0]?.ten ?? r.lichSuDonVi[0]?.chiBo.maDinhDanh ?? null, to: r.lichSuDonVi[0]?.to?.tenDonVi[0]?.ten ?? r.lichSuDonVi[0]?.to?.maDinhDanh ?? null }
    }))
    return { duLieu: data, phanTrang: { trang: page, gioiHan: size, tongSo: total }, thongKe: { tongSo: statusCounts.reduce((n, r) => n + r._count._all, 0), chinhThuc: count('CHINH_THUC'), duBi: count('DU_BI'), dangSinhHoat: total } }
  }

  async danhMucDonVi(actor: TaiKhoanDaXacThuc) {
    const access = await this.phanQuyen.layDonViTrongPhamVi(actor.maTaiKhoan, 'HO_SO_DANG_VIEN_XEM_DANH_SACH', actor.maPhien)
    if (!access.coQuyen) throw this.forbidden()
    const ids = await this.prisma.donViToChuc.findMany({ where: {
      loaiDonVi: { in: ['CHI_BO', 'TO'] }, trangThai: 'DANG_HOAT_DONG',
      ...(access.toanHeThong ? {} : { OR: [
        { ma: { in: access.maDonVi } },
        { loaiDonVi: 'TO', quanHeCon: { some: { maDonViCha: { in: access.maDonVi }, ngayHieuLucDen: null } } },
      ] }),
    }, select: { ma: true, maDinhDanh: true, loaiDonVi: true, tenDonVi: { where: { ngayHieuLucDen: null }, take: 1, select: { ten: true } }, quanHeCon: { where: { ngayHieuLucDen: null }, take: 1, select: { maDonViCha: true } } } })
    return ids.map((u) => ({ ma: u.ma, maDinhDanh: u.maDinhDanh, loaiDonVi: u.loaiDonVi, ten: u.tenDonVi[0]?.ten ?? u.maDinhDanh, maChiBo: u.loaiDonVi === 'CHI_BO' ? u.ma : u.quanHeCon[0]?.maDonViCha ?? null }))
  }

  async chiTiet(actor: TaiKhoanDaXacThuc, id: string, hoSoCuaChinhTaiKhoan = false) {
    await this.phanQuyen.kiemTra(
      actor.maTaiKhoan,
      hoSoCuaChinhTaiKhoan ? 'HO_SO_CA_NHAN_XEM' : 'HO_SO_DANG_VIEN_XEM_TONG_QUAN',
      { maHoSo: id },
      actor.maPhien,
    )
    const personal = await this.coQuyen(actor, 'HO_SO_CA_NHAN_XEM', id) || await this.coQuyen(actor, 'HO_SO_CA_NHAN_SUA', id)
    const address = await this.coQuyen(actor, 'HO_SO_DIA_CHI_XEM', id) || await this.coQuyen(actor, 'HO_SO_DIA_CHI_SUA', id)
    const student = await this.coQuyen(actor, 'HO_SO_SINH_VIEN_XEM', id) || await this.coQuyen(actor, 'HO_SO_SINH_VIEN_SUA', id)
    const currentMembership = await this.coQuyen(actor, 'SINH_HOAT_XEM_HIEN_TAI', id)
    const row = await this.prisma.hoSoDangVien.findUnique({ where: { ma: id }, select: {
      ma: true, maHoSoNoiBo: true, soPhieuLyLich: true, soTheDangVien: true, khoaDangVien: true, hoVaTen: true, trangThai: true, trangThaiDangVien: true, ngayVaoDang: true, ngayChinhThuc: true,
      thongTinCaNhan: personal ? { select: { ngaySinh: true, gioiTinh: true, soCccd: true, ngayCapCccd: true, noiCapCccd: true, quocTich: true, danToc: true, tonGiao: true, soDienThoai: true, emailLienHe: true } } : false,
      diaChi: address ? { select: { loaiDiaChi: true, phanLoaiNoiSinh: true, quocGia: true, tinhThanhPho: true, quanHuyen: true, xaPhuong: true, diaChiChiTiet: true } } : false,
      thongTinSinhVien: student ? { select: { maSinhVien: true, trangThaiHocTap: true, khoaHoc: true, donViPhuTrach: true, chuongTrinhDaoTao: true, nganh: true, chuyenNganh: true, lopHanhChinh: true } } : false,
      quaTrinh: { where: { loaiSuKien: 'VAO_DANG_DU_BI' }, orderBy: { ngaySuKien: 'asc' }, take: 1, select: { soQuyetDinh: true, ngayQuyetDinh: true, donViBanHanhQuyetDinh: true, nguoiGioiThieuThuNhat: true, nguoiGioiThieuThuHai: true } },
      lichSuDonVi: currentMembership ? { where: hieuLuc(new Date()), take: 2, select: {
        maChiBo: true, maTo: true, ngayHieuLucTu: true,
        chiBo: { select: { maDinhDanh: true, loaiDonVi: true, trangThai: true, tenDonVi: { where: hieuLuc(new Date()), take: 1, select: { ten: true } } } },
        to: { select: { maDinhDanh: true, tenDonVi: { where: hieuLuc(new Date()), take: 1, select: { ten: true } } } },
      } } : false,
    } })
    if (!row) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_HO_SO', thongBao: 'Không tìm thấy hồ sơ Đảng viên.' })
    const foundMemberships = (Array.isArray(row.lichSuDonVi) ? row.lichSuDonVi : []) as unknown as {
      ma: string; maChiBo: string; maTo: string | null
      chiBo: { maDinhDanh: string | null; loaiDonVi: string; trangThai: string; tenDonVi: { ten: string }[] }
    }[]
    const memberships = foundMemberships.length === 1 ? foundMemberships : []
    const current = memberships[0]
    let tenDangUy: string | null = null
    if (currentMembership && current) {
      const now = new Date()
      const parents = await this.prisma.lichSuQuanHeDonVi.findMany({ where: { maDonViCon: current.maChiBo, ...hieuLuc(now) }, take: 2, select: { donViCha: { select: { maDinhDanh: true, loaiDonVi: true, trangThai: true, tenDonVi: { where: hieuLuc(now), take: 1, select: { ten: true } } } } } })
      const firstParent = parents[0]
      const parent = parents.length === 1 && firstParent ? firstParent.donViCha : null
      if (current.chiBo.loaiDonVi === 'CHI_BO' && current.chiBo.trangThai === 'DANG_HOAT_DONG' && parent?.loaiDonVi === 'DANG_UY' && parent.trangThai === 'DANG_HOAT_DONG') tenDangUy = parent.tenDonVi[0]?.ten ?? parent.maDinhDanh
    }
    return { ...row, lichSuDonVi: memberships.map((membership) => ({ ...membership, tenDangUy: membership.ma === current?.ma ? tenDangUy : null })) }
  }

  async lichSuSinhHoat(actor: TaiKhoanDaXacThuc, id: string) {
    await this.phanQuyen.kiemTra(actor.maTaiKhoan, 'SINH_HOAT_XEM_LICH_SU', { maHoSo: id }, actor.maPhien)
    const coQuyenXemHienTai = await this.coQuyen(actor, 'SINH_HOAT_XEM_HIEN_TAI', id)
    const rows = await this.prisma.lichSuDonViDangVien.findMany({
      where: { maHoSo: id }, orderBy: [{ ngayHieuLucTu: 'desc' }, { ngayTao: 'desc' }],
      select: {
        ma: true, ngayHieuLucTu: true, ngayHieuLucDen: true, lyDoChuyen: true,
        chiBo: { select: {
          maDinhDanh: true,
          tenDonVi: { select: { ten: true, ngayHieuLucTu: true, ngayHieuLucDen: true } },
          quanHeCon: { select: { ngayHieuLucTu: true, ngayHieuLucDen: true, donViCha: { select: {
            loaiDonVi: true, maDinhDanh: true,
            tenDonVi: { select: { ten: true, ngayHieuLucTu: true, ngayHieuLucDen: true } },
          } } } },
        } },
        to: { select: { maDinhDanh: true, tenDonVi: { select: { ten: true, ngayHieuLucTu: true, ngayHieuLucDen: true } } } },
      },
    })
    const tenTaiThoiDiem = (versions: { ten: string; ngayHieuLucTu: Date; ngayHieuLucDen: Date | null }[], instant: Date) =>
      versions.find((version) => version.ngayHieuLucTu <= instant && (!version.ngayHieuLucDen || version.ngayHieuLucDen > instant))?.ten
    const lichSu = rows.map((row) => {
      const parent = row.chiBo.quanHeCon.find((relation) => relation.ngayHieuLucTu <= row.ngayHieuLucTu && (!relation.ngayHieuLucDen || relation.ngayHieuLucDen > row.ngayHieuLucTu))?.donViCha
      return {
        ma: row.ma, ngayHieuLucTu: row.ngayHieuLucTu, ngayHieuLucDen: row.ngayHieuLucDen, lyDoChuyen: row.lyDoChuyen,
        tenDangUy: parent?.loaiDonVi === 'DANG_UY' ? tenTaiThoiDiem(parent.tenDonVi, row.ngayHieuLucTu) ?? parent.maDinhDanh : null,
        tenChiBo: tenTaiThoiDiem(row.chiBo.tenDonVi, row.ngayHieuLucTu) ?? row.chiBo.maDinhDanh,
        tenTo: row.to ? tenTaiThoiDiem(row.to.tenDonVi, row.ngayHieuLucTu) ?? row.to.maDinhDanh : null,
      }
    })
    const now = new Date()
    const donViHienTai = lichSu.find((item) => item.ngayHieuLucTu <= now && (!item.ngayHieuLucDen || item.ngayHieuLucDen > now)) ?? null
    return {
      donViHienTai: coQuyenXemHienTai ? donViHienTai : null,
      lichSu: coQuyenXemHienTai ? lichSu : lichSu.filter((item) => item.ma !== donViHienTai?.ma),
    }
  }

  async quaTrinhDang(actor: TaiKhoanDaXacThuc, id: string) {
    await this.phanQuyen.kiemTra(actor.maTaiKhoan, 'QUA_TRINH_DANG_XEM', { maHoSo: id }, actor.maPhien)
    return this.prisma.quaTrinhDangVien.findMany({
      where: { maHoSo: id }, orderBy: [{ ngaySuKien: 'desc' }, { ngayTao: 'desc' }],
      select: {
        ma: true, loaiSuKien: true, ngaySuKien: true, soQuyetDinh: true, ngayQuyetDinh: true,
        donViBanHanhQuyetDinh: true, nguoiGioiThieuThuNhat: true, nguoiGioiThieuThuHai: true,
        moTa: true, nguoiGhiNhan: { select: { tenDangNhap: true } },
      },
    })
  }

  async phanCongChucVu(actor: TaiKhoanDaXacThuc, id: string) {
    await this.phanQuyen.kiemTra(actor.maTaiKhoan, 'PHAN_CONG_CHUC_VU_XEM', { maHoSo: id }, actor.maPhien)
    const rows = await this.prisma.phanCongChucVu.findMany({
      where: { maHoSo: id }, orderBy: [{ ngayHieuLucTu: 'desc' }, { ngayTao: 'desc' }],
      select: {
        ma: true, ngayHieuLucTu: true, ngayHieuLucDen: true, soQuyetDinh: true, ghiChu: true,
        chucVu: { select: { ten: true } },
        donVi: { select: { maDinhDanh: true, tenDonVi: { select: { ten: true, ngayHieuLucTu: true, ngayHieuLucDen: true } } } },
        nhiemKy: { select: { ten: true, ngayBatDau: true, ngayKetThuc: true } },
      },
    })
    const tenTaiThoiDiem = (versions: { ten: string; ngayHieuLucTu: Date; ngayHieuLucDen: Date | null }[], instant: Date) =>
      versions.find((version) => version.ngayHieuLucTu <= instant && (!version.ngayHieuLucDen || version.ngayHieuLucDen > instant))?.ten
    const now = new Date()
    return rows.map((row) => {
      const startsAt = row.nhiemKy && row.nhiemKy.ngayBatDau > row.ngayHieuLucTu ? row.nhiemKy.ngayBatDau : row.ngayHieuLucTu
      const endsAt = [row.ngayHieuLucDen, row.nhiemKy?.ngayKetThuc].filter((date): date is Date => Boolean(date)).sort((a, b) => a.getTime() - b.getTime())[0] ?? null
      return {
        ma: row.ma, tenChucVu: row.chucVu.ten,
        tenDonVi: tenTaiThoiDiem(row.donVi.tenDonVi, row.ngayHieuLucTu) ?? row.donVi.maDinhDanh,
        nhiemKy: row.nhiemKy, ngayHieuLucTu: row.ngayHieuLucTu, ngayHieuLucDen: row.ngayHieuLucDen,
        trangThai: startsAt > now ? 'SAP_HIEU_LUC' : endsAt && endsAt <= now ? 'DA_KET_THUC' : 'DANG_HIEU_LUC',
        soQuyetDinh: row.soQuyetDinh, ghiChu: row.ghiChu,
      }
    })
  }

  async lichSuThayDoi(actor: TaiKhoanDaXacThuc, id: string) {
    await this.phanQuyen.kiemTra(actor.maTaiKhoan, 'HO_SO_XEM_LICH_SU_THAY_DOI', { maHoSo: id }, actor.maPhien)
    const rows = await this.prisma.nhatKyKiemToan.findMany({
      where: { loaiDoiTuong: 'HO_SO_DANG_VIEN', maDoiTuong: id }, orderBy: { thoiDiem: 'desc' }, take: 100,
      select: { hanhDong: true, ketQua: true, lyDo: true, duLieuTruoc: true, duLieuSau: true, thoiDiem: true, nguoiThucHien: { select: { tenDangNhap: true } } },
    })
    const safeFields = new Set(['maHoSoNoiBo', 'soPhieuLyLich', 'soTheDangVien', 'khoaDangVien', 'hoVaTen', 'trangThai', 'trangThaiDangVien', 'ngayVaoDang'])
    const locDuLieu = (data: Prisma.JsonValue | null) => {
      if (!data || typeof data !== 'object' || Array.isArray(data)) return null
      return Object.fromEntries(Object.entries(data).filter(([key]) => safeFields.has(key)))
    }
    return rows.map((row) => ({
      hanhDong: row.hanhDong, ketQua: row.ketQua, lyDo: row.lyDo, thoiDiem: row.thoiDiem,
      nguoiThucHien: row.nguoiThucHien?.tenDangNhap ?? 'Tài khoản đã ngừng hoạt động',
      duLieuTruoc: locDuLieu(row.duLieuTruoc), duLieuSau: locDuLieu(row.duLieuSau),
    }))
  }

  async tao(actor: TaiKhoanDaXacThuc, dto: TaoHoSoDto, ip: string | null) {
    await this.phanQuyen.kiemTra(actor.maTaiKhoan, 'HO_SO_DANG_VIEN_TAO', { maDonVi: dto.maChiBo }, actor.maPhien)
    if (dto.taiKhoanMoi) {
      await this.phanQuyen.kiemTra(actor.maTaiKhoan, 'TAI_KHOAN_TAO', {}, actor.maPhien)
      await this.phanQuyen.kiemTra(actor.maTaiKhoan, 'TAI_KHOAN_LIEN_KET_HO_SO', { maDonVi: dto.maChiBo }, actor.maPhien)
    }
    const donVi = await this.kiemTraDonVi(dto.maChiBo, dto.maTo)
    const hash = dto.taiKhoanMoi ? await this.bamMatKhau.tao(dto.taiKhoanMoi.matKhau) : undefined
    const soCccd = dto.soCccd?.trim()
    try {
      return await this.prisma.$transaction(async (tx) => {
        const profile = await tx.hoSoDangVien.create({ data: { maHoSoNoiBo: dto.maHoSoNoiBo.trim(), soPhieuLyLich: dto.soPhieuLyLich?.trim() || null, soTheDangVien: dto.soTheDangVien?.trim() || null, khoaDangVien: dto.khoaDangVien?.trim() || null, hoVaTen: dto.hoVaTen.trim(), trangThai: dto.trangThai, trangThaiDangVien: dto.trangThaiDangVien, ngayVaoDang: dateOnly(dto.ngayVaoDang), ngayChinhThuc: dateOnly(dto.ngayChinhThuc),
          thongTinCaNhan: { create: { ngaySinh: dateOnly(dto.ngaySinh), gioiTinh: dto.gioiTinh, soCccd, ngayCapCccd: dateOnly(dto.ngayCapCccd), noiCapCccd: dto.noiCapCccd, quocTich: dto.quocTich, danToc: dto.danToc, tonGiao: dto.tonGiao, soDienThoai: dto.soDienThoai, emailLienHe: dto.emailLienHe } },
          diaChi: { create: (dto.diaChi ?? []).map((a) => ({ loaiDiaChi: a.loaiDiaChi, phanLoaiNoiSinh: a.phanLoaiNoiSinh as never, quocGia: a.quocGia, tinhThanhPho: a.tinhThanhPho, quanHuyen: a.quanHuyen, xaPhuong: a.xaPhuong, diaChiChiTiet: a.diaChiChiTiet })) },
          ...(dto.thongTinSinhVien ? { thongTinSinhVien: { create: dto.thongTinSinhVien } } : {}),
          ...(dto.ngayVaoDang ? { quaTrinh: { create: { loaiSuKien: 'VAO_DANG_DU_BI', ngaySuKien: dateOnly(dto.ngayVaoDang)!, soQuyetDinh: dto.soQuyetDinhKetNap?.trim(), ngayQuyetDinh: dateOnly(dto.ngayQuyetDinhKetNap), donViBanHanhQuyetDinh: dto.donViBanHanhQuyetDinh?.trim(), nguoiGioiThieuThuNhat: dto.nguoiGioiThieuThuNhat?.trim(), nguoiGioiThieuThuHai: dto.nguoiGioiThieuThuHai?.trim(), maNguoiGhiNhan: actor.maTaiKhoan } } } : {}),
        }, select: { ma: true, maHoSoNoiBo: true, hoVaTen: true } })
        await tx.lichSuDonViDangVien.create({ data: { maHoSo: profile.ma, maChiBo: donVi.chiBo, maTo: donVi.to, ngayHieuLucTu: dateOnly(dto.ngaySinhHoatTu)!, maNguoiGhiNhan: actor.maTaiKhoan } })
        let account: { ma: string; tenDangNhap: string } | undefined
        if (dto.taiKhoanMoi && hash) account = await tx.taiKhoanNguoiDung.create({ data: { tenDangNhap: dto.taiKhoanMoi.tenDangNhap.trim(), email: dto.taiKhoanMoi.email?.trim(), matKhauBam: hash, trangThai: 'DANG_HOAT_DONG', doiMatKhauLanDau: false, hoSoDangVien: { connect: { ma: profile.ma } } }, select: { ma: true, tenDangNhap: true } })
        await this.audit(tx, actor, profile.ma, 'HO_SO_DANG_VIEN_TAO', ip, undefined, { maHoSoNoiBo: profile.maHoSoNoiBo, soPhieuLyLich: dto.soPhieuLyLich?.trim() || null, soTheDangVien: dto.soTheDangVien?.trim() || null, khoaDangVien: dto.khoaDangVien?.trim() || null, trangThaiDangVien: dto.trangThaiDangVien, coTaiKhoan: Boolean(account) })
        if (account) await this.audit(tx, actor, account.ma, 'TAI_KHOAN_TAO_KEM_HO_SO', ip, undefined, { tenDangNhap: account.tenDangNhap, maHoSo: profile.ma })
        return { ...profile, taiKhoan: account ? { tenDangNhap: account.tenDangNhap } : null }
      })
    } catch (e) { return this.mapError(e, { maHoSoNoiBo: dto.maHoSoNoiBo, soPhieuLyLich: dto.soPhieuLyLich, soTheDangVien: dto.soTheDangVien, maSinhVien: dto.thongTinSinhVien?.maSinhVien, soCccd, tenDangNhap: dto.taiKhoanMoi?.tenDangNhap, emailTaiKhoan: dto.taiKhoanMoi?.email }) }
  }

  async sua(actor: TaiKhoanDaXacThuc, id: string, dto: SuaHoSoDto, ip: string | null) {
    await this.phanQuyen.kiemTra(actor.maTaiKhoan, 'HO_SO_DANG_VIEN_SUA_THONG_TIN_CO_BAN', { maHoSo: id }, actor.maPhien)
    if (['ngaySinh','gioiTinh','soCccd','ngayCapCccd','noiCapCccd','quocTich','danToc','tonGiao','soDienThoai','emailLienHe'].some((key) => Object.hasOwn(dto, key))) await this.phanQuyen.kiemTra(actor.maTaiKhoan, 'HO_SO_CA_NHAN_SUA', { maHoSo: id }, actor.maPhien)
    if (Object.hasOwn(dto, 'diaChi')) await this.phanQuyen.kiemTra(actor.maTaiKhoan, 'HO_SO_DIA_CHI_SUA', { maHoSo: id }, actor.maPhien)
    if (Object.hasOwn(dto, 'thongTinSinhVien')) await this.phanQuyen.kiemTra(actor.maTaiKhoan, 'HO_SO_SINH_VIEN_SUA', { maHoSo: id }, actor.maPhien)
    const before = await this.prisma.hoSoDangVien.findUnique({ where: { ma: id }, select: { ma: true, maHoSoNoiBo: true, soPhieuLyLich: true, soTheDangVien: true, khoaDangVien: true, hoVaTen: true, trangThai: true, trangThaiDangVien: true, ngayVaoDang: true } })
    if (!before) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_HO_SO', thongBao: 'Không tìm thấy hồ sơ Đảng viên.' })
    if (dto.soCccd !== undefined) {
      await this.phanQuyen.kiemTra(actor.maTaiKhoan, 'HO_SO_CA_NHAN_SUA', { maHoSo: id }, actor.maPhien)
      if (!dto.soCccd) throw new ConflictException({ maLoi: 'KHONG_HO_TRO_XOA_CCCD', thongBao: 'Không thể xóa CCCD qua biểu mẫu này.' })
    }
    try { return await this.prisma.$transaction(async (tx) => {
      const caNhan = { ngaySinh: dateOnly(dto.ngaySinh), gioiTinh: dto.gioiTinh, soCccd: dto.soCccd?.trim(), ngayCapCccd: dateOnly(dto.ngayCapCccd), noiCapCccd: dto.noiCapCccd, quocTich: dto.quocTich, danToc: dto.danToc, tonGiao: dto.tonGiao, soDienThoai: dto.soDienThoai, emailLienHe: dto.emailLienHe }
      const updated = await tx.hoSoDangVien.update({ where: { ma: id }, data: { maHoSoNoiBo: dto.maHoSoNoiBo?.trim(), soPhieuLyLich: dto.soPhieuLyLich === undefined ? undefined : dto.soPhieuLyLich.trim() || null, soTheDangVien: dto.soTheDangVien === undefined ? undefined : dto.soTheDangVien.trim() || null, khoaDangVien: dto.khoaDangVien === undefined ? undefined : dto.khoaDangVien.trim() || null, hoVaTen: dto.hoVaTen?.trim(), trangThai: dto.trangThai, trangThaiDangVien: dto.trangThaiDangVien, ngayVaoDang: dto.ngayVaoDang === undefined ? undefined : dateOnly(dto.ngayVaoDang), ngayChinhThuc: dto.ngayChinhThuc === undefined ? undefined : dateOnly(dto.ngayChinhThuc), thongTinCaNhan: { upsert: { create: caNhan, update: caNhan } }, thongTinSinhVien: dto.thongTinSinhVien ? { upsert: { create: dto.thongTinSinhVien, update: dto.thongTinSinhVien } } : dto.thongTinSinhVien === null ? { delete: true } : undefined }, select: { ma: true, maHoSoNoiBo: true, soPhieuLyLich: true, soTheDangVien: true, khoaDangVien: true, hoVaTen: true } })
      if (dto.diaChi) for (const a of dto.diaChi) await tx.diaChiDangVien.upsert({ where: { maHoSo_loaiDiaChi: { maHoSo: id, loaiDiaChi: a.loaiDiaChi as never } }, create: { maHoSo: id, loaiDiaChi: a.loaiDiaChi as never, phanLoaiNoiSinh: a.phanLoaiNoiSinh as never, quocGia: a.quocGia, tinhThanhPho: a.tinhThanhPho, quanHuyen: a.quanHuyen, xaPhuong: a.xaPhuong, diaChiChiTiet: a.diaChiChiTiet }, update: { phanLoaiNoiSinh: a.phanLoaiNoiSinh as never, quocGia: a.quocGia, tinhThanhPho: a.tinhThanhPho, quanHuyen: a.quanHuyen, xaPhuong: a.xaPhuong, diaChiChiTiet: a.diaChiChiTiet } })
      if (dto.ngayVaoDang !== undefined && dto.ngayVaoDang !== before.ngayVaoDang?.toISOString().slice(0, 10)) await tx.quaTrinhDangVien.create({ data: { maHoSo: id, loaiSuKien: 'VAO_DANG_DU_BI', ngaySuKien: dateOnly(dto.ngayVaoDang)!, maNguoiGhiNhan: actor.maTaiKhoan } })
      await this.audit(tx, actor, id, 'HO_SO_DANG_VIEN_SUA', ip, before, { maHoSoNoiBo: updated.maHoSoNoiBo, soPhieuLyLich: updated.soPhieuLyLich, soTheDangVien: updated.soTheDangVien, khoaDangVien: updated.khoaDangVien, hoVaTen: updated.hoVaTen, trangThai: dto.trangThai, trangThaiDangVien: dto.trangThaiDangVien, ngayVaoDang: dto.ngayVaoDang ?? null })
      return updated
    }) } catch (e) { return this.mapError(e, { maHoSoNoiBo: dto.maHoSoNoiBo, soPhieuLyLich: dto.soPhieuLyLich, soTheDangVien: dto.soTheDangVien, maSinhVien: dto.thongTinSinhVien?.maSinhVien ?? undefined, soCccd: dto.soCccd?.trim() }) }
  }

  private async kiemTraDonVi(maChiBo: string, maTo?: string) {
    const branch = await this.prisma.donViToChuc.findUnique({ where: { ma: maChiBo }, select: { ma: true, loaiDonVi: true, trangThai: true } })
    if (!branch || branch.loaiDonVi !== 'CHI_BO' || branch.trangThai !== 'DANG_HOAT_DONG') throw new ConflictException({ maLoi: 'CHI_BO_KHONG_HOP_LE', thongBao: 'Chi bộ không hợp lệ hoặc chưa hoạt động.' })
    if (!maTo) return { chiBo: maChiBo, to: undefined }
    const unit = await this.prisma.donViToChuc.findUnique({ where: { ma: maTo }, select: { ma: true, loaiDonVi: true, trangThai: true, quanHeCon: { where: { ngayHieuLucDen: null }, take: 1, select: { maDonViCha: true } } } })
    if (!unit || unit.loaiDonVi !== 'TO' || unit.trangThai !== 'DANG_HOAT_DONG' || unit.quanHeCon[0]?.maDonViCha !== maChiBo) throw new ConflictException({ maLoi: 'TO_KHONG_THUOC_CHI_BO', thongBao: 'Tổ phải trực thuộc Chi bộ đã chọn.' })
    return { chiBo: maChiBo, to: maTo }
  }
  private async coQuyen(actor: TaiKhoanDaXacThuc, permission: string, id: string) {
    try { await this.phanQuyen.kiemTra(actor.maTaiKhoan, permission, { maHoSo: id }, actor.maPhien); return true }
    catch (error) { if (error instanceof ForbiddenException) return false; throw error }
  }
  private async audit(tx: Prisma.TransactionClient, actor: TaiKhoanDaXacThuc, target: string, action: string, ip: string | null, before?: object, after?: object) { await tx.nhatKyKiemToan.create({ data: { maNguoiThucHien: actor.maTaiKhoan, hanhDong: action, loaiDoiTuong: 'HO_SO_DANG_VIEN', maDoiTuong: target, ketQua: 'THANH_CONG', duLieuTruoc: before as Prisma.InputJsonValue, duLieuSau: after as Prisma.InputJsonValue, maTuongQuan: randomUUID(), diaChiIp: ip } }) }
  private async mapError(e: unknown, fields: { maHoSoNoiBo?: string; soPhieuLyLich?: string; soTheDangVien?: string; maSinhVien?: string; soCccd?: string; tenDangNhap?: string; emailTaiKhoan?: string }): Promise<never> {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      let field: string | undefined
      try {
        if (fields.soCccd && await this.prisma.thongTinCaNhanDangVien.findUnique({ where: { soCccd: fields.soCccd }, select: { maHoSo: true } })) field = 'soCccd'
        else if (fields.soPhieuLyLich && await this.prisma.hoSoDangVien.findUnique({ where: { soPhieuLyLich: fields.soPhieuLyLich }, select: { ma: true } })) field = 'soPhieuLyLich'
        else if (fields.soTheDangVien && await this.prisma.hoSoDangVien.findUnique({ where: { soTheDangVien: fields.soTheDangVien }, select: { ma: true } })) field = 'soTheDangVien'
        else if (fields.maSinhVien && await this.prisma.thongTinSinhVien.findUnique({ where: { maSinhVien: fields.maSinhVien }, select: { maHoSo: true } })) field = 'thongTinSinhVien.maSinhVien'
        else if (fields.tenDangNhap && await this.prisma.taiKhoanNguoiDung.findUnique({ where: { tenDangNhap: fields.tenDangNhap }, select: { ma: true } })) field = 'taiKhoanMoi.tenDangNhap'
        else if (fields.emailTaiKhoan && await this.prisma.taiKhoanNguoiDung.findUnique({ where: { email: fields.emailTaiKhoan }, select: { ma: true } })) field = 'taiKhoanMoi.email'
        else if (fields.maHoSoNoiBo && await this.prisma.hoSoDangVien.findUnique({ where: { maHoSoNoiBo: fields.maHoSoNoiBo }, select: { ma: true } })) field = 'maHoSoNoiBo'
      } catch { /* Keep a safe general conflict message if the follow-up lookup fails. */ }
      throw new ConflictException({
        maLoi: 'DU_LIEU_DA_TON_TAI',
        thongBao: 'CCCD, số phiếu lý lịch, số thẻ Đảng viên, mã hồ sơ, mã sinh viên hoặc tên đăng nhập đã được sử dụng.',
        ...(field ? { chiTietLoi: [{ tenTruong: field, maLoi: ['unique'] }] } : {}),
      })
    }
    throw e
  }
  private forbidden() { return new ForbiddenException({ maLoi: 'KHONG_DU_QUYEN', thongBao: 'Không đủ quyền hoặc phạm vi để thực hiện thao tác này.' }) }
}
