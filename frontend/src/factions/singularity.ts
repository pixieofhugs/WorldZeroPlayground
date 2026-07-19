/**
 * singularity — surfaces this faction overrides (#782).
 *
 * Override-only: anything absent here renders that surface's `Default*`
 * archetype. Add a field, and the surface picks it up with no dispatcher edit.
 */
import type { FactionManifest } from './manifest'

export const SINGULARITY_MANIFEST: FactionManifest = {
  slug: 'singularity',
}
