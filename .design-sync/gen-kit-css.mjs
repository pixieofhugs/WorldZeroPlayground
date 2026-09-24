// Regenerate frontend/.ds-kit/kit.css = the TAILWIND-COMPILED
// frontend/src/index.css, plus two sheets the app reaches across a chunk
// boundary and the Tailwind compile therefore cannot see:
// frontend/src/fonts.faction.css (the 15 faction families, #2079) and
// frontend/src/motion.ornament.css (#2073) — see steps 2a and 2b.
//
// The faces used to arrive via a Google-Fonts @import harvested from
// frontend/index.html's <link>. #1977 self-hosted all 18 families, so that
// <link> is gone: `src/fonts.css` (the shell's three) is @imported by
// index.css and lands in the Tailwind compile on its own, and the faction
// sheet is appended here. The converter's extractFonts() then copies every
// woff2 into the uploaded fonts/ dir — which is strictly better than the old
// remote @import, since the previews no longer need network to paint in the
// real faces. It resolves url()s relative to THIS file's directory, so step 2c
// rewrites the src-relative paths to ../src/… before it looks.
//
// Why compile Tailwind: index.css is just `@tailwind base/components/utilities`
// + the app's custom vars/rules. The design-sync converter copies cssEntry
// verbatim — it does NOT run PostCSS — so without this step the @tailwind
// directives pass through as no-ops and every component that uses a utility
// class (rounded-full, object-cover, flex, …) renders unstyled. We run the
// repo's own Tailwind (scanning src/ per tailwind.config.ts) to emit exactly
// the utilities the components use, then cssEntry points at the result.
//
// kit.css + index.compiled.css are gitignored (derived); re-run before each
// design-sync build:  node .design-sync/gen-kit-css.mjs
//
// It also inlines the one app-served asset the kit depends on. `Enso` paints
// through `mask-image: url(/factionMarks/enso.webp)` — an ABSOLUTE path served
// by the app from public/. Nothing serves that path inside the design system or
// inside a design built from it, so every UA ensō (UaSigil, FactionSigil('ua'),
// the UA score mark) would render blank. Inlining it as a data URI, with
// `!important` to beat the component's inline style, makes the kit
// self-contained — the contract: a rendered design gets only the JS bundle plus
// the styles.css @import closure.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

/**
 * Drop Tailwind's preflight `--tw-*` defaults from compiled CSS (#1318).
 *
 * Preflight emits ~51 custom properties (`--tw-translate-x`, `--tw-rotate`,
 * `--tw-ring-offset-shadow`, `--tw-pan-x`, …) into `*,:after,:before` and again
 * into `::backdrop`. They are Tailwind plumbing, but the converter publishes
 * every custom property it finds, so they show up in the design-system export
 * alongside the real `--faction-*` / `--color-*` / `--radius-*` tokens.
 *
 * v4 EMITS THE SAME PLUMBING IN TWO SHAPES, NOT ONE (#2918), and this filter
 * has to catch both:
 *   - 52 `@property --tw-…{syntax:"*";inherits:false}` REGISTRATIONS, where the
 *     name sits in the at-rule prelude and the body holds no `--tw-` at all;
 *   - the familiar declaration block, now nested two deep inside
 *     `@layer properties{@supports (…){*,:before,:after,::backdrop{…}}}`.
 * The declaration rule below only ever saw the second. Missing the first is
 * silent: the compile succeeds, the kit renders, and the export simply grows 52
 * tokens nobody designed.
 *
 * A declaration is dropped unless one of two things is true:
 *   - it is `--tw-delay`, a REAL app variable that staggers the Coven vote's
 *     moon sparkle and the Wow vote's flecks (set from JS in CovenVote.tsx /
 *     WowVote.tsx). Today it is only ever *referenced* — `var(--tw-delay, 0s)`
 *     — so no declaration filter can reach it, but it is exempted explicitly so
 *     a future stylesheet-side declaration cannot be swept up by accident;
 *   - the rule that declares it also consumes it via `var()`. That is the shape
 *     of a Tailwind UTILITY internal — `.text-red-600{--tw-text-opacity:1;
 *     color:rgb(220 38 38/var(--tw-text-opacity))}`, `.border-red-300`,
 *     `.space-y-*`. Stripping those drops the colour or the margin outright,
 *     which is a rendered-output change. Utility classes stay untouched.
 *
 * Only custom-property *declarations* are in scope. Every `var(--tw-…)`
 * reference passes through verbatim.
 *
 * ponytail: this is a regex over declaration text, not a CSS parse. Its ceiling
 * is that it only sees innermost `selector{…}` blocks and splits declarations
 * on `;`, and that "is it consumed?" is judged per-rule — a preflight default
 * consumed by a DIFFERENT rule (`.transform`, `.ring`, `.backdrop-filter`,
 * `.filter`) is still dropped. That is deliberate and currently free: none of
 * those four classes is used as a className token anywhere in frontend/src —
 * Tailwind only emits them because its content scanner matched the bare words
 * "transform"/"ring"/"filter" in source text. If one of them ever gets used for
 * real, this filter would silently neutralise it; at that point swap the regex
 * for postcss (not a dependency today — see the note above about the converter
 * not running PostCSS) and resolve `var()` usage across the whole sheet.
 *
 * @param {string} css compiled, minified Tailwind output
 * @returns {string} the same CSS with preflight-only `--tw-*` declarations gone
 */
