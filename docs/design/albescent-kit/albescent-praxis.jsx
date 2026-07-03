/* ════════════════════════════════════════════════════════════════
   ALBESCENT — The Register (Praxis surfaces)
   A returned task is a filed account the faction now witnesses.
   The 1–5 rating becomes THE WITNESS SCALE — a presence ramp
   (unseeing → glimpsed → witnessed → verified → inscribed)
   that measures how completely the task was attended.

   Two surfaces:
     · RegisterIndex — the ledger of returned accounts + witness
     · EntryRead     — one returned account in full, with casting

   Uses albescent-cards.jsx atoms. Data + helpers on window.
   ════════════════════════════════════════════════════════════════ */

/* ── dataset ── */
const AL_PRAXES = [
  {
    id:        "archive-silence",
    refNo:     "XIV",
    task:      "Tend the Archive in Silence",
    status:    "witnessed",
    keeper:    "Keeper Vane",
    house:     "Third House",
    timestamp: "2026.04.21 // dawn",
    credits:   40,
    output:    "All volumes restored. The shelves hold their sequence without my name in them.",
    account: [
      "Arrived before the cataloguers. Worked from the east wing inward, restoring the displaced volumes to their documented positions. Did not open any that were sealed.",
      "Found three volumes with damaged spines. Wrapped them without notation — they will be found by whoever is meant to find them.",
      "Departed by the rear passage before the morning shift arrived. Left no note.",
    ],
    dist: [0, 1, 8, 14, 9],
  },
  {
    id:        "perimeter-dusk",
    refNo:     "XI",
    task:      "Walk the Perimeter at Dusk",
    status:    "witnessed",
    keeper:    "Keeper Orin",
    house:     "First House",
    timestamp: "2026.04.18 // dusk",
    credits:   20,
    output:    "The circuit holds. Three missing posts replaced before the light failed.",
    account: [
      "Walked the full eastern perimeter beginning at the point where the light first dims. Completed the circuit in forty-one minutes.",
      "Three boundary posts were missing from the northern quadrant. Replaced them from materials kept in the groundskeeper storage.",
      "Returned by the same route. Nothing disturbed.",
    ],
    dist: [0, 2, 5, 8, 4],
  },
  {
    id:        "seal-store",
    refNo:     "IX",
    task:      "Seal and Store Before Departing",
    status:    "returned",
    keeper:    "Keeper Marsh",
    house:     "Fourth House",
    timestamp: "2026.04.19 // before light",
    credits:   30,
    output:    "Stored. Departed. No trace visible from the road.",
    account: [
      "Completed sealing of the eastern archive annex using the wax from the cabinet — verified seal integrity before leaving.",
      "Checked the facade from the road before departing. No light. No sign. Left before the hour changed.",
    ],
    dist: [1, 3, 7, 4, 1],
  },
  {
    id:        "count-objects",
    refNo:     "XXI",
    task:      "Count the Objects Without Touching",
    status:    "witnessed",
    keeper:    "Keeper Vane",
    house:     "Third House",
    timestamp: "2026.04.20 // midday",
    credits:   25,
    output:    "Forty-three objects accounted for. None disturbed.",
    account: [
      "Entered the reading room at the appointed hour. Counted all objects on the central table by visual inspection only. Forty-three.",
      "One object appeared to have moved since the last count. It had not — the shadow deceived. Counted again from the doorway. Forty-three.",
      "Departed without confirming the count to anyone present.",
    ],
    dist: [0, 0, 3, 8, 5],
  },
];

/* ════════════════════════════════════════════════════════════════
   WITNESS BAR — mini grayscale histogram for index rows
   ════════════════════════════════════════════════════════════════ */
