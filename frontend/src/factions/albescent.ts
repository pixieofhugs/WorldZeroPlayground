/**
 * albescent — the faction that overrides nothing (#783).
 *
 * Every other manifest in this directory lists the surfaces its faction dresses
 * up. Albescent's started empty, and that was the whole design: it is a secret
 * society hiding in plain sight, so it must be indistinguishable from an
 * unaffiliated player on every surface. The manifest is override-only, so
 * declaring nothing hands Albescent the `Default*` archetype everywhere —
 * including on surfaces that do not exist yet, which is the property a
 * hand-maintained list of "Albescent renders Default here" wrappers could never
 * keep. ADR-0048 then made "frozen" mean "frozen UNTIL DESIGNED": the few rows
 * below are surfaces whose design has landed, and each is `Default` PLUS a
 * flourish rather than a skin of its own.
 *
 * NOTHING IS UNLISTED ANY MORE, AND THAT SENTENCE USED TO END DIFFERENTLY. It
 * said everything unlisted still falls through, "and that remains the default
 * state, not the exception". #2531 ended it: the last four keys — `backdrop`,
 * `comment`, `createCharacter`, `duelSeal` — are registered, so this file names
 * every surface in `SURFACE_KEYS` and `surfaceDispatch.test.ts` holds it there.
 * The property that paragraph was defending is NOT lost, because the price of
 * losing it is now paid by CI rather than by a reader: a NEW surface still costs
 * one row here, and the guard says so the day the key is added instead of weeks
 * later, visually. What the audit found was the cost of the other half — a
 * silent row reads as "na draws no mark here" and as "nobody got to it" at the
 * same time, and four of them were being read wrong. Three of the four ARE
 * pass-throughs; they say so now.
 *
 * It had 22 bespoke components (#232) and a 35-declaration token block. Both are
 * gone. The wrappers went with them rather than being thinned to pass-throughs,
 * on the ground that an undeclared surface already falls through, so a file that
 * adds nothing is worse than no file — a place for divergence to creep back in.
 *
 * THREE PASS-THROUGHS EXIST NOW ANYWAY (#2531), and the sentence above is what
 * they revise. The divergence half of it stands and is now enforced rather than
 * trusted: a pass-through's acceptance test is that its markup is BYTE-IDENTICAL
 * to the Default's (`src/__tests__/albescentWrapperKinds.test.tsx`), so it cannot
 * quietly grow a dress. What it got wrong is the cost of saying nothing — an
 * absent row reads as "na draws no mark here to re-cut" and as "nobody got to
 * it" at the same time, and the 2026-08-23 audit found four being read the wrong
 * way. A file that renders the Default and says WHY in its docblock is not a
 * file that adds nothing.
 *
 * WHY THE MODULE SURVIVES AT ALL. Albescent stays registered: it is a real
 * faction with members, a roster, an invitation flow and a level-8 unlock. This
 * is the seam where its flourishes land — the animations that reveal the society
 * to someone already looking, which unaffiliated does not have. That work is
 * deliberately not in this issue. Until it exists, the empty manifest is the
 * correct and complete statement of Albescent's appearance.
 *
 * Anything added here must read `--faction-default-*`. A surface that repaints
 * Albescent in its own colours puts it back in the spectrum and un-hides it, and
 * that is the edge — livery, not novelty. Every row below but one is also a
 * flourish LAYERED OVER Default's structure, which is the usual way of staying
 * on the safe side of it. `sigil` (#2529) is the exception and stays inside the
 * rule: the labyrinth is a shape of its own, painted with na's spectrum and
 * nothing else. It is registered rather than special-cased in its dispatcher
 * because a mark reached outside `surfaceMap()` is a mark a refactor of that
 * surface drops — which already happened once.
 */
import type { FactionManifest } from './manifest'
import { lazyArchetype } from './lazyArchetype'

