// MediaGallery preview cells — the praxis proof gallery (Style Guide §12.5):
// rounded, bordered image/video/audio specimens, either stacked (column) or in a
// responsive grid. Offline the media paths 404, so the image cells render broken
// thumbnails — grade the chrome/layout (rounding, borders, grid rhythm), not the
// missing pixels (see B10-ui-top.md).
import { MediaGallery } from 'worldzero-frontend'
import type { MediaItemOut } from '../../frontend/src/api/praxis'

const wrap: React.CSSProperties = { padding: 24, maxWidth: 460 }

const NOW = '2026-07-01T15:04:00Z'

const IMAGES: MediaItemOut[] = [
  { id: 1, praxis_id: 501, type: 'image', file_path: 'media/praxis/501/portico-1.jpg', display_order: 0, created_at: NOW },
  { id: 2, praxis_id: 501, type: 'image', file_path: 'media/praxis/501/portico-2.jpg', display_order: 1, created_at: NOW },
  { id: 3, praxis_id: 501, type: 'image', file_path: 'media/praxis/501/portico-3.jpg', display_order: 2, created_at: NOW },
  { id: 4, praxis_id: 501, type: 'image', file_path: 'media/praxis/501/portico-4.jpg', display_order: 3, created_at: NOW },
]

const MIXED: MediaItemOut[] = [
  { id: 5, praxis_id: 501, type: 'image', file_path: 'media/praxis/501/still.jpg', display_order: 0, created_at: NOW },
  { id: 6, praxis_id: 501, type: 'video', file_path: 'media/praxis/501/walkthrough.mp4', display_order: 1, created_at: NOW },
  { id: 7, praxis_id: 501, type: 'audio', file_path: 'media/praxis/501/field-notes.mp3', display_order: 2, created_at: NOW },
]

/** Grid layout — image specimens in the responsive minmax(150px) grid. */
export function ImageGrid() {
  return (
    <div style={wrap}>
      <MediaGallery media={IMAGES} layout="grid" />
    </div>
  )
}

/** Column layout with mixed media — a stacked image, video, and audio player. */
export function MixedColumn() {
  return (
    <div style={wrap}>
      <MediaGallery media={MIXED} layout="column" />
    </div>
  )
}
