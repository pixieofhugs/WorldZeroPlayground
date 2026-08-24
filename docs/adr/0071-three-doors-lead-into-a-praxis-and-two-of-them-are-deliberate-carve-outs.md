# ADR-0071 — Three doors lead into a praxis, and two of them are deliberate carve-outs

**Status:** Accepted
**Date:** 2026-08-01

**Relates to:** ADR-0008 (sign-up eligibility is one game-logic predicate),
ADR-0051 (duel acceptance bypasses the task-level gate), ADR-0029
(`faction_permits` is the single faction-rules seam), #292 (one named home for
the task-level gate), #1511 (the collab bypasses become era fields), #1513 (this
ADR). Supersedes nothing — ADR-0008 and ADR-0051 both stand.

## Context

`CONTEXT.md` states the governing invariant of **Sign-up eligibility** as being
true "iff `create_praxis` would accept". That sentence describes a world with one
door into a praxis. There are three, and two of them deliberately bypass gates
the first one enforces:

| Door | `task.level_required` | Faction | Task bank |
|---|---|---|---|
| `create_praxis` (sign up) | enforced | enforced | enforced |
| `invite_to_praxis` (collab) | bypassed | bypassed | enforced on accept |
| `respond_to_duel_challenge` (duel accept) | bypassed, for a flat `era.duel_level_required` floor | bypassed | enforced |

Each door was reasoned about separately and correctly. Nothing wrote down that
they form a family. The duel carve-out has ADR-0051 and an intent comment beside
the check; the collab carve-out had neither — it was enforced by *absence*, a
rule nothing can grep and no test can defend. So it reads as a bug to whoever
finds it next, and the invariant above actively invites them to close it.

#1511 replaced that absence with three era fields
(`collab_invite_bypasses_level` / `_faction` / `_task_bank`) and pinned the
behaviour with `backend/tests/integration/test_collab_invite_bypass.py`. This ADR
records why they are set the way they are.

## Decision

**The collab-invite bypass is intended and stays** (owner ruling, 2026-08-01).
It is an Easter egg encouraging collaboration across factions and character
levels: a character who could never claim a task alone can be carried into it by
someone who can, and can submit. Whether you could have claimed a task yourself
and whether you may join someone else's praxis on it are different questions.

Which gates the door lifts is era-owned, not hardcoded — the three
`collab_invite_bypasses_*` fields on `EraConfig`. Era 1 sets them
`(True, True, False)`: level and faction lifted, the task bank still charged, on
the accept rather than the invite (values live in `backend/eras/era_1.py`).

**The faction flag has no teeth today.** Setting `collab_invite_bypasses_faction`
to `False` routes the invitee through `faction_permits`, which returns `True`
unconditionally — there is currently no active faction gate anywhere (ADR-0029).
The flag is wired so that a future faction rule reaches this door for free, not
because turning it off refuses anything now.

**The boundary — what no era flag lifts:**

- the invitee must not already hold an active membership on that task (one live
  praxis per character per task; a data-integrity rule, not an eligibility one);
- a submitted praxis cannot be joined;
- only members of the collab may invite (ADR-0013 — a collab is co-owned);
- no self-invites.

**Duels are out of scope and stay exactly as they are** (owner ruling). ADR-0051
governs that door; this ADR only names it so the family is visible in one place.

## Consequences

- The invariant in `CONTEXT.md` is about the **sign-up** door specifically.
  Reading it as a claim about every route into a praxis is what makes the collab
  bypass look like a defect.
- A "let's consolidate the eligibility gates" pass now has an ADR to amend
  before it can close either carve-out — the same protection ADR-0051 already
  gave duel acceptance.
- **The economy is not at risk.** Cross-faction collab is a designed-for case,
  not an escape hatch: scoring already routes it through
  `compute_faction_multiplier(..., COLLABORATION_MODE_COLLAB)`, which has its own
  own-faction/other-faction modifiers. Being carried onto a high-level task of
  another faction is scored by rules that exist for precisely that shape.
- An era that wants a stricter collab door flips a flag rather than editing
  `invite_to_praxis`. Any change to Era 1's tuple should amend this ADR, because
  the tuple *is* the Easter egg.
