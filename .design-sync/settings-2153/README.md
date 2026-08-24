# Settings design — vendored for epic #2153

`Settings.dc.html` pulled 2026-08-24 from Claude design project
`b001ae31-272d-4bb3-a005-47e8e4d7fe06` (a **different** project from the synced frontend kit
`11486504-…`, which is why `.design-sync/` does not otherwise carry it).

**Port geometry from this file, not from any issue's prose.** Delete this directory in the
epic's last PR.

---

## The file draws all six sections. Your issue builds one.

The canvas is the whole page so the sections can be seen together. Each `<section>` carries an
`id` naming its owner:

| section id | issue |
|---|---|
| `sec-appearance` | **#2154** — with the chassis |
| `sec-notifications` | #1047 |
| `sec-cookies` | #2156 |
| `sec-language` | #2157 |
| `sec-data` | #2158 |
| `sec-account` (danger zone + delete dialog) | #2161 |

Build only your own. The chassis (#2154) must make the others a card dropped into the pane.

## What is CANVAS SCAFFOLDING and must NOT ship

This is the failure this repo has hit four times — a surface built from a design shipped the
canvas's own furniture as if it were the app. None of the following is part of Settings:

- The **`VIEW` / Desktop / Mobile / Light / Dark chip bar** at the top. That is the canvas's
  own viewport and theme switcher, driving `s.mobile` and `s.dark`. In the app, responsiveness
  is CSS and the theme comes from `useTheme()`.
- **`frameStyle`** — the `1180×860` / `390×780` box, the `8px solid #1a1209` phone bezel, the
  `32px` phone radius, `0 24px 60px` drop shadow. That is a device mock. The real page fills its
  route.
- **`body { background: #e9e5dc }`** and the two hardcoded chip colours `#1a1209` / `#f7f4ee` /
  `#6b6050`. Canvas-only. Raw hex in app code fails the `no-raw-style-values` ratchet anyway.
- **`m`** (`s.mobile`) is a canvas boolean. Every `m ? a : b` in the file is a **breakpoint**,
  not a prop — express it in CSS, and note the app already has a mobile/desktop convention;
  follow the repo's, do not invent a `mobile` prop.
- `class Component extends DCLogic`, `renderVals()`, `sc-for`, `sc-if`, `{{ }}` bindings and
  `hint-placeholder-count` are the canvas runtime. React equivalents, obviously.

## The four `--wz-*` variables are NOT in the repo

The canvas `<style>` block declares them under `[data-theme]`:

```css
--wz-well:       color-mix(in srgb, var(--color-text-primary)  6%, var(--color-bg-page));
--wz-thumb-on:   color-mix(in srgb, var(--color-text-primary) 14%, transparent);
--wz-thumb-off:  color-mix(in srgb, var(--color-text-primary)  8%, transparent);
--wz-thumb-edge: color-mix(in srgb, var(--color-text-primary) 18%, transparent);
```

**Grep `index.css` before assuming.** If they are absent they must be added there — colours live
only in `frontend/src/index.css` — and they are theme-derived rather than literal, so they need
no `[data-theme="dark"]` twin: `color-mix` off `--color-text-primary` flips with the theme by
construction. They are shared by the toggle (#2154), the notification segmented control (#1047)
and the cookie toggles (#2156), so whoever lands first owns adding them and should say so in the
PR body.

## The toggle is a gradient border, and this repo has a rule about that

`track(on)` paints a **two-layer background**, not a border colour:

```
linear-gradient(var(--wz-well),var(--wz-well)) padding-box,
var(--faction-default-rainbow) border-box
```

over `border: 1.5px solid transparent`. `WORLD_ZERO_STYLE.md` records why: **a
`border: Npx solid` cannot hold a gradient (ADR-0039)**, and `border-image` does not clip to
`border-radius`, so it is never used here. The padding-box/border-box pair is the sanctioned
technique. Off-state swaps the border-box layer to a flat `--color-border-strong`.

## The design demonstrates its own Animations switch

Every `transition` in the file is written `this.state.anim ? '…' : 'none'` — the toggle at
`sec-appearance` really does still the canvas. That is the intended behaviour, and it is *not*
how #2154 implements it: the issue rules a single `[data-motion="off"]` CSS kill switch on
`document.documentElement`, not a prop threaded through every style object.

## Copy in this file is design copy

Real strings for the Appearance rows ("Use the dark palette across every page.", "Transitions,
card hovers, and the level-up celebration. Turn this off to keep the interface still."), but they
still go through `frontend/src/locales/en/common.json` under `settings.*` like any other copy —
never inline. Some `settings.*` keys already exist; reuse rather than duplicate.

`UNAFFILIATED · WZ_PILGRIM` in the header is a **sample value**, not a literal.

## One thing the design shows that the app must decide

The header eyebrow reads the viewer's faction and character name. Settings is deliberately **not**
a faction-dispatched surface — it is absent from `SURFACE_KEYS` and the design draws only
`--faction-default-*`. Do not add it to the manifest. An eyebrow naming the player's faction is
data, not a skin.
