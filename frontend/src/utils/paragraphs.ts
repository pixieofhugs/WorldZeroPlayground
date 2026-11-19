/** A blank line splits (#3111); in a `<p>` a lone `\n` is ordinary whitespace. */
export function paragraphsOf(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean)
}
