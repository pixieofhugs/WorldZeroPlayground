# Design brief — duel surfaces

**Rewritten 2026-09-01.** Every claim below was verified against `origin/main` on that date; the
"verified" notes say where. The previous version of this file was a spec for surfaces that were
then built differently, and it accumulated a correction block that had itself gone stale — it
still described a duel rail that no longer exists and still quoted copy that never shipped. Two
designs were misled by it. It has been replaced rather than annotated again.

**What is being asked for is in §7. Everything before it is context you need to get §7 right.**

---

## The state of play, in one paragraph

**The duel seal dialog is finished.** Nine faction skins ship, the shared anatomy is settled, and
`Duel Seal Architecture.dc.html` (Claude Design project `302eb519-1838-4d03-a0ff-8155b5845313`)
is a live harness of the real components — not a drawing. **Do not redesign it.** The one duel
surface still owed a design is the **settled-duel side-by-side reader** (#1084), and §7 asks for
exactly that.

---

## 0. The one rule

> **Faction identity is visual. It is never verbal.**

Every other World Zero surface gives each faction its own voice — Snide's composer button says
`FILE IT & RUN`, Albescent's says `✦ SEAL & ENTER ✦`, Everymen's says `tack it up →`. **Duel
surfaces do not do this.** All duel copy is faction-neutral and identical across all nine skins.

This is a deliberate ruling. Duel rules are asymmetric, permanent, and easy to misread; a player
learning them through nine different metaphors learns them nine times, badly. The stakes need one
vocabulary.

**This rule now holds without exception.** WOW briefly shipped its own duel voice through
`duelSeal.wow.*`; **#1909 deleted those keys on 2026-08-16**. Verified: `praxis.json` carries
exactly six `duelSeal` keys and none is faction-scoped, and `components/duel/wowLists.tsx` — which
used to hold the resolver — now exports only CSS variables, its own header recording that it was
*"the seal's voice resolver"* **until #1909**. The old brief called this rule "broken"; it is not.

Express faction-ness entirely through **chrome** — frame, palette, type, texture, ornament,
layout rhythm. If your mock needs a word that isn't in §4, you are designing a component that
should not exist.

**Boundary:** this covers strings that appear only in a duel context. The composer's own publish
button keeps its per-faction voice — it is not duel-specific.

---

## 1. What a duel is

Two characters, one task, **two separate entries**. Each writes their own praxis with their own
body, own photos, own votes. They are joined by a link that records the pairing and who is ahead.

A duel is **not** a shared document. Never design anything implying the two duelists write in the
same place, see each other's work-in-progress, or share a gallery. Until both have submitted,
neither can read the other's entry at all — `_duel_side_hidden_condition` (#999) enforces it.

Governing decisions: ADR-0011 (a duel is two linked praxes), ADR-0051 (acceptance bypasses the
task-level gate), ADR-0052 (duels resolve at era close).

---

## 2. The five states

Verified against `backend/models/duel.py` — `DuelStatus` is
`pending | active | settled | declined | resolved`.

| State | What's true | Can I back out? |
|---|---|---|
| **pending** | Challenge sent, opponent hasn't answered. Only your entry exists. | **Yes, freely.** |
| **active** | Opponent accepted. One or both of you may have submitted. | **Yes, freely.** No penalty. |
| **settled** | **Both** have submitted. Voting is open. | **No — backing out now forfeits.** |
| **declined** | Opponent said no. There is no duel. | n/a |
| **resolved** | Era closed. The pair is frozen permanently. | n/a |

### Four errors to avoid

1. **Submitting is not the point of no return.** In `active` you can unsubmit and edit freely,
   as often as you like, with no penalty. The trapdoor closes when your **opponent** submits — an
   event you do not control and cannot predict. The confirm dialog says this honestly.

2. **`settled` does not mean decided.** It means voting just **opened**. The winner floats with
   the votes until the era resets, weeks later. No victory screen, no trophy, no final score, no
   "X won" state — until `resolved`.

3. **`resolved` is the only frozen state.** At era close the pair freezes and every unresolved
   duel becomes a permanent result. This is the one place a final figure is honest.

4. **Declined isn't a loss.** Your entry quietly becomes an ordinary solo praxis and scores at
   normal rates. Not a forfeit, not a penalty, not a defeat. Design it as a shrug, not a wound.

---

## 3. The surfaces that exist today

**Verified by listing `frontend/src/components/duel/` and `git ls-tree` over `origin/main`.**

### A. The seal dialog — **finished, do not redesign**

`components/duel/DuelSealConfirm.tsx` plus a skin per faction, dispatched on the **task's**
faction through `resolveVariant(surfaceMap('duelSeal'), taskFactionSlug)`. Nine registrations:
`albescent`, `coven`, `default`/na, `ephemerists`, `everymen`, `singularity`, `snide`, `ua`, `wow`.

- **One responsive component.** `DuelSealSheet` owns the only form-factor branch — phone is a
  full-screen sheet at the document root, desktop a 460px-max panel over a radial scrim (#1313).
  A skin passes ground, card, scrim and children; never its own layout or breakpoint.
- **Three shared slots**, from `components/duel/shared.tsx`: `StakesTiles`, `RaceRoster`,
  `SealActions`. Order is heading → opponent line → tiles → roster → actions.
- **`pending` draws no tiles** — `StakesTiles` prints the single `duelStakes.soloFallback`
  sentence instead, so a pending mock drawing a win/lose pair is unbuildable.
- **Albescent is a deliberate pass-through.** `AlbescentDuelSealConfirm` renders
  `DefaultDuelSealConfirm` byte-identically and #726 is closed **wontfix**. Its header gives two
  reasons and both still hold: the dialog is skinned by the **task's** faction, so this row is
  reached by a **non-member** looking at an Albescent-owned task, where a tell is an *un-hiding*
  rather than a reveal (ADR-0027); and forfeit mode is the one duel moment that cannot be undone,
  where a tell buys identity and spends legibility. **Dressing it is a reversal, not a gap — it
  needs an owner ruling and #726 reopened, not a mock.**

### B. The praxis-detail duel card

`pages/praxisDetail/DuelCard.tsx`. **Not** a dispatched duel surface: one card mounted by the
praxis-detail archetype, which dresses it through three seams (`style`, `heading`, `ink`).

It draws **only `settled` and `resolved`** — outcomes. `declined`, `pending` and `active` draw
nothing here. It may never carry the opponent's faction hue as an ink or a ground; only as an edge
or a ring (`DuelCardInk`, guarded by `praxisDetail/__tests__/duelCardOpponentInk.test.tsx`).

### C. The run-up

`pages/editPraxis/waiting/PraxisWaitingSurface.tsx` narrates waiting for the opponent. That beat
belongs to the composer now, not to detail (#1071, ADR-0059).

### D. The rail — **gone. Do not design for it.**

`DuelRail` was retired by #1090 and the run-up moved to the composer by #1071. **Verified: zero
files matching `*DuelRail` exist on `origin/main`,** and `NextStepLine` and `SubmitActions` are
gone with it — the only surviving trace is one prose line in `shared.tsx` explaining why.

Anything you read that references "the twelve `*DuelRail` files", "the rail dress", or a
`NextStepLine` slot is stale. **This includes #1084's own body and its 2026-08-26 comment.**

---

## 4. The copy

**Read the catalog, never this file, and never a mock.** All duel strings live in
`frontend/src/locales/en/praxis.json` under `duelSeal`, `duelStakes`, `duelRoster`, `duelForfeit`,
`duelBanner` and `duelCrossLink`. A skin mounts shared slots and calls typed `t()` keys, so a
mock's words cannot reach the screen either way.

The full shipped set, verified 2026-09-01 — reproduced so you can see the register, not so you can
transcribe it:

```
duelSeal.heading       Lock the duel?
duelSeal.confirm       Lock it
duelSeal.cancel        Not yet
duelSeal.bodyActive    {{name}} has accepted. Casting now locks the duel — once you have
                       both cast, pulling back is a permanent forfeit.
duelSeal.bodyPending   {{name}} hasn't accepted yet. You can cast now; if they decline,
                       this scores as an ordinary praxis.
duelSeal.reopenNote    Until {{name}} casts, you can still pull this back for free — no forfeit.

duelStakes.heading     What's at stake
duelStakes.winLabel    If you win
duelStakes.loseLabel   If you lose
duelStakes.tieLine     A tie pays {{points}}.
duelStakes.beforeVotes Base points, before crowd votes — stars add on top.
duelStakes.soloFallback  Nothing is at stake yet. If {{name}} declines, this scores as an
                         ordinary praxis worth {{points}}.

duelRoster.you         You
duelRoster.sealed      submitted ✓
duelRoster.walking     still walking…

duelForfeit.confirmPrompt  Pulling back now FORFEITS the duel.
duelForfeit.cost           {{name}} wins by default and you keep {{points}} instead of {{win}}.
duelForfeit.action         Forfeit
```

**If §7's surface needs a string that is not here, say so and ask.** Do not invent one — the
previous brief invented a whole vocabulary and none of it shipped.

---

## 5. The numbers

**Every figure in your mock is computed live. Never hardcode a ratio.**

Verified against `backend/eras/era_1.py`. Each faction row carries its own `duel_win_modifier` and
`duel_loss_modifier`:

| Faction | Win | Lose |
|---|---|---|
| Eight of the nine rows | 1.5× | 0.5× |
| **Snide** | **2.0×** | **0.0×** |

**A Snide duelist who loses gets nothing.** Their lose tile shows `+0`. Intended drama, not a bug —
so a Snide mock has to make a zero look *deliberate*. A `+0` that reads as an empty state or a
loading skeleton is a failure; it should read as a threat.

The shipped `StakesTiles` already knows: at `lose === 0` the figure switches from the muted ink to
the skin's notice colour while keeping the win tile's size and typesetting. **The failure mode is a
skin that softens it** — greying the tile, shrinking the numeral, dropping the border, or letting
the label do the work. Keep the pair symmetrical and let the notice colour carry the threat.

**Snide also wins ties** against any non-Snide opponent (#748, `sole_tie_taker_id` →
`duel_outcome.py`). It is a faction ability resolved server-side, not a display rule.

Figures shown are **base points before crowd votes** — the vote total does not exist at submit
time. The footnote saying so is not optional; without it the numbers are a lie.

---

## 6. Hard nos

- **No victory screen** before `resolved`. Nothing is decided while voting is open.
- **No two-pane workspace** that re-renders the title, body and media the detail page already owns.
- **No opponent picker.** Built and shipped. Out of scope.
- **No per-faction strings.** See §0.
- **No fixed-pixel grids on mobile.** Mobile stacks single-column.
- **No invented copy.** If §4 does not have the string, ask.
- **No redesign of the seal dialog.** See §3A.
- **No Albescent dress** on any duel surface without an owner ruling first. See §3A.

---

## 7. What is actually being asked for

**One surface: the settled-duel side-by-side reader — issue #1084.**

Today, reading a duel means two page loads: each side is its own praxis with its own detail page,
cross-linked by `DuelCrossLink`. This design draws **both entries in one frame** — title, body and
vote standing per side.

### The file we need

`Unaffiliated Duel Flow.dc.html`, `stage="sealed"` — stage 3 of the duel flow design. **It is not
vendored and cannot be fetched.** It lives in an ordinary Claude Design project, and `DesignSync`'s
`list_projects` enumerates only design-*system* projects, so there is no `projectId` to read it
with. This is not an authorization problem — authorization works.

**To unblock it, send that canvas over** ("Send to Claude Code Web"), or export it into
`.design-sync/duel-1084/` the way `Settings.dc.html` was vendored. A share link carrying the
project's UUID also works — `get_project`/`get_file` accept an explicit id even when
`list_projects` will not list it.

### The ruling that already constrains it

**Owner ruling, 2026-08-27 — one ground, two sigils. Rendered before asking; ruled on pixels.**

The side-by-side view takes the ground of **the praxis whose page hosts it** — one faction dress
for the whole frame. Each duellist's own faction is carried by their `FactionSigil`, so the two
players still read as two factions.

The open question the issue records — *"does this inherit the rail dress or ship neutral?"* — is
**moot twice over**: there is no rail (§3D), and this ruling settled the ground anyway. Do not
re-open it.

### What the design must carry

1. **Both entries in one frame** — title, body, and vote standing per side.
2. **A live standing, not a verdict** — unless the duel is `resolved` or forfeited. ADR-0011 /
   ADR-0052: the winner floats with the votes until era close.
3. **One ground, the host's**, with each duellist's faction on their own sigil.
4. **Both form factors.** Mobile stacks single-column; there is no two-column layout anywhere in
   this app's detail pages.
5. **Both themes**, via the `[data-theme="dark"]` cascade. No hardcoded hex.

### Two hazards to design around

- **An Albescent duellist is a disclosure.** A sigil is as identifying as a faction name, so it
  must route through the same redaction path (ADR-0088). Show in the mock what a redacted side
  looks like.
- **The 64px gate is the AVATAR's, not the sigil's.** Corrected 2026-09-01 — an earlier version of
  this brief and #1084's thread both put it on the sigil. Verified: `FactionSigil` and
  `AlbescentSigil` carry **no size gate at all** and scale to any size; `RING_TURNS_AT = 64` lives
  in `components/avatar/AlbescentAvatar.tsx`, where the turning ring is *absent* below 64 rather
  than stilled. The gate ships **dormant** by owner ruling (2026-08-23) — deliberately above every
  mount in the app, the largest being the roster lead card at 54.

  **This matters for any duel surface that draws a large disc.** `AlbescentAvatar`'s own header
  names *"a duel banner"* as one of the surfaces that would light the ring the moment a mount
  passes 64 — and lighting it announces membership to a viewer who was only reading. If your
  design puts a duellist's disc at 64 or above, say so explicitly; it is a reveal decision, not a
  sizing one. (`Duel Side-by-Side Reader.dc.html` tops out at 44px and is clear of it.)

### Constraints the build inherits — design around them, do not solve them

- `get_duel_detail` (`backend/services/duel.py`) returns name, avatar, faction,
  `points_from_votes` and `is_submitted` per side, and **deliberately never a praxis body.** A
  side-by-side reader needs bodies, so the build either fetches both praxes under `can_view_praxis`
  or grows a body field under the same guard. Either way the payload changes — do not design a
  layout that assumes a field that does not exist yet without flagging it.
- **Settled and resolved only.** `_duel_side_hidden_condition` (#999) keeps a live-incomplete side
  author-only.
- **Reuse `components/duel/shared.tsx`.** `StakesTiles` and `RaceRoster` already exist and are
  already themed per faction. Do not re-derive them.

### Deliverable

Four artboards: **desktop settled, desktop resolved, phone settled, phone resolved** — plus the
redacted-Albescent variant of whichever one shows it best. Built from the kit's tokens per
`conventions.md`: no invented colours, no hardcoded hex, dark mode through the cascade.
