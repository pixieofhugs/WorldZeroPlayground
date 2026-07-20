# Design brief — University of Asthmatics identity (issue #788)

Read this before touching a single UA file. The design lives at
`.design-sync/ua-faction-kit.html` (vendored — you cannot reach claude.ai). This
brief is the **contract**: where the kit and this file disagree, this file wins,
because the kit was drawn against assumptions this file corrects.

---

## 0. The one thing to understand first

> **The salon is dead.**

UA today is a gilt academic salon that is *deliberately always-light*: its
`[data-theme="dark"]` block repeats the light values on purpose, and ten
component docstrings cite "#240 — the salon never dims" as the reason. That
ruling is **reversed**. UA becomes a quiet, minimal, sun-bleached practice with a
real dark mode.

This means the always-light comments are not just stale prose — they are the
justification for code that must now change. Delete them as you go. Any file you
touch that still says "always-light", "never dims", "parchment in both themes",
or "#240" after your commit is a bug you shipped.

**No gold anywhere.** Gold moved to Warriors of Whimsy. The entire legacy
`--ua-*` family (`--ua-gold`, `--ua-gilt`, `--ua-gold-lt`, `--ua-gold-pale`, and
the ten around them) is **deleted**, not migrated.

---

## 1. Scope

**In:** every per-faction surface in `docs/spec/SPEC-faction-ui-profile.md` §1
*except* the praxis card.

**Out, for now:**

- **Surface 2, the praxis card** — explicitly deferred by the owner. Do not
  touch `PraxisCard.tsx`'s UA branch or `UaMobilePraxisCard.tsx`. They will keep
  reading the old tokens until a follow-up issue. See §7 for how to leave them
  working.
- Renaming the faction or the `ua` slug. Both are expected later; the copy in §6
  is written to survive it.
- `--everymen-*` and `--snide-*` legacy token families.
- Any backend, game-rule, or scoring change.

---

## 2. Token contract — final values

Deliver everything under `--faction-ua-*`. Light in `:root`, dark in
`[data-theme="dark"]`. **Every token below needs both.** Dark mode works purely
through the cascade — there are no `dark ? a : b` ternaries in components.

### §3 required contract

| Token | Light | Dark | Notes |
|---|---|---|---|
| `--faction-ua` | `#C24A18` | `#E8703A` | primary; fills, the 10px rainbow dot |
| `--faction-ua-light` | `#F2E0CB` | `#241E18` | faint tint background |
| `--faction-ua-border` | `rgba(194,74,24,.28)` | `rgba(232,112,58,.32)` | the *orange* hairline |
| `--faction-ua-card-bg` | `#F7E7D2` | `#241E18` | card surface |
| `--faction-ua-card-text` | `#2E2820` | `#F1E8DA` | body ink — 12.02:1 / 13.58:1 |
| `--faction-ua-card-accent` | `#A5400F` | `#F0894A` | metadata, links — 5.18:1 / 6.58:1 |
| `--faction-ua-card-muted` | `#675B4C` | `#A8947A` | secondary text — **see the contrast note** |
| `--faction-ua-card-font` | `var(--font-faction-serif)` | same | **new shared token, see §3** |
| `--faction-ua-on-fill` | `#FCF7EF` | `#201A14` | ink on a solid fill — 4.59:1 / 5.59:1 |

### Archetype-private primitives

| Token | Light | Dark | What it is |
|---|---|---|---|
| `--faction-ua-page` | `#E7DCC9` | `#191410` | app ground — mesa sand |
| `--faction-ua-page-text` | `#362F27` | `#E7DCC9` | text directly on the ground — 9.72:1 / 13.47:1 |
| `--faction-ua-panel` | `#F2E0CB` | `#2D261F` | inset panel, media well |
| `--faction-ua-lift` | `#FDF0DF` | `#372E25` | raised highlight |
| `--faction-ua-card-body` | `#544A3C` | `#D6C9B2` | running prose, a step above muted — 7.15:1 / 10.09:1 |
| `--faction-ua-rule` | `#DBCBB3` | `#3B3229` | neutral hairline / divider |
| `--faction-ua-hair` | `#E4D8C3` | `#332B22` | faintest divider, below `-rule` |
| `--faction-ua-glow` | `#DD5A1E` | `#F08A4E` | **ornament only** — ensō, mandala. Never text. |
| `--faction-ua-vermil` | `#B5361A` | `#D9542A` | the ensō score numeral (large text only) |

