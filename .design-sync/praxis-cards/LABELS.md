# Read this before touching WOW or Coven

**Every design artifact in this epic labels these two factions backwards.** Not
some of them — the filenames, the section headings, and the sample bylines inside
the mockups. Going by a label already cost one full build wave (#821, PRs
#829–834). The record is **ADR-0050**; this file is the short version.

## Why

The faction was originally **`gestalt`** — "gestalt.exe", a pink computer-witch
desktop. The design system's own token file still carries it that way:
`--gestalt-pink: #ec5f99`, `--gestalt-border: #f3b6d2`, `--gestalt-card-bg:
#fffdfa`, and decisively **`--gestalt-moon-lit` / `--gestalt-moon-shadow`**. The
moon-phase metaphor was always a token of the *pink* faction.

Then: `gestalt` → renamed **Warriors of Whimsy** → **#784** split **Cozy Coven**
off it, taking the then-current gold/plum chronicle → **#812/#814** gave Warriors
of Whimsy a new identity.

Designs authored between the rename and the split therefore call *both*
identities "Warriors of Whimsy" — which is why the chronicle in this bundle is
filed under a "Cozy Coven" heading, why the pink card's sample byline reads
"Warriors of Whimsy", and why the two faction-kit projects carry each other's
names.

## The assignment

Confirmed with the owner 2026-07-20. Go by **tokens and metaphor**, never by a label.

| | **`wow`** (Warriors of Whimsy) | **`coven`** (Cozy Coven) |
|---|---|---|
| Card | cream / gold / **plum** chronicle | pink marker-sticker card, light **and** dark |
| Widget | googly **balloons** | **moon phases** on a night plate |
| Glyph | `✦` — the one place the retired `✦` survives | `✨` |
| Tier ladder | `… excellent · legendary` | `sweet · lovely · wonderful · magical · iconic` |
| Caption | `Cast thy Verdict` / `thou dubbed it legendary!` | `how'd this land?` / `magical · YAY!` |
| Register | archaic — *"for the quest"*, *"Sealed by the Court"*, *"here, an illumination"* | cozy-casual — *"all done!"*, *"Drop a happy little photo"*, *"a crew of four"* |

## What shipped, and is wrong

`main` currently has these inverted. The moons are on `coven` but wearing
Everymen's tier words; the balloons are on `wow` wearing Coven's. A yellow token
family (`--faction-wow-balloon-*`, `--faction-wow-chronicle-*`) was authored for
`wow` and is retired by **#838**.

## Not vendored here

The two full faction kits are **not** in this directory — they are only needed by
#840 (the WOW/Coven card rebuild) and #835 (the WOW composer), and will be pulled
at that point by the orchestrator. When they are:

- DesignSync project `d0a6fdd7-a2f3-4f61-834a-3a06ab4acf07`, files named
  **"WoW Faction Kit"** → this is **`wow`**. Cream/gold/plum.
- DesignSync project `32c7198b-e7e7-43be-ad4f-590309b1093d`, files named
  **"Warriors of Whimsy …"** (nine surfaces) → this is **`coven`**. Pink.

Yes, that means the project whose every file says "Warriors of Whimsy" is the
Coven kit. That is the whole point of this file.

## The one thing that does *not* swap

**The rainbow spine.** `wow`'s yellow stop in `--faction-default-rainbow` is
spectrum membership, not skin, and stays put per #814. What retires is the yellow
*skin* ramp, not the yellow *spectrum stop*. These are easy to conflate and they
are not the same thing.
