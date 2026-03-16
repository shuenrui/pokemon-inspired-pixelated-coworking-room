# TileTown Coworking v0 Brief

## Vision

Build a cozy, top-down pixel coworking sim inspired by classic handheld monster-RPG interiors. The game should prioritize readable tile logic, expressive room decoration, and light social ambience over combat-heavy systems.

## Design pillars

- Tile-first movement and placement.
- Cozy productivity fantasy.
- Original public-facing IP, not direct Pokemon branding.
- Structured rules with expressive decoration.
- Web-first delivery with future creator tooling.

## MVP

- One indoor coworking room.
- One player avatar with four-direction movement.
- Tile collision and front-facing interaction.
- Decoration mode with 10 to 15 placeable objects.
- Three ambient NPCs with simple idle behavior.
- Local save/load for room layout.

## Core rules

- Tile size is `16x16`.
- Rendering scale is `4x`.
- Characters move one tile at a time.
- No diagonal movement.
- Furniture snaps to the grid.
- Placement must respect blocked tiles and door access.
- Objects use fixed footprints such as `1x1`, `2x1`, and `2x2`.

## Technical direction

- `TypeScript`
- `React`
- `Vite`
- `Phaser`
- `Tiled`
- `Zustand`
- Shared JSON content packages

## Milestones

### Milestone 1

- Repo scaffold
- Room scene shell
- Player movement controller
- Collision layer
- Minimal decoration flow

### Milestone 2

- NPC routines
- Additional decor sets
- Room themes
- Save/load polish

### Milestone 3

- Multi-room support
- Creator CLI
- Content validation
- Community layout sharing
