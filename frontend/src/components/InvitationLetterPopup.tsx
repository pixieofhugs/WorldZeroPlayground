import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { factionCssVar, factionName } from '../utils/factions'

// The per-faction key path (`<slug>.invitation.*`) is runtime-dynamic, so it
// isn't one of the compile-time key literals the scoped t() expects. Resolve
// through a plain-string / plain-object view of t — the catalog still owns the
// words; only the compile-time key check is relaxed for these lookups (same
// pattern as LevelUpPopup's tKey).
function tKey(t: TFunction<'factions'>, key: string): string {
  const resolve = t as unknown as (k: string) => string
  return resolve(key)
}

function tArr<T>(t: TFunction<'factions'>, key: string): T[] {
  const resolve = t as unknown as (k: string, o: { returnObjects: true }) => unknown
  const value = resolve(key, { returnObjects: true })
  return Array.isArray(value) ? (value as T[]) : []
}

/**
 * InvitationLetterPopup — the #243 faction invitation-letter pop-up. When a
 * character earns faction X's invitation, this surfaces X's recruitment
 * "prospectus" (design: docs/design/invitation/ — the Join Screen UX).
 *
 * ONE adaptive prospectus skinned per faction via the `--faction-<slug>-*`
 * tokens (factionCssVar) — NOT seven bespoke chromes. Bespoke per-faction frame
 * treatments (gilt bevels, ransom cut-letters, terminal glyphs, …) are a
 * follow-up, mirroring the profile-skin epic (#459 default -> #460 per-faction).
 *
 * Copy lives in frontend/src/locales/en/factions.json under
 * `<slug>.invitation.{kicker,headline,pitch,terms[],perks[],cta.{join,joined}}`
 * (writer-editable). a11y matches LevelUpPopup: Escape closes, primary action
 * autofocuses, no focus trap. No literal hex — CSS vars only (CLAUDE.md).
 */

const PAPER = 'var(--color-bg-page)'
const INK = 'var(--color-text-primary)'
const MUTED = 'var(--color-text-secondary)'
const FAINT = 'var(--color-text-tertiary)'
const FONT_DISPLAY = 'var(--font-display)'
const FONT_BODY = 'var(--font-body)'
const FONT_MONO = "'Courier Prime', monospace"

interface Term {
  label: string
  value: string
}

export interface InvitationLetterPopupProps {
  factionSlug: string
  onClose: () => void
}

