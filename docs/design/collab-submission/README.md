# Collab Submission — Claude Code implementation brief

This package is a **complete spec**, not a per-screen design. It gives you the model,
the state machine, the platform layouts, and a recipe to **infer each faction's skin
and copy from assets already in the repo** — so you can build every composer variant
(mobile + desktop) without a hand-drawn design for each one.

## Package contents
- `README.md` — this brief (source of truth).
- `design-reference.html` — standalone, offline. Four states of the Wow dark-mode
  `edit praxis` composer. Open it to see the target look/behaviour. Wow/dark is the
  worked example; the model is faction-agnostic.

## The feature
Submitting a **collaborative praxis** when more than one player is on it. Today the
`edit praxis` composer lets you pick `collab` mode and invite co-authors, but there is
**no designed flow for what happens at submission** when some co-authors are done and
others aren't. This adds it.

## The model (decided — do not re-litigate)
A collab praxis is **one shared proof** authored by several members, NOT one
submission each.
1. **Everyone casts before it goes live.** Each member seals ("casts") their own part.
   The praxis publishes only when **every** member has cast. No early posting.
2. **Equal, full credit.** On publish, every member banks the **full** `task_point_value`
   (not split).
3. **Private + editable until the last cast.** Not public while anyone is weaving. A
   member who has cast may **pull their part back** (un-cast) to edit, which returns the
   praxis to waiting.

