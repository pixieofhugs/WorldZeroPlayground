/**
 * TEMPORARY migration scaffolding (#782 commit 2 → deleted in commit 5).
 *
 * Through commits 2–4 every archetype is referenced twice: once by the legacy
 * slug-keyed registry that still lives in its surface's module, and once by the
 * faction's manifest. This test asserts the two sources agree on EVERY surface,
 * by component identity — so a manifest row pointing at the wrong component, or
 * a faction quietly dropped from a surface, fails here rather than being
 * discovered visually weeks later.
 *
 * That is the whole safety argument for calling this refactor a visual no-op:
 * once each dispatcher switches to `surfaceMap()`, the components it resolves
 * are provably the same objects it resolved before.
 *
 * DELETE THIS FILE (and the legacy registries it imports) in commit 5.
 */
import { describe, it, expect } from 'vitest'

// IMPORT ORDER IS LOAD-BEARING while both sources coexist. Several archetypes
// value-import their own dispatcher module back (e.g. AlbescentAvatar pulls
// `BadgedAvatar` from FactionAvatar), so dispatcher and archetype already form a
// cycle. Today the dispatcher always enters that cycle first and its eager
// module-level registry is built from fully-evaluated bindings. Importing the
// manifest index first flips the entry point, and under vitest's SSR transform
// (which, unlike real ESM, does not hoist `export default function`) the legacy
// registry would capture `undefined`. The manifest side is immune because
// `surfaceMap()` resolves lazily — which is precisely why it is lazy. Keep the
// legacy imports above the index import until commit 5 deletes them.
import { CARD_COMPONENTS } from '../../components/TaskCard'
import { PRAXIS_CARD_BY_SLUG } from '../../components/PraxisCard'
import { FACTION_AVATARS } from '../../components/avatar/FactionAvatar'
import { FACTION_BACKDROPS } from '../../components/backdrop/FactionBackdrop'
import { FACTION_SIGILS } from '../../components/cards/FactionSigil'
import { COMMENT_COMPONENTS } from '../../components/comments/CommentThread'
import { FACTION_FEED_FRAMES } from '../../components/feed/FactionFeedFrame'
import { FACTION_VOTE } from '../../components/vote/VoteUI'
import { MOBILE_PRAXIS_CARD_BY_SLUG } from '../../components/praxisCard/mobile/MobilePraxisCard'
import { MOBILE_TASK_CARD_BY_SLUG } from '../../pages/tasks/mobileArchetypes/mobileTaskCard'
import {
  DUEL_SEAL_BY_SLUG,
  MOBILE_DUEL_SEAL_BY_SLUG,
} from '../../components/duel/DuelSealConfirm'
import {
  DUEL_RAIL_BY_SLUG,
  MOBILE_DUEL_RAIL_BY_SLUG,
} from '../../pages/praxisDetail/DuelCrossLink'
import {
  FACTION_HEROES,
  FACTION_BODIES,
  MOBILE_ARCHETYPE_BY_SLUG as FACTION_DETAIL_MOBILE,
} from '../../pages/FactionDetail'
import { FACTION_PROFILE_BODIES } from '../../pages/characterProfile/FactionProfileBody'
import {
  ARCHETYPE_BY_SLUG as TASK_DETAIL,
  MOBILE_ARCHETYPE_BY_SLUG as TASK_DETAIL_MOBILE,
} from '../../pages/TaskDetail'
import {
  ARCHETYPE_BY_SLUG as PRAXIS_DETAIL,
  MOBILE_ARCHETYPE_BY_SLUG as PRAXIS_DETAIL_MOBILE,
} from '../../pages/PraxisDetail'
import {
  ARCHETYPE_BY_SLUG as EDIT_PRAXIS,
  MOBILE_ARCHETYPE_BY_SLUG as EDIT_PRAXIS_MOBILE,
} from '../../pages/EditPraxis'
import { MOBILE_ARCHETYPE_BY_SLUG as FIELD_DESK_MOBILE } from '../../pages/FieldDesk'
import { MOBILE_ARCHETYPE_BY_SLUG as CREATE_CHARACTER_MOBILE } from '../../pages/CreateCharacter'
import { MOBILE_ARCHETYPE_BY_SLUG as EDIT_CHARACTER_MOBILE } from '../../pages/EditCharacter'
import { MOBILE_ARCHETYPE_BY_SLUG as FACTIONS_DIRECTORY_MOBILE } from '../../pages/Factions'
import { MOBILE_ARCHETYPE_BY_SLUG as PLAYERS_DIRECTORY_MOBILE } from '../../pages/Leaderboard'
import { MOBILE_PROFILE_BY_SLUG } from '../../pages/CharacterProfile'

