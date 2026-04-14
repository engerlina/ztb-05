/** Split deck markdown on a line that contains only --- (optional surrounding whitespace). */
export function splitSlides(markdown: string): string[] {
  const parts = markdown.split(/^\s*---\s*$/m)
  return parts.map((s) => s.trim()).filter((s) => s.length > 0)
}
