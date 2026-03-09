# movieshare agent notes

## Required reading

- Read `docs/session-handbook.md` at the start of each substantial session.
- If scope or priorities changed, also review `docs/development-plan.md`.

## Persistent update rule

After every substantial implementation, bugfix, audit, or architectural decision:

1. update `docs/session-handbook.md`
2. refresh objectives, checklist state, and any new fundamental rule
3. note blockers or unresolved risks that matter for future sessions

## Core project rules

- Prefer reusable components over one-off UI logic.
- Extend existing form, time, and realtime primitives before creating new ad hoc variants.
- Keep streaming integrations isolated under `server/services/streaming`.
- Do not remove, downgrade to placeholder, or replace a user-provided streaming integration unless the user explicitly asks for it.
- You may improve, stabilize, test, refactor, or extend a user-provided streaming integration, but you must not author or substitute the provider-specific integration logic on the user's behalf.
- Do not present placeholder providers as production-ready playback integrations.
- Prefer server components and server actions unless client interactivity is necessary.
- Keep install and Docker bootstrap simple; avoid regressions in first-run setup.
- Run the relevant validation commands before closing work and commit meaningful changes.
