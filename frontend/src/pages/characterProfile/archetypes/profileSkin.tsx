/**
 * Shared profile-skin scaffold (#460).
 *
 * THE SPINE, STATED ON ITS OWN TERMS (#2996). Every faction player-profile
 * renders the same locked sections in the same order: ① identity + progression
 * (the shared CredentialCard, the tagline slot, the level readout and the
 * points-into-level bar, plus friend/foe), ② About, ③ badges (hidden when
 * empty), ⑤ praxis (faction PraxisCard, FDL laurel on the top entry) and the
 * kept proposed-tasks feature. Only the COSTUME differs. This module factors
 * that structure into one skinnable renderer driven by a per-faction
 * `ProfileKit`; each `<Faction>ProfileBody.tsx` supplies only its kit (tokens,
 * fonts, chrome slots) and delegates here.
 *
 * This paragraph used to define the spine by pointing at `DefaultProfileBody`.
 * That sentence became circular when na became the ninth kit and started
 * delegating here like the other eight — there is no longer a hand-authored
 * profile for a shared one to be "structurally identical to".
 *
 * ALL NINE, BOTH WIDTHS (#2996). There is one renderer now, not three. na's
 * hand-authored pair of form-factor branches and WOW's field pavilion were the
 * other two; both are retired, and `src/__tests__/retiredSurfaces.test.ts` holds
 * their names out of shipped source, which is why this paragraph does not spell
 * them. What survived the retirement is their SHAPE: the phone puts the two
 * long galleries behind a segmented Praxis/Tasks switch (see
 * {@link GallerySwitch}),
 * which every kit now gets, while the laptop folds them both on
 * `PROFILE_SECTIONS` (#2958, untouched).
 *
 * No hardcoded hex: kits reference the repo's `--faction-<slug>-*` CSS vars.
 * A faction whose identity is pinned to one theme scopes `dataTheme` to the skin
 * container and NEVER mutates the global [data-theme]. EXACTLY ONE KIT DOES:
 * Singularity, whose ground is #050f08 in both cascades because a terminal is
 * black. S.N.I.D.E. read as the second until #2631 — it was never always-dark
 * after #1023 and #2065, and pinning it froze the two families that DO flip
 * (ADR-0085). UA used to pin itself light; it dims with the app now (#848,
 * #851) and sets no `dataTheme` at all.
 *
 * RESPONSIVE (#1319). Until the form-factor collapse this renderer only ever
 * saw a laptop: `CharacterProfile` branched on `useFormFactor()` and sent every
 * phone to the na mobile skin, so the six factions that delegate here never
 * reached their own dress on a phone. Now they do, and the three places this
 * layout was sized for a wide viewport stack instead — a 300px badge rail and a
 * 300px identity floor do not fit beside a 266px credential card at 375px, and
 * would have scrolled sideways (CLAUDE.md: the mobile path stacks single-column,
 * never a fixed-px inline grid). The desktop rendering is byte-identical.
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

/** The costume knobs a faction fills in. Everything is a CSS var reference or
 *  faction-appropriate copy — no literal hex, no per-theme branching. */
interface ProfileKit {
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
  /** Ink for the progression panel's LEVEL NUMERAL, and its only reader since
   *  #2213 deleted the ring that used to draw the same value as an arc.
   *
   *  That deletion moved the numeral's ground: it used to sit on a hub disc
   *  painted in `surface`, and it now sits on whatever `progressionStyle`
   *  paints. Five kits paint the panel in `surface` and were unaffected; UA,
   *  Everymen and WOW moved to a ground their accent still clears (4.88 / 7.03
   *  / 6.16:1 light). Ephemerists did not — its panel is transparent over the
   *  plate's cornice BAND, where the plate's brass reads 2.83:1 — so it
   *  repoints `accent` to the band's own mark rather than the plate's. That is
   *  the shape to copy if a kit ever moves its panel onto a new stock: repoint
   *  this, do not mint a second knob beside it. */
  accent: string
  /** Card / panel surface. */
  surface: string
  /** Hairline border color. */
  border: string

