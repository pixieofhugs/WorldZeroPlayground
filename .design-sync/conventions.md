## Building with the World Zero kit

World Zero is a community game: players join one of seven **factions**, each with a
distinct visual identity, and every surface (task card, vote UI, avatar, feed frame,
comment, faction hero) is rendered as a per-faction skin. The kit gives you both the
**dispatchers** (pick the skin from a faction slug) and every **per-faction leaf**.

The seven themed slugs are `ua`, `everymen`, `coven`, `snide`, `wow`, `ephemerists`,
`singularity`. Unaffiliated players are `na` — a real identity, not a blank, and the one
every `Default*` component dresses. `albescent` is a themed archetype with **no palette
of its own**: it ships its own components but resolves to the neutral `default` colors.

### Setup — wrap your screen once
Components use `react-router-dom` v6 (`<Link>`, `useNavigate`) — they throw outside a
Router — and `react-i18next` for copy. Render inside a Router; the kit's styles and
fonts load from `styles.css` (already bound). Dark mode is the `[data-theme="dark"]`
cascade — set that attribute on a root element; never hardcode dark colors.

```jsx
import { MemoryRouter } from 'react-router-dom'
import { TaskCard } from 'worldzero-frontend'

<MemoryRouter>
  {/* task.primary_faction_slug drives the skin: 'ua' | 'wow' | 'coven' | 'snide' |
      'ephemerists' | 'singularity' | 'everymen' | 'na' (unaffiliated / default) */}
  {/* basePoints is task.point_value — never base × multiplier. A card draws the
      ×badge only when multiplier is non-neutral, which at era_1 is never. */}
  <TaskCard task={task} basePoints={task.point_value} />
</MemoryRouter>
```

### The styling idiom — tokens + Tailwind utilities (hybrid)
Do NOT invent colors. Two systems are in play, both shipped in `styles.css`:

1. **Faction & semantic CSS variables** — the design language. Faction palette:
   `var(--faction-<slug>)` and its family `--faction-<slug>-card-bg`,
   `-card-text`, `-card-accent`, `-card-font`, `-border`, `-light` (slugs above; plus
   `--faction-default-*` for unaffiliated). Neutral/semantic:
   `--color-bg-page`, `--color-bg-surface`, `--color-text-primary` /
   `-secondary` / `-tertiary`, `--color-accent-primary`, `--color-border`,
   `--color-text-on-accent`, `--color-danger` / `-success` / `-warning`. Style your own
   layout glue with these so a screen matches whatever faction it's themed to.
2. **Tailwind utility classes** for layout — `flex`, `items-center`, `gap-4`,
   `rounded-full`, `object-cover`, `p-4`, `justify-between`, etc. (the app's Tailwind
   layer is compiled into the bundle). Use these for structure; use the CSS variables
   for color/type.

Each faction has its OWN card archetype (UA = gilt salon/Cinzel; SNIDE = redacted
ransom-note; Ephemerists = vellum codex; Singularity = dark terminal; Wow = cream/gold/plum
chronicle; Everymen = union broadsheet; Coven = handwritten/Caveat; Albescent = hushed
vellum on the neutral palette). Don't unify them — compose the faction's own component and
let it carry its identity.

### Where the truth is
- Read `styles.css` and its `@import` (`_ds_bundle.css`) for the full token set before
  styling — it's the authoritative list of `--faction-*` / `--color-*` names.
- Each component ships `<Name>.d.ts` (its props) and `<Name>.prompt.md` (usage). Prefer
  a **dispatcher** (`TaskCard`, `VoteUI`, `FactionAvatar`, `FactionFeedFrame`,
  `FactionSelectCard`, `FactionSigil`, `MetataskSeal`, `ScoreStamp`) and pass a faction slug when
  you want "the right skin for this faction"; reach for a named leaf (`UaTaskCard`,
  `SnideVote`, `CovenSeal`, …) only to pin one faction.

### Faction page skins (full-screen, not atoms)
The kit ships whole **page skins**, one per faction per surface — compose the whole
screen, don't cherry-pick pieces. Each takes a single hook-shaped `state` prop
(`TaskDetailState`, `EditPraxisState`, `FieldDeskHomeState`, …): the screen is
presentation-only, so assemble the state object (character, tasks, praxis, handlers)
and pass it. Every surface has a `Default*` skin — that is the `na` / unaffiliated
dress, not a placeholder. In the component picker they're grouped by surface.

**Responsive — one component covers both form factors** (it calls `useFormFactor()`
internally and stacks single-column on a phone):
- `taskdetail` — `DefaultTaskDetail`, `UaTaskDetail`, `CovenTaskDetail`, …
- `praxisdetail` — `DefaultPraxisDetail`, `WowPraxisDetail`, …
- `editpraxis` — the composer: `DefaultEditPraxis`, `UaEditPraxis`, `WowEditPraxis`, …
- `characterprofile` `*ProfileBody` and `factiondetail` `*FactionBody` — the page bodies.

**Nothing is split by form factor any more.** Faction detail was the last pair —
`*FactionBody` beside a `*FactionPage` mobile screen — and ADR-0078 (#1314) retired
the phone skins. Character profile went the same way in #1319 (`*ProfileBody`).

**Mobile-only screens**: `DefaultFieldDesk` / `WowFieldDesk` / `UaFieldDesk` / `SnideFieldDesk` …
(`fielddesk`), plus the singletons `DefaultTasks`,
`DefaultCreateCharacter`, `DefaultEditCharacter`, `DefaultFactionsDirectory`.
Players is the one surface still split by form factor: `MobilePlayers` and
`DesktopPlayers`, each taking the same `playersProps` shape.
