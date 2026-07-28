import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
  withCredentials: true, // send httpOnly JWT cookie automatically
})

/**
 * The session probe. A 401 here is not a failure — it is the answer "nobody is
 * logged in", which is exactly what `AuthProvider` asks on every page load.
 */
const SESSION_PROBE = '/auth/me'

/**
 * If the server says the session has expired, send the user back to the landing
 * page.
 *
 * WHY THE PROBE IS EXCLUDED
 * -------------------------
 * `AuthProvider` calls `/auth/me` on mount to find out whether anyone is signed
 * in, and for a guest the answer is 401. Treating that as an expired session
 * meant every logged-out visitor who opened any URL other than `/` was
 * immediately thrown back to `/` — so no deep link worked for a guest. A shared
 * task link, a praxis permalink, a bookmarked faction page: all of them landed
 * on the homepage instead.
 *
 * It was also expensive. `window.location.href` is a full document navigation,
 * so the visitor paid for the entire bundle, the fonts and every API call a
 * second time before seeing a page they had not asked for.
 *
 * The redirect still fires for a session that expires while the app is in use,
 * which is what it was written for.
 */
export function shouldReturnToLanding(
  status: number | undefined,
  requestUrl: string,
  pathname: string,
): boolean {
  if (status !== 401) return false
  if (requestUrl.includes(SESSION_PROBE)) return false
  if (pathname.startsWith('/auth')) return false
  return pathname !== '/'
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      shouldReturnToLanding(
        error?.response?.status,
        error?.config?.url ?? '',
        window.location.pathname,
      )
    ) {
      window.location.href = '/'
    }
    return Promise.reject(error)
  },
)

export default api
