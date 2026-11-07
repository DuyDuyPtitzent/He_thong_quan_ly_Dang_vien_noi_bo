import { describe, expect, it, vi } from 'vitest'
import { BadRequestException, ForbiddenException } from '@nestjs/common'
import { HoSoDangVienService } from '../src/modules/member-profiles/member-profiles.service'

describe('HoSoDangVienService', () => {
  it('exports only requested fields without calling the list-view service', async () => {
    const addRow = vi.fn()
    const sheet = { addRow, getColumn: vi.fn(() => ({})), views: [], autoFilter: undefined as unknown }
    const workbook = { addWorksheet: vi.fn(() => sheet) }
    const write = vi.fn().mockResolvedValue(Buffer.from('xlsx'))
    const prisma = { hoSoDangVien: { findMany: vi.fn().mockResolvedValue([{
      ma: 'profile-1', maHoSoNoiBo: 'HS-001', hoVaTen: '=Nguyễn An', trangThai: 'DANG_HOAT_DONG', trangThaiDangVien: 'DU_BI',
      ngayVaoDang: new Date('2020-01-02T00:00:00.000Z'), ngayChinhThuc: null, soPhieuLyLich: null, soTheDangVien: null, khoaDangVien: 'D23',
      thongTinCaNhan: { ngaySinh: null, gioiTinh: null, soCccd: '001234567890', ngayCapCccd: null, noiCapCccd: null, quocTich: null, danToc: null, tonGiao: null, soDienThoai: null, emailLienHe: null },
      diaChi: [{ loaiDiaChi: 'NOI_SINH', quocGia: 'Việt Nam', tinhThanhPho: 'Hà Nội', quanHuyen: null, xaPhuong: null, diaChiChiTiet: 'Số 1' }],
      thongTinSinhVien: null, taiKhoan: null, quaTrinh: [], lichSuDonVi: [],
    }]) }, nhatKyKiemToan: { create: vi.fn() } }
    const permissions = {
      kiemTraQuyenDuocPhanCong: vi.fn().mockResolvedValue({ coQuyen: true, toanHeThong: true, maDonVi: [] }),
      layDonViTrongPhamVi: vi.fn().mockResolvedValue({ coQuyen: true, toanHeThong: true, maDonVi: [] }),
      kiemTra: vi.fn().mockResolvedValue(undefined),
    }
    const service = new HoSoDangVienService(prisma as never, permissions as never, {} as never, { createWorkbook: () => workbook, write } as never)

    await expect(service.xuatExcel({ maTaiKhoan: 'actor', maPhien: 'session' } as never, { cheDo: 'all', truong: ['hoVaTen', 'soCccd', 'noiSinh', 'ngayVaoDang'] })).resolves.toEqual(Buffer.from('xlsx'))
    expect(addRow).toHaveBeenNthCalledWith(1, ['Họ và tên', 'Số CCCD', 'Nơi sinh', 'Ngày vào Đảng'])
    expect(addRow).toHaveBeenNthCalledWith(2, ['’=Nguyễn An', '001234567890', 'Số 1, Hà Nội, Việt Nam', new Date('2020-01-02T00:00:00.000Z')])
    expect(prisma.hoSoDangVien.findMany).toHaveBeenCalledOnce()
    expect(permissions.kiemTraQuyenDuocPhanCong).toHaveBeenCalledWith('actor', 'HO_SO_XUAT_DU_LIEU', 'session')
  })

  it('rejects a selected field that is not in the export catalog', async () => {
    const permissions = { kiemTraQuyenDuocPhanCong: vi.fn().mockResolvedValue({ coQuyen: true, toanHeThong: true, maDonVi: [] }) }
    const service = new HoSoDangVienService({} as never, permissions as never, {} as never, {} as never)
    await expect(service.xuatExcel({ maTaiKhoan: 'actor' } as never, { cheDo: 'all', truong: ['matKhauBam'] })).rejects.toBeInstanceOf(BadRequestException)
  })

  it('rejects organization export outside the export assignment scope', async () => {
    const outsideUnit = '00000000-0000-4000-8000-000000000001'
    const findUnique = vi.fn().mockResolvedValue({ ma: outsideUnit, loaiDonVi: 'TO' })
    const permissions = { kiemTraQuyenDuocPhanCong: vi.fn().mockResolvedValue({ coQuyen: true, toanHeThong: false, maDonVi: ['allowed'] }), layDonViTrongPhamVi: vi.fn().mockResolvedValue({ coQuyen: true, toanHeThong: false, maDonVi: ['allowed'] }) }
    const service = new HoSoDangVienService({ donViToChuc: { findUnique } } as never, permissions as never, {} as never, {} as never)
    await expect(service.xuatExcel({ maTaiKhoan: 'actor' } as never, { cheDo: 'organization', maDonVi: outsideUnit, truong: ['maHoSoNoiBo'] })).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('returns no profile for an account without a link and never searches by a client supplied profile id', async () => {
    const findUnique = vi.fn().mockResolvedValue(null)
    const prisma = { hoSoDangVien: { findUnique } }
    const service = new HoSoDangVienService(prisma as never, {} as never, {} as never)
    await expect(service.hoSoCuaToi({ maTaiKhoan: 'account-a', maPhien: 'session' } as never)).resolves.toEqual({ hoSo: null })
    expect(findUnique).toHaveBeenCalledWith({ where: { maTaiKhoan: 'account-a' }, select: { ma: true } })
  })

  it('loads only the profile linked to the authenticated account', async () => {
    const findUnique = vi.fn().mockResolvedValue({ ma: 'profile-a' })
    const prisma = { hoSoDangVien: { findUnique } }
    const service = new HoSoDangVienService(prisma as never, {} as never, {} as never)
    const detail = vi.spyOn(service, 'chiTiet').mockResolvedValue({ ma: 'profile-a' } as never)
    await expect(service.hoSoCuaToi({ maTaiKhoan: 'account-a', maPhien: 'session' } as never)).resolves.toEqual({ hoSo: { ma: 'profile-a' } })
    expect(detail).toHaveBeenCalledWith({ maTaiKhoan: 'account-a', maPhien: 'session' }, 'profile-a', true)
  })

  it('authorizes the personal profile with personal-view permission and its own-profile scope', async () => {
    const profileRow = {
      ma: 'profile-a', maHoSoNoiBo: 'HS-001', soPhieuLyLich: null, soTheDangVien: null,
      khoaDangVien: null, hoVaTen: 'Nguyễn An', trangThai: 'DANG_HOAT_DONG',
      trangThaiDangVien: 'DU_BI', ngayVaoDang: null, ngayChinhThuc: null,
      thongTinCaNhan: false, diaChi: false, thongTinSinhVien: false, quaTrinh: [], lichSuDonVi: false,
    }
    const findUnique = vi.fn()
      .mockResolvedValueOnce({ ma: 'profile-a' })
      .mockResolvedValueOnce(profileRow)
    const prisma = { hoSoDangVien: { findUnique } }
    const permissions = {
      kiemTra: vi.fn(async (_account: string, permission: string) => {
        if (permission !== 'HO_SO_CA_NHAN_XEM') throw new ForbiddenException()
      }),
    }
    const service = new HoSoDangVienService(prisma as never, permissions as never, {} as never)

    await expect(service.hoSoCuaToi({ maTaiKhoan: 'account-a', maPhien: 'session' } as never))
      .resolves.toMatchObject({ hoSo: { ma: 'profile-a' } })
    expect(permissions.kiemTra).toHaveBeenCalledWith('account-a', 'HO_SO_CA_NHAN_XEM', { maHoSo: 'profile-a' }, 'session')
    expect(permissions.kiemTra).not.toHaveBeenCalledWith('account-a', 'HO_SO_DANG_VIEN_XEM_TONG_QUAN', expect.anything(), 'session')
  })

  it('does not let the self-profile path bypass the personal-view permission', async () => {
    const findUnique = vi.fn()
      .mockResolvedValueOnce({ ma: 'profile-a' })
      .mockResolvedValueOnce({ ma: 'profile-a' })
    const prisma = { hoSoDangVien: { findUnique } }
    const permissions = { kiemTra: vi.fn().mockRejectedValue(new ForbiddenException()) }
    const service = new HoSoDangVienService(prisma as never, permissions as never, {} as never)

    await expect(service.hoSoCuaToi({ maTaiKhoan: 'account-a', maPhien: 'session' } as never))
      .rejects.toBeInstanceOf(ForbiddenException)
    expect(permissions.kiemTra).toHaveBeenCalledWith('account-a', 'HO_SO_CA_NHAN_XEM', { maHoSo: 'profile-a' }, 'session')
  })

  it('converts query pagination strings to numbers before calling Prisma', async () => {
    const findMany = vi.fn().mockResolvedValue([])
    const prisma = {
      hoSoDangVien: {
        count: vi.fn().mockResolvedValue(0),
        findMany,
        groupBy: vi.fn().mockResolvedValue([]),
      },
    }
    const permissions = {
      layDonViTrongPhamVi: vi.fn().mockResolvedValue({ coQuyen: true, toanHeThong: true, maDonVi: [] }),
    }
    const service = new HoSoDangVienService(prisma as never, permissions as never, {} as never)

    const result = await service.danhSach({ maTaiKhoan: 'actor', maPhien: 'session' } as never, {
      trang: '3', gioiHan: '20',
    } as never)

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 40, take: 20 }))
    expect(result.phanTrang).toMatchObject({ trang: 3, gioiHan: 20 })
  })

  it('finds and returns CCCD as text with leading zeroes only when the row is in personal-data scope', async () => {
    const findMany = vi.fn().mockResolvedValue([{ ma: 'profile-a', maHoSoNoiBo: 'HS-001', hoVaTen: 'Nguyễn An', trangThai: 'DANG_HOAT_DONG', trangThaiDangVien: 'DU_BI', ngayVaoDang: null, thongTinCaNhan: { ngaySinh: null, soCccd: '001234567890' }, taiKhoan: null, lichSuDonVi: [{ maChiBo: 'branch-a', maTo: null, chiBo: { maDinhDanh: 'CB-A', tenDonVi: [{ ten: 'Chi bộ A' }] }, to: null }] }])
    const prisma = { hoSoDangVien: { count: vi.fn().mockResolvedValue(1), findMany, groupBy: vi.fn().mockResolvedValue([{ trangThaiDangVien: 'DU_BI', _count: { _all: 1 } }]) } }
    const permissions = { layDonViTrongPhamVi: vi.fn().mockResolvedValue({ coQuyen: true, toanHeThong: true, maDonVi: [] }), kiemTra: vi.fn().mockResolvedValue(undefined) }
    const service = new HoSoDangVienService(prisma as never, permissions as never, {} as never)
    const result = await service.danhSach({ maTaiKhoan: 'actor', maPhien: 'session' } as never, { tuKhoa: '001234567890' } as never)

    expect(findMany.mock.calls[0]?.[0].where.OR).toEqual(expect.arrayContaining([expect.objectContaining({ AND: expect.arrayContaining([expect.objectContaining({ thongTinCaNhan: { is: { soCccd: { contains: '001234567890' } } } })]) })]))
    expect(result.duLieu[0]?.soCccd).toBe('001234567890')
  })

  it('does not select or return CCCD without personal-data permission', async () => {
    const findMany = vi.fn().mockResolvedValue([{ ma: 'profile-a', maHoSoNoiBo: 'HS-001', hoVaTen: 'Nguyễn An', trangThai: 'DANG_HOAT_DONG', trangThaiDangVien: 'DU_BI', ngayVaoDang: null, thongTinCaNhan: { ngaySinh: null }, taiKhoan: null, lichSuDonVi: [] }])
    const prisma = { hoSoDangVien: { count: vi.fn().mockResolvedValue(1), findMany, groupBy: vi.fn().mockResolvedValue([]) } }
    const permissions = { layDonViTrongPhamVi: vi.fn().mockResolvedValueOnce({ coQuyen: true, toanHeThong: true, maDonVi: [] }).mockResolvedValueOnce({ coQuyen: false, toanHeThong: false, maDonVi: [] }), kiemTra: vi.fn().mockRejectedValue(new ForbiddenException()) }
    const service = new HoSoDangVienService(prisma as never, permissions as never, {} as never)
    const result = await service.danhSach({ maTaiKhoan: 'actor', maPhien: 'session' } as never, {} as never)

    expect(findMany.mock.calls[0]?.[0].select.thongTinCaNhan.select).not.toHaveProperty('soCccd')
    expect(result.duLieu[0]).toMatchObject({ soCccd: null, coQuyenXemCaNhan: false })
  })

  const taoServiceMock = (coTaiKhoan = false, coTo = false) => {
    const tx = {
      hoSoDangVien: { create: vi.fn().mockResolvedValue({ ma: 'profile-id', maHoSoNoiBo: 'HS-001', hoVaTen: 'Nguyễn An' }) },
      lichSuDonViDangVien: { create: vi.fn().mockResolvedValue({}) },
      taiKhoanNguoiDung: { create: vi.fn().mockResolvedValue({ ma: 'account-id', tenDangNhap: 'nguyenan' }) },
      nhatKyKiemToan: { create: vi.fn().mockResolvedValue({}) },
    }
    let committed = false
    const prisma = {
      $transaction: vi.fn(async (callback: (transaction: typeof tx) => Promise<unknown>) => {
        const result = await callback(tx)
        committed = true
        return result
      }),
      donViToChuc: { findUnique: vi.fn()
        .mockResolvedValueOnce({ ma: 'branch-id', loaiDonVi: 'CHI_BO', trangThai: 'DANG_HOAT_DONG' })
        .mockResolvedValueOnce(coTo ? { ma: 'unit-id', loaiDonVi: 'TO', trangThai: 'DANG_HOAT_DONG', quanHeCon: [{ maDonViCha: 'branch-id' }] } : null) },
    }
    const permissions = { kiemTra: vi.fn().mockResolvedValue(undefined) }
    const password = { tao: vi.fn().mockResolvedValue('hashed-password') }
    return { service: new HoSoDangVienService(prisma as never, permissions as never, password as never), tx, prisma, permissions, password, committed: () => committed }
  }

  const validProfile = {
    maHoSoNoiBo: 'HS-001', hoVaTen: 'Nguyễn An', trangThai: 'DANG_HOAT_DONG',
    trangThaiDangVien: 'DU_BI', maChiBo: 'branch-id', ngaySinhHoatTu: '2026-11-03',
  }

  it('creates a profile and initial membership history without creating an account', async () => {
    const setup = taoServiceMock()
    const result = await setup.service.tao({ maTaiKhoan: 'actor-id', maPhien: 'session-id' } as never, validProfile as never, null)

    expect(result).toMatchObject({ ma: 'profile-id', taiKhoan: null })
    expect(setup.tx.lichSuDonViDangVien.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      maHoSo: 'profile-id', maChiBo: 'branch-id', ngayHieuLucTu: new Date('2026-11-03T00:00:00.000Z'),
    }) })
    expect(setup.tx.taiKhoanNguoiDung.create).not.toHaveBeenCalled()
    expect(setup.committed()).toBe(true)
  })

  it('accepts a Tổ when its active parent relationship points to the selected Chi bộ', async () => {
    const setup = taoServiceMock(false, true)
    const result = await setup.service.tao({ maTaiKhoan: 'actor-id', maPhien: 'session-id' } as never, {
      ...validProfile, maTo: 'unit-id',
    } as never, null)

    expect(setup.prisma.donViToChuc.findUnique).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: { ma: 'unit-id' }, select: expect.objectContaining({ quanHeCon: expect.any(Object) }),
    }))
    expect(setup.tx.lichSuDonViDangVien.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      maHoSo: result.ma, maChiBo: 'branch-id', maTo: 'unit-id',
    }) })
  })

  it('maps Tổ to its parent Chi bộ when building the form choices', async () => {
    const findMany = vi.fn().mockResolvedValue([
      { ma: 'branch-id', maDinhDanh: 'CB1', loaiDonVi: 'CHI_BO', tenDonVi: [{ ten: 'Chi bộ 1' }], quanHeCon: [] },
      { ma: 'unit-id', maDinhDanh: 'TO1', loaiDonVi: 'TO', tenDonVi: [{ ten: 'Tổ 1' }], quanHeCon: [{ maDonViCha: 'branch-id' }] },
    ])
    const service = new HoSoDangVienService({ donViToChuc: { findMany } } as never, {
      layDonViTrongPhamVi: vi.fn().mockResolvedValue({ coQuyen: true, toanHeThong: false, maDonVi: ['branch-id'] }),
    } as never, {} as never)

    const units = await service.danhMucDonVi({ maTaiKhoan: 'actor-id', maPhien: 'session-id' } as never)

    expect(units.find((unit) => unit.ma === 'unit-id')?.maChiBo).toBe('branch-id')
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ OR: expect.arrayContaining([expect.objectContaining({ loaiDonVi: 'TO' })]) }),
      select: expect.objectContaining({ quanHeCon: expect.any(Object) }),
    }))
  })

  it('creates and links an optional account in the same transaction without forcing a first-login password change', async () => {
    const setup = taoServiceMock(true)
    const result = await setup.service.tao({ maTaiKhoan: 'actor-id', maPhien: 'session-id' } as never, {
      ...validProfile,
      soCccd: '012345678901',
      taiKhoanMoi: { tenDangNhap: 'nguyenan', matKhau: 'MatKhauKhoiTao123' },
    } as never, null)

    expect(setup.password.tao).toHaveBeenCalledWith('MatKhauKhoiTao123')
    expect(setup.tx.taiKhoanNguoiDung.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      tenDangNhap: 'nguyenan', matKhauBam: 'hashed-password', doiMatKhauLanDau: false,
      hoSoDangVien: { connect: { ma: 'profile-id' } },
    }), select: { ma: true, tenDangNhap: true } })
    expect(result).toMatchObject({ taiKhoan: { tenDangNhap: 'nguyenan' } })
    expect(setup.committed()).toBe(true)
  })

  it('stores the manually supplied party cohort independently from the student cohort', async () => {
    const setup = taoServiceMock()
    await setup.service.tao({ maTaiKhoan: 'actor-id', maPhien: 'session-id' } as never, {
      ...validProfile, khoaDangVien: 'D25', thongTinSinhVien: { maSinhVien: 'D23-001', khoaHoc: 'D23' },
    } as never, null)

    expect(setup.tx.hoSoDangVien.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ khoaDangVien: 'D25', thongTinSinhVien: { create: expect.objectContaining({ khoaHoc: 'D23' }) } }),
    }))
  })

  it('does not commit profile and history when optional account creation fails', async () => {
    const setup = taoServiceMock(true)
    setup.tx.taiKhoanNguoiDung.create.mockRejectedValue(new Error('account create failed'))

    await expect(setup.service.tao({ maTaiKhoan: 'actor-id', maPhien: 'session-id' } as never, {
      ...validProfile,
      soCccd: '012345678902',
      taiKhoanMoi: { tenDangNhap: 'nguyenan', matKhau: 'MatKhauKhoiTao123' },
    } as never, null)).rejects.toThrow('account create failed')
    expect(setup.tx.hoSoDangVien.create).toHaveBeenCalledOnce()
    expect(setup.tx.lichSuDonViDangVien.create).toHaveBeenCalledOnce()
    expect(setup.committed()).toBe(false)
  })

  it('returns the actual membership history with organization names effective at each recorded date', async () => {
    const findMany = vi.fn().mockResolvedValue([{
      ma: 'history-id', ngayHieuLucTu: new Date('2020-01-01T00:00:00.000Z'), ngayHieuLucDen: null, lyDoChuyen: null,
      chiBo: {
        maDinhDanh: 'CB-A', tenDonVi: [{ ten: 'Chi bộ A', ngayHieuLucTu: new Date('2019-01-01T00:00:00.000Z'), ngayHieuLucDen: new Date('2022-01-01T00:00:00.000Z') }, { ten: 'Chi bộ mới', ngayHieuLucTu: new Date('2022-01-01T00:00:00.000Z'), ngayHieuLucDen: null }],
        quanHeCon: [{ ngayHieuLucTu: new Date('2018-01-01T00:00:00.000Z'), ngayHieuLucDen: null, donViCha: { loaiDonVi: 'DANG_UY', maDinhDanh: 'DU-A', tenDonVi: [{ ten: 'Đảng ủy A', ngayHieuLucTu: new Date('2018-01-01T00:00:00.000Z'), ngayHieuLucDen: null }] } }],
      },
      to: null,
    }])
    const permissionCheck = vi.fn().mockResolvedValue(undefined)
    const service = new HoSoDangVienService({ lichSuDonViDangVien: { findMany } } as never, { kiemTra: permissionCheck } as never, {} as never)

    const result = await service.lichSuSinhHoat({ maTaiKhoan: 'actor', maPhien: 'session' } as never, 'profile-id')

    expect(permissionCheck).toHaveBeenCalledWith('actor', 'SINH_HOAT_XEM_LICH_SU', { maHoSo: 'profile-id' }, 'session')
    expect(result).toEqual({
      donViHienTai: { ma: 'history-id', ngayHieuLucTu: new Date('2020-01-01T00:00:00.000Z'), ngayHieuLucDen: null, lyDoChuyen: null, tenDangUy: 'Đảng ủy A', tenChiBo: 'Chi bộ A', tenTo: null },
      lichSu: [{ ma: 'history-id', ngayHieuLucTu: new Date('2020-01-01T00:00:00.000Z'), ngayHieuLucDen: null, lyDoChuyen: null, tenDangUy: 'Đảng ủy A', tenChiBo: 'Chi bộ A', tenTo: null }],
    })
  })

  it('returns only actual party process records in reverse chronological order', async () => {
    const findMany = vi.fn().mockResolvedValue([{ ma: 'event-id', loaiSuKien: 'VAO_DANG_DU_BI', ngaySuKien: new Date('2024-01-01'), soQuyetDinh: '01', ngayQuyetDinh: null, donViBanHanhQuyetDinh: null, nguoiGioiThieuThuNhat: null, nguoiGioiThieuThuHai: null, moTa: null, nguoiGhiNhan: { tenDangNhap: 'canbo' } }])
    const service = new HoSoDangVienService({ quaTrinhDangVien: { findMany } } as never, { kiemTra: vi.fn().mockResolvedValue(undefined) } as never, {} as never)

    const result = await service.quaTrinhDang({ maTaiKhoan: 'actor', maPhien: 'session' } as never, 'profile-id')

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { maHoSo: 'profile-id' }, orderBy: [{ ngaySuKien: 'desc' }, { ngayTao: 'desc' }] }))
    expect(result).toHaveLength(1)
    expect(result[0].loaiSuKien).toBe('VAO_DANG_DU_BI')
  })

  it('returns real assignments with status derived from their effective dates', async () => {
    const findMany = vi.fn().mockResolvedValue([{ ma: 'assignment-id', ngayHieuLucTu: new Date('2020-01-01'), ngayHieuLucDen: null, soQuyetDinh: null, ghiChu: null, chucVu: { ten: 'Bí thư' }, donVi: { maDinhDanh: 'CB-A', tenDonVi: [] }, nhiemKy: { ten: 'Nhiệm kỳ cũ', ngayBatDau: new Date('2020-01-01'), ngayKetThuc: new Date('2021-01-01') } }])
    const permissionCheck = vi.fn().mockResolvedValue(undefined)
    const service = new HoSoDangVienService({ phanCongChucVu: { findMany } } as never, { kiemTra: permissionCheck } as never, {} as never)

    const result = await service.phanCongChucVu({ maTaiKhoan: 'actor', maPhien: 'session' } as never, 'profile-id')

    expect(permissionCheck).toHaveBeenCalledWith('actor', 'PHAN_CONG_CHUC_VU_XEM', { maHoSo: 'profile-id' }, 'session')
    expect(result[0]).toMatchObject({ tenChucVu: 'Bí thư', tenDonVi: 'CB-A', nhiemKy: { ten: 'Nhiệm kỳ cũ' }, trangThai: 'DA_KET_THUC' })
  })

  it('filters audit history to safe profile fields and checks profile scope permission', async () => {
    const findMany = vi.fn().mockResolvedValue([{ hanhDong: 'HO_SO_DANG_VIEN_SUA', ketQua: 'THANH_CONG', lyDo: null, thoiDiem: new Date('2026-01-01'), nguoiThucHien: { tenDangNhap: 'canbo' }, duLieuTruoc: { hoVaTen: 'Tên cũ', soCccd: '012345678901' }, duLieuSau: { hoVaTen: 'Tên mới', matKhau: 'secret' } }])
    const permissionCheck = vi.fn().mockResolvedValue(undefined)
    const service = new HoSoDangVienService({ nhatKyKiemToan: { findMany } } as never, { kiemTra: permissionCheck } as never, {} as never)

    const result = await service.lichSuThayDoi({ maTaiKhoan: 'actor', maPhien: 'session' } as never, 'profile-id')

    expect(permissionCheck).toHaveBeenCalledWith('actor', 'HO_SO_XEM_LICH_SU_THAY_DOI', { maHoSo: 'profile-id' }, 'session')
    expect(result[0].duLieuTruoc).toEqual({ hoVaTen: 'Tên cũ' })
    expect(result[0].duLieuSau).toEqual({ hoVaTen: 'Tên mới' })
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { loaiDoiTuong: 'HO_SO_DANG_VIEN', maDoiTuong: 'profile-id' }, take: 100 }))
  })

  it('does not query membership data when permission and scope are denied', async () => {
    const findMany = vi.fn()
    const service = new HoSoDangVienService({ lichSuDonViDangVien: { findMany } } as never, { kiemTra: vi.fn().mockRejectedValue(new Error('denied')) } as never, {} as never)

    await expect(service.lichSuSinhHoat({ maTaiKhoan: 'actor' } as never, 'other-profile')).rejects.toThrow('denied')
    expect(findMany).not.toHaveBeenCalled()
  })

  it('omits current membership from profile detail when its dedicated permission is denied', async () => {
    const row = { ma: 'profile-id', maHoSoNoiBo: 'HS-001', soPhieuLyLich: 'PL-001', hoVaTen: 'Nguyễn An', trangThai: 'DANG_HOAT_DONG', trangThaiDangVien: 'DU_BI', ngayVaoDang: null, ngayChinhThuc: null, soTheDangVien: null, thongTinCaNhan: false, diaChi: false, thongTinSinhVien: false, quaTrinh: [], lichSuDonVi: false }
    const findUnique = vi.fn().mockResolvedValue(row)
    const permissionCheck = vi.fn(async (_account: string, permission: string) => {
      if (permission === 'SINH_HOAT_XEM_HIEN_TAI' || permission.includes('CA_NHAN') || permission.includes('DIA_CHI') || permission.includes('SINH_VIEN')) throw new ForbiddenException()
    })
    const service = new HoSoDangVienService({ hoSoDangVien: { findUnique } } as never, { kiemTra: permissionCheck } as never, {} as never)

    const result = await service.chiTiet({ maTaiKhoan: 'actor', maPhien: 'session' } as never, 'profile-id')

    expect(permissionCheck).toHaveBeenCalledWith('actor', 'SINH_HOAT_XEM_HIEN_TAI', { maHoSo: 'profile-id' }, 'session')
    expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({ select: expect.objectContaining({ lichSuDonVi: false }) }))
    expect(result.lichSuDonVi).toEqual([])
  })
})
