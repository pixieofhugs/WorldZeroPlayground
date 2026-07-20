/**
 * Faction Vote Widgets — World Zero
 * =================================
 * Eight self-contained, interactive 1–5 rating widgets, one per faction.
 * Each is an uncontrolled React component: internal hover + selected state.
 * Click a rank to lock it in (click again to clear); hover previews.
 *
 * These are faithful ports of the design prototype (built with
 * React.createElement, kept as-is for pixel fidelity — feel free to rewrite
 * as JSX in your codebase). They rely on keyframes in `animations.css`,
 * which must be loaded on the page.
 *
 * Props (all optional):
 *   dark   — boolean, use the dark-band caption palette (Everymen, Ephemerists,
 *            Albescent, Unaffiliated read this; others render identically).
 *   value  — number 0–5 to seed the selected rank.
 *   onChange(rank) — called when the user picks/clears a rank.
 *
 * UAVote additionally needs CSS vars on an ancestor:
 *   --ua (#DD5A1E), --ua-deep (#B8471A), --bg (card background, e.g. #F7E7D2)
 *
 * Exports: UAVote, SnideVote, SingularityVote, EverymenVote,
 *          EphemeristsVote, WowVote, UnaffiliatedVote, AlbescentVote
 */
import React, { useState, useEffect, useRef } from 'react';

const e = React.createElement;

/* ----- shared data ----------------------------------------------------- */
const SNIDE    = [{v:1,name:'Meh'},{v:2,name:'Not Bad'},{v:3,name:'Rad'},{v:4,name:'Sick'},{v:5,name:'Anarchy'}];
const SIG      = [{v:1,name:'Noise'},{v:2,name:'Weak'},{v:3,name:'Signal'},{v:4,name:'Clear'},{v:5,name:'Verified'}];
const EVERYMEN = [{v:1,name:'Fair'},{v:2,name:'Solid'},{v:3,name:'Good'},{v:4,name:'Excellent'},{v:5,name:'Legendary'}];
const WOW      = [{v:1,name:'sweet'},{v:2,name:'lovely'},{v:3,name:'wonderful'},{v:4,name:'magical'},{v:5,name:'iconic'}];
const UNAFF    = [{v:1,name:'so-so'},{v:2,name:'decent'},{v:3,name:'good'},{v:4,name:'great'},{v:5,name:'brilliant'}];
const EPH      = [{v:1,name:'apocryphal'},{v:2,name:'disputed'},{v:3,name:'plausible'},{v:4,name:'corroborated'},{v:5,name:'canonical'}];

const RANK_COLOR = ['','#A69C8C','#C0894F','#D2762F','#DD5A1E','#B5361A'];
const RANK_WORD  = ['','faint','forming','true','alive','radiant'];
const MCHARS = 'ｱｲｳｴｵｶｷｸｹｺﾊﾋﾌﾍﾎﾐﾑ0123456789#%$*+=<>?/'.split('');
const SPARK_D    = 'M12 2c.4 4.6 1.4 6.6 6 7-4.6.4-5.6 2.4-6 7-.4-4.6-1.4-6.6-6-7 4.6-.4 5.6-2.4 6-7z';
const STAR_REAL_D = 'M12 0.5 L13 10.6 L23.5 12 L13 13.4 L12 23.5 L11 13.4 L0.5 12 L11 10.6 Z';
const ACID = '#b6ff2e', GREEN = '#4ade80', CYAN = '#60a5fa', EM_EDGE = '#c9b58f', WPINK = '#ec5f99';
const E_GOLD_LT = '#d4ab55', E_RUBRIC = '#9c3622', E_LAPIS_DEEP = '#122b3d', E_MUTED = '#6f5c3e';

/* ----- shared helpers -------------------------------------------------- */
function btnBase(){
  return { border:'none', background:'transparent', padding:0, margin:0, cursor:'pointer',
    display:'flex', alignItems:'center', justifyContent:'center' };
}
function rand(seed, tick){
  const i = ((Math.floor(seed*131 + tick*71) % MCHARS.length) + MCHARS.length) % MCHARS.length;
  return MCHARS[i];
}
/** interval tick used by the randomized/morphing widgets */
function useTick(ms){
  const [t, setT] = useState(0);
  useEffect(() => { const iv = setInterval(() => setT(x => x + 1), ms); return () => clearInterval(iv); }, [ms]);
  return t;
}
/** uncontrolled hover/selected model shared by most widgets */
function useVote(value, onChange){
  const [sel, setSel] = useState(value || 0);
  const [hov, setHov] = useState(0);
  const active = hov || sel;
  const pick = v => setSel(s => { const n = s === v ? 0 : v; onChange && onChange(n); return n; });
  return { sel, hov, setHov, active, pick };
}

