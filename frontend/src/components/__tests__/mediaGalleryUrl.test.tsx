/**
 * #2893: `MediaGallery` goes through `mediaUrl()`, which passes absolute URLs
 * through and does not double `/media/`. The backend writes neither shape today.
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