**Five of these had no name in the kit.** It paints with doc-local `--ink`,
`--text`, `--hair`, `--border`, `--body`; those become `-card-text`,
`-card-body`, `-hair`, `-rule`, `-page-text` respectively. Note `--faction-ua-border`
(orange, from the §3 contract) and `--faction-ua-rule` (neutral) are **different
tokens** — the kit uses both and calls them both `--border` in places. Read the
hex, not the name, when porting a rule out of the kit.

### Contrast corrections — these are changes to the kit, not transcription

The kit claims AA in both themes. Two pairs do not hold. Both are fixed above;
do not restore the kit's values.

1. **`--faction-ua-card-muted` light: `#6E6252` → `#675B4C`.** The kit's value is
   4.90:1 on `card-bg` (passes) but **4.38:1 on `--faction-ua-page`** (fails
   4.5). The kit itself puts muted text on the page ground — captions,
   timestamps, section labels. `#675B4C` is 4.87 on page, 5.45 on card-bg,
   5.13 on panel.
2. **`--faction-ua-card-muted` dark: `#A08C72` → `#A8947A`.** The kit's value is
   **4.11:1 on `--faction-ua-lift`**. `#A8947A` clears every surface: 4.55 lift,
   5.10 panel, 5.64 card-bg, 6.25 page.

Everything else in the palette clears. Two things that look like failures and
are not: `--faction-ua` as *text* on card-bg is 4.04:1 — it is a fill and
large-text colour only, and the kit respects that; `--faction-ua-glow` is 3.12:1
and is ornament only, which is why it has its own token name.

Add every new text/background pair to `factionContrast.test.ts` `ARCHETYPE_PAIRS`.
**Do this commit first.** A sun-bleached palette sits in a narrow luminance band;
this is where the work fails, and it is much cheaper to fail before twenty
components are built on top of it.

---

## 3. The headline face

The kit sets every heading in **Cormorant Garamond**. It is already loaded — it
is `--eph-script`, Ephemerists' flourish face.

Do **not** point `--faction-ua-card-font` at `--eph-script`. Add a shared face
token beside the others around `index.css:906`:

```css
--font-faction-serif: "Cormorant Garamond", Georgia, serif;
```

and set `--faction-ua-card-font: var(--font-faction-serif)`. UA currently uses
`--font-faction-old` (IM Fell English); that binding goes away. Repointing
Ephemerists at the new shared token is a tidy-up for another day — leave
`--eph-script` alone.

No new font loads are needed. Cormorant Garamond, EB Garamond, and Caveat are
all already in the app.

---

## 4. The ensō

The kit ships two. **Build the small one.**

`.design-sync/ua-enso.svg` is the buildable mark — two arcs, tapered by
stroke-width rather than by a variable-width path, gap at the lower-left
(~7–8 o'clock), whole figure rotated -7°:

```svg
<g transform="rotate(-7 100 100)" stroke="…" stroke-linecap="round" fill="none">
  <path d="M134 41.2 A68 68 0 1 1 66 158.8" stroke-width="22"/>
  <path d="M66 158.8 A68 68 0 0 1 66 41.2" stroke-width="10" stroke-opacity="0.85"/>
</g>
```

That is the whole brushstroke: the heavy sweep, the light return, the open gap.
Stroke colour is `--faction-ua-glow`. Inline it as a React component
(`UaSigil.tsx` already exists — replace its guts). The ensō is reserved for the
**score** and the **faction mark**; it is never a container border.

The kit's other ensō (`enso-detailed.svg`, the textured one it uses at 34px and
52px in the mobile skins) is **705 KB across 284 hand-drawn paths**. It is a
showpiece, not an asset. Do not inline it, do not vendor it, do not add an image
pipeline for it. If the plain arcs read too clean, the cheap approximation is a
`feTurbulence` + `feDisplacementMap` roughen filter — but ship without it first
and see whether anyone misses it.

---

## 5. The mandala — and the vote widget that already exists