const AlbescentSelectCard = lazyArchetype(() => import('../components/selectCard/AlbescentSelectCard'))
const AlbescentTaskCard = lazyArchetype(() => import('../components/taskCard/AlbescentTaskCard'))
const AlbescentVote = lazyArchetype(() => import('../components/vote/AlbescentVote'))
const AlbescentPraxisCard = lazyArchetype(() => import('../components/praxisCard/desktop/AlbescentPraxisCard'))
// #2501 — the score stamp. Lazy like every wrapper here: it pulls in the whole
// na stamp, which is weight the initial load does not need.
const AlbescentScoreStamp = lazyArchetype(() => import('../components/praxisCard/scoreStamp/AlbescentScoreStamp'))
const AlbescentSeal = lazyArchetype(() => import('../components/metataskSeal/skins/AlbescentSeal'))
// #1038 — the task-detail unfreeze. Lazy like its siblings (#1063): a wrapper
// that pulls in the whole na anatomy is exactly the weight route-splitting exists
// to keep off the initial load.
const AlbescentTaskDetail = lazyArchetype(() => import('../pages/taskDetail/archetypes/AlbescentTaskDetail'))
// #1140 — the praxis-detail unfreeze, lazy for the same reason as its sibling.
const AlbescentPraxisDetail = lazyArchetype(() => import('../pages/praxisDetail/archetypes/AlbescentPraxisDetail'))
// #1203 — the feed-card unfreeze. Lazy like every wrapper above: it pulls in the
// na chassis, which is exactly the weight route-splitting keeps off first load.
const AlbescentFeedFrame = lazyArchetype(() => import('../components/feed/AlbescentFeedFrame'))
// #1630 — the profile unfreeze, lazy for the same reason as every wrapper above.
const AlbescentProfileBody = lazyArchetype(() => import('../pages/characterProfile/archetypes/AlbescentProfileBody'))
// #2504 — the faction page's two halves, lazy for the reason every wrapper above
// is: each pulls in the whole na surface it dresses.
const AlbescentFactionHero = lazyArchetype(() => import('../components/factionHero/AlbescentFactionHero'))
const AlbescentFactionBody = lazyArchetype(() => import('../pages/factionDetail/archetypes/AlbescentFactionBody'))
// #2505 (epic #2496) — the composer and the phone home. Lazy like every wrapper
// above: each pulls in a whole na page, which is the weight route-splitting
// exists to keep off the initial load.
const AlbescentEditPraxis = lazyArchetype(() => import('../pages/editPraxis/archetypes/AlbescentEditPraxis'))
const AlbescentFieldDesk = lazyArchetype(() => import('../pages/fieldDesk/mobileArchetypes/AlbescentFieldDesk'))
// #2502 — the avatar unfreeze, lazy for the same reason as every wrapper above.
const AlbescentAvatar = lazyArchetype(() => import('../components/avatar/AlbescentAvatar'))
// #2529 — the mark. Named out of the DISPATCHER, exactly as `ua` and
// `singularity` name theirs: the three sigil adapters are defined inside
// `FactionSigil.tsx`, and `lazyArchetype` is what makes reading one from here
// safe (the thunk note in `./manifest.ts`).
const AlbescentSigilAdapter = lazyArchetype(() => import('../components/sigil/FactionSigil').then((m) => ({ default: m.AlbescentSigilAdapter })))
// #2531 — the last four keys in `SURFACE_KEYS`, so the matrix has no holes. Lazy
// like every wrapper above, and for a sharper version of the same reason: three
// of the four render the Default WHOLE, so a static import here would pull a
// page, a thread and a dialog into the entry chunk to add nothing to any of them.
const AlbescentBackdrop = lazyArchetype(() => import('../components/backdrop/AlbescentBackdrop'))
const AlbescentComment = lazyArchetype(() => import('../components/comments/voices/AlbescentComment'))
const AlbescentCreateCharacter = lazyArchetype(() => import('../pages/characterPaths/archetypes/AlbescentCreateCharacter'))
const AlbescentEditCharacter = lazyArchetype(() => import('../pages/characterPaths/archetypes/AlbescentEditCharacter'))
const AlbescentDuelSealConfirm = lazyArchetype(() => import('../components/duel/AlbescentDuelSealConfirm'))
const AlbescentDuelReader = lazyArchetype(() => import('../pages/duelReader/archetypes/AlbescentDuelReader'))
// #2538 — the propose-task chassis's first registration. Lazy like every
// wrapper above: it renders the whole na page, which is weight the initial load
// does not need.
const AlbescentProposeTask = lazyArchetype(() => import('../pages/proposeTask/archetypes/AlbescentProposeTask'))

