/**
 * THE na COMPOSER DRESS — one declaration, three surfaces (#2993).
 *
 * `DefaultCreateCharacter`, `DefaultEditCharacter` and `DefaultProposeTask` all
 * stand on the same stock: a `ComposerSheet` in `--faction-default-card-bg`
 * with the drifting aurora washed under the content column, framed by the
 * spectrum. Each had spelled the same eleven constants, the same sheet frame,
 * the same ground element, the same field box and the same commit paint —
 * COMMENTS INCLUDED — and by the time the third arrived the copies had already
 * drifted: the create form's field edge was `--faction-default-border` at
 * 1.31:1 while the other two used the measured `--faction-default-card-muted`,
 * which is one accessibility defect living in one of three drawings of one
 * idea (#3023 left it open by name; importing this closes it).
 *
 * ## This is PAINT, not tree (ADR-0090)
 *
 * What is forbidden is one component branching on a slug to render nine trees.
 * Three archetypes reading one set of tokens is the opposite move: each keeps
 * its own file, its own tree and its own layout, and stops re-authoring a
 * colour it does not own. `frontend/CLAUDE.md`'s boundary is the same sentence
 * from the other side — "getting smaller by not repeating each other is not the
 * same as merging".
 *
 * It sits beside `shared.tsx` rather than under `characterPaths/` or
 * `proposeTask/` because the chassis is `editPraxis`'s and this is the na kit's
 * dress FOR that chassis. `shared.tsx` itself is untouched: the chassis takes
 * paint from its callers and must not carry a faction's.
 *
 * ## What is NOT here
 *
 * `DefaultEditPraxis` is the reference implementation and does not import this.
 * Its inks come through the `--na-edit-praxis-*` role map (#2672) rather than
 * from the token names directly, so its `INK` and `MUTED` are different
 * SPELLINGS of the same colours — folding them together would mean either
 * losing the role prefix or forcing one on two surfaces that do not declare it.
 * That is a real difference, and a shared module that hid it would be worse
 * than the duplication.
 *
 * Per-surface inks stay in the surface: the propose form's `-card-notice`
 * (#1609's approach rung) has exactly one consumer, and a token exported for
 * one reader is a config value that never changes.
 *
 * ## Where the ratios are
 *
 * Nothing here is measured here. `composerGround.test.ts` owns the two inks on
 * the washed sheet; `createCharacterContrast.test.ts` owns `MUTED` on the well
 * and the alarm bare on the sheet; `__tests__/defaultComposerDressEdges.test.tsx`
 * owns {@link EDGE} on both sides for all three consumers.
 */
import { factionSpectrumSheet } from '../../../utils/factions'
import { ComposerGround, composerLabelStyle } from './shared'

/* THE TIER SPLIT IS BY GROUND, NOT BY LOUDNESS (#2485), and the names read
 * backwards because of it: FAINT is the ink for the aurora-WASHED sheet and
 * MUTED is the ink for the opaque field laid on top of it. If you are choosing
 * between them, ask what is behind the type, not how quiet it should sound. */

/** Headings, typed values, and the commit button's fill. */
export const INK = 'var(--faction-default-card-text)'
/** Prose on the OPAQUE well — 6.05 light / 5.23 dark. Sub-AA on the sheet. */
export const MUTED = 'var(--faction-default-card-muted)'
/** Labels and quiet type straight on the washed sheet — 4.72 / 4.71. */
export const FAINT = 'var(--faction-default-composer-faint)'
/* NOT `--color-danger`, and this is a fix rather than a preference (#2346,
 * #1302): a shared functional ink inside a faction frame takes that faction's
 * own card family, measured on the frame's ground. */
export const ALARM = 'var(--faction-default-card-alarm)'
/** The opaque well every field, plate and picker button is drawn on. */
export const FIELD = 'var(--faction-default-composer-field)'
export const HAIR = 'var(--faction-default-composer-hair)'
export const ON_ACCENT = 'var(--faction-default-on-accent)'

