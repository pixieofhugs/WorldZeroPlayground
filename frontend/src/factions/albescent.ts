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
 * flourish rather than a skin of its own. Everything unlisted still falls
 * through, and that remains the default state, not the exception.
 *
 * It had 22 bespoke components (#232) and a 35-declaration token block. Both are
 * gone. The wrappers went too rather than being thinned to pass-throughs: an
 * undeclared surface already falls through, so a file that adds nothing is worse
 * than no file — it is a place for divergence to creep back in.
 *
 * WHY THE MODULE SURVIVES AT ALL. Albescent stays registered: it is a real
 * faction with members, a roster, an invitation flow and a level-8 unlock. This
 * is the seam where its flourishes land — the animations that reveal the society
 * to someone already looking, which unaffiliated does not have. That work is
 * deliberately not in this issue. Until it exists, the empty manifest is the
 * correct and complete statement of Albescent's appearance.
 *
 * Anything added here must be a flourish LAYERED OVER Default's structure
 * reading `--faction-default-*`. A surface that repaints Albescent in its own
 * colours puts it back in the spectrum and un-hides it.
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

export const ALBESCENT_MANIFEST: FactionManifest = {
  slug: 'albescent',

  /**
   * The single surviving override, and it is a REVEAL surface, not a skin: the
   * `/factions` tile is only ever shown to an account already revealed to the
   * society (ADR-0027, #390). See the component for why removing it would make
   * Albescent MORE conspicuous rather than less — the dispatcher's fallback is
   * UA's costume, not a neutral card (#796).
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
   * MOTION. Note there is no `mobileTaskCard` sibling: the v2 task card is one
   * responsive component (ADR-0056), so this single row covers both form
   * factors.
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
   * decision NOT to claim `comment`: Albescent keeps `DefaultComment`, because
   * the card is sufficiently distinct on its own once the light is on it. So the
   * faction's feed presence is one manifest line and no voice of its own.
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
   * moment, not a host surface Albescent has to hide on. It reads the always-
   * light `--albescent-reveal-*` tokens (the same reveal register as the
   * invitation letter and sigil), never a `--faction-albescent-*` theme, so the
   * society shows its pale face only where it is doing the sealing.
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
   * One responsive component, both widths (ADR-0065 §2): there is no
   * `mobileEditPraxis` surface to register a second row on.
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
}
