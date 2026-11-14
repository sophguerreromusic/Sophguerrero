/* Sophia Guerrero — site behaviour: persistent deck, page swaps, filters */
(function(){
  'use strict';
    var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var B=document.body.dataset.base||'';

  /* ---------- old #panel links → new pages ---------- */
  var legacy={releases:B+'/music/',music:B+'/music/',mixes:B+'/mixes/',press:B+'/press/',info:B+'/book/',tour:B+'/book/#played-at',play:B+'/play/'};
  var h=location.hash.slice(1);
  if((location.pathname===B+'/'||/index\.html$/.test(location.pathname))&&legacy[h]){location.replace(legacy[h]);return;}


  /* ---------- privacy-conscious analytics (off until a GoatCounter site is set) ----------
     Cookieless counting only. Respects Do Not Track and Global Privacy Control: if either is on,
     nothing is loaded or sent. No personal data, no IDs. Events: player-start, mix-play,
     release-link, streaming-click, booking-inquiry, newsletter-signup, and a few
     discovery clicks (mix-to-release, release-to-mix, selection-click). */
  var GC=document.body.dataset.gc||'',optOut=navigator.doNotTrack==='1'||window.doNotTrack==='1'||navigator.globalPrivacyControl===true;
  window.SG_EVENTS=[];
  var gcQ=[];
  function track(name,label){
    window.SG_EVENTS.push(label?name+': '+label:name);
    if(!GC||optOut)return;
    var ev={path:name+(label?'/'+label:''),title:label||name,event:true};
    if(window.goatcounter&&window.goatcounter.count)window.goatcounter.count(ev);else gcQ.push(ev);
  }
  window.sgTrack=track;
  if(GC&&!optOut){
    var gs=document.createElement('script');gs.async=true;gs.src='https://gc.zgo.at/count.js';gs.dataset.goatcounter='https://'+GC+'.goatcounter.com/count';
    gs.onload=function(){var t=setInterval(function(){if(window.goatcounter&&window.goatcounter.count){clearInterval(t);gcQ.splice(0).forEach(function(e){window.goatcounter.count(e)});}},200);};
    document.head.appendChild(gs);
  }
    /* Return visits are not tracked on the device (nothing is stored for analytics);
     GoatCounter's own cookieless visitor counts give the overall picture. */
  document.addEventListener('click',function(e){var a=e.target.closest('[data-track]');if(a)track(a.dataset.track,a.dataset.label||'');},true);
  document.addEventListener('submit',function(e){var f=e.target.closest('[data-track-submit]');if(f)track(f.dataset.trackSubmit);},true);

  /* ---------- deck: one player bar for two real sources ----------
     SoundCloud widget (releases queue) and the YouTube IFrame player (mixes, kept visible in a dock).
     Nothing here generates or fakes audio; everything shown comes from the players' own events. */
  var deck=document.querySelector('.deck'),lcdT=deck.querySelector('.tt'),lcdS=deck.querySelector('.st'),lcdM=deck.querySelector('.tm'),
      pp=deck.querySelector('.pp'),live=document.getElementById('deck-live'),ext=deck.querySelector('.ext'),
      prog=deck.querySelector('.prog'),progI=prog?prog.querySelector('i'):null;
  var CAT=[];try{CAT=JSON.parse(document.getElementById('catalog').textContent)}catch(e){}
  var QUEUE=CAT.filter(function(r){return r.sc});
  var ALL=CAT.filter(function(r){return !r.upcoming&&(r.sc||r.sp||r.yt)});
  var current=null,vol=80;
  try{vol=+(localStorage.getItem('sgVol')||80)}catch(e){}
  function emit(){try{document.dispatchEvent(new CustomEvent('sg:deck',{detail:{current:current,playing:playing,src:src}}))}catch(e){}}
  function setCurrent(o){current=o;emit();}
  var ICON_PLAY='<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2l10 6-10 6z" fill="currentColor"/></svg>',
      ICON_PAUSE='<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 2h4v12H3zM9 2h4v12H9z" fill="currentColor"/></svg>';
  function fmt(ms){ms=Math.max(0,ms|0);var s=Math.floor(ms/1000),h=Math.floor(s/3600),m=Math.floor(s%3600/60);return (h?h+':'+('0'+m).slice(-2):m)+':'+('0'+s%60).slice(-2);}
  function say(t){live.textContent=t;}
  var src=null,playing=false,stallT,durMs=0,posMs=0;
  function setProg(p,d){posMs=p;durMs=d||durMs;if(progI)progI.style.width=(durMs?Math.min(100,p/durMs*100):0)+'%';lcdM.textContent=fmt(p)+(durMs?' / '+fmt(durMs):'');if(prog){prog.setAttribute('aria-valuenow',String(Math.round(durMs?p/durMs*100:0)));prog.setAttribute('aria-valuetext',fmt(p)+' of '+fmt(durMs));}}
  function setState(p){
    playing=p;deck.classList.toggle('playing',p);document.body.classList.toggle('playing',p);
    pp.innerHTML=p?ICON_PAUSE:ICON_PLAY;pp.setAttribute('aria-label',p?'Pause':'Play');
    lcdS.textContent=p?'Play':'Pause';
    markNow();emit();
  }
  function markNow(){
    var cur=src==='sc'&&QUEUE[qi]?QUEUE[qi].sc:'';
    document.querySelectorAll('.rec').forEach(function(li){var d=li.querySelector('.rec-data');li.classList.toggle('now',!!cur&&!!d&&d.textContent.indexOf(cur)>-1&&playing);});
    document.querySelectorAll('[data-play]').forEach(function(b){var u=b.dataset.play||(QUEUE[0]&&QUEUE[0].sc);b.setAttribute('aria-pressed',String(playing&&src==='sc'&&u===cur));});
    document.querySelectorAll('[data-yt-play]').forEach(function(b){b.setAttribute('aria-pressed',String(playing&&src==='yt'&&b.dataset.ytPlay===ytId));});
  }
  var touch=matchMedia('(pointer: coarse)').matches;
  function stalled(){clearTimeout(stallT);stallT=setTimeout(function(){if(!playing){lcdS.textContent='Tap';lcdT.textContent='Tap ▶ again to start';}},touch?3500:7000);}
  /* iPhone: load the SoundCloud player script on the first touch so the first play starts faster */
  addEventListener('pointerdown',function pre(){removeEventListener('pointerdown',pre);if(!(window.SC&&SC.Widget))scReady(function(){});},{passive:true});

  /* SoundCloud: releases */
  var widget=null,frame=null,scApi=false,qi=0,lastStarted='';
  function loadScript(u,ok){var s=document.createElement('script');s.src=u;s.async=true;s.onload=ok;document.head.appendChild(s);}
  function scReady(cb){if(window.SC&&SC.Widget)return cb();if(scApi){var i=setInterval(function(){if(window.SC&&SC.Widget){clearInterval(i);cb()}},80);return;}scApi=true;loadScript('https://w.soundcloud.com/player/api.js',cb);}
  function scShow(){var r=QUEUE[qi];if(!r)return;lcdT.textContent=r.title+' — '+r.label;ext.href=r.sc;ext.textContent='SoundCloud ↗';window.SG_BPM=r.bpm||124;window.SG_NOPULSE=false;if(!current||current.sc!==r.sc||current.src!=='sc')setCurrent(Object.assign({src:'sc'},r));}
  function playRelease(i){
    if(!QUEUE.length)return;qi=(i+QUEUE.length)%QUEUE.length;var url=QUEUE[qi].sc;
    if(src==='yt')ytPause();if(src==='sp')spPause();src='sc';scShow();lcdS.textContent='Load';setProg(0,0);stalled();
    scReady(function(){
      if(!frame){
        frame=document.createElement('iframe');frame.className='sc';frame.title='SoundCloud player';frame.allow='autoplay';frame.setAttribute('aria-hidden','true');frame.tabIndex=-1;
        frame.src='https://w.soundcloud.com/player/?url='+encodeURIComponent(url)+'&auto_play=true&show_artwork=false&visual=false&buying=false&sharing=false';
        deck.appendChild(frame);widget=SC.Widget(frame);
        var E=SC.Widget.Events;
        widget.bind(E.READY,function(){widget.setVolume(vol);widget.play();});
        widget.bind(E.PLAY,function(){if(src!=='sc'){widget.pause();return;}clearTimeout(stallT);if(lastStarted!==QUEUE[qi].sc){lastStarted=QUEUE[qi].sc;track('player-start',QUEUE[qi].title);}setState(true);scShow();widget.getDuration(function(d){durMs=d;});say('Now playing: '+QUEUE[qi].title);});
        widget.bind(E.PAUSE,function(){if(src==='sc')setState(false);});
        widget.bind(E.FINISH,function(){if(src==='sc')playRelease(qi+1);});
        widget.bind(E.PLAY_PROGRESS,function(e){if(src==='sc')setProg(e.currentPosition,durMs);});
      }else{widget.load(url,{auto_play:true,show_artwork:false,visual:false,callback:function(){widget.setVolume(vol);widget.play();}});}
    });
  }
  function indexOfUrl(u){for(var i=0;i<QUEUE.length;i++)if(QUEUE[i].sc===u)return i;return 0;}

  /* YouTube: mixes, in a dock that stays visible (YouTube requires a visible player) */
  var dock=null,yt=null,ytApi=false,ytId='',ytTimer=null;
  function ytReady(cb){if(window.YT&&YT.Player)return cb();var prev=window.onYouTubeIframeAPIReady;window.onYouTubeIframeAPIReady=function(){if(prev)prev();cb();};if(!ytApi){ytApi=true;loadScript('https://www.youtube.com/iframe_api',function(){});}}
  function ensureDock(){
    if(dock)return dock;
    dock=document.createElement('div');dock.className='yt-dock';dock.innerHTML='<div class="yt-el"></div><button type="button" class="yt-x">Close mix ✕</button>';
    document.body.appendChild(dock);
    dock.querySelector('.yt-x').addEventListener('click',function(){ytStop();});
    return dock;
  }
  function placeDock(){
    if(!dock||!dock.classList.contains('on'))return;
    var slot=document.getElementById('yt-slot'),ps=document.getElementById('pm-yt-slot');
    document.querySelectorAll('.fm-slot').forEach(function(s){s.classList.remove('docked-here')});
    if(window.SG_PM_OPEN&&ps&&ps.offsetWidth){var q=ps.getBoundingClientRect();dock.classList.remove('mini');dock.style.cssText='position:fixed;z-index:86;left:'+q.left+'px;top:'+q.top+'px;width:'+q.width+'px;height:'+q.height+'px';}
    else if(slot){var r=slot.getBoundingClientRect();dock.classList.remove('mini');dock.style.cssText='left:'+(r.left+scrollX)+'px;top:'+(r.top+scrollY)+'px;width:'+r.width+'px;height:'+r.height+'px';slot.classList.add('docked-here');}
    else{dock.classList.add('mini');dock.style.cssText='';}
  }
  addEventListener('resize',placeDock);
  var ytTitle='Mix';
  function ytShow(){
    lcdT.textContent=ytTitle+' — YouTube';
    if(!current||current.yt!==ytId){var m=CAT.filter(function(x){return x.yt===ytId})[0];setCurrent(Object.assign({src:'yt',kind:'mix',yt:ytId,title:ytTitle,label:'Mix',img:'https://i.ytimg.com/vi/'+ytId+'/maxresdefault.jpg'},m||{}));}
    ext.href='https://www.youtube.com/watch?v='+ytId;ext.textContent='YouTube ↗';window.SG_NOPULSE=true;
  }
  function ytTick(){if(!yt||!yt.getCurrentTime)return;var p=yt.getCurrentTime()*1000,d=(yt.getDuration&&yt.getDuration()*1000)||0;setProg(p,d);markCue(p/1000);}
  function playMix(id,at){
    if(src==='sc'&&widget)widget.pause();if(src==='sp')spPause();
    var tEl=document.getElementById('fm-t'),mm=CAT.filter(function(x){return x.yt===id})[0];if(mm)ytTitle=mm.title;else if(tEl)ytTitle=tEl.textContent;
    src='yt';ytId=id;ytShow();lcdS.textContent='Load';setProg(0,0);stalled();
    ensureDock();dock.classList.add('on');placeDock();
    ytReady(function(){
      if(!yt){
        yt=new YT.Player(dock.querySelector('.yt-el'),{videoId:id,host:'https://www.youtube-nocookie.com',width:'100%',height:'100%',
          playerVars:{autoplay:1,playsinline:1,rel:0,modestbranding:1,start:at||0},
          events:{
            onReady:function(){if(yt.setVolume)yt.setVolume(vol);yt.playVideo();},
            onStateChange:function(e){
              if(e.data===YT.PlayerState.PLAYING){if(src!=='yt'){yt.pauseVideo();return;}clearTimeout(stallT);if(lastStarted!==ytId){lastStarted=ytId;track('mix-play',ytTitle);}setState(true);ytShow();clearInterval(ytTimer);ytTimer=setInterval(ytTick,500);}
              else if(e.data===YT.PlayerState.PAUSED||e.data===YT.PlayerState.ENDED){if(src==='yt')setState(false);clearInterval(ytTimer);ytTick();}
            }}});
      }else{if(yt.getVideoData&&yt.getVideoData().video_id===id){if(at!=null)yt.seekTo(at,true);yt.playVideo();}else yt.loadVideoById({videoId:id,startSeconds:at||0});}
    });
  }
  function ytPause(){if(yt&&yt.pauseVideo)yt.pauseVideo();}
  function ytStop(){if(yt&&yt.stopVideo)yt.stopVideo();if(dock){dock.classList.remove('on','mini');}document.querySelectorAll('.fm-slot').forEach(function(s){s.classList.remove('docked-here')});if(src==='yt'){src=null;setState(false);lcdT.textContent='Sophia Guerrero — press play';setProg(0,0);window.SG_NOPULSE=false;}}
  function markCue(sec){
    var cues=[].slice.call(document.querySelectorAll('.cue')),on=null;
    cues.forEach(function(c){if(+c.dataset.t<=sec)on=c;});
    cues.forEach(function(c){c.classList.toggle('on',c===on&&src==='yt');});
  }

  /* Spotify: plays inside Play mode only, through Spotify's official embed (visible, no volume API) */
  var sp=null,spApi=null,spWait=[],spItem=null,spPaused=true;
  function spReady(cb){if(spApi)return cb(spApi);spWait.push(cb);if(spWait.length>1)return;window.onSpotifyIframeApiReady=function(API){spApi=API;spWait.splice(0).forEach(function(f){f(API)});};loadScript('https://open.spotify.com/embed/iframe-api/v1',function(){});}
  function spPause(){if(sp&&!spPaused&&sp.pause)sp.pause();}
  function playSpotify(item){
    var slot=document.getElementById('pm-sp-slot');if(!slot)return false;
    if(src==='sc'&&widget)widget.pause();if(src==='yt')ytPause();
    src='sp';spItem=item;lcdT.textContent=item.title+' — '+item.label+' (Spotify)';ext.href='https://open.spotify.com/album/'+item.sp;ext.textContent='Spotify ↗';
    window.SG_BPM=item.bpm||124;window.SG_NOPULSE=false;setCurrent(Object.assign({src:'sp'},item));lcdS.textContent='Load';setProg(0,0);stalled();
    spReady(function(API){
      var uri='spotify:album:'+item.sp;
      if(!sp){var el=document.createElement('div');slot.innerHTML='';slot.appendChild(el);
        API.createController(el,{uri:uri,width:'100%',height:152},function(c){sp=c;
          c.addListener('ready',function(){if(src==='sp')c.play();});
          c.addListener('playback_update',function(e){if(src!=='sp')return;var d=e.data||{};spPaused=!!d.isPaused;setProg(d.position||0,d.duration||0);
            if(!d.isPaused&&!playing){clearTimeout(stallT);if(lastStarted!==item.sp){lastStarted=item.sp;track('player-start',spItem.title+' (Spotify)');}setState(true);}else if(d.isPaused&&playing&&src==='sp')setState(false);});
        });
      }else{sp.loadUri(uri);setTimeout(function(){if(src==='sp')sp.play();},400);}
    });
    return true;
  }
  function playItem(it){
    if(!it)return;
    if(it.sc){var i=indexOfUrl(it.sc);if(src==='sc'&&widget&&qi===i){widget.isPaused(function(p){p?widget.play():widget.pause();});return;}playRelease(i);}
    else if(it.yt){playMix(it.yt);}
    else if(it.sp){playSpotify(it);}
  }
  function stepAll(d){var i=-1;for(var k=0;k<ALL.length;k++){var a=ALL[k];if(current&&((a.sc&&a.sc===current.sc)||(a.sp&&a.sp===current.sp&&!a.sc)||(a.yt&&a.yt===current.yt)))i=k;}
    var n=ALL.length;for(var j=1;j<=n;j++){var c=ALL[((i+d*j)%n+n)%n];if(c.sc||c.yt||(c.sp&&document.getElementById('pm-sp-slot')&&window.SG_PM_OPEN)){playItem(c);return;}}}
  function setVolume(v){vol=Math.max(0,Math.min(100,Math.round(v)));try{localStorage.setItem('sgVol',String(vol))}catch(e){}if(widget)widget.setVolume(vol);if(yt&&yt.setVolume)yt.setVolume(vol);emit();}

  /* shared controls */
  function toggle(){
    if(src==='sp'&&sp){sp.togglePlay();return;}
    if(src==='yt'&&yt){yt.getPlayerState&&yt.getPlayerState()===YT.PlayerState.PLAYING?yt.pauseVideo():yt.playVideo();return;}
    if(src==='sc'&&widget){widget.isPaused(function(p){p?widget.play():widget.pause();});return;}
    playRelease(0);
  }
  function next(){
    if(window.SG_PM_OPEN){stepAll(1);return;}
    if(src==='yt'&&yt&&yt.getCurrentTime){var t=yt.getCurrentTime(),c=[].slice.call(document.querySelectorAll('.cue')).map(function(x){return +x.dataset.t}).filter(function(x){return x>t+1});if(c.length)yt.seekTo(c[0],true);return;}
    playRelease(src==='sc'?qi+1:0);
  }
  function prev(){
    if(window.SG_PM_OPEN&&!(src==='sc'&&posMs>4000)){stepAll(-1);return;}
    if(src==='yt'&&yt&&yt.getCurrentTime){var t=yt.getCurrentTime(),c=[].slice.call(document.querySelectorAll('.cue')).map(function(x){return +x.dataset.t}).filter(function(x){return x<t-4});yt.seekTo(c.length?c[c.length-1]:0,true);return;}
    if(src==='sc'&&widget&&posMs>4000){widget.seekTo(0);return;}
    playRelease(src==='sc'?qi-1:0);
  }
  pp.addEventListener('click',toggle);
  deck.querySelector('.prev').addEventListener('click',prev);
  deck.querySelector('.next').addEventListener('click',next);
  function seekFrac(f){f=Math.max(0,Math.min(1,f));if(src==='sp'&&sp&&durMs){sp.seek(f*durMs/1000);return;}if(src==='sc'&&widget&&durMs)widget.seekTo(f*durMs);else if(src==='yt'&&yt&&yt.getDuration)yt.seekTo(f*yt.getDuration(),true);}
  if(prog){
    prog.addEventListener('click',function(e){var r=prog.getBoundingClientRect();seekFrac((e.clientX-r.left)/r.width);});
    prog.addEventListener('keydown',function(e){var step=e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0;if(!step||!durMs)return;e.preventDefault();seekFrac((posMs+step*10000)/durMs);});
  }
  document.addEventListener('click',function(e){
    var b=e.target.closest('[data-play],[data-queue],[data-yt-play],.cue');if(!b)return;
    if(b.matches('.cue')){var fid=(document.querySelector('[data-yt-play]')||{}).dataset;if(src==='yt'&&yt&&yt.seekTo){yt.seekTo(+b.dataset.t,true);yt.playVideo();}else if(fid)playMix(fid.ytPlay,+b.dataset.t);return;}
    e.preventDefault();
    if(b.hasAttribute('data-yt-play')){var id=b.dataset.ytPlay;if(src==='yt'&&ytId===id&&playing){ytPause();return;}if(src==='yt'&&ytId===id&&yt){yt.playVideo();return;}playMix(id);return;}
    if(b.hasAttribute('data-queue')){playRelease(0);return;}
    var url=b.dataset.play||(QUEUE[0]&&QUEUE[0].sc),i=indexOfUrl(url);
    if(src==='sc'&&widget&&qi===i){widget.isPaused(function(p){p?widget.play():widget.pause();});return;}
    playRelease(i);
  });
  window.SGDeck={items:ALL,current:function(){return current},playing:function(){return playing},source:function(){return src},
    playItem:playItem,toggle:toggle,next:next,prev:prev,seekFrac:seekFrac,setVolume:setVolume,getVolume:function(){return vol},
    volumeSupported:function(){return src!=='sp'},position:function(){return [posMs,durMs]},placeDock:placeDock,
    leavePlayMode:function(){if(src==='sp')spPause();placeDock();},fmt:fmt,track:track};
  if(/[?&]play\b/.test(location.search)){lcdT.textContent='Press play to start';pp.focus({preventScroll:true});}

  /* ---------- page swaps keep the deck playing ---------- */
  var PAGES=new RegExp('^'+B.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'/(play|music|mixes|press|book)?/?$');
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
      init(nm);placeDock();markNow();
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
    if(window.SGClock)window.SGClock();
    if(root.querySelector&&root.querySelector('.play-page')){var go=function(){if(window.SGPlay)window.SGPlay.open();};if(window.SGPlay)setTimeout(go,60);else document.addEventListener('DOMContentLoaded',function(){setTimeout(go,60)});}

    var tc=location.hash.match(/^#cue-(\d+)$/);
    if(tc){var c=root.querySelector('#cue-'+tc[1]);if(c){c.classList.add('target');setTimeout(function(){c.scrollIntoView({block:'center'})},60);}}
    /* record library */
    var lib=root.querySelector('.records');
    if(lib){
      var f=root.querySelector('.filters'),sel=root.querySelector('.lib-sort select'),seg=root.querySelector('.seg[aria-label="View"]');
      var view='crate';try{view=localStorage.getItem('sgView')||'crate'}catch(e){}
      function setView(v){lib.dataset.view=v;seg.querySelectorAll('button').forEach(function(x){x.setAttribute('aria-pressed',String(x.dataset.view===v))});try{localStorage.setItem('sgView',v)}catch(e){}}
      setView(view);
      seg.addEventListener('click',function(e){var b=e.target.closest('button');if(b)setView(b.dataset.view);});
      f.addEventListener('click',function(e){
        var b=e.target.closest('button');if(!b)return;
        f.querySelectorAll('button').forEach(function(x){x.setAttribute('aria-pressed',String(x===b))});
        var lab=b.dataset.label,n=0;
        lib.querySelectorAll('.rec').forEach(function(it){var show=!lab||it.dataset.label===lab;it.hidden=!show;if(show)n++;});
        say(n+' releases shown');
      });
      sel.addEventListener('change',function(){
        var k=sel.value,items=[].slice.call(lib.children);
        items.sort(function(a,b){
          if(k==='date')return b.dataset.date.localeCompare(a.dataset.date);
          if(k==='date-asc')return a.dataset.date.localeCompare(b.dataset.date);
          if(k==='bpm')return (+b.dataset.bpm)-(+a.dataset.bpm)||b.dataset.date.localeCompare(a.dataset.date);
          return a.dataset.title.localeCompare(b.dataset.title);
        });
        items.forEach(function(x){lib.appendChild(x)});say('Sorted by '+sel.options[sel.selectedIndex].text);
      });
      /* sleeve view */
      var dlg=root.querySelector('dialog.sleeve-view'),opener=null;
      function esc(t){var d=document.createElement('div');d.textContent=t;return d.innerHTML;}
      lib.addEventListener('click',function(e){
        var b=e.target.closest('.rec-open');if(!b||!dlg||!dlg.showModal)return;opener=b;
        var r=JSON.parse(b.parentNode.querySelector('.rec-data').textContent);
        dlg.querySelector('.sv-art img').src=r.img;dlg.querySelector('.sv-art img').alt=r.title+' cover art';
        dlg.querySelector('.sv-no').textContent='No. '+('0'+r.no).slice(-2)+' · '+r.label;
        dlg.querySelector('.sv-title').innerHTML=esc(r.title)+(r.feat?'<small>'+esc(r.feat)+'</small>':'');
        dlg.querySelector('.sv-label').textContent=r.label;dlg.querySelector('.sv-date').textContent=r.date;
        dlg.querySelector('.sv-bpm').textContent=r.bpm;dlg.querySelector('.sv-key').textContent=r.key;
        var L=dlg.querySelector('.sv-listen');
        if(r.upcoming){L.innerHTML='<p class="kicker" style="color:var(--acid)">Out '+esc(r.date)+'</p><a class="btn solid" href="'+r.bp+'" target="_blank" rel="noopener">Pre-order on Beatport ↗</a><p class="note">Listening links arrive on release day.</p>';}
        else if(r.sc){L.innerHTML='<button class="btn play" type="button" data-play="'+r.sc+'">▶ Play in the player bar</button><p class="note">Plays from SoundCloud and keeps going while you browse.</p>';}
        else{L.innerHTML='<iframe title="'+esc(r.title)+' on Spotify" src="https://open.spotify.com/embed/album/'+r.sp+'?theme=0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe><p class="note">Plays here through Spotify. Without a Spotify login you may hear a 30-second preview.</p>';}
        var links=[['Beatport',r.bp]];if(r.tx)links.push(['Traxsource',r.tx]);if(r.sp)links.push(['Spotify','https://open.spotify.com/album/'+r.sp]);if(r.sc)links.push(['SoundCloud',r.sc]);
        dlg.querySelector('.sv-links').innerHTML=links.map(function(l){return '<a class="btn" href="'+l[1]+'" target="_blank" rel="noopener" data-track="release-link" data-label="'+esc(r.title)+' - '+l[0]+'">'+l[0]+' ↗</a>'}).join('');
        var pl=dlg.querySelector('.sv-played');if(pl)pl.innerHTML=(r.played&&r.played.length)?'Heard in the '+r.played.map(function(p){return '<a href="'+B+'/mixes/#cue-'+p.s+'" data-track="release-to-mix" data-label="'+esc(r.title)+'">'+esc(p.mix)+' at '+p.t+' →</a>'}).join(', '):'';
        if(history.replaceState)history.replaceState(null,'','#rel-'+r.slug);
        dlg.showModal();
      });
      var deep=location.hash.match(/^#rel-([a-z0-9-]+)$/);
      if(deep){var tgt=root.querySelector('#rel-'+deep[1]+' .rec-open');if(tgt)setTimeout(function(){tgt.scrollIntoView({block:'center'});tgt.click();},60);}
      if(dlg){
        dlg.addEventListener('close',function(){dlg.querySelector('.sv-listen').innerHTML='';if(location.hash.indexOf('#rel-')===0&&history.replaceState)history.replaceState(null,'',location.pathname);if(opener)opener.focus();});
        dlg.addEventListener('click',function(e){var a=e.target.closest('a[href*="/mixes/#cue-"]');if(a)dlg.close();});
        dlg.addEventListener('click',function(e){if(e.target===dlg)dlg.close();if(e.target.closest('[data-play]'))setTimeout(function(){dlg.close()},150);});
      }
    }
  }

  /* ---------- A · tune-in gate (first home visit this session) ---------- */
  var mast=document.querySelector('.mast');
  function mastH(){document.documentElement.style.setProperty('--mast-h',mast.offsetHeight+'px');}
  mastH();addEventListener('resize',mastH);
  var gate=document.querySelector('.gate'),seen=false;
  try{seen=localStorage.getItem('sgIn')==='1'||sessionStorage.getItem('sgIn')==='1'}catch(e){}
  var fromSite=false;try{fromSite=!!document.referrer&&new URL(document.referrer).host===location.host}catch(e){}
  if(gate&&!seen&&!fromSite&&!/[?&]play\b/.test(location.search)&&!location.hash){
    document.body.classList.add('gated');
    var gi=gate.querySelector('.gate-in');
    function openGate(){
      try{localStorage.setItem('sgIn','1')}catch(e){}try{sessionStorage.setItem('sgIn','1')}catch(e){}
      document.body.classList.add('gate-open');
      setTimeout(function(){document.body.classList.remove('gated','gate-open');var h1=document.getElementById('cover-title');if(h1){h1.setAttribute('tabindex','-1');h1.focus({preventScroll:true});}},reduce?0:950);
    }
    gi.addEventListener('click',openGate);
    gate.querySelector('.gate-quiet').addEventListener('click',openGate);
    document.addEventListener('keydown',function g(e){if(!document.body.classList.contains('gated')){document.removeEventListener('keydown',g);return;}if(e.key==='Escape'||e.key==='ArrowDown'||e.key==='PageDown'||e.key==='End'){openGate();document.removeEventListener('keydown',g);}});
    /* never trap the page: a swipe or scroll on the welcome screen simply enters the site (without sound) */
    var gy=null;
    var swipe=function(e){if(!document.body.classList.contains('gated'))return off();
      if(e.type==='wheel'){if(Math.abs(e.deltaY)>4){openGate();off();}return;}
      var t=e.touches&&e.touches[0];if(!t)return;if(e.type==='touchstart'){gy=t.clientY;return;}
      if(gy!=null&&Math.abs(t.clientY-gy)>24){openGate();off();}};
    var off=function(){removeEventListener('wheel',swipe);removeEventListener('touchstart',swipe);removeEventListener('touchmove',swipe);};
    addEventListener('wheel',swipe,{passive:true});addEventListener('touchstart',swipe,{passive:true});addEventListener('touchmove',swipe,{passive:true});
  }
  /* ---------- Manila clock: the site keeps Manila time ----------
     The light and accent follow the hour in Manila (dusk, night, after hours, sunrise, daytime),
     and the home running order marks the slot that's on now. Colour only; nothing extra moves. */
  /* preview: ?at=HH:MM shows the site at that Manila time (for checking the looks) */
  var AT=(location.search.match(/[?&]at=(\d{1,2}):?(\d{2})/)||null);
  if(AT)AT=('0'+Math.min(23,+AT[1])).slice(-2)+':'+AT[2];
  function manilaTime(){if(AT)return AT;try{return new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Manila',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date());}catch(e){return '';}}
  var PAL={day:{lav:[.80,.78,.86],vio:[.40,.38,.52],acid:[.84,.95,.42]},dusk:{lav:[.92,.76,.80],vio:[.55,.33,.45],acid:[1,.54,.36]},
    night:{lav:[.784,.749,.863],vio:[.42,.357,.549],acid:[.784,.941,.235]},after:{lav:[.70,.66,.95],vio:[.36,.28,.62],acid:[.76,.61,1]},
    sunrise:{lav:[.95,.82,.80],vio:[.58,.42,.50],acid:[1,.76,.48]}};
  function phaseOf(h){if(h>=4&&h<6)return['sunrise','sunrise'];if(h>=6&&h<16)return['day','daytime'];if(h>=16&&h<19)return['dusk','dusk'];if(h>=19)return['night','night'];return['after','after hours'];}
  function clock(){
    var t=manilaTime();if(!t)return;var hm=t.split(':'),h=+hm[0]+(+hm[1])/60,p=phaseOf(h);
    if(document.documentElement.getAttribute('data-phase')!==p[0])document.documentElement.setAttribute('data-phase',p[0]);
    window.SG_PAL=PAL[p[0]];
    document.querySelectorAll('.mnl').forEach(function(el){el.textContent='Manila · '+t+' · '+p[1];});
  }
  window.SGClock=clock;clock();setInterval(clock,30000);

    /* ---------- calm mode: no pulsing or flashing light (remembered) ---------- */
  var calmOn=false;try{calmOn=localStorage.getItem('sgCalm')==='1'}catch(e){}
  function setCalm(on){
    calmOn=on;window.SG_CALM=on;document.body.classList.toggle('calm',on);
    document.querySelectorAll('button.calm').forEach(function(b){b.setAttribute('aria-pressed',String(on));});
    try{localStorage.setItem('sgCalm',on?'1':'0')}catch(e){}
  }
  setCalm(calmOn||reduce);
  document.addEventListener('click',function(e){var b=e.target.closest('button.calm');if(b){setCalm(!calmOn);say(calmOn?'Calm mode on: no flashing light':'Calm mode off');}});
  document.addEventListener('keydown',function(e){if((e.key==='c'||e.key==='C')&&!e.metaKey&&!e.ctrlKey&&!/input|textarea|select/i.test(e.target.tagName||'')){setCalm(!calmOn);say(calmOn?'Calm mode on':'Calm mode off');}});

  window.SG_BPM=124;

  /* ---------- E · keyboard ---------- */
  var kbd=document.querySelector('dialog.kbd');
  document.addEventListener('keydown',function(e){
    if(e.metaKey||e.ctrlKey||e.altKey)return;
    var tag=(e.target.tagName||'').toLowerCase();if(/input|textarea|select/.test(tag)||e.target.isContentEditable)return;
    if(e.key===' '&&!/button|a|summary/.test(tag)){e.preventDefault();toggle();}
    else if(e.key==='n'||e.key==='N'){next();}
    else if(e.key==='b'||e.key==='B'){prev();}
    else if(e.key==='?'&&kbd&&kbd.showModal){kbd.showModal();}
  });
  document.addEventListener('click',function(e){if(e.target.closest('.kbd-open')&&kbd&&kbd.showModal)kbd.showModal();});


  init(document);
  setCurrent(location.pathname);
})();