function Caption({ active, picked, tierList, theme }){
  const label = active ? tierList[active - 1].name : theme.idle;
  return e('div', { style:{ height:18, display:'flex', alignItems:'center', gap:8, marginTop:12 } }, [
    e('span', { key:'l', style:{ fontFamily:theme.font, fontStyle:theme.italic?'italic':'normal', fontSize:theme.size,
      letterSpacing:theme.ls||'0', color: active ? theme.on : theme.off, transition:'color 140ms' } }, label),
    picked ? e('span', { key:'d', style:{ fontFamily:"'Courier Prime', monospace", fontSize:8,
      letterSpacing:'0.14em', textTransform:'uppercase', color:theme.off } }, theme.tag) : null,
  ]);
}
function Wrap({ onLeave, active, picked, tierList, theme, children }){
  return e('div', { onMouseLeave:onLeave, style:{ display:'flex', flexDirection:'column' } },
    [ e('div', { key:'r' }, children), e(Caption, { key:'c', active, picked, tierList, theme }) ]);
}

/* ====================================================================== */
/* SNIDE — amp / EQ meter                                                 */
/* ====================================================================== */
export function SnideVote({ value, onChange }){
  const { sel, setHov, active, pick } = useVote(value, onChange);
  const segCol = ['#b6ff2e','#b6ff2e','#b6ff2e','#f0c400','#ff2d8b'];
  const party = active >= 5;
  const cols = SNIDE.map(t => {
    const reached = active >= t.v, picked = sel === t.v;
    const cells = [0,1,2,3,4].map(i => {
      const lit = reached && i < t.v, cc = segCol[i];
      return e('span', { key:i, style:{ width:32, height:5, borderRadius:1,
        background: lit ? cc : 'rgba(255,255,255,0.07)',
        boxShadow: lit ? '0 0 5px '+cc : 'none', transition:'all 90ms', transformOrigin:'center',
        animation: (party && lit) ? 'amp-party '+(0.34+i*0.05)+'s ease-in-out infinite' : 'none',
        animationDelay: (party && lit) ? (t.v*0.06+i*0.04)+'s' : '0s' } });
    });
    return e('button', { key:t.v, onClick:()=>pick(t.v), onMouseEnter:()=>setHov(t.v),
      'aria-label':'Rate '+t.v, style:{ ...btnBase(), flexDirection:'column-reverse', gap:2,
        padding:'3px 3px 0', background:'transparent', borderRadius:2,
        outline: picked ? '1px solid rgba(182,255,46,0.65)' : 'none', outlineOffset:2 } }, cells);
  });
  const panel = e('div', { style:{ position:'relative', display:'flex', gap:5, alignItems:'flex-end',
    padding:'11px 13px', background:'linear-gradient(#100d09,#070603)',
    border:'2px solid #2c2a20', borderRadius:6,
    boxShadow:'inset 0 2px 7px rgba(0,0,0,0.75), inset 0 0 0 1px rgba(182,255,46,0.06)' } }, [
    ...cols,
    e('span', { key:'sl', style:{ position:'absolute', top:5, left:5, width:4, height:4, borderRadius:'50%', background:'#3a3830', boxShadow:'inset 0 0 0 1px #000' } }),
    e('span', { key:'sr', style:{ position:'absolute', top:5, right:5, width:4, height:4, borderRadius:'50%', background:'#3a3830', boxShadow:'inset 0 0 0 1px #000' } }),
  ]);
  return e(Wrap, { onLeave:()=>setHov(0), active, picked:sel, tierList:SNIDE,
    theme:{ font:"'Permanent Marker', cursive", size:14, on:ACID, off:'#8a9a6a', idle:'call it', tag:'· locked in' } }, panel);
}

