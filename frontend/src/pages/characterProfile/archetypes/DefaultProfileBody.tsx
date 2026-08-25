/**
 * DefaultProfileBody — the unaffiliated / no-faction player-profile skin
 * (#459), ported from the design system's `templates/default/Default
 * Profile.dc.html`: a clean sheet inside the thick spectrum band (all paths
 * open), and the fallback for every faction until its bespoke skin lands
 * (#460). All colours via `--faction-default-*` / global tokens (#418) — no
 * hardcoded hex; light/dark flips through the cascade.
 *
 * Locked section spine: ① identity + progression (shared CredentialCard as
 * the header), ② about — skipped in v1 (no field), ③ badges (hidden when
 * empty), ⑤ praxis (faction PraxisCard, FDL laurel on the top entry), plus
 * the kept proposed-tasks and friend/foe features.
 *
 * ONE RESPONSIVE COMPONENT (#1319, the ADR-0056 / ADR-0058 / ADR-0067 shape).
 * The phone skin used to be a separate file on a `mobileProfile` manifest
 * surface (`mobileArchetypes/DefaultProfile`, #517, redrawn for #969); that
 * surface is retired and its markup is the `MobileProfile` branch below,
 * unchanged. `useFormFactor()` is read once, at the exported component, which
 * is the only dispatcher — the same call site `<Faction>TaskDetail` uses.
 *
 * The two branches are separate components rather than one body full of
 * ternaries because they are not one layout at two sizes: the phone stacks a
 * centred credential over a SEGMENTED praxis/tasks toggle (which owns state),
 * where the desktop lays a two-column grid beside a badge aside. Sharing the
 * ornaments (laurel, badge row, eyebrow) is what the merge buys; sharing the
 * skeleton would have meant redrawing one of the two shipped designs.
 *
 * The na fidelity fix the phone branch carries (#749/ADR-0039): its identity
 * band, avatar hoop, progression bar and section dot reach the spectrum through
 * `factionFill(slug, …)` / CredentialCard, never `factionCssVar('na')`, which
 * resolves grey. Those seams stay per-faction — the branch is only reached by
 * na/albescent and by any faction with no `profileBody` row, so a themed slug
 * gets its solid hue and na gets the rainbow.
 */
import { useState, type CSSProperties, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import type { BadgeOut } from '../../../api/auth'
import { badgeArtFor } from '../../../components/badges/badgeArt'
import CredentialCard from '../../../components/CredentialCard'
import PraxisCard from '../../../components/praxisCard/PraxisCard'
import TaskCard from '../../../components/taskCard/TaskCard'
import { useFormFactor } from '../../../hooks/useFormFactor'
import {
  factionFill,
  factionSheet,
  isKnownFaction,
} from '../../../utils/factions'
import { factionRoleVars } from '../../../utils/factionRoles'
import { mediaUrl } from '../../../utils/media'
import type { ProfileBodyProps } from '../FactionProfileBody'
// The ② About block and the ① tagline slot are shared with every faction kit —
// see profileSkin.tsx. This is the one profile that does NOT delegate to
// `ProfileSkin`, so it mounts those components itself rather than growing a
// second copy of either rule.
import { AboutBlock, ProfileNameHeading, TaglineSlot } from './profileSkin'

type Segment = 'praxis' | 'tasks'

/**
 * The role map (#2672). Hoisted, because this file has TWO roots — the desktop
 * column and the `mobile-profile` one — and a surface's prefix is declared once
 * per root or the mobile half reads names nothing set.
 *
 * Pinned to na: the ground is `.na-backdrop` plus `factionSheet()`, neither of
 * which takes a slug, and an ink may not leave a ground that cannot follow it
 * (#2361, #2669). `{}` today; what the prefix buys is a name a dresser can
 * reach this one surface by — `identityOrnament` is the same motive.
 */
const ROLES = factionRoleVars("na", 'na-profile-body')

const EYEBROW: CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: 'var(--text-base)',
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: 'var(--color-text-tertiary)',
}

