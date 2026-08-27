// Lint guard for the i18n sweep (issue #440 / ADR-0032): user-facing literal
// strings in JSX are a build failure. Flipped from 'warn' to 'error' by the
// final cleanup issue (#450) now that every per-area sweep (#441–#449) landed.
//
// The rule runs in the plugin's default `jsx-text-only` mode: it flags rendered
// JSX text (where copy actually lives) and leaves plain TS expressions — style
// objects, ternary discriminants, CSS-var props, t() keys, and JSX attribute
// values — alone. The broader `jsx-only` mode drowns in prop/discriminant noise
// (size props, faction slugs, transform values) that can't be excluded cleanly,
// so text-only is what we enforce; a11y attribute copy (aria-label/placeholder)
// is extracted by hand. The `callees`/`words`/`jsx-attributes` lists below
// EXTEND the plugin defaults (which already exempt `t`/`i18next`, ALL-CAPS
// constants, and ASCII punctuation); replacing rather than extending them would
// turn every `t()` key and inline glyph into a false positive.
import fs from 'node:fs'
import tsParser from '@typescript-eslint/parser'
import i18next from 'eslint-plugin-i18next'
import sonarjs from 'eslint-plugin-sonarjs'

// Attribute names whose values are never user-facing copy. a11y attributes
// (aria-label, alt, title, placeholder) are deliberately absent — those ARE
// copy and must be extracted (ADR-0032).
const NON_COPY_ATTRIBUTES = [
  'className',
  'styleName',
  'style',
  'key',
  'id',
  'name',
  'type',
  'width',
  'height',
  'rel',
  'target',
  'src',
  'href',
  'to',
  'path',
  'method',
  'action',
  'autoComplete',
  'loading',
  'role',
  'data-\\w[\\w-]*',
]

// Callees whose string arguments are not copy. Keeps the plugin defaults
// (t / i18next / require / array + string predicates) and adds console output.
const NON_COPY_CALLEES = [
  'i18n(ext)?',
  't',
  'require',
  'addEventListener',
  'removeEventListener',
  'postMessage',
  'getElementById',
  'dispatch',
  'commit',
  'includes',
  'indexOf',
  'endsWith',
  'startsWith',
  'console\\.(log|warn|error|info|debug)',
]