/* EVERY CONTROL'S EDGE ON THIS WELL, and it is NOT `--faction-default-border`.
 *
 * That token is `rgba(0,0,0,0.12)` by day and `rgba(255,255,255,0.12)` by
 * night, and on THIS ground it draws nothing a boundary can be read from. The
 * well is `--faction-default-composer-field`, which in light is `#fffdf9` —
 * byte for byte the sheet it is laid on, 1.00:1 — so the hairline is the ONLY
 * thing separating a control from its background, and it measures 1.31:1
 * against the well and 1.30:1 against the worst aurora stop (1.45 / 1.43 in
 * dark). WCAG 1.4.11 asks 3:1 of exactly that edge.
 *
 * `--faction-default-card-muted` is the quiet MARK rung of the same family and
 * clears in both cascades against both adjacent grounds — 6.05 / 5.23 against
 * the well, 4.30 / 3.27 against the worst aurora stop. NOTHING WAS MINTED:
 * #2992 already certifies this exact token on this exact well one layer up, as
 * TEXT, at the same two numbers.
 *
 * ONE TOKEN FOR EVERY CONSUMER on purpose — the fields, the portrait picker's
 * button, the faction row's plate, the confirm's cancel key, the propose form's
 * wells — because two different hairlines on one sheet read as a defect
 * whichever of them is the accessible one. The `-border` token keeps every
 * other consumer it has elsewhere; what is written here is that it is not an
 * EDGE on this stock. #2991 found it, and #2993 finished it: the create form
 * drew the hairline for one release because the fix lived in a file its lane
 * could not edit, which is the argument for this module in one sentence. */
export const EDGE = MUTED

/* The design's title face is Lora (--font-display); the label face is Courier
 * Prime (--font-body), which is what `composerLabelStyle` already defaults to.
 * The token names read backwards here and that is not a mistake. */
export const TITLE_FACE = 'var(--font-display)'

/** A section label on the washed sheet. */
export const labelStyle = { color: FAINT }

/* THE SHEET'S FRAME IS THE SPECTRUM (#2520) — a 3px transparent border with the
   ramp painted into the border box under it, the same `border-box` idiom
   `DefaultTaskCard`, `DefaultPraxisCard`, `DefaultSeal` and `DefaultEditPraxis`
   all wear. Only the width is stated here; the composition belongs to the
   helper, because the ramp has to be appended to all three of the sheet's
   background lists and saying that at a fourth call site is how one of them
   gets the arity wrong. */
export const sheetStyle = {
  border: '3px solid transparent',
  ...factionSpectrumSheet(),
  boxShadow: '0 16px 40px -24px var(--color-cast-shadow)',
}

/* na's drifting aurora, clipped to the sheet by `ComposerSheet`'s own
   `overflow: hidden` (#1028). `ep-drift` is a CLASS, so the motion stays behind
   the shared `prefers-reduced-motion` guard (#1003).

   ONE ELEMENT, not three constructions of one idea: the three surfaces cannot
   drift apart, and a reader who changes the wash changes it everywhere it is
   the same wash. */
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
 * Every text field on the three forms.
 *
 * NO `outline: none` (#2266, `WORLD_ZERO_STYLE.md` §"a suppression with nothing
 * in its place is the defect"). The ring is
 * `[data-composer-field]:focus-visible` in `index.css`, drawn in `currentColor`
 * so it inherits the measurement this box's own ink already has — and an inline
 * suppression here would beat that stylesheet on every field of all three
 * surfaces at once. Mounts pair it with the `data-composer-field` attribute.
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

/** The commit button's paint, minus the busy cursor each form adds. */
export const primaryStyle = composerLabelStyle({
  border: 'none',
  borderRadius: 10,
  padding: 'var(--space-md) var(--space-xl)',
  color: ON_ACCENT,
  background: INK,
  fontWeight: 700,
})
