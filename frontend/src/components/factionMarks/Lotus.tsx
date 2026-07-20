import type { CSSProperties } from "react";

/**
 * Lotus — the UA card's decorative ground mark, vendored from the design
 * bundle's `lotus.svg` (#839, ADR-0049).
 *
 * Inlined as a component rather than shipped behind an `<img>`: an external SVG
 * cannot read CSS custom properties, so an `<img src="lotus.svg">` would freeze
 * the design's five hexes into the markup and break in dark mode. Every fill and
 * stroke here resolves from `color` — set it from a faction token at the call
 * site and the mark follows the `[data-theme="dark"]` cascade for free.
 *
 * Geometry is the bundle's, unaltered: three rings of eight petals plus the
 * seed-pod circles, on the original 300x300 viewBox. The source's `feTurbulence`
 * ink-displacement filter is kept — it is what stops the petals reading as
 * clip-art.
 */

const OUTER_PETALS = [
  "M 150.0 138.0 C 190.0 104.4 190.0 63.6 165.0 30.0 C 158.3 18.0 141.8 18.0 135.0 30.0 C 110.0 63.6 110.0 104.4 150.0 138.0 Z",
  "M 158.5 141.5 C 210.5 146.0 239.4 117.2 245.5 75.8 C 249.2 62.5 237.5 50.8 224.2 54.5 C 182.8 60.6 154.0 89.5 158.5 141.5 Z",
  "M 162.0 150.0 C 195.6 190.0 236.4 190.0 270.0 165.0 C 282.0 158.3 282.0 141.8 270.0 135.0 C 236.4 110.0 195.6 110.0 162.0 150.0 Z",
  "M 158.5 158.5 C 154.0 210.5 182.8 239.4 224.2 245.5 C 237.5 249.2 249.2 237.5 245.5 224.2 C 239.4 182.8 210.5 154.0 158.5 158.5 Z",
  "M 150.0 162.0 C 110.0 195.6 110.0 236.4 135.0 270.0 C 141.8 282.0 158.3 282.0 165.0 270.0 C 190.0 236.4 190.0 195.6 150.0 162.0 Z",
  "M 141.5 158.5 C 89.5 154.0 60.6 182.8 54.5 224.2 C 50.8 237.5 62.5 249.2 75.8 245.5 C 117.2 239.4 146.0 210.5 141.5 158.5 Z",
  "M 138.0 150.0 C 104.4 110.0 63.6 110.0 30.0 135.0 C 18.0 141.8 18.0 158.3 30.0 165.0 C 63.6 190.0 104.4 190.0 138.0 150.0 Z",
  "M 141.5 141.5 C 146.0 89.5 117.2 60.6 75.8 54.5 C 62.5 50.8 50.8 62.5 54.5 75.8 C 60.6 117.2 89.5 146.0 141.5 141.5 Z",
];

const MID_PETALS = [
  "M 153.1 142.6 C 190.2 131.4 200.9 105.6 192.4 79.0 C 190.5 69.4 178.3 64.3 170.2 69.8 C 145.4 82.6 134.8 108.4 153.1 142.6 Z",
  "M 157.4 146.9 C 191.6 165.2 217.4 154.6 230.2 129.8 C 235.7 121.7 230.6 109.5 221.0 107.6 C 194.4 99.1 168.6 109.8 157.4 146.9 Z",
  "M 157.4 153.1 C 168.6 190.2 194.4 200.9 221.0 192.4 C 230.6 190.5 235.7 178.3 230.2 170.2 C 217.4 145.4 191.6 134.8 157.4 153.1 Z",
  "M 153.1 157.4 C 134.8 191.6 145.4 217.4 170.2 230.2 C 178.3 235.7 190.5 230.6 192.4 221.0 C 200.9 194.4 190.2 168.6 153.1 157.4 Z",
  "M 146.9 157.4 C 109.8 168.6 99.1 194.4 107.6 221.0 C 109.5 230.6 121.7 235.7 129.8 230.2 C 154.6 217.4 165.2 191.6 146.9 157.4 Z",
  "M 142.6 153.1 C 108.4 134.8 82.6 145.4 69.8 170.2 C 64.3 178.3 69.4 190.5 79.0 192.4 C 105.6 200.9 131.4 190.2 142.6 153.1 Z",
  "M 142.6 146.9 C 131.4 109.8 105.6 99.1 79.0 107.6 C 69.4 109.5 64.3 121.7 69.8 129.8 C 82.6 154.6 108.4 165.2 142.6 146.9 Z",
  "M 146.9 142.6 C 165.2 108.4 154.6 82.6 129.8 69.8 C 121.7 64.3 109.5 69.4 107.6 79.0 C 99.1 105.6 109.8 131.4 146.9 142.6 Z",
];

