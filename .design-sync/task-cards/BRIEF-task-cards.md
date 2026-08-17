# Brief — Task cards v3

Vendored 2026-08-17 from Claude design project `41610660-5bc9-4ccf-8659-92cc43a44942`
(`Task Cards.dc.html`). Owner-grilled the same day.

Per `docs/agents/design-fidelity.md`: port from the vendored file, list deviations
in every PR body, and let the epic's last PR delete `.design-sync/task-cards/`.

---

## Read this first: the design is a picture, not an implementation

**Nothing in this design is portable code.** It is a *specimen sheet* that mounts
the **existing** kit cards —

```html
<x-import component-from-global-scope="WZ.CovenTaskCard" …>
```

— and then runs ~1,090 lines of `DCLogic` that **mutate them in the DOM**: it finds
the CTA with `button[data-boxed]`, identifies the faction by reading the *spec
sheet's own heading text* (`/TaskCard$/i`), and re-dresses what it finds.

Its sibling `eph-dress.css` is the same thing in CSS — selectors like
`div[style*="repeating-linear-gradient(0deg, transparent 0 25px"]`,
`svg:has(> ellipse[transform="rotate(-24 12 12)"])`, and
`:nth-child(22n+7)::before { content: "Ψ" }`, all reaching into the *rendered
inline styles* of shipped components to override them.

`eph-dress.css`, `eph-dress.js` and `sigils.js` are **deliberately not vendored**.
Policy step 3 says port production-intent code where the bundle ships it; this
bundle ships none, and 40 KB of unportable override selectors would mislead
rather than help. They remain in the design project if anyone wants to look.

**So: read the design for WHAT CHANGES. Write the change in the real component.**
A PR that introduces a `[style*=…]` selector or a DOM-mutating effect has
misread this brief.

### Two more stale claims in the file

- `normalizeSignups()` matches `/take up the quest|i'm in|triangulate the truth|report for duty|enlist|answer the call/i`. **None of those are task-card CTAs on `main`** — they are invitation-letter copy. The #1863 / #1909 / #1939 sweep already retired them. Its only real effect is Albescent.
- `rotateEphWordmark()`'s body reads *"Wordmark stays in English — the rotation is retired."* The wordmark does **not** rotate. Only the points label and the CTA do.

---

## The rulings

| # | Question | Ruling |
|---|---|---|
| 1 | Does the copy normalise, or is this visual-only? | **Copy normalises.** One word for level, one for points, one for the CTA. |
| 2 | The three non-Latin scripts | **Self-host subsets** — ten codepoints across three faces. Do **not** rely on the system fallback chain. |
| 3 | How is the work cut up? | **Shared-first.** Copy, header anatomy and CTA shape land before any faction ornament issue starts. |
| — | Screen readers | **The accessible name is the i18n string** — English, or Spanish on a Spanish site. Rotating glyphs are `aria-hidden`. |
| — | Task Details | **Out of scope** for now (the sibling `Task Details.dc.html` is not part of this). |

## What the design changes

### Cross-faction (land these first)