// Literal values that are not copy. Keeps the plugin defaults (ASCII
// punctuation/symbols, ALL-CAPS tokens, HTML entities, emoji) and adds
// URLs/routes plus the non-ASCII typographic ornaments used as decorative
// separators (·, ›, —, ×, ⚜, ✦, →, ‹, and their HTML-entity spellings).
// NOTE: string entries are compiled by the plugin with `new RegExp(...)` (no
// `u` flag); patterns needing Unicode property escapes must be real RegExp
// objects carrying their own flags.
const NON_COPY_WORDS = [
  '[0-9!-/:-@[-`{-~]+',
  '[A-Z_-]+',
  '^/[\\w\\-./:?=&]*$',
  '^https?://.*$',
  // Decorative typographic glyphs / ornaments (not sentences) — separators,
  // faction ornaments, and window-chrome marks like "▭ ✕". ☾ ☽ join the set
  // with Coven's arched Points plate (#2019), where they are the finials either
  // side of the heading — the same role ✦ plays as its row bullet.
  /^[\s·•‹›«»“”‘’—–→←↑↓★☆✦✧✓✔✕✗×☾☽⚔⚜†◆◇▢▭■●○◦∞°▦¼½¾″′…]+$/u,
  // HTML-entity ornaments (&middot; &rsaquo; &rdquo; &#10007; &#x2694; …),
  // possibly a run of them (&#x2709;&#xFE0F; = 📧).
  /^(?:&(?:[a-zA-Z]+|#\d+|#x[0-9a-fA-F]+);)+$/,
  // Emoji glyphs are decorative, never localized (restores a plugin default).
  // Includes emoji, the VS16 variation selector (U+FE0F) and ZWJ (U+200D) so
  // multi-codepoint emoji like 📧 (&#x2709;&#xFE0F;) count as a single ornament.
  /^[\p{Emoji}‍️]+$/u,
]

// Lint guard for the type-scale/spacing token migration (issue #579): inline
// styles must reference the --text-*/--space-* CSS variable scales, never a
// raw pixel number. Catches both `fontSize: 7` and `fontSize: "9px"`, plus
// multi-value shorthand strings like `padding: "4px 12px 8px"`.
const STYLE_PROPS = new Set([
  'fontSize',
  'padding',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'margin',
  'marginTop',
  'marginRight',
  'marginBottom',
  'marginLeft',
  'gap',
  'rowGap',
  'columnGap',
])
// `rem`/`em` are the same violation wearing a different unit: `padding:
// '0.6rem 1.2rem'` is a raw value that left the scale, and a px-only pattern
// waved it through (#763, pattern 7). Note `calc(...)` still escapes this by
// construction — that is the separate concern §4a already names ("never
// compose with calc() to dodge the scale") and is not silently in scope here.
const RAW_LENGTH_COMPONENT = /^-?\d+(\.\d+)?(px|rem|em)$/

// A shorthand string is a violation if ANY of its components is a raw pixel
// value. Matching the WHOLE string against a px-only pattern (as this once did)
// meant a single bare `0` or `auto` disarmed the rule entirely, so
// `"0 0 14px"`, `"12px 0"` and `"0 auto 26px"` all passed silently — and a file
// carrying them could be delisted while still holding raw values (#750).
function hasRawPxComponent(value) {
  return value.trim().split(/\s+/).some((part) => RAW_LENGTH_COMPONENT.test(part))
}

// Pattern 6 (#763): an arbitrary Tailwind utility takes the value out of the
// inline style object entirely, so the Property visitor below never sees it.
// `mt-[6px]` and `padding: 6` are the same decision; only one was enforced.
//
// Deliberately limited to the SPACING utilities. Two exclusions, both from §4a:
//   - `w-`/`h-`/`top-`/`left-`/`inset-`/`max-w-` are ornament GEOMETRY, which
//     §4a explicitly leaves in raw pixels ("not covered by the rule").
//   - `text-[13px]` is NOT included; see the type-scale gap note by the rule.
const TAILWIND_SPACING_PREFIX =
  '(?:m|mt|mr|mb|ml|mx|my|p|pt|pr|pb|pl|px|py|gap|gap-x|gap-y|space-x|space-y)'
const ARBITRARY_SPACING_CLASS = new RegExp(
  `(?:^|\\s)-?${TAILWIND_SPACING_PREFIX}-\\[-?\\d+(?:\\.\\d+)?(?:px|rem|em)\\]`,
)

// Walk the shapes a className actually takes: a plain string, a template
// literal, and the ternaries/`&&` chains that wrap conditional classes. Missing
// these would reproduce the exact Literal-only blind spot that let patterns 1-3
// through (#770, #789).
function findRawSpacingClass(node) {
  if (!node) return false
  switch (node.type) {
    case 'Literal':
      return typeof node.value === 'string' && ARBITRARY_SPACING_CLASS.test(node.value)
    case 'TemplateLiteral':
      return node.quasis.some((quasi) => ARBITRARY_SPACING_CLASS.test(quasi.value.raw))
        || node.expressions.some(findRawSpacingClass)
    case 'ConditionalExpression':
      return findRawSpacingClass(node.consequent) || findRawSpacingClass(node.alternate)
    case 'LogicalExpression':
      return findRawSpacingClass(node.left) || findRawSpacingClass(node.right)
    case 'JSXExpressionContainer':
      return findRawSpacingClass(node.expression)
    case 'BinaryExpression':
      return findRawSpacingClass(node.left) || findRawSpacingClass(node.right)
    default:
      return false
  }
}

function isRawPxValue(node) {
  // `marginLeft: -3.5` is a UnaryExpression wrapping a Literal, not a Literal,
  // so a Literal-only check waved every negative through while catching the
  // identical positive (#1233) — the sixth laundering pattern past the five the
  // #763 audit named. Unwrap the sign and judge the operand: `-0` then reads as
  // `0` and stays exempt, and `-3.5` reports like `3.5`.
  if (node.type === 'UnaryExpression' && (node.operator === '-' || node.operator === '+')) {
    return isRawPxValue(node.argument)
  }
  // Zero is exempt: it is the absence of spacing, not a choice from the scale.
  // It is unit-less and theme-invariant, so it carries none of the drift the
  // token scale exists to prevent — and there is deliberately no --space-none
  // token to migrate the ~222 `padding: 0` sites onto (#750).
  if (node.type === 'Literal' && node.value === 0) return false
  // A ternary hides raw values from a Literal-only check: `fontSize: big ? 15 : 14`
  // read as clean and survived the whole #623 sweep. Recurse into both branches
  // so "the raw count reached zero" means what it says (#750).
  if (node.type === 'ConditionalExpression') {
    return isRawPxValue(node.consequent) || isRawPxValue(node.alternate)
  }
  // Same hole, different operator: `fontSize: kit.nameSize ?? 48` hid a raw
  // default behind ??/||, and adding a disable directive there reported as an
  // UNUSED directive — proof the rule never saw it at all (#750).
  if (node.type === 'LogicalExpression') {
    return isRawPxValue(node.left) || isRawPxValue(node.right)
  }
  if (node.type !== 'Literal') return false
  if (typeof node.value === 'number') return true
  if (typeof node.value === 'string') return hasRawPxComponent(node.value)
  return false
}

// ---------------------------------------------------------------------------
// The COLOUR arm (#1853). Everything above judges raw *numbers*; a colour is
// neither a bare number nor a spacing prop, so every colour literal reported
// clean — which is how #1851's pair of hand-rolled `rgba(0,0,0,0.15)` dropdown
// shadows survived a green lint run over both.
//
// This is a different failure from a raw `14` for font-size. The number is
// merely off-scale; the colour is off-THEME. A raw colour in a component has no
// `[data-theme="dark"]` counterpart and cannot get one without a `dark ? a : b`
// ternary, which the style system forbids outright — so every one of these is a
// surface that is either already wrong in dark mode or about to be.
//
// It ships as its OWN rule id rather than a third visitor on
// `no-raw-style-values`, for one mechanical reason: the ratchet below turns a
// whole RULE off per file. Sharing an id would mean every file on the colour
// legacy list silently lost its px enforcement too — un-ratcheting the arm that
// already reached zero. Two arms, two ids, two lists that shrink independently.
//
// Note there is no `.css` scoping to do: the rule is registered only on the
// `src/**/*.{ts,tsx}` block, and `index.css` is where colour VALUES belong.

// A raw colour literal in any notation: 3/4/6/8-digit hex, or a colour function
// whose first argument is a number. The `[\d.]` lookahead is load-bearing —
// `rgb(var(--rgb-accent) / 0.4)` composes a TOKEN and must stay silent, while
// `rgba(0,0,0,0.15)` and `hsl(210 40% 96%)` are the literals this rule exists
// for. Hex is bounded on the right by `\b` so `#a1b2c3d4e5` (an id, not a
// colour) does not match a prefix of itself.
const RAW_COLOUR_LITERAL =
  /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b|\b(?:rgba?|hsla?)\(\s*[\d.]/

// Props that carry paint. The explicit set is the list the #1853 ruling names,
// widened by the shorthands that are the same decision wearing a different key
// (`borderBottom: '1px solid rgba(...)'` is the commonest shape in this tree,
// and leaving it out would make renaming the prop a laundering route). The
// `/Color$/` test then covers the long tail for free — `borderTopColor`,
// `textDecorationColor`, `accentColor` — without an enumeration to maintain.
//
// Custom properties are included on purpose: an inline `'--x': 'rgba(...)'` is
// the same off-theme value with a token-shaped name. It costs nothing, because
// the report only fires when the VALUE holds a raw colour — `'--space-x': '4px'`
// never trips it.
const COLOUR_PROPS = new Set([
  'color',
  'background',
  'backgroundColor',
  'backgroundImage',
  'borderColor',
  'border',
  'borderTop',
  'borderRight',
  'borderBottom',
  'borderLeft',
  'boxShadow',
  'textShadow',
  'outline',
  'outlineColor',
  'fill',
  'stroke',
  'caretColor',
  // `filter` (#2139). Not paint's own property, but `drop-shadow()` is the one
  // filter function that takes a colour, and it was a laundering route out of
  // this arm: four sites reached it, two of them in files on no list at all
  // (`SnideProfileBody`'s credential frame, and the `shadow=` prop `TaskCrown`
  // applies as a filter). A cast shadow is the worst place for a frozen colour
  // — `--color-overlay-strong` at 0.25 is a correct DIM over #13121a and an
  // INVISIBLE shadow over it, which is why #2007 minted `--color-cast-shadow`
  // with a dark lift.
  //
  // ACCEPTED COST, so nobody argues it back out: the value carries GEOMETRY
  // (blur, offset) beside the paint, so the rule flags a string it can only
  // partly judge. That does not contradict this repo's three rulings that
  // geometry is not paint's business (group 2 kept blur and offset at the call
  // site; the print token keeps strength there; `shared.tsx`'s byline rule is a
  // percentage of `currentColor`) — those are about where a VALUE lives, and
  // this is about what a MATCHER reads. The rule reports the declaration; a
  // reviewer resolves which half is at fault.
  'filter',
])
const isColourProp = (name) =>
  COLOUR_PROPS.has(name) || /Color$/.test(name) || name.startsWith('--')

// Tailwind's stock palette in a class name — `text-red-600`, `border-red-300`.
// Same blind spot as `text-sm`: a value wearing a class name, and the Property
// visitor never sees it because it never enters a style object.
//
// The repo's OWN colour utilities are var()-backed by `tailwind.config.ts`
// (`text-ink`, `bg-surface`, `border-border`), so they are absent from the
// palette list below by construction and stay silent. Only the stock ramps —
// which read straight from Tailwind's own hexes, outside `index.css` and
// outside the dark cascade — are shades this rule reports.
const TAILWIND_COLOUR_PREFIX =
  '(?:bg|text|border|border-[trblxyse]|ring|ring-offset|outline|divide|divide-[xy]|from|via|to|fill|stroke|caret|accent|decoration|placeholder|shadow)'
const TAILWIND_PALETTE =
  '(?:slate|gray|grey|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)'
const TAILWIND_COLOUR_CLASS = new RegExp(
  `(?:^|\\s)(?:[a-z-]+:)*${TAILWIND_COLOUR_PREFIX}-${TAILWIND_PALETTE}-\\d{2,3}\\b`,
)

// The same shapes `findRawSpacingClass` walks, generalised over a predicate:
// a plain string, a template literal, and the ternaries / `??` / `||` chains
// that wrap conditional values. Skipping these would reproduce the exact
// Literal-only blind spot that let patterns 1-3 past the px arm (#770, #789) —
// `background: warn ? 'rgba(234,179,8,0.08)' : 'transparent'` is a live shape in
// this tree, not a hypothetical.
function someStringIn(node, test) {
  if (!node) return false
  switch (node.type) {
    case 'Literal':
      return typeof node.value === 'string' && test(node.value)
    case 'TemplateLiteral':
      return node.quasis.some((quasi) => test(quasi.value.raw))
        || node.expressions.some((expression) => someStringIn(expression, test))
    case 'ConditionalExpression':
      return someStringIn(node.consequent, test) || someStringIn(node.alternate, test)
    case 'LogicalExpression':
    case 'BinaryExpression':
      return someStringIn(node.left, test) || someStringIn(node.right, test)
    case 'JSXExpressionContainer':
      return someStringIn(node.expression, test)
    default:
      return false
  }
}

/** The property name as written, for `color:` and for `'--fc-bg':` alike. */
function propertyName(node) {
  if (node.key.type === 'Identifier') return node.computed ? null : node.key.name
  if (node.key.type === 'Literal' && typeof node.key.value === 'string') return node.key.value
  return null
}

// KNOWN GAPS — documented on purpose (#763 ask 4). A documented gap beats a
// silent one: the #750 audit's real finding was not that values escaped, but
// that they escaped while the ratchet reported CLEAN.
//
// Gap A — `text-sm` / `text-xs` on prose (pattern 5). NOT enforceable here.
//   The rule would have to know whether a given element is prose or chrome, and
//   a className carries no role signal to read. `text-sm` is correct on a
//   timestamp and wrong on a paragraph, and nothing in the AST distinguishes
//   them. An audit of all 46 remaining usages (#763) found every one to be
//   legitimate Label tier, so there is no live defect behind this gap today —
//   but it will not stay that way on its own, and only review catches it.
//   Note the trap: a naive `grep text-sm` also matches the CSS variable
//   `--text-sm`, which inflates the count roughly 5x.
//
// Gap B — `text-[13px]` (arbitrary Tailwind type). Deliberately NOT flagged.
//   4a: "Ornament type keeps its raw value even when the number happens to sit
//   on a rung", because a --text-* token names a TIER, not merely a number.
//   Flagging these mechanically would push ornament type onto a tier it was
//   never part of — the exact coupling 4a forbids. The 9 current uses live in
//   faction skins where that judgement needs eyes, not a regex.
//
// Gap C — `calc()`. `calc(3.5rem + env(safe-area-inset-bottom))` passes, since
//   the component split never sees a bare length. 4a already names this
//   ("never compose with calc() to dodge the scale"); it is a review rule.
//
// Gap D — a MINUS SIGN the AST cannot resolve. The `UnaryExpression` unwrap
//   above (#1233) closes `marginLeft: -3.5` — but only where the operand is a
//   literal to judge. Two shapes remain, and both are the sign meeting an
//   indirection rather than a new hole in the negative case:
//     - `marginLeft: -bleed` (EphemeristsTaskCard) negates an Identifier whose
//       number lives in a `SizeSet` table. Reading it needs flow analysis this
//       rule deliberately does not do — the same "laundered through a data
//       structure" shape the #763 audit named for positives.
//     - ``margin: `0 calc(-1 * ${padX})` `` builds the sign inside a template
//       literal, where it is already Gap C wearing a minus.
//   Every current use is legitimate (declared ornament geometry; a negated
//   `--space-*` token) — but that is a fact about today's tree, not a guarantee
//   the rule enforces, and only review holds it.
//
// Gap E — a real token used at the WRONG TIER. This is the gap the colour arm
//   (#1853) does NOT close, and it is worth stating plainly because the arm
//   landing makes it easy to assume otherwise.
//   `no-raw-colour-values` catches raw colour LITERALS. It does not catch
//   `var(--color-text-tertiary)` on a faction-dispatched surface: that name is
//   declared in `index.css`, reads as correctly tokenized to every check we run,
//   and is still wrong, because a faction surface must read its own
//   `--faction-*` family and not the global one (#1819). Nothing in an AST
//   distinguishes "token" from "token that belongs to a different surface" —
//   that needs a rule that knows which files are faction-dispatched, with its
//   own list. It is a separate rule and a separate PR.
//   Two smaller things the colour arm also leaves alone, on purpose:
//     - CSS colour KEYWORDS (`white`, `black`, `red`) and the unshaded Tailwind
//       utilities that spell them (`bg-white`, `text-black`). Same disease, much
//       larger and more arguable set; #1853 scoped the arm to literals + shaded
//       ramps and that is where it stops.
//     - A colour laundered through a data structure — a `SizeSet`-style table of
//       hexes read by an Identifier — which is Gap D's shape wearing paint.
//   #1819 closes Gap E for the TEXT family; see the tier arm below.

// ---------------------------------------------------------------------------
// The TIER arm (#1819). Gap E, closed for `--color-text-*`.
//
// `no-raw-colour-values` above judges whether a value is a token. This one
// judges whether it is the RIGHT token for the surface it is written on, which
// is a question no colour-literal rule can ask: `var(--color-text-tertiary)`
// is declared in `index.css`, reads as correctly tokenized to every other check
// we run, and is still wrong inside a faction archetype.
//
// Wrong because it is UNREACHABLE. The label tiers paint `var(--label-ink)`,
// a seam a faction frame repoints once on its own root — and a component that
// restates the global neutral inline paints over that seam for every faction at
// once. The measurement is the point: the neutral is 2.19:1 on the S.N.I.D.E.
// sheet, 2.27:1 on Singularity and 2.01:1 on the Ephemerists plate in light,
// and those three sheets are near-black in BOTH themes, so no global light
// value can serve them. The faction has an answer (`--faction-{key}-card-muted`,
// 4.70:1 at worst) and the inline restatement is what stops it being applied.
//
// Its own rule id and its own list, for the reason the colour arm gives: the
// ratchet turns a whole RULE off per file, so sharing an id would silently
// un-ratchet an arm that had already reached zero.
//
// HOW THE PATH LIST WAS DERIVED, since a global ban would be wrong — the
// neutral tokens are correct on neutral chrome, and most of this app is neutral
// chrome. The repo already names its faction-dispatched surfaces in the
// filesystem: `factions/manifest.ts` lazy-loads one module per faction out of a
// directory called `archetypes/` (desktop) or `mobileArchetypes/` (the separate
// mobile files #494 split out), and `components/factionMarks/` holds the
// per-faction ornaments those archetypes mount. Every file under those three
// names today is either a faction-named archetype (including `Default*`, which
// is `na`/Unaffiliated's own identity per ADR-0030 — not an escape hatch) or a
// helper shared BY archetypes and mounted on nothing else (`controls.tsx`,
// `shared.tsx`, `profileSkin.tsx`, `bodyEditorTheme.ts`). So the directory NAME
// is the dispatch signal, and a glob on it stays right for archetype dirs that
// do not exist yet.
//
// Deliberately NOT scoped by "calls `factionCssVar`" — 60+ files do, including
// neutral chrome like `Sidebar.tsx` and `ConfirmDialog.tsx` that reach for one
// faction accent and are otherwise correctly neutral. That scope would ban the
// right token on the surfaces it is right for.
//
// KNOWN GAP (this arm's own). A faction-dressed surface OUTSIDE those three
// directory names is not covered — `editPraxis/waiting/PraxisWaitingSurface.tsx`
// takes a `dress` and lives in `waiting/`, and the praxis card's desktop skins
// live under `components/praxisCard/desktop/`. Widening by hand-listing those
// would make the scope a maintained enumeration rather than a convention, which
// is the thing that rots. Naming a directory `archetypes/` is the cheap fix
// when one of them next moves.
const FACTION_DISPATCHED_PATHS = [
  'src/**/archetypes/**/*.{ts,tsx}',
  'src/**/mobileArchetypes/**/*.{ts,tsx}',
  'src/components/factionMarks/**/*.{ts,tsx}',
]

// Any reference to the global text family, in any string that reaches CSS —
// a `color:` value, a `border: 1px solid var(...)` shorthand, or a module
// constant read by one. Matching the STRING rather than a property name is what
// catches the laundering shape the px arm learned about the hard way: a
// `const FAINT = 'var(--color-text-tertiary)'` at the top of a skin is the same
// decision as writing it at the call site, and a prop-name visitor never sees
// it.
const GLOBAL_TEXT_TOKEN = /var\(\s*--color-text-[\w-]*/

/**
 * Is this node the FALLBACK half of a `??` / `||`?
 *
 * `inkColor ?? 'var(--color-text-tertiary)'` is not the defect: it applies only
 * when the skin supplied no ink of its own, which IS the legitimate neutral
 * default, and it is the shape the #1819 ruling explicitly preserved. The
 * defect is the unconditional restatement, which no frame can reach past.
 *
 * A deliberate exemption, not a legacy entry — nothing here is ever going to
 * migrate, so a shrinking list would be lying about it.
 */
function isFallbackOperand(ancestors, node) {
  let child = node
  for (let i = ancestors.length - 1; i >= 0; i -= 1) {
    const parent = ancestors[i]
    if (parent.type === 'LogicalExpression') {
      if ((parent.operator === '??' || parent.operator === '||') && parent.right === child) {
        return true
      }
      return false
    }
    // Keep climbing through the wrappers a fallback is written inside —
    // `dress.quietStyle ?? { color: '…' }` puts the literal two levels down.
    if (parent.type !== 'ObjectExpression' && parent.type !== 'Property') return false
    child = parent
  }
  return false
}

// ---------------------------------------------------------------------------
// The POLARITY arm (#2077). Gap E's inverse.
//
// The tier arm above bans a GLOBAL ink on a FACTION sheet. This one bans a
// FACTION hue as ink anywhere, and the two are not each other's mirror in scope:
// the tier arm needs a path list because the neutral tiers are *correct* on
// neutral chrome, whereas a bare spine hue is a FILL on every surface in the app
// (WORLD_ZERO_STYLE §3, #1932) and there is no ground where it becomes an ink.
// So this arm has no glob at all, which is also why widening the tier arm to
// cover `components/factionCard/` and `pages/` — the shape #2077 was filed
// asking for — is the wrong lever twice over. It cannot see a `--faction-*`
// token, and on those two paths it would ban `var(--color-text-primary)`, the
// token the fix REACHES FOR. #1932 recorded that ruling for `pages/players/`
// already: "widening the glob would ban the global tiers on the surface they are
// right for".
//
// THE MEASUREMENT, so nobody has to re-derive it. On the app's own page ground in
// LIGHT, the bare hue as text reads 2.19:1 (ephemerists), 2.47 (snide), 2.87
// (coven) and 4.46 (ua); on the faction wash those hues are laid down as, six of
// eight are under AA, worst 2.04:1. Every hue clears in DARK, 4.87 to 15.35 —
// the cascade tell #1932 names: when a defect sorts perfectly by cascade it is
// one bug, and the bug is that the light half of the pair was only ever a fill.
// Which faction is worst MOVES (#2068 traded WOW's gold for a plum and handed the
// Ephemerists the brass, so WOW went 1.96 -> 5.80 and the slot changed hands), so
// this rule is about the ROLE and never about a hue.
//
// The BARE hue only. `--faction-wow-card-text` is a different claim entirely — an
// ink measured against a named ground, gated by `CARD_PAIRS` since #651 — and a
// pattern that swept the whole prefix would report a measured pairing as a defect
// and teach the next editor to strip it. `[a-z]+` stops at the first hyphen,
// which is exactly the line between "this hue" and "this hue's ink for a ground".
const BARE_FACTION_HUE = /var\(\s*--faction-[a-z]+\s*\)/

/**
 * Properties that end up as an ink.
 *
 * `--gem-ink` is here for the reason `playersFactionInk.test.tsx` gives: it IS
 * `.level-gem-number`'s `color`, one indirection away in `index.css`, and the
 * indirection is what hid #1932 from a reader scanning for inks. The three seam
 * variables are here because repointing a seam is the sanctioned move and
 * pointing one at a BARE hue is the defect wearing the fix's clothes.
 *
 * `actor` is `FeedRowInk`'s field (#2108) and is here for exactly the `--gem-ink`
 * reason: it IS the actor name's `color`, one MODULE away in `FeedRowContent`.
 * That distance is what let the bare hue survive #2077's sweep at the one site
 * the report never reached.
 *
 * ponytail: this closes the class by NAMING the far end, not by following the
 * value. The general form the #2108 ruling asks for — flag `factionCssVar(slug)`
 * called with no shape argument, wherever it lands — was measured before being
 * skipped: it reports 28 files, and all but this one are CORRECT fills
 * (gradients, rings, gem glows, tints, colour bars). Seeding a shrink-only list
 * of 28 correct files is debt-shaped noise, and two of those files are being
 * deleted in the same wave, so the list would be stale before it merged. The
 * upgrade path is type information — a bare hue reaching a field whose TYPE is
 * an ink bag — which needs `@typescript-eslint`'s type-aware pass and a decision
 * about running it in CI. Until then, a new ink field adds its name here.
 */
const INK_PROPS = new Set([
  'color',
  'caretColor',
  'textDecorationColor',
  'WebkitTextFillColor',
  '-webkit-text-fill-color',
  'actor',
  '--gem-ink',
  '--label-ink',
  '--link-ink',
  '--link-ink-hover',
])

/**
 * Is this expression the bare spine hue, however it is spelled?
 *
 * Two spellings, because the repo has two. `var(--faction-coven)` as a string is
 * the one a `var()`-matching rule sees; `factionCssVar(slug)` with a single
 * argument is the one that actually appears at eleven of the twelve #2077 sites,
 * and it is a CallExpression, so the tier arm's string-matching approach is
 * blind to it. A second argument names a SHAPE (`'light'`, `'card-text'`,
 * `'border'`) and is the measured-pairing case above, so arity is the test.
 */
function isBareFactionHue(node, sourceCode) {
  if (!node) return false
  switch (node.type) {
    case 'Literal':
      return typeof node.value === 'string' && BARE_FACTION_HUE.test(node.value)
    case 'TemplateLiteral':
      return node.quasis.some((quasi) => BARE_FACTION_HUE.test(quasi.value.raw))
    case 'CallExpression':
      return (
        node.callee.type === 'Identifier'
        && node.callee.name === 'factionCssVar'
        && node.arguments.length === 1
      )
    // `hue ? factionCssVar(slug) : X` and `ink ?? factionCssVar(slug)`. NOT
    // exempting the `??` fallback, unlike the tier arm: there a fallback is the
    // legitimate neutral default, and here it is `feedRowSkin`'s shape — a
    // documented default that every chassis overrides and that fails on the one
    // ground nobody passed an ink for.
    case 'ConditionalExpression':
      return (
        isBareFactionHue(node.consequent, sourceCode)
        || isBareFactionHue(node.alternate, sourceCode)
      )
    case 'LogicalExpression':
      return (
        isBareFactionHue(node.left, sourceCode) || isBareFactionHue(node.right, sourceCode)
      )
    case 'JSXExpressionContainer':
      return isBareFactionHue(node.expression, sourceCode)
    // `const accent = factionCssVar(slug)` then `color: accent` — the laundering
    // route, and the one this rule would be worth little without: five of the six
    // sites it reports outside #2077's own list are written this way, and so is
    // the `--gem-ink` shape #1932 called out by name. Resolved in-module only; a
    // value arriving as a PROP or from another file is the standing gap below.
    case 'Identifier': {
      const variable = sourceCode.getScope(node).references.find(
        (reference) => reference.identifier === node,
      )?.resolved
      if (!variable || variable.defs.length !== 1) return false
      const [def] = variable.defs
      if (def.type !== 'Variable' || def.parent?.kind !== 'const') return false
      return isBareFactionHue(def.node.init, sourceCode)
    }
    default:
      return false
  }
}

// The MOTION arm (#2104). Not an off-scale value like the px arm's, nor an
// off-theme one like the colour arm's: this is an ACCESSIBILITY escape.
// `@media (prefers-reduced-motion: no-preference)` is a property of a
// STYLESHEET, and a style attribute is not in one — so an inline `animation:`
// names a keyframe from the one place the gate provably cannot reach, and runs
// forever for a reader who asked for no motion. #911 consolidated four blink
// keyframes into `wz-blink` so the gate could be enforced in one place;
// `ActivityTicker.tsx` reached that keyframe from outside the structure and got
// the keyframe without the guard. Same class as the `<style>` injection
// `__tests__/noInjectedStylesheets.test.ts` already forbids, one property down.
//
// Only the two properties that NAME a keyframe. `animationDelay` /
// `animationDuration` are inert on their own — nothing animates until a gated
// class supplies `animation-name` — and a per-element beat is the one thing
// that legitimately varies per instance, which is why `LevelUpPopup`'s
// confetti, `praxisCard/shared.tsx`'s sparks and `EverymenTaskCard`'s arcs all
// write it inline. `transition` is deliberately absent: it runs once, bounded,
// on a state change the reader caused, names no keyframe and so pins nothing to
// the critical path — and ~70 of them here ease a colour. That would be a
// different change with a different argument.
//
// Its OWN rule id, for the mechanical reason spelled out above the colour arm:
// the ratchet turns a whole RULE off per file, so sharing an id would let a
// legacy list silently un-ratchet this one.
const INLINE_MOTION_PROPS = new Set(['animation', 'animationName'])

const noRawStyleValues = {
  rules: {
    'no-raw-style-values': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Disallow raw pixel numbers for fontSize/padding/margin/gap — use the --text-*/--space-* token scales (WORLD_ZERO_STYLE.md).',
        },
        schema: [],
      },
      create(context) {
        return {
          Property(node) {
            if (node.key.type !== 'Identifier' || !STYLE_PROPS.has(node.key.name)) return
            if (isRawPxValue(node.value)) {
              context.report({
                node,
                message: `Raw pixel value for "${node.key.name}" — use a --text-*/--space-* token instead of a hardcoded number.`,
              })
            }
          },
          JSXAttribute(node) {
            if (node.name.type !== 'JSXIdentifier' || node.name.name !== 'className') return
            if (findRawSpacingClass(node.value)) {
              context.report({
                node,
                message:
                  'Arbitrary Tailwind spacing utility (e.g. `mt-[6px]`) — use a scale class such as `mt-2`. The value is raw spacing wearing a class name.',
              })
            }
          },
        }
      },
    },
    // The motion arm (#2104). See INLINE_MOTION_PROPS above for what it reads
    // and, just as deliberately, what it does not.
    'no-inline-animation': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Disallow inline `animation` / `animationName` — a style attribute cannot be wrapped in @media (prefers-reduced-motion: no-preference), so the motion escapes the gate (#911, #2104).',
        },
        schema: [],
      },
      create(context) {
        return {
          Property(node) {
            const name = propertyName(node)
            if (!name || !INLINE_MOTION_PROPS.has(name)) return
            context.report({
              node,
              message: `Inline "${name}" names a keyframe where @media (prefers-reduced-motion: no-preference) cannot reach it, so it runs for readers who asked for no motion. Move it to a class inside that gate in index.css — or motion.ornament.css if the motion is ornament — and leave only the per-element animationDelay inline.`,
            })
          },
        }
      },
    },
    // The colour arm (#1853). See the constants and Gap E above for why it is a
    // separate id rather than a third visitor on the rule above.
    'no-raw-colour-values': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Disallow raw colour literals (hex, rgb/rgba/hsl/hsla) and stock Tailwind colour utilities — use a --color-*/--faction-* token from index.css (WORLD_ZERO_STYLE.md). THIS RULE\'S REPORT IS A FLOOR, NOT THE CLASS (#2139): any "N files remaining" figure computed from .eslint-legacy-raw-colours.txt inherits that error silently, because a shape the rule cannot see can never appear on a list seeded from the rule\'s own report. Known blind spots: a module constant read as an Identifier, and a component\'s own colour-named prop.',
        },
        schema: [],
      },
      create(context) {
        return {
          Property(node) {
            const name = propertyName(node)
            if (!name || !isColourProp(name)) return
            if (someStringIn(node.value, (value) => RAW_COLOUR_LITERAL.test(value))) {
              context.report({
                node,
                message: `Raw colour literal for "${name}" — use a --color-*/--faction-* token from index.css. A hardcoded colour has no [data-theme="dark"] counterpart.`,
              })
            }
          },
          JSXAttribute(node) {
            if (node.name.type !== 'JSXIdentifier' || node.name.name !== 'className') return
            const test = (value) =>
              TAILWIND_COLOUR_CLASS.test(value) || RAW_COLOUR_LITERAL.test(value)
            if (someStringIn(node.value, test)) {
              context.report({
                node,
                message:
                  'Stock Tailwind colour utility or arbitrary colour in className (e.g. `text-red-600`, `bg-[#fff]`) — use a token-backed utility (`text-ink`, `bg-surface`) or a --color-* var. The value is a raw colour wearing a class name.',
              })
            }
          },
        }
      },
    },
    // The tier arm (#1819). See the header block above for the path derivation
    // and for why this is a third id rather than a visitor on the colour arm.
    'no-global-ink-on-faction-surface': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Disallow the global --color-text-* family inside faction-dispatched surfaces — they read --label-ink or the matching factionCssVar (WORLD_ZERO_STYLE.md).',
        },
        schema: [],
      },
      create(context) {
        const message =
          'Global `--color-text-*` on a faction-dispatched surface — read `var(--label-ink)` (the label seam a frame repoints on its own root) or the matching `factionCssVar(slug, …)`. The neutral is a real token at the wrong TIER: it paints over the seam, and it measures 2.19:1 on S.N.I.D.E., 2.27:1 on Singularity and 2.01:1 on the Ephemerists plate in light.'
        const report = (node) => {
          if (isFallbackOperand(context.sourceCode.getAncestors(node), node)) return
          context.report({ node, message })
        }
        return {
          Literal(node) {
            if (typeof node.value !== 'string') return
            if (GLOBAL_TEXT_TOKEN.test(node.value)) report(node)
          },
          // `` `1px solid var(--color-text-tertiary)` `` — the quasis are where
          // the value lives, and a Literal-only visitor is blind to all of them.
          TemplateLiteral(node) {
            if (node.quasis.some((quasi) => GLOBAL_TEXT_TOKEN.test(quasi.value.raw))) report(node)
          },
        }
      },
    },
    // The polarity arm (#2077). See the constants above for the scope argument
    // and for why this is a fourth id rather than a widened glob on the arm
    // above. Own id, own list, for the reason the other two arms give: the
    // ratchet turns a whole RULE off per file.
    'no-faction-hue-as-ink': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Disallow the bare faction spine hue in an ink role — a faction hue is a FILL, not an ink (WORLD_ZERO_STYLE.md §3).',
        },
        schema: [],
      },
      create(context) {
        return {
          Property(node) {
            const name = propertyName(node)
            if (!name || !INK_PROPS.has(name)) return
            if (!isBareFactionHue(node.value, context.sourceCode)) return
            context.report({
              node,
              message:
                `Bare faction spine hue in "${name}" — a faction hue is a FILL, not an ink `
                + '(WORLD_ZERO_STYLE.md §3, #1932). Keep the hue on the fill, wash, rule, ring '
                + 'or glow beside this, and give the type a text tier: a neutral '
                + '`--color-text-*` on neutral chrome, or the surface\'s own measured '
                + '`factionCssVar(slug, "card-text" | "card-muted")` / `var(--label-ink)` on a '
                + 'faction sheet. Measured on the app\'s page in LIGHT the bare hue is 2.19:1 '
                + '(ephemerists), 2.47 (snide), 2.87 (coven), 4.46 (ua) — and every hue clears '
                + 'in dark, so this is invisible in a dark-only check.',
            })
          },
        }
      },
    },
  },
}

