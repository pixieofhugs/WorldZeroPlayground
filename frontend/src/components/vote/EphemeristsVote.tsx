import { useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BRASS,
  GOLD,
  OCHRE,
  QUIET,
  DECO,
  METAL_SIGILS,
  stepClip,
} from '../factionMarks/ephemeristsPlate'
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
 * sigil. Reaching a rank lights every disc up to it in its own metal — conic
 * burst, sheen, shock ring — and rank 5 is haloed in gold with iron filings
 * orbiting it. The tier WORDS are the metals themselves.
 *
 * ## The metals ARE the scale (#1638)
 *
 * The plate used to carry three separate restatements of the rank it was
 * already showing: a dashed track threading the discs, a roman numeral struck
 * on each one, and an italic caption naming the hovered tier. All three are
 * gone. What replaced them is not another label but a LEGIBLE burst — the ray
 * fan (a flat 10 rays, 16 at rank 5) is now a conic ring whose spoke pitch is
 * `METAL_SIGILS[n].burstStep`, 60° at lead down to 22.5° at platinum, so the
 * ring visibly densifies as the metal improves. Rank is readable off the ring.
 *
 * Nothing was lost with the caption: each disc's `aria-label` names its metal,
 * and `VoteSummary` below states the cast once it is made.
 *
 * ## THE PLATE IS A FIXED NIGHT SURFACE in both themes
 *
 * As the constellation was. The design paints the light-theme plate cream and
 * keeps one set of metals for both, on which silver/gold/platinum read 1.0–1.3:1
 * — a reached disc would be FAINTER than the unreached ring beside it. The full
 * measurement is recorded at the token declaration in index.css. There is no
 * `dark ? a : b` anywhere (§8).
 *
 * Every motion is a reduced-motion-gated CSS class (`.eph-metal-*`, index.css),
 * so the stilled state is a fully lit ladder — motion is decoration, never
 * meaning. Cast/tally logic stays in the shared {@link useVote} hook.
 */

/** The touch target, and the haloed top rank. Never shrink either (WCAG ≥44). */
const DISC_SIZE = 44
const TOP_DISC_SIZE = 50

const TIERS = VOTE_REFRAMES['ephemerists'].tiers

/**
 * How far the conic burst spreads past the disc it rings. Ornament geometry,
 * and the number the plate's own gap is set from: the ring box is
 * `size + BURST_MARGIN`, so it overhangs the rim by `BURST_MARGIN / 2` in EVERY
 * direction and at every tier — see the gap comment on the plate below.
 */
const BURST_MARGIN = 24
/** How far the filings orbit past rank 5's edge. Ornament geometry. */
const FILING_ORBIT = 13
/**
 * The chamfer leg of the plate's stepped silhouette, and of the brass ground
 * one pixel behind it. The inner leg is a pixel shorter so the two chamfers run
 * parallel: a 1px inset with an equal leg would put the sheet's cut corner ON
 * the ground's, and the frame would open at both corners exactly as the clipped
 * border it replaces did. (Strictly the parallel leg is 6.41 — 1px of normal
 * clearance across a 45° cut — so 6 draws the chamfer's hairline at 0.7px
 * against the straights' 1px. That is a taper on a brass rule, not a gap.)
 */
