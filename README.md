# GRL-SNAM — the project site

**Site:** https://transfix.github.io/grl-snam-demos/

The site for [CVC-Lab/GRL-SNAM](https://github.com/CVC-Lab/GRL-SNAM). It is built from GRL-SNAM's
`main` branch, which is authoritative, by [`.github/workflows/pages.yml`](.github/workflows/pages.yml),
and deployed as a Pages artifact: nothing built is committed here.

| Path on the site | From |
|---|---|
| `/` | [`site/`](site/): the landing page (figures, the demos that run in the browser, the archive) |
| `/learn/` | GRL-SNAM's `pages/assemble.py`: `grl-snam ariadne learn` on libcvc's `ariglx-web` (CPython 3.12, pycvc, pycvc_gl and numpy in WebAssembly), with the learning check's histories |
| `/scrub/` | GRL-SNAM's `pages/assemble.py`: `grl-snam ariadne scrub --view` on `ariglx-web`, every checkpoint of the learning check's three retrains, deployed when the site is built |
| `/coph/` | GRL-SNAM's `pages/site/coph/`, copied as it is: the CoPH poster (demo 2a's walkthrough video, the results the reference establishes and what it does not). Without it in GRL-SNAM, the landing page drops its card |
| `/coph/live/` | GRL-SNAM's `pages/assemble.py --coph-only`: `grl-snam ariadne coph` on `ariglx-web`, playing back each demo's run file (`?demo=crossing`, `?demo=hazard`), baked when the site is built from the vendored demos' episodes (cached). Without it, the poster's and the card's links to it are cut |
| `/archive/2026-08/` | [`archive/2026-08/`](archive/2026-08/): the July to August 2026 deliverables, as published on 2026-08-14 |
| `/2026-0*/` | redirects from the archive pages' old URLs |
| `/img/` | the libcvc nav demos' thumbnails (from libcvc's gallery, and `site/img/`) |
| `/build.json` | the commits the site was built from |

## How it is built

[`pages.yml`](.github/workflows/pages.yml) runs on pushes to `main`, nightly (GRL-SNAM's `main` moves
on its own), on Run workflow, and on pull requests (checks only, no deploy):

1. it checks out CVC-Lab/GRL-SNAM at `GRL_SNAM_REF` (`main`) and transfix/libcvc at `LIBCVC_REF`;
2. it builds `ariglx-web` with GRL-SNAM's `pages/build-ariglx-web.sh` (the single-threaded wasm
   build, which needs no COOP/COEP headers; cached by libcvc's commit);
3. GRL-SNAM's `pages/assemble.py` writes the learn page, the scrub pages and the CoPH page, and
   [`tools/assemble.sh`](tools/assemble.sh) puts the site together. The scrub page's runs are
   deployed here with a cvcpkg closure (torch, pycvc-gl) whose libcvc is pinned to `LIBCVC_REF`'s
   version, the one `ariglx-web` is built from, on the checkpoints in the cvcpkg package
   `grl-snam-learning-checkpoints`, and cached. The same closure (with Pillow) bakes the CoPH
   page's run files from the vendored demos' episodes, which are cached too;
4. [`tools/site_smoke.mjs`](tools/site_smoke.mjs) and GRL-SNAM's `pages/smoke.mjs` load it in a
   headless Chrome as Pages serves it;
5. on `main`, it deploys.

`PUBLISH_LEARN`, `PUBLISH_SCRUB`, `PUBLISH_SCRUB_AUSTIN` and `PUBLISH_COPH` in the workflow say
whether the deployed site has `learn/`, `scrub/`, `scrub-austin/` and `coph/live/`. Every run builds
and checks them either way.

Every page loads only from this site's origin. Python, Node and headless Chromium come from
[cvcpkg](https://cvcpkg.org)'s catalog.

## Locally

With checkouts of GRL-SNAM and libcvc (at `LIBCVC_REF`), and the learn, scrub and CoPH pages from
GRL-SNAM's `pages/assemble.py` if you want them (its `pages/README.md` says how):

```bash
tools/assemble.sh --out _site --grl-snam ../GRL-SNAM --libcvc ../libcvc [--learn DIR/learn] \
  [--scrub DIR/scrub] [--scrub-austin DIR/scrub-austin] [--coph DIR/coph]
node tools/site_smoke.mjs --site _site --chrome "$(command -v chrome-headless-shell)" --shots shots
```

`site_smoke.mjs` serves the site at `/grl-snam-demos/`, as Pages does.

*Geometry © OpenStreetMap contributors (ODbL); terrain SRTM (US public domain).*
