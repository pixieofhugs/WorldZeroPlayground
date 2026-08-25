"""#2530 third pass: the tests that counted the map's rows, or compared an
archetype without unwrapping the code-split wrapper.

`na` is a row now, so "every registered slug" is nine and "the Default" arrives
as `lazyArchetype`'s `Archetype` wrapper rather than as the module. Both are
mechanical, and both are the SAME two edits everywhere: exclude na from a roster
derived with Object.keys, and put `resolvedArchetype()` round a comparison.
"""
from pathlib import Path

SRC = Path(__file__).resolve().parent.parent / "frontend" / "src"

EDITS = {
    "pages/characterPaths/__tests__/createCharacterDispatch.test.tsx": [
        (" * archetype the moment it registers, with nothing to append.\n */\nconst REGISTERED = Object.keys(surfaceMap('createCharacter'))",
         " * archetype the moment it registers, with nothing to append.\n"
         " *\n"
         " * `na` is excluded because since #2530 it is a ROW rather than the\n"
         " * fallback behind the row — and every assertion below about \"the Default\"\n"
         " * is about the component that row points at.\n"
         " */\n"
         "const REGISTERED = Object.keys(surfaceMap('createCharacter')).filter(\n"
         "  (slug) => slug !== UNAFFILIATED_FACTION_SLUG,\n"
         ")"),
        ("import { resolveVariant } from '../../../utils/factionDispatch'",
         "import { resolveVariant } from '../../../utils/factionDispatch'\n"
         "import { resolvedArchetype } from '../../../factions/lazyArchetype'\n"
         "import { UNAFFILIATED_FACTION_SLUG } from '../../../utils/factions'"),
        ("function archetypeFor(slug: string) {\n  return resolveVariant(surfaceMap('createCharacter'), slug)\n}",
         "function archetypeFor(slug: string) {\n"
         "  // Unwrapped: every archetype is code-split, so the map hands back\n"
         "  // `lazyArchetype`'s wrapper and an identity comparison needs the module.\n"
         "  return resolvedArchetype(resolveVariant(surfaceMap('createCharacter'), slug))\n"
         "}"),
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
