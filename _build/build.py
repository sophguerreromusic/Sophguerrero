#!/usr/bin/env python3
"""Build the redesigned sophguerrero.com pages.
Content (releases, links, bio, press, schema) is read from the ORIGINAL index.html
so nothing is retyped by hand. Usage: build.py <original index.html> <site dir>"""
import html, json, re, sys, pathlib

SRC, OUT = sys.argv[1], pathlib.Path(sys.argv[2])
PREFIX = sys.argv[3] if len(sys.argv) > 3 else ""  # e.g. /v2 for a hidden preview copy
raw = open(SRC, encoding='utf-8').read()
BASE = 'https://sophguerrero.com'
esc = html.escape

# ---------- extract existing content ----------
person = json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>', raw, re.S).group(1))
releases = []
for m in re.finditer(r'<article class="rel">(.*?)</article>', raw, re.S):
    a = m.group(1)
    img = re.search(r'<img src="([^"]+)"', a).group(1)
    full = html.unescape(re.search(r'<h3>(.*?)</h3>', a).group(1))
    p = re.search(r'<p>(.*?) · <a href="([^"]+)"[^>]*>Beatport ↗</a> · <a href="([^"]+)"', a)
    title = full.split(' — ', 1)[1]
    feat = ''
    if ' feat. ' in title:
        title, feat = title.split(' feat. ', 1); feat = 'feat. ' + feat
    releases.append(dict(title=title, feat=feat, label=html.unescape(p.group(1)), bp=p.group(2), tx=p.group(3), img=img))
assert len(releases) == 13, len(releases)
N = len(releases)
for i, r in enumerate(releases): r['no'] = N - i  # newest = highest issue number

def section(id_):
    return re.search(r'<section class="panel" id="%s".*?</section>' % id_, raw, re.S).group(0)
info = section('info'); press = section('press'); tour = section('tour'); mixes = section('mixes'); rel_sec = section('releases')
bio = [html.unescape(re.sub(r'<[^>]+>', '', x)) for x in re.findall(r'<p>(.*?)</p>', info, re.S)]
press_rows = [(html.unescape(t), html.unescape(m)) for t, m in re.findall(r'<span class="t">(.*?)</span><span class="m">(.*?)</span>', press)]
supporters = [html.unescape(x) for x in re.findall(r'<span class="chip">(.*?)</span>', press)]
venues = [html.unescape(x) for x in re.findall(r'<span class="chip">(.*?)</span>', tour)]
labels = [html.unescape(x) for x in re.findall(r'<span class="chip">(.*?)</span>', rel_sec)]
rel_btns = re.findall(r'<a class="btn" href="([^"]+)"[^>]*>(.*?)</a>', rel_sec)
follow = [(h, html.unescape(t)) for h, t in re.findall(r'<a href="([^"]+)" target="_blank" rel="noopener">([^<]+)</a>', re.search(r'<div class="foot">(.*?)</div>', raw, re.S).group(1))]
info_follow = [(h, html.unescape(t)) for h, t in re.findall(r'<a class="chip" href="([^"]+)"[^>]*>(.*?)</a>', info)]
yt_embed = re.search(r'<iframe class="player"[^>]*src="(https://www.youtube-nocookie[^"]+)"', mixes).group(1)
mix_btns = re.findall(r'<a class="btn" href="([^"]+)"[^>]*>(.*?)</a>', mixes)
email = re.search(r'mailto:([^"]+)"', info).group(1)
nowout = re.search(r'<a class="nowout" href="([^"]+)"', raw).group(1)
desc_home = re.search(r'<meta name="description" content="([^"]+)"', raw).group(1)
og_desc = re.search(r'<meta property="og:description" content="([^"]+)"', raw).group(1)

import hashlib
VER = hashlib.sha1((OUT / 'assets/site.css').read_bytes() + (OUT / 'assets/site.js').read_bytes() + (OUT / 'assets/glow.js').read_bytes() + (OUT / 'assets/play.js').read_bytes()).hexdigest()[:8]
HERO = '/assets/img/sophia-guerrero-dj-manila'
OG = BASE + '/assets/img/og-sophia-guerrero.jpg'
person['image'] = BASE + HERO + '-1080.jpg'

SPARK = '<svg class="spark" viewBox="-50 -50 100 100" aria-hidden="true"><path d="M0,-48 C4,-14 14,-4 48,0 C14,4 4,14 0,48 C-4,14 -14,4 -48,0 C-14,-4 -4,-14 0,-48 Z" fill="currentColor"/></svg>'
EXT = ' target="_blank" rel="noopener"'
NAV = [('/play/', '00', 'Play'), ('/music/', '01', 'Music'), ('/mixes/', '02', 'Mixes'), ('/press/', '03', 'Press'), ('/book/', '04', 'Book')]

CATALOG_JSON = '[]'
ANALYTICS = None
def page(slug, path, title, desc, body, extra_ld=None, og_title=None):
    url = BASE + path
    lds = [json.dumps(person, ensure_ascii=False, indent=1)]
    page_ld = json.dumps(extra_ld, ensure_ascii=False) if extra_ld else '{}'
    nav = ''.join(f'<li><a href="{h}"{" aria-current=\"page\"" if h == path else ""}><span class="n">{n}</span>{t}</a></li>' for h, n, t in NAV)
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
<link rel="canonical" href="{url}">
<meta name="theme-color" content="#121115">{'<meta name="robots" content="noindex">' if (PREFIX or slug == 'lost') else ''}
<meta property="og:type" content="profile">
<meta property="og:title" content="{esc(og_title or title)}">
<meta property="og:description" content="{esc(og_desc)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{OG}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/assets/spark.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<meta name="apple-mobile-web-app-title" content="Sophia Guerrero">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Familjen+Grotesk:wght@400;500;700&family=Instrument+Serif:ital@0;1&family=Inter+Tight:wght@400;500;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/site.css?v={VER}">
<script type="application/ld+json">
{lds[0]}
</script>
<script type="application/ld+json" id="page-ld">{page_ld}</script>
</head>
<body data-page="{slug}" data-base="{PREFIX}"{(' data-gc="'+ANALYTICS+'"') if (ANALYTICS and not PREFIX) else ''}>
<a class="skip" href="#main">Skip to content</a>
<header class="mast">
  <a class="logo" href="/" aria-label="Sophia Guerrero, home">{SPARK}<span>Sophia Guerrero</span></a>
  <div class="right"><nav aria-label="Main"><ul>{nav}</ul></nav><a class="bookbtn" href="/book/">Book Sophia</a></div>
