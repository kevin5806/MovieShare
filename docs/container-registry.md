# Container Registry And Image Deploys

## Recommendation

Use `ghcr.io` as the default image registry when the source code is already hosted on GitHub.

Why:

- the image can be published from GitHub Actions with the repository `GITHUB_TOKEN`
- the package can be linked directly to the repository
- you can keep the production server source-free and deploy only from a tagged image

Use Docker Hub as an optional secondary registry if you want a public catalog presence or a
familiar Docker-first distribution point.

Use cloud-managed registries such as Amazon ECR, Google Artifact Registry, or Azure
Container Registry when the runtime already lives inside that cloud and you want tighter IAM
and network integration.

## What is implemented in this repository

- `.github/workflows/publish-image.yml`
  publishes prebuilt images from GitHub Actions
- publish is limited to:
  - semver tag pushes like `v1.2.3`
  - manual workflow dispatch
- development builds are not pushed automatically
- `docker-compose.registry.yml`
  deploys from a prebuilt image instead of building from source
- `.env.production.example`
  provides the production env baseline
- `infra/nginx/media-cdn.conf`
  is the small runtime config file used by the media-cdn service in image-based deploys

## GitHub Container Registry flow

1. Open a pull request to `main`.

What happens automatically:

- the workflow starts on the PR
- it runs migration drift checks, lint, typecheck and production build validation
- if you push new commits to the same PR, the older run is auto-cancelled

2. Merge the PR into `main`.

What happens automatically after merge:

- the workflow reads the semver from `package.json`
- it publishes `ghcr.io/<owner>/movieshare:<version>`
- it also publishes `<major>`, `<major>.<minor>` and `latest`
- the merge must therefore include a package version bump
- the default publish on `main` is multi-arch because `main` is now the deliberate release path

3. Manual publish remains available when you explicitly want to rerun or republish:

```text
workflow_dispatch -> choose version -> optional latest -> optional platforms
```

4. GitHub Actions publishes:

- `ghcr.io/<owner>/movieshare:1.0.0`
- `ghcr.io/<owner>/movieshare:1.0`
- `ghcr.io/<owner>/movieshare:1`
- `ghcr.io/<owner>/movieshare:latest`

For semver tag pushes, `latest` is published automatically. For manual workflow runs,
`publish_latest` now defaults to `false`, and manual runs default to `linux/amd64`
unless you explicitly request more platforms.

The workflow also keeps Docker build cache under one fixed GitHub Actions cache scope with
`mode=min`, so repeated publishes do not keep exploding into a large number of stored caches.
After each successful publish, it also prunes older cache entries for that publish scope and
keeps only a small recent set.

5. On the production server, create an env file from `.env.production.example`.
6. Keep `docker-compose.registry.yml` and `infra/nginx/media-cdn.conf` together in the
   deployment bundle.

5. Pull and run the image:

```bash
docker compose --env-file .env.production -f docker-compose.registry.yml pull
docker compose --env-file .env.production -f docker-compose.registry.yml up -d
```

## Make the GHCR package public

GitHub Container Registry packages are private on first publish.

To make `ghcr.io/<owner>/movieshare` public:

1. Open GitHub and go to the package page:
   - personal account: `https://github.com/users/<owner>/packages/container/package/movieshare`
   - organization: `https://github.com/orgs/<org>/packages/container/package/movieshare`
2. Open `Package settings`.
3. If the package currently inherits permissions from the repository and the visibility controls are not available, remove inherited permissions first.
4. In `Danger Zone`, click `Change visibility`.
5. Select `Public`.
6. Type the package name and confirm.

Important:

- once a GitHub package becomes public, it cannot be made private again
- public GHCR container images can be pulled anonymously
- if you keep the package private, production hosts must authenticate before `docker pull`

Useful GitHub docs:

- https://docs.github.com/packages/learn-github-packages/configuring-a-packages-access-control-and-visibility
- https://docs.github.com/en/packages/learn-github-packages/about-permissions-for-github-packages
- https://docs.github.com/packages/working-with-a-github-packages-registry/working-with-the-container-registry

## Production install tutorial from the GitHub Actions image

This is the recommended flow once `.github/workflows/publish-image.yml` has already produced
an image such as `ghcr.io/<owner>/movieshare:1.0.0`.

### 1. Publish the image

Use one of these flows:

```bash
git tag v1.0.0
git push origin v1.0.0
```

Or run `Publish container image` manually from GitHub Actions with version `1.0.0`.
If you do this for production, leave `publish_latest` disabled unless you intentionally want
automation that follows `latest` to move immediately. Manual runs now default to
`linux/amd64`; request `linux/amd64,linux/arm64` only when you actually need a multi-arch image.
If GitHub shows a large number of Actions caches from older runs, those are usually stale
BuildKit caches created before the fixed-scope/min-mode policy and the automatic post-publish
cache pruning step.

