// Albescent Task Detail — hushed vellum lit from behind. Anatomy matched to the Unaffiliated
// detail: header (breadcrumb, faction line, title, Standing / In hand) beside one action panel
// (prism-ring worth + Acknowledge) → The Ask in full → the Register (praxis grid) → Said quietly.
// Albescent's difference is the light, not the layout: aurora breathing under the page, a prism
// ring that turns once every 28s, a spectrum edge that drifts. Props: theme, platform, state.
const SPECTRUM = 'linear-gradient(90deg,#e2433f,#e07a3a 14%,#e6b94f 28%,#4ade80 43%,#3aa0a4 57%,#60a5fa 72%,#f472b6 86%,#e2433f)';
const CONIC = 'conic-gradient(#e2433f,#e07a3a 14%,#e6b94f 28%,#4ade80 43%,#3aa0a4 57%,#60a5fa 72%,#f472b6 86%,#e2433f)';

const TOKENS = {
  light: {
    page:'#f2eee4', ink:'#26242e', muted:'#8a8478', dim:'#c3bdaf', hair:'rgba(0,0,0,.08)',
    surface:'#fdfbf5', border:'rgba(0,0,0,.09)', chip:'#26242e', chipText:'#faf7ef',
    proof:'#eae4d6', shadow:'0 16px 42px -28px rgba(40,30,20,0.32)',
    auroraOpacity:.26, auroraFilter:'blur(60px) saturate(.6)', auroraBlend:'normal', pageAurora:.14,
    foilOpacity:.2, foilFilter:'blur(56px) saturate(.75)', foilBlend:'multiply', sheenOpacity:.14, sheenBlend:'normal'
  },
  dark: {
    page:'#100f17', ink:'#f2ead8', muted:'#9c9384', dim:'#4e4b60', hair:'rgba(255,255,255,.1)',
    surface:'#15141d', border:'rgba(255,255,255,.09)', chip:'#f2ead8', chipText:'#14131b',
    proof:'#1f1d2b', shadow:'0 18px 46px -28px rgba(0,0,0,0.7)',
    auroraOpacity:.24, auroraFilter:'blur(52px) saturate(.95)', auroraBlend:'screen', pageAurora:.2,
    foilOpacity:.3, foilFilter:'blur(48px) saturate(1.1)', foilBlend:'screen', sheenOpacity:.16, sheenBlend:'screen'
  }
};

const LORA = "'Lora',Georgia,serif";
const MONO = "'Courier Prime','Courier New',monospace";

const ALB_CSS = `
@keyframes albdEdge { from { background-position:0% 50%; } to { background-position:300% 50%; } }
@keyframes albdDrift {
  0%   { transform:translate3d(-5%,-4%,0) scale(1.14) rotate(0deg); }
  50%  { transform:translate3d(5%,4%,0) scale(1.24) rotate(7deg); }
  100% { transform:translate3d(-5%,-4%,0) scale(1.14) rotate(0deg); }
}
@keyframes albdSpin { to { transform:rotate(360deg); } }
@keyframes albdFoilSpin { from { transform:translate(-50%,-50%) rotate(0deg); } to { transform:translate(-50%,-50%) rotate(360deg); } }
@keyframes albdSheen { 0%,100% { transform:translateX(-18%); } 50% { transform:translateX(18%); } }
@media (prefers-reduced-motion:reduce) {
  .albd-edge, .albd-aurora, .albd-ring, .albd-foil, .albd-sheen { animation:none !important; }
}
`;

