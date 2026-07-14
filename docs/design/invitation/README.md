# Faction invitation-letter pop-up — design reference (vendored)

Vendored from the "World Zero Design System" project (`019e221c-7853-7530-a934-7d3b2b7c8b43`)
for issue #243, because DesignSync is not reachable from build agents.

**The pop-up's UX is the faction Join Screen "prospectus"** (confirmed by the product owner:
"the join screen is the ux for the pop up"). When a character *earns* faction X's invitation
letter, we surface a modal styled like X's recruitment prospectus, inviting them to join.

Files here:
- `join-contract.json` — the canonical, faction-agnostic recruitment shape (read first).
- `ua-join-screen-reference.html` — one fully-worked skin (UA gilt prospectus) showing the
  layout: masthead (sigil + faction name + "a prospectus" line), kicker overline, big headline,
  1–2 sentence pitch, a "terms of matriculation" slip (label/value grid), a perks list, and the
  join CTA. Use this as the structural template.

## What the popup contains (join-contract `recruit`)
Per faction, all in-voice creative copy:
- `kicker` — small overline ("the salon is enrolling")
- `headline` — the call to enlist ("Take up the brush")
- `pitch` — 1–2 sentences of why
- `terms[]` — {label, value} facts, shown as a ledger/slip
- `perks[]` — short bullets of membership benefits
- `cta` — {join, joined} button labels

UA and WOW copy are given verbatim (join-contract example = WOW; UA reference file = UA).
The other five factions' copy is authored fresh in-voice as starter text in `factions.json`
(the i18n catalog makes it writer-editable — refine later); each faction's real join-screen
copy can be ported verbatim in a follow-up.

## Per-faction costume
Do NOT hand-draw 7 bespoke chromes for v1. Render ONE adaptive prospectus that pulls the
joining faction's existing `--faction-<slug>-*` tokens + `FactionSigil` (both already in the
repo, as used by the profile skins #460 / feed frames), so each faction's letter reads in its
own colours/voice. Bespoke per-faction frame treatments (gilt bevels, ransom cut-letters,
terminal glyphs, etc.) = an explicit follow-up, same as the profile-skin epic (#459 default →
#460 per-faction).
