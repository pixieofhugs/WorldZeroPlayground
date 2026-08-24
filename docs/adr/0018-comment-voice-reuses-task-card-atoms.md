# Each faction's comment voice reuses its task-card atoms at full fidelity

**Status:** Amended by ADR-0026
**Date:** 2026-06-25

ADR-0006 wired the comment system and explicitly deferred each faction's comment *voice*
("vault design work, not specified here"). The design is now delivered (standalone
`Faction Comment Boxes` mocks). This ADR records the voice decisions so the build has a spec;
ADR-0006 still owns the data model, moderation, dispatch, and feed wiring.

Builds on ADR-0002 (content slots invariant, presentation per-faction), ADR-0005 (one
archetype, two modes), ADR-0006 (the comment surface itself), and ADR-0016 (per-faction
surfaces share one data contract).

## Decisions

- **Fidelity bar = the task card, not a reduced "voice-faithful" tier.** A comment renders at
  the same character level as `TaskCardSNIDE` / `TaskCardSingularity` (real ransom collage,
  real terminal chrome, real marginalia). The laziness is *not reinventing* it: each comment
  archetype is the three invariant slots wearing the faction's **already-built** skin —
  `SnideMasthead`, `ephemeristsAtoms`, the WoW `.exe` window tokens
  (`--faction-wow-win-border` / `-title-from` / `-title-to` / `-body-bg` / `-dot` /
  `-notepad-*`), the Singularity scanline/bracket/sprocket bits, the shared `.snide-tape` /
  `.ht-dots` CSS — not new ornaments. New code per faction = comment layout, not decoration.

- **Seven archetypes, including Albescent.** `COMMENT_COMPONENTS` keys
  `ua · everymen · wow · snide · ephemerists · singularity · albescent`, plus `DefaultComment`.
  Albescent is a **full faction** and gets a real comment component — *not* the
  `albescent → ua` alias. No change to `FACTION_ALIASES` is needed: `pickVariant` matches the
  exact slug **before** the alias, so an explicit `COMMENT_COMPONENTS['albescent']` wins for
  comments while Albescent still falls back to UA on surfaces that have no Albescent variant.
  Albescent's voice is **vellum correspondence** — warm-white letterhead (`--al-surface`
  `#faf9f7`), near-black ink (`--al-ink`), Cormorant Garamond, a hairline rule and embossed
  monogram. The quietest card, fitting the neutral/becoming-white faction.

- **UA wears the new orange/gold look here; the rebrand at large is out of scope.**
  **⚠️ SUPERSEDED by [ADR-0026](0026-ua-comment-adopts-the-gilt-salon.md) (2026-07-02).** The
  gilt-salon UA rebrand has since landed globally (PR #361), so `UAComment` now renders the
  gilt salon on `--ua-*` tokens like every other UA surface; the inline hex + "rebrand out of
  scope" clause below is retired. Kept here for the record. — The UA comment archetype uses
  ivory `#f9f2e2`, a gold border (`#c9a23c`, highlight `#ecd089`), orange accent `#c8601a`
  (eyebrow, mentions, button), bronze muted `#b07a3a`, dark-brown text `#2a1a10`, in
  `Marcellus` (labels) + `Playfair Display` italic (name + body). The "University of
  Asthmatics" framing rides along visually. Rolling that name and palette through the rest of
  the UA kit (avatars, cards, heroes) is a **separate follow-up**, not this work. (The stale
  `--faction-ua-card-*` purple tokens in the mock are unused by the box; the box styles inline.)

- **Author-identity slot composes `FactionAvatar`** (ADR-0006). The comment never hand-rolls an
  avatar — it reuses the dispatcher, which already frames per faction and re-themes live on
  defection. The box *chrome* varies per faction; the avatar **surface** (shape included) is
  owned by `FactionAvatar`, kept consistent across comments.

- **The timestamp slot is a per-faction dialect** — ADR-0002 applied to the timestamp:
  *content invariant (when it was posted), presentation per-faction*. A shared helper computes
  the raw delta once; each archetype maps it to its dialect string —
  ua "2 days ago" · wow "3h" · snide "048H AGO" (zero-padded, upper) ·
  ephemerists "the Nth day" · everymen "Shift N" · albescent "Vigil the Nth". Singularity
  renders a plain relative time in terminal type — its mock "T-0420" is design fluff, not a
  countdown, and is **ignored**. The `edited` marker rides the same slot, styled per faction.

- **The composer is single-voice = the current character's faction** (actor-scoped, ADR-0006).
  There is **no "comment as" picker.** The picker in the standalone mock is demo scaffolding to
  preview all seven composer skins on one page; it does not ship.

- **Mentions are plain text now, type-ahead later.** Authors type `@username` literally; the
  backend resolves handles by `username` on create/edit, writes `comment_mention` rows,
  linkifies known mentions at render, and leaves unresolved `@handle` as plain text (ADR-0006).
  A live autocomplete dropdown is **deferred** to issue #229 — mentions fully function
  (resolve · feed-notify · linkify) without it.

- **The slot-invariant test (ADR-0002 / #151) extends to walk `COMMENT_COMPONENTS`** — all seven
  archetypes plus `DefaultComment`, in both `row` and `composer` modes, each asserting the
  author · body · timestamp+edited slots render.

## Status / tracking

- Design settled in the comment-system grilling session. Build tracked in #167.
- Deferred: live `@mention` autocomplete (#229); Albescent promotion across non-comment
  surfaces; the full "University of Asthmatics" / orange UA rebrand beyond comments.