  /* ── fonts ── */
  /** Display font for the big name + section headings. */
  displayFont: string
  /**
   * The SLOPE of that face, wherever this module sets it — the empty-state
   * title, the level numeral, the badges heading (#2996).
   *
   * One trait, one kit, and typed as the one trait rather than as a style
   * object: na's display cut is italic, and na wrote
   * `className="font-display italic"` at each of those three sites while it
   * owned its own renderer, so delegating without this un-italicised its page.
   * `displayFont` is a `font-family` and cannot carry a slope. A `CSSProperties`
   * here would have taken `fontSize` and `fontFamily` too, under nothing but a
   * comment asking a kit not to — this way the type is the rule.
   */
  displayFontStyle?: CSSProperties['fontStyle']
  /** Small mono/label eyebrow font. */
  eyebrowFont: string
  /** Body font for meta lines. */
  bodyFont?: string

  /* ── identity header chrome ── */
  /** Style for the outer identity banner (frame idiom lives here). */
  headerStyle: CSSProperties
  /** Optional absolutely-positioned decoration inside the header (grain, strip). */
  headerDecoration?: ReactNode
  /**
   * Optional chrome placed AROUND the whole identity band, on
   * {@link ProfileKit.credentialFrame}'s pattern — and the one slot that also
   * receives `ProfileSkin`'s `identityOrnament` (#2996).
   *
   * na is the kit that needs it: its band is a padded spectrum RAMP wrapped
   * around an opaque sheet, which is two elements, and `headerStyle` can only
   * dress one. The kit writes the ramp itself rather than passing a class name
   * down, deliberately — `albescentSpectraMove`'s per-mount census reads the
   * `spectrum-rule` class off a literal className in SOURCE, so a mount spelt
   * as a kit field would be invisible to the guard that keeps this frame out of
   * `.alb-moves .spectrum-rule:empty` (a travelling child would paint over the
   * credential card the frame frames).
   *
   * `ornament` is Albescent's `.alb-profile-edge` and belongs ON the ramp, not
   * inside the sheet: it is a four-pixel flourish on the band's own edge, and
   * the sheet is inset from it and clips. A kit with no frame has no band to
   * hang one on, which is why the ornament arrives here and nowhere else.
   */
  headerFrame?: (band: ReactNode, ornament: ReactNode) => ReactNode
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
  /* `ringLabelInk` lived here. It defaulted to `muted` because the "lvl" label
   *  sat inside the ring's hub disc, which grounds on `surface`, and Ephemerists
   *  overrode it to the plate's brass (#1630). #2213 deleted the ring, so the
   *  label sits on the panel beside two lines that already answer this question
   *  with `headerMuted` — one ink, one ground, no knob. */
  /** Fill for the points-into-level bar. */
  barFill: string
  /**
   * The filled length itself, for a kit whose fill is a CLASS rather than a
   * value — na's is `.spectrum-rule`, the ramp `barFill` cannot spell (#2996).
   * Handed the percentage; owns nothing else. When it is set, `barFill` is not
   * read, and the same source-census argument as {@link ProfileKit.headerFrame}
   * is why the mount is JSX in the kit rather than a class name in a field:
   * this is the level bar epic #2496 ruling 3 names, and it has to keep
   * travelling under `.alb-moves`.
   */
  levelBar?: (percent: number) => ReactNode
  /** Track behind the progression bar. */
  barTrack: string
  /** Render the level number (default: the integer; e.g. roman for ephemerists). */
  formatLevel?: (level: number) => string

