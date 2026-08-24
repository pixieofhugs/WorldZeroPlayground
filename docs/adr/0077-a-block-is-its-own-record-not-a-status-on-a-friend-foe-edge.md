# ADR-0077 — A block is its own record, not a status on a friend/foe edge

**Status:** Accepted
**Date:** 2026-08-16

**Supersedes:** **ADR-0009** (blocks are mutual and visible) — in full. ADR-0009
read the problem correctly and answered the wrong two questions; both of its
answers are reversed here.
**Relates to:** ADR-0068 (taunts are a subscription the recipient's foe edge
creates — the one place a block is enforced), CONTEXT.md ("Relationship edge",
"Display status", "Taunt"), #1681 (the bug and the owner ruling), #1905 (this
ADR)

## Context

ADR-0009 asked two good questions about blocking — is it visible, is it
permanent — and answered both. What it never asked is what a block is *attached
to*. It took the carrier as given: `blocked` is a `status` on a directed
friend/foe **edge**, on a row unique per `(from_character_id, to_character_id)`.

That carrier has a consequence nobody wrote down. **A block cannot exist without
an edge, and an edge is something you declared.** To stop dealing with someone,
the site first makes you declare a relationship with them.

The case that breaks is ADR-0009's own motivating example. B is declared a foe
by A. B cannot delete A's edge — it is not B's — so blocking it is the remedy
ADR-0009 names. But B holds no edge *to* A, and `list_relationships` lists
outgoing edges only, so B's view of A's profile offers the friend/foe buttons
and no block. The one player ADR-0009 was written for is the one who cannot act.

There are exactly two ways out. Either the client learns to address the *other*
party's row — which means publishing incoming edges and letting you act on a
declaration you did not write — or the block stops riding on an edge at all.
The first was considered at #1681 and rejected: it preserves the coupling,
hands every relationship read an ownership question, and still leaves a block
impossible between two characters who have never declared anything.

## Decision

**A block is its own record, keyed blocker → blocked, independent of `friend`
and `foe` entirely.** It requires no edge, creates none, and is not readable as
one. Blocking a stranger is the ordinary case, not the missing one.

Five rulings follow. Two of them are the reversals; two are corrections of the
record rather than new ground; one is a migration.

### 1. Symmetric in effect — recorded, not invented

A block silences the pair in **both** directions, whatever either party's edge
says. This is already how the system behaves and has been since ADR-0068 wired
the taunt write path; `taunt_service.load_foe_edges` subtracts blocked
counterparts from *both* subscription sets under the comment *"Blocked wins, in
both directions, whatever the other edge says."*

It is written down here because the new record makes it look like a choice. A
directed record keyed blocker → blocked could plausibly be read as one-way. It
is not: the record is directed in **authorship** — only the blocker can create
or remove it — and symmetric in **effect**.

### 2. Silent to the blocked party — this reverses ADR-0009

The blocked party is told nothing. No label, no state change, no notification.
A simply goes quiet.

ADR-0009 argued visibility on texture: a small, banter-driven game where knowing
you have been blocked is part of the social fabric, and the usual
harassment-de-escalation rationale does not bite at this scale. That argument
should be read at full strength — it is not obviously wrong, and the site is
still small.

Two things overturn it.

The first is that ADR-0009's visibility was **free and is not any more**. Its own
words: *"This falls out naturally: the edge that got blocked is the declarer's
own edge, so it surfaces in their own (outgoing) relationship list."* Under a
separate record there is no shared row to surface. Making a block visible now
means *building* a disclosure — a deliberate read path whose only purpose is to
tell someone they have been blocked. Nobody arguing from "it falls out anyway"
is arguing for that.

The second is what the visible block asks of the player who used it. Blocking is
what you reach for when you want to stop the exchange. A label that announces
the block to the other party turns the last act of disengagement into one more
message sent — and the loudest one available, since it is the only relationship
state either party can impose. The owner's ruling puts it directly: a player
whose reason for being there is to disengage should not have to send one more
message to do it.

