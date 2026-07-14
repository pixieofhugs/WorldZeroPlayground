import { useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { CharacterOut } from '../api/auth'
import { setActiveCharacter } from '../api/me'
import { chooseFaction } from '../api/factions'
import { extractError } from '../utils/errors'
import { factionName } from '../utils/factions'

/**
 * AlbescentInvitation — the order's standing correspondence (#395).
 *
 * Ported from the World Zero Design System "Albescent Join Screen" (AlRecruit):
 * a vellum letter — white cotton paper, hairline rules, Cormorant italic, the
 * surveyor's-mark sigil, a "terms, plainly" slip and the "Accept the order" CTA.
 *
 * Shown only when the account's server-computed `can_start_as_albescent` flag is
 * true (ADR-0021 — account-collective eligibility). The player picks WHICH life
 * takes up the work; Accept switches the account to that life (existing
 * character-switch flow) and then defects it via POST /factions/choose.
 *
 * SECRECY (ADR-0027 / #390): the letter may name Albescent but never links to
 * /factions or /factions/albescent — the faction is not to be looked up.
 */

const ALBESCENT_SLUG = 'albescent'

/** Active, non-Albescent lives — the only ones the order will take. */
export function eligibleLives(lives: CharacterOut[]): CharacterOut[] {
  return lives.filter(
    (life) => life.status === 'active' && life.faction_slug !== ALBESCENT_SLUG,
  )
}

// Albescent vellum tokens (index.css). Albescent is always-light by design —
// these vars are identical in both themes, so the letter never flips dark.
const BG = 'var(--faction-albescent-card-bg)'
const INK = 'var(--faction-albescent-card-text)'
const ACCENT = 'var(--faction-albescent-card-accent)'
const MUTED = 'var(--faction-albescent-card-muted)'
const SERIF = 'var(--faction-albescent-card-font)'
const MONO = "'Courier Prime', monospace"
// Structural hairlines — no token exists; mirrors AlbescentComment's practice.
const HAIRLINE = 'rgba(0,0,0,0.10)'
const HAIRLINE_FAINT = 'rgba(0,0,0,0.055)'
const RULE = 'rgba(0,0,0,0.07)'

// i18n key stems under factions:albescent.invitation — resolved at render.
const TERM_KEYS: ReadonlyArray<{ label: string; value: string }> = [
  { label: 'terms.tollLabel', value: 'terms.tollValue' },
  { label: 'terms.skillsLabel', value: 'terms.skillsValue' },
  { label: 'terms.outputLabel', value: 'terms.outputValue' },
  { label: 'terms.standingLabel', value: 'terms.standingValue' },
]

const PERK_KEYS: ReadonlyArray<string> = [
  'perks.record',
  'perks.duties',
  'perks.witnessed',
]

/** The surveyor's cross-hair mark — Albescent's only sigil. */
function AlbescentMark({ size = 44 }: { size?: number }) {
  const center = size / 2
  const outerRadius = size * 0.43
  const innerRadius = size * 0.235
  const dotRadius = size * 0.044
  const tickStart = innerRadius + size * 0.025
  const tickEnd = tickStart + size * 0.13
  const tick = (degrees: number) => {
    const angle = (degrees * Math.PI) / 180
    return {
      x1: center + tickStart * Math.cos(angle),
      y1: center + tickStart * Math.sin(angle),
      x2: center + tickEnd * Math.cos(angle),
      y2: center + tickEnd * Math.sin(angle),
    }
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" style={{ display: 'block', flexShrink: 0 }} aria-hidden>
      <circle cx={center} cy={center} r={outerRadius} stroke={INK} strokeWidth={size * 0.022} opacity={0.18} />
      <circle cx={center} cy={center} r={innerRadius} stroke={INK} strokeWidth={size * 0.038} opacity={0.5} />
      {[0, 90, 180, 270].map((degrees) => {
        const { x1, y1, x2, y2 } = tick(degrees)
        return <line key={degrees} x1={x1} y1={y1} x2={x2} y2={y2} stroke={INK} strokeWidth={size * 0.038} />
      })}
      <circle cx={center} cy={center} r={dotRadius} fill={INK} />
    </svg>
  )
}

export interface AlbescentInvitationProps {
  /** The account's roster (active + paused lives). */
  lives: CharacterOut[]
  /** Called after a successful join — refetch auth + roster so the UI reflects it. */
  onJoined: () => Promise<void> | void
}

export default function AlbescentInvitation({ lives, onJoined }: AlbescentInvitationProps) {
  const { t } = useTranslation('factions')
  // Dynamic term/perk keys are data-driven; resolve them through a plain
  // string view of `t` (the typed union can't see the interpolated key).
  const tDynamic = t as unknown as (key: string) => string
  const choices = eligibleLives(lives)
  const [selectedId, setSelectedId] = useState<number | null>(choices[0]?.id ?? null)
  const [joined, setJoined] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasAlbescentLife = lives.some((life) => life.faction_slug === ALBESCENT_SLUG)
  // Invitation already answered before this visit, or nobody fit to answer it.
  if (!joined && (hasAlbescentLife || choices.length === 0)) return null

  const handleAccept = async () => {
    const picked = choices.find((life) => life.id === selectedId) ?? null
    if (!picked || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      // Existing character-switch flow, then the plain defection endpoint —
      // /factions/choose acts on the account's active character.
      await setActiveCharacter(picked.id)
      await chooseFaction(ALBESCENT_SLUG)
      setJoined(true)
      await onJoined()
    } catch (err) {
      setError(extractError(err, t('albescent.invitation.declineError')))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section style={letter} aria-label={t('albescent.invitation.aria')}>
      <div style={innerFrame} />

      {/* letterhead */}
      <div style={{ position: 'relative', padding: '36px 42px 30px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
          <AlbescentMark size={44} />
        </div>
        <div style={{ ...monoCaps, fontSize: 9, letterSpacing: '0.34em', color: ACCENT, marginBottom: 6 }}>{t('albescent.invitation.wordmark')}</div>
        <div style={{ ...monoCaps, fontSize: 8, letterSpacing: '0.28em', marginBottom: 22 }}>{t('albescent.invitation.letterhead')}</div>
        <div style={{ width: 54, height: 1, background: HAIRLINE, margin: '0 auto 22px' }} />
        <div style={{ ...monoCaps, fontSize: 8, letterSpacing: '0.2em', marginBottom: 10 }}>{t('albescent.invitation.handExtended')}</div>
        <h2 style={headline}>{t('albescent.invitation.headline')}</h2>
        <p style={pitch}>
          {t('albescent.invitation.pitch')}
        </p>
      </div>

      {/* terms slip */}
      <div style={{ position: 'relative', margin: '0 42px', borderTop: `1px solid ${RULE}`, padding: '20px 0 4px', textAlign: 'left' }}>
        <div style={{ ...monoCaps, fontSize: 7, letterSpacing: '0.22em', marginBottom: 12 }}>{t('albescent.invitation.termsHeading')}</div>
        <div style={termsGrid}>
          {TERM_KEYS.map((term) => (
            <div key={term.label} style={{ borderBottom: `1px solid ${HAIRLINE_FAINT}`, padding: '8px 0' }}>
              <div style={{ ...monoCaps, fontSize: 7, letterSpacing: '0.14em' }}>{tDynamic(`albescent.invitation.${term.label}`)}</div>
              <div style={{ ...serifItalic, fontSize: 18, color: INK, marginTop: 2 }}>{tDynamic(`albescent.invitation.${term.value}`)}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }}>
          {PERK_KEYS.map((perk) => (
            <div key={perk} style={{ ...serifItalic, fontSize: 14, color: ACCENT }}>— {tDynamic(`albescent.invitation.${perk}`)}</div>
          ))}
        </div>
      </div>

      {/* answer */}
      <div style={{ position: 'relative', padding: '24px 42px 36px' }}>
        {joined ? (
          <div style={{ ...serifItalic, fontSize: 22, color: INK, textAlign: 'center' }}>{t('albescent.invitation.joined')}</div>
        ) : (
          <>
            <div style={{ ...monoCaps, fontSize: 7, letterSpacing: '0.22em', marginBottom: 10 }}>{t('albescent.invitation.whoHeading')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
              {choices.map((life) => {
                const selected = life.id === selectedId
                return (
                  <button
                    key={life.id}
                    type="button"
                    onClick={() => setSelectedId(life.id)}
                    style={{ ...lifeChip, borderColor: selected ? INK : HAIRLINE_FAINT }}
                    aria-pressed={selected}
                  >
                    <span style={{ ...serifItalic, fontSize: 16, color: INK, lineHeight: 1.1 }}>{life.display_name}</span>
                    <span style={{ ...monoCaps, fontSize: 7, letterSpacing: '0.08em', marginTop: 3 }}>
                      {t('albescent.invitation.lifeMeta', { username: life.username, faction: factionName(life.faction_slug) })}
                    </span>
                    <span style={{ marginLeft: 'auto', fontSize: 12, color: MUTED, position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)' }}>
                      {selected ? '•' : '→'}
                    </span>
                  </button>
                )
              })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
              <button type="button" onClick={() => void handleAccept()} disabled={submitting} style={acceptButton}>
                {submitting ? t('albescent.invitation.acceptBusy') : t('albescent.invitation.acceptIdle')}
              </button>
              <span style={{ ...serifItalic, fontSize: 15, color: ACCENT }}>{t('albescent.invitation.reassurance')}</span>
            </div>
            {error && (
              <p style={{ ...serifItalic, fontSize: 14, color: INK, textAlign: 'center', marginTop: 14, marginBottom: 0 }}>{error}</p>
            )}
          </>
        )}
      </div>
    </section>
  )
}

// --- letter styles (Albescent vellum tokens; always-light by design) ---------

const letter: CSSProperties = {
  position: 'relative',
  maxWidth: 620,
  background: BG,
  color: INK,
  border: `1px solid ${HAIRLINE}`,
  boxShadow: '0 2px 24px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
  overflow: 'hidden',
  marginTop: 40,
}
const innerFrame: CSSProperties = {
  position: 'absolute',
  inset: 6,
  border: `1px solid ${HAIRLINE_FAINT}`,
  pointerEvents: 'none',
}
const monoCaps: CSSProperties = {
  fontFamily: MONO,
  textTransform: 'uppercase',
  color: MUTED,
}
const serifItalic: CSSProperties = {
  fontFamily: SERIF,
  fontStyle: 'italic',
  fontWeight: 500,
}
const headline: CSSProperties = {
  ...serifItalic,
  fontSize: 44,
  lineHeight: 1.05,
  color: INK,
  margin: '0 0 14px',
}
const pitch: CSSProperties = {
  ...serifItalic,
  fontSize: 17,
  lineHeight: 1.6,
  color: ACCENT,
  maxWidth: 440,
  margin: '0 auto',
}
const termsGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '2px 26px',
}
const lifeChip: CSSProperties = {
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  textAlign: 'left',
  width: '100%',
  padding: '10px 34px 10px 14px',
  background: BG,
  border: `1px solid ${HAIRLINE_FAINT}`,
  cursor: 'pointer',
}
const acceptButton: CSSProperties = {
  ...serifItalic,
  cursor: 'pointer',
  border: `1px solid ${INK}`,
  background: INK,
  color: BG,
  fontSize: 20,
  padding: '12px 30px',
}
