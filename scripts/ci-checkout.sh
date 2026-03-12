#!/usr/bin/env bash

set -euo pipefail

if [ "$#" -lt 1 ] || [ "$#" -gt 2 ]; then
  echo "Usage: bash scripts/ci-checkout.sh <ref> [fetch-depth]" >&2
  exit 1
fi

ref="$1"
fetch_depth="${2:-1}"

if [ -z "${GITHUB_TOKEN:-}" ] || [ -z "${GITHUB_REPOSITORY:-}" ]; then
  echo "GITHUB_TOKEN and GITHUB_REPOSITORY are required." >&2
  exit 1
fi

git config --global --add safe.directory "${PWD}"

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git remote remove origin >/dev/null 2>&1 || true
  git clean -ffdx
  git reset --hard HEAD
else
  git init .
fi

git remote add origin "https://x-access-token:${GITHUB_TOKEN}@github.com/${GITHUB_REPOSITORY}.git"
git fetch --no-tags --prune --depth="${fetch_depth}" origin "${ref}"
git checkout --detach FETCH_HEAD
