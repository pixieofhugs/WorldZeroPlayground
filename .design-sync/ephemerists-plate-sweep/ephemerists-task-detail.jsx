// Ephemerists Task Detail — DECO × EGYPT, the full rite of a fragment.
// Same anatomy as DefaultTaskDetail (header → action panel → brief → roster →
// praxis gallery → discussion), dressed as a field-journal plate out of the Valley:
// cavetto-cornice masthead with a winged disc and two incised glyph registers,
// fragment number in a cartouche, points in a stepped octagon, tally strokes for
// the sphere, fluted rules between registers.
// Props: theme ('light'|'dark'), platform ('desktop'|'mobile'), state ('open'|'in_progress'), data.
const TOKENS = {
  light: {
    page:'#E4D5B0', ink:'#2A2418', muted:'#6B5F45', faint:'#9A8C6C',
    brass:'#9A7A2E', brassL:'#C39B3D', gold:'#E3C56A',
    ochre:'#A6432B', nile:'#1D4F6E', lapis:'#1D4F6E', edge:'#1D4F6E', deco:'rgba(29,79,110,0.16)',
    plate:'#EADCB6', plate2:'#F2E7CB', band:'#1E2233', bandInk:'#EFE4C4', disc:'#F6EED6',
    rule:'rgba(29,79,110,0.16)', line:'rgba(29,79,110,0.34)',
    ctaBg:'#1E2233', ctaText:'#E9D79B',
    shadow:'0 18px 44px -26px rgba(42,32,16,.45)'
  },
  dark: {
    page:'#101320', ink:'#F0E6C8', muted:'#A2977A', faint:'#6A6144',
    brass:'#C9A24B', brassL:'#E6C877', gold:'#F2D98A',
    ochre:'#D9744C', nile:'#5FB3A6', lapis:'#5FB3A6', edge:'#E6C877', deco:'rgba(201,162,75,0.14)',
    plate:'#171A26', plate2:'#1D2130', band:'#0A0C15', bandInk:'#F2D98A', disc:'#12151F',
    rule:'rgba(201,162,75,0.12)', line:'rgba(201,162,75,0.28)',
    ctaBg:'#C9A24B', ctaText:'#12151F',
    shadow:'0 20px 50px -26px rgba(0,0,0,.8)'
  }
};

const DECO = "'Poiret One','Cinzel',serif";
const CAPS = "'Cinzel',serif";
const BODY = "'Spectral','EB Garamond',Georgia,serif";

const GLYPHS = {
  ankh:'M12 22 V10 M6 15 H18 M12 10 a4 4 0 1 0 0.001 0 Z',
  eye:'M3 12 C7 7 17 7 21 12 C17 16 7 16 3 12 M12 10.2 a1.8 1.8 0 1 0 .01 0 Z M15 15 L18 20 M8 15 L5 19',
  feather:'M12 22 V4 M12 6 C15 7 17 10 17 13 M12 6 C9 7 7 10 7 13 M12 12 C14.6 12.8 16 14.6 16 17 M12 12 C9.4 12.8 8 14.6 8 17',
  water:'M2 9 l4 3 4-3 4 3 4-3 4 3 M2 15 l4 3 4-3 4 3 4-3 4 3',
  djed:'M12 22 V8 M6 8 H18 M6 12 H18 M7.5 4.6 H16.5 M9 2 H15',
  reed:'M12 22 V7 C12 4 14 2.6 17 2.6 C17 6 15 7.4 12 7.4',
  sun:'M12 12 a5 5 0 1 0 .01 0 Z M12 3 V6 M12 18 V21 M3 12 H6 M18 12 H21',
  offering:'M4 8 H20 M6 8 V14 H18 V8 M9 14 V20 M15 14 V20 M4 20 H20',
  scarab:'M12 4 C15.5 4 17.5 7 17.5 11 C17.5 16.6 15 20 12 20 C9 20 6.5 16.6 6.5 11 C6.5 7 8.5 4 12 4 M12 4 V20 M6.5 9 L2.5 6 M17.5 9 L21.5 6 M6.5 15 L2.5 18 M17.5 15 L21.5 18',
  greekKey:'M2 20 V6 H16 V16 H8 V11 H12',
  chevrons:'M3 8 L12 3 L21 8 M3 14 L12 9 L21 14 M3 20 L12 15 L21 20',
  alchemy:'M12 3 L21 19 H3 Z M6.6 13.6 H17.4',
  hourglass:'M5 3 H19 M5 21 H19 M6.5 3 L12 12 L6.5 21 M17.5 3 L12 12 L17.5 21',
  openEye:'M2 12 C6 5.4 18 5.4 22 12 M2 12 C6 18.6 18 18.6 22 12 M8.4 12 a3.6 3.6 0 1 0 7.2 0 a3.6 3.6 0 1 0 -7.2 0 M10.7 12 a1.3 1.3 0 1 0 2.6 0 a1.3 1.3 0 1 0 -2.6 0 M12 2.8 V5 M5 4.6 L6.8 6.6 M19 4.6 L17.2 6.6',
  planet:'M5.8 12 a6.2 6.2 0 1 0 12.4 0 a6.2 6.2 0 1 0 -12.4 0 M1.8 16.2 A10.8 3.7 -22 0 1 22.2 7.8 A10.8 3.7 -22 0 1 1.8 16.2'
};

