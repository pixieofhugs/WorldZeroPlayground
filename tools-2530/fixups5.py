"""#2530 fifth pass: `surfaceDispatch.test.ts`.

Its BESPOKE table partitions ALL_SLUGS into "registers a bespoke skin" and
"leaves this to the surface Default". `na` sat in the second half on nine
surfaces, and that half is now false about it: na has a row on all twenty. The
partition is still exactly right for the other eight, so na comes OUT of the
pool and gets its own row — the shape #2531 already gave albescent.
"""
from pathlib import Path

SRC = Path(__file__).resolve().parent.parent / "frontend" / "src"
path = SRC / "factions" / "__tests__" / "surfaceDispatch.test.ts"
text = path.read_text(encoding="utf-8")

EDITS = [
    # 1. The pool.
    ("""// Every game faction slug, bespoke or not — the pool each surface partitions
// into bespoke vs defaulted.
const ALL_SLUGS = [
  'coven', 'snide', 'ephemerists', 'singularity', 'everymen', 'ua', 'wow', 'albescent', 'na',
]""",
     """// Every game faction slug, bespoke or not — the pool each surface partitions
// into bespoke vs defaulted.
//
// `na` IS NOT IN IT, AND ITS ABSENCE IS THE #2530 RECORD. It used to be here and
// to sit on the defaulted side of nine rows, which was the truthful reading
// while `Default*` was reached by `pickVariant`'s third argument rather than by
// a manifest. na has all twenty rows now (`factions/default.ts`), so "leaves na
// to the surface Default" would be asking na's row not to exist. What the row
// meant is asserted where it is now true — `defaultManifest.test.tsx` pins each
// of the twenty to the component this dispatcher used to name by hand.
const ALL_SLUGS = [
  'coven', 'snide', 'ephemerists', 'singularity', 'everymen', 'ua', 'wow', 'albescent',
]"""),
    # 2. Two stale claims inside the BESPOKE table's docblock.
    ("""// stopped being true at #2404, which ruled that Albescent's borders move. `na`
// is still absent, and permanently: it IS `DefaultEditPraxis`.""",
     """// stopped being true at #2404, which ruled that Albescent's borders move. `na`
// is absent from the ROW and present in the manifest since #2530: the row lists
// what DRESSES the composer, and na's registration IS `DefaultEditPraxis`."""),
    ("""  // `na` is absent and permanently: it IS `DefaultCreateCharacter`.
""",
     """  // `na` is absent from this row and always will be: the row lists what
  // RESKINS the page, and na's manifest registration (#2530) is
  // `DefaultCreateCharacter` — the page it reskins away from.
"""),
    # 3. na's own row, beside albescent's.
    ("""describe('Coven is bespoke on every core surface, never the Default', () => {""",
     """/**
 * `na` REGISTERS EVERY KEY TOO, and for a different reason from Albescent's.
 *
 * Albescent must claim every surface so the map stops answering "does Albescent
 * dress this?" by silence. na must claim every surface because there is nothing
 * behind it: since #2530 a dispatcher resolves `map[resolveSlug(map, slug)]` and
 * names no `Default*` of its own, so a missing na row is not "falls back", it is
 * a surface that renders NOTHING for an unaffiliated player — and for every
 * unknown slug besides.
 *
 * The component each row resolves to is pinned in
 * `factions/__tests__/defaultManifest.test.tsx`; this is only the presence half,
 * stated here so a new surface raises the bar for na in the same file it raises
 * it for everyone else.
 */
describe('na registers every surface (#2530)', () => {
  it.each(SURFACE_KEYS)('claims %s', (surface) => {
    expect(
      surfaceMap(surface)['na'],
      `na has no \\`${surface}\\` row in factions/default.ts.\\n` +
        `Nothing is behind it: the dispatcher no longer names a Default of its\\n` +
        `own, so this surface renders nothing for an unaffiliated player.`,
    ).toBeDefined()
  })
})

describe('Coven is bespoke on every core surface, never the Default', () => {"""),
]

for old, new in EDITS:
    assert old in text, old[:70]
    text = text.replace(old, new, 1)
path.write_text(text, encoding="utf-8", newline="\n")
print("ok surfaceDispatch.test.ts")
