import { useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { VoteUIProps } from './VoteUI'
import { useVote } from './useVote'
import { VoteLoginGate, VoteError } from './VoteShell'
import { VOTE_REFRAMES } from './voteReframes'

/**
 * Warriors of Whimsy vote UI (#840) — the GOOGLY-BALLOON VERDICT, ported from
 * the vendored prototype rather than re-imagined (ADR-0049, ADR-0050).
 *
 * Three things #821 left out, all of them the widget's actual character:
 *
 *  • the RAINBOW SWEEP. A skewed band of colour travels behind the whole row,
 *    screen-blended over the parchment. Without it the plate is a beige box;
 *  • the SIZE RAMP. The balloons grow 19→36px wide as the rank climbs, so the
 *    bunch reads as a rising scale before you read a single word;
 *  • the CONFETTI. A cast rank-5 drops three flecks off every balloon.
 *
 * And one thing it had backwards: an UNREACHED balloon is drawn in dead
 * parchment, not left transparent (#860 ask 3). Every balloon is present; only
 * the colour climbs. Transparent ones read as four missing balloons.
 *
 * TOUCH TARGETS vs. the design's geometry: the prototype sizes each button to
 * its balloon, which puts rank 1 at 19px wide. Rather than inflate the SVG — that
 * would flatten the ramp, which is the whole widget — each button is a 44px-wide
 * hit box with the balloon sitting bottom-centred inside it, and the row's gap
 * comes down from the design's 9 to absorb the extra width.
 *
 * Every motion is a reduced-motion-gated CSS class (never inline `animation:`);
 * stilled, the fills and the ramp still carry the whole rank.
 */

/** Balloon fill ramp (plum climbing to gold) — one token per tier. */
const BALLOON_FILLS = [
  'var(--faction-wow-balloon-1)',
  'var(--faction-wow-balloon-2)',
  'var(--faction-wow-balloon-3)',
  'var(--faction-wow-balloon-4)',
  'var(--faction-wow-balloon-5)',
]

/** Per-tier balloon width/height — the design's ramp, ornament geometry. */
const BALLOON_WIDTHS = [19, 23, 27, 31, 36]
const BALLOON_HEIGHTS = [29, 35, 41, 47, 54]

/** Confetti flecks: the six rainbow stops, walked per balloon. */
const CONFETTI = [
  'var(--faction-wow-confetti-1)',
  'var(--faction-wow-confetti-2)',
  'var(--faction-wow-confetti-3)',
  'var(--faction-wow-confetti-4)',
  'var(--faction-wow-confetti-5)',
  'var(--faction-wow-confetti-6)',
]

const TIERS = VOTE_REFRAMES['wow'].tiers

/** One googly balloon: body, knot, string, two wiggling eyes, a smile. */
function Balloon({ fill, width, height }: { fill: string; width: number; height: number }) {
  return (
    <svg viewBox="0 0 34 52" width={width} height={height} aria-hidden style={{ overflow: 'visible' }}>
      <ellipse
        cx={17}
        cy={17}
        rx={14}
        ry={16.5}
        fill={fill}
        stroke="var(--faction-wow-balloon-outline)"
        strokeWidth={1.6}
      />
      <path
        d="M14,31.5 L20,31.5 L17,36.5 Z"
        fill={fill}
        stroke="var(--faction-wow-balloon-outline)"
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <path
        d="M17,36.5 q4.5,7 -1,13.5"
        fill="none"
        stroke="var(--faction-wow-balloon-string)"
        strokeWidth={1.2}
      />
      <ellipse cx={10} cy={9.5} rx={2.4} ry={3.3} fill="rgba(255,255,255,0.5)" />
      <circle cx={12} cy={15.5} r={4} fill="var(--faction-wow-balloon-eye-white)" stroke="var(--faction-wow-balloon-eye-ring)" strokeWidth={1} />
      <circle className="wow-balloon-eye" cx={12} cy={16.5} r={1.8} fill="var(--faction-wow-balloon-eye)" />
      <circle cx={22} cy={15.5} r={4} fill="var(--faction-wow-balloon-eye-white)" stroke="var(--faction-wow-balloon-eye-ring)" strokeWidth={1} />
      <circle className="wow-balloon-eye" cx={22} cy={16.5} r={1.8} fill="var(--faction-wow-balloon-eye)" />
      <path
        d="M13.5,23.5 q3.5,3.5 7,0"
        fill="none"
        stroke="var(--faction-wow-balloon-outline)"
        strokeWidth={1.4}
        strokeLinecap="round"
      />
    </svg>
  )
}

export default function WowVote({ praxisId, currentValue }: VoteUIProps) {
  const { t } = useTranslation('votes')
  const { user, selected, saving, error, vote } = useVote(praxisId, currentValue)
  const [hovered, setHovered] = useState(0)

  if (!user) {
    return <VoteLoginGate />
  }

  const active = hovered || selected
  const cheering = active >= 5

  return (
    <div>
      {/* "Cast thy Verdict" (`chrome.wow.prompt`) headed the row. #1909 cut the
          whole `chrome.{F}.prompt` slot — see the note in `CovenVote`. */}
      <div
        onMouseLeave={() => setHovered(0)}
        className={cheering ? 'wow-balloon-cheer' : undefined}
        style={{
          position: 'relative',
          display: 'flex',
          gap: 'var(--space-xs)',
          alignItems: 'flex-end',
          justifyContent: 'flex-start',
          padding: 'var(--space-xs) var(--space-sm)',
          borderRadius: 12,
          background:
            'linear-gradient(var(--faction-wow-balloon-plate-from), var(--faction-wow-balloon-plate-to))',
          border: '1px solid var(--faction-wow-balloon-plate-border)',
        }}
      >
        {/* The rainbow sweep, behind everything and clipped to the plate. */}
        <span aria-hidden className="wow-balloon-sweep" />

        {TIERS.map((tier, index) => {
          const reached = active >= tier.value
          const picked = selected === tier.value
          const balloonStyle: CSSProperties = {
            position: 'relative',
            zIndex: 1,
            border: 'none',
            background: 'transparent',
            padding: 0,
            // ≥44px hit box; the balloon floats bottom-centred inside it, so the
            // design's size ramp survives the accessibility floor untouched.
            minWidth: 44,
            minHeight: 44,
            height: 60,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            cursor: saving ? 'default' : 'pointer',
            transform: picked ? 'scale(1.1)' : 'none',
            transition: 'transform 150ms',
          }
          return (
            <button
              key={tier.value}
              disabled={saving}
              onClick={() => void vote(tier.value)}
              onMouseEnter={() => setHovered(tier.value)}
              aria-label={t('chrome.rateAria', { value: tier.value, label: tier.label })}
              aria-pressed={picked}
              style={balloonStyle}
            >
              <span
                className={reached && !cheering ? 'wow-balloon-float' : undefined}
                style={{
                  position: 'relative',
                  display: 'flex',
                  ['--tw-delay' as string]: `${index * 0.15}s`,
                }}
              >
                <Balloon
                  fill={reached ? BALLOON_FILLS[index] : 'var(--faction-wow-balloon-idle)'}
                  width={BALLOON_WIDTHS[index]}
                  height={BALLOON_HEIGHTS[index]}
                />
                {/* Rank 5 showers the whole bunch. Hidden at rest (see index.css). */}
                {selected === 5 &&
                  [0, 1, 2].map((fleck) => (
                    <span
                      key={fleck}
                      aria-hidden
                      className="wow-balloon-confetti"
                      style={{
                        top: fleck === 1 ? 2 : 4,
                        left: fleck === 2 ? undefined : fleck === 1 ? 14 : 2,
                        right: fleck === 2 ? 2 : undefined,
                        background: CONFETTI[(tier.value + fleck * 2) % CONFETTI.length],
                        ['--tw-delay' as string]: `${fleck * 0.35}s`,
                      }}
                    />
                  ))}
              </span>
            </button>
          )
        })}
      </div>

      {/* The MedievalSharp caption stood here: the hovered tier's word, or
          `chrome.voted` once cast — a SECOND call to the key the shell's own
          summary block below was already rendering, so a cast WOW card printed
          "Voted 4 pts" twice (#2166). #2166 struck the whole slot, not just the
          doubled line: the balloons are the scale. The 21px-tall reserved row
          goes with it rather than staying behind as an empty box — nothing
          hovers into it any more, so there is no reflow left to absorb. The
          aggregate tally that used to sit under the plate went too, on the
          owner's third ruling; the plate carries its own padding, so nothing
          below it was holding the breathing room open. */}

      <VoteError error={error} color="var(--color-danger)" />
    </div>
  )
}
