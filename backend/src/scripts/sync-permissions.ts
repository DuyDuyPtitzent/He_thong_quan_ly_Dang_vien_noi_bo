import { NestFactory } from '@nestjs/core'
import { UngDungModule } from '../app.module'
import { DichVuPrisma } from '../infrastructure/database/prisma.service'
import { permissionCatalog, permissionMetadata } from '../modules/authorization/permission-catalog'

async function main() {
  const app = await NestFactory.createApplicationContext(UngDungModule, { logger: false })
  try {
    const prisma = app.get(DichVuPrisma)
    await prisma.$transaction(async (tx) => {
      for (const maDinhDanh of permissionCatalog) {
        const metadata = permissionMetadata[maDinhDanh]
        await tx.quyen.upsert({
          where: { maDinhDanh },
          create: { maDinhDanh, ten: metadata.ten, moTa: metadata.moTa },
          update: { ten: metadata.ten, moTa: metadata.moTa },
        })
      }
    })
    process.stdout.write(`Đã đồng bộ metadata cho ${permissionCatalog.length} Permission hệ thống.\n`)
  } finally {
    await app.close()
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`Không thể đồng bộ Permission: ${error instanceof Error ? error.message : 'Lỗi không xác định'}\n`)
  process.exitCode = 1
})
