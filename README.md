# TileTown Coworking

TileTown Coworking is a Pokemon-inspired pixel coworking sim built as a web-first monorepo. The current active runtime is a canvas-based room experience with pre-rendered background and foreground maps, centered-player movement, flat collision data, and zone-based coworking agents.

## Workspace layout

- `apps/web`: Playable client built with React, Vite, and a canvas room renderer.
- `packages/content`: Shared game data for rooms, items, NPCs, and themes.
- `packages/engine`: Gameplay rules and room simulation helpers.
- `packages/ui`: Shared UI primitives for app overlays and editor tools.
- `packages/cli`: Future creator tooling for content scaffolding and validation.
- `docs`: Product brief, art rules, and milestone planning.

## Current scope

The current staging scope includes:

- one modern coworking room
- one controllable avatar
- four-direction grid movement
- zone-based agent positioning
- static background/foreground map rendering
- shared content definitions
- deployment paths for both full-stack hosting and frontend-only preview

## State model

The app uses two layers of room data:

- `RoomDefinition`: static map, collision, entry, and interaction points
- `RoomSnapshot`: live players, NPCs, and placed items

The frontend adapter lives in `apps/web/src/data/roomState.ts` and `apps/web/src/data/roomService.ts`. This keeps the scene ready for a database-backed or realtime backend instead of hardcoded local simulation.

## Backend docs

- `docs/database-schema.md`: recommended relational schema
- `docs/api-contract.md`: room snapshot request/response shapes
- `docs/deployment.md`: container and runtime deployment notes

## Local preview

1. Install dependencies with `npm install`.
2. Run the web app with `npm run dev`.
3. Open the local Vite URL.

## Live mode

The frontend defaults to mock room state. To use the local API server path:

1. Run `npm run build --workspace @tiletown/server`.
2. Run `npm run dev:server`.
3. Start the web app with `VITE_ROOM_SOURCE=live npm run dev`.

The Vite dev server proxies `/api/*` requests to `http://localhost:8787`.
The SQLite database is created at `apps/server/data/tiletown.db`.

## Vercel preview

For the fastest public preview, deploy the frontend-only experience to Vercel:

1. Import the repo into Vercel.
2. Keep the repo root as the project root.
3. Set environment variable `VITE_ROOM_SOURCE=mock`.
4. Deploy.

The Vercel path is intended for visual review and interaction preview only. It does not include the Node API server, SSE sync, or SQLite persistence.

## Production run

1. Run `npm run build`
2. Copy `.env.example` to `.env` if you want custom runtime settings
3. Run `npm run migrate --workspace @tiletown/server`
4. Run `npm run start --workspace @tiletown/server`
5. Open `http://localhost:8787`

The production server serves both the API and the built web app from one process.
