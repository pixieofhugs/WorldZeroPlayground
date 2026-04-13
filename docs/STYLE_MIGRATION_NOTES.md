# Style Migration Notes — Phase 2+

Reference: `WORLD_ZERO_STYLE.md` (root of repo)

## What Phase 1 completed
- CSS custom properties for all colors (`:root` + `[data-theme="dark"]`)
- New fonts: Lora, Courier Prime, Special Elite, Share Tech Mono, Bebas Neue
- Tailwind config updated with CSS-variable-backed colors and faction palette
- Nav: frosted glass background, rainbow gradient wordmark underline, Courier Prime uppercase links
- PageTitle component: Lora italic 34px with per-letter colored underline bars
- Layout: grid with 1fr + 256px sidebar column
- WatercolorBackground: SVG blurred ellipses in four corners
- Sidebar shell: character card, active tasks placeholder, propose-a-task button
- Removed: graph-paper background, Caveat/Kalam fonts, sketch box-shadows

## What Phase 2 completed
- 7 unique faction card components in `frontend/src/components/cards/`
- TaskCard router selects card archetype by `primary_faction_slug`
- LevelPill shared component
- Flex-wrap container on Tasks page (not CSS grid)
- 3 custom filter components: FilterStamps, FilterFactionTabs, FilterLevelNodes

## ~~Phase 2: Faction Card Archetypes~~ DONE

Each faction needs a completely different card component. See style guide Section 6 for full specs.

- [x] **TaskCardUA** — Sticky note: push pin, clipped corner, pastel yellow/pink, slight rotation. Width ~122–130px. Font: Courier Prime. (§6.1)
- [x] **TaskCardAnalog** — Field journal page: yellowed paper, red margin rule on left, horizontal ruled lines, torn bottom edge via clip-path. Width ~132–140px. Font: Special Elite. (§6.2)
- [x] **TaskCardGestalt** — Collage / layered scraps: three stacked paper scraps at different rotations + scotch tape strip across top. Width ~138px. Font: Courier Prime. (§6.3)
- [x] **TaskCardSNIDE** — Newspaper clipping: aged newsprint, torn top/bottom edges via ::before/::after, masthead banner, two-column body, cutout ransom letters for faction name. Width ~148px. Font: Special Elite for card, Courier Prime for cutout letters. (§6.4)
- [x] **TaskCardJourneymen** — Luggage tag: dashed string + eyelet hole, hazard stripe at top, bordered tag body. Width ~118px. Font: Courier Prime. (§6.5)
- [x] **TaskCardSingularity** — Terminal printout: always dark background, green terminal text, corner bracket decorations, sprocket hole rows, scanline overlay, blinking cursor. Width ~140px. Font: Share Tech Mono. (§6.6)
- [x] **TaskCardUAMasters** — Gazette article: deckled corner-snipped edges, proper masthead, headline + dateline, two-column layout. Width ~148px. Font: Special Elite. (§6.7)
- [x] **TaskCard router** — `TaskCard.tsx` should select the correct card component based on `task.primary_faction_slug`
- [x] **Flex-wrap container** — Replace CSS grid on Tasks page with `display: flex; flex-wrap: wrap; gap: 1rem; align-items: flex-start`. Cards are NOT on a strict grid — varying heights and slight rotations are intentional.
- [x] **LevelPill component** — Dark pill shared by all cards: `background: #1a1209; color: white; font-size: 7px; padding: 1px 6px; border-radius: 6px; text-transform: uppercase`. Dark mode: `background: var(--faction-color); color: dark-bg`.

## ~~Phase 3: Custom Filter Controls~~ DONE

Replace current chip-based filters with three distinct visual types. See style guide Section 5.3.

- [x] **FilterStamps** (status filter) — Rectangular rubber stamps, no border-radius. 2px solid border, inner dashed border inset. Active: `bg: #1a1209; color: #F7F4EE`. Font: Courier Prime 10px bold uppercase. (§5.3)
- [x] **FilterFactionTabs** (faction filter) — Diagonal banner/pennant shape via `clip-path: polygon(0 0, 100% 0, 95% 100%, 5% 100%)`. Background: faction color. Inactive: `opacity: 0.42; filter: saturate(0.3)`. White text with text-shadow. Font: Courier Prime 9px bold uppercase. (§5.3)
- [x] **FilterLevelNodes** (level filter) — Connected circles (30px diameter) with horizontal connector bars. Active: scale(1.15), dark fill. Represents minimum level filter. (§5.3)