  /* ── section headings ── */
  /**
   * Renders a section heading (⑤ praxis, proposed tasks, ② About).
   *
   * `title` IS A NODE, NOT A STRING, SINCE #2958. Praxis and Proposed tasks
   * are disclosures now, and the ARIA pattern for one is a `<button>` — which
   * has to sit INSIDE the kit's own heading element to inherit its face, size,
   * tracking and ink (`sectionDisclosure`'s whole posture: button semantics
   * and a marker, never paint). So the shell hands a `SectionToggle` down this
   * seam where it used to hand a word, and every kit keeps rendering `{title}`
   * exactly as it did. About still passes a plain string — `ReactNode` covers
   * both, which is why one type change fixed six skins.
   *
   * A kit may therefore not do string work on this parameter.
   */
  sectionHeading: (title: ReactNode, eyebrow: string) => ReactNode

  /* ── praxis ── */
  /** Empty-state container style. */
  emptyStateStyle: CSSProperties
  /** The FDL laurel stamped on the top praxis (spectrum ring by default; some
   *  factions draw an ink-outline variant). */
  laurel: ReactNode

  /* ── badges (③) ── */
  /** Board container style. */
  badgeBoardStyle: CSSProperties
  /** Renders one badge row (medallion + name). */
  badgeRow: (badge: BadgeOut, last: boolean) => ReactNode
  /** "{n} earned" chip style. */
  badgeChipStyle: CSSProperties
}

/**
 * A kit is dress ONLY — everything a faction can declare at module scope.
 *
 * It used to carry seven copy fields too. #1858 moved their English out of the
 * `.tsx` and into `common.json` under `profile.<slug>.*`, which is why each
 * `<Faction>ProfileBody` grew a `useTranslation` and spread its resolved words
 * over the dress. #1911 collapsed those seven families to one shared string
 * each, so all seven kits were passing the SAME words — the knobs were
 * indirection around a constant. `ProfileSkin` reads them itself now, once, and
 * `ProfileDress` is the whole of a kit rather than a subtraction from it.
 */
export type ProfileDress = ProfileKit

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
        // The top-praxis ribbon's lift, verbatim in DefaultProfileBody too.
        // Rule-blind (`filter` is not a COLOUR_PROP), so neither copy was on
        // the legacy list while both painted a fixed black on a themed page.
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
 * on day one this column is credential card, level readout and progression bar —
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

/** Which gallery the phone has up. Nine kits, one switch, one state. */
type Segment = 'praxis' | 'tasks'

/**
 * THE PHONE'S SWITCH IS THE APP'S OWN SEGMENTED RAIL (#2996).
 *
 * This was a bespoke `SegTab` pair for one commit, lifted out of the retired na
 * phone branch — which was the wrong lift. `components/ui/FilterBar` already
 * owns this control: the same two-value choice, the same `aria-pressed`, a
 * `role="group"` with a name, a measured sliding thumb, and its selected ink as
 * a `data-on` attribute in `07-layout-filter-bar.css` so the pairing flips with
 * the theme in ONE place rather than through an inline ternary (STYLE §1.3).
 * Three things the copy got wrong on its own: `flex: 1` (a 0 basis is the equal
 * share `.filter-rail__segment` says in prose not to use), an inline
 * `on ? … : …` for every painted property, and a 36px tap target under the
 * repo's 44px floor — which the rail already meets at phone width.
 *
 * A rail wants a group NAME, not just two segment labels.
 * ponytail: it borrows `leaderboard.roster.railLabel` ("Show"), the players
 * roster's own rail label. Ceiling: a `leaderboard.*` key read on a profile,
 * the same shape this repo already tolerates for `sidebar.characterCard.*` two
 * files over. It is the right WORD — the rail chooses what is shown — and this
 * issue was told to mint no new copy. Upgrade path: a `profile.mobile.tabsLabel`
 * beside the two tab keys, the day someone owns profile copy.
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

/**
 * The invariant profile renderer. Given the live props + a faction kit, lays
 * out the locked spine in the faction's costume — the whole spine, for all nine
 * slugs, at both form factors.
 */
