## Building with the World Zero kit

World Zero is a community game: players join one of seven **factions**, each with a
distinct visual identity, and every surface (task card, vote UI, avatar, feed frame,
comment, faction hero) is rendered as a per-faction skin. The kit gives you both the
**dispatchers** (pick the skin from a faction slug) and every **per-faction leaf**.

### Setup — wrap your screen once
Components use `react-router-dom` v6 (`<Link>`, `useNavigate`) — they throw outside a
Router — and `react-i18next` for copy. Render inside a Router; the kit's styles and
fonts load from `styles.css` (already bound). Dark mode is the `[data-theme="dark"]`
cascade — set that attribute on a root element; never hardcode dark colors.

```jsx
import { MemoryRouter } from 'react-router-dom'
import { TaskCard } from 'worldzero-frontend'

<MemoryRouter>
  {/* task.primary_faction_slug drives the skin: 'ua' | 'wow' | 'snide' |
      'ephemerists' | 'singularity' | 'everymen' | 'albescent' | null (default) */}
  <TaskCard task={task} displayPoints={task.point_value} />
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
ransom-note; Ephemerists = vellum codex; Singularity = dark terminal; Wow = whimsy;
Everymen = union broadsheet; Albescent = hushed vellum). Don't unify them — compose the
faction's own component and let it carry its identity.

### Where the truth is
- Read `styles.css` and its `@import` (`_ds_bundle.css`) for the full token set before
  styling — it's the authoritative list of `--faction-*` / `--color-*` names.
- Each component ships `<Name>.d.ts` (its props) and `<Name>.prompt.md` (usage). Prefer
  a **dispatcher** (`TaskCard`, `VoteUI`, `FactionAvatar`, `FactionFeedFrame`,
  `FactionCard`) and pass a faction slug when you want "the right skin for this faction";
  reach for a named leaf (`UATaskCard`, `SnideVote`, …) only to pin one faction.