const DATA = {
  author: { name: 'Wren Abalone', level: 4, href: '#/players/wren-abalone' },
  num: 207, title: 'Sit with something until it turns pale', level: 2, points: 18, multiplier: 1.25,
  inProgress: 6, completed: 14, topScore: '4.4', slotsOpen: 2, slotsMax: 3,
  brief: [
    'Choose one small thing and attend it without fixing it. A room, an argument you keep rehearsing, a plant that is not thriving. Attend it daily, briefly, and change nothing.',
    'At the end, record what changed in you — in as few words as will hold. Not what you learned. What changed.',
    'The Record asks for no portfolio and makes no announcement. An account returned unsigned is worth exactly as much as one signed.'
  ],
  praxis: [
    { title: 'Eleven mornings with a north window', author: 'A. Wintersleep', score: '4.4', votes: 19, when: '3 days ago', pts: 23, rec: 441, top: true },
    { title: 'The argument, unrehearsed', author: 'unsigned', score: '4.1', votes: 14, when: '6 days ago', pts: 21, rec: 437 },
    { title: 'An account of a dying fern', author: 'Mira Halloway', score: '3.8', votes: 9, when: '2 weeks ago', pts: 18, rec: 428 },
    { title: 'A hallway I had stopped seeing', author: 'B. Ashgrove', score: '4.2', votes: 16, when: '3 weeks ago', pts: 22, rec: 419 },
    { title: 'Nine evenings, no notes kept', author: 'one who reads', score: '3.9', votes: 11, when: 'last month', pts: 19, rec: 404 },
    { title: 'On waiting, which I mistook for this', author: 'The Keeper of Ledgers', score: '4.0', votes: 13, when: 'last month', pts: 20, rec: 396 }
  ],
  comments: [
    { author: 'B. Ashgrove', when: '4 days ago', body: 'Attending is not the same as waiting. I mistook the two for the first week and had to begin again.' },
    { author: 'The Keeper of Ledgers', when: '2 days ago', body: 'Beginning again is permitted and need not be reported. Only the ending is entered.' },
    { author: 'A. Wintersleep', when: '21 hours ago', body: 'Returned mine unsigned. It felt correct, which surprised me.' }
  ]
};

