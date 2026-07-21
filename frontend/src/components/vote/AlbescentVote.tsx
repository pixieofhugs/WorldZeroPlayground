import { useEffect, useState, useSyncExternalStore, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { VoteUIProps } from './VoteUI'
import { useVote } from './useVote'
import { VoteLoginGate, VoteSummary } from './VoteShell'
import { reframeLabel } from './voteReframes'

/**
 * Albescent vote UI (#843) — FERROFLUID. Ported from the design handoff
 * (`.design-sync/praxis-cards/design_handoff_faction_vote_stamps/`,
 * `AlbescentVote`). It is the eighth widget; until now Albescent fell through to
 * {@link import('./UnaffiliatedVote').default} and nobody noticed, because the
 * fallback renders something plausible.
 *
 * It wears the SAME neutral spectrum as unaffiliated — that is the point, and the
 * rule the whole manifest is built on (see `factions/albescent.ts`): a surface
 * that repaints Albescent in its own colours puts it back in the rainbow and
 * un-hides the society. What Albescent adds is a FLOURISH over that structure,
 * exactly like the praxis card's drift (ADR-0048): each dot is a blob of
 * ferrofluid that slowly morphs between polygon lobe counts — circle → triangle →
 * square → pentagon → hexagon — on a shared clock, offset per dot. Someone
 * already looking sees it; a glance reads a row of dots.
 *
 * Colour is all `--faction-default-*` / `--spectrum-*`, flipped by the
 * [data-theme] cascade (never a `dark` ternary), so the design's dark-only
 * hairline drop-shadows are deliberately dropped rather than branched in JS.
 *
 * TIER WORDS — a deliberate divergence from the design. The handoff gives
 * Albescent the same word ladder as unaffiliated (so-so … brilliant). The repo
 * removed Albescent's vote voice on lore grounds (#783/#232, ADR-0048): a task
 * filed under Albescent used to label its tiers in the society's own words for
 * every voter, revealed or not, which was the loudest tell left. `voteReframes`
 * therefore has no `albescent` entry and {@link reframeLabel} returns the plain
 * numeral. That resolver is the single source of the decision, so this widget
 * calls it rather than hardcoding either ladder.
 *
 * MOTION. Two separate things move, and both are gated:
 *  - the rising-wave bob reuses the shared `.spectrum-dot--reached` class, which
 *    lives behind `prefers-reduced-motion: no-preference` in index.css;
 *  - the morph is a JS clock, so it reads the media query directly and FREEZES.
 * Stilled, every dot holds a distinct static polygon and still fills with its
 * slice of the spectrum — the control reads and votes exactly the same.
 */

/** Rising blob diameters (px) and their gap — ornament geometry, §4a leaves these raw. */
const DOT_SIZES = [22, 24, 26, 28, 30]
const GAP = 14

/**
 * The row is ONE rainbow, windowed. Each blob paints a `SPAN`-wide gradient
 * pushed left by everything before it, so the spectrum runs continuously across
 * the whole row (and across the gaps) instead of each dot showing an isolated
 * slice. SPAN is the row's exact laid-out width, so the button boxes must stay
 * exactly `size` wide with `GAP` between them or the illusion breaks.
 */
const SPAN = DOT_SIZES.reduce((total, size) => total + size, 0) + (DOT_SIZES.length - 1) * GAP

/** Lobe counts the blob morphs through. 64 ≈ a circle at this radius. */
const LOBE_SEQUENCE = [64, 3, 4, 5, 6]
/** Clock tick, and how long one lobe count is held. */
const TICK_MS = 120
const MORPH_STEP_MS = 1700
/** The morph IS the effect: a long eased clip-path tween between lobe counts. */
const MORPH_TRANSITION =
  'clip-path .85s cubic-bezier(.65,0,.35,1), -webkit-clip-path .85s cubic-bezier(.65,0,.35,1), transform .18s'

/**
 * A 48-point `polygon()` approximating a regular `sides`-gon inscribed in the
 * box. Ported as-is from the handoff: a fixed point count is what lets CSS
 * interpolate between two different lobe counts at all — polygons only tween
 * when they have the same number of vertices, so a triangle here is a 48-point
 * shape whose points happen to lie on three straight edges.
 */
function polyClipN(sides: number): string {
  const POINTS = 48
  const effectiveSides = sides < 3 ? 64 : sides
  const segment = (2 * Math.PI) / effectiveSides
  const points: string[] = []
  for (let index = 0; index < POINTS; index++) {
    const theta = (index / POINTS) * Math.PI * 2 - Math.PI / 2
    const angle = (((theta % segment) + segment) % segment) - segment / 2
    const radius = Math.cos(Math.PI / effectiveSides) / Math.cos(angle)
    points.push(
      `${(50 + 48 * radius * Math.cos(theta)).toFixed(1)}% ${(50 + 48 * radius * Math.sin(theta)).toFixed(1)}%`,
    )
  }
  return `polygon(${points.join(',')})`
}

/** matchMedia-backed reduced-motion flag; defaults to stilled when absent (SSR/test). */
function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => true,
  )
}