// Files not yet migrated onto the token scale (issue #579). This list only
// ever shrinks — migrating a file means deleting its line here, not adding
// one. New files may never be added to it.
const LEGACY_RAW_STYLE_FILES = fs
  .readFileSync(new URL('./.eslint-legacy-raw-styles.txt', import.meta.url), 'utf8')
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)

// Files not yet migrated off raw colour (issue #1853). This list only
// ever shrinks — migrating a file means deleting its line here, not adding
// one. New files may never be added to it. #1609 burns it down.
const LEGACY_RAW_COLOUR_FILES = fs
  .readFileSync(new URL('./.eslint-legacy-raw-colours.txt', import.meta.url), 'utf8')
  .split('\n')
  .map((line) => line.split('#')[0].trim())
  .filter(Boolean)

// Faction surfaces not yet migrated off the global ink family (issue #1819).
// This list only ever shrinks — migrating a file means deleting its line here,
// not adding one. New files may never be added to it.
const LEGACY_FACTION_INK_FILES = fs
  .readFileSync(new URL('./.eslint-legacy-faction-ink.txt', import.meta.url), 'utf8')
  .split('\n')
  .map((line) => line.split('#')[0].trim())
  .filter(Boolean)

/**
 * #1400: axios is gone. An import of it would install a SECOND transport that
 * misses everything `api/client.ts` carries — the JWT cookie, the 401→landing
 * rule, the array-param serialization FastAPI actually reads — and every one of
 * those failures is a 200 with the wrong answer rather than a crash. Cheaper as
 * a lint line than as a bug report.
 */
