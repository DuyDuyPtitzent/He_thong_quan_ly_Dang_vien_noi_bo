import 'reflect-metadata'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PrivateFileStorageService } from '../src/common/private-storage/private-file-storage.service'
import { MemberProfileDocumentsService } from '../src/modules/member-profiles/member-profile-documents.service'

describe('member profile document shared-storage regression', () => {
  let root = ''
  let service: MemberProfileDocumentsService
  let storageKey = ''
  const bytes = Buffer.from('%PDF-1.7\nprofile fixture')
  const actor = { maTaiKhoan: '00000000-0000-4000-8000-000000000001', maPhien: '00000000-0000-4000-8000-000000000002' }
  const profileId = '00000000-0000-4000-8000-000000000010'
  let doc: any

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'member-docs-'))
    const storage = new PrivateFileStorageService({ get: () => root } as never)
    doc = { ma: '00000000-0000-4000-8000-000000000011', loaiTaiLieu: 'ANH_CCCD_VNEID', tenTepGoc: 'giay-to.pdf', kieuNoiDung: 'application/pdf', kichThuoc: bytes.length, ngayTao: new Date() }
    const tx = { taiLieuHoSoDangVien: { create: vi.fn().mockImplementation(({ data }: { data: { khoaLuuTru: string } }) => { storageKey = data.khoaLuuTru; return doc }) }, nhatKyKiemToan: { create: vi.fn().mockResolvedValue({}) } }
    const prisma = { $transaction: vi.fn((callback: (tx: any) => unknown) => callback(tx)), taiLieuHoSoDangVien: { findFirst: vi.fn().mockImplementation(() => ({ khoaLuuTru: storageKey, tenTepGoc: 'giay-to.pdf', kieuNoiDung: 'application/pdf' })) } }
    const permissions = { kiemTra: vi.fn().mockResolvedValue(undefined) }
    service = new MemberProfileDocumentsService(prisma as never, permissions as never, storage)
  })
  afterEach(async () => { await rm(root, { recursive: true, force: true }) })

  it('keeps the existing profile document upload and download contract using the same private root', async () => {
    const result = await service.taiLen(actor as never, profileId, { loaiTaiLieu: 'ANH_CCCD_VNEID' } as never, { buffer: bytes, originalname: 'giay-to.pdf', mimetype: 'application/pdf', size: bytes.length }, null)
    expect(result).toEqual(doc)
    const saved = await readFile(join(root, storageKey))
    expect(saved).toEqual(bytes)
    const downloaded = await service.taiXuong(actor as never, profileId, doc.ma)
    expect(downloaded.buffer).toEqual(bytes)
    expect(downloaded.tenTepGoc).toBe('giay-to.pdf')
    expect(downloaded.kieuNoiDung).toBe('application/pdf')
  })
})
