import { describe, it, expect } from 'vitest'
import { readStripped, sourceFiles, toRelative } from '../test/sourceScan'

// A `<p className>` pairing both classes is the hand-built ErrorBanner copy, which has no
// role="alert". The hidden-praxis notice is a `<p role="status" ...>`, so it never matches.
const HAND_COPY = /<p\s+className=(?:"[^"]*"|'[^']*')/g

describe('error boxes use <ErrorBanner>, not a hand-built <p>', () => {
  it('no .tsx pairs danger-edge with danger-text on a <p className>', () => {
    const offenders = sourceFiles()
      .filter((path) =>
        (readStripped(path).match(HAND_COPY) ?? []).some(
          (tag) => tag.includes('danger-edge') && tag.includes('danger-text'),
        ),
      )
      .map(toRelative)
    expect(offenders).toEqual([])
  })
})
