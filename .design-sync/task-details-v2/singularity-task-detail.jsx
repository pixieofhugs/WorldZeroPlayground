// Singularity Task Detail — dark terminal: phosphor green + blue on near-black, scanlines,
// a sweep bar, blinking cursor. Anatomy matched to the Unaffiliated detail:
// header (breadcrumb, faction line, title, lvl / nodes) + action panel (credits readout +
// JOIN ARRAY) → // the_observation (full spec) → // signaled_praxis → // thread.
// Props: theme, platform, state ('open'|'in_progress').
const TOKENS = {
  light: {
    page:'#07130C', panel:'#0B1B12', chrome:'#0C2016', ink:'#22C55E', bright:'#4ADE80', dim:'#3D8B5E',
    blue:'#2563EB', blueBright:'#3B82F6', border:'rgba(37,99,235,0.4)', hair:'rgba(74,222,128,0.2)',
    readoutBg:'rgba(37,99,235,0.12)', proof:'#0E2418', ctaBg:'#4ADE80', ctaText:'#04120A',
    scan:'rgba(74,222,128,0.05)', sweep0:'rgba(37,99,235,0)', sweep1:'rgba(37,99,235,0.14)', glow:'none'
  },
  dark: {
    page:'#040C07', panel:'#08150D', chrome:'#0A1A10', ink:'#4ADE80', bright:'#86EFAC', dim:'#3A9E63',
    blue:'#60A5FA', blueBright:'#93C5FD', border:'rgba(96,165,250,0.3)', hair:'rgba(74,222,128,0.18)',
    readoutBg:'rgba(96,165,250,0.1)', proof:'#0B1B12', ctaBg:'#4ADE80', ctaText:'#03120A',
    scan:'rgba(74,222,128,0.045)', sweep0:'rgba(96,165,250,0)', sweep1:'rgba(96,165,250,0.16)', glow:'0 0 18px rgba(74,222,128,0.18)'
  }
};

const MONO = "'Share Tech Mono','SFMono-Regular',ui-monospace,monospace";

const SG_CSS = `
@keyframes sgdBlink { 50% { opacity:0; } }
@keyframes sgdSweep { from { transform:translateY(-40px); } to { transform:translateY(120vh); } }
@keyframes sgdPulse { 0%,100% { opacity:.4; } 50% { opacity:1; } }
@media (prefers-reduced-motion:reduce) {
  .sgd-blink, .sgd-sweep, .sgd-pulse { animation:none !important; }
}
`;

const DATA = {
  author: { name: 'Wren Abalone', level: 4, href: '#/players/wren-abalone' },
  num: 208, title: 'Log one week of your resting heart rate', level: 3, points: 24, multiplier: 1.25,
  inProgress: 17, completed: 41, topScore: '4.8', slotsOpen: 2, slotsMax: 3,
  brief: [
    'One reading each morning before you rise. Seven data points, timestamped, no interpolation.',
    'Plot them. Do not smooth the curve. The body is a signal you have never once read at rest, and the array is interested in the noise as much as the trend.',
    'Submit the raw series with your plot. A log without its source values is not a signal — it is an opinion.'
  ],
  praxis: [
    { title: 'rhr_7d.csv — plotted, unsmoothed', author: 'v.chandra', score: '4.8', votes: 44, when: '2d ago', pts: 30, rec: 1841, top: true },
    { title: 'seven mornings, one outlier', author: 'ARRAY::helios', score: '4.3', votes: 28, when: '4d ago', pts: 27, rec: 1836 },
    { title: 'signal + the coffee confound', author: 'thirdwatch', score: '4.0', votes: 17, when: '9d ago', pts: 24, rec: 1822 },
    { title: 'bpm vs. barometric pressure', author: 'node_0x1f', score: '4.5', votes: 33, when: '11d ago', pts: 28, rec: 1809 },
    { title: 'the week i stopped sleeping', author: 'quiet_process', score: '4.1', votes: 21, when: '16d ago', pts: 25, rec: 1794 },
    { title: 'raw series, no plot — rejected once', author: 'node_0x04', score: '3.6', votes: 11, when: '22d ago', pts: 19, rec: 1770 }
  ],
  comments: [
    { author: 'node_0x1f', when: '3d ago', body: '> reading before rising is load-bearing. sat up once and the value jumped 9bpm.' },
    { author: 'v.chandra', when: '2d ago', body: '> log the deviation, do not discard it. the array reads confounds as data.' },
    { author: 'quiet_process', when: '14h ago', body: '> day 5. the curve is uglier than i expected and that is the interesting part.' }
  ]
};