Branch discipline note:

- day-to-day work should happen on branches
- PRs to `main` are the automatic validation gate
- merges to `main` are the automatic publish event
- a branch must bump `package.json` before merge, because `main` publishes that semver automatically

### 2. Confirm the package exists

After the workflow succeeds, you should have tags such as:

- `ghcr.io/<owner>/movieshare:1.0.0`
- `ghcr.io/<owner>/movieshare:1.0`
- `ghcr.io/<owner>/movieshare:1`
- `ghcr.io/<owner>/movieshare:latest`

### 3. Prepare the deployment bundle

Keep these files together on the production host:

- `docker-compose.registry.yml`
- `.env.production.example`
- `infra/nginx/media-cdn.conf`

Then create the real env file:

```bash
cp .env.production.example .env.production
```

### 4. Set the published image tag

Edit `.env.production` and set:

```env
MOVIESHARE_IMAGE=ghcr.io/<owner>/movieshare:1.0.0
```

Also fill at least:

- `POSTGRES_PASSWORD`
- `DATABASE_URL`
- `BETTER_AUTH_URL`
- `NEXT_PUBLIC_BETTER_AUTH_URL`
- `BETTER_AUTH_SECRET`
- `MINIO_ROOT_PASSWORD`
- `STORAGE_SECRET_KEY`

Optional integrations can stay empty if you do not need them immediately.

Recommended production rule:

- pin `MOVIESHARE_IMAGE` to an explicit release tag such as `ghcr.io/<owner>/movieshare:1.0.0`
- do not point Watchtower or similar auto-updaters at `latest` unless you explicitly want it
  to move as soon as the tag is republished

### 5. Authenticate only if the package is private

If the package is public, skip this step.

If the package is private, create a GitHub personal access token with at least
`read:packages`, then log in:

```bash
echo "$GHCR_PAT" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

### 6. Pull and start the stack

```bash
docker compose --env-file .env.production -f docker-compose.registry.yml pull
docker compose --env-file .env.production -f docker-compose.registry.yml up -d
```

### 7. Verify the deployment

```bash
docker compose --env-file .env.production -f docker-compose.registry.yml ps
docker compose --env-file .env.production -f docker-compose.registry.yml logs -f app
```

The application should come up on the port configured by `APP_PORT`, default `3000`.

### 8. Create the first admin

1. Register a normal user from the UI.
2. Promote that user inside the running container:

```bash
docker compose --env-file .env.production -f docker-compose.registry.yml exec app npm run user:promote-admin -- you@example.com
```

## Portainer and Linux deploy troubleshooting

If you deploy from the Portainer web editor and your compose file contains:

```yaml
- ./infra/nginx/media-cdn.conf:/etc/nginx/nginx.conf:ro
```

remember that Docker expects the source path on the host to already exist as a file.

Typical failure:

- Portainer stores the stack under `/data/compose/<stack-id>/`
- the relative source path does not exist there
- Docker creates a directory placeholder instead of finding a file
- the container then fails because a directory is being mounted onto `/etc/nginx/nginx.conf`

Safer options:

- deploy the stack from a Git repository so `infra/nginx/media-cdn.conf` is checked out next to the compose file
- or copy the compose project to a real directory on the host such as `/opt/movieshare/`
- or change the mount to an absolute host file path

Example:

```yaml
volumes:
  - /opt/movieshare/infra/nginx/media-cdn.conf:/etc/nginx/nginx.conf:ro
  - media-cdn-cache:/var/cache/nginx
```

Also note:

- if you use the built-in MinIO root user as the S3 credential for the app, `STORAGE_ACCESS_KEY` and `STORAGE_SECRET_KEY` must match `MINIO_ROOT_USER` and `MINIO_ROOT_PASSWORD`
- if you want different storage credentials, create a dedicated MinIO user first; otherwise the app will fail to read/write media even after the containers start
- for the `minio-init` helper, prefer `mc ready <alias>` after `mc alias set`; `alias set` alone does not guarantee the server is ready for bucket creation and public-policy commands, and this can surface as early `exit 2` failures in stack deploys

## Docker Hub optional publish

The workflow also pushes to Docker Hub when all of the following are configured in GitHub:

- repository variable `DOCKERHUB_NAMESPACE`
- secret `DOCKERHUB_USERNAME`
- secret `DOCKERHUB_TOKEN`

Without those settings, the workflow publishes only to `ghcr.io`.

## Private package note

GitHub Container Registry packages are private by default on first publish. If you want
anonymous pulls from production hosts, make the package public in GitHub Packages.

If you keep the package private, authenticate on the server before pulling:

```bash
echo "$GHCR_PAT" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

The PAT should have at least `read:packages`.
