import re, json, pathlib
M='var(--faction-default-card-muted, #9b9080)'; T='var(--faction-default-card-text, #f0e6d0)'; K='var(--faction-default-on-fill, #14110b)'
S=lambda i:f'var(--faction-default-stop-{i})'
# The mascot: a shy wisp. Its body picks up more of the spectrum as --conf (0 shy … 1 bold) rises.
WISP='M50 104 C 30 104, 18 90, 18 72 C 18 56, 26 46, 32 36 C 34 42, 38 46, 42 46 C 38 32, 42 16, 52 4 C 54 16, 60 24, 66 30 C 68 24, 72 20, 76 18 C 74 30, 82 46, 82 70 C 82 90, 70 104, 50 104 Z'
RAIN=''.join(f'<stop offset="{i/6:.3f}" style="stop-color: color-mix(in srgb, {S(i+1)} calc(10% + var(--conf) * 48%), {T});"/>' for i in range(7))
BLUSH='color-mix(in srgb, var(--faction-coven) 70%, #fff)'
# Under a hat the hair is tucked away: same wisp, round on top. Hats go INSIDE the sway so they ride the head.
BALD='M50 104 C 30 104, 18 90, 18 72 C 18 52, 32 38, 50 38 C 68 38, 82 52, 82 70 C 82 90, 70 104, 50 104 Z'
def body(bald=False, extra='', pre='', mid=''):
    P=BALD if bald else WISP
    return (f'<defs><linearGradient id="mrain" gradientUnits="userSpaceOnUse" x1="18" y1="4" x2="82" y2="104">{RAIN}</linearGradient>'
     f'<radialGradient id="mshade" gradientUnits="userSpaceOnUse" gradientTransform="translate(18 4) scale(64 100)" cx=".42" cy=".62" r=".64"><stop offset="55%" style="stop-color: {T}; stop-opacity: 0;"/><stop offset="100%" style="stop-color: {S(6)}; stop-opacity: .3;"/></radialGradient></defs>'
     f'<g class="msway">{pre}<path d="{P}" fill="url(#mrain)"/><path d="{P}" fill="url(#mshade)" stroke="{K}" stroke-width="2.6" stroke-linejoin="round"/>{mid}'
     f'<ellipse class="blush" cx="27" cy="84" rx="8" ry="4.2" style="fill: {BLUSH};"/><ellipse class="blush" cx="73" cy="84" rx="8" ry="4.2" style="fill: {BLUSH};"/>'
     f'<g class="eyes"><circle cx="38" cy="70" r="10.5" fill="#fff" stroke="{K}" stroke-width="2.2"/><circle cx="62" cy="70" r="10.5" fill="#fff" stroke="{K}" stroke-width="2.2"/>'
     f'<g class="mpup"><circle cx="38" cy="71" r="5" fill="{K}"/><circle cx="62" cy="71" r="5" fill="{K}"/><circle cx="36.4" cy="69.2" r="1.6" fill="#fff"/><circle cx="60.4" cy="69.2" r="1.6" fill="#fff"/></g></g>'
     f'<path class="lids" d="M28.5 70 q9.5 8 19 0 M52.5 70 q9.5 8 19 0" fill="none" stroke="{K}" stroke-width="2.6" stroke-linecap="round"/>'
     f'<path d="M46 88 q4 3.4 8 0" fill="none" stroke="{K}" stroke-width="2" stroke-linecap="round"/><ellipse class="mo" cx="50" cy="89.6" rx="3.6" ry="4.6" fill="{K}"/>{extra}</g>')
BODY=body()
# Each faction's signature accessory, in a 24x20 box that sits on the blob.
ACC={
 'ua': f'<path d="M2 17 C 0 9, 19 5, 23 13 C 22 17.5, 6 18.5, 2 17 Z" fill="var(--faction-ua)" stroke="{K}" stroke-width="1" stroke-linejoin="round"/><path d="M12 8 l.6 -3" stroke="{K}" stroke-width="1.4" stroke-linecap="round"/><path d="M15 16 L22 2" stroke="{T}" stroke-width="1.6" stroke-linecap="round"/><path d="M21.2 3.6 L23.6 -1 L23.8 2.4 Z" fill="var(--faction-coven)" stroke="{K}" stroke-width=".6"/>',
 'coven': f'<path d="M-4 19 h32 l-9 -4 L12 -12 L5 15 Z" fill="var(--faction-coven)" stroke="{K}" stroke-width="1" stroke-linejoin="round"/><path d="M5.4 13.6 h13.2" stroke="{T}" stroke-width="2.4" stroke-dasharray="1.8 1.1"/><circle cx="12" cy="-12" r="2.6" fill="{T}" stroke="{K}" stroke-width=".8"/>',
 'wow': f'<path d="M1 19 V2 l5.5 6 l5.5 -13 l5.5 13 l5.5 -6 v17 Z" fill="var(--faction-ephemerists)" stroke="{K}" stroke-width="1" stroke-linejoin="round"/><circle cx="12" cy="13.5" r="2.6" fill="var(--faction-wow)" stroke="{K}" stroke-width=".6"/><circle cx="12" cy="-5" r="1.5" fill="var(--faction-ephemerists)" stroke="{K}" stroke-width=".6"/>',
 'snide': f'<path d="M6 19 L6.5 8 L9 13 L10.5 1 L13 12 L15.5 4 L16.5 13 L19 9 L18 19 Z" fill="var(--faction-snide)" stroke="{K}" stroke-width="1" stroke-linejoin="round"/>',
 'ephemerists': f'<path d="M-4 17 C 2 12.5, 22 12.5, 28 17 C 22 20.5, 2 20.5, -4 17 Z" fill="var(--faction-ephemerists)" stroke="{K}" stroke-width="1" stroke-linejoin="round"/><path d="M5 15.4 C 3.6 8, 6 2.6, 9.2 2.6 C 11 2.6, 11.4 4.6, 12 4.6 C 12.6 4.6, 13 2.6, 14.8 2.6 C 18 2.6, 20.4 8, 19 15.4 C 15 17, 9 17, 5 15.4 Z" fill="var(--faction-ephemerists)" stroke="{K}" stroke-width="1" stroke-linejoin="round"/><path d="M4.9 12.6 C 9 14.4, 15 14.4, 19.1 12.6" fill="none" stroke="{K}" stroke-width="2.2" opacity=".75"/><path d="M19 12 l4.6 -7 l.6 5.6 Z" fill="{S(1)}" stroke="{K}" stroke-width=".7" stroke-linejoin="round"/>',
 'singularity': f'<path d="M12 19 V6" stroke="{K}" stroke-width="1.4"/><circle cx="12" cy="4.5" r="3" fill="var(--faction-singularity)" stroke="{K}" stroke-width="1"/><path d="M6.5 2 q-2 2.5 0 5 M17.5 2 q2 2.5 0 5" fill="none" stroke="var(--faction-singularity)" stroke-width="1.2" stroke-linecap="round"/>',
 'everymen': f'<path d="M4 17 C 4 7, 20 7, 20 17 Z" fill="{S(3)}" stroke="{K}" stroke-width="1" stroke-linejoin="round"/><path d="M12 7.5 V17 M9 9 v8 M15 9 v8" stroke="{K}" stroke-width=".7" opacity=".5"/><rect x="1" y="16.4" width="22" height="2.6" rx="1.3" fill="{S(3)}" stroke="{K}" stroke-width="1"/>',
}
def acc(v): return ''.join(f'<sc-if value="{{{{{v}.is.{k}}}}}" hint-placeholder-val="{{{{false}}}}"><svg class="fhat" viewBox="0 0 24 20">{a}</svg></sc-if>' for k,a in ACC.items())
# Hats sit on the forehead and are cut to cover both hair tongues.
CROWN=(f'<path d="M21 50 L 23 18 L 36 30 L 50 -6 L 64 30 L 77 18 L 79 50 Z" fill="{S(3)}" stroke="{K}" stroke-width="2" stroke-linejoin="round"/>'
 f'<rect x="21" y="40" width="58" height="10" fill="{S(3)}" stroke="{K}" stroke-width="2"/><circle cx="50" cy="-6" r="3.6" fill="{S(1)}" stroke="{K}" stroke-width="1.2"/><circle cx="50" cy="45" r="3" fill="{S(6)}"/>')
