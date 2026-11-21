/**
 * Every action `log_mod_action` writes needs a `console.modlog.did.<action>` verb (#3752):
 * a missing key throws in dev and blanks the Mod log page. The backend has no action enum,
 * so the literals are read from the call sites.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import admin from '../en/admin.json'

const BACKEND = new URL('../../../../backend/', import.meta.url)
const TARGETS = new Set(['account', 'character', 'task', 'praxis', 'comment', 'era', 'message'])
const did = admin.console.modlog.did as Record<string, string>

const files = [
  'elevate_admin.py',
  ...readdirSync(new URL('services/', BACKEND)).filter((f) => f.endsWith('.py')).map((f) => `services/${f}`),
]

function callArgs(src: string): string[] {
  const out: string[] = []
  for (const m of src.matchAll(/\blog_mod_action\(/g)) {
    let depth = 1
    let i = m.index! + m[0].length
    const start = i
    while (depth > 0 && i < src.length) {
      if (src[i] === '(') depth++
      else if (src[i] === ')') depth--
      i++
    }
    out.push(src.slice(start, i))
  }
  return out
}

describe('Mod log verbs', () => {
  const literals = new Set<string>()
  const prefixes = new Set<string>()
  for (const f of files) {
    if (f === 'services/mod_log.py') continue
    for (const args of callArgs(readFileSync(new URL(f, BACKEND), 'utf8'))) {
      for (const m of args.matchAll(/\bf"([a-z_]+_)\{/g)) prefixes.add(m[1])
      for (const m of args.matchAll(/(?<!f)(?<!== )"([a-z]+(?:_[a-z]+)*)"/g)) if (!TARGETS.has(m[1])) literals.add(m[1])
    }
  }

  it('finds the call sites it guards', () => {
    expect(literals.size).toBeGreaterThan(8)
  })

  it.each([...literals])('has a verb for %s', (action) => {
    expect(did[action], `add console.modlog.did.${action} to admin.json`).toBeTruthy()
  })

  // ponytail: f-string actions (praxis_{status}) can't be enumerated here; this only proves each family has verbs.
  it.each([...prefixes])('has verbs for the %s family', (prefix) => {
    expect(Object.keys(did).some((k) => k.startsWith(prefix))).toBe(true)
  })
})
