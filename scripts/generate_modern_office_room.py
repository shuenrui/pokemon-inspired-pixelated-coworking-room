from __future__ import annotations

import json
import shutil
import sys
from dataclasses import dataclass
from pathlib import Path

sys.path.insert(0, "/tmp/codex-pillow")

from PIL import Image  # type: ignore


ROOT = Path("/Users/leeshuenrui/Documents/Playground")
PACK_ROOT = Path("/tmp/modern_office_pack")
PUBLIC_ROOT = ROOT / "apps/web/public/coworking"
TILESET_PUBLIC = PUBLIC_ROOT / "tilesets"
OUTPUT_BG = PUBLIC_ROOT / "modern-office-room-background.png"
OUTPUT_FG = PUBLIC_ROOT / "modern-office-room-foreground.png"
OUTPUT_META = ROOT / "docs/generated-modern-office-room.json"
OUTPUT_RUNTIME_META = ROOT / "apps/web/src/coworking/generated-room-data.json"
OUTPUT_CONTENT_TS = ROOT / "packages/content/src/generatedRoomLayout.ts"

TILE = 16
WIDTH = 30
HEIGHT = 22


@dataclass(frozen=True)
class Zone:
    name: str
    label: str
    tiles: list[tuple[int, int]]


class Sheet:
    def __init__(self, path: Path):
        self.path = path
        self.image = Image.open(path).convert("RGBA")

    def tile(self, col: int, row: int) -> Image.Image:
        left = col * TILE
        top = row * TILE
        return self.image.crop((left, top, left + TILE, top + TILE))


room_builder = Sheet(PACK_ROOT / "1_Room_Builder_Office/Room_Builder_Office_16x16.png")
office = Sheet(PACK_ROOT / "Modern_Office_16x16.png")


canvas = Image.new("RGBA", (WIDTH * TILE, HEIGHT * TILE), (0, 0, 0, 0))
foreground = Image.new("RGBA", (WIDTH * TILE, HEIGHT * TILE), (0, 0, 0, 0))
collision_grid = [[0 for _ in range(WIDTH)] for _ in range(HEIGHT)]


def paste_tile(target: Image.Image, sheet: Sheet, col: int, row: int, x: int, y: int):
    target.alpha_composite(sheet.tile(col, row), (x * TILE, y * TILE))


def paste_grid(target: Image.Image, sheet: Sheet, coords: list[list[tuple[int, int] | None]], x: int, y: int):
    for dy, row in enumerate(coords):
        for dx, coord in enumerate(row):
            if coord is None:
                continue
            col, tile_row = coord
            paste_tile(target, sheet, col, tile_row, x + dx, y + dy)


def fill_floor(x0: int, y0: int, width: int, height: int, pattern: list[tuple[int, int]]):
    for y in range(y0, y0 + height):
        for x in range(x0, x0 + width):
            col, row = pattern[(x + y) % len(pattern)]
            paste_tile(canvas, room_builder, col, row, x, y)


def block_tiles(x0: int, y0: int, width: int, height: int):
    for y in range(y0, y0 + height):
        for x in range(x0, x0 + width):
            if 0 <= x < WIDTH and 0 <= y < HEIGHT:
                collision_grid[y][x] = 1025


def draw_walls():
    wall_rows = [
        [(10, 0), (11, 0), (12, 0), (13, 0)],
        [(10, 1), (11, 1), (12, 1), (13, 1)],
        [(10, 2), (11, 2), (12, 2), (13, 2)],
        [(10, 3), (11, 3), (12, 3), (13, 3)],
    ]

    for y in range(HEIGHT):
        for x in range(WIDTH):
            if y < 4:
                col, row = wall_rows[y % len(wall_rows)][x % 4]
                paste_tile(canvas, room_builder, col, row, x, y)
                collision_grid[y][x] = 1025
            elif x == 0 or x == WIDTH - 1 or y == HEIGHT - 1:
                paste_tile(canvas, room_builder, 10 + ((x + y) % 4), 2 + (y % 2), x, y)
                collision_grid[y][x] = 1025


