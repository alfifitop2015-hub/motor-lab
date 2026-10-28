/* © 2026 م. جابر الفيفي (Jaber Alfaifi). جميع الحقوق محفوظة.
   Realistic wiring (trial, trainer only): touching a terminal opens a small work bench where the wire is taken from a coil,
   cut and stripped with one tool held in a hand (cutter low in the jaws, stripper notches above), pressing and holding to
   squeeze; the stripped wire is then fastened on that terminal and carried in the hand to the second one. The wire becomes an
   ordinary simulator wire, so routing in the trunking, exercises and grading are unchanged. Switched on from the ⋮ menu. */
(()=>{
'use strict';
const A=()=>window.__wr;
const $=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg';
const lsG=k=>{try{return localStorage.getItem(k);}catch(_){return null;}},lsS=(k,v)=>{try{v==null?localStorage.removeItem(k):localStorage.setItem(k,v);}catch(_){}};
const COILS=[['#7a4a22','بني'],['#1b1b1b','أسود'],['#8e949a','رمادي'],['#4aa3df','أزرق'],['#e0342f','أحمر'],['#ff8a1f','برتقالي'],['#9acd32','أصفر/أخضر'],['#f3f3ef','أبيض']];
const CM=.08; /* board units → cm (the panel is about 80 cm wide) */
const R={on:lsG('wsReal')==='1',ph:null,a:null,col:null,len:0,ends:[0,0],end:0,tx:0,ty:0,sq:false,pull:0,hand:false,hp:null};
const active=()=>R.on&&document.body.classList.contains('trainer');
/* ---------- styles and the window ---------- */
const css=`.wrwin{position:fixed;z-index:58;left:50%;transform:translateX(-50%);bottom:calc(var(--dockh,90px) + 8px);width:min(640px,calc(100vw - 12px));background:#16202b;color:#fff;border:1px solid #3b5068;border-radius:14px;box-shadow:0 14px 40px rgba(0,0,0,.5);padding:8px 10px 10px;direction:rtl;font-family:inherit;zoom:var(--ui,1)}
.wrwin[hidden]{display:none}.wrh{display:flex;align-items:center;gap:8px;font-weight:700}.wrh span{flex:1}.wrx{background:#2a3a4c;border:1px solid #4d6580;color:#fff;border-radius:8px;width:32px;height:32px;cursor:pointer;font-size:16px}
.wrm{font-size:.9rem;margin:4px 0 6px;min-height:1.4em;text-align:center}.wrm b{color:#ffd24a}.wrn{font-size:.82rem;text-align:center;min-height:1.2em}.wrn.ok{color:#6fe39a}.wrn.bad{color:#ff8a80}.wrn.warn{color:#ffd24a}
.wrc{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin:4px 0}.wrc button{width:52px;height:52px;border-radius:50%;border:3px solid #2a3a4c;cursor:pointer;position:relative;box-shadow:inset 0 0 0 6px rgba(0,0,0,.25),inset 0 0 0 16px rgba(255,255,255,.12)}
.wrc button::after{content:'';position:absolute;inset:18px;border-radius:50%;background:#2d3238;box-shadow:inset 0 0 0 4px #555}
.wrc button:hover{border-color:#ffd24a}.wrsv{width:100%;display:block;touch-action:none;user-select:none;-webkit-user-select:none;background:#a87a45;border-radius:10px}
.wrb{display:flex;gap:6px;justify-content:center;margin-top:6px}.wrb button{background:#223142;border:1px solid #3b5068;color:#fff;border-radius:9px;padding:6px 12px;cursor:pointer;font:inherit;font-size:.88rem}
.wrhand{position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:44;pointer-events:none;overflow:visible}.wrdrop{position:fixed;z-index:46;left:50%;transform:translateX(-50%);top:calc(var(--toph,60px) + 8px);background:#16202b;color:#fff;border:1px solid #3b5068;border-radius:999px;padding:6px 8px 6px 14px;display:flex;gap:10px;align-items:center;font-size:.88rem;box-shadow:0 8px 24px rgba(0,0,0,.4);zoom:var(--ui,1)}
.wrdrop[hidden]{display:none}.wrdrop button{background:#c62828;border:0;color:#fff;border-radius:999px;padding:4px 12px;cursor:pointer;font:inherit}
@keyframes wrfall{to{transform:translateY(160px) rotate(60deg);opacity:0}}.wrfall{animation:wrfall .8s ease-in forwards;transform-box:fill-box;transform-origin:center}`;
const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
const win=document.createElement('div');win.className='wrwin';win.hidden=true;win.setAttribute('role','dialog');win.setAttribute('aria-label','تحضير السلك');
win.innerHTML=`<div class="wrh"><span id="wrT">🧪 تحضير السلك</span><button class="wrx" id="wrX" aria-label="إلغاء السلك">✕</button></div><div class="wrm" id="wrM"></div><div class="wrc" id="wrC"></div>
<svg class="wrsv" id="wrS" viewBox="0 0 600 430" xmlns="${NS}"></svg><div class="wrn" id="wrN"></div><div class="wrb" id="wrB"></div>`;
document.body.appendChild(win);
const ov=document.createElementNS(NS,'svg');ov.setAttribute('class','wrhand');document.body.appendChild(ov);
const drop=document.createElement('div');drop.className='wrdrop';drop.hidden=true;drop.innerHTML='<span id="wrDT"></span><button id="wrDX">إسقاط السلك ✕</button>';document.body.appendChild(drop);
const bs=$('wrS');
/* ---------- sound and feel ---------- */
let AC=null;const ac=()=>{try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();}catch(_){}return AC;};
function snd(kind){const a=ac();if(!a)return;const n=Math.floor(a.sampleRate*(kind==='cut'?.07:.035)),b=a.createBuffer(1,n,a.sampleRate),d=b.getChannelData(0);
  for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,kind==='cut'?3:6);const s=a.createBufferSource(),g=a.createGain(),f=a.createBiquadFilter();
  f.type=kind==='cut'?'highpass':'bandpass';f.frequency.value=kind==='cut'?2600:800;g.gain.value=.4;s.buffer=b;s.connect(f);f.connect(g);g.connect(a.destination);s.start();}
