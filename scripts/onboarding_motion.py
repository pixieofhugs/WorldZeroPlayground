#!/usr/bin/env python3
"""Writes frontend/src/pages/onboarding/motion/generated.css: the keyframes the
onboarding beats play, computed from the Rig below.

Edit this file and rerun `python3 scripts/onboarding_motion.py`; never edit
generated.css by hand. `--check` exits 1 if the checked-in file is stale.

Ported from .design-sync/onboarding-arc/build.py, CSS only: b1()'s glass and
flowers are returned, b6()'s ledge/card HTML is left for the beat issues.
"""
import json
import math
import pathlib
import sys

OUT = pathlib.Path(__file__).resolve().parent.parent / 'frontend/src/pages/onboarding/motion/generated.css'

# A character moves on three nested elements so a hop is a real arc: x travels evenly, y rises and falls
# like a thrown thing (quadratic ease out / in), and squash-stretch-lean sits on its own clock.
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
    return css,END*TEMPO,DR*TEMPO

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
    D2=lambda t:f'{t:.2f}s, {SH}s'
    cracks=[{'k':1,'d':jag(I,M[i],i),'delay':D2(K1+(i%3)*.03)} for i in range(n)]
    for i in range(n):
        cracks+=[{'k':2,'d':jag(M[i],H[i],i+3),'delay':D2(K2+(i%4)*.025)},{'k':2,'d':jag(M[i],M[(i+1)%n],i+5),'delay':D2(K2+.05+(i%3)*.03)}]
    shards=[]
    for i,pg in enumerate(polys):
        cx=sum(p[0] for p in pg)/len(pg); cy=sum(p[1] for p in pg)/len(pg); vx,vy=cx-I[0],cy-I[1]
        shards.append({'points':' '.join(P(p).replace(' ',',') for p in pg),'dx':round(vx*.75+((i*29)%21-10)),'dy':round(vy*.75-30),'dr':(i*73)%170-85,'delay':round(SH+math.hypot(vx,vy)/1400,2)})
    svg={'cracks':cracks,'shards':shards}
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
    flowers=[{'x':x,'d':round(d,2),'c':c} for x,d,c in ((144,5.22+D,1),(224,5.94+D,6),(392,6.36+D,7))]   # one where it took off each time, one shaken up by the last landing
    svg['flowers']=flowers
    return css,svg

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

# ── beat 1, 900px and wider: the world outside is bigger. Placement and clocks only; Beat1Wide.tsx draws the pieces. ──
def b1wide():
    pl=lambda x,y,d:{'x':x,'y':y,'d':d}
    buddy=lambda i:{'period':round(3.7+i*.6,1),'offset':-round(i*1.3,1)}   # each buddy blinks on its own clock
    return {
        'rainbow':[{'d':f'M{250-r} 250 A {r} {r} 0 0 1 {250+r} 250','stop':i+1,'delay':round(1.1+i*.09,2)} for i,r in enumerate(range(240,184,-8))],
        'birds':[{'top':t,'dur':d,'delay':dl} for t,d,dl in ((66,19,1.6),(92,23,6.5),(40,27,11))],
        'clouds':[{'x':x,'top':t,'w':w,'dur':d} for x,t,w,d in ((9,104,72,19),(24,48,50,14),(79,62,78,22),(91,124,52,17))],
        'tree':pl(11,22,.7), 'kite':pl(76,26,1.1), 'windmill':pl(90,34,1.5),
        'wow':pl(25,-16,1.9), 'everymen':pl(84,-4,2.2), 'ua':pl(37,-14,2.0), 'snide':pl(63,-24,2.5), 'ephemerists':pl(64,33,2.9),
        'pines':[{**pl(x,y,d),'scale':sc} for x,y,d,sc in ((30,44,.9,1),(33.5,40,1.05,.74),(70,46,1.2,.9),(4,30,1.7,1.15),(97,30,1.9,1))],
        'buddies':{'coven':buddy(0),'singularity':buddy(1),'wow':buddy(2),'everymen':buddy(3),'ua':buddy(4),'snide':buddy(5),'ephemerists':buddy(6)},
        # the meadow blooms outwards from where the wisp came through: the further out, the later
        'flowers':[{**pl(x,y,round(.5+abs(x-50)/50*1.6,2)),'stop':(1,6,7,2,5,3)[i%6]} for i,(x,y) in enumerate(((6,-24),(10,6),(16,-14),(22,10),(27,-20),(31,2),(69,4),(73,-18),(79,8),(86,-22),(91,2),(95,-12)))],
        'butterflies':[{**pl(17,34,2.4),'stop':6,'dur':5.3,'reverse':False},{**pl(71,28,2.8),'stop':3,'dur':6.7,'reverse':True}],
    }

def render():
    return '/* GENERATED by scripts/onboarding_motion.py. Do not edit. */\n' + ''.join(
        f'\n/* {name} */\n{css}\n' for name, css in (('beat 1', b1()[0]), ('beat 4', b4()), ('beat 6', b6()[0])))

def ts(name, data):
    return f'/* GENERATED by scripts/onboarding_motion.py. Do not edit. */\nexport const {name} = {json.dumps(data, indent=1)} as const\n'

def outputs():
    return {OUT: render(),
            OUT.with_name('b1art.generated.ts'): ts('B1_ART', b1()[1]),
            OUT.with_name('b1wide.generated.ts'): ts('B1_WIDE', b1wide())}

if __name__ == '__main__':
    stale = []
    for path, text in outputs().items():
        if '--check' not in sys.argv:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(text)
        elif not path.exists() or path.read_text() != text:
            stale.append(str(path.relative_to(OUT.parents[5])))
    if stale:
        sys.exit(f'{", ".join(stale)} stale. Fix: python3 scripts/onboarding_motion.py')
