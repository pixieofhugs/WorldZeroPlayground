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

/**
 * The ceiling, defensively read (#2399).
 *
 * `albescent_level_required` defaults to 0 on the wire for an unseeded era, and
 * a literal 0 here would bar *every* life — printing "New Game+" at a whole
 * roster. A non-positive bar therefore means "no ceiling known" rather than
 * "the ceiling is zero". This can only ever be over-permissive in the UI: the
 * server enforces the real ceiling at the door regardless, so the worst case is
 * a life offered a join it is then refused, not a rule quietly skipped.
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
 * Lives that may actually accept — answerable, and still below the ceiling.
 *
 * #2399 added the level half. Albescent is a New Game+ faction: the life that
 * earned the order the door is exactly the life that may not walk through it,
 * so a life AT `albescentLevelRequired` is excluded here and listed by
 * {@link barredLives} instead. This is the only MAXIMUM level test in the
 * frontend — every other one is a floor.
 */
export function eligibleLives(
  lives: CharacterOut[],
  albescentLevelRequired: number,
): CharacterOut[] {
  const bar = ceiling(albescentLevelRequired)
  return answerable(lives).filter((life) => life.level < bar)
}

/**
 * Answerable lives the ceiling has closed the door on (#2399).
 *
 * Shown, not hidden. A player whose only high-level life is the one that earned
 * the unlock would otherwise see a letter with nothing in it and no reason
 * given; these rows carry "Available only for New Game+" so the refusal is
 * legible before it is attempted.
 */
export function barredLives(
  lives: CharacterOut[],
  albescentLevelRequired: number,
): CharacterOut[] {
  const bar = ceiling(albescentLevelRequired)
  return answerable(lives).filter((life) => life.level >= bar)
}

// Albescent vellum tokens (index.css). THE LETTER FLIPS (#2301): this comment
// used to say the vars were identical in both themes and the letter never went
// dark. Since #2301 the reveal block has a `[data-theme="dark"]` half whose
// values are the na card's own — nothing below changes, because every colour
// here was already a token and the cascade does the rest.
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
// `RULE` — a third hairline, frozen at rgba(0,0,0,0.07) — stood here. The note
// on it was right about its own terms and right about what would end it: "a
// frozen black here is not a dark-mode defect … if #2301 gives the reveal a
// dark half, this is the line that will not follow". #2301 did, so it would
// have been a black rule on a near-black sheet at 1.02:1 — drawn, and invisible.
// It did not need the third rung it was refused, either: the canvas draws the
// letter's `border-top` and its `border-bottom` at the SAME strength after dark,
// so the terms slip's top rule is `HAIRLINE_FAINT` now like the term rows below
// it. By day that is 1.17:1 → 1.13:1 at one site.

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
  const { user, applyUser } = useAuth()
  // Dynamic term/perk keys are data-driven; resolve them through a plain
  // string view of `t` (the typed union can't see the interpolated key).
  const tDynamic = t as unknown as (key: string) => string
  // The ceiling is the server's number, never a literal here (#2399) — same
  // idiom as `second_character_level_required` on the locked-dossier copy.
  const albescentLevelRequired = user?.albescent_level_required ?? 0
  const choices = eligibleLives(lives, albescentLevelRequired)
  const barred = barredLives(lives, albescentLevelRequired)
  const [selectedId, setSelectedId] = useState<number | null>(choices[0]?.id ?? null)
  const [joined, setJoined] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasAlbescentLife = lives.some((life) => life.faction_slug === ALBESCENT_SLUG)
  // Invitation already answered before this visit, or nobody to say anything to.
  // A roster of only barred lives still gets the letter (#2399): it is the one
  // surface that can explain why the door is shut, and going silent there reads
  // as a bug rather than a rule.
  if (!joined && (hasAlbescentLife || choices.length + barred.length === 0)) return null

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
      <div style={{ position: 'relative', margin: '0 var(--space-3xl)', borderTop: `1px solid ${HAIRLINE_FAINT}`, padding: 'var(--space-xl) 0 var(--space-xs)', textAlign: 'left' }}>
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
              {/* Lives the ceiling has closed the door on (#2399). A <div>, not
                  a <button>: there is nothing to press, and an aria-disabled
                  control would still take focus to say "no". The refusal is
                  printed on the row instead of being discovered by trying. */}
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
