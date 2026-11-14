/* Sophia Guerrero — Play mode.
   An immersive listening room over the site. Real playback only, through window.SGDeck
   (SoundCloud widget, YouTube player, Spotify embed). Nothing plays until the visitor presses play.
   The light reads each track's listed tempo and key; it does not (and cannot) read the audio. */
(function(){
'use strict';
var pm=document.getElementById('pm');if(!pm)return;
var D=function(){return window.SGDeck};
var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
var $=function(s){return pm.querySelector(s)};
var art=$('.pm-art'),img=$('.pm-art img'),ttl=$('.pm-title'),no=$('.pm-no'),sub=$('.pm-sub'),srcEl=$('.pm-src'),cap=$('.pm-caption'),
    ppB=$('.pm-pp'),prog=$('.pm-prog'),progI=prog.querySelector('i'),time=$('.pm-time'),vol=$('.pm-vol input'),list=$('.pm-list ol'),
    dispB=$('.pm-display'),fsB=$('.pm-fs'),reveal=$('.pm-reveal');
var openState=false,lastFocus=null,sel=null,raf=0,idleT=0;

/* ---------- track strip ---------- */
function key(it){return it.sc||it.yt||('sp:'+it.sp)}
function build(){
  var items=D().items;list.innerHTML='';
  items.forEach(function(it,i){
    var li=document.createElement('li'),b=document.createElement('button');
    b.type='button';b.className='pm-item';b.dataset.k=key(it);
    var via=it.sc?'SoundCloud':it.yt?'YouTube mix':'Spotify';
    b.setAttribute('aria-label',(it.kind==='mix'?'Mix: ':'')+it.title+', '+it.label+', plays via '+via);
    b.innerHTML='<img src="'+it.img+'" alt="" loading="lazy" width="120" height="120"><span class="pm-i-no">'+(it.kind==='mix'?'MIX':'No. '+('0'+it.no).slice(-2))+'</span><span class="pm-i-t"></span><span class="pm-i-v">'+via+'</span>';
    b.querySelector('.pm-i-t').textContent=it.title;
    b.addEventListener('click',function(){show(it,true);D().playItem(it);});
    li.appendChild(b);list.appendChild(li);
  });
}
function markList(){var c=D().current(),k=c?key(c):sel?key(sel):'';list.querySelectorAll('.pm-item').forEach(function(b){var on=b.dataset.k===k;b.classList.toggle('on',on);if(on)b.setAttribute('aria-current','true');else b.removeAttribute('aria-current');});}

/* ---------- per-track theme ---------- */
var NOTE={c:0,'c♯':1,'d♭':1,d:2,'d♯':3,'e♭':3,e:4,f:5,'f♯':6,'g♭':6,g:7,'g♯':8,'a♭':8,a:9,'a♯':10,'b♭':10,b:11};
function theme(it){
  var k=(it&&it.key||'').toLowerCase().split(' '),n=NOTE[k[0]]!=null?NOTE[k[0]]:5,minor=k[1]==='min';
  var seed=0,s=key(it||{});for(var i=0;i<s.length;i++)seed=(seed*31+s.charCodeAt(i))%9973;
  return {hue:(n-5.5)/5.5*0.11, light:minor?0.82:1.05, bpm:it&&it.bpm||0, seed:seed/9973, mix:!!(it&&it.kind==='mix')};
}
var TH=theme(null),THn=TH,swT=-10;

/* ---------- show a track (artwork, type, transition) ---------- */
function show(it,user){
  if(!it)return;var changed=!sel||key(sel)!==key(it);sel=it;
  if(changed){
    var nm=it.kind==='mix'?'Mix · '+it.date+' · '+it.length:'No. '+('0'+it.no).slice(-2)+' · '+it.label+' · '+it.year;
    var meta=it.kind==='mix'?'YouTube · tracklist on the Mixes page':(it.bpm+' BPM · '+it.key+' · released '+it.date);
    var via=it.sc?'Playing from SoundCloud':it.yt?'Playing from YouTube (the video stays visible)':'Playing from Spotify. Without a Spotify login you may hear a 30-second preview';
    if(!reduce){art.classList.remove('swap');void art.offsetWidth;art.classList.add('swap');}
    setTimeout(function(){img.src=it.img;img.alt=it.title+' artwork';},reduce?0:180);
    art.classList.toggle('wide',!!it.yt);pm.classList.toggle('src-sp',!!(it.sp&&!it.sc&&!it.yt));
    no.textContent=nm;ttl.textContent=it.title+(it.feat?' '+it.feat:'');sub.textContent=meta;srcEl.textContent=via;cap.textContent=it.title+' — Sophia Guerrero';
    THn=theme(it);swT=performance.now();
  }
  markList();
}

/* ---------- controls ---------- */
function syncControls(){
  var d=D(),p=d.playing(),pos=d.position();
  ppB.textContent=p?'❚❚':'▶';ppB.setAttribute('aria-label',p?'Pause':'Play');
  progI.style.width=(pos[1]?Math.min(100,pos[0]/pos[1]*100):0)+'%';
  time.textContent=d.fmt(pos[0])+(pos[1]?' / '+d.fmt(pos[1]):'');
  prog.setAttribute('aria-valuenow',String(Math.round(pos[1]?pos[0]/pos[1]*100:0)));
  var vs=d.volumeSupported();vol.disabled=!vs;vol.parentNode.title=vs?'Volume':'Spotify does not allow volume control here; use your device volume';
}
ppB.addEventListener('click',function(){var d=D();if(!d.current()&&sel){d.playItem(sel);return;}d.toggle();});
$('.pm-prev').addEventListener('click',function(){D().prev();});
$('.pm-next').addEventListener('click',function(){D().next();});
prog.addEventListener('click',function(e){var r=prog.getBoundingClientRect();D().seekFrac((e.clientX-r.left)/r.width);});
prog.addEventListener('keydown',function(e){var d=D(),p=d.position();if(!p[1])return;if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();e.stopPropagation();d.seekFrac((p[0]+(e.key==='ArrowRight'?10000:-10000))/p[1]);}});
vol.addEventListener('input',function(){D().setVolume(+vol.value);});
document.addEventListener('sg:deck',function(e){if(!openState)return;var c=e.detail.current;if(c)show(c);syncControls();});

/* ---------- open / close ---------- */
function open(){
  if(openState||!D())return;openState=true;window.SG_PM_OPEN=true;lastFocus=document.activeElement;
  if(!list.children.length)build();
  vol.value=D().getVolume();
  show(D().current()||D().items[0]);
  pm.hidden=false;document.body.classList.add('pm-open');
  requestAnimationFrame(function(){pm.classList.add('in');});
  ppB.focus({preventScroll:true});syncControls();startGL();D().placeDock();
  D().track('play-mode-open');
  tick=setInterval(syncControls,500);
}
var tick=0;
function close(){
  if(!openState)return;
  if(document.fullscreenElement&&document.exitFullscreen)document.exitFullscreen().catch(function(){});
  setDisplay(false);openState=false;window.SG_PM_OPEN=false;clearInterval(tick);
  pm.classList.remove('in');document.body.classList.remove('pm-open');
  setTimeout(function(){if(!openState){pm.hidden=true;stopGL();}},reduce?0:350);
  D().leavePlayMode();
  if(lastFocus&&lastFocus.focus)lastFocus.focus({preventScroll:true});
}
$('.pm-exit').addEventListener('click',close);
document.addEventListener('click',function(e){if(e.target.closest('.pm-open')){e.preventDefault();open();}});

/* ---------- fullscreen + display (visual-only) ---------- */
function fsToggle(){
  if(document.fullscreenElement){document.exitFullscreen&&document.exitFullscreen();return;}
  if(pm.requestFullscreen)pm.requestFullscreen().catch(function(){fsB.textContent='Fullscreen unavailable';});
  else if(pm.webkitRequestFullscreen)pm.webkitRequestFullscreen();
}
fsB.addEventListener('click',fsToggle);
document.addEventListener('fullscreenchange',function(){var on=document.fullscreenElement===pm;fsB.textContent=on?'Exit fullscreen':'Fullscreen';setTimeout(function(){D()&&D().placeDock();},150);});
function setDisplay(on){
  pm.classList.toggle('display',on);dispB.setAttribute('aria-pressed',String(on));
  if(on){D().track('display-mode');poke();reveal.focus({preventScroll:true});}else{pm.classList.remove('idle');}
  setTimeout(function(){D()&&D().placeDock();},60);
}
dispB.addEventListener('click',function(){setDisplay(!pm.classList.contains('display'));});
reveal.addEventListener('click',function(){setDisplay(false);ppB.focus();});
function poke(){pm.classList.remove('idle');clearTimeout(idleT);if(pm.classList.contains('display'))idleT=setTimeout(function(){pm.classList.add('idle');},2500);}
['pointermove','pointerdown','touchstart'].forEach(function(ev){pm.addEventListener(ev,poke,{passive:true});});

/* ---------- keyboard (stays inside the room) ---------- */
pm.addEventListener('keydown',function(e){
  poke();
  var t=(e.target.tagName||'').toLowerCase();
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();if(document.fullscreenElement)return;if(pm.classList.contains('display')){setDisplay(false);ppB.focus();}else close();return;}
  if(e.key==='Tab'){var f=[].slice.call(pm.querySelectorAll('button:not([disabled]),[tabindex="0"],input:not([disabled]),a[href]')).filter(function(x){return x.offsetParent!==null});if(!f.length)return;var i=f.indexOf(document.activeElement);if(e.shiftKey&&i<=0){e.preventDefault();f[f.length-1].focus();}else if(!e.shiftKey&&i===f.length-1){e.preventDefault();f[0].focus();}return;}
  if(t==='input')return;
  if(e.metaKey||e.ctrlKey||e.altKey)return;
  var k=e.key.toLowerCase(),d=D(),h=true;
  if(k===' '&&t!=='button'){d.current()?d.toggle():sel&&d.playItem(sel);}
  else if(k==='arrowright'&&t!=='div')d.next();
  else if(k==='arrowleft'&&t!=='div')d.prev();
  else if(k==='arrowup'){d.setVolume(d.getVolume()+5);vol.value=d.getVolume();}
  else if(k==='arrowdown'){d.setVolume(d.getVolume()-5);vol.value=d.getVolume();}
  else if(k==='f')fsToggle();
  else if(k==='d')setDisplay(!pm.classList.contains('display'));
  else if(k==='n')d.next();
  else if(k==='b')d.prev();
  else h=false;
  if(h){e.preventDefault();e.stopPropagation();}
});

