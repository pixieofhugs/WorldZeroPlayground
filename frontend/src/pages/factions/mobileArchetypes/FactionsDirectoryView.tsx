import { useTranslation } from 'react-i18next'
import type { FactionOut, FactionPageOut } from '../../../api/factions'
import { factionCssVar, sortFactionsByRainbowOrder } from '../../../utils/factions'
import FactionSelectCard, { type SelectState } from '../../../components/selectCard/FactionSelectCard'

const NA_SLUG = 'na'

const STATUS_MEMBER = 'member'
const STATUS_INVITED = 'invited'
const STATUS_NOT_INVITED = 'not_invited'
const STATUS_CAN_RETURN = 'can_return'

interface FactionsDirectoryViewProps {
  /** Slug-only faction list from GET /factions — Albescent absent until revealed. */
  factions: FactionOut[]
  /** Per-faction viewer status from GET /factions/status — drives card state. */
  factionPage: FactionPageOut | null
  loading: boolean
  error: string | null
  /** Whether the viewer has not yet sworn to a faction (shows the banner). */
  unaffiliated: boolean
  /** Visit-faction handler — navigates to the faction's detail page. */
  onVisit: (slug: string) => void
}

/**
 * Pure skin for the mobile factions directory: title, stripe bar,
 * unaffiliated banner, then the same FactionSelectCards desktop uses (#732).
 * No member counts (ADR-0035: no cheap query). No fetching or effects (#743).
 *
 * The stripe bar is a legend: stripe N == card N, so it is not the smooth
 * `--faction-default-rainbow` and the list keeps rainbow order.
 */
export default function FactionsDirectoryView({
  factions,
  factionPage,
  loading,
  error,
  unaffiliated,
  onVisit,
}: FactionsDirectoryViewProps) {
  const { t } = useTranslation('factions')
  const { t: tc } = useTranslation('common')

  // Same invite-gated status → three-state mapping as DesktopFactions.
  const selectState = (slug: string): SelectState => {
    const status =
      factionPage?.all_factions.find((f) => f.slug === slug)?.status ?? STATUS_NOT_INVITED
    if (status === STATUS_MEMBER) return 'member'
    if (status === STATUS_INVITED || status === STATUS_CAN_RETURN) return 'eligible'
    return 'locked'
  }

  const visible = sortFactionsByRainbowOrder(factions.filter((f) => f.slug !== NA_SLUG))

  return (
    <div className="py-4" data-testid="mobile-factions-directory">
      <h1
        className="font-display italic font-medium mb-3"
        style={{ fontSize: 'var(--text-title)', color: 'var(--color-text-primary)', lineHeight: 1.1 }}
      >
        {tc('nav.factions')}
      </h1>

      {/* Driven off `visible`, not a static order list, so stripe count
          always matches the rendered rows (ADR-0082). */}
      {visible.length > 0 && (
        <div
          aria-hidden="true"
          data-testid="faction-stripe-bar"
          style={{
            display: 'flex',
            height: 10,
            borderRadius: 999,
            overflow: 'hidden',
            marginBottom: 'var(--space-xl)',
          }}
        >
          {visible.map((f) => (
            <span key={f.slug} style={{ flex: 1, background: factionCssVar(f.slug) }} />
          ))}
        </div>
      )}

      {unaffiliated && (
        <section
          className="sidebar-card mb-4"
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', padding: 'var(--space-md) var(--space-lg)' }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              flex: 'none',
              background: 'var(--color-bg-surface-alt)',
              border: '1px solid var(--color-border)',
            }}
          />
          <div>
            <div
              className="font-display italic"
              style={{ fontSize: 'var(--text-content)', color: 'var(--color-text-primary)' }}
            >
              {t('mobile.unaffiliatedTitle')}
            </div>
            <p
              className="font-body"
              style={{ fontSize: 'var(--text-content)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-xs)', lineHeight: 1.4 }}
            >
              {/* Every clause is load-bearing (#1963): invitations are earned per
                  faction (ADR-0022); the threshold is unnamed because it lives in
                  EraConfig and isn't on the wire; delivery is passive. Keep in
                  one voice with `index.loggedOutHint`. */}
              {t('mobile.unaffiliatedBody')}
            </p>
          </div>
        </section>
      )}

      {loading ? (
        <p className="font-body text-muted">{t('index.loading')}</p>
      ) : error ? (
        <p className="font-body content-text danger-text border-2 danger-edge px-3 py-2">{error}</p>
      ) : (
        <div
          data-testid="faction-tile-column"
          /* Centre: the card maxes at 360px, so `stretch` left-strands it on
             wide screens (#2579). */
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-2xl)' }}
        >
          {visible.map((f) => (
            <FactionSelectCard
              key={f.slug}
              faction={f.slug}
              state={selectState(f.slug)}
              onVisit={() => onVisit(f.slug)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