const buzz=ms=>{try{navigator.vibrate&&navigator.vibrate(ms);}catch(_){}};
/* ---------- drawing ---------- */
const defs=`<defs>
<linearGradient id="wrWood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c99c63"/><stop offset="1" stop-color="#a5773f"/></linearGradient>
<linearGradient id="wrCu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe0b8"/><stop offset=".4" stop-color="#e0904a"/><stop offset="1" stop-color="#8a4618"/></linearGradient>
<linearGradient id="wrIns" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".3" stop-color="#fff" stop-opacity=".08"/><stop offset=".75" stop-color="#000" stop-opacity=".08"/><stop offset="1" stop-color="#000" stop-opacity=".4"/></linearGradient>
<linearGradient id="wrSteel" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4d555c"/><stop offset=".45" stop-color="#e3e7ea"/><stop offset=".6" stop-color="#b9c0c6"/><stop offset="1" stop-color="#5a6269"/></linearGradient>
<linearGradient id="wrGrip" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7d1010"/><stop offset=".45" stop-color="#ef4a3f"/><stop offset="1" stop-color="#7d1010"/></linearGradient>
<linearGradient id="wrGrip2" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9c6b00"/><stop offset=".45" stop-color="#ffcf3a"/><stop offset="1" stop-color="#9c6b00"/></linearGradient>
<radialGradient id="wrSkin" cx=".4" cy=".35" r=".85"><stop offset="0" stop-color="#f0bf97"/><stop offset=".6" stop-color="#d9976c"/><stop offset="1" stop-color="#ad6c45"/></radialGradient>
<linearGradient id="wrSkinF" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f2c4a0"/><stop offset=".55" stop-color="#d8956a"/><stop offset="1" stop-color="#a86640"/></linearGradient>
<linearGradient id="wrSleeve" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#173659"/><stop offset=".5" stop-color="#2f5d92"/><stop offset="1" stop-color="#173659"/></linearGradient>
<pattern id="wrYe" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="16" height="16" fill="#2e9e3f"/><rect width="8" height="16" fill="#f2d33a"/></pattern>
<filter id="wrSh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="3" dy="6" stdDeviation="5" flood-opacity=".4"/></filter></defs>`;
const fillOf=c=>c==='#9acd32'?'url(#wrYe)':c;
const T=(x,y,t,s,c,w,a)=>`<text x="${x}" y="${y}" text-anchor="${a||'middle'}" style="font:${w||700} ${s}px 'IBM Plex Sans Arabic',sans-serif;fill:${c||'#222'}">${t}</text>`;
/* the tool: two halves on one pivot; the stripper notches are high in the jaws, the cutting edges below them, near the pivot */
const ZS=[-150,-82],ZC=[-72,-14];
function tool(k,closed){const a=closed?1.2:12;
  const jaw=m=>{let p=`<path d="M0 -4 L${m*26} -16 L${m*21} -148 Q${m*13} -170 0 -162 Z" fill="url(#wrSteel)" stroke="#2f363c" stroke-width="1.6"/>`;
    [[-136,3.2,'1.5'],[-114,4,'2.5'],[-93,4.8,'4']].forEach(([y,r,l])=>{p+=`<path d="M0 ${y-r} A${r} ${r} 0 0 ${m>0?1:0} 0 ${y+r}" fill="#1d2125" stroke="#000" stroke-width=".8"/>`;
      if(m>0)p+=`<text x="${m*13}" y="${y+3.5}" text-anchor="middle" style="font:700 8px sans-serif;fill:#2b3238">${l}</text>`;});
    p+=`<path d="M${m*.8} -72 L${m*9} -66 L${m*9} -20 L${m*.8} -14" fill="#f4f7f9" stroke="#59626a" stroke-width="1"/><path d="M${m*9} -66 L${m*20} -62 L${m*20} -24 L${m*9} -20" fill="#9aa3aa" opacity=".7"/>`;
    return p;},
    handle=(m,g)=>`<path d="M${-m*12} 8 L${m*30} 252 Q${m*38} 276 ${m*56} 264 L${m*24} 6 Z" fill="url(#${g})" stroke="#4a0a0a" stroke-width="1.6"/><path d="M${-m*12} 8 L${m*14} 92" stroke="#3e464d" stroke-width="12" stroke-linecap="round"/>`
      +[120,150,180,210,240].map(y=>`<path d="M${m*(8+y*.1)} ${y} l${m*14} 0" stroke="rgba(0,0,0,.25)" stroke-width="2"/>`).join('');
  let s=`<g transform="scale(${k})"><rect x="-80" y="-180" width="165" height="600" fill="transparent"/>`;
  s+=`<g transform="rotate(${-a})">${jaw(-1)}${handle(1,'wrGrip')}</g><g transform="rotate(${a})">${jaw(1)}${handle(-1,'wrGrip2')}</g>`;
  s+=`<circle r="12" fill="url(#wrSteel)" stroke="#222" stroke-width="2"/><circle r="4.5" fill="#444"/>`;
  /* the hand: palm and four fingers wrapped round the handles, the thumb on the near side */
  s+=`<path d="M-62 312 Q-76 222 -48 160 Q-18 122 28 132 Q74 150 80 222 Q84 296 62 336 L-54 346 Z" fill="url(#wrSkin)" stroke="#8a5233" stroke-width="2"/>`;
  [146,180,214,248].forEach((y,i)=>{const w=84-i*7;s+=`<rect x="${-4+i*2}" y="${y}" width="${w}" height="32" rx="16" fill="url(#wrSkinF)" stroke="#8a5233" stroke-width="2"/>
    <path d="M${w-14+i*2} ${y+7} q7 9 0 18" stroke="#9a5f3c" stroke-width="2" fill="none"/><path d="M${18+i*2} ${y+5} q-4 11 0 22" stroke="rgba(120,70,40,.35)" stroke-width="2" fill="none"/>`;});
  s+=`<path d="M-50 236 Q-80 172 -44 118 Q-30 100 -16 114 Q-30 160 -14 220 Z" fill="url(#wrSkinF)" stroke="#8a5233" stroke-width="2"/><path d="M-36 120 q9 -7 16 0" stroke="#f7dcc8" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  s+=`<path d="M-64 336 L70 328 L78 420 L-70 424 Z" fill="url(#wrSleeve)" stroke="#0f2238" stroke-width="2"/><path d="M-64 344 L72 336" stroke="#f2b632" stroke-width="6"/>`;
  return s+'</g>';}
/* a wire seen from the side: insulation with a sheen, copper strands where it is bare */
function strands(x1,x2,y,h){let s=`<rect x="${x1}" y="${y-h/2}" width="${x2-x1}" height="${h}" fill="url(#wrCu)"/>`;
  for(let i=1;i<6;i++){const yy=y-h/2+i*h/6;s+=`<path d="M${x1} ${yy}L${x2} ${yy+(i%2?1:-1)}" stroke="${i%2?'#ffcf9c':'#9c5420'}" stroke-width="1" opacity=".8"/>`;}
  return s;}
const CUT={y:118,x0:560,ppc:5,k:.5},STR={y:118,ex:470,ppm:10,k:.62};
const zone=()=>{const v=R.ph==='cut'?CUT:STR,d=v.y-R.ty,k=v.k;if(d>=ZS[0]*k&&d<=ZS[1]*k)return 'S';if(d>=ZC[0]*k&&d<=ZC[1]*k)return 'C';return null;};
function bench(){let s=defs+`<rect width="600" height="430" fill="url(#wrWood)"/>`;for(let y=14;y<430;y+=26)s+=`<path d="M0 ${y} Q150 ${y+5} 300 ${y} T600 ${y}" stroke="rgba(80,45,10,.16)" stroke-width="2" fill="none"/>`;
  const f=fillOf(R.col);
  if(R.ph==='cut'){const {y,x0,ppc}=CUT;
    s+=`<rect x="${x0-100*ppc-8}" y="${y+28}" width="${100*ppc+16}" height="34" rx="3" fill="#f2e6a0" stroke="#8a7a32"/>`;
    for(let i=0;i<=100;i++){const x=x0-i*ppc,h=i%10===0?16:i%5===0?11:6;s+=`<line x1="${x}" y1="${y+28}" x2="${x}" y2="${y+28+h}" stroke="#3a3200" stroke-width="1"/>`;if(i%10===0)s+=T(x,y+58,String(i),11,'#3a3200');}
    s+=T(x0-100*ppc-22,y+50,'سم',11,'#3a3200');
    s+=`<path d="M-10 ${y}H${x0}" stroke="rgba(0,0,0,.45)" stroke-width="13" stroke-linecap="round"/><path d="M-10 ${y}H${x0}" stroke="${f}" stroke-width="10"/><path d="M-10 ${y}H${x0}" stroke="url(#wrIns)" stroke-width="10"/>${strands(x0,x0+3,y,6)}`;
    const L=Math.max(0,(x0-R.tx)/ppc),z=zone();
    s+=`<line x1="${R.tx}" y1="${y-26}" x2="${R.tx}" y2="${y+26}" stroke="${z==='C'?'#ff3b30':'rgba(0,0,0,.35)'}" stroke-width="2" stroke-dasharray="5 4"/>`+T(R.tx,y-34,L.toFixed(0)+' سم',16,'#fff',800);
    s+=`<g data-tool="1" transform="translate(${R.tx} ${R.ty})" filter="url(#wrSh)">${tool(CUT.k,R.sq)}</g>`;}
  if(R.ph==='strip'){const {y,ex,ppm}=STR,bare=R.ends[R.end],cuX=ex-bare*ppm;
    s+=T(300,22,'الطرف '+(R.end?'الثاني':'الأول')+' مكبّرًا — التعرية المناسبة 8 إلى 10 مم',14,'#3a2306',800);
    s+=`<rect x="${ex-40*ppm-8}" y="${y+26}" width="${40*ppm+16}" height="34" rx="3" fill="#f2e6a0" stroke="#8a7a32"/><rect x="${ex-10*ppm}" y="${y+26}" width="${2*ppm}" height="34" fill="rgba(46,204,113,.5)"/>`;
    for(let i=0;i<=40;i++){const x=ex-i*ppm,h=i%10===0?16:i%5===0?11:6;s+=`<line x1="${x}" y1="${y+26}" x2="${x}" y2="${y+26+h}" stroke="#3a3200" stroke-width="1"/>`;if(i%10===0)s+=T(x,y+56,String(i),11,'#3a3200');}
    s+=T(ex-40*ppm-22,y+48,'مم',11,'#3a3200');
    const insE=R.sq&&R.pullOn?R.slugA:cuX;
    s+=strands(insE-2,ex+(R.pullOn?0:0),y,13)+`<path d="M${ex} ${y-6.5} l4 -2 M${ex} ${y} l5 0 M${ex} ${y+6.5} l4 2" stroke="#c9763a" stroke-width="1.4"/>`;
    s+=`<rect x="-10" y="${y-13}" width="${insE+10}" height="26" rx="3" fill="${f}"/><rect x="-10" y="${y-13}" width="${insE+10}" height="26" rx="3" fill="url(#wrIns)"/>`;
    if(R.sq&&R.pullOn){const p=R.pull,w=(R.slugB-R.slugA)*(1+Math.min(.06,p/600));s+=`<rect x="${R.slugA+p}" y="${y-13}" width="${w}" height="26" rx="4" fill="${f}" stroke="rgba(0,0,0,.25)"/><rect x="${R.slugA+p}" y="${y-13}" width="${w}" height="26" rx="4" fill="url(#wrIns)"/>`;}
    const z=zone(),d=(ex-R.tx)/ppm;
    s+=`<line x1="${R.tx}" y1="${y-30}" x2="${R.tx}" y2="${y+24}" stroke="${z==='S'?'#ffd24a':z==='C'?'#ff3b30':'rgba(0,0,0,.35)'}" stroke-width="2" stroke-dasharray="5 4"/>`;
    if(d>0)s+=T(R.tx,y-36,d.toFixed(1)+' مم',15,'#fff',800);
    s+=`<g data-tool="1" transform="translate(${R.tx} ${R.ty})" filter="url(#wrSh)">${tool(STR.k,R.sq)}</g>`;}
  bs.innerHTML=s;}
/* ---------- the window's text and buttons ---------- */
const note=(t,c)=>{const n=$('wrN');n.textContent=t||'';n.className='wrn '+(c||'');};
const goodEnd=()=>{const m=R.ends[R.end];return m>=7&&m<=12;};
function ui(){const m=$('wrM'),c=$('wrC');let t='';
  c.innerHTML=R.ph==='coil'?COILS.map(([col,n])=>`<button data-c="${col}" title="${n}" aria-label="${n}" style="background:${col==='#9acd32'?'repeating-linear-gradient(45deg,#2e9e3f 0 6px,#f2d33a 6px 12px)':col}"></button>`).join(''):'';
  bs.style.display=R.ph==='coil'?'none':'block';
  if(R.ph==='coil')t='اختر <b>لفّة السلك</b>: يبدأ السلك من '+esc(A().termDesc(R.a));
  else if(R.ph==='cut')t='اسحب العدة حتى تكون <b>القطّاعة</b> (أسفل الفك) عند الطول الذي تقدّره، ثم <b>اضغط عليها مطوّلًا</b> لتقطع.';
  else if(R.ph==='strip')t=R.sq&&R.pullOn?'وأنت ضاغط: اسحب <b>نحو طرف السلك</b> لينزلق العازل.':'ضع <b>العرّاية</b> (أعلى الفك) على 8 إلى 10 مم من الطرف، <b>اضغط مطوّلًا</b> ثم اسحب نحو الطرف.';
  m.innerHTML=t;
  $('wrB').innerHTML=R.ph==='strip'&&R.ends[R.end]>0&&!goodEnd()?'<button data-b="next">متابعة رغم ذلك ←</button>':'';}
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
function draw(){bench();ui();}
/* ---------- the steps ---------- */
function open(k){R.a=k;R.ph='coil';R.col=null;R.ends=[0,0];R.end=0;R.sq=false;R.pullOn=false;win.hidden=false;note('');draw();}
function close(){win.hidden=true;R.ph=null;}
function reset(){close();R.hand=false;R.hp=null;ov.innerHTML='';drop.hidden=true;R.a=null;}
function toStrip(e){R.ph='strip';R.end=e;R.tx=STR.ex-180;R.ty=STR.y-((ZS[0]+ZS[1])/2)*STR.k;R.sq=false;R.pullOn=false;draw();}
function nextEnd(){if(R.end===0){note('الطرف الثاني: عرِّه بالطريقة نفسها.','');return toStrip(1);}
  close();R.hand=true;const api=A();api.scrAdd(R.a,0,1);snd('clk');
  const t=api.T()[R.a],p=boardToScreen(t.x,t.y);R.hp={x:p.x+40,y:p.y+60};drawHand();drop.hidden=false;
  $('wrDT').textContent='السلك في يدك: حرّكه إلى الترمينال الثاني واضغطه.';api.say('🔧 ثُبّت الطرف الأول في '+api.termDesc(R.a)+'. خذ السلك إلى الترمينال الثاني.');}
function autoNext(){if(!goodEnd())return;const e=R.end;setTimeout(()=>{if(R.ph==='strip'&&R.end===e&&goodEnd()&&!R.sq)nextEnd();},1200);}
/* cutting happens as soon as the cutter is squeezed on the wire */
function squeezeCut(){const z=zone();if(z!=='C'){note(z==='S'?'هذه العرّاية: حرّك العدة قليلًا لأعلى لتكون القطّاعة على السلك.':'اجعل السلك بين فكّي العدة.','warn');return;}
  const L=(CUT.x0-R.tx)/CUT.ppc;if(L<8){note('القطعة قصيرة جدًا: اقطع أطول.','bad');return;}
  snd('cut');buzz(25);R.len=L;note('✂ قطعت '+L.toFixed(0)+' سم.','ok');setTimeout(()=>toStrip(0),450);}
function gripStrip(){const z=zone(),d=(STR.ex-R.tx)/STR.ppm;
  if(z==='C'){if(d<=.3){note('ضع القطّاعة على السلك لقص الزائد.','warn');return false;}const cu=R.ends[R.end];R.ends[R.end]=Math.max(0,cu-d);R.len-=d/10;snd('cut');buzz(20);
    note('✂ قصصت '+d.toFixed(1)+' مم من الطرف'+(cu?' (النحاس الظاهر الآن '+R.ends[R.end].toFixed(1)+' مم)':'')+'.','ok');autoNext();return false;}
  if(z!=='S'){note('ضع السلك في فتحة العرّاية (أعلى الفك).','warn');return false;}
  if(d<1.5){note('العرّاية قريبة جدًا من الطرف: ابتعد إلى 8 إلى 10 مم.','warn');return false;}
  if(d<=R.ends[R.end]+.3){note('هذا الجزء معرّى: ضع العرّاية على العازل.','warn');return false;}
  R.pullOn=true;R.pull=0;R.slugA=R.tx;R.slugB=STR.ex-R.ends[R.end]*STR.ppm;R.stripD=d;snd('clk');buzz(15);return true;}
function stripDone(){const d=R.stripD;R.ends[R.end]=d;R.pullOn=false;R.pull=0;snd('cut');
  note(d<7?'عرّيت '+d.toFixed(1)+' مم: قصير، لن يمسكه الترمينال جيدًا. عرِّ أكثر.':d>12?'عرّيت '+d.toFixed(1)+' مم: طويل، سيظهر النحاس خارج الترمينال. قص الزائد بالقطّاعة.':'✔ ممتاز: عرّيت '+d.toFixed(1)+' مم.',d<7?'bad':d>12?'warn':'ok');
  draw();bs.insertAdjacentHTML('beforeend',`<rect class="wrfall" x="${STR.ex+14}" y="${STR.y-13}" width="${d*STR.ppm}" height="26" rx="4" fill="${fillOf(R.col)}"/>`);autoNext();}
/* ---------- pressing the tool: a short drag moves it, holding still squeezes it ---------- */
const bp=e=>{const p=bs.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(bs.getScreenCTM().inverse());};
let g=null;
bs.addEventListener('pointerdown',e=>{if(R.ph!=='cut'&&R.ph!=='strip')return;ac();const p=bp(e);
  g={x:p.x,y:p.y,tx:R.tx,ty:R.ty,mode:null,onTool:!!e.target.closest('[data-tool]')};try{bs.setPointerCapture(e.pointerId);}catch(_){}e.preventDefault();
  if(g.onTool)g.t=setTimeout(()=>{if(!g||g.mode)return;g.mode='sq';R.sq=true;buzz(12);if(R.ph==='cut'){squeezeCut();bench();}else{gripStrip();ui();bench();}},260);});
bs.addEventListener('pointermove',e=>{if(!g)return;const p=bp(e),dx=p.x-g.x,dy=p.y-g.y;
  if(!g.mode){if(Math.hypot(dx,dy)<6)return;clearTimeout(g.t);g.mode='mv';}
  if(g.mode==='mv'){R.tx=Math.max(20,Math.min(590,g.tx+dx));R.ty=Math.max(60,Math.min(260,g.ty+dy));bench();return;}
  if(g.mode==='sq'&&R.ph==='strip'&&R.pullOn){R.pull=Math.max(0,dx);R.tx=g.tx+R.pull;if(R.pull>=(R.slugB-R.slugA)*.8+6){const gg=g;g=null;clearTimeout(gg.t);R.sq=false;stripDone();return;}bench();}});
const up=()=>{if(!g)return;const gg=g;g=null;clearTimeout(gg.t);
  if(!gg.mode&&gg.onTool){R.sq=true;bench();setTimeout(()=>{R.sq=false;bench();},180);if(R.ph==='cut')squeezeCut();else note('اضغط على العدة مطوّلًا ثم اسحب نحو الطرف.','warn');return;}
  if(R.sq){R.sq=false;if(R.pullOn){R.pullOn=false;R.tx=gg.tx;R.pull=0;note('اسحب أكثر نحو الطرف وأنت ضاغط حتى ينفصل العازل.','warn');}ui();bench();}};
bs.addEventListener('pointerup',up);bs.addEventListener('pointercancel',up);
$('wrC').addEventListener('click',e=>{const b=e.target.closest('[data-c]');if(!b)return;R.col=b.dataset.c;R.ph='cut';R.tx=CUT.x0-50*CUT.ppc;R.ty=CUT.y-((ZC[0]+ZC[1])/2)*CUT.k;snd('clk');note('سُحب السلك من اللفّة إلى الطاولة.','');draw();});
$('wrB').addEventListener('click',e=>{if(e.target.closest('[data-b="next"]'))nextEnd();});
$('wrX').onclick=()=>{reset();A().say('أُلغي السلك.');};
$('wrDX').onclick=()=>{reset();A().say('أُسقط السلك.');};
/* ---------- the wire in the hand, over the board ---------- */
function boardToScreen(x,y){const s=A().svg,p=s.createSVGPoint();p.x=x;p.y=y;return p.matrixTransform(s.getScreenCTM());}
function screenToBoard(x,y){const s=A().svg,p=s.createSVGPoint();p.x=x;p.y=y;return p.matrixTransform(s.getScreenCTM().inverse());}
function drawHand(){if(!R.hand||!R.hp){ov.innerHTML='';return;}const api=A(),t=api.T()[R.a];if(!t)return;const a=boardToScreen(t.x,t.y),{x,y}=R.hp,
    bp2=screenToBoard(x,y),dist=Math.hypot(bp2.x-t.x,bp2.y-t.y)*CM+6,taut=dist>R.len,k=a.x!==undefined?(A().svg.getScreenCTM().a||1):1,w=Math.max(3,7*k),
    sag=taut?0:Math.min(140*k,(R.len-dist)/CM*k*.5);
  const d=`M${a.x} ${a.y}C${a.x} ${a.y+sag} ${x} ${y+sag+20*k} ${x} ${y}`;
  /* the overlay has its own gradient ids: the bench's are inside a hidden window and would not paint here */
  ov.innerHTML=(defs+`<path d="${d}" fill="none" stroke="${taut?'#ff3b30':'rgba(0,0,0,.5)'}" stroke-width="${w+3}" stroke-linecap="round" ${taut?'opacity=".8"':''}/><path d="${d}" fill="none" stroke="${fillOf(R.col)}" stroke-width="${w}" stroke-linecap="round"/>
    <g transform="translate(${x} ${y}) scale(${Math.max(.5,.85*k)})"><rect x="-4" y="-22" width="8" height="18" fill="url(#wrCu)"/>
    <path d="M-34 18 Q-62 60 -50 122 Q-34 172 18 174 Q68 170 72 120 Q76 58 46 22 Z" fill="url(#wrSkin)" stroke="#8a5233" stroke-width="3"/>
    <path d="M-34 28 Q-46 -12 -10 -6 Q4 8 -6 40 Z" fill="url(#wrSkinF)" stroke="#8a5233" stroke-width="3"/><path d="M8 32 Q20 -8 42 0 Q54 16 36 44 Z" fill="url(#wrSkinF)" stroke="#8a5233" stroke-width="3"/>
    <path d="M-44 150 L64 150 L68 220 L-48 224 Z" fill="url(#wrSleeve)" stroke="#0f2238" stroke-width="3"/></g>`).replace(/(id="|url\(#)wr/g,'$1wo');
  $('wrDT').textContent=taut?'✖ السلك مشدود: طوله '+Math.round(R.len)+' سم لا يكفي لهذه المسافة.':'السلك في يدك ('+Math.round(R.len)+' سم): خذه إلى الترمينال الثاني واضغطه.';}
document.addEventListener('pointermove',e=>{if(!R.hand)return;R.hp={x:e.clientX,y:e.clientY};drawHand();},{passive:true});
addEventListener('scroll',()=>{if(R.hand)drawHand();},{passive:true,capture:true});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&(R.hand||R.ph)){reset();A().say('أُلغي السلك.');}});
/* the second terminal: the routed length in the trunking must fit the cut wire */
function fasten(k){const api=A(),S=api.S;if(k===R.a){api.say('هذا الطرف مثبّت هنا: خذ السلك إلى ترمينال آخر.');return;}
  if(S.wires.some(w=>(w.a===R.a&&w.b===k)||(w.a===k&&w.b===R.a))){api.say('يوجد سلك بين هاتين النقطتين.');return;}
  const id=-1;S.wires.push({id,a:R.a,b:k,c:R.col});let need=0;
  try{const P=api.routeAll(),d=P[id];if(d){const p=document.createElementNS(NS,'path');p.setAttribute('d',d);need=p.getTotalLength()*CM+8;}}catch(_){}
  S.wires=S.wires.filter(w=>w.id!==id);
  if(need&&R.len<need){api.say('✖ السلك قصير: طوله '+Math.round(R.len)+' سم، ومساره في المجاري إلى '+api.termDesc(k)+' يحتاج نحو '+Math.round(need)+' سم.');snd('clk');return;}
  api.snap();api.addWire(R.a,k,R.col);api.scrAdd(k,0,1);snd('clk');
  const bad=R.ends.some(m=>m<7),lng=R.ends.some(m=>m>12),waste=need&&R.len-need>40;
  api.update();api.say((bad?'⚠ رُكّب السلك، لكن أحد طرفيه معرّى قليلًا فهو مرتخٍ في الواقع.':lng?'⚠ رُكّب السلك، لكن نحاسًا ظاهرًا خارج الترمينال: هذا خطر في الواقع.':'✔ رُكّب السلك بإحكام.')+(waste?' السلك أطول من اللازم بكثير (هدر).':''));
  reset();}
/* ---------- the hook the simulator calls when a terminal is touched ---------- */
window.WR={term(k){if(!active()||!A())return false;
    if(R.hand){fasten(k);return true;}
    if(R.ph)return true;
    open(k);return true;},
  get on(){return R.on;},
  toggle(){R.on=!R.on;lsS('wsReal',R.on?'1':null);if(!R.on)reset();return R.on;},
  reset};
})();
