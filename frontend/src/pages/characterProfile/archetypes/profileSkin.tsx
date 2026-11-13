/**
 * Shared profile-skin renderer (#460, #2996) for all nine factions, both widths.
 *
 * Every profile renders the same locked spine: ① identity + progression,
 * ② About, ③ badges (hidden when empty), ⑤ praxis (FDL laurel on the top entry)
 * and proposed tasks. Only the costume differs: each `<Faction>ProfileBody.tsx`
 * supplies a `ProfileKit` and delegates here. Phone: the two galleries sit
 * behind {@link GallerySwitch}; laptop: they fold on `PROFILE_SECTIONS` (#2958).
 *
 * No hex: kits read `--faction-<slug>-*` vars. `dataTheme` scopes to the skin
 * container, never the global [data-theme]; only Singularity pins one (ADR-0085).
 *
 * Phone layout stacks single-column (#1319); desktop is unchanged.
 */
import { useState, type CSSProperties, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { useFormFactor } from '../../../hooks/useFormFactor'

import type { BadgeOut } from '../../../api/auth'
import { badgeArtFor } from '../../../components/badges/badgeArt'
import CredentialCard from '../../../components/CredentialCard'
import SegmentedRail from '../../../components/ui/FilterBar/SegmentedRail'
import PraxisCard from '../../../components/praxisCard/PraxisCard'
import TaskCard from '../../../components/taskCard/TaskCard'
import { mediaUrl } from '../../../utils/media'
import {
  PROFILE_SECTIONS,
  SectionPanel,
  SectionToggle,
  useSectionDisclosures,
} from '../../factionDetail/sectionDisclosure'
import type { ProfileBodyProps } from '../FactionProfileBody'

/** The costume knobs a faction fills in: CSS var references only, no hex. */
interface ProfileKit {
  /** Drives the shared CredentialCard skin. */
  slug: string
  /** Pinned theme, scoped to the container only. */
  dataTheme?: 'light' | 'dark'

  /** Scoped custom properties for the page root (`factionBodyVars(slug)`). */
  pageVars?: CSSProperties
  pageBackground: string
  /** Decorative overlay over the page (texture/grid). */
  pageOverlay?: string
  ink: string
  /** Quiet ink, on `surface` and `pageBackground`. */
  muted: string
  /** Quiet ink on the header's own ground, for a kit whose header is a different
   *  stock from `surface` (#1636; Ephemerists' cornice band). Defaults to `muted`. */
  headerMuted?: string
  /** Ink for the level numeral, on whatever `progressionStyle` paints (#2213).
   *  A kit moving its panel to a new stock repoints this; don't add a second knob. */
  accent: string
  surface: string
  border: string

  displayFont: string
  /** Slope of the display face where this module sets it (na is italic). Typed
   *  as one trait so a kit cannot sneak `fontSize` in. */
  displayFontStyle?: CSSProperties['fontStyle']
  eyebrowFont: string
  bodyFont?: string

  headerStyle: CSSProperties
  /** Absolutely-positioned decoration inside the header. */
  headerDecoration?: ReactNode
  /**
   * Chrome AROUND the whole identity band; the only slot that receives
   * `identityOrnament` (#2996). na's band is a spectrum ramp around a sheet.
   * The kit writes the ramp as JSX, not a class-name field, because
   * `albescentSpectraMove`'s census reads `spectrum-rule` off literal classNames
   * in source.
   */
  headerFrame?: (band: ReactNode, ornament: ReactNode) => ReactNode
  credentialFrame?: (card: ReactNode) => ReactNode
  /** Dress for {@link TaglineSlot}, incl. header-band ink corrections (#1636).
   *  A kit must NOT set `fontSize`; the slot owns it. */
  taglineExtra?: CSSProperties

  progressionStyle: CSSProperties
  barFill: string
  /** Bar fill as JSX, for a kit whose fill is a class (na's `.spectrum-rule`).
   *  When set, `barFill` is unread. JSX for the same census reason as `headerFrame`. */
  levelBar?: (percent: number) => ReactNode
  barTrack: string
  /** Default: the integer; e.g. roman for ephemerists. */
  formatLevel?: (level: number) => string

  /**
   * Renders a section heading. `title` is a node (a `SectionToggle` for the
   * disclosures, #2958), so a kit may not do string work on it.
   */
  sectionHeading: (title: ReactNode, eyebrow: string) => ReactNode

  emptyStateStyle: CSSProperties
  /** The FDL laurel stamped on the top praxis. */
  laurel: ReactNode

  badgeBoardStyle: CSSProperties
  badgeRow: (badge: BadgeOut, last: boolean) => ReactNode
  /** "{n} earned" chip style. */
  badgeChipStyle: CSSProperties
}

/** A kit is dress only; copy is read by `ProfileSkin` itself (#1911). */
export type ProfileDress = ProfileKit

/** Spectrum-ring FDL laurel; colorless factions supply an ink-outline variant. */
export function SpectrumLaurel({
  ringBg = 'var(--faction-default-rainbow-conic)',
  centerBg = 'var(--color-bg-surface-alt)',
  glyphColor = 'var(--color-text-primary)',
  rotate = 0,
}: {
  ringBg?: string
  centerBg?: string
  glyphColor?: string
  rotate?: number
}) {
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
        transform: rotate ? `rotate(${rotate}deg)` : undefined,
        filter: 'drop-shadow(0 4px 8px var(--color-cast-shadow))',
      }}
    >
      <span
        style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: ringBg }}
      />
      <span
        style={{
          position: 'absolute',
          inset: 4,
          borderRadius: '50%',
          background: centerBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: glyphColor,
        }}
      >
        <LaurelGlyph />
      </span>
    </span>
  )
}