function SingularityTaskDetail(props) {
  const theme = props.theme === 'light' ? 'light' : 'dark';
  const desktop = props.platform === 'desktop';
  const t = TOKENS[theme];
  const d = Object.assign({}, DATA, props.data || {});
  const el = React.createElement;

  const [signed, setSigned] = React.useState(props.state === 'in_progress');
  const [sort, setSort] = React.useState('signal');
  const [showAllPraxis, setShowAllPraxis] = React.useState(false);
  React.useEffect(() => { setSigned(props.state === 'in_progress'); }, [props.state]);

  const yourPoints = Math.round(d.points * d.multiplier);
  const showMult = Math.abs(d.multiplier - 1) > 1e-9;
  const hex = '0x' + Number(d.num).toString(16).toUpperCase().padStart(3, '0');

  const label = { fontFamily:MONO, fontSize:10, letterSpacing:'0.14em', textTransform:'uppercase', color:t.dim };
  const panel = { background:t.panel, border:`1px solid ${t.border}`, borderRadius:6, boxSizing:'border-box' };
  const cursor = (color) => el('span', { className:'sgd-blink', style:{ display:'inline-block', width:'0.55em', height:'1em', marginLeft:3,
    background: color || t.bright, animation:'sgdBlink 1.05s steps(1) infinite', verticalAlign:'-0.12em' } });
  const rule = (extra) => el('div', { 'aria-hidden':true, style:{ height:0, borderTop:`1px dashed ${t.hair}`, ...(extra||{}) } });

  const sectionHead = (label_, gloss) => el('div', { style:{ display:'flex', alignItems:'center', gap:10, marginBottom:13 } },
    el('span', { style:{ fontFamily:MONO, fontSize: desktop ? 15 : 13.5, color:t.blueBright } }, label_),
    el('span', { style:{ flex:1, borderTop:`1px dashed ${t.hair}` } }),
    gloss ? el('span', { style:{ ...label, fontSize:9.5 } }, gloss) : null
  );

  // ── chrome bar ─────────────────────────────────────────────────────────
  const chrome = el('div', { style:{ display:'flex', alignItems:'center', gap:8, padding:'9px 14px', background:t.chrome, borderBottom:`1px solid ${t.hair}` } },
    desktop ? el('span', { style:{ display:'flex', gap:5 } },
      el('span', { style:{ width:8, height:8, borderRadius:'50%', background:t.dim, opacity:0.7 } }),
      el('span', { style:{ width:8, height:8, borderRadius:'50%', background:t.blue } }),
      el('span', { style:{ width:8, height:8, borderRadius:'50%', background:t.bright } })
    ) : el('span', { style:{ fontFamily:MONO, fontSize:14, color:t.bright, cursor:'pointer' } }, '←'),
    el('span', { style:{ ...label, fontSize:10.5, marginLeft:2, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' } }, desktop ? 'function.detail — singularity' : 'function ' + hex),
    el('span', { style:{ marginLeft:'auto', ...label, fontSize:10.5, color:t.blue } }, desktop ? hex : 'accepting')
  );

  // ── header ─────────────────────────────────────────────────────────────
  const header = el('div', { style:{ marginBottom: desktop ? 26 : 20 } },
    el('div', { style:{ display:'flex', alignItems:'center', gap:8, marginBottom:12 } },
      el('span', { style:{ ...label, fontSize:9.5, color:t.blue } }, 'functions'),
      el('span', { style:{ ...label, fontSize:9.5 } }, '/'),
      el('span', { style:{ ...label, fontSize:9.5 } }, 'protocol #' + d.num)
    ),
    el('div', { style:{ display:'flex', alignItems:'center', gap:9, marginBottom:12 } },
      el('span', { className:'sgd-pulse', style:{ width:7, height:7, borderRadius:'50%', background:t.blueBright, boxShadow:`0 0 8px ${t.blue}`, animation:'sgdPulse 1.6s ease-in-out infinite' } }),
      el('span', { style:{ ...label, fontSize:10 } }, 'Singularity · class: observation')
    ),
    el('h1', { style:{ fontFamily:MONO, fontSize: desktop ? 34 : 22, lineHeight:1.2, color:t.bright, margin:'0 0 16px', fontWeight:400,
      textShadow: theme === 'dark' ? '0 0 16px rgba(74,222,128,0.28)' : 'none', textWrap:'pretty' } }, d.title),
    el('div', { style:{ display:'flex', alignItems:'center', gap:10, marginBottom:16 } },
      el('a', { href:d.author.href, title:'View ' + d.author.name + "'s profile", style:{ display:'flex', alignItems:'center', gap:9, textDecoration:'none' } },
        el('span', { style:{ display:'inline-flex', alignItems:'center', justifyContent:'center', flex:'0 0 auto', width:30, height:30, borderRadius:'50%', overflow:'hidden', borderRadius:4, background:t.panel, border:`1px solid ${t.border}`, fontFamily:MONO, fontSize:11, color:t.bright } }, d.author.name.split(' ').map(function(w){return w[0];}).join('').slice(0,2).toUpperCase()),
        el('span', { style:{ fontFamily:MONO, fontSize:14, color:t.bright, borderBottom:`1px solid ${t.border}` } }, d.author.name)),
      el('span', { style:{ ...label, fontSize:9 } }, 'author · lvl ' + d.author.level)),
    el('div', { style:{ display:'flex', alignItems:'flex-end', gap: desktop ? 20 : 14, flexWrap:'wrap' } },
      el('div', { style:{ display:'flex', flexDirection:'column', lineHeight:1 } },
        el('span', { style:{ ...label, fontSize:9, marginBottom:5 } }, 'LVL'),
        el('span', { style:{ fontFamily:MONO, fontSize: desktop ? 32 : 26, color:t.bright, lineHeight:0.85 } }, String(d.level).padStart(2,'0'))
      ),
      el('span', { 'aria-hidden':true, style:{ width:1, alignSelf:'stretch', minHeight:32, background:t.hair } }),
      el('div', { style:{ display:'flex', flexDirection:'column', lineHeight:1 } },
        el('span', { style:{ ...label, fontSize:9, marginBottom:5 } }, 'nodes synced'),
        el('span', { style:{ fontFamily:MONO, fontSize: desktop ? 28 : 23, color:t.bright, lineHeight:0.85 } }, d.inProgress)
      ),
      rule({ flex:1, marginBottom:9, minWidth:20 })
    )
  );

  // ── credits readout (left half of the action panel) ─────────────────────
  const readout = el('div', { style:{ display:'flex', flexDirection:'column', gap:10 } },
    el('div', { style:{ display:'flex', alignItems:'center', gap:9 } },
      el('span', { style:{ ...label, fontSize:8.5 } }, 'base'),
      el('span', { style:{ fontFamily:MONO, fontSize: desktop ? 24 : 20, lineHeight:0.85, color:t.ink } }, d.points),
      showMult ? el('span', { style:{ marginLeft:'auto', fontFamily:MONO, fontSize: desktop ? 14 : 12.5, color:t.ctaText, background:t.bright, borderRadius:4, padding:'3px 7px', whiteSpace:'nowrap' } }, '×' + d.multiplier.toFixed(2)) : null
    ),
    el('div', { 'aria-hidden':true, style:{ height:0, borderTop:`1px dashed ${t.hair}` } }),
    el('div', { style:{ display:'flex', alignItems:'baseline', gap:6, lineHeight:1 } },
      el('span', { style:{ fontFamily:MONO, fontSize: desktop ? 40 : 32, lineHeight:1, color:t.blueBright, textShadow: theme === 'dark' ? '0 0 14px rgba(96,165,250,0.3)' : 'none' } }, yourPoints),
      el('span', { style:{ ...label, fontSize:11, color:t.blue } }, 'CR')
    )
  );

  // ── node block (right half) ────────────────────────────────────────────
  const ctaBody = signed
    ? el('div', null,
        el('div', { style:{ fontFamily:MONO, fontSize:12.5, color:t.bright, marginBottom:11 } }, '◉ node synced — observation in progress'),
        el('div', { style:{ display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' } },
          el('span', { style:{ cursor:'pointer', flex:1, textAlign:'center', fontFamily:MONO, fontSize: desktop ? 14 : 13, color:t.bright, border:`1.5px solid ${t.bright}`, borderRadius:5, padding: desktop ? '13px 18px' : '11px 14px', whiteSpace:'nowrap' } }, '> CONTINUE OBSERVATION'),
          el('span', { onClick:()=>setSigned(false), style:{ cursor:'pointer', fontFamily:MONO, fontSize:11.5, color:t.dim } }, '> abort')
        )
      )
    : el('div', null,
        el('div', { onClick:()=>setSigned(true), style:{ cursor:'pointer', background:t.ctaBg, color:t.ctaText, borderRadius:5, padding: desktop ? '13px 16px' : '11px 14px',
          textAlign:'center', fontFamily:MONO, fontSize: desktop ? 14 : 13, boxShadow:t.glow, marginBottom:10 } },
          '> JOIN ARRAY', cursor(t.ctaText)),
        el('div', { style:{ fontFamily:MONO, fontSize:11, lineHeight:1.65, color:t.dim } },
          d.slotsOpen + ' of ' + d.slotsMax + ' node slots open · ', el('span', { style:{ color:t.bright } }, 'LVL ' + d.level + ' MET'))
      );

  const innerBox = { background:t.page, border:`1px solid ${t.border}`, borderRadius:5, padding: desktop ? '15px 17px' : '14px 15px', boxSizing:'border-box' };
  const actionPanel = el('div', { style:{ ...panel, padding:7, display:'flex', flexDirection:'row', gap:7, alignItems:'stretch' } },
    el('div', { style:{ ...innerBox, flex:'0 0 auto', minWidth: desktop ? 160 : 118, display:'flex', flexDirection:'column', justifyContent:'center' } }, readout),
    el('div', { style:{ ...innerBox, flex:1, display:'flex', flexDirection:'column', justifyContent:'center' } }, ctaBody)
  );

  // ── the observation ────────────────────────────────────────────────────
  const brief = el('section', { style:{ marginBottom: desktop ? 30 : 22 } },
    sectionHead('// the_observation', 'full spec'),
    el('div', { style:{ ...panel, padding: desktop ? '18px 20px 16px' : '15px 16px' } },
      d.brief.map((p, i) => el('p', { key:i, style:{ fontFamily:MONO, fontSize: desktop ? 13.5 : 12.5, lineHeight:1.7,
        color: i === 0 ? t.bright : t.dim, margin: i === d.brief.length - 1 ? 0 : '0 0 12px', textWrap:'pretty' } }, p))
    )
  );

  // ── signaled praxis ────────────────────────────────────────────────────
  const sortTab = (key, text) => el('span', { key, onClick:()=>setSort(key), style:{ cursor:'pointer', ...label, fontSize:9, padding:'5px 9px', borderRadius:4,
    color: sort === key ? t.ctaText : t.dim, background: sort === key ? t.bright : 'transparent' } }, text);

  const gallery = el('section', { style:{ marginBottom: desktop ? 30 : 22 } },
    el('div', { style:{ display:'flex', alignItems:'center', gap:10, marginBottom:13, flexWrap:'wrap' } },
      el('span', { style:{ fontFamily:MONO, fontSize: desktop ? 15 : 13.5, color:t.blueBright } }, d.completed + ' sealed logs'),
      el('span', { style:{ flex:1, borderTop:`1px dashed ${t.hair}`, minWidth:20 } }),
      el('span', { style:{ display:'flex', gap:2, padding:2, border:`1px solid ${t.border}`, borderRadius:5 } }, [sortTab('signal','highest signal'), sortTab('recent','recent')])
    ),
    el('div', { style:{ display:'grid', gridTemplateColumns: desktop ? 'repeat(3,1fr)' : '1fr', gap:12 } },
      (sort === 'signal' ? d.praxis : d.praxis.slice().reverse()).slice(0, showAllPraxis ? d.praxis.length : 3).map((p) => el('div', { key:p.title, style:{ ...panel, cursor:'pointer', padding:'13px 13px 12px' } },
        el('div', { style:{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10 } },
          el('div', { style:{ flex:1, minWidth:0 } },
            el('div', { style:{ ...label, fontSize:8.5, color:t.blue, marginBottom:6 } }, 'log №' + p.rec + ' · sealed'),
            el('div', { style:{ fontFamily:MONO, fontSize:14, color:t.bright, lineHeight:1.3, marginBottom:8, textWrap:'pretty' } }, p.title),
            el('div', { style:{ display:'flex', alignItems:'center', gap:8 } },
              el('span', { style:{ fontFamily:MONO, fontSize:11, color:t.dim, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' } }, '@' + p.author),
              el('span', { style:{ fontFamily:MONO, fontSize:12, color:t.blueBright, flex:'0 0 auto' } }, '▲ ' + p.score)
            )
          ),
          el('div', { style:{ flex:'0 0 auto', minWidth:74, background:t.page, border:`1px solid ${t.border}`, borderRadius:5, padding:'7px 9px 8px' } },
            el('div', { style:{ ...label, fontSize:8 } }, 'votes ' + p.votes),
            el('div', { 'aria-hidden':true, style:{ height:0, borderTop:`1px dashed ${t.hair}`, margin:'6px 0 7px' } }),
            el('div', { style:{ display:'flex', alignItems:'baseline', gap:4, lineHeight:1 } },
              el('span', { style:{ fontFamily:MONO, fontSize:22, lineHeight:1, color:t.blueBright } }, p.pts),
              el('span', { style:{ ...label, fontSize:9, color:t.blue } }, 'CR')
            )
          )
        ),
        el('div', { style:{ marginTop:12, height: desktop ? 126 : 112, borderRadius:5, background:t.proof, boxShadow:`0 0 0 1px ${t.hair}`,
          backgroundImage:`repeating-linear-gradient(0deg, ${t.scan} 0 1px, transparent 1px 3px), linear-gradient(90deg, ${t.readoutBg} 1px, transparent 1px)`,
          backgroundSize:'auto, 24px 100%', display:'flex', alignItems:'flex-end', justifyContent:'space-between', padding:9, boxSizing:'border-box' } },
          el('span', { style:{ ...label, fontSize:8 } }, 'signal.log'),
          p.top ? el('span', { title:'highest signal for this function', style:{ ...label, fontSize:8, color:t.ctaText, background:t.bright, borderRadius:3, padding:'3px 6px' } }, 'HIGHEST') : null
        ),
        el('div', { style:{ ...label, fontSize:8.5, marginTop:10 } }, p.when)
      ))
    ),
    d.praxis.length > 3 ? el('div', { onClick:()=>setShowAllPraxis(!showAllPraxis), style:{ marginTop:13, fontFamily:MONO, fontSize:12, color:t.blue, cursor:'pointer' } },
      showAllPraxis ? '> collapse ↑' : '> view all ' + d.completed + ' logs →') : null
  );

  // ── thread ─────────────────────────────────────────────────────────────
  const comments = el('section', null,
    sectionHead('// thread', d.comments.length + ' entries'),
    el('div', { style:{ display:'flex', flexDirection:'column', gap:10, marginBottom:12 } },
      d.comments.map((c, i) => el('div', { key:i, style:{ ...panel, padding:'12px 14px' } },
        el('div', { style:{ display:'flex', alignItems:'center', gap:9, marginBottom:7 } },
          el('span', { style:{ fontFamily:MONO, fontSize:11.5, color:t.blueBright } }, '@' + c.author),
          el('span', { style:{ marginLeft:'auto', ...label, fontSize:8.5 } }, c.when)
        ),
        el('p', { style:{ margin:0, fontFamily:MONO, fontSize:12.5, lineHeight:1.65, color:t.dim, textWrap:'pretty' } }, c.body)
      ))
    ),
    el('div', { style:{ ...panel, padding:'11px 13px', display:'flex', alignItems:'center', gap:12 } },
      el('span', { style:{ flex:1, fontFamily:MONO, fontSize:12, color:t.dim } }, '$ append --note', cursor(t.dim)),
      el('span', { style:{ cursor:'pointer', ...label, fontSize:9, color:t.ctaText, background:t.bright, borderRadius:4, padding:'6px 11px' } }, 'cast')
    )
  );

  const overlays = [
    el('div', { key:'scan', 'aria-hidden':true, style:{ position:'absolute', inset:0, pointerEvents:'none', zIndex:4,
      background:`repeating-linear-gradient(0deg, ${t.scan} 0 1px, transparent 1px 3px)` } }),
    el('div', { key:'sweep', className:'sgd-sweep', 'aria-hidden':true, style:{ position:'absolute', top:0, left:0, right:0, height:40, pointerEvents:'none', zIndex:4,
      background:`linear-gradient(${t.sweep0}, ${t.sweep1}, ${t.sweep0})`, animation:'sgdSweep 7s linear infinite' } })
  ];

  const shell = { position:'relative', overflow:'hidden', width:'100%', boxSizing:'border-box', background:t.page, color:t.ink, fontFamily:MONO };

  if (desktop) {
    return el('div', { style:shell },
      el('style', null, SG_CSS), overlays, chrome,
      el('div', { style:{ position:'relative', zIndex:2, padding:'30px 34px 42px' } },
        el('div', { style:{ display:'flex', gap:28, alignItems:'flex-start' } },
          el('div', { style:{ flex:1, minWidth:0 } }, header),
          el('div', { style:{ flex:'0 0 440px', width:440, marginTop:10 } }, actionPanel)
        ),
        el('div', { style:{ minWidth:0 } }, brief, gallery, comments)
      )
    );
  }

  return el('div', { style:{ ...shell, minHeight:'100%', display:'flex', flexDirection:'column' } },
    el('style', null, SG_CSS), overlays,
    el('div', { style:{ position:'sticky', top:0, zIndex:6 } }, chrome),
    el('div', { style:{ position:'relative', zIndex:2, padding:'18px 15px 24px' } },
      header, el('div', { style:{ marginBottom:22 } }, actionPanel), brief, gallery, el('div', { style:{ height:22 } }), comments)
  );
}

module.exports = { SingularityTaskDetail };