def draw_base_floors():
    fill_floor(1, 4, 28, 17, [(10, 6), (11, 6), (12, 6)])
    fill_floor(1, 4, 9, 8, [(10, 7), (11, 7)])
    fill_floor(18, 9, 10, 7, [(13, 7), (14, 7), (15, 7)])
    fill_floor(10, 16, 10, 5, [(13, 7), (14, 7)])
    fill_floor(20, 16, 8, 5, [(10, 6), (11, 6)])
    fill_floor(10, 9, 8, 5, [(13, 6), (10, 6)])


def draw_entry_path():
    for x in range(13, 17):
        paste_tile(canvas, room_builder, 10 + ((x - 13) % 3), 6, x, HEIGHT - 1)
        collision_grid[HEIGHT - 1][x] = 0


def add_wall_decor():
    paste_grid(canvas, office, [[(7, 11)], [(7, 12)]], 6, 1)
    paste_grid(canvas, office, [[(8, 11)], [(8, 12)]], 8, 1)
    paste_grid(canvas, office, [[(9, 11), (10, 11), (11, 11)], [(9, 12), (10, 12), (11, 12)]], 20, 1)
    paste_grid(canvas, office, [[(0, 12), (1, 12)], [(2, 12), None]], 15, 1)


def add_tall_foreground_object(coords: list[list[tuple[int, int] | None]], x: int, y: int, blocked_rows: int):
    if len(coords) > blocked_rows:
        paste_grid(foreground, office, coords[:1], x, y)
        paste_grid(canvas, office, coords[1:], x, y + 1)
    else:
        paste_grid(canvas, office, coords, x, y)
    block_tiles(x, y, len(coords[0]), blocked_rows)


def add_desk_cluster(x: int, y: int, label_seed: int):
    desk_top = [[(4, 45), (5, 45), (6, 45)], [(4, 48), (5, 48), (6, 48)]]
    paste_grid(canvas, office, desk_top, x, y)
    block_tiles(x, y, 3, 2)

    screen_choices = [
        [[(10, 35)], [(12, 36)]],
        [[(11, 35)], [(12, 35)]],
        [[(12, 35)], [(12, 36)]],
        [[(10, 39)], [(11, 39)]],
    ]
    paste_grid(canvas, office, screen_choices[label_seed % len(screen_choices)], x + 1, y)

    chair_tile = (8, 35) if label_seed % 2 == 0 else (9, 35)
    paste_tile(canvas, office, chair_tile[0], chair_tile[1], x + 1, y + 2)
    block_tiles(x + 1, y + 2, 1, 1)

    paste_tile(canvas, office, 12 + (label_seed % 2), 47, x + 3, y + 1)
    paste_tile(canvas, office, 12 + (label_seed % 2), 48, x + 3, y + 2)
    block_tiles(x + 3, y + 1, 1, 2)


def add_server_area():
    rack_small = [[(0, 24), (1, 24)], [(0, 25), (1, 25)]]
    rack_large = [[(2, 24), (3, 24), (4, 24)], [(2, 25), (3, 25), (4, 25)]]
    paste_grid(canvas, office, rack_small, 2, 10)
    paste_grid(canvas, office, rack_small, 2, 13)
    paste_grid(canvas, office, rack_large, 5, 10)
    paste_grid(canvas, office, rack_large, 5, 13)
    block_tiles(2, 10, 2, 2)
    block_tiles(2, 13, 2, 2)
    block_tiles(5, 10, 3, 2)
    block_tiles(5, 13, 3, 2)

    add_tall_foreground_object([[(14, 41), (15, 41)], [(14, 42), (15, 42)]], 2, 17, 2)
    add_tall_foreground_object([[(14, 39), (15, 39)], [(14, 42), (15, 42)]], 6, 17, 2)


def add_comms_station():
    station = [[(10, 31), (11, 31), (12, 31)], [(10, 33), (11, 33), (12, 33)]]
    paste_grid(canvas, office, station, 9, 12)
    block_tiles(9, 12, 3, 2)
    paste_tile(canvas, office, 8, 24, 9, 15)
    paste_tile(canvas, office, 9, 24, 10, 15)
    block_tiles(9, 15, 2, 1)


