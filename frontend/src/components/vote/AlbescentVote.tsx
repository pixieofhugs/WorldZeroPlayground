import { useEffect, useState, useSyncExternalStore, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { VoteUIProps } from './VoteUI'
import { useVote } from './useVote'
import { VoteLoginGate, VoteError } from './VoteShell'

/**
 * Albescent vote UI (#843) — FERROFLUID. Ported from the vote-stamps design
 * handoff (`AlbescentVote`), not re-imagined — ADR-0049. It is the eighth widget; until now Albescent fell through to
 * {@link import('./DefaultVote').default} and nobody noticed, because the
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
 * therefore has no `albescent` entry, and this widget printed the plain numeral
 * `reframeLabel` returns in its place. #2166 took the whole caption row off
 * every skin, so nothing under the dots reads a ladder now — the divergence
 * survives only as the absence of an entry in the registry.
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
            //
            // `-dot-fill`, not the `-dot-ring` the other two vote surfaces read
            // (#2608). Same token until light forked: this blob composites on
            // `.alb-prism`'s multiply sweep rather than the flat na card, where
            // the ring's value reads 2.70:1. The name is `default`-family
            // because `CSS_KEY` maps albescent -> default (ADR-0039 / #783).
            backgroundColor: reached ? 'transparent' : 'var(--faction-default-dot-fill)',
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
              /* The plain form, not `chrome.rateAria`: #783 took Albescent's
                 tier words away because a vote word is a tell, so this widget
                 has no `{{label}}` to interpolate and the shared sentence would
                 read "Rate 3 — ". `rateAriaPlain` is the same string the mobile
                 widget carried under `chrome.mobile.rateAria`; #1911 collapsed
                 that pair into one key rather than leaving a faction slug on
                 it. */
              aria-label={t('chrome.rateAriaPlain', { value })}
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

      {/* The caption — a bare numeral, since Albescent ships no tier words
          (#783) — and its `· your vote` tag stood here. #2166 struck the row on
          all nine skins: printing the digit the dots already draw was the
          clearest case of it. */}

      <VoteError error={error} color="var(--color-danger)" />
    </div>
  )
}