**Silence is not concealment.** A block is inferable from absence, and we make
no effort to fabricate cover traffic. The decision is only that the system does
not announce it.

### 3. `RelationshipStatus.blocked` stays as a dormant enum value

It stops being written and stops being read. It is not removed. Dropping a value
from a PostgreSQL enum requires a type swap and a table rewrite, and buys a
tidier enum and nothing else. The dead value is cheaper than the migration that
removes it.

### 4. Existing `status = blocked` rows migrate into the new record, and their edge is deleted

Every blocked edge becomes one block record, `from_character_id` → `to_character_id`.
The edge itself is then deleted, not returned to `active`.

Under the old model that edge was frequently only the block's carrier — the
declaration a player had to make in order to reach the block button. Restoring it
to `active` would resurrect a friend or foe declaration the player made for a
reason that no longer exists, and would leave them declared a rival by an act
they intended as a withdrawal. Where the declaration *was* meant, the player can
make it again; guessing which is which is not something a migration can do, and
the cheaper mistake is to drop it.

### 5. Unblocking is the deletion of the record, and restores nothing else

The action survives — a mis-tap must be undoable — but its meaning narrows.
Unblock deletes the block record and stops there. It does not recreate a
friend/foe edge, and in particular the edges deleted by the migration in ruling 4
do not come back. Only the blocker may unblock, because only the blocker
authored the record.

## What a block prevents — the whole list

The new record enforces exactly what the old status enforced, and nothing more.
There are two enforcement sites, and they are the two that read edge `status`
today:

- **Taunts, from the moment of the block.** The counterpart leaves both taunt
  subscription sets, so no new taunt crosses in either direction. Taunts already
  written stay where they are: the read side never filters, and a block does not
  retract what a rival already said.
- **The friends-and-foes feed sources.** A blocked counterpart stops being a
  related character, which starves the four feed sources built from your
  declarations — a friend's completions, sign-ups and defections, and a foe's
  completions.

**A block outranks an active edge; it does not consume one.** This is what
"independent of `friend` and `foe`" has to mean in effect, and it is the whole
reason both sites must move from reading edge `status` to reading the block
record. Blocking someone you had friended leaves your friend edge alive and
silences it anyway. Unblocking then restores the friendship with no further
action — ADR-0009's reversibility, obtained for free rather than stored as a
state. (This is why ruling 4 is a *migration* rule and not a general one: those
edges were created to carry a block, and a migration cannot tell them apart from
declarations that were meant.)

That is the whole list, and it is written as a list so nobody has to guess at the
edges. A block **does not** hide either party's profile, praxis, stats or
badges; **does not** remove them from the players list, the standings or search;
**does not** prevent voting on your praxis; and **does not** prevent commenting
on it. It also does not close the request-shaped channels: a blocked character
can still invite you to a collab, challenge you to a duel, nudge you and mention
you in a comment, and each still lands in your feed and your queue (ADR-0070).

That last one is the uncomfortable part of this list and it is stated on purpose.
A block is currently a **feed-scope** instrument, not a contact barrier, and
today's confirm copy is more honest about that than the word "block" is. Closing
the request channels is a real proposal and a separate decision, because each
addition costs something specific: hiding profiles fights a public standings
board, and vote suppression collides with an anti-self-voting rule that is
account-scoped (ADR-0041) while a block is per-character. This ADR moves the
block off the edge and changes nothing about its reach; widening the reach should
arrive with its own reasoning and its own record.

## What each side sees

**The blocker** sees their block: a block they created is visible to them and
removable by them, or the record would be unreachable once made.

**The blocked party** sees an ordinary profile with the ordinary friend/foe
controls, because they hold no edge and nothing tells them otherwise. This is
intended, and it is the reason ruling 2 needs a second half: **acting on those
controls must not leak the block.** Declaring a friend or a foe across a block
succeeds exactly as it always did, returns exactly what it always did, and is
silently inert on the blocked side. No new error, no refusal, no distinguishable
response. A write that failed *only* across a block would announce the block more
precisely than a label ever did.