/** Section heading: display-italic title + optional eyebrow + a soft rainbow rule. */
function SectionHeading({ title, eyebrow }: { title: string; eyebrow?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
      <h2
        className="font-display italic"
        style={{ fontSize: 'var(--text-title)', margin: 0, color: 'var(--color-text-primary)' }}
      >
        {title}
      </h2>
      {eyebrow && <span style={{ ...EYEBROW, letterSpacing: '0.08em' }}>{eyebrow}</span>}
      <span
        aria-hidden
        className="spectrum-rule"
        style={{
          flex: 1,
          height: 3,
          borderRadius: 3,
          opacity: 0.5,
        }}
      />
    </div>
  )
}

/** The FDL laurel stamped on the character's top praxis (highest base+vote
 *  points — `praxis.score` is exactly that sum). Spectrum ring, ink glyph. */
function FdlLaurel() {
  const { t } = useTranslation('common')
  return (
    <span
      title={t('profile.topPraxis')}
      style={{
        position: 'absolute',
        top: -11,
        right: 14,
        zIndex: 20,
        width: 44,
        height: 44,
        // Same cast as the two boxShadows below, and the rule cannot see it:
        // `filter` is not a COLOUR_PROP, so this one was laundered past the
        // ratchet by the property it was written on rather than by its value.
        filter: 'drop-shadow(0 4px 8px var(--color-cast-shadow))',
      }}
    >
      <span
        className="spectrum-dial"
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
        }}
      />
      <span
        style={{
          position: 'absolute',
          inset: 4,
          borderRadius: '50%',
          background: 'var(--color-bg-surface-alt)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-text-primary)',
        }}
      >
        <svg width={18} height={22} viewBox="0 0 40 48" fill="currentColor" aria-hidden>
          <path d="M20 1 C16 10 16 17 20 24 C24 17 24 10 20 1 Z" />
          <path d="M20 22 C14 15 8 15 6 21 C4.6 25 8 29 13.5 27.6 C10.5 25 12.5 21 20 22 Z" />
          <path d="M20 22 C26 15 32 15 34 21 C35.4 25 32 29 26.5 27.6 C29.5 25 27.5 21 20 22 Z" />
          <rect x="11" y="26" width="18" height="4.5" rx="2.2" />
          <path d="M20 30 C17.5 37 16 41 20 47 C24 41 22.5 37 20 30 Z" />
        </svg>
      </span>
    </span>
  )
}

/** ③ One badge row: spectrum-ring medallion + name. `nameLineHeight` is the one
 *  thing the two form factors ever disagreed on, so it stays a knob rather than
 *  a second copy of the row. */
function BadgeRow({
  badge,
  last,
  nameLineHeight,
}: {
  badge: BadgeOut
  last: boolean
  nameLineHeight?: number
}) {
  const Art = badgeArtFor(badge.key)
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-md)',
        padding: 'var(--space-md) 0',
        borderBottom: last ? 'none' : '1px solid var(--color-border)',
      }}
    >
      <span
        className="spectrum-dial"
        style={{
          flexShrink: 0,
          width: 34,
          height: 34,
          borderRadius: '50%',
          // eslint-disable-next-line local/no-raw-style-values -- ornament: spectrum ring thickness on a 34px medallion; the nearest rung (4px) is a 60% thicker ring and visibly shrinks the inner disc.
          padding: 2.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxSizing: 'border-box',
        }}
      >
        <span
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            background: 'var(--color-bg-surface-alt)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-text-primary)',
          }}
        >
          <Art size={16} />
        </span>
      </span>
      <div
        className="font-display italic"
        style={{ fontSize: 'var(--text-content)', color: 'var(--color-text-primary)', lineHeight: nameLineHeight }}
      >
        {badge.name}
      </div>
    </div>
  )
}

/** ⑤ FDL laurel target: highest earned points (task base + points from votes —
 *  `PraxisCardOut.score` is that sum); first entry wins a tie. */
function laurelTarget(submissions: ProfileBodyProps['submissions']): number | null {
  const topScore = submissions.reduce((max, praxis) => Math.max(max, praxis.score ?? 0), 0)
  return submissions.find((praxis) => (praxis.score ?? 0) === topScore)?.id ?? null
}