/** 120ms morph clock; frozen (never ticks) when `enabled` is false. */
function useMorphTick(enabled: boolean): number {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!enabled) return
    const id = setInterval(() => setTick((value) => value + 1), TICK_MS)
    return () => clearInterval(id)
  }, [enabled])
  return tick
}

export default function AlbescentVote({
  praxisId,
  currentValue,
  points,
  totalVotes,
}: VoteUIProps) {
  const { t } = useTranslation('votes')
  const { user, selected, saving, error, vote } = useVote(praxisId, currentValue)
  const [hovered, setHovered] = useState(0)
  const reducedMotion = usePrefersReducedMotion()
  const tick = useMorphTick(!reducedMotion)

  if (!user) {
    return <VoteLoginGate />
  }

  const active = hovered || selected
  // Plain numerals, not a word ladder — see the TIER WORDS note above.
  const caption = active ? reframeLabel('albescent', active) : t('unaffiliated.idle')
  const step = Math.floor((tick * TICK_MS) / MORPH_STEP_MS)
  let offset = 0

  return (
    <div>
      <div
        onMouseLeave={() => setHovered(0)}
        style={{ display: 'flex', gap: GAP, alignItems: 'center' }}
      >
        {DOT_SIZES.map((size, index) => {
          const value = index + 1
          const reached = active >= value
          const picked = selected === value
          const top = value === 5
          const glow = `var(--spectrum-glow-${value})`
          const positionX = -offset
          offset += size + GAP
          const clip = polyClipN(LOBE_SEQUENCE[(step + index) % LOBE_SEQUENCE.length])
          const dotStyle: CSSProperties = {
            width: size,
            height: size,
            clipPath: clip,
            WebkitClipPath: clip,
            transition: MORPH_TRANSITION,
            // Unreached blobs sit as a faint neutral fill (the spectrum has not
            // reached them yet); reached ones window the shared rainbow.
            backgroundColor: reached ? 'transparent' : 'var(--faction-default-dot-ring)',
            backgroundImage: reached ? 'var(--faction-default-rainbow)' : 'none',
            backgroundRepeat: 'no-repeat',
            backgroundSize: `${SPAN}px ${size}px`,
            backgroundPositionX: `${positionX}px`,
            // A clipped blob has no border-box to cast a box-shadow from, so the
            // glow has to be a drop-shadow filter that follows the silhouette.
            filter: reached
              ? `drop-shadow(0 0 4px color-mix(in srgb, ${glow} 67%, transparent))${
                  top ? ` drop-shadow(0 0 7px color-mix(in srgb, ${glow} 53%, transparent))` : ''
                }`
              : 'none',
            // Per-dot rising-wave tempo (consumed by .spectrum-dot--reached).
            ['--spec-dur' as string]: `${1.9 - value * 0.18}s`,
            ['--spec-delay' as string]: `${value * 0.12}s`,
            ['--spec-bounce' as string]: `${-2 - value * 1.6}px`,
          }
          return (
            <button
              key={value}
              disabled={saving}
              onClick={() => void vote(value)}
              onMouseEnter={() => setHovered(value)}
              aria-label={t('chrome.albescent.rateAria', { value })}
              aria-pressed={picked}
              style={{
                border: 'none',
                background: 'transparent',
                padding: 0,
                // Exactly `size` wide — the continuous-spectrum windowing above
                // depends on it. Height grows to a 44px touch target instead;
                // the blob floats centred inside.
                width: size,
                minHeight: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: saving ? 'default' : 'pointer',
                transform: picked ? 'scale(1.14)' : 'none',
                transition: 'transform 140ms',
              }}
            >
              <span className={reached ? 'spectrum-dot--reached' : undefined} style={dotStyle} />
            </button>
          )
        })}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 'var(--space-sm)',
          marginTop: 'var(--space-sm)',
          minHeight: 20,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--faction-default-card-font)',
            fontSize: 'var(--text-content)',
            letterSpacing: '0.04em',
            color: active ? 'var(--faction-default-vote-on)' : 'var(--faction-default-vote-off)',
            transition: 'color 140ms',
          }}
        >
          {caption}
        </span>
        {selected > 0 && (
          <span
            style={{
              fontSize: 'var(--text-xs)',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--faction-default-vote-off)',
            }}
          >
            {`· ${t('unaffiliated.tag')}`}
          </span>
        )}
      </div>

      <VoteSummary
        selected={selected}
        points={points}
        totalVotes={totalVotes}
        error={error}
        theme={{
          muted: 'var(--faction-default-card-muted)',
          accent: 'var(--faction-default-card-accent)',
          accentFont: 'var(--faction-default-card-font)',
          errorColor: 'var(--color-danger)',
          avgLetterSpacing: '0.04em',
        }}
      />
    </div>
  )
}
