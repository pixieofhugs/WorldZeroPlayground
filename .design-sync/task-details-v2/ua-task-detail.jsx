// UA Task Detail — the shared detail anatomy in UA's language (vellum / ensō / EB Garamond · Cormorant).
// header (task №, faction line, title, author, level, in hand) beside one action panel (points ensō + sign up)
// → the call in full → completed praxis grid → discussion. No roster (the header count covers it).
// Props: theme ('light'|'dark'), platform ('mobile'|'desktop'), state ('open'|'in_progress'), data overrides.
const TOKENS = {
  light: {
    page:'#E7DAC2', dot:'rgba(20,17,11,0.05)',
    ua:'#DD5A1E', uaDeep:'#B8471A', vermil:'#B5361A', gilt:'#A98246',
    ink:'#2E2820', muted:'#8B7C67', dim:'#AFA08A', hair:'#DBCBB3',
    surface:'#FDF0DF', surfaceAlt:'#F7E7D2', border:'#DBCBB3',
    chipText:'#FCF7EF', proof:'#EADCC4',
    lotusOp:0.30, lotusFilter:'none',
    ensoFilter:'saturate(1.15) brightness(0.98)',
    glyphFilter:'saturate(1.3) brightness(0.85)',
    sealFilter:'brightness(0) invert(1)',
    shadow:'0 16px 44px -30px rgba(20,12,6,0.55)'
  },
  dark: {
    page:'#1B1611', dot:'rgba(255,240,214,0.045)',
    ua:'#E86A2C', uaDeep:'#F0894A', vermil:'#E97544', gilt:'#C9A46A',
    ink:'#F0E6D6', muted:'#A08C72', dim:'#6E6252', hair:'#3B3229',
    surface:'#241E18', surfaceAlt:'#2D261F', border:'#3B3229',
    chipText:'#241E18', proof:'#312820',
    lotusOp:0.50, lotusFilter:'saturate(1.35) brightness(1.2)',
    ensoFilter:'saturate(1.35) brightness(1.28)',
    glyphFilter:'saturate(1.35) brightness(1.3)',
    sealFilter:'brightness(0)',
    shadow:'0 18px 46px -28px rgba(0,0,0,0.72)'
  }
};

const EB = "'EB Garamond',serif";
const COR = "'Cormorant Garamond',serif";

const DATA = {
  author: { name: 'Ines Aurel', level: 5, href: '#/players/ines-aurel' },
  num: 207, title: 'Render the old library facade in charcoal', level: 4, points: 24, multiplier: 1.25,
  inProgress: 17, completed: 23, slotsOpen: 2, slotsMax: 3,
  brief: [
    'Go at morning, before the light turns flat. Stand where the whole north facade fits your held hand and stay there — one vantage, one sitting. Vine charcoal on rag; no pencil under it.',
    'Leave the ivy in. Leave the broken sill in. The building has been repaired badly for a hundred years and the record of that is the subject, not the architecture as drawn.',
    'Bring back the sheet and a note of the hour you began and the hour you stopped. Fixative optional. Smudges are testimony.'
  ],
  praxis: [
    { title: 'North facade, 6:40 to 8:15', author: 'Ines Aurel', votes: 31, when: 'jul 14', pts: 30, rec: 663, top: true },
    { title: 'The sill, twice over', author: 'Halden Voss', votes: 24, when: 'jul 11', pts: 27, rec: 651 },
    { title: 'Ivy taking the cornice', author: 'quietriot', votes: 12, when: 'jul 9', pts: 22, rec: 644 },
    { title: 'Study in three greys', author: 'Sable Mott', votes: 27, when: 'jul 8', pts: 28, rec: 638 },
    { title: 'From the gate, raining', author: 'M. Delacroix', votes: 18, when: 'jul 2', pts: 25, rec: 612 },
    { title: 'One sitting, unfixed', author: 'Bellweather', votes: 9, when: 'jun 27', pts: 19, rec: 601 }
  ],
  comments: [
    { author: 'Halden Voss', when: '3 days ago', body: 'Does the scaffolding on the west return count as part of the facade? It has been there since March.' },
    { author: 'Ines Aurel', when: '2 days ago', body: 'It counts. It is the most honest thing on the building.' },
    { author: 'quietriot', when: '19 hours ago', body: 'Started at 6:40 and lost the light by eight. Second sitting tomorrow, same stone.' }
  ]
};

