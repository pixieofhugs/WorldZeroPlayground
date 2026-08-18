"""#2141 §4 — retire NILE by role.

Links / affirmations / accents -> BRASS_LIGHT (text, owes 4.5:1).
Files that already import BRASS_LIGHT drop the NILE import line; the other two
trade it for a BRASS_LIGHT entry at the list's alphabetical slot.
"""
import io
import re

DROP = [
    "frontend/src/components/feed/EphemeristsFeedFrame.tsx",
    "frontend/src/pages/characterProfile/archetypes/EphemeristsProfileBody.tsx",
    "frontend/src/pages/editPraxis/archetypes/EphemeristsEditPraxis.tsx",
    "frontend/src/pages/factionDetail/archetypes/EphemeristsFactionBody.tsx",
    "frontend/src/pages/praxisDetail/archetypes/EphemeristsPraxisDetail.tsx",
]
# path -> the import line BRASS_LIGHT should be inserted before
INSERT = {
    "frontend/src/components/comments/voices/EphemeristsComment.tsx": "  CAPS,\n",
    "frontend/src/pages/fieldDesk/mobileArchetypes/EphemeristsFieldDesk.tsx": "  CAPTION,\n",
}


def rewrite(path, mutate):
    s = io.open(path, encoding="utf-8").read()
    assert s.count("  NILE,\n") == 1, path
    s = mutate(s)
    s = re.sub(r"\bNILE\b", "BRASS_LIGHT", s)
    io.open(path, "w", encoding="utf-8", newline="").write(s)
    print("rewrote", path)


for p in DROP:
    rewrite(p, lambda s: s.replace("  NILE,\n", ""))

for p, anchor in INSERT.items():
    def mutate(s, anchor=anchor):
        s = s.replace("  NILE,\n", "")
        assert s.count(anchor) == 1
        return s.replace(anchor, "  BRASS_LIGHT,\n" + anchor)
    rewrite(p, mutate)
