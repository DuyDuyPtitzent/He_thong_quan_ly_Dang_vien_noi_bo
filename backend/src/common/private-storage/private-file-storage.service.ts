import { createHash, randomUUID } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { lstat, mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { ConfigService } from '@nestjs/config'
import { ForbiddenException, Inject, Injectable } from '@nestjs/common'
import { isAbsolute, relative, resolve, sep } from 'node:path'

const EXTENSIONS = ['pdf', 'jpg', 'png'] as const

@Injectable()
export class PrivateFileStorageService {
  private readonly root: string

  constructor(@Inject(ConfigService) config: ConfigService) {
    const configured = config.get<string>('KHO_TEP_RIENG') ?? './storage/private'
    this.root = isAbsolute(configured) ? resolve(configured) : resolve(process.cwd(), configured)
  }

  taoKhoa(extension: string) {
    if (!EXTENSIONS.includes(extension as (typeof EXTENSIONS)[number])) throw new ForbiddenException()
    return `${randomUUID()}.${extension}`
  }

  duongDanAnToan(key: string) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(pdf|jpg|png)$/i.test(key)) throw new ForbiddenException()
    const path = resolve(this.root, key)
    const fromRoot = relative(this.root, path)
    if (!fromRoot || fromRoot.startsWith(`..${sep}`) || fromRoot === '..' || isAbsolute(fromRoot)) throw new ForbiddenException()
    return path
  }

  async ghi(key: string, bytes: Buffer) {
    const path = this.duongDanAnToan(key)
    await mkdir(this.root, { recursive: true, mode: 0o700 })
    await writeFile(path, bytes, { flag: 'wx', mode: 0o600 })
    return path
  }

  async donDep(key: string) {
    await unlink(this.duongDanAnToan(key)).catch((error: NodeJS.ErrnoException) => { if (error.code !== 'ENOENT') throw error })
  }

  private async regularFilePath(key: string) {
    const path = this.duongDanAnToan(key)
    const stat = await lstat(path)
    if (stat.isSymbolicLink() || !stat.isFile()) throw new Error('PRIVATE_FILE_NOT_REGULAR')
    return path
  }

  async doc(key: string) { return readFile(await this.regularFilePath(key)) }

  async bamSha256(key: string) {
    const hash = createHash('sha256')
    for await (const chunk of createReadStream(await this.regularFilePath(key))) hash.update(chunk as Buffer)
    return hash.digest('hex')
  }

  async taoLuonDocDaXacMinh(key: string, expectedHash: string) {
    const actual = await this.bamSha256(key)
    if (actual !== expectedHash) throw new Error('PRIVATE_FILE_HASH_MISMATCH')
    return createReadStream(await this.regularFilePath(key))
  }
}
