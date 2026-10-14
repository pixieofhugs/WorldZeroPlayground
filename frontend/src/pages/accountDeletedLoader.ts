/**
 * The `/goodbye` chunk's one loader (#3134), shared by the route in `App.tsx`
 * and by the delete sequence that has to finish loading it before it signs
 * out — see `settings/deleteAccount.ts::runDeleteAccount`.
 *
 * A file of its own so neither side imports the other: `import()` is memoised
 * by the module registry, so the warm call and the render share one request.
 */
export const importAccountDeleted = () => import('./AccountDeleted')
