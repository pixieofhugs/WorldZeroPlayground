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
import tsParser from '@typescript-eslint/parser'
import i18next from 'eslint-plugin-i18next'

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

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'playwright-report/**', 'test-results/**'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: { i18next },
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
    },
  },
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
