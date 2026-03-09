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

## GitHub Container Registry flow

1. Push a release tag:

```bash
git tag v1.0.0
git push origin v1.0.0
```

2. GitHub Actions publishes:

- `ghcr.io/<owner>/movieshare:1.0.0`
- `ghcr.io/<owner>/movieshare:1.0`
- `ghcr.io/<owner>/movieshare:1`
- `ghcr.io/<owner>/movieshare:latest`

3. On the production server, create an env file from `.env.production.example`.

4. Pull and run the image:

```bash
docker compose --env-file .env.production -f docker-compose.registry.yml pull
docker compose --env-file .env.production -f docker-compose.registry.yml up -d
```

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
