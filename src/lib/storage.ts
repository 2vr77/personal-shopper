import 'server-only'

import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

/**
 * Local-disk receipt storage. Every read/write to receipt files goes through
 * this module and the route handler at app/api/uploads/, so swapping in
 * Cloudflare R2 or S3 later means rewriting this file only, not its callers.
 */
export const STORAGE_ROOT = path.join(process.cwd(), '.data', 'uploads')

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
const MAX_BYTES = 5 * 1024 * 1024

export class UploadError extends Error {}

const EXTENSION_BY_TYPE: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
}

export async function saveUpload(
  file: File,
  subdir: 'payments' | 'purchases'
): Promise<{ url: string; fileName: string }> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new UploadError('Only JPG, PNG, WEBP or PDF files are accepted.')
  }
  if (file.size > MAX_BYTES) {
    throw new UploadError('File is larger than 5MB.')
  }

  const ext = path.extname(file.name).toLowerCase() || EXTENSION_BY_TYPE[file.type] || ''
  const id = randomUUID()
  const dir = path.join(STORAGE_ROOT, subdir)
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, `${id}${ext}`), Buffer.from(await file.arrayBuffer()))

  return { url: `/api/uploads/${subdir}/${id}${ext}`, fileName: file.name }
}
