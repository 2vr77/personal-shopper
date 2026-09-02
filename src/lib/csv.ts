/**
 * Minimal RFC 4180 CSV parser/writer. Written by hand rather than pulling in a
 * dependency for something this small — handles quoted fields, embedded
 * commas/newlines, and `""` escaping, which is all a J&T-style export/import
 * round trip needs.
 */

export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  const pushField = () => {
    row.push(field)
    field = ''
  }
  const pushRow = () => {
    pushField()
    rows.push(row)
    row = []
  }

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
      continue
    }

    if (c === '"') inQuotes = true
    else if (c === ',') pushField()
    else if (c === '\r') continue
    else if (c === '\n') pushRow()
    else field += c
  }
  if (field.length > 0 || row.length > 0) pushRow()

  return rows.filter((r) => !(r.length === 1 && r[0] === ''))
}

function toCsvField(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

export function stringifyCsv(rows: string[][]): string {
  return rows.map((r) => r.map(toCsvField).join(',')).join('\r\n')
}

/** Header row becomes object keys; every value is trimmed. */
export function csvToObjects(text: string): Record<string, string>[] {
  const rows = parseCsv(text)
  if (rows.length === 0) return []
  const headers = rows[0].map((h) => h.trim())
  return rows
    .slice(1)
    .map((r) => Object.fromEntries(headers.map((h, i) => [h, (r[i] ?? '').trim()])))
}

/** Case/spacing-insensitive lookup, since spreadsheet exports vary in naming. */
export function csvColumn(row: Record<string, string>, candidates: string[]): string {
  const normalized = candidates.map((c) => c.toLowerCase())
  for (const [key, value] of Object.entries(row)) {
    if (normalized.includes(key.trim().toLowerCase())) return value
  }
  return ''
}
