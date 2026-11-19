import { K, S, T } from './Wisp'

/** The contract's quill: ready, signing, drooping, sulking are all CSS on its wrapper. */
export default function Quill() {
  return (
    <svg viewBox="0 0 44 70" width="44" height="70">
      <path d="M32 2 C 46 16, 40 40, 19 53 L 13 62 L 10 60 L 15 50 C 8 30, 15 10, 32 2 Z" fill={T} stroke={K} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M30 8 L 12 60 M 21 34 l 9 -3 M 18 43 l 8 -3 M 20 38 l -6 -4" fill="none" stroke={K} strokeWidth="1.2" strokeLinecap="round" opacity=".5" />
      <path d="M13 62 L 10 60 L 7 68 Z" fill={S(6)} stroke={T} strokeWidth="1" strokeLinejoin="round" />
      <circle cx="24" cy="19" r="4" fill={K} />
      <circle cx="34" cy="23" r="4" fill={K} />
      <circle cx="24" cy="19" r="1.8" fill={T} />
      <circle cx="34" cy="23" r="1.8" fill={T} />
      <path className="ob-qlid" d="M19.5 19 a4.5 4.5 0 0 1 9 0 Z M29.5 23 a4.5 4.5 0 0 1 9 0 Z" fill={T} />
    </svg>
  )
}
