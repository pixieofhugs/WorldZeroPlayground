# ADR-0079 — Submitting a collab is three signals, not one button

**Status:** Accepted
**Date:** 2026-08-15

**Relates to:** ADR-0011 (a duel is two solo praxes),
ADR-0012 (lazy consensus; "an edit means we're not done"),
ADR-0013 (any member may edit), ADR-0059 (submitting holds the composer;
re-entry routes through `pullBack`), ADR-0065 (one composer layout every faction
dresses), ADR-0073 (the room, the freeze, the publish-time discard), #590
(`pullBack`), #1745 (the freeze this retires), #1803 (per-member pull-back, whose
semantics change this dissolves), #1808 (the frozen room's close code, superseded
here), #1812 (the eight faction copy blocks, deleted)

## Amendment

The status this record carried until 2026-08-24 recorded the build: *"Accepted, and
**built**. The shared submission-status vocabulary shipped first (#1812), the state machine
and the retired freeze in #1810, and the composer's three affordances, the first-keystroke
confirm and the rewritten copy in #1811."*

## Context

A collab praxis has one Submit button, and a player uses it to say three
different things: *my part is finished*, *I think we should publish*, and *I'm
happy with this text*. Its effect matches none of them.

`has_submitted` is recorded **per member** but its effect is **global**.
`on_submit` sets `status = pending` on the **first** collab submit, which under
ADR-0073 freezes the whole document read-only. And because `_apply_seal`
publishes the moment everyone has submitted, `pending` is *only ever* the partial
state — the state where somebody has not submitted yet.

**So the document is unwritable precisely and exclusively while at least one
member still owes their part**, while the UI simultaneously tells that member
"Publishes in 3d without your part." They are told to act and denied the only
action that matters. Their sole escape is `pullBack`, which since #1803 destroys
everyone's submission rather than their own.

That is not a copy problem. Reworded, the same button would still mean three
things and still lock the person it is addressed to.

### What the freeze cost, before this record existed

The freeze is ADR-0073's, and it was coherent there: with the document read-only
there is nothing for ADR-0012 to reset. What it did in practice was drop a
co-author's `SYNC_UPDATE` frames server-side while their editor kept accepting
keystrokes. They typed into a void and lost the text on reload.

#1808 fixed that as a **courtesy**, not as a rule change: the freeze now closes
the open sockets with a distinct close code (`_WS_ROOM_FROZEN`, 4001, chosen so
the client does not treat it as a kick and stop redialling), and the composer
reads that code and says so. It was built because players were losing text and
this redesign was several issues away.

This ADR removes the state that code exists to announce. **#1808 is superseded,
not wasted** — it bought the months between the loss and the redesign, and it is
the evidence for why the freeze is being *removed* rather than *fixed*: the
cheapest complete answer to "the room refuses my typing" turned out to be
letting the room accept it.

## Decision

**Three signals, three mechanisms.** A player needs to say all three things.
They stop being one button.

| Signal | Meaning | Effect |
|---|---|---|
| **Done** | "My part is finished." | Social only. Roster badge. Freely reversible. Gates nothing. |
| **Propose** | "I think we're ready to publish." | Opens the publish window and starts the countdown. |
| **Approve** | "I'm happy with this text." | A vote on the live proposal. |

The **proposer implicitly approves.**

### Editing during a live proposal cancels the proposal

Approvals clear, the countdown stops, the praxis is back to drafting. ADR-0012's
"an edit means we're not done" survives **verbatim**; it simply fires on a CRDT
update instead of a discrete save.

**Nobody is ever prevented from writing.** The first keystroke after a proposal
goes live asks for confirmation, so the cancellation is deliberate rather than an
accident — which is the concern ADR-0073 raised against resetting on any CRDT
update and the reason it chose a freeze instead. A confirmation is the cheaper
half of that answer: it costs one dialog, where the freeze cost the holdout their
only move.

### The pending-freeze is retired

#1745's server-side drop of `SYNC_STEP2` / `SYNC_UPDATE` for a non-drafting
praxis exists to make `pending` unwritable. `pending` is writable now, so the
drop goes, and with it #1808's close-on-freeze and its close code.

**The publish half of ADR-0073 survives unchanged**: on publish, flatten to
`body_text` and destroy the stored document, client copy included. That rule is
about tombstones — text a player deleted must not outlive the draft they deleted
it from — and it has nothing to do with consensus. Read ADR-0073 for why a squash
is not that guarantee.

### Silence is consent, unchanged

`era.collab_auto_submit_days` still governs the window. All approve → publish;
the window expiring → publish anyway.

What makes this **fair** now, and did not before: a holdout can always answer the
countdown by typing, and typing cancels the window. It only binds someone who
genuinely did nothing.

### `pullBack` becomes "Withdraw proposal"

A group action any member may take, with the same effect as an edit — for someone
who has read the draft and has no edit to make yet. Per-member pull-back
disappears because per-member submission disappears.

ADR-0059 established that re-entry after submitting is not a raw write but a
deliberate door; this keeps the door and drops the wall it was cut into. It also
**dissolves** #1803's unruled semantics change rather than settling it: there is
no longer a per-member submission for a pull-back to take back some or all of.

### Solo and duel are untouched

One member means `all(has_submitted)` holds on the first submit, so none of
Propose / Approve / countdown ever engages. A duel is two solo praxes (ADR-0011),
so it is the solo case twice.

### Submission-status copy is shared, not faction-skinned

**Owner ruling.** The words for Done / Propose / Approve and every roster state
are **one literal vocabulary across all nine factions.** No faction voice — no
"still walking" for *hasn't approved*.

Workflow state is a mechanical fact a player must read correctly in order to act.
Flavour that changes per faction means nine vocabularies to learn for one
mechanic, and a player who misreads it loses work or publishes early. Faction
identity lives in the caret colour, the card archetype and the chrome — not in
the name of a state you have to act on.

**This is a deliberate exception to ADR-0065**, which the composer otherwise
follows, and it is written down because the next person adding a submission-status
surface will assume the default and skin it.

Shipped as #1812, ahead of the mechanism: the eight `editPraxis.<faction>.collab`
override blocks in `forms.json` were **deleted** rather than rewritten, because
`collabCopy.ts` already falls back to the shared `editPraxis.collab` block and
that shared block is deliberately the voiceless tier. Renaming the actions to
Done / Propose / Approve / Withdraw is therefore an edit to one block, not nine.

## Consequences

- **The state machine grows a state and loses a lock.** `pending` stops meaning
  "frozen" and starts meaning "a proposal is live"; `has_submitted` splits into a
  social flag (Done) and a vote (Approve), with the proposal itself held on the
  praxis. More state, but each piece has exactly one meaning.
- **The room is writable in every state a member can reach.** The two-door
  reasoning ADR-0073 applied to authorization no longer has to be applied to
  writes, because there is no write ban to enforce at connect *and* at
  transition.
- **#1808's close code and the composer's handling of it are removed**, along
  with the reconnect special-case in `roomReconnect.ts`. Sockets still close on
  kick, leave and publish; only the freeze case goes.
- **A live proposal is now cancellable by accident-shaped input**, guarded by one
  confirmation. That confirmation is the whole of the protection, so it is a
  build requirement, not polish.
- **Verification stays where ADR-0073 put it** — server-side, driving two
  `pycrdt` clients at the room, since the proposal lifecycle is a server rule.
- Silence-is-consent can now publish text a member never read. It always could;
  what changed is that they always had a way to stop it.

## Considered and rejected

**Freeze only when everyone has submitted.** Sound on its face, and it would have
kept ADR-0073's freeze intact. Rejected: `_apply_seal` publishes at that instant,
so the frozen window would have zero duration. The freeze had nowhere left to
live.

**Done gates Propose.** Rejected: it hands any member a veto by never marking
Done — the hostage case the countdown exists to prevent. You would immediately
want an override, and the override is Propose.

**Per-member freeze on approving** — your editor locks when *you* approve, others
write on, any edit clears your approval and unlocks you. This makes Approve
strictly meaningful rather than advisory. Rejected as **premature**, not wrong: it
needs per-connection write filtering and a second lock state. Revisit only if
stale approvals prove to bother people.

**Consent must be active** — window expiry lapses the proposal instead of
publishing. Rejected: it hands one absent member a veto over everyone else's
work, which is the failure the timeout was introduced to close.

**Publish only what contributors approved.** The fairest, and the most code: it
needs per-member authorship out of the CRDT, which Yjs can supply via client ids
but nothing records today. File separately if silence-is-consent is observed
publishing half-finished work.

## Open, deliberately

**Does the last "Done" auto-propose?** One button for the common case — "we're
both finished, ship it."

Rejected *for now* because it re-merges two of the three signals just separated,
and an implicit transition is exactly what made the current flow unpredictable.
**The owner asked to try the explicit two-click path first and to be asked again
afterwards**, so this is a question to put back to them once the flow ships — not
a silent default anyone should read as settled. If two clicks prove annoying, the
fix is a "Done and propose" affordance that visibly does two things.
