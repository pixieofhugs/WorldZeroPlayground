import { useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BRASS_RULE,
  GOLD,
  OCHRE,
  METAL_SIGILS,
  chamferMount,
  chamferSheet,
} from '../factionMarks/ephemeristsPlate'
import type { VoteUIProps } from './VoteUI'
import { useVote } from './useVote'
import { VoteLoginGate, VoteError } from './VoteShell'
import { VOTE_REFRAMES } from './voteReframes'

/**
 * Ephemerists vote UI (#1207): an alchemical metals ladder, five discs lead →
 * platinum on a stepped night plate. The metals are the scale and the tier
 * words (#1638); each disc's `aria-label` names its metal.
 *
 * The resting plate is still (#2142): rank reads from the count of lit discs.
 * `burstStep` is the pitch of the cast dial, thrown only on a cast.
 *
 * A fixed night surface in both themes: on a light plate the metals read
 * 1.0–1.3:1 (measured at the tokens in CSS). Motion is reduced-motion-gated
 * CSS classes (`.eph-metal-*`, `.eph-cast-*`), decoration only.
 */

/**
 * Tap target and haloed top rank; never below 44 (WCAG). Exported so the test
 * can check `.eph-metal-row`'s `226px` in CSS against them (#2315).
 */
export const DISC_SIZE = 44
export const TOP_DISC_SIZE = 50
/** Five discs, before gaps or pad: the sheet's `226px`. */
export const DISC_RUN = DISC_SIZE * 4 + TOP_DISC_SIZE

const TIERS = VOTE_REFRAMES['ephemerists'].tiers

/**
 * Every burst layer is boxed at `size + BURST_MARGIN`, overhanging the rim by
 * half in every direction; the plate's gap and padding are sized from it.
 */
const BURST_MARGIN = 24
/** How far the planets orbit past rank 5's edge. */
const FILING_ORBIT = 13
/** Chamfer leg of the plate; `chamferSheet` derives the sheet's leg (#2150). */
const PLATE_STEP = 7

/**
 * The seven planetary metals orbiting rank 5 (#2142): the ladder's five plus
 * two it doesn't grade. System-font astro symbols, no webfont; ornament only.
 */
const PLANETS = ['♄', '♀', '☽', '☉', '☿', '♃', '♂']
/** Twelve mounts cycling the seven: a clock face. */
const PLANET_COUNT = 12

const CAST_MOTES = 9
const CAST_SPARKS = 12

/**
 * The cast burst (#2142), ~1.6s: halo, two shock rings, a ruled dial whose
 * tick pitch is `metal.burstStep` (the rank, stated once), motes and sparks.
 *
 * Every layer rests at `opacity: 0`; its keyframes live in the gated
 * `motion.ornament.css`, so no-motion readers see only the state change. Paint
 * is inline so none of it reaches critical CSS (#2073). Stateless: a new
 * strike remounts by key. Exported for its test (click-only otherwise).
 */
