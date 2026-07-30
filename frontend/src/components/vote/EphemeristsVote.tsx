import { useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BRASS,
  BRASS_LIGHT,
  DISC,
  GOLD,
  OCHRE,
  QUIET,
  READING,
  DECO,
  stepClip,
} from '../factionMarks/ephemeristsPlate'
import { toRoman } from '../../utils/roman'
import type { VoteUIProps } from './VoteUI'
import { useVote } from './useVote'
import { VoteLoginGate, VoteSummary } from './VoteShell'
import { VOTE_REFRAMES } from './voteReframes'

/**
 * The Ephemerists vote UI (#1207) — THE ALCHEMICAL METALS LADDER, which
 * replaces the constellation attestation (#821).
 *
 * The 1–5 approval is a transmutation: five discs on a stepped night plate,
 * lead → copper → silver → gold → platinum, each carrying its own alchemical
 * sigil and its roman numeral. Reaching a rank lights every disc up to it in its
 * own metal — ray burst, sheen, shock ring — and rank 5 is haloed in gold with
 * iron filings orbiting it. `numeral: 'roman'` in `voteReframes` is what puts
 * I–V on the discs, and the tier WORDS are the metals themselves.
 *
 * THE PLATE IS A FIXED NIGHT SURFACE in both themes, as the constellation was.
 * The design paints the light-theme plate cream and keeps one set of metals for
 * both, on which silver/gold/platinum read 1.0–1.3:1 — a reached disc would be
 * FAINTER than the unreached ring beside it. The full measurement is recorded
 * at the token declaration in index.css. Only the caption ink flips, through the
 * plate family's own tokens; there is no `dark ? a : b` anywhere (§8).
 *
 * Every motion is a reduced-motion-gated CSS class (`.eph-metal-*`, index.css),
 * so the stilled state is a fully lit ladder — motion is decoration, never
 * meaning. Cast/refetch/tally logic stays in the shared {@link useVote} hook.
 */

/** The touch target, and the haloed top rank. Never shrink either (WCAG ≥44). */
const DISC_SIZE = 44
const TOP_DISC_SIZE = 50

/**
 * The five metals, in the tier order `VOTE_REFRAMES` declares. Each carries the
 * classical sigil for its metal on the plate's own 24-unit square — Saturn for
 * lead, Venus for copper, the crescent for silver, the sun for gold, and the
 * moon-and-Mercury compound for platinum.
 *
 * Local rather than in `ephemeristsPlate`: the kit is the plate's shared
 * ornament vocabulary (registers, cornice, cartouche, octagon), and these five
 * signs have exactly one reader — this widget.
 */
const METALS = [
  {
    color: 'var(--faction-ephemerists-metal-lead)',
    glyph: 'M6.2 7.4 C7.4 4.6 10.2 4.8 10.2 7.8 C10.2 10.8 9 14.6 9.4 17.6 C9.8 20.4 11.8 21 13.8 19.4 M6.4 10.8 H13.4',
    weight: 1.5,
  },
  {
    color: 'var(--faction-ephemerists-metal-copper)',
    glyph: 'M12 4.4 a4.4 4.4 0 1 0 0.01 0 Z M12 13.2 V20.6 M8.8 17.4 H15.2',
    weight: 1.5,
  },
  {
    color: 'var(--faction-ephemerists-metal-silver)',
    glyph: 'M15.8 4.4 A8 8 0 1 0 15.8 19.6 A6.3 6.3 0 1 1 15.8 4.4 Z',
    weight: 1.3,
  },
  {
    color: 'var(--faction-ephemerists-metal-gold)',
    glyph: 'M12 5 a7 7 0 1 0 0.01 0 Z M12 10.4 a1.7 1.7 0 1 0 0.01 0 Z',
    weight: 1.5,
  },
  {
    color: 'var(--faction-ephemerists-metal-platinum)',
    glyph: 'M10.6 5.2 A7 7 0 1 0 10.6 18.8 A5.5 5.5 0 1 1 10.6 5.2 Z M15.6 7.6 a4.4 4.4 0 1 0 0.01 0 Z M15.6 11.2 a0.9 0.9 0 1 0 0.01 0 Z',
    weight: 1.3,
  },
]

