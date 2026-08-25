import type { CSSProperties } from 'react'
import { factionName } from '../../utils/factions'
import { factionRoleVar, factionRoleVars } from '../../utils/factionRoles'
import SingularityLamps from '../factionMarks/SingularityLamps'
import { FeedRowSkinContext, type FeedRowSkin } from './feedRowSkin'
import type { FeedFrameProps } from './feedFrameProps'

/**
 * Singularity activity-feed CHASSIS — the session window (surface #12,
 * SPEC-faction-ui-profile.md; epic #1192 / #1202, design project 19d52c65,
 * `Singularity Comment + Update Cards.dc.html`).
 *
 * ## What this layer is, and what it is not
 *
 * The middle of the three layers #1194 split apart. `FeedItemSlot` above owns
 * the ARCHIVE — the ✕, the touch swipe, the immediate write, the six-second
 * undo strip — and is faction-blind; the body below (`FeedRowContent` or one of
 * the three companions) is faction-blind too. This file owns the physical
 * chrome and nothing else, and it is the only layer the dress issue rewrote.
 * Nothing here re-implements a behaviour: `archive` arrives as a finished node
 * and is PLACED.
 *
 * ## The window
 *
 * Two tiers, which is how the sheet draws it:
 *
 *   1. the WINDOW BAR — three lamps, the process name, a right-aligned hex
 *      handle. Pure ornament, `aria-hidden` piece by piece.
 *   2. the PROMPT LINE — `>` then the kicker, the tag as a boxed readout, the
 *      time, and the dismiss control. Every functional slot lives here.
 *
 * The three lamps are `SingularityLamps` from the mark kit, not this file's own
 * drawing. They were, until #1979 — a local `Lamp` filled with `DIM` / `BLUE` /
 * `BRIGHT`, which is green, blue, green, while the faction's other four window
 * bars drew the `--faction-singularity-led-*` trio. Two palettes on one
 * faction's window, reported by eye. Read against THIS docblock as the issue
 * asked: nothing here ever argued for the chassis inks as lamps. What the
 * closing section argues is that no NEW token be minted, and the LED trio was
 * already shipped and already named, so the trio satisfies it and the local
 * constants were drift. They keep every other job they had on this bar.
 *
 * The split is deliberate and not merely decorative. #1243 §10/§11 record the
 * two mistakes available at this seam: the boot strip used to be `aria-hidden`
 * **in one piece**, which cannot hold the dismiss control (that control is the
 * whole keyboard and screen-reader route to the archive — swipe is touch-only),
 * and a functional control must never land under an ornament. So the ornament
 * tier holds no control and the control tier holds no ornament.
 *
 * ## Why the shared body's ink is repointed for the subtree
 *
 * WORLD_ZERO_STYLE §6: Singularity is dark in BOTH themes. The shared body
 * paints itself from the global `--color-*` set, which was measured against the
 * app's near-white page, so on this chassis its light-theme halves land at
 * roughly 1:1 — the headline, the action clause and every companion's decline
 * button were dark ink on near-black. This is the case the style doc names
 * ("Singularity had to, being near-black in both themes where the shared
 * component assumed light-in-light"), and the same repoint `ON_CHASSIS_INK`
 * makes on `SingularityPraxisDetail`. Every value is an existing Singularity
 * token, so the `[data-theme="dark"]` cascade still flips the phosphor
 * underneath and no `dark ?` branch appears anywhere.
 *
 * A repoint rather than a fork, because the body is shared and faction-blind by
 * contract — and rather than a bag of ink props, because none of the four slots
 * is "the one that was meant": the whole body is on the wrong ground here.
 *
 * ## Copy: none of the sheet's words ship
 *
 * Epic #1192 — the Unaffiliated sheet is the copy spec and the other eight are
 * visual chassis only. `kicker`, `tag` and `time` arrive already resolved from
 * the neutral `feed` catalog and are printed verbatim. The costume lowercases
 * the tag and letter-spaces the kicker; it mutilates no word, the same call
 * `SingularityPraxisDetail`'s `LABEL` makes in the other direction.
 *
 * The window bar's title used to be `feed:frame.singularity.masthead`
 * ("DISPATCH · SIGNAL ONLINE"), which F2 authored for this slot. #1864 ruled
 * the whole `frame.{F}.masthead` family down to `names.{F}` and #1910 deleted
 * it, so the bar names the faction whose window it is — the one string a
 * terminal chrome bar can carry without becoming copy. This file now names NO
 * copy key at all.
 *
 * ## Always dark, in both themes
 *
 * No `dark ?` branch. `--faction-singularity-term-*` is a two-theme contract
 * whose halves are BOTH near-black — the cascade flips the phosphor, never the
 * chassis (WORLD_ZERO_STYLE §6). The sheet ships no light inversion and none is
 * invented here. Nothing new was declared in `index.css`: every value below is a
 * Singularity token that already shipped with the v2 task card.
 */

