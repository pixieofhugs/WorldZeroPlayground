import { useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { CharacterOut } from '../api/auth'
import { useAuth } from '../auth/AuthContext'
import { setActiveCharacter } from '../api/me'
import { chooseFaction } from '../api/factions'
import { extractError } from '../utils/errors'
import { factionName } from '../utils/factions'
import FactionSigil from './sigil/FactionSigil'
// The letter is set in Cormorant Garamond, which ships in the lazily-fetched
// faction sheet (#2079). FieldDesk mounts this without dispatching a faction
// archetype, so this chunk has to ask for the sheet itself.
import '../factionFaces'

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
const BG = 'var(--albescent-reveal-surface)'
const INK = 'var(--albescent-reveal-text)'
const ACCENT = 'var(--albescent-reveal-ink)'
const MUTED = 'var(--albescent-reveal-text-muted)'
const SERIF = 'var(--font-faction-vellum)'
const MONO = "'Courier Prime', monospace"
// Structural hairlines. These read as module constants, which is why the colour
// arm never saw them (#2139 ②: a value that reaches the style object as an
// `Identifier` is Gap D wearing paint, and local const-tracking is not worth the
// rule's complexity). What the old comment here got wrong was the reason it gave
// for staying raw — "no token exists". Two of the three DO exist and are
// byte-identical: the reveal block declares `--albescent-reveal-border` at 0.1
// and `-border-faint` at 0.055, `AlbescentSelectCard` and `AlbescentSeal`
// already read them, and the letter is one of the two or three components that
// block was minted for. So this repaints nothing and stops the letter freezing
// its own copy of a value the family owns.
const HAIRLINE = 'var(--albescent-reveal-border)'
const HAIRLINE_FAINT = 'var(--albescent-reveal-border-faint)'
// A DECIDED KEEP, and this one really has no rung: 0.07 sits between the two
// declared alphas and nothing else in the reveal block or outside it draws at
// it. Minting a third rung for one reader would cost the one blocking
// stylesheet bytes (§6, #2019) to name a value with a single site. Albescent is
// always-light by design — these tokens are declared once with no dark half —
// so a frozen black here is not a dark-mode defect. If #2301 gives the reveal a
// dark half, this is the line that will not follow, and the two above will.
const RULE = 'rgba(0,0,0,0.07)'

// i18n key stems under factions:albescent.letter — resolved at render.
//
// The fourth row was "standing / unranked, by design"
// (`terms.standingLabel` + `terms.standingValue`). #1909 CUT both: they are the
// Albescent twin of the `{F}.invitation.terms[3]` standing row the audit cut
// across all seven other letters, which meant three different things by faction
// and was static flavour presented as live standing.
const TERM_KEYS: ReadonlyArray<{ label: string; value: string }> = [
  { label: 'terms.tollLabel', value: 'terms.tollValue' },
  { label: 'terms.skillsLabel', value: 'terms.skillsValue' },
  { label: 'terms.outputLabel', value: 'terms.outputValue' },
]

const PERK_KEYS: ReadonlyArray<string> = [
  'perks.record',
  'perks.duties',
  'perks.witnessed',
]

export interface AlbescentInvitationProps {
  /** The account's roster (every life but the banned ones). */
  lives: CharacterOut[]
  /**
   * Called after a successful join, to refresh what the PARENT owns — the
   * roster. The viewer half is no longer the parent's job: the join POST
   * answers the refreshed `CurrentUser` and this component adopts it (#1383).
   */
  onJoined: () => Promise<void> | void
}

export default function AlbescentInvitation({ lives, onJoined }: AlbescentInvitationProps) {
  const { t } = useTranslation('factions')
  const { applyUser } = useAuth()
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
      //
      // Both POSTs answer a `CurrentUser` (#1383), but only the second is worth
      // keeping: it is built AFTER the defection, so it supersedes the switch's
      // answer. Adopting the first as well would only be overwritten a line
      // later. Neither call is followed by an `/auth/me` any more.
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
    <section style={letter} aria-label={t('albescent.letter.aria')}>
      <div style={innerFrame} />

      {/* letterhead — the engraved mono-caps below are ornament: they draw the
          stationery (wordmark, rule, slip headings), they are not read as copy. */}
      {/* §4a asymmetric-inset exception: ties round DOWN so the wide side gutters
          of the stationery survive instead of flattening into a uniform box. */}
      <div style={{ position: 'relative', padding: 'var(--space-2xl) var(--space-3xl) var(--space-2xl)', textAlign: 'center' }}>
        {/* The unaffiliated spectrum ring, at the cross-hair's old 44px. The
            order has no mark of its own any more (#1891 ruling 6) — the owner's
            call, made knowingly: a letter that arrives before the reveal cannot
            wear an emblem only members would recognise. */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-lg)' }}>
          <FactionSigil slug={ALBESCENT_SLUG} size={44} />
        </div>
        <div style={{
          ...monoCaps, letterSpacing: '0.34em', color: ACCENT, marginBottom: 'var(--space-sm)',
          // eslint-disable-next-line local/no-raw-style-values -- ornament: engraved stationery mono-caps; these draw the letterhead rather than set read copy
          fontSize: 9,
        }}>{t('albescent.letter.wordmark')}</div>
        <div style={{
          ...monoCaps, letterSpacing: '0.28em', marginBottom: 'var(--space-xl)',
          // eslint-disable-next-line local/no-raw-style-values -- ornament: engraved stationery mono-caps; these draw the letterhead rather than set read copy
          fontSize: 8,
        }}>{t('albescent.letter.letterhead')}</div>
        <div style={{ width: 54, height: 1, background: HAIRLINE, margin: '0 auto var(--space-xl)' }} />
        <div style={{
          ...monoCaps, letterSpacing: '0.2em', marginBottom: 'var(--space-md)',
          // eslint-disable-next-line local/no-raw-style-values -- ornament: engraved stationery mono-caps; these draw the letterhead rather than set read copy
          fontSize: 8,
        }}>{t('albescent.letter.handExtended')}</div>
        <h2 style={headline}>{t('albescent.letter.headline')}</h2>
        <p style={pitch}>
          {t('albescent.letter.pitch')}
        </p>
      </div>

      {/* terms slip */}
      <div style={{ position: 'relative', margin: '0 var(--space-3xl)', borderTop: `1px solid ${RULE}`, padding: 'var(--space-xl) 0 var(--space-xs)', textAlign: 'left' }}>
        <div style={{
          ...monoCaps, letterSpacing: '0.22em', marginBottom: 'var(--space-md)',
          // eslint-disable-next-line local/no-raw-style-values -- ornament: engraved stationery mono-caps; these draw the letterhead rather than set read copy
          fontSize: 7,
        }}>{t('albescent.letter.termsHeading')}</div>
        <div style={termsGrid}>
          {TERM_KEYS.map((term) => (
            <div key={term.label} style={{ borderBottom: `1px solid ${HAIRLINE_FAINT}`, padding: 'var(--space-sm) 0' }}>
              <div style={{
                ...monoCaps, letterSpacing: '0.14em',
                // eslint-disable-next-line local/no-raw-style-values -- ornament: engraved stationery mono-caps; these draw the letterhead rather than set read copy
                fontSize: 7,
              }}>{tDynamic(`albescent.letter.${term.label}`)}</div>
              <div style={{ ...serifItalic, fontSize: 'var(--text-content)', color: INK, marginTop: 'var(--space-xs)' }}>{tDynamic(`albescent.letter.${term.value}`)}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 'var(--space-md)', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-xs) var(--space-lg)' }}>
          {PERK_KEYS.map((perk) => (
            <div key={perk} style={{ ...serifItalic, fontSize: 'var(--text-content)', color: ACCENT }}>— {tDynamic(`albescent.letter.${perk}`)}</div>
          ))}
        </div>
      </div>

      {/* answer */}
      <div style={{ position: 'relative', padding: 'var(--space-xl) var(--space-3xl) var(--space-2xl)' }}>
        {joined ? (
          <div style={{ ...serifItalic, fontSize: 'var(--text-title)', color: INK, textAlign: 'center' }}>{t('albescent.letter.cta.joined')}</div>
        ) : (
          <>
            <div style={{
              ...monoCaps, letterSpacing: '0.22em', marginBottom: 'var(--space-md)',
              // eslint-disable-next-line local/no-raw-style-values -- ornament: engraved stationery mono-caps; these draw the letterhead rather than set read copy
              fontSize: 7,
            }}>{t('albescent.letter.whoHeading')}</div>
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
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button type="button" onClick={() => void handleAccept()} disabled={submitting} style={acceptButton}>
                {submitting ? t('albescent.letter.cta.busy') : t('albescent.letter.cta.join')}
              </button>
              <span style={{ ...serifItalic, fontSize: 'var(--text-content)', color: ACCENT }}>{t('albescent.letter.reassurance')}</span>
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

// --- letter styles (Albescent vellum tokens; always-light by design) ---------

const letter: CSSProperties = {
  position: 'relative',
  maxWidth: 620,
  background: BG,
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
const termsGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 'var(--space-xs) var(--space-xl)',
}
const lifeChip: CSSProperties = {
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  textAlign: 'left',
  width: '100%',
  padding: 'var(--space-md) var(--space-2xl) var(--space-md) var(--space-lg)',
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
  fontSize: 'var(--text-content)',
  padding: 'var(--space-md) var(--space-2xl)',
}