/* A `spectrumRing(degrees, fill)` helper stood here: the level ring's filled
 * arc, cut in the SPECTRUM by a two-layer conic with the track masking the
 * unfilled sweep (#1630). It is deleted with the ring itself (#2213) — the arc
 * and the bar under it plotted the same percentage — and is NOT to be brought
 * back to make a profile look less bare. If a future surface genuinely needs a
 * spectrum-cut arc, ADR-0039's reasoning is the part worth rereading: the
 * unaffiliated identity is a gradient, so it appears wherever a gradient can go,
 * and a `background` is somewhere it can. */

/** ① progression numbers, shared by both branches (hidden until game config
 *  supplies thresholds). */
function progressionFigures(progression: ProfileBodyProps['progression']) {
  return {
    pointsIntoLevel: progression?.pointsIntoLevel ?? 0,
    levelSpan: progression?.levelSpan ?? 0,
  }
}

/**
 * An inert ornament layer mounted INSIDE the identity band, at both widths.
 *
 * The one seam a skin-fallthrough faction needs and could not otherwise reach.
 * Albescent renders this component whole (ADR-0048: `Default` PLUS a flourish,
 * never a repaint), and its tell is the na spectrum frame coming alive — a
 * flourish that lives ON the band, four pixels wide, which no wrapper outside
 * this component can aim at. The alternative shapes are both worse: an overlay
 * on a wrapper covers the whole page rather than the band, and a `slug ===
 * 'albescent'` branch in here would put the society's name in the very file
 * that exists to make it indistinguishable.
 *
 * Optional, so na and every unskinned slug render byte-identically — #1153's
 * rule, and the same shape `DefaultTaskDetail`'s `worthSlot` and
 * `DefaultPraxisDetail`'s `ornament` already take.
 */
export interface DefaultProfileBodyProps extends ProfileBodyProps {
  identityOrnament?: ReactNode
}

export default function DefaultProfileBody(props: DefaultProfileBodyProps) {
  return useFormFactor() === 'mobile' ? (
    <MobileProfile {...props} />
  ) : (
    <DesktopProfile {...props} />
  )
}

