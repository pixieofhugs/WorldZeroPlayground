// Warrior of Whimsy Task Detail — gold-and-plum parchment, MedievalSharp + Lora, bunting and balloons.
// Whimsy DRESS only; the copy is faction-agnostic (task pages don't get faction-specific language).
// header (breadcrumb, title, level / in progress / completed) beside one action plate (worth + sign up)
// → the task (brief) → submissions (sorted by score, avg + vote count) → comments.
// NOTE: no in-progress roster section — the header count covers it.
// Props: theme ('light'|'dark'), platform ('desktop'|'mobile'), state ('open'|'in_progress'), data.
const TOKENS = {
  light: {
    page:'#EFE6CE', card:'#FBF4E0', plaque:'#F3E7C4', inner:'#F7EED8',
    ink:'#2B2412', muted:'#8A7B54', dim:'#A79668',
    plum:'#7A4A9E', plumDeep:'#5B3277', gold:'#C8A02A', goldDeep:'#8A5A16',
    border:'#C8A02A', hair:'rgba(138,109,31,0.32)',
    ribbon:'repeating-linear-gradient(90deg,#C8A02A 0 11px,#7A4A9E 11px 22px)',
    onPlum:'#F3E7C4', shadow:'0 12px 30px -16px rgba(74,56,10,.5)',
    plaqueShadow:'2px 3px 0 rgba(74,56,10,.22)', dot:'rgba(74,56,10,0.05)'
  },
  dark: {
    page:'#100C05', card:'#1B1508', plaque:'#2A2210', inner:'#231B0C',
    ink:'#F3E7C4', muted:'#B69C64', dim:'#8B7642',
    plum:'#C79BE0', plumDeep:'#8A5AAE', gold:'#E3B84A', goldDeep:'#E3B84A',
    border:'#8A6A1F', hair:'rgba(199,155,224,0.26)',
    ribbon:'repeating-linear-gradient(90deg,#C8A02A 0 11px,#8A5AAE 11px 22px)',
    onPlum:'#F3E7C4', shadow:'0 18px 44px -18px rgba(0,0,0,.8)',
    plaqueShadow:'2px 3px 0 rgba(0,0,0,.45)', dot:'rgba(227,184,74,0.06)'
  }
};

const MED = "'MedievalSharp',cursive";
const LORA = "'Lora',Georgia,serif";

const WOW_CSS = `
@keyframes wowdWiggle{0%,100%{transform:translate(0,0)}25%{transform:translate(1.3px,-.8px)}50%{transform:translate(-.9px,1.2px)}75%{transform:translate(.9px,.8px)}}
@keyframes wowdBob{0%,100%{transform:translateY(0) rotate(3deg)}40%{transform:translateY(-7px) rotate(-2deg)}70%{transform:translateY(-3px) rotate(2deg)}}
@media (prefers-reduced-motion:reduce){.wowd-bob{animation:none !important}}
`;

const DATA = {
  author: { name: 'Wren Abalone', level: 4, href: '#/players/wren-abalone' },
  num: 663, title: "Hauled the block's recycling to the depot", level: 3,
  points: 12, multiplier: 1.5, inProgress: 4, completed: 18, slotsOpen: 5, slotsMax: 12,
  brief: [
    "A chore nobody asked you to — the quest is in the doing of it. Bring back proof the court can seal.",
    "Take the whole block's, not only your own. Stack it, wheel it, and don't announce yourself to a single neighbour on the way.",
    "Proof is one image and one line about the moment it stopped feeling like a chore. If it never stopped, say that instead — the court honours an honest grumble."
  ],
  praxis: [
    { title: 'Six bins, one very loud trolley', author: 'Bramblewick', score: '4.7', votes: 24, when: '2 days ago', pts: 27, rec: 1204, top: true },
    { title: 'I did it at dawn so nobody would thank me', author: 'Ostrich Featherby', score: '4.4', votes: 19, when: '4 days ago', pts: 25, rec: 1198 },
    { title: 'Found a whole lamp. Kept the lamp.', author: 'Juniper Ash', score: '4.2', votes: 16, when: '6 days ago', pts: 23, rec: 1181 },
    { title: 'The depot man saluted me', author: 'Maeve Thornbramble', score: '4.0', votes: 13, when: 'last week', pts: 21, rec: 1166 },
    { title: 'Two trips, one wheel, no dignity', author: 'the Kazoo Herald', score: '3.8', votes: 11, when: 'last month', pts: 19, rec: 1140 },
    { title: 'Grumbled the entire way, still went', author: 'unsigned', score: '4.1', votes: 15, when: 'last month', pts: 22, rec: 1127 }
  ],
  comments: [
    { author: 'Bramblewick', when: '3 days ago', body: 'The trolley is louder than you expect at 6am. Consider this a warning and an endorsement.' },
    { author: 'the Kazoo Herald', when: 'yesterday', body: 'Took the neighbours’ too. One of them saw me and I had to hide behind a hedge like a fool.' },
    { author: 'Juniper Ash', when: '5 hours ago', body: 'It stopped feeling like a chore somewhere around the third bin. Odd, that.' }
  ]
};

