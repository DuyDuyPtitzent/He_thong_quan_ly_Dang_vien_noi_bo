import { BadRequestException, ConflictException, ForbiddenException, HttpException, HttpStatus, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { randomBytes, randomUUID } from 'node:crypto'
import ExcelJS from 'exceljs'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { Prisma } from '../../infrastructure/database/generated/prisma/client'
import { DichVuPrisma } from '../../infrastructure/database/prisma.service'
import { BamMatKhauService } from '../auth/password-hasher'
import type { TaiKhoanDaXacThuc } from '../auth/auth.types'
import { PhanQuyenService } from '../authorization/authorization.service'
import { demQuanTriVienToanHeThongHopLe, khoaKiemTraQuanTriVienCuoi, systemAdministratorRoleCode } from '../authorization/system-administrator.policy'
import { DanhSachHoSoDto, SuaHoSoDto, TaoChuyenSinhHoatNgoaiDto, TaoDaoTaoDangDto, TaoHoSoDto } from './member-profiles.dto'
import { DataTransferService } from '../data-transfer/data-transfer.service'
import { importValidationMessage, normalizeExcelDate, normalizeMemberStatus } from './member-profile-import-normalization'

const hieuLuc = (now: Date) => ({ ngayHieuLucTu: { lte: now }, OR: [{ ngayHieuLucDen: null }, { ngayHieuLucDen: { gt: now } }] })
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const dateOnly = (value?: string) => value ? new Date(`${value.slice(0, 10)}T00:00:00.000Z`) : undefined
type ImportRequirement = 'required' | 'conditional' | 'optional'
type MemberProfileImportField = { key: string; label: string; column: number; requirement: ImportRequirement; format: string; validValues: string; example: string; condition?: string; text?: boolean; date?: boolean; choices?: readonly string[]; excelChoices?: readonly string[]; validate?: (value: string) => string | undefined }

const MEMBER_PROFILE_IMPORT_FIELDS: MemberProfileImportField[] = [
  { key:'maHoSoNoiBo', label:'Mã hồ sơ nội bộ', column:1, requirement:'required', format:'Văn bản, tối đa 50 ký tự', validValues:'Không trùng mã hồ sơ đã có', example:'HS-001', text:true },
  { key:'hoVaTen', label:'Họ và tên', column:2, requirement:'required', format:'Văn bản, tối đa 200 ký tự', validValues:'Không để trống', example:'Nguyễn Văn An' },
  { key:'trangThai', label:'Trạng thái hồ sơ', column:3, requirement:'optional', format:'Mã trạng thái', validValues:'DANG_HOAT_DONG; TAM_NGUNG; NGUNG_HOAT_DONG', example:'DANG_HOAT_DONG', choices:['DANG_HOAT_DONG','TAM_NGUNG','NGUNG_HOAT_DONG'] },
  { key:'trangThaiDangVien', label:'Trạng thái Đảng viên', column:4, requirement:'required', format:'Tên trạng thái hoặc mã hệ thống', validValues:'Dự bị; Chính thức; Đã ra khỏi Đảng; Từ trần (cũng chấp nhận mã DU_BI, CHINH_THUC, DA_RA_KHOI_DANG, TU_TRAN)', example:'Chính thức', choices:['DU_BI','CHINH_THUC','DA_RA_KHOI_DANG','TU_TRAN'], excelChoices:['Dự bị','Chính thức','Đã ra khỏi Đảng','Từ trần'] },
  { key:'maChiBo', label:'Mã Chi bộ sinh hoạt', column:5, requirement:'required', format:'Mã định danh dạng văn bản, không nhập tên Chi bộ', validValues:'Mã Chi bộ đang hoạt động trong phạm vi được cấp; tra trong sheet Danh mục tham chiếu', example:'CB-01', text:true },
  { key:'maTo', label:'Mã Tổ (nếu có)', column:6, requirement:'optional', format:'Mã định danh Tổ dạng văn bản', validValues:'Tổ đang hoạt động thuộc Chi bộ đã chọn', example:'T01', text:true },
  { key:'ngaySinhHoatTu', label:'Ngày bắt đầu sinh hoạt', column:7, requirement:'conditional', format:'Ngày dd/mm/yyyy; có thể để trống trong Excel', validValues:'Ngày thực tế; bắt buộc bổ sung trước khi xác nhận nhập', example:'01/09/2024', condition:'Không bắt buộc trong tệp; bắt buộc hợp lệ trước khi lưu lịch sử sinh hoạt', date:true },
  { key:'ngayVaoDang', label:'Ngày vào Đảng', column:8, requirement:'required', format:'Ngày dd/mm/yyyy', validValues:'Ngày hợp lệ', example:'01/09/2023', date:true },
  { key:'ngayChinhThuc', label:'Ngày chính thức', column:9, requirement:'optional', format:'Ngày dd/mm/yyyy', validValues:'Ngày hợp lệ nếu nhập', example:'01/09/2024', date:true },
  { key:'soPhieuLyLich', label:'Số phiếu lý lịch', column:10, requirement:'optional', format:'Văn bản, tối đa 50 ký tự', validValues:'Không trùng nếu nhập', example:'PL-001', text:true },
  { key:'soTheDangVien', label:'Số thẻ Đảng viên', column:11, requirement:'optional', format:'Văn bản, tối đa 50 ký tự', validValues:'Không trùng nếu nhập', example:'00123456', text:true },
  { key:'khoaDangVien', label:'Khóa Đảng viên', column:12, requirement:'required', format:'Mã Dxx', validValues:'Chữ D theo sau bởi hai chữ số; không tự suy luận', example:'D23', validate:(value) => /^D\d{2}$/.test(value) ? undefined : 'Khóa Đảng viên phải theo dạng Dxx, ví dụ D23.' },
  { key:'soQuyetDinhKetNap', label:'Số quyết định kết nạp', column:13, requirement:'optional', format:'Văn bản, tối đa 100 ký tự', validValues:'Tự do', example:'12-QĐ/ĐU' },
  { key:'ngayQuyetDinhKetNap', label:'Ngày quyết định kết nạp', column:14, requirement:'optional', format:'Ngày dd/mm/yyyy', validValues:'Ngày hợp lệ nếu nhập', example:'01/08/2023', date:true },
  { key:'donViBanHanhQuyetDinh', label:'Đơn vị ban hành quyết định', column:15, requirement:'optional', format:'Văn bản, tối đa 200 ký tự', validValues:'Tự do', example:'Đảng ủy Học viện' },
  { key:'nguoiGioiThieuThuNhat', label:'Người giới thiệu thứ nhất', column:16, requirement:'optional', format:'Văn bản, tối đa 200 ký tự', validValues:'Tự do', example:'Nguyễn Văn B' },
  { key:'nguoiGioiThieuThuHai', label:'Người giới thiệu thứ hai', column:17, requirement:'optional', format:'Văn bản, tối đa 200 ký tự', validValues:'Tự do', example:'Trần Thị C' },
  { key:'ngaySinh', label:'Ngày sinh', column:18, requirement:'required', format:'Ngày dd/mm/yyyy', validValues:'Ngày hợp lệ', example:'15/04/2000', date:true },
  { key:'gioiTinh', label:'Giới tính', column:19, requirement:'optional', format:'Danh mục lựa chọn nếu nhập', validValues:'NAM; NU; có thể để trống', example:'NAM hoặc để trống', choices:['NAM','NU'] },
  { key:'soCccd', label:'Số CCCD', column:20, requirement:'required', format:'Văn bản gồm đúng 12 chữ số', validValues:'12 chữ số; giữ số 0 đầu tiên', example:'012345678901', text:true, validate:(value) => /^\d{12}$/.test(value) ? undefined : 'CCCD phải gồm đúng 12 chữ số; nhập ô dưới dạng văn bản để giữ số 0 đầu.' },
  { key:'ngayCapCccd', label:'Ngày cấp CCCD', column:21, requirement:'optional', format:'Ngày dd/mm/yyyy', validValues:'Ngày hợp lệ nếu nhập', example:'15/04/2020', date:true },
  { key:'noiCapCccd', label:'Nơi cấp CCCD', column:22, requirement:'optional', format:'Văn bản, tối đa 250 ký tự', validValues:'Tự do', example:'Cục Cảnh sát QLHC về TTXH' },
  { key:'quocTich', label:'Quốc tịch', column:23, requirement:'optional', format:'Văn bản, tối đa 100 ký tự', validValues:'Tự do', example:'Việt Nam' },
  { key:'danToc', label:'Dân tộc', column:24, requirement:'optional', format:'Văn bản, tối đa 100 ký tự', validValues:'Tự do', example:'Kinh' },
  { key:'tonGiao', label:'Tôn giáo', column:25, requirement:'optional', format:'Văn bản, tối đa 100 ký tự', validValues:'Tự do', example:'Không' },
  { key:'soDienThoai', label:'Số điện thoại', column:26, requirement:'optional', format:'Văn bản, tối đa 30 ký tự', validValues:'Tự do', example:'0912345678', text:true },
  { key:'emailLienHe', label:'Email liên hệ', column:27, requirement:'optional', format:'Địa chỉ email', validValues:'Email hợp lệ nếu nhập', example:'an@example.edu.vn' },
  { key:'taoTaiKhoan', label:'Tạo tài khoản', column:28, requirement:'optional', format:'Danh mục lựa chọn', validValues:'Có; Không (mặc định Không)', example:'Không', choices:['Có','Không'] },
  { key:'tenDangNhap', label:'Tên đăng nhập', column:29, requirement:'conditional', format:'Văn bản, 3–100 ký tự', validValues:'Không trùng tên đăng nhập đã có', example:'nguyenvana', condition:'Bắt buộc khi chọn Tạo tài khoản = Có', text:true },
  { key:'emailTaiKhoan', label:'Email đăng nhập', column:30, requirement:'optional', format:'Địa chỉ email', validValues:'Email hợp lệ nếu nhập', example:'an.login@example.edu.vn' },
  { key:'maSinhVien', label:'Mã sinh viên', column:31, requirement:'conditional', format:'Văn bản, tối đa 50 ký tự', validValues:'Không trùng mã sinh viên đã có', example:'20240001', condition:'Bắt buộc khi nhập thông tin sinh viên', text:true },
  { key:'khoaHoc', label:'Khóa học', column:32, requirement:'optional', format:'Văn bản, tối đa 50 ký tự', validValues:'Tự do', example:'K2024' },
  { key:'donViPhuTrach', label:'Đơn vị phụ trách', column:33, requirement:'optional', format:'Văn bản, tối đa 200 ký tự', validValues:'Tự do', example:'Khoa Công nghệ thông tin' },
  { key:'chuongTrinhDaoTao', label:'Chương trình đào tạo', column:34, requirement:'optional', format:'Văn bản, tối đa 250 ký tự', validValues:'Tự do', example:'Chính quy' },
  { key:'nganh', label:'Ngành', column:35, requirement:'optional', format:'Văn bản, tối đa 200 ký tự', validValues:'Tự do', example:'Công nghệ thông tin' },
  { key:'chuyenNganh', label:'Chuyên ngành', column:36, requirement:'optional', format:'Văn bản, tối đa 200 ký tự', validValues:'Tự do', example:'Hệ thống thông tin' },
  { key:'lopHanhChinh', label:'Lớp hành chính', column:37, requirement:'optional', format:'Văn bản, tối đa 100 ký tự', validValues:'Tự do', example:'D24CQCN01-B' },
  { key:'trangThaiHocTap', label:'Trạng thái học tập', column:38, requirement:'optional', format:'Văn bản, tối đa 50 ký tự', validValues:'Tự do', example:'DANG_HOC' },
  { key:'soDienThoaiBoNguoiNuoiDuong', label:'Số điện thoại bố/người nuôi dưỡng', column:39, requirement:'optional', format:'Văn bản, tối đa 30 ký tự', validValues:'Số điện thoại hợp lệ nếu nhập; không yêu cầu duy nhất', example:'0912345678', text:true },
  { key:'soDienThoaiMeNguoiNuoiDuong', label:'Số điện thoại mẹ/người nuôi dưỡng', column:40, requirement:'optional', format:'Văn bản, tối đa 30 ký tự', validValues:'Số điện thoại hợp lệ nếu nhập; không yêu cầu duy nhất', example:'0987654321', text:true },
]

const importHeader = (field: MemberProfileImportField) => `${field.label}${field.requirement === 'required' ? ' (*)' : ''}`
const requiredImportFields = MEMBER_PROFILE_IMPORT_FIELDS.filter((field) => field.requirement === 'required')

@Injectable()
export class HoSoDangVienService {
  private readonly importSessions = new Map<string, { actor: string; expiresAt: number; rows: { row: number; dto: TaoHoSoDto }[] }>()
  private readonly importsInProgress = new Set<string>()
  constructor(@Inject(DichVuPrisma) private readonly prisma: DichVuPrisma, @Inject(PhanQuyenService) private readonly phanQuyen: PhanQuyenService, @Inject(BamMatKhauService) private readonly bamMatKhau: BamMatKhauService, @Inject(DataTransferService) private readonly transfer: DataTransferService) {}

  async taoMauNhap(actor: TaiKhoanDaXacThuc) {
    const access = await this.phanQuyen.kiemTraQuyenDuocPhanCong(actor.maTaiKhoan, 'HO_SO_DANG_VIEN_TAO', actor.maPhien)
    const workbook = this.transfer.createWorkbook()
    const sheet = workbook.addWorksheet('Danh sách Đảng viên')
    const headers = MEMBER_PROFILE_IMPORT_FIELDS.map(importHeader)
    sheet.mergeCells(1, 1, 1, headers.length)
    sheet.getCell(1, 1).value = '(*) Trường bắt buộc phải nhập. Trường bắt buộc có điều kiện được giải thích trong sheet Hướng dẫn nhập.'
    sheet.getCell(1, 1).font = { bold: true }
    sheet.getCell(1, 1).alignment = { vertical: 'middle', wrapText: true }
    sheet.getRow(1).height = 27
    sheet.addRow(headers)
    sheet.getRow(2).height = 42
    sheet.views = [{ state: 'frozen', ySplit: 2 }]
    sheet.autoFilter = { from: 'A2', to: `${this.columnName(headers.length)}2` }
    MEMBER_PROFILE_IMPORT_FIELDS.forEach((field) => {
      const column = sheet.getColumn(field.column)
      column.width = Math.min(34, Math.max(18, importHeader(field).length + 3))
      if (field.text) column.numFmt = '@'
      if (field.date) column.numFmt = 'dd/mm/yyyy'
      const headerCell = sheet.getCell(2, field.column)
      headerCell.font = { bold: true }
      headerCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
      if (field.choices || field.excelChoices) {
        const choices = field.excelChoices ?? field.choices!
        for (let row = 3; row <= 202; row++) sheet.getCell(row, field.column).dataValidation = {
          type: 'list', allowBlank: field.requirement !== 'required', formulae: [`"${choices.join(',')}"`],
          showErrorMessage: true, errorTitle: 'Giá trị không hợp lệ', error: `Chọn một giá trị: ${choices.join(', ')}.`,
        }
      }
      if (field.key === 'soCccd') for (let row = 3; row <= 202; row++) sheet.getCell(row, field.column).dataValidation = {
        type: 'custom', allowBlank: false, formulae: [`AND(LEN(T${row})=12,ISNUMBER(IFERROR(VALUE(T${row}),"")))`],
        showErrorMessage: true, errorTitle: 'CCCD không hợp lệ', error: 'CCCD phải gồm đúng 12 chữ số; định dạng ô đang là văn bản để giữ số 0 đầu.',
      }
      if (field.key === 'khoaDangVien') for (let row = 3; row <= 202; row++) sheet.getCell(row, field.column).dataValidation = {
        type: 'custom', allowBlank: false, formulae: [`AND(LEFT(L${row},1)="D",LEN(L${row})=3,ISNUMBER(IFERROR(VALUE(RIGHT(L${row},2)),"")))`],
        showErrorMessage: true, errorTitle: 'Khóa Đảng viên không hợp lệ', error: 'Nhập khóa do người quản trị cung cấp theo dạng Dxx, ví dụ D23.',
      }
    })
    for (let row = 3; row <= 202; row++) sheet.getCell(row, 1).value = null

    const help = workbook.addWorksheet('Hướng dẫn nhập')
    help.addRow(['HƯỚNG DẪN NHẬP EXCEL ĐẢNG VIÊN', '', '', '', ''])
    help.mergeCells(1, 1, 1, 5)
    help.addRow(['Tên trường','Mức độ bắt buộc','Định dạng','Giá trị hợp lệ','Ví dụ'])
    for (const field of MEMBER_PROFILE_IMPORT_FIELDS) {
      const requirement = field.requirement === 'required' ? 'Bắt buộc (*)' : field.requirement === 'conditional' ? `Bắt buộc có điều kiện — ${field.condition}` : 'Không bắt buộc'
      help.addRow([importHeader(field), requirement, field.format, field.validValues, field.example])
    }
    help.addRows([
      ['(*) Trường bắt buộc phải nhập','','','',''],
      ['Trường bắt buộc có điều kiện','Xem ghi chú điều kiện tại cột Mức độ bắt buộc của từng trường.','','',''],
      ['Ngày bắt đầu sinh hoạt','Có thể để trống trong Excel; phải bổ sung ngày thực tế hợp lệ trước khi xác nhận nhập. Không tự lấy ngày hiện tại hoặc ngày vào Đảng.','','',''],
      ['Mã Chi bộ sinh hoạt','Nhập mã như CB-01 theo sheet Danh mục tham chiếu; không nhập tên Chi bộ. Mã phải tồn tại, đang hoạt động và trong phạm vi được cấp. Không tự tạo Chi bộ.','','',''],
      ['CCCD và mã định danh','Nhập dưới dạng văn bản. Cột mã hồ sơ, mã Chi bộ/Tổ, CCCD, số thẻ và mã sinh viên được định dạng Text để giữ số 0 đầu.','','',''],
      ['Tài khoản','Chọn Có để tạo tài khoản liên kết. Nhập tên đăng nhập; hệ thống sinh mật khẩu riêng khi xác nhận. Không nhập mật khẩu vào tệp.','','',''],
      ['Giới hạn','Tối đa 200 hồ sơ và tệp 5 MB. Không sửa tên hoặc thứ tự tiêu đề cột.','','',''],
    ])
    help.getRow(1).font = { bold: true, size: 14 }
    help.getRow(2).font = { bold: true }
    help.getRow(2).height = 32
    help.getRow(2).eachCell((cell) => { cell.alignment = { vertical: 'middle', wrapText: true } })
    MEMBER_PROFILE_IMPORT_FIELDS.forEach((field, index) => {
      const row = help.getRow(index + 3)
      row.getCell(1).font = { bold: true }
      row.height = field.requirement === 'conditional' ? 48 : 36
      row.eachCell((cell) => { cell.alignment = { vertical: 'top', wrapText: true } })
    })
    help.columns = [{ width: 34 }, { width: 52 }, { width: 36 }, { width: 64 }, { width: 28 }]
    help.views = [{ state: 'frozen', ySplit: 2 }]

    const refs = workbook.addWorksheet('Danh mục tham chiếu')
    refs.addRow(['Mã Chi bộ','Tên Chi bộ','Mã Tổ','Tên Tổ'])
    refs.getColumn(1).numFmt = '@'
    refs.getColumn(3).numFmt = '@'
    const units = await this.prisma.donViToChuc.findMany({ where: { trangThai: 'DANG_HOAT_DONG', loaiDonVi: { in: ['CHI_BO','TO'] }, ...(access.toanHeThong ? {} : { ma: { in: access.maDonVi } }) }, select: { ma: true, maDinhDanh: true, loaiDonVi: true, quanHeCon: { where: { ngayHieuLucDen: null }, take: 1, select: { maDonViCha: true } }, tenDonVi: { where: { ngayHieuLucDen: null }, take: 1, select: { ten: true } } } })
    const branches = units.filter((unit) => unit.loaiDonVi === 'CHI_BO')
    for (const branch of branches) for (const unit of units.filter((item) => item.loaiDonVi === 'TO' && item.quanHeCon[0]?.maDonViCha === branch.ma)) refs.addRow([branch.maDinhDanh, branch.tenDonVi[0]?.ten, unit.maDinhDanh, unit.tenDonVi[0]?.ten])
    if (!refs.rowCount) for (const branch of branches) refs.addRow([branch.maDinhDanh, branch.tenDonVi[0]?.ten])
    const addresses=workbook.addWorksheet('Địa chỉ')
    addresses.addRow(['Mã hồ sơ nội bộ','Loại địa chỉ','Phân loại nơi sinh','Quốc gia','Tỉnh/Thành phố','Quận/Huyện','Xã/Phường','Địa chỉ chi tiết'])
    addresses.getColumn(1).numFmt='@'
    for (let row = 2; row <= 201; row++) {
      addresses.getCell(row, 2).dataValidation = { type: 'list', allowBlank: false, formulae: ['"NOI_SINH,QUE_QUAN,THUONG_TRU,NOI_O_HIEN_NAY"'], showErrorMessage: true, errorTitle: 'Loại địa chỉ không hợp lệ', error: 'Chọn một loại địa chỉ trong danh sách.' }
      addresses.getCell(row, 3).dataValidation = { type: 'list', allowBlank: true, formulae: ['"TRONG_NUOC,NUOC_NGOAI"'], showErrorMessage: true, errorTitle: 'Phân loại nơi sinh không hợp lệ', error: 'Chọn TRONG_NUOC hoặc NUOC_NGOAI.' }
    }
    return this.transfer.write(workbook)
  }

  async kiemTraNhap(actor: TaiKhoanDaXacThuc, file?: { buffer: Buffer; originalname: string; size: number }) {
    await this.phanQuyen.kiemTraQuyenDuocPhanCong(actor.maTaiKhoan, 'HO_SO_DANG_VIEN_TAO', actor.maPhien)
    if (!file || file.size > 5 * 1024 * 1024 || !file.originalname.toLowerCase().endsWith('.xlsx')) throw new BadRequestException({ maLoi: 'TEP_KHONG_HOP_LE', thongBao: 'Chọn tệp .xlsx hợp lệ, tối đa 5 MB.' })
    const workbook = await this.transfer.read(file.buffer)
    const sheet = workbook.getWorksheet('Danh sách Đảng viên')
    if (!sheet || !workbook.getWorksheet('Hướng dẫn nhập') || !workbook.getWorksheet('Danh mục tham chiếu') || !workbook.getWorksheet('Địa chỉ')) throw new BadRequestException({ maLoi: 'SAI_MAU_EXCEL', thongBao: 'Thiếu sheet trong tệp mẫu. Hãy sử dụng đúng tệp Excel nhập hồ sơ Đảng viên.' })
    const headers = MEMBER_PROFILE_IMPORT_FIELDS.map(importHeader)
    const legacyHeaders = MEMBER_PROFILE_IMPORT_FIELDS.filter((field) => field.column <= 38).map(importHeader)
    const headerRow = [2, 3].find((candidate) => headers.every((header, i) => sheet.getCell(candidate, i + 1).text === header) || legacyHeaders.every((header, i) => sheet.getCell(candidate, i + 1).text === header))
    if (!headerRow) throw new BadRequestException({ maLoi: 'SAI_COT_EXCEL', thongBao: 'Tên hoặc thứ tự cột không đúng với tệp mẫu nhập hồ sơ Đảng viên.' })
    const dataRowNumbers: number[] = []
    for (let rowNumber = headerRow + 1; rowNumber <= sheet.rowCount; rowNumber++) {
      const values = (sheet.getRow(rowNumber).values as unknown[]).slice(1)
      if (values.some((value) => value !== null && value !== undefined && value !== '')) dataRowNumbers.push(rowNumber)
    }
    if (dataRowNumbers.length < 1 || dataRowNumbers.length > 200) throw new BadRequestException({ maLoi: 'SO_DONG_KHONG_HOP_LE', thongBao: 'Tệp phải có từ 1 đến 200 hồ sơ.' })
    // Resolve codes independently from Scope so a valid out-of-scope unit is reported as a permission issue,
    // while an unknown code is reported as a data issue. Only Permission + Scope authorizes use of the ID.
    const units = await this.prisma.donViToChuc.findMany({ where: { trangThai: 'DANG_HOAT_DONG', loaiDonVi: { in: ['CHI_BO','TO'] } }, select: { ma: true, maDinhDanh: true, loaiDonVi: true, quanHeCon: { where: { ngayHieuLucDen: null }, take: 1, select: { maDonViCha: true } } } })
    const unitKey = (value: string) => value.replace(/\s+/g, ' ').trim().toLocaleLowerCase('vi-VN')
    const byCode = new Map(units.filter((u) => u.maDinhDanh).map((u) => [unitKey(u.maDinhDanh!), u]))
    const rows: { row: number; dto: TaoHoSoDto }[] = []
    const errors: { row: number; field: string; message: string }[] = []
    const profileErrorRows = new Set<number>()
    const existingRows = new Set<number>()
    const seen = new Map<string, number>()
    const text = (row: ExcelJS.Row, n: number) => {
      const value = this.transfer.readCell(row.getCell(n)).value
      if (value === null || value === undefined) return ''
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value).trim()
      if (value instanceof Date) return value.toISOString()
      return ''
    }
    const addressSheet=workbook.getWorksheet('Địa chỉ')!
    const addressHeaders=['Mã hồ sơ nội bộ','Loại địa chỉ','Phân loại nơi sinh','Quốc gia','Tỉnh/Thành phố','Quận/Huyện','Xã/Phường','Địa chỉ chi tiết']
    if(addressHeaders.some((header,index)=>addressSheet.getCell(1,index+1).text!==header))throw new BadRequestException({maLoi:'SAI_COT_EXCEL',thongBao:'Cấu trúc sheet Địa chỉ không khớp mẫu mới nhất.'})
    const addressRows=new Map<string, NonNullable<TaoHoSoDto['diaChi']>>()
    const addressTypes=new Set(['NOI_SINH','QUE_QUAN','THUONG_TRU','NOI_O_HIEN_NAY'])
    for(let index=2;index<=addressSheet.rowCount;index++){
      const addressRow=addressSheet.getRow(index);const profileCode=text(addressRow,1).toLocaleLowerCase();if(!profileCode&&!addressRow.hasValues)continue
      let hasUnsupportedCell=false
      for(let column=1;column<=addressHeaders.length;column++){const cell=addressRow.getCell(column);const result=this.transfer.readCell(cell);const message=this.transfer.cellReadError(result,cell);if(message){errors.push({row:index,field:addressHeaders[column-1]??'unknown',message});hasUnsupportedCell=true}}
      if(hasUnsupportedCell)continue
      const type=text(addressRow,2).toLocaleUpperCase();if(!profileCode||!addressTypes.has(type)){errors.push({row:index,field:'maHoSoNoiBo/loaiDiaChi',message:'Địa chỉ cần mã hồ sơ và loại NOI_SINH, QUE_QUAN, THUONG_TRU hoặc NOI_O_HIEN_NAY.'});continue}
      const list=addressRows.get(profileCode)??[]
      if(list.some((item)=>item.loaiDiaChi===type)){errors.push({row:index,field:'loaiDiaChi',message:'Mỗi hồ sơ chỉ được khai báo một địa chỉ cho từng loại.'});continue}
      list.push({loaiDiaChi:type as 'NOI_SINH'|'QUE_QUAN'|'THUONG_TRU'|'NOI_O_HIEN_NAY',...(text(addressRow,3)?{phanLoaiNoiSinh:text(addressRow,3).toLocaleUpperCase() as 'TRONG_NUOC'|'NUOC_NGOAI'}:{}),...(text(addressRow,4)?{quocGia:text(addressRow,4)}:{}),...(text(addressRow,5)?{tinhThanhPho:text(addressRow,5)}:{}),...(text(addressRow,6)?{quanHuyen:text(addressRow,6)}:{}),...(text(addressRow,7)?{xaPhuong:text(addressRow,7)}:{}),...(text(addressRow,8)?{diaChiChiTiet:text(addressRow,8)}:{})})
      addressRows.set(profileCode,list)
    }
    for (const n of dataRowNumbers) {
      const row = sheet.getRow(n)
      const rowErrors = new Set<string>()
      const addError = (field: string, message: string) => { if (!rowErrors.has(field)) { errors.push({row:n,field,message}); rowErrors.add(field); profileErrorRows.add(n) } }
      const v = (i: number) => {
        const field = MEMBER_PROFILE_IMPORT_FIELDS.find((item) => item.column === i)
        const cell = row.getCell(i)
        const result = this.transfer.readCell(cell)
        const readError = this.transfer.cellReadError(result, cell)
        if (readError) addError(field?.key ?? headers[i - 1] ?? 'unknown', readError)
        const raw = result.value
        if (!field?.date || raw === null || raw === undefined || raw === '') return text(row, i)
        const parsed = normalizeExcelDate(raw instanceof Date || typeof raw === 'number' ? raw : String(raw), typeof raw === 'number')
        if (!parsed) addError(field.key, `${field.label} không hợp lệ. Vui lòng nhập theo định dạng ngày/tháng/năm.`)
        return parsed ?? String(raw)
      }
      for(let c=1;c<=headers.length;c++){const cell=row.getCell(c);const result=this.transfer.readCell(cell);const message=this.transfer.cellReadError(result,cell);if(message)addError(MEMBER_PROFILE_IMPORT_FIELDS.find((field)=>field.column===c)?.key??headers[c-1]??'unknown',message)}
      const branchCode = v(5).replace(/\s+/g, ' ').trim()
      const unitCode = v(6).replace(/\s+/g, ' ').trim()
      const branch = byCode.get(unitKey(branchCode))
      const unit = unitCode ? byCode.get(unitKey(unitCode)) : undefined
      const createAccount = ['có','co','yes'].includes(v(28).normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('vi-VN'))
      const gender = v(19).toLocaleUpperCase('vi-VN').replace(/\s+/g, ' ').trim()
      const cohort = v(12).toLocaleUpperCase('vi-VN').trim()
      const status = normalizeMemberStatus(v(4))
      for (const field of requiredImportFields) if (!v(field.column)) addError(field.key, field.key === 'maChiBo' ? 'Chưa nhập Chi bộ sinh hoạt.' : `${field.label} là trường bắt buộc.`)
      for (const field of MEMBER_PROFILE_IMPORT_FIELDS) {
        const value = field.key === 'gioiTinh' ? gender : field.key === 'khoaDangVien' ? cohort : field.key === 'trangThaiDangVien' ? status ?? v(field.column) : v(field.column)
        if (value && field.validate) {
          const message = field.validate(value)
          if (message) addError(field.key, message)
        }
        if (value && field.key === 'gioiTinh' && field.choices && !field.choices.includes(value)) addError(field.key, `${field.label} không hợp lệ. Vui lòng chọn giá trị trong danh mục.`)
      }
      const dto = plainToInstance(TaoHoSoDto, { maHoSoNoiBo:v(1), hoVaTen:v(2), trangThai:v(3)||'DANG_HOAT_DONG', trangThaiDangVien:status ?? v(4), maChiBo:branch?.ma, maTo:unit?.ma, ngaySinhHoatTu:v(7)||undefined, ngayVaoDang:v(8)||undefined, ngayChinhThuc:v(9)||undefined, soPhieuLyLich:v(10)||undefined, soTheDangVien:v(11)||undefined, khoaDangVien:cohort||undefined, soQuyetDinhKetNap:v(13)||undefined, ngayQuyetDinhKetNap:v(14)||undefined, donViBanHanhQuyetDinh:v(15)||undefined, nguoiGioiThieuThuNhat:v(16)||undefined, nguoiGioiThieuThuHai:v(17)||undefined, ngaySinh:v(18)||undefined, gioiTinh:gender||undefined, soCccd:v(20)||undefined, ngayCapCccd:v(21)||undefined, noiCapCccd:v(22)||undefined, quocTich:v(23)||undefined, danToc:v(24)||undefined, tonGiao:v(25)||undefined, soDienThoai:v(26)||undefined, emailLienHe:v(27)||undefined, soDienThoaiBoNguoiNuoiDuong:v(39)||undefined, soDienThoaiMeNguoiNuoiDuong:v(40)||undefined, ...(addressRows.get(v(1).toLocaleLowerCase())?.length?{diaChi:addressRows.get(v(1).toLocaleLowerCase())}:{}), ...(createAccount ? { taiKhoanMoi:{ tenDangNhap:v(29), email:v(30)||undefined, matKhau:randomBytes(24).toString('base64url') } } : {}), ...(v(31) ? { thongTinSinhVien:{ maSinhVien:v(31), khoaHoc:v(32)||undefined, donViPhuTrach:v(33)||undefined, chuongTrinhDaoTao:v(34)||undefined, nganh:v(35)||undefined, chuyenNganh:v(36)||undefined, lopHanhChinh:v(37)||undefined, trangThaiHocTap:v(38)||undefined } } : {}) })
      for (const err of await validate(dto)) {
        if (err.property === 'ngaySinhHoatTu' && !dto.ngaySinhHoatTu) continue
        if ((err.property === 'maChiBo' && !branch) || (err.property === 'maTo' && (!unit || !branch))) continue
        addError(err.property, importValidationMessage(err.property, err.constraints ?? {}))
      }
      if (branchCode && (!branch || branch.loaiDonVi !== 'CHI_BO')) addError('maChiBo', 'Không tìm thấy Chi bộ tương ứng với mã đã nhập.')
      if (unitCode && (!unit || unit.loaiDonVi !== 'TO' || unit.quanHeCon[0]?.maDonViCha !== branch?.ma)) addError('maTo', 'Không tìm thấy Tổ tương ứng với mã đã nhập hoặc Tổ không thuộc Chi bộ đã chọn.')
      for (const [field, key] of [['maHoSoNoiBo',v(1)],['soCccd',v(20)],['tenDangNhap',v(29)],['emailTaiKhoan',v(30)],['maSinhVien',v(31)],['soTheDangVien',v(11)],['soPhieuLyLich',v(10)]] as const) if (key) { const identity=`${field}:${key.toLocaleLowerCase()}`; if (seen.has(identity)) { errors.push({ row:n, field, message:`Bị trùng với dòng Excel ${seen.get(identity)}.` }); profileErrorRows.add(n) } else seen.set(identity,n) }
      rows.push({ row:n, dto })
    }
    // Existing values are checked against PostgreSQL; the unique constraints are checked again by the import transaction.
    for (const item of rows) {
      const d=item.dto
      // Invalid rows are retained for preview so their field errors can be shown together.
      // Do not pass an absent required identifier into Prisma's unique selector.
      if (d.maHoSoNoiBo && await this.prisma.hoSoDangVien.findUnique({where:{maHoSoNoiBo:d.maHoSoNoiBo},select:{ma:true}})) { errors.push({row:item.row,field:'maHoSoNoiBo',message:`Mã hồ sơ ${d.maHoSoNoiBo} đã tồn tại trong hệ thống.`}); existingRows.add(item.row); profileErrorRows.add(item.row) }
      if (d.soCccd && await this.prisma.thongTinCaNhanDangVien.findUnique({where:{soCccd:d.soCccd},select:{maHoSo:true}})) { errors.push({row:item.row,field:'soCccd',message:'Số CCCD này đã được sử dụng cho một hồ sơ khác.'}); existingRows.add(item.row); profileErrorRows.add(item.row) }
      if (d.taiKhoanMoi && await this.prisma.taiKhoanNguoiDung.findUnique({where:{tenDangNhap:d.taiKhoanMoi.tenDangNhap},select:{ma:true}})) { errors.push({row:item.row,field:'tenDangNhap',message:'Tên đăng nhập đã tồn tại trong hệ thống.'}); existingRows.add(item.row); profileErrorRows.add(item.row) }
      if (d.taiKhoanMoi?.email && await this.prisma.taiKhoanNguoiDung.findUnique({where:{email:d.taiKhoanMoi.email},select:{ma:true}})) { errors.push({row:item.row,field:'emailTaiKhoan',message:'Email đăng nhập đã tồn tại trong hệ thống.'}); existingRows.add(item.row); profileErrorRows.add(item.row) }
      if (d.soPhieuLyLich && await this.prisma.hoSoDangVien.findUnique({where:{soPhieuLyLich:d.soPhieuLyLich},select:{ma:true}})) { errors.push({row:item.row,field:'soPhieuLyLich',message:'Số phiếu lý lịch này đã được sử dụng.'}); existingRows.add(item.row); profileErrorRows.add(item.row) }
      if (d.soTheDangVien && await this.prisma.hoSoDangVien.findUnique({where:{soTheDangVien:d.soTheDangVien},select:{ma:true}})) { errors.push({row:item.row,field:'soTheDangVien',message:'Số thẻ Đảng viên này đã được sử dụng.'}); existingRows.add(item.row); profileErrorRows.add(item.row) }
      if (d.thongTinSinhVien && await this.prisma.thongTinSinhVien.findUnique({where:{maSinhVien:d.thongTinSinhVien.maSinhVien},select:{maHoSo:true}})) { errors.push({row:item.row,field:'maSinhVien',message:'Mã sinh viên này đã được sử dụng.'}); existingRows.add(item.row); profileErrorRows.add(item.row) }
      if (!d.maChiBo) continue
      try { await this.phanQuyen.kiemTra(actor.maTaiKhoan,'HO_SO_DANG_VIEN_TAO',{maDonVi:d.maChiBo},actor.maPhien); if (d.taiKhoanMoi) { await this.phanQuyen.kiemTra(actor.maTaiKhoan,'TAI_KHOAN_TAO',{},actor.maPhien); await this.phanQuyen.kiemTra(actor.maTaiKhoan,'TAI_KHOAN_LIEN_KET_HO_SO',{maDonVi:d.maChiBo},actor.maPhien) } } catch { errors.push({row:item.row,field:'maChiBo',message:'Bạn không có quyền tạo hồ sơ tại Chi bộ này.'}); profileErrorRows.add(item.row) }
    }
    this.pruneImportSessions()
    if(!errors.length&&this.importSessions.size>=100)throw new HttpException({maLoi:'QUA_NHIEU_PHIEU_NHAP',thongBao:'Máy chủ đang xử lý nhiều phiên nhập. Hãy thử lại sau.'},HttpStatus.TOO_MANY_REQUESTS)
    for(const profileCode of addressRows.keys())if(!seen.has(`maHoSoNoiBo:${profileCode}`))errors.push({row:1,field:'maHoSoNoiBo',message:`Sheet Địa chỉ tham chiếu mã hồ sơ ${profileCode} không có trong danh sách chính.`})
    const maPhienNhap=randomUUID(); if (!errors.length) this.importSessions.set(maPhienNhap,{actor:actor.maTaiKhoan,expiresAt:Date.now()+10*60_000,rows})
    const data=rows.map(({row,dto})=>({dong:row,maHoSoNoiBo:dto.maHoSoNoiBo,hoVaTen:dto.hoVaTen,ngaySinh:dto.ngaySinh??null,soCccd:dto.soCccd??null,gioiTinh:dto.gioiTinh??null,ngayVaoDang:dto.ngayVaoDang??null,khoaDangVien:dto.khoaDangVien??null,ngaySinhHoatTu:dto.ngaySinhHoatTu??null,maChiBo:this.unitLabel(byCode,dto.maChiBo),maTo:dto.maTo?this.unitLabel(byCode,dto.maTo):null,trangThaiDangVien:dto.trangThaiDangVien,taoTaiKhoan:Boolean(dto.taiKhoanMoi),hopLe:!profileErrorRows.has(row),daTonTai:existingRows.has(row)}))
    const chuaCoNgay=rows.filter(({dto})=>!dto.ngaySinhHoatTu).length
    return { maPhienNhap: errors.length ? null : maPhienNhap, hetHanSauGiay:600, tongSo:rows.length, hopLe:rows.length-profileErrorRows.size, coLoi:profileErrorRows.size, soDaTonTai:existingRows.size, chuaCoNgay, canXacNhan:!errors.length&&chuaCoNgay===0, taoTaiKhoan:rows.filter((r)=>r.dto.taiKhoanMoi).length, loi:errors, duLieu:data }
  }

  async capNhatNgaySinhHoatNhap(actor:TaiKhoanDaXacThuc, sessionId:string, changes:{dong:number;ngaySinhHoatTu:string}[]) {
    const session=this.importSessions.get(sessionId)
    if(!session||session.actor!==actor.maTaiKhoan||session.expiresAt<Date.now())throw new BadRequestException({maLoi:'PHIEN_NHAP_HET_HAN',thongBao:'Phiên kiểm tra đã hết hạn. Vui lòng tải và kiểm tra lại tệp.'})
    if(!Array.isArray(changes)||changes.length>200)throw new BadRequestException({maLoi:'NGAY_SINH_HOAT_KHONG_HOP_LE',thongBao:'Danh sách ngày cần cập nhật không hợp lệ.'})
    const byRow=new Map<number,string>()
    for(const change of changes){
      if(!Number.isInteger(change.dong)||!this.isDateOnly(change.ngaySinhHoatTu)||byRow.has(change.dong))throw new BadRequestException({maLoi:'NGAY_SINH_HOAT_KHONG_HOP_LE',thongBao:'Mỗi hồ sơ cần một ngày bắt đầu sinh hoạt hợp lệ theo dạng YYYY-MM-DD.'})
      byRow.set(change.dong,change.ngaySinhHoatTu)
    }
    for(const {dto} of session.rows)await this.phanQuyen.kiemTra(actor.maTaiKhoan,'HO_SO_DANG_VIEN_TAO',{maDonVi:dto.maChiBo},actor.maPhien)
    for(const item of session.rows)if(byRow.has(item.row))item.dto.ngaySinhHoatTu=byRow.get(item.row)!
    for(const {row,dto} of session.rows){const validationErrors=await validate(dto);if(validationErrors.some((error)=>!(error.property==='ngaySinhHoatTu'&&!dto.ngaySinhHoatTu)))throw new BadRequestException({maLoi:'DU_LIEU_NHAP_KHONG_HOP_LE',dongExcel:row,thongBao:`Dòng Excel ${row} còn dữ liệu không hợp lệ.`})}
    const data=session.rows.map(({row,dto})=>({dong:row,ngaySinhHoatTu:dto.ngaySinhHoatTu??null}))
    const chuaCoNgay=session.rows.filter(({dto})=>!dto.ngaySinhHoatTu).length
    return {ngaySinhHoat:data,chuaCoNgay,canXacNhan:chuaCoNgay===0}
  }

  private isDateOnly(value?:string){if(!value||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const date=new Date(`${value}T00:00:00.000Z`);return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value}

  async xacNhanNhap(actor: TaiKhoanDaXacThuc, sessionId: string, ip: string | null) {
    const session=this.importSessions.get(sessionId); if (!session || session.actor!==actor.maTaiKhoan || session.expiresAt<Date.now()) throw new BadRequestException({maLoi:'PHIEN_NHAP_HET_HAN',thongBao:'Phiên kiểm tra đã hết hạn. Vui lòng tải và kiểm tra lại tệp.'})
    if (this.importsInProgress.has(sessionId)) throw new ConflictException({ maLoi:'PHIEN_NHAP_DANG_XU_LY', thongBao:'Phiên nhập này đang được xử lý. Vui lòng chờ kết quả.' })
    this.importsInProgress.add(sessionId)
    try {
    const missingDates=session.rows.filter(({dto})=>!this.isDateOnly(dto.ngaySinhHoatTu)).map(({row})=>row)
    if(missingDates.length)throw new BadRequestException({maLoi:'THIEU_NGAY_SINH_HOAT',dongExcel:missingDates,thongBao:`Cần bổ sung ngày bắt đầu sinh hoạt hợp lệ cho các dòng Excel: ${missingDates.join(', ')}.`})
    for(const {row,dto} of session.rows){const validationErrors=await validate(dto);if(validationErrors.length)throw new BadRequestException({maLoi:'DU_LIEU_NHAP_KHONG_HOP_LE',dongExcel:row,thongBao:`Dòng Excel ${row} còn dữ liệu không hợp lệ.`})}
    // Recheck persisted unique identifiers immediately before writing. Database unique constraints
    // remain the final concurrency guard and are translated below if another request wins the race.
    for (const { row, dto } of session.rows) {
      const duplicate = dto.maHoSoNoiBo && await this.prisma.hoSoDangVien.findUnique({ where: { maHoSoNoiBo: dto.maHoSoNoiBo }, select: { ma: true } })
      if (duplicate) throw new ConflictException({ maLoi: 'DU_LIEU_NHAP_DA_THAY_DOI', dongExcel: row, thongBao: `Dòng Excel ${row}: Mã hồ sơ ${dto.maHoSoNoiBo} đã tồn tại trong hệ thống.` })
      const duplicateCitizenId = dto.soCccd && await this.prisma.thongTinCaNhanDangVien.findUnique({ where: { soCccd: dto.soCccd }, select: { maHoSo: true } })
      if (duplicateCitizenId) throw new ConflictException({ maLoi: 'DU_LIEU_NHAP_DA_THAY_DOI', dongExcel: row, thongBao: `Dòng Excel ${row}: Số CCCD này đã được sử dụng cho một hồ sơ khác.` })
      const duplicateReceipt = dto.soPhieuLyLich && await this.prisma.hoSoDangVien.findUnique({ where: { soPhieuLyLich: dto.soPhieuLyLich }, select: { ma: true } })
      if (duplicateReceipt) throw new ConflictException({ maLoi: 'DU_LIEU_NHAP_DA_THAY_DOI', dongExcel: row, thongBao: `Dòng Excel ${row}: Số phiếu lý lịch này đã được sử dụng.` })
      const duplicateCard = dto.soTheDangVien && await this.prisma.hoSoDangVien.findUnique({ where: { soTheDangVien: dto.soTheDangVien }, select: { ma: true } })
      if (duplicateCard) throw new ConflictException({ maLoi: 'DU_LIEU_NHAP_DA_THAY_DOI', dongExcel: row, thongBao: `Dòng Excel ${row}: Số thẻ Đảng viên này đã được sử dụng.` })
      const duplicateStudent = dto.thongTinSinhVien && await this.prisma.thongTinSinhVien.findUnique({ where: { maSinhVien: dto.thongTinSinhVien.maSinhVien }, select: { maHoSo: true } })
      if (duplicateStudent) throw new ConflictException({ maLoi: 'DU_LIEU_NHAP_DA_THAY_DOI', dongExcel: row, thongBao: `Dòng Excel ${row}: Mã sinh viên này đã được sử dụng.` })
      if (dto.taiKhoanMoi) {
        const duplicateLogin = await this.prisma.taiKhoanNguoiDung.findUnique({ where: { tenDangNhap: dto.taiKhoanMoi.tenDangNhap }, select: { ma: true } })
        if (duplicateLogin) throw new ConflictException({ maLoi: 'DU_LIEU_NHAP_DA_THAY_DOI', dongExcel: row, thongBao: `Dòng Excel ${row}: Tên đăng nhập đã tồn tại trong hệ thống.` })
        if (dto.taiKhoanMoi.email) {
          const duplicateEmail = await this.prisma.taiKhoanNguoiDung.findUnique({ where: { email: dto.taiKhoanMoi.email }, select: { ma: true } })
          if (duplicateEmail) throw new ConflictException({ maLoi: 'DU_LIEU_NHAP_DA_THAY_DOI', dongExcel: row, thongBao: `Dòng Excel ${row}: Email đăng nhập đã tồn tại trong hệ thống.` })
        }
      }
    }
    const passwords: {tenDangNhap:string;matKhau:string}[]=[]
    const preparedRows=await Promise.all(session.rows.map(async(item)=>{const password=item.dto.taiKhoanMoi?randomBytes(24).toString('base64url'):undefined;return{...item,password,hash:password?await this.bamMatKhau.tao(password):undefined}}))
    let failingRow=0, failingDto:TaoHoSoDto|undefined
    try {
    const result=await this.prisma.$transaction(async(tx)=>{
      const created=[]
      for (const {row,dto,password,hash} of preparedRows) {
        failingRow=row;failingDto=dto
        await this.phanQuyen.kiemTra(actor.maTaiKhoan,'HO_SO_DANG_VIEN_TAO',{maDonVi:dto.maChiBo},actor.maPhien)
        const unit=await this.kiemTraDonVi(dto.maChiBo,dto.maTo)
        if (dto.taiKhoanMoi) { await this.phanQuyen.kiemTra(actor.maTaiKhoan,'TAI_KHOAN_TAO',{},actor.maPhien); await this.phanQuyen.kiemTra(actor.maTaiKhoan,'TAI_KHOAN_LIEN_KET_HO_SO',{maDonVi:dto.maChiBo},actor.maPhien) }
        const profile=await this.createProfileInTransaction(tx,actor,dto,unit,hash,ip)
        created.push(profile); if (dto.taiKhoanMoi&&password) passwords.push({tenDangNhap:dto.taiKhoanMoi.tenDangNhap,matKhau:password})
      }
      await this.audit(tx,actor,null,'HO_SO_DANG_VIEN_NHAP_HANG_LOAT',ip,undefined,{soLuongHoSo:created.length,soLuongTaiKhoan:passwords.length})
      return created
    },{timeout:30_000,maxWait:5_000})
    this.importSessions.delete(sessionId)
    return {tongSo:result.length,duLieu:result,matKhauBanDau:passwords}
    } catch(error) {
      if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==='P2002'&&failingDto){
        try{await this.mapError(error,{maHoSoNoiBo:failingDto.maHoSoNoiBo,soPhieuLyLich:failingDto.soPhieuLyLich,soTheDangVien:failingDto.soTheDangVien,maSinhVien:failingDto.thongTinSinhVien?.maSinhVien,soCccd:failingDto.soCccd,tenDangNhap:failingDto.taiKhoanMoi?.tenDangNhap,emailTaiKhoan:failingDto.taiKhoanMoi?.email})}catch(mapped){if(mapped instanceof ConflictException){const body=mapped.getResponse();const details=typeof body==='object'&&body!==null?body as Record<string,unknown>:{};throw new ConflictException({...details,dongExcel:failingRow,thongBao:`Dòng Excel ${failingRow}: ${String(details.thongBao??'Dữ liệu đã được sử dụng.')}`})}throw mapped}
      }
      if(error instanceof HttpException&&failingRow){const body=error.getResponse();const details=typeof body==='object'&&body!==null?body as Record<string,unknown>:{};throw new HttpException({...details,dongExcel:failingRow,thongBao:`Dòng Excel ${failingRow}: ${String(details.thongBao??'Không thể tạo hồ sơ với dữ liệu hiện tại.')}`},error.getStatus())}
      throw error
    }
    } finally {
      this.importsInProgress.delete(sessionId)
    }
  }

  private readonly exportFields = [
    { key:'maHoSoNoiBo', label:'Mã hồ sơ nội bộ', group:'Thông tin hồ sơ', permission:'HO_SO_DANG_VIEN_XEM_TONG_QUAN', date:false, text:true },
    { key:'hoVaTen', label:'Họ và tên', group:'Thông tin hồ sơ', permission:'HO_SO_DANG_VIEN_XEM_TONG_QUAN' },
    { key:'trangThai', label:'Trạng thái hồ sơ', group:'Thông tin hồ sơ', permission:'HO_SO_DANG_VIEN_XEM_TONG_QUAN' },
    { key:'trangThaiDangVien', label:'Trạng thái Đảng viên', group:'Thông tin hồ sơ', permission:'HO_SO_DANG_VIEN_XEM_TONG_QUAN' },
    { key:'ngayVaoDang', label:'Ngày vào Đảng', group:'Thông tin hồ sơ', permission:'HO_SO_DANG_VIEN_XEM_TONG_QUAN', date:true },
    { key:'ngayChinhThuc', label:'Ngày chính thức', group:'Thông tin hồ sơ', permission:'HO_SO_DANG_VIEN_XEM_TONG_QUAN', date:true },
    { key:'soPhieuLyLich', label:'Số phiếu lý lịch', group:'Thông tin hồ sơ', permission:'HO_SO_DANG_VIEN_XEM_TONG_QUAN', text:true },
    { key:'soTheDangVien', label:'Số thẻ Đảng viên', group:'Thông tin hồ sơ', permission:'HO_SO_DANG_VIEN_XEM_TONG_QUAN', text:true },
    { key:'khoaDangVien', label:'Khóa Đảng viên', group:'Thông tin hồ sơ', permission:'HO_SO_DANG_VIEN_XEM_TONG_QUAN', text:true },
    { key:'soQuyetDinhKetNap', label:'Số quyết định kết nạp', group:'Thông tin hồ sơ', permission:'QUA_TRINH_DANG_XEM', text:true },
    { key:'ngayQuyetDinhKetNap', label:'Ngày quyết định kết nạp', group:'Thông tin hồ sơ', permission:'QUA_TRINH_DANG_XEM', date:true },
    { key:'donViBanHanhQuyetDinh', label:'Đơn vị ban hành quyết định', group:'Thông tin hồ sơ', permission:'QUA_TRINH_DANG_XEM' },
    { key:'nguoiGioiThieuThuNhat', label:'Người giới thiệu thứ nhất', group:'Thông tin hồ sơ', permission:'QUA_TRINH_DANG_XEM' },
    { key:'nguoiGioiThieuThuHai', label:'Người giới thiệu thứ hai', group:'Thông tin hồ sơ', permission:'QUA_TRINH_DANG_XEM' },
    { key:'ngaySinh', label:'Ngày sinh', group:'Thông tin cá nhân', permission:'HO_SO_CA_NHAN_XEM', date:true },
    { key:'gioiTinh', label:'Giới tính', group:'Thông tin cá nhân', permission:'HO_SO_CA_NHAN_XEM' },
    { key:'soCccd', label:'Số CCCD', group:'Thông tin cá nhân', permission:'HO_SO_CA_NHAN_XEM', text:true },
    { key:'ngayCapCccd', label:'Ngày cấp CCCD', group:'Thông tin cá nhân', permission:'HO_SO_CA_NHAN_XEM', date:true },
    { key:'noiCapCccd', label:'Nơi cấp CCCD', group:'Thông tin cá nhân', permission:'HO_SO_CA_NHAN_XEM' },
    { key:'quocTich', label:'Quốc tịch', group:'Thông tin cá nhân', permission:'HO_SO_CA_NHAN_XEM' },
    { key:'danToc', label:'Dân tộc', group:'Thông tin cá nhân', permission:'HO_SO_CA_NHAN_XEM' },
    { key:'tonGiao', label:'Tôn giáo', group:'Thông tin cá nhân', permission:'HO_SO_CA_NHAN_XEM' },
    { key:'soDienThoai', label:'Số điện thoại', group:'Thông tin cá nhân', permission:'HO_SO_CA_NHAN_XEM', text:true },
    { key:'soDienThoaiBoNguoiNuoiDuong', label:'Số điện thoại bố/người nuôi dưỡng', group:'Thông tin cá nhân', permission:'HO_SO_CA_NHAN_XEM', text:true },
    { key:'soDienThoaiMeNguoiNuoiDuong', label:'Số điện thoại mẹ/người nuôi dưỡng', group:'Thông tin cá nhân', permission:'HO_SO_CA_NHAN_XEM', text:true },
    { key:'emailLienHe', label:'Email liên hệ', group:'Thông tin cá nhân', permission:'HO_SO_CA_NHAN_XEM' },
    { key:'noiSinh', label:'Nơi sinh', group:'Địa chỉ', permission:'HO_SO_DIA_CHI_XEM' },
    { key:'queQuan', label:'Quê quán', group:'Địa chỉ', permission:'HO_SO_DIA_CHI_XEM' },
    { key:'thuongTru', label:'Địa chỉ thường trú', group:'Địa chỉ', permission:'HO_SO_DIA_CHI_XEM' },
    { key:'noiOHienNay', label:'Nơi ở hiện nay', group:'Địa chỉ', permission:'HO_SO_DIA_CHI_XEM' },
    { key:'maSinhVien', label:'Mã sinh viên', group:'Thông tin sinh viên', permission:'HO_SO_SINH_VIEN_XEM', text:true },
    { key:'khoaHoc', label:'Khóa học', group:'Thông tin sinh viên', permission:'HO_SO_SINH_VIEN_XEM' },
    { key:'donViPhuTrach', label:'Đơn vị phụ trách', group:'Thông tin sinh viên', permission:'HO_SO_SINH_VIEN_XEM' },
    { key:'chuongTrinhDaoTao', label:'Chương trình đào tạo', group:'Thông tin sinh viên', permission:'HO_SO_SINH_VIEN_XEM' },
    { key:'nganh', label:'Ngành', group:'Thông tin sinh viên', permission:'HO_SO_SINH_VIEN_XEM' },
    { key:'chuyenNganh', label:'Chuyên ngành', group:'Thông tin sinh viên', permission:'HO_SO_SINH_VIEN_XEM' },
    { key:'lopHanhChinh', label:'Lớp hành chính', group:'Thông tin sinh viên', permission:'HO_SO_SINH_VIEN_XEM' },
    { key:'trangThaiHocTap', label:'Trạng thái học tập', group:'Thông tin sinh viên', permission:'HO_SO_SINH_VIEN_XEM' },
    { key:'dangUy', label:'Đảng ủy', group:'Sinh hoạt Đảng', permission:'SINH_HOAT_XEM_HIEN_TAI' },
    { key:'chiBo', label:'Chi bộ', group:'Sinh hoạt Đảng', permission:'SINH_HOAT_XEM_HIEN_TAI' },
    { key:'to', label:'Tổ', group:'Sinh hoạt Đảng', permission:'SINH_HOAT_XEM_HIEN_TAI' },
    { key:'ngaySinhHoatTu', label:'Ngày bắt đầu sinh hoạt tại đơn vị hiện tại', group:'Sinh hoạt Đảng', permission:'SINH_HOAT_XEM_HIEN_TAI', date:true },
    { key:'tenDangNhap', label:'Tên đăng nhập', group:'Thông tin tài khoản', permission:'TAI_KHOAN_XEM' },
    { key:'emailTaiKhoan', label:'Email đăng nhập', group:'Thông tin tài khoản', permission:'TAI_KHOAN_XEM' },
    { key:'trangThaiTaiKhoan', label:'Trạng thái tài khoản', group:'Thông tin tài khoản', permission:'TAI_KHOAN_XEM' },
    { key:'tinhTrangLienKet', label:'Tình trạng liên kết hồ sơ', group:'Thông tin tài khoản', permission:'TAI_KHOAN_XEM' },
  ] as const

  async cauHinhXuat(actor: TaiKhoanDaXacThuc) {
    const access = await this.phanQuyen.kiemTraQuyenDuocPhanCong(actor.maTaiKhoan, 'HO_SO_XUAT_DU_LIEU', actor.maPhien)
    const permissions = [...new Set(this.exportFields.map((field) => field.permission))]
    const grants = await Promise.all(permissions.map(async (permission) => [permission, await this.phanQuyen.layDonViTrongPhamVi(actor.maTaiKhoan, permission, actor.maPhien)] as const))
    const allowed = new Map(grants)
    const units = await this.prisma.donViToChuc.findMany({ where: { trangThai: 'DANG_HOAT_DONG', ...(access.toanHeThong ? {} : { OR: [{ ma: { in: access.maDonVi } }, { loaiDonVi: 'TO', quanHeCon: { some: { maDonViCha: { in: access.maDonVi }, ngayHieuLucTu: { lte: new Date() }, OR: [{ ngayHieuLucDen: null }, { ngayHieuLucDen: { gt: new Date() } }] } } }] }) }, select: { ma: true, maDinhDanh: true, loaiDonVi: true, tenDonVi: { where: { ngayHieuLucDen: null }, take: 1, select: { ten: true } }, quanHeCon: { where: { ngayHieuLucDen: null }, take: 1, select: { maDonViCha: true } } } })
    return { truong: this.exportFields.filter((field) => allowed.get(field.permission)?.coQuyen).map(({ key, label, group }) => ({ key, label, group })), donVi: units.map((unit) => ({ ma: unit.ma, maDinhDanh: unit.maDinhDanh, loaiDonVi: unit.loaiDonVi, ten: unit.tenDonVi[0]?.ten ?? unit.maDinhDanh, maChiBo: unit.loaiDonVi === 'CHI_BO' ? unit.ma : unit.quanHeCon[0]?.maDonViCha ?? null })) }
  }

  async xuatExcel(actor: TaiKhoanDaXacThuc, request: { cheDo?: string; maHoSo?: string[]; maDonVi?: string; tuKhoa?: string; maChiBo?: string; maTo?: string; trangThaiDangVien?: string; truong?: string[] }) {
    const access = await this.phanQuyen.kiemTraQuyenDuocPhanCong(actor.maTaiKhoan, 'HO_SO_XUAT_DU_LIEU', actor.maPhien)
    const modes = ['selected', 'filtered', 'organization', 'all']
    const mode = request.cheDo ?? (request.maHoSo?.length ? 'selected' : 'filtered')
    if (!modes.includes(mode)) throw new BadRequestException({ maLoi: 'PHAM_VI_XUAT_KHONG_HOP_LE', thongBao: 'Cách chọn danh sách xuất không hợp lệ.' })
    if (mode === 'filtered' && [request.maChiBo, request.maTo].some((id) => id !== undefined && !uuidPattern.test(id))) throw new BadRequestException({ maLoi: 'DON_VI_LOC_KHONG_HOP_LE', thongBao: 'Đơn vị trong điều kiện lọc không hợp lệ.' })
    if (!Array.isArray(request.truong) || request.truong.length === 0 || request.truong.length > this.exportFields.length) throw new BadRequestException({ maLoi: 'TRUONG_XUAT_KHONG_HOP_LE', thongBao: 'Hãy chọn ít nhất một thông tin cần xuất.' })
    const uniqueKeys = [...new Set(request.truong)]
    if (uniqueKeys.length !== request.truong.length) throw new BadRequestException({ maLoi: 'TRUONG_XUAT_KHONG_HOP_LE', thongBao: 'Danh sách thông tin cần xuất bị lặp.' })
    const fields = uniqueKeys.map((key) => this.exportFields.find((field) => field.key === key))
    if (fields.some((field) => !field)) throw new BadRequestException({ maLoi: 'TRUONG_XUAT_KHONG_HOP_LE', thongBao: 'Có thông tin không được hỗ trợ để xuất.' })
    const selectedFields = fields as (typeof this.exportFields[number])[]
    const fieldPermissions = [...new Set(selectedFields.map((field) => field.permission))]
    const fieldAccess = new Map(await Promise.all(fieldPermissions.map(async (permission) => [permission, await this.phanQuyen.layDonViTrongPhamVi(actor.maTaiKhoan, permission, actor.maPhien)] as const)))
    if (selectedFields.some((field) => !fieldAccess.get(field.permission)?.coQuyen)) throw new ForbiddenException({ maLoi: 'KHONG_DU_QUYEN_XUAT_TRUONG', thongBao: 'Bạn không được phép xuất một hoặc nhiều thông tin đã chọn.' })
    const now = new Date()
    let orgIds: string[] | undefined
    if (mode === 'organization') {
      if (!request.maDonVi) throw new BadRequestException({ maLoi: 'CHUA_CHON_DON_VI', thongBao: 'Vui lòng chọn đơn vị tổ chức cần xuất.' })
      if (!uuidPattern.test(request.maDonVi)) throw new BadRequestException({ maLoi: 'DON_VI_XUAT_KHONG_HOP_LE', thongBao: 'Đơn vị được chọn không hợp lệ.' })
      const unit = await this.prisma.donViToChuc.findUnique({ where: { ma: request.maDonVi }, select: { ma: true, loaiDonVi: true } })
      const permitted = access.toanHeThong || access.maDonVi.includes(request.maDonVi)
      if (!unit || !permitted) throw new ForbiddenException({ maLoi: 'DON_VI_NGOAI_PHAM_VI_XUAT', thongBao: 'Đơn vị được chọn không thuộc phạm vi xuất dữ liệu của bạn.' })
      orgIds = unit.loaiDonVi === 'DANG_UY' ? await this.prisma.$queryRaw<Array<{ maDonVi: string }>>`WITH RECURSIVE cay(ma_don_vi) AS (SELECT ${unit.ma}::uuid UNION SELECT q.ma_don_vi_con FROM lich_su_quan_he_don_vi q JOIN cay c ON q.ma_don_vi_cha=c.ma_don_vi WHERE q.ngay_hieu_luc_tu <= ${now} AND (q.ngay_hieu_luc_den IS NULL OR q.ngay_hieu_luc_den > ${now})) SELECT ma_don_vi AS "maDonVi" FROM cay`.then((rows) => rows.map((row) => row.maDonVi)) : unit.loaiDonVi === 'CHI_BO' ? [unit.ma, ...await this.prisma.donViToChuc.findMany({ where: { loaiDonVi: 'TO', quanHeCon: { some: { maDonViCha: unit.ma, ngayHieuLucTu: { lte: now }, OR: [{ ngayHieuLucDen: null }, { ngayHieuLucDen: { gt: now } }] } } }, select: { ma: true } }).then((rows) => rows.map((row) => row.ma))] : [unit.ma]
    }
    const orgMembership: Prisma.LichSuDonViDangVienWhereInput = { AND: [hieuLuc(now), ...(access.toanHeThong ? [] : [{ OR: [{ maChiBo: { in: access.maDonVi } }, { maTo: { in: access.maDonVi } }] }]), ...(mode === 'organization' && orgIds ? [{ OR: [{ maChiBo: { in: orgIds } }, { maTo: { in: orgIds } }] }] : []), ...(mode === 'filtered' ? (request.maChiBo ? [{ maChiBo: request.maChiBo }] : []) : []), ...(mode === 'filtered' && request.maTo ? [{ maTo: request.maTo }] : [])] }
    if (mode === 'selected' && (!request.maHoSo?.length || request.maHoSo.length > 5000)) throw new BadRequestException({ maLoi: 'HO_SO_CHUA_CHON', thongBao: 'Hãy chọn hồ sơ cần xuất.' })
    if (mode === 'selected' && request.maHoSo?.some((id) => !uuidPattern.test(id))) throw new BadRequestException({ maLoi: 'HO_SO_XUAT_KHONG_HOP_LE', thongBao: 'Có hồ sơ được chọn không hợp lệ.' })
    const personalSearch = mode === 'filtered' && request.tuKhoa ? await this.phanQuyen.layDonViTrongPhamVi(actor.maTaiKhoan, 'HO_SO_CA_NHAN_XEM', actor.maPhien) : null
    const where: Prisma.HoSoDangVienWhereInput = { ...(mode === 'selected' ? { ma: { in: request.maHoSo } } : {}), ...(mode === 'filtered' && request.trangThaiDangVien ? { trangThaiDangVien: request.trangThaiDangVien } : {}), ...(mode === 'filtered' && request.tuKhoa ? { OR: [{ hoVaTen: { contains: request.tuKhoa, mode: 'insensitive' } }, { maHoSoNoiBo: { contains: request.tuKhoa, mode: 'insensitive' } }, ...(personalSearch?.coQuyen ? [{ AND: [{ thongTinCaNhan: { is: { soCccd: { contains: request.tuKhoa } } } }, { lichSuDonVi: { some: { AND: [hieuLuc(now), ...(personalSearch.toanHeThong ? [] : [{ OR: [{ maChiBo: { in: personalSearch.maDonVi } }, { maTo: { in: personalSearch.maDonVi } }] }])] } } }] }] : [])] } : {}), lichSuDonVi: { some: orgMembership } }
    const rows = await this.prisma.hoSoDangVien.findMany({
      where, orderBy: [{ hoVaTen: 'asc' }, { ma: 'asc' }],
      select: {
        ma: true, maHoSoNoiBo: true, hoVaTen: true, trangThai: true, trangThaiDangVien: true,
        ngayVaoDang: true, ngayChinhThuc: true, soPhieuLyLich: true, soTheDangVien: true, khoaDangVien: true,
        thongTinCaNhan: { select: { ngaySinh: true, gioiTinh: true, soCccd: true, ngayCapCccd: true, noiCapCccd: true, quocTich: true, danToc: true, tonGiao: true, soDienThoai: true, soDienThoaiBoNguoiNuoiDuong: true, soDienThoaiMeNguoiNuoiDuong: true, emailLienHe: true } },
        diaChi: { select: { loaiDiaChi: true, quocGia: true, tinhThanhPho: true, quanHuyen: true, xaPhuong: true, diaChiChiTiet: true } },
        thongTinSinhVien: true,
        quaTrinh: { where: { loaiSuKien: 'VAO_DANG_DU_BI' }, orderBy: { ngaySuKien: 'asc' }, take: 1, select: { soQuyetDinh: true, ngayQuyetDinh: true, donViBanHanhQuyetDinh: true, nguoiGioiThieuThuNhat: true, nguoiGioiThieuThuHai: true } },
        taiKhoan: { select: { tenDangNhap: true, email: true, trangThai: true } },
        lichSuDonVi: {
          where: hieuLuc(now), take: 1,
          select: {
            ngayHieuLucTu: true, maChiBo: true, maTo: true,
            chiBo: {
              select: {
                ma: true,
                tenDonVi: { where: { ngayHieuLucDen: null }, take: 1, select: { ten: true } },
                quanHeCha: { where: { ngayHieuLucDen: null }, take: 1, select: { donViCha: { select: { loaiDonVi: true, tenDonVi: { where: { ngayHieuLucDen: null }, take: 1, select: { ten: true } } } } } },
              },
            },
            to: { select: { tenDonVi: { where: { ngayHieuLucDen: null }, take: 1, select: { ten: true } } } },
          },
        },
      },
    })
    const safeCell = (value: unknown) => typeof value === 'string' && /^[=+\-@]/.test(value) ? `’${value}` : value
    const statusLabel: Record<string, string> = { DANG_HOAT_DONG: 'Đang hoạt động', TAM_NGUNG: 'Tạm ngừng', NGUNG_HOAT_DONG: 'Ngừng hoạt động', DU_BI: 'Dự bị', CHINH_THUC: 'Chính thức', DA_RA_KHOI_DANG: 'Đã ra khỏi Đảng', TU_TRAN: 'Từ trần', NAM: 'Nam', NU: 'Nữ', DANG_HOAT_DONG_TK: 'Đang hoạt động', TAM_KHOA: 'Tạm khóa', NGUNG_HOAT_DONG_TK: 'Ngừng hoạt động' }
    const workbook = this.transfer.createWorkbook(), sheet = workbook.addWorksheet('Hồ sơ Đảng viên')
    sheet.addRow(selectedFields.map((field) => field.label))
    for (const row of rows) {
      const membership = row.lichSuDonVi[0]
      const addresses = new Map(row.diaChi.map((address) => [address.loaiDiaChi, [address.diaChiChiTiet, address.xaPhuong, address.quanHuyen, address.tinhThanhPho, address.quocGia].filter(Boolean).join(', ')]))
      const entryProcess = row.quaTrinh[0]
      const values: Record<string, unknown> = { maHoSoNoiBo: row.maHoSoNoiBo, hoVaTen: row.hoVaTen, trangThai: statusLabel[row.trangThai] ?? row.trangThai, trangThaiDangVien: row.trangThaiDangVien ? statusLabel[row.trangThaiDangVien] ?? row.trangThaiDangVien : null, ngayVaoDang: row.ngayVaoDang, ngayChinhThuc: row.ngayChinhThuc, soPhieuLyLich: row.soPhieuLyLich, soTheDangVien: row.soTheDangVien, khoaDangVien: row.khoaDangVien, soQuyetDinhKetNap: entryProcess?.soQuyetDinh, ngayQuyetDinhKetNap: entryProcess?.ngayQuyetDinh, donViBanHanhQuyetDinh: entryProcess?.donViBanHanhQuyetDinh, nguoiGioiThieuThuNhat: entryProcess?.nguoiGioiThieuThuNhat, nguoiGioiThieuThuHai: entryProcess?.nguoiGioiThieuThuHai, ...row.thongTinCaNhan, noiSinh: addresses.get('NOI_SINH'), queQuan: addresses.get('QUE_QUAN'), thuongTru: addresses.get('THUONG_TRU'), noiOHienNay: addresses.get('NOI_O_HIEN_NAY'), ...row.thongTinSinhVien, dangUy: membership?.chiBo.quanHeCha[0]?.donViCha.tenDonVi[0]?.ten ?? null, chiBo: membership?.chiBo.tenDonVi[0]?.ten ?? null, to: membership?.to?.tenDonVi[0]?.ten ?? null, ngaySinhHoatTu: membership?.ngayHieuLucTu, tenDangNhap: row.taiKhoan?.tenDangNhap, emailTaiKhoan: row.taiKhoan?.email, trangThaiTaiKhoan: row.taiKhoan ? statusLabel[row.taiKhoan.trangThai] ?? row.taiKhoan.trangThai : null, tinhTrangLienKet: row.taiKhoan ? 'Đã liên kết' : 'Chưa liên kết' }
      const authorizedKeys = new Set<string>()
      for (const permission of fieldPermissions) { try { await this.phanQuyen.kiemTra(actor.maTaiKhoan, permission, { maHoSo: row.ma }, actor.maPhien); for (const field of selectedFields.filter((item) => item.permission === permission)) authorizedKeys.add(field.key) } catch { /* Keep field blank when this profile is outside that information permission's scope. */ } }
      sheet.addRow(selectedFields.map((field) => safeCell(authorizedKeys.has(field.key) ? values[field.key] ?? null : null)))
    }
    selectedFields.forEach((field, index) => { sheet.getColumn(index + 1).width = Math.min(38, Math.max(16, field.label.length + 3)); if ('text' in field && field.text) sheet.getColumn(index + 1).numFmt = '@'; if ('date' in field && field.date) sheet.getColumn(index + 1).numFmt = 'dd/mm/yyyy' })
    sheet.views = [{ state: 'frozen', ySplit: 1 }]; sheet.autoFilter = { from: 'A1', to: `${this.columnName(selectedFields.length)}1` }
    await this.prisma.nhatKyKiemToan.create({ data: { maNguoiThucHien: actor.maTaiKhoan, hanhDong: 'HO_SO_DANG_VIEN_XUAT_DU_LIEU', loaiDoiTuong: 'HO_SO_DANG_VIEN', maDoiTuong: null, ketQua: 'THANH_CONG', duLieuSau: { soLuong: rows.length, truong: uniqueKeys, cheDo: mode }, maTuongQuan: randomUUID() } })
    return this.transfer.write(workbook)
  }

  async taoBaoCaoLoi(actor: TaiKhoanDaXacThuc, loi: {row:number;field:string;message:string}[] = []) {
    await this.phanQuyen.kiemTraQuyenDuocPhanCong(actor.maTaiKhoan,'HO_SO_DANG_VIEN_TAO',actor.maPhien)
    if(!Array.isArray(loi)||loi.length>1000||loi.some((item)=>!item||typeof item!=='object'))throw new BadRequestException({maLoi:'BAO_CAO_KHONG_HOP_LE',thongBao:'Danh sách lỗi không hợp lệ.'})
    const workbook=this.transfer.createWorkbook(),sheet=workbook.addWorksheet('Lỗi nhập dữ liệu')
    sheet.addRow(['Dòng Excel','Trường','Chi tiết lỗi'])
    for(const error of loi){const safe=(value:unknown)=>String(value??'').slice(0,500).replace(/^[=+\-@]/,'’$&');sheet.addRow([Number.isInteger(error.row)?error.row:'',safe(error.field),safe(error.message)])}
    sheet.views=[{state:'frozen',ySplit:1}];sheet.autoFilter={from:'A1',to:'C1'};sheet.getColumn(1).width=14;sheet.getColumn(2).width=28;sheet.getColumn(3).width=80
    return this.transfer.write(workbook)
  }

  private pruneImportSessions(){const now=Date.now();for(const[id,s]of this.importSessions)if(s.expiresAt<now)this.importSessions.delete(id)}
  private columnName(n:number){let out='';while(n){const rem=(n-1)%26;out=String.fromCharCode(65+rem)+out;n=Math.floor((n-1)/26)}return out}
  private unitLabel(units: Map<string,{ma:string;maDinhDanh:string|null}>, id?:string){return id ? [...units.values()].find((unit)=>unit.ma===id)?.maDinhDanh ?? id : null}
  private async createProfileInTransaction(tx:Prisma.TransactionClient,actor:TaiKhoanDaXacThuc,dto:TaoHoSoDto,donVi:{chiBo:string;to?:string},hash?:string,ip:string|null=null){
    const profile=await tx.hoSoDangVien.create({data:{maHoSoNoiBo:dto.maHoSoNoiBo.trim(),soPhieuLyLich:dto.soPhieuLyLich?.trim()||null,soTheDangVien:dto.soTheDangVien?.trim()||null,khoaDangVien:dto.khoaDangVien?.trim()||null,hoVaTen:dto.hoVaTen.trim(),trangThai:dto.trangThai,trangThaiDangVien:dto.trangThaiDangVien,ngayVaoDang:dateOnly(dto.ngayVaoDang),ngayChinhThuc:dateOnly(dto.ngayChinhThuc),thongTinCaNhan:{create:{ngaySinh:dateOnly(dto.ngaySinh),gioiTinh:dto.gioiTinh,soCccd:dto.soCccd?.trim(),ngayCapCccd:dateOnly(dto.ngayCapCccd),noiCapCccd:dto.noiCapCccd,quocTich:dto.quocTich,danToc:dto.danToc,tonGiao:dto.tonGiao,soDienThoai:dto.soDienThoai,soDienThoaiBoNguoiNuoiDuong:dto.soDienThoaiBoNguoiNuoiDuong,soDienThoaiMeNguoiNuoiDuong:dto.soDienThoaiMeNguoiNuoiDuong,emailLienHe:dto.emailLienHe}},diaChi:{create:(dto.diaChi??[]).map(a=>({loaiDiaChi:a.loaiDiaChi,phanLoaiNoiSinh:a.phanLoaiNoiSinh as never,quocGia:a.quocGia,tinhThanhPho:a.tinhThanhPho,quanHuyen:a.quanHuyen,xaPhuong:a.xaPhuong,diaChiChiTiet:a.diaChiChiTiet}))},...(dto.thongTinSinhVien?{thongTinSinhVien:{create:dto.thongTinSinhVien}}:{}),...(dto.ngayVaoDang?{quaTrinh:{create:{loaiSuKien:'VAO_DANG_DU_BI',ngaySuKien:dateOnly(dto.ngayVaoDang)!,soQuyetDinh:dto.soQuyetDinhKetNap?.trim(),ngayQuyetDinh:dateOnly(dto.ngayQuyetDinhKetNap),donViBanHanhQuyetDinh:dto.donViBanHanhQuyetDinh?.trim(),nguoiGioiThieuThuNhat:dto.nguoiGioiThieuThuNhat?.trim(),nguoiGioiThieuThuHai:dto.nguoiGioiThieuThuHai?.trim(),maNguoiGhiNhan:actor.maTaiKhoan}}}:{})},select:{ma:true,maHoSoNoiBo:true,hoVaTen:true}})
    await tx.lichSuDonViDangVien.create({data:{maHoSo:profile.ma,maChiBo:donVi.chiBo,maTo:donVi.to,ngayHieuLucTu:dateOnly(dto.ngaySinhHoatTu)!,maNguoiGhiNhan:actor.maTaiKhoan}})
    let account:{ma:string;tenDangNhap:string}|undefined
    if(dto.taiKhoanMoi&&hash)account=await tx.taiKhoanNguoiDung.create({data:{tenDangNhap:dto.taiKhoanMoi.tenDangNhap.trim(),email:dto.taiKhoanMoi.email?.trim(),matKhauBam:hash,trangThai:'DANG_HOAT_DONG',doiMatKhauLanDau:false,hoSoDangVien:{connect:{ma:profile.ma}}},select:{ma:true,tenDangNhap:true}})
    await this.audit(tx,actor,profile.ma,'HO_SO_DANG_VIEN_TAO',ip,undefined,{maHoSoNoiBo:profile.maHoSoNoiBo,soPhieuLyLich:dto.soPhieuLyLich?.trim()||null,soTheDangVien:dto.soTheDangVien?.trim()||null,khoaDangVien:dto.khoaDangVien?.trim()||null,trangThaiDangVien:dto.trangThaiDangVien,coTaiKhoan:Boolean(account)})
    if(account)await this.audit(tx,actor,account.ma,'TAI_KHOAN_TAO_KEM_HO_SO',ip,undefined,{tenDangNhap:account.tenDangNhap,maHoSo:profile.ma})
    return {...profile,taiKhoan:account?{tenDangNhap:account.tenDangNhap}:null}
  }

  async hoSoCuaToi(actor: TaiKhoanDaXacThuc) {
    const profile = await this.prisma.hoSoDangVien.findUnique({ where: { maTaiKhoan: actor.maTaiKhoan }, select: { ma: true } })
    if (!profile) return { hoSo: null }
    return { hoSo: await this.chiTiet(actor, profile.ma, true) }
  }

  async xoa(actor: TaiKhoanDaXacThuc, id: string, ip: string | null) {
    await this.phanQuyen.kiemTra(actor.maTaiKhoan, 'HO_SO_DANG_VIEN_XOA', { maHoSo: id }, actor.maPhien)

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT ma_ho_so FROM ho_so_dang_vien WHERE ma_ho_so = ${id}::uuid FOR UPDATE`
      const profile = await tx.hoSoDangVien.findUnique({
        where: { ma: id },
        select: {
          ma: true, maHoSoNoiBo: true, ngayTao: true, ngayVaoDang: true, maTaiKhoan: true,
          taiKhoan: { select: { ma: true, trangThai: true } },
          lichSuDonVi: { select: { ma: true, maNguoiGhiNhan: true, ngayTao: true, ngayHieuLucDen: true, lyDoChuyen: true } },
          quaTrinh: { select: { ma: true, loaiSuKien: true, ngaySuKien: true, maNguoiGhiNhan: true, ngayTao: true } },
          phanCongChucVu: { select: { ma: true } },
          yeuCauCapNhat: { select: { ma: true } },
        },
      })
      if (!profile) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_HO_SO', thongBao: 'Không tìm thấy hồ sơ Đảng viên.' })

      const refusal = async (maLoi: string, thongBao: string, dieuKien: string[]) => {
        await tx.nhatKyKiemToan.create({ data: {
          maNguoiThucHien: actor.maTaiKhoan, hanhDong: 'HO_SO_DANG_VIEN_XOA', loaiDoiTuong: 'HO_SO_DANG_VIEN',
          maDoiTuong: id, ketQua: 'TU_CHOI', lyDo: thongBao,
          duLieuTruoc: { maHoSoNoiBo: profile.maHoSoNoiBo } as Prisma.InputJsonValue,
          duLieuSau: { maLoi, dieuKien } as Prisma.InputJsonValue,
          maTuongQuan: randomUUID(), diaChiIp: ip,
        } })
        return { biTuChoi: true as const, maLoi, thongBao }
      }

      const created = await tx.nhatKyKiemToan.findFirst({
        where: { loaiDoiTuong: 'HO_SO_DANG_VIEN', maDoiTuong: id, hanhDong: 'HO_SO_DANG_VIEN_TAO', ketQua: 'THANH_CONG' },
        orderBy: { thoiDiem: 'asc' },
        select: { maNguoiThucHien: true, thoiDiem: true },
      })
      const sameCreation = (maNguoiGhiNhan: string, ngayTao: Date) => Boolean(
        created?.maNguoiThucHien === maNguoiGhiNhan && created.thoiDiem.getTime() === ngayTao.getTime() && profile.ngayTao.getTime() === created.thoiDiem.getTime(),
      )
      const reasons: string[] = []

      if (!created?.maNguoiThucHien) reasons.push('Không xác định được nhật ký tạo hồ sơ để xác minh dữ liệu ban đầu.')
      const initialMembership = profile.lichSuDonVi.length === 1 && profile.lichSuDonVi[0]
      if (!initialMembership || !created?.maNguoiThucHien || !sameCreation(initialMembership.maNguoiGhiNhan, initialMembership.ngayTao) || initialMembership.ngayHieuLucDen !== null || initialMembership.lyDoChuyen !== null) {
        reasons.push('Hồ sơ đã có lịch sử sinh hoạt Đảng phát sinh sau khi tạo hoặc không thể xác minh bản ghi ban đầu.')
      }
      const initialPartyProcess = profile.ngayVaoDang
        ? profile.quaTrinh.length === 1 && profile.quaTrinh[0]?.loaiSuKien === 'VAO_DANG_DU_BI' && profile.quaTrinh[0].ngaySuKien.toISOString().slice(0, 10) === profile.ngayVaoDang.toISOString().slice(0, 10) && sameCreation(profile.quaTrinh[0].maNguoiGhiNhan, profile.quaTrinh[0].ngayTao)
        : profile.quaTrinh.length === 0
      if (!initialPartyProcess) reasons.push('Hồ sơ đã có quá trình Đảng ngoài dữ liệu vào Đảng ban đầu cần được bảo lưu.')
      if (profile.phanCongChucVu.length) reasons.push('Hồ sơ đã phát sinh phân công chức vụ cần được bảo lưu.')
      if (profile.yeuCauCapNhat.length) reasons.push('Hồ sơ đã phát sinh yêu cầu cập nhật cần được bảo lưu.')
      if (reasons.length) return refusal('HO_SO_DA_PHAT_SINH_NGHIEP_VU', reasons.join(' '), reasons)

      const now = new Date()
      if (profile.taiKhoan) {
        await khoaKiemTraQuanTriVienCuoi(tx)
        const activeSystemAdminAssignment = profile.taiKhoan.trangThai === 'DANG_HOAT_DONG'
          ? await tx.phanCongVaiTro.count({ where: {
            maTaiKhoan: profile.taiKhoan.ma, loaiPhamVi: 'TOAN_HE_THONG', ngayHieuLucTu: { lte: now },
            OR: [{ ngayHieuLucDen: null }, { ngayHieuLucDen: { gt: now } }], thuHoiLuc: null,
            vaiTro: { maDinhDanh: systemAdministratorRoleCode, laVaiTroHeThong: true, trangThai: 'DANG_HOAT_DONG' },
          } })
          : 0
        if (activeSystemAdminAssignment && await demQuanTriVienToanHeThongHopLe(tx, now, { maTaiKhoan: profile.taiKhoan.ma }) === 0) {
          return refusal('KHONG_THE_KHOA_QUAN_TRI_VIEN_CUOI_CUNG', 'Không thể xóa hồ sơ vì tài khoản liên kết là Quản trị viên toàn hệ thống hợp lệ cuối cùng.', ['Tài khoản liên kết phải bị khóa và thu hồi phân công theo chính sách xóa hồ sơ.'])
        }

        const revokedAssignments = await tx.phanCongVaiTro.updateMany({
          where: { maTaiKhoan: profile.taiKhoan.ma, thuHoiLuc: null },
          data: { thuHoiLuc: now, maNguoiThuHoi: actor.maTaiKhoan, lyDo: 'Thu hồi do xóa vật lý hồ sơ Đảng viên liên kết.' },
        })
        const trangThaiMoi = profile.taiKhoan.trangThai === 'DANG_HOAT_DONG' ? 'TAM_KHOA' : profile.taiKhoan.trangThai
        await tx.taiKhoanNguoiDung.update({ where: { ma: profile.taiKhoan.ma }, data: { trangThai: trangThaiMoi } })
        await tx.phienDangNhap.updateMany({ where: { maTaiKhoan: profile.taiKhoan.ma, thuHoiLuc: null }, data: { thuHoiLuc: now, maPhanCongVaiTroDangHoatDong: null } })
        await tx.nhatKyKiemToan.create({ data: {
          maNguoiThucHien: actor.maTaiKhoan, hanhDong: 'TAI_KHOAN_KHOA_DO_XOA_HO_SO_LIEN_KET', loaiDoiTuong: 'TAI_KHOAN',
          maDoiTuong: profile.taiKhoan.ma, ketQua: 'THANH_CONG',
          duLieuTruoc: { trangThai: profile.taiKhoan.trangThai } as Prisma.InputJsonValue,
          duLieuSau: { trangThai: trangThaiMoi, soPhanCongThuHoi: revokedAssignments.count, lyDo: 'Xóa hồ sơ Đảng viên liên kết.' } as Prisma.InputJsonValue,
          maTuongQuan: randomUUID(), diaChiIp: ip,
        } })
      }

      await tx.nhatKyKiemToan.create({ data: {
        maNguoiThucHien: actor.maTaiKhoan, hanhDong: 'HO_SO_DANG_VIEN_XOA', loaiDoiTuong: 'HO_SO_DANG_VIEN',
        maDoiTuong: id, ketQua: 'THANH_CONG',
        duLieuTruoc: { maHoSoNoiBo: profile.maHoSoNoiBo, soLichSuSinhHoatXoa: profile.lichSuDonVi.length, soQuaTrinhBanDauXoa: profile.quaTrinh.length, taiKhoanLienKet: Boolean(profile.taiKhoan) } as Prisma.InputJsonValue,
        maTuongQuan: randomUUID(), diaChiIp: ip,
      } })
      await tx.diaChiDangVien.deleteMany({ where: { maHoSo: id } })
      await tx.thongTinSinhVien.deleteMany({ where: { maHoSo: id } })
      await tx.thongTinCaNhanDangVien.deleteMany({ where: { maHoSo: id } })
      await tx.lichSuDonViDangVien.deleteMany({ where: { maHoSo: id } })
      await tx.quaTrinhDangVien.deleteMany({ where: { maHoSo: id } })
      await tx.hoSoDangVien.delete({ where: { ma: id } })
      return { biTuChoi: false as const, daXoa: true, maHoSo: id, taiKhoanLienKetDaKhoa: Boolean(profile.taiKhoan) }
    })

    if (result.biTuChoi) throw new ConflictException({ maLoi: result.maLoi, thongBao: result.thongBao })
    return { daXoa: result.daXoa, maHoSo: result.maHoSo, taiKhoanLienKetDaKhoa: result.taiKhoanLienKetDaKhoa }
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
      thongTinCaNhan: personal ? { select: { ngaySinh: true, gioiTinh: true, soCccd: true, ngayCapCccd: true, noiCapCccd: true, quocTich: true, danToc: true, tonGiao: true, soDienThoai: true, soDienThoaiBoNguoiNuoiDuong: true, soDienThoaiMeNguoiNuoiDuong: true, emailLienHe: true } } : false,
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

  async chuyenSinhHoatNgoai(actor: TaiKhoanDaXacThuc, id: string) {
    await this.phanQuyen.kiemTra(actor.maTaiKhoan, 'SINH_HOAT_XEM_LICH_SU', { maHoSo: id }, actor.maPhien)
    return this.prisma.chuyenSinhHoatNgoai.findMany({ where: { maHoSo: id }, orderBy: [{ namChuyenDi: 'desc' }, { thangChuyenDi: 'desc' }], select: { ma: true, tenChiBoChuyenDi: true, tenDangUyQuanLy: true, tinhThanhPho: true, noiDung: true, thangChuyenDi: true, namChuyenDi: true, ngayChuyenDi: true, lichSuDonViTiepNhan: { select: { ma: true, maChiBo: true, maTo: true, ngayHieuLucTu: true } } } })
  }

  async taoChuyenSinhHoatNgoai(actor: TaiKhoanDaXacThuc, id: string, dto: TaoChuyenSinhHoatNgoaiDto, ip: string | null) {
    const profile = await this.prisma.hoSoDangVien.findUnique({ where: { ma: id }, select: { maTaiKhoan: true } })
    if (!profile) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_HO_SO', thongBao: 'Không tìm thấy hồ sơ Đảng viên.' })
    if (profile.maTaiKhoan !== actor.maTaiKhoan) throw new ForbiddenException({ maLoi: 'CHI_DANG_VIEN_TU_KHAI_BAO', thongBao: 'Chỉ Đảng viên sở hữu hồ sơ mới được bổ sung thông tin chuyển sinh hoạt ngoài PTIT.' })
    await this.phanQuyen.kiemTra(actor.maTaiKhoan, 'SINH_HOAT_SUA_LICH_SU', { maHoSo: id }, actor.maPhien)
    const history = await this.prisma.lichSuDonViDangVien.findFirst({ where: { ma: dto.maLichSuDonViTiepNhan, maHoSo: id }, select: { ma: true, ngayHieuLucTu: true } })
    if (!history) throw new BadRequestException({ maLoi: 'DON_VI_TIEP_NHAN_KHONG_HOP_LE', thongBao: 'Hãy chọn một lần sinh hoạt tại PTIT đã được ghi nhận trong hồ sơ.' })
    const transferDate = dateOnly(dto.ngayChuyenDi)
    if (transferDate && (transferDate.getUTCMonth() + 1 !== dto.thangChuyenDi || transferDate.getUTCFullYear() !== dto.namChuyenDi)) throw new BadRequestException({ maLoi: 'THOI_DIEM_CHUYEN_KHONG_KHOP', thongBao: 'Ngày chuyển đi phải thuộc đúng tháng và năm đã chọn.' })
    try {
      return await this.prisma.$transaction(async (tx) => {
        const created = await tx.chuyenSinhHoatNgoai.create({ data: { maHoSo: id, maLichSuDonViTiepNhan: history.ma, tenChiBoChuyenDi: dto.tenChiBoChuyenDi.trim(), tenDangUyQuanLy: dto.tenDangUyQuanLy?.trim(), tinhThanhPho: dto.tinhThanhPho?.trim(), noiDung: dto.noiDung?.trim(), thangChuyenDi: dto.thangChuyenDi, namChuyenDi: dto.namChuyenDi, ngayChuyenDi: transferDate }, select: { ma: true, tenChiBoChuyenDi: true, tenDangUyQuanLy: true, tinhThanhPho: true, noiDung: true, thangChuyenDi: true, namChuyenDi: true, ngayChuyenDi: true, maLichSuDonViTiepNhan: true } })
        await this.audit(tx, actor, id, 'HO_SO_DANG_VIEN_CHUYEN_SINH_HOAT_NGOAI_TAO', ip, undefined, { maChuyenSinhHoat: created.ma, tenChiBoChuyenDi: created.tenChiBoChuyenDi, tenDangUyQuanLy: created.tenDangUyQuanLy, tinhThanhPho: created.tinhThanhPho, coNoiDung: Boolean(created.noiDung), thangChuyenDi: created.thangChuyenDi, namChuyenDi: created.namChuyenDi, ngayChuyenDi: created.ngayChuyenDi, maLichSuDonViTiepNhan: created.maLichSuDonViTiepNhan })
        return created
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException({ maLoi: 'DA_CO_THONG_TIN_CHUYEN_NGOAI', thongBao: 'Lần sinh hoạt tại PTIT này đã có thông tin đơn vị chuyển đến.' })
      throw error
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

  async daoTaoDang(actor: TaiKhoanDaXacThuc, id: string) {
    await this.phanQuyen.kiemTra(actor.maTaiKhoan, 'DAO_TAO_DANG_XEM', { maHoSo: id }, actor.maPhien)
    return this.prisma.thongTinDaoTaoDang.findMany({
      where: { maHoSo: id }, orderBy: [{ ngayTao: 'desc' }, { ma: 'asc' }],
      select: { ma: true, loaiLop: true, tenChuongTrinh: true, trangThai: true, ngayHoanThanh: true, donViToChuc: true, ghiChu: true, ngayTao: true, ngayCapNhat: true,
        taiLieu: { where: { trangThai: 'DANG_SU_DUNG', loaiTaiLieu: 'GIAY_CHUNG_NHAN_DANG_VIEN_MOI' }, select: { ma: true, loaiTaiLieu: true, tenTepGoc: true, kichThuoc: true, ngayTao: true } } },
    })
  }

  async taoDaoTaoDang(actor: TaiKhoanDaXacThuc, id: string, dto: TaoDaoTaoDangDto, ip: string | null) {
    await this.phanQuyen.kiemTra(actor.maTaiKhoan, 'DAO_TAO_DANG_TAO', { maHoSo: id }, actor.maPhien)
    const row = await this.prisma.$transaction(async (tx) => {
      const created = await tx.thongTinDaoTaoDang.create({ data: { maHoSo: id, loaiLop: dto.loaiLop, tenChuongTrinh: dto.tenChuongTrinh, trangThai: dto.trangThai, ngayHoanThanh: dateOnly(dto.ngayHoanThanh), donViToChuc: dto.donViToChuc, ghiChu: dto.ghiChu }, select: { ma: true, loaiLop: true, tenChuongTrinh: true, trangThai: true, ngayHoanThanh: true, donViToChuc: true, ghiChu: true, ngayTao: true, ngayCapNhat: true } })
      await this.audit(tx, actor, id, 'HO_SO_DANG_VIEN_DAO_TAO_DANG_TAO', ip, undefined, { maDaoTao: created.ma, loaiLop: created.loaiLop, tenChuongTrinh: created.tenChuongTrinh, trangThai: created.trangThai, ngayHoanThanh: created.ngayHoanThanh, donViToChuc: created.donViToChuc })
      return created
    })
    return row
  }

  async suaDaoTaoDang(actor: TaiKhoanDaXacThuc, id: string, maDaoTao: string, dto: TaoDaoTaoDangDto, ip: string | null) {
    await this.phanQuyen.kiemTra(actor.maTaiKhoan, 'DAO_TAO_DANG_SUA', { maHoSo: id }, actor.maPhien)
    const before = await this.prisma.thongTinDaoTaoDang.findFirst({ where: { ma: maDaoTao, maHoSo: id } })
    if (!before) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_QUA_TRINH_DAO_TAO', thongBao: 'Không tìm thấy thông tin đào tạo Đảng của hồ sơ này.' })
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.thongTinDaoTaoDang.update({ where: { ma: maDaoTao }, data: { loaiLop: dto.loaiLop, tenChuongTrinh: dto.tenChuongTrinh, trangThai: dto.trangThai, ngayHoanThanh: dateOnly(dto.ngayHoanThanh), donViToChuc: dto.donViToChuc, ghiChu: dto.ghiChu }, select: { ma: true, loaiLop: true, tenChuongTrinh: true, trangThai: true, ngayHoanThanh: true, donViToChuc: true, ghiChu: true, ngayTao: true, ngayCapNhat: true } })
      await this.audit(tx, actor, id, 'HO_SO_DANG_VIEN_DAO_TAO_DANG_SUA', ip, { maDaoTao: before.ma, loaiLop: before.loaiLop, tenChuongTrinh: before.tenChuongTrinh, trangThai: before.trangThai, ngayHoanThanh: before.ngayHoanThanh, donViToChuc: before.donViToChuc }, { maDaoTao: updated.ma, loaiLop: updated.loaiLop, tenChuongTrinh: updated.tenChuongTrinh, trangThai: updated.trangThai, ngayHoanThanh: updated.ngayHoanThanh, donViToChuc: updated.donViToChuc })
      return updated
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
          thongTinCaNhan: { create: { ngaySinh: dateOnly(dto.ngaySinh), gioiTinh: dto.gioiTinh, soCccd, ngayCapCccd: dateOnly(dto.ngayCapCccd), noiCapCccd: dto.noiCapCccd, quocTich: dto.quocTich, danToc: dto.danToc, tonGiao: dto.tonGiao, soDienThoai: dto.soDienThoai, soDienThoaiBoNguoiNuoiDuong: dto.soDienThoaiBoNguoiNuoiDuong, soDienThoaiMeNguoiNuoiDuong: dto.soDienThoaiMeNguoiNuoiDuong, emailLienHe: dto.emailLienHe } },
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
    if (['ngaySinh','gioiTinh','soCccd','ngayCapCccd','noiCapCccd','quocTich','danToc','tonGiao','soDienThoai','soDienThoaiBoNguoiNuoiDuong','soDienThoaiMeNguoiNuoiDuong','emailLienHe'].some((key) => Object.hasOwn(dto, key))) await this.phanQuyen.kiemTra(actor.maTaiKhoan, 'HO_SO_CA_NHAN_SUA', { maHoSo: id }, actor.maPhien)
    if (Object.hasOwn(dto, 'diaChi')) await this.phanQuyen.kiemTra(actor.maTaiKhoan, 'HO_SO_DIA_CHI_SUA', { maHoSo: id }, actor.maPhien)
    if (Object.hasOwn(dto, 'thongTinSinhVien')) await this.phanQuyen.kiemTra(actor.maTaiKhoan, 'HO_SO_SINH_VIEN_SUA', { maHoSo: id }, actor.maPhien)
    const before = await this.prisma.hoSoDangVien.findUnique({ where: { ma: id }, select: { ma: true, maHoSoNoiBo: true, soPhieuLyLich: true, soTheDangVien: true, khoaDangVien: true, hoVaTen: true, trangThai: true, trangThaiDangVien: true, ngayVaoDang: true } })
    if (!before) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_HO_SO', thongBao: 'Không tìm thấy hồ sơ Đảng viên.' })
    if (dto.soCccd !== undefined) {
      await this.phanQuyen.kiemTra(actor.maTaiKhoan, 'HO_SO_CA_NHAN_SUA', { maHoSo: id }, actor.maPhien)
      if (!dto.soCccd) throw new ConflictException({ maLoi: 'KHONG_HO_TRO_XOA_CCCD', thongBao: 'Không thể xóa CCCD qua biểu mẫu này.' })
    }
    try { return await this.prisma.$transaction(async (tx) => {
      const caNhan = { ngaySinh: dateOnly(dto.ngaySinh), gioiTinh: dto.gioiTinh, soCccd: dto.soCccd?.trim(), ngayCapCccd: dateOnly(dto.ngayCapCccd), noiCapCccd: dto.noiCapCccd, quocTich: dto.quocTich, danToc: dto.danToc, tonGiao: dto.tonGiao, soDienThoai: dto.soDienThoai, soDienThoaiBoNguoiNuoiDuong: dto.soDienThoaiBoNguoiNuoiDuong, soDienThoaiMeNguoiNuoiDuong: dto.soDienThoaiMeNguoiNuoiDuong, emailLienHe: dto.emailLienHe }
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
  private async audit(tx: Prisma.TransactionClient, actor: TaiKhoanDaXacThuc, target: string | null, action: string, ip: string | null, before?: object, after?: object) { await tx.nhatKyKiemToan.create({ data: { maNguoiThucHien: actor.maTaiKhoan, hanhDong: action, loaiDoiTuong: 'HO_SO_DANG_VIEN', maDoiTuong: target, ketQua: 'THANH_CONG', duLieuTruoc: before as Prisma.InputJsonValue, duLieuSau: after as Prisma.InputJsonValue, maTuongQuan: randomUUID(), diaChiIp: ip } }) }
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