</header>
<main id="main" tabindex="-1">
{body}
</main>
<footer class="foot">
  <span>Sophia Guerrero · House ✦ Tech House · Manila</span>
  <span><a href="mailto:{email}">{email}</a></span>
  <button type="button" class="kbd-open">Shortcuts ✦</button>
</footer>
<div class="deck" role="region" aria-label="Music player">
  <button class="prev" type="button" aria-label="Previous track"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 2h2v12H3zM14 2L6 8l8 6z" fill="currentColor"/></svg></button>
  <button class="pp" type="button" aria-label="Play"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2l10 6-10 6z" fill="currentColor"/></svg></button>
  <div class="lcd"><span class="st">Ready</span><span class="tt">Sophia Guerrero — press play</span><span class="tm">0:00</span><span class="prog" role="slider" tabindex="0" aria-label="Seek" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i></i></span></div>
  <span class="nx-wrap"><button class="next" type="button" aria-label="Next track"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M11 2h2v12h-2zM2 2l8 6-8 6z" fill="currentColor"/></svg></button>
  <button class="tap" type="button" aria-label="Tap tempo: tap in time and the light follows">✦</button>
  <button class="calm" type="button" aria-pressed="false" title="Calm mode: no pulsing or flashing light">Calm</button>
  <button class="pm-open" type="button" aria-haspopup="dialog" title="Open Play mode">Play mode ⤢</button>
  <a class="ext" href="https://soundcloud.com/sophiaguerrero"{EXT}>SoundCloud ↗</a></span>
  <p class="sr" id="deck-live" aria-live="polite"></p>
</div>
<section class="pm" id="pm" role="dialog" aria-modal="true" aria-labelledby="pm-title" hidden>
  <canvas class="pm-gl" aria-hidden="true"></canvas>
  <div class="pm-grain" aria-hidden="true"></div>
  <header class="pm-top">
    <p class="kicker">Sophia Guerrero · Play</p>
    <div class="pm-actions">
      <button type="button" class="pm-btn pm-display" aria-pressed="false" title="Visual only, for projecting (D)">Display</button>
      <button type="button" class="pm-btn pm-fs" title="Fullscreen (F)">Fullscreen</button>
      <button type="button" class="pm-btn pm-exit" title="Leave Play mode (Esc)">Exit ✕</button>
    </div>
  </header>
  <div class="pm-stage">
    <figure class="pm-art"><img alt="" width="1000" height="1000"><div id="pm-yt-slot" class="pm-slot"></div></figure>
    <div class="pm-meta">
      <p class="kicker pm-no"></p>
      <h2 id="pm-title" class="pm-title">Press play</h2>
      <p class="pm-sub"></p>
      <p class="pm-src"></p>
      <div id="pm-sp-slot" class="pm-sp"></div>
    </div>
  </div>
  <div class="pm-ctrl" role="group" aria-label="Player">
    <button type="button" class="pm-c pm-prev" aria-label="Previous">⏮</button>
    <button type="button" class="pm-c pm-pp" aria-label="Play">▶</button>
    <button type="button" class="pm-c pm-next" aria-label="Next">⏭</button>
    <div class="pm-prog" role="slider" tabindex="0" aria-label="Seek" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i></i></div>
    <span class="pm-time">0:00</span>
    <label class="pm-vol"><span class="sr">Volume</span><span aria-hidden="true">Vol</span><input type="range" min="0" max="100" step="1" value="80"></label>
  </div>
  <nav class="pm-list" aria-label="Choose a track"><ol></ol></nav>
  <p class="pm-note">Calm mode (C) stops pulsing.</p>
  <p class="pm-caption" aria-hidden="true"></p>
  <button type="button" class="pm-btn pm-reveal">Show controls</button>
</section>
<div class="afterhours" hidden aria-hidden="true"><p class="kicker">After hours · Manila</p><p class="ah-time">--:--</p><p class="kicker">Move to come back in</p></div>
<dialog class="kbd" aria-labelledby="kbd-t">
  <h2 id="kbd-t" class="kicker">Shortcuts</h2>
  <dl><dt>Space</dt><dd>Play / pause</dd><dt>N</dt><dd>Next track</dd><dt>B</dt><dd>Previous track</dd><dt>✦ in the player</dt><dd>Tap in time, the light follows your tempo</dd><dt>C</dt><dd>Calm mode: no pulsing or flashing light</dd><dt>Leave it idle</dt><dd>See what happens after hours</dd></dl>
  <form method="dialog"><button class="btn" type="submit">Close</button></form>
</dialog>
<script type="application/json" id="catalog">{CATALOG_JSON}</script>
<script src="/assets/site.js?v={VER}" defer></script>
<script src="/assets/glow.js?v={VER}" defer></script>
<script src="/assets/play.js?v={VER}" defer></script>
</body>
</html>
'''

def follow_links(items):
    return ''.join(f'<a href="{h}"{EXT}>{esc(t)}</a>' for h, t in items)

# ---------- HOME ----------
latest = releases[0]
home = f'''<section class="gate" aria-label="Welcome">
  <p class="kicker gate-top"><span>Issue No. {latest["no"]:02d}</span><span class="mnl">Manila</span></p>
  <p class="gate-name" aria-hidden="true">Sophia<br><em>Guerrero</em></p>
  <p class="tagline">House <b>✦</b> Tech House</p>
  <div class="gate-act">
    <button class="btn play gate-in" type="button" data-play="">▶ Tune in</button>
    <button class="gate-quiet" type="button">Enter without sound</button>
  </div>
  <button class="calm gate-calm" type="button" aria-pressed="false">Calm mode · no flashing light</button>