## Phase 4: Dark Mode

- [ ] **Theme toggle** — Add toggle in nav or settings. Store preference in `localStorage` key `wz-theme`. Default to system preference via `prefers-color-scheme`.
- [ ] **useTheme hook** — Returns `'light' | 'dark'`, manages `data-theme` attribute on `<html>`.
- [ ] **WatercolorBackground dark variant** — Lower opacity (0.11–0.18) and deep color variants per style guide §2.3.
- [ ] **Nav dark mode** — `background: rgba(19, 18, 26, 0.92); backdrop-filter: blur(8px)`.
- [ ] **Card dark variants** — Each faction card has a specifically designed dark variant. See §6.1–6.7 dark mode sections. Singularity card is always dark in both modes.
- [ ] **Button dark variants** — Propose a task: `background: #f0e6d0; color: #13121a`. Stamps/chips: `bg: #f0e6d0; color: #13121a`.
- [ ] **Body transition** — 150ms `transition: background-color, color` on body (already in index.css).

## ~~Phase 5: Sidebar Data Wiring~~ DONE

- [x] **Active tasks panel** — Fetch user's signed-up tasks, show with faction color left-border, task name, meta (faction · level · date). Progress bar: `X / 20 slots` with indigo fill.
- [x] **Recent activity panel** — Fetch 3 most recent submissions. Player names bold + task title. Timestamps via relativeTime(). Separated by 1px dashed border.

## ~~Phase 6: Per-Page Polish (secondary pages)~~ DONE

- [x] Apply PageTitle to remaining secondary pages (About, Contact, Disclaimer, Attributions, Donate, Admin, EditCharacter, EditSubmission, SubmitProof, Updates, Groups)
- [x] Update Factions page cards to use sidebar-card + faction colors
- [x] Remove remaining `hover:-translate` sketch effects from all components (Groups, Factions, SubmissionCard, Leaderboard)

## ~~Phase 7: Praxis Submission Page (§12)~~ DONE

- [x] **Breadcrumb** — `Tasks › [faction dot] [Task Name] › Praxis`
- [x] **Byline block** — Author's faction card aesthetic as framing (collage, notebook, newsprint, etc.). Avatar orb + name + faction meta + vote score.
- [x] **Praxis title** — Lora italic 30px + full-width rainbow underline bar (8 segments, NOT per-letter)
- [x] **Task context strip** — Faction-color left border, frosted bg, task name + points + level pill
- [x] **Media gallery** — Main image 16:9, thumbnail strip, active thumb faction-color border, "+N more" overflow
- [x] **Body text** — Lora 15px, line-height 1.75, drop cap first letter in faction color 58px, italic emphasis in faction color
- [x] **Collaboration strip** — Overlapping avatar orbs, badge pill (Collab/Duel)

## Phase 8: Voting System (§13)

- [ ] **Vote stamps** — Replace star rating with 5 rectangular stamp buttons (1–5) with word labels (a start / solid / good / excellent / legendary). Value-specific border colors.
- [ ] **Voter tile grid** — Show every voter as a tile: 48×48 avatar, points badge, name. Flex-wrap layout. "+N more" overflow.
- [ ] **Vote results header** — Total points earned, voter count
- [ ] **Flag block** — First-class UI element below voter grid. Circular flag icon + explanation + confirmation modal.

## Phase 9: Player Profile Page (§14)

- [ ] **Faction-framed profile header** — Player's faction card aesthetic as container (same principle as praxis byline). Avatar orb 80px + level badge + action buttons (Friend/Foe/DM or Edit Profile).
- [ ] **Level track** — Full-width horizontal track of 9 levels (0–8). Completed/current/locked node states. Faction-color connectors. Progress bar to next level.
- [ ] **Praxis grid** — 3-column grid of praxis cards with thumbnails, voter mini-tiles, "+N more" overflow card
- [ ] **Friends/Foes panels** — Two-column row. Relation items with avatar orb + score delta. Mutual vs pending states.