/* ====================================================================== */
/* SINGULARITY — decode strip                                             */
/* ====================================================================== */
export function SingularityVote({ value, onChange }){
  const { sel, setHov, active, pick } = useVote(value, onChange);
  const tick = useTick(120);
  const dens = ['·','+','*','#','█'];
  const rowEl = e('div', { style:{ display:'flex', gap:6, alignItems:'flex-end' } }, SIG.map(t => {
    const reached = active >= t.v, picked = sel === t.v, top = t.v === 5;
    const col = top ? CYAN : GREEN;
    const lines = [0,1,2].map(r => {
      const txt = reached ? dens[t.v-1].repeat(3)
        : rand(t.v*30+r*3+1, tick) + rand(t.v*30+r*3+2, tick) + rand(t.v*30+r*3+3, tick);
      return e('div', { key:r, style:{ lineHeight:1 } }, txt);
    });
    return e('button', { key:t.v, onClick:()=>pick(t.v), onMouseEnter:()=>setHov(t.v),
      'aria-label':'Rate '+t.v, style:{ ...btnBase(), flexDirection:'column', gap:1,
        width:46, height:44, padding:'3px 0', borderRadius:2,
        fontFamily:"'Share Tech Mono', monospace", fontSize:12, letterSpacing:'2px',
        color: reached ? col : 'rgba(74,222,128,0.24)',
        textShadow: reached ? '0 0 8px '+col : 'none',
        background: reached ? 'rgba(74,222,128,0.05)' : 'transparent',
        outline: picked ? '1px solid '+col : 'none', outlineOffset:2, transition:'color 120ms, background 120ms' } }, lines);
  }));
  return e(Wrap, { onLeave:()=>setHov(0), active, picked:sel, tierList:SIG,
    theme:{ font:"'Share Tech Mono', monospace", size:13, on:GREEN, off:'#3f7a58', idle:'no signal', tag:'· locked', ls:'0.08em' } }, rowEl);
}

/* ====================================================================== */
/* EVERYMEN — gearworks                                                    */
/* ====================================================================== */
export function EverymenVote({ dark, value, onChange }){
  const { sel, setHov, active, pick } = useVote(value, onChange);
  const heat = ['#6e747e','#9c7d4a','#c8842a','#eb5f14','#ffcf6e'];
  const hub  = ['#f4ecd6','#f4ecd6','#fbe6c2','#ffe6b0','#fff3c8'];
  const edge = dark ? '#8a7856' : EM_EDGE;
  const glow = ['none','drop-shadow(0 0 2px rgba(180,120,40,0.5))','drop-shadow(0 0 4px rgba(210,132,42,0.7))',
    'drop-shadow(0 0 6px rgba(235,95,20,0.8))', dark ? 'drop-shadow(0 0 9px rgba(255,175,60,0.95))' : 'drop-shadow(0 1px 1px rgba(120,60,10,0.55)) drop-shadow(0 0 7px rgba(235,120,20,0.85))'];
  const teeth = (attrs) => [0,1,2,3,4,5,6,7].map(k => e('rect', { key:k, x:10.9, y:1.4, width:2.2, height:3.8, rx:0.5, transform:'rotate('+(k*45)+' 12 12)', ...attrs }));
  const row = e('div', { style:{ display:'flex', gap:4, alignItems:'center' } }, EVERYMEN.map(t => {
    const reached = active >= t.v, picked = sel === t.v, top = t.v === 5, sz = 30 + t.v*2.5;
    const col = heat[t.v-1];
    const kids = reached
      ? [ ...teeth({ fill:col }), e('circle', { key:'b', cx:12, cy:12, r:7, fill:col }), e('circle', { key:'h', cx:12, cy:12, r:2.5, fill:hub[t.v-1] }) ]
      : [ ...teeth({ fill:'none', stroke:edge, strokeWidth:0.8 }), e('circle', { key:'b', cx:12, cy:12, r:7, fill:'none', stroke:edge, strokeWidth:1 }), e('circle', { key:'h', cx:12, cy:12, r:2.5, fill:'none', stroke:edge, strokeWidth:1 }) ];
    const gear = e('svg', { viewBox:'0 0 24 24', width:sz, height:sz, style:{ transformOrigin:'center',
      animation: reached ? ((t.v%2 ? 'gear-cw ' : 'gear-ccw ')+(2.6+t.v*0.4)+'s linear infinite') : 'none',
      filter: reached ? glow[t.v-1] : 'none' } }, kids);
    const layers = [gear];
    if (reached && top) {
      const dirs = [[-16,-20],[14,-22],[20,-6],[-20,-8],[6,-26],[-8,-24]];
      layers.push(...dirs.map((d,i) => e('span', { key:'sp'+i, style:{ position:'absolute', top:'22%', left:'50%',
        width: i%2?3:2, height: i%2?3:2, borderRadius:'50%', background: i%2?'#ffe08a':'#ff9838',
        boxShadow:'0 0 4px #ffb347', pointerEvents:'none', '--sx':d[0]+'px', '--sy':d[1]+'px',
        animation:'gear-spark '+(1+i*0.15)+'s ease-out infinite', animationDelay:(i*0.22)+'s' } })));
    }
    return e('button', { key:t.v, onClick:()=>pick(t.v), onMouseEnter:()=>setHov(t.v),
      'aria-label':'Rate '+t.v, style:{ ...btnBase(), position:'relative', transform: picked?'scale(1.12)':'none', transition:'transform 140ms' } }, layers);
  }));
  return e(Wrap, { onLeave:()=>setHov(0), active, picked:sel, tierList:EVERYMEN, theme: dark
    ? { font:"'Bebas Neue', Impact, sans-serif", size:17, on:'#e2433f', off:'#a5906a', idle:'awaiting', tag:'· earned', ls:'0.06em' }
    : { font:"'Bebas Neue', Impact, sans-serif", size:17, on:'#c1272d', off:'#6c5a40', idle:'awaiting', tag:'· earned', ls:'0.06em' } }, row);
}