/** The fleur/laurel glyph, in currentColor. */
export function LaurelGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size * (22 / 18)}
      viewBox="0 0 40 48"
      fill="currentColor"
      aria-hidden
    >
      <path d="M20 1 C16 10 16 17 20 24 C24 17 24 10 20 1 Z" />
      <path d="M20 22 C14 15 8 15 6 21 C4.6 25 8 29 13.5 27.6 C10.5 25 12.5 21 20 22 Z" />
      <path d="M20 22 C26 15 32 15 34 21 C35.4 25 32 29 26.5 27.6 C29.5 25 27.5 21 20 22 Z" />
      <rect x="11" y="26" width="18" height="4.5" rx="2.2" />
      <path d="M20 30 C17.5 37 16 41 20 47 C24 41 22.5 37 20 30 Z" />
    </svg>
  )
}

/**
 * ② About — `character.bio` (#1626), one shared block a kit dresses via
 * `heading`/`style` (ink and font, never size). Plain text, `pre-wrap`, no
 * markdown (#523). Hidden when empty.
 */
export function AboutBlock({
  bio,
  heading,
  style,
}: {
  bio?: string | null
  heading: ReactNode
  /** Ink + font for the paragraph. */
  style?: CSSProperties
}) {
  const text = (bio ?? '').trim()
  if (!text) return null
  return (
    <section style={{ marginTop: 'var(--space-2xl)', marginBottom: 'var(--space-2xl)' }}>
      {heading}
      <p
        style={{
          fontFamily: 'var(--font-body)',
          color: 'var(--color-text-secondary)',
          ...style,
          fontSize: 'var(--text-content)',
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          overflowWrap: 'anywhere',
          // `ch` follows the kit's body font.
          maxWidth: '68ch',
          margin: 0,
        }}
      >
        {text}
      </p>
    </section>
  )
}

/**
 * ① The identity column's display line — `character.tagline` (#1629); the name
 * already reads off the credential card. Shared slot; a kit dresses it via
 * `style`. Caller owns `margin`; size and measure are the slot's (a tagline is
 * read, so it takes a type tier, not §4a's ornament hatch). Hidden when empty.
 */
export function TaglineSlot({
  tagline,
  style,
}: {
  tagline?: string | null
  style?: CSSProperties
}) {
  const text = (tagline ?? '').trim()
  if (!text) return null
  return (
    <p
      style={{
        fontFamily: 'var(--font-display)',
        color: 'var(--color-text-primary)',
        margin: 0,
        ...style,
        fontSize: 'var(--text-heading)',
        lineHeight: 1.16,
        maxWidth: '22ch',
        overflowWrap: 'anywhere',
      }}
    >
      {text}
    </p>
  )
}

/**
 * The page's `<h1>`, visually hidden: the route has no `PageTitle` and
 * `CredentialCard`'s name is a `<div>`, so without it screen readers get no top
 * outline level. Visible would restore the line the design removed (#1629).
 */
export function ProfileNameHeading({ name }: { name: string }) {
  return <h1 className="sr-only">{name}</h1>
}

