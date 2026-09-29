/**
 * Rendered copy → the catalog key that produced it (live copy overrides).
 *
 * Admin copy-edit mode has to answer one question from a click: WHICH KEY made
 * this text? Nothing in the markup says. Tagging every call site with a
 * `data-i18n-key` is a few hundred edits that then have to stay correct
 * forever, so instead i18next tells us as it renders: the `copyRegistry`
 * postProcessor in `i18n.ts` calls `recordRenderedCopy` for every string it
 * returns, and this module holds the index.
 *
 * Keyed on the RENDERED value, not the template, so interpolated copy resolves
 * too — `"3 votes"` finds `common:voteCount` without anyone reversing the
 * interpolation.
 *
 * RECORDING IS OFF BY DEFAULT. A normal visit pays one boolean per translated
 * string and the Map stays empty; disarming clears it. Nothing here imports
 * React, so `api/`/`utils/` stay free of the component tree (frontend/CLAUDE.md).
 */

/** One editable string: the namespace file and the dotted key inside it. */
export interface CopyTarget {
  ns: string
  key: string
}

let recording = false
const byRenderedValue = new Map<string, CopyTarget>()

/** Arm or disarm recording. Disarming drops the index — it is only ever a cache. */
export function setCopyRecording(on: boolean): void {
  recording = on
  if (!on) byRenderedValue.clear()
}

export function isCopyRecording(): boolean {
  return recording
}

/** Called by the i18next postProcessor for every string it renders. */
export function recordRenderedCopy(value: string, target: CopyTarget): void {
  if (!recording) return
  const text = value.trim()
  if (text) byRenderedValue.set(text, target)
}

/** The key whose render is exactly `text`, if one is indexed. */
export function copyTargetForText(text: string | null | undefined): CopyTarget | null {
  if (!text) return null
  return byRenderedValue.get(text.trim()) ?? null
}

/**
 * How far up from the clicked node to look.
 *
 * A click lands on whatever leaf the label happens to sit in — often a `<span>`
 * inside a `<button>` inside a `<li>`. Walking up finds the element whose whole
 * text is one copy string; capping the walk keeps a miss from matching some
 * ancestor that merely happens to contain the string and nothing else.
 */
export const COPY_ANCESTOR_LIMIT = 4

/** The copy string a click landed on, searching the node and a few ancestors. */
export function copyTargetForElement(start: Element | null): CopyTarget | null {
  let el = start
  for (let hops = 0; el && hops <= COPY_ANCESTOR_LIMIT; hops += 1) {
    const found = copyTargetForText(el.textContent)
    if (found) return found
    el = el.parentElement
  }
  return null
}

/**
 * Placeholders the original template carries that the replacement dropped.
 *
 * The one hard guard on a save. `{{max}}` missing from a value does not fail
 * loudly — the string just renders with a hole in it, for everyone, until
 * somebody notices. Compared as whole `{{…}}` tokens, so a renamed placeholder
 * reads as a dropped one, which is what it is.
 */
export function missingPlaceholders(template: string, next: string): string[] {
  const tokens = template.match(/\{\{[^}]*\}\}/g) ?? []
  return [...new Set(tokens)].filter((token) => !next.includes(token))
}