WIZ=(f'<path d="M18 52 L 54 -30 L 82 52 Z" fill="{S(6)}" stroke="{K}" stroke-width="2" stroke-linejoin="round"/><ellipse cx="50" cy="52" rx="38" ry="8" fill="{S(6)}" stroke="{K}" stroke-width="2"/>'
 f'<path d="M54 4 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3 Z" fill="{S(3)}"/>')
SPY=(f'<ellipse cx="50" cy="47" rx="35" ry="7.5" fill="{T}" stroke="{K}" stroke-width="2"/>'
 f'<path d="M73 16 C 92 13, 92 37, 69 35" fill="none" stroke="{K}" stroke-width="8.5" stroke-linecap="round"/><path d="M73 16 C 92 13, 92 37, 69 35" fill="none" stroke="{T}" stroke-width="4.5" stroke-linecap="round"/>'
 f'<path d="M26 8 C 26 34, 36 46, 50 46 C 64 46, 74 34, 74 8 Z" fill="{T}" stroke="{K}" stroke-width="2" stroke-linejoin="round"/><path d="M27.5 21 C 40 27, 60 27, 72.5 21" fill="none" stroke="{S(1)}" stroke-width="3.4"/>'
 f'<ellipse cx="50" cy="8" rx="24" ry="5.5" fill="{S(2)}" stroke="{K}" stroke-width="2"/>'
 f'<path d="M43 -2 q-5 -6 0 -12 q5 -6 0 -12 M57 -4 q5 -6 0 -12" fill="none" stroke="{T}" stroke-width="2.2" stroke-linecap="round" opacity=".6"/>')
HATS=''.join(f'<g class="hatpop" style="display: {{{{hat.{k}}}}};">{v}</g>' for k,v in (('crown',CROWN),('wiz',WIZ),('spy',SPY)))
HATBODY=body(True,HATS)
# Beat 2: the wisp flicks each hat off (--kx/--kr: which way it flies), its hair springs up, and the next hat squashes it flat again.
HAIR='M18 72 C 18 56, 26 46, 32 36 C 34 42, 38 46, 42 46 C 38 32, 42 16, 52 4 C 54 16, 60 24, 66 30 C 68 24, 72 20, 76 18 C 74 30, 82 46, 82 70 Z'
B2BODY=body(True,pre=f'<clipPath id="hclip"><rect x="16.7" y="-60" width="66.6" height="180"/></clipPath><g class="b2hair"><path clip-path="url(#hclip)" d="{HAIR}" fill="url(#mrain)" stroke="{K}" stroke-width="5.2" stroke-linejoin="round"/></g>',
 mid=f'<g class="b2hair"><path d="{HAIR}" fill="url(#mrain)"/><path d="{HAIR}" fill="url(#mshade)"/></g>',
 extra=''.join(f'<g class="acc" style="animation-delay: {i*2}s; --kx: {kx}px; --kr: {kr}deg;">{h}</g>' for i,(h,kx,kr) in enumerate(((CROWN,44,120),(WIZ,-48,-100),(SPY,40,150)))))
QUILL=(f'<svg viewBox="0 0 44 70" width="44" height="70" style="display: block; overflow: visible;">'
 f'<path d="M32 2 C 46 16, 40 40, 19 53 L 13 62 L 10 60 L 15 50 C 8 30, 15 10, 32 2 Z" fill="{T}" stroke="{K}" stroke-width="1.5" stroke-linejoin="round"/>'
 f'<path d="M30 8 L 12 60 M 21 34 l 9 -3 M 18 43 l 8 -3 M 20 38 l -6 -4" fill="none" stroke="{K}" stroke-width="1.2" stroke-linecap="round" opacity=".5"/>'
 f'<path d="M13 62 L 10 60 L 7 68 Z" fill="{S(6)}" stroke="{T}" stroke-width="1" stroke-linejoin="round"/>'
 f'<circle cx="24" cy="19" r="4" fill="{K}"/><circle cx="34" cy="23" r="4" fill="{K}"/><circle class="pup" cx="24" cy="19" r="1.8" fill="{T}"/><circle class="pup" cx="34" cy="23" r="1.8" fill="{T}"/>'
 f'<path class="qlid" d="M19.5 19 a4.5 4.5 0 0 1 9 0 Z M29.5 23 a4.5 4.5 0 0 1 9 0 Z" fill="{T}"/></svg>')

# ───────── generated motion ─────────
# A character moves on three nested elements so a hop is a real arc: x travels evenly, y rises and falls
# like a thrown thing (quadratic ease out / in), and squash-stretch-lean sits on its own clock.
import math
QO='cubic-bezier(.33,.67,.67,1)'; QI='cubic-bezier(.33,0,.67,.33)'
def kf(name,T,keys):
    keys=sorted(keys,key=lambda k:k[0]); out=[]
    for i,k in enumerate(keys):
        if i+1<len(keys) and abs(keys[i+1][0]-k[0])<1e-6: continue
        e=f';animation-timing-function:{k[2]}' if len(k)>2 and k[2] else ''
        out.append(f'{min(100,k[0]/T*100):.2f}%{{{k[1]}{e}}}')
    return f'@keyframes {name}{{{"".join(out)}}}'
class Rig:
    def __init__(s,half): s.X=[];s.Y=[];s.S=[];s.Kf=[];s.half=half;s.rot=0
    def x(s,t,c,e=None): s.X.append((t,f'transform:translateX({c-s.half:.1f}px)',e))
    def y(s,t,y,e=None,rot=None):
        if rot is not None: s.rot=rot
        s.Y.append((t,f'transform:translateY({-y:.1f}px) rotate({s.rot}deg)',e))
    def sq(s,t,sx=1,sy=1,r=0,e=None,z=1): s.S.append((t,f'transform:scale({sx*z:.3f},{sy*z:.3f}) rotate({r}deg)',e))
    def hop(s,t0,t1,a,b,h,crouch=True,settle=True,land=1,z=1):
        ap=max(a[1],b[1])+h; up,dn=ap-a[1],ap-b[1]; tm=t0+(t1-t0)*math.sqrt(up)/(math.sqrt(up)+math.sqrt(dn))
        s.x(t0,a[0],'linear'); s.x(t1,b[0])
        s.y(t0,a[1],QO); s.y(tm,ap,QI); s.y(t1,b[1])
        if crouch: s.sq(t0-.16,z=z,e='ease-out'); s.sq(t0-.03,1.15,.82,z=z,e='ease-in')
        s.sq(t0+.07,.88,1.15,z=z); s.sq(tm,z=z); s.sq(t1-.02,.92,1.1,z=z)
        s.sq(t1+.05,1+.22*land,1-.2*land,z=z)
        if settle: s.sq(t1+.17,.95,1.06,z=z); s.sq(t1+.3,z=z)
    def k(s,t,v,e=None): s.Kf.append((t,f'transform:translateY({-v*100:.1f}%)',e))
    def css(s,n,T,K=1):
        f=lambda L:(lambda M:M+[(T*K,M[-1][1])])([(k[0]*K,)+k[1:] for k in sorted(L,key=lambda k:k[0])])
        return kf(n+'x',T*K,f(s.X))+kf(n+'y',T*K,f(s.Y))+kf(n+'s',T*K,f(s.S))+(kf(n+'h',T*K,f(s.Kf)) if s.Kf else '')

