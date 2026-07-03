/* ════════════════════════════════════════════════════════════════
   ALBESCENT — Faction page components + activity feed
   Hero · Activity Cards · Witness Widget · Nav Badge · Data.
   Uses albescent-cards.jsx atoms. Exports on window.
   ════════════════════════════════════════════════════════════════ */

/* ── Activity data ── */
const AL_ACTIVITY = [
  {
    id:"a1", actor:"Keeper Vane", house:"Third House",
    action:"returned", time:"1d ago",
    task:"Tend the Archive in Silence", taskId:"archive-silence",
    refNo:"XIV", credits:40, kind:"returned",
    note:"All volumes restored and indexed. No record of passage remains.",
  },
  {
    id:"a2", actor:"Keeper Orin", house:"First House",
    action:"witnessed", time:"2d ago",
    task:"Walk the Perimeter at Dusk", taskId:"perimeter-dusk",
    refNo:"XI", credits:20, kind:"witnessed",
    note:"Movement confirmed. The circuit holds.",
  },
  {
    id:"a3", actor:"Keeper Sel", house:"Second House",
    action:"acknowledged", time:"3d ago",
    task:"Index the Unmarked Volumes", taskId:"index-unmarked",
    refNo:"XVII", credits:0, kind:"acknowledged",
    note:"Task received. No further acknowledgment.",
  },
  {
    id:"a4", actor:"Keeper Marsh", house:"Fourth House",
    action:"returned", time:"5d ago",
    task:"Seal and Store Before Departing", taskId:"seal-store",
    refNo:"IX", credits:30, kind:"returned",
    note:"Storage completed per protocol. Departed before light.",
  },
  {
    id:"a5", actor:"Keeper Vane", house:"Third House",
    action:"attended", time:"6d ago",
    task:"Count the Objects Without Touching", taskId:"count-objects",
    refNo:"XXI", credits:0, kind:"attended",
    note:"Forty-three objects accounted for. None disturbed.",
  },
  {
    id:"a6", actor:"Keeper Orin", house:"First House",
    action:"witnessed", time:"1w ago",
    task:"Tend the Archive in Silence", taskId:"archive-silence",
    refNo:"XIV", credits:40, kind:"witnessed",
    note:"Signal: Inscribed. Twelve keepers in accord.",
  },
];

const AL_TASKS = [
  {
    title:"Tend the Archive in Silence",
    description:"Retrieve, restore, and return. No record of your work need remain.",
    level:3, points:40,
  },
  {
    title:"Walk the Perimeter at Dusk",
    description:"Complete the circuit before darkness settles. Do not mark the path.",
    level:2, points:20,
  },
  {
    title:"Index the Unmarked Volumes",
    description:"Catalogue what has not been named. Add only what is necessary.",
    level:4, points:60,
  },
];

const ACTION_KIND = {
  acknowledged: { label:"acknowledged", shade:"rgba(28,28,26,0.28)" },
  attended:     { label:"attended",     shade:"rgba(28,28,26,0.46)" },
  returned:     { label:"returned",     shade:"rgba(28,28,26,0.64)" },
  witnessed:    { label:"witnessed",    shade:"rgba(28,28,26,0.82)" },
};

/* ════════════════════════════════════════════════════════════════
   AL NAV BADGE — faction membership indicator for the nav bar
   ════════════════════════════════════════════════════════════════ */