/** Skinnable medallion + badge name; the glyph is mapped by badge key. */
export function BadgeRow({
  badge,
  last,
  medallion,
  nameStyle,
  dividerColor,
}: {
  badge: BadgeOut
  last: boolean
  medallion: (glyph: ReactNode) => ReactNode
  nameStyle: CSSProperties
  dividerColor: string
}) {
  const Art = badgeArtFor(badge.key)
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-md)',
        padding: 'var(--space-md) 0',
        borderBottom: last ? 'none' : `1px solid ${dividerColor}`,
      }}
    >
      {medallion(<Art size={16} />)}
      {/* Names are read text (#459): the row owns the size, not the kit. */}
      <div style={{ ...nameStyle, fontSize: 'var(--text-content)' }}>{badge.name}</div>
    </div>
  )
}

/** Which gallery the phone has up. */
type Segment = 'praxis' | 'tasks'

/**
 * The phone's gallery switch: the app's own `SegmentedRail` (#2996), not a
 * bespoke tab pair (theming, a11y and 44px target come with it).
 * ponytail: borrows `leaderboard.roster.railLabel` ("Show") as the group name.
 * Ceiling: a `leaderboard.*` key on a profile. Upgrade: a
 * `profile.mobile.tabsLabel` when someone owns profile copy.
 */
function GallerySwitch({
  segment,
  onChange,
}: {
  segment: Segment
  onChange: (next: Segment) => void
}) {
  const { t } = useTranslation('common')
  return (
    <SegmentedRail
      rail={{
        key: 'profile-gallery',
        label: t('leaderboard.roster.railLabel'),
        value: segment,
        defaultValue: 'praxis',
        segments: [
          { value: 'praxis', label: t('profile.mobile.tabPraxis') },
          { value: 'tasks', label: t('profile.mobile.tabTasks') },
        ],
        onChange: (value) => onChange(value as Segment),
      }}
    />
  )
}