# ── beat 6: every challenge is a card standing in the way. Knock it over and it becomes the ramp to the next ledge. ──
def b6():
    TEMPO=.8                                   # tempo knob: 1 = as written below, smaller = snappier
    LED=[(0,78,24,16),(104,172,52,13),(188,254,86,18),(262,306,128,14)]   # x0, x1, top, thickness
    CARD=[(56,24,104,52,1,'M10 5 C 7 3, 4 3, 2 4 V16 C 4 15, 7 15, 10 17 C 13 15, 16 15, 18 16 V4 C 16 3, 13 3, 10 5 Z M10 5 V17'),(148,52,188,86,6,'M3 7 h14 v9 h-14 Z M7 7 l1.5 -2.5 h3 l1.5 2.5 M7.5 11.5 a2.5 2.5 0 1 0 5 0 a2.5 2.5 0 1 0 -5 0'),(230,86,262,128,7,'M10 18 V12 M10 2 C 5 2, 3 6, 5 8 C 2 10, 4 14, 10 13 C 16 14, 18 10, 15 8 C 17 6, 15 2, 10 2 Z')]
    R=[((c[0]+c[2])/2,(c[1]+c[3])/2) for c in CARD]
    r=Rig(14); r.x(0,28); r.y(0,24); r.sq(0)
    def bump(t,c0,hit,y,rec,big=False,flop=False):
        a=.42 if big else .24
        r.x(t-a,c0,'ease-out'); r.x(t-.09,c0-(9 if big else 3),QI); r.x(t,hit,QO); r.x(t+.24,rec)
        r.sq(t-a,e='ease-out'); r.sq(t-.09,1.2 if big else 1.12,.76 if big else .86,-14 if big else -8); r.sq(t,.8,1.14,8); r.sq(t+.1,1.05,.96,-6)
        r.y(t,y,QO); r.y(t+.11,y+(12 if flop else 5),QI); r.y(t+.24,y)
        if flop: r.sq(t+.3,1.34,.64)
        else: r.sq(t+.26,1.1,.9); r.sq(t+.4)
    # 1 · the book: one nudge and over it goes
    bump(.9,28,42,24,26); top=[.9]; wob=[99]
    r.hop(1.6,1.9,(26,24),R[0],14,settle=False); r.hop(1.97,2.3,R[0],(122,52),14,crouch=False)
    # 2 · the photo: wobbles, shrugs it off. Think. Try again, harder.
    bump(2.95,122,134,52,120); wob.append(2.95)
    r.sq(3.5,1,1,-7); r.sq(3.66,1,1,6); r.sq(3.8)
    bump(4.3,120,134,52,121,big=True); top.append(4.3)
    r.hop(4.95,5.25,(121,52),R[1],14,settle=False); r.hop(5.32,5.65,R[1],(206,86),14,crouch=False)
    # 3 · the tree: it barely notices, and the wisp ends up flat on its back. A long look. A real run-up.
    bump(6.25,206,216,86,200,flop=True); wob.append(6.25)
    r.sq(6.95,1.34,.64,e='ease-in-out'); r.sq(7.12,.9,1.14); r.sq(7.26)
    r.sq(7.4,e='ease-out'); r.sq(7.62,1.2,.76,-12)
    for i in range(5): r.sq(7.68+i*.06,1.2,.76,-9 if i%2 else -15)
    r.x(7.4,200,'ease-out'); r.x(7.62,197); r.x(7.98,197,QI); r.x(8.14,218,QO); r.x(8.44,206)
    r.y(7.98,86,QO); r.y(8.1,102,'linear'); r.y(8.14,100,QI); r.y(8.4,86)
    r.sq(7.98,1.2,.76,-12,QI); r.sq(8.07,.84,1.18,14); r.sq(8.14,.78,1.16,16); r.sq(8.28,1,1,-8); r.sq(8.45,1.2,.8); r.sq(8.6,.96,1.05); r.sq(8.7)
    top.append(8.14)
    r.hop(8.95,9.25,(206,86),R[2],14,settle=False); r.hop(9.32,9.68,R[2],(280,128),16,crouch=False,land=1.5)
    r.hop(10.2,10.75,(280,128),(280,128),30)   # made it: one big happy jump
    # the next challenge is already watching: the dragon looks over the top of the card. A gulp. Then chest out.
    DR=11.0
    r.hop(DR+.62,DR+.98,(280,128),(280,128),26,land=1.5,settle=False)
    r.sq(DR+1.12,1.32,.54)
    for i in range(9): r.sq(DR+1.18+i*.075,1.32,.54,5 if i%2 else -5)
    r.sq(DR+1.9,1.3,.56,e='ease-in-out'); r.sq(DR+2.3,1.04,.9,e='ease-in-out'); r.sq(DR+2.7,1.04,.9,e='ease-out')
    r.sq(DR+2.95,1.16,1.2); r.sq(DR+3.5,1.13,1.17,e='ease-in-out'); r.sq(DR+3.8)
    END=9.68; T=15.2
    css=r.css('b6',T,TEMPO)
    css+=kf('b6brave',T*TEMPO,[(0,'--conf:.3')]+[x for i,t in enumerate(top) for x in ((t*TEMPO,f'--conf:{(.3,.5,.72)[i]}','ease-out'),(t*TEMPO+.4,f'--conf:{(.5,.72,.88)[i]}'))]+[(END*TEMPO,'--conf:.88','ease-out'),(END*TEMPO+.5,'--conf:1'),(T*TEMPO,'--conf:1')])
    css+=kf('b6look',T*TEMPO,[(0,'translate:0 0'),((DR+.45)*TEMPO,'translate:0 0'),((DR+.58)*TEMPO,'translate:2px -4.5px'),(T*TEMPO,'translate:2px -4.5px')])
    O1,O0='opacity:1','opacity:0'; tk=lambda L:[(t*TEMPO,)+tuple(r_) for t,*r_ in L]
    css+=kf('b6eyes',T*TEMPO,tk([(0,'scale:1;'+O1),(DR+.5,'scale:1;'+O1),(DR+.6,'scale:1.45;'+O1),(DR+1.0,'scale:1.45;'+O1),(DR+1.1,'scale:1 .3;'+O0),(DR+2.2,'scale:1 .3;'+O0),(DR+2.32,'scale:1.2;'+O1),(DR+2.9,'scale:1.2;'+O1),(DR+3.1,'scale:1;'+O1),(T,'scale:1;'+O1)]))
    css+=kf('b6lids',T*TEMPO,tk([(0,O0),(DR+1.04,O0),(DR+1.1,O1),(DR+2.2,O1),(DR+2.3,O0),(T,O0)]))
    Z='opacity:0;transform:scale(0)'
    css+=kf('b6bang',T*TEMPO,tk([(0,Z),(DR+.5,Z),(DR+.6,'opacity:1;transform:scale(1.6) rotate(-10deg)'),(DR+.74,'opacity:1;transform:none'),(DR+1.0,'opacity:1;transform:none'),(DR+1.12,'opacity:0;transform:translateY(-8px)'),(T,'opacity:0;transform:none')]))
    css+=f'.b6x,.b6y,.b6s,.b6s .mpup{{animation-duration:{T*TEMPO:.2f}s}}.b6s .eyes{{animation:blink2 9.7s infinite,b6eyes {T*TEMPO:.2f}s linear both}}.b6s .lids{{animation:b6lids {T*TEMPO:.2f}s linear both}}.b6bang{{animation:b6bang {T*TEMPO:.2f}s linear both}}'
    html=''.join(f'<span class="ldg" style="left: {a}px; width: {b-a}px; bottom: {t-h}px; height: {h}px;"></span>' for a,b,t,h in LED)
    for i,(px,py,qx,qy,hue,icon) in enumerate(CARD):
        L=math.hypot(qx-px,qy-py); th=math.degrees(math.atan2(qx-px,qy-py))
        html+=(f'<span class="crd" style="left: {px}px; bottom: {py}px; height: {L:.1f}px; --c: {S(hue)}; --th: {th:.1f}deg; --w: {(0,15,6)[i]}deg; --tw: {wob[i]*TEMPO:.2f}s; --tt: {top[i]*TEMPO:.2f}s;">'
               f'<svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true"><path d="{icon}" fill="none" stroke="{K}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>')
    html+=(f'<span class="boing" style="position: absolute; left: 298px; bottom: 127px; transform-origin: 0 100%; animation-delay: {END*TEMPO+.1:.2f}s;"><svg viewBox="0 0 22 30" width="22" height="30" aria-hidden="true" style="display: block; overflow: visible;">'
           f'<path d="M3 30 V2" stroke="{K}" stroke-width="2.2" stroke-linecap="round"/><path class="flut" d="M3 3 h15 l-4 5 l4 5 h-15 Z" fill="{S(1)}" stroke="{K}" stroke-width="1.4" stroke-linejoin="round"/></svg></span>')
    html+=f'<span class="b6x"><span class="b6y"><span class="b6s">{pawn(28)}</span><i class="b6bang">!</i></span></span>'
    return css,html,END*TEMPO,DR*TEMPO