/* ====================================================================== */
/* ALBESCENT — ferrofluid morphing polygons                               */
/* ====================================================================== */
function polyClipN(sides){
  const N = 48, s = sides < 3 ? 64 : sides, seg = 2*Math.PI/s, pts = [];
  for(let k=0;k<N;k++){
    const th = (k/N)*Math.PI*2 - Math.PI/2;
    const ang = ((th%seg)+seg)%seg - seg/2;
    const r = Math.cos(Math.PI/s)/Math.cos(ang);
    pts.push((50+48*r*Math.cos(th)).toFixed(1)+'% '+(50+48*r*Math.sin(th)).toFixed(1)+'%');
  }
  return 'polygon('+pts.join(',')+')';
}
export function AlbescentVote({ dark, value, onChange }){
  const { sel, setHov, active, pick } = useVote(value, onChange);
  const tick = useTick(120);
  const rainbow = 'linear-gradient(90deg,#c1272d,#c2541f 17%,#ca8a04 33%,#16a34a 50%,#1d6e72 67%,#2563eb 83%,#be185d)';
  const glowC = ['#c1352a','#cf861a','#16a34a','#2f7fb8','#a4277e'];
  const GAP = 14, sizes = [22,24,26,28,30];
  const SPAN = sizes.reduce((s,x)=>s+x,0) + 4*GAP;
  const seq = [64,3,4,5,6];
  const step = Math.floor(tick*120/1700);
  const morph = 'clip-path .85s cubic-bezier(.65,0,.35,1), -webkit-clip-path .85s cubic-bezier(.65,0,.35,1), transform .18s';
  let off = 0;
  const row = e('div', { style:{ display:'flex', gap:GAP, alignItems:'center' } }, UNAFF.map((t,i) => {
    const reached = active >= t.v, picked = sel === t.v, top = t.v === 5, c = glowC[i], SZ = sizes[i];
    const posX = -off; off += SZ + GAP;
    const clip = polyClipN(seq[(step + i) % seq.length]);
    const dot = e('div', { style:{ width:SZ, height:SZ, clipPath:clip, WebkitClipPath:clip, transition:morph,
      backgroundColor:'transparent',
      backgroundImage: reached ? rainbow : (dark ? 'linear-gradient(0deg,rgba(233,222,196,0.26),rgba(233,222,196,0.26))' : 'linear-gradient(0deg,rgba(120,108,88,0.2),rgba(120,108,88,0.2))'),
      backgroundRepeat:'no-repeat', backgroundSize: SPAN+'px '+SZ+'px', backgroundPositionX: posX+'px',
      filter: reached ? ('drop-shadow(0 0 4px '+c+'aa)' + (dark?' drop-shadow(0 0 0.8px rgba(0,0,0,0.9))':'') + (top?' drop-shadow(0 0 7px '+c+'88)':'')) : (dark ? 'drop-shadow(0 0 0.7px rgba(255,255,255,0.4))' : 'none'),
      animation: reached ? 'spec-rise '+(1.9 - t.v*0.18)+'s ease-in-out infinite' : 'none', animationDelay:(t.v*0.12)+'s', '--bounce':(-2 - t.v*1.6)+'px' } });
    return e('button', { key:t.v, onClick:()=>pick(t.v), onMouseEnter:()=>setHov(t.v),
      'aria-label':'Rate '+t.v, style:{ ...btnBase(), width:SZ, height:SZ, transform: picked?'scale(1.14)':'none', transition:'transform 140ms' } }, dot);
  }));
  return e(Wrap, { onLeave:()=>setHov(0), active, picked:sel, tierList:UNAFF, theme: dark
    ? { font:"'Bebas Neue', Impact, sans-serif", size:15, on:'#e07a3a', off:'#b0925f', idle:'cast a vote', ls:'0.06em', tag:'· your vote' }
    : { font:"'Bebas Neue', Impact, sans-serif", size:15, on:'#c2541f', off:'#a8895a', idle:'cast a vote', ls:'0.06em', tag:'· your vote' } }, row);
}

