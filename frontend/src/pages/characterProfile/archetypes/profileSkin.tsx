/**
 * Shared profile-skin scaffold (#460).
 *
 * Every faction player-profile renders the SAME locked section spine as
 * DefaultProfileBody — ① identity + progression, ③ badges (hidden when empty),
 * ⑤ praxis (faction PraxisCard, FDL laurel on the top entry), plus the kept
 * proposed-tasks and friend/foe features. Only the COSTUME differs. This module
 * factors the invariant structure into one skinnable renderer driven by a
 * per-faction `ProfileKit`; each `<Faction>ProfileBody.tsx` supplies only its
 * kit (tokens, fonts, copy, chrome slots) and delegates here.
 *
 * No hardcoded hex: kits reference the repo's `--faction-<slug>-*` CSS vars.
 * A faction whose identity is pinned to one theme (snide and singularity are
 * always-dark) scopes `dataTheme` to the skin container and NEVER mutates the
 * global [data-theme]. UA used to pin itself light; it dims with the app now
 * (#848, #851) and sets no `dataTheme` at all.
 *
 * RESPONSIVE (#1319). Until the form-factor collapse this renderer only ever
 * saw a laptop: `CharacterProfile` branched on `useFormFactor()` and sent every
 * phone to the na mobile skin, so the six factions that delegate here never
 * reached their own dress on a phone. Now they do, and the three places this
 * layout was sized for a wide viewport stack instead — a 300px badge rail and a
 * 300px identity floor do not fit beside a 266px credential card at 375px, and
 * would have scrolled sideways (CLAUDE.md: the mobile path stacks single-column,
 * never a fixed-px inline grid). Structure only: no kit token, font or copy
 * changes at either width, and the desktop rendering is byte-identical.
 */
