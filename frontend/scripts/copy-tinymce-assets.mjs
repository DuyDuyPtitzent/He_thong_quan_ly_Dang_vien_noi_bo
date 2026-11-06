import { cp, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const projectRoot = fileURLToPath(new URL('../', import.meta.url))
const packageRoot = path.join(projectRoot, 'node_modules')
const publicRoot = path.join(projectRoot, 'public', 'tinymce')

await mkdir(publicRoot, { recursive: true })
await cp(path.join(packageRoot, 'tinymce'), publicRoot, { recursive: true, force: true })
await mkdir(path.join(publicRoot, 'langs'), { recursive: true })
await cp(
  path.join(packageRoot, 'tinymce-i18n', 'langs8', 'vi.js'),
  path.join(publicRoot, 'langs', 'vi.js'),
)
await cp(
  path.join(packageRoot, 'tinymce-i18n', 'NOTICE.md'),
  path.join(publicRoot, 'langs', 'NOTICE.md'),
)
