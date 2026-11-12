/**
 * Albescent's page ground (#2531): a pass-through to `WatercolorBackground`,
 * byte-identical to na (`albescentWrapperKinds.test.tsx`). Registered so the
 * manifest says "deliberately nothing". The only backdrop route is the
 * character profile, and a secret society's profiles must not get a ground of
 * their own (ADR-0027, ADR-0048). No mark to re-cut, and no
 * `ORNAMENTED_BACKDROP_SLUGS` row: the ground stays a wash (#2195).
 */
import WatercolorBackground from '../layout/WatercolorBackground'

export default function AlbescentBackdrop() {
  return <WatercolorBackground />
}
