// The Everymen Task Detail — union broadsheet dress (cream newsprint, red masthead, cog rules,
// Bebas Neue headlines, Courier Prime dispatch body, rubber-stamp wage seals). Same shared detail
// anatomy as the other factions: header (tasks / dispatch №, headline, grade · hands · filed) →
// action plate (base + multiplier + your points stamp, report for duty / continue + drop) →
// the full call → filed submissions sorted by score → the floor (comments). No roster section.
const TOKENS = {
  light: {
    ink:'#221A12', muted:'#6C5A40', dim:'#9C8A6C', red:'#C1272D', redDeep:'#8D1C20',
    gold:'#D99A2B', goldDeep:'#A9741A', olive:'#5B6238',
    page:'#DDCEAC', paper:'#ECE1C6', cream:'#F4ECD6', proof:'#DCCFB0',
    hair:'rgba(34,26,18,0.22)', border:'rgba(34,26,18,0.34)',
    mast:'#C1272D', mastText:'#F4ECD6',
    shadow:'0 12px 32px -18px rgba(34,26,18,0.5)'
  },
  dark: {
    ink:'#F3E7CE', muted:'#B6A079', dim:'#8A7A5C', red:'#E2433F', redDeep:'#B32A28',
    gold:'#E7B94F', goldDeep:'#B3852A', olive:'#8A955A',
    page:'#17110D', paper:'#221A16', cream:'#2C231C', proof:'#2A211A',
    hair:'rgba(243,231,206,0.2)', border:'rgba(243,231,206,0.26)',
    mast:'#C1272D', mastText:'#F7ECD6',
    shadow:'0 14px 36px -18px rgba(0,0,0,0.85)'
  }
};

const BEBAS = "'Bebas Neue',Impact,sans-serif";
const COURIER = "'Courier Prime','Courier New',monospace";
const LORA = "'Lora',Georgia,serif";

const DATA = {
  author: { name: 'Wren Abalone', level: 4, href: '#/players/wren-abalone' },
  num: 207, title: 'Organize a neighborhood tool library', level: 3, points: 45, multiplier: 1.25,
  inProgress: 23, completed: 31, slotsOpen: 2, slotsMax: 3,
  brief: [
    'Pool what the block already owns — drills, ladders, a good saw — and lend it out. Nobody buys twice what everybody can share once.',
    'Take an inventory first. Write down every tool, who it belongs to, and what shape it is in. A library nobody can find things in is a closet.',
    'Then post the hours somewhere public, and hold them. The lending is the easy part; being reliably open on a Tuesday evening is the work.'
  ],
  praxis: [
    { title: 'Forty-one tools, one hallway closet', author: 'Halden Voss', score:'4.6', votes:31, when:'jul 14', pts:56, rec:663, top:true },
    { title: 'Ladder rack built from pallet wood', author: 'Ines Aurel', score:'4.4', votes:27, when:'jul 11', pts:54, rec:651 },
    { title: 'Card catalogue for the saw shelf', author: 'quietriot', score:'4.1', votes:18, when:'jul 9', pts:50, rec:644 },
    { title: 'Tuesday hours, held for a year', author: 'Wren Abalone', score:'4.0', votes:22, when:'jul 8', pts:49, rec:638 },
    { title: 'Two drills and a sign-out sheet', author: 'Bellweather', score:'3.7', votes:12, when:'jul 2', pts:45, rec:612 },
    { title: 'Repaired what came back broken', author: 'Sable Mott', score:'3.5', votes:9, when:'jun 27', pts:43, rec:601 }
  ],
  comments: [
    { author: 'Ossuary Pete', when:'3 days ago', body:'Who eats the cost when a borrowed drill comes back dead? Put it in writing before the first loan, not after.' },
    { author: 'M. Delacroix', when:'2 days ago', body:'The block does. That is the whole point of the thing. Keep a repair jar by the door and let people drop what they can.' },
    { author: 'Halden Voss', when:'19 hours ago', body:'Inventory took one Saturday. Forty-one tools on the first pass and nobody has bought a new ladder since.' }
  ]
};

