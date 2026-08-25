/**
 * `na` has a manifest like every other faction (#2530).
 *
 * THE SEAM IS `surfaceMap(surface)['na']`. Before this, `Default*` was reached
 * by a SECOND mechanism — the third argument to `pickVariant`, spelled out by
 * hand at ~20 dispatchers — while the other eight factions were reached through
 * the registry. Two mechanisms, one of which served exactly one slug, so the
 * model in `manifest.ts` ("partial registration is the normal case") no longer
 * described the code: 160 of 160 slots are filled.
 *
 * THIS MIGRATION IS OUTPUT-NEUTRAL AND THAT IS ITS ACCEPTANCE TEST (owner,
 * 2026-08-24). The same `Default*` components render for the same slugs before
 * and after; only the lookup changes. The identity table below is what proves
 * it — stronger than a markup snapshot, because a component that resolves to the
 * same function cannot render different bytes. Nothing about colour, layout,
 * copy or motion was in scope, so a row that goes red here is a MIGRATION bug,
 * never a rendering one: fix the manifest, not the archetype.
 *
 * `CSS_KEY` is read out of `utils/factions.ts` as SOURCE rather than imported,
 * because it is not exported and this issue may not widen it (ADR-0039 owns that
 * file's contract). A source scan is the same tool `surfaceDispatch.test.ts` and
 * `archetypeReachability.test.ts` already use for questions the module graph
 * cannot answer.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { FACTION_MANIFESTS, SURFACE_KEYS, surfaceMap } from '..'
import { resolvedArchetype } from '../lazyArchetype'
import { UNAFFILIATED_FACTION_SLUG } from '../../utils/factions'

import DefaultAvatar from '../../components/avatar/DefaultAvatar'
import WatercolorBackground from '../../components/layout/WatercolorBackground'
import DefaultFeedFrame from '../../components/feed/DefaultFeedFrame'
import DefaultSelectCard from '../../components/selectCard/DefaultSelectCard'
import DefaultTaskCard from '../../components/taskCard/DefaultTaskCard'
import DefaultPraxisCard from '../../components/praxisCard/desktop/DefaultPraxisCard'
import DefaultScoreStamp from '../../components/praxisCard/scoreStamp/DefaultScoreStamp'
import DefaultSeal from '../../components/metataskSeal/skins/DefaultSeal'
import DefaultVote from '../../components/vote/DefaultVote'
import { DefaultSigilAdapter } from '../../components/sigil/FactionSigil'
import { DefaultComment } from '../../components/comments/CommentThread'
import { DefaultDuelSealConfirm } from '../../components/duel/DuelSealConfirm'
import DefaultTaskDetail from '../../pages/taskDetail/archetypes/DefaultTaskDetail'
import DefaultPraxisDetail from '../../pages/praxisDetail/archetypes/DefaultPraxisDetail'
import DefaultEditPraxis from '../../pages/editPraxis/archetypes/DefaultEditPraxis'
import DefaultCreateCharacter from '../../pages/characterPaths/archetypes/DefaultCreateCharacter'
import DefaultFactionHero from '../../components/factionHero/DefaultFactionHero'
import DefaultFactionBody from '../../pages/factionDetail/archetypes/DefaultFactionBody'
import DefaultProfileBody from '../../pages/characterProfile/archetypes/DefaultProfileBody'
import DefaultFieldDesk from '../../pages/fieldDesk/mobileArchetypes/DefaultFieldDesk'

/**
 * Every surface, and the component the dispatcher named by hand before #2530.
 * Written out rather than derived: derived from the manifest it would assert
 * that the manifest equals itself, which is exactly the tautology that let the
 * na kit drift out of the registry in the first place.
 */
const WAS_THE_FALLBACK: Record<string, unknown> = {
  taskCard: DefaultTaskCard,
  praxisCard: DefaultPraxisCard,
  factionSelectCard: DefaultSelectCard,
  avatar: DefaultAvatar,
  backdrop: WatercolorBackground,
  sigil: DefaultSigilAdapter,
  comment: DefaultComment,
  feedFrame: DefaultFeedFrame,
  vote: DefaultVote,
  scoreStamp: DefaultScoreStamp,
  metataskSeal: DefaultSeal,
  taskDetail: DefaultTaskDetail,
  praxisDetail: DefaultPraxisDetail,
  editPraxis: DefaultEditPraxis,
  factionHero: DefaultFactionHero,
  factionBody: DefaultFactionBody,
  profileBody: DefaultProfileBody,
  createCharacter: DefaultCreateCharacter,
  duelSeal: DefaultDuelSealConfirm,
  mobileFieldDesk: DefaultFieldDesk,
}

describe('na is a faction in the registry (#2530)', () => {
  it('has a manifest', () => {
    expect(FACTION_MANIFESTS.map((manifest) => manifest.slug)).toContain(
      UNAFFILIATED_FACTION_SLUG,
    )
  })

  it('sits last, in canonical rainbow order', () => {
    expect(FACTION_MANIFESTS.at(-1)?.slug).toBe(UNAFFILIATED_FACTION_SLUG)
  })

  it.each(SURFACE_KEYS)('claims %s', (surface) => {
    expect(
      surfaceMap(surface)[UNAFFILIATED_FACTION_SLUG],
      `na has no \`${surface}\` row in factions/default.ts.\n` +
        `Default* is na's SKIN, not a fallback (#2530) — an unclaimed surface\n` +
        `now renders nothing at all for an unaffiliated player, because the\n` +
        `dispatcher no longer names a Default of its own.`,
    ).toBeDefined()
  })

  it.each(SURFACE_KEYS)(
    'resolves %s to the component the dispatcher used to name',
    (surface) => {
      expect(
        resolvedArchetype(surfaceMap(surface)[UNAFFILIATED_FACTION_SLUG]),
        `na's \`${surface}\` row resolves to a DIFFERENT component than the one\n` +
          `pickVariant's third argument named before #2530. This migration is\n` +
          `output-neutral: not one pixel may move. Fix the manifest row.`,
      ).toBe(WAS_THE_FALLBACK[surface])
    },
  )
})

/* -------------------------------------------------------------------------- */
/* Every themed slug has a manifest (#2530)                                   */
/* -------------------------------------------------------------------------- */

/** The keys of `CSS_KEY`, read as source — see the file docblock. */
function cssKeySlugs(): string[] {
  const text = readFileSync(join(process.cwd(), 'src', 'utils', 'factions.ts'), 'utf8')
  const block = /const CSS_KEY: Record<string, string> = \{([\s\S]*?)\n\};/.exec(text)
  expect(block, 'CSS_KEY is no longer declared the way this scan expects').toBeTruthy()
  return [...block![1].matchAll(/^\s{2}(\w+):/gm)].map((match) => match[1])
}

describe('every slug the app can colour also has a manifest', () => {
  it('finds CSS_KEY at all', () => {
    // Guards the guard: a regex that stopped matching would make the row below
    // vacuously green.
    expect(cssKeySlugs().length).toBeGreaterThan(8)
  })

  it.each(cssKeySlugs())('%s has a manifest', (slug) => {
    expect(
      FACTION_MANIFESTS.map((manifest) => manifest.slug),
      `\`${slug}\` is a slug CSS_KEY knows about with no row in FACTION_MANIFESTS.\n` +
        `Since #2530 there is ONE dispatch mechanism: a slug renders its own\n` +
        `manifest's archetypes or na's. A slug with no manifest and no na row\n` +
        `behind it renders nothing.`,
    ).toContain(slug)
  })
})
