# Database Schema

## Goal

The app should store static room definitions separately from live room state. Static map data changes rarely. Live room state changes frequently and should be optimized for updates from players, NPC schedulers, or backend movement services.

## Recommended tables

### `room_definitions`

- `id` text primary key
- `name` text not null
- `tile_width` integer not null
- `tile_height` integer not null
- `tiles_json` jsonb not null
- `collision_json` jsonb not null
- `entry_x` integer not null
- `entry_y` integer not null
- `interaction_points_json` jsonb not null
- `created_at` timestamptz not null
- `updated_at` timestamptz not null

### `rooms`

- `id` text primary key
- `definition_id` text not null references `room_definitions(id)`
- `name` text not null
- `visibility` text not null
- `created_at` timestamptz not null
- `updated_at` timestamptz not null

This represents a live room instance based on a reusable room definition.

### `room_members`

- `id` uuid primary key
- `room_id` text not null references `rooms(id)`
- `actor_id` text not null
- `actor_type` text not null
- `display_name` text not null
- `sprite_id` text not null
- `color` integer not null
- `position_x` integer not null
- `position_y` integer not null
- `facing` text not null
- `movement_mode` text not null
- `movement_target_x` integer null
- `movement_target_y` integer null
- `movement_updated_at` timestamptz not null
- `metadata_json` jsonb not null default `'{}'::jsonb`
- `created_at` timestamptz not null
- `updated_at` timestamptz not null

Use this for both players and NPCs. `actor_type` can be `player` or `npc`.

### `room_items`

- `id` text primary key
- `room_id` text not null references `rooms(id)`
- `item_id` text not null
- `position_x` integer not null
- `position_y` integer not null
- `placed_by_actor_id` text null
- `created_at` timestamptz not null
- `updated_at` timestamptz not null

### `furniture_catalog`

- `id` text primary key
- `label` text not null
- `width` integer not null
- `height` integer not null
- `sprite_id` text not null
- `color` integer not null
- `metadata_json` jsonb not null default `'{}'::jsonb`

## Suggested indexes

- `room_members(room_id)`
- `room_items(room_id)`
- `room_members(room_id, actor_type)`
- `room_members(room_id, actor_id)` unique

## Separation rule

- `room_definitions` is versioned content
- `rooms`, `room_members`, and `room_items` are live state

That split matches the current frontend model of `RoomDefinition` plus `RoomSnapshot`.
