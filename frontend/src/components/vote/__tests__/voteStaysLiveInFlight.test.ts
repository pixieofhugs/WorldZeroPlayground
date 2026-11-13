/**
 * A vote control stays live while its cast is in flight (#3093): the POST starts
 * on click, so disabling would drop focus and block a change of mind. A source
 * pin, because SSR's null server snapshot never shows an in-flight cast.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { expect, it } from 'vitest'

it('useVote never hands a request in flight to the controls as `saving`', () => {
  const source = readFileSync(fileURLToPath(new URL('../useVote.ts', import.meta.url)), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
  expect(source).not.toMatch(/\.saving\b/)
  expect(source).toMatch(/const saving = false/)
})
