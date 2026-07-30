// Regenerate frontend/.ds-kit/kit.css = Google-Fonts @import (harvested from
// frontend/index.html, where the real app loads its faction webfonts via a
// <link>) prepended to the TAILWIND-COMPILED frontend/src/index.css.
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
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
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
  return css.replace(/([^{}]*)\{([^{}]*)\}/g, (rule, selector, body) => {
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
}

function main() {
  // 1. Compile Tailwind over the app's real entry stylesheet (cwd = frontend so
  //    the config's ./src/** content globs and node_modules resolve).
  execFileSync(
    process.execPath,
    ['node_modules/tailwindcss/lib/cli.js', '-c', 'tailwind.config.ts', '-i', 'src/index.css', '-o', '.ds-kit/index.compiled.css', '--minify'],
    { cwd: 'frontend', stdio: 'inherit' },
  );

  // 2. Prepend the Google-Fonts @import (must be the first at-rule).
  const html = readFileSync('frontend/index.html', 'utf8');
  const href = html.match(/href="(https:\/\/fonts\.googleapis\.com\/css2[^"]+)"/)?.[1];
  if (!href) throw new Error('no Google Fonts <link> href in frontend/index.html');
  const compiled = readFileSync('frontend/.ds-kit/index.compiled.css', 'utf8');

  writeFileSync(
    'frontend/.ds-kit/kit.css',
    `/* AUTO-GENERATED by .design-sync/gen-kit-css.mjs — do not edit. */\n` +
      `@import url('${href}');\n` +
      stripTailwindPreflightVars(compiled) +
      '\n',
  );
  console.error('wrote frontend/.ds-kit/kit.css (tailwind-compiled + webfonts, preflight --tw-* stripped)');
}

// Run the compile only as the entry module, so the filter above can be imported
// (and unit-tested) without shelling out to Tailwind.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
