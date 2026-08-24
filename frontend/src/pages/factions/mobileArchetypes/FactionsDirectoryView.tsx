import { useTranslation } from 'react-i18next'
import type { FactionOut, FactionPageOut } from '../../../api/factions'
import { factionCssVar, sortFactionsByRainbowOrder } from '../../../utils/factions'
import FactionSelectCard, { type SelectState } from '../../../components/selectCard/FactionSelectCard'

const NA_SLUG = 'na'

const STATUS_MEMBER = 'member'
const STATUS_INVITED = 'invited'
const STATUS_NOT_INVITED = 'not_invited'
const STATUS_CAN_RETURN = 'can_return'

export interface FactionsDirectoryViewProps {
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
 * Pure presentational skin for the Default MOBILE factions directory — the phone
 * twin of the desktop Factions grid. A single-column screen, in render order: a
 * title, the faction stripe bar, an "unaffiliated" banner (shown only while the
 * viewer hasn't sworn to a faction), then a vertical stack of the SAME bespoke
 * FactionSelectCard archetypes desktop uses (#732), each visiting its detail page where
 * all membership actions live (#347). Member counts are intentionally dropped —
 * no cheap per-faction count query exists (ADR-0035: real fields only).
 *
 * The stripe bar is a legend for the list: one hard-edged span per rendered
 * row, in the same rainbow order, so stripe N == card N. That's why it is NOT
 * `var(--faction-default-rainbow)` (a smooth gradient, no per-faction
 * correspondence) and why the list keeps rainbow order rather than desktop's
 * member-first sort. The stripe count follows the fetched list rather than a
 * static seven — Albescent is hidden until revealed (ADR-0027).
 *
 * NO fetching and NO effects: the container (`DefaultFactionsDirectory`) fetches
 * the slug-only faction list plus the viewer's per-faction status and feeds them
 * here as controlled props, so the cards render real member/eligible/locked
 * rather than a uniform neutral. This seam is what makes the surface testable
 * (#743) — mirror of how DefaultPlayers is the pure skin behind its container.
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

      {/* Faction legend: one hard-edged stripe per faction, in the same order
          as the cards below. Deliberately not extracted — single caller.

          Driven off `visible` (the rows actually rendered), NOT the static
          FACTION_RAINBOW_ORDER, and that matters MORE since ADR-0082 rather
          than less. This used to read "Albescent is a secret society omitted
          from /factions until the account is revealed to it (ADR-0027)" — the
          server no longer omits it, so the bar now draws EIGHT stripes for
          everyone, the eighth in the neutral default because Albescent owns no
          hue (#783). A list hardcoded to seven would break the stripe==row
          correspondence in the other direction. */}
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
              {/* Every clause is load-bearing against a specific falsehood the old
                  line told, so this is not a sentence to "simplify" later (#1963):
                  • "Each faction watches its own work" — an invitation is earned PER
                    FACTION, by doing THAT faction's tasks (ADR-0022). The old copy
                    ("Join a faction after your first task") read as a general
                    unlock; two Coven tasks move you no distance toward Snide.
                  • "do enough of it" — there is a threshold and the copy declines to
                    name it ON PURPOSE. Era 1 wants both a completed-task count for
                    that faction AND points from its tasks, and neither
                    `invitation_task_threshold` nor `invitation_point_threshold`
                    ships to the client. Naming either would hardcode an EraConfig
                    value into copy, which CLAUDE.md forbids outright — it needs
                    the thresholds put on the wire first.
                  • "an invitation finds you" — literal, not flavour. Delivery is
                    passive: `InvitationWatcher` / `InvitationLetterPopup` exist
                    because the letter arrives on its own; nothing is claimed.
                  • "Every path is open" — kept, and true: sign-up carries no faction
                    gate, so every faction is reachable from unaffiliated.
                  Keep it in one voice with its sibling `index.loggedOutHint`
                  (Factions.tsx), which a player can see too. */}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2xl)' }}>
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
