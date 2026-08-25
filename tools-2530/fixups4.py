"""#2530 fourth pass: three suites that read `Object.keys(surfaceMap(...))` as
"the factions with a bespoke skin". `na` is a row now and is not bespoke, so
each roster excludes it explicitly rather than by the map happening to omit it.
"""
from pathlib import Path

SRC = Path(__file__).resolve().parent.parent / "frontend" / "src"

EDITS = {
    "components/duel/__tests__/duelSealFormFactor.test.tsx": [
        ("const SEAL_SLUGS = Object.keys(surfaceMap('duelSeal'))",
         "// Every row but na's. Since #2530 na is a registration like any other\n"
         "// (`factions/default.ts`) rather than the fallback behind the map, and\n"
         "// every assertion below that says \"not the Default\" is about that row —\n"
         "// so including it would ask na's seal to differ from itself.\n"
         "const SEAL_SLUGS = Object.keys(surfaceMap('duelSeal')).filter((slug) => slug !== 'na')"),
    ],
    "pages/characterProfile/__tests__/factionProfileBody.test.tsx": [
        ('expect(Object.keys(surfaceMap("profileBody")).sort()).toEqual(',
         '// `na` is filtered out, not appended: it has a row since #2530\n'
         '    // (`factions/default.ts`) and it is the one row that is not a bespoke\n'
         '    // skin — it IS `DefaultProfileBody`, which the next assertion pins.\n'
         '    expect(\n'
         '      Object.keys(surfaceMap("profileBody"))\n'
         '        .filter((slug) => slug !== "na")\n'
         '        .sort(),\n'
         '    ).toEqual('),
    ],
    "components/selectCard/__tests__/factionSelectCardDispatch.test.tsx": [
        ("""  it("wires the fallback itself to DefaultSelectCard", () => {
    // The markup check above would also pass if some future map row happened to
    // render identical HTML; this pins the component identity. `na` has no
    // manifest on purpose, so `pickVariant` reaching the fallback IS the na
    // registration.
    const cards = surfaceMap("factionSelectCard");
    expect(cards[UNAFFILIATED_FACTION_SLUG]).toBeUndefined();""",
         """  it("wires the na row itself to DefaultSelectCard", () => {
    // The markup check above would also pass if some future map row happened to
    // render identical HTML; this pins the component identity. `na` HAS a
    // manifest since #2530 — the registration used to be `pickVariant`'s third
    // argument at this dispatcher, which is exactly the second mechanism that
    // issue removed — so the row must exist AND point at DefaultSelectCard.
    const cards = surfaceMap("factionSelectCard");
    expect(cards[UNAFFILIATED_FACTION_SLUG]).toBeDefined();"""),
        ("""  it("renders every registered faction in its own costume", () => {
    const fallback = markup(<DefaultSelectCard {...REST} />);
    for (const slug of Object.keys(surfaceMap("factionSelectCard"))) {""",
         """  it("renders every registered faction in its own costume", () => {
    const fallback = markup(<DefaultSelectCard {...REST} />);
    // na excluded: its row IS the fallback (#2530), asserted above.
    const bespoke = Object.keys(surfaceMap("factionSelectCard")).filter(
      (slug) => slug !== UNAFFILIATED_FACTION_SLUG,
    );
    for (const slug of bespoke) {"""),
    ],
}

for rel, pairs in EDITS.items():
    path = SRC / rel
    text = path.read_text(encoding="utf-8")
    for old, new in pairs:
        assert old in text, (rel, old[:70])
        text = text.replace(old, new, 1)
    path.write_text(text, encoding="utf-8", newline="\n")
    print("ok", rel)