function AlNavBadge() {
  const { AlbescentMark } = window;
  return (
    <div style={{
      display:"inline-flex", alignItems:"center", gap:7,
      border:"1px solid rgba(0,0,0,0.12)",
      background:"rgba(255,255,255,0.6)",
      padding:"4px 10px",
    }}>
      <AlbescentMark size={11}/>
      <span style={{
        fontFamily:"var(--al-mono)", fontSize:8,
        letterSpacing:"0.18em", textTransform:"uppercase",
        color:"rgba(28,28,26,0.55)",
      }}>Albescent</span>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   AL HERO — faction page masthead
   Meditative and still. No terminal boot-up, no dramatic chrome.
   Just the name, the mark, and the purpose.
   ════════════════════════════════════════════════════════════════ */
function AlHero({ name, motto, blurb, stats }) {
  const { AlbescentMark } = window;
  return (
    <div className="al-sheet" style={{ marginBottom:32, overflow:"hidden" }}>

      {/* Faint background watermark */}
      <div style={{
        position:"absolute", top:"50%", left:"62%",
        transform:"translate(-50%,-50%)",
        pointerEvents:"none", zIndex:0,
        opacity:0.03,
      }}>
        <AlbescentMark size={220}/>
      </div>

      <div style={{
        position:"relative", zIndex:2,
        padding:"44px 48px 50px",
        display:"grid", gridTemplateColumns:"1fr auto",
        gap:56, alignItems:"center",
      }}>
        <div>
          {/* Pre-title eyebrow */}
          <div style={{
            fontFamily:"var(--al-mono)", fontSize:7.5,
            letterSpacing:"0.28em", textTransform:"uppercase",
            color:"rgba(28,28,26,0.22)", marginBottom:18, lineHeight:1.9,
          }}>
            <div>Faction · {name}</div>
            <div>Fourth Season · Active</div>
            <div>Unranked · By design</div>
          </div>

          {/* Faction name */}
          <div style={{
            fontFamily:"var(--al-font)", fontStyle:"italic",
            fontWeight:300, fontSize:76, lineHeight:0.92,
            color:"#1c1c1a", marginBottom:16,
            letterSpacing:"-0.015em",
          }}>{name}</div>

          {/* Motto */}
          <div style={{
            fontFamily:"var(--al-mono)", fontSize:9,
            letterSpacing:"0.34em", textTransform:"uppercase",
            color:"rgba(28,28,26,0.28)", marginBottom:20,
          }}>{motto}</div>

          {/* Blurb */}
          <p style={{
            fontFamily:"var(--al-mono)", fontSize:9.5, lineHeight:1.74,
            color:"rgba(28,28,26,0.46)", maxWidth:490, marginBottom:30,
          }}>{blurb}</p>

          {/* Stats */}
          <div style={{ display:"flex", gap:28, flexWrap:"wrap" }}>
            {stats.map(s => (
              <div key={s.label} style={{
                paddingTop:12,
                borderTop:"1px solid rgba(0,0,0,0.07)",
                minWidth:80,
              }}>
                <div style={{
                  fontFamily:"var(--al-font)", fontStyle:"italic",
                  fontWeight:300, fontSize:28, lineHeight:1,
                  color:"rgba(28,28,26,0.68)", marginBottom:5,
                }}>{s.value}</div>
                <div style={{
                  fontFamily:"var(--al-mono)", fontSize:7,
                  letterSpacing:"0.2em", textTransform:"uppercase",
                  color:"rgba(28,28,26,0.26)",
                }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Large mark — slowly breathing */}
        <div className="al-breathe" style={{ flexShrink:0 }}>
          <AlbescentMark size={106}/>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   AL ACTIVITY CARD — record feed item
   Styled like a formal logbook entry: quiet, precise, no color.
   ════════════════════════════════════════════════════════════════ */
function AlActivityCard({ item }) {
  const ak = ACTION_KIND[item.kind] || ACTION_KIND.acknowledged;
  return (
    <div className="al-activity-card" style={{ fontFamily:"var(--al-mono)" }}>

      {/* Actor row */}
      <div style={{
        display:"flex", justifyContent:"space-between",
        alignItems:"flex-start", gap:12, marginBottom:7,
      }}>
        <div>
          <div style={{
            fontFamily:"var(--al-font)", fontStyle:"italic",
            fontWeight:300, fontSize:14, lineHeight:1.2,
            color:"rgba(28,28,26,0.72)", marginBottom:2,
          }}>{item.actor}</div>
          <div style={{
            fontSize:7, letterSpacing:"0.16em", textTransform:"uppercase",
            color:"rgba(28,28,26,0.26)",
          }}>{item.house}</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
          <span style={{
            fontSize:6.5, letterSpacing:"0.18em", textTransform:"uppercase",
            color:ak.shade, borderBottom:`1px solid ${ak.shade}`, paddingBottom:1,
          }}>{ak.label}</span>
          <span style={{
            fontSize:7, letterSpacing:"0.06em",
            color:"rgba(28,28,26,0.2)",
          }}>{item.time}</span>
        </div>
      </div>

      {/* Task name */}
      <div style={{
        fontFamily:"var(--al-font)", fontStyle:"italic",
        fontWeight:300, fontSize:12.5, lineHeight:1.3,
        color:"rgba(28,28,26,0.6)", marginBottom:5,
      }}>{item.task}</div>

      {/* Meta row */}
      <div style={{
        display:"flex", gap:12, alignItems:"center",
        flexWrap:"wrap", marginBottom: item.note ? 5 : 0,
      }}>
        <span style={{ fontSize:7, letterSpacing:"0.12em", color:"rgba(28,28,26,0.24)" }}>
          Ref. {item.refNo}
        </span>
        {item.credits > 0 && (
          <span style={{ fontSize:7, letterSpacing:"0.1em", color:"rgba(28,28,26,0.32)" }}>
            {item.credits} pts
          </span>
        )}
      </div>

      {item.note && (
        <div style={{
          fontSize:8, fontStyle:"italic", fontFamily:"var(--al-font)",
          color:"rgba(28,28,26,0.36)", lineHeight:1.5,
        }}>{item.note}</div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   AL WITNESS WIDGET — consensus witness for the faction page
   Grayscale 1-5 circle marks: Unseeing → Inscribed.
   No colors — Albescent refuses the palette.
   ════════════════════════════════════════════════════════════════ */
function AlWitnessWidget({ taskId, taskLabel, baseDist }) {
  const { alDistAvg, alDistTotal, alStanding, AL_WITNESS } = window;
  const key = "al-witness-" + taskId;
  const [my, setMy] = React.useState(0);

  React.useEffect(() => {
    try {
      const v = +localStorage.getItem(key);
      if (v >= 1 && v <= 5) setMy(v);
    } catch(e) {}
  }, [key]);

  const cast = v => {
    const nv = my === v ? 0 : v;
    setMy(nv);
    try { nv ? localStorage.setItem(key, String(nv)) : localStorage.removeItem(key); } catch(e) {}
  };

  const live = baseDist.map((c, i) => c + (my === i+1 ? 1 : 0));
  const avg  = alDistAvg(live);
  const total = alDistTotal(live);
  const st   = alStanding(avg);

  const shades = [
    "rgba(0,0,0,0.16)",
    "rgba(0,0,0,0.30)",
    "rgba(0,0,0,0.48)",
    "rgba(0,0,0,0.66)",
    "rgba(0,0,0,0.84)",
  ];

  return (
    <div style={{
      border:"1px solid rgba(0,0,0,0.09)",
      background:"#fff",
      padding:"22px 24px",
      fontFamily:"var(--al-mono)",
    }}>
      {/* Header */}
      <div style={{
        fontSize:7, letterSpacing:"0.26em", textTransform:"uppercase",
        color:"rgba(28,28,26,0.24)", marginBottom:8,
      }}>Bear Witness</div>

      <div style={{
        fontFamily:"var(--al-font)", fontStyle:"italic",
        fontWeight:300, fontSize:13.5, color:"rgba(28,28,26,0.52)",
        lineHeight:1.38, marginBottom:20,
      }}>
        How completely was this task attended?<br/>
        <span style={{ color:"rgba(28,28,26,0.7)" }}>{taskLabel}</span>
      </div>

      {/* 5 circle marks */}
      <div style={{ display:"flex", gap:8, marginBottom:14 }}>
        {AL_WITNESS.map((s, i) => {
          const shade = shades[i];
          const on    = my >= s.v;
          const picked = my === s.v;
          return (
            <div key={s.v} style={{
              display:"flex", flexDirection:"column",
              alignItems:"center", gap:7, flex:1,
            }}>
              <button
                onClick={() => cast(s.v)}
                style={{
                  width:32, height:32, borderRadius:"50%", cursor:"pointer",
                  border:`1.5px solid ${shade}`,
                  background: on ? shade : "transparent",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  padding:0, transition:"all 200ms ease",
                }}
              >
                {picked && (
                  <div style={{
                    width:8, height:8, borderRadius:"50%", background:"#fff",
                  }}/>
                )}
              </button>
              <span style={{
                fontSize:5.5, letterSpacing:"0.06em", textAlign:"center",
                color:"rgba(28,28,26,0.28)", lineHeight:1.35,
              }}>{s.label}</span>
            </div>
          );
        })}
      </div>

      {/* Consensus readout */}
      <div style={{
        display:"flex", justifyContent:"space-between", alignItems:"center",
        paddingTop:13, borderTop:"1px solid rgba(0,0,0,0.07)",
      }}>
        <span style={{
          fontFamily:"var(--al-font)", fontStyle:"italic",
          fontWeight:300, fontSize:17, color:"rgba(28,28,26,0.58)",
        }}>{st.label}</span>
        <span style={{
          fontSize:8, letterSpacing:"0.12em",
          color:"rgba(28,28,26,0.26)",
        }}>{total} keepers</span>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   AL ACTIVITY FEED — full updates page version with filters
   ════════════════════════════════════════════════════════════════ */
function AlActivityFeed({ items }) {
  const [filter, setFilter] = React.useState("all");
  const FILTERS = [
    { id:"all",          name:"All" },
    { id:"acknowledged", name:"Acknowledged" },
    { id:"attended",     name:"Attended" },
    { id:"returned",     name:"Returned" },
    { id:"witnessed",    name:"Witnessed" },
  ];
  const rows = items.filter(i => filter === "all" || i.kind === filter);

  return (
    <div>
      <div style={{ display:"flex", gap:6, marginBottom:20, flexWrap:"wrap" }}>
        {FILTERS.map(f => {
          const on = filter === f.id;
          return (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{
              fontFamily:"var(--al-mono)", fontSize:7.5,
              letterSpacing:"0.14em", textTransform:"uppercase",
              padding:"4px 10px", cursor:"pointer",
              border:`1px solid ${on ? "rgba(0,0,0,0.28)" : "rgba(0,0,0,0.1)"}`,
              background: on ? "rgba(28,28,26,0.07)" : "transparent",
              color: on ? "rgba(28,28,26,0.65)" : "rgba(28,28,26,0.36)",
              transition:"all 120ms",
            }}>{f.name}</button>
          );
        })}
      </div>
      {rows.map(item => <AlActivityCard key={item.id} item={item}/>)}
      {rows.length === 0 && (
        <div style={{
          padding:"24px 0", fontSize:13, fontStyle:"italic",
          fontFamily:"var(--al-font)", color:"rgba(28,28,26,0.26)",
        }}>No entries match this filter.</div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   EXPORTS
   ════════════════════════════════════════════════════════════════ */
Object.assign(window, {
  AL_ACTIVITY, AL_TASKS, ACTION_KIND,
  AlNavBadge, AlHero, AlActivityCard, AlWitnessWidget, AlActivityFeed,
});
