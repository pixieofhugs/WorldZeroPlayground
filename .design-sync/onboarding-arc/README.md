# Onboarding arc: the approved prototype

Source for epic #3457. Vendored for the life of the epic; its last PR (#3471) deletes this
folder. Where this bundle and #3457 disagree, the issue wins.

## Map

| File | Holds |
|---|---|
| `src.html` | The whole flow as one design-canvas page. `@@NAME@@` is filled in by `build.py`. |
| `build.py` | The mascot, the faction accessories, the dragon, and the motion generators. |
| `stills/` | Every step settled: `dNN-<seconds>.webp` at 1440x900, `pNN-<seconds>.webp` at 390x844. |
| `assets/` | The two drawn photos (`.html` is the SVG source, `.png` the export) and two avatars. |
| `NOTES.md` | The decision log from the eight review rounds. |

Each step is marked in `src.html` by a comment `<!-- N · … -->`:
0 title, 1 to 7 the beats, 8 contract, 9 declined, 10 login, 11 character, 12 arrival, 13 sign in.

In `build.py`: `body()`, `WISP`, `BALD` and the three hats draw the mascot; `ACC` holds each
faction's accessory; `DRAGON` and `TAIL` draw the dragon; `Rig` and `kf` are the motion rig;
`b1()`, `b1wide()`, `b4()` and `b6()` generate the keyframes for beats 1, 4 and 6.

## Prototype-only: do not port

- `window.WZ` and `x-import` (how the canvas mounts real components).
- `window.__dsPreview` (a mock signed-in viewer).
- The document-level click capture on the vote row and the terms buttons.
- The `blob()` URL helper for images.
- The code that measures the Cancel button to place Back beside it.
- The `emit()` loop in `build.py` that writes one file per step.
- "prototype: pretend I signed in" and "replay prototype".

## Where the bundle is behind #3457

- Beat 6 rolls level 1 to 2 with a literal unlock sentence. The epic says 0 to 1, worded from
  `locales/en/progression.json`.
- The header's "Sign in" and "Skip" are prototype buttons; #3461 defines where they go.
- The beat 7 slogans are literals in `src.html`. The build reads
  `feed:factionSelect.<slug>.tagline`.

## Label check (2026-11-18)

Checked against `frontend/src/locales/en/feed.json` and `frontend/src/css/`:

- All seven faction slugs, their `--faction-<slug>` colours and their `--font-faction-*`
  faces exist under those names.
- All seven slogans match the catalog taglines. One typographic difference: the bundle
  writes Snide's with a curly apostrophe, the catalog with a straight one. The catalog wins.
- Albescent and `na` have taglines in the catalog and are deliberately not in the fight.

## Not vendored

The render harness (`shot.mjs`, `canvas.json`, `assets/make*.mjs`) and the per-step
`.dc.html` files `build.py` emits. `build.py` cannot run from here without them; read it,
do not run it. #3460 moves its motion code to a script that does run.
