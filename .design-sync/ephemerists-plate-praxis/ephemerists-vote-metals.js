// SOURCE: "Faction Praxis Cards.dc.html" <script type="text/x-dc"> — Ephemerists vote widget.
// Shared caption/wrap helpers first, then the metals ladder itself.


  pick = (id,v) => this.setState(s=>({ sel:{...s.sel,[id]: s.sel[id]===v?0:v} }));
  enter = (id,v) => this.setState(s=>({ hov:{...s.hov,[id]:v} }));
  leave = (id)   => this.setState(s=>({ hov:{...s.hov,[id]:0} }));
  active = (id)  => this.state.hov[id] || this.state.sel[id];

  btnBase(){ return { border:'none', background:'transparent', padding:0, margin:0, cursor:'pointer',
    display:'flex', alignItems:'center', justifyContent:'center' }; }
  caption(id, tierList, theme){
    const e = React.createElement;
    const a = this.active(id), picked = this.state.sel[id];
    const label = a ? tierList[a-1].name : theme.idle;
    return e('div', { style:{ height:18, display:'flex', alignItems:'center', gap:8, marginTop:12 } }, [
      e('span', { key:'l', style:{ fontFamily:theme.font, fontStyle:theme.italic?'italic':'normal', fontSize:theme.size,
        letterSpacing:theme.ls||'0', color: a ? theme.on : theme.off, transition:'color 140ms' } }, label),
      picked ? e('span', { key:'d', style:{ fontFamily:"'Courier Prime', monospace", fontSize:8,
        letterSpacing:'0.14em', textTransform:'uppercase', color:theme.off } }, theme.tag) : null,
    ]);
  }
  wrap(id, el, tierList, theme){
    return React.createElement('div', { onMouseLeave:()=>this.leave(id), style:{ display:'flex', flexDirection:'column' } },
      [ React.createElement('div',{key:'r'}, el), this.caption(id, tierList, theme) ]);
  }

  // SNIDE — amp EQ meter (approved)
  snAmp(id){
    const e = React.createElement;
    const sel = this.state.sel[id], a = this.active(id);
    const segCol = ['#b6ff2e','#b6ff2e','#b6ff2e','#f0c400','#ff2d8b'];

  // EPHEMERISTS — alchemical transmutation ladder (magitech)
  eph = [{v:1,name:'lead'},{v:2,name:'copper'},{v:3,name:'silver'},{v:4,name:'gold'},{v:5,name:'platinum'}];
  ephGlyph = {
    1:'M6.2 7.4 C7.4 4.6 10.2 4.8 10.2 7.8 C10.2 10.8 9 14.6 9.4 17.6 C9.8 20.4 11.8 21 13.8 19.4 M6.4 10.8 H13.4',
    2:'M12 4.4 a4.4 4.4 0 1 0 0.01 0 Z M12 13.2 V20.6 M8.8 17.4 H15.2',
    3:'M15.8 4.4 A8 8 0 1 0 15.8 19.6 A6.3 6.3 0 1 1 15.8 4.4 Z',
    4:'M12 5 a7 7 0 1 0 0.01 0 Z M12 10.4 a1.7 1.7 0 1 0 0.01 0 Z',
    5:'M10.6 5.2 A7 7 0 1 0 10.6 18.8 A5.5 5.5 0 1 1 10.6 5.2 Z M15.6 7.6 a4.4 4.4 0 1 0 0.01 0 Z M15.6 11.2 a0.9 0.9 0 1 0 0.01 0 Z'
  };
  ephRoman = ['I','II','III','IV','V'];
  ephMetals(id, dark){
    const e = React.createElement;
    const sel = this.state.sel[id], a = this.active(id);
    const brass = dark ? '#C9A24B' : '#9A7A2E', brassL = dark ? '#E6C877' : '#C39B3D';
    const gold = dark ? '#F2D98A' : '#E3C56A', ochre = dark ? '#D9744C' : '#A6432B';
    const idle = dark ? '#1D2130' : '#F6EED6', idleInk = dark ? '#6A6144' : '#9A8C6C';
    const metal = ['#7C7A82','#B4643E','#B9BEC8','#DCBB5E','#E9DCC0'];
    const discs = this.eph.map((t, k) => {
      const reached = a >= t.v, picked = sel === t.v, top = t.v === 5;
      const sz = top ? 50 : 44, r = sz/2;
      const ink = reached ? (t.v >= 4 ? '#1E2233' : '#F6EED6') : idleInk;
      const layers = [];
      const glow = reached ? 'drop-shadow(0 0 3px ' + metal[t.v-1] + 'cc)' + (top ? ' drop-shadow(0 0 9px ' + gold + 'aa)' : '') : 'none';
      layers.push(e('span', { key:'d', style:{ position:'absolute', inset:0, borderRadius:'50%',
        background:'transparent', border:'1px solid ' + (reached ? metal[t.v-1] : brass),
        opacity: reached ? 1 : 0.85,
        boxShadow: reached ? '0 0 12px -2px ' + metal[t.v-1] + '99, inset 0 0 10px -4px ' + metal[t.v-1] : 'none',
        transition:'border-color 220ms ease, box-shadow 220ms ease' } }));
      if (reached) {
        const rays = [];
        const cnt = top ? 16 : 10, RS = sz + 30;
        for (let n = 0; n < cnt; n++) {
          const ang = (n / cnt) * 360, len = (n % 2 ? 5 : 8.5) + (top ? 3 : 0);
          rays.push(e('line', { key:'r'+n, x1:RS/2, y1:RS/2 - (r + 3), x2:RS/2, y2:RS/2 - (r + 3 + len),
            stroke: n % 2 ? gold : metal[t.v-1], strokeWidth: n % 2 ? 0.9 : 1.3, strokeLinecap:'round',
            transform:'rotate(' + ang + ' ' + RS/2 + ' ' + RS/2 + ')',
            style:{ transformBox:'view-box', animation:'eph-ray ' + (2.4 + (n % 3) * 0.5) + 's ease-in-out infinite',
              animationDelay:(n * 0.09).toFixed(2) + 's' } }));
        }
        layers.push(e('svg', { key:'burst', width:RS, height:RS, viewBox:'0 0 ' + RS + ' ' + RS,
          style:{ position:'absolute', left:(sz - RS)/2, top:(sz - RS)/2, pointerEvents:'none', overflow:'visible' } }, rays));
        layers.push(e('span', { key:'shock', style:{ position:'absolute', inset:-2, borderRadius:'50%', pointerEvents:'none',
          border:'1px solid ' + (top ? gold : metal[t.v-1]),
          animation:'eph-shock ' + (top ? '2.2s' : '3s') + ' ease-out infinite', animationDelay:(t.v * 0.12) + 's' } }));
      }
      layers.push(e('svg', { key:'g', width:sz*0.5, height:sz*0.5, viewBox:'0 0 24 24', style:{ position:'relative', display:'block',
        filter: glow, transition:'filter 220ms ease' } },
        e('path', { d:this.ephGlyph[t.v], fill:'none', stroke: reached ? metal[t.v-1] : idleInk, strokeWidth: t.v===3 || t.v===5 ? 1.3 : 1.5,
          strokeLinecap:'round', strokeLinejoin:'round', style:{ transition:'stroke 220ms ease' } })));
      if (reached) layers.push(e('span', { key:'sheen', style:{ position:'absolute', inset:-1, borderRadius:'50%', pointerEvents:'none',
        overflow:'hidden', mixBlendMode:'screen',
        background:'linear-gradient(112deg, transparent 30%, ' + metal[t.v-1] + '00 38%, rgba(255,252,238,0.85) 50%, ' + metal[t.v-1] + '00 62%, transparent 70%)',
        backgroundSize:'260% 100%', animation:'eph-sheen ' + (top ? 2.8 : 3.6) + 's cubic-bezier(.4,0,.2,1) infinite',
        animationDelay:(t.v * 0.35).toFixed(2) + 's' } }));
      if (reached && top) [0,1,2,3,4,5].forEach((n) => {
        const ang = (n/6) * Math.PI * 2 + 0.4;
        layers.push(e('span', { key:'f'+n, style:{ position:'absolute', left:'50%', top:'50%', width:3, height:3,
          marginLeft: (Math.cos(ang)*(r+13)).toFixed(1) + 'px', marginTop: (Math.sin(ang)*(r+13)).toFixed(1) + 'px',
          background:gold, borderRadius:'50%', pointerEvents:'none', opacity:0.55, boxShadow:'0 0 4px ' + gold,
          animation:'eph-filing 3.2s ease-in-out infinite', animationDelay:(n*0.18)+'s' } }));
      });
      layers.push(e('span', { key:'n', style:{ position:'absolute', right:-2, bottom:-1, width:16, height:16, borderRadius:'50%',
        display:'flex', alignItems:'center', justifyContent:'center',
        background: reached ? (top ? ochre : brass) : (dark ? '#0A0C15' : '#E4DAC0'),
        color: reached ? (dark && !top ? '#0A0C15' : '#F6EED6') : idleInk,
        fontFamily:"'Cinzel',serif", fontWeight:600, fontSize:7.5, letterSpacing:'0.04em', lineHeight:1,
        boxShadow:'0 0 0 1px ' + (reached ? brassL : brass), transition:'background 220ms ease, color 220ms ease' } }, this.ephRoman[k]));
      return e('button', { key:t.v, onClick:()=>this.pick(id,t.v), onMouseEnter:()=>this.enter(id,t.v),
        'aria-label':'Cast ' + t.name, style:{ ...this.btnBase(), position:'relative', width:sz, height:sz, borderRadius:'50%',
          transform: picked ? 'translateY(-3px) scale(1.08)' : (reached ? 'translateY(-1px)' : 'none'),
          transition:'transform 180ms cubic-bezier(.2,.8,.3,1.4)' } }, layers);
    });
    const rail = e('span', { key:'rail', 'aria-hidden':true, style:{ position:'absolute', left:14, right:14, top:'50%', height:1.5, marginTop:-1,
      background: a > 0
        ? 'repeating-linear-gradient(90deg,' + gold + ' 0 6px, transparent 6px 12px)'
        : 'repeating-linear-gradient(90deg,' + brass + ' 0 3px, transparent 3px 9px)',
      opacity: a > 0 ? 0.8 : 0.35, backgroundSize:'12px 100%',
      animation: a > 0 ? 'eph-current 1.6s linear infinite' : 'none' } });
    const plate = e('div', { style:{ position:'relative', display:'flex', alignItems:'center', gap:12, padding:'14px 15px',
      background: dark ? 'radial-gradient(130% 170% at 50% -20%, #232841, #0A0C15)' : 'radial-gradient(130% 170% at 50% -20%, #F6EED6, #E4DAC0)',
      border:'1px solid ' + brass, boxShadow:'inset 0 1px 8px rgba(30,34,51,' + (dark ? '0.7' : '0.14') + ')',
      clipPath:'polygon(7px 0, 100% 0, 100% calc(100% - 7px), calc(100% - 7px) 100%, 0 100%, 0 7px)' } }, [rail, ...discs]);
    return this.wrap(id, plate, this.eph, dark
      ? { font:"'Spectral', Georgia, serif", italic:true, size:15, on:'#D9744C', off:'#A2977A', idle:'cast your metal — lead to platinum', tag:'· cast' }
      : { font:"'Spectral', Georgia, serif", italic:true, size:15, on:'#A6432B', off:'#6B5F45', idle:'cast your metal — lead to platinum', tag:'· cast' });
  }
