/**
 * Picker mount decision (#1713): praxis media (no `aspect`) gets ratios,
 * avatars don't. Aspect math lives in `imageEditHelpers.test.ts`. Effects
 * never run here, so the Cropper doesn't mount; the picker doesn't need it.
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

const RATIO_KEYS = [
  'imageEdit.ratioOriginal',
  'imageEdit.ratio1x1',
  'imageEdit.ratio4x3',
  'imageEdit.ratio16x9',
  // #1968: portrait.
  'imageEdit.ratio9x16',
] as const

type CopyKey =
  | (typeof RATIO_KEYS)[number]
  | 'imageEdit.ratioGroupAria'
  | 'imageEdit.rotateLeft'
  | 'imageEdit.rotateRight'

const label = (key: CopyKey): string => i18n.t(key, { ns: 'common' })

describe('crop-shape picker — praxis media only (#1713)', () => {
  it('offers every ratio when nothing is locked', () => {
    const html = markup(undefined)
    for (const key of RATIO_KEYS) expect(html).toContain(label(key))
  })

  it('lands on Original, so the pre-#1713 shape is still the default', () => {
    const html = markup(undefined)
    const pressed = html.match(/aria-pressed="true"[^>]*>([^<]*)</)
    expect(pressed?.[1]).toBe(label('imageEdit.ratioOriginal'))
  })

  it('shows no picker for an avatar — the 1:1 lock stays a lock', () => {
    const html = markup(AVATAR_ASPECT)
    expect(html).not.toContain(label('imageEdit.ratioGroupAria'))
    for (const key of RATIO_KEYS) expect(html).not.toContain(label(key))
  })

  it('leaves rotation alone on both call sites — still two 90° buttons', () => {
    for (const aspect of [undefined, AVATAR_ASPECT]) {
      const html = markup(aspect)
      expect(html).toContain(label('imageEdit.rotateLeft'))
      expect(html).toContain(label('imageEdit.rotateRight'))
    }
  })
})
