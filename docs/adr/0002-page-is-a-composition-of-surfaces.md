# A page is a composition of independently-themed surfaces, not one faction block

**Status:** Accepted
**Date:** 2026-06-22

A faction page is not themed as a single block. Each surface independently resolves its
own contextual faction (`SPEC-faction-ui-profile.md §2`): task-scoped surfaces (card,
praxis, page frame, backdrop, vote) theme to the **task's** faction; actor-scoped
surfaces (avatar/badge, the planned comment box) theme to the **acting character's
member** faction. One page can therefore show several factions at once — e.g. a SNIDE
member's comment box reads SNIDE on an Everyman task page.

Consequences for the dispatch architecture:

- **Content slots are invariant; only the archetype (presentation) varies per faction.**
  Every faction's task card renders the same slots (title, description, points, …); they
  may look wildly different but cannot add or drop slots. The invariant is *not* enforced
  by a rigid required-content component — that would kill an archetype's freedom to
  *arrange* its slots, which is the point. It is guarded instead by **one parametrized
  test** that walks the dispatcher map, renders each registered archetype with a fixed
  fixture, and asserts the invariant slots are present. (Follow-up: write that test; it
  scales automatically as factions are added.)
- **A page-level archetype owns only the page's frame and voice** (layout, hero,
  backdrop, section framing, copy). It MUST compose any widget that already has its own
  surface dispatcher (`PraxisCard`, `TaskCard`, `VoteUI`, `Progression`, `FactionAvatar`)
  rather than re-implement it — and must let those composed surfaces resolve their *own*
  contextual faction, which may differ from the page's. A page archetype never
  blanket-themes its children.
