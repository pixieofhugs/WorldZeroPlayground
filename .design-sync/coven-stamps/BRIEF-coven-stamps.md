# Brief — Cozy Coven point card + light-mode vote plate

Vendored 2026-08-17 from Claude design project `8766d74b-5280-45c5-ae36-e980dfe1f3a9`
(files `TallyStamp.dc.html`, `VoteStamp.dc.html`). Owner-grilled the same day.

Per `docs/agents/design-fidelity.md`: **port from the source files in this
directory**, not from the issue's description of them. Every deviation goes in
the PR body. The last PR of this pair deletes `.design-sync/coven-stamps/`.

> **The scope rule for both files: this is 100% visual and 0% new mechanics.**
> Owner ruling, verbatim. No payload field, no service, no resolver, no copy
> string changes. If a change you are about to make alters what a number *is*
> rather than how it *looks*, you have left scope.

---

## Corrections to the vendored copy — read before porting

The design files are annotated below rather than edited, so they stay a faithful
record of what was drawn.

### TallyStamp.dc.html

1. **Its `breakdown()` is a stale mirror of `scoreBreakdown.ts`.** The comment at
   the top of the script claims to mirror
   `frontend/src/components/praxisCard/scoreStamp/scoreBreakdown.ts`. It does
   not: it has **no `habit` term** (added by #1617) and it keeps `votes` as
   `0`-or-number where the real resolver nulls it at `<= 0` (ADR-0076).
   **Call the repo's `scoreBreakdown()`. Do not port the design's copy of it.**
2. **The `vessel` prop is not a live choice.** It offers `cauldron | crystal
   ball`. **Owner ruling: cauldron.** Ignore the `isCrystal` branch entirely; do
   not build a toggle.
3. **The 8-case grid is a spec sheet, not a layout.** The page title, the
   per-case titles/notes, and the `width:210px` columns are the presentation of
   the *specimen sheet*. Only one case is a component.
4. **No case exercises `crowned`.** `is_top_for_task` is never set in any spec,
   so the `♛` branch is undrawn in every rendered case.

### VoteStamp.dc.html

1. **It is a comparison sheet.** Both plates render stacked so the sun can be
   seen beside the moon. **The shipping component renders exactly one plate.**
2. **Its `moonNode` is a simplified redraw of what already ships**, missing three
   ornament families that are live in `CovenVote.tsx` — see ruling 6 below.
3. **Its theme detection is not the repo's.** The `MutationObserver` +
   `readTheme()` + `state.theme` machinery reinvents `useTheme()`
   (`frontend/src/hooks/useTheme.tsx`). No component in this repo reads
   `data-theme` off the DOM.
4. **Its labels are not the shipped copy** and its eyebrow reinstates a slot
   #1909 deleted — see ruling 3 below.

---

## The ten rulings

| # | Question | Ruling |
|---|---|---|
| 1 | The `Group` row (`base + meta`) — shared or local? | **Local.** Computed in the Coven skin from two values `scoreBreakdown` already returns. No change to `ScoreBreakdown`, no ADR-0049 amendment. |
| 2 | Pirata One, or an existing face? | **Existing.** `var(--font-faction-witch)` (Grenze Gotisch) in all three places. Do not add a 19th font family. |
| 3 | Does the vote copy change? | **No.** `VOTE_REFRAMES['coven']` and `votes.json` are untouched, and **the "how true did it land" eyebrow is not built** — #1909 deleted that slot on purpose. |
| 4 | How does the sun/moon swap happen? | **`useTheme()` picks the motif; tokens carry every colour.** The ternary chooses a component, never a hex. |
| 5 | Does the full plate + cauldron land on both stamp surfaces? | **Yes, both** — the praxis card *and* the composer task slip. |
| 6 | Does the moon keep its ornaments? | **Yes — the moon is untouched.** This work adds a sun; it does not open the existing dark path. |
| 7 | Design hexes, or the tokens they nearly are? | **Tokens.** Map each design colour to the nearest existing `--faction-coven-slip-*`. |
| 8 | Is the three-way row colour-code deliberate? | **Yes, ship it** — base pink, mult dark gold, votes blue — as new measured tokens with light **and** dark values. |
| 9 | The cast burst? | **Not built.** The sun gets *the flourish the moon already has* — dust motes and rank-5 sparkles — not the design's ring-and-11-sparks. |
| 10 | Does the stamp keep its `rotate(-3deg)` tilt? | **No.** The new composition renders upright as drawn. |

---

## Facts established during the grill — verified, reuse rather than re-derive

**Six of TallyStamp's palette entries are already repo tokens, exactly:**

| design var | hex | token |
|---|---|---|
| `--pk` | `#ec4f92` | `--faction-coven-slip-pk` |
| `--pk-deep` / `--seal` | `#c9327a` | `--faction-coven-slip-deep` |
| `--pk-dk` | `#8f2557` | `--faction-coven-slip-ink` |
| `--pk-lt` | `#fbc4dd` | `--faction-coven-slip-mid` |
| `--border` | `#f4a9cc` | `--faction-coven-slip-border` |
| `--yl` | `#f4c430` | `--faction-coven-slip-gold` |

All six have dark-mode values at `index.css:2647-2659`. **Porting the literals
would ship a light-only card** — the current stamp responds to dark mode today,
so that is a regression, not fidelity.

The design's near-misses run **lighter than the token they resemble**, and both
are painted on text: `--pk-soft` `#b8517f` vs `--faction-coven-slip-soft`
`#973660`; `--label` `#b06a92` vs `--faction-coven-slip-label` `#83466a`.
`covenSlip.tsx:22-45` carries the measurements — `INK`/`SOFT`/`LABEL` are the
three tiers that clear AA, `DEEP` is already 4.44:1, and `PINK` is **ornament
only** at 3.07:1. Take the tokens.

**`.coven-moon-dust` and `.coven-moon-sparkle` are motion-only** — both live
inside `@media (prefers-reduced-motion: no-preference)` (`index.css:4108-4109`)
and take their stagger from `--tw-delay`. Colour comes from the SVG `fill`, so
the sun reuses both classes verbatim with sun-token fills. No new keyframes.
`--tw-delay` is a **real app variable**, not a Tailwind internal (#1318).

**`ScoreStamp` dispatches on `praxis.task_faction_slug`** — the *task's* faction
(`ScoreStamp.tsx:87`). A UA character's praxis on a Coven task therefore renders
`CovenScoreStamp` **with a live habit row**, a case the design never draws.

**`ScoreStamp` has two consumer families**, and Coven passes no `mark` override,
so both get this change:
- `components/praxisCard/desktop/shared.tsx:190` — the praxis card's right column
- `pages/editPraxis/archetypes/shared.tsx:1009` — the composer task slip (#1828)

**No existing test renders `CovenVote`.** `voteUI.test.tsx` dispatches with
`factionSlug={null}` to `DefaultVote`. Note `useTheme()` **throws** outside a
`ThemeProvider`, so any new Coven vote test must wrap it.

---

## The trap that will not show up in a green build

**`Group` is `base + meta` and must never include `habit`.** The habit bonus is
flat and sits *outside* the multiplier (`scoreBreakdown.ts:50-57`) — multiplying
it would make the same faction ability worth more under a non-neutral era than
under Era 1. Because the stamp dispatches on the task's faction, this skin does
see live habit rows, and a `Group` that swallowed one would print arithmetic
that does not reach the printed total. The design never shows that case.
