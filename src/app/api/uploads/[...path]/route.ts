import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { getCurrentUser } from '@/lib/dal'
import { STORAGE_ROOT } from '@/lib/storage'

const CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
}

export async function GET(
  _request: Request,
  ctx: RouteContext<'/api/uploads/[...path]'>
) {
  // Receipts carry payment details, so this is gated like any other page —
  // not just an unguessable URL. A plain 401 (not redirect()) since this is a
  // file response, not a page.
  const user = await getCurrentUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { path: segments } = await ctx.params
  const resolved = path.resolve(STORAGE_ROOT, ...segments)

  // Reject anything that escapes the upload root, e.g. a `..` segment.
  if (!resolved.startsWith(path.resolve(STORAGE_ROOT) + path.sep)) {
    return new Response('Not found', { status: 404 })
  }

  try {
    const data = await readFile(resolved)
    const type = CONTENT_TYPES[path.extname(resolved).toLowerCase()] ?? 'application/octet-stream'
    return new Response(new Uint8Array(data), { headers: { 'Content-Type': type } })
  } catch {
    return new Response('Not found', { status: 404 })
  }
}