// Imported last on purpose — see the import-order note above.
import { FACTION_MANIFESTS, buildSurfaceMap, type FactionSurface } from '..'

/**
 * Every legacy registry paired with the manifest surface that replaces it.
 * `factionCard` is absent: it is a raw switch until commit 4, with no registry
 * to compare against.
 */
const LEGACY: Record<string, Record<string, unknown>> = {
  taskCard: CARD_COMPONENTS,
  praxisCard: PRAXIS_CARD_BY_SLUG,
  avatar: FACTION_AVATARS,
  backdrop: FACTION_BACKDROPS,
  sigil: FACTION_SIGILS,
  comment: COMMENT_COMPONENTS,
  feedFrame: FACTION_FEED_FRAMES,
  vote: FACTION_VOTE,
  taskDetail: TASK_DETAIL,
  praxisDetail: PRAXIS_DETAIL,
  editPraxis: EDIT_PRAXIS,
  factionHero: FACTION_HEROES,
  factionBody: FACTION_BODIES,
  profileBody: FACTION_PROFILE_BODIES,
  duelSeal: DUEL_SEAL_BY_SLUG,
  duelRail: DUEL_RAIL_BY_SLUG,
  mobileTaskCard: MOBILE_TASK_CARD_BY_SLUG,
  mobilePraxisCard: MOBILE_PRAXIS_CARD_BY_SLUG,
  mobileTaskDetail: TASK_DETAIL_MOBILE,
  mobilePraxisDetail: PRAXIS_DETAIL_MOBILE,
  mobileEditPraxis: EDIT_PRAXIS_MOBILE,
  mobileFactionPage: FACTION_DETAIL_MOBILE,
  mobileFieldDesk: FIELD_DESK_MOBILE,
  mobileDuelSeal: MOBILE_DUEL_SEAL_BY_SLUG,
  mobileDuelRail: MOBILE_DUEL_RAIL_BY_SLUG,
  mobileCreateCharacter: CREATE_CHARACTER_MOBILE,
  mobileEditCharacter: EDIT_CHARACTER_MOBILE,
  mobileFactionsDirectory: FACTIONS_DIRECTORY_MOBILE,
  mobilePlayersDirectory: PLAYERS_DIRECTORY_MOBILE,
  mobileProfile: MOBILE_PROFILE_BY_SLUG,
}

describe('manifest ↔ legacy registry agreement (temporary, #782)', () => {
  for (const [surface, registry] of Object.entries(LEGACY)) {
    it(`${surface}: manifests resolve the same components as the legacy map`, () => {
      const fromManifests = buildSurfaceMap(
        FACTION_MANIFESTS,
        surface as FactionSurface,
      )
      // Same slugs...
      expect(Object.keys(fromManifests).sort()).toEqual(
        Object.keys(registry).sort(),
      )
      // ...pointing at the same component objects.
      for (const slug of Object.keys(registry)) {
        expect(fromManifests[slug], `${surface}.${slug}`).toBe(registry[slug])
      }
    })
  }

  it('covers every surface except factionCard (converted in commit 4)', () => {
    const covered = new Set(Object.keys(LEGACY))
    covered.add('factionCard')
    const declared = new Set(
      FACTION_MANIFESTS.flatMap((manifest) =>
        Object.keys(manifest).filter((key) => key !== 'slug'),
      ),
    )
    for (const surface of declared) {
      expect(covered.has(surface), `${surface} has no legacy counterpart`).toBe(
        true,
      )
    }
  })
})
