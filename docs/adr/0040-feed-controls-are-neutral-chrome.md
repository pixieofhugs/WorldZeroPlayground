# ADR-0040: Feed controls are neutral chrome; faction skinning stops at the card boundary

**Status:** Accepted
**Date:** 2026-07-16

## Context

This repo's default reflex is per-faction divergence. CLAUDE.md says it outright — *"Each
faction has its own card archetype; don't unify"* — and ADR-0016 makes the surface seam
law: every page dispatches through `ARCHETYPE_BY_SLUG` / `pickVariant`, and #494 (ADR-0035)
added a parallel `MOBILE_ARCHETYPE_BY_SLUG` on the same axis. Seven factions, seven skins,
per surface.

#642 adds a **control surface** to the praxis feed (faction filter, date sort, free-text
search). The praxis feed is a *mixed* feed — #565/#573 settled that each card picks its own
skin from its own item's faction slug, so the page shows every faction's archetype at once
rather than theming the whole page to the viewer's faction. That leaves an unanswered
question the surface seam doesn't cover: **what faction is a filter bar?**

There is no good answer. It can't be the viewer's faction (the feed isn't the viewer's), it
can't be the filtered faction (it exists to change that), and it can't be the page's faction
(a mixed feed has none). The question is malformed — which is the signal that controls sit
on the other side of a boundary the seam never named.

The Tasks page already answered this by construction and nobody wrote it down: `Tasks.tsx`
renders `FilterStamps` / `FilterFactionTabs` / `FilterLevelNodes` as a bare neutral stack
above a grid of faction-skinned `TaskCard`s. The design pass for #642 independently reached
the same shape, calling the control bar "shared neutral chrome (like `PageTitle`)".

Without this written down, the next control added to a faction surface gets "correctly"
faction-skinned to match its page, and the two feeds drift apart.

## Decision

**Faction skinning stops at the card boundary. Controls, filters, and page chrome are shared
neutral components; only the items a feed renders carry faction identity.**

1. **Controls do not dispatch.** A filter, sort, search box, or page header has no
   `ARCHETYPE_BY_SLUG` / `MOBILE_ARCHETYPE_BY_SLUG` entry and no `pickVariant` call. One
   component serves every faction and every viewer. (This is the boundary ADR-0016 implies
   but never states: the seam governs *surfaces that represent a faction's things*, not the
   apparatus for finding them.)

2. **Depicting a faction is not being skinned by one.** A control may render faction colour,
   name, pennant, or sigil as *data* — that is what a faction filter is for. The distinction
   is authorship: `FilterFactionTabs` draws seven pennants from one neutral component; it is
   not seven components. Same for the mobile faction sigil row.

3. **Feeds sharing an axis share the component.** Two feeds filtering by faction use one
   faction-filter component per form factor — desktop `FilterFactionTabs`, mobile
   `FactionSigilRow`. A second idiom for the same axis is a defect, not a skin.

4. **Faction lists come from `getFactions()`, never a literal.** A hardcoded faction array in
   a control is a bug with two heads: it hardcodes hex (forbidden — colour lives in
   `index.css`, ADR-0003), and it defeats the Albescent secrecy filter (ADR-0027/#390), which
   is enforced *server-side* by `GET /factions` omitting Albescent for unrevealed accounts. A
   literal list puts an Albescent pennant in front of every player.

5. **Feed-scoped filtering is not global search.** ADR-0035's mobile drop-list parks
   `search`; `docs/design/mobile/README.md` shows what that entry means — **"Global search
   (moments) | Not built | Parked."** That is a cross-entity search *screen*, parked because
   no backend existed for it. A filter scoped to one feed's own list endpoint is a different
   thing, and #642 commissions the very backend whose absence was the reason for parking.
   ADR-0035 §4 ("mobile surfaces render only real domain fields") still binds: feed search
   ships only once `GET /praxes` really accepts the param.

### Enforcement

- A control that dispatches on faction slug, or hardcodes a faction list/hex, is rejected in
  review.
- A second faction-filter idiom for an existing axis is rejected; extend the shared one.
- Citing ADR-0035's parked `search` against a feed-scoped filter is answered by §5 above.

## Consequences

- #642's desktop build is almost entirely wiring: `FilterStamps` (sort) + `FilterFactionTabs`
  (faction) already exist and are reused verbatim. The only new desktop code is a search
  input.
- Mobile needs a `FactionSigil` dispatcher — the one genuinely new component. All seven
  glyphs already exist but are unreachable, locked inside the avatar variants as inline
  `glyph={(size, color) => …}` callbacks (`components/avatar/*Avatar.tsx`). Extracting them
  behind a `pickVariant` map mirrors `FACTION_AVATARS`.
- `FactionSigilRow` lands in mobile Tasks *and* mobile Praxes by §3 — mobile Tasks' faction
  `ChipRow` is replaced rather than left as a second idiom.
- Restyling the filter row restyles both feeds. That is the point.

## Alternatives considered

- **Per-faction control skins (the seam's default reflex).** Rejected: the "what faction is a
  filter bar?" question has no answer on a mixed feed, and seven filter bars is seven times
  the surface for zero identity gain.
- **Skin the control bar to the viewer's faction.** Rejected: #565/#573 already settled that
  a mixed feed is not themed to the viewer. A viewer-tinted bar over a mixed grid asserts an
  ownership the page doesn't have.
- **Bespoke control bar for Praxes only (as drawn).** The design's bordered bar is nicer than
  the Tasks stack. Rejected as-drawn because it makes Tasks look unfinished and forks the
  idiom by §3. If the box wins, it wins as the shared component and Tasks is retrofitted in
  the same change.
- **Let each feed hardcode its own faction list.** Rejected by §4 — it is how the Albescent
  leak happens.
