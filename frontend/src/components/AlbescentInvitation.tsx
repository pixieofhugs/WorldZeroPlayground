import { useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { CharacterOut } from '../api/auth'
import { useAuth } from '../auth/AuthContext'
import { setActiveCharacter } from '../api/me'
import { chooseFaction } from '../api/factions'
import { extractError } from '../utils/errors'
import { factionName, factionSheet } from '../utils/factions'
import FactionSigil from './sigil/FactionSigil'
// Loads the faction face sheet (#2079); FieldDesk mounts this outside any archetype.
import '../factionFaces'

/**
 * The Albescent invitation letter (#395), shown when `can_start_as_albescent`
 * (ADR-0021). The player picks a life; Accept switches to it, then defects it.
 * SECRECY (ADR-0027): never link to /factions or /factions/albescent.
 */

const ALBESCENT_SLUG = 'albescent'

/**
 * The level ceiling (#2399). 0 on the wire (unseeded era) means no ceiling, not
 * "bar everyone"; the server enforces the real one anyway.
 */
function ceiling(albescentLevelRequired: number): number {
  return albescentLevelRequired > 0 ? albescentLevelRequired : Infinity
}

/** Lives the order will consider at all: active, and not already of the Order. */
function answerable(lives: CharacterOut[]): CharacterOut[] {
  return lives.filter(
    (life) => life.status === 'active' && life.faction_slug !== ALBESCENT_SLUG,
  )
}

/**
 * Answerable lives below the ceiling. New Game+ (#2399): a life AT the ceiling
 * goes to {@link barredLives}. The frontend's only MAXIMUM-level test.
 */
export function eligibleLives(
  lives: CharacterOut[],
  albescentLevelRequired: number,
): CharacterOut[] {
  const bar = ceiling(albescentLevelRequired)
  return answerable(lives).filter((life) => life.level < bar)
}

/** Answerable lives at/over the ceiling (#2399): shown with a New Game+ note, not hidden. */
export function barredLives(
  lives: CharacterOut[],
  albescentLevelRequired: number,
): CharacterOut[] {
  const bar = ceiling(albescentLevelRequired)
  return answerable(lives).filter((life) => life.level >= bar)
}

// The letter takes the na card's register (#2632); no Albescent-owned hue (ADR-0027, ADR-0048).
const INK = 'var(--faction-default-card-text)'
const ACCENT = 'var(--faction-default-card-accent)'
const MUTED = 'var(--faction-default-card-muted)'
const SERIF = 'var(--font-faction-vellum)'
const MONO = "var(--font-body)"
// `HAIRLINE_FAINT` is ornament (owes no ratio), mixed from the line token so it flips in dark mode.
const HAIRLINE = 'var(--faction-default-card-line)'
const HAIRLINE_FAINT = 'color-mix(in srgb, var(--faction-default-card-line) 55%, transparent)'

interface AlbescentInvitationProps {
  /** The account's roster (every life but the banned ones). */
  lives: CharacterOut[]
  /** After a join, refreshes the parent's roster; the viewer is adopted here (#1383). */
  onJoined: () => Promise<void> | void
}

export default function AlbescentInvitation({ lives, onJoined }: AlbescentInvitationProps) {
  const { t } = useTranslation('factions')
  const { user, applyUser } = useAuth()
  // The server's number, never a literal (#2399).
  const albescentLevelRequired = user?.albescent_level_required ?? 0
  const choices = eligibleLives(lives, albescentLevelRequired)
  const barred = barredLives(lives, albescentLevelRequired)
  const [selectedId, setSelectedId] = useState<number | null>(choices[0]?.id ?? null)
  const [joined, setJoined] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasAlbescentLife = lives.some((life) => life.faction_slug === ALBESCENT_SLUG)
  // Already answered, or nobody to address. Only-barred rosters still get it (#2399).
  if (!joined && (hasAlbescentLife || choices.length + barred.length === 0)) return null

  const handleAccept = async () => {
    const picked = choices.find((life) => life.id === selectedId) ?? null
    if (!picked || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      // /factions/choose acts on the active character. Only its `CurrentUser` is adopted: it supersedes the switch's (#1383).
      await setActiveCharacter(picked.id)
      applyUser(await chooseFaction(ALBESCENT_SLUG))
      setJoined(true)
      await onJoined()
    } catch (err) {
      setError(extractError(err, t('albescent.letter.declineError')))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="alb-prism" style={letter} aria-label={t('albescent.letter.aria')}>
      <div style={innerFrame} />

      {/* §4a asymmetric-inset exception: keeps the wide side gutters. */}
      <div style={{ position: 'relative', padding: 'var(--space-2xl) var(--space-3xl) var(--space-2xl)', textAlign: 'center' }}>
        {/* The unaffiliated ring: the order has no mark of its own (#1891 ruling 6). */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-lg)' }}>
          <FactionSigil slug={ALBESCENT_SLUG} size={44} />
        </div>
        <div style={{
          ...monoCaps, letterSpacing: '0.34em', color: ACCENT, marginBottom: 'var(--space-xl)',
          // eslint-disable-next-line local/no-raw-style-values -- ornament: engraved stationery mono-caps; these draw the letterhead rather than set read copy
          fontSize: 9,
        }}>{t('albescent.letter.wordmark')}</div>
        <div style={{ width: 54, height: 1, background: HAIRLINE, margin: '0 auto var(--space-xl)' }} />
        <h2 style={headline}>{t('albescent.letter.headline')}</h2>
        <p style={pitch}>
          {t('albescent.letter.pitch')}
        </p>
      </div>

      {/* Perks (#2298). */}
      <ul style={{ position: 'relative', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', margin: '0 var(--space-3xl)', borderTop: `1px solid ${HAIRLINE_FAINT}`, padding: 'var(--space-xl) 0 var(--space-xs)', textAlign: 'left' }}>
        <li style={{ borderBottom: `1px solid ${HAIRLINE_FAINT}`, padding: '0 0 var(--space-sm)' }}>
          {/* Read size, not engraving: a perk name is copy. */}
          <div style={{
            ...monoCaps, letterSpacing: '0.14em', fontSize: 'var(--text-md)', color: ACCENT,
          }}>{t('albescent.letter.perks.record.name')}</div>
          <div style={{ ...serifItalic, fontSize: 'var(--text-content)', color: INK, marginTop: 'var(--space-xs)' }}>{t('albescent.letter.perks.record.desc')}</div>
        </li>
      </ul>

      <div style={{ position: 'relative', padding: 'var(--space-xl) var(--space-3xl) var(--space-2xl)' }}>
        {joined ? (
          <div style={{ ...serifItalic, fontSize: 'var(--text-title)', color: INK, textAlign: 'center' }}>{t('albescent.letter.cta.joined')}</div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', marginBottom: 'var(--space-xl)' }}>
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
                    <span style={{ ...serifItalic, fontSize: 'var(--text-content)', color: INK, lineHeight: 1.1 }}>{life.display_name}</span>
                    <span style={{ ...monoCaps, fontSize: 'var(--text-md)', letterSpacing: '0.08em', marginTop: 'var(--space-xs)' }}>
                      {t('albescent.letter.lifeMeta', { username: life.username, faction: factionName(life.faction_slug) })}
                    </span>
                    {/* eslint-disable-next-line local/no-raw-style-values -- ornament: bullet/arrow dingbat marking the selected life */}
                    <span style={{ marginLeft: 'auto', fontSize: 12, color: MUTED, position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)' }}>
                      {selected ? '•' : '→'}
                    </span>
                  </button>
                )
              })}
              {/* Barred lives (#2399): a <div>, not a button — nothing to press or focus. */}
              {barred.map((life) => (
                <div key={life.id} style={{ ...lifeChip, cursor: 'default', opacity: 0.55 }}>
                  <span style={{ ...serifItalic, fontSize: 'var(--text-content)', color: INK, lineHeight: 1.1 }}>{life.display_name}</span>
                  <span style={{ ...monoCaps, fontSize: 'var(--text-md)', letterSpacing: '0.08em', marginTop: 'var(--space-xs)' }}>
                    {t('albescent.letter.lifeMeta', { username: life.username, faction: factionName(life.faction_slug) })}
                  </span>
                  <span style={{ ...serifItalic, fontSize: 'var(--text-content)', color: ACCENT, marginTop: 'var(--space-xs)' }}>
                    {t('albescent.letter.newGamePlus')}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button type="button" onClick={() => void handleAccept()} disabled={submitting || selectedId === null} style={acceptButton}>
                {submitting ? t('albescent.letter.cta.busy') : t('albescent.letter.cta.join')}
              </button>
            </div>
            {error && (
              <p style={{ ...serifItalic, fontSize: 'var(--text-content)', color: INK, textAlign: 'center', marginTop: 'var(--space-lg)', marginBottom: 0 }}>{error}</p>
            )}
          </>
        )}
      </div>
    </section>
  )
}

/**
 * Wears the prism (#2632): `.alb-prism` repaints the `factionSheet()` triple, so
 * class and spread must sit on the same `<section>`.
 */
const letter: CSSProperties = {
  position: 'relative',
  maxWidth: 620,
  ...factionSheet(),
  color: INK,
  border: `1px solid ${HAIRLINE}`,
  boxShadow: '0 2px 24px var(--color-cast-shadow-soft), 0 1px 3px var(--color-cast-shadow-soft)',
  overflow: 'hidden',
  marginTop: 'var(--space-3xl)',
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
  fontSize: 'var(--text-display)',
  lineHeight: 1.05,
  color: INK,
  margin: '0 0 var(--space-lg)',
}
const pitch: CSSProperties = {
  ...serifItalic,
  fontSize: 'var(--text-content)',
  lineHeight: 1.6,
  color: ACCENT,
  maxWidth: 440,
  margin: '0 auto',
}
const lifeChip: CSSProperties = {
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  textAlign: 'left',
  width: '100%',
  padding: 'var(--space-md) var(--space-2xl) var(--space-md) var(--space-lg)',
  // FLAT, not `factionSheet()`: inside `.alb-prism` it would repaint the bloom per row.
  background: 'var(--faction-default-card-bg)',
  border: `1px solid ${HAIRLINE_FAINT}`,
  cursor: 'pointer',
}
const acceptButton: CSSProperties = {
  ...serifItalic,
  cursor: 'pointer',
  border: `1px solid ${INK}`,
  background: INK,
  // The na card's ink/stock pair inverted; same contrast ratio.
  color: 'var(--faction-default-card-bg)',
  fontSize: 'var(--text-content)',
  padding: 'var(--space-md) var(--space-2xl)',
}
