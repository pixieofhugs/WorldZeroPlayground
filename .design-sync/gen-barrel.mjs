// Regenerates the two barrels the converter needs, from cfg.componentSrcMap:
//
//   frontend/.ds-kit/index.tsx  — the RUNTIME entry (esbuild bundles this)
//   frontend/index.d.ts         — the TYPES entry (ts-morph reads this)
//
// Run after any componentSrcMap edit:  node .design-sync/gen-barrel.mjs
//
// Why two. The runtime entry must be an explicit barrel because the repo's
// components are `export default` and esbuild's `export *` drops defaults, so
// the IIFE would assign nothing to window.WZ.<Name>.
//
// The types entry exists because lib/dts.mjs resolves a component's props one of
// two ways: a named `<Name>Props` interface, or — failing that — the component's
// own declaration looked up in the package's types entry (`pj.types`, else
// `index.d.ts`). This app publishes neither, so every component whose props are
// an inline destructured object (`function X({ state }: { state: XState })`)
// fell back to `[key: string]: unknown` and shipped NO API contract at all.
// Pointing that entry at the tsc-emitted `frontend/ds-types/` tree fixes it.
//
// Regenerate ds-types first (both are gitignored, neither is committed):
//   cd frontend && node_modules/.bin/tsc -p tsconfig.json \
//     --declaration --emitDeclarationOnly --noEmit false --outDir ds-types --skipLibCheck
//
// A component whose source exposes neither a default nor a same-named export is
// reported and skipped — it can't be re-exported under its map name.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'frontend';
const OUT = 'frontend/.ds-kit/index.tsx';
const cfg = JSON.parse(fs.readFileSync('.design-sync/config.json', 'utf8'));

const DTS_OUT = 'frontend/index.d.ts';
const DTS_TREE = 'frontend/ds-types';

const lines = [
  '// AUTO-GENERATED barrel for design-sync. Named re-exports so the IIFE bundle',
  '// assigns each component to window.WZ.<Name> (esbuild export* drops defaults).',
  '// Regenerate with: node .design-sync/gen-barrel.mjs',
  'export { DSProvider } from "./provider";',
];
const dts = [
  '// AUTO-GENERATED types entry for design-sync — lib/dts.mjs reads this to resolve',
  '// each component\'s props. Regenerate with: node .design-sync/gen-barrel.mjs',
];
const skipped = [];
const noTypes = [];
let named = 0;

for (const name of Object.keys(cfg.componentSrcMap).sort()) {
  const rel = cfg.componentSrcMap[name];
  if (!rel) continue;
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const spec = '../' + rel.replace(/\.tsx$/, '');
  // tsc emits with rootDir=src, so `src/a/B.tsx` lands at `ds-types/a/B.d.ts`.
  const stem = rel.replace(/^src\//, '').replace(/\.tsx$/, '');
  const hasTypes = fs.existsSync(path.join(DTS_TREE, stem + '.d.ts'));
  const dtsSpec = './ds-types/' + stem;
  if (!hasTypes) noTypes.push(name);

  if (/^export\s+default\s/m.test(src)) {
    lines.push(`export { default as ${name} } from "${spec}";`);
    if (hasTypes) dts.push(`export { default as ${name} } from "${dtsSpec}";`);
  } else if (
    new RegExp(`^export\\s+(?:const|function|class)\\s+${name}\\b`, 'm').test(src) ||
    new RegExp(`^export\\s*\\{[^}]*\\b${name}\\b`, 'm').test(src)
  ) {
    lines.push(`export { ${name} } from "${spec}";`);
    if (hasTypes) dts.push(`export { ${name} } from "${dtsSpec}";`);
    named++;
  } else {
    skipped.push(name + '  ' + rel);
  }
}

fs.writeFileSync(OUT, lines.join('\n') + '\n');
console.log(`wrote ${OUT}: ${lines.length - 4} components (${named} via named export)`);

if (fs.existsSync(DTS_TREE)) {
  fs.writeFileSync(DTS_OUT, dts.join('\n') + '\n');
  console.log(`wrote ${DTS_OUT}: ${dts.length - 2} typed re-exports`);
  if (noTypes.length) console.log('  no .d.ts emitted for: ' + noTypes.join(', '));
} else {
  console.log(`! ${DTS_TREE} missing — run the tsc declaration emit (see header), else`);
  console.log('  every component ships `[key: string]: unknown` instead of real props.');
}

if (skipped.length) {
  console.log('SKIPPED (no default, no same-named export):');
  skipped.forEach((s) => console.log('  ! ' + s));
}
