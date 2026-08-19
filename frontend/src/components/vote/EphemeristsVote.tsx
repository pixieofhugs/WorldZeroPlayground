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
 * The Ephemerists vote UI (#1207) — THE ALCHEMICAL METALS LADDER, which
 * replaces the constellation attestation (#821).
 *
 * The 1–5 approval is a transmutation: five discs on a stepped night plate,
 * lead → copper → silver → gold → platinum, each carrying its own alchemical
 * sigil. Reaching a rank lights every disc up to it in its own metal — rim,
 * glyph, sheen — and rank 5 is haloed in gold with the seven planetary metals
 * orbiting it. The tier WORDS are the metals themselves.
 *
 * ## The metals ARE the scale (#1638)
 *
 * The plate used to carry three separate restatements of the rank it was
 * already showing: a dashed track threading the discs, a roman numeral struck
 * on each one, and an italic caption naming the hovered tier. All three are
 * gone. Each disc's `aria-label` names its metal, and the raised disc is the
 * cast. (The shell used to state it in words as well — #2166 took that line,
 * and the aggregate tally under it, off every skin, this one included.)
 *
 * ## THE RESTING PLATE IS STILL (#2142)
 *
 * #1638 gave every reached disc a perpetual conic ring whose spoke pitch was
 * the metal's `burstStep`, so rank could be read off the densification. The
 * owner struck it: five haloed discs at once is fog, and 60° against 45° is not
 * a distinction anyone reads at 44px. Rank is carried by the COUNT of lit discs
 * and by the reckoning below the plate. What is left resting is the rim, the
 * glyph and the slow sheen.
 *
 * `burstStep` did not go with it — it moved. The pitch is now the pitch of the
 * CAST DIAL below, where it is a momentary instrument rather than a permanent
 * halo, and casting platinum throws a visibly finer dial (22.5°) than casting
 * lead (60°).
 *
 * ## THE PLATE IS A FIXED NIGHT SURFACE in both themes
 *
 * As the constellation was. The design paints the light-theme plate cream and
 * keeps one set of metals for both, on which silver/gold/platinum read 1.0–1.3:1
 * — a reached disc would be FAINTER than the unreached ring beside it. The full
 * measurement is recorded at the token declaration in index.css. There is no
 * `dark ? a : b` anywhere (§8).
 *
 * Since #2142 the plate's ground is anchored to the masthead band
 * (`--faction-ephemerists-plate-band`) rather than to a vote-only blue, so the
 * plate and the band are the same metal catching light differently. The radial
 * recess and the inset top shadow stay: it is a recess, not a flat fill.
 *
 * Every motion is a reduced-motion-gated CSS class (`.eph-metal-*`,
 * `.eph-cast-*`), so the stilled state is a fully lit ladder and a cast that
 * simply changes state — motion is decoration, never meaning. Cast/tally logic
 * stays in the shared {@link useVote} hook.
 */

/**
 * The touch target, and the haloed top rank. Never shrink either (WCAG ≥44).
 *
 * EXPORTED FOR THE STYLESHEET'S TEST (#2315). `.eph-metal-row`'s clearance ramp
 * is a function of how much disc the row has to seat, and that figure —
 * `4 × 44 + 50 = 226` — is written into `index.css` because CSS cannot read a
 * TypeScript constant. Exporting them lets `__tests__/ephemeristsVote.test.tsx`
 * check the sheet against the source of truth instead of restating it, so
 * moving a disc size fails loudly rather than silently mis-spacing the row.
 */
export const DISC_SIZE = 44
export const TOP_DISC_SIZE = 50
/** What five discs occupy before a single gap or pad. The sheet's `226px`. */
export const DISC_RUN = DISC_SIZE * 4 + TOP_DISC_SIZE

const TIERS = VOTE_REFRAMES['ephemerists'].tiers

/**
 * How far the cast burst spreads past the disc it leaves, and the number the
 * plate's own gap is set from: every burst layer is boxed at
 * `size + BURST_MARGIN`, so it overhangs the rim by `BURST_MARGIN / 2` in EVERY
 * direction and at every tier — see the gap comment on the plate below. The
 * ambient ring this figure was first derived for is gone (#2142); the cast
 * keeps the box, because the plate's clip would otherwise shave the bloom.
 */
const BURST_MARGIN = 24
/** How far the planets orbit past rank 5's edge. Ornament geometry. */
const FILING_ORBIT = 13
/**
 * The chamfer leg of the plate's stepped silhouette, and of the brass ground
 * one pixel behind it.
 *
 * The sheet's own leg used to stand beside this as a hand-rounded 6, with a
 * comment naming what that cost: the parallel leg is 6.41, so 6 drew the
 * chamfer's hairline at 0.7px against the straights' 1px — a taper on a brass
 * rule rather than a gap, but a taper. `chamferSheet` computes it (#2150), and
 * the reason to round went with the hand-typing.
 */
const PLATE_STEP = 7

/**
 * THE SEVEN PLANETARY METALS, orbiting the fully transmuted disc (#2142).
 *
 * Six 3px gold dots stood here — "iron filings", which named one metal and drew
 * none of them. Twelve marks now cycle the seven classical correspondences:
 * Saturn/lead, Venus/copper, Moon/silver, Sun/gold, Mercury/quicksilver,
 * Jupiter/tin, Mars/iron — the ladder's own five plus the two it does not
 * grade, which is the joke and the reason it is seven and not five.
 *
 * Unicode astro symbols, present in every major system stack, so this costs no
 * webfont and no SVG. `aria-hidden`: they are ornament, and the disc's own
 * `aria-label` already names its metal.
 */
const PLANETS = ['♄', '♀', '☽', '☉', '☿', '♃', '♂']
/** Twelve mounts around the rim, cycling the seven. A clock face, not a heptagon. */
const PLANET_COUNT = 12

/** The cast burst's two swarms: nine drifting motes, twelve struck sparks. */
const CAST_MOTES = 9
const CAST_SPARKS = 12

/**
 * THE CAST BURST (#2142) — what the struck disc throws, over ~1.6s.
 *
 * A halo bloom, two shock rings, a RULED DIAL that turns as it opens, nine
 * drifting motes and twelve sparks, all in the struck metal's own colour; the
 * sigil pops to 1.24 and back on the button itself.
 *
 * THE DIAL IS THE POINT. Everything else here is a firework; the dial reads as
 * an instrument taking a measurement, and its tick pitch is `metal.burstStep` —
 * the number #1638 spent on the ambient ring — so platinum's dial is finer than
 * lead's. That is the rank, stated once, at the moment it is cast.
 *
 * EVERY LAYER RESTS INVISIBLE. Each carries `opacity: 0` inline and gets its
 * whole visible life from a `@keyframes` in `src/motion.ornament.css`, behind
 * `prefers-reduced-motion: no-preference`. So a reader who asked for no motion,
 * or whose deferred sheet has not arrived, sees no burst at all — they see the
 * plain state change the disc makes anyway. That is also why the paint is
 * INLINE rather than in a stylesheet: none of this may reach the critical CSS
 * (#2073), and the deferred sheet may hold nothing but motion.
 *
 * Nothing here is stateful or timed: the layers stay mounted after the run and
 * fall back to `opacity: 0`, and a fresh strike remounts them by key. No timer,
 * no cleanup, no effect.
 *
 * Exported for its own test and for no other reason: the burst is CLICK-driven
 * and the frontend harness has no DOM, so the only way to assert the dial's
 * pitch and the resting opacities from markup is to render this directly.
 */
export function CastBurst({
  metal,
  size,
}: {
  metal: (typeof METAL_SIGILS)[number]
  size: number
}) {
  const radius = size / 2
  /** The overhang the plate's padding and gap were sized for. */
  const reach = BURST_MARGIN / 2
  /** Every full-box layer sits concentric with the disc and overhangs by `reach`. */
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
  /*
   * The dial's ticks live in a BAND outside the disc, not across it: the mask
   * punches out everything inside 74% of the box and everything past 94%, so
   * what is left is a ruled rim the sigil is legible inside. `black` there is
   * an alpha stencil, not a colour — a mask reads opacity, so any opaque value
   * does and no token could be more correct than another (the same argument
   * index.css made for the ring this replaces).
   */
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
                // Motes DRIFT — a short outward wander with an updraft, rather
                // than the sparks' straight radial throw.
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
                // Struck FROM the rim, so they read as thrown off the metal
                // rather than fired through the sigil.
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
  /*
   * Which disc is mid-cast, and WHICH STRIKE it is. The counter is the whole
   * reason this is not a boolean: casting the same metal twice has to throw a
   * second burst, and a CSS animation only restarts if the element is new — so
   * `strike` is the burst's React key. Ornament state only; the cast itself is
   * `useVote`'s.
   */
  const [cast, setCast] = useState<{ value: number; strike: number } | null>(null)

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
       *
       * The mount is the RULE brass since #2141's mark/rule split (#2142): it
       * is a line, and the mark brass is reserved for things that are read.
       */}
      <div
        /* The plate is also the QUERY CONTAINER for the row inside it (#2236):
           `container-type: inline-size` is in index.css, on this class. */
        className="eph-vote-plate"
        style={chamferMount(PLATE_STEP)}
      >
        <div
          className="eph-metal-row"
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            /* Below the row's own intrinsic width the discs stay round and the
               LINE gives way instead — the last disc drops rather than five of
               them going oval. Centred so a wrapped row reads as one ladder. */
            flexWrap: 'wrap',
            justifyContent: 'center',
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
             *
             * #2142 DELETED the ambient ring and the figures still hold, which
             * is why nothing moved: the cast burst inherits the same box, and it
             * is the only thing left that reaches past a rim. Only one disc
             * casts at a time, so the 24px is now clearance against the plate's
             * clip rather than against a neighbour's ring.
             *
             * BOTH FIGURES ARE IN `index.css` NOW, on `.eph-metal-row` (#2236),
             * and they had to leave this object to get there: an inline style
             * beats a stylesheet, so a rule that yields them in a narrow plate
             * could not have been written while they were declared here. What
             * the sheet adds is the one thing no inline value can say — the
             * clearance holds while the PLATE has room for it, and gives way to
             * the smallest rung when it does not, so the discs never do.
             */
            /*
             * The ground is the MASTHEAD BAND, dropping to the same near-black
             * (#2142). The plate and the band are one metal catching light two
             * ways; before this the plate had a vote-only blue of its own that
             * belonged to no other Ephemerists surface. Still a radial recess,
             * not a flat fill.
             */
            ...chamferSheet(
              PLATE_STEP,
              'radial-gradient(130% 170% at 50% -20%, var(--faction-ephemerists-plate-band), var(--faction-ephemerists-vote-plate-to))',
            ),
            // ornament (#1609): the same inset well the Coven and S.N.I.D.E.
            // vote plates carry — a recess INSIDE a plate that is dark in both
            // cascades, not a cast onto a ground that flips. This one is also
            // tinted to its own plate (30,34,51 is the valley blue-black, not
            // neutral), which is the drawing rather than a stray alpha. Raw.
            boxShadow: 'inset 0 1px 8px rgba(30, 34, 51, 0.7)',
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
                /* A DISC IS A CIRCLE OR IT IS NOTHING (#2236). As a plain flex
                   item it was free to shrink, and in a plate too narrow for the
                   row it did — five ovals, at 31px wide against a 44px tall,
                   which is also under the touch floor in one axis. The row
                   yields its spacing instead (index.css), and wraps after that. */
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
              {/* The disc's own rim: the rule brass while idle, its metal once
                  reached (#2142 — a rim is a line, so it takes the rule). */}
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

              {/* A perpetual conic ring stood here on every reached disc, at
                  this metal's own spoke pitch (#1638). #2142 struck it: five
                  haloed discs at once is fog, and the pitch is unreadable at
                  44px. The pitch moved to the cast dial, where it is thrown
                  once, by one disc, at the moment it means something. */}
              {casting && <CastBurst key={`strike${cast.strike}`} metal={metal} size={size} />}

              {/* The shock ring leaving the disc as the metal strikes. */}
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
                // The sigil pops to 1.24 and back on the strike. Keyed on the
                // strike counter so a second cast of the same metal replays it:
                // a class that is already applied restarts no animation.
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

              {/* The seven planetary metals, drawn to the fully transmuted disc
                  (#2142). The orbit stays at `radius + FILING_ORBIT`: the
                  design's tighter `size/2 + 6` crowds twelve glyphs onto the rim
                  where they compete with the platinum sigil inside it. */}
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
                          // The glyph is centred on its orbit point rather than
                          // hung off it: a 9px mark is its own box, where the
                          // 3px dot this replaces was near enough a point.
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

              {/* A 16px night badge struck with the rank's roman numeral sat
                  here, at the metal's lower edge. #1638 struck it off, and
                  #2142 declined to bring it back with the cast line: the plate
                  states the rank once, in metal. */}
            </button>
          )
        })}
        </div>
      </div>

      {/* The italic gloss caption naming the hovered tier — and its "· cast"
          tag — stood here. #1638 struck both: each disc's `aria-label` already
          names its metal, so the caption row was a third restatement of the row
          above it. #2166 then did the same to the other eight skins, and took
          the shell's "Voted N pts" line and its aggregate tally with it —
          `votes:chrome.idle`, `.tag`, `.voted` and `.tally_*` all leave the
          catalog together, and the shell's summary block with them.

          #2142 §5 asked for a reckoning line back in this slot ("You cast gold"
          / "52 pts from 6 votes"). It is NOT built, and the conflict is on the
          issue: #2142 was filed at 01:07 and #2176 — "No text under the vote
          stars, none" — merged at 03:01 the same night, taking exactly those
          two statements off all nine skins and deleting the catalog keys. The
          issue's premise ("today it reads 'Voted 4 pts'") describes the plate
          as it was BEFORE that merge. Re-adding the line here would put this
          skin alone back on the far side of a ruling made two hours later, so
          it waits on an owner call. */}

      <VoteError error={error} color={OCHRE} />
    </div>
  )
}