const PLATE_STEP = 7
const SHEET_STEP = 6

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

  return (
    <div onMouseLeave={() => setHovered(0)}>
      {/*
       * THE FRAME, AS A GROUND RATHER THAN A BORDER (#1638).
       *
       * `stepClip` chamfers the top-left and bottom-right corners, and a border
       * painted at the border box is cut away along both chamfers — the plate
       * shipped with two open corners and a brass rule that stopped short. So
       * the brass is a GROUND here and the night sheet is laid one pixel inside
       * it, stepped a pixel tighter: the frame is what shows through the inset,
       * which means the clip carries the rule instead of shaving it.
       */}
      <div
        // eslint-disable-next-line local/no-raw-style-values -- ornament: the padding IS the brass rule's stroke width, not spacing. The smallest space rung is 4px, which draws the plate a four-pixel brass mount.
        style={{ background: BRASS, padding: 1, clipPath: stepClip(PLATE_STEP) }}
      >
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            /*
             * The gap holds the BURSTS apart, not the discs (#1633), and the
             * figure was re-derived for #1638's conic ring.
             *
             * #1633's arithmetic was trigonometry over a ray FAN — which spoke
             * came nearest horizontal, since one pointing straight up costs a
             * neighbour nothing. A ring has no nearest-horizontal spoke: it
             * reaches its full radius in every direction. Its projection is
             * therefore just the overhang, `BURST_MARGIN / 2` = 12px, and that
             * is the same at every tier because the ring box grows with the
             * disc it surrounds.
             *
             * Two rings side by side want 12 + 12 = 24px rim-to-rim, which is
             * `--space-xl` exactly — the same rung the fan needed, now a clean
             * fit rather than one 0.36px short. The horizontal padding matches
             * the gap because rank 1 and rank 5 burst toward the plate's edge
             * rather than toward a neighbour.
             *
             * The BLOCK padding now matches too, at the rung above: #1633 left
             * this to #1638 because the fan's index-0 ray pointed straight up
             * and reached 14.5px into 12px of padding, where the clip cut it.
             * The ring reaches 12, and `--space-lg` (16) clears it by 4.
             */
            gap: 'var(--space-xl)',
            padding: 'var(--space-lg) var(--space-xl)',
            background:
              'radial-gradient(130% 170% at 50% -20%, var(--faction-ephemerists-vote-plate-from), var(--faction-ephemerists-vote-plate-to))',
            // ornament (#1609): the same inset well the Coven and S.N.I.D.E.
            // vote plates carry — a recess INSIDE a plate that is dark in both
            // cascades, not a cast onto a ground that flips. This one is also
            // tinted to its own plate (30,34,51 is the valley blue-black, not
            // neutral), which is the drawing rather than a stray alpha. Raw.
            boxShadow: 'inset 0 1px 8px rgba(30, 34, 51, 0.7)',
            clipPath: stepClip(SHEET_STEP),
          }}
        >
          {/* The dashed brass rail threading the metals stood here, carrying a
              gold current once a rank was reached. #1638 struck it: it drew the
              1–5 scale a second time, under a row of discs that already are it. */}

          {TIERS.map((tier, index) => {
          const metal = METAL_SIGILS[index]
          const reached = active >= tier.value
          const picked = selected === tier.value
          const top = tier.value === 5
          const size = top ? TOP_DISC_SIZE : DISC_SIZE
          const radius = size / 2
          return (
            <button
              key={tier.value}
              disabled={saving}
              onClick={() => void vote(tier.value)}
              onMouseEnter={() => setHovered(tier.value)}
              aria-label={t('chrome.rateAria', { value: tier.value, label: tier.label })}
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
                  {/*
                   * THE PER-TIER BURST (#1638) — a conic ring of spokes at this
                   * metal's own pitch, masked to a halo clear of the disc.
                   *
                   * The pitch is the point: 60° at lead is six spokes, 22.5° at
                   * platinum is sixteen, so the burst densifies up the ladder
                   * and carries the rank the struck numeral used to. The ring
                   * is inked in its own metal rather than in one accent for the
                   * whole plate.
                   *
                   * Pigment, mask and cycle are all `.eph-metal-burst` in
                   * index.css; what arrives from here is geometry — the box,
                   * the spoke pitch and the phase.
                   */}
                  <span
                    aria-hidden
                    className="eph-metal-burst"
                    style={
                      {
                        position: 'absolute',
                        left: -BURST_MARGIN / 2,
                        top: -BURST_MARGIN / 2,
                        width: size + BURST_MARGIN,
                        height: size + BURST_MARGIN,
                        '--metal-ink': metal.color,
                        '--metal-step': `${metal.burstStep}deg`,
                        '--metal-delay': `${(tier.value * 0.16).toFixed(2)}s`,
                      } as CSSProperties
                    }
                  />

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

              {/* A 16px night badge struck with the rank's roman numeral sat
                  here, at the metal's lower edge. #1638 struck it off: the
                  burst's spoke pitch now carries the rank, and a numeral beside
                  it was the ladder saying the same thing twice in two
                  vocabularies. */}
            </button>
          )
        })}
        </div>
      </div>

      {/* The italic gloss caption naming the hovered tier — and its "· cast"
          tag — stood here. #1638 struck both: each disc's `aria-label` already
          names its metal, and `VoteSummary` below states the cast once it is
          made, so the caption row was a third restatement of the row above it.
          `votes:chrome.idle` and `.tag` went with it. */}

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
