# Public Surface Guide

Last updated: March 11, 2026

## Why this exists

`movieshare` now has a branded public shell instead of relying on stock browser or framework defaults.

This guide exists so future sessions do not accidentally regress:

- app icons and favicon behavior
- Open Graph and Twitter previews
- public-route titles and descriptions
- custom 404 and error handling
- crawl/index rules for public vs private routes

## Current public-surface baseline

The app currently ships with:

- generated app icon route at `/icon`
- generated Apple icon route at `/apple-icon`
- branded Open Graph preview at `/opengraph-image`
- branded Twitter preview at `/twitter-image`
- custom public `404` page
- custom authenticated `404` page
- custom root error page
- `robots.txt`
- `sitemap.xml`

Core implementation files:

- `app/layout.tsx`
- `app/icon.tsx`
- `app/apple-icon.tsx`
- `app/opengraph-image.tsx`
- `app/twitter-image.tsx`
- `app/not-found.tsx`
- `app/(app)/not-found.tsx`
- `app/error.tsx`
- `app/robots.ts`
- `app/sitemap.ts`
- `server/site-config.ts`
- `components/metadata/brand-tile.tsx`
- `components/metadata/social-preview-image.tsx`
- `components/feedback/route-state-card.tsx`

## Metadata rules

When adding or changing a public-facing route:

- do not leave generic app-level metadata if the route has its own clear purpose
- add explicit `title` and `description` where sharing or indexing matters
- use `noindex` for login, invites, authenticated areas and other non-discoverable flows
- keep `metadataBase` derived from `BETTER_AUTH_URL` through `server/site-config.ts`
- prefer one shared site-config source rather than hardcoding hostnames in route files

Public-facing routes that deserve deliberate metadata first:

- landing page
- any future marketing/about/pricing/help pages
- public invite or share routes
- any future public movie/list showcase route

Routes that should stay non-indexed unless requirements change:

- `/login`
- `/register`
- `/invites/*`
- authenticated app routes under `(app)`
- admin surfaces

## Social preview rules

The current OG/Twitter images are generated through `next/og`.

That means:

- keep styling simple and inline
- avoid unsupported CSS values or browser-only assumptions
- prefer shared visual primitives like `BrandTile`
- do not add asset dependencies unless there is a clear gain

If the preview becomes route-specific in the future:

- reuse the shared visual language
- vary title/description payloads, not the whole design system each time
- keep readable contrast and stable branding

## Error and not-found rules

Stock error pages should not reappear.

Use:

- `app/not-found.tsx` for public missing routes
- `app/(app)/not-found.tsx` for authenticated missing routes
- `app/error.tsx` for root-level unexpected failures

If a major section needs a custom missing-state surface:

- prefer reusing `components/feedback/route-state-card.tsx`
- keep actions practical, with real recovery links
- keep copy plain-language and product-facing

## Testing expectations

Smoke coverage now verifies:

- landing page metadata presence
- custom 404 rendering

If you change public metadata or route-state UX:

- update `tests/ui/smoke.spec.ts`
- run the relevant Playwright coverage

## Future additions worth keeping in mind

- route-specific Open Graph metadata for public invite/share flows
- richer sitemap entries if true public content pages are added
- more deliberate public marketing copy if the landing surface expands
- richer structured data only if there is a real SEO/public-content need