## Phase 10: Task Detail Page (§15)

- [ ] **Task hero block** — Faction card archetype expanded to full width (journal page, collage, newspaper, etc.)
- [ ] **Sign-up block** — Mode selector (Solo/Collab/Duel) as stamp buttons. Conditional fields for collab/duel invites. Faction-color sign-up button with inner dashed border.
- [ ] **Meta tasks section** — Frosted card, faction-color dots, bonus amounts. Locked tasks at opacity 0.45.
- [ ] **Praxis gallery** — Two-column grid of completed submissions. Sort toggles (Top rated / Recent).
- [ ] **"Who else is on this task" sidebar panel** — Signed-up players with relationship badges.

## Phase 11: Leaderboard / Players Page (§16)

- [ ] **Podium** — Top 3 players in faction-framed cards. Platform blocks with rank-specific heights/colors.
- [ ] **Your rank strip** — Highlighted row between podium and table. Rank delta indicator.
- [ ] **Score toggle** — Era/All-time stamp buttons + faction pennant filter
- [ ] **Main table** — Frosted card, faction-color left edge accents, Lora serif ranks, avatar orbs, level pills. Your row highlighted. Gap indicator for contextual jump.
- [ ] **Faction standings sidebar panel** — Horizontal bars per faction proportional to total score.

## Phase 12: Updates Feed Page (§17)

- [ ] **Feed filters** — Stamp-style pills: All, Friends, Foes, Your stuff, Global, Requests (with badge count)
- [ ] **Feed item types** — Base frosted card with 4px left-edge accent + type label pill. Player action, praxis completion, vote notification, collab invite, duel challenge.
- [ ] **Foe taunts** — Special treatment: aged paper notes with tape strip, torn bottom edge, Special Elite font, auto-generated messages. Red/gold tints.
- [ ] **Era announcements** — Full-width dark card with gold accent. Pinned on day posted.
- [ ] **Pending requests sidebar panel** — Avatar orbs + Accept/Decline buttons
- [ ] **Date separators** — Flanking horizontal rules with day labels

## Phase 13: Submit Proof Form (§18)

- [ ] **No sidebar layout** — Single centered column, max-width ~720px
- [ ] **Task context header** — Faction-framed block with task name, faction, points, collaborator orbs
- [ ] **Proof title input** — Lora italic 24px, bottom border focus state, rainbow underline bars on input
- [ ] **Rich text editor** — Minimal toolbar (Bold/Italic/Underline, H1/Quote, Bullet/Link, Insert Image/Video). Lora 14px body. No character/word limit.
- [ ] **Media upload** — 3-column grid, "Main" badge on first upload, drag-drop zone, file type badges
- [ ] **Meta tasks section** — Checkboxes with faction-color checked state + bonus amounts
- [ ] **Submit row** — "Publish proof" faction-color stamp button + "Save draft" outline button
- [ ] **Contextual panels** — "What makes a good proof post" tips + "Other proofs for this task" peek

## Phase 14: Propose a Task Form (§20)

- [ ] **No sidebar layout** — Two-column grid: form left, tips column right (~280px). No sidebar panels.
- [ ] **Faction selector** — Row of faction choice tiles with diagonal pennants. Selection determines card wrapper aesthetic.
- [ ] **Proposal card wrapper** — Form fields inside faction card archetype expanded to full width (sticky note, journal, collage, newspaper, etc.)
- [ ] **Task name input** — Faction-appropriate font, 22px, bottom-border only, focus transitions to faction color
- [ ] **Task description** — Rich text editor, faction-appropriate font, 13px
- [ ] **Suggested difficulty** — Point value number input + connected node level selector (0–5)
- [ ] **Notes to admin** — Optional textarea with faction-color focus border
- [ ] **Task preview strip** — Live preview of how the task card will look, updates as user types
- [ ] **Submit row** — "Submit proposal" faction-color stamp button + "Cancel" outline button
- [ ] **Tips column** — "What makes a good task" + "Your previous proposals" + "What happens next"