function AlbescentTaskDetail(props) {
  const theme = props.theme === 'dark' ? 'dark' : 'light';
  const desktop = props.platform === 'desktop';
  const t = TOKENS[theme];
  const d = Object.assign({}, DATA, props.data || {});
  const el = React.createElement;

  const [signed, setSigned] = React.useState(props.state === 'in_progress');
  const [sort, setSort] = React.useState('witnessed');
  const [showAllPraxis, setShowAllPraxis] = React.useState(false);
  React.useEffect(() => { setSigned(props.state === 'in_progress'); }, [props.state]);

  const yourPoints = Math.round(d.points * d.multiplier);
  const showMult = Math.abs(d.multiplier - 1) > 1e-9;

  const eyebrow = { fontFamily:MONO, fontSize:9.5, letterSpacing:'0.2em', textTransform:'uppercase', color:t.muted };
  const serif = (size, italic) => ({ fontFamily:LORA, fontWeight:600, fontStyle: italic ? 'italic' : 'normal', fontSize:size, color:t.ink, lineHeight:1.14 });
  const panel = { background:t.surface, border:`1px solid ${t.border}`, borderRadius:12, boxSizing:'border-box' };

  const aurora = (opacity) => el('div', { 'aria-hidden':true, style:{ position:'absolute', inset:0, overflow:'hidden', zIndex:0, pointerEvents:'none' } },
    el('div', { className:'albd-aurora', style:{ position:'absolute', inset:'-30%', opacity: opacity || t.auroraOpacity, filter:t.auroraFilter,
      mixBlendMode:t.auroraBlend, animation:'albdDrift 30s ease-in-out infinite',
      backgroundImage:[
        'radial-gradient(58% 46% at 10% 10%, #e2433f, transparent 100%)',
        'radial-gradient(54% 42% at 38% 2%, #e07a3a, transparent 100%)',
        'radial-gradient(56% 44% at 62% 14%, #e6b94f, transparent 100%)',
        'radial-gradient(58% 46% at 88% 8%, #4ade80, transparent 100%)',
        'radial-gradient(60% 48% at 96% 54%, #60a5fa, transparent 100%)',
        'radial-gradient(58% 46% at 58% 92%, #f472b6, transparent 100%)',
        'radial-gradient(56% 44% at 16% 88%, #3aa0a4, transparent 100%)'
      ].join(',') } })
  );

  // holographic foil: a slow rotating prism wheel + a diagonal sheen that passes over the page.
  // Absolutely positioned (never an ancestor of the sticky bars) so it can't trap position:sticky.
  const foil = el('div', { 'aria-hidden':true, style:{ position:'absolute', inset:0, overflow:'hidden', zIndex:0, pointerEvents:'none' } },
    el('div', { className:'albd-foil', style:{ position:'absolute', top:'50%', left:'50%', width:'240%', height:'240%',
      opacity:t.foilOpacity, filter:t.foilFilter, mixBlendMode:t.foilBlend, borderRadius:'50%',
      backgroundImage:CONIC, animation:'albdFoilSpin 44s linear infinite' } }),
    el('div', { className:'albd-sheen', style:{ position:'absolute', inset:'-20% -30%', opacity:t.sheenOpacity, mixBlendMode:t.sheenBlend,
      animation:'albdSheen 13s ease-in-out infinite',
      backgroundImage:'linear-gradient(104deg, transparent 12%, rgba(255,255,255,.55) 26%, #e6b94f 34%, #4ade80 42%, #3aa0a4 50%, #60a5fa 58%, #f472b6 66%, rgba(255,255,255,.55) 74%, transparent 88%)' } })
  );

  const sectionHead = (label, gloss) => el('div', { style:{ display:'flex', alignItems:'baseline', gap:10, marginBottom:14 } },
    el('span', { style:{ ...serif(desktop ? 17 : 15, true) } }, label),
    el('span', { style:{ flex:1, height:1, background:t.hair } }),
    gloss ? el('span', { style:{ ...eyebrow, fontSize:9 } }, gloss) : null
  );

  const ring = (size, value, label) => el('div', { style:{ position:'relative', width:size, height:size, flex:'0 0 auto' } },
    el('div', { className:'albd-ring', style:{ position:'absolute', inset:0, borderRadius:'50%', background:CONIC, animation:'albdSpin 46s linear infinite' } }),
    el('div', { style:{ position:'absolute', inset:7, borderRadius:'50%', background:t.surface, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', lineHeight:0.9 } },
      el('span', { style:{ ...serif(size * 0.29) } }, value),
      el('span', { style:{ ...eyebrow, fontSize:8, marginTop:3 } }, label)
    )
  );

  // ── header ─────────────────────────────────────────────────────────────
  const header = el('div', { style:{ marginBottom: desktop ? 30 : 20 } },
    el('div', { style:{ display:'flex', alignItems:'center', gap:8, marginBottom:13 } },
      el('span', { style:{ ...eyebrow, color:'#3aa0a4' } }, 'Tasks'),
      el('span', { style:{ ...eyebrow, color:t.dim } }, '/'),
      el('span', { style:{ ...eyebrow } }, 'Correspondence №' + d.num)
    ),
    el('div', { style:{ display:'flex', alignItems:'center', gap:10, marginBottom:12, flexWrap:'wrap' } },
      el('span', { className:'albd-edge', style:{ width:22, height:5, borderRadius:3, backgroundImage:SPECTRUM, backgroundSize:'300% 100%', animation:'albdEdge 16s linear infinite' } }),
      el('span', { style:{ ...eyebrow, fontSize:10 } }, 'Albescent · in confidence')
    ),
    el('h1', { style:{ ...serif(desktop ? 40 : 26, true), margin:'0 0 16px', textWrap:'pretty' } }, d.title),
    el('div', { style:{ display:'flex', alignItems:'center', gap:10, marginBottom:16 } },
      el('a', { href:d.author.href, title:'View ' + d.author.name + "'s profile", style:{ display:'flex', alignItems:'center', gap:9, textDecoration:'none' } },
        el('span', { style:{ display:'inline-flex', alignItems:'center', justifyContent:'center', flex:'0 0 auto', width:30, height:30, borderRadius:'50%', overflow:'hidden', background:t.surface, border:`1px solid ${t.border}`, fontFamily:LORA, fontWeight:600, fontSize:12, color:t.muted } }, d.author.name.split(' ').map(function(w){return w[0];}).join('').slice(0,2).toUpperCase()),
        el('span', { style:{ fontFamily:LORA, fontWeight:600, fontStyle:'italic', fontSize:15, color:t.ink, borderBottom:`1px solid ${t.border}` } }, d.author.name)),
      el('span', { style:{ ...eyebrow, fontSize:9 } }, 'author · lvl ' + d.author.level)),
    el('div', { style:{ display:'flex', alignItems:'center', gap: desktop ? 20 : 14, flexWrap:'wrap' } },
      el('div', { style:{ display:'flex', flexDirection:'column', lineHeight:1 } },
        el('span', { style:{ ...eyebrow, fontSize:9, marginBottom:4 } }, 'Level'),
        el('span', { style:{ ...serif(desktop ? 30 : 25), lineHeight:0.9 } }, 'Lvl ' + d.level)
      ),
      el('span', { 'aria-hidden':true, style:{ width:1, alignSelf:'stretch', minHeight:34, background:t.hair } }),
      el('div', { style:{ display:'flex', flexDirection:'column', lineHeight:1 } },
        el('span', { style:{ ...eyebrow, fontSize:9, marginBottom:4 } }, 'In hand'),
        el('span', { style:{ ...serif(desktop ? 26 : 21), lineHeight:0.9 } }, d.inProgress)
      )
    )
  );

  // ── worth readout (left half of the action panel) ───────────────────────
  const worth = el('div', { style:{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 } },
    el('div', { style:{ display:'flex', alignItems:'baseline', justifyContent:'center', gap:8, flexWrap:'wrap' } },
      el('span', { style:{ ...eyebrow, fontSize:8.5 } }, 'base'),
      el('span', { style:{ ...serif(desktop ? 20 : 17), lineHeight:1 } }, d.points),
      showMult ? el('span', { style:{ fontFamily:LORA, fontWeight:600, fontSize:12, color:t.chipText, background:t.chip, borderRadius:5, padding:'3px 7px', lineHeight:1 } }, '×' + d.multiplier.toFixed(2)) : null
    ),
    ring(desktop ? 92 : 74, yourPoints, 'yours')
  );

  // ── state block (right half) ───────────────────────────────────────────
  const ctaBody = signed
    ? el('div', null,
        el('div', { style:{ ...serif(desktop ? 15 : 14, true), marginBottom:11 } }, 'Your account is unfiled, still in hand'),
        el('div', { style:{ display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' } },
          el('span', { className:'albd-edge', style:{ cursor:'pointer', flex:1, display:'block', padding:2.5, borderRadius:12, backgroundImage:SPECTRUM, backgroundSize:'300% 100%', animation:'albdEdge 16s linear infinite', boxShadow:t.shadow } },
            el('span', { style:{ display:'block', textAlign:'center', fontFamily:LORA, fontWeight:700, fontSize: desktop ? 15 : 14, letterSpacing:'0.14em', textTransform:'uppercase', color:t.chipText, background:t.chip, borderRadius:9.5, padding: desktop ? '13px 18px' : '11px 13px' } }, 'Continue')),
          el('span', { onClick:()=>setSigned(false), style:{ cursor:'pointer', fontFamily:MONO, fontSize:11.5, color:t.muted, borderBottom:`1px solid ${t.hair}` } }, 'withdraw')
        )
      )
    : el('div', null,
        el('div', { onClick:()=>setSigned(true), className:'albd-edge', style:{ cursor:'pointer', padding:2.5, borderRadius:13, backgroundImage:SPECTRUM, backgroundSize:'300% 100%', animation:'albdEdge 16s linear infinite', boxShadow:t.shadow, marginBottom:10 } },
          el('div', { style:{ textAlign:'center', fontFamily:LORA, fontWeight:700, fontSize: desktop ? 15 : 14, letterSpacing: desktop ? '0.14em' : '0.08em', textTransform:'uppercase', color:t.chipText, background:t.chip, borderRadius:10.5, padding: desktop ? '15px 18px' : '13px 8px', whiteSpace:'nowrap' } }, 'Acknowledge')),
        el('div', { style:{ textAlign:'center', fontFamily:MONO, fontSize:11, lineHeight:1.65, color:t.muted } },
          d.slotsOpen + ' of ' + d.slotsMax + ' slots open · Lvl ' + d.level + ' standing met')
      );

  const innerBox = { position:'relative', background:t.page, border:`1px solid ${t.border}`, borderRadius:11, padding: desktop ? '16px 18px' : '15px 16px', boxSizing:'border-box' };
  const actionPanel = el('div', { className:'albd-edge', style:{ padding:2, borderRadius:16, backgroundImage:SPECTRUM, backgroundSize:'300% 100%', animation:'albdEdge 16s linear infinite', boxSizing:'border-box' } },
    el('div', { style:{ position:'relative', overflow:'hidden', background:t.surface, borderRadius:14, padding:7, boxSizing:'border-box', display:'flex', flexDirection:'row', gap:7, alignItems:'stretch' } },
      aurora(t.pageAurora),
      el('div', { style:{ ...innerBox, flex:'0 0 auto', minWidth: desktop ? 158 : 118, display:'flex', alignItems:'center', justifyContent:'center' } }, worth),
      el('div', { style:{ ...innerBox, flex:1, minWidth:0, display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'stretch', padding: desktop ? '16px 18px' : '15px 12px' } }, ctaBody)
    )
  );

  // ── the ask ────────────────────────────────────────────────────────────
  const brief = el('section', { style:{ marginBottom: desktop ? 32 : 22 } },
    sectionHead('The Ask', 'in the hand of the keeper'),
    el('div', { style:{ ...panel, position:'relative', overflow:'hidden', padding: desktop ? '22px 26px 20px' : '17px 18px' } },
      aurora(),
      el('div', { style:{ position:'relative', zIndex:1 } },
        d.brief.map((p, i) => el('p', { key:i,
          style: i === 0
            ? { ...serif(desktop ? 17 : 15, true), fontWeight:500, lineHeight:1.55, margin:'0 0 14px', textWrap:'pretty' }
            : { fontFamily:MONO, fontSize: desktop ? 13 : 12.5, lineHeight:1.75, color:t.muted, margin: i === d.brief.length - 1 ? 0 : '0 0 12px', textWrap:'pretty' } }, p))
      )
    )
  );

  // ── the register (praxis) ──────────────────────────────────────────────
  const sortTab = (key, label) => el('span', { key, onClick:()=>setSort(key), style:{ cursor:'pointer', ...eyebrow, fontSize:9, padding:'5px 10px', borderRadius:6,
    color: sort === key ? t.chipText : t.muted, background: sort === key ? t.chip : 'transparent' } }, label);

  const gallery = el('section', { style:{ marginBottom: desktop ? 32 : 22 } },
    el('div', { style:{ display:'flex', alignItems:'baseline', gap:10, marginBottom:14, flexWrap:'wrap' } },
      el('span', { style:{ ...serif(desktop ? 17 : 15, true) } }, d.completed + ' accounts inscribed'),
      el('span', { style:{ flex:1, height:1, background:t.hair, minWidth:20 } }),
      el('span', { style:{ display:'flex', gap:2, padding:2, border:`1px solid ${t.border}`, borderRadius:8 } }, [sortTab('witnessed','most witnessed'), sortTab('recent','recent')])
    ),
    el('div', { style:{ display:'grid', gridTemplateColumns: desktop ? 'repeat(3,1fr)' : '1fr', gap:14 } },
      (sort === 'witnessed' ? d.praxis : d.praxis.slice().reverse()).slice(0, showAllPraxis ? d.praxis.length : 3).map((p) => el('div', { key:p.title, style:{ ...panel, borderRadius:10, cursor:'pointer', padding:'15px 15px 13px', boxShadow:t.shadow } },
        el('div', { style:{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 } },
          el('div', { style:{ flex:1, minWidth:0 } },
            el('div', { style:{ ...eyebrow, fontSize:8.5, marginBottom:6 } }, 'account №' + p.rec + ' · returned'),
            el('div', { style:{ ...serif(desktop ? 16 : 15, true), marginBottom:8, textWrap:'pretty' } }, p.title),
            el('div', { style:{ display:'flex', alignItems:'center', gap:8 } },
              el('span', { style:{ width:24, height:24, borderRadius:'50%', flex:'0 0 auto', padding:2, background:CONIC, boxSizing:'border-box' } },
                el('span', { style:{ display:'flex', alignItems:'center', justifyContent:'center', width:'100%', height:'100%', borderRadius:'50%', background:t.surface, ...serif(10, true) } }, p.author[0].toUpperCase())
              ),
              el('span', { style:{ fontFamily:MONO, fontSize:10.5, color:t.muted, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' } }, p.author)
            )
          ),
          el('div', { style:{ flex:'0 0 auto', minWidth:76, background:t.page, border:`1px solid ${t.border}`, borderRadius:8, padding:'8px 10px 9px' } },
            el('div', { style:{ ...eyebrow, fontSize:8, letterSpacing:'0.1em' } }, '⚜ ' + p.score),
            el('div', { className:'albd-edge', style:{ height:1.5, borderRadius:1, backgroundImage:SPECTRUM, backgroundSize:'300% 100%', animation:'albdEdge 16s linear infinite', margin:'6px 0 7px' } }),
            el('div', { style:{ display:'flex', alignItems:'baseline', gap:4, lineHeight:1 } },
              el('span', { style:{ ...serif(21) } }, p.pts),
              el('span', { style:{ ...eyebrow, fontSize:8 } }, 'pts')
            )
          )
        ),
        el('div', { style:{ position:'relative', overflow:'hidden', marginTop:13, height: desktop ? 130 : 116, borderRadius:8, background:t.proof, boxShadow:`0 0 0 1px ${t.border}`, display:'flex', alignItems:'flex-end', justifyContent:'space-between', padding:9, boxSizing:'border-box' } },
          aurora(t.pageAurora),
          el('span', { style:{ position:'relative', zIndex:1, ...eyebrow, fontSize:8, color:t.dim } }, 'account'),
          p.top ? el('span', { style:{ position:'relative', zIndex:1, ...eyebrow, fontSize:8, color:t.chipText, background:t.chip, borderRadius:3, padding:'3px 6px' } }, 'most witnessed') : null
        ),
        el('div', { style:{ ...eyebrow, fontSize:8.5, marginTop:11 } }, p.when),
        el('div', { className:'albd-edge', 'aria-hidden':true, style:{ height:2, borderRadius:2, backgroundImage:SPECTRUM, backgroundSize:'300% 100%', animation:'albdEdge 16s linear infinite', opacity:.5, marginTop:11 } })
      ))
    ),
    d.praxis.length > 3 ? el('div', { onClick:()=>setShowAllPraxis(!showAllPraxis), style:{ marginTop:14, fontFamily:MONO, fontSize:12, color:'#3aa0a4', cursor:'pointer' } },
      showAllPraxis ? 'fewer ↑' : 'all ' + d.completed + ' accounts →') : null
  );

  // ── discussion ─────────────────────────────────────────────────────────
  const comments = el('section', null,
    sectionHead('Said quietly', d.comments.length + ' notes'),
    el('div', { style:{ display:'flex', flexDirection:'column', gap:12, marginBottom:14 } },
      d.comments.map((c, i) => el('div', { key:i, style:{ ...panel, padding:'13px 15px' } },
        el('div', { style:{ display:'flex', alignItems:'center', gap:9, marginBottom:8 } },
          el('span', { style:{ width:22, height:22, borderRadius:'50%', flex:'0 0 auto', padding:2, background:CONIC, boxSizing:'border-box' } },
            el('span', { style:{ display:'flex', alignItems:'center', justifyContent:'center', width:'100%', height:'100%', borderRadius:'50%', background:t.surface, ...serif(10, true) } }, c.author[0].toUpperCase())
          ),
          el('span', { style:{ fontFamily:MONO, fontSize:11.5, color:t.ink } }, c.author),
          el('span', { style:{ marginLeft:'auto', ...eyebrow, fontSize:8.5 } }, c.when)
        ),
        el('p', { style:{ margin:0, fontFamily:MONO, fontSize:12.5, lineHeight:1.7, color:t.muted, textWrap:'pretty' } }, c.body)
      ))
    ),
    el('div', { style:{ ...panel, padding:'12px 14px', display:'flex', alignItems:'center', gap:12 } },
      el('span', { style:{ flex:1, fontFamily:MONO, fontSize:12, color:t.dim } }, 'Set something down, plainly…'),
      el('span', { style:{ cursor:'pointer', ...eyebrow, fontSize:9, color:t.chipText, background:t.chip, borderRadius:6, padding:'7px 12px' } }, 'Enter')
    )
  );

  const styleTag = el('style', null, ALB_CSS);

  if (desktop) {
    return el('div', { style:{ position:'relative', width:'100%', boxSizing:'border-box', background:t.page, color:t.ink, fontFamily:MONO, padding:'34px 38px 44px' } },
      styleTag, foil,
      el('div', { style:{ position:'relative', zIndex:1, display:'flex', gap:28, alignItems:'flex-start' } },
        el('div', { style:{ flex:1, minWidth:0 } }, header),
        el('div', { style:{ flex:'0 0 440px', width:440, marginTop:10 } }, actionPanel)
      ),
      el('div', { style:{ position:'relative', zIndex:1, minWidth:0 } }, brief, gallery, comments)
    );
  }

  return el('div', { style:{ position:'relative', width:'100%', boxSizing:'border-box', background:t.page, color:t.ink, fontFamily:MONO, minHeight:'100%', display:'flex', flexDirection:'column' } },
    styleTag, foil,
    el('div', { style:{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', borderBottom:`1px solid ${t.hair}`, position:'sticky', top:0, background:t.page, zIndex:5 } },
      el('span', { style:{ fontFamily:LORA, fontSize:16, color:t.ink, cursor:'pointer' } }, '←'),
      el('span', { style:{ ...eyebrow, fontSize:9 } }, 'Corr. №' + d.num),
      el('span', { style:{ marginLeft:'auto', ...eyebrow, fontSize:9, color:'#3aa0a4' } }, 'in confidence')
    ),
    el('div', { style:{ position:'relative', zIndex:1, padding:'18px 16px 24px' } }, header, el('div', { style:{ marginBottom:24 } }, actionPanel), brief, gallery, el('div', { style:{ height:24 } }), comments)
  );
}

module.exports = { AlbescentTaskDetail };
