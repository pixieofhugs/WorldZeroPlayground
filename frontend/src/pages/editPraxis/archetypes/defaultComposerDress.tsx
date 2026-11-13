/**
 * THE na COMPOSER DRESS: one declaration for `DefaultCreateCharacter`,
 * `DefaultEditCharacter` and `DefaultProposeTask` (#2993). Paint, not tree
 * (ADR-0090): each keeps its own file and layout. `DefaultEditPraxis` does not
 * import this; its inks go through the `--na-edit-praxis-*` role map (#2672).
 *
 * Ratios are measured in `composerGround.test.ts`,
 * `createCharacterContrast.test.ts` and `__tests__/defaultComposerDressEdges.test.tsx`.
 */
import { factionSpectrumSheet } from '../../../utils/factions'
import { ComposerGround, composerLabelStyle } from './shared'

/* Tiers split by GROUND, not loudness (#2485): FAINT is for the washed sheet,
 * MUTED for the opaque field on it. */

/** Headings, typed values, and the commit button's fill. */
export const INK = 'var(--faction-default-card-text)'
/** Prose on the OPAQUE well — 6.05 light / 5.23 dark. Sub-AA on the sheet. */
export const MUTED = 'var(--faction-default-card-muted)'
/** Labels and quiet type straight on the washed sheet — 4.72 / 4.71. */
export const FAINT = 'var(--faction-default-composer-faint)'
/* Not `--color-danger`: a functional ink takes the faction's card family (#2346). */
export const ALARM = 'var(--faction-default-card-alarm)'
/** The opaque well every field, plate and picker button is drawn on. */
export const FIELD = 'var(--faction-default-composer-field)'
export const HAIR = 'var(--faction-default-composer-hair)'
export const ON_ACCENT = 'var(--faction-default-on-accent)'

/* Every control's edge on this well. NOT `--faction-default-border`: the well
 * equals the sheet in light, so the edge is the only boundary, and that token
 * measures ~1.3:1 (WCAG 1.4.11 asks 3:1). MUTED clears in both themes. One
 * token for every consumer (#2991). */
export const EDGE = MUTED

/* Title face is Lora (--font-display); label face Courier Prime (--font-body).
 * The token names read backwards; not a mistake. */
export const TITLE_FACE = 'var(--font-display)'

/** A section label on the washed sheet. */
export const labelStyle = { color: FAINT }

/* Spectrum frame (#2520): composition belongs to the helper. */
export const sheetStyle = {
  border: '3px solid transparent',
  ...factionSpectrumSheet(),
  boxShadow: '0 16px 40px -24px var(--color-cast-shadow)',
}

/* na's drifting aurora; one element shared by all three surfaces. */
export const composerGround = (
  <ComposerGround
    background="var(--faction-default-aurora)"
    opacity="var(--faction-default-aurora-opacity)"
    filter="var(--faction-default-aurora-filter)"
    mixBlendMode="var(--faction-default-aurora-blend)"
    animated
  />
)

/**
 * Every text field on the three forms. No `outline: none`: the ring is
 * `[data-composer-field]:focus-visible` in index.css (#2266).
 */
export const fieldBox = {
  width: '100%',
  background: FIELD,
  color: INK,
  border: `1px solid ${EDGE}`,
  borderRadius: 10,
  padding: 'var(--space-md)',
  boxSizing: 'border-box',
  fontFamily: 'var(--font-body)',
  fontSize: 'var(--text-content)',
  lineHeight: 1.6,
  resize: 'vertical',
} as const

/** Commit button paint, one step above the label tier (#3073). */
export const primaryStyle = composerLabelStyle({
  fontSize: 'var(--text-xl)',
  border: 'none',
  borderRadius: 10,
  padding: 'var(--space-md) var(--space-xl)',
  color: ON_ACCENT,
  background: INK,
  fontWeight: 700,
})
