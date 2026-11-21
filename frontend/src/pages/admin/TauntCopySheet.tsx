/**
 * The taunt copy sheet (`/admin/taunts`): every taunt variant of every branch,
 * drawn through the real feed row, for the copy editor. No editing mechanism of
 * its own.
 */
import { useTranslation } from 'react-i18next'
import PageTitle from '../../components/ui/PageTitle'
import FactionFeedFrame from '../../components/feed/FactionFeedFrame'
import FeedRowContent from '../../components/feed/FeedRowContent'
import { feedKicker } from '../../components/feed/feedItemLabels'
import { normalizeFeedItem } from '../../components/feed/normalizeFeedItem'
import taunts from '../../locales/en/taunts.json'
import { ALBESCENT_FACTION_SLUG, factionName } from '../../utils/factions'
import { useFocusWithoutScroll } from './FactionCopySheet'

type Branches = Record<string, Record<string, string[]> | undefined>
const BRANCHES = taunts as Branches
const TRIGGERS = Object.keys(BRANCHES.default ?? {})
// Albescent has no branch of its own, so its section is all fallback.
const SLUGS = [...Object.keys(BRANCHES), ALBESCENT_FACTION_SLUG]

/** `transform` contains the phone skin's `position: fixed` scrim per row. */
const PHONE_FRAME = { position: 'relative', transform: 'translateZ(0)' } as const

interface Sample {
  from: string
  to: string
}

function TauntRow({ slug, trigger, n, sample }: { slug: string; trigger: string; n: number; sample: Sample }) {
  // Not memoised: the copy editor records copy as it renders.
  const row = normalizeFeedItem({
    type: 'foe_taunt',
    item_key: `foe_taunt:${slug}.${trigger}.${n}`,
    timestamp: '',
    actor_display_name: sample.from,
    actor_faction_slug: slug,
    actor_avatar_url: null,
    context_faction_slug: slug,
    payload: { taunt_id: n, faction_slug: slug, trigger_type: trigger, from_name: sample.from, to_name: sample.to },
  })
  if (!row) return null
  return (
    <FactionFeedFrame slug={slug} kicker={feedKicker('foe_taunt')} time="" tag={null} archive={null}>
      <FeedRowContent row={row} avatarUrl={null} />
    </FactionFeedFrame>
  )
}

export default function TauntCopySheet() {
  const { t } = useTranslation('admin')
  useFocusWithoutScroll()
  const sample = { from: t('tauntSheet.from'), to: t('tauntSheet.to') }
  return (
    <div className="py-8">
      <PageTitle title={t('tauntSheet.title')} />
      <p className="card-meta mb-8">{t('tauntSheet.intro')}</p>
      {SLUGS.map((slug) => (
        <section key={slug} data-sheet-branch={slug} className="flex flex-col gap-3 mb-10">
          <h2 className="label-heading">{slug === 'default' ? t('tauntSheet.default') : factionName(slug)}</h2>
          {TRIGGERS.map((trigger) => {
            const own = BRANCHES[slug]?.[trigger]?.length ?? 0
            const count = own || (BRANCHES.default?.[trigger]?.length ?? 0)
            return (
              <div key={trigger} data-sheet-trigger={trigger} className="flex flex-col gap-2">
                <h3 className="card-meta">
                  {t(`tauntSheet.trigger.${trigger}`, trigger)}
                  {own === 0 && ` ${t('tauntSheet.fallback')}`}
                </h3>
                {Array.from({ length: count }, (_, n) => (
                  <div key={n} style={PHONE_FRAME}>
                    <TauntRow slug={slug} trigger={trigger} n={n} sample={sample} />
                  </div>
                ))}
              </div>
            )
          })}
        </section>
      ))}
    </div>
  )
}