const INNER_PETALS = [
  "M 150.0 146.0 C 170.0 131.3 170.0 115.6 159.0 104.6 C 154.9 100.0 145.1 100.0 141.0 104.6 C 130.0 115.6 130.0 131.3 150.0 146.0 Z",
  "M 152.8 147.2 C 177.4 150.9 188.4 139.8 188.5 124.3 C 188.9 118.1 181.9 111.1 175.7 111.5 C 160.2 111.6 149.1 122.6 152.8 147.2 Z",
  "M 154.0 150.0 C 168.7 170.0 184.4 170.0 195.4 159.0 C 200.0 154.9 200.0 145.1 195.4 141.0 C 184.4 130.0 168.7 130.0 154.0 150.0 Z",
  "M 152.8 152.8 C 149.1 177.4 160.2 188.4 175.7 188.5 C 181.9 188.9 188.9 181.9 188.5 175.7 C 188.4 160.2 177.4 149.1 152.8 152.8 Z",
  "M 150.0 154.0 C 130.0 168.7 130.0 184.4 141.0 195.4 C 145.1 200.0 155.0 200.0 159.0 195.4 C 170.0 184.4 170.0 168.7 150.0 154.0 Z",
  "M 147.2 152.8 C 122.6 149.1 111.6 160.2 111.5 175.7 C 111.1 181.9 118.1 188.9 124.3 188.5 C 139.8 188.4 150.9 177.4 147.2 152.8 Z",
  "M 146.0 150.0 C 131.3 130.0 115.6 130.0 104.6 141.0 C 100.0 145.1 100.0 155.0 104.6 159.0 C 115.6 170.0 131.3 170.0 146.0 150.0 Z",
  "M 147.2 147.2 C 150.9 122.6 139.8 111.6 124.3 111.5 C 118.1 111.1 111.1 118.1 111.5 124.3 C 111.6 139.8 122.6 150.9 147.2 147.2 Z",
];

/** The seed pod at the heart of the flower — ten stamens around a centre. */
const PODS = [
  { cx: 159.0, cy: 150.0, r: 1.7 },
  { cx: 157.3, cy: 155.3, r: 1.7 },
  { cx: 152.8, cy: 158.6, r: 1.7 },
  { cx: 147.2, cy: 158.6, r: 1.7 },
  { cx: 142.7, cy: 155.3, r: 1.7 },
  { cx: 141.0, cy: 150.0, r: 1.7 },
  { cx: 142.7, cy: 144.7, r: 1.7 },
  { cx: 147.2, cy: 141.4, r: 1.7 },
  { cx: 152.8, cy: 141.4, r: 1.7 },
  { cx: 157.3, cy: 144.7, r: 1.7 },
  { cx: 150, cy: 150, r: 2.1 },
];

export interface FactionMarkProps {
  /** Rendered size in px, both axes. */
  size?: number;
  /**
   * The mark's ink. Any CSS colour — pass a faction token
   * (`var(--faction-ua-card-accent)`). Defaults to `currentColor` so the mark
   * inherits the surrounding text colour and never needs a hex.
   */
  color?: string;
  /**
   * The darker line colour for petal outlines. Defaults to a shade mixed from
   * {@link FactionMarkProps.color}, so one token still dresses the whole mark.
   */
  lineColor?: string;
  /** Overall opacity — the UA card floats the lotus as a faint ground wash. */
  opacity?: number;
  style?: CSSProperties;
  className?: string;
}

export default function Lotus({
  size = 300,
  color = "currentColor",
  lineColor,
  opacity = 1,
  style,
  className,
}: FactionMarkProps) {
  const line = lineColor ?? `color-mix(in srgb, ${color} 78%, black)`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 300 300"
      aria-hidden
      focusable="false"
      className={className}
      style={{ opacity, ...style }}
    >
      <defs>
        <radialGradient id="wz-lotus-wash" cx="50%" cy="52%" r="55%">
          <stop offset="0%" stopColor={color} stopOpacity={0.4} />
          <stop offset="45%" stopColor={color} stopOpacity={0.2} />
          <stop offset="100%" stopColor={color} stopOpacity={0.04} />
        </radialGradient>
        <radialGradient id="wz-lotus-wash-inner" cx="50%" cy="52%" r="55%">
          <stop offset="0%" stopColor={line} stopOpacity={0.34} />
          <stop offset="100%" stopColor={color} stopOpacity={0.1} />
        </radialGradient>
        <filter id="wz-lotus-ink" x="-12%" y="-12%" width="124%" height="124%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.016 0.022"
            numOctaves="2"
            seed="7"
            result="n"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="n"
            scale="4.0"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
      <g filter="url(#wz-lotus-ink)">
        <g fill="url(#wz-lotus-wash)">
          {OUTER_PETALS.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
        <g
          fill="none"
          stroke={line}
          strokeOpacity={0.42}
          strokeWidth={1.4}
          strokeLinejoin="round"
          strokeLinecap="round"
        >
          {OUTER_PETALS.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
        <g fill="url(#wz-lotus-wash-inner)">
          {MID_PETALS.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
        <g
          fill="none"
          stroke={line}
          strokeOpacity={0.5}
          strokeWidth={1.4}
          strokeLinejoin="round"
          strokeLinecap="round"
        >
          {MID_PETALS.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
        <g fill="url(#wz-lotus-wash-inner)">
          {INNER_PETALS.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
        <g
          fill="none"
          stroke={line}
          strokeOpacity={0.52}
          strokeWidth={1.3}
          strokeLinejoin="round"
          strokeLinecap="round"
        >
          {INNER_PETALS.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
        <g fill={color} fillOpacity={0.9}>
          {PODS.map((pod) => (
            <circle key={`${pod.cx}-${pod.cy}`} cx={pod.cx} cy={pod.cy} r={pod.r} />
          ))}
        </g>
      </g>
    </svg>
  );
}