export function ProfileSkin({
  props,
  kit,
  identityOrnament,
}: {
  props: ProfileBodyProps
  kit: ProfileKit
  /**
   * An inert layer mounted on the identity band, reached through
   * {@link ProfileKit.headerFrame}. Albescent's whole delta on this surface is
   * one of these (`.alb-profile-edge`, #1630/ADR-0048): the na band drifting
   * rather than standing still. It is a prop and not a kit field because it
   * arrives per RENDER, from the wrapper archetype, where a kit is module
   * scope — and it must reach the band, which no wrapper outside this renderer
   * can aim at.
   */
  identityOrnament?: ReactNode
}) {
  const { t } = useTranslation('common')
  const mobile = useFormFactor() === 'mobile'
  // The phone's switch. Declared unconditionally (hooks are), read only on the
  // phone branch — the laptop stacks both galleries and folds them instead.
  const [segment, setSegment] = useState<Segment>('praxis')
  // The two long galleries fold; About and Badges do not (#2958). One call here
  // is every kit that mounts this shell — which is all nine since #2996. Read
  // on the LAPTOP branch only: the phone shows one gallery at a time behind the
  // switch above, so there is no heading for a disclosure to live in. The
  // preference itself is per account × surface and survives the width change.
  const sections = useSectionDisclosures(PROFILE_SECTIONS)
  /** Every quiet ink INSIDE `<header>` — see `ProfileKit.headerMuted`. */
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

  // ① progression numbers (hidden until game config supplies thresholds). The
  // figures arrive computed — see ProfileProgression, and #2127 for why a skin
  // no longer does this arithmetic itself.
  const pointsIntoLevel = progression?.pointsIntoLevel ?? 0
  const levelSpan = progression?.levelSpan ?? 0
  // A `ringDegrees` (percent × 3.6) stood here for the level ring's conic and
  // went with it (#2213). The bar reads `progressPercent` directly.

  const levelText = kit.formatLevel
    ? kit.formatLevel(character.level)
    : String(character.level)

  /**
   * The identity band inside the kit's own frame, when it declares one. A kit
   * with no frame renders the band bare and never sees the ornament — see
   * {@link ProfileKit.headerFrame} for why the two travel together.
   */
  const frameIdentity = (band: ReactNode) =>
    kit.headerFrame ? kit.headerFrame(band, identityOrnament) : band

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
                {/* The laurel IS a fleur medallion, floated over this same
                    corner, so the card's built-in one would land under it and
                    peek out past its rim (#1960). Same call the six faction-page
                    bodies make: the surface that stamps its own mark suppresses
                    the card's. Only this one card — every other keeps its. */}
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
   * THE TWO GALLERIES, AND THE TWO SHAPES THEY TAKE (#2996).
   *
   * A LAPTOP stacks them and folds each one (#2958): the heading is the kit's,
   * the control inside it is `SectionToggle`, and the count beside Proposed
   * tasks stays in the EYEBROW, outside the panel — a folded section that still
   * says how much is under it is the whole reason folding is worth doing
   * (#2311's ruling, and the faction suite pins it).
   *
   * A PHONE puts one gallery on screen at a time behind the switch. So there is
   * no section heading for a disclosure to live in, and a fold on top of the
   * switch would be a second mechanism answering the question it answers —
   * which is the reasoning #2958's own test already recorded for the two kits
   * that shipped this shape before all nine had it. The galleries themselves
   * are the same nodes at both widths: `.task-card-row` gives its item the whole
   * line below 768px (#2763) and a wrap row degrades to one card per line, so
   * neither list is re-authored for the phone.
   *
   * No byline on Praxis (#2231). `submissions` is THIS character's own praxis,
   * so "Submitted by <them>" is the one thing that eyebrow could never not say —
   * the name already reads off the credential card overhead.
   * `common:profile.praxisEyebrow` stays in the catalog: it is the right
   * sentence wherever authorship is genuinely in question, and this mount is
   * simply not one of them. An empty eyebrow is how the About block already
   * asks a kit for a bare heading.
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
   * ③ Badges — hidden entirely when empty, and ABOVE the galleries on a phone.
   *
   * The laptop lays it as a 300px rail beside the main column, so its DOM
   * position is the right-hand one. A phone has no second column, and both
   * retired phone renderings put the badge board above the segmented switch:
   * a board of marks is a fixed few rows, where a gallery is unbounded, so
   * below the switch it lands after a scroll whose length is the player's
   * praxis count. Ordered in the DOM rather than by CSS `order`, so a screen
   * reader and a sighted reader meet the sections in the same sequence.
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
        {/* ── ① Identity + progression, inside the kit's own frame if it has
            one — which is also where `identityOrnament` lands (#2996). ── */}
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
                  {/* Level readout — text, and DELIBERATELY not a ring (#2213).
                      A 60px conic disc drew this number as an arc and held the
                      numeral in its hub. It has been deleted from all nine
                      profiles and is NOT to be restored as a fix if a kit reads
                      bare without it: the arc and the bar to its right plotted
                      the same percentage, one number on two instruments, and
                      the bar is what carries the within-level reading on every
                      other surface (#2127). The numeral was the ring's second
                      job — a bar cannot say which level you are on — so it
                      stays, in the ring's slot, as type.

                      Both inks moved ground with it. The label now takes
                      `headerMuted`, the ink the two lines beside it in this
                      same panel already use on this same ground; it read
                      `muted` only because the hub disc repainted `kit.surface`
                      under it, and that disc is gone. `kit.accent` keeps the
                      numeral, which is now its only reader — see its note on
                      ProfileKit for the one kit that had to repoint it. */}
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
                      {/* THE TOP OF THE CURVE IS ITS OWN LINE (#2383), for all
                          seven kits at once — this row is the only one they
                          have. Above the last rung the band has zero width and
                          there is no level to name, so the two figures would
                          read "0 / 0 pts this level" and "next · lvl 8" on a
                          level-8 character. The field desk's sentence replaces
                          both, in each kit's body voice: the eyebrow slot is
                          uppercased and letter-spaced for a two-word label,
                          and a sentence shouted through it would be the second
                          bug. The slot is the whole row. */}
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
                              // points into level: a number the player cares about
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
                    {/* THE WHOLE CLIMB, at the caption tier (#2127) — and for
                        all nine since #2996, where it was na's alone.

                        na drew it in both of its retired branches and the
                        shared skin had no slot for it, so delegating deleted a
                        real readout from the page: the bar above says where you
                        are INSIDE the band, and this is the only line that says
                        where the band sits on the era's whole curve. It is the
                        voice the home page's "185 all-time" caption uses, and
                        `.label-caption` is the minted tier (#1307), so nothing
                        new is invented for it.

                        The ink is `headerMuted` — the ink the two lines
                        directly above it already use, in this same panel, on
                        this same ground. Left to `.label-caption`'s own
                        `--label-ink` it would put the app's neutral tertiary on
                        eight factions' own stock, which is a pairing nothing
                        has measured. Set as `color` rather than by repointing
                        that custom property, because a kit whose quiet ink is
                        the CASCADE (WOW's laptop is, deliberately — see its
                        file) would hand `--label-ink: inherit`, and a custom
                        property inheriting is not the same thing as a colour
                        inheriting: it would land on the tertiary the class
                        already meant, one tier off the lines above it.

                        At the top of the curve there is no threshold for it to
                        annotate and the line goes (#2383) — the era-points
                        figure it carries is still on the credential beside this
                        panel. An absolute-score footnote ("> 1880 PTS LOGGED")
                        also hung here behind a `scoreFootnote` knob; #1909 cut
                        its string and #1911 took the knob. That is not this. */}
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

              {/* friend/foe — kept feature, faction-skinned, folded into header */}
              {identityActions && (
                <div style={{ marginTop: 'var(--space-lg)', maxWidth: 220 }}>{identityActions}</div>
              )}
            </div>
          </div>
        </header>,
        )}

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