## State machine (drives every skin, every platform)
`members[]` already carries `has_submitted` + `character_display_name`. Derive the gate:
- `cast_count = members.filter(m => m.has_submitted).length`
- `cast_count === 0` → **S1 writing** (nobody cast)
- `0 < cast_count < member_count` → **S2 waiting** (you cast) / **S3 holdout** (others cast, you haven't)
- `cast_count === member_count` → **S4 published**

Transitions:
- **cast(me)**: set my `has_submitted = true`. If that makes `cast_count === member_count`,
  **publish**: award full `task_point_value` to every member, flip status to visible,
  emit the public collab `PraxisCard`, notify all.
- **uncast(me)** ("pull back"): set `has_submitted = false`. Allowed only while not
  published; re-opens my part for editing.

## The ONLY thing that changes in the composer
Everything else in `edit praxis` (task ref, mode selector, title, field notes,
toolbar, autosave, publish plumbing) is **unchanged**. The single block that changes is
the collaborators section — today it renders invited-walker chips + an
"invite another" field. It becomes a **roster with live cast status**:
- header: `<invite label> · {member_count}` + status chip `{cast_count} of {n} cast`
- one row per member: avatar + name (mark the current user) + status pill:
  - **cast** — `has_submitted true`: filled/accent row, solid border, faction-accent glow
  - **weaving** — `has_submitted false`: muted/dashed row, warning tint
- a progress bar `cast_count / member_count`
- keep the "invite another" field, shown only while `cast_count === 0`

Per state, add:
- **S1**: primary submit button reads the faction's "cast my part" wording.
- **S2 (you cast)**: an accent banner "waiting on the others"; your title + body render
  **locked** (read-only, dimmed, lock affordance); primary button flips to the
  outline "pull my part back" wording.
- **S3 (holdout)**: a **warning** banner "the circle's waiting on you"; your part stays
  editable; primary button says the submit-that-goes-live wording.
- **S4 (published)**: success panel + a credit chip listing every member with
  `+{points}`, then the public collab `PraxisCard` (`type:"collab"`, all
  `has_submitted`). One card, all names.

## Land it on BOTH platforms
Same model, same state machine, same copy — only layout differs. Infer the layout from
each composer's existing structure; don't impose a new shell.

### Desktop
- The composer is a windowed/多-region form (see the reference `wow.exe` window). Find
  where invited co-authors currently render and **replace that node in place** with the
  roster block. If the faction's desktop composer has a side rail, the roster + progress
  + primary action may live there; if it's a single column, keep it inline where the
  invite UI is today. Match the existing section rhythm.
- Banners (S2/S3) sit at the top of the form body, full-width of the window.

### Mobile
- Composers are single-column full-screen page skins (the kit ships mobile editpraxis
  skins). The roster block is a **full-width section** in the scroll flow where the
  invite UI sits today.
- Banners are full-width at the top of the scroll region.
- The cast / pull-back action is the composer's **primary publish button** — sticky
  footer on mobile.
- S4 published: full-screen success, then route to the praxis detail / gallery showing
  the collab `PraxisCard`.
- Hit targets ≥ 44px; roster rows comfortably tappable.

## Recipe: infer each faction's skin + copy from assets
Do this per faction instead of waiting for a design:
1. **Find the composer**: `components/editpraxis/<Faction>Composer/` (+ `DefaultEditPraxis`
   for the na/unaffiliated default, `WowEditPraxis` for Wow). These are re-exports of
   `worldzero-frontend`; the real impl is the bundle, but the i18n + tokens below are
   authoritative.
2. **Locate the collaborators node**: search the composer for its invite UI (the
   `editPraxis.<faction>.inviteLabel` string / the invited-members render). That exact
   node is what you upgrade to the roster block.
3. **Word the new strings from the faction's own voice**: read the faction's i18n block
   `editPraxis.<faction>` (keys like `modeLabel`, `mode.collab`, `inviteLabel`,
   `publishIdle`, `autosaveSaved`). Add the new keys following the **same tone and
   naming**. Never hardcode English. Examples of the mapping:
   - Wow: party = "walking together", seal = "cast", points = "sparks",
     success = "the spell is cast!".
   - Default/na: party = "who's on it", seal = "tack up", points = "pts",
     success = "it's all up".
   - Everymen (union broadsheet): "the crew" / "file", Snide (ransom): "the gang" /
     "print it", Ephemerists (codex): "in concord" / "seal & enter", Singularity
     (terminal): nodes / "commit", UA (gilt salon), Albescent (register). Follow each
     one's existing composer diction — it's already in the i18n.
   New keys to add under each `editPraxis.<faction>`:
   `collab.rosterHeader`, `collab.castChip` (`{{cast}} of {{total}}`), `collab.statusCast`,
   `collab.statusWeaving`, `collab.statusYourTurn`, `collab.castBtn`, `collab.castBtnLast`,
   `collab.pullBackBtn`, `collab.waitingBanner`, `collab.holdoutBanner`, `collab.published`.
4. **Style from tokens, never invent**: `--faction-<slug>`, `--faction-<slug>-card-bg`,
   `-card-text`, `-card-accent`, `-border`, `-light`, the faction card font var. Status
   tones: use `--color-success` / `--color-warning` (or the faction accent) for
   cast / holdout. Respect dark mode via the `[data-theme="dark"]` cascade — the
   reference is dark; do not hardcode dark colors.
5. **Reuse, don't rebuild**: the published result is `PraxisCard` (dispatcher — already
   faction-skinned for `type:"collab"` with member count). For notifications, reuse the
   existing collab-invite feed plumbing.

## Data / API
No schema change for the gate — `members[].has_submitted` already exists. Add:
- `POST /praxis/:id/cast` — mark current member cast; server publishes + awards if last.
- `POST /praxis/:id/uncast` — clear current member's cast (409 if already published).
- Publish awards full `task_point_value` to **each** member.

## Notifications
- Member casts while others weave → notify the not-yet-cast members.
- `cast_count === member_count - 1` → the remaining member is the **holdout**; surface
  the warning "you're the last one in" prompt (feed card + on the composer).
- Publish → notify all members it's live.

## Acceptance criteria
- Collab praxis never publishes while any member `has_submitted === false`.
- The final cast publishes and awards full points to every member.
- A cast member can pull back before publish; publish blocks until they re-cast.
- S1–S4 render per the reference on **both** mobile and desktop.
- Only the collaborators block differs from today's composer.
- Every string comes through per-faction i18n; nothing hardcoded.
- Works in light and dark (`[data-theme="dark"]`) for every faction.
