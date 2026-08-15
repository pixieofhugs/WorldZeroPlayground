/**
 * Who gets the crop-shape picker, and what it lands on (#1713).
 *
 * The aspect arithmetic is pinned in `imageEditHelpers.test.ts`; this file pins
 * the two things only the mount decides — that praxis media (no `aspect`) is
 * offered the ratios at all, and that avatars (locked 1:1) are not, because
 * every avatar frame on the site assumes square.
 *
 * renderToStaticMarkup, no DOM, matching the rest of this suite: effects never
 * run, so no object URL is minted and the Cropper itself never mounts. That is
 * fine — the picker is rendered from props and state, not from the image.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import '../../../i18n'
import i18n from '../../../i18n'
import ImageEditModal from '../ImageEditModal'
import { AVATAR_ASPECT } from '../imageEditHelpers'

const PHOTO = new File(['bytes'], 'sunset.jpg', { type: 'image/jpeg' })

function markup(aspect?: number): string {
  return renderToStaticMarkup(
    <ImageEditModal
      file={PHOTO}
      aspect={aspect}
      onConfirm={() => {}}
      onCancel={() => {}}
    />,
  )
}

const label = (key: string): string => i18n.t(`imageEdit.${key}`, { ns: 'common' })

describe('crop-shape picker — praxis media only (#1713)', () => {
  it('offers every ratio when nothing is locked', () => {
    const html = markup(undefined)
    for (const key of ['ratioOriginal', 'ratio1x1', 'ratio4x3', 'ratio16x9']) {
      expect(html).toContain(label(key))
    }
  })

  it('lands on Original, so the pre-#1713 shape is still the default', () => {
    const html = markup(undefined)
    // The only pressed button in the group is the one labelled Original.
    const pressed = html.match(/aria-pressed="true"[^>]*>([^<]*)</)
    expect(pressed?.[1]).toBe(label('ratioOriginal'))
  })

  it('shows no picker for an avatar — the 1:1 lock stays a lock', () => {
    const html = markup(AVATAR_ASPECT)
    expect(html).not.toContain(label('ratioGroupAria'))
    for (const key of ['ratioOriginal', 'ratio1x1', 'ratio4x3', 'ratio16x9']) {
      expect(html).not.toContain(label(key))
    }
  })

  it('leaves rotation alone on both call sites — still two 90° buttons', () => {
    for (const aspect of [undefined, AVATAR_ASPECT]) {
      const html = markup(aspect)
      expect(html).toContain(label('rotateLeft'))
      expect(html).toContain(label('rotateRight'))
    }
  })
})
