# Settled-duel side-by-side reader — vendored for #1084

`Duel Side-by-Side Reader.dc.html` pulled **2026-09-01** from Claude Design project
`ece64568-63f2-43f2-80fb-e491dbe01673` — a **different** project from the synced frontend kit
`11486504-…`, which is why `.design-sync/` does not otherwise carry it.

**Port geometry from this file, not from any issue's prose.** #1084's body and its 2026-08-26
comment both describe a duel rail that no longer exists (see "Corrections" below). Delete this
directory in the issue's last PR.

Read `.design-sync/BRIEF-duel-surfaces.md` first — it carries the mechanics, the copy rules and
the §7 deliverable this canvas answers.

---

## Turn 2 supersedes turn 1, in the same file

The canvas holds **eleven artboards in two generations**. Build the `2*` set.

| id | screen | build? |
|---|---|---|
| `2a` | side view · desktop · settled | **yes** |
| `2b` | side view · (second state) | **yes** |
| `2c` | combined view · desktop · settled · a vote per side | **yes** |
| `2d` | combined view · phone · stacked, collapsible | **yes** |
| `2e` | combined view · resolved · dark cascade · no casters | **yes** |
| `2f` | one column · Albescent duellist, viewer unrevealed | **yes** |
| `1a`–`1e` | turn 1 — one page, both bodies, one vote | **no — superseded, kept as record** |

**Why turn 1 was dropped, in the design's own words:** it *"put both bodies on one duellist's page,
under that duellist's vote. That reads as a page that can't decide whose it is."* The split is the
whole point of turn 2, and it is what *"gives the other eight factions a shape to inherit."*

---

## The shape

**Two views, not one.**

- **The side view** is `DefaultPraxisDetail` almost exactly as it ships — one body, one Proof, one
  Write-up, one vote, all the host's. The rival's entry is a **link, not a column**, so there is
  never a question which entry the vote panel belongs to. The only change is a fourth hairline row
  in the duel panel carrying one link out. **`DuelCard` grows a link; nothing else moves**, and it
  stays an aside at 330px, which it fits.
- **The combined view** is **its own route** — a page for the duel, not a block on a praxis page.
  Both columns are identical in kind: disc, name, sealed mark, sigil, title, date, proof, body,
  vote, link out. Neither is the host's. The page title is the duel.

### Three things the combined view gets right that are easy to get wrong

1. **A vote per side.** Each column carries its own `VoteUI` against its own praxis id, dispatched
   on the **task's** faction, hiding itself on the entry the viewer wrote — an author can never
   vote on their own. So a duellist reading this page sees **one** caster, not two.
2. **Casters stay level.** The vote panels pin to the foot of both columns with `margin-top:auto`,
   so unequal bodies do not stagger them.
3. **`resolved` removes the casters rather than disabling them.** The era has closed, the figures
   are the frozen `*_final_points`, and there is nothing to vote on. The winner takes one spectrum
   rule — no trophy. A **forfeit** reads on the same frame: the forfeiter's column dims, their
   figure becomes an em-dash, and the line is `duelCrossLink.wonByDefault`. A **no-contest** drops
   both figures for `finalNoContest`.

### Phone (2d)

Stacked and collapsible, **one open at a time** — you land on the arrived-from side expanded and
the other as a header; tapping the header collapses one and opens the other, so the two entries are
never half-read at once and the standing stays in view above both. Each collapsed header stays a
full row of information — disc, name, live figure, sigil — so the comparison survives the collapse.
Headers are **44px minimum**; the chevron is the only affordance and the catalog has no word for
"collapse", which this does not need.

### The ground

**One ground — the side you arrived from** (owner ruling 2026-08-27), unchanged by the split. Each
duellist's faction stays on their **sigil**. Drawn here in na; arriving from the other duellist's
page dresses the same frame in their faction with both sigils where they are.

---

## What this needs that does not exist yet

1. **One new string, and only one** — the link from a side view to the combined view. Drawn as
   `duelCrossLink.readBothSides`. **The key name is a proposal and the words are the owner's.**
   Everything else on both views is shipped catalog copy.
2. **A route** for the combined view.
3. **Bodies on the wire.** `get_duel_detail` returns no praxis body by construction, so the
   combined view either fetches both praxes under `can_view_praxis` or the payload grows a body
   field under the same guard.

**Reused verbatim:** `duelCrossLink.label` · `.live` + `standing.*` · `.final` + `finalStanding.*` ·
`.finalNoContest` · `.wonByDefault` · `.readTheirPraxis` · `duelBanner.versus` ·
`detail.vote.heading` and `detail.vote.prompt` for both casters · `detail.taskRef.*` ·
`detail.filed`. The combined view's page title is `duelCrossLink.label` — the same key the side
view's aside panel already heads itself with.

---

## Corrections this design makes, verified against `origin/main` 2026-09-01

Both were checked in the code rather than taken from the design, and both held.

- **The 64px threshold is `AlbescentAvatar`'s `RING_TURNS_AT`, not the sigil's.** `FactionSigil`
  and `AlbescentSigil` carry no size gate and scale to any size. #1084's thread and an earlier
  version of the brief both put it on the sigil; they were wrong. This canvas's largest disc is
  **44px**, so it stays clear of the ring either way — but a future duel surface drawing a disc at
  64+ would light a tell that ships deliberately dormant.
- **`utils/duelScenario.ts` still excludes every WoW task** on the grounds that WoW overrides the
  duel-seal copy — keys #1909 deleted on 2026-08-16. Filed as **#2999**, with the three pinning
  test sites named.

## One landmine the canvas records about itself

`FactionSigil slug="albescent"` renders an **empty span in this document and only in this
document**. The shipped stencil is `/factionMarks/labyrinth.svg`, an absolute `public/` path the
kit does not vendor. In the app it is the real mark at any size. Do not read the blank as a design
decision.

`2f` also records why redaction is cheap here: **§0 forbids naming a faction verbally anywhere in a
duel**, so no duel surface prints `factionName()` — the string `isFactionRedacted()` masks is not on
the page to begin with.

---

## Open questions the design puts to the owner

1. **The new string's words.** Proposed *"Read both sides"*; alternatives offered were *"Read them
   side by side"* and *"Both entries"*.
2. **Which side starts open on phone (2d)** — the side you arrived from, or always the challenger?
   Drawn as arrived-from.
