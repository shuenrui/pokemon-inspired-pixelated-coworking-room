from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, "/tmp/codex-pillow")

from PIL import Image  # type: ignore


ROOT = Path("/Users/leeshuenrui/Documents/Playground")
SOURCE_ROOT = Path("/tmp/modern_interiors_free/Modern tiles_Free/Characters_free")
OUT_ROOT = ROOT / "apps/web/public/coworking"

TILE = 16


CHARACTERS = {
    "player-sheet.png": "Adam_16x16.png",
    "agent-mira-sheet.png": "Amelia_16x16.png",
    "agent-pip-sheet.png": "Alex_16x16.png",
    "agent-nori-sheet.png": "Bob_16x16.png",
}

# LimeZu free sheets lay out directional poses in 6-frame groups:
# left(0-5), up/back(6-11), right(12-17), down/front(18-23)
IDLE_ROW = 1
STEP_A_ROW = 3
STEP_B_ROW = 5
GROUP_START = {
    "left": 0,
    "up": 6,
    "right": 12,
    "down": 18,
}


def crop_frame(source: Image.Image, col: int, row: int) -> Image.Image:
    left = col * TILE
    top = row * TILE
    return source.crop((left, top, left + TILE, top + TILE))


def build_sheet(source_name: str) -> Image.Image:
    source = Image.open(SOURCE_ROOT / source_name).convert("RGBA")
    target = Image.new("RGBA", (TILE * 4, TILE * 4), (0, 0, 0, 0))

    order = ["down", "left", "right", "up"]
    for row_index, direction in enumerate(order):
        start = GROUP_START[direction]
        frames = [
            crop_frame(source, start + 0, IDLE_ROW),
            crop_frame(source, start + 1, STEP_A_ROW),
            crop_frame(source, start + 0, IDLE_ROW),
            crop_frame(source, start + 3, STEP_B_ROW),
        ]
        for col_index, frame in enumerate(frames):
            target.alpha_composite(frame, (col_index * TILE, row_index * TILE))

    return target


def main():
    OUT_ROOT.mkdir(parents=True, exist_ok=True)
    for out_name, source_name in CHARACTERS.items():
        build_sheet(source_name).save(OUT_ROOT / out_name)


if __name__ == "__main__":
    main()
