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
  // faction ornaments, and window-chrome marks like "▭ ✕".
  /^[\s·•‹›«»“”‘’—–→←↑↓★☆✦✧✓✔✕✗×⚔⚜†◆◇▢▭■●○◦∞°▦¼½¾″′…]+$/u,
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
    // The colour arm (#1853). See the constants and Gap E above for why it is a
    // separate id rather than a third visitor on the rule above.
    'no-raw-colour-values': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Disallow raw colour literals (hex, rgb/rgba/hsl/hsla) and stock Tailwind colour utilities — use a --color-*/--faction-* token from index.css (WORLD_ZERO_STYLE.md).',
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
