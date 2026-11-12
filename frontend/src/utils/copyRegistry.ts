/**
 * Rendered copy → the catalog key(s) that produced it, for admin copy-edit mode.
 * The `copyRegistry` postProcessor in `i18n.ts` records every string as it
 * renders, keyed on the RENDERED value so interpolated copy resolves too.
 * One string can come from several keys ("Points" from eight), so the index
 * holds a list and an ambiguous click makes the editor choose. Recording is off
 * by default and disarming clears it. No React here (frontend/CLAUDE.md).
 */

/** Namespace file + dotted key. */
export interface CopyTarget {
  ns: string
  key: string
}

/** The editor's own copy never enters the index; its "save"/"cancel" would shadow the page's. */
const EDITOR_NS = 'admin'
const EDITOR_KEY_PREFIX = 'copyEdit.'

let recording = false
const byRenderedValue = new Map<string, CopyTarget[]>()

/** Disarming drops the index; it is only a cache. */
export function setCopyRecording(on: boolean): void {
  recording = on
  if (!on) byRenderedValue.clear()
}

export function isCopyRecording(): boolean {
  return recording
}

function has(list: CopyTarget[], target: CopyTarget): boolean {
  return list.some((seen) => seen.ns === target.ns && seen.key === target.key)
}

/** Called by the i18next postProcessor for every string it renders. */
export function recordRenderedCopy(value: string, target: CopyTarget): void {
  if (!recording) return
  if (target.ns === EDITOR_NS && target.key.startsWith(EDITOR_KEY_PREFIX)) return
  const text = value.trim()
  if (!text) return
  // Faction bodies draw one <p> per paragraph: index each under the same target.
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
  for (const entry of new Set([text, ...paragraphs])) {
    const found = byRenderedValue.get(entry)
    if (!found) {
      byRenderedValue.set(entry, [target])
    } else if (!has(found, target)) {
      found.push(target)
    }
  }
}

export function recordedCopyTargets(): CopyTarget[] {
  return [...byRenderedValue.values()].flat()
}

export function copyTargetsForText(text: string | null | undefined): CopyTarget[] {
  if (!text) return []
  return byRenderedValue.get(text.trim()) ?? []
}

/** Cap on the upward walk, so a miss cannot match an ancestor that merely contains the string. */
export const COPY_ANCESTOR_LIMIT = 4

function childrenOf(el: Element): Element[] {
  return el.children ? Array.from(el.children) : []
}

/**
 * The node, then its direct children, then the same for a few ancestors. The
 * child pass is needed: a click on a button's padding targets the button, whose
 * text includes icon glyphs. Sibling candidates are pooled, never silently picked.
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
 * The one hard guard on a save: a dropped `{{…}}` renders a silent hole.
 * Whole-token compare, so a renamed placeholder counts as dropped.
 */
export function missingPlaceholders(template: string, next: string): string[] {
  const tokens = template.match(/\{\{[^}]*\}\}/g) ?? []
  return [...new Set(tokens)].filter((token) => !next.includes(token))
}