/* ====================================================================== */
/* UNAFFILIATED — spectrum sweep                                          */
/* ====================================================================== */
export function UnaffiliatedVote({ dark, value, onChange }){
  const { sel, setHov, active, pick } = useVote(value, onChange);
  const rainbow = 'linear-gradient(90deg,#c1272d,#c2541f 17%,#ca8a04 33%,#16a34a 50%,#1d6e72 67%,#2563eb 83%,#be185d)';
  const glowC = ['#c1352a','#cf861a','#16a34a','#2f7fb8','#a4277e'];
  const GAP = 9, sizes = [18,20,23,26,30];
  const SPAN = sizes.reduce((s,x)=>s+x,0) + 4*GAP;
  let off = 0;
  const row = e('div', { style:{ display:'flex', gap:GAP, alignItems:'center' } }, UNAFF.map((t,i) => {
    const reached = active >= t.v, picked = sel === t.v, top = t.v === 5, c = glowC[i], SZ = sizes[i];
    const posX = -off; off += SZ + GAP;
    const dot = e('div', { style:{ width:SZ, height:SZ, borderRadius:'50%',
      backgroundColor:'transparent', backgroundImage: reached ? rainbow : 'none', backgroundRepeat:'no-repeat',
      backgroundSize: SPAN+'px '+SZ+'px', backgroundPositionX: posX+'px',
      boxShadow: reached ? '0 0 8px '+c+'99, inset 0 0 0 1px rgba(255,255,255,0.5)'+(top?', 0 0 16px '+c+'88':'') : 'inset 0 0 0 1.5px '+(dark ? 'rgba(240,230,208,0.3)' : '#d6cfbf'),
      transition:'background 140ms, box-shadow 140ms',
      animation: reached ? 'spec-rise '+(1.9 - t.v*0.18)+'s ease-in-out infinite' : 'none', animationDelay:(t.v*0.12)+'s', '--bounce':(-2 - t.v*1.6)+'px' } });
    return e('button', { key:t.v, onClick:()=>pick(t.v), onMouseEnter:()=>setHov(t.v),
      'aria-label':'Rate '+t.v, style:{ ...btnBase(), transform: picked?'scale(1.14)':'none', transition:'transform 140ms' } }, dot);
  }));
  return e(Wrap, { onLeave:()=>setHov(0), active, picked:sel, tierList:UNAFF, theme: dark
    ? { font:"'Bebas Neue', Impact, sans-serif", size:15, on:'#e07a3a', off:'#b0925f', idle:'cast a vote', ls:'0.06em', tag:'· your vote' }
    : { font:"'Bebas Neue', Impact, sans-serif", size:15, on:'#c2541f', off:'#a8895a', idle:'cast a vote', ls:'0.06em', tag:'· your vote' } }, row);
}