# ── beat 1: a phone. The wisp is inside, bored; it knocks on the glass, the glass cracks, then it takes a run-up and comes through. ──
def b1():
    T=8; K1,K2,NT,SH=1.8,2.6,3.0,4.7; D=SH-3.8; I=(220,188); X0,Y0,X1,Y1=29,23,411,227
    A=[10,44,78,104,131,158,186,222,262,300,338]; F=[.5,.38,.56,.42,.6,.4,.52,.62,.7,.66,.58]; n=len(A)
    def hit(a):
        dx,dy=math.cos(math.radians(a)),-math.sin(math.radians(a))
        t=min((X1-I[0])/dx if dx>1e-9 else 9e9,(X0-I[0])/dx if dx<-1e-9 else 9e9,(Y1-I[1])/dy if dy>1e-9 else 9e9,(Y0-I[1])/dy if dy<-1e-9 else 9e9)
        return (I[0]+dx*t,I[1]+dy*t)
    H=[hit(a) for a in A]; M=[(I[0]+(h[0]-I[0])*f,I[1]+(h[1]-I[1])*f) for h,f in zip(H,F)]
    CO=[(X1,Y0),(X0,Y0),(X0,Y1),(X1,Y1)]; ang=lambda p:math.degrees(math.atan2(-(p[1]-I[1]),p[0]-I[0]))%360
    polys=[]
    for i in range(n):
        j=(i+1)%n; span=(A[j]-A[i])%360
        cs=sorted((c for c in CO if 0<(ang(c)-A[i])%360<span),key=lambda c:(ang(c)-A[i])%360)
        N=lambda m,k:(I[0]+(m[0]-I[0])*(.42+.1*((k*5)%3)/2),I[1]+(m[1]-I[1])*(.42+.1*((k*5)%3)/2))
        polys+=[[I,N(M[i],i),N(M[j],j)],[N(M[i],i),M[i],M[j],N(M[j],j)],[M[i],H[i]]+cs+[H[j],M[j]]]
    P=lambda p:f'{p[0]:.1f} {p[1]:.1f}'
    def jag(a,b,k):
        mx,my=(a[0]+b[0])/2,(a[1]+b[1])/2; d=math.hypot(b[0]-a[0],b[1]-a[1]) or 1; o=((k*37)%9-4)*min(1,d/40)
        return f'M{P(a)} L{mx-(b[1]-a[1])/d*o:.1f} {my+(b[0]-a[0])/d*o:.1f} L{P(b)}'
    svg=''.join(f'<path class="ck ck1" pathLength="1" d="{jag(I,M[i],i)}" style="animation-delay: {K1+(i%3)*.03:.2f}s, {SH}s;"/>' for i in range(n))
    svg+=''.join(f'<path class="ck ck2" pathLength="1" d="{jag(M[i],H[i],i+3)}" style="animation-delay: {K2+(i%4)*.025:.3f}s, {SH}s;"/><path class="ck ck2" pathLength="1" d="{jag(M[i],M[(i+1)%n],i+5)}" style="animation-delay: {K2+.05+(i%3)*.03:.2f}s, {SH}s;"/>' for i in range(n))
    for i,pg in enumerate(polys):
        cx=sum(p[0] for p in pg)/len(pg); cy=sum(p[1] for p in pg)/len(pg); vx,vy=cx-I[0],cy-I[1]
        svg+=f'<polygon class="shard" points="{" ".join(P(p).replace(" ",",") for p in pg)}" style="--dx: {vx*.75+((i*29)%21-10):.0f}px; --dy: {vy*.75-30:.0f}px; --dr: {((i*73)%170-85)}deg; animation-delay: {SH+math.hypot(vx,vy)/1400:.2f}s;"/>'
    # the wisp: half its 44px width; in the phone it stands on the bottom edge of the screen (y=8), outside on the meadow (y=0)
    r=Rig(22); r.x(0,220); r.y(0,8); r.sq(0,z=.8)
    r.hop(.95,1.2,(220,8),(220,8),9,z=.8,settle=False)                  # notices the glass
    r.sq(1.28,z=.8,e='ease-out'); r.sq(1.6,z=1.25,e='ease-in-out')      # comes right up to it
    for k,(t,back,hard) in enumerate(((K1,1.12,1.4),(K2,1.02,1.5))):   # knock … knock
        r.sq(t-.26,z=1.25,e='ease-out'); r.sq(t-.08,1.04,.96,z=back,e=QI); r.sq(t,1.08,.9,z=hard,e=QO); r.sq(t+.16,.97,1.04,z=1.2); r.sq(t+.34,z=1.25)
    # a notification drops in and buzzes for attention. A look up at it. … Nope.
    r.sq(NT+.55,z=1.25); r.sq(NT+.63,1,1,-8,z=1.25); r.sq(NT+.72,1,1,7,z=1.25); r.sq(NT+.81,1,1,-5,z=1.25)
    r.sq(3.0+D,z=1.25,e='ease-in-out'); r.sq(3.36+D,1.1,.84,-6,z=.62)   # backs right off, digs in
    for i in range(5): r.sq(3.42+D+i*.05,1.14,.8,-3 if i%2 else -9,z=.62)
    r.sq(3.66+D,1.14,.8,-8,z=.62,e='cubic-bezier(.6,0,.9,.4)'); r.sq(SH,.9,1.16,z=1.7,e='ease-out'); r.sq(4.02+D,z=1)
    r.x(SH,220,'linear'); r.x(4.38+D,152)                               # … and comes through, head over heels
    r.y(SH,8,QO); r.y(4.03+D,92,QI,rot=-150); r.y(4.38+D,0,rot=-360)
    r.sq(4.36+D,.92,1.1); r.sq(4.43+D,1.36,.66); r.sq(4.58+D,.93,1.09); r.sq(4.72+D,1.03,.98); r.sq(4.84+D)
    r.hop(5.2+D,5.6+D,(152,0),(232,0),32); r.hop(5.92+D,6.32+D,(232,0),(330,0),38)
    css=r.css('b1',T)
    pc=lambda t:f'{t/T*100:.2f}%'
    N='transform:none'
    css+=kf('b1eyes',T,[(0,N),(K1-.01,N),(K1+.08,'transform:scale(1.28)'),(K1+.4,N),(K2-.01,N),(K2+.08,'transform:scale(1.36)'),(K2+.4,N),(NT+.84,N),(NT+.98,'transform:scaleY(.62)'),(SH-.03,'transform:scaleY(.62)'),(SH+.06,'transform:scale(1.3)'),
        (4.38+D,N+';opacity:1'),(4.44+D,'transform:scaleY(.4);opacity:0'),(4.96+D,'transform:scaleY(.4);opacity:0'),(5.06+D,N+';opacity:1'),(T,N)])
    css+=kf('b1lids',T,[(0,'opacity:0'),(4.4+D,'opacity:0'),(4.45+D,'opacity:1'),(4.96+D,'opacity:1'),(5.03+D,'opacity:0'),(T,'opacity:0')])
    css+=kf('b1look',T,[(0,'translate:0 0'),(NT+.12,'translate:0 0'),(NT+.26,'translate:.8px -4.2px'),(NT+.5,'translate:.8px -4.2px'),(NT+.62,'translate:0 0'),(T,'translate:0 0')])
    css+=kf('b1dim',T,[(0,'filter:brightness(.6) saturate(.35)'),(SH-.02,'filter:brightness(.6) saturate(.35)'),(SH+.12,'filter:brightness(1.35)'),(4.5+D,'filter:none'),(T,'filter:none')])
    css+=kf('b1blush',T,[(0,'opacity:.25'),(4.45+D,'opacity:.25'),(4.8+D,'opacity:.95'),(T,'opacity:.95')])
    css+=kf('b1jolt',T,[(0,'translate:0 0')]+[(NT+.06+i*.05,f'translate:{1.6 if i%2 else -1.6}px 0') for i in range(7)]+[(NT+.42,'translate:0 0')]+[x for t,d in ((K1,2),(K2,4)) for x in ((t-.01,'translate:0 0'),(t+.03,f'translate:{-d}px {d}px'),(t+.07,f'translate:{d}px {-d*.6:.1f}px'),(t+.12,f'translate:{-d*.4:.1f}px 0'),(t+.2,'translate:0 0'))]+[(T,'translate:0 0')])
    css+=f'.b1{{--sh:{SH}s;--nt:{NT}s;--t:{T}s}}'
    flowers=[(144,5.22+D,1),(224,5.94+D,6),(392,6.36+D,7)]   # one where it took off each time, one shaken up by the last landing
    return css,svg,flowers

