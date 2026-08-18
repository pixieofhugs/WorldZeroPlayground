// Is there ANY ink that clears 4.5:1 on both the compass blue and the vellum?
const lin = (c) => {
  c /= 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}
const L = (hex) => {
  const h = hex.replace('#', '')
  return (
    0.2126 * lin(parseInt(h.slice(0, 2), 16)) +
    0.7152 * lin(parseInt(h.slice(2, 4), 16)) +
    0.0722 * lin(parseInt(h.slice(4, 6), 16))
  )
}
// ink clears `floor` on ground g when either L >= floor*(Lg+.05)-.05  (lighter)
// or L <= (Lg+.05)/floor - .05  (darker).
const band = (g, floor) => ({
  lighterThan: floor * (L(g) + 0.05) - 0.05,
  darkerThan: (L(g) + 0.05) / floor - 0.05,
})
for (const g of ['#12151f', '#eadcb6', '#e0d2ac', '#f2e8ce']) {
  const b = band(g, 4.5)
  console.log(
    `${g}  L=${L(g).toFixed(5)}  clears 4.5:1 when L >= ${b.lighterThan.toFixed(5)} or L <= ${b.darkerThan.toFixed(5)}`,
  )
}
