import UaMandala from '../cards/UaMandala'
import { UaSigil } from '../sigil/UaSigil'

/**
 * UA page backdrop — mesa sand (kit §10, #851).
 *
 * The ground is one flat token, `--faction-ua-page`, with two figures bled off
 * opposite corners: the mandala at TEXTURE strength and one ensō. Both sit at
 * 6-8% so unrelated content can be read straight through them — the backdrop's
 * whole job is to be felt and not seen. That is the second of the mandala's
 * three strengths (brief §5); full strength belongs to the vote control alone.
 *
 * It themes a page only when UA is that page's single context. A mixed or
 * neutral page keeps the global rainbow watercolour — never theme a mixed page
 * to one faction — and the dispatcher, not this file, makes that call.
 *
 * Both themes come from the `[data-theme="dark"]` cascade. The gilt wall, its
 * ledger dot-grid and the ruling that kept them undimmed are all gone.
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