const ROMAN = (n) => {
  const map = [[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];
  let out = '', v = Math.max(0, Math.round(Number(n) || 0));
  map.forEach(([k, s]) => { while (v >= k) { out += s; v -= k; } });
  return out || '0';
};

const DATA = {
  author: { name: 'Wren Abalone', level: 4, href: '#/players/wren-abalone' },
  num: 305, title: 'Catalogue every bench along the river walk', level: 4,
  points: 30, multiplier: 1.25, inProgress: 9, completed: 23, slotsOpen: 2, slotsMax: 3,
  brief: [
    'Walk the water from the lock to the last lamp and number every bench you pass. Photograph each one from standing height, and note which face the water and which have turned away from it.',
    'Record the material, the damage, the initials cut into the arm. A bench is a measurement of how long a person expects to stay — the river walk is therefore an instrument, and no one has read it.',
    'Submit the index as a single sequence, in the order you walked it. If you double back, say so. A false order is worse than a missing bench.'
  ],
  roster: [
    { name: 'Thessaly Vane', level: 6, tag: 'Friend' },
    { name: 'monochord', level: 3, tag: null },
    { name: 'Io Sarris', level: 8, tag: 'Foe' },
    { name: 'B. Aetheling', level: 4, tag: null },
    { name: 'nine_ratios', level: 2, tag: null },
    { name: 'Calder Wynn', level: 5, tag: null }
  ],
  praxis: [
    { title: 'Forty-one benches, north bank, dawn to dusk', author: 'Thessaly Vane', votes: 34, when: 'jul 14', pts: 38, rec: 1187, top: true },
    { title: 'Nine that face away from the water', author: 'Calder Wynn', votes: 27, when: 'jul 11', pts: 33, rec: 1174 },
    { title: 'The initials, transcribed and dated', author: 'monochord', votes: 19, when: 'jul 9', pts: 29, rec: 1166 },
    { title: 'Bench XVII, measured against the flood mark', author: 'Io Sarris', votes: 24, when: 'jul 6', pts: 31, rec: 1158 },
    { title: 'A rubbing of every cast-iron leg', author: 'B. Aetheling', votes: 15, when: 'jul 2', pts: 26, rec: 1141 },
    { title: 'Counted twice, and the counts disagree', author: 'nine_ratios', votes: 11, when: 'jun 28', pts: 22, rec: 1129 }
  ],
  comments: [
    { author: 'Io Sarris', when: '4 days ago', body: 'Does a memorial bench count twice — once as furniture, once as a name? I have logged them as both and will accept the penalty.' },
    { author: 'monochord', when: '2 days ago', body: 'Once. The name is an inscription, not a bench. Keep the index clean or it is not an index.' },
    { author: 'Thessaly Vane', when: '15 hours ago', body: 'Two of mine were gone between the first walk and the second. The instrument is being edited while we read it.' }
  ]
};

function EphemeristsTaskDetail(props) {
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

  const sc = { fontFamily:CAPS, fontWeight:500, letterSpacing:'.24em', textTransform:'uppercase' };
  const eyebrow = { ...sc, fontSize:9.5, color:t.brass };
  const body = (size) => ({ fontFamily:BODY, fontSize:size, lineHeight:1.7, color:t.muted });
  const plate = { background:t.plate, border:`1px solid ${t.line}`, boxSizing:'border-box' };

  const ico = (name, size, color, w) => el('svg', { width:size, height:size, viewBox:'0 0 24 24', 'aria-hidden':true, style:{ display:'block', flex:'0 0 auto' } },
    el('path', { d:GLYPHS[name], fill:'none', stroke:color, strokeWidth:w || 1.5, strokeLinecap:'round', strokeLinejoin:'round' }));

  // rule of symbol-only physics — big/small rhythm, no numerals
  const EQ = '∇×Ψ≡∂Φ∕∂τ ∮⟨ψ‖Θ‖ψ⟩∝Σμν ⊗Δλ≥ϖ ∫ρ∂ν≈Ω ∴Γ⇌Θξ ∇²φ≡−κρ ⨍ση∝√Π ⊕ζ⊥∮Δς';
  const fluted = (extra) => el('div', { 'aria-hidden':true, style:{ display:'flex', alignItems:'center', gap:2.5, height:15, overflow:'hidden',
    fontFamily:BODY, whiteSpace:'nowrap', userSelect:'none', ...(extra||{}) } },
    Array.from({ length: 56 }).map((_, i) => {
      const ch = EQ[i % EQ.length];
      const r1 = (i * 0.6180339887) % 1, r2 = (i * 0.7548776662) % 1;
      const delay = (r1 * 12).toFixed(2);
      const dur = (9 + r2 * 8).toFixed(2);
      return el('span', { key:i, className:'epd-glyph', style:{ flex:'1 1 auto', textAlign:'center', color: i % 2 ? t.brass : t.lapis,
        fontSize: i % 2 ? 14 : 10, lineHeight:1, '--epdOp': i % 2 ? .7 : .45,
        animationDelay: delay + 's', animationDuration: dur + 's' } }, ch === ' ' ? '·' : ch);
    }));

  const sectionHead = (label, gloss) => el('div', { style:{ marginBottom:15 } },
    el('div', { style:{ display:'flex', alignItems:'center', gap:12, marginBottom:7, flexWrap:'wrap' } },
      el('span', { style:{ ...sc, fontSize:11, fontWeight:600, color:t.ink, flex:'0 0 auto', whiteSpace:'nowrap' } }, label),
      el('span', { style:{ flex:1, minWidth:24, height:1, background:t.brass, opacity:.5 } }),
      gloss ? el('span', { style:{ ...sc, fontSize:9, color:t.faint } }, gloss) : null),
    fluted());

  const cartouche = (label) => el('span', { style:{ ...sc, fontWeight:700, fontSize:9.5, color:t.ink, whiteSpace:'nowrap' } }, label);

  const tally = (level) => el('span', { 'aria-hidden':true, style:{ display:'flex', alignItems:'flex-end', gap:2.5, height:11 } },
    Array.from({ length: Math.min(9, Math.max(1, Math.round(level))) }).map((_, i) =>
      el('span', { key:i, style:{ width:1.6, height: 11 - (i % 3) * 2, background: i === 4 ? t.ochre : t.brass, opacity:.85 } })));

  // ── masthead: winged disc between two incised glyph registers, closed by a cornice
  const wing = (dir) => el('g', { transform: dir === 'l' ? 'scale(-1,1)' : 'none' },
    [0,1,2,3,4].map((i) => el('rect', { key:i, x:13 + i*11.4, y:-6 + i*1.5, width:9.6, height:8.4 - i*1.4, rx:1.4, fill:t.gold })),
    [0,1,2,3].map((i) => el('rect', { key:'b'+i, x:15 + i*11.4, y:4.2 + i*1.6, width:8, height:3.4 - i*0.5, rx:1, fill:t.brass })));

  const REG = ['ankh','water','feather','eye','djed','greekKey','reed','offering','alchemy','chevrons','scarab','sun','ankh','water','djed','eye'];
  const register = (y, prefix, op) => REG.map((n, i) => el('g', { key:prefix+i, className:'epd-glyph',
    transform:`translate(${18 + i*27.5} ${y}) scale(${13/24}) translate(-12 -12)`,
    style:{ ['--epdOp']: op * (i % 3 === 0 ? 1 : 0.7), animationDelay: ((i*7) % 12) * 1.6 + 's' } },
    el('path', { d:GLYPHS[n], fill:'none', stroke:t.gold, strokeWidth:1.6, strokeLinecap:'round', strokeLinejoin:'round' })));

  const mastHeight = desktop ? 108 : 92;
  const masthead = el('div', null,
    el('div', { style:{ position:'relative', overflow:'hidden', height:mastHeight, background:t.band, color:t.bandInk } },
      el('svg', { width:'100%', height:mastHeight, viewBox:'0 0 440 108', preserveAspectRatio:'xMidYMid slice', 'aria-hidden':true, style:{ position:'absolute', inset:0, zIndex:1 } },
        el('path', { d:'M8 24 H432 M8 84 H432', stroke:t.brassL, strokeWidth:.6, opacity:.28 }),
        register(13, 'a', .34), register(95, 'b', .3)),
      el('div', { style:{ position:'relative', zIndex:2, height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4 } },
        el('svg', { width: desktop ? 176 : 150, height:38, viewBox:'-88 -20 176 40', 'aria-hidden':true, style:{ display:'block' } },
          wing('r'), wing('l'),
          el('circle', { r:10, fill:'none', stroke:t.gold, strokeWidth:1.5 }),
          el('circle', { r:5, fill:t.gold, opacity:.8 }),
          el('path', { d:'M-13 0 H-10.5 M10.5 0 H13', stroke:t.brassL, strokeWidth:1 })),
        el('span', { style:{ fontFamily:DECO, fontSize: desktop ? 19 : 16, letterSpacing:'.3em', textTransform:'uppercase', color:t.bandInk, whiteSpace:'nowrap' } }, 'Ephemerists'))),
    el('div', { 'aria-hidden':true, style:{ background:t.band } },
      el('div', { style:{ display:'flex', height:7, alignItems:'flex-end', gap:3, padding:'0 10px', overflow:'hidden' } },
        Array.from({ length: 52 }).map((_, i) => el('span', { key:i, style:{ flex:1, height: i % 2 ? 6 : 3.5, background:t.brassL, opacity: i % 2 ? .5 : .28 } }))),
      el('div', { style:{ height:2, background:t.brass, opacity:.9 } }),
      el('div', { style:{ height:1, marginTop:2, background:t.brassL, opacity:.55 } })));

  // ── header ────────────────────────────────────────────────────────────
  const header = el('div', { style:{ marginBottom: desktop ? 28 : 20 } },
    el('div', { style:{ display:'flex', alignItems:'center', gap:9, marginBottom:14, flexWrap:'wrap' } },
      el('span', { style:{ ...sc, fontSize:9.5, color:t.nile } }, 'Tasks'),
      el('span', { style:{ ...sc, fontSize:9.5, color:t.faint } }, '/'),
      cartouche('Task №' + d.num)),
    el('div', { style:{ display:'flex', alignItems:'center', gap:9, marginBottom:12 } },
      ico('ankh', 19, t.brass, 1.6),
      el('span', { style:{ ...sc, fontSize:9.5, color:t.brass } }, 'Ephemerists')),
    el('h1', { style:{ fontFamily:DECO, fontWeight:400, fontSize: desktop ? 44 : 28, lineHeight:1.16, letterSpacing:'.02em', margin:'0 0 16px', color:t.ink, textWrap:'pretty' } }, d.title),
    el('div', { style:{ display:'flex', alignItems:'center', gap:10, marginBottom:16 } },
      el('a', { href:d.author.href, title:'View ' + d.author.name + "'s profile", style:{ display:'flex', alignItems:'center', gap:9, textDecoration:'none' } },
        el('span', { style:{ display:'inline-flex', alignItems:'center', justifyContent:'center', flex:'0 0 auto', width:30, height:30, borderRadius:'50%', overflow:'hidden', background:t.plate, border:`1px solid ${t.line}`, fontFamily:CAPS, fontWeight:500, fontSize:11, color:t.brass } }, d.author.name.split(' ').map(function(w){return w[0];}).join('').slice(0,2).toUpperCase()),
        el('span', { style:{ fontFamily:BODY, fontSize:15, color:t.ink, borderBottom:`1px solid ${t.brass}` } }, d.author.name)),
      el('span', { style:{ ...eyebrow, fontSize:9 } }, 'author · lvl ' + d.author.level)),
    el('div', { style:{ display:'flex', alignItems:'flex-end', gap: desktop ? 26 : 18, flexWrap:'wrap' } },
      el('div', { style:{ display:'flex', flexDirection:'column', gap:5, lineHeight:1 } },
        el('span', { style:{ ...eyebrow, fontSize:8.5 } }, 'Level'),
        el('span', { style:{ fontFamily:DECO, fontSize: desktop ? 38 : 30, lineHeight:.8, color:t.ink } }, d.level),
        tally(d.level)),
      el('span', { 'aria-hidden':true, style:{ width:1, alignSelf:'stretch', minHeight:38, background:t.line } }),
      el('div', { style:{ display:'flex', alignItems:'center', gap:9, paddingBottom:4 } },
        ico('hourglass', 15, t.brass),
        el('span', { style:{ ...body(desktop ? 14.5 : 13), fontStyle:'italic' } }, d.inProgress + ' in progress'))));

  // ── action panel: stepped octagon medallion + the summons ──────────────
  // alchemical squared circle — outer ring, inscribed square, triangle, inner disc
  const medSize = desktop ? 104 : 88;
  const ticks = Array.from({ length: 24 }).map((_, i) => {
    const a = (i / 24) * Math.PI * 2, long = i % 6 === 0;
    const r1 = 48, r2 = long ? 42 : 45.5;
    return el('path', { key:i, d:`M${(50 + Math.cos(a)*r1).toFixed(2)} ${(50 + Math.sin(a)*r1).toFixed(2)} L${(50 + Math.cos(a)*r2).toFixed(2)} ${(50 + Math.sin(a)*r2).toFixed(2)}`,
      stroke: long ? t.brass : t.brassL, strokeWidth: long ? 1 : .6, opacity: long ? .9 : .5 });
  });
  const medallion = el('div', { style:{ flex:'0 0 auto', position:'relative', width:medSize, height:medSize, display:'flex', alignItems:'center', justifyContent:'center' } },
    el('svg', { width:medSize, height:medSize, viewBox:'0 0 100 100', 'aria-hidden':true, style:{ position:'absolute', inset:0 } },
      el('circle', { cx:50, cy:50, r:48, fill:t.disc, stroke:t.brass, strokeWidth:1.3 }),
      ticks,
      el('circle', { cx:50, cy:50, r:41, fill:'none', stroke:t.lapis, strokeWidth:.7, opacity:.75 }),
      el('rect', { x:20.9, y:20.9, width:58.2, height:58.2, fill:'none', stroke:t.brassL, strokeWidth:.7, opacity:.7 }),
      el('path', { d:'M50 9.9 L84.7 70 H15.3 Z', fill:'none', stroke:t.lapis, strokeWidth:.8, opacity:.55 }),
      el('circle', { cx:50, cy:50, r:26, fill:'none', stroke:t.brass, strokeWidth:.8, opacity:.8 }),
      el('path', { d:'M2 50 H14 M86 50 H98 M50 2 V10 M50 90 V98', stroke:t.brassL, strokeWidth:.6, opacity:.5 })),
    el('div', { style:{ position:'relative', display:'flex', flexDirection:'column', alignItems:'center', lineHeight:.82 } },
      el('span', { style:{ fontFamily:DECO, fontSize: desktop ? 34 : 29, color:t.ink } }, yourPoints),
      el('span', { style:{ ...sc, fontSize:6.5, letterSpacing:'.2em', color:t.muted, marginTop:5 } }, 'points')));

  const ledgerRow = (label, value) => el('div', { style:{ display:'flex', alignItems:'baseline', gap:10 } },
    el('span', { style:{ ...sc, fontSize:8.5, color:t.faint } }, label),
    el('span', { 'aria-hidden':true, style:{ flex:1, minWidth:10, height:1, background:t.line } }),
    el('span', { style:{ fontFamily:DECO, fontSize:16, color:t.ink, whiteSpace:'nowrap' } }, value));

  const summons = signed
    ? el('div', { style:{ display:'flex', flexDirection:'column', gap:11 } },
        el('div', { style:{ display:'flex', alignItems:'center', gap:8 } },
          ico('openEye', 15, t.nile),
          el('span', { style:{ ...body(13.5), fontStyle:'italic', color:t.nile } }, "You're on this task")),
        el('div', { style:{ display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' } },
          el('span', { style:{ cursor:'pointer', flex:1, textAlign:'center', background:t.ctaBg, color:t.ctaText, border:`2px solid ${t.brass}`,
            padding: desktop ? '14px 12px' : '12px 8px', fontFamily:CAPS, fontWeight:500, fontSize: desktop ? 12 : 11, letterSpacing:'.1em', textTransform:'uppercase', whiteSpace:'nowrap' } }, 'Continue'),
          el('span', { onClick:()=>setSigned(false), style:{ cursor:'pointer', ...body(12.5), fontStyle:'italic', color:t.muted, borderBottom:`1px solid ${t.line}` } }, 'drop')))
    : el('div', { style:{ display:'flex', flexDirection:'column', gap:11 } },
        el('div', { onClick:()=>setSigned(true), style:{ cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:9,
          background:t.ctaBg, color:t.ctaText, border:`2px solid ${t.brass}`, padding: desktop ? '14px 12px' : '12px 8px',
          fontFamily:CAPS, fontWeight:500, fontSize: desktop ? 12 : 11, letterSpacing:'.1em', textTransform:'uppercase' } },
          ico('openEye', 15, t.ctaText, 1.4),
          el('span', { style:{ whiteSpace:'nowrap' } }, 'Sign up'),
          ico('planet', 14, t.ctaText, 1.4)),
        el('div', { style:{ ...body(12.5), fontStyle:'italic' } },
          'You have ' + d.slotsOpen + ' of ' + d.slotsMax + ' task slots open · ',
          el('span', { style:{ color:t.nile } }, 'Level ' + d.level + ' met')));

  // one panel, two cells — the worth beside the summons, as the other factions lay it out
  const innerBox = { background:t.plate2, border:`1px solid ${t.line}`, padding: desktop ? '16px 18px' : '14px 12px', boxSizing:'border-box' };
  const crownedPanel = (panel) => panel;

  const actionPanel = el('div', { style:{ ...plate, outline:`1px solid ${t.edge}`, outlineOffset:3, boxShadow:t.shadow, padding:7,
    display:'flex', flexDirection:'row', gap:7, alignItems:'stretch' } },
    el('div', { style:{ ...innerBox, flex:'0 0 auto', width: desktop ? 150 : 116, display:'flex', flexDirection:'column', alignItems:'center', gap:12 } },
      el('div', { style:{ width:'100%', display:'flex', flexDirection:'column', gap:8 } },
        ledgerRow('Base', String(d.points)),
        ledgerRow('Bonus', showMult ? '×' + d.multiplier.toFixed(2) : '×1.00')),
      medallion),
    el('div', { style:{ ...innerBox, flex:1, minWidth:0, display:'flex', flexDirection:'column', justifyContent:'center' } }, summons));

  // ── brief: text sitting in a gravity well — a lattice bent toward a mass
  const gravityGrid = (() => {
    const W = 200, H = 100, cx = 218, cy = 116, R = 60, S = 0.7;
    const warp = (x, y) => {
      const dx = cx - x, dy = cy - y, d = Math.hypot(dx, dy) || 1e-6;
      const f = S / (1 + Math.pow(d / R, 2.1));
      return [x + dx * f, y + dy * f];
    };
    const path = (pts) => pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(2) + ' ' + p[1].toFixed(2)).join(' ');
    const lines = [];
    for (let x = -30; x <= 230; x += 13) {
      const pts = []; for (let y = -20; y <= 120; y += 3.5) pts.push(warp(x, y));
      lines.push(path(pts));
    }
    for (let y = -20; y <= 120; y += 13) {
      const pts = []; for (let x = -30; x <= 230; x += 3.5) pts.push(warp(x, y));
      lines.push(path(pts));
    }
    return el('svg', { 'aria-hidden':true, viewBox:`0 0 ${W} ${H}`, preserveAspectRatio:'none',
      style:{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none',
        maskImage:'radial-gradient(125% 145% at 100% 100%, #000 30%, transparent 100%)',
        WebkitMaskImage:'radial-gradient(125% 145% at 100% 100%, #000 30%, transparent 100%)' } },
      lines.map((dstr, i) => el('path', { key:i, d:dstr, fill:'none', stroke:t.deco, strokeWidth:0.35, vectorEffect:'non-scaling-stroke' })),
      null);
  })();

  const brief = el('section', { style:{ marginBottom: desktop ? 34 : 26 } },
    sectionHead('Task description', 'in full'),
    el('div', { style:{ ...plate, position:'relative', overflow:'hidden', padding: desktop ? '30px 34px' : '22px 20px' } },
      gravityGrid,
      el('div', { style:{ position:'relative' } },
      d.brief.map((p, i) => el('p', { key:i, style:{ ...body(desktop ? 15.5 : 14), lineHeight:1.85, color:t.ink, margin: i === d.brief.length - 1 ? 0 : '0 0 22px', textWrap:'pretty' } }, p)))));

  // ── roster ────────────────────────────────────────────────────────────
  const rest = Math.max(0, d.inProgress - (desktop ? 5 : 4));
  const roster = el('section', { style:{ marginBottom: desktop ? 34 : 26 } },
    sectionHead('In progress', d.inProgress + ' players'),
    el('div', { style:{ ...plate } },
      d.roster.slice(0, desktop ? 5 : 4).map((p, i) => el('div', { key:p.name, style:{ display:'flex', alignItems:'center', gap:12, padding:'11px 14px',
        borderTop: i === 0 ? 'none' : `1px solid ${t.rule}` } },
        el('span', { style:{ width:28, height:28, flex:'0 0 auto', display:'flex', alignItems:'center', justifyContent:'center',
          border:`1px solid ${t.brass}`, background:t.disc, clipPath:'polygon(30% 0,70% 0,100% 30%,100% 70%,70% 100%,30% 100%,0 70%,0 30%)',
          fontFamily:DECO, fontSize:13, color:t.ink } }, p.name[0].toUpperCase()),
        el('span', { style:{ ...body(14), color:t.ink, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' } }, p.name),
        p.tag ? el('span', { style:{ ...sc, fontSize:8, color: p.tag === 'Foe' ? t.ochre : t.nile, border:`1px solid ${p.tag === 'Foe' ? t.ochre : t.nile}`, padding:'2px 6px' } },
          p.tag === 'Foe' ? 'Rival' : 'Ally') : null,
        el('span', { style:{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8 } },
          tally(p.level),
          el('span', { style:{ ...sc, fontSize:8.5, color:t.faint } }, 'lvl ' + p.level)))),
      rest > 0 ? el('div', { style:{ borderTop:`1px solid ${t.rule}`, padding:'11px 14px', ...body(13.5), fontStyle:'italic', color:t.nile, cursor:'pointer' } }, '+' + rest + ' more players →') : null));

  // ── praxis gallery ────────────────────────────────────────────────────
  const sortTab = (key, label) => el('span', { key, onClick:()=>setSort(key), style:{ cursor:'pointer', ...sc, fontSize:8.5, padding:'6px 11px',
    color: sort === key ? (theme === 'dark' ? t.ctaText : t.ctaText) : t.muted,
    background: sort === key ? t.ctaBg : 'transparent' } }, label);

  const praxisCard = (p) => el('div', { key:p.title, style:{ ...plate, cursor:'pointer', boxShadow:t.shadow, display:'flex', flexDirection:'column' } },
    el('div', { style:{ padding:'14px 15px 12px' } },
      el('div', { style:{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, marginBottom:10 } },
        el('span', { style:{ ...sc, fontSize:8, color:t.brass } }, 'Praxis №' + p.rec),
        p.top ? el('span', { title:'top rated praxis', style:{ display:'flex', alignItems:'center', gap:5, ...sc, fontSize:7.5, color:t.gold } },
          el('svg', { width:26, height:9, viewBox:'-88 -20 176 40', 'aria-hidden':true, style:{ display:'block' } }, wing('r'), wing('l'), el('circle', { r:9, fill:t.gold, opacity:.85 })),
          'top rated') : null),
      el('div', { style:{ fontFamily:DECO, fontSize:19, lineHeight:1.28, letterSpacing:'.02em', color:t.ink, marginBottom:11, textWrap:'pretty' } }, p.title),
      el('div', { style:{ display:'flex', alignItems:'center', gap:12 } },
        el('div', { style:{ flex:1, minWidth:0, display:'flex', alignItems:'center', gap:8 } },
          el('span', { style:{ width:24, height:24, flex:'0 0 auto', display:'flex', alignItems:'center', justifyContent:'center', border:`1px solid ${t.brass}`,
            background:t.disc, clipPath:'polygon(30% 0,70% 0,100% 30%,100% 70%,70% 100%,30% 100%,0 70%,0 30%)', fontFamily:DECO, fontSize:11, color:t.ink } }, p.author[0].toUpperCase()),
          el('span', { style:{ ...body(12.5), overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' } }, p.author)),
        el('span', { style:{ flex:'0 0 auto', display:'flex', alignItems:'baseline', gap:5 } },
          el('span', { style:{ fontFamily:DECO, fontSize:22, lineHeight:1, color:t.ink } }, p.pts),
          el('span', { style:{ ...sc, fontSize:7, color:t.muted } }, 'pts')))),
    el('div', { style:{ position:'relative', height: desktop ? 116 : 104, background:t.plate2, borderTop:`1px solid ${t.rule}`, borderBottom:`1px solid ${t.rule}`, overflow:'hidden',
      display:'flex', alignItems:'center', justifyContent:'center' } },
      el('svg', { width:'100%', height:'100%', viewBox:'0 0 200 110', preserveAspectRatio:'xMidYMid slice', 'aria-hidden':true, style:{ position:'absolute', inset:0, opacity:.5 } },
        el('path', { d:'M0 55 H200 M100 0 V110 M0 0 L200 110 M200 0 L0 110', stroke:t.brass, strokeWidth:.5, opacity:.35 }),
        el('circle', { cx:100, cy:55, r:34, fill:'none', stroke:t.brass, strokeWidth:.6, opacity:.5 })),
      ico('offering', 26, t.faint, 1.2)),
    el('div', { style:{ display:'flex', alignItems:'center', gap:10, padding:'10px 15px 11px' } },
      el('span', { style:{ ...sc, fontSize:8, color:t.faint } }, p.when),
      el('span', { 'aria-hidden':true, style:{ flex:1, height:1, background:t.line, opacity:.7 } }),
      el('span', { style:{ ...sc, fontSize:8, color:t.faint } }, p.votes + ' votes')));

  const list = (sort === 'top' ? d.praxis : d.praxis.slice().reverse());
  const gallery = el('section', { style:{ marginBottom: desktop ? 34 : 26 } },
    el('div', { style:{ marginBottom:15 } },
      el('div', { style:{ display:'flex', alignItems:'center', gap:12, marginBottom:7, flexWrap:'wrap' } },
        el('span', { style:{ ...sc, fontSize:11, fontWeight:600, color:t.ink } }, d.completed + ' completed praxis'),
        el('span', { style:{ flex:1, minWidth:24, height:1, background:t.brass, opacity:.5 } }),
        el('span', { style:{ display:'flex', gap:2, border:`1px solid ${t.line}`, padding:2 } }, [sortTab('top','Top rated'), sortTab('recent','Recent')])),
      fluted()),
    el('div', { style:{ display:'grid', gridTemplateColumns: desktop ? 'repeat(3,1fr)' : '1fr', gap:16 } },
      list.slice(0, showAll ? list.length : 3).map(praxisCard)),
    el('div', { onClick:()=>setShowAll(!showAll), style:{ marginTop:16, ...body(13.5), fontStyle:'italic', color:t.nile, cursor:'pointer' } },
      showAll ? 'Show fewer ↑' : 'Show all ' + d.completed + ' praxis →'));

  // ── discussion ────────────────────────────────────────────────────────
  const comments = el('section', null,
    sectionHead('Discussion', d.comments.length + ' comments'),
    el('div', { style:{ ...plate, marginBottom:14 } },
      d.comments.map((c, i) => el('div', { key:i, style:{ padding:'14px 16px', borderTop: i === 0 ? 'none' : `1px solid ${t.rule}` } },
        el('div', { style:{ display:'flex', alignItems:'center', gap:10, marginBottom:8 } },
          el('span', { style:{ width:24, height:24, flex:'0 0 auto', display:'flex', alignItems:'center', justifyContent:'center', border:`1px solid ${t.brass}`,
            background:t.disc, clipPath:'polygon(30% 0,70% 0,100% 30%,100% 70%,70% 100%,30% 100%,0 70%,0 30%)', fontFamily:DECO, fontSize:11, color:t.ink } }, c.author[0].toUpperCase()),
          el('span', { style:{ ...body(13.5), color:t.ink } }, c.author),
          el('span', { style:{ marginLeft:'auto', ...sc, fontSize:8, color:t.faint } }, c.when)),
        el('p', { style:{ margin:0, ...body(desktop ? 14.5 : 13.5), fontStyle:'italic', textWrap:'pretty' } }, c.body)))),
    el('div', { style:{ ...plate, padding:'12px 14px', display:'flex', alignItems:'center', gap:12 } },
      el('span', { style:{ flex:1, ...body(13.5), fontStyle:'italic', color:t.faint } }, 'Say something about this task…'),
      el('span', { style:{ cursor:'pointer', ...sc, fontSize:8.5, color:t.ctaText, background:t.ctaBg, border:`1px solid ${t.brass}`, padding:'8px 14px' } }, 'Post')));

  const CSS = `
@keyframes epdBreathe { 0%,100% { opacity:0; } 22%,72% { opacity:var(--epdOp,.3); } }
.epd-glyph { opacity:0; animation:epdBreathe 19s ease-in-out infinite; }
@media (prefers-reduced-motion:reduce) { .epd-glyph { animation:none; opacity:var(--epdOp,.3); } }
`;

  const shell = { width:'100%', boxSizing:'border-box', background:t.page, color:t.ink, fontFamily:BODY, minHeight:'100%' };

  if (desktop) {
    return el('div', { style:shell },
      el('style', null, CSS),
      el('div', { style:{ padding:'32px 38px 46px' } },
        el('div', { style:{ display:'flex', gap:30, alignItems:'flex-start', marginBottom:30 } },
          el('div', { style:{ flex:1, minWidth:0 } }, header),
          el('div', { style:{ flex:'0 0 420px', width:420, marginTop:0 } }, crownedPanel(actionPanel))),
        el('div', { style:{ minWidth:0 } }, brief, gallery, comments)));
  }

  return el('div', { style:{ ...shell, display:'flex', flexDirection:'column' } },
    el('style', null, CSS),
    el('div', { style:{ display:'flex', alignItems:'center', gap:10, padding:'11px 14px', background:t.band, color:t.bandInk, position:'sticky', top:0, zIndex:5, borderBottom:`2px solid ${t.brass}` } },
      el('span', { style:{ fontFamily:DECO, fontSize:16, cursor:'pointer', color:t.bandInk } }, '←'),
      el('span', { style:{ ...sc, fontSize:8.5, color:t.gold } }, 'Task №' + d.num),
      el('span', { style:{ marginLeft:'auto' } }, ico('planet', 15, t.gold, 1.3))),
    el('div', { style:{ padding:'18px 16px 28px' } },
      header,
      el('div', { style:{ marginBottom:26 } }, crownedPanel(actionPanel)),
      brief, gallery, comments));
}

module.exports = { EphemeristsTaskDetail };
