import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import FactionSigil, { factionSigilRing } from './sigil/FactionSigil'
import { factionName, isKnownFaction } from '../utils/factions'

/**
 * Skinnable faction credential card (#271). Color + font only — one structure,
 * re-skinned per faction via the `--faction-<slug>-card-*` token contract mapped
 * onto local `--fc-*` vars. Reused verbatim by the FieldDesk life-cards (#274) and
 * the creation live-preview (#273). Dark mode is automatic via the cascade; no
 * hardcoded hex, no `dark ? a : b`.
 */

export interface CredentialCardProps {
  displayName: string
  handle: string
  factionSlug?: string | null
  level: number
  score: number
  avatarUrl?: string | null
  /** Card width in px (default 266 per mock). */
  size?: number
  /** Slight tilt for the FieldDesk roster (degrees). */
  rotation?: number
  /**
   * Stand the portrait ring STILL, for a mount whose surround already moves
   * (#3024). One mount passes it: the profile header, where the card sits
   * inside an identity band carrying `.alb-profile-edge` — a 9s travelling
   * ramp. Two spectra at two speeds on one object is the doubling #2519 spent a
   * PR undoing, and `AlbescentProfileBody`'s docblock excludes that band from
   * the moving set for the same reason.
   *
   * It suppresses the CLASS, which is the only lever: `.alb-moves
   * .spectrum-dial::before` carries no `:empty` guard the way the rule's
   * selector does, so there is nothing else for a frame mount to fail to match.
   * The RAMP comes back inline in its place — `.spectrum-dial` carries the
   * resting conic as well as the reach (`spectrumClasses.test.tsx` pins that
   * from the stylesheet side), so dropping the class alone would take the
   * rainbow hoop off every na and Albescent profile header rather than standing
   * it still. Which is why this is a prop and not a caller wrapping the card:
   * still is not gone.
   *
   * Named for what it means and not for the class: nothing outside is asked to
   * know the spelling of a mark this card owns.
   */
  stillRing?: boolean
  /** Upload affordance for the creation preview. */
  onAvatarClick?: () => void
}

/* This used to be a private slug→key table listing the factions with a bespoke
 * `--faction-<key>-card-*` set — a fourth hand-maintained copy of CSS_KEY, and
 * it drifted exactly as you would expect: it still claimed `albescent` had a
 * token set for a whole commit after that set was deleted (#783), painting an
 * Albescent credential from `--faction-albescent-card-bg` and friends, which no
 * longer resolve to anything.
 *
 * `isKnownFaction` answers the identical question — "does this slug have a
 * resolvable theme?" — and every entry in the old table mapped a slug to itself,
 * so this is a behaviour-preserving swap for the six themed factions, for `na`,
 * and for unknown slugs. It cannot drift again, because there is now one table.
 */

interface Skin {
  bg: string
  text: string
  accent: string
  muted: string
  font: string
  border: string
}

function skinFor(slug: string | null | undefined): Skin | null {
  // null = the neutral field treatment: na, factionless, unknown — and
  // albescent, which is registered but deliberately unthemed (#783).
  if (!isKnownFaction(slug)) return null
  const v = (prop: string) => `var(--faction-${slug}-card-${prop})`
  return {
    bg: v('bg'),
    text: v('text'),
    accent: v('accent'),
    muted: v('muted'),
    font: v('font'),
    border: `2px solid ${v('accent')}`,
  }
}

const NEUTRAL: Skin = {
  bg: 'var(--color-bg-surface-alt)',
  text: 'var(--color-text-primary)',
  accent: 'var(--color-text-primary)',
  muted: 'var(--color-text-secondary)',
  font: 'var(--font-display)',
  border: '1px solid var(--color-border-strong)',
}

