# GRL-SNAM — the project site

**Site:** https://transfix.github.io/grl-snam-demos/

The site for [CVC-Lab/GRL-SNAM](https://github.com/CVC-Lab/GRL-SNAM). It is built from GRL-SNAM's
`main` branch, which is authoritative, by [`.github/workflows/pages.yml`](.github/workflows/pages.yml),
and deployed as a Pages artifact: nothing built is committed here.

| Path on the site | From |
|---|---|
| `/` | [`site/`](site/): the landing page (figures, the demos that run in the browser, the archive) |
| `/learn/` | GRL-SNAM's `pages/assemble.py`: `grl-snam ariadne learn` on libcvc's `ariglx-web` (CPython 3.12, pycvc, pycvc_gl and numpy in WebAssembly), with the learning check's histories |
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
3. GRL-SNAM's `pages/assemble.py` writes the learn page, and
   [`tools/assemble.sh`](tools/assemble.sh) puts the site together;
4. [`tools/site_smoke.mjs`](tools/site_smoke.mjs) and GRL-SNAM's `pages/smoke.mjs` load it in a
   headless Chrome as Pages serves it;
5. on `main`, it deploys.

`PUBLISH_LEARN` in the workflow says whether the deployed site has `learn/`. Every run builds and
checks it either way.

Every page loads only from this site's origin. Python, Node and headless Chromium come from
[cvcpkg](https://cvcpkg.org)'s catalog.

## Locally

With checkouts of GRL-SNAM and libcvc (at `LIBCVC_REF`), and a learn page from GRL-SNAM's
`pages/assemble.py` if you want one:

```bash
tools/assemble.sh --out _site --grl-snam ../GRL-SNAM --libcvc ../libcvc [--learn DIR/learn]
node tools/site_smoke.mjs --site _site --chrome "$(command -v chrome-headless-shell)" --shots shots
```

`site_smoke.mjs` serves the site at `/grl-snam-demos/`, as Pages does.

*Geometry © OpenStreetMap contributors (ODbL); terrain SRTM (US public domain).*
