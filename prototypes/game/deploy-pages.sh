#!/usr/bin/env bash
# Builds the game into a standalone site and force-pushes it to the gh-pages branch, which GitHub Pages serves.
# Usage: prototypes/game/deploy-pages.sh
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
remote="$(git -C "$here" remote get-url origin)"
rev="$(git -C "$here" rev-parse --short HEAD)"
out="$(mktemp -d)"
trap 'rm -rf "$out"' EXIT

cp "$here"/*.js "$out"/
# index.html is written as a page body for the artifact host, so give it a document shell here.
{
  printf '<!doctype html>\n<html lang="en">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n'
  cat "$here/index.html"
  printf '\n</html>\n'
} > "$out/index.html"
touch "$out/.nojekyll"

cd "$out"
git init -q -b gh-pages
git add -A
git commit -q -m "Deploy Zereshktopia from $rev

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01G4YVdpoxjeadXn9ANykE4F"
git push -f "$remote" gh-pages
