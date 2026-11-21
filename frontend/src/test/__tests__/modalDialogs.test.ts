/**
 * Every `role="dialog"` takes its modal behaviour from `hooks/useModal` and carries
 * an accessible name (#3568). A twelfth hand-rolled dialog fails here.
 */
import { describe, expect, it } from 'vitest'

import { readStripped, sourceFiles, toRelative } from '../sourceScan'

const dialogFiles = () =>
  sourceFiles()
    .filter((path) => /role="dialog"/.test(readStripped(path)))
    .map((path) => ({ rel: toRelative(path), text: readStripped(path) }))
    .sort((a, b) => a.rel.localeCompare(b.rel))

describe('role="dialog" components share useModal (#3568)', () => {
  it('still sees the known dialogs, so it cannot pass by matching nothing', () => {
    expect(dialogFiles().length).toBeGreaterThanOrEqual(11)
  })

  for (const { rel, text } of dialogFiles()) {
    it(`${rel} uses useModal`, () => {
      expect(text).toMatch(/useModal(<[^>]*>)?\(/)
      expect(text).toMatch(/ref=\{(ref|panelRef)\}/)
    })

    it(`${rel} names every dialog`, () => {
      for (const match of text.matchAll(/role="dialog"/g)) {
        const near = text.slice(match.index, match.index + 400)
        expect(near, 'role="dialog" needs aria-label or aria-labelledby').toMatch(
          /aria-label(ledby)?=/,
        )
      }
    })
  }
})
