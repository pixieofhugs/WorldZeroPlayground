/**
 * React 19's hoisted resource hints, peeled off the front of SSR markup.
 *
 * React 19 preloads images it renders: every `<img src>` reaching
 * `renderToStaticMarkup` also emits a `<link rel="preload" as="image">`, and
 * React hoists those to the very start of the output. React 18 emitted none, so
 * the suites written against it read the first tag of the markup as the
 * component's own root — `undress()`'s anchored `^<div class="alb-praxis ...">`,
 * `factionAvatar`'s `^<[a-z]+[^>]*>`, an `indexOf` on an image filename that now
 * finds the hint's `href` before the `<img>`'s `src`.
 *
 * The hint is a real and wanted React 19 behaviour, not a bug to suppress — but
 * it is a property of the loading strategy, not of the component tree these
 * suites describe, and this app ships as a client-rendered Vite SPA that never
 * serves this markup. Nothing under `src/` authors a `<link>` of its own, so a
 * leading run of them is always React's and only React's.
 *
 * Scoped to the LEADING run on purpose: a `<link>` appearing mid-markup would be
 * something new and should fail a test rather than vanish here.
 */
export function stripResourceHints(html: string): string {
  return html.replace(/^(?:<link\b[^>]*>)+/, '')
}
