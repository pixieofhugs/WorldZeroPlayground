// Unaffiliated (Default) Task Detail — rainbow-spectrum language (Lora + Courier Prime).
// Shared detail anatomy: header (folio №, status, level, points, modifier) → stat row →
// full brief (no clamp) → state block (sign up / in progress) → roster → praxis gallery
// → comment thread. Props: theme, platform, state ('open'|'in_progress'), task/data overrides.
const SPECTRUM = 'linear-gradient(90deg,#e2433f,#e07a3a 17%,#e6b94f 33%,#4ade80 50%,#3aa0a4 67%,#60a5fa 83%,#f472b6)';
const CONIC = 'conic-gradient(#e2433f 0 51deg,#e07a3a 0 103deg,#e6b94f 0 154deg,#4ade80 0 206deg,#3aa0a4 0 257deg,#60a5fa 0 309deg,#f472b6 0 360deg)';

const TOKENS = {
  light: {
    page:'#EFEBE0', ink:'#24222c', muted:'#8a8478', dim:'#b8b2a4', hair:'rgba(0,0,0,.08)',
    surface:'#fbf8f0', border:'rgba(0,0,0,.09)', chip:'#24222c', chipText:'#f6f2e8',
    proof:'#e6e0d2', shadow:'0 16px 42px -28px rgba(30,20,10,0.35)'
  },
  dark: {
    page:'#0f0e16', ink:'#f0e6d0', muted:'#7a7060', dim:'#4a4860', hair:'rgba(255,255,255,.09)',
    surface:'#181722', border:'rgba(255,255,255,.08)', chip:'#f0e6d0', chipText:'#13121a',
    proof:'#231f30', shadow:'0 18px 46px -28px rgba(0,0,0,0.7)'
  }
};

const LORA = "'Lora',Georgia,serif";
const MONO = "'Courier Prime','Courier New',monospace";
const BEBAS = "'Bebas Neue',Impact,sans-serif";

const DATA = {
  author: { name: 'Wren Abalone', level: 4, href: '#/players/wren-abalone' },
  num: 207, title: 'A Very Human Thing', level: 2, points: 18, multiplier: 1.25,
  inProgress: 6, completed: 19, topScore: '4.6', slotsOpen: 2, slotsMax: 3,
  brief: [
    'Make something small and honest, then leave it where a stranger will find it. It does not have to be good. It has to be yours, and it has to be given away.',
    'Document what you left and where — a photograph, a description, the time of day. Do not wait to see who takes it. The not-knowing is the task.',
    'A note counts. A drawing counts. A tomato from your windowsill counts. What does not count is anything made to be photographed rather than found.'
  ],
  roster: [
    { name: 'Wren Abalone', level: 4, tag: 'Friend' },
    { name: 'sixteen_candles', level: 2, tag: null },
    { name: 'Ossuary Pete', level: 7, tag: 'Foe' },
    { name: 'M. Delacroix', level: 3, tag: null },
    { name: 'quietriot', level: 1, tag: null },
    { name: 'Halden Voss', level: 5, tag: null }
  ],
  praxis: [
    { title: 'Left a paper crane on the 14 bus', author: 'Wren Abalone', score: '4.6', votes: 31, when: 'jul 14', pts: 23, rec: 663, top: true },
    { title: 'Seventeen tomatoes, one bench', author: 'Halden Voss', score: '4.2', votes: 24, when: 'jul 11', pts: 21, rec: 651 },
    { title: 'A letter to whoever finds it', author: 'quietriot', score: '3.9', votes: 12, when: 'jul 9', pts: 18, rec: 644 },
    { title: 'Rewired the fountain lights, briefly', author: 'Sable Mott', score: '4.4', votes: 27, when: 'jul 8', pts: 22, rec: 638 },
    { title: 'Chalk map of the river walk', author: 'Ines Aurel', score: '4.1', votes: 18, when: 'jul 2', pts: 20, rec: 612 },
    { title: 'Traded an apple for a story', author: 'Bellweather', score: '3.6', votes: 9, when: 'jun 27', pts: 16, rec: 601 }
  ],
  comments: [
    { author: 'Ossuary Pete', when: '3 days ago', body: 'Does it count if the stranger is your neighbour? Asking for legal reasons.' },
    { author: 'M. Delacroix', when: '2 days ago', body: 'It counts if you do not tell them it was you. That is the whole of it.' },
    { author: 'Wren Abalone', when: '19 hours ago', body: 'Went back to check on the crane. It was gone. Best feeling of the month.' }
  ]
};

