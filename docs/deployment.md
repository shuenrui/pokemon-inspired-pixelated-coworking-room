# Deployment

## Single-process runtime

The server can now serve both:

- API routes under `/api/*`
- Server-sent events under `/api/rooms/:roomId/stream`
- built frontend assets from `apps/web/dist`

That means the simplest deployment unit is one Node process.

## Environment

- `PORT`: server port, default `8787`
- `WEB_DIST_DIR`: built frontend directory, default `apps/web/dist`
- `ALLOW_ORIGIN`: CORS origin, default `*`
- `ADMIN_TOKEN`: optional bearer token required for mutation endpoints

## Local production check

1. Run `npm run build`
2. Optionally copy `.env.example` to `.env` and set `ADMIN_TOKEN`
3. Run `npm run migrate --workspace @tiletown/server`
4. Run `npm run start --workspace @tiletown/server`
5. Open [http://localhost:8787](http://localhost:8787)

## Docker

Build and run:

```bash
docker build -t tiletown-coworking .
docker run -p 8787:8787 -v "$(pwd)/apps/server/data:/app/apps/server/data" tiletown-coworking
```

Or use:

```bash
docker compose up --build
```

## Hosted runtime direction

This project is now suited to:

- a single VM or container host
- Fly.io, Render, Railway, or similar Node hosting
- a later move to Postgres or another hosted database

## Render

The repo now includes [render.yaml](/Users/leeshuenrui/Documents/Playground/render.yaml) for a Docker-based Render deployment.

Expected setup on Render:

1. Create a new Blueprint deployment from the repo.
2. The service name is set to `tiletown-coworking-staging`.
3. Set `ADMIN_TOKEN` in the Render dashboard.
4. Keep the persistent disk mounted at `/app/apps/server/data`.
5. Deploy the service and verify `/health`.
6. Open the staging URL and confirm:
   - the modern office room renders
   - player movement works
   - SSE room updates connect
   - SQLite data persists across restarts

Recommended first staging pass:

- deploy this app as the main staging experience
- do not keep iterating on the old OpenClaw dashboard UI
- if needed, use the old dashboard only as a link or redirect into the new staging URL

## CI

The repo now includes [ci.yml](/Users/leeshuenrui/Documents/Playground/.github/workflows/ci.yml) so every push or pull request runs:

- `npm ci`
- `npm run check`
- `npm run build`

## Next production gaps

- auth and persistent user accounts
- rate limiting
- secure non-wildcard CORS policy
- database backups