function WitnessBar({ dist }) {
  const { alDistAvg, alDistTotal, alStanding, AL_WITNESS } = window;
  const total = alDistTotal(dist);
  const avg   = alDistAvg(dist);
  const st    = alStanding(avg);
  const max   = Math.max(1, ...dist);
  const shades = ["rgba(0,0,0,0.14)","rgba(0,0,0,0.28)","rgba(0,0,0,0.44)","rgba(0,0,0,0.62)","rgba(0,0,0,0.80)"];

  return (
    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
      <div style={{ display:"flex", alignItems:"flex-end", gap:2, height:22 }}>
        {AL_WITNESS.map((s, i) => (
          <div key={s.v} style={{
            width:5,
            height: Math.max(2, (dist[i] / max) * 22),
            background: shades[i],
            opacity: dist[i] ? 0.88 : 0.12,
          }}/>
        ))}
      </div>
      <div>
        <div style={{
          fontFamily:"var(--al-font)", fontStyle:"italic",
          fontWeight:300, fontSize:13.5, lineHeight:1,
          color:"rgba(28,28,26,0.55)", marginBottom:2,
        }}>{st.label}</div>
        <div style={{
          fontFamily:"var(--al-mono)", fontSize:7,
          letterSpacing:"0.1em", color:"rgba(28,28,26,0.28)",
        }}>{total} witnesses</div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   REGISTER ROW — single row in the praxis index
   ════════════════════════════════════════════════════════════════ */
function RegisterRow({ p, href }) {
  return (
    <a href={href} style={{
      display:"grid",
      gridTemplateColumns:"56px 1fr auto 20px",
      alignItems:"center", gap:14,
      padding:"12px 0", textDecoration:"none", color:"inherit",
      borderBottom:"1px solid rgba(0,0,0,0.055)",
      transition:"background 150ms",
    }}
    onMouseEnter={e => e.currentTarget.style.background="rgba(0,0,0,0.016)"}
    onMouseLeave={e => e.currentTarget.style.background="transparent"}>

      {/* Ref + status */}
      <div style={{ textAlign:"right" }}>
        <div style={{
          fontFamily:"var(--al-mono)", fontSize:7.5,
          color:"rgba(28,28,26,0.30)", letterSpacing:"0.1em",
        }}>Ref. {p.refNo}</div>
        <div style={{
          fontFamily:"var(--al-mono)", fontSize:6,
          color:"rgba(28,28,26,0.2)", letterSpacing:"0.12em",
          textTransform:"uppercase", marginTop:2,
        }}>{p.status}</div>
      </div>

      {/* Task name + keeper */}
      <div>
        <div style={{
          fontFamily:"var(--al-font)", fontStyle:"italic",
          fontWeight:300, fontSize:15.5, lineHeight:1.2,
          color:"rgba(28,28,26,0.72)", marginBottom:3,
        }}>{p.task}</div>
        <div style={{
          fontFamily:"var(--al-mono)", fontSize:7.5,
          color:"rgba(28,28,26,0.30)", letterSpacing:"0.04em",
        }}>
          {p.keeper} · {p.house}
          <span style={{ marginLeft:8, color:"rgba(28,28,26,0.18)" }}>
            {p.timestamp.split("//")[0].trim()}
          </span>
        </div>
      </div>

      {/* Witness consensus mini-bar */}
      <WitnessBar dist={p.dist}/>

      {/* Arrow */}
      <span style={{ color:"rgba(28,28,26,0.22)", fontSize:11 }}>›</span>
    </a>
  );
}

/* ════════════════════════════════════════════════════════════════
   REGISTER INDEX — the full praxis index component
   ════════════════════════════════════════════════════════════════ */
function RegisterIndex({ praxes, hrefFor }) {
  const [filter, setFilter] = React.useState("all");
  const { alDistAvg, alDistTotal } = window;

  const FILTERS = [
    { id:"all",      name:"All returned" },
    { id:"verified", name:"Highly witnessed" },
    { id:"recent",   name:"This season" },
  ];

  const totalWitnesses = praxes.reduce((a, p) => a + alDistTotal(p.dist), 0);

  const rows = praxes.filter(p => {
    if (filter === "all")      return true;
    if (filter === "verified") return alDistAvg(p.dist) >= 3.5;
    return true;
  });

  return (
    <React.Fragment>
      {/* Masthead */}
      <div style={{
        display:"flex", justifyContent:"space-between",
        alignItems:"flex-start", gap:16,
        paddingBottom:22, marginBottom:20,
        borderBottom:"1px solid rgba(0,0,0,0.07)",
      }}>
        <div>
          <div style={{
            fontFamily:"var(--al-mono)", fontSize:7.5,
            letterSpacing:"0.28em", textTransform:"uppercase",
            color:"rgba(28,28,26,0.22)", marginBottom:9,
          }}>Albescent · witnessed accounts · fourth season</div>
          <div style={{
            fontFamily:"var(--al-font)", fontStyle:"italic",
            fontWeight:300, fontSize:36, lineHeight:1.0,
            color:"rgba(28,28,26,0.8)", marginBottom:6,
          }}>The Register</div>
          <div style={{ height:1, width:56, background:"rgba(0,0,0,0.12)", marginBottom:13 }}/>
          <p style={{
            fontFamily:"var(--al-mono)", fontSize:8.5, lineHeight:1.65,
            color:"rgba(28,28,26,0.4)", maxWidth:440, margin:0,
          }}>
            Tasks returned by the keepers. Each entry is a completed account —
            no more, no less. Cast your witness on any you have observed.
          </p>
        </div>
        <div style={{ display:"flex", gap:24, flexShrink:0 }}>
          {[{ v:praxes.length, l:"returned" },{ v:totalWitnesses, l:"witnesses" }].map(s => (
            <div key={s.l} style={{ textAlign:"right" }}>
              <div style={{
                fontFamily:"var(--al-font)", fontStyle:"italic",
                fontWeight:300, fontSize:32, lineHeight:1,
                color:"rgba(28,28,26,0.6)",
              }}>{s.v}</div>
              <div style={{
                fontFamily:"var(--al-mono)", fontSize:7,
                letterSpacing:"0.16em", color:"rgba(28,28,26,0.28)", marginTop:3,
              }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display:"flex", gap:6, marginBottom:16, flexWrap:"wrap" }}>
        {FILTERS.map(f => {
          const on = filter === f.id;
          return (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{
              fontFamily:"var(--al-mono)", fontSize:7.5, letterSpacing:"0.14em",
              textTransform:"uppercase", padding:"4px 10px", cursor:"pointer",
              border:`1px solid ${on ? "rgba(0,0,0,0.28)" : "rgba(0,0,0,0.1)"}`,
              background: on ? "rgba(28,28,26,0.07)" : "transparent",
              color: on ? "rgba(28,28,26,0.65)" : "rgba(28,28,26,0.36)",
              transition:"all 120ms",
            }}>{f.name}</button>
          );
        })}
        <span style={{
          fontSize:7, color:"rgba(28,28,26,0.22)",
          letterSpacing:"0.14em", marginLeft:6, alignSelf:"center",
        }}>{rows.length}/{praxes.length}</span>
      </div>

      {/* Column headers */}
      <div style={{
        display:"grid", gridTemplateColumns:"56px 1fr auto 20px",
        gap:14, paddingBottom:8, marginBottom:2,
        borderBottom:"1px solid rgba(0,0,0,0.07)",
      }}>
        {["Ref", "Account", "Witnesses", ""].map((h, i) => (
          <div key={i} style={{
            fontFamily:"var(--al-mono)", fontSize:6.5,
            letterSpacing:"0.22em", textTransform:"uppercase",
            color:"rgba(28,28,26,0.22)",
            textAlign: i === 2 ? "right" : "left",
          }}>{h}</div>
        ))}
      </div>

      {/* Rows */}
      <div>
        {rows.map(p => <RegisterRow key={p.id} p={p} href={hrefFor(p)}/>)}
        {rows.length === 0 && (
          <div style={{
            padding:"28px 0", fontSize:14, fontStyle:"italic",
            fontFamily:"var(--al-font)", color:"rgba(28,28,26,0.26)",
          }}>No entries match this filter.</div>
        )}
      </div>
    </React.Fragment>
  );
}

/* ════════════════════════════════════════════════════════════════
   WITNESS METER — grayscale distribution + standing label
   ════════════════════════════════════════════════════════════════ */
function WitnessMeter({ dist }) {
  const { alDistAvg, alDistTotal, alStanding, AL_WITNESS } = window;
  const total = alDistTotal(dist);
  const avg   = alDistAvg(dist);
  const st    = alStanding(avg);
  const max   = Math.max(1, ...dist);
  const shades = ["rgba(0,0,0,0.84)","rgba(0,0,0,0.66)","rgba(0,0,0,0.48)","rgba(0,0,0,0.30)","rgba(0,0,0,0.16)"];

  return (
    <div>
      <div style={{ display:"flex", alignItems:"baseline", gap:10, marginBottom:10 }}>
        <span style={{
          fontFamily:"var(--al-font)", fontStyle:"italic",
          fontWeight:300, fontSize:38, lineHeight:0.9,
          color:"rgba(28,28,26,0.65)",
        }}>{st.label}</span>
        <div style={{
          fontFamily:"var(--al-mono)", fontSize:8,
          letterSpacing:"0.12em", color:"rgba(28,28,26,0.30)",
        }}>{total} witnesses · avg {avg.toFixed(1)}</div>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:6, marginTop:14 }}>
        {AL_WITNESS.slice().reverse().map((s, i) => {
          const realIdx = 4 - i;
          const count   = dist[realIdx];
          return (
            <div key={s.v} style={{ display:"flex", alignItems:"center", gap:10 }}>
              <span style={{
                width:62, textAlign:"right",
                fontFamily:"var(--al-mono)", fontSize:7.5,
                letterSpacing:"0.06em", color:"rgba(28,28,26,0.38)",
              }}>{s.label}</span>
              <div style={{
                flex:1, height:10,
                background:"rgba(0,0,0,0.04)",
                border:"1px solid rgba(0,0,0,0.07)",
                position:"relative", overflow:"hidden",
              }}>
                <div style={{
                  position:"absolute", inset:0,
                  width:`${(count / max) * 100}%`,
                  background: shades[i],
                  opacity: count ? 0.88 : 0,
                  transition:"width 400ms ease",
                }}/>
              </div>
              <span style={{
                width:18, fontFamily:"var(--al-mono)", fontSize:9,
                color:"rgba(28,28,26,0.50)", textAlign:"right",
              }}>{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   WITNESS CASTER — interactive witness casting (with meter)
   Persists to localStorage. Albescent's equivalent of SignalCaster.
   ════════════════════════════════════════════════════════════════ */
function WitnessCaster({ praxisId, baseDist }) {
  const { alDistAvg, alDistTotal, AL_WITNESS } = window;
  const key = "al-witness-" + praxisId;
  const [my, setMy] = React.useState(0);

  React.useEffect(() => {
    try { const v = +localStorage.getItem(key); if (v>=1&&v<=5) setMy(v); } catch(e) {}
  }, [key]);

  const cast = v => {
    const nv = my === v ? 0 : v;
    setMy(nv);
    try { nv ? localStorage.setItem(key, String(nv)) : localStorage.removeItem(key); } catch(e) {}
  };

  const live = baseDist.map((c, i) => c + (my === i+1 ? 1 : 0));
  const shades = ["rgba(0,0,0,0.16)","rgba(0,0,0,0.30)","rgba(0,0,0,0.48)","rgba(0,0,0,0.66)","rgba(0,0,0,0.84)"];

  return (
    <div>
      <WitnessMeter dist={live}/>

      <div style={{ height:1, background:"rgba(0,0,0,0.07)", margin:"18px 0 14px" }}/>

      <div style={{
        fontFamily:"var(--al-mono)", fontSize:7, letterSpacing:"0.26em",
        textTransform:"uppercase", color:"rgba(28,28,26,0.24)", marginBottom:6,
      }}>Bear Witness</div>

      <div style={{
        fontFamily:"var(--al-font)", fontStyle:"italic",
        fontSize:12, color:"rgba(28,28,26,0.4)", marginBottom:16, lineHeight:1.4,
      }}>How completely was this task attended?</div>

      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
        {AL_WITNESS.map((s, i) => {
          const shade  = shades[i];
          const on     = my >= s.v;
          const picked = my === s.v;
          return (
            <div key={s.v} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
              <button onClick={() => cast(s.v)} style={{
                width:34, height:34, borderRadius:"50%", cursor:"pointer",
                border:`1.5px solid ${shade}`,
                background: on ? shade : "transparent",
                display:"flex", alignItems:"center", justifyContent:"center",
                padding:0, transition:"all 200ms ease",
              }}>
                {picked && <div style={{ width:8, height:8, borderRadius:"50%", background:"#fff" }}/>}
              </button>
              <span style={{
                fontSize:5.5, letterSpacing:"0.06em",
                textAlign:"center", color:"rgba(28,28,26,0.28)",
                fontFamily:"var(--al-mono)",
              }}>{s.label}</span>
            </div>
          );
        })}
      </div>

      <div style={{
        marginTop:14, fontSize:8.5, lineHeight:1.55,
        fontStyle:"italic", fontFamily:"var(--al-font)",
        color: my ? "rgba(28,28,26,0.58)" : "rgba(28,28,26,0.26)",
      }}>
        {my
          ? `Witnessed as ${AL_WITNESS[my-1].label}. ${alDistTotal(live)} keepers now in accord.`
          : "You have not yet cast your witness."}
        {my > 0 && (
          <span onClick={() => cast(my)} style={{
            marginLeft:8, cursor:"pointer",
            color:"rgba(28,28,26,0.42)",
            borderBottom:"1px solid rgba(28,28,26,0.2)",
          }}>amend</span>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   ENTRY READ — full single-account view (main column)
   ════════════════════════════════════════════════════════════════ */
function EntryRead({ p }) {
  const { AlbescentMark } = window;

  return (
    <div style={{ fontFamily:"var(--al-mono)", color:"#1c1c1a", position:"relative" }}>

      {/* Header band */}
      <div style={{
        display:"flex", alignItems:"center",
        justifyContent:"space-between", gap:14,
        padding:"10px 24px",
        borderBottom:"1px solid rgba(0,0,0,0.07)",
        background:"rgba(0,0,0,0.012)",
      }}>
        <span style={{
          display:"inline-flex", alignItems:"center", gap:9,
          fontSize:9, letterSpacing:"0.22em", textTransform:"uppercase",
          color:"rgba(28,28,26,0.28)",
        }}>
          <AlbescentMark size={12}/>
          Albescent · Ref. {p.refNo}
        </span>
        <span style={{
          fontSize:7, letterSpacing:"0.16em", textTransform:"uppercase",
          color:"rgba(28,28,26,0.26)",
          borderBottom:"1px solid rgba(28,28,26,0.18)", paddingBottom:1,
        }}>{p.status}</span>
      </div>

      <div style={{ padding:"28px 24px 32px" }}>

        {/* Task name */}
        <h1 style={{
          fontFamily:"var(--al-font)", fontStyle:"italic",
          fontWeight:300, fontSize:48, lineHeight:1.05,
          color:"#1c1c1a", margin:"0 0 14px",
        }}>{p.task}</h1>

        {/* Output quote */}
        <div style={{
          fontFamily:"var(--al-font)", fontStyle:"italic",
          fontWeight:300, fontSize:14.5, lineHeight:1.55,
          color:"rgba(28,28,26,0.52)",
          borderLeft:"2px solid rgba(0,0,0,0.09)",
          paddingLeft:14, marginBottom:22,
        }}>{p.output}</div>

        {/* Byline */}
        <div style={{
          display:"flex", alignItems:"center", gap:14,
          paddingBottom:20, marginBottom:6,
          borderBottom:"1px solid rgba(0,0,0,0.06)",
        }}>
          <div style={{
            width:36, height:36, borderRadius:"50%", flexShrink:0,
            border:"1px solid rgba(0,0,0,0.12)",
            background:"rgba(0,0,0,0.03)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontFamily:"var(--al-font)", fontSize:13, fontStyle:"italic",
            color:"rgba(28,28,26,0.45)",
          }}>K</div>
          <div>
            <div style={{
              fontFamily:"var(--al-font)", fontStyle:"italic",
              fontWeight:300, fontSize:14, color:"rgba(28,28,26,0.7)",
            }}>{p.keeper}</div>
            <div style={{
              fontSize:7.5, color:"rgba(28,28,26,0.34)",
              letterSpacing:"0.06em",
            }}>{p.house} · {p.timestamp}</div>
          </div>
          <div style={{ marginLeft:"auto", textAlign:"right", flexShrink:0 }}>
            <div style={{
              fontFamily:"var(--al-font)", fontStyle:"italic",
              fontWeight:300, fontSize:28, lineHeight:1,
              color:"rgba(28,28,26,0.55)",
            }}>{p.credits}</div>
            <div style={{
              fontFamily:"var(--al-mono)", fontSize:7,
              letterSpacing:"0.14em", color:"rgba(28,28,26,0.26)", marginTop:2,
            }}>pts returned</div>
          </div>
        </div>

        {/* Account section divider */}
        <div style={{ display:"flex", alignItems:"center", gap:10, margin:"18px 0 12px" }}>
          <div style={{ height:1, flex:1, background:"rgba(0,0,0,0.06)" }}/>
          <span style={{
            fontSize:7, letterSpacing:"0.24em", textTransform:"uppercase",
            color:"rgba(28,28,26,0.2)", whiteSpace:"nowrap",
            fontFamily:"var(--al-mono)",
          }}>Account</span>
          <div style={{ height:1, flex:1, background:"rgba(0,0,0,0.06)" }}/>
        </div>

        {/* Account lines */}
        <div style={{ marginBottom:8 }}>
          {p.account.map((line, i) => (
            <div key={i} style={{
              fontSize:9, lineHeight:1.8, color:"rgba(28,28,26,0.58)",
              paddingLeft:26, position:"relative", marginBottom:4,
              fontFamily:"var(--al-mono)",
            }}>
              <span style={{
                position:"absolute", left:0,
                color:"rgba(28,28,26,0.2)", fontSize:7.5,
              }}>{String(i).padStart(2,"0")}</span>
              {line}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   EXPORTS
   ════════════════════════════════════════════════════════════════ */
Object.assign(window, {
  AL_PRAXES,
  RegisterIndex, RegisterRow,
  WitnessBar, WitnessMeter, WitnessCaster,
  EntryRead,
});