export function CastBurst({
  metal,
  size,
}: {
  metal: (typeof METAL_SIGILS)[number]
  size: number
}) {
  const radius = size / 2
  const reach = BURST_MARGIN / 2
  const layer: CSSProperties = {
    position: 'absolute',
    left: -reach,
    top: -reach,
    width: size + BURST_MARGIN,
    height: size + BURST_MARGIN,
    borderRadius: '50%',
    pointerEvents: 'none',
    opacity: 0,
  }
  // Ticks only in a rim band (74–94%). `black` is an alpha stencil, not a colour.
  const dialMask =
    'radial-gradient(closest-side, transparent 0 74%, black 76%, black 92%, transparent 94%)'

  return (
    <>
      <span
        aria-hidden
        className="eph-cast-halo"
        style={{
          ...layer,
          background: `radial-gradient(closest-side, color-mix(in srgb, ${metal.color} 62%, transparent), transparent 74%)`,
        }}
      />

      {[0, 1].map((ring) => (
        <span
          key={`cast-ring${ring}`}
          aria-hidden
          className="eph-cast-ring"
          style={
            {
              ...layer,
              border: `1px solid ${metal.color}`,
              '--metal-delay': `${ring * 0.18}s`,
            } as CSSProperties
          }
        />
      ))}

      <span
        aria-hidden
        className="eph-cast-dial"
        style={{
          ...layer,
          background: `repeating-conic-gradient(${metal.color} 0 1.2deg, transparent 1.2deg ${metal.burstStep}deg)`,
          WebkitMask: dialMask,
          mask: dialMask,
        }}
      />

      {Array.from({ length: CAST_MOTES }, (_, mote) => {
        const angle = (mote / CAST_MOTES) * Math.PI * 2 + 0.7
        return (
          <span
            key={`cast-mote${mote}`}
            aria-hidden
            className="eph-cast-mote"
            style={
              {
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: 2,
                height: 2,
                marginLeft: Math.cos(angle) * radius * 0.5,
                marginTop: Math.sin(angle) * radius * 0.5,
                borderRadius: '50%',
                background: metal.color,
                pointerEvents: 'none',
                opacity: 0,
                // Motes drift with an updraft; sparks throw straight.
                '--cast-x': `${(Math.cos(angle) * (reach - 4)).toFixed(1)}px`,
                '--cast-y': `${(Math.sin(angle) * (reach - 4) - 7).toFixed(1)}px`,
                '--metal-delay': `${(mote * 0.07).toFixed(2)}s`,
              } as CSSProperties
            }
          />
        )
      })}

      {Array.from({ length: CAST_SPARKS }, (_, spark) => {
        const angle = (spark / CAST_SPARKS) * Math.PI * 2 + 0.26
        return (
          <span
            key={`cast-spark${spark}`}
            aria-hidden
            className="eph-cast-spark"
            style={
              {
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: 3,
                height: 3,
                // From the rim, not through the sigil.
                marginLeft: Math.cos(angle) * radius * 0.82,
                marginTop: Math.sin(angle) * radius * 0.82,
                borderRadius: '50%',
                background: metal.color,
                boxShadow: `0 0 5px ${metal.color}`,
                pointerEvents: 'none',
                opacity: 0,
                '--cast-x': `${(Math.cos(angle) * (radius * 0.18 + reach)).toFixed(1)}px`,
                '--cast-y': `${(Math.sin(angle) * (radius * 0.18 + reach)).toFixed(1)}px`,
                '--metal-delay': `${(spark * 0.018).toFixed(3)}s`,
              } as CSSProperties
            }
          />
        )
      })}
    </>
  )
}

