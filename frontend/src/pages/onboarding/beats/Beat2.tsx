import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { K, S, T } from '../Wisp'
import type { BeatProps } from './types'
import './beat2.css'

// Wisp.tsx draws the same paths but does not export them, and this beat needs its own hair and three hats in one SVG.
const HAIR =
  'M18 72 C 18 56, 26 46, 32 36 C 34 42, 38 46, 42 46 C 38 32, 42 16, 52 4 C 54 16, 60 24, 66 30 C 68 24, 72 20, 76 18 C 74 30, 82 46, 82 70 Z'
const BALD =
  'M50 104 C 30 104, 18 90, 18 72 C 18 52, 32 38, 50 38 C 68 38, 82 52, 82 70 C 82 90, 70 104, 50 104 Z'

// kx/kr: which way each hat flies when flicked off.
const HATS = [
  {
    cls: 'b2-a1',
    kx: 44,
    kr: 120,
    art: (
      <>
        <path d="M21 50 L 23 18 L 36 30 L 50 -6 L 64 30 L 77 18 L 79 50 Z" fill={S(3)} stroke={K} strokeWidth="2" strokeLinejoin="round" />
        <rect x="21" y="40" width="58" height="10" fill={S(3)} stroke={K} strokeWidth="2" />
        <circle cx="50" cy="-6" r="3.6" fill={S(1)} stroke={K} strokeWidth="1.2" />
        <circle cx="50" cy="45" r="3" fill={S(6)} />
      </>
    ),
  },
  {
    cls: 'b2-a2',
    kx: -48,
    kr: -100,
    art: (
      <>
        <path d="M18 52 L 54 -30 L 82 52 Z" fill={S(6)} stroke={K} strokeWidth="2" strokeLinejoin="round" />
        <ellipse cx="50" cy="52" rx="38" ry="8" fill={S(6)} stroke={K} strokeWidth="2" />
        <path d="M54 4 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3 Z" fill={S(3)} />
      </>
    ),
  },
  {
    cls: 'b2-a3',
    kx: 40,
    kr: 150,
    art: (
      <>
        <ellipse cx="50" cy="47" rx="35" ry="7.5" fill={T} stroke={K} strokeWidth="2" />
        <path d="M73 16 C 92 13, 92 37, 69 35" fill="none" stroke={K} strokeWidth="8.5" strokeLinecap="round" />
        <path d="M73 16 C 92 13, 92 37, 69 35" fill="none" stroke={T} strokeWidth="4.5" strokeLinecap="round" />
        <path d="M26 8 C 26 34, 36 46, 50 46 C 64 46, 74 34, 74 8 Z" fill={T} stroke={K} strokeWidth="2" strokeLinejoin="round" />
        <path d="M27.5 21 C 40 27, 60 27, 72.5 21" fill="none" stroke={S(1)} strokeWidth="3.4" />
        <ellipse cx="50" cy="8" rx="24" ry="5.5" fill={S(2)} stroke={K} strokeWidth="2" />
        <path d="M43 -2 q-5 -6 0 -12 q5 -6 0 -12 M57 -4 q5 -6 0 -12" fill="none" stroke={T} strokeWidth="2.2" strokeLinecap="round" opacity=".6" />
      </>
    ),
  },
]

export default function Beat2({ confidence }: BeatProps) {
  const { t } = useTranslation('onboarding')
  const id = useId().replace(/:/g, '')
  return (
    <div className="b2-row">
      <div className="b2-pic">
        <div className="b2-ring"><div className="ob-disc" /></div>
        <svg className="msc shy b2-wisp" viewBox="0 -12 100 122" aria-hidden="true" style={{ ['--conf' as string]: confidence }}>
          <defs>
            <linearGradient id={`${id}rain`} gradientUnits="userSpaceOnUse" x1="18" y1="4" x2="82" y2="104">
              {Array.from({ length: 7 }, (_, i) => (
                <stop key={i} offset={(i / 6).toFixed(3)} style={{ stopColor: `color-mix(in srgb, ${S(i + 1)} calc(10% + var(--conf) * 48%), ${T})` }} />
              ))}
            </linearGradient>
            <radialGradient id={`${id}shade`} gradientUnits="userSpaceOnUse" gradientTransform="translate(18 4) scale(64 100)" cx=".42" cy=".62" r=".64">
              <stop className="wshade-mid" offset="55%" />
              <stop offset="100%" style={{ stopColor: S(6), stopOpacity: 0.3 }} />
            </radialGradient>
            {/* The hair is clipped to the head's width so a squash can never make it wider than the head. */}
            <clipPath id={`${id}clip`}><rect x="16.7" y="-60" width="66.6" height="180" /></clipPath>
          </defs>
          <g className="b2-tada">
            <g className="msway">
              <g className="b2-hair">
                <path clipPath={`url(#${id}clip)`} d={HAIR} fill={`url(#${id}rain)`} stroke={K} strokeWidth="5.2" strokeLinejoin="round" />
              </g>
              <path d={BALD} fill={`url(#${id}rain)`} />
              <path d={BALD} fill={`url(#${id}shade)`} stroke={K} strokeWidth="2.6" strokeLinejoin="round" />
              <g className="b2-hair">
                <path d={HAIR} fill={`url(#${id}rain)`} />
                <path d={HAIR} fill={`url(#${id}shade)`} />
              </g>
              <ellipse className="blush" cx="27" cy="84" rx="8" ry="4.2" />
              <ellipse className="blush" cx="73" cy="84" rx="8" ry="4.2" />
              <g className="eyes">
                <circle cx="38" cy="70" r="10.5" fill={T} stroke={K} strokeWidth="2.2" />
                <circle cx="62" cy="70" r="10.5" fill={T} stroke={K} strokeWidth="2.2" />
                <g className="mpup">
                  <circle cx="38" cy="71" r="5" fill={K} />
                  <circle cx="62" cy="71" r="5" fill={K} />
                  <circle cx="36.4" cy="69.2" r="1.6" fill={T} />
                  <circle cx="60.4" cy="69.2" r="1.6" fill={T} />
                </g>
              </g>
              <path className="lids" d="M28.5 70 q9.5 8 19 0 M52.5 70 q9.5 8 19 0" fill="none" stroke={K} strokeWidth="2.6" strokeLinecap="round" />
              <path d="M46 88 q4 3.4 8 0" fill="none" stroke={K} strokeWidth="2" strokeLinecap="round" />
              <ellipse className="mo" cx="50" cy="89.6" rx="3.6" ry="4.6" fill={K} />
              {HATS.map(({ cls, kx, kr, art }) => (
                <g key={cls} className={`b2-acc ${cls}`} style={{ ['--kx' as string]: `${kx}px`, ['--kr' as string]: `${kr}deg` }}>{art}</g>
              ))}
            </g>
          </g>
        </svg>
      </div>
      <div className="b2-text">
        <span className="ob-cap boing">{t('beats.b2.cap')}</span>
        <span className="ob-lora b2-names">
          {(['n1', 'n2', 'n3'] as const).map((k) => (
            <span key={k} className="b2-nm">{t(`beats.b2.${k}`)}</span>
          ))}
        </span>
        <span className="ob-srule ob-draw" />
        <span className="boing b2-sub">{t('beats.b2.sub')}</span>
      </div>
    </div>
  )
}
