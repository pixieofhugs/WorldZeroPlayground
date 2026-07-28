// Cozy Coven Task Detail — candlelight and a pentagram ward holding your points. Coven DRESS only:
// the copy is faction-agnostic (task pages don't get faction-specific language).
// header (breadcrumb, title, level / in progress / completed) beside one action plate (worth + sign up)
// → the task (brief) → submissions (praxis gallery) → comments.
// NOTE: task detail pages carry NO in-progress roster section — the brewing count in the header is enough.
// Props: theme ('light'|'dark'), platform ('desktop'|'mobile'), state ('open'|'in_progress'), data.
const TOKENS = {
  light: {
    page:'#fdeef5', ink:'#8f2557', deep:'#c9327a', pk:'#ec4f92', soft:'#b8517f', label:'#b06a92',
    lt:'#fbc4dd', lt2:'#fdd9e8', card:'#fff6fb', border:'#f4a9cc', hair:'rgba(201,50,122,.18)',
    lav:'#e6dbf7', vio:'#e3d6f6', gold:'#f4c430', dim:'#d99ab9',
    green:'#7cbf99', greenDk:'#5c8150', glow:'rgba(236,79,146,.30)',
    shadow:'0 14px 32px -16px rgba(236,79,146,.42)', candle:.5
  },
  dark: {
    page:'#1d0a15', ink:'#fbcfe4', deep:'#f9a8d4', pk:'#f472b6', soft:'#e58cb6', label:'#c78aa6',
    lt:'#5e2a46', lt2:'#4a2038', card:'#2a0f1e', border:'#7a3358', hair:'rgba(249,168,212,.2)',
    lav:'#2e2145', vio:'#2b1c42', gold:'#f4d472', dim:'#8d5f78',
    green:'#5fa882', greenDk:'#3f7259', glow:'rgba(244,114,182,.42)',
    shadow:'0 18px 44px -18px rgba(0,0,0,.75)', candle:.7
  }
};

const CG = "'Cormorant Garamond',Georgia,serif";
const QS = "'Quicksand','Trebuchet MS',sans-serif";
const CAV = "'Caveat',cursive";
const GG = "'Grenze Gotisch','Cormorant Garamond',Georgia,serif";

const CVN_CSS = `
@keyframes cvndWheel { to { transform:rotate(360deg); } }
@keyframes cvndFlicker { 0%,100% { opacity:.62; transform:scale(1); } 38% { opacity:.9; transform:scale(1.06); } 71% { opacity:.7; transform:scale(.98); } }
@keyframes cvndFloat { 0%,100% { transform:translate3d(-3%,-2%,0) scale(1.1); } 50% { transform:translate3d(3%,2%,0) scale(1.18); } }
@media (prefers-reduced-motion:reduce) { .cvnd-wheel,.cvnd-candle,.cvnd-haze { animation:none !important; } }
`;

