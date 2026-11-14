/* Sophia Guerrero — site behaviour: persistent deck, page swaps, filters */
(function(){
  'use strict';
  var PROFILE='https://soundcloud.com/sophiaguerrero';
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- old #panel links → new pages ---------- */
  var legacy={releases:'/music/',music:'/music/',mixes:'/mixes/',press:'/press/',info:'/book/',tour:'/book/#played-at',play:'/?play'};
  var h=location.hash.slice(1);
  if((location.pathname==='/'||/index\.html$/.test(location.pathname))&&legacy[h]){location.replace(legacy[h]);return;}

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
  var PAGES=/^\/(music|mixes|press|book)?\/?$/;
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
  init(document);
  setCurrent(location.pathname);
})();
