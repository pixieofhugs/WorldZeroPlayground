/**
 * WowProfileBody — a knight's page (kit §15, #900).
 *
 * Crested header on a cream plate under a gold/plum checker wash, a gilt rope
 * ring round the credential, burnt-gold figures on near-white plates, honours
 * struck on gilt lozenges, and every chronicle row led by a plum rule.
 *
 * Structure is DefaultProfileBody's locked spine via ProfileSkin; only the
 * costume differs (ADR-0016). The kit's own section names map onto that spine
 * one-for-one and are supplied as copy, not as new structure:
 *
 *   the tally of deeds  → the progression panel (level readout + points bar)
 *   Honours & Credentials → ③ badges
 *   Recent Chronicles   → ⑤ praxis, which renders WOW's own chronicle card
 *
 * TWO DEVIATIONS, both forced by the spine. The kit draws a four-up stat grid
 * (Points / Quests / Huzzahs / Rank); the spine has no such slot, and adding one
 * would fork the profile contract for one faction — three of those four numbers
 * are already in the CredentialCard and the progression panel beside it, so the
 * grid would restate them. And the kit's honour rows carry a one-line
 * description; `BadgeOut` has a name and a glyph, so the row is the name on the
 * lozenge, which is what the shared `BadgeRow` renders for every faction.
 *
 * No hardcoded hex, no theme ternary — every value below is a
 * `--faction-wow-*` token and both themes come from the cascade.
 *
 * ONE RESPONSIVE COMPONENT (#1319, the ADR-0056 / ADR-0058 / ADR-0067 shape).
 * THE FIELD PAVILION — the phone face, #901 — is the `MobileProfile` branch
 * below, in this file: the crested header wash and checker from the kit's one
 * phone screen (`components/factionMarks/wowMobile`), over this archetype's own
 * three marks — burnt-gold figures on near-white plates, honours struck on gilt
 * lozenges, and every row led by a plum rule. Those marks are what make the two
 * form factors read as one page, and they are why the pavilion is folded in
 * rather than letting `ProfileSkin` squeeze onto a phone.
 *
 * The pavilion keeps its two deviations from the kit, both of which the desktop
 * page makes too: the CREST does not appear (this is a knight's page, not the
 * Court's — the header carries the player's own avatar in the gilt ring), and an
 * honour row shows the badge NAME only, because `BadgeOut` carries a name and a
 * glyph and no description. Its stat row stays three-up for the same reason
 * desktop dropped the kit's four-up grid: `Rank` is already in the ring beside it.
 */
import { useState, type ReactNode } from 'react'

import { badgeArtFor } from '../../../components/badges/badgeArt'
import type { BadgeOut } from '../../../api/auth'
import PraxisCard from '../../../components/praxisCard/PraxisCard'
import TaskCard from '../../../components/taskCard/TaskCard'
import {
  WOW_BODY,
  WOW_DEEP,
  WOW_DISPLAY,
  WOW_FIGURE,
  WOW_INK,
  WOW_MUTED,
  WOW_PAGE_MUTED,
  WOW_PLATE,
  WOW_RULE,
  WowCheckerBand,
  WowSectionHead,
  WowSpark,
  wowChecker,
  wowMobilePage,
} from '../../../components/factionMarks/wowMobile'
import { useFormFactor } from '../../../hooks/useFormFactor'
import { factionName } from '../../../utils/factions'
import { factionRoleVars } from '../../../utils/factionRoles'
import { mediaUrl } from '../../../utils/media'
import { useTranslation } from 'react-i18next'
import type { ProfileBodyProps } from '../FactionProfileBody'
import {
  AboutBlock,
  BadgeRow,
  ProfileSkin,
  SpectrumLaurel,
  TaglineSlot,
  type ProfileDress,
} from './profileSkin'

type Segment = 'praxis' | 'tasks'

/**
 * THE FIVE CORE ROLES ARE ASKED FOR BY NAME (#2674), AND THIS FILE OWNS ONLY
 * ONE OF ITS TWO ROOTS.
 *
 * `MobileProfile` below spreads `factionRoleVars('wow', 'wow-profile')` on the
 * pavilion page it draws. The DESKTOP half has no root here: it hands `dress`
 * to the shared `ProfileSkin`, which owns the page element all nine factions
 * mount on, so declaring the prefix for that half means giving `ProfileDress` a
 * root-vars slot — a component prop, which is TREE work and not a paint lane's
 * to do (the axis #2650 established). Until then the desktop reads resolve
 * through their fallbacks, which is byte-for-byte what shipped: the fallback is
 * per-SITE by design, and an undeclared prefix is the neutral case the law
 * builds pixel-identity out of.
 */
