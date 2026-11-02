import 'dotenv/config'
import { randomUUID } from 'node:crypto'
import { stdin, stdout } from 'node:process'
import { StringDecoder } from 'node:string_decoder'
import { createInterface } from 'node:readline/promises'
import { userInfo } from 'node:os'
import { PrismaPg } from '@prisma/adapter-pg'
import { Prisma, PrismaClient } from '../infrastructure/database/generated/prisma/client'
import { BamMatKhauService } from '../modules/auth/password-hasher'
import {
  demQuanTriVienToanHeThongHopLe,
  khoaKiemTraQuanTriVienCuoi,
  systemAdministratorPermissionCodes,
  systemAdministratorRoleCode,
  yeuCauConQuanTriVienHopLe,
} from '../modules/authorization/system-administrator.policy'

const active = 'DANG_HOAT_DONG'

function inputSecret(label: string) {
  if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') throw new Error('Cần terminal tương tác để xác minh thông tin xác thực.')
  return new Promise<string>((resolve, reject) => {
    let value = ''
    const decoder = new StringDecoder('utf8')
    stdin.setRawMode(true)
    stdin.resume()
    stdout.write(label)
    const finish = (error?: Error) => {
      stdin.off('data', onData)
      stdin.setRawMode(false)
      stdout.write('\n')
      error ? reject(error) : resolve(value)
    }
    const onData = (chunk: Buffer) => {
      for (const char of decoder.write(chunk)) {
        if (char === '\u0003') return finish(new Error('Đã hủy thao tác.'))
        if (char === '\r' || char === '\n') return finish()
        if (char === '\u007f' || char === '\b') value = Array.from(value).slice(0, -1).join('')
        else if (char >= ' ') value += char
      }
    }
    stdin.on('data', onData)
  })
}

function operatorIdentity() {
  const identity = userInfo().username
  const approved = (process.env['NGUOI_VAN_HANH_DUOC_UY_QUYEN'] ?? '').split(',').map((value) => value.trim().toLowerCase()).filter(Boolean)
  if (!approved.includes(identity.toLowerCase())) throw new Error('Tài khoản hệ điều hành không nằm trong danh sách người vận hành được ủy quyền.')
  return identity
}

async function verifyAccount(prisma: PrismaClient, username: string, password: string, mustBeSystemAdmin: boolean) {
  const account = await prisma.taiKhoanNguoiDung.findUnique({ where: { tenDangNhap: username } })
  if (!account || account.trangThai !== active || account.doiMatKhauLanDau
    || !(await new BamMatKhauService().kiemTra(password, account.matKhauBam))) {
    throw new Error('Không thể xác minh tài khoản hoặc tài khoản chưa sẵn sàng.')
  }
  if (mustBeSystemAdmin) {
    const now = new Date()
    const assignment = await prisma.phanCongVaiTro.findFirst({
      where: {
        maTaiKhoan: account.ma, loaiPhamVi: 'TOAN_HE_THONG', thuHoiLuc: null,
        ngayHieuLucTu: { lte: now }, OR: [{ ngayHieuLucDen: null }, { ngayHieuLucDen: { gt: now } }],
        vaiTro: { maDinhDanh: systemAdministratorRoleCode, laVaiTroHeThong: true, trangThai: active },
      }, select: { ma: true },
    })
    if (!assignment) throw new Error('Người duyệt phải là Quản trị viên toàn hệ thống đang hoạt động.')
  }
  return account
}

