import 'dotenv/config'
import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import { StringDecoder } from 'node:string_decoder'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../infrastructure/database/generated/prisma/client'
import { BamMatKhauService } from '../modules/auth/password-hasher'

const trangThaiTaiKhoanHoatDong = 'DANG_HOAT_DONG'

function nhapMatKhauKin(thongBao: string): Promise<string> {
  if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
    return Promise.reject(new Error('Lệnh cần chạy trong terminal tương tác để nhập mật khẩu kín.'))
  }

  return new Promise((resolve, reject) => {
    let matKhau = ''
    const boGiaiMa = new StringDecoder('utf8')
    stdin.setRawMode(true)
    stdin.resume()
    stdout.write(thongBao)

    const ketThuc = (loi?: Error) => {
      stdin.off('data', xuLyDuLieu)
      stdin.setRawMode(false)
      stdout.write('\n')
      if (loi) reject(loi)
      else resolve(matKhau)
    }

    const xuLyDuLieu = (duLieu: Buffer) => {
      for (const kyTu of boGiaiMa.write(duLieu)) {
        if (kyTu === '\u0003') {
          ketThuc(new Error('Đã hủy thao tác.'))
          return
        }
        if (kyTu === '\r' || kyTu === '\n') {
          ketThuc()
          return
        }
        if (kyTu === '\u007f' || kyTu === '\b') {
          matKhau = Array.from(matKhau).slice(0, -1).join('')
        } else if (kyTu >= ' ') {
          matKhau += kyTu
        }
      }
    }

    stdin.on('data', xuLyDuLieu)
  })
}

async function chayBootstrap() {
  const tenDangNhapInput = createInterface({ input: stdin, output: stdout })
  let tenDangNhap: string
  try {
    tenDangNhap = (await tenDangNhapInput.question('Tên đăng nhập quản trị: ')).trim()
  } finally {
    tenDangNhapInput.close()
  }

  if (!tenDangNhap || tenDangNhap.length > 100) {
    throw new Error('Tên đăng nhập phải có từ 1 đến 100 ký tự.')
  }

  const matKhau = await nhapMatKhauKin('Mật khẩu ban đầu (tối thiểu 12 ký tự): ')
  const xacNhanMatKhau = await nhapMatKhauKin('Nhập lại mật khẩu: ')
  if (matKhau.length < 12 || matKhau.length > 128) {
    throw new Error('Mật khẩu phải có từ 12 đến 128 ký tự.')
  }
  if (matKhau !== xacNhanMatKhau) {
    throw new Error('Hai lần nhập mật khẩu không khớp.')
  }

  const chuoiKetNoi = process.env['KET_NOI_CO_SO_DU_LIEU']
  if (!chuoiKetNoi) throw new Error('Thiếu cấu hình KET_NOI_CO_SO_DU_LIEU.')

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: chuoiKetNoi }) })
  try {
    const matKhauBam = await new BamMatKhauService().tao(matKhau)
    const taiKhoanMoi = await prisma.$transaction(async (giaoDich) => {
      await giaoDich.$executeRaw`LOCK TABLE "tai_khoan_nguoi_dung" IN EXCLUSIVE MODE`

      const soTaiKhoan = await giaoDich.taiKhoanNguoiDung.count()
      if (soTaiKhoan !== 0) {
        throw new Error('Đã tồn tại tài khoản; bootstrap chỉ được chạy trên cơ sở dữ liệu chưa có tài khoản.')
      }

      const taiKhoan = await giaoDich.taiKhoanNguoiDung.create({
        data: {
          tenDangNhap,
          matKhauBam,
          trangThai: trangThaiTaiKhoanHoatDong,
          doiMatKhauLanDau: false,
        },
        select: { ma: true, tenDangNhap: true },
      })

      await giaoDich.nhatKyKiemToan.create({
        data: {
          maDoiTuong: taiKhoan.ma,
          hanhDong: 'BOOTSTRAP_TAI_KHOAN_QUAN_TRI',
          loaiDoiTuong: 'TAI_KHOAN',
          ketQua: 'THANH_CONG',
          lyDo: 'KHOI_TAO_TAI_KHOAN_DAU_TIEN',
          duLieuSau: { tenDangNhap: taiKhoan.tenDangNhap, doiMatKhauLanDau: false },
          maTuongQuan: 'BOOTSTRAP_DAU_TIEN',
        },
      })

      return taiKhoan
    })

    stdout.write(`Đã tạo tài khoản quản trị ${taiKhoanMoi.tenDangNhap}. Hãy đăng nhập và đổi mật khẩu lần đầu.\n`)
  } finally {
    await prisma.$disconnect()
  }
}

void chayBootstrap().catch((loi: unknown) => {
  const thongBaoAnToan = new Set([
    'Lệnh cần chạy trong terminal tương tác để nhập mật khẩu kín.',
    'Đã hủy thao tác.',
    'Tên đăng nhập phải có từ 1 đến 100 ký tự.',
    'Mật khẩu phải có từ 12 đến 128 ký tự.',
    'Hai lần nhập mật khẩu không khớp.',
    'Thiếu cấu hình KET_NOI_CO_SO_DU_LIEU.',
    'Đã tồn tại tài khoản; bootstrap chỉ được chạy trên cơ sở dữ liệu chưa có tài khoản.',
  ])
  const maLoi =
    typeof loi === 'object' && loi !== null && 'code' in loi && typeof loi.code === 'string'
      ? loi.code
      : undefined
  const thongBao = loi instanceof Error && thongBaoAnToan.has(loi.message)
    ? loi.message
    : `Lỗi hệ thống${maLoi ? ` (${maLoi})` : ''}; kiểm tra cấu hình máy chủ.`
  console.error(`Không thể bootstrap tài khoản: ${thongBao}`)
  process.exitCode = 1
})