def add_chief_office():
    # divider wall
    for y in range(9, 16):
      paste_tile(canvas, room_builder, 8, 2 if y < 12 else 3, 17, y)
      collision_grid[y][17] = 1025
    for x in range(18, 28):
      paste_tile(canvas, room_builder, 1 + ((x - 18) % 5), 1, x, 9)
      collision_grid[9][x] = 1025

    desk = [[(4, 45), (5, 45), (6, 45)], [(4, 48), (5, 48), (6, 48)]]
    paste_grid(canvas, office, desk, 21, 12)
    paste_grid(canvas, office, [[(10, 35)], [(12, 36)]], 22, 12)
    paste_tile(canvas, office, 9, 35, 22, 14)
    block_tiles(21, 12, 3, 2)
    block_tiles(22, 14, 1, 1)

    couch = [[(0, 18), (1, 18), (2, 18)], [(0, 20), (1, 20), (2, 20)]]
    paste_grid(canvas, office, couch, 24, 11)
    block_tiles(24, 11, 3, 2)
    paste_tile(canvas, office, 13, 48, 26, 14)
    paste_tile(canvas, office, 13, 49, 26, 15)
    block_tiles(26, 14, 1, 2)


def add_cafe_lounge():
    rug = [[(13, 19), (14, 19)], [(13, 20), (14, 20)]]
    paste_grid(canvas, office, rug, 12, 17)
    paste_grid(canvas, office, rug, 14, 17)

    counter = [[(0, 45), (1, 45), (2, 45)], [(0, 48), (1, 48), (2, 48)]]
    paste_grid(canvas, office, counter, 11, 18)
    block_tiles(11, 18, 3, 2)
    paste_grid(canvas, office, [[(0, 10), (1, 10)], [(0, 11), (1, 11)]], 16, 18)
    block_tiles(16, 18, 2, 2)
    paste_tile(canvas, office, 10, 47, 19, 18)
    paste_tile(canvas, office, 10, 48, 19, 19)
    block_tiles(19, 18, 1, 2)


def add_whiteboard_area():
    whiteboard = [[(9, 11), (10, 11), (11, 11)], [(9, 12), (10, 12), (11, 12)]]
    paste_grid(foreground, office, [whiteboard[0]], 23, 17)
    paste_grid(canvas, office, [whiteboard[1]], 23, 18)
    block_tiles(23, 17, 3, 2)

    table = [[(13, 21), (15, 21)], [(13, 23), (15, 23)]]
    paste_grid(canvas, office, table, 23, 20)
    block_tiles(23, 20, 2, 1)

    paste_tile(canvas, office, 13, 47, 27, 18)
    paste_tile(canvas, office, 14, 47, 28, 18)
    paste_tile(canvas, office, 13, 49, 27, 19)
    paste_tile(canvas, office, 14, 49, 28, 19)
    block_tiles(27, 18, 2, 2)


def add_tech_hub():
    station = [[(1, 31), (2, 31), (3, 31)], [(1, 39), (2, 39), (3, 39)]]
    paste_grid(canvas, office, station, 12, 11)
    block_tiles(12, 11, 3, 2)
    paste_tile(canvas, office, 10, 35, 13, 11)
    paste_tile(canvas, office, 8, 35, 13, 13)
    block_tiles(13, 13, 1, 1)


def zone(name: str, label: str, tiles: list[tuple[int, int]]) -> Zone:
    return Zone(name=name, label=label, tiles=tiles)


def flatten_collision():
    return [value for row in collision_grid for value in row]


def build_tile_grid():
    tiles: list[list[str]] = []
    for y in range(HEIGHT):
        row: list[str] = []
        for x in range(WIDTH):
            value = "floor"
            if y < 4 or x == 0 or x == WIDTH - 1 or (y == HEIGHT - 1 and x not in {13, 14, 15, 16}):
                value = "wall"
            elif 12 <= x <= 15 and 17 <= y <= 18:
                value = "rug"
            elif 23 <= x <= 25 and 17 <= y <= 18:
                value = "rug"
            elif y == HEIGHT - 1 and x in {13, 14, 15, 16}:
                value = "entry"
            row.append(value)
        tiles.append(row)
    return tiles