</section>
<section class="cover-story" aria-labelledby="cover-title">
  <figure class="torch">
    <picture>
      <source type="image/webp" srcset="{HERO}-640.webp 640w, {HERO}-1080.webp 1080w, {HERO}-1600.webp 1600w" sizes="(max-width:860px) 100vw, 45vw">
      <img src="{HERO}-1080.jpg" width="1080" height="1620" alt="Sophia Guerrero, House and Tech House DJ from Manila" fetchpriority="high" decoding="async">
    </picture>
    <figcaption>Manila · after hours</figcaption>
  </figure>
  <div class="cover-copy">
    <div class="issue-line kicker"><span>Issue No. {latest["no"]:02d}</span><span>House ✦ Tech House</span><span>Manila, PH</span></div>
    <div>
      <h1 id="cover-title">Sophia<br><em>Guerrero</em></h1>
      <p class="tagline">House <b>✦</b> Tech House</p>
    </div>
    <article class="feature" aria-label="New release">
      <img src="{latest["img"]}" width="96" height="96" alt="{esc(latest["title"])} cover art" decoding="async">
      <div>
        <p class="kicker">New · out now on {esc(latest["label"])}</p>
        <p class="t">{esc(latest["title"])}</p>
        <div class="btns">
          <button class="btn play" type="button" data-play="" aria-pressed="false">▶ Listen</button>
          <a class="btn" href="{nowout}"{EXT}>Beatport ↗</a>
        </div>
      </div>
    </article>
    <nav aria-label="Contents">
      <p class="kicker" style="margin-bottom:8px">Contents</p>
      <ol class="contents">
        <li><a href="/music/"><span class="n">01</span><span class="t">Music</span><span class="d">{N} releases</span></a></li>
        <li><a href="/mixes/"><span class="n">02</span><span class="t">Mixes</span><span class="d">Sounds Good · monthly</span></a></li>
        <li><a href="/press/"><span class="n">03</span><span class="t">Press</span><span class="d">BBC Radio 1</span></a></li>
        <li><a href="/book/"><span class="n">04</span><span class="t">Book</span><span class="d">Bookings &amp; enquiries</span></a></li>
      </ol>
    </nav>
    <div class="follow" aria-label="Follow">{follow_links(follow)}</div>
  </div>