**`UaVote.tsx` is already built to this design.** #834 shipped the growing
mandala two days ago, with this kit's exact reading ramp (`faint · forming ·
true · alive · radiant`). Do not rebuild it. Three edits:

1. **Rename** `--faction-ua-vote-rank-1…5` → `--faction-ua-rank-1…5` (the kit's
   name), and update the `RANK_COLOR` array in the component.
2. **Give the ramp dark values.** The kit only supplies a light ramp, chosen
   against parchment. On a dark card the light ramp inverts — its "radiant"
   deep vermilion becomes the *dimmest* swatch. Light ascends toward depth; dark
   ascends toward brightness:

   | | 1 faint | 2 forming | 3 true | 4 alive | 5 radiant |
   |---|---|---|---|---|---|
   | light | `#A69C8C` | `#C0894F` | `#D2762F` | `#DD5A1E` | `#B5361A` |
   | dark | `#7A6E5E` | `#A67C46` | `#C77A33` | `#E0672C` | `#F0894A` |

   All five dark values clear 3:1 on `card-bg` (3.31 / 4.39 / 4.91 / 4.82 / 6.58).
3. **Fix the core punch.** `--faction-ua-vote-core: var(--faction-ua-card-bg)`
   is correct and stays — but its comment says it works because card-bg "is
   parchment in both themes". That is now false; it works because it tracks
   card-bg, full stop. Rewrite the comment. Same for `--faction-ua-vote-halo`
   and `--faction-ua-vote-reading` (the reading word should become
   `var(--faction-ua-card-accent)` rather than its own hardcoded `#b8471a`).

**Where the mandala appears** (the kit's ruling, and it is a build-cost ruling —
respect it):

- **Full strength: the vote control only.** One place.
- **Faint texture, 6–22% opacity: behind surfaces** — page backdrop, faction
  hero, join card.
- **Absent: dense and text-heavy surfaces** — feed rows, comments, task lists,
  the editor.

Build it as **one parameterized SVG primitive** (rings, petals-per-ring,
opacity, rotation) used at three strengths — not as per-surface geometry. The
existing `.ua-mandala-*` keyframes at `index.css:1602` already animate it; reuse
them and keep every motion in a reduced-motion-gated class, never an inline
`animation:`.

---

## 6. Copy

All prose is frontend-only, keyed by slug (ADR-0031, ADR-0038). The voice is
quiet, present-tense, deliberate, low on exclamation. Names lean on *practice*
and *the mark*, never on "university" or "asthmatics", so a later rename does
not invalidate the catalog.

### `factions.json`

- **short descriptor** — "A daily practice of making marks."
- **propose-task descriptor** — "Practise with us — one true mark a day."
- **description** — "We practise art as a daily, deliberate thing. One true
  mark, then another. The satisfaction is in the making, not the tally."
- **name** — unchanged, "University of Asthmatics".

**The `prospectus` rename — and the one you must NOT touch.** The academic
framing becomes **The Practice**. `prospectus` appears twice in `factions.json`,
in different shapes, and only one of them is UA's:

- `:394`, under the `ua` key — an object (`heading`, `empty`). **This is yours.**
  → `heading: "The Practice"`, `empty: "Nothing written down yet."` Rename the
  key itself to `practice` and fix its two readers in
  `pages/factionDetail/archetypes/UaFactionBody.tsx` (lines 155, 168). Leaving a
  key called `prospectus` holding the string "The Practice" is exactly the kind
  of drift that let the `--ua-*` family survive this long.
- `:542`, under the top-level `invitation` key — a bare noun, `"a prospectus"`.
  **Leave it alone.** It is not UA's. `InvitationLetterPopup.tsx:182` is ONE
  adaptive popup shared by every faction, skinned through
  `--faction-<slug>-*`; that string is the overline for all seven. Retiring the
  academic framing there is a cross-faction copy decision and is out of scope.

Section labels: tasks → "Today's marks" · praxis → "Sealed work" · registry →
"Those practising" · spotlight → "Held up" · roster → "The circle" ·
invitation → "Come sit with the work."

### Surface voice

