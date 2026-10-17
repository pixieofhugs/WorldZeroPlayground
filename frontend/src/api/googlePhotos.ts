import { apiDelete, apiGet, apiPost } from './client'
import { API_BASE_URL } from './baseUrl'
import type { components } from './generated/schema'

/** Google Photos as a proof source (#559). Contract: PR #3227. */
export type PickerSessionStart = components['schemas']['PickerSessionStartOut']
export type MediaUploadResult = components['schemas']['MediaUploadResultOut']

/** Opened in a popup — a navigation (302 to Google), never fetched. */
export const GOOGLE_PHOTOS_AUTHORIZE_URL = `${API_BASE_URL}/auth/google/photos/authorize`

export async function startPhotosSession(): Promise<PickerSessionStart> {
  const { data } = await apiPost('/auth/google/photos/sessions')
  return data
}

export async function pollPhotosSession(sessionId: string) {
  const { data } = await apiGet('/auth/google/photos/sessions/{session_id}', {
    params: { path: { session_id: sessionId } },
  })
  return data.state
}

export async function abandonPhotosSession(sessionId: string): Promise<void> {
  await apiDelete('/auth/google/photos/sessions/{session_id}', {
    params: { path: { session_id: sessionId } },
  })
}

export async function ingestPhotosSession(
  praxisId: number,
  sessionId: string,
): Promise<MediaUploadResult[]> {
  const { data } = await apiPost('/praxes/{praxis_id}/media/google-photos', {
    params: { path: { praxis_id: praxisId } },
    body: { session_id: sessionId },
  })
  return data
}