function EverymenTaskDetail(props) {
  const theme = props.theme === 'dark' ? 'dark' : 'light';
  const desktop = props.platform === 'desktop';
  const t = TOKENS[theme];
  const d = Object.assign({}, DATA, props.data || {});
  const el = React.createElement;

  const [signed, setSigned] = React.useState(props.state === 'in_progress');
  const [sort, setSort] = React.useState('top');
  const [showAll, setShowAll] = React.useState(false);
  React.useEffect(() => { setSigned(props.state === 'in_progress'); }, [props.state]);

  const showMult = Math.abs(d.multiplier - 1) > 1e-9;
  const yourPoints = Math.round(d.points * d.multiplier);

  const label = { fontFamily:BEBAS, letterSpacing:'0.18em', textTransform:'uppercase' };
  const eyebrow = { fontFamily:COURIER, fontSize:9.5, letterSpacing:'0.2em', textTransform:'uppercase', color:t.muted };
  const head = (size) => ({ fontFamily:BEBAS, fontSize:size, lineHeight:0.94, letterSpacing:'0.01em', textTransform:'uppercase', color:t.ink });
  const panel = { background:t.paper, border:`2px solid ${t.ink}`, borderRadius:2, boxSizing:'border-box' };

  const gear = (size, fill, hole, extra) => {
    const teeth = 8, R = 9.5, tipLen = 5, tipHalf = 1.6, rootHalf = 2.6;
    let path = '';
    for (let n = 0; n < teeth; n++) {
      const a0 = (n / teeth) * Math.PI * 2, step = (Math.PI * 2) / teeth;
      const p = (rad, ang) => [12 + rad * Math.cos(ang), 12 + rad * Math.sin(ang)];
      const b1 = p(R, a0 - (rootHalf/R)), t1 = p(R + tipLen, a0 - (tipHalf/(R+tipLen))),
            t2 = p(R + tipLen, a0 + (tipHalf/(R+tipLen))), b2 = p(R, a0 + (rootHalf/R)),
            nb = p(R, a0 + step - (rootHalf/R));
      path += (n === 0 ? 'M' + b1[0] + ',' + b1[1] : 'L' + b1[0] + ',' + b1[1])
        + 'L' + t1[0] + ',' + t1[1] + 'L' + t2[0] + ',' + t2[1] + 'L' + b2[0] + ',' + b2[1]
        + 'A' + R + ',' + R + ' 0 0 1 ' + nb[0] + ',' + nb[1];
    }
    path += 'Z';
    return el('svg', { width:size, height:size, viewBox:'0 0 24 24', 'aria-hidden':true, style:{ display:'block', flex:'0 0 auto', ...(extra||{}) } },
      el('path', { d:path, fill }), el('circle', { cx:12, cy:12, r:3, fill:hole }));
  };

  const dashRule = (mb) => el('div', { 'aria-hidden':true, style:{ borderTop:`2px dashed ${t.red}`, marginBottom: mb || 0 } });

  const sectionHead = (title, gloss) => el('div', { style:{ display:'flex', alignItems:'center', gap:10, marginBottom:14 } },
    gear(14, t.red, t.paper),
    el('span', { style:{ ...label, fontSize:14, letterSpacing:'0.2em', color:t.ink } }, title),
    el('span', { style:{ flex:1, height:0, borderTop:`2px dashed ${t.red}`, minWidth:20 } }),
    gloss ? el('span', { style:{ ...eyebrow, fontSize:9 } }, gloss) : null
  );

  // rubber-stamp seal for a number
  const seal = (value, caption, size, fontSize) => el('div', { style:{ position:'relative', flex:'0 0 auto', width:size, height:size, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', transform:'rotate(-4deg)' } },
    el('span', { 'aria-hidden':true, style:{ position:'absolute', inset:0, borderRadius:'50%', border:`2px solid ${t.red}`, boxShadow:`inset 0 0 0 3px ${t.paper}, inset 0 0 0 4px ${t.red}` } }),
    el('span', { style:{ fontFamily:BEBAS, fontSize:fontSize, lineHeight:0.8, color:t.red } }, value),
    el('span', { style:{ ...label, fontSize:8, letterSpacing:'0.22em', color:t.red, marginTop:2 } }, caption)
  );

  // ── header ────────────────────────────────────────────────────────────
  const stat = (cap, val, size) => el('div', { style:{ display:'flex', flexDirection:'column', lineHeight:1 } },
    el('span', { style:{ ...label, fontSize:10, color:t.olive, marginBottom:4 } }, cap),
    el('span', { style:{ fontFamily:BEBAS, fontSize:size, lineHeight:0.86, color:t.ink } }, val)
  );

  const header = el('div', { style:{ marginBottom: desktop ? 28 : 20 } },
    el('div', { style:{ display:'flex', alignItems:'center', gap:8, marginBottom:14 } },
      el('span', { style:{ ...eyebrow, color:t.red } }, 'Tasks'),
      el('span', { style:{ ...eyebrow, color:t.dim } }, '/'),
      el('span', { style:eyebrow }, 'Task №' + d.num)
    ),
    el('div', { style:{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, padding:'8px 16px', background:t.mast, border:`2px solid ${t.ink}`, boxShadow:`inset 0 -6px 0 -4px ${t.page}`, marginBottom:16 } },
      gear(14, t.mastText, t.mast, { opacity:.95 }),
      el('span', { style:{ ...label, fontSize:16, color:t.mastText } }, 'The Everymen'),
      gear(14, t.mastText, t.mast, { opacity:.95 })
    ),
    el('h1', { style:{ ...head(desktop ? 50 : 32), margin:'0 0 6px', textWrap:'pretty' } }, d.title),
    el('div', { style:{ display:'flex', alignItems:'center', gap:10, marginBottom:16 } },
      el('a', { href:d.author.href, title:'View ' + d.author.name + "'s profile", style:{ display:'flex', alignItems:'center', gap:9, textDecoration:'none' } },
        el('span', { style:{ display:'inline-flex', alignItems:'center', justifyContent:'center', flex:'0 0 auto', width:30, height:30, borderRadius:'50%', overflow:'hidden', background:t.cream, border:`2px solid ${t.ink}`, fontFamily:BEBAS, fontSize:13, color:t.red } }, d.author.name.split(' ').map(function(w){return w[0];}).join('').slice(0,2).toUpperCase()),
        el('span', { style:{ fontFamily:BEBAS, fontSize:19, letterSpacing:'0.06em', textTransform:'uppercase', color:t.ink, borderBottom:`2px solid ${t.red}` } }, d.author.name)),
      el('span', { style:{ ...eyebrow, fontSize:9 } }, 'author · lvl ' + d.author.level)),
    dashRule(14),
    el('div', { style:{ display:'flex', alignItems:'flex-end', gap: desktop ? 26 : 18, flexWrap:'wrap' } },
      stat('Level', d.level, desktop ? 34 : 28),
      el('span', { 'aria-hidden':true, style:{ width:2, alignSelf:'stretch', minHeight:32, background:t.hair } }),
      stat('In progress', d.inProgress, desktop ? 30 : 25),
      el('span', { 'aria-hidden':true, style:{ width:2, alignSelf:'stretch', minHeight:32, background:t.hair } }),
      stat('Completed', d.completed, desktop ? 30 : 25)
    )
  );

  // ── action plate ──────────────────────────────────────────────────────
  const wageBox = el('div', { style:{ display:'flex', flexDirection:'column', gap:10 } },
    el('div', { style:{ display:'flex', alignItems:'center', gap:9 } },
      el('span', { style:{ ...eyebrow, fontSize:9, letterSpacing:'0.16em' } }, 'base'),
      el('span', { style:{ fontFamily:BEBAS, fontSize: desktop ? 30 : 25, lineHeight:0.8, color:t.ink } }, d.points),
      showMult ? el('span', { style:{ marginLeft:'auto', ...label, fontSize: desktop ? 17 : 15, letterSpacing:'0.04em', color:t.goldDeep, border:`2px solid ${t.gold}`, borderRadius:2, padding:'3px 8px', whiteSpace:'nowrap' } }, '×' + d.multiplier.toFixed(2)) : null
    ),
    dashRule(0),
    el('div', { style:{ display:'flex', alignItems:'center', gap:10 } },
      seal(yourPoints, 'points', desktop ? 74 : 64, desktop ? 30 : 26),
      el('span', { style:{ fontFamily:COURIER, fontSize:10.5, lineHeight:1.5, color:t.muted } }, 'your points')
    )
  );

  const ctaBar = (text, filled, onClick) => el('div', { onClick, style:{ cursor:'pointer', textAlign:'center', padding: desktop ? '15px 20px' : '13px 14px',
    background: filled ? t.red : 'transparent', color: filled ? t.mastText : t.ink,
    border:`2px solid ${filled ? t.red : t.ink}`, borderRadius:2, ...label, fontSize: desktop ? 18 : 15, letterSpacing:'0.16em', whiteSpace:'nowrap' } }, text);

  const ctaBox = signed
    ? el('div', null,
        el('div', { style:{ display:'flex', alignItems:'center', gap:8, marginBottom:10 } },
          gear(13, t.olive, t.paper),
          el('span', { style:{ fontFamily:COURIER, fontSize:11.5, color:t.muted } }, "You're on this task")),
        ctaBar('Continue editing', true),
        el('div', { onClick:()=>setSigned(false), style:{ cursor:'pointer', marginTop:10, fontFamily:COURIER, fontSize:11, color:t.muted, textAlign:'center', textDecoration:'line-through' } }, 'drop this task')
      )
    : el('div', null,
        ctaBar('Sign up', true, ()=>setSigned(true)),
        el('div', { style:{ marginTop:10, fontFamily:COURIER, fontSize:10.5, lineHeight:1.6, color:t.muted } },
          d.slotsOpen + ' of ' + d.slotsMax + ' task slots open · ',
          el('span', { style:{ color:t.olive } }, 'Level ' + d.level + ' met'))
      );

  const plateInner = { background:t.cream, border:`2px solid ${t.ink}`, borderRadius:2, padding: desktop ? '16px 18px' : '14px 16px', boxSizing:'border-box' };
  const actionPlate = el('div', { style:{ ...panel, padding:6, background:t.page, boxShadow:t.shadow } },
    el('div', { style:{ display:'flex', flexDirection: desktop ? 'row' : 'column', gap:6, alignItems:'stretch' } },
      el('div', { style:{ ...plateInner, flex: desktop ? '0 0 auto' : '1', minWidth: desktop ? 156 : 0 } }, wageBox),
      el('div', { style:{ ...plateInner, flex:1, display:'flex', flexDirection:'column', justifyContent:'center' } }, ctaBox)
    )
  );

  // ── the call ──────────────────────────────────────────────────────────
  const brief = el('section', { style:{ marginBottom: desktop ? 34 : 26 } },
    sectionHead('Task Description'),
    d.brief.map((p, i) => el('p', { key:i, style:{ fontFamily:COURIER, fontSize: desktop ? 13.5 : 12.5, lineHeight:1.78, color:t.ink, margin:'0 0 13px', textWrap:'pretty' } }, p))
  );

  // ── filed submissions ─────────────────────────────────────────────────
  const sortTab = (key, text) => el('span', { key, onClick:()=>setSort(key), style:{ cursor:'pointer', ...label, fontSize:11, letterSpacing:'0.14em', padding:'5px 11px',
    color: sort === key ? t.mastText : t.muted, background: sort === key ? t.ink : 'transparent' } }, text);

  const list = (sort === 'top' ? d.praxis : d.praxis.slice().reverse()).slice(0, showAll ? d.praxis.length : 3);

  const gallery = el('section', { style:{ marginBottom: desktop ? 34 : 26 } },
    el('div', { style:{ display:'flex', alignItems:'center', gap:10, marginBottom:14, flexWrap:'wrap' } },
      gear(14, t.red, t.paper),
      el('span', { style:{ ...label, fontSize:14, letterSpacing:'0.2em', color:t.ink } }, d.completed + ' completed praxis'),
      el('span', { style:{ flex:1, height:0, borderTop:`2px dashed ${t.red}`, minWidth:20 } }),
      el('span', { style:{ display:'flex', gap:2, padding:2, border:`2px solid ${t.ink}`, background:t.cream } }, [sortTab('top','Top rated'), sortTab('recent','Recent')])
    ),
    el('div', { style:{ display:'grid', gridTemplateColumns: desktop ? 'repeat(3,1fr)' : '1fr', gap:14 } },
      list.map((p) => el('div', { key:p.title, style:{ ...panel, cursor:'pointer', padding:'14px 15px 13px', boxShadow:t.shadow } },
        el('div', { style:{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, marginBottom:11 } },
          el('div', { style:{ flex:1, minWidth:0 } },
            el('div', { style:{ ...eyebrow, fontSize:8.5, color:t.red, marginBottom:6 } }, 'record Nº' + p.rec),
            el('div', { style:{ ...head(21), marginBottom:8, textWrap:'pretty' } }, p.title),
            el('div', { style:{ display:'flex', alignItems:'center', gap:8 } },
              el('span', { style:{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:24, height:24, borderRadius:'50%', flex:'0 0 auto', background:t.cream, border:`2px solid ${t.border}`, fontFamily:BEBAS, fontSize:10.5, color:t.muted } }, p.author.slice(0,2).toUpperCase()),
              el('span', { style:{ fontFamily:COURIER, fontSize:10, color:t.muted, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' } }, p.author))
          ),
          el('div', { style:{ flex:'0 0 auto', minWidth:74, background:t.cream, border:`2px solid ${t.ink}`, transform:'rotate(-1.5deg)', padding:'7px 9px 8px', textAlign:'center' } },
            el('div', { style:{ ...eyebrow, fontSize:8, letterSpacing:'0.1em' } }, p.score + ' · ' + p.votes + ' votes'),
            el('div', { style:{ borderTop:`2px dashed ${t.red}`, margin:'6px 0 6px' } }),
            el('div', { style:{ display:'flex', alignItems:'baseline', justifyContent:'center', gap:4, lineHeight:1 } },
              el('span', { style:{ fontFamily:BEBAS, fontSize:24, lineHeight:1, color:t.red } }, p.pts),
              el('span', { style:{ ...label, fontSize:9, letterSpacing:'0.1em', color:t.goldDeep } }, 'pts'))
          )
        ),
        el('div', { style:{ position:'relative', height: desktop ? 128 : 116, background:t.proof, border:`2px solid ${t.border}`, display:'flex', alignItems:'flex-end', justifyContent:'space-between', padding:9, boxSizing:'border-box' } },
          el('span', { style:{ ...eyebrow, fontSize:8, color:t.dim } }, 'proof'),
          p.top ? el('span', { title:'Task Crown — top praxis for this task', style:{ display:'flex', alignItems:'center', gap:5, ...label, fontSize:9, letterSpacing:'0.16em', color:t.mastText, background:t.red, padding:'4px 7px' } }, 'top praxis') : null
        ),
        el('div', { style:{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:11 } },
          el('span', { style:{ fontFamily:COURIER, fontSize:10, color:t.muted } }, p.when),
          gear(12, t.red, t.paper))
      ))
    ),
    d.praxis.length > 3 ? el('div', { onClick:()=>setShowAll(!showAll), style:{ marginTop:14, fontFamily:COURIER, fontSize:12, color:t.red, cursor:'pointer' } },
      showAll ? 'Show fewer ↑' : 'View all ' + d.completed + ' praxis →') : null
  );

  // ── the floor (comments) ──────────────────────────────────────────────
  const comments = el('section', null,
    sectionHead('Discussion', d.comments.length + ' comments'),
    el('div', { style:{ display:'flex', flexDirection:'column', gap:12, marginBottom:14 } },
      d.comments.map((c, i) => el('div', { key:i, style:{ ...panel, padding:'13px 15px' } },
        el('div', { style:{ display:'flex', alignItems:'center', gap:9, marginBottom:8 } },
          el('span', { style:{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:22, height:22, borderRadius:'50%', flex:'0 0 auto', background:t.cream, border:`2px solid ${t.border}`, fontFamily:LORA, fontWeight:600, fontSize:10, color:t.ink } }, c.author[0].toUpperCase()),
          el('span', { style:{ fontFamily:COURIER, fontSize:11.5, color:t.ink } }, c.author),
          el('span', { style:{ marginLeft:'auto', ...eyebrow, fontSize:8.5 } }, c.when)),
        el('p', { style:{ margin:0, fontFamily:COURIER, fontSize:12.5, lineHeight:1.68, color:t.muted, textWrap:'pretty' } }, c.body)
      ))
    ),
    el('div', { style:{ ...panel, padding:'11px 13px', display:'flex', alignItems:'center', gap:12 } },
      el('span', { style:{ flex:1, fontFamily:COURIER, fontSize:12, color:t.dim } }, 'Say something about this task…'),
      el('span', { style:{ cursor:'pointer', ...label, fontSize:12, letterSpacing:'0.16em', color:t.mastText, background:t.ink, padding:'7px 13px' } }, 'Post')
    )
  );

  // rising-sun rays fanning up from the bottom edge + faint newsprint scanlines
  const rayInk = theme === 'dark' ? 'rgba(226,67,63,0.13)' : 'rgba(193,39,45,0.10)';
  const newsprint = { backgroundColor:t.page, backgroundAttachment:'local', backgroundImage:
      `repeating-conic-gradient(from 200deg at 50% 118%, ${rayInk} 0 2.6deg, transparent 2.6deg 6.4deg),`
    + `radial-gradient(58% 46% at 50% 116%, ${theme==='dark'?'rgba(226,67,63,0.12)':'rgba(193,39,45,0.12)'}, transparent 72%)`
  };

  if (desktop) {
    return el('div', { style:{ width:'100%', boxSizing:'border-box', ...newsprint, color:t.ink, fontFamily:COURIER, padding:'34px 38px 44px' } },
      el('div', { style:{ display:'flex', gap:28, alignItems:'flex-start' } },
        el('div', { style:{ flex:1, minWidth:0 } }, header),
        el('div', { style:{ flex:'0 0 520px', width:520, marginTop:34 } }, actionPlate)
      ),
      el('div', { style:{ minWidth:0 } }, brief, gallery, comments)
    );
  }

  return el('div', { style:{ width:'100%', boxSizing:'border-box', ...newsprint, color:t.ink, fontFamily:COURIER, minHeight:'100%', display:'flex', flexDirection:'column' } },
    el('div', { style:{ display:'flex', alignItems:'center', gap:10, padding:'11px 16px', background:t.mast, borderBottom:`2px solid ${t.ink}`, position:'sticky', top:0, zIndex:5 } },
      el('span', { style:{ ...label, fontSize:16, color:t.mastText, cursor:'pointer' } }, '←'),
      el('span', { style:{ ...label, fontSize:13, color:t.mastText } }, 'Task №' + d.num),
      el('span', { style:{ marginLeft:'auto', ...label, fontSize:11, letterSpacing:'0.2em', color:t.mastText, opacity:.85 } }, signed ? 'in progress' : 'open')
    ),
    el('div', { style:{ padding:'18px 16px 28px' } }, header, el('div', { style:{ marginBottom:26 } }, actionPlate), brief, gallery, comments)
  );
}

module.exports = { EverymenTaskDetail };
