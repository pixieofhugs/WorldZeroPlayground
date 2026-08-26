// AlbescentAvatar preview cells (#2502, epic #2496, ADR-0048) — the avatar's
// Albescent tell.
//
// THIS IS NOT A NINTH SKIN. It renders the exact spectrum disc an unaffiliated
// player wears — same ring, same monogram, same DefaultSigil corner mark — and
// hands it one inert ornament layer. Strip that span and the two avatars are
// byte-identical.
//
// THE RING TURNS AT 64px AND UP, AND IS ABSENT BELOW IT. An avatar renders
// BESIDE other players' — comment leaves at 24, praxis bylines at 28, roster
// rows at 42 — and one turning ring in a column of still ones is a spotlight
// rather than a shimmer. The gate sits deliberately above every mount that
// exists today (the largest is the roster lead card at 54), so the tell ships
// DORMANT: correct, complete, and waiting for the first surface that shows one
// player's disc large and alone. That is an owner ruling, not a gap.
import { AlbescentAvatar } from 'worldzero-frontend'
import { characterFor } from './_fixtures'

const wrap: React.CSSProperties = {
  background: 'var(--color-bg-page)',
  padding: 24,
  display: 'flex',
  flexWrap: 'wrap',
  gap: 28,
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

const member = characterFor('albescent', { username: 'quiet_hand' })

/** Every size the app actually mounts. The ornament is not stilled here — it is
 *  never rendered — so each of these costs exactly what na's disc costs and is
 *  indistinguishable from it. This is the shipped state of the tell. */
export function DormantAtRealSizes() {
  return (
    <div style={wrap}>
      <Chip label="sm · 24 — comment leaf">
        <AlbescentAvatar character={member} size="sm" />
      </Chip>
      <Chip label="md · 32 — praxis byline">
        <AlbescentAvatar character={member} size="md" />
      </Chip>
      <Chip label="42 — roster row">
        <AlbescentAvatar character={member} size={42} />
      </Chip>
      <Chip label="54 — roster lead, the largest mount today">
        <AlbescentAvatar character={member} size={54} />
      </Chip>
    </div>
  )
}

/** At and above the 64px gate the inert layer arrives and the band turns. No
 *  surface mounts a disc this large yet; this is what the tell will look like
 *  the moment one does — a faction hero, a profile identity band, a duel
 *  banner — with no edit to the component. */
export function AboveTheGate() {
  return (
    <div style={wrap}>
      <Chip label="64 — the gate">
        <AlbescentAvatar character={member} size={64} />
      </Chip>
      <Chip label="88 — large and alone">
        <AlbescentAvatar character={member} size={88} />
      </Chip>
    </div>
  )
}

/** Either side of the threshold, together — 54 beside 64 is the whole rule. */
export function EitherSideOfTheGate() {
  return (
    <div style={wrap}>
      <Chip label="54 · still">
        <AlbescentAvatar character={member} size={54} />
      </Chip>
      <Chip label="64 · turning">
        <AlbescentAvatar character={member} size={64} />
      </Chip>
    </div>
  )
}
