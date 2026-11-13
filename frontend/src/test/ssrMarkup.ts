/**
 * Strip React 19's hoisted `<link rel="preload">` hints from the front of SSR
 * markup, so suites see the component root first. Leading run only: nothing in
 * `src/` authors a `<link>`, and one mid-markup should fail a test.
 */
export function stripResourceHints(html: string): string {
  return html.replace(/^(?:<link\b[^>]*>)+/, '')
}