| Surface | String |
|---|---|
| task list | "Today's marks" |
| vote UI | "How true did it land" · faint · forming · true · alive · radiant |
| praxis masthead | "Praxis №{{n}} · Sealed" |
| comment composer | "Leave a note in the margin…" |
| feed | "{{actor}} sealed a praxis" |
| edit-praxis | "Seal a praxis" · "Once sealed, the mark stands." |
| field desk (home) | "One mark today. Begin." |
| join card | "Make one true mark a day" · button "Begin the practice" |

### Taunts — UA gets entries for the first time

`taunts.json` has **no `ua` key at all**; UA currently falls through to
`default`. That fallback is a gloat, which is off-voice — so UA overrides it
with acknowledgements rather than keeping it. Add a `ua` object matching the
shape every other faction uses (three keys, each an array of variants):

```json
"ua": {
  "score_overtake": [
    "{{to_name}} has passed {{from_name}}. The mark is the same either way.",
    "{{from_name}}, {{to_name}} is ahead today. Tomorrow is another sheet."
  ],
  "level_up": [
    "{{to_name}} settles a little deeper into the practice.",
    "A quieter hand, {{to_name}}. Well drawn."
  ],
  "praxis_complete": [
    "{{to_name}} sealed a mark. It stands.",
    "One more true thing from {{to_name}}."
  ]
}
```

### ADR-0026 is superseded — update it, do not leave it contradicted

ADR-0026 defines UA's comment surface as a **gilt salon**. It is replaced by
**the marginal note**: a quiet note in the margin of the work — rag paper, one
dashed orange rule, an ensō dot. No ornament, no gold. Author / body /
timestamp+edited slots are unchanged (ADR-0016). Posted row takes the *author's*
faction; the composer takes the *current character's*.

---

## 7. The legacy `--ua-*` deletion — do this last, and read this first

333 references across 26 files (20 UA archetypes, 3 shared components, 3 tests,
plus `index.css`). It is the one step that can break things
silently, because these tokens are read directly by components rather than
through `factionCssVar()`, so nothing type-checks them and a missed reference
fails as an unstyled element rather than a build error.

Three traps:

1. **Three of the readers are shared, not UA-only** —
   `components/cards/FactionSelectCard.tsx`, `components/cards/FactionSigil.tsx`,
   and `components/PraxisCard.tsx`. Changing them touches every faction's render
   path. Do not let two agents hold these at once.
2. **`grep -- "--ua-"` over-matches.** `index.css:1602` declares
   `--ua-grow-delay`, `--ua-spin-dur`, `--ua-spin-dir`, `--ua-twist-dur` — those
   are *animation-local custom properties* for the mandala keyframes, nothing to
   do with the legacy palette. Keep them. The family to delete is the fourteen
   at `index.css:274–287` and only those.
3. **The praxis card is out of scope but reads the family.**
   `PraxisCard.tsx`'s UA branch and `UaMobilePraxisCard.tsx` still need
   `--ua-paper`, `--ua-ink`, `--ua-sub`. Leave the handful of legacy
   declarations those two files actually use, with a comment naming the
   follow-up issue — **or** repoint just those two files at the new tokens
   without restyling them. Prefer the second: it is a smaller surviving
   footprint and does not leave gold behind.

Delete only once `grep` is clean. Do not delete and fix in the same commit.

---

## 8. What must not change

Per **ADR-0016**: a faction archetype owns presentation only. It cannot change
what data a surface receives or which slots it fills. If a layout in the kit
seems to need a field the surface is not given, the kit is wrong — say so, do
not widen a schema.

Per the kit's own note: **global chrome is reference only, not wired.** Nav,
sidebar, modals, toasts, and the generic button/tab/chip/empty-state controls
stay shared and are not redesigned here. Spacing, radii, and the type scale
reuse the shared design-system tokens — a faction picks a headline face, not a
new scale.

## 9. Testing

Follow the prior art: `uaDispatch.test.tsx` under each surface directory, the
slot-contract tests, `factionContrast.test.ts`, `locales/__tests__/catalog.test.ts`,
and `frontend/e2e/contrast.spec.ts`.

Assert **rendered output**, not registry contents. The frontend harness is
`renderToStaticMarkup` only — no jsdom, no testing-library, effects never run,
self-fetching components are untestable.
