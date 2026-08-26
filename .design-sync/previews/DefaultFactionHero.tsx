// DefaultFactionHero preview — the Unaffiliated frontispiece at the top of a
// faction page, and the plate every faction hero is cut from. `default ≡ na ≡
// Unaffiliated` is ONE identity (ADR-0039 / 0046 / 0048), so this is the
// Unaffiliated skin rather than a placeholder.
//
// The page hands it the faction name and three raw counts — members, tasks,
// praxes — and the mark comes from FactionSigil resolving the slug, not from
// this file.
import { DefaultFactionHero } from 'worldzero-frontend'

/** The na frontispiece as an unaffiliated page draws it. */
export function Unaffiliated() {
  return <DefaultFactionHero slug="na" name="Unaffiliated" members={1284} tasks={64} praxes={2170} />
}

/** A young roster — the counts are raw, so the plate has to read at one and two
 *  digits as well as at four. */
export function SmallCounts() {
  return <DefaultFactionHero slug="na" name="Unaffiliated" members={3} tasks={1} praxes={0} />
}
