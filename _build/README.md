# How the site is built

`build.py` generates every page from the content of the original one-page site
(`original-index.html`) plus the data blocks inside it (CATALOG, MIXES, PAST_DATES,
NEWSLETTER, ANALYTICS). Run from the repo root:

    python3 _build/build.py _build/original-index.html .

To switch on email sign-up or analytics, fill in NEWSLETTER or ANALYTICS in build.py and rebuild.
Folders starting with an underscore are not published by GitHub Pages.
