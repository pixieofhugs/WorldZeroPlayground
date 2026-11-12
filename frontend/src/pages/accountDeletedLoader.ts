/**
 * The `/goodbye` chunk's one loader (#3134), shared by `App.tsx` and
 * `runDeleteAccount` (which must load it before signing out). `import()` is
 * memoised, so both share one request.
 */
export const importAccountDeleted = () => import('./AccountDeleted')
