// TaskCrown preview cells. TaskCrown is the single praxis mark (ADR-0028,
// amended by ADR-0054): a rainbow medallion with a fleur-de-lis glyph, worn by
// the top-scoring submitted praxis for its task.
//
// ONE canonical look on every faction card. ADR-0054 retired the per-card
// recolour, so there are no `innerBg` / `glyphColor` props to preview: the
// inner disc and glyph are the theme-aware `--fdl-disc` / `--fdl-glyph`
// tokens, and the ring reads the site's one rainbow conic (#1213, ADR-0066).
// That leaves geometry — props { size, ringInset, rotate, shadow, style }.
// It's small, so cells pack several.
import { TaskCrown } from 'worldzero-frontend'

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

/** The crown at the sizes it appears live: an inline card badge, the praxis-card
 *  corner medallion, and the large praxis-hero crown. */
export function Sizes() {
  return (
    <div style={wrap}>
      <Chip label="24 · inline">
        <TaskCrown size={24} />
      </Chip>
      <Chip label="44 · card">
        <TaskCrown size={44} />
      </Chip>
      <Chip label="72 · hero">
        <TaskCrown size={72} />
      </Chip>
    </div>
  )
}

/** The optional flourishes: a rotation tilt and a drop-shadow, as the crown is
 *  pinned to a card corner. */
export function TiltedAndShadowed() {
  return (
    <div style={wrap}>
      <Chip label="rotate -8deg">
        <TaskCrown size={56} rotate="-8deg" />
      </Chip>
      <Chip label="drop-shadow">
        <TaskCrown size={56} shadow="drop-shadow(0 3px 4px rgba(0,0,0,0.3))" />
      </Chip>
      <Chip label="wide ring inset">
        <TaskCrown size={56} ringInset={8} />
      </Chip>
    </div>
  )
}