# ── beat 4: the three ways to prove it land on the card, and the wisp tries each one: a pose for the camera (the flash goes off in its face),
#    a song into the microphone, then a jump onto the clapperboard, which snaps shut under it. One loop; everything is on the same clock. ──
def b4():
    L=8.2; D0=3.9; FL=.97; S0,S1=2.6,4.2; CL=5.95
    def rig(n,A,B,C,TOP,t1,ret=(7.22,7.65)):
        r=Rig(15); r.x(0,A[0]); r.y(0,A[1]); r.sq(0)
        def hp(t0,t1,a,b,h,**kw):
            r.hop(t0,t1,a,b,h,**kw)
            if len(a)>2: r.k(t0,a[2],'cubic-bezier(.2,.7,.3,1)' if b[2]>a[2] else 'cubic-bezier(.6,0,.9,.4)' if b[2]<a[2] else None); r.k(t1,b[2])
        if len(A)>2: r.k(0,A[2])
        r.sq(.35,e='ease-out'); r.sq(.55,.9,1.16,-8); r.sq(.93,.9,1.16,-8); r.sq(1.0,1.16,.84,6); r.sq(1.12,.96,1.05,3); r.sq(1.5,1,1,3,e='ease-in-out'); r.sq(1.7)
        hp(1.95,t1,A,B,10)
        for i in range(6): r.sq(S0+i*.28,1.07 if i%2 else .95,.93 if i%2 else 1.09,9)
        r.sq(S1,1,1,9); r.sq(S1+.12)
        hp(4.6,5.1,B,C,64)                    # clean over the microphone
        hp(5.6,CL,C,TOP,22,land=1.4)
        hp(6.45,6.75,TOP,C,10)
        hp(ret[0],ret[1],C,A,60); r.sq(8.05)
        return r.css(n,L)
    css=rig('b4',(104,0),(127,0),(228,0),(294,37),2.25)+rig('b4w',(-24,-100,1),(366,-300,1),(-26,54,0),(-84,91,0),2.5,(7.1,7.7)); N='transform:none'
    alt=lambda a,z,step,f:[(a+k*step,f(k)) for k in range(int((z-a)/step)+1)]
    css+=kf('b4flash',L,[(0,'opacity:0;transform:scale(.3)'),(FL-.02,'opacity:0;transform:scale(.3)'),(FL+.04,'opacity:.95;transform:scale(1.7)'),(FL+.32,'opacity:0;transform:scale(.3)'),(L,'opacity:0;transform:scale(.3)')])
    css+=kf('b4cam',L,[(0,N),(FL-.02,N),(FL+.05,'transform:translateY(-6px) rotate(-7deg)'),(FL+.16,'transform:scale(1.1,.9)'),(FL+.3,N),(L,N)])
    css+=kf('b4eyes',L,[(0,'opacity:1'),(FL+.03,'opacity:1'),(FL+.06,'opacity:0'),(FL+.5,'opacity:0'),(FL+.56,'opacity:1'),(L,'opacity:1')])
    css+=kf('b4lids',L,[(0,'opacity:0'),(FL+.03,'opacity:0'),(FL+.06,'opacity:1'),(FL+.5,'opacity:1'),(FL+.56,'opacity:0'),(L,'opacity:0')])
    css+=kf('b4wv',L,[(0,'opacity:.12'),(S0-.05,'opacity:.12')]+alt(S0,S1,.14,lambda k:f'opacity:{1 if k%2==0 else .25}')+[(S1+.2,'opacity:.12'),(L,'opacity:.12')])
    css+=kf('b4mic',L,[(0,N),(S0-.1,N)]+alt(S0,S1,.28,lambda k:f'transform:rotate({-6 if k%2==0 else -2}deg)')+[(S1+.2,N),(L,N)])
    css+=kf('b4mo',L,[(0,'opacity:0'),(S0-.06,'opacity:0')]+alt(S0,S1,.14,lambda k:f'opacity:1;transform:scale(1,{1.15 if k%2==0 else .5})')+[(S1+.06,'opacity:0'),(L,'opacity:0')])
    for n,(t,dx) in enumerate(((S0+.2,16),(S0+.85,-18))):
        css+=kf(f'b4n{n}',L,[(0,'opacity:0;transform:none'),(t,'opacity:0;transform:none'),(t+.15,'opacity:1;transform:translateY(-6px) scale(1.2)'),(t+1.1,f'opacity:0;transform:translate({dx}px,-40px) rotate({dx}deg)'),(L,'opacity:0;transform:none')])
    O='transform:rotate(-30deg)'
    css+=kf('b4arm',L,[(0,O),(CL-.08,O),(CL,N),(CL+.07,'transform:rotate(-8deg)'),(CL+.14,N),(6.55,N),(7.05,O),(L,O)])
    css+=kf('b4clap',L,[(0,N),(CL-.01,N),(CL+.05,'transform:scale(1.1,.86)'),(CL+.2,N),(L,N)])
    css+=kf('b4look',L,[(0,'translate:-2.6px 0'),(1.5,'translate:-2.6px 0'),(1.8,'translate:2.4px -.5px'),(S1,'translate:2.4px -.5px'),(4.5,'translate:2.2px -3px'),(5.2,'translate:2.4px -2px'),(CL,'translate:0 2.6px'),(6.4,'translate:-2.4px 1px'),(7.0,'translate:-2.4px -3px'),(7.7,'translate:-2.6px 0'),(L,'translate:-2.6px 0')])
    css+=f'.b4h,.b4x,.b4y,.b4s,.b4a,.b4s .lids,.b4s .mpup,.b4s .mo{{animation-duration:{L}s;animation-timing-function:linear;animation-delay:{D0}s;animation-iteration-count:infinite;animation-fill-mode:both}}'
    css+=f'.b4s .eyes{{animation:b4eyes {L}s linear {D0}s infinite both,blink2 9.7s {D0}s infinite}}'
    return css
