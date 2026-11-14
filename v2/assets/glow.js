/* Sophia Guerrero — sensory glow layer. One look per page; pulses at 124 BPM while the deck plays,
   breathes slowly when paused, follows touch/cursor, holds still for reduced motion. */
(function(){
'use strict';
var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
var cv=document.createElement('canvas');cv.className='glow';cv.setAttribute('aria-hidden','true');
document.body.appendChild(cv);
var gl=cv.getContext('webgl',{premultipliedAlpha:false,antialias:false,powerPreference:'low-power'});
if(!gl){cv.remove();return;}
var VS='attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
var FS=[
'precision highp float;',
'uniform vec2 R;uniform float T,M,K,B,MD,H,A,BAR,ROT;uniform vec2 P;',
'const vec3 INK=vec3(.071,.067,.082),LAV=vec3(.784,.749,.863),VIO=vec3(.42,.357,.549),PAP=vec3(.949,.937,.918),ACID=vec3(.784,.941,.235);',
'float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}',
'float n2(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1,0)),u.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),u.x),u.y);}',
'float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n2(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}',
'void main(){',
' vec2 uv=gl_FragCoord.xy/R;float as=R.x/R.y;',
' vec2 q=(uv-P)*vec2(as,1.);float d=length(q);',
' vec3 c=vec3(0.);',
' if(M<.5){',          /* A flash bloom */
'  float r=.10+.12*B+.14*K;',
'  float halo=exp(-d*d/(r*r));',
'  float core=exp(-d*d/(.0012+.004*K));',
'  float ring=exp(-pow((d-(.06+.55*(1.-K)))/.012,2.))*K*K*.55;',
'  float wide=exp(-d*1.6)*(.18+.25*B);',
'  c=VIO*wide+LAV*halo*(.28+.42*K)+PAP*core*(.35+.6*K)+mix(LAV,ACID,.35)*ring;',
'  c+=VIO*.25*exp(-length((uv-P-vec2(.012,-.006))*vec2(as,1.))*3.)*K;',
' }else if(M<1.5){',    /* B club haze */
'  vec2 w=uv*vec2(as,1.)*1.6;',
'  float f=fbm(w+vec2(T*.035,-T*.02)+fbm(w*1.3-T*.03)*.8);',
'  float light=exp(-d*1.7)*(.7+.9*B)+.12;',
'  float dens=smoothstep(.25,.95,f)*(.55+.7*B);',
'  c=mix(VIO,LAV,smoothstep(.4,.9,f))*dens*light*1.25;',
'  c+=PAP*exp(-d*d/.01)*(.25+.5*K);',
'  float sp=step(.9975-.0025*H,h21(floor(gl_FragCoord.xy/2.)+floor(T*2.)))*smoothstep(.3,.8,f);',
'  c+=mix(PAP,ACID,.3)*sp*(.4+H);',
' }else if(M<2.5){',    /* C spark flare */
'  float s=sin(ROT),co=cos(ROT);vec2 r=mat2(co,-s,s,co)*q;',
'  float len=.05+.07*B+.13*K;',
'  float ray=exp(-abs(r.y)/.0025-abs(r.x)/(len*2.2))+exp(-abs(r.x)/.0025-abs(r.y)/(len*2.2));',
'  float s2=sin(ROT+.7854),c2=cos(ROT+.7854);vec2 r2=mat2(c2,-s2,s2,c2)*q;',
'  float ray2=(exp(-abs(r2.y)/.0015-abs(r2.x)/(len*.9))+exp(-abs(r2.x)/.0015-abs(r2.y)/(len*.9)))*.45;',
'  float halo=exp(-d*d/(.02+.05*B+.04*K));',
'  float wide=exp(-d*2.2)*(.2+.2*B);',
'  c=PAP*ray*(.8+.6*K)+LAV*ray2+LAV*halo*.6+VIO*wide;',
'  c+=ACID*exp(-d*d/.0009)*(.25+.6*K);',
'  float gh=exp(-length((uv-(1.-P))*vec2(as,1.))*14.)*(.12+.25*K);c+=LAV*gh;',
' }else{',              /* D scan line */
'  float by=1.-fract(BAR);',
'  float band=exp(-abs(uv.y-by)*28.)*(.45+.4*B);',
'  float edge=exp(-abs(uv.y-by)*240.);',
'  float lines=.5+.5*sin(gl_FragCoord.y*1.6);',
'  float wf=exp(-abs(uv.y-by-(n2(vec2(uv.x*18.,T*2.))-.5)*.05*(.4+MD*1.4))*160.);',
'  float vign=exp(-d*1.2);',
'  c=LAV*band*(.6+.4*lines)+mix(PAP,ACID,.45)*(edge*.6+wf*.55)+VIO*vign*(.18+.35*K);',
'  c*=.85+.15*lines;',
' }',
' c*=A;',
' c+=(h21(gl_FragCoord.xy+T)-.5)*.02;',
' gl_FragColor=vec4(max(c,0.),1.);',
'}'].join('\n');
function sh(t,s){var o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(o));return o;}
var pr=gl.createProgram();gl.attachShader(pr,sh(gl.VERTEX_SHADER,VS));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,FS));gl.linkProgram(pr);gl.useProgram(pr);
var bf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,bf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
var loc=gl.getAttribLocation(pr,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
var U={};['R','T','M','K','B','MD','H','A','BAR','ROT','P'].forEach(function(n){U[n]=gl.getUniformLocation(pr,n)});
var small=matchMedia('(max-width: 860px)');
var scale=Math.min(devicePixelRatio||1,1.5)*(small.matches?.45:.55);
function size(){cv.width=Math.max(2,Math.round(innerWidth*scale));cv.height=Math.max(2,Math.round(innerHeight*scale));gl.viewport(0,0,cv.width,cv.height);}
size();addEventListener('resize',size);
/* page -> look: 0 bloom, 1 haze, 2 spark, 3 scan */
var LOOK={home:0,mixes:1,press:1,book:1,music:3,lost:1};
var KMUL={home:.38,mixes:.7,press:.7,book:.7,music:.3,lost:.7};
var AMT={home:.55,mixes:.5,press:.34,book:.32,music:.14,lost:.6};
function home(page){
  if(page==='home')return small.matches?{x:.5,y:.42}:{x:.455,y:.38};
  if(page==='press'||page==='book')return small.matches?{x:.82,y:.86}:{x:.86,y:.84};
  return {x:.5,y:.5};
}
var t0=performance.now(),last=t0,beat0=t0,lastTap=0;
var root=document.documentElement,vu=[].slice.call(document.querySelectorAll('.deck .vu i')),fN=0;
var F=0,K=0,B=0,MD=0,H=0,pos={x:.5,y:.5},tgt={x:.5,y:.5},rot=0,lastPtr=-1e9,wasPlaying=false,amt=.8;
function ptr(x,y){tgt.x=Math.min(.95,Math.max(.05,x/innerWidth));tgt.y=1-Math.min(.95,Math.max(.05,y/innerHeight));lastPtr=performance.now();}
addEventListener('pointermove',function(e){if(e.pointerType!=='touch')ptr(e.clientX,e.clientY)},{passive:true});
addEventListener('touchmove',function(e){var t=e.touches[0];if(t)ptr(t.clientX,t.clientY)},{passive:true});
function frame(now){
  if(!reduce)requestAnimationFrame(frame);
  if(document.hidden)return;
  var dt=Math.min(.05,(now-last)/1000);last=now;var t=(now-t0)/1000;
  var page=document.body.dataset.page||'home',mode=LOOK[page]||0,playing=document.body.classList.contains('playing');
  var BPM=window.SG_BPM||124;
  if(window.SG_TAP&&window.SG_TAP!==lastTap){lastTap=window.SG_TAP;beat0=window.SG_TAP;}
  var tapping=now-lastTap<8000;
  if(playing&&!wasPlaying)beat0=now;wasPlaying=playing;
  playing=playing||tapping;
  amt+=((AMT[page]||.7)-amt)*Math.min(1,dt*3);
  /* Photosensitive safety (WCAG 2.3.1): never more than 2 light pulses a second, soft attack on
     every pulse (no hard on/off), the big photo flash at most once per bar (<= 0.75 a second), and
     calm mode (or reduced motion) turns all pulsing off. */
  var calm=!!window.SG_CALM;
  var lit=playing&&!calm;
  var b,m,h,kickT=0,flashT=0;
  if(lit){
    var beats=(now-beat0)/1000*BPM/60;
    var step=BPM>120?2:1;                       /* half-time above 120 BPM => <= 1.5 pulses/s */
    var ph=(beats%step)/step;
    kickT=ph<.1?ph/.1:Math.exp(-(ph-.1)*4.5);  /* ~80 ms rise, slow fade */
    var bp=(beats%4)/4;                         /* one photo flash per bar */
    flashT=bp<.06?bp/.06:Math.exp(-(bp-.06)*5);
    var off=Math.exp(-((beats+.5)%1)*8);
    b=.3+.22*kickT;m=.22+.1*Math.sin(beats*Math.PI/2);h=.1+.25*off;
  }else{b=.12+.05*Math.sin(t*.6);m=.08;h=.03;}
  var kt=lit?kickT:.05+.04*Math.sin(t*1.2);
  K+=(kt-K)*Math.min(1,dt*(kt>K?14:5));
  F+=((lit?flashT:0)-F)*Math.min(1,dt*10);
  B+=(b-B)*Math.min(1,dt*8);MD+=(m-MD)*Math.min(1,dt*6);H+=(h-H)*Math.min(1,dt*8);
  var hm=home(page);
  if(now-lastPtr>2500){tgt.x=hm.x+Math.sin(t*.21)*.04;tgt.y=hm.y+Math.cos(t*.17)*.03;}
  pos.x+=(tgt.x-pos.x)*Math.min(1,dt*2);pos.y+=(tgt.y-pos.y)*Math.min(1,dt*2);
  rot+=dt*(.08+.2*K);
  var bar=lit?((now-beat0)/1000)*BPM/60/4:t*.08;
  gl.uniform2f(U.R,cv.width,cv.height);gl.uniform1f(U.T,t);gl.uniform1f(U.M,mode);gl.uniform1f(U.K,K*(KMUL[page]||.7));gl.uniform1f(U.B,B);gl.uniform1f(U.MD,MD);gl.uniform1f(U.H,H);gl.uniform1f(U.A,amt);gl.uniform1f(U.BAR,bar);gl.uniform1f(U.ROT,rot);gl.uniform2f(U.P,pos.x,pos.y);
  gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  root.style.setProperty('--flash',(F*.3).toFixed(3));
  if(vu.length&&(fN++&1)===0){
    for(var i=0;i<vu.length;i++){var lv=i<3?B:i<6?MD:H;var v=playing?Math.min(1,lv*1.8*(1-i*.06)+K*(i<4?.5:.15)):.08+.04*Math.sin(t*1.3+i);vu[i].style.transform='scaleY('+Math.max(.08,v).toFixed(2)+')';}
  }
}
if(reduce){K=.35;B=.22;var hm=home(document.body.dataset.page||'home');pos=hm;}
requestAnimationFrame(frame);
})();
