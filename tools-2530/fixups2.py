"""#2530 second pass: retire `DEFAULT_CARD` and `WatercolorBackground`-as-fallback.

`DEFAULT_CARD` was an alias for "the card an unregistered slug takes" living in
the dispatcher. `surfaceMap('taskCard').na` is that now, so the alias — and the
static import behind it, which kept DefaultTaskCard in the dispatcher's chunk —
goes.
"""
from pathlib import Path

SRC = Path(__file__).resolve().parent.parent / "frontend" / "src"

EDITS = {
    "components/taskCard/TaskCard.tsx": [
        ("import DefaultTaskCard from './DefaultTaskCard'\n", ""),
        ("""
// `na` / unaffiliated + any faction without a bespoke card → the spectrum
// default skin (#418). No longer borrows UA's costume.
export const DEFAULT_CARD = DefaultTaskCard
""", ""),
    ],
    "components/__tests__/cardHeadingOutline.test.tsx": [
        ("import { DEFAULT_CARD } from '../taskCard/TaskCard'\n", "")],
    "components/__tests__/factionCardSlots.test.tsx": [
        ('import { DEFAULT_CARD } from "../taskCard/TaskCard";\n', ""),
        ("""const taskArchetypes = {
  ...surfaceMap('taskCard'),
  __default__: DEFAULT_CARD,
};""",
         """// `na` is a row in the map since #2530, so there is no `__default__:` key to
// add beside it any more — the spectrum card is asserted under its own slug.
const taskArchetypes = surfaceMap('taskCard');"""),
    ],
    "components/backdrop/FactionBackdrop.tsx": [
        ("import WatercolorBackground from '../layout/WatercolorBackground'\n", ""),
        ("""/**
 * Per-faction page-ground dispatcher, keyed by the slug the surrounding page
 * puts on {@link useBackdropSlug}.
 *
 * THERE IS NO `DefaultBackdrop.tsx`, AND THAT IS NOT A GAP. The fallback below
 * is `WatercolorBackground` — the site's own watercolour ground, which is the
 * designed neutral for a page with no faction (`default ≡ na ≡ Unaffiliated` is
 * one identity, ADR-0039/0046/0048). A `na` or unregistered slug is served that,
 * not left bare, so there is nothing for a separate default skin to draw.
 */""",
         """/**
 * Per-faction page-ground dispatcher, keyed by the slug the surrounding page
 * puts on {@link useBackdropSlug}.
 *
 * THERE IS STILL NO `DefaultBackdrop.tsx`, AND THAT IS STILL NOT A GAP. na's
 * `backdrop` row (`factions/default.ts`) points straight at
 * `WatercolorBackground` — the site's own watercolour ground, which IS the
 * designed neutral for a page with no faction (`default ≡ na ≡ Unaffiliated` is
 * one identity, ADR-0039/0046/0048). #2530 gave that row a name in the registry
 * instead of an argument here; a file whose whole body re-exported the
 * watercolour under a `Default*` name would have been the only thing added.
 */"""),
    ],
    "pages/characterPaths/__tests__/createCharacterFields.test.tsx": [
        ("const DefaultCreateCharacter = (await import('../archetypes/DefaultCreateCharacter')).default\n\n", ""),
        ("/** Every registered skin, plus `''` — born unaffiliated, the `na` kit. */\nconst ARCHETYPES = [...Object.keys(surfaceMap('createCharacter')), '']",
         "/** Every registered skin — `na` among them since #2530 — plus `''`, which\n *  resolves to na's the same way an unregistered slug does. */\nconst ARCHETYPES = [...Object.keys(surfaceMap('createCharacter')), '']"),
    ],
    "pages/editPraxis/archetypes/__tests__/composerRule.test.tsx": [
        ('const { default: DefaultEditPraxis } = await import("../DefaultEditPraxis");\n', "")],
}

for rel, pairs in EDITS.items():
    path = SRC / rel
    text = path.read_text(encoding="utf-8")
    for old, new in pairs:
        assert old in text, (rel, old[:60])
        text = text.replace(old, new, 1)
    path.write_text(text, encoding="utf-8", newline="\n")
    print("ok", rel)
