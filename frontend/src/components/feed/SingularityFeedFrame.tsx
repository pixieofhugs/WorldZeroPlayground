import type { CSSProperties } from 'react'
import { factionName } from '../../utils/factions'
import { factionRoleVar, factionRoleVars } from '../../utils/factionRoles'
import { factionBodyVars } from '../../utils/factionBodyFace'
import SingularityLamps from '../factionMarks/SingularityLamps'
import { FeedRowSkinContext, type FeedRowSkin } from './feedRowSkin'
import type { FeedFrameProps } from './feedFrameProps'

/**
 * Singularity feed CHASSIS — the session window (surface #12,
 * SPEC-faction-ui-profile.md; epic #1192 / #1202). The middle of #1194's three
 * layers: `FeedItemSlot` owns the archive, the body is faction-blind; this owns
 * chrome only and PLACES the finished `archive` node.
 *
 * Two tiers: the WINDOW BAR (lamps, faction name, hex handle — ornament,
 * `aria-hidden`) and the PROMPT LINE (kicker, tag, time, dismiss — every
 * functional slot). Never `aria-hidden` the whole strip: the dismiss control is
 * the only keyboard/SR route to the archive (#1243 §10/§11). Lamps are the
 * kit's `SingularityLamps` with the LED trio (#1979).
 *
 * Dark in BOTH themes (WORLD_ZERO_STYLE §6), so the shared body's `--color-*`
 * inks are repointed for the subtree (see `ON_CHASSIS_INK`), all existing
 * Singularity tokens — no `dark ?` branch, no new tokens.
 *
 * Copy: the neutral `feed` catalog verbatim (epic #1192); CSS lowercases or
 * tracks it but never rewrites. The bar shows `names.singularity` (#1864).
 */

const MONO = 'var(--sg-feed-face)' /* Share Tech Mono */

const BG = 'var(--faction-singularity-term-bg)' /* the chassis */
const CHROME = 'var(--faction-singularity-term-chrome)' /* the window bar */
const PANEL = 'var(--faction-singularity-term-panel)'
const READOUT = 'var(--faction-singularity-term-readout)' /* a boxed well */
const INK = 'var(--faction-singularity-term-ink)'
const BRIGHT = 'var(--faction-singularity-term-bright)'
const DIM = 'var(--faction-singularity-term-dim)'
const BLUE = 'var(--faction-singularity-term-blue)'
const BORDER = 'var(--faction-singularity-term-border)'
const HAIR = 'var(--faction-singularity-term-hair)'
const NOTICE = 'var(--faction-singularity-card-notice)'

/**
 * Global inks were measured on a near-white page; here they'd be ~1:1.
 * `--color-danger` → NOTICE: #dc2626 is 4.02:1 on the terminal, failing 4.5:1
 * text (as for the duel seal, #1168).
 *
 * `--color-text-on-accent` is NOT repointed: accept buttons paint it on
 * `--badge-duel` (white 4.83:1, near-black 3.92:1). The monogram disc was
 * fixed in the body instead (#1252, `-on-fill`).
 */
const ON_CHASSIS_INK = {
  '--color-text-primary': BRIGHT,
  '--color-text-secondary': INK,
  '--color-text-tertiary': DIM,
  '--color-border': HAIR,
  '--color-danger': NOTICE,
  '--color-bg-surface': PANEL,
  '--color-bg-surface-alt': READOUT,
} as CSSProperties

/**
 * The actor name is a `--faction-*` token, out of `ON_CHASSIS_INK`'s reach;
 * blue is 3.67:1 here, the phosphor clears 10:1 (#1252). Asked for directly,
 * not via a `var(--x, …)` wrapper (#2675): `feedRowInk.test.tsx` asserts the
 * exact rendered token for all nine chassis from one table.
 */
const ROW_SKIN = { ink: { actor: factionRoleVar('singularity', 'accent') } } satisfies FeedRowSkin

/** Terminal label voice — every small mark on the chrome speaks in it. */
const LABEL: CSSProperties = {
  fontFamily: MONO,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
}

/**
 * The kind's process handle: a stable hash of the kicker (one process per
 * kind). Not derived from the relative time, which ticks and would mutate it.
 */
function processHandle(kicker: string): string {
  let hash = 0x9e37
  for (let index = 0; index < kicker.length; index += 1) {
    hash = (hash * 31 + kicker.charCodeAt(index)) & 0xffff
  }
  return `0x${hash.toString(16).toUpperCase().padStart(4, '0')}`
}

export default function SingularityFeedFrame({
  kicker,
  time,
  tag,
  archive,
  children,
}: FeedFrameProps) {
  return (
    <article
      style={{
        ...factionBodyVars("singularity"), ...factionRoleVars('singularity', 'sg-feed'),
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
        borderRadius: 8,
        border: `1px solid ${BORDER}`,
        background: BG,
        color: INK,
        fontFamily: MONO,
        boxShadow: 'var(--faction-singularity-term-shadow)',
      }}
    >
      {/* Static raster only: the `.sg-scan` sweep animates `top`, too costly
          across a page of feed cards. */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 3,
          background:
            'repeating-linear-gradient(0deg, var(--faction-singularity-term-scan) 0 1px, transparent 1px 3px)',
        }}
      />

      {/* TIER 1 — the window bar. Ornament only; it holds no control. */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-sm)',
          padding: 'var(--space-xs) var(--space-md)',
          background: CHROME,
          borderBottom: `1px solid ${HAIR}`,
        }}
      >
        <SingularityLamps />
        <span
          aria-hidden="true"
          style={{
            ...LABEL,
            fontSize: 'var(--text-base)',
            color: DIM,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {factionName('singularity')}
        </span>
        <span
          aria-hidden="true"
          style={{ ...LABEL, fontSize: 'var(--text-base)', color: BLUE, marginLeft: 'auto' }}
        >
          {processHandle(kicker)}
        </span>
      </div>

      {/* TIER 2 — all four chrome slots. `color: BRIGHT` tints the archive
          node (`currentColor`). */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-sm)',
          flexWrap: 'wrap',
          padding: 'var(--space-xs) var(--space-md)',
          borderBottom: `1px dashed ${HAIR}`,
          color: BRIGHT,
        }}
      >
        <span aria-hidden="true" style={{ color: BLUE, flexShrink: 0 }}>
          {'>'}
        </span>
        <span
          style={{
            ...LABEL,
            fontSize: 'var(--text-md)',
            color: BRIGHT,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {kicker}
        </span>
        {tag && (
          /* Boxed lowercase readout; the word itself is unchanged (ADR-0070 "Still waiting"). */
          <span
            style={{
              ...LABEL,
              fontSize: 'var(--text-base)',
              textTransform: 'lowercase',
              letterSpacing: '0.08em',
              color: BLUE,
              background: READOUT,
              border: `1px solid ${BORDER}`,
              padding: '0 var(--space-xs)',
              flexShrink: 0,
            }}
          >
            {tag}
          </span>
        )}
        <span style={{ ...LABEL, fontSize: 'var(--text-base)', color: DIM, marginLeft: 'auto' }}>
          {time}
        </span>
        {archive}
      </div>

      {/* The shared body on repointed ink; `ROW_SKIN` carries the one
          `--faction-*` ink the cascade can't. */}
      <div style={{ position: 'relative', zIndex: 2, ...ON_CHASSIS_INK }}>
        <FeedRowSkinContext.Provider value={ROW_SKIN}>{children}</FeedRowSkinContext.Provider>
      </div>
    </article>
  )
}
