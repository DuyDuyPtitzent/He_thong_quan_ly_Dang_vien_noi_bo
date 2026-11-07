import type { HoSoInput } from '../types/member-profiles.types'

type ProfileDetailForForm = HoSoInput & {
  quaTrinh?: { soQuyetDinh?: string | null; ngayQuyetDinh?: string | null; donViBanHanhQuyetDinh?: string | null; nguoiGioiThieuThuNhat?: string | null; nguoiGioiThieuThuHai?: string | null }[]
  thongTinCaNhan?: { ngaySinh?: string | null; gioiTinh?: string | null; soCccd?: string | null; ngayCapCccd?: string | null; noiCapCccd?: string | null; quocTich?: string | null; danToc?: string | null; tonGiao?: string | null; soDienThoai?: string | null; emailLienHe?: string | null }
  lichSuDonVi?: { maChiBo: string; maTo: string | null; ngayHieuLucTu: string }[]
  thongTinSinhVien?: HoSoInput['thongTinSinhVien'] | null
}

export function profileDetailToForm(row: ProfileDetailForForm, blank: HoSoInput): HoSoInput {
  return {
    ...blank,
    ...row,
    ngayVaoDang: row.ngayVaoDang?.slice(0, 10),
    soPhieuLyLich: row.soPhieuLyLich ?? '',
    soTheDangVien: row.soTheDangVien ?? '',
    khoaDangVien: row.khoaDangVien ?? '',
    ngayChinhThuc: row.ngayChinhThuc?.slice(0, 10),
    soQuyetDinhKetNap: row.quaTrinh?.[0]?.soQuyetDinh ?? '',
    ngayQuyetDinhKetNap: row.quaTrinh?.[0]?.ngayQuyetDinh?.slice(0, 10),
    donViBanHanhQuyetDinh: row.quaTrinh?.[0]?.donViBanHanhQuyetDinh ?? '',
    nguoiGioiThieuThuNhat: row.quaTrinh?.[0]?.nguoiGioiThieuThuNhat ?? '',
    nguoiGioiThieuThuHai: row.quaTrinh?.[0]?.nguoiGioiThieuThuHai ?? '',
    ngaySinh: row.thongTinCaNhan?.ngaySinh?.slice(0, 10),
    gioiTinh: row.thongTinCaNhan?.gioiTinh ?? '',
    ngayCapCccd: row.thongTinCaNhan?.ngayCapCccd?.slice(0, 10),
    noiCapCccd: row.thongTinCaNhan?.noiCapCccd ?? '',
    quocTich: row.thongTinCaNhan?.quocTich ?? '',
    danToc: row.thongTinCaNhan?.danToc ?? '',
    tonGiao: row.thongTinCaNhan?.tonGiao ?? '',
    soDienThoai: row.thongTinCaNhan?.soDienThoai ?? '',
    emailLienHe: row.thongTinCaNhan?.emailLienHe ?? '',
    soCccd: row.thongTinCaNhan?.soCccd ?? '',
    diaChi: row.diaChi ?? [],
    maChiBo: row.lichSuDonVi?.[0]?.maChiBo ?? '',
    maTo: row.lichSuDonVi?.[0]?.maTo ?? undefined,
    ngaySinhHoatTu: row.lichSuDonVi?.[0]?.ngayHieuLucTu?.slice(0, 10) ?? '',
    thongTinSinhVien: row.thongTinSinhVien ?? undefined,
  }
}

export function profileFormToCreatePayload(form: HoSoInput, withStudent: boolean, createAccount: boolean): HoSoInput {
  return {
    ...form,
    maChiBo: form.maChiBo,
    ...(withStudent ? { thongTinSinhVien: form.thongTinSinhVien } : {}),
    ...(createAccount ? { taiKhoanMoi: form.taiKhoanMoi } : {}),
  }
}

export function profileFormToUpdatePayload(form: HoSoInput, can: (permission: string) => boolean): Partial<HoSoInput> {
  return {
    maHoSoNoiBo: form.maHoSoNoiBo,
    soPhieuLyLich: form.soPhieuLyLich,
    soTheDangVien: form.soTheDangVien,
    khoaDangVien: form.khoaDangVien,
    hoVaTen: form.hoVaTen,
    trangThai: form.trangThai,
    trangThaiDangVien: form.trangThaiDangVien,
    ngayVaoDang: form.ngayVaoDang,
    ngayChinhThuc: form.ngayChinhThuc,
    ...(can('HO_SO_CA_NHAN_SUA') ? {
      ngaySinh: form.ngaySinh,
      gioiTinh: form.gioiTinh,
      ngayCapCccd: form.ngayCapCccd,
      noiCapCccd: form.noiCapCccd,
      quocTich: form.quocTich,
      danToc: form.danToc,
      tonGiao: form.tonGiao,
      soDienThoai: form.soDienThoai,
      emailLienHe: form.emailLienHe,
      ...(form.soCccd ? { soCccd: form.soCccd } : {}),
    } : {}),
    ...(can('HO_SO_DIA_CHI_SUA') ? { diaChi: form.diaChi?.map(({ loaiDiaChi, phanLoaiNoiSinh, quocGia, tinhThanhPho, quanHuyen, xaPhuong, diaChiChiTiet }) => ({ loaiDiaChi, phanLoaiNoiSinh, quocGia, tinhThanhPho, quanHuyen, xaPhuong, diaChiChiTiet })) } : {}),
    ...(can('HO_SO_SINH_VIEN_SUA') ? { thongTinSinhVien: form.thongTinSinhVien ? {
      maSinhVien: form.thongTinSinhVien.maSinhVien,
      trangThaiHocTap: form.thongTinSinhVien.trangThaiHocTap,
      khoaHoc: form.thongTinSinhVien.khoaHoc,
      donViPhuTrach: form.thongTinSinhVien.donViPhuTrach,
      chuongTrinhDaoTao: form.thongTinSinhVien.chuongTrinhDaoTao,
      nganh: form.thongTinSinhVien.nganh,
      chuyenNganh: form.thongTinSinhVien.chuyenNganh,
      lopHanhChinh: form.thongTinSinhVien.lopHanhChinh,
    } : undefined } : {}),
  }
}
