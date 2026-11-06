import 'dotenv/config'
import { randomUUID } from 'node:crypto'
import type { INestApplication } from '@nestjs/common'
import { ForbiddenException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/infrastructure/database/generated/prisma/client'
import { cauHinhUngDung } from '../src/app.config'
import { XacThucGuard } from '../src/modules/auth/auth.guard'
import { PhanQuyenGuard } from '../src/modules/authorization/authorization.guard'
import { BamMatKhauService } from '../src/modules/auth/password-hasher'
import { HoSoDangVienController } from '../src/modules/member-profiles/member-profiles.controller'
import { HoSoDangVienService } from '../src/modules/member-profiles/member-profiles.service'
import { YeuCauCapNhatHoSoService } from '../src/modules/member-profiles/member-profile-updates.service'

const integrationEnabled = process.env.CHAY_KIEM_THU_POSTGRES === '1'
const integration = integrationEnabled ? describe : describe.skip

async function donDuLieuThuNghiem(prisma: PrismaClient, accountIds: string[]) {
  if (!accountIds.length) return
  const auditRows = await prisma.nhatKyKiemToan.findMany({
    where: { maNguoiThucHien: { in: accountIds }, hanhDong: 'HO_SO_DANG_VIEN_TAO' },
    select: { maDoiTuong: true },
  })
  const profileIds = auditRows.flatMap(({ maDoiTuong }) => maDoiTuong ? [maDoiTuong] : [])
  const profiles = profileIds.length ? await prisma.hoSoDangVien.findMany({
    where: { ma: { in: profileIds } }, select: { ma: true, maTaiKhoan: true },
  }) : []
  const ids = profiles.map(({ ma }) => ma)
  const history = ids.length ? await prisma.lichSuDonViDangVien.findMany({
    where: { maHoSo: { in: ids } }, select: { maChiBo: true, maTo: true },
  }) : []
  const units = [...new Set(history.flatMap(({ maChiBo, maTo }) => [maChiBo, ...(maTo ? [maTo] : [])]))]
  await prisma.$transaction(async (tx) => {
    if (ids.length) {
      await tx.yeuCauCapNhatHoSo.deleteMany({ where: { maHoSo: { in: ids } } })
      await tx.lichSuDonViDangVien.deleteMany({ where: { maHoSo: { in: ids } } })
      await tx.quaTrinhDangVien.deleteMany({ where: { maHoSo: { in: ids } } })
      await tx.diaChiDangVien.deleteMany({ where: { maHoSo: { in: ids } } })
      await tx.thongTinSinhVien.deleteMany({ where: { maHoSo: { in: ids } } })
      await tx.thongTinCaNhanDangVien.deleteMany({ where: { maHoSo: { in: ids } } })
      await tx.hoSoDangVien.deleteMany({ where: { ma: { in: ids } } })
    }
    await tx.dotCapNhatHoSo.deleteMany({ where: { maNguoiTao: { in: accountIds } } })
    const linkedAccountIds = profiles.flatMap(({ maTaiKhoan }) => maTaiKhoan ? [maTaiKhoan] : [])
    if (linkedAccountIds.length) await tx.taiKhoanNguoiDung.deleteMany({ where: { ma: { in: linkedAccountIds } } })
    if (units.length) await tx.donViToChuc.deleteMany({ where: { ma: { in: units } } })
    await tx.taiKhoanNguoiDung.updateMany({ where: { ma: { in: accountIds } }, data: { trangThai: 'NGUNG_HOAT_DONG' } })
  })
}

integration('HoSoDangVienService với PostgreSQL phát triển', () => {
  const maThuNghiem = `KT-${randomUUID()}`
  const tenDangNhapGoc = `kt-${randomUUID()}`
  let prisma: PrismaClient
  let actorId: string
  let branchId: string
  let service: HoSoDangVienService
  let updateService: YeuCauCapNhatHoSoService
  let app: INestApplication
  let permissionCheck: ReturnType<typeof vi.fn>
  let fixturesCreated = false
  let rejectionRequesterId: string | undefined

  beforeAll(async () => {
    const connectionString = process.env.KET_NOI_CO_SO_DU_LIEU
    if (!connectionString) throw new Error('Thiếu KET_NOI_CO_SO_DU_LIEU cho kiểm thử tích hợp.')
    prisma = new PrismaClient({ adapter: new PrismaPg(connectionString) })
    const priorFixtures = await prisma.taiKhoanNguoiDung.findMany({ where: { matKhauBam: 'chi-dung-trong-kiem-thu' }, select: { ma: true } })
    await donDuLieuThuNghiem(prisma, priorFixtures.map(({ ma }) => ma))
    actorId = priorFixtures[0]?.ma ?? (await prisma.taiKhoanNguoiDung.create({ data: {
      tenDangNhap: `kiem-thu-${randomUUID()}`, matKhauBam: 'chi-dung-trong-kiem-thu', trangThai: 'NGUNG_HOAT_DONG', doiMatKhauLanDau: false,
    }, select: { ma: true } })).ma
    const branch = await prisma.donViToChuc.create({ data: { maDinhDanh: maThuNghiem, loaiDonVi: 'CHI_BO', trangThai: 'DANG_HOAT_DONG' }, select: { ma: true } })
    branchId = branch.ma
    fixturesCreated = true
    permissionCheck = vi.fn(async () => undefined)
    const permissions = {
      kiemTra: permissionCheck,
      layDonViTrongPhamVi: async () => ({ coQuyen: true, toanHeThong: true, maDonVi: [] }),
    }
    service = new HoSoDangVienService(prisma as never, permissions as never, new BamMatKhauService())
    updateService = new YeuCauCapNhatHoSoService(prisma as never, permissions as never, { get: () => './storage/private' } as never)
    const testingModule = await Test.createTestingModule({
      controllers: [HoSoDangVienController],
      providers: [
        { provide: HoSoDangVienService, useValue: service },
        { provide: YeuCauCapNhatHoSoService, useValue: updateService },
      ],
    })
      .overrideGuard(XacThucGuard)
      .useValue({ canActivate: (context: { switchToHttp: () => { getRequest: () => { taiKhoanDaXacThuc?: unknown } } }) => {
        context.switchToHttp().getRequest().taiKhoanDaXacThuc = actor()
        return true
      } })
      .overrideGuard(PhanQuyenGuard)
      .useValue({ canActivate: () => true })
      .compile()
    app = testingModule.createNestApplication()
    cauHinhUngDung(app)
    await app.init()
  })

  afterAll(async () => {
    if (!prisma) return
    await app?.close()
    if (!fixturesCreated) {
      await prisma.$disconnect()
      return
    }
    await donDuLieuThuNghiem(prisma, actorId ? [actorId] : [])
    if (rejectionRequesterId) await prisma.taiKhoanNguoiDung.deleteMany({ where: { ma: rejectionRequesterId } })
    await prisma.taiKhoanNguoiDung.deleteMany({ where: { tenDangNhap: `${tenDangNhapGoc}-linked` } })
    await prisma.$disconnect()
  })

  const payload = (suffix: string) => ({
    maHoSoNoiBo: `${maThuNghiem}-${suffix}`,
    hoVaTen: 'Hồ sơ kiểm thử tự động',
    trangThai: 'DANG_HOAT_DONG',
    trangThaiDangVien: 'DU_BI',
    maChiBo: branchId,
    ngaySinhHoatTu: '2024-01-15',
  })
  const actor = () => ({ maTaiKhoan: actorId, maPhien: 'kiem-thu' })

  it('ghi hồ sơ và lịch sử sinh hoạt vào CSDL khi không tạo tài khoản', async () => {
    const result = await service.tao(actor() as never, payload('A') as never, null)
    const saved = await prisma.hoSoDangVien.findUnique({ where: { maHoSoNoiBo: `${maThuNghiem}-A` }, include: { lichSuDonVi: true, thongTinCaNhan: true } })

    expect(result.ma).toBe(saved?.ma)
    expect(saved?.thongTinCaNhan).toBeTruthy()
    expect(saved?.lichSuDonVi).toHaveLength(1)
    expect(saved?.lichSuDonVi[0].ngayHieuLucTu.toISOString().slice(0, 10)).toBe('2024-01-15')
    const list = await service.danhSach(actor() as never, { trang: 1, gioiHan: 10 } as never)
    expect(list.duLieu.some((row) => row.maHoSo === saved?.ma)).toBe(true)
    await expect(service.tao(actor() as never, payload('A') as never, null)).rejects.toMatchObject({
      response: expect.objectContaining({ chiTietLoi: [{ tenTruong: 'maHoSoNoiBo', maLoi: ['unique'] }] }),
    })
  })

  it('ghi hồ sơ, tài khoản và liên kết trong cùng CSDL, không bắt đổi mật khẩu lần đầu', async () => {
    const result = await service.tao(actor() as never, {
      ...payload('B'),
      soCccd: '012345678901',
      taiKhoanMoi: { tenDangNhap: `${tenDangNhapGoc}-linked`, matKhau: 'MatKhauThuNghiem123' },
    } as never, null)
    const saved = await prisma.hoSoDangVien.findUnique({ where: { maHoSoNoiBo: `${maThuNghiem}-B` }, include: { taiKhoan: true } })

    expect(result.taiKhoan?.tenDangNhap).toBe(`${tenDangNhapGoc}-linked`)
    expect(saved?.taiKhoan?.doiMatKhauLanDau).toBe(false)
    expect(saved?.taiKhoan?.matKhauBam).not.toBe('MatKhauThuNghiem123')
  })

  it('rollback hồ sơ và lịch sử khi tạo tài khoản bị trùng tên đăng nhập', async () => {
    await expect(service.tao(actor() as never, {
      ...payload('ROLLBACK'),
      soCccd: '012345678902',
      taiKhoanMoi: { tenDangNhap: `${tenDangNhapGoc}-linked`, matKhau: 'MatKhauThuNghiem123' },
    } as never, null)).rejects.toMatchObject({ status: 409 })
    const [profiles, histories] = await Promise.all([
      prisma.hoSoDangVien.count({ where: { maHoSoNoiBo: `${maThuNghiem}-ROLLBACK` } }),
      prisma.lichSuDonViDangVien.count({ where: { hoSoDangVien: { maHoSoNoiBo: `${maThuNghiem}-ROLLBACK` } } }),
    ])
    expect(profiles).toBe(0)
    expect(histories).toBe(0)
  })

  it('báo trùng mã sinh viên tại đúng trường và rollback hồ sơ thứ hai', async () => {
    const studentCode = `${maThuNghiem}-SV`
    await service.tao(actor() as never, {
      ...payload('SV-1'), thongTinSinhVien: { maSinhVien: studentCode },
    } as never, null)

    await expect(service.tao(actor() as never, {
      ...payload('SV-2'), thongTinSinhVien: { maSinhVien: studentCode },
    } as never, null)).rejects.toMatchObject({
      response: expect.objectContaining({ chiTietLoi: [{ tenTruong: 'thongTinSinhVien.maSinhVien', maLoi: ['unique'] }] }),
    })
    expect(await prisma.hoSoDangVien.count({ where: { maHoSoNoiBo: `${maThuNghiem}-SV-2` } })).toBe(0)
  })

  it('từ chối Tổ không tồn tại trước khi ghi hồ sơ', async () => {
    await expect(service.tao(actor() as never, {
      ...payload('INVALID-UNIT'), maTo: randomUUID(),
    } as never, null)).rejects.toMatchObject({ status: 409 })
    expect(await prisma.hoSoDangVien.count({ where: { maHoSoNoiBo: `${maThuNghiem}-INVALID-UNIT` } })).toBe(0)
  })

  it('cập nhật hồ sơ có địa chỉ và thông tin sinh viên vào PostgreSQL', async () => {
    const created = await service.tao(actor() as never, {
      ...payload('EDIT'),
      thongTinSinhVien: { maSinhVien: `${maThuNghiem}-EDIT-SV` },
    } as never, null)
    await service.sua(actor() as never, created.ma, {
      maHoSoNoiBo: `${maThuNghiem}-EDITED`,
      hoVaTen: 'Hồ sơ đã cập nhật',
      trangThai: 'DANG_HOAT_DONG',
      trangThaiDangVien: 'DU_BI',
      diaChi: [{ loaiDiaChi: 'QUE_QUAN', tinhThanhPho: 'Hà Nội' }],
      thongTinSinhVien: { maSinhVien: `${maThuNghiem}-EDIT-SV`, khoaHoc: 'D23CQ' },
    } as never, null)

    const saved = await prisma.hoSoDangVien.findUnique({
      where: { ma: created.ma }, include: { diaChi: true, thongTinSinhVien: true },
    })
    expect(saved).toMatchObject({
      maHoSoNoiBo: `${maThuNghiem}-EDITED`,
      hoVaTen: 'Hồ sơ đã cập nhật',
      diaChi: [{ loaiDiaChi: 'QUE_QUAN', tinhThanhPho: 'Hà Nội' }],
      thongTinSinhVien: { maSinhVien: `${maThuNghiem}-EDIT-SV`, khoaHoc: 'D23CQ' },
    })
  })

  it('chặn CCCD trùng giữa hai hồ sơ và rollback hồ sơ thứ hai', async () => {
    const soCccd = '098765432109'
    await service.tao(actor() as never, { ...payload('CCCD-1'), soCccd } as never, null)
    await expect(service.tao(actor() as never, { ...payload('CCCD-2'), soCccd } as never, null)).rejects.toMatchObject({
      response: expect.objectContaining({ chiTietLoi: [{ tenTruong: 'soCccd', maLoi: ['unique'] }] }),
    })
    expect(await prisma.hoSoDangVien.count({ where: { maHoSoNoiBo: `${maThuNghiem}-CCCD-2` } })).toBe(0)
  })

  it('làm sạch, lưu HTML lý do từ chối vào PostgreSQL và đọc lại an toàn', async () => {
    const profile = await service.tao(actor() as never, payload('RICH-TEXT'), null)
    const requester = await prisma.taiKhoanNguoiDung.create({ data: {
      tenDangNhap: `${tenDangNhapGoc}-requester`, matKhauBam: 'chi-dung-trong-kiem-thu', trangThai: 'NGUNG_HOAT_DONG', doiMatKhauLanDau: false,
    }, select: { ma: true } })
    rejectionRequesterId = requester.ma
    const window = await prisma.dotCapNhatHoSo.create({ data: {
      ten: `${maThuNghiem}-Đợt kiểm thử`, maDonVi: branchId,
      ngayBatDau: new Date('2026-01-01T00:00:00Z'), ngayKetThuc: new Date('2027-01-01T00:00:00Z'),
      cacTruongDuocPhep: ['hoVaTen'], maNguoiTao: actorId,
    }, select: { ma: true } })
    const review = await prisma.yeuCauCapNhatHoSo.create({ data: {
      maHoSo: profile.ma, maDotCapNhat: window.ma, maDonViDuyet: branchId, maNguoiGui: requester.ma,
      trangThai: 'CHO_DUYET', giaTriTruoc: {}, giaTriDeNghi: { hoVaTen: 'Tên mới' },
    }, select: { ma: true } })

    await updateService.tuChoi(actor() as never, review.ma, {
      lyDo: '<p>Thiếu <strong>thông tin</strong>.</p><script>alert(1)</script><a href="javascript:alert(1)">Xem hướng dẫn</a><img src=x onerror=alert(1)>',
    } as never, null)

    const persisted = await prisma.yeuCauCapNhatHoSo.findUnique({ where: { ma: review.ma }, select: { lyDoXuLy: true } })
    expect(persisted?.lyDoXuLy).toContain('<strong>thông tin</strong>')
    expect(persisted?.lyDoXuLy).toContain('Xem hướng dẫn')
    expect(persisted?.lyDoXuLy).not.toMatch(/script|javascript:|<img|onerror/i)
    const readBack = await updateService.danhSachYeuCau(actor() as never, { trang: 1, gioiHan: 25 })
    expect(readBack.duLieu.find((item) => item.ma === review.ma)?.lyDoXuLy).toBe(persisted?.lyDoXuLy)
  })

  it('cập nhật qua HTTP, chấp nhận trường tùy chọn rỗng và lưu lại dữ liệu sau khi đọc lại', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/ho-so-dang-vien')
      .send(payload('HTTP-EDIT'))
      .expect(201)

    const id = created.body.ma as string
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/ho-so-dang-vien/${id}`)
      .send({
        maHoSoNoiBo: `HTTP-EDITED-${randomUUID().slice(0, 8)}`,
        hoVaTen: 'Hồ sơ kiểm thử HTTP đã sửa',
        trangThai: 'DANG_HOAT_DONG',
        trangThaiDangVien: 'CHINH_THUC',
        ngayVaoDang: '2024-01-15',
        ngayChinhThuc: '',
        soTheDangVien: '',
        ngaySinh: '1995-03-17',
        soCccd: '012345678903',
        emailLienHe: '',
        diaChi: [
          { loaiDiaChi: 'QUE_QUAN', tinhThanhPho: 'Hà Nội', quanHuyen: '', xaPhuong: '', diaChiChiTiet: '' },
          { loaiDiaChi: 'THUONG_TRU', tinhThanhPho: 'Đà Nẵng' },
          { loaiDiaChi: 'NOI_SINH', tinhThanhPho: 'Huế' },
        ],
        thongTinSinhVien: { maSinhVien: `${maThuNghiem}-HTTP-SV`, khoaHoc: 'D23CQ', donViPhuTrach: 'PTIT' },
      })
    expect(response.status, JSON.stringify(response.body)).toBe(200)

    expect(response.body).toMatchObject({ ma: id, hoVaTen: 'Hồ sơ kiểm thử HTTP đã sửa' })
    expect(permissionCheck).toHaveBeenCalledWith(actorId, 'HO_SO_DANG_VIEN_SUA_THONG_TIN_CO_BAN', { maHoSo: id }, 'kiem-thu')
    expect(permissionCheck).toHaveBeenCalledWith(actorId, 'HO_SO_CA_NHAN_SUA', { maHoSo: id }, 'kiem-thu')
    expect(permissionCheck).toHaveBeenCalledWith(actorId, 'HO_SO_DIA_CHI_SUA', { maHoSo: id }, 'kiem-thu')
    expect(permissionCheck).toHaveBeenCalledWith(actorId, 'HO_SO_SINH_VIEN_SUA', { maHoSo: id }, 'kiem-thu')
    const reloaded = await request(app.getHttpServer()).get(`/api/v1/ho-so-dang-vien/${id}`).expect(200)
    expect(reloaded.body).toMatchObject({
      maHoSoNoiBo: response.body.maHoSoNoiBo,
      trangThaiDangVien: 'CHINH_THUC',
      thongTinCaNhan: { ngaySinh: '1995-03-17T00:00:00.000Z', soCccd: '012345678903', emailLienHe: null },
      diaChi: expect.arrayContaining([
        expect.objectContaining({ loaiDiaChi: 'QUE_QUAN', tinhThanhPho: 'Hà Nội' }),
        expect.objectContaining({ loaiDiaChi: 'THUONG_TRU', tinhThanhPho: 'Đà Nẵng' }),
        expect.objectContaining({ loaiDiaChi: 'NOI_SINH', tinhThanhPho: 'Huế' }),
      ]),
      thongTinSinhVien: { maSinhVien: `${maThuNghiem}-HTTP-SV`, khoaHoc: 'D23CQ', donViPhuTrach: 'PTIT' },
    })
    const history = await prisma.nhatKyKiemToan.count({ where: { maDoiTuong: id, hanhDong: 'HO_SO_DANG_VIEN_SUA' } })
    expect(history).toBe(1)
    expect(await prisma.quaTrinhDangVien.count({ where: { maHoSo: id, loaiSuKien: 'VAO_DANG_DU_BI' } })).toBe(1)

    const invalid = await request(app.getHttpServer())
      .patch(`/api/v1/ho-so-dang-vien/${id}`)
      .send({ maHoSoNoiBo: 'M'.repeat(51) })
      .expect(400)
    expect(invalid.body.chiTietLoi).toContainEqual({ tenTruong: 'maHoSoNoiBo', maLoi: ['maxLength'] })
    const afterInvalid = await request(app.getHttpServer()).get(`/api/v1/ho-so-dang-vien/${id}`).expect(200)
    expect(afterInvalid.body.maHoSoNoiBo).toBe(response.body.maHoSoNoiBo)

    permissionCheck.mockRejectedValueOnce(new ForbiddenException({ maLoi: 'KHONG_DU_QUYEN', thongBao: 'Bạn không có quyền chỉnh sửa hồ sơ này.' }))
    const forbidden = await request(app.getHttpServer())
      .patch(`/api/v1/ho-so-dang-vien/${id}`)
      .send({ hoVaTen: 'Không được cập nhật' })
      .expect(403)
    expect(forbidden.body.thongBao).toBe('Bạn không có quyền chỉnh sửa hồ sơ này.')
    const afterForbidden = await request(app.getHttpServer()).get(`/api/v1/ho-so-dang-vien/${id}`).expect(200)
    expect(afterForbidden.body.hoVaTen).toBe('Hồ sơ kiểm thử HTTP đã sửa')
  })
})
