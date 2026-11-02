import 'dotenv/config'
import { NestFactory } from '@nestjs/core'
import { randomUUID } from 'node:crypto'
import { stdin, stdout } from 'node:process'
import { StringDecoder } from 'node:string_decoder'
import { createInterface } from 'node:readline/promises'
import { userInfo } from 'node:os'
import { UngDungModule } from '../app.module'
import { DichVuPrisma } from '../infrastructure/database/prisma.service'
import type { TaiKhoanDaXacThuc } from '../modules/auth/auth.types'
import { BamMatKhauService } from '../modules/auth/password-hasher'
import { ToChucService } from '../modules/organizations/organizations.service'

const username = 'Quantrivien'
const referenceDefault = 'KHOI_TAO_DON_VI_GOC_PTIT_DANG_UY_2026-11-01'
const root = {
  maDinhDanh: 'PTIT_DANG_UY',
  tenDonVi: 'Đảng ủy Học viện Công nghệ Bưu chính Viễn thông',
  loaiDonVi: 'DANG_UY' as const,
  trangThai: 'DANG_HOAT_DONG',
}

function verifyOperator() {
  const current = userInfo().username
  const approved = (process.env['NGUOI_VAN_HANH_DUOC_UY_QUYEN'] ?? '').split(',').map((value) => value.trim().toLowerCase()).filter(Boolean)
  if (!approved.includes(current.toLowerCase())) throw new Error('Tài khoản hệ điều hành không nằm trong allowlist vận hành.')
  return current
}

function inputSecret() {
  if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') throw new Error('Cần terminal tương tác để xác minh mật khẩu không hiển thị.')
  return new Promise<string>((resolve, reject) => {
    let value = ''
    const decoder = new StringDecoder('utf8')
    stdin.setRawMode(true)
    stdin.resume()
    stdout.write(`Mật khẩu hiện tại của ${username} (không hiển thị): `)
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

async function main() {
  const operator = verifyOperator()
  const prompt = createInterface({ input: stdin, output: stdout })
  let reference: string
  try {
    reference = (await prompt.question(`Mã hồ sơ/quyết định (Enter dùng ${referenceDefault}): `)).trim() || referenceDefault
  } finally { prompt.close() }
  if (reference.length > 200) throw new Error('Mã hồ sơ/quyết định quá dài.')

  const password = await inputSecret()
  const app = await NestFactory.createApplicationContext(UngDungModule, { logger: false })
  try {
    const prisma = app.get(DichVuPrisma)
    const account = await prisma.taiKhoanNguoiDung.findUnique({ where: { tenDangNhap: username } })
    if (!account || account.trangThai !== 'DANG_HOAT_DONG' || account.doiMatKhauLanDau
      || !(await app.get(BamMatKhauService).kiemTra(password, account.matKhauBam))) {
      throw new Error('Không thể xác minh tài khoản quản trị hoặc tài khoản chưa sẵn sàng.')
    }
    const actor: TaiKhoanDaXacThuc = {
      maTaiKhoan: account.ma, tenDangNhap: account.tenDangNhap,
      doiMatKhauLanDau: account.doiMatKhauLanDau, maPhien: 'VAN_HANH_NGOAI_API',
    }
    const result = await app.get(ToChucService).tao(actor, {
      loaiDonVi: root.loaiDonVi,
      maDinhDanh: root.maDinhDanh,
      tenDonVi: root.tenDonVi,
      trangThai: root.trangThai,
      ngayHieuLucTu: `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`,
    }, { lyDo: reference, maTuongQuan: randomUUID() })
    stdout.write(`Đơn vị gốc ${root.maDinhDanh} đã sẵn sàng; mã đơn vị: ${result.maDonVi}; trạng thái: ${result.trangThai}; operator=${operator}; căn cứ=${reference}.\n`)
  } finally {
    await app.close()
  }
}

main().catch((error: unknown) => {
  const code = typeof error === 'object' && error !== null && 'code' in error ? ` (${String(error.code)})` : ''
  stdout.write(`Không thể khởi tạo đơn vị gốc${code}; không ghi thông tin xác thực ra log.\n`)
  process.exitCode = 1
})