/** Lays out the locked spine in the kit's costume. */
export function ProfileSkin({
  props,
  kit,
  identityOrnament,
}: {
  props: ProfileBodyProps
  kit: ProfileKit
  /**
   * Inert layer on the identity band via {@link ProfileKit.headerFrame}
   * (Albescent's `.alb-profile-edge`, ADR-0048). A prop, not a kit field: it
   * arrives per render from the wrapper archetype.
   */
  identityOrnament?: ReactNode
}) {
  const { t } = useTranslation('common')
  const mobile = useFormFactor() === 'mobile'
  // Phone branch only.
  const [segment, setSegment] = useState<Segment>('praxis')
  // Laptop branch only: the galleries fold, About and Badges do not (#2958).
  const sections = useSectionDisclosures(PROFILE_SECTIONS)
  /** Every quiet ink INSIDE `<header>`. */
  const headerMuted = kit.headerMuted ?? kit.muted
  const { character, submissions, proposedTasks, progression, identityActions, onSignup } = props
  const badges = character.badges ?? []
  const joined = new Date(character.created_at).toLocaleDateString(undefined, {
    month: 'short',
    year: 'numeric',
  })

  // ⑤ FDL laurel target: highest earned points (PraxisCardOut.score is base+vote).
  const topScore = submissions.reduce((max, p) => Math.max(max, p.score ?? 0), 0)
  const laurelId = submissions.find((p) => (p.score ?? 0) === topScore)?.id ?? null

  // Figures arrive computed (ProfileProgression, #2127).
  const pointsIntoLevel = progression?.pointsIntoLevel ?? 0
  const levelSpan = progression?.levelSpan ?? 0

  const levelText = kit.formatLevel
    ? kit.formatLevel(character.level)
    : String(character.level)

  /** A kit with no frame renders the band bare and never sees the ornament. */
  const frameIdentity = (band: ReactNode) =>
    kit.headerFrame ? kit.headerFrame(band, identityOrnament) : band

  /**
   * `stillRing` (#3024): on Albescent the band around this card already travels
   * (`.alb-profile-edge`), so a turning portrait ring would be two spectra on one
   * object (#2519). Only this mount stands the ring still.
   */
  const credential = (
    <CredentialCard
      stillRing
      displayName={character.display_name}
      handle={character.username}
      factionSlug={character.faction_slug}
      level={character.level}
      score={character.score}
      avatarUrl={character.avatar_url ? mediaUrl(character.avatar_url) : null}
    />
  )

  const praxisGallery = (
    <>
        {submissions.length === 0 ? (
          <div style={kit.emptyStateStyle}>
            <div
              style={{
                fontFamily: kit.displayFont,
                fontStyle: kit.displayFontStyle,
                fontSize: 'var(--text-title)',
                color: kit.ink,
              }}
            >
              {t('profile.praxisEmptyTitle')}
            </div>
            <div
              style={{
                fontFamily: kit.bodyFont ?? kit.eyebrowFont,
                fontSize: 'var(--text-content)',
                color: kit.muted,
                marginTop: 'var(--space-xs)',
              }}
            >
              {t('profile.praxisEmptyBody')}
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-4 items-start">
            {submissions.map((praxis) => (
              <div key={praxis.id} style={{ position: 'relative' }}>
                {praxis.id === laurelId && kit.laurel}
                {/* The laurel covers the card's own crown corner (#1960). */}
                <PraxisCard praxis={praxis} showCrown={praxis.id !== laurelId} />
              </div>
            ))}
          </div>
        )}
    </>
  )

  const proposedGallery = (
    <>
        {proposedTasks.length === 0 ? (
          <p style={{ fontFamily: kit.bodyFont ?? kit.eyebrowFont, color: kit.muted }}>
            {t('profile.proposedTasksEmpty')}
          </p>
        ) : (
          <div className="task-card-row gap-4">
            {proposedTasks.map((task) => (
              <TaskCard key={task.id} task={task} basePoints={task.point_value} onSignup={onSignup} />
            ))}
          </div>
        )}
    </>
  )

  /**
   * Laptop: both galleries stacked and folded (#2958); the Proposed count stays
   * in the eyebrow, outside the panel (#2311). Phone: one gallery behind the
   * switch, no fold (a second mechanism for the same choice). Same gallery
   * nodes at both widths. No byline on Praxis (#2231): they are all this
   * character's own.
   */
  const mainColumn = mobile ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', minWidth: 0 }}>
      <GallerySwitch segment={segment} onChange={setSegment} />
      {segment === 'praxis' ? praxisGallery : proposedGallery}
    </div>
  ) : (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2xl)', minWidth: 0 }}>
      <section>
        {kit.sectionHeading(
          <SectionToggle section={sections.praxis} label={t('profile.praxisHeading')} />,
          '',
        )}
        <SectionPanel section={sections.praxis}>{praxisGallery}</SectionPanel>
      </section>

      {/* ── Proposed tasks (kept feature, #419) ── */}
      <section>
        {kit.sectionHeading(
          <SectionToggle
            section={sections.proposed}
            label={t('profile.proposedTasksHeading')}
          />,
          t('profile.proposedTasksTotal', { count: proposedTasks.length }),
        )}
        <SectionPanel section={sections.proposed}>{proposedGallery}</SectionPanel>
      </section>
    </div>
  )

  /**
   * ③ Badges — hidden when empty; a 300px rail on a laptop, ABOVE the galleries
   * on a phone (a gallery is unbounded). Ordered in the DOM, not CSS `order`,
   * so screen-reader order matches.
   */
  const badgeRail = (
    <aside>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-md)',
          marginBottom: 'var(--space-lg)',
        }}
      >
        <h2
          style={{
            fontFamily: kit.displayFont,
            fontStyle: kit.displayFontStyle,
            fontSize: 'var(--text-title)',
            margin: 0,
            color: kit.ink,
          }}
        >
          {t('profile.badgesHeading')}
        </h2>
        <span style={kit.badgeChipStyle}>{t('profile.badgesEarned', { count: badges.length })}</span>
      </div>
      <div style={kit.badgeBoardStyle}>
        {badges.map((badge, index) => (
          <span key={badge.key}>
            {kit.badgeRow(badge, index === badges.length - 1)}
          </span>
        ))}
      </div>
    </aside>
  )

  return (
    <div
      data-theme={kit.dataTheme}
      style={{
        ...kit.pageVars,
        position: 'relative',
        background: kit.pageBackground,
        // Asymmetric inset keeps the frame taller-than-wide.
        padding: mobile ? 'var(--space-xl) var(--space-lg)' : 'var(--space-2xl) var(--space-xl)',
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      {kit.pageOverlay && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background: kit.pageOverlay,
          }}
        />
      )}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* ① Identity + progression */}
        {frameIdentity(
        <header style={{ ...kit.headerStyle, position: 'relative', overflow: 'hidden' }}>
          {kit.headerDecoration}
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              display: 'flex',
              gap: 'var(--space-2xl)',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ flexShrink: 0 }}>
              {kit.credentialFrame ? kit.credentialFrame(credential) : credential}
            </div>

            {/* Phone: full-row basis so the header wraps to one column. */}
            <div style={{ flex: 1, minWidth: mobile ? '100%' : 300 }}>
              <ProfileNameHeading name={character.display_name} />
              <TaglineSlot
                tagline={character.tagline}
                style={{ fontFamily: kit.displayFont, color: kit.ink, ...kit.taglineExtra }}
              />

              <div
                style={{
                  fontFamily: kit.bodyFont ?? kit.eyebrowFont,
                  fontSize: 'var(--text-content)',
                  color: headerMuted,
                  marginTop: 'var(--space-md)',
                }}
              >
                {t('profile.handleJoined', { username: character.username, joined })}
              </div>

              {progression && (
                <div style={kit.progressionStyle}>
                  {/* Level readout as text, DELIBERATELY not a ring (#2213): a
                      ring would plot the same percentage as the bar. Do not
                      restore it. */}
                  <div
                    style={{
                      flexShrink: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--space-xs)',
                      lineHeight: 1,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: kit.eyebrowFont,
                        fontSize: 'var(--text-md)',
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: headerMuted,
                      }}
                    >
                      {t('profile.lvl')}
                    </span>
                    <span
                      style={{
                        fontFamily: kit.displayFont,
                        fontStyle: kit.displayFontStyle,
                        fontSize: 'var(--text-title)',
                        color: kit.accent,
                      }}
                    >
                      {levelText}
                    </span>
                  </div>

                  {/* points-into-level bar */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        marginBottom: 'var(--space-sm)',
                      }}
                    >
                      {/* Top of the curve (#2383): no next level, so one
                          sentence in body voice replaces "0 / 0" and "next". */}
                      {progression.nextLevel === null ? (
                        <span
                          style={{
                            fontFamily: kit.bodyFont ?? kit.eyebrowFont,
                            fontSize: 'var(--text-content)',
                            color: headerMuted,
                          }}
                        >
                          {t('sidebar.characterCard.topLevel')}
                        </span>
                      ) : (
                        <>
                          <span
                            style={{
                              fontFamily: kit.bodyFont ?? kit.eyebrowFont,
                              fontSize: 'var(--text-content)',
                              color: headerMuted,
                            }}
                          >
                            {t('profile.ptsThisLevel', { current: pointsIntoLevel, span: levelSpan })}
                          </span>
                          <span
                            style={{
                              fontFamily: kit.eyebrowFont,
                              fontSize: 'var(--text-md)',
                              letterSpacing: '0.1em',
                              textTransform: 'uppercase',
                              color: headerMuted,
                            }}
                          >
                            {t('profile.nextLevel', { level: progression.nextLevel })}
                          </span>
                        </>
                      )}
                    </div>
                    <div
                      style={{
                        height: 10,
                        borderRadius: 20,
                        background: kit.barTrack,
                        overflow: 'hidden',
                      }}
                    >
                      {kit.levelBar ? (
                        kit.levelBar(progression.progressPercent)
                      ) : (
                        <div
                          style={{
                            height: '100%',
                            borderRadius: 20,
                            width: `${progression.progressPercent}%`,
                            background: kit.barFill,
                            transition: 'width 300ms',
                          }}
                        />
                      )}
                    </div>
                    {/* The whole climb on the era curve, caption tier (#2127).
                        Ink set as `color`, not by repointing `--label-ink`: a kit
                        whose quiet ink is the cascade would hand
                        `--label-ink: inherit`, which lands on the tertiary.
                        Hidden at the top of the curve (#2383). */}
                    {progression.nextLevel !== null && (
                      <div
                        className="label-caption"
                        style={{ marginTop: 'var(--space-xs)', color: headerMuted }}
                      >
                        {t('profile.ptsToNext', {
                          score: character.score,
                          threshold: progression.nextThreshold,
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* friend/foe */}
              {identityActions && (
                <div style={{ marginTop: 'var(--space-lg)', maxWidth: 220 }}>{identityActions}</div>
              )}
            </div>
          </div>
        </header>,
        )}

        {/* ② About */}
        <AboutBlock
          bio={character.bio}
          heading={kit.sectionHeading(t('profile.aboutHeading'), '')}
          style={{ fontFamily: kit.bodyFont ?? kit.eyebrowFont, color: kit.muted }}
        />

        {badges.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: mobile ? 'minmax(0, 1fr)' : 'minmax(0, 1fr) 300px',
              gap: 'var(--space-2xl)',
              alignItems: 'start',
            }}
          >
            {/* On a phone the rail comes FIRST — see `badgeRail`. */}
            {mobile && badgeRail}
            {mainColumn}
            {!mobile && badgeRail}
          </div>
        ) : (
          mainColumn
        )}
      </div>
    </div>
  )
}