DRAGON=r'''<g class="lunge"><path d="M102 110 C 106 82, 100 56, 84 42 L 62 50 C 70 66, 72 88, 70 110 Z" fill="var(--faction-default-stop-4)" stroke="var(--faction-default-on-fill, #14110b)" stroke-width="2" stroke-linejoin="round"/><path d="M71 100 q7 -3 12 1 M71 88 q7 -3 12 1 M69 76 q7 -3 12 1 M66 64 q7 -3 11 2" fill="none" stroke="var(--faction-default-on-fill, #14110b)" stroke-width="1.5" stroke-linecap="round" opacity=".5"/><path d="M103 98 l10 -5 l-9 -7 Z M102 80 l10 -7 l-10 -5 Z M97 62 l10 -9 l-11 -3 Z" fill="var(--faction-default-stop-3)" stroke="var(--faction-default-on-fill, #14110b)" stroke-width="1.5" stroke-linejoin="round"/><path d="M76 18 C 80 6, 90 2, 98 4 C 92 9, 89 15, 88 24 Z M64 15 C 63 6, 68 1, 75 0 C 72 6, 72 11, 73 16 Z" fill="var(--faction-default-card-text, #f0e6d0)" stroke="var(--faction-default-on-fill, #14110b)" stroke-width="1.5" stroke-linejoin="round"/><g class="jaw"><path d="M66 44 L 18 46 C 11 47, 11 54, 19 55 L 48 57 C 58 57, 64 53, 68 48 Z" fill="var(--faction-default-stop-4)" stroke="var(--faction-default-on-fill, #14110b)" stroke-width="2" stroke-linejoin="round"/></g><g class="fire"><path d="M16 50 C 2 38, -22 40, -42 50 C -26 53, -8 63, 16 52 Z" fill="var(--faction-default-stop-1)"/><path d="M14 50 C 4 44, -10 45, -24 50 C -12 52, -2 57, 14 52 Z" fill="var(--faction-default-stop-3)"/></g><path d="M20 43 l3 6 l3 -6 Z M31 44 l3 6 l3 -6 Z" fill="var(--faction-default-card-text, #f0e6d0)" stroke="var(--faction-default-on-fill, #14110b)" stroke-width="1"/><path d="M88 44 C 94 30, 84 14, 66 15 C 54 16, 46 23, 36 25 L 17 27 C 8 28, 6 40, 14 43 L 42 46 C 54 54, 74 56, 88 44 Z" fill="var(--faction-default-stop-4)" stroke="var(--faction-default-on-fill, #14110b)" stroke-width="2" stroke-linejoin="round"/><path d="M86 30 l14 -3 l-8 9 l10 3 l-14 5 Z" fill="var(--faction-default-stop-4)" stroke="var(--faction-default-on-fill, #14110b)" stroke-width="1.5" stroke-linejoin="round"/><ellipse cx="16" cy="33" rx="1.6" ry="2.4" fill="var(--faction-default-on-fill, #14110b)"/><circle cx="46" cy="40" r="4" fill="var(--faction-default-stop-1)" opacity=".45"/><g class="deye"><circle cx="60" cy="29" r="9" fill="var(--faction-default-card-text, #f0e6d0)" stroke="var(--faction-default-on-fill, #14110b)" stroke-width="1.5"/><circle class="dpup" cx="60" cy="29" r="4" fill="var(--faction-default-on-fill, #14110b)"/></g><path class="dbrow" d="M50 18 q9 -5 19 0" fill="none" stroke="var(--faction-default-on-fill, #14110b)" stroke-width="2" stroke-linecap="round"/><circle class="smoke" cx="12" cy="28" r="4" fill="var(--faction-default-card-muted, #9b9080)" style="--sx: -12px;"/><circle class="smoke" cx="12" cy="28" r="3" fill="var(--faction-default-card-muted, #9b9080)" style="--sx: -22px; animation-delay: .7s;"/></g>'''
TAIL=(f'<path d="M82 0 C 84 34, 64 62, 36 60 C 18 59, 5 48, 3 30 C 12 42, 24 44, 33 39 C 45 33, 50 20, 50 0 Z" fill="{S(4)}" stroke="{K}" stroke-width="2" stroke-linejoin="round"/>'
 f'<path d="M52 10 q7 -3 12 1 M50 22 q7 -3 12 2 M44 33 q7 -1 10 5 M34 41 q5 1 6 8" fill="none" stroke="{K}" stroke-width="1.5" stroke-linecap="round" opacity=".5"/>'
 f'<path d="M82 8 l11 4 l-9 7 Z M79 28 l11 7 l-11 4 Z M68 46 l8 10 l-12 -1 Z M50 57 l2 11 l-10 -6 Z" fill="{S(3)}" stroke="{K}" stroke-width="1.5" stroke-linejoin="round"/>')
