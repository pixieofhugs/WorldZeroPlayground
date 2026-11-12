import UaMandala from '../factionMarks/UaMandala'
import { UaSigil } from '../sigil/UaSigil'

/**
 * UA page backdrop — mesa sand (kit §10, #851): flat `--faction-ua-page` with
 * the mandala (TEXTURE strength, brief §5) and an ensō bled off opposite
 * corners at 6–8%, so content reads straight through.
 */
export default function UaBackdrop() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        backgroundColor: 'var(--faction-ua-page)',
      }}
    >
      {/* mandala, bled off the lower right */}
      <UaMandala
        size={620}
        strength="texture"
        opacity={0.07}
        rings={4}
        petalsPerRing={16}
        rotation={-9}
        style={{ position: 'absolute', right: -180, bottom: -210 }}
      />
      {/* the mark, bled off the upper left */}
      <span
        style={{ position: 'absolute', left: -130, top: -120, opacity: 0.06 }}
      >
        <UaSigil width={420} height={420} />
      </span>
    </div>
  )
}
