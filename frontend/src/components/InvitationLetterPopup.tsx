import { useEffect, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { factionCssVar, factionName } from '../utils/factions'
import { useAuth } from '../auth/AuthContext'
import { chooseFaction } from '../api/factions'
import { extractError } from '../utils/errors'

// The per-faction key path (`<slug>.invitation.*`) is runtime-dynamic, so it
// isn't one of the compile-time key literals the scoped t() expects. Resolve
// through a plain-string / plain-object view of t — the catalog still owns the
// words; only the compile-time key check is relaxed for these lookups (same
// pattern as LevelUpPopup's tKey).
function tKey(t: TFunction<'factions'>, key: string): string {
  const resolve = t as unknown as (k: string) => string
  return resolve(key)
}

/** The shared label for a terms row that carries none of its own, or `''`. */
function sharedTermLabel(t: TFunction<'factions'>, index: number): string {
  const key = SHARED_TERM_LABELS[index]
  return key ? tKey(t, key) : ''
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
  /** Absent on the rows whose label is shared — see {@link SHARED_TERM_LABELS}. */
  label?: string
  value: string
}

/**
 * The terms slip's row labels, by position, where the label is the SAME for
 * every faction (#1911).
 *
 * Row 0 is the toll, and each house names it in its own voice — "dues", "cover
 * charge", "oath of fealty", "handshake". Rows 1 and 2 named the same two
 * things fourteen different ways, so the audit collapsed them; the rows now
 * carry a `value` only and take their label from here. Positional because the
 * slip is a positional array — a row's own `label` still wins where it has one,
 * which is what keeps row 0 (and any row a later letter adds) unaffected.
 */
const SHARED_TERM_LABELS: readonly (string | null)[] = [
  null,
  'invitation.skillsLabel',
  'invitation.outputLabel',
]

export interface InvitationLetterPopupProps {
  factionSlug: string
  onClose: () => void
}

export default function InvitationLetterPopup({
  factionSlug,
  onClose,
}: InvitationLetterPopupProps) {
  const { t } = useTranslation('factions')
  const { user, applyUser } = useAuth()
  const currentSlug = user?.character?.faction_slug
  const isSwitch = !!currentSlug && currentSlug !== 'na'
  const [confirming, setConfirming] = useState(false)
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)

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

  // The prospectus ENLIST commits the join in place (#493). Joining is one-way
  // (ADR-0019), so ENLIST arms a confirm step before actually joining.
  async function handleConfirm() {
    setJoining(true)
    setJoinError(null)
    try {
      // Same as the faction page's join: membership moves the faction slug and
      // the capability flags together, and this is also what clears the letter
      // out of `user.character.invitations` so the watcher stops re-opening the
      // prospectus. The POST answers that whole viewer now (#1383), so adopting
      // it does the job the follow-up `/auth/me` used to.
      applyUser(await chooseFaction(factionSlug))
      onClose() // advance the queue; watcher keys the popup per slug so state resets
    } catch (err) {
      setJoinError(extractError(err, t('detail.errors.join')))
      setJoining(false)
    }
  }

  const enlistStyle: CSSProperties = {
    flex: 1,
    fontFamily: FONT_BODY,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    fontSize: 'var(--text-md)',
    fontWeight: 700,
    padding: 'var(--space-md) var(--space-lg)',
    border: 'none',
    background: accent,
    color: PAPER,
    cursor: 'pointer',
    boxShadow: `4px 4px 0 ${border}`,
    transition: 'opacity 150ms',
  }
  const dismissStyle: CSSProperties = {
    fontFamily: FONT_MONO,
    fontSize: 'var(--text-base)',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    padding: 'var(--space-sm) var(--space-sm)',
    border: 'none',
    background: 'transparent',
    color: FAINT,
    cursor: 'pointer',
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
        padding: 'var(--space-xl)',
        boxShadow: '0 18px 46px -14px var(--color-cast-shadow)',
        textAlign: 'left',
        fontFamily: FONT_BODY,
      }}
    >
      {/* masthead: sigil dot + faction name + prospectus overline */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
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
            fontSize: 'var(--text-content)',
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
            fontSize: 'var(--text-md)',
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
          fontSize: 'var(--text-md)',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          // The kicker is 11px type on the prospectus paper, so it takes a text
          // tier (#2108). The hue keeps the ENLIST fill, the border and the
          // perk bullet below — the roles it was measured for. As an ink here
          // it ran 2.19:1 (Ephemerists) to 4.46:1 (UA) in light.
          color: FAINT,
          margin: '0 0 var(--space-sm)',
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
          fontSize: 'var(--text-title)',
          lineHeight: 1.12,
          color: INK,
          margin: '0 0 var(--space-md)',
        }}
      >
        {tKey(t, `${base}.headline`)}
      </h2>

      {/* pitch */}
      <p
        style={{
          fontFamily: FONT_BODY,
          fontSize: 'var(--text-content)',
          lineHeight: 1.55,
          color: MUTED,
          margin: '0 0 var(--space-lg)',
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
            padding: 'var(--space-md) var(--space-lg)',
            marginBottom: 'var(--space-lg)',
            background: factionCssVar(factionSlug, 'light'),
          }}
        >
          <div
            style={{
              fontFamily: FONT_MONO,
              fontSize: 'var(--text-md)',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: FAINT,
              marginBottom: 'var(--space-sm)',
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
                gap: 'var(--space-md)',
                padding: 'var(--space-xs) 0',
                borderTop: idx === 0 ? 'none' : `1px dashed ${border}`,
              }}
            >
              <span
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 'var(--text-md)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: FAINT,
                }}
              >
                {term.label ?? sharedTermLabel(t, idx)}
              </span>
              <span
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontStyle: 'italic',
                  fontSize: 'var(--text-content)',
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
        <ul style={{ listStyle: 'none', margin: '0 0 var(--space-xl)', padding: 0 }}>
          {perksList.map((perk, idx) => (
            <li
              key={idx}
              style={{
                display: 'flex',
                gap: 'var(--space-md)',
                alignItems: 'flex-start',
                marginBottom: 'var(--space-sm)',
              }}
            >
              {/* eslint-disable-next-line local/no-raw-style-values, local/no-faction-hue-as-ink -- ornament: a four-pointed-star dingbat used as a list bullet, not type. `aria-hidden` because the perk beside it carries the whole meaning, which is also why 1.4.3 does not reach it (#2108). */}
              <span aria-hidden="true" style={{ color: accent, fontSize: 12, lineHeight: 1.4, flex: 'none' }}>
                &#x2726;
              </span>
              <span
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontStyle: 'italic',
                  fontSize: 'var(--text-content)',
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

      {/* CTA row — ENLIST arms a one-way join confirm (#493); dismiss defers. */}
      {!confirming ? (
        <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
          <button
            type="button"
            autoFocus
            onClick={() => setConfirming(true)}
            style={enlistStyle}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.88')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            {tKey(t, `${base}.cta.join`)}
          </button>
          <button type="button" onClick={onClose} style={dismissStyle}>
            {t('invitation.dismiss')}
          </button>
        </div>
      ) : (
        <div>
          <p style={{ fontFamily: FONT_BODY, fontSize: 'var(--text-content)', lineHeight: 1.5, color: MUTED, margin: '0 0 var(--space-md)' }}>
            {isSwitch
              ? t('detail.join.confirmSwitch', { faction: name, current: factionName(currentSlug as string) })
              : t('detail.join.confirm', { faction: name })}
          </p>
          {joinError && (
            <p style={{ fontFamily: FONT_MONO, fontSize: 'var(--text-content)', color: 'var(--color-danger)', margin: '0 0 var(--space-md)' }}>
              {joinError}
            </p>
          )}
          <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
            <button
              type="button"
              autoFocus
              onClick={() => void handleConfirm()}
              disabled={joining}
              style={{ ...enlistStyle, cursor: joining ? 'not-allowed' : 'pointer' }}
            >
              {t('mobile.confirm')}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={joining}
              style={dismissStyle}
            >
              {t('detail.join.cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        // Short viewports (#2130), the same contract #1947 gave LevelUpPopup:
        // the scrim is the scroller, and the card centres with `margin: auto`
        // rather than `align-items: center`. A centred flex item taller than
        // its scroll container overflows off BOTH ends and the top end cannot
        // be scrolled to, which is precisely what the report showed — the
        // masthead cut off above, ENLIST cut off below, and neither reachable.
        // Auto margins centre while there is free space and collapse to 0 when
        // there isn't, so a full prospectus stays readable end to end. Both
        // steps live in this one scrim, so the confirm button the reporter
        // also lost is reachable by the same rule; its `autoFocus` is what
        // scrolls it into view when the taller confirm step swaps in.
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: 'var(--space-xl)',
        overflowY: 'auto',
        overscrollBehavior: 'contain',
        zIndex: 1000,
        background: 'var(--color-overlay-strong)',
      }}
    >
      <div style={{ margin: 'auto' }} onClick={(e) => e.stopPropagation()}>
        {card}
      </div>
    </div>
  )
}
