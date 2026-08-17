/**
 * Inline SVG pseudo-thumbnails. Each archetype wraps these in their own frame.
 * Lifted from the design handoff's photoArt maps but consolidated into one
 * file with a single keyed lookup so any archetype can reference any glyph.
 */
import type { MediaArtKey } from "./useMediaArt";
// The before/after plates letter their captions in IM Fell English, which ships
// in the lazily-fetched faction sheet (#2079). Any archetype may reference any
// glyph here, including the unaffiliated composer, so this file asks for the
// sheet itself rather than relying on a faction dispatch (#1293 records that this
// family outlived the token that named it).
import "../../../factionFaces";

interface MediaArtProps {
  art: MediaArtKey;
  width?: number;
  height?: number;
}

export default function MediaArt({
  art,
  width = 140,
  height = 100,
}: MediaArtProps) {
  switch (art) {
    case "turnstile":
      return (
        <svg
          viewBox="0 0 140 100"
          preserveAspectRatio="xMidYMid slice"
          width={width}
          height={height}
        >
          <rect width="140" height="100" fill="#1a1f15" />
          <rect x="40" y="20" width="60" height="80" fill="#2fa56a" />
          <rect x="55" y="40" width="30" height="50" fill="#1a1f15" />
          <circle cx="70" cy="55" r="8" fill="#7ee5a3" />
          <line
            x1="70"
            y1="55"
            x2="90"
            y2="55"
            stroke="#fff5d9"
            strokeWidth="3"
          />
          <rect
            x="30"
            y="80"
            width="80"
            height="20"
            fill="#5c4631"
            opacity="0.5"
          />
        </svg>
      );
    case "shoes":
      return (
        <svg
          viewBox="0 0 140 100"
          preserveAspectRatio="xMidYMid slice"
          width={width}
          height={height}
        >
          <rect width="140" height="100" fill="#2fa56a" />
          <ellipse cx="45" cy="65" rx="22" ry="10" fill="#1a1f15" />
          <ellipse cx="95" cy="65" rx="22" ry="10" fill="#1a1f15" />
          <ellipse cx="45" cy="62" rx="20" ry="8" fill="#fff5d9" />
          <ellipse cx="95" cy="62" rx="20" ry="8" fill="#fff5d9" />
          <line
            x1="40"
            y1="60"
            x2="50"
            y2="60"
            stroke="#1a1f15"
            strokeWidth="1.5"
          />
          <line
            x1="90"
            y1="60"
            x2="100"
            y2="60"
            stroke="#1a1f15"
            strokeWidth="1.5"
          />
        </svg>
      );
    case "fruit":
      return (
        <svg
          viewBox="0 0 140 100"
          preserveAspectRatio="xMidYMid slice"
          width={width}
          height={height}
        >
          <rect width="140" height="100" fill="#fff5d9" />
          <rect x="10" y="60" width="120" height="40" fill="#5c4631" />
          {[20, 40, 60, 80, 100, 120].map((x, i) => (
            <circle
              key={i}
              cx={x}
              cy={50}
              r={8}
              fill={i % 2 ? "#d97757" : "#e8b04a"}
            />
          ))}
          <rect x="30" y="20" width="80" height="20" fill="#1f7a4d" />
        </svg>
      );
    case "crowd":
      return (
        <svg
          viewBox="0 0 140 100"
          preserveAspectRatio="xMidYMid slice"
          width={width}
          height={height}
        >
          <rect width="140" height="100" fill="#0e4d2a" />
          {Array.from({ length: 14 }).map((_, i) => {
            const x = 8 + (i % 7) * 19;
            const y = 35 + Math.floor(i / 7) * 30;
            return (
              <g key={i}>
                <circle cx={x} cy={y} r={6} fill="#f5efd9" />
                <rect
                  x={x - 7}
                  y={y + 5}
                  width={14}
                  height={20}
                  fill="#f5efd9"
                />
              </g>
            );
          })}
          <rect x="30" y="15" width="80" height="14" fill="#f5efd9" />
        </svg>
      );
    case "eye":
      return (
        <svg
          viewBox="0 0 140 100"
          preserveAspectRatio="xMidYMid slice"
          width={width}
          height={height}
        >
          <rect width="140" height="100" fill="#0f1a12" />
          <ellipse cx="70" cy="50" rx="58" ry="22" fill="#f5efd9" />
          <circle cx="70" cy="50" r="20" fill="#0f1a12" />
          <circle cx="70" cy="50" r="10" fill="#15803d" />
          <circle cx="66" cy="45" r="3" fill="#f5efd9" />
        </svg>
      );
    case "tentacle":
      return (
        <svg
          viewBox="0 0 140 100"
          preserveAspectRatio="xMidYMid slice"
          width={width}
          height={height}
        >
          <rect width="140" height="100" fill="#d6efc4" />
          <path
            d="M0,80 Q30,60 50,75 T90,55 Q110,45 140,60 L140,100 L0,100 Z"
            fill="#15803d"
          />
          <path
            d="M20,40 Q35,25 55,35 Q70,42 60,55 Q50,68 35,60 Q22,52 20,40 Z"
            fill="#0e4d2a"
          />
          {Array.from({ length: 8 }).map((_, i) => (
            <circle
              key={i}
              cx={28 + i * 4}
              cy={45 + (i % 2) * 4}
              r={2}
              fill="#7dd86b"
            />
          ))}
        </svg>
      );
    case "spread":
      return (
        <svg
          viewBox="0 0 140 100"
          preserveAspectRatio="xMidYMid slice"
          width={width}
          height={height}
        >
          <rect width="140" height="100" fill="#f5efd9" />
          <rect x="10" y="10" width="55" height="80" fill="#15803d" />
          <rect
            x="75"
            y="10"
            width="55"
            height="80"
            fill="none"
            stroke="#0f1a12"
            strokeWidth="1"
          />
          {Array.from({ length: 10 }).map((_, i) => (
            <line
              key={i}
              x1={78}
              y1={18 + i * 7}
              x2={127}
              y2={18 + i * 7}
              stroke="#0f1a12"
              strokeWidth="0.5"
            />
          ))}
          <circle cx="37" cy="40" r="15" fill="#7dd86b" />
        </svg>
      );
    case "pan":
      return (
        <svg
          viewBox="0 0 140 100"
          preserveAspectRatio="xMidYMid slice"
          width={width}
          height={height}
        >
          <rect width="140" height="100" fill="#3a3a40" />
          <ellipse cx="70" cy="55" rx="48" ry="32" fill="#1a1a1f" />
          <ellipse cx="70" cy="50" rx="44" ry="28" fill="#5c4a2c" />
          <path
            d="M40,42 Q55,30 75,38 Q92,46 80,62 Q66,72 50,64 Q40,55 40,42 Z"
            fill="#f4d97a"
          />
          <line
            x1="115"
            y1="50"
            x2="135"
            y2="48"
            stroke="#1a1a1f"
            strokeWidth="6"
            strokeLinecap="round"
          />
        </svg>
      );
    case "drawing":
      return (
        <svg
          viewBox="0 0 140 100"
          preserveAspectRatio="xMidYMid slice"
          width={width}
          height={height}
        >
          <rect width="140" height="100" fill="#fffefa" />
          <path
            d="M30,80 Q45,40 60,50 Q75,60 70,30"
            stroke="#1a1a20"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          <circle
            cx="100"
            cy="40"
            r="10"
            fill="none"
            stroke="#1a1a20"
            strokeWidth="2"
          />
          <line
            x1="92"
            y1="48"
            x2="84"
            y2="56"
            stroke="#1a1a20"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    case "ticket":
      return (
        <svg
          viewBox="0 0 140 100"
          preserveAspectRatio="xMidYMid slice"
          width={width}
          height={height}
        >
          <rect width="140" height="100" fill="#fdf6dc" />
          <rect
            x="6"
            y="14"
            width="128"
            height="72"
            fill="#fffbe9"
            stroke="#7c2d12"
            strokeWidth="1"
          />
          <line
            x1="100"
            y1="14"
            x2="100"
            y2="86"
            stroke="#7c2d12"
            strokeWidth="0.5"
            strokeDasharray="2 3"
          />
          <text
            x="14"
            y="32"
            fontFamily="Courier Prime, monospace"
            fontSize="9"
            fill="#1a1308"
            fontWeight="700"
          >
            SAN JOAQUIN
          </text>
          <text
            x="14"
            y="62"
            fontFamily="Bebas Neue, sans-serif"
            fontSize="22"
            fill="#7c2d12"
            letterSpacing="2"
          >
            $31.00
          </text>
        </svg>
      );
    case "window":
      return (
        <svg
          viewBox="0 0 140 100"
          preserveAspectRatio="xMidYMid slice"
          width={width}
          height={height}
        >
          <rect width="140" height="100" fill="#0c4a6e" />
          <rect x="0" y="0" width="140" height="55" fill="#7a93b3" />
          <rect x="0" y="55" width="140" height="45" fill="#8b6f4a" />
          <rect
            x="0"
            y="0"
            width="140"
            height="100"
            fill="none"
            stroke="#1a1308"
            strokeWidth="6"
          />
          <circle cx="105" cy="22" r="7" fill="#f4d97a" />
        </svg>
      );
    case "stamp":
      return (
        <svg
          viewBox="0 0 140 100"
          preserveAspectRatio="xMidYMid slice"
          width={width}
          height={height}
        >
          <rect width="140" height="100" fill="#fdf6dc" />
          <circle
            cx="70"
            cy="50"
            r="34"
            fill="none"
            stroke="#7c2d12"
            strokeWidth="3"
          />
          <text
            x="70"
            y="46"
            fontFamily="Bebas Neue, sans-serif"
            fontSize="12"
            textAnchor="middle"
            fill="#7c2d12"
            letterSpacing="1"
          >
            ARRIVED
          </text>
          <text
            x="70"
            y="60"
            fontFamily="Courier Prime, monospace"
            fontSize="7"
            textAnchor="middle"
            fill="#7c2d12"
          >
            SAN PEDRO
          </text>
        </svg>
      );
    case "before":
      return (
        <svg
          viewBox="0 0 140 100"
          preserveAspectRatio="xMidYMid slice"
          width={width}
          height={height}
        >
          <rect width="140" height="100" fill="#0a0a0e" />
          <rect x="20" y="20" width="100" height="60" fill="#2a2a30" />
          <circle
            cx="70"
            cy="40"
            r="10"
            fill="none"
            stroke="#5a5a64"
            strokeWidth="2"
          />
          <line
            x1="60"
            y1="50"
            x2="80"
            y2="30"
            stroke="#7a1a1a"
            strokeWidth="2.5"
          />
          <text
            x="70"
            y="74"
            fontFamily="IM Fell English, serif"
            fontSize="9"
            textAnchor="middle"
            fill="#ece6d6"
            fontStyle="italic"
          >
            before
          </text>
        </svg>
      );
    case "after":
      return (
        <svg
          viewBox="0 0 140 100"
          preserveAspectRatio="xMidYMid slice"
          width={width}
          height={height}
        >
          <rect width="140" height="100" fill="#f8e8a8" />
          <circle
            cx="70"
            cy="40"
            r="14"
            fill="#fffce8"
            stroke="#5a5a64"
            strokeWidth="1.5"
          />
          <text
            x="70"
            y="74"
            fontFamily="IM Fell English, serif"
            fontSize="9"
            textAnchor="middle"
            fill="#0a0a0e"
            fontStyle="italic"
          >
            after
          </text>
        </svg>
      );
    case "bulb":
      return (
        <svg
          viewBox="0 0 140 100"
          preserveAspectRatio="xMidYMid slice"
          width={width}
          height={height}
        >
          <rect width="140" height="100" fill="#ece6d6" />
          <ellipse
            cx="70"
            cy="48"
            rx="18"
            ry="22"
            fill="#fff"
            stroke="#0a0a0e"
            strokeWidth="1"
          />
          <rect x="62" y="68" width="16" height="8" fill="#5a5a64" />
          <rect x="60" y="76" width="20" height="4" fill="#2a2a30" />
        </svg>
      );
    case "leaf":
      return (
        <svg
          viewBox="0 0 140 100"
          preserveAspectRatio="xMidYMid slice"
          width={width}
          height={height}
        >
          <rect width="140" height="100" fill="#fff5d9" />
          <path
            d="M70,15 Q30,30 30,55 Q30,85 70,90 Q110,85 110,55 Q110,30 70,15 Z"
            fill="#1f7a4d"
          />
          <path
            d="M70,15 L70,90"
            stroke="#fff5d9"
            strokeWidth="1"
            opacity="0.5"
          />
        </svg>
      );
    case "recipe":
      return (
        <svg
          viewBox="0 0 140 100"
          preserveAspectRatio="xMidYMid slice"
          width={width}
          height={height}
        >
          <rect width="140" height="100" fill="#d4a574" />
          <rect
            x="10"
            y="14"
            width="120"
            height="72"
            fill="#fff8e3"
            stroke="#7a5c2a"
            strokeWidth="1"
          />
          {Array.from({ length: 6 }).map((_, i) => (
            <line
              key={i}
              x1="20"
              y1={28 + i * 10}
              x2="120"
              y2={28 + i * 10}
              stroke="#a16207"
              strokeWidth="0.4"
              opacity="0.6"
            />
          ))}
        </svg>
      );
    case "audio":
      return (
        <svg
          viewBox="0 0 140 100"
          preserveAspectRatio="xMidYMid slice"
          width={width}
          height={height}
        >
          <rect width="140" height="100" fill="#1a1a1f" />
          <g transform="translate(20,30)">
            {[14, 28, 38, 22, 32, 18, 30, 12, 26, 36, 20, 30, 14, 28, 22].map(
              (h, i) => (
                <rect
                  key={i}
                  x={i * 7}
                  y={40 - h}
                  width="4"
                  height={h}
                  fill="#4ade80"
                />
              ),
            )}
          </g>
        </svg>
      );
    case "video":
      return (
        <svg
          viewBox="0 0 140 100"
          preserveAspectRatio="xMidYMid slice"
          width={width}
          height={height}
        >
          <rect width="140" height="100" fill="#1a1a20" />
          <rect x="0" y="0" width="14" height="100" fill="#0a0a0e" />
          <rect x="126" y="0" width="14" height="100" fill="#0a0a0e" />
          {Array.from({ length: 6 }).map((_, i) => (
            <rect
              key={i}
              x="2"
              y={6 + i * 16}
              width="10"
              height="10"
              fill="#1a1a20"
              stroke="#5a5a64"
            />
          ))}
          {Array.from({ length: 6 }).map((_, i) => (
            <rect
              key={i}
              x="128"
              y={6 + i * 16}
              width="10"
              height="10"
              fill="#1a1a20"
              stroke="#5a5a64"
            />
          ))}
          <polygon points="58,38 58,62 86,50" fill="#fff" />
        </svg>
      );
    case "page":
    default:
      return (
        <svg
          viewBox="0 0 140 100"
          preserveAspectRatio="xMidYMid slice"
          width={width}
          height={height}
        >
          <rect width="140" height="100" fill="#f6efd9" />
          {Array.from({ length: 12 }).map((_, i) => (
            <line
              key={i}
              x1="14"
              y1={14 + i * 7}
              x2="126"
              y2={14 + i * 7}
              stroke="#5a5a64"
              strokeWidth="0.4"
            />
          ))}
        </svg>
      );
  }
}