export default function EphemeristsVote({
  praxisId,
  currentValue,
}: VoteUIProps) {
  const { t } = useTranslation('votes')
  const { user, selected, saving, error, vote } = useVote(praxisId, currentValue)
  const [hovered, setHovered] = useState(0)
  // `strike` keys the burst so a repeat cast remounts and replays it.
  const [cast, setCast] = useState<{ value: number; strike: number } | null>(null)

  if (!user) {
    return <VoteLoginGate />
  }

  const active = hovered || selected

  return (
    <div onMouseLeave={() => setHovered(0)}>
      {/* The frame is a brass ground with the sheet 1px inside, since the
          chamfer clip would cut a border (#1638). */}
      <div
        /* Also the row's query container (#2236, in CSS). */
        className="eph-vote-plate"
        style={chamferMount(PLATE_STEP)}
      >
        <div
          className="eph-metal-row"
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            /* Too narrow: the row wraps rather than the discs going oval. */
            flexWrap: 'wrap',
            justifyContent: 'center',
            /*
             * Gap and padding live on `.eph-metal-row` in CSS (#2236) so they
             * can yield in a narrow plate (inline would beat the sheet). They
             * clear the burst's 12px overhang: 24px = `--space-xl`.
             */
            /* Ground: the masthead band, as a radial recess (#2142). */
            ...chamferSheet(
              PLATE_STEP,
              'radial-gradient(130% 170% at 50% -20%, var(--faction-ephemerists-plate-band), var(--faction-ephemerists-vote-plate-to))',
            ),
            // ornament (#1609): inset well on an always-dark plate, tinted to
            // the valley blue-black. Raw.
            boxShadow: 'inset 0 1px 8px rgba(30, 34, 51, 0.7)',
          }}
        >
          {TIERS.map((tier, index) => {
          const metal = METAL_SIGILS[index]
          const reached = active >= tier.value
          const picked = selected === tier.value
          const top = tier.value === 5
          const size = top ? TOP_DISC_SIZE : DISC_SIZE
          const radius = size / 2
          const casting = cast?.value === tier.value
          return (
            <button
              key={tier.value}
              disabled={saving}
              onClick={() => {
                setCast((previous) => ({
                  value: tier.value,
                  strike: (previous?.strike ?? 0) + 1,
                }))
                void vote(tier.value)
              }}
              onMouseEnter={() => setHovered(tier.value)}
              aria-label={t('chrome.rateAria', { value: tier.value, label: tier.label })}
              aria-pressed={picked}
              style={{
                position: 'relative',
                width: size,
                height: size,
                /* Never shrink to an oval under the tap floor (#2236). */
                flexShrink: 0,
                borderRadius: '50%',
                border: 'none',
                background: 'transparent',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: saving ? 'default' : 'pointer',
                transform: picked
                  ? 'translateY(-3px) scale(1.08)'
                  : reached
                    ? 'translateY(-1px)'
                    : 'none',
                transition: 'transform 180ms cubic-bezier(.2,.8,.3,1.4)',
              }}
            >
              {/* Rim: rule brass idle, its metal once reached (#2142). */}
              <span
                aria-hidden
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  border: `1px solid ${reached ? metal.color : BRASS_RULE}`,
                  opacity: reached ? 1 : 0.85,
                  boxShadow: reached
                    ? `0 0 12px -2px color-mix(in srgb, ${metal.color} 60%, transparent), inset 0 0 10px -4px ${metal.color}`
                    : 'none',
                  transition: 'border-color 220ms ease, box-shadow 220ms ease',
                }}
              />

              {casting && <CastBurst key={`strike${cast.strike}`} metal={metal} size={size} />}

              {reached && (
                <span
                  aria-hidden
                  className="eph-metal-shock"
                  style={
                    {
                      position: 'absolute',
                      inset: -2,
                      borderRadius: '50%',
                      pointerEvents: 'none',
                      border: `1px solid ${top ? GOLD : metal.color}`,
                      '--metal-dur': top ? '2.2s' : '3s',
                      '--metal-delay': `${tier.value * 0.12}s`,
                    } as CSSProperties
                  }
                />
              )}

              <svg
                // Keyed on the strike so a repeat cast replays the pop.
                key={`sigil${casting ? cast.strike : 0}`}
                aria-hidden
                className={casting ? 'eph-cast-sigil' : undefined}
                width={size * 0.5}
                height={size * 0.5}
                viewBox="0 0 24 24"
                style={{
                  position: 'relative',
                  display: 'block',
                  filter: reached
                    ? `drop-shadow(0 0 3px color-mix(in srgb, ${metal.color} 80%, transparent))${
                        top ? ` drop-shadow(0 0 9px color-mix(in srgb, ${GOLD} 67%, transparent))` : ''
                      }`
                    : 'none',
                  transition: 'filter 220ms ease',
                }}
              >
                <path
                  d={metal.glyph}
                  fill="none"
                  stroke={reached ? metal.color : 'var(--faction-ephemerists-vote-idle-ink)'}
                  strokeWidth={metal.weight}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ transition: 'stroke 220ms ease' }}
                />
              </svg>

              {reached && (
                <span
                  aria-hidden
                  className="eph-metal-sheen"
                  style={
                    {
                      position: 'absolute',
                      inset: -1,
                      borderRadius: '50%',
                      pointerEvents: 'none',
                      overflow: 'hidden',
                      mixBlendMode: 'screen',
                      background: `linear-gradient(112deg, transparent 38%, var(--faction-ephemerists-vote-sheen) 50%, transparent 62%)`,
                      backgroundSize: '260% 100%',
                      '--metal-dur': top ? '2.8s' : '3.6s',
                      '--metal-delay': `${(tier.value * 0.35).toFixed(2)}s`,
                    } as CSSProperties
                  }
                />
              )}

              {/* Orbit wider than the design's, which crowds the sigil. */}
              {reached &&
                top &&
                Array.from({ length: PLANET_COUNT }, (_, planet) => {
                  const angle = (planet / PLANET_COUNT) * Math.PI * 2 + 0.4
                  return (
                    <span
                      key={`planet${planet}`}
                      aria-hidden
                      className="eph-metal-filing"
                      style={
                        {
                          position: 'absolute',
                          left: '50%',
                          top: '50%',
                          // Centre the 9px glyph on its orbit point.
                          marginLeft: Math.cos(angle) * (radius + FILING_ORBIT) - 4.5,
                          marginTop: Math.sin(angle) * (radius + FILING_ORBIT) - 4.5,
                          fontSize: 'var(--text-sm)',
                          lineHeight: 1,
                          color: GOLD,
                          textShadow: `0 0 4px ${GOLD}`,
                          pointerEvents: 'none',
                          '--metal-delay': `${planet * 0.14}s`,
                        } as CSSProperties
                      }
                    >
                      {PLANETS[planet % PLANETS.length]}
                    </span>
                  )
                })}
            </button>
          )
        })}
        </div>
      </div>

      {/* #2142 §5's reckoning line is deliberately unbuilt: #2176 ("no text
          under the vote stars") ruled later. Awaits an owner call. */}

      <VoteError error={error} color={OCHRE} />
    </div>
  )
}