export default function CredentialCard({
  displayName,
  handle,
  factionSlug,
  level,
  score,
  avatarUrl,
  size = 266,
  rotation = 0,
  stillRing = false,
  onAvatarClick,
}: CredentialCardProps) {
  const { t } = useTranslation('common')
  const skinned = skinFor(factionSlug)
  const skin = skinned ?? NEUTRAL
  const name = displayName.trim() || t('credential.fallbackName')

  const cardStyle: CSSProperties = {
    // Local skin vars consumed by descendants.
    ['--fc-bg' as string]: skin.bg,
    ['--fc-text' as string]: skin.text,
    ['--fc-accent' as string]: skin.accent,
    ['--fc-muted' as string]: skin.muted,
    ['--fc-font' as string]: skin.font,
    position: 'relative',
    width: size,
    boxSizing: 'border-box',
    background: 'var(--fc-bg)',
    color: 'var(--fc-text)',
    border: skin.border,
    boxShadow: '0 16px 34px var(--color-cast-shadow)',
    // §4a asymmetric-inset exception: 18/20/16 is optical trim on a near-uniform
    // inset, so the tie rounds DOWN to one rung rather than inverting the shape.
    padding: 'var(--space-lg)',
    textAlign: 'center',
    overflow: 'hidden',
    transform: rotation ? `rotate(${rotation}deg)` : undefined,
    transition: 'background 220ms ease, border-color 220ms ease, color 220ms ease',
  }

  return (
    <div style={cardStyle}>
      {/* eyebrow: @handle. The "CREDENTIAL" / "UNAFFILIATED" kicker that used to
          sit opposite it is gone (#1626) — it named the object the reader is
          already holding, and its unaffiliated variant said a second time what
          the footer sigil says. */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 'var(--text-md)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--fc-muted)',
        }}
      >
        <span>@{handle}</span>
      </div>

      {/* portrait ring. Rendered as a <button> only when it's an upload affordance —
          on FieldDesk the whole card is already a button, and button-in-button is
          invalid DOM. */}
      <div style={{ display: 'flex', justifyContent: 'center', margin: 'var(--space-lg) 0 var(--space-md)' }}>
        {(() => {
          const ringStyle: CSSProperties = {
            position: 'relative',
            // The portrait is the card's subject, not one of its fields (#1626).
            width: 136,
            height: 136,
            borderRadius: '50%',
            padding: 'var(--space-xs)',
            boxSizing: 'border-box',
            // Unaffiliated wears the spectrum ring (all paths open, ADR-0039);
            // themed factions keep their accent hoop. The unaffiliated half is
            // `.spectrum-dial` below — the conic cut of the na spectrum, said
            // once in index.css — so only the themed hoop is declared here.
            //
            // ...and inline for the ONE mount that opts out of the class, which
            // is the same ramp by the same name rather than a second paint: the
            // class is the reach AND the resting conic, so a still ring has to
            // carry the second one itself (`stillRing`). It is the spelling
            // `DefaultAvatar` and `CharacterSwitcherSheet` already use for a
            // hoop no dresser may reach.
            background: skinned
              ? 'var(--fc-accent)'
              : stillRing
                ? 'var(--faction-default-rainbow-conic)'
                : undefined,
            border: 'none',
            cursor: onAvatarClick ? 'pointer' : 'default',
            boxShadow: '0 4px 14px var(--color-cast-shadow)',
          }
          /* THE na RING IS CLASSED, NOT INLINED (#2992, the class #2497 minted).
           * It was the last inline `var(--faction-default-rainbow-conic)` in the
           * kit: #2497's sweep censused the `Default*` archetype files, and this
           * card is not one — it is the shared component all nine of them mount,
           * so no census row looked at it.
           *
           * The class is conditional and the ramp always was: this ring only
           * takes the conic when `skinned` is false, which for Albescent it is —
           * that slug is registered but deliberately unthemed, `CSS_KEY.albescent
           * === "default"` (#783). So an Albescent credential takes the rainbow,
           * and `.alb-moves .spectrum-dial` (two classes, so it wins from
           * wherever it is written) sets it turning wherever an Albescent wrapper
           * is the ancestor — the creation preview, the edit preview and the
           * profile header. `.alb-moves .spectrum-dial > *` lifts the face back
           * over the rim, so the portrait is not painted over. No new CSS: both
           * halves already ship, the `::before` behind `motion.ornament.css`'s
           * `prefers-reduced-motion` gate.
           *
           * The FieldDesk life-cards mount this card under `.alb-desk`, not
           * `.alb-moves`, so that roster's rings stand still — the paint moved,
           * nothing else.
           *
           * ...AND THE PROFILE HEADER IS THE ONE MOUNT THAT OPTS OUT (#3024).
           * "Wherever an `.alb-moves` wrapper is the ancestor" was one surface
           * too many: on that header the card sits INSIDE the identity band,
           * which is already a travelling ramp, so the sentence above put a 9s
           * edge and a 46s ring on one object. `stillRing` is that mount saying
           * so — see the prop, and `albescentSpectraMove`'s dial census for the
           * row that keeps a second one from arriving unnoticed. */
          const ringClass = skinned || stillRing ? undefined : 'spectrum-dial'
          const inner = (
            <div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                overflow: 'hidden',
                background: 'var(--fc-bg)',
              }}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : null}
            </div>
          )
          // The ring has no text, so its label is its whole accessible name —
          // and it only ever opens PortraitPicker's file input. It used to
          // promise a drop target that has never existed here (no onDrop, no
          // onDragOver), which handed a screen-reader user an instruction the
          // control cannot accept (#1263). One string, both consumers, so the
          // tooltip and the accessible name cannot drift apart.
          const uploadLabel = t('credential.uploadTitle')
          return onAvatarClick ? (
            <button
              type="button"
              onClick={onAvatarClick}
              aria-label={uploadLabel}
              title={uploadLabel}
              className={ringClass}
              style={ringStyle}
            >
              {inner}
            </button>
          ) : (
            <div className={ringClass} style={ringStyle}>{inner}</div>
          )
        })()}
      </div>

      {/* name */}
      <div
        style={{
          fontFamily: 'var(--fc-font)',
          fontStyle: skinned ? undefined : 'italic',
          fontSize: 'var(--text-title)',
          lineHeight: 1.05,
          color: 'var(--fc-text)',
          overflowWrap: 'anywhere',
        }}
      >
        {name}
      </div>

      {/* No bio slot. A two-line clamp could only ever show the first sentence
          of a 500-character field, so the bio moved to the profile's ② About
          block, where it is read whole (#1626, `archetypes/profileSkin.tsx`). */}

      {/* footer: sigil + level + score */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 'var(--space-md)',
          borderTop: '1px solid var(--fc-muted)',
          marginTop: 'var(--space-lg)',
          paddingTop: 'var(--space-md)',
        }}
      >
        {/* The faction is the sigil now — the name is spoken, never printed
            (#1626). `role="img"` + the catalog name is the whole accessible
            name: it makes the mark a labelled image rather than decoration, so
            a screen reader still gets "Cozy Coven" where a sighted reader gets
            the mark. Unaffiliated and unknown slugs are not a hole — they get
            `FactionSigil`'s spectrum `DefaultSigil` and the name `na` resolves
            to. The card stays slug-blind: which sigil belongs to which slug is
            `FactionSigil`'s dispatch to answer, including albescent's — and
            since #1658 the hoop is the same question, so it is asked the same
            way. `factionSigilRing` answers `undefined` for everyone but the one
            mark that rings itself, which is how the card keeps its accent
            without a branch it would have to maintain. */}
        <span
          role="img"
          aria-label={factionName(factionSlug)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 'none',
            width: 42,
            height: 42,
            borderRadius: '50%',
            border: `2px solid ${factionSigilRing(factionSlug) ?? 'var(--fc-accent)'}`,
            background: 'transparent',
          }}
        >
          <FactionSigil slug={factionSlug} size={28} />
        </span>
        <span
          style={{
            fontSize: 'var(--text-lg)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--fc-muted)',
          }}
        >
          {t('credential.lvl', { level })}
        </span>
        <span style={{ fontFamily: 'var(--fc-font)', fontSize: 'var(--text-content)', color: 'var(--fc-accent)' }}>
          {score}
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-md)',
              marginLeft: 'var(--space-xs)',
              color: 'var(--fc-muted)',
              letterSpacing: '0.06em',
            }}
          >
            {t('credential.pts')}
          </span>
        </span>
      </div>
    </div>
  )
}