export function stripTailwindPreflightVars(css) {
  const stripped = css.replace(/([^{}]*)\{([^{}]*)\}/g, (rule, selector, body) => {
    // v4 REGISTERS its plumbing instead of only defaulting it (#2918). Where v3
    // emitted every `--tw-*` as a declaration inside `*,:after,:before`, v4 also
    // emits 52 `@property --tw-…{syntax:"*";inherits:false}` rules. Those bodies
    // contain no `--tw-` at all — the name is in the AT-RULE PRELUDE — so the
    // declaration filter below never sees them, and all 52 would be published
    // as design tokens. Matched at the END of the prelude so any CSS that
    // preceded it in this capture survives.
    const registered = selector.match(/@property\s+(--tw-[\w-]+)\s*$/);
    if (registered) {
      // `--tw-delay` is a real app variable; exempt here for the same reason it
      // is exempt below, so the two halves of this filter cannot disagree.
      if (registered[1] !== '--tw-delay') return selector.slice(0, registered.index);
      return rule;
    }
    if (!body.includes('--tw-')) return rule;
    const kept = body.split(';').filter((declaration) => {
      const name = declaration.match(/^\s*(--tw-[\w-]+)\s*:/)?.[1];
      if (!name) return true;
      if (name === '--tw-delay') return true;
      return new RegExp(`var\\(\\s*${name}\\s*[,)]`).test(body);
    });
    const remaining = kept.join(';');
    // A rule that was nothing but preflight defaults goes away entirely rather
    // than shipping an empty `::backdrop{}` to the export.
    return remaining.trim() ? `${selector}{${remaining}}` : '';
  });

  // Emptying the block inside `@layer properties{@supports (…){ … }}` leaves the
  // wrapper behind. Harmless to a browser, but it is noise in an exported design
  // system, and it only appears at all because v4 wraps its defaults two deep.
  // Repeated because collapsing the inner shell is what makes the outer one empty.
  let collapsed = stripped;
  for (let previous = null; previous !== collapsed; ) {
    previous = collapsed;
    collapsed = collapsed.replace(/@(?:layer|supports|media)[^{}]*\{\s*\}/g, '');
  }
  return collapsed;
}

/**
 * Compile `frontend/src/index.css` the way the APP compiles it (#2918).
 *
 * This used to shell out to `node_modules/tailwindcss/lib/cli.js -c
 * tailwind.config.ts`. v4 ships no `lib/cli.js` — the CLI moved to a separate
 * `@tailwindcss/cli` package — and there is no `tailwind.config.ts` any more,
 * so that line was two hard crashes stacked on each other.
 *
 * IT RUNS THE APP'S OWN PIPELINE RATHER THAN A CLI, DELIBERATELY. Installing
 * `@tailwindcss/cli` would work and would be a smaller diff, but it would add a
 * dependency whose only consumer is this file and would make the kit a SECOND
 * WAY OF BUILDING THE SHEET, free to drift from what `vite build` actually
 * emits. `postcss` and `@tailwindcss/postcss` are already devDependencies —
 * they are what `postcss.config.js` names — so going through them costs no new
 * package and guarantees the kit and the app agree by construction.
 * `optimize.minify` is the plugin's own equivalent of the old `--minify`.
 *
 * Resolved from `frontend/`'s node_modules, because that is where the install
 * is; the repo root has none.
 */
async function compileIndexCss() {
  const require = createRequire(pathToFileURL('frontend/package.json'));
  const load = async (name) =>
    (await import(pathToFileURL(require.resolve(name)).href)).default;
  const postcss = await load('postcss');
  const tailwindcss = await load('@tailwindcss/postcss');

  const result = await postcss([
    tailwindcss({
      // `00-prelude.css` sets `source(none)` and lists its own `@source` globs
      // relative to itself, so scanning does not depend on this base — but it
      // is the app's base, and a wrong one here would be silent.
      base: 'frontend',
      optimize: { minify: true },
      // Leave `url()` verbatim. Step 2c below rewrites the font paths itself,
      // against the shape `src/fonts.css` actually writes
      // (`url('./assets/fonts/…')`), and a rewrite here would move that target
      // without moving the regex that finds it.
      transformAssetUrls: false,
    }),
  ]).process(readFileSync('frontend/src/index.css', 'utf8'), {
    from: 'frontend/src/index.css',
    to: 'frontend/.ds-kit/index.compiled.css',
  });

  writeFileSync('frontend/.ds-kit/index.compiled.css', result.css);
  return result.css;
}

