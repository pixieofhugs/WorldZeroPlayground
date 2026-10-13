/**
 * Rendered copy → the catalog key(s) that produced it (live copy overrides).
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
 * ONE STRING CAN HAVE SEVERAL KEYS, so the index holds a LIST and never picks.
 * 133 of the catalog's ~1585 distinct strings are produced by more than one key
 * — "Faction" alone comes from five, across `forms`, `admin`, `factions` and
 * `common`; "Points" from eight.
 * A Map that kept the last writer would let a click on a heading silently open
 * a form label's key, and the save would reword a screen she is not looking at.
 * So an ambiguous click is handed back ambiguous and the panel makes her choose.
 *
 * RECORDING IS OFF BY DEFAULT. A normal visit pays one boolean per translated
 * string and the index stays empty; disarming clears it. Nothing here imports
 * React, so `api/`/`utils/` stay free of the component tree (frontend/CLAUDE.md).
 */

/** One editable string: the namespace file and the dotted key inside it. */
export interface CopyTarget {
  ns: string
  key: string
}

/**
 * The editor's own copy, which must never be a candidate.
 *
 * The panel is on the page while recording, so its "save" and "cancel" render
 * through the same postProcessor as everything else — and being short, ordinary
 * words, they would shadow a real page's "save" and "cancel". Excluded at the
 * point of recording rather than filtered at the click, because the reason is
 * about what may enter the index at all.
 */
const EDITOR_NS = 'admin'
const EDITOR_KEY_PREFIX = 'copyEdit.'

let recording = false
const byRenderedValue = new Map<string, CopyTarget[]>()

/** Arm or disarm recording. Disarming drops the index — it is only ever a cache. */
export function setCopyRecording(on: boolean): void {
  recording = on
  if (!on) byRenderedValue.clear()
}

export function isCopyRecording(): boolean {
  return recording
}

/** Whether `list` already holds this exact `ns:key`. */
function has(list: CopyTarget[], target: CopyTarget): boolean {
  return list.some((seen) => seen.ns === target.ns && seen.key === target.key)
}

/** Called by the i18next postProcessor for every string it renders. */
export function recordRenderedCopy(value: string, target: CopyTarget): void {
  if (!recording) return
  if (target.ns === EDITOR_NS && target.key.startsWith(EDITOR_KEY_PREFIX)) return
  const text = value.trim()
  if (!text) return
  const found = byRenderedValue.get(text)
  if (!found) {
    byRenderedValue.set(text, [target])
  } else if (!has(found, target)) {
    found.push(target)
  }
}

/** Every key whose render is exactly `text`. Empty when none is indexed. */
export function copyTargetsForText(text: string | null | undefined): CopyTarget[] {
  if (!text) return []
  return byRenderedValue.get(text.trim()) ?? []
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

/** The direct children of `el`, as a plain array. */
function childrenOf(el: Element): Element[] {
  return el.children ? Array.from(el.children) : []
}

/**
 * The copy a click landed on — the node itself, then its direct children, then
 * the same for a few ancestors.
 *
 * THE DESCENDANT PASS IS NOT AN EXTRA: a click on a button's own padding has
 * `event.target === button`, and a button's `textContent` is its icon glyphs
 * plus its label, which matches no catalog string. Every ancestor is longer
 * still, so an upward-only walk answers "not editable wording" for precisely
 * the buttons and links that capture-phase interception exists to serve. One
 * level down finds the label span inside.
 *
 * Candidates from the children of one element are pooled, so two sibling labels
 * come back as two choices rather than as a silent pick of the first.
 */
export function copyTargetsForElement(start: Element | null): CopyTarget[] {
  let el = start
  for (let hops = 0; el && hops <= COPY_ANCESTOR_LIMIT; hops += 1) {
    const own = copyTargetsForText(el.textContent)
    if (own.length > 0) return own

    const fromChildren: CopyTarget[] = []
    for (const child of childrenOf(el)) {
      for (const candidate of copyTargetsForText(child.textContent)) {
        if (!has(fromChildren, candidate)) fromChildren.push(candidate)
      }
    }
    if (fromChildren.length > 0) return fromChildren

    el = el.parentElement
  }
  return []
}

/**
 * Placeholders the original template carries that the replacement dropped.
 *
 * The one hard guard on a save. `{{max}}` missing from a value does not fail
 * loudly — the string just renders with a hole in it, for every visitor, until
 * somebody notices. Compared as whole `{{…}}` tokens, so a renamed placeholder
 * reads as a dropped one, which is what it is.
 */
export function missingPlaceholders(template: string, next: string): string[] {
  const tokens = template.match(/\{\{[^}]*\}\}/g) ?? []
  return [...new Set(tokens)].filter((token) => !next.includes(token))
}
