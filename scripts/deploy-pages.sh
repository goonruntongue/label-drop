#!/usr/bin/env bash
# Build the site and publish it to the gh-pages branch (GitHub Pages "deploy from a branch").
# Site layout: / = IA one-sheet LP (+ 2D prototype), /app/ = Label Drop.
# Usage (from the repo root):  bash scripts/deploy-pages.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REMOTE_URL="$(git -C "$ROOT" remote get-url origin)"
OUT="$(mktemp -d)"
trap 'rm -rf "$OUT"' EXIT

echo "▶ building app"
(cd "$ROOT/app" && npm run build)

echo "▶ assembling site"
cp "$ROOT/index.html" "$ROOT/practice.html" "$ROOT/practice.css" "$ROOT/practice.js" "$OUT/"
cp -r "$ROOT/assets" "$OUT/assets"
cp -r "$ROOT/app/dist" "$OUT/app"
touch "$OUT/.nojekyll"

echo "▶ publishing to gh-pages"
cd "$OUT"
git init -q -b gh-pages
git add -A
git -c user.name="$(git -C "$ROOT" config user.name)" -c user.email="$(git -C "$ROOT" config user.email)" \
  commit -q -m "Deploy $(git -C "$ROOT" rev-parse --short HEAD)"
git push -q -f "$REMOTE_URL" gh-pages
echo "✓ deployed $(git -C "$ROOT" rev-parse --short HEAD)"
