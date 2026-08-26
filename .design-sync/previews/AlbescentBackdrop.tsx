// AlbescentBackdrop preview (#2531) — A PASS-THROUGH WRAPPER. It renders
// WatercolorBackground, the site's own watercolour, and changes not one pixel;
// its static markup is byte-identical to the na fallback.
//
// THE ABSENCE OF A GROUND IS THE DRESS. There is exactly one route that
// dispatches a backdrop at all — CharacterProfile, via
// useFactionBackdrop(character.faction_slug) — so this surface is "the ground
// under a player's profile". Every other faction paints its own there.
// Albescent must NOT: a secret society whose members' profiles came with a page
// ground of their own would be visible from across the room (ADR-0027,
// ADR-0048), and the watercolour is what an unaffiliated player's profile
// stands on. The registration exists so the manifest can SAY that, deliberately,
// where the next reader looks — rather than say nothing, which reads two ways.
//
// The backdrop is a full-page `position:fixed; inset:0` atmosphere, so the
// stylesheet rule below re-scopes it to `absolute` to fill this card. The
// shipped app mounts it unchanged.
import { AlbescentBackdrop } from 'worldzero-frontend'

function Frame({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div style={{ position: 'relative', width: '100%', height: 300, overflow: 'hidden', borderRadius: 8 }}>
      <style>{`.bd-scope > div { position: absolute !important; inset: 0 !important; z-index: 0 !important; }`}</style>
      <div className="bd-scope" style={{ position: 'absolute', inset: 0 }}>{children}</div>
      <div style={{ position: 'relative', zIndex: 2, height: '100%', display: 'flex', alignItems: 'flex-end', padding: 16 }}>
        <span style={{ fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.85 }}>{label}</span>
      </div>
    </div>
  )
}

/** The wash a member's profile stands on — the same one an unaffiliated
 *  player's profile stands on, and that identity is the whole point. */
export function TheWashUnchanged() {
  return (
    <Frame label="Albescent · the ground is the na wash">
      <AlbescentBackdrop />
    </Frame>
  )
}