</section>'''

# ---------- MUSIC: record library ----------
# Real data, read 14 Nov 2026 from Beatport (date, BPM, key), SoundCloud (track URLs) and Spotify (album IDs).
CATALOG = {
 'Habit':                 ('2026-10-16', 128, 'A min',  'habit-extended-mix',            '3eAUas65bbWHqpK37soLsd'),
 'The Funk':              ('2026-09-04', 128, 'G♭ maj', 'the-funk-extended-mix',         '4kgLHt4U78fDwCBHFW4SX3'),
 'Lights Flash':          ('2026-07-31', 128, 'F min',  None,                            '2L938GQRIVL2uSlxTZTI9y'),
 'Are You Ready?':        ('2026-07-03', 129, 'F maj',  None,                            '0FYthN7eDgYx30KmhufGW7'),
 'I Am Telling You':      ('2026-04-10', 128, 'E♭ min', 'i-am-telling-you',              '6M1Qmk7iIJpBKDtQv577vq'),
 "It's a Baby":           ('2026-02-27', 127, 'C min',  None,                            '4TkmCtWzGqpI2hnWdF1FJX'),
 'Gonna Be The One':      ('2026-01-30', 127, 'C min',  'gonna-be-the-one-extended-mix', '3FK8CmjH1j84qX4vgw3vyT'),
 'I Need You':            ('2025-12-19', 126, 'E maj',  'i-need-you',                    '3cZF1ar1xX8wmATAFPEq32'),
 'Playing With My Heart': ('2025-10-17', 126, 'D♭ maj', None,                            '6T1V1QLlZikfprzhmxO6Xv'),
 'I Know':                ('2025-09-05', 127, 'A min',  'i-know-extended-mix',           '0A2xrqWF3Pc2ZjaGUew67k'),
 'Body Move':             ('2025-07-25', 126, 'E min',  'body-move-extended-mix-feat',   '5s8QRKX9HB8BYO8FyEuS7r'),
 'Find The Light':        ('2025-05-30', 126, 'C min',  None,                            '068iqQh9aNI6jMEPUDjnM6'),
 'Gimme Your Number':     ('2025-01-31', 126, 'F maj',  'gimme-your-number-extended-mix','76RmLNaO2oRlsaHGsRXtpN'),
}
import datetime
for r in releases:
    d, bpm, key, sc, sp = CATALOG[r['title']]
    r.update(date=d, year=d[:4], bpm=bpm, key=key, sp=sp,
             sc=('https://soundcloud.com/sophiaguerrero/' + sc) if sc else '',
             nice=datetime.date.fromisoformat(d).strftime('%d %b %Y'))
# Upcoming release, approved by Sophia 14 Nov 2026 (Beatport pre-order, read 14 Nov).
UPCOMING = [dict(title='All Of It', feat='', label='Wh0 Plays', date='2026-11-27', year='2026', bpm=128, key='C min', sc='', sp='', tx='',
                 bp='https://www.beatport.com/track/all-of-it/31162638',
                 img='https://geo-media.beatport.com/image_size/1000x1000/5a427391-559c-475f-a3f3-6d83dbb649fb.jpg',
                 no=N + 1, nice='27 Nov 2026', upcoming=True)]
library = UPCOMING + releases
label_order = []
for r in library:
    if r['label'] not in label_order: label_order.append(r['label'])
filters = '<button type="button" aria-pressed="true" data-label="">All</button>' + ''.join(
    f'<button type="button" aria-pressed="false" data-label="{esc(l)}">{esc(l)}</button>' for l in label_order)

def rec_row(i, r):
    lazy = '' if i < 4 else ' loading="lazy"'
    feat = f' <small>{esc(r["feat"])}</small>' if r['feat'] else ''
    data = json.dumps(dict(no=r['no'], title=r['title'], feat=r['feat'], label=r['label'], date=r['nice'], bpm=r['bpm'],
                           key=r['key'], img=r['img'], bp=r['bp'], tx=r['tx'], sc=r['sc'], sp=r['sp'], upcoming=r.get('upcoming', False)), ensure_ascii=False)
    via = 'Pre-order' if r.get('upcoming') else ('▶ SoundCloud' if r['sc'] else '▶ Spotify')
    up = ' upcoming' if r.get('upcoming') else ''
    no = '%02d' % r['no']
    return (f'<li class="rec{up}" data-label="{esc(r["label"])}" data-date="{r["date"]}" data-bpm="{r["bpm"]}" data-title="{esc(r["title"])}">\n'
            f'  <button class="rec-open" type="button" aria-haspopup="dialog" aria-label="Open {esc(r["title"])}: {esc(r["label"])}, {r["nice"]}">\n'
            f'    <span class="sleeve"><img src="{r["img"]}" width="1000" height="1000" alt=""{lazy} decoding="async"><span class="no">No. {no}</span>{'<span class="soon">Out 27 Nov</span>' if r.get('upcoming') else ''}</span>\n'
            f'    <span class="rec-t">{esc(r["title"])}{feat}</span><span class="rec-l">{esc(r["label"])}</span>'
            f'<span class="rec-d"><time datetime="{r["date"]}">{r["nice"]}</time></span><span class="rec-b">{r["bpm"]}</span>'
            f'<span class="rec-k">{esc(r["key"])}</span><span class="rec-s">{via}</span>\n'
            f'  </button>\n  <script type="application/json" class="rec-data">{data}</script>\n</li>\n')
rows = ''.join(rec_row(i, r) for i, r in enumerate(library))
store_btns = ''.join(f'<a class="btn" href="{h}"{EXT}>{esc(html.unescape(t))}</a>' for h, t in rel_btns)
label_chips = ''.join(f'<span class="chip">{esc(l)}</span>' for l in labels)
yr = f'{releases[-1]["year"]}–{releases[0]["year"]}'
music = (f'<div class="page library">\n'
 f'  <header class="page-head"><h1>Music</h1><p class="kicker">Record library · {N} releases + 1 upcoming · {yr}</p></header>\n'
 f'  <div class="lib-bar">\n    <div class="filters" role="group" aria-label="Filter by label">{filters}</div>\n'
 f'    <div class="lib-tools">\n'
 f'      <label class="mono lib-sort">Sort <select aria-label="Sort releases"><option value="date">Newest</option><option value="date-asc">Oldest</option><option value="bpm">BPM</option><option value="title">A–Z</option></select></label>\n'
 f'      <div class="seg" role="group" aria-label="View"><button type="button" data-view="crate" aria-pressed="true">Crate</button><button type="button" data-view="list" aria-pressed="false">List</button></div>\n'
 f'      <button class="btn play" type="button" data-queue="">▶ Play all</button>\n    </div>\n  </div>\n'
 f'  <div class="lib-head mono" aria-hidden="true"><span></span><span>Title</span><span>Label</span><span>Released</span><span>BPM</span><span>Key</span><span>Listen</span></div>\n'
 f'  <ol class="records" data-view="crate">\n{rows}  </ol>\n'
 f'  <p class="lib-note">Tap a sleeve to listen. All Of It is out 27 Nov 2026 on Wh0 Plays, on pre-order now. Eight releases play in the player bar from SoundCloud and keep playing while you browse; the other five play through Spotify inside the sleeve. Dates, BPM and keys from Beatport.</p>\n'
 f'  <div class="btns" style="margin-top:28px">{store_btns}</div>\n'
 f'  <h2 class="sec-label">Labels</h2>\n  <div class="chips">{label_chips}</div>\n</div>\n'
 f'<dialog class="sleeve-view" aria-labelledby="sv-title">\n'
 f'  <div class="sv-art"><img alt="" width="1000" height="1000"></div>\n'
 f'  <div class="sv-info">\n    <p class="kicker sv-no"></p>\n    <h2 id="sv-title" class="sv-title"></h2>\n'
 f'    <dl class="sv-meta"><dt>Label</dt><dd class="sv-label"></dd><dt>Released</dt><dd class="sv-date"></dd><dt>BPM</dt><dd class="sv-bpm"></dd><dt>Key</dt><dd class="sv-key"></dd></dl>\n'
 f'    <div class="sv-listen"></div>\n    <div class="btns sv-links"></div>\n  </div>\n'
 f'  <form method="dialog"><button class="sv-close" type="submit" aria-label="Close">✕</button></form>\n</dialog>')
music_ld = {"@context": "https://schema.org", "@type": "ItemList", "name": "Sophia Guerrero releases",
            "itemListElement": [{"@type": "ListItem", "position": i + 1, "item": {"@type": "MusicRecording",
                "name": r['title'] + (' ' + r['feat'] if r['feat'] else ''), "url": r['bp'], "sameAs": [u for u in (r['tx'], r['sc']) if u],
                "datePublished": r['date'], "image": r['img'], "byArtist": {"@type": "Person", "name": "Sophia Guerrero", "url": BASE + '/'}}}
                for i, r in enumerate(releases)]}

# ---------- MIXES: listening room ----------
# Real mix data, read 14 Nov 2026 from the YouTube upload (title, date, description, tracklist).
MIXES = [dict(
    id='UxSzeYTAOZY', title='1 Hour House & Tech House Mix 2026 · Groovy Club Set', date='30 Oct 2026', iso='2026-10-30', length='1:00:00',
    blurb="One hour of groovy, club-ready House & Tech House — my favourite selections from October, plus a few of my own releases: It's A Baby, Lights Flash and The Funk. Turn it up and enjoy!",
    tracks=[('0:00','Toda Encima','Simon Kidzoo & Mellizos'),('3:32','Caravan','Shokë'),('7:02','Talking To You','Jewel Kid'),('9:18','Spring Summer Ball','Cuba'),
            ('11:22','You Treat Me Right','LEFTI'),('12:51','Out Of My Head','Alexander Som'),('15:08','Set It Off','Chris Valencia'),('17:28','Black Night','Milton Shadow'),
            ('19:40','To The Rescue','Edd'),('21:59','Between Us Two','JNJS'),('25:03','Cowboy Killer','Kyle Walker & Nate Katz'),('26:18',"It's A Baby",'Sophia Guerrero'),
            ('27:53','Set Me Free (feat. Robert Courtois)','Nic Fanciulli'),('31:05','The Code','James Greene'),('32:29','Lights Flash','Sophia Guerrero'),('35:05','So Good','Marco Lys & Ben Miller'),
            ('36:47','The Funk','Sophia Guerrero'),('39:20','Esa Chiquita (feat. Blue Mystic)','Jesse Perez'),('41:25','Feel My Body',"Frank'O Moiraghi & Nausica"),('43:54','Q Drop','Mellizos'),
            ('45:52','Danz Danz','Reboot'),('49:06','Midnight Rumours','Dario Nunez & Bubba Brothers'),('51:44','On A Wave','East End Dubs & Jazzy'),('54:34','Leave It Up To You','Jacob Kaye & Saeri'),
            ('57:14','Feel The Rhythm','DJ PP')])]
def secs(ts):
    p = [int(x) for x in ts.split(':')]
    return p[0]*60+p[1] if len(p) == 2 else p[0]*3600+p[1]*60+p[2]
fm = MIXES[0]
def cue(t, n, a):
    own = ' own' if a == 'Sophia Guerrero' else ''
    return f'<li><button type="button" class="cue" data-t="{secs(t)}"><span class="cue-t">{t}</span><span class="cue-n">{esc(n)}</span><span class="cue-a{own}">{esc(a)}</span></button></li>'
tl = ''.join(cue(*x) for x in fm['tracks'])
def arch(m):
    return (f'<li><button type="button" class="arch" data-yt-play="{m["id"]}"><img src="https://i.ytimg.com/vi/{m["id"]}/maxresdefault.jpg" width="1280" height="720" alt="" loading="lazy">'
            f'<span class="arch-t">{esc(m["title"])}</span><span class="kicker">{m["date"]} · {m["length"]} · YouTube</span></button></li>')
archive = ''.join(arch(m) for m in MIXES)
YTW = 'https://www.youtube.com/watch?v=' + fm['id']
SUB = 'https://www.youtube.com/@sophguerrero?sub_confirmation=1'
mixes_page = (f'<div class="page room">\n'
 f'  <header class="page-head"><h1>Mixes</h1><p class="kicker">Listening room</p></header>\n'
 f'  <section class="feature-mix" aria-labelledby="fm-t">\n'
 f'    <div class="fm-stage"><div class="fm-slot" id="yt-slot"><img class="fm-art" src="https://i.ytimg.com/vi/{fm["id"]}/maxresdefault.jpg" width="1280" height="720" alt="Artwork for {esc(fm["title"])}" decoding="async">'
 f'<button class="fm-play" type="button" data-yt-play="{fm["id"]}" aria-label="Play the mix">▶</button></div></div>\n'
 f'    <div class="fm-info">\n      <p class="kicker">Latest mix · {fm["date"]} · {fm["length"]}</p>\n'
 f'      <h2 id="fm-t" class="fm-title">{esc(fm["title"])}</h2>\n      <p class="fm-blurb">{esc(fm["blurb"])}</p>\n'
 f'      <div class="btns"><button class="btn play" type="button" data-yt-play="{fm["id"]}">▶ Play mix</button><a class="btn" href="{YTW}"{EXT}>YouTube ↗</a><a class="btn" href="{SUB}"{EXT}>Subscribe</a></div>\n'
 f'    </div>\n  </section>\n'
 f'  <section class="tracklist" aria-labelledby="tl-t">\n    <h2 id="tl-t" class="sec-label">Tracklist · tap a time to jump there</h2>\n    <ol class="cues">{tl}</ol>\n  </section>\n'
 f'  <section class="series" aria-labelledby="sg-t">\n    <p class="kicker">Monthly series</p>\n    <h2 id="sg-t" class="display series-t">Sounds Good</h2>\n'
 f'    <p class="lede">Sophia Guerrero\'s monthly mix series. New episodes land here as they\'re released.</p>\n'
 f'    <div class="btns"><a class="btn" href="https://soundcloud.com/sophiaguerrero"{EXT}>Follow on SoundCloud ↗</a><a class="btn" href="{SUB}"{EXT}>Subscribe on YouTube ↗</a></div>\n  </section>\n'
 f'  <section aria-labelledby="ar-t">\n    <h2 id="ar-t" class="sec-label">Archive</h2>\n    <ul class="archive">{archive}</ul>\n  </section>\n</div>')
mixes_ld = {"@context": "https://schema.org", "@type": "VideoObject", "name": fm['title'], "description": fm['blurb'],
            "uploadDate": fm['iso'], "duration": "PT1H", "thumbnailUrl": f"https://i.ytimg.com/vi/{fm['id']}/maxresdefault.jpg",
            "embedUrl": f"https://www.youtube-nocookie.com/embed/{fm['id']}", "contentUrl": YTW}

# ---------- PRESS ----------
press_page = f'''<div class="page">
  <header class="page-head"><h1>Press</h1><p class="kicker">Radio · features · support</p></header>
  <div class="credits">
{''.join(f'    <div class="credit"><span class="t">{esc(t)}</span><span class="m">{esc(m)}</span></div>' + chr(10) for t, m in press_rows)}  </div>
  <h2 class="sec-label">Supported by</h2>
  <p class="names">{''.join(f'<span>{esc(s)}</span>' for s in supporters)}</p>
  <h2 class="sec-label">Labels</h2>
  <div class="chips">{''.join(f'<span class="chip">{esc(l)}</span>' for l in labels)}</div>