/* ---------- the light: original abstract club visual (WebGL) ----------
   Soft light bars through haze, a slow chase across them on the beat, a ✦ glint, film grain.
   Theme per track: hue from the musical key, brightness from major/minor, layout from the release,
   chase speed from the BPM. Pulses stay within 2 per second and rise softly; Calm mode = no pulsing. */
var cv=$('.pm-gl'),gl=null,U={},prg=null,t0=performance.now(),last=t0,beat0=t0,wasPlaying=false;
var VS='attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
var FS=[
'precision highp float;',
'uniform vec2 R;uniform float T,K,HUE,LIT,SEED,SW,CHASE,PLAY,MIX;',
'float h(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}',
'float n(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),u.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x),u.y);}',
'float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*n(p);p=p*2.02+vec2(3.1,1.7);a*=.5;}return v;}',
'vec3 hueRot(vec3 c,float a){const vec3 k=vec3(.57735);float co=cos(a*6.2832);return c*co+cross(k,c)*sin(a*6.2832)+k*dot(k,c)*(1.-co);}',
'void main(){',
' vec2 uv=gl_FragCoord.xy/R;float as=R.x/R.y;vec2 q=(uv-.5)*vec2(as,1.);',
' vec3 VIO=hueRot(vec3(.42,.357,.549),HUE),LAV=hueRot(vec3(.784,.749,.863),HUE*.7),PAP=vec3(.949,.937,.918);',
' float hz=fbm(q*1.7+vec2(T*.02,-T*.012)+SEED*7.);',
' vec3 c=VIO*.10*hz;',
' float tilt=(SEED-.5)*.5;vec2 r=vec2(q.x*cos(tilt)-q.y*sin(tilt),q.x*sin(tilt)+q.y*cos(tilt));',
' for(int i=0;i<7;i++){float fi=float(i);',
'  float x=(fi-3.)*(.21+.06*SEED)+sin(T*.05+fi*1.7+SEED*9.)*.05;',
'  float w=.010+.016*h(vec2(fi,SEED));',
'  float bar=exp(-pow((r.x-x)/w,2.))*smoothstep(.62,.0,abs(r.y+.05*sin(fi+T*.1)));',
'  float glow=exp(-pow((r.x-x)/(w*9.),2.))*smoothstep(.75,.0,abs(r.y))*.22;',
'  float on=1.-min(1.,abs(mod(CHASE-fi,7.)-0.)*1.)*1.;on=max(on,0.);',
'  float lvl=.32+.68*PLAY*on*K+.08*sin(T*.4+fi);',
'  c+=mix(VIO,LAV,.5+.5*sin(fi+SEED*6.))*(bar*lvl*1.1+glow*lvl)*(.55+.45*hz);',
' }',
' vec2 s=q-vec2(.36*as*.5,.22);float sp=exp(-abs(s.y)/.002-abs(s.x)/.09)+exp(-abs(s.x)/.002-abs(s.y)/.09);',
' c+=PAP*sp*(.25+.5*K*PLAY)*(1.-MIX*.5);',
' c+=LAV*exp(-dot(q,q)*2.2)*.06*(1.+K*PLAY);',
' float sweep=exp(-pow((uv.x-(SW*1.4-.2))/.12,2.))*(1.-SW)*.35;c+=LAV*sweep;',
' c*=LIT;c*=1.-smoothstep(.55,1.15,length(q*vec2(.9,1.2)));',
' c+=(h(gl_FragCoord.xy*.73+fract(T*3.1))-.5)*.05;',
' gl_FragColor=vec4(max(c,0.),1.);',
'}'].join('\n');
function initGL(){
  if(gl)return true;gl=cv.getContext('webgl',{antialias:false,premultipliedAlpha:false,powerPreference:'low-power'});if(!gl)return false;
  function sh(t,s){var o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(o));return o;}
  prg=gl.createProgram();gl.attachShader(prg,sh(gl.VERTEX_SHADER,VS));gl.attachShader(prg,sh(gl.FRAGMENT_SHADER,FS));gl.linkProgram(prg);gl.useProgram(prg);
  var b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  var l=gl.getAttribLocation(prg,'p');gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,2,gl.FLOAT,false,0,0);
  ['R','T','K','HUE','LIT','SEED','SW','CHASE','PLAY','MIX'].forEach(function(u){U[u]=gl.getUniformLocation(prg,u)});
  return true;
}
function size(){if(!gl)return;var s=Math.min(devicePixelRatio||1,1.5)*(innerWidth<760?.45:.55);cv.width=Math.max(2,innerWidth*s|0);cv.height=Math.max(2,innerHeight*s|0);gl.viewport(0,0,cv.width,cv.height);}
addEventListener('resize',size);
var K=0,chase=0,lastStep=-1;
function frame(now){
  if(!openState)return;if(!reduce)raf=requestAnimationFrame(frame);if(document.hidden)return;
  var dt=Math.min(.05,(now-last)/1000);last=now;var t=(now-t0)/1000,d=D();
  /* ease theme toward the selected track */
  ['hue','light','seed'].forEach(function(k){TH[k]=TH===THn?TH[k]:TH[k]+(THn[k]-TH[k])*Math.min(1,dt*2.2);});TH.bpm=THn.bpm;TH.mix=THn.mix;
  var playing=d.playing()&&!window.SG_CALM&&!TH.mix&&TH.bpm>0;
  if(playing&&!wasPlaying)beat0=now;wasPlaying=playing;
  var kt=.05+.03*Math.sin(t*.9);
  if(playing){var bpm=TH.bpm,step=bpm>120?2:1,beats=(now-beat0)/1000*bpm/60,ph=(beats%step)/step;
    kt=ph<.12?ph/.12:Math.exp(-(ph-.12)*4);var st=Math.floor(beats/step);if(st!==lastStep){lastStep=st;chase=(chase+1)%7;}}
  K+=(kt-K)*Math.min(1,dt*(kt>K?12:5));
  var sw=Math.min(1,(now-swT)/1100);
  gl.uniform2f(U.R,cv.width,cv.height);gl.uniform1f(U.T,t);gl.uniform1f(U.K,K);gl.uniform1f(U.HUE,TH.hue);gl.uniform1f(U.LIT,TH.light);
  gl.uniform1f(U.SEED,TH.seed);gl.uniform1f(U.SW,reduce?1:sw);gl.uniform1f(U.CHASE,chase);gl.uniform1f(U.PLAY,playing?1:0);gl.uniform1f(U.MIX,TH.mix?1:0);
  gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
}
function startGL(){
  var nc=navigator.connection||{};if(nc.saveData||(navigator.deviceMemory&&navigator.deviceMemory<3)){pm.classList.add('nogl');return;}
  try{if(!initGL()){pm.classList.add('nogl');return;}}catch(e){pm.classList.add('nogl');return;}
  if(TH===THn)TH=Object.assign({},THn);size();last=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(frame);
}
function stopGL(){cancelAnimationFrame(raf);}

window.SGPlay={open:open,close:close,isOpen:function(){return openState}};
})();