export default function InvitationLetterPopup({
  factionSlug,
  onClose,
}: InvitationLetterPopupProps) {
  const { t } = useTranslation('factions')
  const navigate = useNavigate()

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Faction accent tokens (theme-aware; flip in dark via index.css cascade).
  const accent = factionCssVar(factionSlug)
  const border = factionCssVar(factionSlug, 'border')
  const name = factionName(factionSlug)

  const base = `${factionSlug}.invitation`
  const termsList = tArr<Term>(t, `${base}.terms`)
  const perksList = tArr<string>(t, `${base}.perks`)

  function handleJoin() {
    // The prospectus ENLIST does NOT join in place — it routes to the faction
    // detail page, whose existing join block owns the actual (one-way) join.
    onClose()
    navigate(`/factions/${factionSlug}`)
  }

  const card = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={tKey(t, `${base}.headline`)}
      style={{
        width: 400,
        maxWidth: '100%',
        boxSizing: 'border-box',
        background: PAPER,
        border: `2px solid ${border}`,
        borderRadius: 12,
        padding: '26px 26px 22px',
        boxShadow: '0 18px 46px -14px rgba(26,18,9,0.5)',
        textAlign: 'left',
        fontFamily: FONT_BODY,
      }}
    >
      {/* masthead: sigil dot + faction name + prospectus overline */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span
          aria-hidden
          style={{
            width: 26,
            height: 26,
            borderRadius: '50%',
            flex: 'none',
            background: accent,
            boxShadow: `0 0 0 3px ${PAPER}, 0 0 0 4px ${border}`,
          }}
        />
        <span
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 17,
            fontWeight: 600,
            letterSpacing: '0.04em',
            color: INK,
          }}
        >
          {name}
        </span>
        <span
          style={{
            marginLeft: 'auto',
            fontFamily: FONT_MONO,
            fontSize: 8,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: FAINT,
          }}
        >
          {t('invitation.prospectus')}
        </span>
      </div>

      {/* kicker */}
      <p
        style={{
          fontFamily: FONT_MONO,
          fontSize: 9,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: accent,
          margin: '0 0 6px',
        }}
      >
        {tKey(t, `${base}.kicker`)}
      </p>

      {/* headline */}
      <h2
        style={{
          fontFamily: FONT_DISPLAY,
          fontStyle: 'italic',
          fontWeight: 500,
          fontSize: 28,
          lineHeight: 1.12,
          color: INK,
          margin: '0 0 10px',
        }}
      >
        {tKey(t, `${base}.headline`)}
      </h2>

      {/* pitch */}
      <p
        style={{
          fontFamily: FONT_BODY,
          fontSize: 12,
          lineHeight: 1.55,
          color: MUTED,
          margin: '0 0 16px',
        }}
      >
        {tKey(t, `${base}.pitch`)}
      </p>

      {/* terms slip */}
      {termsList.length > 0 && (
        <div
          style={{
            border: `1px solid ${border}`,
            borderRadius: 8,
            padding: '12px 14px',
            marginBottom: 16,
            background: factionCssVar(factionSlug, 'light'),
          }}
        >
          <div
            style={{
              fontFamily: FONT_MONO,
              fontSize: 8,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: FAINT,
              marginBottom: 8,
            }}
          >
            {t('invitation.termsHeading')}
          </div>
          {termsList.map((term, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                padding: '5px 0',
                borderTop: idx === 0 ? 'none' : `1px dashed ${border}`,
              }}
            >
              <span
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 9,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: FAINT,
                }}
              >
                {term.label}
              </span>
              <span
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontStyle: 'italic',
                  fontSize: 12,
                  color: INK,
                  textAlign: 'right',
                }}
              >
                {term.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* perks */}
      {perksList.length > 0 && (
        <ul style={{ listStyle: 'none', margin: '0 0 20px', padding: 0 }}>
          {perksList.map((perk, idx) => (
            <li
              key={idx}
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
                marginBottom: 8,
              }}
            >
              <span style={{ color: accent, fontSize: 12, lineHeight: 1.4, flex: 'none' }}>
                &#x2726;
              </span>
              <span
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontStyle: 'italic',
                  fontSize: 12,
                  lineHeight: 1.4,
                  color: INK,
                }}
              >
                {perk}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* CTA row */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button
          type="button"
          autoFocus
          onClick={handleJoin}
          style={{
            flex: 1,
            fontFamily: FONT_BODY,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            fontSize: 11,
            fontWeight: 700,
            padding: '0.7rem 1.2rem',
            border: 'none',
            background: accent,
            color: PAPER,
            cursor: 'pointer',
            boxShadow: `4px 4px 0 ${border}`,
            transition: 'opacity 150ms',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.88')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          {tKey(t, `${base}.cta.join`)}
        </button>
        <button
          type="button"
          onClick={onClose}
          style={{
            fontFamily: FONT_MONO,
            fontSize: 10,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            padding: '0.6rem 0.4rem',
            border: 'none',
            background: 'transparent',
            color: FAINT,
            cursor: 'pointer',
          }}
        >
          {t('invitation.dismiss')}
        </button>
      </div>
    </div>
  )

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        zIndex: 1000,
        background: 'radial-gradient(ellipse at 50% 42%, rgba(26,18,9,0.30), rgba(26,18,9,0.66))',
      }}
    >
      <div onClick={(e) => e.stopPropagation()}>{card}</div>
    </div>
  )
}
