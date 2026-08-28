import { useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { CharacterOut } from '../api/auth'
import { useAuth } from '../auth/AuthContext'
import { setActiveCharacter } from '../api/me'
import { chooseFaction } from '../api/factions'
import { extractError } from '../utils/errors'
import { factionName, factionSheet } from '../utils/factions'
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
 * surveyor's-mark sigil, a slip and the "Accept the order" CTA. #2298 emptied
 * the slip of its terms and refilled it with the perks, as name + description.
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

// THE LETTER TAKES THE na CARD'S REGISTER (#2632). The vellum block these five
// constants used to read — the vellum register, a pure-white sheet by day —
// is deleted: owner ruling, the white aesthetic is purged and Albescent commits
// entirely to the prism. Three ink tiers, in the vocabulary every na surface
// already uses, so nothing here is a hue Albescent owns (ADR-0027, ADR-0048).
const INK = 'var(--faction-default-card-text)'
const ACCENT = 'var(--faction-default-card-accent)'
const MUTED = 'var(--faction-default-card-muted)'
const SERIF = 'var(--font-faction-vellum)'
const MONO = "'Courier Prime', monospace"
// The stationery's two hairline strengths. `HAIRLINE` is the na card's own line
// token; `HAIRLINE_FAINT` is that line at just over half strength — ORNAMENT,
// the same shape `AlbescentSecretPlaceholder`'s `ink()` washes take, and it owes
// no ratio: it draws the inner frame, the slip's top rule and the perk rows'
// under-rules, none of which is read. Mixed DOWN FROM THE LINE rather than
// alpha'd from black, so both strengths flip with the card instead of vanishing
// into a near-black sheet after dark.
const HAIRLINE = 'var(--faction-default-card-line)'
const HAIRLINE_FAINT = 'color-mix(in srgb, var(--faction-default-card-line) 55%, transparent)'

// The whole terms slip stood here as `TERM_KEYS` — toll, skills, output, and
// before them a fourth "standing" row #1909 cut. #2298 cut the remaining three
// across all eight letters and gave the slip's box to the perks; the owner's
// copy pass then cut two of the three perks, so one row is left and it is the
// mechanic. The `mechanic` flag that picked it out of three went with them —
// nothing to pick from. `perks.record` is rendered by name below, no map.

interface AlbescentInvitationProps {
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
    <section className="alb-prism" style={letter} aria-label={t('albescent.letter.aria')}>
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
        {/* The wordmark takes the letterhead's old bottom margin. `letterhead`
            ("Faction no. 7 · enlistment · in confidence") and `handExtended`
            ("A hand is extended —") stood on either side of the rule below:
            #2298 cut both, as Albescent's twins of the overline and the kicker
            the other seven letters lost in the same pass. */}
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

      {/* Perks, in the slip's box (#2298). Same rule, gutters and padding the
          "terms, plainly" slip carried; no heading, and the perks stack their
          name over their description rather than sitting in the loose em-dash
          row that used to run under the term grid. */}
      <ul style={{ position: 'relative', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', margin: '0 var(--space-3xl)', borderTop: `1px solid ${HAIRLINE_FAINT}`, padding: 'var(--space-xl) 0 var(--space-xs)', textAlign: 'left' }}>
        <li style={{ borderBottom: `1px solid ${HAIRLINE_FAINT}`, padding: '0 0 var(--space-sm)' }}>
          {/* The slip's label treatment — mono, uppercase, tracked — but at a
              read size, not the 7px engraving: a perk name is copy now, where a
              term label was stationery. It takes the order's own accent: it is
              the mechanic, and there is no flavour row left to rank it against. */}
          <div style={{
            ...monoCaps, letterSpacing: '0.14em', fontSize: 'var(--text-md)', color: ACCENT,
          }}>{t('albescent.letter.perks.record.name')}</div>
          <div style={{ ...serifItalic, fontSize: 'var(--text-content)', color: INK, marginTop: 'var(--space-xs)' }}>{t('albescent.letter.perks.record.desc')}</div>
        </li>
      </ul>

      {/* answer */}
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

// --- letter styles (the na card's register; the whole block flips with it) ---

/**
 * THE LETTER WEARS THE PRISM (#2632) — the only one of the four reveal surfaces
 * that does, and the reason is the decision rule: it is the one that reads
 * `factionSheet()`. The sheet arrives as the `--faction-default-card-sheet`
 * TRIPLE, so `.alb-prism` on this same element repaints it with the ground the
 * task and praxis cards already wear (#2550, epic #2496 ruling 9 as reversed).
 * A custom property set by a class is visible to that element's own inline
 * `var()`, so the class and the spread belong together on the `<section>`.
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
  // FLAT, and deliberately not `factionSheet()`. A chip sits INSIDE the letter,
  // which is `.alb-prism`, so reading the triple here would inherit the sheet
  // and paint the same bloom a second time inside each row.
  background: 'var(--faction-default-card-bg)',
  border: `1px solid ${HAIRLINE_FAINT}`,
  cursor: 'pointer',
}
const acceptButton: CSSProperties = {
  ...serifItalic,
  cursor: 'pointer',
  border: `1px solid ${INK}`,
  background: INK,
  // The inverted pair — the card's ink as the ground, the card's stock as the
  // ink. A swap does not change a contrast ratio, so this is the na card's own
  // measured pairing read backwards.
  color: 'var(--faction-default-card-bg)',
  fontSize: 'var(--text-content)',
  padding: 'var(--space-md) var(--space-2xl)',
}