/* ====================================================================== */
/* WOW / COZY COVEN — witchy moon phases                                  */
/* ====================================================================== */
export function WowVote({ value, onChange }){
  const { sel, setHov, active, pick } = useVote(value, onChange);
  const R = 12;
  const phase = (f) => {
    const rx = R*(1-2*f), sw = rx > 0 ? 0 : 1;
    return 'M15 '+(15-R)+' A'+R+' '+R+' 0 0 1 15 '+(15+R)+' A'+Math.abs(rx).toFixed(2)+' '+R+' 0 0 '+sw+' 15 '+(15-R)+'Z';
  };
  const spots = [{top:'0px',left:'-2px'},{top:'-3px',right:'0px'},{bottom:'4px',right:'-5px'},{top:'8px',left:'-5px'}];
  const moons = WOW.map(t => {
    const reached = active >= t.v, picked = sel === t.v, top = t.v === 5, sz = top?40:30;
    const kids = [
      e('circle', { key:'disc', cx:15, cy:15, r:R, fill: reached?'#2a1740':'#241a33' }),
      e('path', { key:'lit', d:phase(t.v/5), fill: reached?'#f4d98a':'#4a3a5e' }),
      e('circle', { key:'o', cx:15, cy:15, r:R, fill:'none', stroke: reached?'#e6b8d6':'#4a3560', strokeWidth:1.2 }),
    ];
    if (reached && top) kids.push(
      e('path', { key:'e1', d:'M10.6 13.6 Q11.9 12.1 13.2 13.6', fill:'none', stroke:'#6a2f7e', strokeWidth:1.2, strokeLinecap:'round' }),
      e('path', { key:'e2', d:'M16.8 13.6 Q18.1 12.1 19.4 13.6', fill:'none', stroke:'#6a2f7e', strokeWidth:1.2, strokeLinecap:'round' }),
      e('path', { key:'sm', d:'M12 17.4 Q15 20 18 17.4', fill:'none', stroke:'#6a2f7e', strokeWidth:1.3, strokeLinecap:'round' }),
      e('circle', { key:'c1', cx:10.6, cy:16.4, r:1.6, fill:'rgba(236,95,153,0.45)' }),
      e('circle', { key:'c2', cx:19.4, cy:16.4, r:1.6, fill:'rgba(236,95,153,0.45)' }),
      e('path', { key:'star', d:SPARK_D, transform:'translate(21 7) scale(0.22) translate(-12 -12)', fill:'#f0d36e' }));
    const svg = e('svg', { key:'sv', viewBox:'0 0 30 30', width:sz, height:sz, style:{ overflow:'visible',
      filter: reached ? 'drop-shadow(0 0 6px rgba(190,120,225,0.6))' : 'none' } }, kids);
    const layers = [svg];
    if (reached && top) spots.forEach((p, i) => layers.push(
      e('span', { key:'sp'+i, style:{ position:'absolute', ...p, width: i%2?8:11, height: i%2?8:11, pointerEvents:'none',
        animation:'wow-twinkle 1.2s ease-in-out infinite', animationDelay:(i*0.18)+'s' } },
        e('svg', { viewBox:'0 0 24 24', width:'100%', height:'100%' }, e('path', { d:SPARK_D, fill: ['#e6b8ff','#ffd36e','#f6a6cf','#fff4cf'][i] })))));
    return e('button', { key:t.v, onClick:()=>pick(t.v), onMouseEnter:()=>setHov(t.v),
      'aria-label':'Rate '+t.v, style:{ ...btnBase(), position:'relative', width: top?46:36, height:44,
        transform: picked?'scale(1.12)':'none', transition:'transform 150ms' } }, layers);
  });
  const dust = [[12,10],[62,34],[118,12],[168,30],[196,14],[46,40]].map((p,i) =>
    e('span', { key:'d'+i, style:{ position:'absolute', left:p[0], top:p[1], width:5, height:5, pointerEvents:'none',
      opacity:0.7, animation:'eph-twinkle 3.2s ease-in-out infinite', animationDelay:(i*0.4)+'s' } },
      e('svg', { viewBox:'0 0 24 24', width:5, height:5 }, e('path', { d:SPARK_D, fill:'#b98fd6' }))));
  const plate = e('div', { style:{ position:'relative', display:'flex', gap:6, alignItems:'center', justifyContent:'center',
    padding:'9px 12px', background:'radial-gradient(120% 150% at 50% -20%, #3a2352, #190f2b)', borderRadius:12,
    border:'1px solid #4a3168', boxShadow:'inset 0 1px 8px rgba(0,0,0,0.5)' } }, [...dust, ...moons]);
  return e(Wrap, { onLeave:()=>setHov(0), active, picked:sel, tierList:WOW,
    theme:{ font:"'Caveat', cursive", size:19, on:WPINK, off:'#c78aa6', idle:'tap to cheer', tag:'· yay!' } }, plate);
}

