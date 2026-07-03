/* ════════════════════════════════════════════════════════════════
   ALBESCENT — Atoms + Task Card
   Shared visual vocabulary for all Albescent surfaces.

   Physical archetype: VELLUM CORRESPONDENCE — pure white,
   Cormorant Garamond italic, surveyor's mark sigil, hairline
   borders. The card speaks in a whisper.

   Atoms exported:    AlbescentMark
   Task card exported: AlbescentCard (window.AlbescentCard)
   ════════════════════════════════════════════════════════════════ */

/* ── Witness scale ── */
const AL_WITNESS = [
  { v:1, label:"Unseeing"  },
  { v:2, label:"Glimpsed"  },
  { v:3, label:"Witnessed" },
  { v:4, label:"Verified"  },
  { v:5, label:"Inscribed" },
];

const alDistTotal = d => d.reduce((a,b) => a+b, 0);
const alDistAvg   = d => {
  const t = alDistTotal(d);
  return t ? d.reduce((a,c,i) => a+c*(i+1), 0) / t : 0;
};
const alStanding = avg => AL_WITNESS[Math.max(0, Math.min(4, Math.round(avg)-1))];

/* ════════════════════════════════════════════════════════════════
   ALBESCENT MARK — the surveyor's cross-hair sigil
   Outer ring (18% opacity) · inner ring (50%) ·
   4 cardinal tick marks · filled center dot.
   ════════════════════════════════════════════════════════════════ */
function AlbescentMark({ size = 20, color = "#1c1c1a", breathe = false, opacity = 1 }) {
  const c  = size / 2;
  const rO = size * 0.43;    /* outer ring */
  const rI = size * 0.235;   /* inner ring */
  const rD = size * 0.044;   /* center dot */
  const tS = rI + size * 0.025;   /* tick start — just past inner ring */
  const tE = tS + size * 0.13;    /* tick end */

  const tick = (deg) => {
    const a = deg * Math.PI / 180;
    return {
      x1: c + tS * Math.cos(a), y1: c + tS * Math.sin(a),
      x2: c + tE * Math.cos(a), y2: c + tE * Math.sin(a),
    };
  };

  return (
    <svg
      width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none"
      style={{
        display: "block", flexShrink: 0, opacity,
        animation: breathe ? "al-breathe 5.5s ease-in-out infinite" : "none",
      }}
    >
      <circle cx={c} cy={c} r={rO} stroke={color} strokeWidth={size*0.022} opacity={0.18}/>
      <circle cx={c} cy={c} r={rI} stroke={color} strokeWidth={size*0.038} opacity={0.5}/>
      {[0, 90, 180, 270].map((deg, i) => {
        const { x1, y1, x2, y2 } = tick(deg);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={size*0.038}/>;
      })}
      <circle cx={c} cy={c} r={rD} fill={color}/>
    </svg>
  );
}

/* ════════════════════════════════════════════════════════════════
   ALBESCENT TASK CARD — Vellum archetype
   Full-sized version for the faction page task grid.
   224px wide. Shows in the global task list at a smaller size
   via FactionTaskCard (the base DS component).
   ════════════════════════════════════════════════════════════════ */
function AlbescentCard({ title, description, level, points, onAcknowledge }) {
  const [ack, setAck] = React.useState(false);

  return (
    <div style={{
      width: 224,
      background: "#fff",
      border: "1px solid rgba(0,0,0,0.09)",
      boxShadow: "0 2px 18px rgba(0,0,0,0.055), 0 1px 3px rgba(0,0,0,0.04)",
      padding: "24px 20px 18px",
      fontFamily: "var(--al-font)",
    }}>
      {/* Centered sigil */}
      <div style={{ display:"flex", justifyContent:"center", marginBottom:16 }}>
        <AlbescentMark size={20} breathe/>
      </div>

      {/* Top rule */}
      <div style={{ height:1, background:"rgba(0,0,0,0.07)", marginBottom:13 }}/>

      {/* Eyebrow */}
      <div style={{
        fontSize:6, letterSpacing:"0.32em", textTransform:"uppercase",
        color:"rgba(0,0,0,0.24)", fontFamily:"var(--al-mono)", marginBottom:10,
      }}>Albescent</div>

      {/* Title */}
      <div style={{
        fontSize:18, fontStyle:"italic", fontWeight:300,
        lineHeight:1.28, color:"#1c1c1a", marginBottom:11,
      }}>{title}</div>

      {/* Description */}
      {description && (
        <div style={{
          fontSize:7.5, color:"rgba(28,28,26,0.42)", lineHeight:1.6,
          fontFamily:"var(--al-mono)", marginBottom:16,
          overflow:"hidden", display:"-webkit-box",
          WebkitLineClamp:3, WebkitBoxOrient:"vertical",
        }}>{description}</div>
      )}

      {/* CTA */}
      <div style={{ marginBottom:14 }}>
        <button
          onClick={() => { setAck(a => !a); onAcknowledge?.(); }}
          style={{
            background:"none", border:"none", padding:0, cursor:"pointer",
            fontSize:7, letterSpacing:"0.22em", textTransform:"uppercase",
            color: ack ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.32)",
            fontFamily:"var(--al-mono)",
            borderBottom:`1px solid ${ack ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.16)"}`,
            paddingBottom:1, transition:"all 250ms ease",
          }}
        >{ack ? "acknowledged" : "acknowledge"}</button>
      </div>

      {/* Footer */}
      <div style={{
        borderTop:"1px solid rgba(0,0,0,0.07)", paddingTop:11,
        display:"flex", justifyContent:"space-between", alignItems:"center",
      }}>
        <span style={{
          fontSize:6.5, letterSpacing:"0.2em", textTransform:"uppercase",
          color:"rgba(0,0,0,0.22)", fontFamily:"var(--al-mono)",
        }}>Lvl {level}</span>
        <span style={{ fontSize:14, fontWeight:300, color:"rgba(28,28,26,0.48)" }}>
          {points}
          <span style={{
            fontSize:6.5, marginLeft:3, letterSpacing:"0.1em",
            textTransform:"uppercase", fontFamily:"var(--al-mono)",
          }}>pts</span>
        </span>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   EXPORTS
   ════════════════════════════════════════════════════════════════ */
Object.assign(window, {
  AlbescentMark, AlbescentCard,
  AL_WITNESS, alDistTotal, alDistAvg, alStanding,
});