1. **Copy normalisation** — `feed.json` `taskCard.*`:
   - level → `Level` (today: `Level` ×4, `level` ×3, `lvl`, `Lvl {{level}}`)
   - points → `Points` (today: `points` ×4, `pts` ×2, `PTS` ×2, `pvncta`)
   - CTA → `Sign up` (today 8 of 9 already say it; **only `albescent`'s "acknowledge" changes**)
2. **Header anatomy** — one masthead shape: **sigil hard left, faction title centred**.
   Seven of nine cards carry one. **UA and WOW gain a masthead they do not ship today.**
   `na` and `albescent` stay bare.
3. **CTA shape** — the skins that ship the sign-up as a full-bleed footer bar shrink to a
   discrete inset button, with real air beneath it. Some factions also gain a drawn rule
   above the CTA region (`default`, `albescent`, `ua`, `ephemerists` — `wow`, `snide`,
   `singularity`, `coven`, `everymen` keep their own bottom treatment).

### Per-faction ornament (parallel, after the above)

| faction | what the design adds |
|---|---|
| `ua` | masthead in UA's hand; ensō score ring grown so "Points" clears the stroke; mandalas lose their outer ring and flank the CTA |
| `wow` | plum masthead banner; gold wordmark; sigil off the card edge; bunting under the band; balloon knights beside the CTA |
| `coven` | floating wordmark becomes a banded header; **the score sits in a bubbling cauldron**; CTA reads as a rounded box |
| `everymen` | masthead names the faction; stamped points seal; fists-and-lightning flanking the CTA |
| `snide` | bigger mark; sprayed CTA lettering; pen circle grown |
| `singularity` | ASCII face drifting beside the CTA |
| `ephemerists` | compass-rose points plate replaces the plain octagon; sigil moves onto the wordmark's row |
| `albescent` / `na` | no masthead; rainbow rule above the CTA |

### Separate, because each carries something no other card does

- **The Ephemerists script rotation** — fonts + a11y. See below.
- **The Coven watermark: pentagram → cat.** `.cvn-wheel` is mounted in **two** places
  (`CovenTaskCard.tsx:242` and `CovenProfileBody.tsx:104`, whose docblock says the sharing
  is deliberate), and the class carries `animation: cvn-wheel 120s linear infinite` — so as
  drawn **the cat still slowly rotates**, and the profile either follows or diverges. Decide
  both, explicitly.
- **Faction backdrops** should follow the new cards (owner). Eight exist
  (`components/backdrop/`, no Albescent, no `na`). **This is not drawn in the design** — the
  look needs deciding before anyone builds it.

---

## The Ephemerists rotation, in full

Two elements rotate; the wordmark does not.

| element | cycle | frames |
|---|---|---|
| points label | 6.5s | `Points` → `PVNCTA` → `نقاط` → `点数` → `𒌦𒋫` |
| CTA | 7.0s | `Sign up` → `ADSCRIBE` → `اشترك` → `参加` → `𒃻𒈬` |

Each pins its box to the **widest** variant before starting, so the label can change
script without the button resizing under it, then picks a random non-repeating frame
each cycle. `pvncta` is therefore not deleted by the copy normalisation — it moves from
being the static unit to being one turn of the wheel.

**Fonts.** The repo carries **no Noto family**. Subset each to only the codepoints used:

| frames | face | design's fallback (do not rely on it) |
|---|---|---|
| `نقاط` `اشترك` | Noto Naskh Arabic | `Geeza Pro` — macOS only |
| `点数` `参加` | Noto Serif JP | `Hiragino Mincho ProN` — macOS only |
| `𒌦𒋫` `𒃻𒈬` | Noto Sans Cuneiform | `Segoe UI Historic` — Windows only |

Unsubset these would blow the budget; ten codepoints will not. The fallback chain fails
**asymmetrically by platform** — cuneiform renders as tofu on Linux and Android while a Mac
reviewer sees nothing wrong. `--font-faction-engraved` is **Cinzel** and is already loaded.

**Accessibility.**
- The accessible name is the **i18n string** — `Points` / `Sign up`, or their Spanish
  equivalents on a Spanish site. The rotating glyphs are `aria-hidden`.
- **Frame 1 is the live i18n string** (so it reads "Puntos" on a Spanish site); frames 2–5
  are fixed ornament.
- **`prefers-reduced-motion` pins the label to frame 1, static.** WCAG 2.2.2 covers
  auto-updating content and 6.5s is inside it.
- **The four non-Latin frames are NOT catalog entries.** They are decorative constants in
  the component. In `feed.json` they would become four strings no translator can act on,
  which is exactly the mess #440 does not need.

---

## Sequencing, and why

Owner ruling: **shared passes land before any faction ornament issue starts.**

The header anatomy and the CTA shape are shared by nine cards. Nine agents each inventing
them produces nine slightly different versions — every branch green, `main` red. That has
happened in this repo before. Land the shared work first and each faction issue becomes
genuinely independent ornament.
