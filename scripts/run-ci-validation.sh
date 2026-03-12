#!/usr/bin/env bash

set -euo pipefail

validation_network="movieshare-validation-${GITHUB_RUN_ID:-local}-${GITHUB_RUN_ATTEMPT:-0}-${GITHUB_JOB:-manual}"
postgres_container="movieshare-validation-postgres-${GITHUB_RUN_ID:-local}-${GITHUB_RUN_ATTEMPT:-0}-${GITHUB_JOB:-manual}"
npm_cache_volume="movieshare-npm-cache"

cleanup() {
  docker rm -f "${postgres_container}" >/dev/null 2>&1 || true
  docker network rm "${validation_network}" >/dev/null 2>&1 || true
}

trap cleanup EXIT

docker network create "${validation_network}" >/dev/null

docker run -d \
  --name "${postgres_container}" \
  --network "${validation_network}" \
  -e POSTGRES_DB=movieshare \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  postgres:17-alpine >/dev/null

for attempt in $(seq 1 30); do
  if docker exec "${postgres_container}" pg_isready -U postgres -d movieshare >/dev/null 2>&1; then
    break
  fi

  if [ "${attempt}" -eq 30 ]; then
    echo "Postgres validation container did not become ready in time." >&2
    exit 1
  fi

  sleep 2
done

docker volume create "${npm_cache_volume}" >/dev/null

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  archive_source=(git archive --format=tar HEAD)
else
  archive_source=(tar --exclude=.git -cf - .)
fi

"${archive_source[@]}" | docker run --rm -i \
  --network "${validation_network}" \
  -e DATABASE_URL="postgresql://postgres:postgres@${postgres_container}:5432/movieshare?schema=public" \
  -e SHADOW_DATABASE_URL="postgresql://postgres:postgres@${postgres_container}:5432/postgres?schema=public" \
  -e BETTER_AUTH_URL="http://localhost:3000" \
  -e NEXT_PUBLIC_BETTER_AUTH_URL="http://localhost:3000" \
  -e BETTER_AUTH_SECRET="movieshare-validation-placeholder-secret-for-ci-only" \
  -e CI=1 \
  -e NODE_OPTIONS="--max-old-space-size=1536" \
  -e NEXT_TELEMETRY_DISABLED=1 \
  -v "${npm_cache_volume}:/npm-cache" \
  node:22-bookworm \
  bash -lc "mkdir -p /workspace && tar -xf - -C /workspace && cd /workspace && npm ci --cache /npm-cache --no-audit --no-fund --ignore-scripts && npm run db:generate && npm run db:check-migrations && npm run lint && npm run typecheck && CONTAINER_BUILD=1 npm run build"