const MONO = 'var(--sg-feed-face, var(--faction-singularity-card-font))' /* Share Tech Mono */

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
 * The repoint the shared body gets. See the docblock — the global inks were
 * chosen against a near-white page and this chassis is near-black in both
 * themes, so their light halves are unreadable here.
 *
 * `--color-danger` goes to the sheet-measured NOTICE for the same reason #1168
 * routed the duel seal's forfeit BODY there: `#dc2626` measures 4.02:1 on the
 * terminal, which clears a 3:1 heading floor and fails a 4.5:1 text one, and
 * every danger-inked string in a feed companion (the withdraw affordance, the
 * error line) is text at label tier.
 *
 * `--color-text-on-accent` is deliberately NOT repointed. The companions' accept
 * buttons paint it on `--badge-duel` (#dc2626), where white is 4.83:1 and the
 * near-black `-on-accent` would be 3.92:1 — repointing it to fix one pairing
 * would break the other. The place it was genuinely wrong on this chassis was
 * `FeedRowContent`'s monogram disc, which is why that repoint could never have
 * been the fix: one token, two pairings, and a cascade override cannot tell them
 * apart. #1252 settled it in the body instead — the disc is a faction FILL, so
 * its glyph takes `--faction-singularity-on-fill` (5.17:1 light, 7.41:1 dark)
 * rather than a global neutral (5.17:1 light but 2.54:1 dark). The 1.74:1 this
 * note used to quote was white on `--faction-singularity-card-accent`, the
 * phosphor; the disc is painted from `--faction-singularity`, the blue.
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
 * The one body ink the cascade repoint above cannot reach (#1252). The actor's
 * name is `--faction-singularity` — the BLUE, a `--faction-*` token rather than
 * a `--color-*` one, so `ON_CHASSIS_INK` never sees it — and blue on the
 * terminal is 3.67:1 in light against the 4.5:1 an 18px/700 name owes. The
 * phosphor this whole chassis speaks in clears it twice over (10.88:1 light,
 * 11.18:1 dark).
 */
/*
 * THE ACCENT IS ASKED FOR DIRECTLY, NOT THROUGH THE PREFIX (#2675). This value
 * does not land on an element of this chassis: it travels through
 * `FeedRowSkinContext` into the shared body, and `feedRowInk.test.tsx` asserts
 * the rendered `color:var(--faction-{slug}-…)` for all nine chassis from ONE
 * parameterized table. A `var(--x, …)` wrapper changes that string, and every
 * faction lane would have to edit one shared, contended row to keep it green.
 * `factionRoleVar` returns the identical token and asks for it by role.
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
 * The card KIND's process handle, drawn right-aligned on the window bar as the
 * sheet draws it. Ornament, never copy and never an item identifier: it is a
 * stable hash of the kind label, so every "Task completed" card prints the same
 * handle — which is what a terminal would do, one process per kind.
 *
 * It is NOT derived from the timestamp, on purpose. A relative time ticks over
 * ("2h ago" → "3h ago"), so a handle mixed with it would mutate under the
 * reader — an identifier that changes while identifying nothing is a lie the
 * sheet never told.
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
        ...factionRoleVars('singularity', 'sg-feed'),
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
      {/*
        The standing raster — a fixed scrim, no motion. The travelling `.sg-scan`
        sweep the task card and the detail page carry is deliberately ABSENT
        here: it animates `top`, a layout property, and a feed is a long list
        where twenty simultaneous copies is a per-frame cost a single card never
        pays. The sheet draws one card; the feed draws a page of them.
      */}
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

      {/*
        TIER 2 — the prompt line. All four chrome slots the contract names live
        here (`kicker`, `tag`, `time`, `archive`); `color: BRIGHT` on the row is
        what tints the archive node, which paints in `currentColor`.
      */}
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
          /*
            The sheet draws its status marks as boxed lowercase readouts on the
            blue well. The catalog's word is printed unchanged — `lowercase` is
            CSS costume, not a rewrite — and the only tag that exists today is
            "Still waiting": an archived invite or challenge stays unanswered
            (ADR-0070).
          */
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

      {/* The printout — the shared body, unchanged, on repointed ink. The
          cascade carries the `--color-*` half; `ROW_SKIN` carries the one ink
          that is a `--faction-*` token and so cannot ride it. */}
      <div style={{ position: 'relative', zIndex: 2, ...ON_CHASSIS_INK }}>
        <FeedRowSkinContext.Provider value={ROW_SKIN}>{children}</FeedRowSkinContext.Provider>
      </div>
    </article>
  )
}
