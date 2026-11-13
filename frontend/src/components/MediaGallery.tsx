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
    // `.user-media` marks the PLAYER's region so a faction flourish (Albescent's wash) stops at it (#1646).
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
          // #1896: link to the full file (the browser's viewer beats a lightbox). `alt` is
          // empty (undescribed photos), so the link is named from the catalog.
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
