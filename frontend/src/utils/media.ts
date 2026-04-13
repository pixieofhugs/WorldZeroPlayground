const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

/**
 * Resolve a media path to a full URL.
 * - Absolute URLs (http/https) are returned as-is.
 * - Relative paths are prefixed with the API base URL + /media/.
 * - Empty/falsy values return an empty string.
 */
export function mediaUrl(path: string | null | undefined): string {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  // Strip leading slash to avoid double-slash
  const cleaned = path.startsWith('/') ? path : `/media/${path}`
  return `${BASE_URL}${cleaned}`
}
