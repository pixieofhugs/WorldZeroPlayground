# ADR-0035: Mobile is a form-factor axis on the same surface seam, tinted by a theme×treatment cascade, showing only real domain fields

Status: Accepted (2026-07-14)

## Context

World Zero is desktop-first. The #494 foundation added a **form-factor axis** to the
existing per-faction surface seam: `useFormFactor()` reports `mobile` vs `desktop`, `Layout`
picks a shell (desktop grid vs a bottom-tab `MobileLayout`), and page dispatchers select
from a parallel `MOBILE_ARCHETYPE_BY_SLUG` registry with a `Default*` fallback — exactly
mirroring the desktop `ARCHETYPE_BY_SLUG` / `pickVariant` model (ADR-0016).

The Mobile Field Kit designs (vendored in `docs/design/mobile/`) make the visual language
concrete: **one markup layer painted by a token cascade** — `data-theme` (light/dark) sets
neutral surfaces, `data-treatment` (faction slug) overrides accent, headline face, paper and
voice. Two pilot treatments prove the seam across very different identities: **Everymen**
(typewriter / field-report, Special Elite, amber) and **WOW** (scrapbook window-cards,
Caveat, rose, native-light), over a **Default (na)** treatment (Lora, seven-faction rainbow).

The mockups also *draw* several affordances that have no backing in the domain — task
difficulty dots and signup "slots", a numeric vote **average**, a "Follow" action and a
"Following" feed. A build agent copying the mockup verbatim would either invent backend or
resurrect a retired one. This ADR fixes both the mechanism and that failure mode as citable
law.

## Decision

**Mobile is a presentation-only form-factor axis on the same surface seam, tinted by a
theme×treatment token cascade, and every mobile surface renders only real domain fields.**

1. **Form factor is a presentation axis, not a data axis.** Mobile and desktop share every
   `use*` hook, API client, and state contract (`TaskDetailState`, `EditPraxisState`, …)
   verbatim. Mobile adds a component tree only. Zero backend/data change is required to ship
   a mobile skin. (Extends ADR-0016 from faction-axis to faction×form-factor.)

2. **Tinting is a two-attribute cascade.** `data-theme ∈ {light, dark}` supplies neutral
   surface/text/border tokens; `data-treatment = <faction slug>` overrides `--accent`,
   `--headline`, `--cta-*`, paper texture and voice. Every value resolves to a `--faction-*`
   or theme token already in `frontend/src/index.css`; **no colors are invented in a skin.**
   Always-fixed factions (WOW native-light, Albescent light, Singularity dark) scope
   identical light/dark values to their own container — never by mutating global
   `[data-theme]`.

3. **`Default` (na) is mandatory; faction skins are incremental.** Every mobile surface ships
   a `Default*` skin registered under `na`, so every faction renders usably from day one.
   Bespoke faction skins land through the mobile registry over time. Everymen and WOW are the
   first two; the other six defer.

4. **Mobile surfaces render only real domain fields.** A mobile skin may not display a field
   the backend does not expose. Concretely, for the Field Kit designs: **no** task difficulty
   or signup-slot readout (neither exists on `Task`); the praxis score shows `{base} +
   {votePoints}` (ADR-0014), **never** a 1–5 average (retired, #264) and **not** the voter
   count (#375); **no** follow/following (relationships are friend/foe, #459). New display
   data is added to the surface's contract for all form factors — never faked in one skin.

### Enforcement

- A mobile skin that introduces a field with no hook/contract backing is rejected; the field
  goes into the shared contract first (per ADR-0016) or it isn't shown.
- The vendored mockups are intent, not spec: `docs/design/mobile/README.md` carries the
  concept-vs-literal correction table; build issues cite it.
- Reviews reject a skin that hardcodes hex instead of `--faction-*`/theme tokens, or mutates
  global `[data-theme]` for an always-fixed faction.

## Consequences

- Adding a mobile faction skin is a presentation task (skin + arrangement over the shared
  contract), testable as "mobile viewport → mobile skin; desktop → desktop archetype; skin
  renders the contract slots."
- The mobile drop-list (difficulty, slots, average, follow, search) is settled once, in one
  place, rather than re-litigated per screen issue.
- #495 is the single mobile design-language issue (all 8 board sections); #496–500 and the
  per-surface follow-ups consume it.

## Alternatives considered

- **Responsive squeeze of the desktop skins.** Rejected by #494 — ~2,900 inline desktop
  pixel layouts can't carry media queries, and a phone wants distinct screens, not a shrunk
  desktop.
- **Copy the mockups verbatim (difficulty/slots/average/follow).** Rejected: it invents
  backend or resurrects the retired vote average; the surface would show data the app can't
  produce.
- **Per-skin data access on mobile.** Rejected for the same reason as ADR-0016 on desktop —
  a surface must mean one thing regardless of faction or form factor.
