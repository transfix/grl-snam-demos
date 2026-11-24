#!/usr/bin/env bash
# tools/assemble.sh — the site as Pages serves it, in one directory:
#
#   tools/assemble.sh --out DIR --grl-snam SRC --libcvc SRC [--learn DIR] [--scrub DIR]
#                     [--scrub-austin DIR]
#
#   /                 site/ (the landing page), its provenance filled in from the two checkouts
#   /archive/2026-08/ the August site, as published on 2026-08-14 (archive/2026-08, unchanged)
#   /2026-0*/         a redirect for each August demo page, so its old URL still works
#   /img/             the libcvc nav demos' thumbnails, from the libcvc checkout's gallery
#   /learn/           --learn: the learn page GRL-SNAM's pages/ scripts assembled (ariglx-web, its
#                     ariadne.config.json and every preload). Without it the landing page's learn
#                     card is left out, so the site has no link to a page it does not have.
#   /scrub/           --scrub: the scrub page, the same way (`grl-snam ariadne scrub --view` on the
#                     runs GRL-SNAM's pages/assemble.py deployed); without it, no scrub card.
#   /scrub-austin/    --scrub-austin: the scrub page in Austin, the same way (the same runs, deployed
#                     there; the page fetches the city from cvcpkg.org); without it, no card.
#   /build.json       which commits the site was built from
#
# --grl-snam is a CVC-Lab/GRL-SNAM checkout, --libcvc a transfix/libcvc checkout (the pinned tag).
set -euo pipefail

usage() {
  echo "usage: assemble.sh --out DIR --grl-snam SRC --libcvc SRC [--learn DIR] [--scrub DIR]" \
       "[--scrub-austin DIR]" >&2
  exit 2
}
OUT= GRL= LIBCVC= LEARN= SCRUB= AUSTIN=
while [[ $# -gt 0 ]]; do
  case "$1" in
    --out) OUT="$2"; shift 2 ;;
    --grl-snam) GRL="$2"; shift 2 ;;
    --libcvc) LIBCVC="$2"; shift 2 ;;
    --learn) LEARN="$2"; shift 2 ;;
    --scrub) SCRUB="$2"; shift 2 ;;
    --scrub-austin) AUSTIN="$2"; shift 2 ;;
    *) usage ;;
  esac
done
[[ -n "$OUT" && -n "$GRL" && -n "$LIBCVC" ]] || usage
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
[[ -z "$LEARN" || -f "$LEARN/index.html" ]] || { echo "assemble: $LEARN has no index.html" >&2; exit 1; }
[[ -z "$SCRUB" || -f "$SCRUB/index.html" ]] || { echo "assemble: $SCRUB has no index.html" >&2; exit 1; }
[[ -z "$AUSTIN" || -f "$AUSTIN/index.html" ]] || { echo "assemble: $AUSTIN has no index.html" >&2; exit 1; }

rm -rf "$OUT"
mkdir -p "$OUT/img"
cp -R "$HERE/site/." "$OUT/"
mkdir -p "$OUT/archive"
cp -R "$HERE/archive/2026-08" "$OUT/archive/"

# The August demo pages lived at the site's root; their old URLs redirect into the archive.
for d in "$HERE"/archive/2026-08/20*/; do
  name="$(basename "$d")"
  mkdir -p "$OUT/$name"
  cat > "$OUT/$name/index.html" <<EOF
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Moved: $name</title>
<link rel="canonical" href="../archive/2026-08/$name/">
<meta http-equiv="refresh" content="0; url=../archive/2026-08/$name/">
</head>
<body><p>This page is now in the archive: <a href="../archive/2026-08/$name/">archive/2026-08/$name/</a>.</p></body>
</html>
EOF
done

# The nav demos' thumbnails, from libcvc's own gallery.
for f in nav_city_swarm.jpg nav_fog_ghost.jpg; do
  cp "$LIBCVC/examples/web/gallery-assets/img/$f" "$OUT/img/$f"
done

if [[ -n "$LEARN" ]]; then
  cp -R "$LEARN" "$OUT/learn"
else
  sed -i '/<!-- learn:begin -->/,/<!-- learn:end -->/d' "$OUT/index.html"
  rm -f "$OUT/img/learn.jpg"
fi
if [[ -n "$SCRUB" ]]; then
  cp -R "$SCRUB" "$OUT/scrub"
else
  sed -i '/<!-- scrub:begin -->/,/<!-- scrub:end -->/d' "$OUT/index.html"
  rm -f "$OUT/img/scrub.jpg"
fi
if [[ -n "$AUSTIN" ]]; then
  cp -R "$AUSTIN" "$OUT/scrub-austin"
else
  sed -i '/<!-- scrub-austin:begin -->/,/<!-- scrub-austin:end -->/d' "$OUT/index.html"
  rm -f "$OUT/img/scrub-austin.jpg"
fi

grl_sha="$(git -C "$GRL" rev-parse HEAD)"
libcvc_sha="$(git -C "$LIBCVC" rev-parse HEAD)"
libcvc_ref="$(git -C "$LIBCVC" describe --tags --exact-match 2>/dev/null || echo "${libcvc_sha:0:10}")"
site_sha="$(git -C "$HERE" rev-parse HEAD 2>/dev/null || echo unknown)"
built="$(date -u +%Y-%m-%d)"
sed -i -e "s|@GRL_SNAM_SHA@|$grl_sha|g" -e "s|@GRL_SNAM_SHORT@|${grl_sha:0:7}|g" \
       -e "s|@LIBCVC_REF@|$libcvc_ref|g" -e "s|@BUILT@|$built|g" "$OUT/index.html"
if grep -q '@[A-Z_]*@' "$OUT/index.html"; then
  echo "assemble: unfilled placeholders in index.html:" >&2
  grep -o '@[A-Z_]*@' "$OUT/index.html" | sort -u >&2
  exit 1
fi

learn_json=null scrub_json=null austin_json=null
if [[ -n "$LEARN" && -f "$LEARN/ariadne.config.json" ]]; then
  learn_json="$(cat "$LEARN/ariadne.config.json")"
fi
if [[ -n "$SCRUB" && -f "$SCRUB/ariadne.config.json" ]]; then
  scrub_json="$(cat "$SCRUB/ariadne.config.json")"
fi
if [[ -n "$AUSTIN" && -f "$AUSTIN/ariadne.config.json" ]]; then
  austin_json="$(cat "$AUSTIN/ariadne.config.json")"
fi
cat > "$OUT/build.json" <<EOF
{
  "built": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "site": "$site_sha",
  "grl_snam": "$grl_sha",
  "libcvc": {"ref": "$libcvc_ref", "sha": "$libcvc_sha"},
  "learn": $learn_json,
  "scrub": $scrub_json,
  "scrub_austin": $austin_json
}
EOF
touch "$OUT/.nojekyll"
echo "assemble: $OUT ($(du -sh "$OUT" | cut -f1)); learn page: ${LEARN:-none}; scrub page:" \
     "${SCRUB:-none}; Austin scrub page: ${AUSTIN:-none}"