/* ====================================================================== */
/* UA — growing mandala                                                    */
/* ====================================================================== */
function petalPath(c, ang, r0, len, wid){
  const ox=Math.cos(ang), oy=Math.sin(ang), px=-oy, py=ox;
  const bx=c+ox*r0, by=c+oy*r0, tx=c+ox*(r0+len), ty=c+oy*(r0+len);
  const s1x=bx+px*wid, s1y=by+py*wid, s2x=bx-px*wid, s2y=by-py*wid;
  const m1x=tx+px*wid*0.32, m1y=ty+py*wid*0.32, m2x=tx-px*wid*0.32, m2y=ty-py*wid*0.32;
  return 'M '+bx+' '+by+' Q '+s1x+' '+s1y+' '+m1x+' '+m1y+' Q '+tx+' '+ty+' '+m2x+' '+m2y+' Q '+s2x+' '+s2y+' '+bx+' '+by+' Z';
}
export function UAVote({ value, onChange }){
  const [sel, setSel] = useState(value || 0);
  const [hov, setHov] = useState(0);
  const active = hov || sel || 0;
  const cast = k => setSel(s => { const n = s === k ? 0 : k; onChange && onChange(n); return n; });
  const mandalaCell = (rank, emph, bloom, alive) => {
    const size = 22 + rank*4, c = size/2, maxR = c*0.84;
    const col = RANK_COLOR[rank], deep = RANK_COLOR[Math.min(5, rank+1)];
    const kids = rank>=3 ? [ e('circle', { key:'disc', cx:c, cy:c, r:c*0.97, fill:col, opacity:0.1 }) ] : [];
    if(rank===1){
      const N=12, sp=[];
      for(let j=0;j<N;j++){ const a=(j/N)*Math.PI*2; sp.push(e('line', { key:'s'+j, x1:c+Math.cos(a)*2.6, y1:c+Math.sin(a)*2.6, x2:c+Math.cos(a)*(maxR*0.92), y2:c+Math.sin(a)*(maxR*0.92), stroke:col, strokeWidth:1.1, strokeLinecap:'round', opacity:0.85 })); }
      kids.push(e('g', { key:'aster', style:{ transformOrigin:c+'px '+c+'px', animation:'ringGrow .5s both ease-out, uaspin 42s linear infinite' } }, ...sp));
      kids.push(e('circle', { key:'cd', cx:c, cy:c, r:2.4, fill:RANK_COLOR[5] }));
    } else {
      const rings = rank-1;
      for(let ring=1; ring<=rings; ring++){
        const outer = ring===rings;
        const pet = outer ? (6 + rank*2) : (7 + ring*3);
        const rEnd = (ring/rings)*maxR, r0 = ((ring-1)/rings)*maxR + 1.4;
        const len = Math.max(2, (rEnd - r0) * (outer ? 1.22 : 1));
        const wid = outer ? 1.4 : Math.max(1.1, 2.6 - ring*0.4);
        const fill = ring%2 ? col : deep, grp = [];
        for(let j=0;j<pet;j++){ const a = (j/pet)*Math.PI*2 + (ring%2 ? Math.PI/pet : 0); grp.push(e('path', { key:j, d:petalPath(c, a, r0, len, wid), fill, opacity: 0.5 + ring/rings*0.45 })); }
        const dir = ring%2 ? 1 : -1;
        const spin = (alive ? (16 - ring*2) : (34 - ring*4));
        kids.push(e('g', { key:'r'+ring, style:{ transformOrigin:c+'px '+c+'px', animation:'ringGrow .5s '+(ring*0.06)+'s both ease-out, uaspin '+spin+'s linear infinite '+(dir>0?'':'reverse') } }, ...grp));
      }
      if(rank===5){
        const pet = 16, fl=[];
        for(let j=0;j<pet;j++){ const a=(j/pet)*Math.PI*2 + Math.PI/pet; fl.push(e('path', { key:'fl'+j, d:petalPath(c, a, maxR*0.5, maxR*0.56, 1.1), fill:RANK_COLOR[5], opacity:0.6 })); }
        kids.push(e('g', { key:'flame', style:{ transformOrigin:c+'px '+c+'px', animation:'ringGrow .5s .3s both ease-out, uaspin 11s linear infinite reverse' } }, ...fl));
      }
      const cf = [];
      for(let j=0;j<8;j++){ cf.push(e('path', { key:j, d:petalPath(c, (j/8)*Math.PI*2, 0, 2.2+Math.min(rank,3)*0.5, 1.1), fill:RANK_COLOR[5], opacity:0.9 })); }
      kids.push(e('g', { key:'cf' }, ...cf));
    }
    kids.push(e('circle', { key:'core', cx:c, cy:c, r:1.1+Math.min(rank,3)*0.28, fill:'var(--bg)' }));
    const halo = bloom ? e('span', { key:'halo', style:{ position:'absolute', inset:0, borderRadius:'50%', border:'2px solid var(--ua)', animation:'haloPulse .7s ease-out both', transformOrigin:'center', pointerEvents:'none' } }) : null;
    return e('div', { key:rank + ((active===rank)?'-a':''), onClick:()=>cast(rank), onMouseEnter:()=>setHov(rank),
      title:rank+' of 5', style:{ position:'relative', display:'flex', alignItems:'flex-end', justifyContent:'center', height:'50px', width:size+'px', cursor:'pointer' } },
      e('div', { style:{ position:'relative', display:'flex', alignItems:'flex-end',
        filter: emph ? 'none' : 'saturate(.45) opacity(.5)', transform: emph ? 'scale(1.08)' : 'scale(.9)', transformOrigin:'bottom center', transition:'filter .28s ease, transform .28s ease' } },
        e('div', { style:{ position:'relative', width:size+'px', height:size+'px', transformOrigin:'center', animation: alive ? ('voteTwist '+(2 + rank*0.22)+'s ease-in-out infinite') : 'none' } }, halo,
          e('svg', { width:size, height:size, viewBox:'0 0 '+size+' '+size, style: Object.assign({ position:'absolute', inset:0 }, bloom ? { animation:'voteBloom .7s cubic-bezier(.2,1.25,.35,1) both' } : {}) }, ...kids))));
  };
  const row = e('div', { style:{ display:'flex', alignItems:'flex-end', justifyContent:'flex-start', gap:14 } },
    [1,2,3,4,5].map(k => mandalaCell(k, k<=active, active===k, active===5)));
  const reading = e('div', { style:{ marginTop:8, height:22, fontFamily:"'Cormorant Garamond',serif", fontWeight:600, fontSize:20, lineHeight:1, color:'var(--ua-deep)', textTransform:'lowercase' } }, active ? RANK_WORD[active] : '');
  return e('div', { onMouseLeave:()=>setHov(0), style:{ display:'flex', flexDirection:'column' } },
    [ e('div',{key:'row'}, row), reading ]);
}