function UATaskDetail(props) {
  const theme = props.theme === 'dark' ? 'dark' : 'light';
  const desktop = props.platform === 'desktop';
  const t = TOKENS[theme];
  const d = Object.assign({}, DATA, props.data || {});
  const el = React.createElement;

  const [signed, setSigned] = React.useState(props.state === 'in_progress');
  const [sort, setSort] = React.useState('top');
  const [showAll, setShowAll] = React.useState(false);
  React.useEffect(() => { setSigned(props.state === 'in_progress'); }, [props.state]);

  const yourPoints = Math.round(d.points * d.multiplier);
  const showMult = Math.abs(d.multiplier - 1) > 1e-9;

  const eyebrow = { fontFamily:EB, fontSize:9.5, letterSpacing:'0.2em', textTransform:'uppercase', color:t.muted };
  const serif = (size, italic) => ({ fontFamily:COR, fontWeight:600, fontStyle: italic ? 'italic' : 'normal', fontSize:size, color:t.ink, lineHeight:1.08 });
  const panel = { background:t.surface, border:`1px solid ${t.border}`, borderRadius:7, boxSizing:'border-box' };
  const enso = (size, extra) => el('img', Object.assign({ src:'enso-detailed.svg', width:size, height:size, 'aria-hidden':true,
    style:{ display:'block', filter:t.ensoFilter } }, extra || {}));

  const giltRule = (h) => el('div', { 'aria-hidden':true, style:{ height:h||1, background:`linear-gradient(90deg,${t.uaDeep},${t.gilt} 55%,transparent)` } });

  const sectionHead = (label, gloss) => el('div', { style:{ display:'flex', alignItems:'baseline', gap:12, marginBottom:14 } },
    el('span', { style:{ ...eyebrow, fontSize:10, letterSpacing:'0.24em', color:t.ink } }, label),
    el('span', { style:{ flex:1, minWidth:20, height:1, background:`linear-gradient(90deg,${t.uaDeep},${t.hair})`, opacity:.7 } }),
    gloss ? el('span', { style:{ ...eyebrow, fontSize:9.5, fontStyle:'italic', textTransform:'none', letterSpacing:'0.04em' } }, gloss) : null
  );

  // ── header ─────────────────────────────────────────────────────────────
  const header = el('div', { style:{ marginBottom: desktop ? 30 : 22 } },
    el('div', { style:{ display:'flex', alignItems:'center', gap:8, marginBottom:14 } },
      el('span', { style:{ ...eyebrow, color:t.vermil } }, 'Tasks'),
      el('span', { style:{ ...eyebrow, color:t.dim } }, '/'),
      el('span', { style:{ ...eyebrow } }, 'Task №' + d.num)
    ),
    el('div', { style:{ display:'flex', alignItems:'center', gap:8, marginBottom:12 } },
      enso(16, { style:{ display:'block', width:16, height:16, opacity:.85, filter:t.glyphFilter } }),
      el('span', { style:{ ...eyebrow, fontSize:10 } }, 'Unbroken Ascension')
    ),
    el('h1', { style:{ ...serif(desktop ? 44 : 28), fontWeight:700, margin:'0 0 14px', letterSpacing:'-0.015em', textWrap:'pretty' } }, d.title),
    el('div', { style:{ display:'flex', alignItems:'center', gap:10, marginBottom:18 } },
      el('a', { href:d.author.href, title:'View ' + d.author.name + "'s profile", style:{ display:'flex', alignItems:'center', gap:9, textDecoration:'none' } },
        el('span', { style:{ display:'inline-flex', alignItems:'center', justifyContent:'center', flex:'0 0 auto', width:30, height:30, borderRadius:'50%', background:t.surfaceAlt, boxShadow:`0 0 0 1.5px ${t.uaDeep}`, boxSizing:'border-box', fontFamily:COR, fontWeight:700, fontSize:12, color:t.ink } },
          d.author.name.split(' ').map(function(w){ return w[0]; }).join('').slice(0,2).toUpperCase()),
        el('span', { style:{ fontFamily:EB, fontSize:15, color:t.ink, borderBottom:`1px solid ${t.hair}` } }, d.author.name)),
      el('span', { style:{ ...eyebrow, fontSize:9 } }, 'set by · lvl ' + d.author.level)
    ),
    el('div', { style:{ display:'flex', alignItems:'center', gap: desktop ? 22 : 16, flexWrap:'wrap' } },
      el('div', { style:{ display:'flex', flexDirection:'column', lineHeight:1 } },
        el('span', { style:{ ...eyebrow, fontSize:9, marginBottom:5 } }, 'Level'),
        el('span', { style:{ ...serif(desktop ? 30 : 25), fontWeight:700, lineHeight:0.9 } }, d.level)
      ),
      el('span', { 'aria-hidden':true, style:{ width:1, alignSelf:'stretch', minHeight:34, background:t.hair } }),
      el('div', { style:{ display:'flex', flexDirection:'column', lineHeight:1 } },
        el('span', { style:{ ...eyebrow, fontSize:9, marginBottom:5 } }, 'In hand'),
        el('span', { style:{ ...serif(desktop ? 26 : 21), fontWeight:700, lineHeight:0.9 } }, d.inProgress)
      )
    )
  );

  // ── action panel: points ensō + sign up ────────────────────────────────
  const ptsRing = el('div', { style:{ position:'relative', width: desktop ? 148 : 118, height: desktop ? 148 : 118, display:'flex', alignItems:'center', justifyContent:'center', flex:'0 0 auto' } },
    enso(desktop ? 148 : 118, { style:{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none', filter:t.ensoFilter } }),
    el('div', { style:{ position:'relative', display:'flex', flexDirection:'column', alignItems:'center', lineHeight:0.9 } },
      el('span', { style:{ fontFamily:COR, fontWeight:700, fontSize: desktop ? 52 : 42, color:t.ua, lineHeight:0.86 } }, yourPoints),
      el('span', { style:{ ...eyebrow, fontSize:8.5, color:t.ua, marginTop:5 } }, 'points')
    )
  );

  const worth = el('div', { style:{ flex:'0 0 auto', display:'flex', flexDirection:'column', gap:9, minWidth: desktop ? 160 : 132 } },
    el('div', { style:{ display:'flex', alignItems:'baseline', gap:8 } },
      el('span', { style:{ ...eyebrow, fontSize:9, letterSpacing:'0.16em' } }, 'base'),
      el('span', { style:{ fontFamily:COR, fontWeight:700, fontSize: desktop ? 26 : 22, color:t.ink, lineHeight:0.9 } }, d.points),
      showMult ? el('span', { style:{ marginLeft:'auto', fontFamily:COR, fontWeight:700, fontSize: desktop ? 15 : 13, color:t.chipText, background:t.uaDeep, borderRadius:4, padding:'4px 8px', lineHeight:1, whiteSpace:'nowrap' } }, '×' + d.multiplier.toFixed(2)) : null
    ),
    giltRule(1),
    ptsRing
  );

  const ctaBody = signed
    ? el('div', null,
        el('div', { style:{ display:'flex', alignItems:'center', gap:8, marginBottom:10 } },
          el('span', { style:{ width:6, height:6, borderRadius:'50%', background:t.ua } }),
          el('span', { style:{ fontFamily:EB, fontStyle:'italic', fontSize:13, color:t.muted } }, 'This call is in your hands')
        ),
        el('div', { style:{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' } },
          el('span', { style:{ cursor:'pointer', flex:1, display:'inline-flex', alignItems:'center', justifyContent:'center', gap:9, textAlign:'center', fontFamily:COR, fontWeight:600, fontSize: desktop ? 17 : 15, letterSpacing:'0.02em', color:t.chipText, background:t.uaDeep, border:`1.5px solid ${t.uaDeep}`, borderRadius:5, padding: desktop ? '14px 22px' : '12px 16px' } },
            enso(20, { style:{ display:'block', width:20, height:20, opacity:.8, filter:t.sealFilter } }), 'Continue the work'),
          el('span', { onClick:()=>setSigned(false), style:{ cursor:'pointer', fontFamily:EB, fontStyle:'italic', fontSize:12.5, color:t.muted, borderBottom:`1px solid ${t.hair}` } }, 'set down')
        )
      )
    : el('div', null,
        el('div', { onClick:()=>setSigned(true), style:{ cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:9, background:t.uaDeep, border:`1.5px solid ${t.uaDeep}`, borderRadius:5, padding: desktop ? '15px 22px' : '12px 16px', fontFamily:COR, fontWeight:600, fontSize: desktop ? 17.5 : 15.5, letterSpacing:'0.02em', color:t.chipText, marginBottom:11 } },
          enso(20, { style:{ display:'block', width:20, height:20, opacity:.8, filter:t.sealFilter } }), 'Sign up'),
        el('div', { style:{ fontFamily:EB, fontSize:12.5, lineHeight:1.6, color:t.muted } },
          d.slotsOpen + ' of ' + d.slotsMax + ' task slots open · ',
          el('span', { style:{ color:t.vermil } }, 'level ' + d.level + ' met'))
      );

  const innerBox = { background:t.surfaceAlt, border:`1px solid ${t.border}`, borderRadius:5, padding: desktop ? '16px 18px' : '14px 15px', boxSizing:'border-box' };
  const actionPanel = el('div', { style:{ position:'relative', background:t.surface, border:`2px solid ${t.uaDeep}`, borderRadius:7, padding:8, boxSizing:'border-box', boxShadow:t.shadow } },
    el('div', { style:{ position:'relative', display:'flex', flexDirection: desktop ? 'row' : 'column', gap:8, alignItems:'stretch' } },
      el('div', { style:{ ...innerBox, flex:'0 0 auto', display:'flex', flexDirection:'column', alignItems:'center' } }, worth),
      el('div', { style:{ ...innerBox, flex:1, display:'flex', flexDirection:'column', justifyContent:'center' } }, ctaBody)
    )
  );

  // ── the call, in full ──────────────────────────────────────────────────
  const brief = el('section', { style:{ marginBottom: desktop ? 34 : 26 } },
    sectionHead('The Call'),
    el('div', { style:{ background: theme === 'dark' ? 'rgba(27,22,17,0.2)' : 'rgba(231,218,194,0.2)', borderRadius:6, padding: desktop ? '18px 20px 6px' : '15px 16px 3px' } },
      d.brief.map((p, i) => el('p', { key:i, style:{ fontFamily:EB, fontSize: desktop ? 15 : 14, lineHeight:1.72, color:t.ink, margin:'0 0 14px', textWrap:'pretty' } }, p)))
  );

  // ── completed praxis ───────────────────────────────────────────────────
  const sortTab = (key, label) => el('span', { key, onClick:()=>setSort(key), style:{ cursor:'pointer', ...eyebrow, fontSize:9, padding:'6px 11px', borderRadius:4,
    color: sort === key ? t.chipText : t.muted, background: sort === key ? t.uaDeep : 'transparent' } }, label);

  const gallery = el('section', { style:{ marginBottom: desktop ? 34 : 26 } },
    el('div', { style:{ display:'flex', alignItems:'center', gap:12, marginBottom:14, flexWrap:'wrap' } },
      el('span', { style:{ ...eyebrow, fontSize:10, letterSpacing:'0.24em', color:t.ink } }, d.completed + ' finished works'),
      el('span', { style:{ flex:1, minWidth:20, height:1, background:`linear-gradient(90deg,${t.uaDeep},${t.hair})`, opacity:.7 } }),
      el('span', { style:{ display:'flex', gap:2, padding:2, border:`1px solid ${t.border}`, borderRadius:6 } }, [sortTab('top','Best judged'), sortTab('recent','Newest')])
    ),
    el('div', { style:{ display:'grid', gridTemplateColumns: desktop ? 'repeat(3,1fr)' : '1fr', gap:16 } },
      (sort === 'top' ? d.praxis : d.praxis.slice().reverse()).slice(0, showAll ? d.praxis.length : 3).map((p) => el('div', { key:p.title, style:{ ...panel, cursor:'pointer', padding:'15px 15px 13px', boxShadow: theme === 'dark' ? '0 4px 18px rgba(0,0,0,0.45)' : '0 3px 14px rgba(34,26,18,0.10)' } },
        el('div', { style:{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 } },
          el('div', { style:{ flex:1, minWidth:0 } },
            el('div', { style:{ ...eyebrow, fontSize:8.5, letterSpacing:'0.18em', color:t.vermil, marginBottom:6 } }, 'record №' + p.rec),
            el('div', { style:{ fontFamily:COR, fontWeight:600, fontSize:21, lineHeight:1.06, color:t.ink, marginBottom:8, textWrap:'pretty' } }, p.title),
            el('div', { style:{ display:'flex', alignItems:'center', gap:8 } },
              el('span', { style:{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:24, height:24, borderRadius:'50%', flex:'0 0 auto', background:t.surfaceAlt, border:`1px solid ${t.border}`, fontFamily:COR, fontWeight:700, fontSize:10.5, color:t.muted } }, p.author.slice(0,2).toUpperCase()),
              el('span', { style:{ fontFamily:EB, fontSize:12, lineHeight:1.2, color:t.muted, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' } }, p.author)
            )
          ),
          el('div', { style:{ flex:'0 0 auto', minWidth:76, background:t.surfaceAlt, border:`1px solid ${t.border}`, borderRadius:5, padding:'8px 10px 9px' } },
            el('div', { style:{ ...eyebrow, fontSize:8, letterSpacing:'0.1em' } }, 'votes ' + p.votes),
            el('div', { style:{ height:1, background:t.uaDeep, opacity:.6, margin:'6px 0 7px' } }),
            el('div', { style:{ display:'flex', alignItems:'baseline', gap:4, lineHeight:1 } },
              el('span', { style:{ fontFamily:COR, fontWeight:700, fontSize:26, lineHeight:1, color:t.ua } }, p.pts),
              el('span', { style:{ ...eyebrow, fontSize:8, color:t.gilt } }, 'pts')
            )
          )
        ),
        el('div', { style:{ position:'relative', overflow:'hidden', marginTop:13, height: desktop ? 132 : 118, borderRadius:5, background:t.proof, boxShadow:`0 0 0 1px ${t.border}`, display:'flex', alignItems:'flex-end', justifyContent:'space-between', padding:9, boxSizing:'border-box' } },
          el('span', { style:{ ...eyebrow, fontSize:8, color:t.dim } }, 'the work'),
          p.top ? el('span', { title:'Best judged work for this call', style:{ position:'relative', display:'inline-flex', alignItems:'center', justifyContent:'center', width:30, height:30, flex:'0 0 auto' } },
            enso(30, { style:{ position:'absolute', inset:0, width:'100%', height:'100%', filter:t.ensoFilter } }),
            el('span', { style:{ position:'relative', fontFamily:COR, fontWeight:700, fontSize:12, color:t.ua } }, '✦')) : null
        ),
        el('div', { style:{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:11 } },
          el('span', { style:{ fontFamily:EB, fontStyle:'italic', fontSize:12, color:t.muted } }, p.when),
          el('span', { style:{ ...eyebrow, fontSize:8.5, color:t.vermil } }, 'read →')
        )
      ))
    ),
    d.praxis.length > 3 ? el('div', { onClick:()=>setShowAll(!showAll), style:{ marginTop:15, fontFamily:EB, fontStyle:'italic', fontSize:13.5, color:t.vermil, cursor:'pointer' } },
      showAll ? 'Show fewer ↑' : 'See all ' + d.completed + ' works →') : null
  );

  // ── discussion ─────────────────────────────────────────────────────────
  const comments = el('section', null,
    sectionHead('Said aloud', d.comments.length + ' remarks'),
    el('div', { style:{ display:'flex', flexDirection:'column', gap:12, marginBottom:14 } },
      d.comments.map((c, i) => el('div', { key:i, style:{ ...panel, padding:'13px 15px' } },
        el('div', { style:{ display:'flex', alignItems:'center', gap:9, marginBottom:8 } },
          el('span', { style:{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:22, height:22, borderRadius:'50%', flex:'0 0 auto', background:t.surfaceAlt, boxShadow:`0 0 0 1.25px ${t.uaDeep}`, fontFamily:COR, fontWeight:700, fontSize:10, color:t.ink } }, c.author[0].toUpperCase()),
          el('span', { style:{ fontFamily:EB, fontSize:13, color:t.ink } }, c.author),
          el('span', { style:{ marginLeft:'auto', ...eyebrow, fontSize:8.5 } }, c.when)
        ),
        el('p', { style:{ margin:0, fontFamily:EB, fontSize:13.5, lineHeight:1.68, color:t.muted, textWrap:'pretty' } }, c.body)
      ))
    ),
    el('div', { style:{ ...panel, padding:'12px 14px', display:'flex', alignItems:'center', gap:12 } },
      el('span', { style:{ flex:1, fontFamily:EB, fontStyle:'italic', fontSize:13, color:t.dim } }, 'Say something about this call…'),
      el('span', { style:{ cursor:'pointer', ...eyebrow, fontSize:9, color:t.chipText, background:t.uaDeep, borderRadius:4, padding:'8px 13px' } }, 'Post')
    )
  );

  const pageStyle = { position:'relative', overflow:'hidden', width:'100%', boxSizing:'border-box', background:t.page, color:t.ink, fontFamily:EB };
  const pageLotus = (opts) => el('img', { src:'lotus.svg', 'aria-hidden':true, style:{ position:'absolute', pointerEvents:'none', opacity:t.lotusOp, filter:t.lotusFilter, ...opts } });

  if (desktop) {
    return el('div', { style:{ ...pageStyle, padding:'34px 38px 46px' } },
      pageLotus({ width:880, height:880, left:-230, top:-110 }),
      el('div', { style:{ position:'relative', display:'flex', gap:30, alignItems:'flex-start', marginBottom:6 } },
        el('div', { style:{ flex:1, minWidth:0 } }, header),
        el('div', { style:{ flex:'0 0 460px', width:460, marginTop:10 } }, actionPanel)
      ),
      el('div', { style:{ position:'relative', minWidth:0 } }, brief, gallery, comments)
    );
  }

  return el('div', { style:{ ...pageStyle, minHeight:'100%', display:'flex', flexDirection:'column' } },
    pageLotus({ width:560, height:560, left:-200, top:40 }),
    el('div', { style:{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', borderBottom:`1px solid ${t.hair}`, position:'sticky', top:0, background:t.page, zIndex:5 } },
      el('span', { style:{ fontFamily:COR, fontSize:16, color:t.ink, cursor:'pointer' } }, '←'),
      el('span', { style:{ ...eyebrow, fontSize:9 } }, 'Task №' + d.num),
      el('span', { style:{ marginLeft:'auto', ...eyebrow, fontSize:9, color:t.vermil } }, signed ? 'in hand' : 'open')
    ),
    el('div', { style:{ position:'relative', padding:'18px 16px 28px' } }, header, el('div', { style:{ marginBottom:26 } }, actionPanel), brief, gallery, comments)
  );
}

module.exports = { UATaskDetail };
