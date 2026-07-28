// SNIDE Task Detail — the shared detail anatomy in SNIDE's dress: a ransom-note dossier
// photocopied one too many times. Dress is faction-specific, copy is NOT (task pages carry no
// faction-specific language). header (breadcrumb, cut-up headline, level / in progress / completed)
// beside one action plate (worth + take the job) → the task (brief) → submissions → comments.
// NOTE: no in-progress roster section — the header count is enough.
// Props: theme ('light'|'dark'), platform ('desktop'|'mobile'), state ('open'|'in_progress'), data.
const TOKENS = {
  light: {
    page:'#e0ddd1', paper:'#f4f1e8', paper2:'#efece3',
    ink:'#14110b', muted:'#5f5c50', faint:'#8d8a7c', dim:'#a5a294',
    acid:'#b6ff2e', acidDeep:'#6fae00', pink:'#ff2d8b', pinkDeep:'#be185d',
    bar:'#14110b', barText:'#f4f1e8', hard:'#14110b',
    rule:'rgba(20,17,11,.26)', grain:'rgba(20,17,11,.045)',
    shadow:'0 14px 32px -16px rgba(20,17,11,.5)'
  },
  dark: {
    page:'#0c0a07', paper:'#14110b', paper2:'#191510',
    ink:'#f4f1e8', muted:'#cfcdbf', faint:'#8f8c7e', dim:'#6f6c60',
    acid:'#b6ff2e', acidDeep:'#8ed11f', pink:'#ff2d8b', pinkDeep:'#ff69ac',
    bar:'#080706', barText:'#f4f1e8', hard:'#14110b',
    rule:'rgba(244,241,232,.24)', grain:'rgba(244,241,232,.05)',
    shadow:'0 18px 44px -18px rgba(0,0,0,.85)'
  }
};

const ANTON = "'Anton',Impact,sans-serif";
const BLACK = "'Archivo Black',Impact,sans-serif";
const TYPE  = "'Special Elite','Courier New',serif";
const MARK  = "'Permanent Marker','Marker Felt',cursive";

const SND_CSS = '';

const DATA = {
  author: { name: 'Wren Abalone', level: 4, href: '#/players/wren-abalone' },
  num: 305, title: 'Name the thing everyone is pretending not to notice',
  level: 3, points: 120, multiplier: 1.5,
  inProgress: 9, completed: 21, topScore: '4.6', slotsOpen: 4, slotsMax: 13,
  brief: [
    'Write it down, photograph the evidence, and post it before anyone can talk you out of it.',
    'Attribution optional, receipts mandatory. If you cannot show the thing you are naming, you are only complaining, and complaining is free.',
    'Then leave it up. The point is not the reaction — the point is that it exists somewhere outside your own head where it can no longer be denied.'
  ],
  praxis: [
    { title: 'Nobody has read the contract', author: 'Ratchet', score:'4.6', votes:22, when:'3 days ago', pts:180, rec:902, top:true },
    { title: 'Pasted the actual numbers over the poster', author: 'K. Vandal', score:'4.3', votes:17, when:'5 days ago', pts:165, rec:897 },
    { title: 'Said it in the meeting, on the record', author: 'unsigned', score:'4.1', votes:14, when:'last week', pts:150, rec:884 },
    { title: 'Photocopied the memo they deleted', author: 'Grit', score:'4.0', votes:12, when:'2 weeks ago', pts:144, rec:871 },
    { title: 'Asked who profits, out loud, twice', author: 'Marla Sharp', score:'3.9', votes:9, when:'last month', pts:138, rec:852 },
    { title: 'A sticker where the logo used to be', author: 'anonymous', score:'4.2', votes:15, when:'last month', pts:158, rec:840 }
  ],
  comments: [
    { author: 'Ratchet', when:'4 days ago', body:'Hardest part is the posting. Writing it down was twenty seconds. Hitting send took a week.' },
    { author: 'K. Vandal', when:'2 days ago', body:'Take the photo first. You will not be brave later, but the photo keeps.' },
    { author: 'unsigned', when:'9 hours ago', body:'Nobody argued. That was the disturbing part — everybody already knew.' }
  ]
};