/* ====================================================================== */
/* EPHEMERISTS — constellation attestation                                */
/* ====================================================================== */
export function EphemeristsVote({ dark, value, onChange }){
  const { sel, setHov, active, pick } = useVote(value, onChange);
  const pts = [[24,44],[80,18],[136,50],[196,20],[256,42]], W = 284, H = 68;
  const linePts = pts.slice(0, Math.max(active,0)).map(p => p.join(',')).join(' ');
  const dust = [[40,12],[110,60],[172,10],[232,60],[270,16],[60,54]].map((p,i) =>
    e('circle', { key:'du'+i, cx:p[0], cy:p[1], r:0.8, fill:'#5a6b7d', opacity:0.5 }));
  const lines = e('svg', { key:'ln', viewBox:'0 0 '+W+' '+H, width:W, height:H, style:{ position:'absolute', inset:0, pointerEvents:'none' } }, [
    ...dust,
    active>=2 ? e('polyline', { key:'pl', points:linePts, fill:'none', stroke:E_GOLD_LT, strokeWidth:1.4, strokeDasharray:'3 3', opacity:0.9, style:{ filter:'drop-shadow(0 0 3px rgba(212,171,85,0.85))' } }) : null,
  ]);
  const stars = EPH.map((t,i) => {
    const reached = active >= t.v, picked = sel === t.v, top = t.v === 5, x = pts[i][0], y = pts[i][1], sz = top?28:21;
    const kids = [ e('svg', { key:'s', viewBox:'0 0 24 24', width:sz, height:sz, style:{ overflow:'visible', filter: reached ? 'drop-shadow(0 0 5px rgba(240,211,120,0.95))' : 'none' } },
      e('path', { d:STAR_REAL_D, fill: reached?(top?'#fff4cf':E_GOLD_LT):'#3a4655', opacity: reached?1:0.85 }),
      e('circle', { cx:12, cy:12, r: reached?(top?2.4:1.9):1.4, fill: reached?(top?'#ffffff':'#fff1c8'):'#556374' })) ];
    if (reached && top) [[-11,-9],[12,-8],[11,12],[-12,9]].forEach((p,j) => kids.push(
      e('span', { key:'sp'+j, style:{ position:'absolute', left:'50%', top:'50%', width:9, height:9, marginLeft:p[0], marginTop:p[1], pointerEvents:'none', animation:'wow-twinkle 1.2s ease-in-out infinite', animationDelay:(j*0.2)+'s' } },
        e('svg', { viewBox:'0 0 24 24', width:9, height:9 }, e('path', { d:SPARK_D, fill:'#fff4cf' })))));
    return e('button', { key:t.v, onClick:()=>pick(t.v), onMouseEnter:()=>setHov(t.v),
      'aria-label':'Rate '+t.v, style:{ ...btnBase(), position:'absolute', left:x-sz/2, top:y-sz/2, width:sz, height:sz, transform: picked?'scale(1.18)':'none', transition:'transform 150ms', animation: reached && !top ? 'eph-twinkle 3s ease-in-out infinite' : 'none', animationDelay:(i*0.4)+'s' } }, kids);
  });
  const plate = e('div', { style:{ position:'relative', width:W, height:H, background:'radial-gradient(130% 160% at 50% -10%, #1c2e40, #0a121c)', borderRadius:6, border:'1px solid '+E_LAPIS_DEEP, boxShadow:'inset 0 1px 6px rgba(0,0,0,0.6)' } }, [lines, ...stars]);
  return e(Wrap, { onLeave:()=>setHov(0), active, picked:sel, tierList:EPH, theme: dark
    ? { font:"'EB Garamond', Georgia, serif", italic:true, size:15, on:'#d4694a', off:'#b39a6a', idle:'attest the record', tag:'· sealed' }
    : { font:"'EB Garamond', Georgia, serif", italic:true, size:15, on:E_RUBRIC, off:E_MUTED, idle:'attest the record', tag:'· sealed' } }, plate);
}

export default {
  UAVote, SnideVote, SingularityVote, EverymenVote,
  EphemeristsVote, WowVote, UnaffiliatedVote, AlbescentVote,
};
