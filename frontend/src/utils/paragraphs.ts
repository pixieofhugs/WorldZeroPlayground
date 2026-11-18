/**
 * Any line break splits: in a `<p>` a lone `\n` collapses to a space, and
 * Enter in the copy editor types exactly that. `copyRegistry` uses it too.
 */
export function paragraphsOf(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}