def matrix_collision():
    return [[1 if value == 1025 else 0 for value in row] for row in collision_grid]


def main():
    TILESET_PUBLIC.mkdir(parents=True, exist_ok=True)
    shutil.copy2(PACK_ROOT / "Modern_Office_16x16.png", TILESET_PUBLIC / "Modern_Office_16x16.png")
    shutil.copy2(
        PACK_ROOT / "1_Room_Builder_Office/Room_Builder_Office_16x16.png",
        TILESET_PUBLIC / "Room_Builder_Office_16x16.png",
    )

    draw_walls()
    draw_base_floors()
    draw_entry_path()
    add_wall_decor()

    top_cluster_x = [2, 8, 14, 20]
    top_zone_names = [
        ("signal", "Signal", [(2, 7), (4, 7), (2, 8), (3, 8), (4, 8), (5, 8)]),
        ("market", "Market", [(8, 7), (10, 7), (8, 8), (9, 8), (10, 8), (11, 8)]),
        ("narrative", "Narrative", [(14, 7), (16, 7), (14, 8), (15, 8), (16, 8), (17, 8)]),
        ("regmacro", "RegMacro", [(20, 7), (22, 7), (20, 8), (21, 8), (22, 8), (23, 8)]),
    ]
    zones = []
    for index, x in enumerate(top_cluster_x):
        add_desk_cluster(x, 5, index)
        zone_name, label, zone_tiles = top_zone_names[index]
        zones.append(zone(zone_name, label, zone_tiles))

    add_server_area()
    zones.append(zone("server", "Server", [(4, 10), (8, 10), (4, 11), (8, 11), (4, 13), (8, 13), (4, 14), (8, 14)]))

    add_comms_station()
    zones.append(zone("comms", "Comms", [(9, 13), (10, 13), (11, 13), (9, 14), (10, 14), (11, 14)]))

    add_tech_hub()
    zones.append(zone("tech", "Tech", [(12, 10), (13, 10), (14, 10), (15, 10), (12, 13), (14, 13), (15, 13)]))

    add_chief_office()
    zones.append(zone("chief", "Chief", [(20, 10), (21, 10), (22, 10), (20, 11), (25, 13), (26, 13), (27, 13), (24, 14), (25, 14)]))

    add_cafe_lounge()
    zones.append(zone("cafe", "Cafe", [(10, 17), (11, 17), (12, 17), (13, 17), (14, 17), (15, 17), (18, 18), (14, 20), (15, 20), (16, 20), (17, 20)]))

    add_whiteboard_area()
    zones.append(zone("whiteboard", "Whiteboard", [(22, 17), (23, 19), (24, 19), (25, 19), (26, 19), (22, 20), (25, 20), (26, 20)]))

    OUTPUT_BG.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(OUTPUT_BG)
    foreground.save(OUTPUT_FG)

    meta = {
        "width": WIDTH,
        "height": HEIGHT,
        "background": "/coworking/modern-office-room-background.png",
        "foreground": "/coworking/modern-office-room-foreground.png",
        "collisionFlat": flatten_collision(),
        "zones": [
            {
                "name": zone.name,
                "label": zone.label,
                "tiles": [{"x": x, "y": y} for x, y in zone.tiles],
            }
            for zone in zones
        ],
    }
    OUTPUT_META.write_text(json.dumps(meta, indent=2))
    OUTPUT_RUNTIME_META.write_text(json.dumps(meta, indent=2))
    OUTPUT_CONTENT_TS.write_text(
        "\n".join(
            [
                "export const generatedRoomWidth = 30;",
                "export const generatedRoomHeight = 22;",
                f"export const generatedRoomTiles = {json.dumps(build_tile_grid(), indent=2)} as const;",
                f"export const generatedRoomCollision = {json.dumps(matrix_collision(), indent=2)} as const;",
                f"export const generatedRoomZones = {json.dumps(meta['zones'], indent=2)} as const;"
            ]
        )
        + "\n"
    )


if __name__ == "__main__":
    main()