# ── beat 1, wide screens only: the world outside is busy. Other players are out there already. ──
def b1wide():
    ST=f'stroke="{K}" stroke-linejoin="round" stroke-linecap="round"'
    GR=f'style="fill: color-mix(in srgb, {S(4)} 76%, {K});"'
    fb=lambda k,s,i:(f'<span class="fb" style="--s: {s}px; --c: var(--faction-{k}); --bk: {3.7+i*.6:.1f}s; --bd: -{i*1.3:.1f}s;"><span class="bud" style="animation: none;"><i class="e l"></i><i class="e r"></i><i class="mth"></i></span><svg class="fhat" viewBox="0 0 24 20">{ACC[k]}</svg></span>')
    def put(x,y,d,inner,z=''): return f'<span class="wd" style="left: {x}%; bottom: calc(var(--ob) + {y}px);{z}"><span class="wpop" style="--d: {d}s;">{inner}</span></span>'
    rb=''.join(f'<path pathLength="1" d="M{250-r} 250 A {r} {r} 0 0 1 {250+r} 250" fill="none" stroke="{S(i+1)}" stroke-width="8.4" style="animation-delay: calc(var(--sh) + {1.1+i*.09:.2f}s);"/>' for i,r in enumerate(range(240,184,-8)))
    RBW=f'<svg class="rbw wd" viewBox="0 0 500 250" width="500" height="250">{rb}</svg>'; o=''
    BIRD=f'<svg viewBox="0 0 34 10" width="34" height="10" style="display: block; overflow: visible;"><path class="flap" d="M0 6 q4 -6 8 0 q4 -6 8 0 M18 9 q3 -5 6 0 q3 -5 6 0" fill="none" stroke="{K}" stroke-width="1.6" stroke-linecap="round"/></svg>'
    for top,dur,dl in ((66,19,1.6),(92,23,6.5),(40,27,11)): o+=f'<span class="wbird wd" style="top: {top}px; animation-duration: {dur}s; animation-delay: calc(var(--sh) + {dl}s);">{BIRD}</span>'
    for x,top,w,dur in ((9,104,72,19),(24,48,50,14),(79,62,78,22),(91,124,52,17)): o+=f'<span class="cloud wd" style="left: {x}%; top: {top}px; width: {w}px; animation-duration: {dur}s;"></span>'
    # a tree with a swing, and somebody on it
    o+=put(11,22,.7,f'<svg viewBox="0 0 110 130" width="110" height="130" style="display: block; overflow: visible;"><path d="M48 130 C 50 100, 50 80, 46 58 L 60 58 C 58 84, 60 104, 64 130 Z" fill="{S(2)}" {ST} stroke-width="2"/><path d="M56 78 C 70 72, 84 72, 99 76" fill="none" stroke="{K}" stroke-width="7" stroke-linecap="round"/><path d="M56 78 C 70 72, 84 72, 99 76" fill="none" stroke="{S(2)}" stroke-width="3.4" stroke-linecap="round"/>'
      f'<g class="wsway"><g {GR} {ST} stroke-width="4"><circle cx="32" cy="44" r="24"/><circle cx="68" cy="38" r="27"/><circle cx="50" cy="22" r="22"/></g><g {GR}><circle cx="32" cy="44" r="24"/><circle cx="68" cy="38" r="27"/><circle cx="50" cy="22" r="22"/></g><path d="M26 40 q5 -6 11 -2 M58 26 q6 -5 12 0 M62 48 q5 -4 10 0" fill="none" stroke="{K}" stroke-width="1.5" stroke-linecap="round" opacity=".35"/></g>'
      f'<g class="wswing"><path d="M82 76 V113 M94 76 V113" stroke="{K}" stroke-width="1.4"/><rect x="78" y="112" width="20" height="3.4" rx="1.5" fill="{S(2)}" {ST} stroke-width="1.2"/><circle cx="88" cy="102" r="9.5" fill="var(--faction-coven)" {ST} stroke-width="1.6"/><path d="M79 96 h18 l-5 -2.4 L88 82 L85 93.6 Z" fill="var(--faction-coven)" {ST} stroke-width="1.2"/><circle cx="84.6" cy="102" r="2.9" fill="#fff" stroke="{K}" stroke-width=".9"/><circle cx="91.4" cy="102" r="2.9" fill="#fff" stroke="{K}" stroke-width=".9"/><circle cx="85" cy="102.4" r="1.3" fill="{K}"/><circle cx="91.8" cy="102.4" r="1.3" fill="{K}"/><path d="M86 107 q2 1.8 4 0" fill="none" stroke="{K}" stroke-width="1"/></g></svg>')
    # a hot-air balloon comes up from behind the hills
    o+=f'<span class="wd" style="left: 25%; bottom: calc(var(--ob) + 150px);"><span class="wrise"><svg class="wbob" viewBox="0 0 60 90" width="60" height="90" style="display: block; overflow: visible;"><path d="M25 64 l1.4 11 M35 64 l-1.4 11" stroke="{K}" stroke-width="1.2"/><path d="M30 2 C 8 2, 0 22, 4 36 C 8 50, 20 58, 24 64 h12 C 40 58, 52 50, 56 36 C 60 22, 52 2, 30 2 Z" fill="{S(1)}" {ST} stroke-width="2"/><path d="M30 2 C 19 14, 17 44, 26 64 h8 C 43 44, 41 14, 30 2 Z" fill="{S(3)}" {ST} stroke-width="1.4"/><path d="M5 30 q25 9 50 0" fill="none" stroke="{K}" stroke-width="1.2" opacity=".4"/><circle cx="30" cy="72" r="5" fill="{T}" {ST} stroke-width="1.2"/><circle cx="28.2" cy="71.4" r="1.1" fill="{K}"/><circle cx="31.8" cy="71.4" r="1.1" fill="{K}"/><rect x="23" y="75" width="14" height="10" rx="2.5" fill="{S(2)}" {ST} stroke-width="1.6"/><path d="M23 79 h14" stroke="{K}" stroke-width="1" opacity=".5"/></svg></span></span>'
    # somebody flying a kite
    o+=put(76,26,1.1,f'<span style="position: relative; display: block; width: 130px; height: 210px;"><svg viewBox="0 0 130 210" width="130" height="210" style="display: block; overflow: visible;"><g class="wkite"><path d="M16 186 C 40 150, 70 110, 98 62" fill="none" stroke="{T}" stroke-width="1.3" opacity=".75"/><g class="wkwob"><path d="M98 68 q-9 9 0 18 q9 9 0 18 q-9 9 0 18" fill="none" stroke="{K}" stroke-width="1.6" stroke-linecap="round"/><circle cx="98" cy="86" r="3.4" fill="{S(3)}" stroke="{K}" stroke-width=".9"/><circle cx="98" cy="104" r="3.4" fill="{S(6)}" stroke="{K}" stroke-width=".9"/><path d="M98 8 L119 36 L98 68 L77 36 Z" fill="{S(7)}" {ST} stroke-width="2"/><path d="M98 8 L77 36 L98 36 Z" fill="{S(3)}" {ST} stroke-width="1.2"/><path d="M98 8 V68 M77 36 H119" stroke="{K}" stroke-width="1.2" opacity=".55"/></g></g></svg><span style="position: absolute; left: 4px; bottom: 0;">{fb("singularity",22,1)}</span></span>')
    # a windmill, some pines
    o+=put(90,34,1.5,f'<svg viewBox="0 0 64 100" width="64" height="100" style="display: block; overflow: visible;"><path d="M22 100 L27 40 h10 L42 100 Z" fill="{T}" {ST} stroke-width="2"/><path d="M29 100 v-14 a3 3 0 0 1 6 0 v14 M28.6 58 h6.8" fill="none" stroke="{K}" stroke-width="1.4" opacity=".6"/><g class="wspin">'+''.join(f'<path d="M32 42 L27 6 h10 Z" fill="{S(c)}" {ST} stroke-width="1.6" transform="rotate({a} 32 42)"/>' for a,c in ((0,1),(90,3),(180,6),(270,4)))+f'</g><circle cx="32" cy="42" r="4.4" fill="{K}"/></svg>')
    PINE=f'<svg viewBox="0 0 30 52" width="30" height="52" style="display: block; overflow: visible;"><rect x="12.5" y="38" width="5" height="14" fill="{S(2)}" {ST} stroke-width="1.4"/><path d="M15 2 L26 20 h-5 L28 38 H2 L9 20 H4 Z" {GR} {ST} stroke-width="1.8"/></svg>'
    for x,y,d,sc in ((30,44,.9,1),(33.5,40,1.05,.74),(70,46,1.2,.9),(4,30,1.7,1.15),(97,30,1.9,1)): o+=put(x,y,d,PINE,f' scale: {sc}; transform-origin: 50% 100%;')
    # more players, out and about
    o+=put(25,-16,1.9,f'<span class="jump" style="animation-delay: -.8s;">{fb("wow",22,2)}</span>')
    o+=put(84,-4,2.2,f'<span class="jump" style="animation-delay: -1.9s;">{fb("everymen",22,3)}</span>')
    # Unaffiliated Artists paints the view; Snide can't stand still; Ephemerists is on the hill with a spyglass, looking for what's next
    o+=put(37,-14,2.0,f'<span style="display: flex; align-items: flex-end; gap: 2px;">{fb("ua",22,4)}<svg viewBox="0 0 30 40" width="30" height="40" style="display: block; overflow: visible;"><path d="M6 40 L13 12 M24 40 L17 12 M15 14 V38" stroke="{K}" stroke-width="2" stroke-linecap="round"/><rect x="2" y="3" width="26" height="21" rx="2" fill="{T}" {ST} stroke-width="1.8" transform="rotate(-4 15 14)"/><path d="M6 19 q4 -9 9 -4 t9 -5" fill="none" stroke="{S(1)}" stroke-width="2.2" stroke-linecap="round"/><path d="M7 21 q5 -6 9 -2 t7 -3" fill="none" stroke="{S(6)}" stroke-width="2" stroke-linecap="round"/><circle cx="22" cy="9" r="2.4" fill="{S(3)}"/></svg></span>')
    o+=put(63,-24,2.5,f'<span class="jump" style="animation-duration: 1.25s; animation-delay: -.4s;">{fb("snide",22,5)}</span>')
    o+=put(64,33,2.9,f'<span style="display: flex; align-items: center; gap: 0;">{fb("ephemerists",22,6)}<svg class="wscan" viewBox="0 0 24 12" width="24" height="12" style="display: block; overflow: visible; margin-left: -3px;"><path d="M0 3.6 h9 v4.8 h-9 Z" fill="{S(3)}" {ST} stroke-width="1.3"/><path d="M9 2.4 h8 v7.2 h-8 Z" fill="{T}" {ST} stroke-width="1.3"/><path d="M17 1 h4 v10 h-4 Z" fill="{S(3)}" {ST} stroke-width="1.3"/></svg></span>')
    # the meadow blooms outwards from where the wisp came through
    FL=lambda c:(f'<svg viewBox="0 0 16 28" width="16" height="28" style="display: block; overflow: visible;"><path d="M8 28 V12 M8 20 q-5 -1 -6 -5 M8 22 q5 -1 6 -4" fill="none" stroke="color-mix(in srgb, {S(4)} 70%, {K})" stroke-width="1.8" stroke-linecap="round"/>'
      +''.join(f'<circle cx="{cx}" cy="{cy}" r="3.6" fill="{c}"/>' for cx,cy in ((8,4),(3.5,8),(12.5,8),(5,13),(11,13)))+f'<circle cx="8" cy="9" r="3" fill="{S(3)}" stroke="{K}" stroke-width="1"/></svg>')
    for i,(x,y) in enumerate(((6,-24),(10,6),(16,-14),(22,10),(27,-20),(31,2),(69,4),(73,-18),(79,8),(86,-22),(91,2),(95,-12))):
        o+=put(x,y,round(.5+abs(x-50)/50*1.6,2),FL(S((1,6,7,2,5,3)[i%6])))
    BF=lambda c:(f'<svg viewBox="0 0 24 18" width="20" height="15" style="display: block; overflow: visible;"><g class="wing"><path d="M12 9 C 6 0, 0 2, 2 8 C 0 14, 6 16, 12 9 Z M12 9 C 18 0, 24 2, 22 8 C 24 14, 18 16, 12 9 Z" fill="{c}" {ST} stroke-width="1.2"/></g><path d="M12 4 V14" stroke="{K}" stroke-width="1.8" stroke-linecap="round"/></svg>')
    o+=put(17,34,2.4,f'<span class="wflit">{BF(S(6))}</span>')+put(71,28,2.8,f'<span class="wflit" style="animation-duration: 6.7s; animation-direction: reverse;">{BF(S(3))}</span>')
    # a rabbit crosses the foreground
    o+=(f'<span class="wbun wd"><svg class="wbhop" viewBox="0 0 32 28" width="32" height="28" style="display: block; overflow: visible;"><circle cx="4" cy="17" r="3.4" fill="{T}" {ST} stroke-width="1.5"/><ellipse cx="14" cy="18" rx="10.5" ry="8" fill="{T}" {ST} stroke-width="1.7"/><path d="M22 9 C 19 1, 21 -6, 24 -2 C 26 2, 25 6, 25 9 Z M26 9 C 26 2, 30 -4, 31 1 C 32 5, 30 8, 29 10 Z" fill="{T}" {ST} stroke-width="1.5"/><circle cx="25" cy="13" r="6.4" fill="{T}" {ST} stroke-width="1.7"/><circle cx="27.4" cy="12" r="1.3" fill="{K}"/><path d="M7 26 h6 M17 26 h6" stroke="{K}" stroke-width="1.7" stroke-linecap="round"/></svg></span>')
    return o,RBW