const DATA = {
  author: { name: 'Wren Abalone', level: 4, href: '#/players/wren-abalone' },
  num: 305, title: 'Brew comfort for a weary friend', level: 3, points: 120, multiplier: 1.5,
  inProgress: 9, completed: 21, slotsOpen: 4, slotsMax: 13,
  brief: [
    "Put the kettle on for someone tired. Steep something warm, sit a while — the tea says what words can't.",
    'No fixing, no advice unless it is asked for twice. Your whole task is the warmth and the staying.',
    'When it is done, write down one thing they said that you want to keep. That line is the spell; the tea was only the vessel.'
  ],
  praxis: [
    { title: 'Chamomile, and a very long silence', author: 'Maeve Thornbramble', score: '4.6', votes: 22, when: '3 days ago', pts: 180, rec: 902, top: true },
    { title: 'Two mugs on the fire escape', author: 'Bramblewick', score: '4.3', votes: 17, when: '5 days ago', pts: 165, rec: 897 },
    { title: 'I made the wrong tea and stayed anyway', author: 'Juniper Ash', score: '4.1', votes: 14, when: 'last week', pts: 150, rec: 884 },
    { title: 'Honey from the back of the cupboard', author: 'the Kettle Keeper', score: '4.0', votes: 12, when: '2 weeks ago', pts: 144, rec: 871 },
    { title: 'She talked for an hour about her mother', author: 'Ostrich Featherby', score: '3.9', votes: 9, when: 'last month', pts: 138, rec: 852 },
    { title: 'A thermos, left on a doorstep', author: 'unsigned', score: '4.2', votes: 15, when: 'last month', pts: 158, rec: 840 }
  ],
  comments: [
    { author: 'Bramblewick', when: '4 days ago', body: 'The staying is the hard part. I wanted to be useful and had to sit on my hands instead.' },
    { author: 'the Kettle Keeper', when: '2 days ago', body: 'Sitting on your hands IS the useful part, love. Write that on the tin.' },
    { author: 'Juniper Ash', when: '9 hours ago', body: 'Kept her line: "nobody has asked me that in a year." Still thinking about it.' }
  ]
};