function DesktopProfile({
  character,
  submissions,
  proposedTasks,
  progression,
  identityActions,
  identityOrnament,
  onSignup,
}: DefaultProfileBodyProps) {
  const { t } = useTranslation('common')
  const badges = character.badges ?? []
  const joined = new Date(character.created_at).toLocaleDateString(undefined, {
    month: 'short',
    year: 'numeric',
  })

  const laurelId = laurelTarget(submissions)
  const { pointsIntoLevel, levelSpan } = progressionFigures(progression)

  const mainColumn = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2xl)', minWidth: 0 }}>
      {/* ── ⑤ Praxis ── */}
      <section>
        {/* No byline (#2231). Everything under this heading is THIS
            character's own praxis, so "Submitted by <them>" is the one thing
            the line could never not say. `common:profile.praxisEyebrow` stays
            in the catalog — it is the right sentence wherever authorship is
            genuinely in question; this mount is simply not one of them. */}
        <SectionHeading title={t('profile.praxisHeading')} />
        {submissions.length === 0 ? (
          <div
            style={{
              border: '1.5px dashed var(--color-border-strong)',
              borderRadius: 12,
              padding: 'var(--space-2xl)',
              textAlign: 'center',
              background: 'var(--color-bg-surface-alt)',
            }}
          >
            <div
              className="font-display italic"
              style={{ fontSize: 'var(--text-title)', color: 'var(--color-text-primary)' }}
            >
              {t('profile.praxisEmptyTitle')}
            </div>
            <div
              className="font-body"
              style={{ fontSize: 'var(--text-content)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-xs)' }}
            >
              {t('profile.praxisEmptyBody')}
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-4 items-start">
            {submissions.map((praxis) => (
              <div key={praxis.id} style={{ position: 'relative' }}>
                {praxis.id === laurelId && <FdlLaurel />}
                {/* One fleur per corner: the laurel replaces the card's own
                    Task Crown rather than stacking on it (#1960). */}
                <PraxisCard praxis={praxis} showCrown={praxis.id !== laurelId} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Proposed tasks (kept feature, #419) ── */}
      <section>
        <SectionHeading
          title={t('profile.proposedTasksHeading')}
          eyebrow={t('profile.proposedTasksTotal', { count: proposedTasks.length })}
        />
        {proposedTasks.length === 0 ? (
          <p className="font-body text-muted">{t('profile.proposedTasksEmpty')}</p>
        ) : (
          <div className="task-card-row gap-4">
            {proposedTasks.map((task) => (
              <TaskCard key={task.id} task={task} basePoints={task.point_value} onSignup={onSignup} />
            ))}
          </div>
        )}
      </section>
    </div>
  )

  return (
    <div className="py-8" style={{ ...ROLES, position: 'relative' }}>
      {/* Full-page spectrum wash — the na "all paths open" backdrop. The
          `.na-backdrop` rule (raw radial-gradient rgba + a [data-theme="dark"]
          brighten) lives in index.css and is owned by frontend-style; port it
          from the vendored default.css. Inert until that class lands. */}
      <div className="na-backdrop" aria-hidden />
      <div style={{ position: 'relative', zIndex: 1 }}>
      {/* ── ① Identity + progression — spectrum band, credential pinned ── */}
      <div
        className="spectrum-rule"
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 16,
          padding: 'var(--space-xs)',
          boxShadow: '0 20px 50px -26px var(--color-cast-shadow)',
          marginBottom: 'var(--space-2xl)',
        }}
      >
        {identityOrnament}
        <div
          style={{
            borderRadius: 12,
            ...factionSheet(),
            padding: 'var(--space-xl)',
            display: 'flex',
            gap: 'var(--space-2xl)',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ flexShrink: 0 }}>
            <CredentialCard
              displayName={character.display_name}
              handle={character.username}
              factionSlug={character.faction_slug}
              level={character.level}
              score={character.score}
              avatarUrl={character.avatar_url ? mediaUrl(character.avatar_url) : null}
            />
          </div>

          <div style={{ flex: 1, minWidth: 280 }}>
            {/* ① The column's display line (#1629). The spectrum-ring eyebrow,
                the display name and the "Unaffiliated · faction pending"
                caption all stood here; the credential card to the left says the
                name and the faction, so the column carries the player's own
                line and nothing else. Blank until someone writes one. The name
                stays as the page's <h1>, for the outline only. */}
            <ProfileNameHeading name={character.display_name} />
            <TaglineSlot
              tagline={character.tagline}
              style={{
                fontFamily: 'var(--font-display)',
                fontStyle: 'italic',
                color: 'var(--na-profile-body-ink, var(--faction-default-card-text))',
              }}
            />

            <div
              className="font-body"
              style={{
                fontSize: 'var(--text-content)',
                color: 'var(--color-text-tertiary)',
                marginTop: 'var(--space-md)',
              }}
            >
              {t('profile.handleJoined', { username: character.username, joined })}
            </div>

            {/* progression panel */}
            {progression && (
              <div
                style={{
                  marginTop: 'var(--space-xl)',
                  border: '1px solid var(--color-border-strong)',
                  borderRadius: 12,
                  padding: 'var(--space-lg)',
                  background: 'var(--color-bg-surface-alt)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-lg)',
                  maxWidth: 440,
                }}
              >
                {/* Level readout — text, and DELIBERATELY not a ring (#2213).
                    The spectrum-cut arc that drew this number and held the
                    numeral in its hub is gone from all nine profiles and is not
                    to be restored: it plotted the same percentage as the bar to
                    its right. The numeral is the ring's second job and stays.
                    Both inks are unchanged, because the hub disc was painted in
                    the panel's own `--color-bg-surface-alt`. */}
                <div
                  style={{
                    flexShrink: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-xs)',
                    lineHeight: 1,
                  }}
                >
                  <span style={{ ...EYEBROW, fontSize: 'var(--text-md)', letterSpacing: '0.1em' }}>{t('profile.lvl')}</span>
                  <span
                    className="font-display italic"
                    style={{ fontSize: 'var(--text-title)', color: 'var(--color-text-primary)' }}
                  >
                    {character.level}
                  </span>
                </div>

                {/* points-into-level bar toward level+1 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      marginBottom: 'var(--space-sm)',
                    }}
                  >
                    {/* THE TOP OF THE CURVE IS ITS OWN LINE (#2383). There is
                        no rung above the last one, so the band collapses to
                        zero width and there is no level to name: both figures
                        would print as noise ("0 / 0 pts this level", "next ·
                        lvl 8"). The field desk has always drawn one sentence
                        here instead, and this is the same string in the same
                        body voice — the eyebrow's caps are for a two-word
                        label, not for a sentence. The slot is the whole row,
                        which is the point: the line is four times the length
                        of the eyebrow it replaces. */}
                    {progression.nextLevel === null ? (
                      <span
                        className="font-body"
                        style={{ fontSize: 'var(--text-content)', color: 'var(--color-text-secondary)' }}
                      >
                        {t('sidebar.characterCard.topLevel')}
                      </span>
                    ) : (
                      <>
                        <span
                          className="font-body"
                          style={{ fontSize: 'var(--text-content)', color: 'var(--color-text-secondary)' }}
                        >
                          {t('profile.ptsThisLevel', { current: pointsIntoLevel, span: levelSpan })}
                        </span>
                        <span style={{ ...EYEBROW, fontSize: 'var(--text-md)', letterSpacing: '0.08em' }}>
                          {t('profile.nextLevel', { level: progression.nextLevel })}
                        </span>
                      </>
                    )}
                  </div>
                  <div
                    style={{
                      height: 10,
                      borderRadius: 20,
                      background: 'var(--color-border)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      className="spectrum-rule"
                      style={{
                        height: '100%',
                        borderRadius: 20,
                        width: `${progression.progressPercent}%`,
                        transition: 'width 300ms',
                      }}
                    />
                  </div>
                  {/* The whole climb, DEMOTED to the caption tier (#2127). It
                      used to sit here at --text-content, the same weight as
                      "15 / 160 pts this level" above the bar — two
                      denominators beside one bar, with nothing saying which
                      one the bar tracked. The bar reads the band; this line
                      annotates it, in the voice the home page's "185 all-time"
                      caption uses. `.label-caption` is the minted tier
                      (#1307), so no new style is invented for it. At the top
                      of the curve there is no threshold for it to annotate and
                      the line goes (#2383) — the era-points figure it carried
                      is still on the credential beside this panel. */}
                  {progression.nextLevel !== null && (
                    <div className="label-caption" style={{ marginTop: 'var(--space-xs)' }}>
                      {t('profile.ptsToNext', { score: character.score, threshold: progression.nextThreshold })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* friend/foe — kept feature, faction-skinned, folded into the header */}
            {identityActions && (
              <div style={{ marginTop: 'var(--space-lg)', maxWidth: 220 }}>{identityActions}</div>
            )}
          </div>
        </div>
      </div>

      {/* ── ② About — the long-form field arrived with #1626 ── */}
      <AboutBlock bio={character.bio} heading={<SectionHeading title={t('profile.aboutHeading')} />} />

      {badges.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) fit-content(300px)',
            gap: 'var(--space-2xl)',
            alignItems: 'start',
          }}
        >
          {mainColumn}

          {/* ── ③ Badges — hidden entirely when the character has none ── */}
          <aside>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}
            >
              <h2
                className="font-display italic"
                style={{ fontSize: 'var(--text-title)', margin: 0, color: 'var(--color-text-primary)' }}
              >
                {t('profile.badgesHeading')}
              </h2>
              <span
                style={{
                  ...EYEBROW,
                  fontSize: 'var(--text-md)',
                  letterSpacing: '0.1em',
                  marginLeft: 'auto',
                  border: '1px solid var(--color-border-strong)',
                  borderRadius: 20,
                  padding: 'var(--space-xs) var(--space-sm)',
                }}
              >
                {t('profile.badgesEarned', { count: badges.length })}
              </span>
            </div>
            <div
              style={{
                border: '1px solid var(--color-border)',
                borderRadius: 12,
                background: 'var(--color-bg-surface-alt)',
                padding: 'var(--space-xs) var(--space-lg)',
              }}
            >
              {badges.map((badge, index) => (
                <BadgeRow
                  key={badge.key}
                  badge={badge}
                  last={index === badges.length - 1}
                  nameLineHeight={1.15}
                />
              ))}
            </div>
          </aside>
        </div>
      ) : (
        mainColumn
      )}
      </div>
    </div>
  )
}

/**
 * The phone reflow of the same #459 contract: centred credential on the
 * spectrum band, badges above, and a segmented Praxis/Tasks toggle over the
 * shared cards stacked single-column. Presentation only — it renders no field
 * the contract does not expose.
 */
function MobileProfile({
  character,
  submissions,
  proposedTasks,
  progression,
  identityActions,
  identityOrnament,
  onSignup,
}: DefaultProfileBodyProps) {
  const { t } = useTranslation('common')
  const [segment, setSegment] = useState<Segment>('praxis')
  const badges = character.badges ?? []
  const isUnaffiliated = !isKnownFaction(character.faction_slug)

  const joined = new Date(character.created_at).toLocaleDateString(undefined, {
    month: 'short',
    year: 'numeric',
  })

  const laurelId = laurelTarget(submissions)
  const { pointsIntoLevel, levelSpan } = progressionFigures(progression)

  return (
    <div
      className="py-4"
      data-testid="mobile-profile"
      style={{ ...ROLES, position: 'relative' }}
    >
      {/* Full-page spectrum wash — the na "all paths open" backdrop. The
          `.na-backdrop` rule (raw radial-gradient rgba + a [data-theme="dark"]
          brighten) lives in index.css and is owned by frontend-style; port it
          from the vendored default.css. Inert until that class lands. */}
      <div className="na-backdrop" aria-hidden />
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* ── ① Identity — spectrum band, centred credential ── */}
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 16,
            padding: 'var(--space-xs)',
            ...factionFill(character.faction_slug, 'bar'),
            boxShadow: '0 20px 50px -26px var(--color-cast-shadow)',
          }}
        >
          {identityOrnament}
          <div
            style={{
              borderRadius: 12,
              ...(isUnaffiliated ? factionSheet() : { background: 'var(--color-bg-surface-alt)' }),
              padding: 'var(--space-lg)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'var(--space-md)',
            }}
          >
            {/* identity header — the shared credential card (its Unaffiliated
                state wears the spectrum ring; themed slugs keep their accent).
                The spectrum-dot "Player · Unaffiliated" eyebrow that sat above
                it went with #1629, on the phone as on the laptop. */}
            <CredentialCard
              displayName={character.display_name}
              handle={character.username}
              factionSlug={character.faction_slug}
              level={character.level}
              score={character.score}
              avatarUrl={character.avatar_url ? mediaUrl(character.avatar_url) : null}
            />

            {/* ① the column's display line, centred under the card — the same
                shared slot the laptop mounts (#1629), over the same outline-only
                <h1>. */}
            <ProfileNameHeading name={character.display_name} />
            <TaglineSlot
              tagline={character.tagline}
              style={{
                fontFamily: 'var(--font-display)',
                fontStyle: 'italic',
                textAlign: 'center',
                margin: '0 auto',
                color: isUnaffiliated
                  ? 'var(--na-profile-body-ink, var(--faction-default-card-text))'
                  : 'var(--color-text-primary)',
              }}
            />

            {/* subtitle: handle / joined. The "Unaffiliated · faction pending"
                caption that led this line is gone (#1629). */}
            <span className="font-body" style={{ fontSize: 'var(--text-content)', color: 'var(--color-text-tertiary)' }}>
              {t('profile.handleJoined', { username: character.username, joined })}
            </span>

            {/* progression panel — level readout + points-into-level bar */}
            {progression && (
              <div
                style={{
                  width: '100%',
                  border: '1px solid var(--color-border-strong)',
                  borderRadius: 12,
                  padding: 'var(--space-lg)',
                  background: 'var(--color-bg-surface-alt)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-lg)',
                }}
              >
                {/* The phone's half of the same deletion (#2213) — see the
                    laptop branch above. The arc drew `factionFill(slug, 'dot')`
                    where this branch is the fall-through for a themed slug with
                    no `profileBody` row; the bar below still does, so that seam
                    is intact and only the duplicate instrument went. */}
                <div
                  style={{
                    flexShrink: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-xs)',
                    lineHeight: 1,
                  }}
                >
                  <span style={{ ...EYEBROW, fontSize: 'var(--text-md)', letterSpacing: '0.1em' }}>{t('profile.lvl')}</span>
                  <span
                    className="font-display italic"
                    style={{ fontSize: 'var(--text-title)', color: 'var(--color-text-primary)' }}
                  >
                    {character.level}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      marginBottom: 'var(--space-sm)',
                    }}
                  >
                    {/* The phone's half of the top-of-the-curve line (#2383) —
                        see the laptop branch above. Narrower still here, which
                        is exactly why the sentence gets the whole row rather
                        than the right-hand eyebrow slot. */}
                    {progression.nextLevel === null ? (
                      <span className="font-body" style={{ fontSize: 'var(--text-content)', color: 'var(--color-text-secondary)' }}>
                        {t('sidebar.characterCard.topLevel')}
                      </span>
                    ) : (
                      <>
                        <span className="font-body" style={{ fontSize: 'var(--text-content)', color: 'var(--color-text-secondary)' }}>
                          {t('profile.ptsThisLevel', { current: pointsIntoLevel, span: levelSpan })}
                        </span>
                        <span style={{ ...EYEBROW, fontSize: 'var(--text-md)', letterSpacing: '0.08em' }}>
                          {t('profile.nextLevel', { level: progression.nextLevel })}
                        </span>
                      </>
                    )}
                  </div>
                  <div style={{ height: 10, borderRadius: 20, background: 'var(--color-border)', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        borderRadius: 20,
                        width: `${progression.progressPercent}%`,
                        ...factionFill(character.faction_slug, 'bar'),
                        transition: 'width 300ms',
                      }}
                    />
                  </div>
                  {/* The whole climb, DEMOTED to the caption tier (#2127). It
                      used to sit here at --text-content, the same weight as
                      "15 / 160 pts this level" above the bar — two
                      denominators beside one bar, with nothing saying which
                      one the bar tracked. The bar reads the band; this line
                      annotates it, in the voice the home page's "185 all-time"
                      caption uses. `.label-caption` is the minted tier
                      (#1307), so no new style is invented for it. At the top
                      of the curve there is no threshold for it to annotate and
                      the line goes (#2383) — the era-points figure it carried
                      is still on the credential beside this panel. */}
                  {progression.nextLevel !== null && (
                    <div className="label-caption" style={{ marginTop: 'var(--space-xs)' }}>
                      {t('profile.ptsToNext', { score: character.score, threshold: progression.nextThreshold })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* friend/foe — kept feature (#459), folded under identity */}
            {identityActions && (
              <div style={{ marginTop: 'var(--space-xs)', maxWidth: 220, width: '100%' }}>{identityActions}</div>
            )}
          </div>
        </div>

        {/* ── ② About — same block as the desktop branch and every kit ── */}
        <AboutBlock bio={character.bio} heading={<SectionHeading title={t('profile.aboutHeading')} />} />

        {/* ── ③ Badges — hidden entirely when empty ── */}
        {badges.length > 0 && (
          <div style={{ marginTop: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
              <h2 className="font-display italic" style={{ fontSize: 'var(--text-title)', color: 'var(--color-text-primary)' }}>
                {t('profile.badgesHeading')}
              </h2>
              <span className="label-caption" style={{ marginLeft: 'auto' }}>
                {t('profile.badgesEarned', { count: badges.length })}
              </span>
            </div>
            <div
              style={{
                border: '1px solid var(--color-border)',
                borderRadius: 12,
                background: 'var(--color-bg-surface-alt)',
                padding: 'var(--space-xs) var(--space-lg)',
              }}
            >
              {badges.map((badge, index) => (
                <BadgeRow key={badge.key} badge={badge} last={index === badges.length - 1} />
              ))}
            </div>
          </div>
        )}

        {/* ── Segmented Praxis / Tasks toggle ── */}
        <div
          style={{
            display: 'flex',
            gap: 'var(--space-xs)',
            padding: 'var(--space-xs)',
            borderRadius: 999,
            background: 'var(--color-bg-surface-alt)',
            border: '1px solid var(--color-border)',
            marginTop: 'var(--space-lg)',
            marginBottom: 'var(--space-lg)',
          }}
        >
          <SegTab on={segment === 'praxis'} onClick={() => setSegment('praxis')}>
            {t('profile.mobile.tabPraxis')}
          </SegTab>
          <SegTab on={segment === 'tasks'} onClick={() => setSegment('tasks')}>
            {t('profile.mobile.tabTasks')}
          </SegTab>
        </div>

        {/* ── Content — reuse the existing cards, stacked single-column ── */}
        {segment === 'praxis' ? (
          submissions.length === 0 ? (
            <p className="font-body text-muted">{t('profile.praxisEmptyTitle')}</p>
          ) : (
            <div className="flex flex-col gap-4 items-stretch">
              {submissions.map((praxis) => (
                <div key={praxis.id} style={{ position: 'relative' }}>
                  {praxis.id === laurelId && <FdlLaurel />}
                  {/* One fleur per corner — see the desktop branch (#1960). */}
                  <PraxisCard praxis={praxis} showCrown={praxis.id !== laurelId} />
                </div>
              ))}
            </div>
          )
        ) : proposedTasks.length === 0 ? (
          <p className="font-body text-muted">{t('profile.proposedTasksEmpty')}</p>
        ) : (
          /* `items-center`, not the praxis list's `items-stretch`: a task card
             carries its own fixed width (§10 forbids regularizing it), so a
             stretch column leaves it flush left against a ragged right (#1964).
             A praxis card has no width of its own and still stretches. */
          <div className="flex flex-col gap-4 items-center">
            {proposedTasks.map((task) => (
              <TaskCard key={task.id} task={task} basePoints={task.point_value} onSignup={onSignup} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * One segment of the Praxis/Tasks toggle. The ON half INVERTS — it fills with
 * the page's primary ink and prints the page itself, the same two lines every
 * other inverted pill in the app carries (`.btn-primary`, `.chip-active`,
 * `ScoreToggle`, `ProposeTaskLink`, the Field Desk's own browse switch).
 *
 * IT USED TO INK WITH `--color-text-on-accent` AND THAT WAS #2107. That neutral
 * is `#ffffff` in `:root` alone and never flips, while `--color-text-primary`
 * flips to a warm cream (`#f0e6d0`) in dark — so the dark pill was white on
 * cream at **1.24:1**, the label all but gone, while light read a fine 18.51:1.
 * `--color-bg-page` is the ground that neutral is measured against and flips
 * with it: 16.86:1 light, 15.00:1 dark. Identical defect to the faction page's
 * join button (#1819); the guard at the bottom of `factionContrast.test.ts` is
 * what stops the third copy.
 *
 * The OFF half is unchanged and was never in question: `--color-text-secondary`
 * over the rail's `--color-bg-surface-alt` composite is 7.31:1 / 7.21:1, the
 * AAA pairing `factionContrast.test.ts` already gates as "app alt surface".
 */
function SegTab({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        fontFamily: 'var(--font-body)',
        fontSize: 'var(--text-lg)',
        fontWeight: on ? 700 : 400,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: on ? 'var(--color-bg-page)' : 'var(--color-text-secondary)',
        background: on ? 'var(--color-text-primary)' : 'transparent',
        border: 'none',
        borderRadius: 999,
        padding: 'var(--space-sm) 0',
        minHeight: 36,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}
