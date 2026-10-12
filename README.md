# Dead Cells Roulette

React, TypeScript, and Tailwind frontend with a PHP API. The app runs alongside
`pokemon-emerald-ex-dex`, in its own `/dead-cells-roulette/` directory and using
the same existing MySQL/MariaDB database. Node.js and npm provide local tooling
and frontend builds; production hosting runs PHP directly.

The index page displays the supplied Dead Cells logo centered over full-screen artwork. The logo scales to fit smaller screens. Portrait screens anchor the background to the left to keep the character visible.

The backend currently exposes only a health endpoint. Database configuration is
prepared, but no tables, schema, migrations, queries, or application data access
are implemented. No database setup is required to develop or check this scaffold.

## Requirements

* Node.js version from `.nvmrc`
* npm version from `package.json`
* PHP 8.3 or newer for local development and checks; use PHP 8.4 on the shared
  Webzdarma hosting, matching the dex

## Setup

```bash
npm install
```

Copy `.env.example` to `.env`. The development launcher loads the root `.env`;
existing process environment variables take precedence. Set `PHP_BINARY` to the
PHP executable if `php` is not on PATH.

## Development

Run the API and frontend in separate terminals:

```bash
npm run dev
npm run dev:client
```

The PHP API listens on `http://127.0.0.1:3002` by default. The frontend uses
`http://localhost:5174` and refuses to silently switch ports. Its `/api` requests
are proxied to `DEV_API_TARGET`, which defaults to `http://127.0.0.1:3002`.
These ports keep the app separate from the dex's default development servers.

`npm run dev:server` and `npm run dev:php` start the same PHP API as `npm run dev`.
`npm start` also starts this local PHP server; it is not a production server.
Set `PORT` and `DEV_API_TARGET` together when changing the API address.

## API

* `GET /api/health` returns `{"ok":true}`.
* `HEAD /api/health` returns the same status and headers with no response body.
* Under the hosting subfolder, the endpoint is
  `/dead-cells-roulette/api/health`.
* Unknown endpoints return HTTP 404. Unsupported methods return HTTP 405.
  API errors use `{"error":{"code":"…","message":"…"}}`.

Health checks do not load database credentials or open a database connection.

## Build and checks

```bash
npm run build
npm test
npm run check
```

The build prepares the frontend and shared TypeScript package and checks the PHP
source. The full check includes TypeScript, lint, formatting, PHP syntax, and HTTP
tests that need no database. PHP CLI is required; missing PHP fails checks rather
than silently skipping the backend tests. Always run `npm run check` before
committing.

For an upload bundle using the hosting subfolder, run `npm run build:webzdarma`.

## Environment variables

The root `.env.example` documents local settings:

| Variable | Purpose |
| --- | --- |
| `PHP_BINARY` | PHP CLI executable, default `php` |
| `PORT` | Local PHP API port, default `3002` |
| `DEV_API_TARGET` | Vite proxy target, default `http://127.0.0.1:3002` |
| `DB_HOST`, `DB_PORT` | Existing shared database host and port |
| `DB_NAME`, `DB_USER`, `DB_PASS` | Existing shared database name and credentials |

Use the same database connection values as `pokemon-emerald-ex-dex`. Keep
credentials in ignored local files or server environment variables, never in
frontend code or `VITE_*` variables. Database settings are optional until data
access is implemented.

## Webzdarma deployment

```bash
npm run build:webzdarma
```

Upload the **contents** of `dist/webzdarma/` into the website's
`dead-cells-roulette/` directory. Include all hidden `.htaccess` files. The bundle
contains the frontend and PHP API; it does not require Node.js or npm on the host.
Select PHP 8.4 in the hosting panel.

On the server, copy `api/private/config.example.php` to
`api/private/config.local.php` and supply the existing shared database values.
The private directory denies HTTP access. The bundle excludes `config.local.php`
and `.env` files; preserve the server's configuration on subsequent uploads.
Process environment variables take precedence over `config.local.php`.

If the website root has its own API rewrites or SPA fallback, add the following
rule immediately after its `RewriteEngine On`, before those rules. Extend the
existing dex exemption instead of replacing the rest of the parent configuration:

```apache
RewriteRule ^(?:pokemon-emerald-ex-dex|dead-cells-roulette)(?:/|$) - [L]
```

Keep `[L]` so each application's child `.htaccess` can route its own API. `[END]`
would stop that child routing. Do not modify or overwrite the sibling dex folder.

Verify `/dead-cells-roulette/api/health` returns `{"ok":true}` and
`/dead-cells-roulette/api/private/config.local.php` returns HTTP 403. Health
confirms the API runtime only, not database connectivity. Local PHP HTTP tests
do not validate Apache's `.htaccess` configuration.

## Shared database boundary

Do not create or import any database tables for this scaffold. Future Dead Cells
tables, constraints, and indexes will use a separate `dead_cells_` prefix. The
dex owns its existing `emerald_ex_*` tables. Sharing a database does not authorize
changes to the dex or other applications' data.

## Project structure

```txt
apps/client/      Vite + React frontend
apps/server/php/  PHP API and protected server configuration
apps/server/test/ PHP syntax and HTTP tests
packages/shared/  Shared types/utilities
scripts/          Project automation scripts
docs/             Project notes and architecture decisions
.github/          GitHub Actions and dependency automation
```
