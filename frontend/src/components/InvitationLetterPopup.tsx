import { useEffect, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { factionCssVar, factionName } from '../utils/factions'
import { useAuth } from '../auth/AuthContext'
import { chooseFaction } from '../api/factions'
import { extractError } from '../utils/errors'
import { JoinConfirm, type JoinControlSkin, type JoinTarget } from './JoinControl'

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
 * `<slug>.invitation.{headline,pitch,perks[].{name,desc},cta.join}`
 * (writer-editable). a11y matches LevelUpPopup: Escape closes, primary action
 * autofocuses, no focus trap. No literal hex — CSS vars only (CLAUDE.md).
 *
 * #2298 cut the kicker, the prospectus overline and the terms slip, and refilled
 * the slip's box with the perks — so the letter is masthead, headline, pitch,
 * ONE box, CTA. The perks gained a `name` above their `desc`.
 */

const PAPER = 'var(--color-bg-page)'
const INK = 'var(--color-text-primary)'
const MUTED = 'var(--color-text-secondary)'
const FAINT = 'var(--color-text-tertiary)'
const FONT_DISPLAY = 'var(--font-display)'
const FONT_BODY = 'var(--font-body)'
const FONT_MONO = "'Courier Prime', monospace"

/**
 * One perk: the line that says what it gets you, and — on the mechanic row
 * alone — a label-cased name above it.
 *
 * `name` IS OPTIONAL, and that is the shape (#2774). Every letter is written
 * flavour → mechanic → flavour, and the owner ruled that only the mechanic is
 * named: the two flavour names had never been written, and #2298 §2 had already
 * muted them to `--color-text-tertiary` so the real perk would read first.
 * Deleting them is the end of that same gradient rather than a reversal of it.
 * A missing `name` is therefore normal, not a catalog gap to defend against.
 */
interface Perk {
  name?: string
  desc: string
}

/**
 * Which perk states the faction's real backend mechanic (#1874/#2298).
 *
 * ponytail: positional. Every letter is written as flavour → mechanic →
 * flavour, and the catalog carries no flag saying which is which. If a faction
 * ever needs its mechanic somewhere else in the list, the upgrade is a
 * `"mechanic": true` field on the perk object, read here instead of the index.
 */
const MECHANIC_INDEX = 1

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
  // `confirming` stays with the LETTER because its open step draws a second
  // control the trio knows nothing about (see the CTA row below), so the host
  // is the only thing that can know which step it is on. `joining` /
  // `joinError` stay because the host owns the POST — together with the current
  // slug they are the `JoinTarget` handed down. What LEFT is the confirm step
  // itself: the switch sentence, the error slot, the pair and its #646 order
  // are `JoinConfirm`'s now (#2656).
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
  // The same accent, measured safe as INK rather than as a fill (#2619). A
  // separate name because it is a separate token: `accent` still paints the
  // bullet, the box rule and the ENLIST fill, where the bare hue belongs.
  const accentInk = factionCssVar(factionSlug, 'accent-ink')
  const border = factionCssVar(factionSlug, 'border')
  const name = factionName(factionSlug)

  const base = `${factionSlug}.invitation`
  const perksList = tArr<Perk>(t, `${base}.perks`)

  // The prospectus ENLIST commits the join in place (#493). Joining is one-way
  // (ADR-0019), so ENLIST arms a confirm step before actually joining.
  async function join() {
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

  /**
   * The letter's existing paint, handed to the shared control as a typed skin
   * (#2656) — the same object literals the buttons above already were. The
   * letter is not a faction archetype and has no kit; `openStyle` is the ENLIST
   * the CTA row still draws itself, and the other two are the confirm pair's.
   */
  const joinSkin: JoinControlSkin = {
    openStyle: enlistStyle,
    confirmStyle: enlistStyle,
    cancelStyle: dismissStyle,
    proseStyle: {
      fontFamily: FONT_BODY,
      fontSize: 'var(--text-content)',
      lineHeight: 1.5,
      color: MUTED,
      margin: '0 0 var(--space-md)',
    },
    errorStyle: {
      fontFamily: FONT_MONO,
      fontSize: 'var(--text-content)',
      color: 'var(--color-danger)',
      margin: '0 0 var(--space-md)',
    },
  }

  /** Five fields on the faction page; the four the trio reads, built here. */
  const joinTarget: JoinTarget = {
    currentFactionSlug: currentSlug,
    join,
    joining,
    joinError,
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
      {/* masthead: sigil dot + faction name. The `a prospectus` overline that
          sat at the right end left with the kicker (#2298) — both were
          connecting chrome naming the surface the reader is already looking
          at. */}
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
      </div>

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

      {/* Perks, in the box the terms slip used to occupy (#2298) — same border,
          radius, padding and faction tint, and deliberately NO heading: the
          change is removing connecting chrome, not trading one piece for
          another. Each perk stacks its name over its description behind the
          `✦` the loose list below this already used, so a long name cannot
          crush the description into a column. */}
      {perksList.length > 0 && (
        <ul
          style={{
            listStyle: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-md)',
            border: `1px solid ${border}`,
            borderRadius: 8,
            padding: 'var(--space-md) var(--space-lg)',
            margin: '0 0 var(--space-xl)',
            background: factionCssVar(factionSlug, 'light'),
          }}
        >
          {perksList.map((perk, idx) => {
            const mechanic = idx === MECHANIC_INDEX
            return (
              <li key={idx} style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'flex-start' }}>
                {/* eslint-disable-next-line local/no-raw-style-values, local/no-faction-hue-as-ink -- ornament: a four-pointed-star dingbat used as a list bullet, not type. `aria-hidden` because the perk beside it carries the whole meaning, which is also why 1.4.3 does not reach it (#2108). The hue marks the ONE row that states a real mechanic; the flavour rows take a text tier. */}
                <span aria-hidden="true" style={{ color: mechanic ? accent : FAINT, fontSize: 12, lineHeight: 1.4, flex: 'none' }}>
                  &#x2726;
                </span>
                <span>
                  {/* The slip's old label treatment: mono, uppercase, tracked.
                      #2298 §2 as ruled (#2619) put the mechanic's name in the
                      faction ACCENT and the two flavour names in the tertiary,
                      so the true perk read first by colour and not only by
                      weight. #2774 finishes that: the flavour names are gone
                      from the catalog, so this span is the MECHANIC'S and is
                      not rendered at all beside it — a muted name is still a
                      line box competing for the eye, and an empty one is worse
                      than either. `perk.name` absent is the normal shape.

                      `accentInk`, never `accent`. The spine hue as ink here is
                      2.19:1 to 4.46:1 in light and `no-faction-hue-as-ink` is
                      right to block it; the accent-ink family is the measured
                      answer that did not exist when #2298 shipped the neutral.
                      It clears 4.5:1 on this box's tinted ground in both
                      cascades, which is the ground that gates — the bare page is
                      the looser reading. The hue itself keeps the bullet, the
                      box rule and the ENLIST fill: a FILL, not an ink
                      (#1932/#2108, WORLD_ZERO_STYLE.md §3). */}
                  {perk.name && (
                    <span
                      style={{
                        display: 'block',
                        fontFamily: FONT_MONO,
                        fontSize: 'var(--text-md)',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        lineHeight: 1.4,
                        color: accentInk,
                      }}
                    >
                      {perk.name}
                    </span>
                  )}
                  <span
                    style={{
                      display: 'block',
                      fontFamily: FONT_DISPLAY,
                      fontStyle: 'italic',
                      fontSize: 'var(--text-content)',
                      lineHeight: 1.4,
                      color: INK,
                    }}
                  >
                    {perk.desc}
                  </span>
                </span>
              </li>
            )
          })}
        </ul>
      )}

      {/* CTA row — ENLIST arms a one-way join confirm (#493); dismiss defers.
          DISMISS IS NOT CANCEL, which is why this row is still the letter's own
          and only the confirm step is the shared control's: this button closes
          the letter and leaves the invitation standing, while the cancel one
          click further in returns to the pitch. Collapsing them would turn
          "not now" into "never mind" on a letter that survives the dismissal.

          `invitation.dismiss` is top-level, not per-slug, and since #2620 the
          feed's invitation CARD reads it too — the one string that card and
          this letter share, because deferring is one act. Reword it here and
          every surface follows. Nothing ELSE is shared: the card announces the
          letter, it does not preview it, so its `feed:invitationLetter.*` copy
          is meant to differ from the headline, pitch and perks above. */}
      {!confirming ? (
        <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
          <button
            type="button"
            autoFocus
            onClick={() => setConfirming(true)}
            style={joinSkin.openStyle}
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
          {/* `autoFocus` because this step is TALLER than the pitch and both
              live in the one scrim above: focusing the affirmative is what
              scrolls it into view on a short viewport (#2130). */}
          <JoinConfirm
            membership={joinTarget}
            name={name}
            skin={joinSkin}
            joiningLabel={t('detail.join.joining')}
            onCancel={() => setConfirming(false)}
            autoFocus
          />
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