</div>'''

# ---------- ENGAGEMENT: cross-links, selections, now strip, dates, newsletter ----------
import re as _re, urllib.parse as _up
def slug(t): return _re.sub(r'[^a-z0-9]+', '-', t.lower().replace("'", '')).strip('-')
def norm(t): return _re.sub(r'[^a-z0-9]', '', t.lower())

# Switches: fill these in to turn features on (see README notes in the commit).
NEWSLETTER = None   # e.g. {'action': 'https://buttondown.com/api/emails/embed-subscribe/sophguerrero', 'field': 'email'}
ANALYTICS = None    # e.g. 'sophguerrero'  -> https://sophguerrero.goatcounter.com

# Release <-> mix cross-links from the real tracklist.
for r in library:
    r['played'] = [dict(t=t, s=secs(t), mix='October 2026 mix') for t, n, a in fm['tracks'] if a == 'Sophia Guerrero' and norm(n) == norm(r['title'])]
    r['slug'] = slug(r['title'])

# Selections: the other artists' records Sophia played in the latest mix (real tracklist).
sel_items = [(t, n, a) for t, n, a in fm['tracks'] if a != 'Sophia Guerrero']
def bp_search(n, a): return 'https://www.beatport.com/search?q=' + _up.quote_plus(n + ' ' + a)
selections = ''.join(
    f'<li><span class="sel-n">{esc(n)}</span><span class="sel-a">{esc(a)}</span>'
    f'<a class="sel-l" href="{esc(bp_search(n, a))}"{EXT} data-track="selection-click" data-label="{esc(n)} - {esc(a)}">Find on Beatport ↗</a></li>'
    for t, n, a in sel_items)
selections_block = (f'<section class="selections" aria-labelledby="sel-t" id="selections">\n'
  f'  <p class="kicker">Selections · October 2026</p>\n'
  f'  <h2 id="sel-t" class="display sel-title">In rotation</h2>\n'
  f'  <p class="lede">{len(sel_items)} records from other artists that made the October mix. A new list lands with each mix.</p>\n'
  f'  <ol class="sel-list">{selections}</ol>\n</section>')

def newsletter_block(where):
    if NEWSLETTER:
        return (f'<section class="news" aria-labelledby="nl-{where}">\n'
          f'  <h2 id="nl-{where}" class="kicker">New releases &amp; exclusive mixes, first</h2>\n'
          f'  <p class="news-p">One email when there\'s new music or a new mix. No spam, leave any time.</p>\n'
          f'  <form class="news-form" action="{esc(NEWSLETTER["action"])}" method="post" target="_blank" data-track-submit="newsletter-signup">\n'
          f'    <label class="sr" for="nl-e-{where}">Email address</label>\n'
          f'    <input id="nl-e-{where}" type="email" name="{esc(NEWSLETTER.get("field", "email"))}" required autocomplete="email" placeholder="you@email.com">\n'
          f'    <button class="btn solid" type="submit">Sign up</button>\n  </form>\n</section>')
    if PREFIX:
        return (f'<section class="news preview-only" aria-labelledby="nl-{where}">\n'
          f'  <h2 id="nl-{where}" class="kicker">New releases &amp; exclusive mixes, first</h2>\n'
          f'  <p class="news-p">Email sign-up goes here once your email list is connected. It is hidden on the live site until then.</p>\n</section>')
    return ''

# Contextual links in the mix tracklist: own tracks link to their release sleeve.
def cue2(t, n, a):
    base = cue(t, n, a)
    link = ''
    if a == 'Sophia Guerrero':
        link = f'<a class="cue-rel" href="/music/#rel-{slug(n)}" data-track="mix-to-release" data-label="{esc(n)}">Release ↗</a>'
    return base.replace('</button></li>', f'</button>{link}</li>').replace('<li><button', f'<li id="cue-{secs(t)}"><button')
tl2 = ''.join(cue2(*x) for x in fm['tracks'])
mixes_page = mixes_page.replace(tl, tl2)
mixes_page = mixes_page.replace('  <section class="series"', selections_block + '\n' + newsletter_block('mixes') + '\n  <section class="series"')

# Rebuild the record rows so each carries its slug, mix appearances and id for deep links.
def rec_row2(i, r):
    row = rec_row(i, r)
    data_old = row[row.index('<script type="application/json" class="rec-data">') + 49: row.index('</script>')]
    d = json.loads(data_old); d['played'] = r['played']; d['slug'] = r['slug']
    row = row.replace(data_old, json.dumps(d, ensure_ascii=False))
    return row.replace('<li class="rec', f'<li id="rel-{r["slug"]}" class="rec', 1)
music = music.replace(rows, ''.join(rec_row2(i, r) for i, r in enumerate(library)))
music = music.replace('    <div class="sv-listen"></div>', '    <div class="sv-listen"></div>\n    <p class="sv-played"></p>')

# Home: what's new right now + where to listen.
up = UPCOMING[0]; out_now = releases[0]
STREAM = [('Spotify', 'https://open.spotify.com/artist/2vr2Zel4lL47VOq86RCEHi'), ('Apple Music', 'https://music.apple.com/us/artist/sophia-guerrero/1786689507'),
          ('SoundCloud', 'https://soundcloud.com/sophiaguerrero'), ('Beatport', 'https://www.beatport.com/artist/sophia-guerrero/1279141'),
          ('Traxsource', 'https://www.traxsource.com/artist/896793/sophia-guerrero'), ('YouTube', 'https://www.youtube.com/@sophguerrero'),
          ('Deezer', 'https://www.deezer.com/artist/13781519')]
listen_on = ''.join(f'<a href="{h}"{EXT} data-track="streaming-click" data-label="{n}">{n} ↗</a>' for n, h in STREAM)
now_strip = (f'\n<section class="now" aria-labelledby="now-t">\n'
 f'  <h2 id="now-t" class="sec-label">Now</h2>\n  <div class="now-grid">\n'
 f'    <article class="now-card"><a href="/music/#rel-{out_now["slug"]}" class="now-a"><img src="{out_now["img"]}" width="1000" height="1000" alt="" loading="lazy">'
 f'<p class="kicker">Out now · {esc(out_now["label"])} · {out_now["nice"]}</p><h3>{esc(out_now["title"])}</h3></a>'
 f'<div class="btns"><button class="btn play" type="button" data-play="{out_now["sc"]}">▶ Play</button><a class="btn" href="{out_now["bp"]}"{EXT} data-track="release-link" data-label="{esc(out_now["title"])} - Beatport">Beatport ↗</a></div></article>\n'
 f'    <article class="now-card"><a href="/music/#rel-{up["slug"]}" class="now-a"><img src="{up["img"]}" width="1000" height="1000" alt="" loading="lazy">'
 f'<p class="kicker now-soon">Coming {up["nice"]} · {esc(up["label"])}</p><h3>{esc(up["title"])}</h3></a>'
 f'<div class="btns"><a class="btn solid" href="{up["bp"]}"{EXT} data-track="release-link" data-label="{esc(up["title"])} - Beatport pre-order">Pre-order ↗</a></div></article>\n'
 f'    <article class="now-card"><a href="/mixes/" class="now-a"><img src="https://i.ytimg.com/vi/{fm["id"]}/maxresdefault.jpg" width="1280" height="720" alt="" loading="lazy" class="wide">'
 f'<p class="kicker">Latest mix · {fm["date"]} · {fm["length"]}</p><h3>October mix</h3></a>'
 f'<div class="btns"><button class="btn play" type="button" data-yt-play="{fm["id"]}">▶ Play mix</button><a class="btn" href="/mixes/#tl-t">Tracklist</a></div></article>\n'
 f'  </div>\n  <div class="listen-on"><span class="kicker">Listen on</span>{listen_on}</div>\n'
 f'  {newsletter_block("home")}\n</section>')
home = home + now_strip


# ---------- BOOK ----------
# Past dates from Sophia's RA profile, read 14 Nov 2026. Upcoming: none announced on RA.
PAST_DATES = [('2026-04-25', 'Sat 25 Apr 2026', 'Casa Disco', 'Manila', 'with Meloko'),
              ('2025-06-11', 'Wed 11 Jun 2025', "It's a Groove Thang · Apotheka", 'Manila', 'with Antonne'),
              ('2017-06-03', 'Sat 3 Jun 2017', 'Deep Dark Dirty · Time In Manila', 'Philippines', 'with Emel, Charles David')]
PAST = ''.join(f'<li><time datetime="{d}">{nice}</time><span class="pd-e">{esc(e)}</span><span class="pd-w">{esc(c)} · {esc(w)}</span></li>' for d, nice, e, c, w in PAST_DATES)
book_ld = {"@context": "https://schema.org", "@graph": [{"@type": "MusicEvent", "name": e, "startDate": d,
           "location": {"@type": "Place", "name": e.split(' · ')[-1], "address": c}, "performer": {"@type": "Person", "name": "Sophia Guerrero"},
           "eventStatus": "https://schema.org/EventScheduled", "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode"} for d, nice, e, c, w in PAST_DATES]}
INQ_SUBJ = _up.quote('Booking inquiry: Sophia Guerrero')
INQ_BODY = _up.quote('Hi Sophia,\n\nEvent / promoter:\nDate:\nCity and venue:\nCapacity:\nSet time and length:\nFee / budget:\nTravel and accommodation:\nContact number:\n\nThanks!')

both = [s for s in supporters if s in bio[0]]
book_page = f'''<div class="page">
  <header class="page-head"><h1>Book</h1><p class="kicker">Bookings &amp; enquiries</p></header>
  <div class="book-grid">
    <div>
      <p class="kicker" style="margin-bottom:12px">Write to</p>
      <a class="big-mail" href="mailto:{email}" data-track="booking-inquiry" data-label="email address">{email.replace("@","@<wbr>")}</a>
      <div class="inquiry">
        <a class="btn solid" href="mailto:{email}?subject={INQ_SUBJ}&amp;body={INQ_BODY}" data-track="booking-inquiry" data-label="inquiry template">Start a booking inquiry</a>
        <p class="inq-note">Opens your email with a short template: event, date, city and venue, capacity, set length and fee. Replies usually within a few days.</p>
      </div>
      <h2 class="sec-label">About</h2>
      <div class="prose">{''.join(f'<p>{esc(p)}</p>' for p in bio)}</div>
    </div>
    <aside aria-label="At a glance">
      <h2 class="sec-label" style="margin-top:0">At a glance</h2>
      <ol class="proof">
        <li>Releases on {esc(', '.join(labels[:-1]))} and {esc(labels[-1])}</li>
        <li>{esc(press_rows[0][0])} · {esc(press_rows[0][1])}</li>
        <li>Support from {esc(', '.join(both[:-1]))} and {esc(both[-1])}</li>
      </ol>
      <h2 class="sec-label" id="dates">Dates</h2>
      <p class="dates-none">No upcoming dates announced right now.</p>
      <div class="btns" style="margin:10px 0 18px"><a class="btn" href="https://ra.co/dj/sophiaguerrero"{EXT} data-track="ra-follow">Follow on RA for new dates ↗</a></div>
      <h3 class="kicker" id="played-at">Past dates</h3>
      <ul class="pastdates">{PAST}</ul>
      <h3 class="kicker" style="margin-top:18px">Also played</h3>
      <ul class="venues">{''.join(f'<li>{esc(v.split(", ")[0])}<span>{esc(v.split(", ")[1]) if ", " in v else ""}</span></li>' for v in venues)}</ul>
      <h2 class="sec-label">Follow</h2>
      <div class="chips">{''.join(f'<a class="chip" href="{h}"{EXT}>{esc(t)}</a>' for h, t in info_follow)}</div>
    </aside>
  </div>
