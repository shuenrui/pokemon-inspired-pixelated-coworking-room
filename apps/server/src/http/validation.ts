import { furnitureCatalog, type FacingDirection, type PlacedItem } from "@tiletown/content";

export function parsePlacedItemsPayload(body: unknown) {
  if (!body || typeof body !== "object" || !("placedItems" in body)) {
    return null;
  }

  const placedItems = (body as { placedItems?: unknown }).placedItems;
  if (!Array.isArray(placedItems)) {
    return null;
  }

  const validItemIds = new Set(furnitureCatalog.map((item) => item.id));
  const normalized: PlacedItem[] = [];

  for (const item of placedItems) {
    if (
      !item ||
      typeof item !== "object" ||
      typeof (item as { id?: unknown }).id !== "string" ||
      typeof (item as { itemId?: unknown }).itemId !== "string" ||
      typeof (item as { x?: unknown }).x !== "number" ||
      typeof (item as { y?: unknown }).y !== "number"
    ) {
      return null;
    }

    const record = item as PlacedItem;
    if (!validItemIds.has(record.itemId) || !Number.isInteger(record.x) || !Number.isInteger(record.y)) {
      return null;
    }

    normalized.push({
      id: record.id,
      itemId: record.itemId,
      x: record.x,
      y: record.y
    });
  }

  return normalized;
}

export function parsePositionPayload(body: unknown) {
  if (!body || typeof body !== "object") {
    return null;
  }

  const candidate = body as { x?: unknown; y?: unknown; facing?: unknown };
  if (
    typeof candidate.x !== "number" ||
    typeof candidate.y !== "number" ||
    !Number.isInteger(candidate.x) ||
    !Number.isInteger(candidate.y) ||
    !isFacingDirection(candidate.facing)
  ) {
    return null;
  }

  return {
    x: candidate.x,
    y: candidate.y,
    facing: candidate.facing
  };
}

function isFacingDirection(value: unknown): value is FacingDirection {
  return value === "up" || value === "down" || value === "left" || value === "right";
}