function CovenTaskDetail(props) {
  const theme = props.theme === 'dark' ? 'dark' : 'light';
  const desktop = props.platform === 'desktop';
  const t = TOKENS[theme];
  const d = Object.assign({}, DATA, props.data || {});
  const el = React.createElement;

  const [taken, setTaken] = React.useState(props.state === 'in_progress');
  const [sort, setSort] = React.useState('loved');
  const [showAll, setShowAll] = React.useState(false);
  React.useEffect(() => { setTaken(props.state === 'in_progress'); }, [props.state]);

  const yourPoints = Math.round(d.points * d.multiplier);
  const showMult = Math.abs(d.multiplier - 1) > 1e-9;

  const cap = { fontFamily:QS, fontWeight:700, letterSpacing:'.2em', textTransform:'uppercase' };
  const eyebrow = { ...cap, fontSize:9.5, color:t.label };
  const hand = (size) => ({ fontFamily:CAV, fontSize:size, lineHeight:.92, color:t.ink });
  const display = (size) => ({ fontFamily:GG, fontWeight:600, fontSize:size, lineHeight:1.06, color:t.ink, letterSpacing:'.005em' });
  const italic = (size, color) => ({ fontFamily:CG, fontStyle:'italic', fontSize:size, lineHeight:1.5, color:color || t.soft });
  const panel = { background:t.card, border:`2px solid ${t.border}`, borderRadius:16, boxSizing:'border-box', boxShadow:t.shadow };

  const sparkle = (size, color, op) => el('svg', { width:size, height:size, viewBox:'0 0 24 24', 'aria-hidden':true, style:{ display:'block', flex:'0 0 auto', opacity:op==null?1:op } },
    el('path', { d:'M12 0c.9 7 4.1 10.2 11 11-6.9.8-10.1 4-11 11-.9-7-4.1-10.2-11-11C7.9 10.2 11.1 7 12 0Z', fill:color })
  );
  const heartIcon = (size, color) => el('svg', { width:size, height:size, viewBox:'0 0 36 36', 'aria-hidden':true, style:{ display:'block', flex:'0 0 auto' } },
    el('path', { d:'M18 31C7 23 3 17 6.5 11 9 6.8 14 6.5 16 10c.9 1.5 1.6 2.7 2 3.4.4-.7 1.1-1.9 2-3.4 2-3.5 7-3.2 9.5 1C33 17 29 23 18 31Z', fill:color })
  );

  const threadUrl = (color, bead) => {
    const strand = (dd) => "<path d='" + dd + "' fill='none' stroke='" + color + "' stroke-width='1.2' stroke-linecap='round'/>";
    const svg = "<svg xmlns='http://www.w3.org/2000/svg' width='40' height='12' viewBox='0 0 40 12'>"
      + strand('M0 3 C10 3, 10 9, 20 9 C24 9, 26 8.2, 28 7')
      + strand('M32 5 C34 3.8, 36 3, 40 3')
      + strand('M0 9 C4 9, 6 8.2, 8 7')
      + strand('M12 5 C14 3.8, 16 3, 20 3 C30 3, 30 9, 40 9')
      + "<circle cx='20' cy='6' r='1.2' fill='" + bead + "' opacity='0.9'/></svg>";
    return "url(\"data:image/svg+xml," + encodeURIComponent(svg) + "\")";
  };
  const braid = (extra) => el('span', { 'aria-hidden':true, style:{ display:'block', height:12, minWidth:20,
    backgroundImage:threadUrl(t.deep, t.gold), backgroundRepeat:'repeat-x', backgroundPosition:'left center', opacity:.8, ...(extra||{}) } });

  // candlelight haze behind the page
  const haze = el('div', { 'aria-hidden':true, style:{ position:'absolute', inset:0, overflow:'hidden', zIndex:0, pointerEvents:'none' } },
    el('div', { className:'cvnd-haze', style:{ position:'absolute', inset:'-25%', opacity:t.candle, filter:'blur(70px)',
      animation:'cvndFloat 34s ease-in-out infinite',
      backgroundImage:[
        'radial-gradient(50% 40% at 12% 8%, ' + t.pk + ', transparent 100%)',
        'radial-gradient(46% 38% at 88% 14%, ' + t.lav + ', transparent 100%)',
        'radial-gradient(42% 34% at 62% 84%, ' + t.gold + ', transparent 100%)',
        'radial-gradient(46% 36% at 20% 92%, ' + t.vio + ', transparent 100%)'
      ].join(','), mixBlendMode: theme === 'dark' ? 'screen' : 'normal' } }),
    el('svg', { width:'100%', height:'100%', viewBox:'0 0 100 100', preserveAspectRatio:'none', 'aria-hidden':true, style:{ position:'absolute', inset:0 } },
      [[13,31,.45,.5],[38,46,.5,.55],[5,62,.65,.7],[57,71,.45,.5],[29,83,.7,.75],[46,97,.6,.65]]
        .map(([x,y,r,o],i)=>el('path', { key:i, transform:'scale(1,1)',
          d:`M${x} ${y-r*2.6} l${r} ${r*2.6} ${r*2.6} ${r} -${r*2.6} ${r} -${r} ${r*2.6} -${r} -${r*2.6} -${r*2.6} -${r} ${r*2.6} -${r} z`,
          fill:t.gold, opacity: o * (theme === 'dark' ? 1 : .72) }))
    ),
    el('svg', { className:'cvnd-wheel', width:640, height:640, viewBox:'0 0 100 100', 'aria-hidden':true,
      style:{ position:'absolute', right:-180, top:120, opacity: theme === 'dark' ? .1 : .07, animation:'cvndWheel 150s linear infinite', transformOrigin:'50% 50%' } },
      el('circle', { cx:50, cy:50, r:44, fill:'none', stroke:t.deep, strokeWidth:.8 }),
      el('path', { d:'M50 12 L73.5 84.3 L11.9 39.7 L88.1 39.7 L26.5 84.3 Z', fill:'none', stroke:t.deep, strokeWidth:1.1, strokeLinejoin:'round' })
    )
  );

  const sigilMark = (size) => el('svg', { width:size, height:size, viewBox:'0 0 44 44', 'aria-hidden':true, style:{ display:'block', flex:'0 0 auto' } },
    el('circle', { cx:22, cy:22, r:19, fill:t.pk, opacity: theme === 'dark' ? .28 : .16 }),
    el('circle', { cx:22, cy:22, r:15, fill:'none', stroke:t.gold, strokeWidth:1, strokeDasharray:'2 4' }),
    el('path', { d:'M22 8 L30.2 33.3 L8.7 17.7 L35.3 17.7 L13.8 33.3 Z', fill:'none', stroke:t.deep, strokeWidth:1.5, strokeLinejoin:'round' }),
    el('circle', { cx:22, cy:22, r:3, fill:t.gold })
  );

  const sectionHead = (label, gloss) => el('div', { style:{ display:'flex', alignItems:'center', gap:12, marginBottom:14 } },
    el('span', { style:{ ...display(desktop ? 27 : 23), letterSpacing:'.02em' } }, label),
    braid({ flex:1 }),
    gloss ? el('span', { style:{ ...eyebrow, fontSize:9, flex:'0 0 auto' } }, gloss) : null
  );

  const avatar = (name, size, kin) => el('span', { style:{ width:size, height:size, borderRadius:'50%', flex:'0 0 auto', padding:2, boxSizing:'border-box',
    background: kin === 'guest' ? `linear-gradient(150deg,${t.lav},${t.vio})` : `linear-gradient(150deg,${t.pk},${t.deep})` } },
    el('span', { style:{ display:'flex', alignItems:'center', justifyContent:'center', width:'100%', height:'100%', borderRadius:'50%',
      background:t.card, fontFamily:CG, fontWeight:600, fontSize:size * 0.42, color:t.deep } }, name[0].toUpperCase())
  );

  // ── the ward: points inside a glowing pentagram ────────────────────────
  const wardId = 'cvnd-' + (desktop ? 'd' : 'm') + '-' + theme;
  const ward = (size) => el('div', { style:{ position:'relative', flex:'0 0 auto', width:size, height:size, display:'flex', alignItems:'center', justifyContent:'center' } },
    el('svg', { width:size, height:size, viewBox:'0 0 100 100', 'aria-hidden':true, style:{ position:'absolute', inset:0, overflow:'visible' } },
      el('defs', null,
        el('radialGradient', { id:wardId + '-in' },
          el('stop', { offset:'0%', stopColor: theme === 'dark' ? '#1a0713' : '#ffffff', stopOpacity: theme === 'dark' ? .92 : .98 }),
          el('stop', { offset:'64%', stopColor: theme === 'dark' ? '#1a0713' : '#ffffff', stopOpacity: theme === 'dark' ? .6 : .72 }),
          el('stop', { offset:'100%', stopColor: theme === 'dark' ? '#1a0713' : '#ffffff', stopOpacity:0 })
        ),
        el('radialGradient', { id:wardId + '-aura' },
          el('stop', { offset:'0%', stopColor:t.pk, stopOpacity: theme === 'dark' ? .58 : .4 }),
          el('stop', { offset:'55%', stopColor:t.pk, stopOpacity: theme === 'dark' ? .22 : .15 }),
          el('stop', { offset:'100%', stopColor:t.pk, stopOpacity:0 })
        )
      ),
      el('circle', { className:'cvnd-candle', cx:50, cy:50, r:48, fill:'url(#' + wardId + '-aura)', style:{ animation:'cvndFlicker 5.5s ease-in-out infinite', transformOrigin:'50% 50%' } }),
      el('path', { d:'M50 16 L69.8 78.5 L16.5 40.1 L83.5 40.1 L30.2 78.5 Z', fill:'none', stroke:t.gold, strokeWidth:1, strokeLinejoin:'round', opacity:.55 }),
      el('circle', { cx:50, cy:50, r:33, fill:'none', stroke:t.pk, strokeWidth:1.8, opacity:.9 }),
      el('circle', { cx:50, cy:50, r:32.1, fill:'url(#' + wardId + '-in)' }),
      [[50,3,3.2],[90,26,2.3],[12,74,2.6],[86,80,1.8],[14,22,1.6]].map(([x,y,r],i)=>el('path', { key:i,
        d:`M${x} ${y-r*2.6} l${r} ${r*2.6} ${r*2.6} ${r} -${r*2.6} ${r} -${r} ${r*2.6} -${r} -${r*2.6} -${r*2.6} -${r} ${r*2.6} -${r} z`,
        fill:t.gold, opacity: theme === 'dark' ? .95 : .85 }))
    ),
    el('div', { style:{ position:'relative', display:'flex', flexDirection:'column', alignItems:'center', lineHeight:.85 } },
      el('span', { style:{ fontFamily:CG, fontWeight:600, fontSize:size * 0.3, color:t.deep } }, yourPoints),
      el('span', { style:{ ...cap, fontSize:7.5, letterSpacing:'.16em', color:t.label, marginTop:3 } }, 'points')
    )
  );

  // ── header ─────────────────────────────────────────────────────────────
  const header = el('div', { style:{ marginBottom: desktop ? 30 : 20 } },
    el('div', { style:{ display:'flex', alignItems:'center', gap:8, marginBottom:12 } },
      el('span', { style:{ ...eyebrow, color:t.deep } }, 'tasks'),
      el('span', { style:{ ...eyebrow, color:t.dim } }, '/'),
      el('span', { style:{ ...eyebrow } }, 'task no. ' + d.num)
    ),
    el('div', { style:{ display:'flex', alignItems:'center', gap:10, marginBottom:10 } },
      sigilMark(30),
      el('span', { style:{ ...hand(desktop ? 26 : 23), color:t.label } }, 'Task detail')
    ),
    el('h1', { style:{ ...display(desktop ? 46 : 31), margin:'0 0 16px', textWrap:'pretty' } }, d.title),
    el('div', { style:{ display:'flex', alignItems:'center', gap:10, marginBottom:16 } },
      el('a', { href:d.author.href, title:'View ' + d.author.name + "'s profile", style:{ display:'flex', alignItems:'center', gap:9, textDecoration:'none' } },
        el('span', { style:{ display:'inline-flex', alignItems:'center', justifyContent:'center', flex:'0 0 auto', width:30, height:30, borderRadius:'50%', overflow:'hidden', background:t.card, border:`2px solid ${t.border}`, fontFamily:QS, fontWeight:700, fontSize:11, color:t.label } }, d.author.name.split(' ').map(function(w){return w[0];}).join('').slice(0,2).toUpperCase()),
        el('span', { style:{ ...hand(25), borderBottom:`2px solid ${t.border}` } }, d.author.name)),
      el('span', { style:{ ...eyebrow, fontSize:9 } }, 'author · lvl ' + d.author.level)),
    el('div', { style:{ display:'flex', alignItems:'center', gap: desktop ? 22 : 16, flexWrap:'wrap' } },
      el('div', { style:{ display:'flex', flexDirection:'column', gap:5 } },
        el('span', { style:{ ...cap, fontSize:8.5, letterSpacing:'.16em', color:t.label } }, 'level'),
        el('span', { style:{ fontFamily:CG, fontWeight:600, fontSize: desktop ? 32 : 27, lineHeight:.8, color:t.ink } }, d.level)
      ),
      el('span', { 'aria-hidden':true, style:{ width:1, alignSelf:'stretch', minHeight:34, background:t.hair } }),
      el('div', { style:{ display:'flex', flexDirection:'column', gap:5 } },
        el('span', { style:{ ...cap, fontSize:8.5, letterSpacing:'.16em', color:t.label } }, 'in progress'),
        el('span', { style:{ fontFamily:CG, fontWeight:600, fontSize: desktop ? 28 : 24, lineHeight:.8, color:t.ink } }, d.inProgress)
      ),
      el('span', { 'aria-hidden':true, style:{ width:1, alignSelf:'stretch', minHeight:34, background:t.hair } }),
      el('div', { style:{ display:'flex', flexDirection:'column', gap:5 } },
        el('span', { style:{ ...cap, fontSize:8.5, letterSpacing:'.16em', color:t.label } }, 'completed'),
        el('span', { style:{ fontFamily:CG, fontWeight:600, fontSize: desktop ? 28 : 24, lineHeight:.8, color:t.ink } }, d.completed)
      )
    )
  );

  // ── action plate ───────────────────────────────────────────────────────
  const worth = el('div', { style:{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 } },
    el('div', { style:{ display:'flex', alignItems:'baseline', justifyContent:'center', gap:8, flexWrap:'wrap' } },
      el('span', { style:{ ...cap, fontSize:8, letterSpacing:'.16em', color:t.label } }, 'base'),
      el('span', { style:{ fontFamily:CG, fontWeight:600, fontSize: desktop ? 21 : 18, lineHeight:1, color:t.ink } }, d.points),
      showMult ? el('span', { style:{ fontFamily:QS, fontWeight:700, fontSize:11, color:'#fff', background:`linear-gradient(180deg,${t.pk},${t.deep})`,
        border:`1.5px solid ${t.deep}`, borderRadius:20, padding:'3px 9px', lineHeight:1.2, boxShadow:`0 3px 8px ${t.glow}` } }, '×' + d.multiplier.toFixed(2)) : null
    ),
    ward(desktop ? 104 : 84)
  );

  const bigButton = (label, onClick, done) => el('div', { onClick, style:{ cursor:'pointer', textAlign:'center',
    background: done ? `linear-gradient(180deg,${t.gold},#d9a521)` : `linear-gradient(180deg,${t.pk},${t.deep})`,
    color: done ? '#5c3a06' : '#fff', fontFamily:QS, fontWeight:700, fontSize: desktop ? 13 : 12, letterSpacing:'.12em', textTransform:'uppercase',
    borderRadius:12, border:`1.5px solid ${done ? '#c08d14' : t.deep}`, padding: desktop ? '14px 18px' : '13px 12px',
    boxShadow: done ? '0 8px 18px -8px rgba(217,165,33,.6)' : `0 8px 18px -8px ${t.glow}`, display:'flex', alignItems:'center', justifyContent:'center', gap:7 } },
    sparkle(12, done ? '#5c3a06' : '#fff', .95), label);

  const ctaBody = taken
    ? el('div', null,
        el('div', { style:{ ...hand(desktop ? 27 : 24), marginBottom:11 } }, "You're on this task"),
        bigButton('continue', null, true),
        el('div', { onClick:()=>setTaken(false), style:{ cursor:'pointer', textAlign:'center', marginTop:10, ...italic(13.5, t.label) } }, 'drop this task')
      )
    : el('div', null,
        bigButton('sign up', ()=>setTaken(true)),
        el('div', { style:{ textAlign:'center', marginTop:10, ...italic(13.5, t.label) } },
          d.slotsOpen + ' of ' + d.slotsMax + ' spots open · level ' + d.level + ' and up')
      );

  const innerBox = { background:t.page, border:`1.5px solid ${t.border}`, borderRadius:12, padding: desktop ? '16px 18px' : '15px 14px', boxSizing:'border-box' };
  const actionPlate = el('div', { style:{ position:'relative', overflow:'hidden', borderRadius:18, border:`2px solid ${t.border}`, boxShadow:t.shadow,
    background:`linear-gradient(158deg,${t.lt2},${t.lt} 38%,${t.lav} 76%,${t.vio})`, padding:8, display:'flex', gap:8, alignItems:'stretch', boxSizing:'border-box' } },
    el('div', { style:{ ...innerBox, flex:'0 0 auto', minWidth: desktop ? 166 : 124, display:'flex', alignItems:'center', justifyContent:'center' } }, worth),
    el('div', { style:{ ...innerBox, flex:1, minWidth:0, display:'flex', flexDirection:'column', justifyContent:'center' } }, ctaBody)
  );

  // ── the asking ─────────────────────────────────────────────────────────
  const brief = el('section', { style:{ marginBottom: desktop ? 32 : 22 } },
    sectionHead('The task', 'full brief'),
    el('div', { style:{ ...panel, padding: desktop ? '22px 26px 20px' : '17px 18px' } },
      d.brief.map((p, i) => el('p', { key:i, style: i === 0
        ? { ...display(desktop ? 22 : 19), fontWeight:600, lineHeight:1.35, margin:'0 0 14px', textWrap:'pretty' }
        : { ...italic(desktop ? 15.5 : 14.5), margin: i === d.brief.length - 1 ? 0 : '0 0 12px', textWrap:'pretty' } }, p)),
      braid({ marginTop:16 })
    )
  );

  // ── spells cast ────────────────────────────────────────────────────────
  const sortTab = (key, label) => el('span', { key, onClick:()=>setSort(key), style:{ cursor:'pointer', ...cap, fontSize:8.5, letterSpacing:'.14em',
    padding:'5px 10px', borderRadius:8, color: sort === key ? '#fff' : t.label,
    background: sort === key ? `linear-gradient(180deg,${t.pk},${t.deep})` : 'transparent' } }, label);

  const list = (sort === 'loved' ? d.praxis : d.praxis.slice().reverse()).slice(0, showAll ? d.praxis.length : 3);

  const gallery = el('section', { style:{ marginBottom: desktop ? 32 : 22 } },
    el('div', { style:{ display:'flex', alignItems:'center', gap:12, marginBottom:14, flexWrap:'wrap' } },
      el('span', { style:{ ...display(desktop ? 27 : 23), letterSpacing:'.02em' } }, d.completed + ' submissions'),
      braid({ flex:1 }),
      el('span', { style:{ display:'flex', gap:2, padding:2, border:`1.5px solid ${t.border}`, borderRadius:10, background:t.card } },
        [sortTab('loved','most liked'), sortTab('recent','newest')])
    ),
    el('div', { style:{ display:'grid', gridTemplateColumns: desktop ? 'repeat(3,1fr)' : '1fr', gap:14 } },
      list.map((p) => el('div', { key:p.title, style:{ ...panel, borderRadius:14, cursor:'pointer', padding:'14px 15px 13px', position:'relative', overflow:'hidden' } },
        p.top ? el('span', { style:{ position:'absolute', right:12, top:12, display:'flex', alignItems:'center', gap:4, ...cap, fontSize:7.5, letterSpacing:'.14em',
          color:'#fff', background:`linear-gradient(180deg,${t.pk},${t.deep})`, borderRadius:20, padding:'4px 9px' } }, sparkle(9,'#fff',.95), 'most liked') : null,
        el('div', { style:{ ...cap, fontSize:8, letterSpacing:'.16em', color:t.label, marginBottom:7 } }, 'submission no. ' + p.rec),
        el('div', { style:{ ...display(desktop ? 20 : 19), marginBottom:9, textWrap:'pretty', paddingRight: p.top ? 8 : 0 } }, p.title),
        el('div', { style:{ display:'flex', alignItems:'center', gap:8, marginBottom:12 } },
          avatar(p.author, 26, 'coven'),
          el('span', { style:{ ...italic(13, t.label), overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' } }, p.author)
        ),
        el('div', { style:{ position:'relative', overflow:'hidden', height: desktop ? 118 : 108, borderRadius:10,
          background:`linear-gradient(150deg,${t.lt2},${t.lav})`, border:`1.5px solid ${t.border}`,
          display:'flex', alignItems:'center', justifyContent:'center' } },
          sigilMark(34)
        ),
        braid({ margin:'12px 0 10px' }),
        el('div', { style:{ display:'flex', alignItems:'center', gap:10 } },
          el('span', { style:{ display:'flex', alignItems:'center', gap:5, ...italic(13, t.soft) } }, heartIcon(12, t.pk), p.votes),
          el('span', { style:{ ...italic(13, t.label) } }, '♦ ' + p.score),
          el('span', { style:{ marginLeft:'auto', display:'flex', alignItems:'baseline', gap:4 } },
            el('span', { style:{ fontFamily:CG, fontWeight:600, fontSize:20, lineHeight:1, color:t.deep } }, p.pts),
            el('span', { style:{ ...cap, fontSize:7.5, letterSpacing:'.14em', color:t.label } }, 'pts')
          )
        ),
        el('div', { style:{ ...italic(12.5, t.dim), marginTop:8 } }, p.when)
      ))
    ),
    d.praxis.length > 3 ? el('div', { onClick:()=>setShowAll(!showAll), style:{ marginTop:14, cursor:'pointer', ...display(20), color:t.deep } },
      showAll ? 'fewer ↑' : 'all ' + d.completed + ' submissions →') : null
  );

  // ── whispers ───────────────────────────────────────────────────────────
  const comments = el('section', null,
    sectionHead('Comments', d.comments.length + ' notes'),
    el('div', { style:{ display:'flex', flexDirection:'column', gap:12, marginBottom:14 } },
      d.comments.map((c, i) => el('div', { key:i, style:{ ...panel, boxShadow:'none', padding:'13px 15px' } },
        el('div', { style:{ display:'flex', alignItems:'center', gap:9, marginBottom:8 } },
          avatar(c.author, 24, 'coven'),
          el('span', { style:{ fontFamily:QS, fontWeight:600, fontSize:12.5, color:t.ink } }, c.author),
          el('span', { style:{ marginLeft:'auto', ...cap, fontSize:8, letterSpacing:'.14em', color:t.dim } }, c.when)
        ),
        el('p', { style:{ margin:0, ...italic(14.5, t.soft), textWrap:'pretty' } }, c.body)
      ))
    ),
    el('div', { style:{ ...panel, boxShadow:'none', padding:'12px 14px', display:'flex', alignItems:'center', gap:12 } },
      el('span', { style:{ flex:1, ...italic(14, t.dim) } }, 'Add a comment…'),
      el('span', { style:{ cursor:'pointer', ...cap, fontSize:9, color:'#fff', background:`linear-gradient(180deg,${t.pk},${t.deep})`,
        border:`1.5px solid ${t.deep}`, borderRadius:9, padding:'7px 14px' } }, 'post')
    )
  );

  const styleTag = el('style', null, CVN_CSS);

  if (desktop) {
    return el('div', { style:{ position:'relative', width:'100%', boxSizing:'border-box', background:t.page, color:t.ink, fontFamily:QS, padding:'34px 38px 46px' } },
      styleTag, haze,
      el('div', { style:{ position:'relative', zIndex:1, display:'flex', gap:28, alignItems:'flex-start' } },
        el('div', { style:{ flex:1, minWidth:0 } }, header),
        el('div', { style:{ flex:'0 0 452px', width:452, marginTop:8 } }, actionPlate)
      ),
      el('div', { style:{ position:'relative', zIndex:1, minWidth:0 } }, brief, gallery, comments)
    );
  }

  return el('div', { style:{ position:'relative', width:'100%', boxSizing:'border-box', background:t.page, color:t.ink, fontFamily:QS, minHeight:'100%', display:'flex', flexDirection:'column' } },
    styleTag, haze,
    el('div', { style:{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', borderBottom:`1.5px solid ${t.border}`,
      position:'sticky', top:0, background:t.page, zIndex:5 } },
      el('span', { style:{ fontFamily:CG, fontSize:18, color:t.deep, cursor:'pointer' } }, '←'),
      el('span', { style:{ ...display(19), color:t.label } }, 'task no. ' + d.num),
      el('span', { style:{ marginLeft:'auto' } }, sigilMark(24))
    ),
    el('div', { style:{ position:'relative', zIndex:1, padding:'18px 16px 26px' } },
      header, el('div', { style:{ marginBottom:24 } }, actionPlate), brief, gallery, el('div', { style:{ height:22 } }), comments)
  );
}

module.exports = { CovenTaskDetail };
