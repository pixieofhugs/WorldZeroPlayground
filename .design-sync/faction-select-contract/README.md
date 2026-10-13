# Faction select cards — the seven-slot contract (#3130)

Design reference for #3130. Vendored for the life of that work and **deleted by
its last PR** (`docs/agents/design-fidelity.md`, "Vendor, build, delete").

| File | What it is |
|---|---|
| `mock.html` | The mock-up. Open it in a browser. Switches for Locked / Eligible / Member and Light / Dark, and a "Show the slots" overlay that outlines the seven slots on every tile. `mock.html#member` opens on a state. |
| `tiles-light-member.webp` | All eight tiles, light theme, member state (seals visible). |
| `tiles-dark-locked.webp` | All eight tiles, dark theme, locked state (Albescent redacted). |

## How to read it

- **The issue is the spec; this is the picture.** Where they disagree, #3130 wins.
- **The slot structure and order are the design.** Port those exactly.
- **The paint is a transcription, not a source.** Sigils, ornaments, grounds,
  colours and faces were sampled from the live cards' computed styles and written
  as literals. In the app they are tokens and components that already exist: read
  each `*SelectCard.tsx` and reuse what it mounts. Do not copy a hex from here.
- **The mock renders all eight tiles from one template. The app must not.** Each
  faction keeps its own card file and tree and shares layout blocks (#2992).
- Headcounts are example numbers. "Placeholder" is the literal value for the two
  lines the owner has yet to write.

## Where the mock is behind the issue

The owner corrected these after the mock was drawn. Build the issue's version.

| Tile | The mock shows | Build this instead |
|---|---|---|
| UA | The ensō in the band, on the mandala field; a rule and small rosette as the ornament | The band is the mandala field and the name only. The ensō is the ornament. |
| UA | Member seal: a square "UA" chop | A mandala like the five-vote one (`components/vote/UaVote.tsx`) |
| WOW | Member seal: a corner ribbon | A balloon |
| Ephemerists | Ornament: a tick scale | The gloss, characters fading in and out across scripts (`components/factionMarks/EphemeristsGloss.tsx`) |
| Ephemerists | Member seal: a star in a ring | An alchemical symbol, like the vote's (`components/vote/EphemeristsVote.tsx`) but simpler |

## First sketches, not decisions

The seals for Coven, Snide, Singularity, Everymen and Albescent, and the WOW
(harlequin diamonds) and Singularity (process lamps) ornaments, were invented for
the mock. They want a design pass before they are treated as final.