const TIERS = VOTE_REFRAMES['ephemerists'].tiers

/** The ray burst's spread beyond the disc it surrounds. Ornament geometry. */
const BURST_MARGIN = 30
/** How far the filings orbit past rank 5's edge. Ornament geometry. */
const FILING_ORBIT = 13

/** One phase of the burst: alternate rays are shorter and gold rather than metal. */
function rayLength(index: number, top: boolean): number {
  return (index % 2 ? 5 : 8.5) + (top ? 3 : 0)
}

export default function EphemeristsVote({
  praxisId,
  currentValue,
  points,
  totalVotes,
}: VoteUIProps) {
  const { t } = useTranslation('votes')
  const { user, selected, saving, error, vote } = useVote(praxisId, currentValue)
  const [hovered, setHovered] = useState(0)

  if (!user) {
    return <VoteLoginGate />
  }

  const active = hovered || selected
  const caption = active ? TIERS[active - 1].label : t('chrome.ephemerists.idle')

  return (
    <div onMouseLeave={() => setHovered(0)}>
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-md)',
          padding: 'var(--space-md) var(--space-lg)',
          background:
            'radial-gradient(130% 170% at 50% -20%, var(--faction-ephemerists-vote-plate-from), var(--faction-ephemerists-vote-plate-to))',
          border: `1px solid ${BRASS}`,
          boxShadow: 'inset 0 1px 8px rgba(30, 34, 51, 0.7)',
          clipPath: stepClip(7),
        }}
      >
        {/* The rail the metals sit on — a dashed brass lead at rest, a gold
            current running along it once a rank is reached. */}
        <span
          aria-hidden
          className={active > 0 ? 'eph-metal-rail' : undefined}
          style={{
            position: 'absolute',
            left: 14,
            right: 14,
            top: '50%',
            height: 1.5,
            // eslint-disable-next-line local/no-raw-style-values -- ornament: half the drawn 1.5px rail, centring the hairline on `top: 50%`. The offset IS the stroke; the smallest rung is 4px, which drops the rail below the metals it threads.
            marginTop: -1,
            background:
              active > 0
                ? `repeating-linear-gradient(90deg, ${GOLD} 0 6px, transparent 6px 12px)`
                : `repeating-linear-gradient(90deg, ${BRASS} 0 3px, transparent 3px 9px)`,
            backgroundSize: '12px 100%',
            opacity: active > 0 ? 0.8 : 0.35,
          }}
        />

        {TIERS.map((tier, index) => {
          const metal = METALS[index]
          const reached = active >= tier.value
          const picked = selected === tier.value
          const top = tier.value === 5
          const size = top ? TOP_DISC_SIZE : DISC_SIZE
          const radius = size / 2
          const burst = size + BURST_MARGIN
          const rayCount = top ? 16 : 10
          return (
            <button
              key={tier.value}
              disabled={saving}
              onClick={() => void vote(tier.value)}
              onMouseEnter={() => setHovered(tier.value)}
              aria-label={t('chrome.ephemerists.rateAria', { value: tier.value, label: tier.label })}
              aria-pressed={picked}
              style={{
                position: 'relative',
                width: size,
                height: size,
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
              {/* The disc's own rim: brass while idle, its metal once reached. */}
              <span
                aria-hidden
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  border: `1px solid ${reached ? metal.color : BRASS}`,
                  opacity: reached ? 1 : 0.85,
                  boxShadow: reached
                    ? `0 0 12px -2px color-mix(in srgb, ${metal.color} 60%, transparent), inset 0 0 10px -4px ${metal.color}`
                    : 'none',
                  transition: 'border-color 220ms ease, box-shadow 220ms ease',
                }}
              />

              {reached && (
                <>
                  <svg
                    aria-hidden
                    width={burst}
                    height={burst}
                    viewBox={`0 0 ${burst} ${burst}`}
                    style={{
                      position: 'absolute',
                      left: (size - burst) / 2,
                      top: (size - burst) / 2,
                      pointerEvents: 'none',
                      overflow: 'visible',
                    }}
                  >
                    {Array.from({ length: rayCount }).map((_, ray) => (
                      <line
                        key={ray}
                        className="eph-metal-ray"
                        x1={burst / 2}
                        y1={burst / 2 - (radius + 3)}
                        x2={burst / 2}
                        y2={burst / 2 - (radius + 3 + rayLength(ray, top))}
                        stroke={ray % 2 ? GOLD : metal.color}
                        strokeWidth={ray % 2 ? 0.9 : 1.3}
                        strokeLinecap="round"
                        transform={`rotate(${(ray / rayCount) * 360} ${burst / 2} ${burst / 2})`}
                        style={
                          {
                            '--metal-dur': `${2.4 + (ray % 3) * 0.5}s`,
                            '--metal-delay': `${(ray * 0.09).toFixed(2)}s`,
                          } as CSSProperties
                        }
                      />
                    ))}
                  </svg>

                  {/* The shock ring leaving the disc as the metal strikes. */}
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
                </>
              )}

              <svg
                aria-hidden
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

              {/* Iron filings, drawn to the fully transmuted disc. */}
              {reached &&
                top &&
                [0, 1, 2, 3, 4, 5].map((filing) => {
                  const angle = (filing / 6) * Math.PI * 2 + 0.4
                  return (
                    <span
                      key={`filing${filing}`}
                      aria-hidden
                      className="eph-metal-filing"
                      style={
                        {
                          position: 'absolute',
                          left: '50%',
                          top: '50%',
                          width: 3,
                          height: 3,
                          marginLeft: Math.cos(angle) * (radius + FILING_ORBIT),
                          marginTop: Math.sin(angle) * (radius + FILING_ORBIT),
                          borderRadius: '50%',
                          background: GOLD,
                          boxShadow: `0 0 4px ${GOLD}`,
                          pointerEvents: 'none',
                          '--metal-delay': `${filing * 0.18}s`,
                        } as CSSProperties
                      }
                    />
                  )
                })}

              {/*
               * The rank's numeral, struck on a night disc at the metal's edge.
               *
               * DEVIATION: the design fills this badge with brass (pale cream
               * numeral) for ranks I–IV. Cream on the light theme's brass is
               * 3.5:1, and nothing in the family clears 4.5 on that mid-tone —
               * so the fill is the plate's own night and the numeral is gold,
               * which is 11:1 and is the register the masthead already sets
               * gold-on-night in. Rank V keeps the design's ochre.
               */}
              <span
                aria-hidden
                style={{
                  position: 'absolute',
                  right: -2,
                  bottom: -1,
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: reached && top ? OCHRE : 'var(--faction-ephemerists-vote-plate-to)',
                  color: reached
                    ? top
                      ? DISC
                      : GOLD
                    : 'var(--faction-ephemerists-plate-band-quiet)',
                  fontFamily: 'var(--font-faction-engraved)',
                  fontWeight: 600,
                  fontSize: 'var(--text-xs)',
                  letterSpacing: '0.04em',
                  lineHeight: 1,
                  boxShadow: `0 0 0 1px ${reached ? BRASS_LIGHT : BRASS}`,
                  transition: 'background 220ms ease, color 220ms ease',
                }}
              >
                {toRoman(tier.value)}
              </span>
            </button>
          )
        })}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 'var(--space-sm)',
          marginTop: 'var(--space-md)',
          minHeight: 20,
        }}
      >
        <span
          style={{
            fontFamily: READING,
            fontStyle: 'italic',
            // eslint-disable-next-line local/no-raw-style-values -- ornament: the widget's tier word is part of the mark, set at the design's 15 in the plate's reading hand (design-fidelity.md standing carve-out)
            fontSize: 15,
            letterSpacing: '0.02em',
            color: active ? OCHRE : QUIET,
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
              color: QUIET,
            }}
          >
            {`· ${t('chrome.ephemerists.tag')}`}
          </span>
        )}
      </div>

      <VoteSummary
        selected={selected}
        points={points}
        totalVotes={totalVotes}
        error={error}
        theme={{
          muted: QUIET,
          accent: OCHRE,
          accentFont: DECO,
          errorColor: OCHRE,
          avgLetterSpacing: '0.02em',
        }}
      />
    </div>
  )
}
