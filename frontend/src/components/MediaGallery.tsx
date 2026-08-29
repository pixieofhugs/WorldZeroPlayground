import { useTranslation } from 'react-i18next'

import type { MediaItemOut } from '../api/praxis'
import { mediaUrl } from '../utils/media'

interface Props {
  media: MediaItemOut[]
  /** 'column' (default) stacks items; 'grid' uses a responsive minmax(150px,1fr) grid for image specimens. */
  layout?: 'column' | 'grid'
}

/** Media gallery with rounded images and clean borders (Style Guide §12.5). */
export default function MediaGallery({ media, layout = 'column' }: Props) {
  const { t } = useTranslation('praxis')
  if (media.length === 0) return null

  const sorted = [...media].sort((a, b) => a.display_order - b.display_order)

  return (
    // `.user-media` marks the region that is the PLAYER's, not the site's, so a
    // faction flourish can be told to stop at it (#1646). Inert everywhere but
    // Albescent, which is the only skin that washes a blended layer over the
    // praxis-detail sheet.
    <div
      className="user-media"
      style={
        layout === 'grid'
          ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 'var(--space-md)' }
          : { display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }
      }
    >
      {sorted.map((item) => {
        const src = mediaUrl(item.file_path)
        if (item.type === 'image') {
          // #1896. Both layouts crop the thumbnail, so the full file is only
          // reachable through the browser's own image viewer — which is also
          // the pinch-zoom, save-as and rotate a lightbox would have to build.
          // The anchor is the whole feature; the crop below is untouched.
          // `alt` stays empty (nobody has described these photos), so the link
          // takes its accessible name from the catalog rather than the URL.
          return (
            <a
              key={item.id}
              href={src}
              target="_blank"
              rel="noreferrer"
              aria-label={t('gallery.openImage')}
              style={{ display: 'block' }}
            >
              <img
                src={src}
                alt=""
                style={{
                  display: 'block',
                  width: '100%',
                  borderRadius: 8,
                  objectFit: 'cover',
                  maxHeight: layout === 'grid' ? 140 : 384,
                  border: '1px solid var(--color-border)',
                }}
              />
            </a>
          )
        }
        if (item.type === 'video') {
          return (
            <video
              key={item.id}
              src={src}
              controls
              style={{
                width: '100%',
                borderRadius: 8,
                border: '1px solid var(--color-border)',
              }}
            />
          )
        }
        if (item.type === 'audio') {
          return (
            <audio
              key={item.id}
              src={src}
              controls
              className="w-full"
            />
          )
        }
        return null
      })}
    </div>
  )
}
