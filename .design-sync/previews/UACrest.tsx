// UACrest preview cells. UACrest is the University of Asthmatics heraldic mark —
// a shield (orange chief, warm-paper base) with a rising sun and crossed
// brushes, drawn in the always-light --ua-* tokens. It takes only { width,
// height } (viewBox 100×120, so height ≈ width × 1.2). Being a small emblem,
// each cell packs several crests in a labeled row so the card reads full.
import { UACrest } from 'worldzero-frontend'

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

/** The crest at the three sizes it appears live: a task-card corner mark, the
 *  edit-praxis masthead, and the full faction-hero shield. */
export function Sizes() {
  return (
    <div style={wrap}>
      <Chip label="28 × 34 · card mark">
        <UACrest width={28} height={34} />
      </Chip>
      <Chip label="48 × 58 · masthead">
        <UACrest width={48} height={58} />
      </Chip>
      <Chip label="96 × 115 · hero">
        <UACrest width={96} height={115} />
      </Chip>
    </div>
  )
}

/** The crest on the faction's own warm-paper placard, the way it's mounted on a
 *  UA surface — gold rule under it, so the gilt reads against its intended bg. */
export function OnPlacard() {
  return (
    <div style={wrap}>
      <div
        style={{
          background: 'var(--ua-paper)',
          border: '1px solid var(--ua-line)',
          boxShadow: '0 6px 24px rgba(61,36,16,0.12)',
          padding: '22px 28px',
          display: 'flex',
          alignItems: 'center',
          gap: 18,
        }}
      >
        <UACrest width={64} height={77} />
        <div>
          <div
            style={{
              fontFamily: 'var(--font-faction-engraved-caps)',
              fontSize: 10,
              letterSpacing: '0.28em',
              color: 'var(--ua-gold)',
              textTransform: 'uppercase',
            }}
          >
            University of
          </div>
          <div
            style={{
              fontFamily: 'var(--font-faction-gilt)',
              fontStyle: 'italic',
              fontWeight: 800,
              fontSize: 34,
              lineHeight: 0.95,
              color: 'var(--ua-ink)',
            }}
          >
            Asthmatics
          </div>
          <div style={{ height: 2, background: 'var(--ua-gilt)', marginTop: 8, opacity: 0.85 }} />
        </div>
      </div>
    </div>
  )
}
