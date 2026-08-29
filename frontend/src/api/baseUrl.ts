/**
 * The API's origin — one module (#2893).
 *
 * `VITE_API_URL ?? 'http://localhost:8000'` used to be written five times
 * (`api/client.ts`, `api/auth.ts`, `utils/media.ts`, `components/MediaGallery.tsx`,
 * `pages/editPraxis/praxisRoom.tsx`). Every one of those now reads this constant
 * instead, so the fallback host lives in exactly one place.
 */
export const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