def hand(c): return (f'<g fill="{c}"><rect x="4" y="6" width="6" height="24" rx="3"/><rect x="11" y="1" width="6" height="28" rx="3"/><rect x="18" y="2" width="6" height="27" rx="3"/><rect x="25" y="7" width="6" height="22" rx="3"/>'
 f'<rect x="4" y="20" width="27" height="24" rx="8"/><rect x="-3" y="22" width="6" height="17" rx="3" transform="rotate(-28 2 37)"/></g>')
def pawn(n): n=int(n); return f'<svg class="pw msc" viewBox="14 0 72 106" width="{n}" height="{round(n*106/72)}" style="display: block; overflow: visible;">{BODY}</svg>'
src=pathlib.Path('src.html').read_text()
B6CSS,B6HTML,B6END,B6DR=b6(); B1CSS,B1GLASS,B1FLW=b1(); B4CSS=b4(); B1WIDE,B1RBW=b1wide()
src=src.replace('@@B6T4@@',f'{B6DR:.2f}').replace('@@B6T@@',f'{B6END:.2f}').replace('@@B6T2@@',f'{B6END+.35:.2f}').replace('@@B6T3@@',f'{B6END+.9:.2f}')
for k,v in (('B1WIDE',B1WIDE),('B1RBW',B1RBW),('TAIL',TAIL),('B4CSS',B4CSS),('DRAGON',DRAGON),('B6CSS',B6CSS),('B6HTML',B6HTML),('B1CSS',B1CSS),('B1GLASS',B1GLASS),('B1FLW',repr([list(f) for f in B1FLW])),('HATBODY',HATBODY),('B2BODY',B2BODY),('BODY',BODY),('CROWN',CROWN),('WIZ',WIZ),('SPY',SPY),('HATS',HATS),('QUILL',QUILL)): src=src.replace(f'@@{k}@@',v)
src=re.sub(r'@@P:(\d+)@@',lambda m:pawn(m.group(1)),src)
src=re.sub(r'@@ACC:(\w)@@',lambda m:acc(m.group(1)),src)
src=re.sub(r'@@HAND:(.*?)@@',lambda m:hand(m.group(1)),src)
assert '@@' not in src
ST="this.state = { step: 0, reveal: 0, name: '' };"; PV='"$preview":{"width":1440,"height":900}'
assert src.count(ST)==1 and src.count(PV)==1
out=pathlib.Path('root/project'); out.mkdir(parents=True,exist_ok=True)
def emit(name,step,phone):
    s=src
    if step is not None:
        rev=999 if 1<=step<=7 else 0; vt=', vt: 999' if step==5 else ''; nm='King Biscuit' if step in (11,12) else ''
        s=s.replace(ST,f"this.state = {{ step: {step}, reveal: {rev}, name: '{nm}'{vt} }};")
    if phone: s=s.replace(PV,'"$preview":{"width":390,"height":844}')
    (out/name).write_text(s)
emit('NA.dc.html',None,False); emit('NAPhone.dc.html',None,True)
for i in range(14): emit(f'NA-{i:02d}.dc.html',i,False); emit(f'NA-{i:02d}-phone.dc.html',i,True)
files={f'project/{p.name}':f'project/{p.name}' for p in sorted(out.iterdir()) if p.name.startswith('NA') and p.name!='NA.dc.html'}
pathlib.Path('files.json').write_text(json.dumps(files))
print(len(list(out.iterdir())), len(src))
