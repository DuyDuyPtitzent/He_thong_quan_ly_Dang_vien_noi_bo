import { Injectable } from '@nestjs/common'
import { randomBytes, scrypt as hamScrypt, timingSafeEqual } from 'node:crypto'
import type { ScryptOptions } from 'node:crypto'

const doDaiKhoa = 64
const thamSoN = 16_384
const thamSoR = 8
const thamSoP = 1

function taoKhoa(matKhau: string, muoi: Buffer, tuyChon: ScryptOptions) {
  return new Promise<Buffer>((resolve, reject) => {
    hamScrypt(matKhau, muoi, doDaiKhoa, tuyChon, (loi, khoa) => {
      if (loi) reject(loi)
      else resolve(khoa)
    })
  })
}

@Injectable()
export class BamMatKhauService {
  async tao(matKhau: string): Promise<string> {
    const muoi = randomBytes(16)
    const khoa = await taoKhoa(matKhau, muoi, {
      N: thamSoN,
      r: thamSoR,
      p: thamSoP,
      maxmem: 32 * 1024 * 1024,
    })

    return [
      'scrypt',
      thamSoN,
      thamSoR,
      thamSoP,
      muoi.toString('base64url'),
      khoa.toString('base64url'),
    ].join('$')
  }

  async kiemTra(matKhau: string, chuoiBam: string): Promise<boolean> {
    const [thuatToan, n, r, p, muoiMaHoa, khoaMaHoa, thua] = chuoiBam.split('$')
    const N = Number(n)
    const R = Number(r)
    const P = Number(p)

    if (
      thuatToan !== 'scrypt' ||
      thua !== undefined ||
      !Number.isSafeInteger(N) ||
      !Number.isSafeInteger(R) ||
      !Number.isSafeInteger(P) ||
      N < 2 ||
      N > thamSoN ||
      R < 1 ||
      R > thamSoR ||
      P < 1 ||
      P > thamSoP ||
      !muoiMaHoa ||
      !khoaMaHoa
    ) {
      return false
    }

    try {
      const muoi = Buffer.from(muoiMaHoa, 'base64url')
      const khoaCu = Buffer.from(khoaMaHoa, 'base64url')
      if (muoi.length !== 16 || khoaCu.length !== doDaiKhoa) return false

      const khoaMoi = await taoKhoa(matKhau, muoi, {
        N,
        r: R,
        p: P,
        maxmem: 32 * 1024 * 1024,
      })

      return timingSafeEqual(khoaCu, khoaMoi)
    } catch {
      return false
    }
  }
}
