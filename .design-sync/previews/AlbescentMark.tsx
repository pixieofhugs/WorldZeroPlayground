// AlbescentMark preview cells. AlbescentMark is the Albescent faction's only
// emblem — a surveyor's cross-hair sigil (faint outer ring, firmer inner ring,
// four cardinal ticks, a centre dot), drawn in the near-black ink token by
// default. Props { size, color, opacity, style }. It's tiny, so each cell packs
// several marks in a labeled row against the faction's pale surface.
import { AlbescentMark } from 'worldzero-frontend'

const wrap: React.CSSProperties = {
  padding: 24,
  display: 'flex',
  flexWrap: 'wrap',
  gap: 32,
  alignItems: 'flex-end',
}
const chip: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 8,
  fontSize: 11,
  color: 'var(--color-text-secondary, #6b7280)',
}

function Chip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span style={chip}>
      {children}
      <span>{label}</span>
    </span>
  )
}

/** The mark across the sizes it appears live: an inline comment glyph, a card
 *  corner mark, and the large surface watermark. */
export function Sizes() {
  return (
    <div style={wrap}>
      <Chip label="16 · inline">
        <AlbescentMark size={16} />
      </Chip>
      <Chip label="28 · card mark">
        <AlbescentMark size={28} />
      </Chip>
      <Chip label="64 · surface">
        <AlbescentMark size={64} />
      </Chip>
      <Chip label="96 · watermark">
        <AlbescentMark size={96} />
      </Chip>
    </div>
  )
}

/** The opacity axis — the same mark at full ink and as a faint watermark, the
 *  two ways it sits on an Albescent card. */
export function Opacities() {
  return (
    <div
      style={{
        ...wrap,
        background: 'var(--al-surface)',
        margin: 16,
        border: '1px solid var(--al-border)',
      }}
    >
      <Chip label="opacity 1">
        <AlbescentMark size={56} color="var(--al-ink)" opacity={1} />
      </Chip>
      <Chip label="opacity 0.55">
        <AlbescentMark size={56} color="var(--al-ink)" opacity={0.55} />
      </Chip>
      <Chip label="opacity 0.2">
        <AlbescentMark size={56} color="var(--al-ink)" opacity={0.2} />
      </Chip>
    </div>
  )
}
