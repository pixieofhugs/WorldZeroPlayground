/**
 * #1896 — a proof photo has to be openable at full size.
 *
 * THE SEAM IS `MediaGallery`'s rendered markup. The gallery crops every image
 * (`objectFit: cover`, `maxHeight` 140 in `grid` and 384 in `column`), and a
 * bare `<img>` has no affordance to reach the uncropped file. The ruling is an
 * anchor around the image, not a lightbox: the browser's own image viewer
 * already gives pinch-zoom, save-as and rotate, and an anchor is keyboard- and
 * screen-reader-correct with nothing added.
 *
 * `MediaGallery` is shared by all nine praxis-detail archetypes (Albescent
 * delegates to Default), so this one seam covers every faction — asserting per
 * archetype would test the import graph, not the fix.
 *
 * What the test pins, beyond "there is a link":
 * - BOTH layouts. The praxis detail passes `grid` on desktop and `column` on
 *   mobile, and both crop, so a fix that only reached the grid would still ship
 *   the bug to phones.
 * - IMAGES ONLY. `<video controls>` has its own fullscreen and audio has no
 *   full size; wrapping either would add a link that leads nowhere useful.
 * - THE CROP IS UNCHANGED. The crop is the layout; the click is the fix. If a
 *   later tidy-up "fixes" the cropping by dropping `objectFit`/`maxHeight`,
 *   that is a different (and unruled) change.
 * - A MEANINGFUL ACCESSIBLE NAME, from the catalog. The `alt` is empty by
 *   design — nobody has described these photos — so without a name on the
 *   anchor a screen reader announces the raw URL.
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
    // The image itself stays decorative; the name lives on the link.
    expect(html).toContain('alt=""')
  })

  it('leaves video and audio unwrapped — exactly one anchor, the image', () => {
    expect(html.match(/<a /g) ?? []).toHaveLength(1)
    expect(html).not.toContain('href="http://localhost:8000/media/proof/clip.mp4"')
    expect(html).not.toContain('href="http://localhost:8000/media/proof/take.mp3"')
    expect(html).toContain('<video')
    expect(html).toContain('<audio')
    // No anchor may sit around the player elements.
    expect(html).not.toMatch(/<a [^>]*>\s*<(video|audio)/)
  })

  it('keeps the thumbnail crop', () => {
    expect(html).toContain('object-fit:cover')
    expect(html).toContain(layout === 'grid' ? 'max-height:140px' : 'max-height:384px')
  })
})
