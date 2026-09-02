/** Substitutes `{{key}}` placeholders; unknown keys are left as-is rather than erroring. */
export function renderTemplate(body: string, variables: Record<string, string>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (match, key: string) => variables[key] ?? match)
}

/** Every `{{key}}` mentioned in a template body, in first-seen order, deduped. */
export function extractVariables(body: string): string[] {
  const seen = new Set<string>()
  for (const match of body.matchAll(/\{\{(\w+)\}\}/g)) seen.add(match[1])
  return [...seen]
}