function WowTaskDetail(props) {
  const theme = props.theme === 'dark' ? 'dark' : 'light';
  const desktop = props.platform === 'desktop';
  const t = TOKENS[theme];
  const d = Object.assign({}, DATA, props.data || {});
  const el = React.createElement;

  const [taken, setTaken] = React.useState(props.state === 'in_progress');
  const [sort, setSort] = React.useState('score');
  const [showAll, setShowAll] = React.useState(false);
  React.useEffect(() => { setTaken(props.state === 'in_progress'); }, [props.state]);

  const yourPoints = Math.round(d.points * d.multiplier);
  const showMult = Math.abs(d.multiplier - 1) > 1e-9;

  const cap = { fontFamily:MED, letterSpacing:'.18em', textTransform:'uppercase' };
  const eyebrow = { ...cap, fontSize:10, color:t.plum };
  const display = (size) => ({ fontFamily:MED, fontSize:size, lineHeight:1.08, color:t.ink });
  const italic = (size, color) => ({ fontFamily:LORA, fontStyle:'italic', fontSize:size, lineHeight:1.55, color:color || t.muted });
  const panel = { background:t.card, border:`2px solid ${t.border}`, borderRadius:10, boxSizing:'border-box', boxShadow:t.shadow };

  // wavy gold→plum rule that stretches to its container
  const zig = (key, wrapStyle) => {
    const gid = 'wowd-zg-' + theme + '-' + (desktop ? 'd' : 'm') + '-' + key;
    let dd = 'M0,4 Q3,1 6,4'; for (let x = 12; x <= 120; x += 6) { dd += ' T' + x + ',4'; }
    return el('span', { key, 'aria-hidden':true, style:{ display:'block', minWidth:24, ...(wrapStyle||{}) } },
      el('svg', { width:'100%', height:8, viewBox:'0 0 120 8', preserveAspectRatio:'none', style:{ display:'block', overflow:'visible' } },
        el('defs', null, el('linearGradient', { id:gid, x1:'0', y1:'0', x2:'1', y2:'0' },
          el('stop', { offset:'0', stopColor:t.gold }), el('stop', { offset:'1', stopColor:t.plum }))),
        el('path', { d:dd, fill:'none', stroke:'url(#' + gid + ')', strokeWidth:1.6, vectorEffect:'non-scaling-stroke',
          strokeLinejoin:'round', strokeLinecap:'round', opacity:.85 })
      )
    );
  };

  const star = (size, color) => el('svg', { width:size, height:size, viewBox:'0 0 24 24', 'aria-hidden':true, style:{ display:'block', flex:'0 0 auto' } },
    el('path', { d:'M12 1.5l3.1 6.6 7.2.9-5.3 5 1.4 7.1L12 17.8 5.6 21.1 7 14 1.7 9l7.2-.9L12 1.5z', fill:color })
  );

  const shield = (size) => {
    const em = theme === 'dark' ? { s:'#6E4A94', e:'#E7C871', b:'#F5EAD0', h:'#E3B84A' }
                               : { s:'#7A4A9E', e:'#8A5A16', b:'#C8A02A', h:'#8A5A16' };
    return el('svg', { width:size, height:size, viewBox:'0 0 20 20', 'aria-hidden':true, style:{ display:'block', flex:'0 0 auto' } },
      el('path', { d:'M4,5 H16 V11 Q16,16 10,18.5 Q4,16 4,11 Z', fill:em.s, stroke:em.e, strokeWidth:1.4, strokeLinejoin:'round' }),
      el('line', { x1:3.5, y1:16.8, x2:16.5, y2:3.6, stroke:em.b, strokeWidth:1.8, strokeLinecap:'round' }),
      el('line', { x1:16.5, y1:16.8, x2:3.5, y2:3.6, stroke:em.b, strokeWidth:1.8, strokeLinecap:'round' }),
      el('circle', { cx:3.2, cy:17.3, r:1.1, fill:em.h }),
      el('circle', { cx:16.8, cy:17.3, r:1.1, fill:em.h })
    );
  };

  const balloons = (size, extra) => {
    const one = (cx, cy, fill, i) => el('g', { key:'b' + i },
      el('ellipse', { cx, cy, rx:9, ry:11, fill, stroke:'#3A2A0C', strokeWidth:1.2 }),
      el('path', { d:`M${cx-2},${cy+10.3} L${cx+2},${cy+10.3} L${cx},${cy+13.3} Z`, fill, stroke:'#3A2A0C', strokeWidth:1.1, strokeLinejoin:'round' }),
      el('ellipse', { cx:cx-4.5, cy:cy-5, rx:1.6, ry:2.3, fill:'rgba(255,255,255,.5)' }),
      el('circle', { cx:cx-3, cy:cy-1, r:2.4, fill:'#fff', stroke:'#3A2A0C', strokeWidth:.8 }),
      el('circle', { cx:cx+3, cy:cy-1, r:2.4, fill:'#fff', stroke:'#3A2A0C', strokeWidth:.8 }),
      el('circle', { cx:cx-3, cy:cy-.2, r:1, fill:'#241C0B', style:{ animation:'wowdWiggle 1.4s ease-in-out infinite', animationDelay:(i*.2)+'s', transformBox:'fill-box', transformOrigin:'center' } }),
      el('circle', { cx:cx+3, cy:cy-.2, r:1, fill:'#241C0B', style:{ animation:'wowdWiggle 1.4s ease-in-out infinite', animationDelay:(i*.2+.3)+'s', transformBox:'fill-box', transformOrigin:'center' } })
    );
    return el('span', { className:'wowd-bob', 'aria-hidden':true, style:{ display:'inline-block', width:size, height:size*1.25,
      filter:'drop-shadow(1px 2px 0 rgba(74,56,10,.25))', animation:'wowdBob 6s ease-in-out infinite', ...(extra||{}) } },
      el('svg', { width:size, height:size*1.25, viewBox:'0 0 44 56', style:{ display:'block' } },
        el('path', { d:'M12,28 Q16,41 22,51', fill:'none', stroke:t.muted, strokeWidth:1 }),
        el('path', { d:'M31,25 Q28,41 22,51', fill:'none', stroke:t.muted, strokeWidth:1 }),
        el('path', { d:'M22,36 Q23,44 22,51', fill:'none', stroke:t.muted, strokeWidth:1 }),
        one(12, 15, t.gold, 0), one(31, 12, t.gold, 1), one(22, 27, t.plum, 2),
        el('circle', { cx:22, cy:51, r:1.6, fill:t.goldDeep })
      )
    );
  };

  // bunting strung across the top of the page
  const bunting = el('div', { 'aria-hidden':true, style:{ display:'flex', alignItems:'flex-start', height:22, overflow:'hidden', opacity:.9, marginBottom:desktop?22:14 } },
    Array.from({ length: 30 }).map((_, i) => el('span', { key:i, style:{ flex:1, minWidth:0, height:0,
      borderLeft:'7px solid transparent', borderRight:'7px solid transparent',
      borderTop:`18px solid ${i % 2 ? t.plum : t.gold}`, marginRight:3, transform:'translateY(' + (i % 2 ? 2 : 0) + 'px)' } }))
  );

  const sectionHead = (label, gloss) => el('div', { style:{ display:'flex', alignItems:'center', gap:12, marginBottom:14 } },
    el('span', { style:{ ...display(desktop ? 27 : 23) } }, label),
    zig('sh-' + label, { flex:1 }),
    gloss ? el('span', { style:{ ...eyebrow, fontSize:9.5, color:t.muted, flex:'0 0 auto' } }, gloss) : null
  );

  const avatar = (name, size) => el('span', { style:{ width:size, height:size, borderRadius:'50%', flex:'0 0 auto', padding:2, boxSizing:'border-box',
    background:`linear-gradient(150deg,${t.gold},${t.plum})` } },
    el('span', { style:{ display:'flex', alignItems:'center', justifyContent:'center', width:'100%', height:'100%', borderRadius:'50%',
      background:t.plaque, fontFamily:MED, fontSize:size*.46, color:t.plum } }, name[0].toUpperCase())
  );

  // ── worth: the faction's rotated score plaque ──────────────────────────
  const plaque = (ptsSize) => el('div', { style:{ position:'relative', transform:'rotate(-2deg)', background:t.plaque,
    border:`2px solid ${t.gold}`, borderRadius:6, boxShadow:t.plaqueShadow, padding:'10px 18px 11px', textAlign:'center' } },
    el('div', { style:{ display:'flex', alignItems:'baseline', justifyContent:'center', gap:5 } },
      el('span', { style:{ fontFamily:MED, fontSize:ptsSize, lineHeight:.8, color:t.goldDeep } }, yourPoints),
      el('span', { style:{ fontFamily:MED, fontSize:15, color:t.gold } }, '✦')
    ),
    el('div', { style:{ ...italic(11, t.plum), marginTop:6 } }, 'your points')
  );

  const worth = el('div', { style:{ display:'flex', flexDirection:'column', alignItems:'center', gap:12 } },
    el('div', { style:{ display:'flex', alignItems:'baseline', justifyContent:'center', gap:7, flexWrap:'wrap' } },
      el('span', { style:{ ...cap, fontSize:9, color:t.muted } }, 'base'),
      el('span', { style:{ fontFamily:MED, fontSize: desktop ? 22 : 19, lineHeight:1, color:t.ink } }, d.points),
      showMult ? el('span', { style:{ fontFamily:MED, fontSize:12, color:t.onPlum, background:t.plum,
        border:`1.5px solid ${t.plumDeep}`, borderRadius:5, padding:'2px 8px', lineHeight:1.3 } }, '×' + d.multiplier.toFixed(2)) : null
    ),
    plaque(desktop ? 44 : 38)
  );

  const bigButton = (label, onClick, done) => el('div', { onClick, style:{ cursor:'pointer', textAlign:'center',
    background: done ? 'transparent' : t.plum, color: done ? t.plum : t.onPlum,
    fontFamily:MED, fontSize: desktop ? 17 : 16, letterSpacing:'.05em',
    border:`2px solid ${done ? t.gold : t.plumDeep}`, borderRadius:7, padding: desktop ? '13px 18px' : '12px 14px',
    display:'flex', alignItems:'center', justifyContent:'center', gap:8 } },
    star(13, done ? t.gold : t.onPlum), label);

  const ctaBody = taken
    ? el('div', null,
        el('div', { style:{ ...display(desktop ? 24 : 21), marginBottom:11 } }, "You're on this quest"),
        bigButton('Continue', null, true),
        el('div', { onClick:()=>setTaken(false), style:{ cursor:'pointer', textAlign:'center', marginTop:10, ...italic(13.5, t.dim) } }, 'drop this task')
      )
    : el('div', null,
        bigButton('Sign up', ()=>setTaken(true)),
        el('div', { style:{ textAlign:'center', marginTop:10, ...italic(13.5, t.dim) } },
          d.slotsOpen + ' of ' + d.slotsMax + ' spots open · level ' + d.level + ' and up')
      );

  const innerBox = { background:t.inner, border:`1.5px solid ${t.hair}`, borderRadius:8,
    padding: desktop ? '16px 18px' : '15px 14px', boxSizing:'border-box' };

  const actionPlate = el('div', { style:{ position:'relative', overflow:'hidden', borderRadius:11, border:`2px solid ${t.border}`,
    boxShadow:t.shadow, background:t.card, boxSizing:'border-box' } },
    el('div', { 'aria-hidden':true, style:{ height:6, background:t.ribbon } }),
    el('div', { style:{ padding:10, display:'flex', gap:10, alignItems:'stretch' } },
      el('div', { style:{ ...innerBox, flex:'0 0 auto', minWidth: desktop ? 176 : 132, display:'flex', alignItems:'center', justifyContent:'center' } }, worth),
      el('div', { style:{ ...innerBox, flex:1, minWidth:0, display:'flex', flexDirection:'column', justifyContent:'center' } }, ctaBody)
    )
  );

  // ── header ─────────────────────────────────────────────────────────────
  const stat = (label, value, big) => el('div', { style:{ display:'flex', flexDirection:'column', gap:6 } },
    el('span', { style:{ ...cap, fontSize:9, color:t.muted } }, label),
    el('span', { style:{ fontFamily:MED, fontSize: big ? (desktop ? 34 : 29) : (desktop ? 29 : 25), lineHeight:.8, color:t.ink } }, value)
  );

  const header = el('div', { style:{ marginBottom: desktop ? 30 : 20 } },
    el('div', { style:{ display:'flex', alignItems:'center', gap:8, marginBottom:12 } },
      el('span', { style:{ ...eyebrow } }, 'tasks'),
      el('span', { style:{ ...eyebrow, color:t.dim } }, '/'),
      el('span', { style:{ ...eyebrow, color:t.muted } }, 'task no. ' + d.num)
    ),
    el('div', { style:{ display:'flex', alignItems:'center', gap:10, marginBottom:10 } },
      shield(24),
      el('span', { style:{ ...italic(desktop ? 16 : 15, t.muted) } }, 'Task detail')
    ),
    el('h1', { style:{ ...display(desktop ? 46 : 32), margin:'0 0 18px', textWrap:'pretty' } }, d.title),
    el('div', { style:{ display:'flex', alignItems:'center', gap:10, marginBottom:18 } },
      el('a', { href:d.author.href, title:'View ' + d.author.name + "'s profile", style:{ display:'flex', alignItems:'center', gap:9, textDecoration:'none' } },
        el('span', { style:{ display:'inline-flex', alignItems:'center', justifyContent:'center', flex:'0 0 auto', width:30, height:30, borderRadius:'50%', overflow:'hidden', background:t.card, border:`2px solid ${t.border}`, fontFamily:MED, fontSize:13, color:t.plum } }, d.author.name.split(' ').map(function(w){return w[0];}).join('').slice(0,2).toUpperCase()),
        el('span', { style:{ fontFamily:MED, fontSize:16, color:t.ink, borderBottom:`2px dotted ${t.plum}` } }, d.author.name)),
      el('span', { style:{ ...eyebrow, fontSize:9 } }, 'author · lvl ' + d.author.level)),
    el('div', { style:{ display:'flex', alignItems:'center', gap: desktop ? 24 : 16, flexWrap:'wrap' } },
      stat('level', d.level, true),
      el('span', { 'aria-hidden':true, style:{ width:1, alignSelf:'stretch', minHeight:34, background:t.hair } }),
      stat('in progress', d.inProgress),
      el('span', { 'aria-hidden':true, style:{ width:1, alignSelf:'stretch', minHeight:34, background:t.hair } }),
      stat('completed', d.completed)
    )
  );

  // ── the task ───────────────────────────────────────────────────────────
  const brief = el('section', { style:{ marginBottom: desktop ? 32 : 22 } },
    sectionHead('The task', 'full brief'),
    el('div', { style:{ ...panel, padding: desktop ? '22px 26px 20px' : '17px 18px' } },
      d.brief.map((p, i) => el('p', { key:i, style: i === 0
        ? { ...display(desktop ? 23 : 20), lineHeight:1.32, margin:'0 0 14px', textWrap:'pretty' }
        : { ...italic(desktop ? 15.5 : 14.5), margin: i === d.brief.length - 1 ? 0 : '0 0 12px', textWrap:'pretty' } }, p)),
      zig('brief', { marginTop:16 })
    )
  );

  // ── submissions ────────────────────────────────────────────────────────
  const sortTab = (key, label) => el('span', { key, onClick:()=>setSort(key), style:{ cursor:'pointer', ...cap, fontSize:9,
    padding:'6px 11px', borderRadius:6, color: sort === key ? t.onPlum : t.muted, background: sort === key ? t.plum : 'transparent' } }, label);

  const ordered = sort === 'score'
    ? d.praxis.slice().sort((a, b) => parseFloat(b.score) - parseFloat(a.score))
    : d.praxis.slice().sort((a, b) => b.rec - a.rec);
  const list = ordered.slice(0, showAll ? ordered.length : 3);

  const gallery = el('section', { style:{ marginBottom: desktop ? 32 : 22 } },
    el('div', { style:{ display:'flex', alignItems:'center', gap:12, marginBottom:14, flexWrap:'wrap' } },
      el('span', { style:{ ...display(desktop ? 27 : 23) } }, d.completed + ' submissions'),
      zig('gal', { flex:1 }),
      el('span', { style:{ display:'flex', gap:3, padding:3, border:`2px solid ${t.border}`, borderRadius:8, background:t.card } },
        [sortTab('score', 'highest scored'), sortTab('recent', 'newest')])
    ),
    el('div', { style:{ display:'grid', gridTemplateColumns: desktop ? 'repeat(3,1fr)' : '1fr', gap:16 } },
      list.map((p) => el('div', { key:p.title, style:{ ...panel, cursor:'pointer', position:'relative', overflow:'hidden' } },
        el('div', { 'aria-hidden':true, style:{ height:5, background:t.ribbon } }),
        el('div', { style:{ padding:'14px 15px 14px' } },
          el('div', { style:{ display:'flex', alignItems:'center', gap:8, marginBottom:8 } },
            el('span', { style:{ ...cap, fontSize:9, color:t.muted } }, 'no. ' + p.rec),
            p.top ? el('span', { style:{ marginLeft:'auto', display:'flex', alignItems:'center', gap:4, ...cap, fontSize:8,
              color:t.onPlum, background:t.plum, border:`1.5px solid ${t.plumDeep}`, borderRadius:5, padding:'3px 8px' } },
              star(9, t.onPlum), 'top score') : null
          ),
          el('div', { style:{ ...display(desktop ? 20 : 19), marginBottom:10, textWrap:'pretty' } }, p.title),
          el('div', { style:{ display:'flex', alignItems:'center', gap:8, marginBottom:12 } },
            avatar(p.author, 26),
            el('span', { style:{ ...italic(13, t.muted), overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' } }, p.author)
          ),
          el('div', { style:{ height: desktop ? 116 : 106, borderRadius:7, border:`1.5px solid ${t.hair}`,
            background:`linear-gradient(150deg,${t.plaque},${t.inner})`, display:'flex', alignItems:'center', justifyContent:'center' } },
            balloons(46)
          ),
          zig('p-' + p.rec, { margin:'12px 0 10px' }),
          el('div', { style:{ display:'flex', alignItems:'center', gap:10 } },
            el('span', { style:{ display:'flex', alignItems:'center', gap:5 } }, star(12, t.gold),
              el('span', { style:{ fontFamily:MED, fontSize:15, color:t.ink } }, p.score)),
            el('span', { style:{ ...italic(12.5, t.dim) } }, p.votes + ' votes'),
            el('span', { style:{ marginLeft:'auto', display:'flex', alignItems:'baseline', gap:4 } },
              el('span', { style:{ fontFamily:MED, fontSize:20, lineHeight:1, color:t.goldDeep } }, p.pts),
              el('span', { style:{ ...cap, fontSize:8, color:t.muted } }, 'pts')
            )
          ),
          el('div', { style:{ ...italic(12.5, t.dim), marginTop:8 } }, p.when)
        )
      ))
    ),
    ordered.length > 3 ? el('div', { onClick:()=>setShowAll(!showAll), style:{ marginTop:14, cursor:'pointer', ...display(20), color:t.plum } },
      showAll ? 'fewer ↑' : 'all ' + d.completed + ' submissions →') : null
  );

  // ── comments ───────────────────────────────────────────────────────────
  const comments = el('section', null,
    sectionHead('Comments', d.comments.length + ' notes'),
    el('div', { style:{ display:'flex', flexDirection:'column', gap:12, marginBottom:14 } },
      d.comments.map((c, i) => el('div', { key:i, style:{ ...panel, boxShadow:'none', padding:'13px 15px' } },
        el('div', { style:{ display:'flex', alignItems:'center', gap:9, marginBottom:8 } },
          avatar(c.author, 24),
          el('span', { style:{ fontFamily:MED, fontSize:14, color:t.ink } }, c.author),
          el('span', { style:{ marginLeft:'auto', ...cap, fontSize:8.5, color:t.dim } }, c.when)
        ),
        el('p', { style:{ margin:0, ...italic(14.5, t.muted), textWrap:'pretty' } }, c.body)
      ))
    ),
    el('div', { style:{ ...panel, boxShadow:'none', padding:'12px 14px', display:'flex', alignItems:'center', gap:12 } },
      el('span', { style:{ flex:1, ...italic(14, t.dim) } }, 'Add a comment…'),
      el('span', { style:{ cursor:'pointer', ...cap, fontSize:10, color:t.onPlum, background:t.plum,
        border:`1.5px solid ${t.plumDeep}`, borderRadius:6, padding:'8px 15px' } }, 'post')
    )
  );

  const styleTag = el('style', null, WOW_CSS);
  const pageBg = { background:t.page, backgroundImage:`radial-gradient(${t.dot} 1px,transparent 1px)`, backgroundSize:'5px 5px' };

  if (desktop) {
    return el('div', { style:{ position:'relative', width:'100%', boxSizing:'border-box', color:t.ink, fontFamily:LORA, padding:'26px 38px 46px', ...pageBg } },
      styleTag, bunting,
      el('div', { style:{ display:'flex', gap:28, alignItems:'flex-start' } },
        el('div', { style:{ flex:1, minWidth:0 } }, header),
        el('div', { style:{ flex:'0 0 452px', width:452, marginTop:8 } }, actionPlate)
      ),
      el('div', { style:{ minWidth:0 } }, brief, gallery, comments)
    );
  }

  return el('div', { style:{ position:'relative', width:'100%', boxSizing:'border-box', color:t.ink, fontFamily:LORA,
    minHeight:'100%', display:'flex', flexDirection:'column', ...pageBg } },
    styleTag,
    el('div', { style:{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', borderBottom:`2px solid ${t.border}`,
      position:'sticky', top:0, background:t.card, zIndex:5 } },
      el('span', { style:{ fontFamily:MED, fontSize:20, color:t.plum, cursor:'pointer' } }, '←'),
      el('span', { style:{ ...display(19), color:t.muted } }, 'task no. ' + d.num),
      el('span', { style:{ marginLeft:'auto' } }, shield(22))
    ),
    el('div', { 'aria-hidden':true, style:{ height:5, background:t.ribbon } }),
    el('div', { style:{ padding:'16px 16px 26px' } },
      header, el('div', { style:{ marginBottom:24 } }, actionPlate), brief, gallery, el('div', { style:{ height:22 } }), comments)
  );
}

module.exports = { WowTaskDetail };