</div>'''

lost = f'''<div class="page lost">
  <p class="kicker">Error 404 · page not found</p>
  <h1>Lost in<br><em>the smoke</em></h1>
  <p class="lede" style="margin:24px 0 32px">This page left the club early. The music's still playing.</p>
  <div class="btns"><a class="btn solid" href="/">Back to the front</a><a class="btn" href="/music/">Browse the music</a><button class="btn play" type="button" data-play="">▶ Keep listening</button></div>
</div>'''

play_page = f'''<div class="page play-page">
  <header class="page-head"><h1>Play</h1><p class="kicker">{N} releases · latest mix</p></header>
  <p class="lede" style="margin-bottom:24px">Step inside: every release and the latest mix in one dark room.</p>
  <div class="btns"><button class="btn solid pm-open" type="button" aria-haspopup="dialog">Enter Play mode ⤢</button><a class="btn" href="/music/">Browse the record library</a><a class="btn" href="/mixes/">Mixes</a></div>
  <p class="lib-note">Nothing plays until you press play. Leave any time with Exit or Esc; the music keeps going in the player bar while you browse.</p>
</div>'''

pages = [
    ('home', '/', 'index.html', 'Sophia Guerrero — House & Tech House DJ and Producer, Manila', desc_home, home, None, 'Sophia Guerrero — House & Tech House DJ, Manila'),
    ('play', '/play/', 'play/index.html', 'Play — Sophia Guerrero, House & Tech House DJ, Manila',
     "Play mode: listen to Sophia Guerrero's releases and mixes in an immersive, fullscreen listening room with a display mode for screens.", play_page, None, None),
    ('music', '/music/', 'music/index.html', 'Music — Sophia Guerrero, House & Tech House DJ, Manila',
     f'All {N} releases by Sophia Guerrero on Toolroom, Milk & Sugar, There Was Jack, HouseU, Alleanza and Wh0 Worx, with Beatport and Traxsource links.', music, music_ld, None),
    ('mixes', '/mixes/', 'mixes/index.html', 'Mixes — Sounds Good by Sophia Guerrero',
     'Sounds Good, the monthly mix series from Manila House and Tech House DJ Sophia Guerrero.', mixes_page, mixes_ld, None),
    ('press', '/press/', 'press/index.html', 'Press — Sophia Guerrero, House & Tech House DJ, Manila',
     "Sophia Guerrero's press and radio: BBC Radio 1 with Arielle Free and Danny Howard's Club Mix, DJane Mag, Rave Residence, and DJ support.", press_page, None, None),
    ('book', '/book/', 'book/index.html', 'Book Sophia Guerrero — House & Tech House DJ, Manila',
     f'Bookings and enquiries for Sophia Guerrero, House and Tech House DJ and producer from Manila, Philippines: {email}.', book_page, book_ld, None),
]
CATALOG_JSON = json.dumps([dict(kind='release', no=r['no'], title=r['title'], feat=r['feat'], label=r['label'], bpm=r['bpm'], key=r['key'], sc=r['sc'], sp=r['sp'], img=r['img'], date=r['nice'], year=r['year'], slug=r['slug'], upcoming=r.get('upcoming', False)) for r in library] + [dict(kind='mix', yt=m['id'], title=m['title'], label='Mix', date=m['date'], year=m['iso'][:4], length=m['length'], img='https://i.ytimg.com/vi/%s/maxresdefault.jpg' % m['id'], bpm=0, key='') for m in MIXES], ensure_ascii=False).replace('</', '<\\/')
pages_404 = [('lost', '/404.html', '404.html' if not PREFIX else '404/index.html', 'Lost in the smoke — Sophia Guerrero', 'Page not found.', lost, None, None)]
for slug, path, fn, title, desc, body, ld, ogt in pages + pages_404:
    f = OUT / fn; f.parent.mkdir(parents=True, exist_ok=True)
    out = page(slug, path, title, desc, body, ld, ogt)
    if PREFIX:
        out = re.sub(r'(href|src)="/(?!/)', lambda m: f'{m.group(1)}="{PREFIX}/', out)
        out = re.sub(r'(srcset="|, )/assets', lambda m: f'{m.group(1)}{PREFIX}/assets', out)
    f.write_text(out, encoding='utf-8')
(OUT / 'assets/spark.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="-50 -50 100 100"><rect x="-50" y="-50" width="100" height="100" fill="#121115"/><path d="M0,-40 C3,-12 12,-3 40,0 C12,3 3,12 0,40 C-3,12 -12,3 -40,0 C-12,-3 -3,-12 0,-40 Z" fill="#c8bfdc"/></svg>')
if not PREFIX: (OUT / 'robots.txt').write_text('User-agent: *\nAllow: /\nDisallow: /v2/\n\nSitemap: https://sophguerrero.com/sitemap.xml\n')
if not PREFIX: (OUT / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    ''.join(f'  <url><loc>{BASE}{p[1]}</loc><lastmod>2026-11-14</lastmod></url>\n' for p in pages) + '</urlset>\n')
print('built', [p[2] for p in pages], 'releases', N, 'supporters', len(supporters), 'venues', len(venues), 'both', both)