export const ALBESCENT_MANIFEST: FactionManifest = {
  slug: 'albescent',

  /**
   * The directory tile — a RE-CUTTING wrapper like every other row here (#2632).
   *
   * Three claims stood in this comment and none of them survives. It was "the
   * single surviving override", which the manifest's own 20-of-20 header now
   * answers. It was "only ever shown to an account already revealed", which
   * ADR-0082 ended: the row ships to every caller and the tile redacts instead
   * of hiding. And it was "a REVEAL surface, not a skin", which is what the
   * white vellum register was doing here — that register is deleted and the tile
   * is `DefaultSelectCard` plus a conditional ground and a walking hairline.
   */
  factionSelectCard: () => AlbescentSelectCard,

  /**
   * The praxis-card tell (#821, ADR-0048). These are NOT bespoke skins: each
   * renders the exact spectrum `Default` card an unaffiliated player sees, with
   * a slow rainbow DRIFT washed over it — the flourish that reveals the society
   * to someone already looking. A repaint in Albescent's own colours would put
   * it back in the spectrum and un-hide it, so this stays "NA + drift". Every
   * other surface still falls through to Default (#783).
   */
  praxisCard: () => AlbescentPraxisCard,

  /**
   * The score stamp (#2501, epic #2496). Albescent was the only faction with a
   * roster and no `scoreStamp` row, so a member's total showed the bare na stamp
   * while all seven other factions' were dressed — undressed by ACCIDENT, not by
   * the design that keeps this faction hidden.
   *
   * Same shape as every row above: `AlbescentScoreStamp` renders
   * `DefaultScoreStamp` whole and adds one class, and the only delta is MOTION —
   * the two na spectra the stamp already carries (the top band, the points ring's
   * annulus) start to move. No token, no copy, no forked anatomy; strip the class
   * and the two stamps are byte-identical.
   */
  scoreStamp: () => AlbescentScoreStamp,

  /**
   * The task-card tell (#1023, ADR-0048) — the second surface to unfreeze, and
   * the same "NA + drift" shape as the praxis cards above. It renders
   * `DefaultTaskCard` and washes two flourishes over it (a drifting spectrum
   * edge, a breathing aurora), so the design's whole delta from unaffiliated is
   * MOTION. The v2 task card is one responsive component (ADR-0056), so this
   * single row covers both form factors.
   */
  taskCard: () => AlbescentTaskCard,

  /**
   * The task-detail tell (#1038, ADR-0048) — the third surface to unfreeze, and
   * the same "NA + light" shape as the cards above. `AlbescentTaskDetail` is a
   * WRAPPER: it renders `DefaultTaskDetail` whole and washes an aurora, a prism
   * foil and a drifting spectrum edge over it, clipped to the detail component
   * rather than the page. Its one structural delta — the score readout becoming
   * a turning prism ring — goes through `DefaultTaskDetail`'s optional
   * `worthSlot`, so na is untouched and there is no forked copy of the anatomy.
   *
   * Every word of the design's voice is cut (ADR-0057 + ADR-0027): the page
   * speaks the shared neutral `detail.*` copy, because a page that announced
   * itself as Albescent would un-hide the society. No mobile sibling: task
   * detail is one responsive component (ADR-0058), so this row covers both form
   * factors.
   */
  taskDetail: () => AlbescentTaskDetail,

  /**
   * The praxis-detail tell (#1140, epic #1085) — the FOURTH surface to unfreeze
   * and the same "Default + light" shape as the three above.
   * `AlbescentPraxisDetail` is a WRAPPER: it renders the shared
   * `DefaultPraxisDetail` whole and hands three ornament layers — a drifting
   * aurora, a slowly turning prism ring and a spectrum edge that travels — to
   * that component's optional `ornament` slot, so the light is clipped to the
   * sheet rather than painted over the page. It has NO structural delta at all;
   * the score rail stays `ScoreStamp`'s (ADR-0053) and nothing is forked.
   *
   * The registration freeze is what changed here, not the shape: ADR-0046 was
   * reversed for this epic (#1151), so Albescent registers surfaces like any
   * other faction — as `Default` plus a flourish, per ADR-0048.
   *
   * Every word of the design's voice is cut (owner ruling on #1140, ADR-0027):
   * the page speaks the shared neutral `detail.*` copy and there is no
   * `detail.albescent.*` block, because a page announcing itself as Albescent
   * would un-hide the society. ADR-0061 allows a skin DRESS and no copy, so this
   * faction is doubly clear of it: nothing here voices a slot, and nothing may. No mobile sibling — praxis
   * detail is one responsive component (ADR-0063), so this row covers both form
   * factors.
   */
  praxisDetail: () => AlbescentPraxisDetail,

  /**
   * The feed-card tell (#1203, epic #1192, ADR-0048) — the FIFTH surface to
   * unfreeze and the same "Default + light" shape as the four above.
   * `AlbescentFeedFrame` is a WRAPPER: it renders the shared `DefaultFeedFrame`
   * chassis whole, forwarding all four chrome slots (kicker, time, tag and the
   * pre-composed archive node) untouched, and layers two ornament spans over it —
   * a drifting spectrum wash and a travelling hairline. It has NO structural
   * delta: the archive control, the swipe and the six-second undo live in
   * `FeedItemSlot` outside every frame, and nothing here reimplements them.
   *
   * This row exists because the epic settled it as decision 13, which is also the
   * decision not to give Albescent a comment VOICE: it keeps `DefaultComment`,
   * because the card is sufficiently distinct on its own once the light is on
   * it. That ruling stands — the `comment` row below is a PASS-THROUGH which
   * renders `DefaultComment` byte-identically (#2531), so the faction's feed
   * presence is still one dressed frame and no voice of its own. What changed is
   * only that the manifest says so out loud rather than by omission.
   *
   * `era_announcement` never reaches this frame — it is chassis-exempt by type
   * for every faction (epic decision 6), so no exclusion is needed here.
   */
  feedFrame: () => AlbescentFeedFrame,

  /**
   * The profile tell (#1630, ADR-0048) — the SIXTH surface to unfreeze and the
   * same "Default + light" shape as the five above. `AlbescentProfileBody` is a
   * WRAPPER: it renders the whole na profile and hands one inert ornament layer
   * to `DefaultProfileBody`'s `identityOrnament` slot, so the na spectrum band
   * an unaffiliated player wears STATIC drifts here instead. That contrast is
   * the entire delta — no token, no copy, no slot moves, and stripping the class
   * leaves two byte-identical profiles.
   *
   * This is the seam the module docstring above has named from the start
   * ("the animations that reveal the society to someone already looking, which
   * unaffiliated does not have"), and it is the row `FactionProfileBody` used to
   * say would never exist. That comment ruled out a SKIN and was right to: a
   * profile IS where a secret society would give itself away, which is exactly
   * why this row may only add motion. One row covers both form factors — the
   * ornament mounts in each of Default's two branches.
   */
  profileBody: () => AlbescentProfileBody,

  /**
   * The avatar tell (#2502, epic #2496) — the SEVENTH surface to unfreeze and
   * the same "Default + motion" shape as the six above. `AlbescentAvatar` hands
   * `DefaultAvatar` one ornament span through its `ornament` slot and changes
   * nothing else: the disc, the monogram and the `DefaultSigil` corner mark are
   * na's, unaltered, and the badge stays na's on purpose — a labyrinth on every
   * byline would be a very loud un-hiding.
   *
   * THE ONE ROW IN THIS FILE THAT IS CONDITIONAL ON SIZE. The ring turns at 48px
   * and up and is absent at the 24/32px byline steps, because this is the one
   * Albescent surface that renders BESIDE other players' rather than being
   * looked at on its own. The component's docstring carries the reasoning.
   *
   * It also ends an inconsistency rather than only adding a tell: `.user-media`
   * (#2457) made a player tell-bearing or not depending on whether they had
   * uploaded a photograph. The ring is chrome outside the portrait and mounts
   * inside that hook, so both discs now carry exactly the same amount of
   * Albescent.
   */
  avatar: () => AlbescentAvatar,

  /**
   * THE MARK (#2529) — and the one row here that is not a wrapper over an na
   * surface. It is a MIGRATION, not a new surface: the labyrinth has rendered
   * for this slug since Sigil Studies v2, but it reached the screen through a
   * slug spread into the map at `FactionSigil`'s call site, so it was the one
   * dispatched surface `surfaceMap()` could not see. Registering it changes no
   * pixel; it makes the registry the whole answer.
   *
   * WHY IT DOES NOT BREAK THE MODULE'S CONTRACT above. That contract's edge is
   * LIVERY — "a surface that repaints Albescent in its own colours puts it back
   * in the spectrum and un-hides it". The labyrinth carries no hue of its own:
   * it is an alpha stencil under `public/`, painted with
   * `--faction-default-rainbow-conic`, the exact spectrum an unaffiliated player
   * wears. So it is a SHAPE and never a livery, which is the property the owner
   * ruled on when reinstating it and the property this row inherits.
   *
   * IT ADDS NO MOTION, and ADR-0083 §3 is why that has to be said out loud.
   * `alb-moves` is a class each wrapper writes on itself, not something derived
   * from manifest membership, and nothing here wears it — the mark is still
   * "never part of the wrapper" (ADR-0083 §1). One more row in the registry is
   * not one more surface that moves.
   */
  sigil: () => AlbescentSigilAdapter,

  /**
   * The ferrofluid vote widget (#843, the eighth of #821's eight). Same rule as
   * the cards above: it is the neutral spectrum row an unaffiliated player sees,
   * with the blobs slowly morphing between polygon lobe counts — a flourish over
   * Default's structure, not a repaint in Albescent's colours. Without this
   * registration Albescent fell through to `DefaultVote`, which looked
   * plausible enough that the gap went unnoticed. Its tier WORDS stay gone
   * (#783): the widget prints plain numerals via `reframeLabel`.
   */
  /**
   * The FACTION PAGE's two halves (#2504, epic #2496) — the seventh and eighth
   * surfaces to unfreeze, and the same "Default + light" shape as the six above.
   * `/factions/albescent` routes through `AlbescentGate`, which hands a revealed
   * account `<FactionDetail slug="albescent" />`, so these rows are reached by
   * exactly the viewers ADR-0027 allows to see the society at all.
   *
   * Both are WRAPPERS over na surfaces that did not exist a week ago: the page
   * had no fall-through hero at all, so Albescent got the page's placeholder
   * chrome. `DefaultFactionHero` is that gap closed (epic ruling 11), and these
   * two add the prism sheet, the turning labyrinth, the plates' travelling ring
   * and — in dark only, per ruling 9 — the bloom. No copy, no colour, no slot
   * moves; strip the two wrapper classes and the page is na's exactly.
   */
  factionHero: () => AlbescentFactionHero,
  factionBody: () => AlbescentFactionBody,

  vote: () => AlbescentVote,

  /**
   * The seal skin (#930). A seal is a FOREIGN sticker that keeps its ISSUER's
   * voice on someone else's praxis — so an Albescent-issued metatask is a reveal
   * moment, not a host surface Albescent has to hide on. Its stock and inks are
   * the na card's since #2632 — the vellum register it used to read, along with
   * the invitation letter, the select tile and the sealed placeholder, is
   * deleted — so what marks the sealing is the strip that MOVES, never a stock
   * of its own. It stays FLAT rather than taking `.alb-prism`: a sticker on an
   * Albescent host would inherit that host's ground and paint the bloom twice.
   */
  metataskSeal: () => AlbescentSeal,

  /**
   * The composer (#2505, epic #2496) — the SEVENTH surface to unfreeze and the
   * same "Default + light" shape as the six above. `AlbescentEditPraxis` renders
   * `DefaultEditPraxis` whole and hands ONE ornament span to that component's
   * `ornament` slot, so the ring is clipped to the composer sheet rather than
   * painted over the page (#1028). It reverses one line of ADR-0065 §4 —
   * "Albescent registers nothing here" — which was true while the two kits were
   * pixel-identical and stopped being true at #2404.
   *
   * The delta is CHROME ONLY, and that is a measurement, not a preference. The
   * canvas draws a bloom behind the live textarea; on the composited na ground
   * the composer's quiet ink already reads 3.67:1 light / 3.02:1 dark, so any
   * added wash spends a budget that is overdrawn. A composer is where people
   * read their own words while typing — legibility beats the tell, so the tell
   * moved to the sheet's edge, where it owes no ratio.
   *
   * One responsive component, both widths (ADR-0065 §2): this one row covers
   * the phone too.
   */
  editPraxis: () => AlbescentEditPraxis,

  /**
   * The phone home (#2505, epic #2496 ruling 5) — the EIGHTH, and the one that
   * adds no element at all. `AlbescentFieldDesk` renders `DefaultFieldDesk`
   * whole inside one classed div, and `.alb-desk .spectrum-rule` sets the
   * identity band's existing na hairline travelling. The band already carried a
   * static spectrum rule, so the travelling edge REPLACES it; a sibling span
   * would have stood a second spectrum on a band that has one.
   *
   * MOBILE ONLY, BY RULING. The desktop `/field-desk` page dispatches on no
   * faction at all — one unskinned page for nine — and this row does not give it
   * a seam. Desktop follows the same wrapper pattern when it is needed.
   */
  mobileFieldDesk: () => AlbescentFieldDesk,

  /* ─── The last four keys (#2531) ─────────────────────────────────────────
   *
   * The 2026-08-23 audit found four surfaces this manifest did not name, and the
   * problem was never that they rendered wrong — they rendered the Default,
   * which is correct — it was that an ABSENT ROW READS TWO WAYS: na draws no
   * mark there so a wrapper would have nothing to grab, or nobody got to them.
   * Nothing in the tree said which. Owner ruling: fill them, as wrappers, so the
   * matrix has no holes to misread. `surfaceDispatch.test.ts` now counts them.
   *
   * ONE IS A RE-CUT AND THREE ARE PASS-THROUGHS, and each row below says which
   * in its first line. A re-cutting wrapper changes pixels deliberately, where
   * na already draws a mark; a pass-through renders the Default byte-identically
   * and exists so the map stops answering by silence. A pass-through that shifts
   * a pixel is a bug and a re-cut that shifts none did not do its job, so
   * `src/__tests__/albescentWrapperKinds.test.tsx` holds all four to the kind
   * they claim. `strip the class and na is byte-identical` stays the invariant
   * on every one — that is what keeps this dress off unaffiliated players.
   */

  /**
   * PASS-THROUGH. The page ground under an Albescent player's profile, which is
   * the only route that dispatches a backdrop at all (`CharacterProfile` is
   * `useFactionBackdrop`'s one caller). It renders the site's watercolour — the
   * na fallback, unchanged — and the answer is load-bearing rather than lazy:
   * every other faction paints its own ground there, and a secret society whose
   * members' profiles came with one would be visible from across the room
   * (ADR-0027). There is also no mark to re-cut inside someone else's `<svg>`.
   * See the component for why the ornament alternation (#2195) is unaffected.
   */
  backdrop: () => AlbescentBackdrop,

  /**
   * PASS-THROUGH, and the row the issue asked to check hardest. na HAS a comment
   * voice — the spectrum bubble — and it carries two marks that a wrapper cannot
   * reach: the sheet's hairline is `factionFill(slug, 'bar')`, a ramp computed
   * per slug, and a class may not be conditional (`spectrumClasses.test.tsx`
   * names that same hold-out for the rung dots); the other is gradient-clipped
   * @mention TEXT, which the epic's pre-painted-`::before` technique cannot
   * dress at all. Epic #1192 decision 13 had already ruled Albescent keeps
   * `DefaultComment`, and this changes nothing about that — it records it where
   * the next reader looks instead of leaving a hole beside the `feedFrame` row
   * that mentions it.
   */
  comment: () => AlbescentComment,

  /**
   * RE-CUT — the one of the four that changes pixels. na draws a single spectrum
   * mark on this page, the rainbow ring around the live credential card's
   * portrait, and this wrapper sets it TURNING: the mount wears `.spectrum-dial`
   * (#2497's class, which this file predated) and `.alb-moves` is the dresser it
   * was minted for. No markup added, no colour, no copy, no new keyframe — the
   * mark is na's already.
   *
   * THE MOUNT MOVED IN #2992. It was the phone branch's 104px photo well, so the
   * desktop plate carried no na spectrum and this row only reached one width.
   * That branch retired when the na kit went onto the composer chassis, and the
   * credential card sits first in the sheet at both widths — so the ring turns at
   * both now. One row still covers both, because the archetype reads
   * `useFormFactor()` itself.
   *
   * IT REVERSES ONE LINE OF `surfaceDispatch.test.ts`'s createCharacter note —
   * "Molly's ruling is that it gets no archetype anyway". That ruling was about a
   * SKIN, and it still holds: this is a wrapper over the na kit, which is what
   * that note says Albescent renders. That note carries the #2992 correction
   * above as well, so the two say the same thing about which mark is re-cut;
   * they are the only two prose records of it and they move together.
   *
   * The dispatch slug here is the pick in progress, so the ring starts turning
   * as the calling is chosen and stops the moment it is cleared.
   */
  createCharacter: () => AlbescentCreateCharacter,

  /**
   * RE-CUT, and the create row's twin (#2537). na draws the conic spectrum at
   * two mounts on this page — the phone column's photo ring and the desktop
   * portrait ring — and both wear `.spectrum-dial` now, so `.alb-moves` sets
   * both turning. The desktop hero BAND keeps its linear ramp: a band is not a
   * dial (#1127). No markup, no colour, no copy; strip the class and the page is
   * na's byte for byte.
   *
   * The slug here is the EDITED CHARACTER'S, not the viewer's — an Albescent
   * life edits itself in a turning frame, and nobody else's page moves.
   */
  editCharacter: () => AlbescentEditCharacter,

  /**
   * PASS-THROUGH, and the first registration of the propose-task chassis
   * (#2538). na's spectrum is all over that page — the card's gradient frame,
   * the metatask box, the submit pill — and not one of those marks is reachable
   * from here: every one is an INLINE style computed from the slug in
   * `pages/proposeTask/factionSurfaces.ts`, so `.alb-moves` has no
   * `.spectrum-dial` or `.spectrum-rule` to set moving. That is the `comment`
   * row's finding exactly (#2531), on a second surface.
   *
   * The dispatch slug is the TARGET faction — the one the task is proposed FOR
   * — so this row is reached when anyone, member or not, aims a task at
   * Albescent. A tell on a chip a non-member can pick would be an un-hiding
   * rather than a reveal (ADR-0027), which is the `duelSeal` row's second
   * reason as well.
   */
  proposeTask: () => AlbescentProposeTask,

  /**
   * PASS-THROUGH. `DefaultDuelSealConfirm` is not the na SPECTRUM kit — it draws
   * no rainbow anywhere, its one accent being the OPPONENT's flat hue (grilled
   * #310) — so there is no mark to re-cut. Two reasons not to add one: the
   * dialog is skinned by the TASK's faction, so a non-member sees this row on an
   * Albescent-owned task, and its forfeit mode is the one duel beat that cannot
   * be undone, where legibility beats a tell (the trade `editPraxis` above
   * already made). ONE responsive component, both form factors (#1313).
   */
  duelSeal: () => AlbescentDuelSealConfirm,

  /**
   * PASS-THROUGH, and the first registration of the side-by-side duel reader
   * (#1084, ADR-0092). It renders `DefaultDuelReader` and changes nothing.
   *
   * `.design-sync/BRIEF-duel-surfaces.md` §6 forbids an Albescent dress on any
   * duel surface without an owner ruling first, and this surface has none. The
   * `duelSeal` row's reason holds here unchanged: the reader is dressed by the
   * TASK's faction, so this row is reached by anyone reading a duel fought on
   * an Albescent-owned task — a non-member included, where a tell is an
   * un-hiding rather than a reveal (ADR-0027). The one na mark on the page is
   * the sheet's spectrum BAND, and a band keeps its linear ramp (#1127), so
   * `.alb-moves` would have nothing to reach even with a ruling.
   */
  duelReader: () => AlbescentDuelReader,
}
