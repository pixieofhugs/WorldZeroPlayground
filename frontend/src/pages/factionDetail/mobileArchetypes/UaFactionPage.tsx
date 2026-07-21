import { useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PraxisCard from '../../../components/PraxisCard'
import UaMandala from '../../../components/cards/UaMandala'
import { UaSigil } from '../../../components/cards/UaSigil'
import { factionName, factionDescription } from '../../../utils/factions'
import { MobileStickyBar } from '../../taskDetail/mobileArchetypes/shared'
import type { CharacterOut } from '../../../api/auth'
import type { FactionDetailState } from '../useFactionDetail'

/**
 * University of Asthmatics MOBILE faction page (#525/#852) — the practice,
 * phone shaped.
 *
 * Same single-column slots as the Default mobile page (hero with real
 * member/task counts, top members, recent praxis, the invite-gated join via
 * `state.membership`, ADR-0019) — only the dress changes (ADR-0016). The gilt
 * salon is gone with #788: no gold-leaf sandwich, no Cinzel, no parchment
 * dot-screen. A sun-bleached sheet on mesa sand, the ensō as the faction mark
 * beside the name, and the mandala at `texture` behind the hero — the one
 * surface besides the vote control that is entitled to the pattern.
 *
 * Every colour is a `--faction-ua-*` token with both themes, so the page dims
 * through the `[data-theme="dark"]` cascade. Rows and lists ask the mandala for
 * `absent` and get nothing.
 */

const NA_SLUG = 'na'

const PAGE = 'var(--faction-ua-page)'
const PAGE_TEXT = 'var(--faction-ua-page-text)'
const SHEET = 'var(--faction-ua-card-bg)'
const PANEL = 'var(--faction-ua-panel)'
const INK = 'var(--faction-ua-card-text)'
const BODY = 'var(--faction-ua-card-body)'
const MUTED = 'var(--faction-ua-card-muted)'
const ACCENT = 'var(--faction-ua-card-accent)'
const RULE = 'var(--faction-ua-rule)'
const FILL = 'var(--faction-ua)'
const ON_FILL = 'var(--faction-ua-on-fill)'
const VERMIL = 'var(--faction-ua-vermil)'
const DISPLAY = 'var(--faction-ua-card-font)'
const SERIF = 'var(--faction-ua-body-font)'

/** The label voice: EB Garamond, tracked small caps. */
const smallCaps: CSSProperties = {
  fontFamily: SERIF,
  fontSize: 'var(--text-md)',
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: MUTED,
}

const initial = (name: string) => name.trim().charAt(0).toUpperCase() || '?'

/** Circular initials medallion — inset panel, one hairline, a Cormorant glyph. */
function Medallion({ name, size }: { name: string; size: number }) {
  return (
    <span
      style={{
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: '50%',
        background: PANEL,
        border: `1px solid ${RULE}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: DISPLAY,
        fontWeight: 600,
        // ornament: monogram sized from the medallion it sits in — geometry, not text.
        fontSize: size * 0.42,
        color: ACCENT,
      }}
    >
      {initial(name)}
    </span>
  )
}

function SectionHead({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
      <span style={{ ...smallCaps, color: INK }}>{children}</span>
      <span aria-hidden style={{ flex: 1, minWidth: 'var(--space-xl)', height: 1, background: RULE }} />
    </div>
  )
}

const joinButton: CSSProperties = {
  width: '100%',
  fontFamily: SERIF,
  fontSize: 'var(--text-xl)',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: ON_FILL,
  background: FILL,
  border: `1px solid ${FILL}`,
  borderRadius: 3,
  padding: 'var(--space-md) var(--space-lg)',
  cursor: 'pointer',
}

/** The Cancel affordance beside Join — static, so it lives at module scope (#586). */
const cancelButton: CSSProperties = {
  fontFamily: SERIF,
  fontSize: 'var(--text-md)',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: MUTED,
  background: 'transparent',
  border: `1px solid ${RULE}`,
  borderRadius: 3,
  padding: 'var(--space-md) var(--space-lg)',
  cursor: 'pointer',
}

export default function UaFactionPage({ state }: { state: FactionDetailState }) {
  const { t } = useTranslation('factions')
  const { faction, members, tasks, recentPraxis, membership } = state
  const [confirming, setConfirming] = useState(false)

  if (!faction) return null

  const name = factionName(faction.slug)
  const topMembers = [...members].sort((a, b) => b.all_time_score - a.all_time_score).slice(0, 3)
  const currentSlug = membership.currentFactionSlug
  const switching = currentSlug && currentSlug !== NA_SLUG

  return (
    <div
      data-skin="ua"
      className="py-4"
      style={{ fontFamily: SERIF, color: PAGE_TEXT, background: PAGE }}
      data-testid="mobile-faction-page"
    >
      {/* Hero — one sheet, the pattern felt behind it */}
      <section
        style={{
          position: 'relative',
          overflow: 'hidden',
          background: SHEET,
          border: `1px solid ${RULE}`,
          borderRadius: 6,
          padding: 'var(--space-xl) var(--space-lg)',
        }}
      >
        <UaMandala
          size={260}
          strength="texture"
          style={{ position: 'absolute', right: -84, top: -72, pointerEvents: 'none' }}
        />

        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            <UaSigil width={34} height={34} />
            <div style={{ ...smallCaps, color: ACCENT }}>{t('ua.mobile.eyebrow')}</div>
          </div>
          <h1
            style={{
              fontFamily: DISPLAY,
              fontWeight: 600,
              // eslint-disable-next-line local/no-raw-style-values -- ornament: masthead display type — the practice's name is the skin's identity (§4).
              fontSize: 34,
              lineHeight: 1.05,
              color: INK,
              margin: 'var(--space-sm) 0 0',
            }}
          >
            {name}
          </h1>
          <p className="content-text" style={{ fontFamily: SERIF, lineHeight: 1.6, color: BODY, margin: 'var(--space-sm) 0 0' }}>
            {factionDescription(faction.slug)}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
            <HeroStat value={members.length} label={t('mobile.membersStat')} />
            <HeroStat value={tasks.length} label={t('mobile.tasksStat')} />
          </div>
        </div>
      </section>

      {membership.state === 'member' && (
        <p style={{ ...smallCaps, marginTop: 'var(--space-md)', color: ACCENT }}>{t('mobile.memberBadge')}</p>
      )}

      {/* The circle */}
      <section className="mt-6">
        <SectionHead>{t('mobile.topMembers')}</SectionHead>
        {topMembers.length === 0 ? (
          <p className="content-text" style={{ fontFamily: SERIF, color: MUTED, margin: 0 }}>
            {t('mobile.membersEmpty')}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {topMembers.map((m, index) => (
              <MemberRow key={m.id} rank={index + 1} member={m} />
            ))}
          </div>
        )}
      </section>

      {/* Sealed work */}
      <section className="mt-6">
        <SectionHead>{t('mobile.recentPraxis')}</SectionHead>
        {recentPraxis.length === 0 ? (
          <p className="content-text" style={{ fontFamily: SERIF, color: MUTED, margin: 0 }}>
            {t('mobile.praxisEmpty')}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {recentPraxis.map((p) => (
              <PraxisCard key={p.id} praxis={p} />
            ))}
          </div>
        )}
      </section>

      {membership.state === 'gate' && (
        <p className="content-text" style={{ fontFamily: SERIF, color: MUTED, marginTop: 'var(--space-xl)' }}>
          {t('mobile.gateHint', { faction: name })}
        </p>
      )}

      {/* Sticky Join — only an eligible viewer can act (ADR-0019). */}
      {membership.state === 'eligible' && (
        <MobileStickyBar>
          {membership.joinError && (
            <p className="content-text" style={{ fontFamily: SERIF, color: 'var(--color-danger)' }}>
              {membership.joinError}
            </p>
          )}
          {!confirming ? (
            <button type="button" onClick={() => setConfirming(true)} style={joinButton}>
              {t('mobile.join', { faction: name })}
            </button>
          ) : (
            <>
              <p className="content-text" style={{ fontFamily: SERIF, color: INK }}>
                {switching
                  ? t('detail.join.confirmSwitch', { faction: name, current: factionName(currentSlug) })
                  : t('detail.join.confirm', { faction: name })}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                <button
                  type="button"
                  onClick={() => void membership.join()}
                  disabled={membership.joining}
                  style={{ ...joinButton, flex: '1 1 0', width: 'auto', opacity: membership.joining ? 0.6 : 1 }}
                >
                  {membership.joining ? t('mobile.joining') : t('mobile.confirm')}
                </button>
                <button type="button" onClick={() => setConfirming(false)} disabled={membership.joining} style={cancelButton}>
                  {t('detail.join.cancel')}
                </button>
              </div>
            </>
          )}
        </MobileStickyBar>
      )}
    </div>
  )
}

function HeroStat({ value, label }: { value: number; label: string }) {
  return (
    <div
      style={{
        flex: '1 1 0',
        minWidth: 0,
        textAlign: 'center',
        background: PANEL,
        border: `1px solid ${RULE}`,
        borderRadius: 5,
        padding: 'var(--space-md) var(--space-sm)',
      }}
    >
      <b className="content-title" style={{ fontFamily: DISPLAY, fontWeight: 600, display: 'block', lineHeight: 1, color: INK }}>
        {value}
      </b>
      <span style={{ ...smallCaps, marginTop: 'var(--space-xs)', display: 'block' }}>{label}</span>
    </div>
  )
}

function MemberRow({ rank, member }: { rank: number; member: CharacterOut }) {
  const { t } = useTranslation('factions')
  return (
    <Link
      to={`/characters/${member.id}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-md)',
        padding: 'var(--space-md) var(--space-lg)',
        background: SHEET,
        border: `1px solid ${RULE}`,
        borderRadius: 6,
        textDecoration: 'none',
      }}
    >
      <span style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 'var(--text-xl)', color: VERMIL, width: 16, flex: 'none' }}>
        {rank}
      </span>
      <Medallion name={member.display_name} size={28} />
      <span
        className="content-text"
        style={{
          flex: 1,
          minWidth: 0,
          fontFamily: DISPLAY,
          fontWeight: 600,
          color: INK,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {member.display_name}
      </span>
      <span style={{ ...smallCaps, flex: 'none' }}>
        {t('mobile.memberStat', { level: member.level, score: member.all_time_score.toLocaleString() })}
      </span>
    </Link>
  )
}