import type { CSSProperties, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { useFormFactor } from '../../../hooks/useFormFactor'

import type { BadgeOut } from '../../../api/auth'
import { badgeArtFor } from '../../../components/badges/badgeArt'
import CredentialCard from '../../../components/CredentialCard'
import PraxisCard from '../../../components/praxisCard/PraxisCard'
import TaskCard from '../../../components/taskCard/TaskCard'
import { mediaUrl } from '../../../utils/media'
import type { ProfileBodyProps } from '../FactionProfileBody'

/** The costume knobs a faction fills in. Everything is a CSS var reference or
 *  faction-appropriate copy — no literal hex, no per-theme branching. */
export interface ProfileKit {
  /** faction_slug this kit skins (drives the shared CredentialCard skin). */
  slug: string
  /** Fixed theme for always-dark/always-light factions; scoped to the
   *  container only, never applied to the global tree. */
  dataTheme?: 'light' | 'dark'

  /* ── surfaces / ink ── */
  /** Page-level wrapper background (the "wall" behind the profile). */
  pageBackground: string
  /** Optional decorative overlay layered over the page (texture/grid/etc.). */
  pageOverlay?: string
  /** Ink color for headings + the display name. */
  ink: string
  /** Secondary / meta ink, on the kit's `surface` and `pageBackground`. */
  muted: string
  /** The same role ON THE HEADER'S OWN GROUND, for a kit whose
   *  `headerStyle.background` is a different stock from `surface` (#1636).
   *  Defaults to `muted`, so a kit whose header shares the body's ground says
   *  nothing and renders exactly as before.
   *
   *  It exists because Ephemerists mounts its header on the Valley plate's
   *  cornice BAND while `muted` is the ink measured for the plate, the page and
   *  the panel cells — six header sites inherited a quiet ink chosen for a
   *  ground they are not on, and the crossing read 2.07:1 in light. That is
   *  WORLD_ZERO_STYLE §3's "when a surface gains a sheet, re-measure the inks it
   *  already had" landing on a shared kit rather than on a skin: which stock the
   *  header sits on is the kit's own knowledge, and nothing else can see it. */
  headerMuted?: string
  /** Accent color (progression ring, accents). */
  accent: string
  /** Card / panel surface. */
  surface: string
  /** Hairline border color. */
  border: string

  /* ── fonts ── */
  /** Display font for the big name + section headings. */
  displayFont: string
  /** Small mono/label eyebrow font. */
  eyebrowFont: string
  /** Body font for meta lines. */
  bodyFont?: string

  /* ── identity header chrome ── */
  /** Style for the outer identity banner (frame idiom lives here). */
  headerStyle: CSSProperties
  /** Optional absolutely-positioned decoration inside the header (grain, strip). */
  headerDecoration?: ReactNode
  /** Optional wrapper chrome placed AROUND the shared CredentialCard. */
  credentialFrame?: (card: ReactNode) => ReactNode
  /** Ink, face and any transform for the identity column's display line — the
   *  {@link TaglineSlot}.
   *
   *  It was `nameExtra` until #1629, when the display NAME left the column and
   *  the tagline took the slot. The dress carried over with the slot rather
   *  than being re-derived: several of these are ink CORRECTIONS for a header
   *  band that is a different stock from the kit's `surface` (#1636), and
   *  dropping them would have put an ink measured for the panel back onto the
   *  band. The `nameSize` knob did NOT carry over — the slot owns its size,
   *  because a slogan is read where a masthead is looked at.
   *
   *  A kit must NOT set `fontSize` here; the shared slot owns it. */
  taglineExtra?: CSSProperties

  /* ── progression panel ── */
  /** Style for the progression panel container. */
  progressionStyle: CSSProperties
  /** Small label above the level number inside the ring (e.g. "lvl", "ANNO"). */
  ringLabel: string
  /** Ink for that label. Defaults to `muted` — which is the RIGHT default and
   *  not a placeholder: the label sits inside the ring's disc, and the disc
   *  grounds on `surface`, which is the stock `muted` was measured for.
   *
   *  Ephemerists is the one kit that overrides it (#1630): its level ring is a
   *  brass instrument, so the label reads in `-plate-brass-light` beside the
   *  numeral rather than in the plate's quiet ink — 11.04:1 on the plate against
   *  `-plate-quiet`'s 5.98, so this buys legibility as well as dress. A knob
   *  rather than a repoint of `muted`, because `muted` is read on three other
   *  grounds by six other lines (#1636). */
  ringLabelInk?: string
  /** Fill for the points-into-level bar. */
  barFill: string
  /** Track behind the progression bar. */
  barTrack: string
  /** Render the level number (default: the integer; e.g. roman for ephemerists). */
  formatLevel?: (level: number) => string
  /** Copy for "pts this level" (defaults to "pts this level"). */
  levelUnitLabel?: string
  /** Copy for "next · lvl {n}". */
  nextLevelLabel: (nextLevel: number) => string
  /** Copy for the absolute-score footer line ("{score} / {next} pts"). */
  scoreFootnote?: (score: number, nextThreshold: number) => string

  /* ── section headings ── */
  /** Renders a section heading (⑤ praxis, proposed tasks). */
  sectionHeading: (title: string, eyebrow: string) => ReactNode

  /* ── praxis ── */
  /** Eyebrow for the praxis section, e.g. "sealed by {name}". */
  praxisEyebrow: (name: string) => string
  /** Empty-state title + body copy for the praxis section. */
  praxisEmpty: { title: string; body: string }
  /** Empty-state container style. */
  emptyStateStyle: CSSProperties
  /** The FDL laurel stamped on the top praxis (spectrum ring by default; some
   *  factions draw an ink-outline variant). */
  laurel: ReactNode

  /* ── badges (③) ── */
  /** Section title, e.g. "Distinctions", "Citations", "Commendations". */
  badgeTitle: string
  /** Board container style. */
  badgeBoardStyle: CSSProperties
  /** Renders one badge row (medallion + name). */
  badgeRow: (badge: BadgeOut, last: boolean) => ReactNode
  /** "{n} earned" chip style. */
  badgeChipStyle: CSSProperties
}

/**
 * The `ProfileKit` fields that are user-facing COPY rather than dress (#1858).
 *
 * They used to be raw English literals inside each kit — invisible to a
 * `locales/` sweep, so never reviewed and impossible to translate, while the na
 * kit beside them read `common.json` `profile.*` properly. The words now live in
 * `common.json` under `profile.<slug>.*` and a `<Faction>ProfileBody` resolves
 * them with `useTranslation`, because `t()` is only reachable inside a
 * component and a kit is a module-scope const.
 */
export type ProfileCopyField =
  | 'ringLabel'
  | 'levelUnitLabel'
  | 'nextLevelLabel'
  | 'scoreFootnote'
  | 'praxisEyebrow'
  | 'praxisEmpty'
  | 'badgeTitle'

/** A kit minus its copy: everything a faction can declare at module scope. */
export type ProfileDress = Omit<ProfileKit, ProfileCopyField>

/** A reusable spectrum-ring FDL laurel (used by all colored factions; the
 *  colorless ones supply their own ink-outline variant). `ringBg` defaults to
 *  the spectrum default ring; `centerBg`/`glyphColor` skin the medallion. */
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
        filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.25))',
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
 * ② About — the profile's home for `character.bio` (#1626).
 *
 * The bio used to live in the credential card as a two-line clamp, which could
 * only ever show its first sentence: the field takes 500 characters and is
 * explicitly not guaranteed to be a blurb. Deleting that slot without this
 * block would have left `bio` editable in Settings and rendered nowhere.
 *
 * ONE BLOCK, NOT NINE. The seven factions that delegate to {@link ProfileSkin}
 * inherit it without touching their kits; `DefaultProfileBody` mounts the same
 * component in each of its two branches. A kit dresses it through `heading` and
 * `style` — it never re-implements it, and nothing here is per-faction.
 *
 * PLAIN TEXT. `pre-wrap` so the line breaks a player typed survive, and no
 * markdown: nothing on the profile renders markdown today and rich text is its
 * own epic (#523). The paragraph is content, so `--text-content` is its floor —
 * a kit may hand it ink and a font, never a size.
 *
 * Hidden when empty, per the house rule — a heading over nothing is chrome.
 */
export function AboutBlock({
  bio,
  heading,
  style,
}: {
  bio?: string | null
  /** The section heading, dressed by the caller (kit heading / na's rule). */
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
          // A measure, so a 500-character paragraph is not one long line on a
          // laptop. `ch` rather than px: it follows the kit's own body font.
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
 * ① The identity column's display line — `character.tagline` (#1629).
 *
 * It stands where the display NAME used to. The name already reads off the
 * credential card pinned beside it, so the column repeated it; the slogan the
 * player wrote is the one thing that slot could say that nothing else does.
 *
 * ONE SLOT, NOT NINE, on {@link AboutBlock}'s pattern: `ProfileSkin` mounts it
 * for the seven kits and `DefaultProfileBody` mounts the same component in each
 * of its two branches. A kit dresses it through `style` — ink, face, tracking,
 * the header band's own corrections — and never re-implements it.
 *
 * The caller owns `margin` (the phone stack centres it); the SIZE and the
 * MEASURE are the slot's own. `--text-heading` is the design's 30px landing on
 * the type scale: a tagline is read, so §4a's ornament hatch does not cover it
 * and it takes a tier rather than a raw number. 22ch keeps it a slogan — a
 * measure in `ch` so it follows whatever face the kit hands it.
 *
 * Hidden when empty, per the house rule. No character has written one yet, so
 * on day one this column is credential card, level ring and progression bar —
 * that is the design, not a missing placeholder.
 */
export function TaglineSlot({
  tagline,
  style,
}: {
  tagline?: string | null
  /** Ink + face for the line, from the kit or the na sheet. */
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
 * The page's top heading level, for the outline only.
 *
 * Deleting the identity column's display name (#1629) was right — the
 * credential card beside it already says the name — but that name was also the
 * ONLY `<h1>` this route rendered, on every profile but WOW's phone stack, and
 * the route mounts no `PageTitle`. `CredentialCard`'s name is a `<div>`, so the
 * card does not supply one either. That left a page with no top level to its
 * document outline: a screen-reader user lost the "what page am I on" landmark
 * that every other route hands them for free.
 *
 * VISUALLY HIDDEN, not small: making it visible would put back exactly the line
 * the design removed. `sr-only` is Tailwind's own utility (already live in
 * `RequestsQueue`), so nothing here hand-rolls a clip rect.
 *
 * ONE SLOT, NOT NINE, beside {@link TaglineSlot} — `ProfileSkin` for the seven
 * kits, `DefaultProfileBody` in each of its two branches. WOW's phone header is
 * the deliberate omission: it has no credential card (#901), so its name is a
 * VISIBLE `<h1>` already, and a second one would be its own defect.
 */
export function ProfileNameHeading({ name }: { name: string }) {
  return <h1 className="sr-only">{name}</h1>
}

/** Shared badge-row primitive: a skinnable medallion + the badge name. Kits
 *  pass their medallion chrome; the glyph is mapped client-side by badge key. */
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
      {/* Badge NAMES are functional text (#459: the glyph is the ornament, the
          label is read). The shared row owns the size so no kit can drop a
          badge name below the content floor. */}
      <div style={{ ...nameStyle, fontSize: 'var(--text-content)' }}>{badge.name}</div>
    </div>
  )
}

/**
 * The invariant profile renderer. Given the live props + a faction kit, lays
 * out the locked spine in the faction's costume. Structurally identical to
 * DefaultProfileBody — only the styling knobs move.
 */
export function ProfileSkin({
  props,
  kit,
}: {
  props: ProfileBodyProps
  kit: ProfileKit
}) {
  const { t } = useTranslation('common')
  const mobile = useFormFactor() === 'mobile'
  /** Every quiet ink INSIDE `<header>` — see `ProfileKit.headerMuted`. */
  const headerMuted = kit.headerMuted ?? kit.muted
  const { character, submissions, proposedTasks, progression, identityActions } = props
  const badges = character.badges ?? []
  const joined = new Date(character.created_at).toLocaleDateString(undefined, {
    month: 'short',
    year: 'numeric',
  })

  // ⑤ FDL laurel target: highest earned points (PraxisCardOut.score is base+vote).
  const topScore = submissions.reduce((max, p) => Math.max(max, p.score ?? 0), 0)
  const laurelId = submissions.find((p) => (p.score ?? 0) === topScore)?.id ?? null

  // ① progression numbers (hidden until game config supplies thresholds).
  const pointsIntoLevel = progression
    ? Math.max(character.score - progression.currentThreshold, 0)
    : 0
  const levelSpan = progression
    ? Math.max(progression.nextThreshold - progression.currentThreshold, 0)
    : 0
  const ringDegrees = progression
    ? Math.round(Math.min(Math.max(progression.progressPercent, 0), 100) * 3.6)
    : 0

  const levelText = kit.formatLevel
    ? kit.formatLevel(character.level)
    : String(character.level)
  // The shared unit, for the four kits that name no unit of their own.
  const levelUnit = kit.levelUnitLabel ?? t('profile.levelUnit')

  const credential = (
    <CredentialCard
      displayName={character.display_name}
      handle={character.username}
      factionSlug={character.faction_slug}
      level={character.level}
      score={character.score}
      avatarUrl={character.avatar_url ? mediaUrl(character.avatar_url) : null}
    />
  )

  const mainColumn = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2xl)', minWidth: 0 }}>
      {/* ── ⑤ Praxis ── */}
      <section>
        {kit.sectionHeading(t('profile.praxisHeading'), kit.praxisEyebrow(character.display_name))}
        {submissions.length === 0 ? (
          <div style={kit.emptyStateStyle}>
            <div
              style={{
                fontFamily: kit.displayFont,
                fontSize: 'var(--text-title)',
                color: kit.ink,
              }}
            >
              {kit.praxisEmpty.title}
            </div>
            <div
              style={{
                fontFamily: kit.bodyFont ?? kit.eyebrowFont,
                fontSize: 'var(--text-content)',
                color: kit.muted,
                marginTop: 'var(--space-xs)',
              }}
            >
              {kit.praxisEmpty.body}
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-4 items-start">
            {submissions.map((praxis) => (
              <div key={praxis.id} style={{ position: 'relative' }}>
                {praxis.id === laurelId && kit.laurel}
                <PraxisCard praxis={praxis} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Proposed tasks (kept feature, #419) ── */}
      <section>
        {kit.sectionHeading(t('profile.proposedTasksHeading'), t('profile.proposedTasksTotal', { count: proposedTasks.length }))}
        {proposedTasks.length === 0 ? (
          <p style={{ fontFamily: kit.bodyFont ?? kit.eyebrowFont, color: kit.muted }}>
            {t('profile.proposedTasksEmpty')}
          </p>
        ) : (
          <div className="task-card-row gap-4">
            {proposedTasks.map((task) => (
              <TaskCard key={task.id} task={task} basePoints={task.point_value} />
            ))}
          </div>
        )}
      </section>
    </div>
  )

  return (
    <div
      data-theme={kit.dataTheme}
      style={{
        position: 'relative',
        background: kit.pageBackground,
        // asymmetric inset: the 28px side rounds DOWN so the page frame keeps
        // its taller-than-wide shape instead of flattening to a uniform box.
        // A phone gives one rung of that back on both axes.
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
        {/* ── ① Identity + progression ── */}
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

            {/* On a phone the 300px floor is wider than what is left beside the
                266px credential, so it becomes a full-row basis and the header
                wraps to one column instead of squeezing. */}
            <div style={{ flex: 1, minWidth: mobile ? '100%' : 300 }}>
              {/* The "PLAYER · <FACTION>" eyebrow and the display name that sat
                  here are gone (#1629): the credential card to the left says
                  both, and the column carries the player's own line instead.
                  The name stays as the page's <h1> for the outline only. */}
              <ProfileNameHeading name={character.display_name} />
              <TaglineSlot
                tagline={character.tagline}
                style={{ fontFamily: kit.displayFont, color: kit.ink, ...kit.taglineExtra }}
              />

              <div
                style={{
                  fontFamily: kit.bodyFont ?? kit.eyebrowFont,
                  // handle + join date: the handle is a name, so this is read, not scanned
                  fontSize: 'var(--text-content)',
                  color: headerMuted,
                  marginTop: 'var(--space-md)',
                }}
              >
                {t('profile.handleJoined', { username: character.username, joined })}
              </div>

              {progression && (
                <div style={kit.progressionStyle}>
                  {/* level ring */}
                  <div
                    style={{
                      flexShrink: 0,
                      width: 60,
                      height: 60,
                      borderRadius: '50%',
                      background: `conic-gradient(${kit.accent} ${ringDegrees}deg, ${kit.barTrack} 0)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: '50%',
                        background: kit.surface,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        lineHeight: 1,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: kit.eyebrowFont,
                          fontSize: 'var(--text-md)',
                          letterSpacing: '0.12em',
                          textTransform: 'uppercase',
                          // `kit.muted`, not `headerMuted`: this label sits
                          // inside the disc above, which grounds on
                          // `kit.surface` — it is in the header, not ON the
                          // header's band. The band ink is the wrong ink here
                          // for the same reason the band ink was right for the
                          // other five. A kit may name a different ink for this
                          // one line (#1630) without moving the other six.
                          color: kit.ringLabelInk ?? kit.muted,
                        }}
                      >
                        {kit.ringLabel}
                      </span>
                      <span
                        style={{
                          fontFamily: kit.displayFont,
                          fontSize: 'var(--text-title)',
                          color: kit.accent,
                        }}
                      >
                        {levelText}
                      </span>
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
                      <span
                        style={{
                          fontFamily: kit.bodyFont ?? kit.eyebrowFont,
                          // points into level: a number the player cares about
                          fontSize: 'var(--text-content)',
                          color: headerMuted,
                        }}
                      >
                        {pointsIntoLevel} / {levelSpan} {levelUnit}
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
                        {kit.nextLevelLabel(progression.nextLevel)}
                      </span>
                    </div>
                    <div
                      style={{
                        height: 10,
                        borderRadius: 20,
                        background: kit.barTrack,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          borderRadius: 20,
                          width: `${progression.progressPercent}%`,
                          background: kit.barFill,
                          transition: 'width 300ms',
                        }}
                      />
                    </div>
                    {kit.scoreFootnote && (
                      <div
                        style={{
                          fontFamily: kit.bodyFont ?? kit.eyebrowFont,
                          // absolute score toward the next threshold: read, not scanned
                          fontSize: 'var(--text-content)',
                          color: headerMuted,
                          marginTop: 'var(--space-xs)',
                        }}
                      >
                        {kit.scoreFootnote(character.score, progression.nextThreshold)}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* friend/foe — kept feature, faction-skinned, folded into header */}
              {identityActions && (
                <div style={{ marginTop: 'var(--space-lg)', maxWidth: 220 }}>{identityActions}</div>
              )}
            </div>
          </div>
        </header>

        {/* ── ② About — the field arrived (#1626); the kit only dresses it ── */}
        <AboutBlock
          bio={character.bio}
          heading={kit.sectionHeading(t('profile.aboutHeading'), '')}
          style={{ fontFamily: kit.bodyFont ?? kit.eyebrowFont, color: kit.muted }}
        />

        {badges.length > 0 ? (
          <div
            style={{
              display: 'grid',
              // The badge rail is a fixed 300px column on a laptop; on a phone
              // it stacks under the main column rather than forcing a
              // sideways-scrolling 300px sibling.
              gridTemplateColumns: mobile ? 'minmax(0, 1fr)' : 'minmax(0, 1fr) 300px',
              gap: 'var(--space-2xl)',
              alignItems: 'start',
            }}
          >
            {mainColumn}

            {/* ── ③ Badges — hidden entirely when empty ── */}
            <aside>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-md)',
                  marginBottom: 'var(--space-lg)',
                }}
              >
                <h2 style={{ fontFamily: kit.displayFont, fontSize: 'var(--text-title)', margin: 0, color: kit.ink }}>
                  {kit.badgeTitle}
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
          </div>
        ) : (
          mainColumn
        )}
      </div>
    </div>
  )
}