const INK = 'var(--wow-profile-ink)'
const MUTED = 'var(--wow-profile-quiet)'
const PLUM = 'var(--wow-profile-accent)'
const GOLD = 'var(--faction-wow-chronicle-gold)'
const FIGURE = 'var(--faction-wow-figure)'
const SURFACE = 'var(--wow-profile-paper)'
const PLATE = 'var(--faction-wow-plate)'
const PLATE_BORDER = 'var(--faction-wow-plate-border)'
const DISPLAY = 'var(--wow-profile-face)'
const BODY = 'var(--faction-wow-body-font)'

function heading(title: string, eyebrow: string): ReactNode {
  return (
    <div style={{ marginBottom: 'var(--space-lg)' }}>
      <div
        className="label-heading"
        style={{
          fontFamily: DISPLAY,
          letterSpacing: '0.14em',
          color: 'var(--faction-wow-accent-deep)',
          marginBottom: 'var(--space-xs)',
        }}
      >
        {eyebrow}
      </div>
      <h2
        style={{
          fontFamily: DISPLAY,
          fontSize: 'var(--text-heading)',
          lineHeight: 1.05,
          color: INK,
          margin: 0,
        }}
      >
        {title}
      </h2>
    </div>
  )
}

const dress: ProfileDress = {
  slug: 'wow',
  pageBackground:
    'linear-gradient(165deg, var(--faction-wow-ground-from), var(--faction-wow-ground-to))',
  // court-glow + gilt hatch, the pair the hero and the page backdrop both wear.
  pageOverlay:
    'radial-gradient(circle at 82% 12%, var(--faction-wow-court-glow), transparent 46%), repeating-linear-gradient(135deg, transparent 0 22px, var(--faction-wow-hatch) 22px 24px)',
  ink: INK,
  muted: MUTED,
  accent: PLUM,
  surface: SURFACE,
  border: GOLD,
  displayFont: DISPLAY,
  eyebrowFont: DISPLAY,
  bodyFont: BODY,
  headerStyle: {
    background:
      'linear-gradient(180deg, var(--faction-wow-ground-from), var(--faction-wow-ground-to))',
    border: `2px solid ${GOLD}`,
    borderRadius: 'var(--radius-xl)',
    padding: 'var(--space-xl) var(--space-2xl)',
    marginBottom: 'var(--space-3xl)',
  },
  // The kit's gold/plum checker laid over the header at a tenth, so the crested
  // banner reads as struck stationery rather than a flat plate.
  headerDecoration: (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        opacity: 0.1,
        pointerEvents: 'none',
        background: `repeating-linear-gradient(90deg, ${GOLD} 0 16px, var(--faction-wow-plum-surface) 16px 32px)`,
      }}
    />
  ),
  // The gilt rope ring the kit sets its crest in, here mounting the credential.
  credentialFrame: (card) => (
    <div
      style={{
        // The 4px band IS the drawn gilt rope. §4a's ring-stroke carve-out does
        // NOT apply here: an ON-SCALE value can never be ornament, and 4px is
        // --space-xs exactly, so it takes the token rather than a hatch.
        padding: 'var(--space-xs)',
        background: 'var(--faction-wow-avatar-ring)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: '0 12px 30px -18px var(--faction-wow-chronicle-shadow)',
      }}
    >
      <div
        style={{
          background: SURFACE,
          border: `2px solid var(--faction-wow-plum-surface)`,
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
        }}
      >
        {card}
      </div>
    </div>
  ),
  progressionStyle: {
    marginTop: 'var(--space-xl)',
    background: PLATE,
    border: `1px solid ${PLATE_BORDER}`,
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-lg)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-lg)',
    maxWidth: 440,
  },
  barFill: `linear-gradient(90deg, var(--faction-wow-plum-surface), ${GOLD})`,
  barTrack: PLATE_BORDER,
  sectionHeading: heading,
  emptyStateStyle: {
    border: `1px dashed ${GOLD}`,
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-2xl)',
    textAlign: 'center',
    background: PLATE,
  },
  laurel: <SpectrumLaurel centerBg={SURFACE} glyphColor={FIGURE} />,
  badgeBoardStyle: {
    border: `1px solid ${PLATE_BORDER}`,
    borderLeft: `4px solid var(--faction-wow-plum-surface)`,
    borderRadius: 'var(--radius-lg)',
    background: PLATE,
    padding: 'var(--space-xs) var(--space-lg)',
  },
  badgeChipStyle: {
    fontFamily: DISPLAY,
    fontSize: 'var(--text-md)',
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'var(--faction-wow-accent-deep)',
    marginLeft: 'auto',
    border: `1px solid ${PLATE_BORDER}`,
    borderRadius: 999,
    padding: 'var(--space-xs) var(--space-sm)',
  },
  badgeRow: (badge, last) => (
    <BadgeRow
      badge={badge}
      last={last}
      dividerColor={PLATE_BORDER}
      nameStyle={{ fontFamily: DISPLAY, color: INK, lineHeight: 1.15 }}
      medallion={(glyph) => (
        <span
          style={{
            flexShrink: 0,
            width: 34,
            height: 34,
            borderRadius: 'var(--radius-md)',
            background:
              'linear-gradient(180deg, var(--faction-wow-avatar-pill-from), var(--faction-wow-avatar-pill-to))',
            border: `1.5px solid var(--faction-wow-avatar-pill-border)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxSizing: 'border-box',
            color: 'var(--faction-wow-avatar-pill-text)',
          }}
        >
          {glyph}
        </span>
      )}
    />
  ),
}

export default function WowProfileBody(props: ProfileBodyProps) {
  return useFormFactor() === 'mobile' ? (
    <MobileProfile {...props} />
  ) : (
    <ProfileSkin
      props={props}
      /* Dress only. Seven copy knobs used to be spread on here, resolved from
         `profile.<slug>.*`; #1911 collapsed those families to one shared string
         each, so every kit was passing the same words and `ProfileSkin` reads
         them itself now. */
      kit={dress}
    />
  )
}

/**
 * A KNIGHT'S PAGE, PHONE SHAPED (#901). The content contract is the #459 one,
 * unchanged: centred credential, real-fields stat row, badges hidden when empty,
 * the friend/foe control, and a segmented Chronicles / Quests toggle over the
 * shared `PraxisCard` / `TaskCard` stacked single-column. It renders no field
 * the contract does not expose.
 */
function MobileProfile({
  character,
  submissions,
  proposedTasks,
  identityActions,
  onSignup,
}: ProfileBodyProps) {
  const { t } = useTranslation('common')
  const [segment, setSegment] = useState<Segment>('praxis')
  const badges = character.badges ?? []

  // The tally's three labels were WOW's own — "Huzzahs", "Chronicles",
  // "Quests" — and #1909 CUT all three with the rest of `profile.wow.*`. No
  // other profile body draws a stat row, so there is no per-faction twin to
  // settle onto; these are the SHARED words for the same three entities.
  //
  // ponytail: `sidebar.characterCard.points` is a sidebar key doing duty on a
  // profile. Ceiling: it is the only shared string in this namespace that says
  // "points", and a deletion PR may not mint a new one. Upgrade path: #1910
  // owns the profile-kit collapse and can give the row a proper
  // `profile.stats.*` block. The row itself is kept because its figures are
  // real data — deleting it would take the score and both counts off the page.
  const stats = [
    { label: t('sidebar.characterCard.points', { count: character.score }), value: character.score },
    { label: t('profile.mobile.tabPraxis'), value: submissions.length },
    { label: t('profile.mobile.tabTasks'), value: proposedTasks.length },
  ]

  return (
    <div
      data-skin="wow"
      data-testid="mobile-profile"
      style={{
        ...factionRoleVars('wow', 'wow-profile'),
        ...wowMobilePage,
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-xl)',
        marginLeft: 'calc(-1 * var(--space-lg))',
        marginRight: 'calc(-1 * var(--space-lg))',
        paddingBottom: 'var(--space-xl)',
      }}
    >
      {/* ── the credential, on the pavilion's header wash ── */}
      <header
        style={{
          position: 'relative',
          overflow: 'hidden',
          textAlign: 'center',
          padding: 'var(--space-lg)',
          background:
            'linear-gradient(180deg, var(--faction-wow-mobile-header-from), var(--faction-wow-mobile-header-to))',
          borderBottom: `2px solid var(--faction-wow-chronicle-gold)`,
        }}
      >
        <div
          aria-hidden
          style={{ position: 'absolute', inset: 0, opacity: 0.12, background: wowChecker(14) }}
        />
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              width: 92,
              height: 92,
              borderRadius: '50%',
              background: 'var(--faction-wow-avatar-ring)',
              // 4px IS --space-xs; §4a's ring carve-out never covers an
              // on-scale value, so it takes the token.
              padding: 'var(--space-xs)',
              boxSizing: 'border-box',
            }}
          >
            {character.avatar_url ? (
              <img
                src={mediaUrl(character.avatar_url)}
                alt={character.display_name}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid var(--faction-wow-plum-surface)',
                  boxSizing: 'border-box',
                }}
              />
            ) : (
              <span
                aria-hidden
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--faction-wow-avatar-field)',
                  border: '2px solid var(--faction-wow-plum-surface)',
                  boxSizing: 'border-box',
                  fontFamily: WOW_DISPLAY,
                  fontSize: 'var(--text-heading)',
                  color: WOW_FIGURE,
                }}
              >
                {character.display_name[0]?.toUpperCase()}
              </span>
            )}
          </span>

          <h1
            style={{
              fontFamily: WOW_DISPLAY,
              fontSize: 'var(--text-heading)',
              lineHeight: 1.08,
              color: WOW_INK,
              margin: 'var(--space-md) 0 0',
              overflowWrap: 'anywhere',
            }}
          >
            {character.display_name}
          </h1>

          {/* ① the shared tagline slot (#1629), centred under the name.
              THE NAME STAYS HERE, and this is the one profile where it does:
              the pavilion's phone header has no credential card (#901) — the
              avatar hoop and this <h1> ARE the identity — so the delta that
              deletes the column's name everywhere else would leave a nameless
              profile. The eyebrow below is the pavilion's own motto, not the
              retired `playerEyebrow` slot, so it stays too. */}
          <TaglineSlot
            tagline={character.tagline}
            style={{
              fontFamily: WOW_DISPLAY,
              color: WOW_INK,
              margin: 'var(--space-xs) auto 0',
            }}
          />

          <div
            style={{
              fontFamily: WOW_BODY,
              fontStyle: 'italic',
              fontSize: 'var(--text-content)',
              color: WOW_DEEP,
              marginTop: 'var(--space-xs)',
            }}
          >
            {t('leaderboard.mobile.factionLevel', {
              faction: factionName(character.faction_slug),
              level: character.level,
            })}
          </div>
          {/* "Of the Court of Whimsy" (`profile.wow.eyebrow`) sat under the
              faction/level line. #1909 cut it: WOW was the only faction with a
              profile eyebrow, on a surface the audit ruled generic, and there
              is no shared twin to fall back to. */}

          {identityActions && (
            <div style={{ marginTop: 'var(--space-lg)', width: '100%', maxWidth: 220 }}>
              {identityActions}
            </div>
          )}
        </div>
      </header>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-xl)',
          paddingLeft: 'var(--space-lg)',
          paddingRight: 'var(--space-lg)',
        }}
      >
        {/* ── ② About — the shared block, in the pavilion's own dress.
            #1626 mounted it in `ProfileSkin` and both `DefaultProfileBody`
            branches and counted that as every renderer; this bespoke phone
            stack (#901) routes through neither, so a WOW player could write a
            bio in Settings and see it nowhere. Imported, not re-implemented:
            hidden-when-empty, `pre-wrap` and the content tier are the block's,
            and the kit only hands it a heading and its ink. ── */}
        <AboutBlock
          bio={character.bio}
          heading={<WowSectionHead>{t('profile.aboutHeading')}</WowSectionHead>}
          style={{ fontFamily: WOW_BODY, color: WOW_INK }}
        />

        {/* ── the tally of deeds ── */}
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          {stats.map((stat) => (
            <div
              key={stat.label}
              style={{
                flex: '1 1 0',
                minWidth: 0,
                textAlign: 'center',
                background: WOW_PLATE,
                border: `1px solid ${WOW_RULE}`,
                borderRadius: 7,
                padding: 'var(--space-md) var(--space-sm)',
              }}
            >
              <div
                className="content-title"
                style={{ fontFamily: WOW_DISPLAY, lineHeight: 1, color: WOW_FIGURE }}
              >
                {stat.value}
              </div>
              <div className="label-caption" style={{ color: WOW_MUTED, marginTop: 'var(--space-xs)' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* ── honours & credentials — hidden entirely when empty ── */}
        {badges.length > 0 && (
          <section>
            <WowSectionHead>{t('profile.badgesHeading')}</WowSectionHead>
            <div
              style={{
                background: WOW_PLATE,
                border: `1px solid ${WOW_RULE}`,
                borderLeft: `4px solid var(--faction-wow-plum-surface)`,
                borderRadius: 7,
                padding: '0 var(--space-lg)',
              }}
            >
              {badges.map((badge, index) => (
                <HonourRow key={badge.key} badge={badge} last={index === badges.length - 1} />
              ))}
            </div>
          </section>
        )}

        {/* ── chronicles / quests ── */}
        <div>
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <SegTab on={segment === 'praxis'} onClick={() => setSegment('praxis')}>
              {t('profile.mobile.tabPraxis')}
            </SegTab>
            <SegTab on={segment === 'tasks'} onClick={() => setSegment('tasks')}>
              {t('profile.mobile.tabTasks')}
            </SegTab>
          </div>
          <WowCheckerBand height={3} />
        </div>

        {segment === 'praxis' ? (
          submissions.length === 0 ? (
            <Empty>{t('profile.praxisEmptyTitle')}</Empty>
          ) : (
            /* `grid` and not a flex COLUMN (#2149). A praxis card carries
               `flex: 1 1 var(--praxis-card-basis, 394px)` (#1137), and a
               flex-basis sizes along the MAIN axis — a width in the rows it was
               written for, a HEIGHT here. This stack has an auto height, so
               there is no free space to grow into and every chronicle was
               pinned at exactly 394px tall: whitespace under a short one, and
               the byline and vote row cut off a long one, because the WOW frame
               is `overflow: hidden`. A grid stack lays the same single column
               out without claiming the card's block size. */
            <div style={{ display: 'grid', gap: 'var(--space-lg)' }}>
              {submissions.map((praxis) => (
                <PraxisCard key={praxis.id} praxis={praxis} />
              ))}
            </div>
          )
        ) : proposedTasks.length === 0 ? (
          <Empty>{t('profile.proposedTasksEmpty')}</Empty>
        ) : (
          /* The default stretch, like the praxis column above (#2763). This
             pinned `alignItems: center` because a phone task card carried its
             own 340px and stretching left it flush against a ragged right
             (#1964); below 768px the card fills its column instead, and
             centring a box that asks for the whole line shrinks it back to its
             content. */
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-lg)',
            }}
          >
            {proposedTasks.map((task) => (
              <TaskCard key={task.id} task={task} basePoints={task.point_value} onSignup={onSignup} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <p
      className="content-text"
      /* Body copy straight on the pavilion ground, the twin of the field desk's
         empty line: WOW_MUTED is 3.14:1 on that ground's darkest point, the
         page's own quiet ink 4.61:1 (#2248). The plate captions above keep
         WOW_MUTED — the plate is what it was measured on. */
      style={{ fontFamily: WOW_BODY, fontStyle: 'italic', color: WOW_PAGE_MUTED, margin: 0 }}
    >
      <WowSpark /> {children}
    </p>
  )
}

/** An honour: the badge glyph struck on a gilt lozenge, then its name. */
function HonourRow({ badge, last }: { badge: BadgeOut; last: boolean }) {
  const Art = badgeArtFor(badge.key)
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-md)',
        padding: 'var(--space-md) 0',
        borderBottom: last ? 'none' : `1px solid ${WOW_RULE}`,
      }}
    >
      <span
        style={{
          flexShrink: 0,
          width: 34,
          height: 34,
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxSizing: 'border-box',
          background:
            'linear-gradient(180deg, var(--faction-wow-avatar-pill-from), var(--faction-wow-avatar-pill-to))',
          border: '1.5px solid var(--faction-wow-avatar-pill-border)',
          color: 'var(--faction-wow-avatar-pill-text)',
        }}
      >
        <Art size={16} />
      </span>
      <span
        className="content-text"
        style={{ fontFamily: WOW_DISPLAY, lineHeight: 1.15, color: WOW_INK }}
      >
        {badge.name}
      </span>
    </div>
  )
}

function SegTab({
  on,
  onClick,
  children,
}: {
  on: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        minHeight: 46,
        cursor: 'pointer',
        fontFamily: WOW_DISPLAY,
        fontSize: 'var(--text-xl)',
        letterSpacing: '0.06em',
        color: on ? 'var(--faction-wow-quest-text)' : WOW_DEEP,
        background: on
          ? 'linear-gradient(180deg, var(--faction-wow-quest-from), var(--faction-wow-quest-to))'
          : WOW_PLATE,
        border: `1.5px solid ${on ? 'var(--faction-wow-quest-border)' : WOW_RULE}`,
        borderBottom: 'none',
        borderRadius: '7px 7px 0 0',
        padding: 'var(--space-sm)',
      }}
    >
      {children}
    </button>
  )
}
