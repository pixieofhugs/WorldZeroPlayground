import { API_BASE_URL } from '../api/baseUrl'

/** Absolute URLs pass through; relative paths go under `/media/`. */
export function mediaUrl(path: string | null | undefined): string {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const cleaned = path.startsWith('/') ? path : `/media/${path}`
  return `${API_BASE_URL}${cleaned}`
}
