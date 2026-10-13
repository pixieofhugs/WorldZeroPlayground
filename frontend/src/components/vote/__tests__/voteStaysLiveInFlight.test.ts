/**
 * A vote control stays live while its cast is in flight (#3093).
 *
 * Since #3093 a POST starts on the click itself, so a control disabled for the
 * request was disabled the instant it was used: the star just activated lost
 * keyboard focus, and the change of mind the ruling describes ("while the
 * first request is in flight") could not be made at all.
 *
 * A SOURCE PIN, because nothing rendered can see it. All nine controls take
 * `saving` from `useVote` and the harness is `renderToStaticMarkup`, where
 * `usePendingCast` answers with its server snapshot — always null — so an
 * in-flight cast never reaches the markup either way. What can regress is one
 * line: the hook handing the store's in-flight bit back to the controls.
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
