/**
 * A busy button still has to be called something (#1236).
 *
 * THE BUG CLASS. A control that swaps its label for a spinner-ish string while
 * the request is in flight keeps its accessible name in that text — none of
 * these buttons carries an `aria-label`, so the visible text IS the name. When
 * the busy string is nothing but punctuation ("…", "..."), pressing the button
 * renames it from "Post comment" to a name screen readers announce as nothing
 * at all, or as a literal "horizontal ellipsis". Tabbing back to it, or hearing
 * the rename announced, tells the user neither what the control is nor that
 * anything is happening.
 *
 * The fix is the copy, not an `aria-label`: "Posting…" keeps the ellipsis as an
 * affix rather than as the whole name, so the visible text and the accessible
 * name are the same true string.
 *
 * WHAT THIS PROVES. The harness is `renderToStaticMarkup` only — no jsdom, no
 * accessibility tree — so nothing here runs the accname algorithm. It asserts
 * the input that algorithm reads: the text inside each rendered <button>. The
 * catalog scan is the ratchet — it covers the busy strings on surfaces this
 * harness cannot mount (the flag form, the unsubmit confirm), and any busy key
 * added later.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'

import '../i18n'
import { resources } from '../i18n'
import { ComposerControls } from '../components/comments/shared'

/** Every <button>'s text content, tags stripped — what names the control. */
function buttonNames(markup: string): string[] {
  return [...markup.matchAll(/<button[^>]*>(.*?)<\/button>/gs)].map((match) =>
    match[1].replace(/<[^>]*>/g, '').trim(),
  )
}

/** Key names whose value is, by construction, a control's in-flight label. */
const BUSY_KEY = /^(posting|submitting|saving|sending|deleting|updating|uploading|working|busy)$/

function busyStrings(node: unknown, path: string[] = []): [string, string][] {
  if (typeof node === 'string') {
    return BUSY_KEY.test(path[path.length - 1] ?? '') ? [[path.join('.'), node]] : []
  }
  if (node === null || typeof node !== 'object') return []
  return Object.entries(node).flatMap(([key, value]) => busyStrings(value, [...path, key]))
}

describe('a control in flight keeps a speakable name', () => {
  it('ComposerControls: the comment submit button is named while posting', () => {
    const markup = renderToStaticMarkup(
      <ComposerControls
        value="something worth keeping"
        onChange={() => {}}
        onSubmit={() => {}}
        submitting
        accent="var(--color-accent-primary)"
        onAccent="var(--faction-default-on-accent)"
      />,
    )
    // All eight voices and the inline editor render this one control, and none
    // passes a `submittingLabel`, so this single string names every one of them.
    expect(buttonNames(markup)).toContain('Posting…')
  })

  it('no busy string in any catalog is punctuation alone', () => {
    const punctuationOnly = busyStrings(resources.en).filter(([, value]) => !/\p{L}/u.test(value))
    expect(punctuationOnly).toEqual([])
  })
})
