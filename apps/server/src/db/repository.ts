import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createMockRoomSnapshot,
  furnitureCatalog,
  starterPlacedItems,
  starterRoomDefinition,
  type FacingDirection,
  type PlacedItem,
  type RoomActor,
  type RoomDefinition,
  type RoomSnapshot
} from "@tiletown/content";
import { canOccupyTile, canPlaceFurniture } from "@tiletown/engine";

const presenceTimeoutMs = 1000 * 60 * 2;

type MemberRow = {
  actor_id: string;
  actor_type: RoomActor["kind"];
  display_name: string;
  sprite_id: string;
  color: number;
  position_x: number;
  position_y: number;
  facing: FacingDirection;
  movement_mode: "idle" | "walking" | "sync";
  movement_target_x: number | null;
  movement_target_y: number | null;
  movement_updated_at: string;
  updated_at: string;
};

type ItemRow = {
  id: string;
  item_id: string;
  position_x: number;
  position_y: number;
};

export class SqliteRoomRepository {
  private readonly db: Database.Database;

  constructor(databaseFile = getDefaultDatabasePath()) {
    mkdirSync(dirname(databaseFile), { recursive: true });
    this.db = new Database(databaseFile);
    this.db.pragma("journal_mode = WAL");
    this.initialize();
    this.seedStarterRoom();
  }

