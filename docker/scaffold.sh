#!/usr/bin/env bash
#
# One-shot generator for the TIMBRE Next.js application.
#
# create-next-app refuses to run inside a directory holding files it does not
# recognise, and this repository already carries the specification documents and
# the working agreement. So the app is generated into a scratch directory and
# then merged in, and the merge never replaces a file that already exists.
#
# Usage:  docker compose run --rm scaffold

set -euo pipefail

SRC=/tmp/scaffold
DEST=/app

echo "==> Generating Next.js application in ${SRC}"
rm -rf "${SRC}"
cd /tmp

npx --yes create-next-app@latest scaffold \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --use-npm \
  --skip-install \
  --disable-git \
  --yes

echo
echo "==> Merging into ${DEST}"

shopt -s dotglob nullglob

copied=()
skipped=()

for path in "${SRC}"/*; do
  name="$(basename "${path}")"
  if [[ -e "${DEST}/${name}" ]]; then
    skipped+=("${name}")
    continue
  fi
  cp -R "${path}" "${DEST}/${name}"
  copied+=("${name}")
done

echo
echo "    copied  : ${copied[*]:-<none>}"
echo "    skipped : ${skipped[*]:-<none>}   (already present, left untouched)"
echo
echo "==> Scaffold complete. Dependencies are NOT installed yet."
echo "    Next: docker compose run --rm cli \"npm install\""