async function verifyAdministratorInTransaction(tx: Prisma.TransactionClient, maTaiKhoan: string, expectedHash: string) {
  const account = await tx.taiKhoanNguoiDung.findUnique({ where: { ma: maTaiKhoan }, select: { matKhauBam: true, trangThai: true, doiMatKhauLanDau: true } })
  if (!account || account.matKhauBam !== expectedHash || account.trangThai !== active || account.doiMatKhauLanDau) {
    throw new Error('Tài khoản người duyệt thay đổi trong lúc xác minh; thao tác đã hủy.')
  }
  const now = new Date()
  const assignment = await tx.phanCongVaiTro.findFirst({
    where: {
      maTaiKhoan, loaiPhamVi: 'TOAN_HE_THONG', thuHoiLuc: null,
      ngayHieuLucTu: { lte: now }, OR: [{ ngayHieuLucDen: null }, { ngayHieuLucDen: { gt: now } }],
      taiKhoan: { trangThai: active },
      vaiTro: { maDinhDanh: systemAdministratorRoleCode, laVaiTroHeThong: true, trangThai: active },
    }, select: { ma: true },
  })
  if (!assignment) throw new Error('Người duyệt không còn là Quản trị viên toàn hệ thống hợp lệ.')
}

async function grant(prisma: PrismaClient, operator: string, reference: string, recovery = false) {
  const prompt = createInterface({ input: stdin, output: stdout })
  let username: string
  let approverUsername: string | undefined
  try {
    username = (await prompt.question('Tài khoản được chỉ định giữ quyền Quản trị viên toàn hệ thống: ')).trim()
    if (!username || username.length > 100) throw new Error('Tên tài khoản không hợp lệ.')
    const administratorCount = await demQuanTriVienToanHeThongHopLe(prisma as never)
    if (recovery && administratorCount > 0) throw new Error('Chỉ dùng khôi phục khi hiện không còn Quản trị viên toàn hệ thống hợp lệ.')
    if (administratorCount > 0 && !recovery) {
      approverUsername = (await prompt.question('Tài khoản Quản trị viên phê duyệt thao tác: ')).trim()
      if (!approverUsername || approverUsername === username) throw new Error('Người duyệt phải là tài khoản khác với tài khoản đích.')
    } else if (!recovery && username.toLowerCase() !== (process.env['TAI_KHOAN_QUAN_TRI_VIEN_DAU_TIEN'] ?? '').trim().toLowerCase()) {
      throw new Error('Tài khoản đích không khớp tài khoản Quản trị viên đầu tiên đã chỉ định trong cấu hình vận hành.')
    }
  } finally { prompt.close() }
  const password = await inputSecret(`Mật khẩu hiện tại của ${username} (không hiển thị): `)
  const target = await verifyAccount(prisma, username, password, false)
  let approver: Awaited<ReturnType<typeof verifyAccount>> | undefined
  if (approverUsername) {
    const approverPassword = await inputSecret(`Mật khẩu hiện tại của ${approverUsername} (không hiển thị): `)
    approver = await verifyAccount(prisma, approverUsername, approverPassword, true)
  }

  const result = await prisma.$transaction(async (tx) => {
    await khoaKiemTraQuanTriVienCuoi(tx)
    await tx.$queryRaw`SELECT "ma_tai_khoan" FROM "tai_khoan_nguoi_dung" WHERE "ma_tai_khoan" = ${target.ma}::uuid FOR UPDATE`
    const locked = await tx.taiKhoanNguoiDung.findUnique({ where: { ma: target.ma } })
    if (!locked || locked.matKhauBam !== target.matKhauBam || locked.trangThai !== active || locked.doiMatKhauLanDau) {
      throw new Error('Tài khoản thay đổi trong lúc xác minh; thao tác đã hủy.')
    }
    const activeAdministrators = await demQuanTriVienToanHeThongHopLe(tx)
    if (recovery && activeAdministrators > 0) throw new Error('Khôi phục bị từ chối vì vẫn còn Quản trị viên toàn hệ thống hợp lệ.')
    if (!recovery && activeAdministrators > 0 && !approver) throw new Error('Cần Quản trị viên toàn hệ thống đang hoạt động phê duyệt.')
    if (await tx.phanCongVaiTro.findFirst({
      where: {
        maTaiKhoan: target.ma, loaiPhamVi: 'TOAN_HE_THONG', thuHoiLuc: null,
        ngayHieuLucTu: { lte: new Date() }, OR: [{ ngayHieuLucDen: null }, { ngayHieuLucDen: { gt: new Date() } }],
        vaiTro: { maDinhDanh: systemAdministratorRoleCode, laVaiTroHeThong: true, trangThai: active },
      },
      select: { ma: true },
    })) throw new Error('Tài khoản đã có Assignment Quản trị viên toàn hệ thống; không cấp trùng.')
    if (approver) await verifyAdministratorInTransaction(tx, approver.ma, approver.matKhauBam)

    const permissionRows = await tx.quyen.findMany({ where: { maDinhDanh: { in: [...systemAdministratorPermissionCodes] } }, select: { ma: true, maDinhDanh: true } })
    if (permissionRows.length !== systemAdministratorPermissionCodes.length) throw new Error('Danh mục Permission quản trị chưa được đồng bộ đầy đủ.')
    let role = await tx.vaiTro.findUnique({ where: { maDinhDanh: systemAdministratorRoleCode } })
    const createdRole = !role
    if (!role) role = await tx.vaiTro.create({ data: {
      maDinhDanh: systemAdministratorRoleCode, ten: 'Quản trị viên toàn hệ thống',
      moTa: 'Quản trị kỹ thuật toàn hệ thống; không thay thế quy trình phê duyệt nghiệp vụ.',
      laVaiTroHeThong: true, trangThai: active,
    } })
    if (!role.laVaiTroHeThong || role.trangThai !== active) throw new Error('Role quản trị toàn hệ thống hiện có không đúng trạng thái hệ thống.')
    const existingLinks = await tx.vaiTroQuyen.findMany({ where: { maVaiTro: role.ma }, include: { quyen: { select: { maDinhDanh: true } } } })
    const expected = new Set<string>(systemAdministratorPermissionCodes)
    if (existingLinks.some(({ quyen }) => !expected.has(quyen.maDinhDanh))) throw new Error('Role hệ thống có Permission ngoài danh sách được duyệt; từ chối tự ý mở rộng.')
    const linked = new Set(existingLinks.map(({ quyen }) => quyen.maDinhDanh))
    const missing = permissionRows.filter(({ maDinhDanh }) => !linked.has(maDinhDanh))
    if (missing.length) {
      await tx.vaiTroQuyen.createMany({ data: missing.map(({ ma }) => ({ maVaiTro: role!.ma, maQuyen: ma, maNguoiGhiNhan: null })) })
      await tx.nhatKyKiemToan.create({ data: {
        maNguoiThucHien: approver?.ma ?? null, hanhDong: 'CAP_NHAT_QUYEN_QUAN_TRI_VIEN_TOAN_HE_THONG',
        loaiDoiTuong: 'VAI_TRO', maDoiTuong: role.ma, ketQua: 'THANH_CONG', lyDo: reference,
        duLieuSau: { nguoiVanHanh: operator, maTaiKhoanPheDuyet: approver?.ma ?? null, maQuyenThem: missing.map(({ maDinhDanh }) => maDinhDanh) },
        maTuongQuan: randomUUID(),
      } })
    }
    if (createdRole) await tx.nhatKyKiemToan.create({ data: {
      maNguoiThucHien: approver?.ma ?? null, hanhDong: 'TAO_ROLE_QUAN_TRI_VIEN_TOAN_HE_THONG',
      loaiDoiTuong: 'VAI_TRO', maDoiTuong: role.ma, ketQua: 'THANH_CONG', lyDo: reference,
      duLieuSau: { nguoiVanHanh: operator, maTaiKhoanPheDuyet: approver?.ma ?? null, maDinhDanh: systemAdministratorRoleCode },
      maTuongQuan: randomUUID(),
    } })

    const now = new Date()
    const assignment = await tx.phanCongVaiTro.create({ data: {
      maTaiKhoan: target.ma, maVaiTro: role.ma, loaiPhamVi: 'TOAN_HE_THONG',
      ngayHieuLucTu: now, ngayHieuLucDen: null, maNguoiCap: null,
      lyDo: `CAP_QUAN_TRI_VIEN_TOAN_HE_THONG; ${reference}`,
    } })
    await tx.nhatKyKiemToan.create({ data: {
      maNguoiThucHien: approver?.ma ?? null,
      hanhDong: recovery ? 'KHOI_PHUC_QUAN_TRI_VIEN_TOAN_HE_THONG' : createdRole ? 'KHOI_TAO_QUAN_TRI_VIEN_TOAN_HE_THONG' : 'CAP_QUAN_TRI_VIEN_TOAN_HE_THONG',
      loaiDoiTuong: 'PHAN_CONG_VAI_TRO', maDoiTuong: assignment.ma, ketQua: 'THANH_CONG',
      lyDo: reference,
      duLieuSau: { maTaiKhoanDich: target.ma, maVaiTro: role.ma, maPermission: [...systemAdministratorPermissionCodes],
        loaiPhamVi: 'TOAN_HE_THONG', hetHanLuc: null, nguoiVanHanh: operator, maTaiKhoanPheDuyet: approver?.ma ?? null },
      maTuongQuan: randomUUID(),
    } })

    const legacyAssignments = await tx.phanCongVaiTro.findMany({
      where: { maTaiKhoan: target.ma, thuHoiLuc: null, vaiTro: { maDinhDanh: 'QUAN_TRI_KHOI_TAO_24H', laVaiTroHeThong: true } },
      select: { ma: true },
    })
    for (const legacy of legacyAssignments) {
      await tx.phanCongVaiTro.update({ where: { ma: legacy.ma }, data: {
        thuHoiLuc: now, maNguoiThuHoi: approver?.ma ?? null, lyDo: `THAY_THE_PHUONG_AN_QUAN_TRI_CU; ${reference}`,
      } })
      await tx.nhatKyKiemToan.create({ data: {
        maNguoiThucHien: approver?.ma ?? null, hanhDong: 'THU_HOI_QUYEN_KHOI_TAO_CU',
        loaiDoiTuong: 'PHAN_CONG_VAI_TRO', maDoiTuong: legacy.ma, ketQua: 'THANH_CONG', lyDo: reference,
        duLieuSau: { nguoiVanHanh: operator, maTaiKhoanPheDuyet: approver?.ma ?? null }, maTuongQuan: randomUUID(),
      } })
    }
    return { maPhanCong: assignment.ma, maVaiTro: role.ma, soLegacyRevoked: legacyAssignments.length }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  stdout.write(`Đã cấp Assignment quản trị toàn hệ thống không đặt hạn: ${result.maPhanCong}. Assignment khởi tạo cũ được thu hồi: ${result.soLegacyRevoked}.\n`)
}

async function revoke(prisma: PrismaClient, operator: string, reference: string) {
  const prompt = createInterface({ input: stdin, output: stdout })
  let username: string
  let approverUsername: string
  try {
    username = (await prompt.question('Tài khoản Quản trị viên cần thu hồi: ')).trim()
    approverUsername = (await prompt.question('Tài khoản Quản trị viên phê duyệt thu hồi: ')).trim()
    if (!username || !approverUsername || username === approverUsername) throw new Error('Tài khoản đích và người phê duyệt phải hợp lệ, khác nhau.')
  } finally { prompt.close() }
  const approverPassword = await inputSecret(`Mật khẩu hiện tại của ${approverUsername} (không hiển thị): `)
  const approver = await verifyAccount(prisma, approverUsername, approverPassword, true)
  const target = await prisma.taiKhoanNguoiDung.findUnique({ where: { tenDangNhap: username }, select: { ma: true } })
  if (!target) throw new Error('Không tìm thấy tài khoản đích.')
  const result = await prisma.$transaction(async (tx) => {
    await khoaKiemTraQuanTriVienCuoi(tx)
    await verifyAdministratorInTransaction(tx, approver.ma, approver.matKhauBam)
    const assignments = await tx.phanCongVaiTro.findMany({
      where: { maTaiKhoan: target.ma, loaiPhamVi: 'TOAN_HE_THONG', thuHoiLuc: null, vaiTro: { maDinhDanh: systemAdministratorRoleCode, laVaiTroHeThong: true } },
      select: { ma: true },
    })
    if (!assignments.length) throw new Error('Tài khoản không có Assignment quản trị toàn hệ thống đang chờ thu hồi.')
    await yeuCauConQuanTriVienHopLe(tx, { maTaiKhoan: target.ma })
    const now = new Date()
    for (const assignment of assignments) {
      await tx.phanCongVaiTro.update({ where: { ma: assignment.ma }, data: { thuHoiLuc: now, maNguoiThuHoi: approver.ma, lyDo: reference } })
      await tx.nhatKyKiemToan.create({ data: {
        maNguoiThucHien: approver.ma, hanhDong: 'THU_HOI_QUAN_TRI_VIEN_TOAN_HE_THONG',
        loaiDoiTuong: 'PHAN_CONG_VAI_TRO', maDoiTuong: assignment.ma, ketQua: 'THANH_CONG', lyDo: reference,
        duLieuSau: { nguoiVanHanh: operator, maTaiKhoanPheDuyet: approver.ma, thuHoiLuc: now.toISOString() }, maTuongQuan: randomUUID(),
      } })
    }
    return assignments.length
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  stdout.write(`Đã thu hồi ${result} Assignment quản trị toàn hệ thống.\n`)
}

async function main() {
  const operator = operatorIdentity()
  const operation = process.argv[2]
  if (operation !== 'grant' && operation !== 'revoke' && operation !== 'recover') throw new Error('Cú pháp: manage:system-administrator grant|revoke|recover')
  const prompt = createInterface({ input: stdin, output: stdout })
  let reference: string
  try { reference = (await prompt.question('Mã hồ sơ/ quyết định được phê duyệt: ')).trim() }
  finally { prompt.close() }
  if (!reference || reference.length > 200) throw new Error('Cần mã hồ sơ/quyết định phê duyệt hợp lệ.')
  const connection = process.env['KET_NOI_CO_SO_DU_LIEU']
  if (!connection) throw new Error('Thiếu cấu hình cơ sở dữ liệu.')
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }) })
  try {
    if (operation === 'grant') await grant(prisma, operator, reference)
    else if (operation === 'recover') await grant(prisma, operator, reference, true)
    else await revoke(prisma, operator, reference)
  } finally { await prisma.$disconnect() }
}

main().catch((error: unknown) => {
  const code = typeof error === 'object' && error !== null && 'code' in error ? ` (${String(error.code)})` : ''
  const diagnostics = new Map<string, string>()
  const pending: unknown[] = [error]
  const visited = new Set<object>()
  while (pending.length) {
    const value = pending.shift()
    if (typeof value !== 'object' || value === null || visited.has(value)) continue
    visited.add(value)
    const record = value as Record<string, unknown>
    for (const key of ['code', 'originalCode', 'constraint', 'constraint_name', 'table', 'table_name', 'column', 'column_name']) {
      const field = record[key]
      if (typeof field === 'string' && field.length <= 120 && /^[A-Za-z0-9_.-]+$/.test(field)) diagnostics.set(key, field)
    }
    for (const key of ['meta', 'driverAdapterError', 'cause']) if (record[key]) pending.push(record[key])
  }
  const detail = [...diagnostics.entries()].map(([key, value]) => `${key}=${value}`).join(' ')
  stdout.write(`Không thể hoàn tất thao tác quản trị${code}${detail ? `; ${detail}` : ''}; không ghi thông tin xác thực hoặc dữ liệu truy vấn ra log.\n`)
  process.exitCode = 1
})