  getRoomDefinition(roomId: string): RoomDefinition | null {
    const row = this.db
      .prepare(
        `
        SELECT id, name, tiles_json, collision_json, entry_x, entry_y, interaction_points_json
        FROM room_definitions
        WHERE id = ?
        `
      )
      .get(roomId) as
      | {
          id: string;
          name: string;
          tiles_json: string;
          collision_json: string;
          entry_x: number;
          entry_y: number;
          interaction_points_json: string;
        }
      | undefined;

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      name: row.name,
      tiles: JSON.parse(row.tiles_json),
      collision: JSON.parse(row.collision_json),
      entry: { x: row.entry_x, y: row.entry_y },
      interactionPoints: JSON.parse(row.interaction_points_json)
    };
  }

  getRoomSnapshot(roomId: string, localPlayerId?: string) {
    const room = this.db
      .prepare("SELECT id FROM rooms WHERE id = ?")
      .get(roomId) as { id: string } | undefined;

    if (!room) {
      return null;
    }

    const members = this.db
      .prepare(
        `
        SELECT actor_id, actor_type, display_name, sprite_id, color, position_x, position_y,
               facing, movement_mode, movement_target_x, movement_target_y, movement_updated_at,
               updated_at
        FROM room_members
        WHERE room_id = ?
        ORDER BY actor_type, actor_id
        `
      )
      .all(roomId) as MemberRow[];

    const items = this.db
      .prepare(
        `
        SELECT id, item_id, position_x, position_y
        FROM room_items
        WHERE room_id = ?
        ORDER BY id
        `
      )
      .all(roomId) as ItemRow[];

    const players = members
      .filter(
        (member) =>
          member.actor_type === "player" &&
          (member.actor_id === localPlayerId || isPresenceFresh(member.updated_at))
      )
      .map((member) => toActor(member));
    const npcs = members
      .filter((member) => member.actor_type === "npc")
      .map((member) => toActor(member));

    return {
      roomId,
      localPlayerId: localPlayerId ?? players[0]?.id ?? "",
      players,
      npcs,
      placedItems: items.map((item) => ({
        id: item.id,
        itemId: item.item_id,
        x: item.position_x,
        y: item.position_y
      }))
    } satisfies RoomSnapshot;
  }

  savePlacedItems(roomId: string, placedItems: PlacedItem[]) {
    const snapshot = this.getRoomSnapshot(roomId);
    if (!snapshot || !this.isValidPlacedItems(roomId, placedItems)) {
      return null;
    }

    const clearStatement = this.db.prepare("DELETE FROM room_items WHERE room_id = ?");
    const insertStatement = this.db.prepare(
      `
      INSERT INTO room_items (id, room_id, item_id, position_x, position_y, placed_by_actor_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, NULL, ?, ?)
      `
    );

    const transaction = this.db.transaction((items: PlacedItem[]) => {
      clearStatement.run(roomId);
      const timestamp = new Date().toISOString();
      items.forEach((item) => {
        insertStatement.run(
          item.id,
          roomId,
          item.itemId,
          item.x,
          item.y,
          timestamp,
          timestamp
        );
      });
    });

    transaction(placedItems);
    return this.getRoomSnapshot(roomId, snapshot.localPlayerId);
  }

  updatePlayerPosition(
    roomId: string,
    playerId: string,
    position: { x: number; y: number; facing: FacingDirection }
  ) {
    const snapshot = this.getRoomSnapshot(roomId, playerId);
    if (!snapshot || !canOccupyTile(starterRoomDefinition.collision, snapshot.placedItems, position)) {
      return null;
    }

    const result = this.db
      .prepare(
        `
        UPDATE room_members
        SET position_x = ?, position_y = ?, facing = ?, movement_mode = ?, movement_target_x = NULL,
            movement_target_y = NULL, movement_updated_at = ?, updated_at = ?
        WHERE room_id = ? AND actor_id = ? AND actor_type = 'player'
        `
      )
      .run(
        position.x,
        position.y,
        position.facing,
        "sync",
        new Date().toISOString(),
        new Date().toISOString(),
        roomId,
        playerId
      );

    if (result.changes === 0) {
      return null;
    }

    return this.getRoomSnapshot(roomId, playerId);
  }

  ensurePlayer(roomId: string, playerId: string, displayName: string) {
    const existing = this.db
      .prepare(
        `
        SELECT actor_id
        FROM room_members
        WHERE room_id = ? AND actor_id = ? AND actor_type = 'player'
        `
      )
      .get(roomId, playerId) as { actor_id: string } | undefined;

    if (!existing) {
      const now = new Date().toISOString();
      const color = getColorForPlayer(playerId);
      this.db
        .prepare(
          `
          INSERT INTO room_members (
            id, room_id, actor_id, actor_type, display_name, sprite_id, color,
            position_x, position_y, facing, movement_mode, movement_target_x,
            movement_target_y, movement_updated_at, metadata_json, created_at, updated_at
          ) VALUES (?, ?, ?, 'player', ?, 'avatar-player', ?, ?, ?, 'down', 'sync', NULL, NULL, ?, '{}', ?, ?)
          `
        )
        .run(
          `${roomId}:player:${playerId}`,
          roomId,
          playerId,
          displayName,
          color,
          starterRoomDefinition.entry.x,
          starterRoomDefinition.entry.y,
          now,
          now,
          now
        );
    } else {
      this.db
        .prepare(
          `
          UPDATE room_members
          SET display_name = ?, updated_at = ?
          WHERE room_id = ? AND actor_id = ? AND actor_type = 'player'
          `
        )
        .run(displayName, new Date().toISOString(), roomId, playerId);
    }

    return this.getRoomSnapshot(roomId, playerId);
  }

  touchPlayerPresence(roomId: string, playerId: string) {
    const now = new Date().toISOString();
    const result = this.db
      .prepare(
        `
        UPDATE room_members
        SET updated_at = ?
        WHERE room_id = ? AND actor_id = ? AND actor_type = 'player'
        `
      )
      .run(now, roomId, playerId);

    if (result.changes === 0) {
      return null;
    }

    return this.getRoomSnapshot(roomId, playerId);
  }

  markPlayerOffline(roomId: string, playerId: string) {
    const staleTime = new Date(Date.now() - presenceTimeoutMs * 2).toISOString();
    const result = this.db
      .prepare(
        `
        UPDATE room_members
        SET updated_at = ?
        WHERE room_id = ? AND actor_id = ? AND actor_type = 'player'
        `
      )
      .run(staleTime, roomId, playerId);

    if (result.changes === 0) {
      return null;
    }

    return this.getRoomSnapshot(roomId, playerId);
  }

  private initialize() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS room_definitions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        tile_width INTEGER NOT NULL,
        tile_height INTEGER NOT NULL,
        tiles_json TEXT NOT NULL,
        collision_json TEXT NOT NULL,
        entry_x INTEGER NOT NULL,
        entry_y INTEGER NOT NULL,
        interaction_points_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        definition_id TEXT NOT NULL,
        name TEXT NOT NULL,
        visibility TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS room_members (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        actor_id TEXT NOT NULL,
        actor_type TEXT NOT NULL,
        display_name TEXT NOT NULL,
        sprite_id TEXT NOT NULL,
        color INTEGER NOT NULL,
        position_x INTEGER NOT NULL,
        position_y INTEGER NOT NULL,
        facing TEXT NOT NULL,
        movement_mode TEXT NOT NULL,
        movement_target_x INTEGER,
        movement_target_y INTEGER,
        movement_updated_at TEXT NOT NULL,
        metadata_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_room_members_room_actor
        ON room_members(room_id, actor_id);

      CREATE TABLE IF NOT EXISTS room_items (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        item_id TEXT NOT NULL,
        position_x INTEGER NOT NULL,
        position_y INTEGER NOT NULL,
        placed_by_actor_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_room_items_room
        ON room_items(room_id);
    `);
  }

  private seedStarterRoom() {
    const existingRoom = this.db
      .prepare("SELECT id FROM rooms WHERE id = ?")
      .get(starterRoomDefinition.id) as { id: string } | undefined;

    if (existingRoom) {
      return;
    }

    const now = new Date().toISOString();
    const snapshot = createMockRoomSnapshot();

    this.db
      .prepare(
        `
        INSERT INTO room_definitions (
          id, name, tile_width, tile_height, tiles_json, collision_json, entry_x, entry_y,
          interaction_points_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        starterRoomDefinition.id,
        starterRoomDefinition.name,
        starterRoomDefinition.tiles[0]?.length ?? 0,
        starterRoomDefinition.tiles.length,
        JSON.stringify(starterRoomDefinition.tiles),
        JSON.stringify(starterRoomDefinition.collision),
        starterRoomDefinition.entry.x,
        starterRoomDefinition.entry.y,
        JSON.stringify(starterRoomDefinition.interactionPoints),
        now,
        now
      );

    this.db
      .prepare(
        `
        INSERT INTO rooms (id, definition_id, name, visibility, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        starterRoomDefinition.id,
        starterRoomDefinition.id,
        starterRoomDefinition.name,
        "public",
        now,
        now
      );

    const insertMember = this.db.prepare(
      `
      INSERT INTO room_members (
        id, room_id, actor_id, actor_type, display_name, sprite_id, color,
        position_x, position_y, facing, movement_mode, movement_target_x,
        movement_target_y, movement_updated_at, metadata_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '{}', ?, ?)
      `
    );

    [...snapshot.players, ...snapshot.npcs].forEach((actor) => {
      insertMember.run(
        `${starterRoomDefinition.id}:${actor.kind}:${actor.id}`,
        starterRoomDefinition.id,
        actor.id,
        actor.kind,
        actor.displayName,
        actor.spriteId,
        actor.color,
        actor.position.x,
        actor.position.y,
        actor.facing,
        actor.movement.mode,
        actor.movement.target?.x ?? null,
        actor.movement.target?.y ?? null,
        actor.movement.updatedAt,
        now,
        now
      );
    });

    this.savePlacedItems(starterRoomDefinition.id, starterPlacedItems);
  }

  private isValidPlacedItems(roomId: string, placedItems: PlacedItem[]) {
    const roomDefinition = this.getRoomDefinition(roomId);
    if (!roomDefinition) {
      return false;
    }

    const validated: PlacedItem[] = [];
    for (const item of placedItems) {
      const definition = furnitureCatalog.find((candidate) => candidate.id === item.itemId);
      if (!definition) {
        return false;
      }

      if (
        !canPlaceFurniture(
          roomDefinition.collision,
          validated,
          definition,
          { x: item.x, y: item.y }
        )
      ) {
        return false;
      }

      validated.push({ ...item });
    }

    return true;
  }
}

function toActor(row: MemberRow): RoomActor {
  return {
    id: row.actor_id,
    kind: row.actor_type,
    displayName: row.display_name,
    spriteId: row.sprite_id,
    color: row.color,
    position: {
      x: row.position_x,
      y: row.position_y
    },
    facing: row.facing,
    movement: {
      mode: row.movement_mode,
      target:
        row.movement_target_x === null || row.movement_target_y === null
          ? null
          : {
              x: row.movement_target_x,
              y: row.movement_target_y
            },
      updatedAt: row.movement_updated_at
    }
  };
}

function getDefaultDatabasePath() {
  const currentFile = fileURLToPath(import.meta.url);
  return join(dirname(currentFile), "../../data/tiletown.db");
}

function getColorForPlayer(playerId: string) {
  const palette = [0xd26451, 0x5d9cec, 0x77c7d9, 0xf2a65a, 0x9a6dd7, 0x58a04a];
  let hash = 0;
  for (let index = 0; index < playerId.length; index += 1) {
    hash = (hash + playerId.charCodeAt(index)) % palette.length;
  }

  return palette[hash];
}

function isPresenceFresh(updatedAt: string) {
  return Date.now() - new Date(updatedAt).getTime() <= presenceTimeoutMs;
}
