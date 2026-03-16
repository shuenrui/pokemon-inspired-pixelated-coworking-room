import {
  furnitureCatalog,
  type PlacedItem,
  type FurnitureDefinition
} from "@tiletown/content";

export const directionVectors = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 }
} as const;

export function canMoveToTile(
  collisionMap: number[][],
  tile: { x: number; y: number }
) {
  const row = collisionMap[tile.y];
  if (!row) {
    return false;
  }

  return row[tile.x] === 0;
}

export function canOccupyTile(
  collisionMap: number[][],
  placedItems: PlacedItem[],
  tile: { x: number; y: number }
) {
  if (!canMoveToTile(collisionMap, tile)) {
    return false;
  }

  return !placedItems.some((item) => isTileInsideItem(tile, item));
}

export function canPlaceFurniture(
  collisionMap: number[][],
  placedItems: PlacedItem[],
  definition: FurnitureDefinition,
  tile: { x: number; y: number }
) {
  for (let y = 0; y < definition.height; y += 1) {
    for (let x = 0; x < definition.width; x += 1) {
      const target = { x: tile.x + x, y: tile.y + y };
      if (!canMoveToTile(collisionMap, target)) {
        return false;
      }

      const overlapsItem = placedItems.some((item) => {
        return isTileInsideItem(target, item);
      });

      if (overlapsItem) {
        return false;
      }
    }
  }

  return true;
}

function getItemWidth(itemId: string) {
  return getFurnitureDefinition(itemId)?.width ?? 1;
}

function getItemHeight(itemId: string) {
  return getFurnitureDefinition(itemId)?.height ?? 1;
}

function getFurnitureDefinition(itemId: string) {
  return furnitureCatalog.find((item) => item.id === itemId);
}

function isTileInsideItem(tile: { x: number; y: number }, item: PlacedItem) {
  return (
    tile.x >= item.x &&
    tile.y >= item.y &&
    tile.x < item.x + getItemWidth(item.itemId) &&
    tile.y < item.y + getItemHeight(item.itemId)
  );
}
