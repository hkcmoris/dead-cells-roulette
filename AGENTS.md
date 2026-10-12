# AGENTS.md

## Project overview

This project uses React + TypeScript for the frontend, PHP for the backend/API,
and Node.js + TypeScript for local tooling. It runs alongside
`pokemon-emerald-ex-dex` using the same existing database. Keep changes small,
explicit, and easy to review. Do not prepare database tables, schema, or migrations
until explicitly requested.

## Setup commands

```bash
npm install
```

## Common commands

```bash
npm run dev
npm run dev:client
npm run build
npm run build:webzdarma
npm test
npm run lint
npm run typecheck
npm run check
```

## Before committing

Always run:

```bash
npm run check
```

Do not claim the project passes checks unless the command has actually been run successfully.

## Code style

* Use TypeScript for the frontend, shared types, and tooling; use PHP for the backend/API.
* Use React + Tailwind for frontend.
* Prefer explicit types at public boundaries.
* Keep runtime code simple and boring.
* Avoid unnecessary dependencies.
* Prefer named exports unless the project already uses default exports.
* Do not mix formatting styles; follow Prettier.
* Do not silently rewrite unrelated code.

## File and folder conventions

* Vite + React frontend source code lives in `apps/client/src/`.
* PHP backend/API source code lives in `apps/server/php/`; internal code and configuration live in its protected `private/` directory.
* Shared types/utilities source code lives in `packages/shared/src/`.
* Tests live in `apps/server/test/`, `packages/shared/test/` or next to the file being tested as `*.test.ts`.
* Project scripts live in `scripts/`.
* Architecture notes live in `docs/adr/`.

## Dependency rules

* Do not add dependencies unless they clearly reduce complexity.
* Prefer built-in PHP or Node.js APIs, as appropriate, when reasonable.
* If adding a dependency, explain why it is needed.

## Safety rules

* Never commit secrets, tokens, passwords, certificates, or `.env` files.
* Never commit `config.local.php` or include it in deployment bundles.
* Keep API paths under this app's base path. Do not modify the sibling application's files or `emerald_ex_*` database tables.
* Reserve `dead_cells_` for future app-owned tables, constraints, and indexes; do not create them yet.
* Keep `.env.example` updated when environment variables change.
* Do not remove tests or checks just to make CI pass.

## Git rules

* Keep commits focused.
* Do not include generated build output unless the project explicitly requires it.
* If behavior changes, update the README or docs.