## The shape of the record

The decisions the table has to encode, and why each one:

- **One row per ordered `(blocker, blocked)` pair, unique on that pair.**
  Blocking someone already blocked is idempotent, not an error — the client
  cannot always know, and a duplicate is not a conflict worth surfacing.
- **A self-block is refused.** It is meaningless and every read would have to
  special-case it.
- **The record dies with either character** — configured at creation, not
  retrofitted. This one needs care for a reason that is easy to misread: there is
  no hard character delete on this codebase (`soft_delete_character` bans), and
  the existing edge table carries no `ondelete` at all, so nothing cascades
  today and nothing has ever needed to. That is an argument for getting it right
  now rather than for skipping it — retrofitting a cascade is a migration, and
  the day a hard delete appears is not the day to discover the gap. Both doors
  must be configured: the database-level `ondelete` *and*, if an ORM
  relationship is declared for it, `delete-orphan` alongside `passive_deletes`.
  Either one alone silently leaves rows behind on this codebase, and an orphaned
  block is unreachable state that still filters live queries.
- **The record is era-neutral.** A block is a statement between two people, not
  a fact about a scoring period, and era reset does not clear it (ADR-0042). A
  banned character's blocks survive their ban, in both directions, which is the
  correct outcome and needs no special handling.

## Consequences

**You can block anyone.** The bug closes: no declaration first, no edge, no
prerequisite. Blocking a stranger who has never appeared in your relationship
list is the ordinary path.

**`Blocked` leaves the display status.** The label stops being computed and
stops being emitted. Existing blocked pairs stop seeing it after migration — a
**visible behaviour change**, and the one thing a player might notice and report
as a bug. It is not one.

**The block confirm copy becomes false and must be rewritten.** It currently
promises the opposite of ruling 2 — that the tie *"reads as Blocked to both of
you"* and that *"World Zero does not hide a block"* — which was an accurate
statement of ADR-0009 and is now the clearest surviving statement of a decision
that has been reversed. It is the highest-priority consequence on this list,
because it is the only one a player reads.

**The relationship model gets simpler.** An edge carries a type and nothing else;
`compute_display_status` no longer takes status at all, and the reverse-edge
query in `list_relationships` no longer needs its "include blocked edges" clause,
which existed only to feed that label. The friend/foe system stops carrying a
feature that was never about friendship.

**One long-standing oddity dissolves.** Today a blocked edge cannot be deleted
from the profile at all — the control is replaced by "unblock", so retracting
your own declaration means first undoing the block. With the two decoupled, each
is removable on its own terms.

**Two enforcement sites move to a new lookup**, and a third read path — the
display status — loses a branch. The work is small and mechanical, but it is real
work and it belongs to the build issues under #1681, not to this record.

**Blocking becomes cheap to reach and invisible to contest.** Accepted. The
alternative asks the person disengaging to pay for the other party's certainty.

## Considered and rejected

**Keep the block on the edge and publish incoming edges** so the blocked party
can act on the declaration aimed at them. Rejected at #1681: it is the larger
change dressed as the smaller one. Every relationship read gains an ownership
question ("is this row mine to act on?"), the client gains a second list, and two
characters with no declaration between them still cannot block each other — so
the bug is narrowed rather than closed.

**Keep the block on the edge and auto-create one when you block.** Rejected: it
makes the site declare a friendship or a rivalry on the player's behalf, in the
one moment they have said they want neither. Whichever `type` the system picked
would be a word put in their mouth, and it would show up in their own outgoing
list as something they appear to have said.

**Move the block off the edge but keep it visible** — a separate record, still
labelled to both parties. Rejected on ruling 2's reasoning: the visibility
ADR-0009 got for free would now have to be built on purpose, and the case for
building it is weaker than the case ADR-0009 made for not hiding what was
already showing.

**Make the block symmetric in authorship** — either party may lift it. Rejected:
it is the inverse of the bug being fixed. A block the blocked party can remove is
not a block, and ADR-0009's symmetric unblock only made sense while the two
parties shared one row.