async function main() {
  // 1. Compile Tailwind over the app's real entry stylesheet.
  const compiled = await compileIndexCss();

  // 2a. Append the faction @font-face sheet (#2079). index.css deliberately
  //     does NOT @import it — it rides the chunk of whatever faction surface
  //     needs it — so the Tailwind compile above sees only the shell's three
  //     families. Without this the kit ships 3 of 18 faces and every faction
  //     surface paints in a fallback, which reads as "the font just looks a
  //     bit off" rather than as a missing asset.
  const FACTION_FONTS_SRC = 'frontend/src/fonts.faction.css';
  const factionFonts =
    `\n/* Appended from ${FACTION_FONTS_SRC}: the app loads this sheet from a\n` +
    `   faction chunk (#2079), so index.css never @imports it. */\n` +
    readFileSync(FACTION_FONTS_SRC, 'utf8');

  // 2b. Append the deferred ornament-motion sheet (#2073). The app reaches it
  //     through a chunk boundary so it stays off the critical path, which means
  //     index.css does NOT @import it and the Tailwind compile above cannot see
  //     it. Nothing brings it back inside a design the way the Google-Fonts
  //     @import brings the faction faces back, so without this the kit's
  //     ornaments render stilled — the reduced-motion state, so still legible,
  //     which is exactly why it would go unnoticed. Concatenated raw: the sheet
  //     is plain CSS with no directives and no @apply.
  const MOTION_SRC = 'frontend/src/motion.ornament.css';
  const motion =
    `\n/* Appended from ${MOTION_SRC}: the app defers this sheet across a chunk\n` +
    `   boundary (#2073), so the Tailwind compile of index.css never sees it. */\n` +
    readFileSync(MOTION_SRC, 'utf8');

  // 3. Inline every app-served mask asset so the marks paint without an app
  //    server. Each is an ABSOLUTE `/factionMarks/…` path in a component's
  //    inline style, which nothing serves inside a design; `!important` beats
  //    that inline style. Keep this list in step with `grep -rn "url(/" frontend/src`.
  const MASK_ASSETS = [
    ['frontend/public/factionMarks/enso.webp', 'image/webp', 'factionMarks/enso.webp'],
    ['frontend/public/factionMarks/labyrinth.svg', 'image/svg+xml', 'factionMarks/labyrinth.svg'],
  ];
  let maskBytes = 0;
  const maskRules = MASK_ASSETS.map(([src, mime, marker]) => {
    const dataUri = `data:${mime};base64,${readFileSync(src).toString('base64')}`;
    maskBytes += dataUri.length;
    return (
      `\n/* Inlined from ${src}: the component asks for the absolute path\n` +
      `   /${marker}, which nothing serves inside a design. */\n` +
      `span[style*="${marker}"]{` +
      `-webkit-mask-image:url("${dataUri}") !important;` +
      `mask-image:url("${dataUri}") !important;}\n`
    );
  }).join('');

  // 2c. Point every self-hosted face at ../src/…, because the converter's
  //     extractFonts() resolves url()s relative to the directory holding THIS
  //     stylesheet (.ds-kit/), not relative to src/. An unresolvable src is
  //     dropped silently, so a wrong path here costs the whole family.
  const rebase = (css) =>
    css.replace(/url\(\s*['"]?\.?\/?assets\/fonts\/([^'")]+)['"]?\s*\)/g, "url('../src/assets/fonts/$1')");

  writeFileSync(
    'frontend/.ds-kit/kit.css',
    `/* AUTO-GENERATED by .design-sync/gen-kit-css.mjs — do not edit. */\n` +
      rebase(stripTailwindPreflightVars(compiled) + factionFonts + motion) +
      maskRules,
  );
  console.error(
    `wrote frontend/.ds-kit/kit.css (tailwind-compiled + self-hosted faces + ornament motion ` +
      `+ inlined ${MASK_ASSETS.length} mask assets, preflight --tw-* stripped, ` +
      `${Math.round(maskBytes / 1024)} KB masks)`,
  );
}

// Run the compile only as the entry module, so the filter above can be imported
// (and unit-tested) without running Tailwind. `main` is async now, so an
// unhandled rejection would otherwise exit 0 and write nothing — the generator
// must fail loudly, since its output is what the whole design system renders in.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
