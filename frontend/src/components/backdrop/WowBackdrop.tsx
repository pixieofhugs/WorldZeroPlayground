/**
 * Warriors of Whimsy full-page backdrop — a lo-fi pastel "desktop": soft pink field with a
 * dotted grid and a gentle corner glow. Theme-aware via the `.wow-backdrop`
 * rule in index.css. Fixed behind page content at z-index 0.
 */
export default function WowBackdrop() {
  return <div className="wow-backdrop" aria-hidden="true" />
}
