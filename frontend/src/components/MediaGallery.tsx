import type { MediaItemOut } from '../api/praxis'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

interface Props {
  media: MediaItemOut[]
  /** 'column' (default) stacks items; 'grid' uses a responsive minmax(150px,1fr) grid for image specimens. */
  layout?: 'column' | 'grid'
}

/** Media gallery with rounded images and clean borders (Style Guide §12.5). */
export default function MediaGallery({ media, layout = 'column' }: Props) {
  if (media.length === 0) return null

  const sorted = [...media].sort((a, b) => a.display_order - b.display_order)

  return (
    <div
      style={
        layout === 'grid'
          ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 'var(--space-md)' }
          : { display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }
      }
    >
      {sorted.map((item) => {
        const src = `${BASE_URL}/media/${item.file_path}`
        if (item.type === 'image') {
          return (
            <img
              key={item.id}
              src={src}
              alt=""
              style={{
                width: '100%',
                borderRadius: 8,
                objectFit: 'cover',
                maxHeight: layout === 'grid' ? 140 : 384,
                border: '1px solid var(--color-border)',
              }}
            />
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
