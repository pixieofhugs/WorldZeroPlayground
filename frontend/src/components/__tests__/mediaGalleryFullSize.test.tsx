/**
 * #1896: a cropped proof photo opens at full size via an anchor (not a
 * lightbox: the browser viewer already zooms and saves). Shared by every
 * praxis-detail archetype. Images only; the crop stays; the anchor needs a
 * catalog name because `alt` is empty by design.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import '../../i18n'
import type { MediaItemOut } from '../../api/praxis'
import praxisCopy from '../../locales/en/praxis.json'
import MediaGallery from '../MediaGallery'

const OPEN_IMAGE = praxisCopy.gallery.openImage

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

const image = item(1, 'image', 'proof/photo.jpg')
const video = item(2, 'video', 'proof/clip.mp4')
const audio = item(3, 'audio', 'proof/take.mp3')

const layouts = ['grid', 'column'] as const

describe.each(layouts)('MediaGallery — %s layout', (layout) => {
  const html = renderToStaticMarkup(
    <MediaGallery media={[image, video, audio]} layout={layout} />,
  )

  it('wraps the image in an anchor to the file itself', () => {
    expect(html).toContain('href="http://localhost:8000/media/proof/photo.jpg"')
  })

  it('opens in a new tab without leaking the referrer', () => {
    expect(html).toMatch(/<a [^>]*target="_blank"[^>]*>/)
    expect(html).toMatch(/<a [^>]*rel="noreferrer"[^>]*>/)
  })

  it('announces the catalog copy rather than the URL', () => {
    expect(html).toContain(`aria-label="${OPEN_IMAGE}"`)
    expect(html).toContain('alt=""')
  })

  it('leaves video and audio unwrapped — exactly one anchor, the image', () => {
    expect(html.match(/<a /g) ?? []).toHaveLength(1)
    expect(html).not.toContain('href="http://localhost:8000/media/proof/clip.mp4"')
    expect(html).not.toContain('href="http://localhost:8000/media/proof/take.mp3"')
    expect(html).toContain('<video')
    expect(html).toContain('<audio')
    expect(html).not.toMatch(/<a [^>]*>\s*<(video|audio)/)
  })

  it('keeps the thumbnail crop', () => {
    expect(html).toContain('object-fit:cover')
    expect(html).toContain(layout === 'grid' ? 'max-height:140px' : 'max-height:384px')
  })
})
