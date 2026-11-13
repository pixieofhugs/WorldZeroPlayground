/**
 * A busy button's text is its accessible name, so a punctuation-only busy
 * string ("…") leaves it unnamed (#1236). Fix is the copy ("Posting…"), not an
 * aria-label. The catalog scan covers surfaces this harness can't mount.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'

import '../i18n'
import { resources } from '../i18n'
import { ComposerControls } from '../components/comments/shared'

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
    // Every voice renders this control without a `submittingLabel`.
    expect(buttonNames(markup)).toContain('Posting…')
  })

  it('no busy string in any catalog is punctuation alone', () => {
    const punctuationOnly = busyStrings(resources.en).filter(([, value]) => !/\p{L}/u.test(value))
    expect(punctuationOnly).toEqual([])
  })
})