function SnideTaskDetail(props) {
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

  const cap = { fontFamily:TYPE, letterSpacing:'.2em', textTransform:'uppercase' };
  const eyebrow = { ...cap, fontSize:9.5, color:t.faint };
  const slab = (size) => ({ fontFamily:ANTON, fontSize:size, lineHeight:1.02, color:t.ink, textTransform:'uppercase', letterSpacing:'.01em' });
  const typed = (size, color) => ({ fontFamily:TYPE, fontSize:size, lineHeight:1.55, color: color || t.muted });
  const panel = { background:t.paper, backgroundImage:`repeating-linear-gradient(0deg, ${t.grain} 0 1px, transparent 1px 3px)`,
    border:`2px solid ${t.ink}`, boxSizing:'border-box', boxShadow:t.shadow };

  // ── redaction ruler ────────────────────────────────────────────────────
  const rulerUrl = () => {
    const b = theme === 'dark' ? t.pink : t.ink;
    const blocks = [[0,26,4,b],[30,9,8,b],[43,27,3,b],[74,6,8,t.pink],[84,17,5,b],[105,6,8,t.acidDeep],[115,17,3,b]];
    const svg = "<svg xmlns='http://www.w3.org/2000/svg' width='132' height='10' viewBox='0 0 132 10'>"
      + blocks.map(([x,w,h,c]) => "<rect x='" + x + "' y='" + ((10-h)/2) + "' width='" + w + "' height='" + h + "' fill='" + c + "'/>").join('')
      + "</svg>";
    return "url(\"data:image/svg+xml," + encodeURIComponent(svg) + "\")";
  };
  const stripe = (extra) => el('span', { 'aria-hidden':true, style:{ display:'block', height:10, minWidth:24,
    backgroundImage:rulerUrl(), backgroundRepeat:'repeat-x', backgroundPosition:'left center', opacity:.85, ...(extra||{}) } });

  const xMark = (size, color) => el('svg', { width:size, height:size, viewBox:'0 0 20 20', 'aria-hidden':true,
      style:{ display:'block', flex:'0 0 auto', transform:'rotate(-6deg)' } },
    el('g', { fill:'none', stroke:color, strokeWidth:2.6, strokeLinecap:'round' },
      el('path', { d:'M3.5 3 C8 7.5 12 12 16.5 17.5' }),
      el('path', { d:'M16.5 3.5 C12.5 7 8 12 3 16.5' })
    )
  );

  // the headline, cut from four different sources
  const cuts = [
    { fontFamily:ANTON, color:t.ink, textTransform:'uppercase', transform:'rotate(-1deg)' },
    { fontFamily:ANTON, color:t.hard, textTransform:'uppercase', background:t.acid, padding:'0 6px', transform:'rotate(.8deg)' },
    { fontFamily:BLACK, color:t.paper, background:t.ink, padding:'1px 7px', fontSize:'.8em', textTransform:'uppercase', transform:'rotate(-1.6deg)' },
    { fontFamily:TYPE, color:t.ink, fontSize:'.7em', textTransform:'uppercase', borderBottom:`3px solid ${t.pink}`, transform:'rotate(1.2deg)' }
  ];
  const cutUp = (text, size, seed) => el('div', { style:{ display:'flex', flexWrap:'wrap', alignItems:'baseline', gap:'5px 7px',
      fontSize:size, lineHeight:1.14 } },
    String(text).split(/\s+/).map((w,i) => el('span', { key:i, style:{ display:'inline-block', ...cuts[(i + seed) % 4] } }, w))
  );

  // brief paragraph with two words taken by the censor
  const censored = (text, size, seed) => {
    const words = String(text).split(/\s+/);
    const cut = words.length > 7 ? seed % (words.length - 5) : -1;
    return words.map((w,i) => (cut >= 0 && i >= cut && i < cut + 2)
      ? el(React.Fragment, { key:i },
          el('span', { style:{ background:t.ink, color:'transparent', boxShadow:`0 0 0 2px ${t.ink}` } }, w), ' ')
      : el('span', { key:i }, w + (i < words.length - 1 ? ' ' : '')));
  };

  const statBlock = (label, value, big) => el('div', { style:{ display:'flex', flexDirection:'column', gap:3 } },
    el('span', { style:{ ...cap, fontSize:9, letterSpacing:'.18em', color:t.faint } }, label),
    el('span', { style:{ fontFamily:ANTON, fontSize: big ? (desktop ? 40 : 33) : (desktop ? 32 : 27), lineHeight:.82, color:t.ink,
      transform: big ? 'rotate(-1.5deg)' : 'none' } }, value)
  );

  const avatar = (name, size) => el('span', { style:{ width:size, height:size, flex:'0 0 auto', display:'flex', alignItems:'center',
      justifyContent:'center', background:t.ink, color:t.acid, fontFamily:ANTON, fontSize:size * 0.5, transform:'rotate(-2deg)' } },
    name[0].toUpperCase());

  const sectionHead = (label, gloss) => el('div', { style:{ display:'flex', alignItems:'center', gap:12, marginBottom:14, flexWrap:'wrap' } },
    el('span', { style:{ ...slab(desktop ? 27 : 23) } }, label),
    stripe({ flex:1 }),
    gloss ? el('span', { style:{ ...eyebrow, fontSize:9, flex:'0 0 auto' } }, gloss) : null
  );

  // ── header ─────────────────────────────────────────────────────────────
  const header = el('div', { style:{ marginBottom: desktop ? 30 : 20 } },
    el('div', { style:{ display:'flex', alignItems:'center', gap:8, marginBottom:12 } },
      el('span', { style:{ ...eyebrow, color:t.acidDeep } }, 'tasks'),
      el('span', { style:{ ...eyebrow, color:t.dim } }, '/'),
      el('span', { style:{ ...eyebrow } }, 'task no. ' + d.num)
    ),
    el('div', { style:{ display:'flex', alignItems:'center', gap:10, marginBottom:14, background:t.bar, padding:'8px 12px' } },
      el('span', { style:{ fontFamily:ANTON, fontSize:20, letterSpacing:'.06em', color:t.acid, lineHeight:1 } }, 'SNIDE'),
      el('span', { 'aria-hidden':true, style:{ flex:1, height:3, background:`repeating-linear-gradient(90deg, ${t.acid} 0 6px, transparent 6px 10px)` } }),
      el('span', { style:{ fontFamily:TYPE, fontSize:10.5, letterSpacing:'.14em', color:t.barText, opacity:.85 } }, 'task detail')
    ),
    el('div', { style:{ marginBottom:18 } }, cutUp(d.title, desktop ? 44 : 30, Math.round(d.num))),
    el('div', { style:{ display:'flex', alignItems:'center', gap:10, marginBottom:18 } },
      el('a', { href:d.author.href, title:'View ' + d.author.name + "'s profile", style:{ display:'flex', alignItems:'center', gap:9, textDecoration:'none' } },
        el('span', { style:{ display:'inline-flex', alignItems:'center', justifyContent:'center', flex:'0 0 auto', width:30, height:30, borderRadius:'50%', overflow:'hidden', borderRadius:2, background:'transparent', border:`2px solid ${t.ink}`, fontFamily:TYPE, fontSize:12, color:t.ink } }, d.author.name.split(' ').map(function(w){return w[0];}).join('').slice(0,2).toUpperCase()),
        el('span', { style:{ fontFamily:TYPE, fontSize:14, color:t.ink, borderBottom:`2px solid ${t.acidDeep}` } }, d.author.name)),
      el('span', { style:{ ...eyebrow, fontSize:9 } }, 'author · lvl ' + d.author.level)),
    el('div', { style:{ display:'flex', alignItems:'flex-end', gap: desktop ? 22 : 16, flexWrap:'wrap' } },
      statBlock('level', d.level, true),
      el('span', { 'aria-hidden':true, style:{ width:2, alignSelf:'stretch', minHeight:34, background:t.rule } }),
      statBlock('in progress', d.inProgress),
      el('span', { 'aria-hidden':true, style:{ width:2, alignSelf:'stretch', minHeight:34, background:t.rule } }),
      statBlock('completed', d.completed)
    )
  );

  // ── action plate: points circled in pink pen ───────────────────────────
  const stampSize = desktop ? 128 : 104;
  const stamp = el('div', { style:{ position:'relative', flex:'0 0 auto', width:stampSize, height:stampSize * 0.78,
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', transform:'rotate(-5deg)' } },
    el('svg', { width:'100%', height:'100%', viewBox:'0 0 100 78', 'aria-hidden':true, style:{ position:'absolute', inset:0, overflow:'visible' } },
      el('g', { fill:'none', stroke:t.pink, strokeLinecap:'round' },
        el('path', { d:'M14 40 C13 19 38 7 56 9 C79 11 91 24 89 40 C87 59 61 71 43 68 C23 65 12 55 13 37 C13 28 18 19 27 13', strokeWidth:2.6 }),
        el('path', { d:'M27 12 C16 18 11 28 11 39', strokeWidth:1.8, opacity:.75 })
      )
    ),
    el('span', { style:{ position:'relative', fontFamily:ANTON, fontSize:stampSize * 0.36, lineHeight:.9, color:t.ink } }, yourPoints),
    el('span', { style:{ position:'relative', fontFamily:ANTON, fontSize:10, letterSpacing:'.22em', marginTop:3, color:t.pink } }, 'PTS')
  );

  const halftone = (op) => `radial-gradient(${t.ink} 22%, transparent 23%) 0 0/6px 6px, radial-gradient(${t.ink} 22%, transparent 23%) 3px 3px/6px 6px`;

  const worth = el('div', { style:{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 } },
    el('div', { style:{ display:'flex', alignItems:'center', justifyContent:'center', gap:7, flexWrap:'wrap' } },
      el('span', { style:{ ...cap, fontFamily:BLACK, fontSize:8.5, letterSpacing:'.16em', color:t.acid,
        background:'#14110b', padding:'3px 7px', transform:'rotate(-1.5deg)' } }, 'base ' + d.points),
      showMult ? el('span', { style:{ fontFamily:MARK, fontSize: desktop ? 20 : 17, color:t.pink, transform:'rotate(4deg)', lineHeight:1 } }, '×' + d.multiplier.toFixed(2)) : null
    ),
    stamp
  );

  const bigButton = (label, onClick, done) => el('div', { onClick, style:{ position:'relative', cursor:'pointer', textAlign:'center',
      background: done ? '#14110b' : t.acid, color: done ? t.acid : t.hard,
      fontFamily:ANTON, fontSize: desktop ? 20 : 17, letterSpacing:'.2em', textTransform:'uppercase',
      border: done ? `3px solid ${t.acid}` : '3px solid #14110b', padding: desktop ? '15px 18px' : '13px 12px',
      boxShadow: done ? `7px 7px 0 ${t.pinkDeep}` : '7px 7px 0 #14110b',
      transform:'skewX(-4deg) rotate(-.8deg)', display:'flex', alignItems:'center', justifyContent:'center', gap:10,
      transition:'transform .12s ease, box-shadow .12s ease' } },
    xMark(17, t.pink),
    el('span', { style:{ transform:'skewX(4deg)' } }, label),
    xMark(17, t.pink));

  const ctaBody = taken
    ? el('div', null,
        el('div', { style:{ fontFamily:MARK, fontSize: desktop ? 26 : 21, color:t.ink, marginBottom:13, transform:'rotate(-1.4deg)',
          textDecoration:`underline 3px ${t.pink}`, textDecorationSkipInk:'none' } }, "You're on this task"),
        bigButton('continue', null, true),
        el('div', { onClick:()=>setTaken(false), style:{ cursor:'pointer', textAlign:'center', marginTop:16,
          ...typed(13, t.faint), textDecoration:'line-through' } }, 'drop this task')
      )
    : el('div', null,
        bigButton('sign up', ()=>setTaken(true)),
        el('div', { style:{ textAlign:'center', marginTop:16, ...typed(12.5, t.faint) } },
          d.slotsOpen + ' of ' + d.slotsMax + ' spots open · level ' + d.level + ' and up')
      );

  const staple = (extra) => el('span', { 'aria-hidden':true, style:{ position:'absolute', width:14, height:4, background:t.ink,
    boxShadow:`0 3px 0 -1px ${t.pink}`, ...(extra||{}) } });

  const innerBox = { background:t.paper, border:'3px solid #14110b', padding: desktop ? '16px 18px' : '15px 14px', boxSizing:'border-box' };
  const actionPlate = el('div', { style:{ position:'relative', background:t.acid, border:'3px solid #14110b',
      boxShadow:`10px 10px 0 ${t.pink}, ${t.shadow}`, boxSizing:'border-box', transform:'rotate(-.6deg)' } },
    el('div', { 'aria-hidden':true, style:{ height:14, background:`repeating-linear-gradient(45deg, ${t.acid} 0 9px, ${theme === 'dark' ? t.pink : '#14110b'} 9px 18px)` } }),
    el('div', { style:{ position:'relative', padding:9, display:'flex', gap:9, alignItems:'stretch' } },

      el('div', { style:{ ...innerBox, flex:'0 0 auto', minWidth: desktop ? 178 : 132, display:'flex', alignItems:'center', justifyContent:'center',
        backgroundImage:halftone(), backgroundColor:t.paper, position:'relative' } },
        el('span', { 'aria-hidden':true, style:{ position:'absolute', inset:3, background:t.paper, opacity:.86 } }),
        el('span', { style:{ position:'relative' } }, worth)
      ),
      el('div', { style:{ ...innerBox, flex:1, minWidth:0, display:'flex', flexDirection:'column', justifyContent:'center', padding: desktop ? '20px 22px' : '17px 15px' } }, ctaBody)
    )
  );

  // ── the task ───────────────────────────────────────────────────────────
  const brief = el('section', { style:{ marginBottom: desktop ? 32 : 22 } },
    sectionHead('The task', 'full brief'),
    el('div', { style:{ ...panel, padding: desktop ? '22px 26px 20px' : '17px 18px' } },
      d.brief.map((p, i) => i === 0
        ? el('p', { key:i, style:{ fontFamily:BLACK, fontSize: desktop ? 19 : 17, lineHeight:1.4, color:t.ink,
            margin:'0 0 16px', textWrap:'pretty' } }, p)
        : el('p', { key:i, style:{ ...typed(desktop ? 15 : 14), margin: i === d.brief.length - 1 ? 0 : '0 0 12px', textWrap:'pretty' } },
            censored(p, desktop ? 15 : 14, Math.round(d.num) + i))),
      stripe({ marginTop:18 })
    )
  );

  // ── submissions ────────────────────────────────────────────────────────
  const sortTab = (key, label) => el('span', { key, onClick:()=>setSort(key), style:{ cursor:'pointer', ...cap, fontSize:8.5, letterSpacing:'.14em',
    padding:'6px 11px', whiteSpace:'nowrap', color: sort === key ? t.hard : t.faint, background: sort === key ? t.acid : 'transparent' } }, label);

  const list = (sort === 'loved' ? d.praxis : d.praxis.slice().reverse()).slice(0, showAll ? d.praxis.length : 3);

  const gallery = el('section', { style:{ marginBottom: desktop ? 32 : 22 } },
    el('div', { style:{ display:'flex', alignItems:'center', gap:12, marginBottom:14, flexWrap:'wrap' } },
      el('span', { style:{ ...slab(desktop ? 27 : 23) } }, d.completed + ' submissions'),
      el('span', { style:{ ...cap, fontSize:8.5, letterSpacing:'.16em', color:t.faint } }, 'top score ' + d.topScore),
      stripe({ flex:1 }),
      el('span', { style:{ display:'flex', gap:2, padding:2, border:`2px solid ${t.ink}`, background:t.paper } },
        [sortTab('loved','highest scored'), sortTab('recent','newest')])
    ),
    el('div', { style:{ display:'grid', gridTemplateColumns: desktop ? 'repeat(3,1fr)' : '1fr', gap:16 } },
      list.map((p, i) => el('div', { key:p.title, style:{ ...panel, cursor:'pointer', padding:'14px 15px 13px', position:'relative',
          transform: 'rotate(' + (i % 2 ? .5 : -.5) + 'deg)' } },
        el('div', { style:{ ...cap, fontSize:8.5, letterSpacing:'.16em', color:t.faint, marginBottom:8 } }, 'submission no. ' + p.rec),
        el('div', { style:{ fontFamily:BLACK, fontSize: desktop ? 17 : 16, lineHeight:1.25, color:t.ink, marginBottom:10, textWrap:'pretty' } }, p.title),
        el('div', { style:{ display:'flex', alignItems:'center', gap:8, marginBottom:12 } },
          avatar(p.author, 26),
          el('span', { style:{ ...typed(12.5, t.muted), overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' } }, p.author)
        ),
        el('div', { style:{ position:'relative', overflow:'hidden', height: desktop ? 118 : 108, border:`2px solid ${t.ink}`,
            background:t.paper2, backgroundImage:`repeating-linear-gradient(135deg, ${t.grain} 0 6px, transparent 6px 12px)`,
            display:'flex', alignItems:'center', justifyContent:'center' } },
          el('span', { style:{ ...cap, fontSize:9, letterSpacing:'.2em', color:t.dim } }, 'submission')
        ),
        stripe({ margin:'12px 0 10px' }),
        el('div', { style:{ display:'flex', alignItems:'center', gap:10 } },
          el('span', { style:{ fontFamily:BLACK, fontSize:11.5, letterSpacing:'.04em', color:t.hard, background:t.acid, padding:'3px 7px' } }, '▲ ' + p.score),
          el('span', { style:{ display:'flex', alignItems:'center', gap:5, ...typed(12.5, t.faint) } }, xMark(12, t.pink), p.votes + ' votes'),
          el('span', { style:{ marginLeft:'auto', display:'flex', alignItems:'baseline', gap:4 } },
            el('span', { style:{ fontFamily:ANTON, fontSize:20, lineHeight:1, color:t.ink } }, p.pts),
            el('span', { style:{ ...cap, fontSize:8, letterSpacing:'.14em', color:t.pink } }, 'pts')
          )
        ),
        el('div', { style:{ ...typed(12, t.dim), marginTop:8 } }, p.when)
      ))
    ),
    d.praxis.length > 3 ? el('div', { onClick:()=>setShowAll(!showAll), style:{ marginTop:16, cursor:'pointer', display:'inline-block',
      ...slab(18), background:t.acid, color:t.hard, padding:'6px 12px', transform:'rotate(-.8deg)' } },
      showAll ? 'fewer ↑' : 'all ' + d.completed + ' submissions »') : null
  );

  // ── comments ───────────────────────────────────────────────────────────
  const comments = el('section', null,
    sectionHead('Comments', d.comments.length + ' notes'),
    el('div', { style:{ display:'flex', flexDirection:'column', gap:12, marginBottom:14 } },
      d.comments.map((c, i) => el('div', { key:i, style:{ ...panel, boxShadow:'none', padding:'13px 15px' } },
        el('div', { style:{ display:'flex', alignItems:'center', gap:9, marginBottom:8 } },
          avatar(c.author, 24),
          el('span', { style:{ fontFamily:BLACK, fontSize:12, color:t.ink } }, c.author),
          el('span', { style:{ marginLeft:'auto', ...cap, fontSize:8.5, letterSpacing:'.14em', color:t.dim } }, c.when)
        ),
        el('p', { style:{ margin:0, ...typed(14, t.muted), textWrap:'pretty' } }, c.body)
      ))
    ),
    el('div', { style:{ ...panel, boxShadow:'none', padding:'12px 14px', display:'flex', alignItems:'center', gap:12 } },
      el('span', { style:{ flex:1, ...typed(13.5, t.dim) } }, 'Add a comment…'),
      el('span', { style:{ cursor:'pointer', fontFamily:ANTON, fontSize:13, letterSpacing:'.14em', textTransform:'uppercase',
        color:t.hard, background:t.acid, border:`2px solid ${t.ink}`, padding:'7px 15px' } }, 'post')
    )
  );

  const styleTag = el('style', null, SND_CSS);
  const pageBg = { background:t.page, backgroundImage:`repeating-linear-gradient(0deg, ${t.grain} 0 1px, transparent 1px 3px)` };

  if (desktop) {
    return el('div', { style:{ position:'relative', width:'100%', boxSizing:'border-box', ...pageBg, color:t.ink,
        fontFamily:TYPE, padding:'34px 38px 46px' } },
      styleTag,
      el('div', { style:{ display:'flex', gap:28, alignItems:'flex-start' } },
        el('div', { style:{ flex:1, minWidth:0 } }, header),
        el('div', { style:{ flex:'0 0 452px', width:452, marginTop:22 } }, actionPlate)
      ),
      el('div', { style:{ minWidth:0 } }, brief, gallery, comments)
    );
  }

  return el('div', { style:{ position:'relative', width:'100%', boxSizing:'border-box', ...pageBg, color:t.ink,
      fontFamily:TYPE, minHeight:'100%', display:'flex', flexDirection:'column' } },
    styleTag,
    el('div', { style:{ display:'flex', alignItems:'center', gap:10, padding:'11px 16px', background:t.bar,
        position:'sticky', top:0, zIndex:5 } },
      el('span', { style:{ fontFamily:ANTON, fontSize:17, color:t.acid, cursor:'pointer' } }, '«'),
      el('span', { style:{ fontFamily:ANTON, fontSize:17, letterSpacing:'.06em', color:t.acid } }, 'SNIDE'),
      el('span', { style:{ marginLeft:'auto', fontFamily:TYPE, fontSize:10.5, letterSpacing:'.14em', color:t.barText, opacity:.85 } }, 'TASK NO. ' + d.num)
    ),
    el('div', { style:{ padding:'18px 16px 26px' } },
      header, el('div', { style:{ marginBottom:26 } }, actionPlate), brief, gallery, el('div', { style:{ height:22 } }), comments)
  );
}

module.exports = { SnideTaskDetail };
