/* Sophia Guerrero — site behaviour: persistent deck, page swaps, filters */
(function(){
  'use strict';
  var PROFILE='https://soundcloud.com/sophiaguerrero';
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var B=document.body.dataset.base||'';

  /* ---------- old #panel links → new pages ---------- */
  var legacy={releases:B+'/music/',music:B+'/music/',mixes:B+'/mixes/',press:B+'/press/',info:B+'/book/',tour:B+'/book/#played-at',play:B+'/?play'};
  var h=location.hash.slice(1);
  if((location.pathname===B+'/'||/index\.html$/.test(location.pathname))&&legacy[h]){location.replace(legacy[h]);return;}

  /* ---------- deck (SoundCloud widget, created on first play) ---------- */
  var deck=document.querySelector('.deck'),lcdT=deck.querySelector('.tt'),lcdS=deck.querySelector('.st'),lcdM=deck.querySelector('.tm'),
      pp=deck.querySelector('.pp'),live=document.getElementById('deck-live'),ext=deck.querySelector('.ext');
  var widget=null,frame=null,pendingUrl=null,playing=false,apiLoading=false,stallT;
  var ICON_PLAY='<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2l10 6-10 6z" fill="currentColor"/></svg>',
      ICON_PAUSE='<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 2h4v12H3zM9 2h4v12H9z" fill="currentColor"/></svg>';
  function fmt(ms){ms=Math.max(0,ms|0);var s=Math.floor(ms/1000);return Math.floor(s/60)+':'+('0'+s%60).slice(-2);}
  function say(t){live.textContent=t;}
  function setState(p){
    playing=p;deck.classList.toggle('playing',p);document.body.classList.toggle('playing',p);
    pp.innerHTML=p?ICON_PAUSE:ICON_PLAY;pp.setAttribute('aria-label',p?'Pause':'Play');
    lcdS.textContent=p?'Play':'Pause';
    document.querySelectorAll('[data-play]').forEach(function(b){b.setAttribute('aria-pressed',String(p&&b.dataset.play===(currentUrl||PROFILE)))});
  }
  var currentUrl=null;
  function srcFor(url){return 'https://w.soundcloud.com/player/?url='+encodeURIComponent(url)+'&auto_play=true&show_artwork=false&visual=false&buying=false&sharing=false';}
  function loadApi(cb){
    if(window.SC&&SC.Widget)return cb();
    if(apiLoading){var i=setInterval(function(){if(window.SC&&SC.Widget){clearInterval(i);cb()}},80);return;}
    apiLoading=true;var s=document.createElement('script');s.src='https://w.soundcloud.com/player/api.js';s.async=true;s.onload=cb;document.head.appendChild(s);
  }
  function bind(){
    var E=SC.Widget.Events;
    widget.bind(E.READY,function(){widget.play();});
    widget.bind(E.PLAY,function(){clearTimeout(stallT);setState(true);widget.getCurrentSound(function(s){if(s){lcdT.textContent=s.title;ext.href=s.permalink_url;say('Now playing: '+s.title);}});});
    widget.bind(E.PAUSE,function(){setState(false);});
    widget.bind(E.FINISH,function(){setState(false);});
    widget.bind(E.PLAY_PROGRESS,function(e){lcdM.textContent=fmt(e.currentPosition);});
  }
  function start(url){
    url=url||PROFILE;
    lcdS.textContent='Load';lcdT.textContent='Tuning in…';
    clearTimeout(stallT);
    stallT=setTimeout(function(){if(!playing){lcdS.textContent='Tap';lcdT.textContent='Press play again, or open on SoundCloud';}},6000);
    if(widget&&url===currentUrl){widget.play();return;}
    currentUrl=url;
    loadApi(function(){
      if(!frame){
        frame=document.createElement('iframe');frame.className='sc';frame.title='SoundCloud player';frame.allow='autoplay';frame.setAttribute('aria-hidden','true');frame.tabIndex=-1;
        frame.src=srcFor(url);deck.appendChild(frame);widget=SC.Widget(frame);bind();
      }else{widget.load(url,{auto_play:true,show_artwork:false,visual:false,callback:function(){widget.play();}});}
    });
  }
  function toggle(){if(!widget){start();return;}widget.isPaused(function(p){p?widget.play():widget.pause();});}
  pp.addEventListener('click',toggle);
  deck.querySelector('.prev').addEventListener('click',function(){widget?widget.prev():start();});
  deck.querySelector('.next').addEventListener('click',function(){widget?widget.next():start();});
  document.addEventListener('click',function(e){
    var b=e.target.closest('[data-play]');if(!b)return;e.preventDefault();
    var url=b.dataset.play||PROFILE;
    if(widget&&playing&&url===currentUrl){widget.pause();return;}
    start(url);
  });
  if(/[?&]play\b/.test(location.search)){lcdT.textContent='Press play to start';pp.focus({preventScroll:true});}

  /* ---------- page swaps keep the deck playing ---------- */
  var PAGES=new RegExp('^'+B.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'/(music|mixes|press|book)?/?$');
  function sameSite(a){return a.origin===location.origin&&PAGES.test(a.pathname)&&!a.hasAttribute('download')&&a.target!=='_blank';}
  function setCurrent(path){document.querySelectorAll('.mast nav a').forEach(function(a){if(a.pathname===path)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});}
  function swap(url,push){
    return fetch(url,{credentials:'same-origin'}).then(function(r){if(!r.ok)throw 0;return r.text();}).then(function(html){
      var doc=new DOMParser().parseFromString(html,'text/html'),nm=doc.querySelector('main');if(!nm)throw 0;
      document.querySelector('main').replaceWith(nm);
      document.title=doc.title;
      ['meta[name="description"]','link[rel="canonical"]','meta[property="og:url"]','meta[property="og:title"]'].forEach(function(s){var a=document.querySelector(s),b=doc.querySelector(s);if(a&&b){a.getAttribute('content')!==null?a.setAttribute('content',b.getAttribute('content')):a.setAttribute('href',b.getAttribute('href'));}});
      var ld=document.getElementById('page-ld'),nld=doc.getElementById('page-ld');if(ld&&nld)ld.textContent=nld.textContent;
      document.body.dataset.page=doc.body.dataset.page;
      var u=new URL(url,location.href);
      if(push)history.pushState({},'',u.pathname+u.hash);
      setCurrent(u.pathname);
      if(u.hash&&document.querySelector(u.hash))document.querySelector(u.hash).scrollIntoView();else scrollTo(0,0);
      var h1=nm.querySelector('h1');if(h1){h1.setAttribute('tabindex','-1');h1.focus({preventScroll:true});}
      say('Page: '+doc.title.split(' — ')[0]);
      init(nm);
    });
  }
  document.addEventListener('click',function(e){
    if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
    var a=e.target.closest('a[href]');if(!a||!sameSite(a))return;
    if(a.pathname===location.pathname&&a.hash)return;
    e.preventDefault();swap(a.href,true).catch(function(){location.href=a.href;});
  });
  addEventListener('popstate',function(){swap(location.href,false).catch(function(){location.reload();});});

  /* ---------- per-page behaviour ---------- */
  function init(root){
    var torch=root.querySelector('.torch');
    if(torch&&!reduce){
      var mv=function(x,y){var r=torch.getBoundingClientRect();if(x<r.left||x>r.right||y<r.top||y>r.bottom)return;torch.style.setProperty('--fx',((x-r.left)/r.width*100).toFixed(1)+'%');torch.style.setProperty('--fy',((y-r.top)/r.height*100).toFixed(1)+'%');};
      torch.addEventListener('pointermove',function(e){mv(e.clientX,e.clientY)});
      torch.addEventListener('touchmove',function(e){var t=e.touches[0];if(t)mv(t.clientX,t.clientY)},{passive:true});
      torch.addEventListener('pointerleave',function(){torch.style.setProperty('--fx','60%');torch.style.setProperty('--fy','34%');});
    }
    var f=root.querySelector('.filters');
    if(f){
      f.addEventListener('click',function(e){
        var b=e.target.closest('button');if(!b)return;
        f.querySelectorAll('button').forEach(function(x){x.setAttribute('aria-pressed',String(x===b))});
        var lab=b.dataset.label,n=0;
        root.querySelectorAll('.issue').forEach(function(it){var show=!lab||it.dataset.label===lab;it.hidden=!show;if(show)n++;});
        say(n+' releases shown');
      });
    }
  }

  /* ---------- A · tune-in gate (first home visit this session) ---------- */
  var mast=document.querySelector('.mast');
  function mastH(){document.documentElement.style.setProperty('--mast-h',mast.offsetHeight+'px');}
  mastH();addEventListener('resize',mastH);
  var gate=document.querySelector('.gate'),seen=false;
  try{seen=sessionStorage.getItem('sgIn')==='1'}catch(e){}
  if(gate&&!seen&&!/[?&]play\b/.test(location.search)&&!location.hash){
    document.body.classList.add('gated');
    var gi=gate.querySelector('.gate-in');
    function openGate(){
      try{sessionStorage.setItem('sgIn','1')}catch(e){}
      document.body.classList.add('gate-open');
      setTimeout(function(){document.body.classList.remove('gated','gate-open');var h1=document.getElementById('cover-title');if(h1){h1.setAttribute('tabindex','-1');h1.focus({preventScroll:true});}},reduce?0:950);
    }
    gi.addEventListener('click',openGate);
    gate.querySelector('.gate-quiet').addEventListener('click',openGate);
    document.addEventListener('keydown',function g(e){if(e.key==='Escape'&&document.body.classList.contains('gated')){openGate();document.removeEventListener('keydown',g);}});
  }
  function manilaTime(){try{return new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Manila',hour:'2-digit',minute:'2-digit'}).format(new Date());}catch(e){return '';}}
  document.querySelectorAll('.mnl').forEach(function(el){el.textContent='Manila · '+manilaTime();});

  /* ---------- E · tap tempo (light follows) ---------- */
  var tapB=deck.querySelector('.tap'),taps=[];
  window.SG_BPM=124;
  if(tapB)tapB.addEventListener('click',function(){
    var n=performance.now();taps=taps.filter(function(x){return n-x<2500});taps.push(n);
    tapB.classList.add('hit');setTimeout(function(){tapB.classList.remove('hit')},90);
    if(taps.length>=3){var d=(taps[taps.length-1]-taps[0])/(taps.length-1),bpm=Math.round(60000/d);
      if(bpm>=70&&bpm<=180){window.SG_BPM=bpm;window.SG_TAP=n;lcdS.textContent='Tap';lcdM.textContent=bpm+' BPM';say('Light set to '+bpm+' BPM');}}
    else{lcdS.textContent='Tap';}
  });

  /* ---------- E · keyboard ---------- */
  var kbd=document.querySelector('dialog.kbd');
  document.addEventListener('keydown',function(e){
    if(e.metaKey||e.ctrlKey||e.altKey)return;
    var tag=(e.target.tagName||'').toLowerCase();if(/input|textarea|select/.test(tag)||e.target.isContentEditable)return;
    if(e.key===' '&&!/button|a|summary/.test(tag)){e.preventDefault();toggle();}
    else if(e.key==='n'||e.key==='N'){widget?widget.next():start();}
    else if(e.key==='b'||e.key==='B'){if(widget)widget.prev();}
    else if(e.key==='?'&&kbd&&kbd.showModal){kbd.showModal();}
  });
  document.addEventListener('click',function(e){if(e.target.closest('.kbd-open')&&kbd&&kbd.showModal)kbd.showModal();});

  /* ---------- E · after hours (idle 45 s, at most every 5 min) ---------- */
  var ah=document.querySelector('.afterhours'),ahT,ahLast=-1e9,ahClock;
  function ahHide(){if(!ah||ah.hidden)return;ah.classList.remove('on');clearInterval(ahClock);setTimeout(function(){ah.hidden=true},reduce?0:1200);}
  function ahShow(){
    if(!ah||document.body.classList.contains('gated')||(kbd&&kbd.open)||performance.now()-ahLast<300000)return;
    ahLast=performance.now();ah.querySelector('.ah-time').textContent=manilaTime();ah.hidden=false;
    clearInterval(ahClock);ahClock=setInterval(function(){ah.querySelector('.ah-time').textContent=manilaTime()},15000);
    requestAnimationFrame(function(){ah.classList.add('on')});
  }
  function poke(){ahHide();clearTimeout(ahT);ahT=setTimeout(ahShow,45000);}
  ['pointermove','pointerdown','keydown','scroll','touchstart','wheel'].forEach(function(ev){addEventListener(ev,poke,{passive:true})});
  poke();
  init(document);
  setCurrent(location.pathname);
})();