const NO_AXIOS_IMPORT = [
  'error',
  {
    paths: [
      {
        name: 'axios',
        message:
          'axios was retired in #1400 — issue requests through api/client.ts (apiGet/apiPost/...).',
      },
    ],
  },
]

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'playwright-report/**', 'test-results/**'],
  },
  /**
   * The axios ban reaches past `src/`, because the one hidden axios dependent
   * this migration turned up was OUTSIDE it: `.ds-kit/provider.tsx` faked
   * `GET /auth/me` by swapping `api.defaults.adapter`, and nothing but
   * `typecheck:design-sync` ever looked at it — `npm run lint` was `eslint src`.
   *
   * These directories get the import ban and nothing else. Widening the whole
   * rule set to them would surface a backlog that has nothing to do with #1400,
   * so this block is deliberately one rule wide.
   */
  {
    files: ['.ds-kit/**/*.{ts,tsx}', 'e2e/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      'no-restricted-imports': NO_AXIOS_IMPORT,
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: { i18next, local: noRawStyleValues, sonarjs },
    rules: {
      'i18next/no-literal-string': [
        'error',
        {
          mode: 'jsx-text-only',
          // <text> is SVG illustration lettering (decorative pseudo-thumbnail
          // art), never localized UI copy. Trans is the plugin default.
          'jsx-components': { exclude: ['Trans', 'text'] },
          'jsx-attributes': { exclude: NON_COPY_ATTRIBUTES },
          callees: { exclude: NON_COPY_CALLEES },
          words: { exclude: NON_COPY_WORDS },
        },
      ],
      'local/no-raw-style-values': 'error',
      'local/no-raw-colour-values': 'error',
      // The motion arm needs no path glob and gets no legacy list: it reported
      // exactly two sites when it was written, both in ActivityTicker.tsx, and
      // #2104 fixed both in the same change (#2104).
      'local/no-inline-animation': 'error',
      // The polarity arm needs no path glob — a bare spine hue is never an ink
      // on any surface — so unlike the tier arm it registers here (#2077).
      'local/no-faction-hue-as-ink': 'error',
      'sonarjs/no-identical-functions': 'error',
      'no-restricted-imports': NO_AXIOS_IMPORT,
    },
  },
  // Ratchet: existing violations are grandfathered until migrated. Spread
  // conditionally — ESLint rejects `files: []` outright ("Expected value to be
  // a non-empty array"), so an empty list crashed the whole lint run. That made
  // FINISHING the migration the one thing that broke the build (#750). The list
  // is empty now; this guard is what lets it stay that way.
  ...(LEGACY_RAW_STYLE_FILES.length > 0
    ? [
        {
          files: LEGACY_RAW_STYLE_FILES,
          rules: {
            'local/no-raw-style-values': 'off',
          },
        },
      ]
    : []),
  {
    /**
     * Colour-MATH helpers parse and compose colour by definition (#1853). A
     * contrast ratio cannot be computed from `var(--color-text-primary)`; these
     * modules exist precisely to turn a literal into a number, so a rule that
     * bans literals has nothing true to say about them. This is a deliberate
     * exemption, NOT a legacy entry: nothing here is ever going to migrate, so
     * putting it on the shrinking list would make the list dishonest.
     *
     * It reports zero today — `contrast.ts` names its hexes in prose and its
     * notations in regexes, and the rule reads neither. So this block is
     * prospective: it protects the module's PURPOSE, so that the first hand-fed
     * `parse('#1c1c1a')` in a test-bed or a triage helper is not a build break.
     */
    files: ['src/utils/contrast.ts'],
    rules: {
      'local/no-raw-colour-values': 'off',
    },
  },
  {
    /**
     * Tests assert ON colour: a contrast guard names the hex it measured, and a
     * fixture for this very rule must contain the literals it forbids. Same
     * reasoning as the `i18next/no-literal-string` exemption below.
     */
    files: ['src/**/*.test.{ts,tsx}', 'src/**/__tests__/**'],
    rules: {
      'local/no-raw-colour-values': 'off',
    },
  },
  // Same ratchet, same empty-list guard (#750): ESLint rejects `files: []`
  // outright, so finishing the migration must not be the thing that breaks the
  // build. #1609 burns this list down; when it empties, this spread vanishes
  // and the rule keeps standing.
  ...(LEGACY_RAW_COLOUR_FILES.length > 0
    ? [
        {
          files: LEGACY_RAW_COLOUR_FILES,
          rules: {
            'local/no-raw-colour-values': 'off',
          },
        },
      ]
    : []),
  {
    // The tier arm is the one rule in this file that is scoped by PATH rather
    // than switched off by one, so it is registered here instead of in the
    // `src/**` block above. Its plugin registration rides on that block, which
    // is why this one carries only the rule line.
    files: FACTION_DISPATCHED_PATHS,
    rules: {
      'local/no-global-ink-on-faction-surface': 'error',
    },
  },
  {
    /**
     * THE TWO ARCHETYPES WHOSE GROUND IS THE APP'S OWN PAGE (#2346, #2537).
     *
     * A deliberate exemption and NOT a legacy entry — nothing here is going to
     * migrate, so a shrinking list would be lying about it.
     *
     * The tier arm bans the global `--color-text-*` family on a faction sheet,
     * and its message gives the measurements that justify it: 2.19:1 on
     * S.N.I.D.E., 2.27 on Singularity, 2.01 on the Ephemerists plate. Every one
     * of those is a FACTION SHEET. `DefaultCreateCharacter` is the `na`
     * archetype of a page that HAS no sheet: unlike `DefaultEditPraxis`, which
     * draws on `--faction-default-card-bg`, character creation is bare app page,
     * so what is behind its type is `--color-bg-page` with the `.na-backdrop`
     * watercolour over it.
     *
     * Measured on that composite in light, the swap the rule would force is the
     * REGRESSION and the neutral is the passing value:
     *
     *     --color-text-secondary            6.06   (--faction-default-card-muted 4.36)
     *     --color-text-tertiary             6.10   (--faction-default-card-muted 4.36)
     *
     * The second row used to cite `--faction-default-composer-faint` at 3.50.
     * That token is the COMPOSER's and no file here reads it; #2485 lifted it to
     * clear the aurora-washed sheet it is actually drawn on, where the whole na
     * quiet ladder was under AA, and on THIS ground it now reads 4.79. Both
     * neutrals are therefore paired against `-card-muted`, which is the rung this
     * archetype would really be forced onto and which still misses.
     *
     * #1932 already recorded this ruling for `pages/players/`: widening the glob
     * "would ban the global tiers on the surface they are right for". This is
     * that case reached from the other direction — the glob is a convention over
     * directory names, and one na archetype landed inside it.
     *
     * THE EXEMPTION IS PAIRED, the way `roomPresence.ts`'s is. Its other half is
     * `src/pages/characterPaths/__tests__/createCharacterContrast.test.ts`, which
     * resolves these inks over the washed page ground in both themes. Do not
     * delete that file while this entry exists: "the rule cannot judge this node"
     * is never "this node needs no judging", and between them they are the whole
     * guard.
     *
     * #2537 ADDED THE SECOND FILE AND SHRANK THE LEGACY LIST BY ONE.
     * `DefaultEditCharacter` is the same page family — create and edit are one
     * character, one faction, one form, and the edit half drew on this ground
     * from `mobileArchetypes/` where it sat on `.eslint-legacy-faction-ink.txt`
     * with eleven un-argued hits. Folding it into one responsive archetype moved
     * it under `archetypes/`, so it needed an answer rather than a grandfather
     * clause: it reads the SAME three neutrals on the SAME washed page ground,
     * which the paired test above already resolves. A measured exemption for a
     * measured file, and one fewer line on a ratchet that only shrinks.
     */
    files: [
      'src/pages/characterPaths/archetypes/DefaultCreateCharacter.tsx',
      'src/pages/characterPaths/archetypes/DefaultEditCharacter.tsx',
    ],
    rules: {
      'local/no-global-ink-on-faction-surface': 'off',
    },
  },
  {
    /**
     * Tests assert ON the token they are guarding — `factionContrast.test.ts`
     * resolves `--color-text-tertiary` by name to prove `--label-ink` is unset
     * to it, and a fixture for this very rule must contain what it forbids.
     * A deliberate exemption, as the colour arm's twin above is.
     *
     * It must come AFTER the block above: later blocks win in flat config, and
     * `src/**\/archetypes/__tests__/**` matches both.
     */
    files: ['src/**/*.test.{ts,tsx}', 'src/**/__tests__/**'],
    rules: {
      'local/no-global-ink-on-faction-surface': 'off',
    },
  },
  // Same ratchet, same empty-list guard (#750). Seeded from what the rule
  // actually reported on the day it landed; it only ever shrinks.
  ...(LEGACY_FACTION_INK_FILES.length > 0
    ? [
        {
          files: LEGACY_FACTION_INK_FILES,
          rules: {
            'local/no-global-ink-on-faction-surface': 'off',
          },
        },
      ]
    : []),
  {
    /**
     * NOT A CSS DECLARATION (#2077). `PaintedPresenceUser.color` is a field in
     * the awareness payload y-codemirror reads to draw a collaborator's caret
     * and selection tint — the library names the field `color`, and this rule
     * matches a property NAME because that is the only signal an inline style
     * object carries. A caret is a MARK, not type. Nothing here is text.
     *
     * A deliberate exemption and NOT a legacy entry, for the reason the tier
     * arm's `??` note gives: this will never migrate, so a shrinking list would
     * be lying about it.
     *
     * WHAT TURNING THE RULE OFF HERE DOES NOT BUY (#2267). This comment used to
     * end by calling the file "a module whose PURPOSE is the thing the rule
     * forbids", and that framing shipped a bug: it reads as though carrying a
     * per-person hue also licenses NOT MEASURING it. The value is still
     * painted, one library hop later, and it went out as the bare spine hue at
     * 1.86:1 on a ground it owed 3:1.
     *
     * The exemption is not what failed, and narrowing it would not have helped:
     * the hue is the REMOTE's and the ground is the VIEWER's composer field, so
     * the pairing is a runtime cross-product of 8 grounds x 8 hues x 2 themes.
     * NO rule that reads property names off a source file can measure that —
     * there is no ground in the AST to measure against. Exempt or not, this
     * class of defect was always going to need a value test.
     *
     * So the exemption stays and it is PAIRED. Its other half is
     * `src/pages/editPraxis/__tests__/roomPresenceContrast.test.ts`, which
     * resolves what `paintUser` hands the library against every composer ground
     * in both themes. Do not delete that file while this entry exists — between
     * them they are the whole guard, and either alone is the state that shipped
     * #2267. The same reading applies to `contrast.ts`'s exemption from the
     * colour arm: "the rule cannot judge this node" is never "this node needs
     * no judging".
     */
    files: ['src/pages/editPraxis/roomPresence.ts'],
    rules: {
      'local/no-faction-hue-as-ink': 'off',
    },
  },
  {
    /**
     * Tests name the hue they are guarding — `playersFactionInk.test.tsx` builds
     * `var(--faction-wow)` to assert the rendered markup never carries it, and a
     * fixture for this very rule must contain what it forbids. Same deliberate
     * exemption as the two arms above (#2077).
     */
    files: ['src/**/*.test.{ts,tsx}', 'src/**/__tests__/**'],
    rules: {
      'local/no-faction-hue-as-ink': 'off',
    },
  },
  // #2077's shrink-only allowlist is GONE (#2108). It seeded at four files and
  // eleven violations; every one is fixed, and `.eslint-legacy-faction-hue-ink.txt`
  // is deleted with it rather than left behind as an empty list that reads like
  // debt nobody has looked at.
  {
    // Test files assert on literal strings by design.
    files: [
      'src/**/*.test.{ts,tsx}',
      'src/**/__tests__/**',
      'e2e/**',
    ],
    rules: {
      'i18next/no-literal-string': 'off',
    },
  },
]