function DefaultTaskDetail(props) {
  const theme = props.theme === 'dark' ? 'dark' : 'light';
  const desktop = props.platform === 'desktop';
  const t = TOKENS[theme];
  const d = Object.assign({}, DATA, props.data || {});

  const [signed, setSigned] = React.useState(props.state === 'in_progress');
  const [sort, setSort] = React.useState('top');
  React.useEffect(() => { setSigned(props.state === 'in_progress'); }, [props.state]);

  const yourPoints = Math.round(d.points * d.multiplier);
  const showMult = Math.abs(d.multiplier - 1) > 1e-9;
  const [showAllPraxis, setShowAllPraxis] = React.useState(false);

  const eyebrow = { fontFamily:MONO, fontSize:9.5, letterSpacing:'0.2em', textTransform:'uppercase', color:t.muted };
  const serif = (size, italic) => ({ fontFamily:LORA, fontWeight:600, fontStyle: italic ? 'italic' : 'normal', fontSize:size, color:t.ink, lineHeight:1.12 });
  const panel = { background:t.surface, border:`1px solid ${t.border}`, borderRadius:12, boxSizing:'border-box' };
  const el = React.createElement;

  const sectionHead = (label, gloss) => el('div', { style:{ display:'flex', alignItems:'baseline', gap:10, marginBottom:14 } },
    el('span', { style:{ ...eyebrow, fontSize:10, letterSpacing:'0.22em', color:t.ink } }, label),
    el('span', { style:{ flex:'0 1 46%', maxWidth:'46%', height:1.5, borderRadius:1, backgroundImage:SPECTRUM, opacity:.55 } }),
    gloss ? el('span', { style:{ ...eyebrow, fontSize:9.5 } }, gloss) : null
  );

  const spectrumRule = (h) => el('div', { 'aria-hidden':true, style:{ height:h||3, borderRadius:2, backgroundImage:SPECTRUM } });

  // ── header ─────────────────────────────────────────────────────────────
  const gradText = { backgroundImage:SPECTRUM, WebkitBackgroundClip:'text', backgroundClip:'text', color:'transparent' };
  const scoreBody = el('div', { style:{ display:'flex', flexDirection:'column', gap:10 } },
      el('div', { style:{ display:'flex', alignItems:'center', gap:9 } },
        el('span', { style:{ ...eyebrow, fontSize:9, letterSpacing:'0.16em' } }, 'base'),
        el('span', { style:{ fontFamily:BEBAS, fontSize: desktop ? 32 : 26, lineHeight:0.8, color:t.ink } }, d.points),
        showMult ? el('span', { style:{ marginLeft:'auto', display:'block', padding:2.5, borderRadius:7, backgroundImage:SPECTRUM } },
          el('span', { style:{ display:'block', fontFamily:BEBAS, fontSize: desktop ? 22 : 18, lineHeight:0.95, letterSpacing:'0.02em', color:t.ink, background:t.page, borderRadius:5, padding:'3px 8px', whiteSpace:'nowrap' } }, '×' + d.multiplier.toFixed(2))) : null
      ),
      el('div', { style:{ height:1, backgroundImage:SPECTRUM } }),
      el('div', { style:{ display:'flex', alignItems:'baseline', gap:6, lineHeight:1 } },
        el('span', { style:{ fontFamily:BEBAS, fontSize: desktop ? 46 : 36, lineHeight:1.02, color:t.ink } }, yourPoints),
        el('span', { style:{ fontFamily:BEBAS, fontSize:12, letterSpacing:'0.06em', color:'#ca8a04' } }, 'POINTS')
      )
  );
  const scoreStamp = el('div', { style:{ padding:3, borderRadius:15, backgroundImage:SPECTRUM, boxSizing:'border-box' } },
    el('div', { style:{ background:t.surface, borderRadius:12, padding: desktop ? '18px 20px' : '15px 16px', boxSizing:'border-box' } }, scoreBody)
  );

  const header = el('div', { style:{ marginBottom: desktop ? 30 : 22 } },
    el('div', { style:{ display:'flex', alignItems:'center', gap:8, marginBottom:14 } },
      el('span', { style:{ ...eyebrow, color:'#3aa0a4' } }, 'Tasks'),
      el('span', { style:{ ...eyebrow, color:t.dim } }, '/'),
      el('span', { style:{ ...eyebrow } }, 'Task №' + d.num)
    ),
    el('div', { style:{ display:'flex', alignItems:'center', gap:10, marginBottom:12 } },
      el('span', { style:{ width:7, height:7, borderRadius:2, backgroundImage:SPECTRUM } }),
      el('span', { style:{ ...eyebrow, fontSize:10 } }, 'Unaffiliated')
    ),
    el('h1', { style:{ ...serif(desktop ? 42 : 27, true), margin:'0 0 14px', letterSpacing:'-0.01em', textWrap:'pretty' } }, d.title),
    el('div', { style:{ display:'flex', alignItems:'center', gap:10, marginBottom:16 } },
      el('a', { href:d.author.href, title:'View ' + d.author.name + "'s profile", style:{ display:'flex', alignItems:'center', gap:9, textDecoration:'none' } },
        el('span', { style:{ display:'inline-flex', alignItems:'center', justifyContent:'center', flex:'0 0 auto', width:30, height:30, borderRadius:'50%', overflow:'hidden', background:t.page, boxShadow:`0 0 0 2px ${t.border}`, boxSizing:'border-box', fontFamily:LORA, fontWeight:600, fontSize:12, color:t.ink } }, d.author.name.split(' ').map(function(w){return w[0];}).join('').slice(0,2).toUpperCase()),
        el('span', { style:{ fontFamily:LORA, fontWeight:600, fontSize:15, color:t.ink, borderBottom:`1px solid ${t.hair}` } }, d.author.name)),
      el('span', { style:{ ...eyebrow, fontSize:9 } }, 'author · lvl ' + d.author.level)),
    el('div', { style:{ display:'flex', alignItems:'center', gap: desktop ? 20 : 14, flexWrap:'wrap' } },
      el('div', { style:{ display:'flex', flexDirection:'column', lineHeight:1 } },
        el('span', { style:{ ...eyebrow, fontSize:9, marginBottom:4 } }, 'Level'),
        el('span', { style:{ ...serif(desktop ? 30 : 25), lineHeight:0.9 } }, d.level)
      ),
      el('div', { style:{ display:'flex', alignItems:'center', gap: desktop ? 20 : 14, flex:'0 0 auto' } },
        el('span', { 'aria-hidden':true, style:{ width:1, alignSelf:'stretch', minHeight:34, background:t.hair } }),
        el('div', { style:{ display:'flex', flexDirection:'column', lineHeight:1 } },
          el('span', { style:{ ...eyebrow, fontSize:9, marginBottom:4 } }, 'In progress'),
          el('span', { style:{ ...serif(desktop ? 26 : 21), lineHeight:0.9 } }, d.inProgress)
        )
      ),
      null
    )
  );

  // ── stat row ───────────────────────────────────────────────────────────
  const hasMult = showMult;

  // ── brief ──────────────────────────────────────────────────────────────
  const brief = el('section', { style:{ marginBottom: desktop ? 34 : 24 } },
    sectionHead('Task Description'),
    d.brief.map((p, i) => el('p', { key:i, style:{ fontFamily:MONO, fontSize: desktop ? 13.5 : 12.5, lineHeight:1.75, color: t.ink, margin:'0 0 13px', textWrap:'pretty' } }, p))
  );

  // ── state block ────────────────────────────────────────────────────────
  const ctaBody = signed
      ? el('div', null,
          el('div', { style:{ display:'flex', alignItems:'center', gap:9, marginBottom:9 } },
            el('span', { style:{ fontFamily:MONO, fontSize:12, color:t.muted } }, "You're on this task")
          ),
          el('div', { style:{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' } },
            el('span', { style:{ cursor:'pointer', flex:1, textAlign:'center', fontFamily:LORA, fontWeight:600, fontSize: desktop ? 17 : 14, letterSpacing:'0.14em', textTransform:'uppercase', color:t.page, background:t.ink, border:`1px solid ${t.ink}`, borderRadius:10, padding: desktop ? '16px 20px' : '13px 14px' } }, 'Continue editing'),
            el('span', { onClick:()=>setSigned(false), style:{ cursor:'pointer', fontFamily:MONO, fontSize:11.5, color:t.muted, borderBottom:`1px solid ${t.hair}` } }, 'drop')
          )
        )
      : el('div', null,
          el('div', { onClick:()=>setSigned(true), style:{ cursor:'pointer', border:`1px solid ${t.ink}`, borderRadius:10, background:t.ink, padding: desktop ? '16px 20px' : '13px 14px', textAlign:'center', fontFamily:LORA, fontWeight:600, fontSize: desktop ? 17 : 14, letterSpacing:'0.14em', textTransform:'uppercase', color:t.page, marginBottom:10 } },
            'Sign up'),
          el('div', { style:{ fontFamily:MONO, fontSize:11, lineHeight:1.6, color:t.muted } },
            'You have ' + d.slotsOpen + ' of ' + d.slotsMax + ' task slots open · ',
            el('span', { style:{ color:'#4ade80' } }, 'Level ' + d.level + ' met'))
        );

  const cta = el('div', { style:{ padding:3, borderRadius:15, backgroundImage:SPECTRUM, boxSizing:'border-box' } },
    el('div', { style:{ background:t.surface, borderRadius:12, padding: desktop ? '18px 20px' : '15px 16px', boxSizing:'border-box' } }, ctaBody)
  );

  // score + sign-up, one panel
  const innerBox = { background:t.page, border:`1px solid ${t.border}`, borderRadius:11, padding: desktop ? '16px 18px' : '15px 16px', boxSizing:'border-box' };
  const actionPanel = el('div', { style:{ padding:4, borderRadius:18, backgroundImage:SPECTRUM, boxSizing:'border-box' } },
    el('div', { style:{ background:t.surface, borderRadius:14, padding:7, boxSizing:'border-box', display:'flex', flexDirection:'row', gap:7, alignItems:'stretch' } },
      el('div', { style:{ ...innerBox, flex:'0 0 auto', minWidth: desktop ? 168 : 122 } }, scoreBody),
      el('div', { style:{ ...innerBox, flex:1, display:'flex', flexDirection:'column', justifyContent:'center' } }, ctaBody)
    )
  );

  // ── roster ─────────────────────────────────────────────────────────────
  const rosterRest = Math.max(0, d.inProgress - (desktop ? 5 : 4));
  const roster = el('section', null,
    sectionHead('In progress', d.inProgress + ' players'),
    el('div', { style:{ display:'flex', flexDirection:'column', gap:1, background:t.hair, border:`1px solid ${t.border}`, borderRadius:12, overflow:'hidden' } },
      d.roster.slice(0, desktop ? 5 : 4).map((p) => el('div', { key:p.name, style:{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:t.surface } },
        el('span', { style:{ width:26, height:26, borderRadius:'50%', flex:'0 0 auto', padding:2, background:CONIC, boxSizing:'border-box' } },
          el('span', { style:{ display:'flex', alignItems:'center', justifyContent:'center', width:'100%', height:'100%', borderRadius:'50%', background:t.page, fontFamily:LORA, fontWeight:600, fontSize:11, color:t.ink } }, p.name[0].toUpperCase())
        ),
        el('span', { style:{ fontFamily:MONO, fontSize:12, color:t.ink, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' } }, p.name),
        p.tag ? el('span', { style:{ ...eyebrow, fontSize:8, color: p.tag === 'Foe' ? '#e2433f' : '#3aa0a4', border:`1px solid ${p.tag === 'Foe' ? '#e2433f' : '#3aa0a4'}`, borderRadius:3, padding:'2px 5px' } }, p.tag) : null,
        el('span', { style:{ marginLeft:'auto', ...eyebrow, fontSize:9 } }, 'lvl ' + p.level)
      )),
      rosterRest > 0 ? el('div', { style:{ background:t.surface, padding:'10px 12px', fontFamily:MONO, fontSize:11.5, color:'#3aa0a4', cursor:'pointer' } }, '+' + rosterRest + ' more →') : null
    )
  );

  // ── praxis gallery ─────────────────────────────────────────────────────
  const sortTab = (key, label) => el('span', { key, onClick:()=>setSort(key), style:{ cursor:'pointer', ...eyebrow, fontSize:9, padding:'5px 10px', borderRadius:6,
    color: sort === key ? t.chipText : t.muted, background: sort === key ? t.chip : 'transparent' } }, label);

  const gallery = el('section', { style:{ marginBottom: desktop ? 34 : 24 } },
    el('div', { style:{ display:'flex', alignItems:'center', gap:10, marginBottom:14, flexWrap:'wrap' } },
      el('span', { style:{ ...eyebrow, fontSize:10, letterSpacing:'0.22em', color:t.ink } }, d.completed + ' completed praxis'),
      el('span', { style:{ flex:1, height:1.5, borderRadius:1, backgroundImage:SPECTRUM, opacity:.55, minWidth:20 } }),
      el('span', { style:{ display:'flex', gap:2, padding:2, border:`1px solid ${t.border}`, borderRadius:8 } }, [sortTab('top','Top rated'), sortTab('recent','Recent')])
    ),
    el('div', { style:{ display:'grid', gridTemplateColumns: desktop ? 'repeat(3,1fr)' : '1fr', gap:14 } },
      (sort === 'top' ? d.praxis : d.praxis.slice().reverse()).slice(0, showAllPraxis ? d.praxis.length : 3).map((p) => el('div', { key:p.title, style:{ ...panel, borderRadius:10, cursor:'pointer', padding:'15px 15px 13px', boxShadow: theme === 'dark' ? '0 4px 18px rgba(0,0,0,0.45)' : '0 3px 14px rgba(34,26,18,0.10)' } },
        el('div', { style:{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 } },
          el('div', { style:{ flex:1, minWidth:0 } },
            el('div', { style:{ fontFamily:MONO, fontSize:8.5, letterSpacing:'0.16em', textTransform:'uppercase', marginBottom:6, backgroundImage:SPECTRUM, WebkitBackgroundClip:'text', backgroundClip:'text', color:'transparent' } }, 'record №' + p.rec + ' · logged'),
            el('div', { style:{ fontFamily:BEBAS, fontSize:21, letterSpacing:'0.02em', lineHeight:1.04, color:t.ink, marginBottom:7, textWrap:'pretty' } }, p.title),
            el('div', { style:{ display:'flex', alignItems:'center', gap:8 } },
              el('span', { style:{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:24, height:24, borderRadius:'50%', flex:'0 0 auto', background:t.page, border:`1.5px solid ${t.border}`, fontFamily:BEBAS, fontSize:10.5, color:t.muted } }, p.author.slice(0,2).toUpperCase()),
              el('span', { style:{ fontFamily:MONO, fontSize:10, lineHeight:1.2, color:t.muted, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' } }, p.author)
            )
          ),
          el('div', { style:{ flex:'0 0 auto', minWidth:78, background:t.page, border:`1px solid ${t.border}`, borderRadius:8, transform:'rotate(-1deg)', padding:'8px 10px 9px' } },
            el('div', { style:{ ...eyebrow, fontSize:8, letterSpacing:'0.1em' } }, 'votes ' + p.votes),
            el('div', { style:{ height:1, backgroundImage:SPECTRUM, margin:'6px 0 7px' } }),
            el('div', { style:{ display:'flex', alignItems:'baseline', gap:4, lineHeight:1 } },
              el('span', { style:{ fontFamily:BEBAS, fontSize:26, lineHeight:1.1, backgroundImage:SPECTRUM, WebkitBackgroundClip:'text', backgroundClip:'text', color:'transparent' } }, p.pts),
              el('span', { style:{ fontFamily:BEBAS, fontSize:9, letterSpacing:'0.06em', color:'#ca8a04' } }, 'PTS')
            )
          )
        ),
        el('div', { style:{ position:'relative', marginTop:13, height: desktop ? 132 : 118, borderRadius:8, overflow:'hidden', background:t.proof, boxShadow:`0 0 0 1px ${t.border}`, display:'flex', alignItems:'flex-end', justifyContent:'space-between', padding:9, boxSizing:'border-box' } },
          el('span', { style:{ ...eyebrow, fontSize:8, color:t.dim } }, 'proof'),
          p.top ? el('span', { title:'Task Crown — top praxis for this task', style:{ position:'relative', display:'inline-block', width:28, height:28, flex:'0 0 auto' } },
            el('span', { style:{ position:'absolute', inset:0, borderRadius:'50%', backgroundImage:SPECTRUM, boxShadow:'inset 0 0 0 1px rgba(0,0,0,.2)' } }),
            el('span', { style:{ position:'absolute', inset:3, borderRadius:'50%', background:t.surface, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'inset 0 0 0 1px rgba(0,0,0,.12)' } },
              el('svg', { viewBox:'0 0 40 48', width:11, height:13, 'aria-hidden':true, style:{ display:'block', color:t.ink } },
                el('g', { fill:'currentColor' },
                  el('path', { d:'M20 1 C15.5 9 15.5 18 20 27 C24.5 18 24.5 9 20 1 Z' }),
                  el('path', { d:'M17.5 25 C11 15 1.5 17 2.5 25.5 C3.3 31.8 10.8 33.4 15.4 29.4 C10 29 9.5 23.5 17.5 25 Z' }),
                  el('path', { d:'M22.5 25 C29 15 38.5 17 37.5 25.5 C36.7 31.8 29.2 33.4 24.6 29.4 C30 29 30.5 23.5 22.5 25 Z' }),
                  el('rect', { x:'12.5', y:'29', width:'15', height:'4.5', rx:'2.2' }),
                  el('path', { d:'M20 33.5 C16.5 39.5 16 43.5 20 47.5 C24 43.5 23.5 39.5 20 33.5 Z' }),
                  el('path', { d:'M16 33.5 C12 36 9.5 40 12.5 43.5 C13.6 39.5 15.3 37.2 17.6 35.6 Z' }),
                  el('path', { d:'M24 33.5 C28 36 30.5 40 27.5 43.5 C26.4 39.5 24.7 37.2 22.4 35.6 Z' })
                )
              )
            )) : null
        ),
        el('div', { style:{ fontFamily:MONO, fontSize:10, color:t.muted, marginTop:11 } }, p.when),
        el('div', { 'aria-hidden':true, style:{ height:2, borderRadius:2, backgroundImage:SPECTRUM, opacity:.4, marginTop:11 } })
      ))
    ),
    d.praxis.length > 3 ? el('div', { onClick:()=>setShowAllPraxis(!showAllPraxis), style:{ marginTop:14, fontFamily:MONO, fontSize:12, color:'#3aa0a4', cursor:'pointer' } },
      showAllPraxis ? 'Show fewer ↑' : 'View all ' + d.completed + ' praxis →') : null
  );

  // ── comments ───────────────────────────────────────────────────────────
  const comments = el('section', null,
    sectionHead('Discussion', d.comments.length + ' comments'),
    el('div', { style:{ display:'flex', flexDirection:'column', gap:12, marginBottom:14 } },
      d.comments.map((c, i) => el('div', { key:i, style:{ ...panel, padding:'13px 15px' } },
        el('div', { style:{ display:'flex', alignItems:'center', gap:9, marginBottom:8 } },
          el('span', { style:{ width:22, height:22, borderRadius:'50%', flex:'0 0 auto', padding:2, background:CONIC, boxSizing:'border-box' } },
            el('span', { style:{ display:'flex', alignItems:'center', justifyContent:'center', width:'100%', height:'100%', borderRadius:'50%', background:t.page, fontFamily:LORA, fontWeight:600, fontSize:10, color:t.ink } }, c.author[0].toUpperCase())
          ),
          el('span', { style:{ fontFamily:MONO, fontSize:11.5, color:t.ink } }, c.author),
          el('span', { style:{ marginLeft:'auto', ...eyebrow, fontSize:8.5 } }, c.when)
        ),
        el('p', { style:{ margin:0, fontFamily:MONO, fontSize:12.5, lineHeight:1.65, color:t.muted, textWrap:'pretty' } }, c.body)
      ))
    ),
    el('div', { style:{ ...panel, padding:'12px 14px', display:'flex', alignItems:'center', gap:12 } },
      el('span', { style:{ flex:1, fontFamily:MONO, fontSize:12, color:t.dim } }, 'Say something about this call…'),
      el('span', { style:{ cursor:'pointer', ...eyebrow, fontSize:9, color:t.chipText, background:t.chip, borderRadius:6, padding:'7px 12px' } }, 'Post')
    )
  );

  // ── layout ─────────────────────────────────────────────────────────────
  if (desktop) {
    return el('div', { style:{ width:'100%', boxSizing:'border-box', background:t.page, color:t.ink, fontFamily:MONO, padding:'34px 38px 44px' } },
      el('div', { style:{ display:'flex', gap:28, alignItems:'flex-start' } },
        el('div', { style:{ flex:1, minWidth:0 } }, header),
        el('div', { style:{ flex:'0 0 440px', width:440, marginTop:10 } }, actionPanel)
      ),
      el('div', { style:{ minWidth:0 } }, brief, gallery, comments)
    );
  }

  return el('div', { style:{ width:'100%', boxSizing:'border-box', background:t.page, color:t.ink, fontFamily:MONO, minHeight:'100%', display:'flex', flexDirection:'column' } },
    el('div', { style:{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', borderBottom:`1px solid ${t.hair}`, position:'sticky', top:0, background:t.page, zIndex:5 } },
      el('span', { style:{ fontFamily:LORA, fontSize:16, color:t.ink, cursor:'pointer' } }, '←'),
      el('span', { style:{ ...eyebrow, fontSize:9 } }, 'Task №' + d.num),
      el('span', { style:{ marginLeft:'auto', ...eyebrow, fontSize:9, color:'#3aa0a4' } }, 'open')
    ),
    el('div', { style:{ padding:'18px 16px 24px' } }, header, el('div', { style:{ marginBottom:24 } }, actionPanel), brief, gallery, el('div', { style:{ height:24 } }), comments)
  );
}

module.exports = { DefaultTaskDetail };
