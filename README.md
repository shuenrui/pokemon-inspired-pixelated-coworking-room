# TileTown Coworking

TileTown Coworking is a Pokemon-inspired pixel coworking sim built as a web-first monorepo. The goal is a top-down, tile-based social workspace where players walk on a strict grid, decorate rooms, and eventually create or share content through tooling.

## Workspace layout

- `apps/web`: Playable client built with React, Vite, and Phaser.
- `packages/content`: Shared game data for rooms, items, NPCs, and themes.
- `packages/engine`: Gameplay rules and room simulation helpers.
- `packages/ui`: Shared UI primitives for app overlays and editor tools.
- `packages/cli`: Future creator tooling for content scaffolding and validation.
- `docs`: Product brief, art rules, and milestone planning.

## Current scope

The repository is scaffolded for v0:

- one indoor coworking room
- one controllable avatar
- four-direction grid movement
- room decoration mode
- shared content definitions
- future-ready package boundaries

## State model

The prototype now uses two layers of room data:

- `RoomDefinition`: static map, collision, entry, and interaction points
- `RoomSnapshot`: live players, NPCs, and placed items

The frontend adapter lives in `apps/web/src/data/roomState.ts` and `apps/web/src/data/roomService.ts`. This keeps the scene ready for a future database or realtime backend instead of hardcoded local simulation.

## Backend docs

- `docs/database-schema.md`: recommended relational schema
- `docs/api-contract.md`: room snapshot request/response shapes
- `docs/deployment.md`: container and runtime deployment notes

## First steps

1. Install dependencies with `npm install`.
2. Run the web app with `npm run dev`.
3. Build the first playable room scene in `apps/web`.

## Live mode

The frontend defaults to mock room state. To use the local API server path:

1. Run `npm run build --workspace @tiletown/server`.
2. Run `npm run dev:server`.
3. Start the web app with `VITE_ROOM_SOURCE=live npm run dev`.

The Vite dev server proxies `/api/*` requests to `http://localhost:8787`.
The SQLite database is created at `apps/server/data/tiletown.db`.

## Production run

1. Run `npm run build`
2. Copy `.env.example` to `.env` if you want custom runtime settings
3. Run `npm run migrate --workspace @tiletown/server`
4. Run `npm run start --workspace @tiletown/server`
5. Open `http://localhost:8787`

The production server serves both the API and the built web app from one process.
