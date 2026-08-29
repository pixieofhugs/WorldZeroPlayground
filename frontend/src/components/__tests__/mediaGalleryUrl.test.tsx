/**
 * #2893 — `MediaGallery` used to build its `src` by hand
 * (`${BASE_URL}/media/${item.file_path}`) instead of going through
 * `utils/media.ts`'s `mediaUrl()`, the helper 109 other call sites already use.
 *
 * That hand-rolled line skipped two things `mediaUrl()` handles:
 *  - an ABSOLUTE URL (http/https) is passed through as-is; the old line always
 *    prefixed it with `${BASE_URL}/media/`, producing an unreachable URL.
 *  - a `file_path` that already starts with `/` is used as-is (after the base);
 *    the old line always inserted a second `/media/`, producing a doubled path.
 *
 * Both are shapes `MediaItem.file_path` does not carry today (the backend
 * writes only relative, non-absolute paths — `backend/services/media.py`), so
 * this is not a regression any player has hit. It is the reason routing through
 * `mediaUrl()` is not byte-identical in general, even though it IS
 * byte-identical for every `file_path` the backend actually writes (proved by
 * `mediaGalleryFullSize.test.tsx`, unchanged by this fix).
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import '../../i18n'
import type { MediaItemOut } from '../../api/praxis'
import MediaGallery from '../MediaGallery'

function item(id: number, type: MediaItemOut['type'], file: string): MediaItemOut {
  return {
    id,
    praxis_id: 1,
    file_path: file,
    type,
    display_order: id,
    created_at: '2026-01-01T00:00:00Z',
  }
}

describe('MediaGallery — mediaUrl() passthrough and normalisation (#2893)', () => {
  it('passes an absolute URL through unchanged, instead of prefixing it with the API base', () => {
    const absolute = 'https://cdn.example.com/proof/photo.jpg'
    const html = renderToStaticMarkup(
      <MediaGallery media={[item(1, 'image', absolute)]} layout="column" />,
    )
    expect(html).toContain(`href="${absolute}"`)
    expect(html).not.toContain('/media/https')
  })

  it('uses a leading-slash path as-is after the base, instead of doubling /media/', () => {
    const html = renderToStaticMarkup(
      <MediaGallery media={[item(2, 'image', '/uploads/proof.jpg')]} layout="column" />,
    )
    expect(html).toContain('href="http://localhost:8000/uploads/proof.jpg"')
    expect(html).not.toContain('/media//uploads/proof.jpg')
  })
})
