import type { FacingDirection, RoomActor, RoomSnapshot } from "@tiletown/content";
import type { RoomService } from "../data/roomService";
import { coworkingRoomConfig, type RoomZone } from "./roomConfig";

const VIEWPORT_WIDTH = 1024;
const VIEWPORT_HEIGHT = 576;
const RENDER_SCALE = 3;
const FRAME_SIZE = 16;
const WALK_STEP = 16;
const PLAYER_MOVE_PIXELS = 2;
const AGENT_MOVE_PIXELS = 1;

type LoadedImageMap = Record<string, HTMLImageElement>;

type PixelPosition = {
  x: number;
  y: number;
};

type Boundary = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type CharacterSprite = {
  actorId: string;
  spriteSrc: string;
  image: HTMLImageElement;
  position: PixelPosition;
  startPosition: PixelPosition;
  targetPosition: PixelPosition | null;
  zoneName: string | null;
  animationFrame: number;
  animationTick: number;
  facing: FacingDirection;
};

type MovementState = {
  active: boolean;
  direction: FacingDirection;
  from: PixelPosition;
  to: PixelPosition;
  travelled: number;
};

type GameStatus = {
  connectedPlayers: Array<{
    id: string;
    displayName: string;
    isLocal: boolean;
  }>;
  activeZones: Array<{
    actorId: string;
    displayName: string;
    zoneName: string | null;
  }>;
};

type CoworkingGameOptions = {
  canvas: HTMLCanvasElement;
  service: RoomService;
  snapshot: RoomSnapshot;
  onStatus: (status: GameStatus) => void;
};

type CoworkingGame = {
  applySnapshot: (snapshot: RoomSnapshot) => void;
  setAgentZone: (id: string, zoneName: string) => void;
  destroy: () => void;
};

type MovableBody = Boundary & {
  id?: string;
};

const directionVectors: Record<FacingDirection, PixelPosition> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 }
};

const rowByDirection: Record<FacingDirection, number> = {
  down: 0,
  left: 1,
  right: 2,
  up: 3
};

export async function createCoworkingGame(
  options: CoworkingGameOptions
): Promise<CoworkingGame> {
  const { canvas, service, onStatus } = options;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas 2D context is unavailable.");
  }

  canvas.width = VIEWPORT_WIDTH;
  canvas.height = VIEWPORT_HEIGHT;
  context.imageSmoothingEnabled = false;

  const imageSources = [
    coworkingRoomConfig.backgroundSrc,
    coworkingRoomConfig.foregroundSrc,
    coworkingRoomConfig.playerSpriteSrc,
    ...Object.values(coworkingRoomConfig.npcSpriteSources)
  ];
  const images = await loadImages(imageSources);

  const tileSize = coworkingRoomConfig.tileSize;
  const mapPixelSize = {
    width: coworkingRoomConfig.width * tileSize,
    height: coworkingRoomConfig.height * tileSize
  };
  const boundaries = createBoundaries(coworkingRoomConfig.collisionFlat, tileSize, coworkingRoomConfig.width);
  const playerScreen = {
    x: VIEWPORT_WIDTH / 2 - (FRAME_SIZE * RENDER_SCALE) / 2,
    y: VIEWPORT_HEIGHT / 2 - (FRAME_SIZE * RENDER_SCALE) / 2
  };
  const playerCollisionBox = {
    x: VIEWPORT_WIDTH / 2 - (tileSize * RENDER_SCALE) / 2,
    y: VIEWPORT_HEIGHT / 2 - (tileSize * RENDER_SCALE) / 2,
    width: tileSize * RENDER_SCALE,
    height: tileSize * RENDER_SCALE
  };

  let snapshot = cloneSnapshot(options.snapshot);
  let frameHandle = 0;
  let destroyed = false;
  let lastTimestamp = 0;
  let movement: MovementState = createMovementState(getActorPixel(snapshot.localPlayerId));
  let localPlayerPixel = getActorPixel(snapshot.localPlayerId);
  let pressedKeys: Partial<Record<FacingDirection, boolean>> = {};
  let playerFrameTick = 0;
  let playerFrame = 0;
  let zoneCursor = 0;
  const characterSprites = new Map<string, CharacterSprite>();

  hydrateCharacters(snapshot);
  emitStatus();

  const removeKeydown = bindKey(window, "keydown", (event) => {
    const direction = toDirection(event.key);
    if (!direction) {
      return;
    }

    pressedKeys[direction] = true;
    event.preventDefault();
  });

  const removeKeyup = bindKey(window, "keyup", (event) => {
    const direction = toDirection(event.key);
    if (!direction) {
      return;
    }

    pressedKeys[direction] = false;
    event.preventDefault();
  });

  const tick = (timestamp: number) => {
    if (destroyed) {
      return;
    }

    const delta = Math.min(32, timestamp - lastTimestamp || 16);
    lastTimestamp = timestamp;
    updateLocalMovement(delta);
    updateAgentMovement(delta);
    drawScene(context, images, boundaries, characterSprites, snapshot, localPlayerPixel, playerScreen, playerFrame, mapPixelSize);
    frameHandle = window.requestAnimationFrame(tick);
  };

  frameHandle = window.requestAnimationFrame(tick);

  return {
    applySnapshot(nextSnapshot) {
      const preservedLocalPixel = { ...localPlayerPixel };
      snapshot = cloneSnapshot(nextSnapshot);
      if (!movement.active) {
        localPlayerPixel = getActorPixel(snapshot.localPlayerId);
      } else {
        localPlayerPixel = preservedLocalPixel;
      }
      hydrateCharacters(snapshot);
      emitStatus();
    },
    setAgentZone(id, zoneName) {
      const zone = coworkingRoomConfig.zones.find((candidate) => candidate.name === zoneName);
      const actor = snapshot.npcs.find((candidate) => candidate.id === id);
      const sprite = characterSprites.get(id);
      if (!zone || !actor || !sprite) {
        return;
      }

      const zoneTarget = pickZoneTile(zone);
      actor.position = { ...zoneTarget };
      actor.movement = {
        mode: "walking",
        target: { ...zoneTarget },
        updatedAt: new Date().toISOString()
      };
      sprite.startPosition = { ...sprite.position };
      sprite.targetPosition = tileToPixel(zoneTarget);
      sprite.zoneName = zoneName;
      sprite.facing = facingFromDelta(sprite.position, sprite.targetPosition);
      emitStatus();
    },
    destroy() {
      destroyed = true;
      window.cancelAnimationFrame(frameHandle);
      removeKeydown();
      removeKeyup();
    }
  };

  function updateLocalMovement(deltaMs: number) {
    const localPlayer = snapshot.players.find((actor) => actor.id === snapshot.localPlayerId);
    if (!localPlayer) {
      return;
    }

    if (!movement.active) {
      const queuedDirection = getQueuedDirection(pressedKeys);
      if (queuedDirection) {
        localPlayer.facing = queuedDirection;
        startLocalMovement(queuedDirection);
      } else {
        playerFrame = 0;
      }
    }

    if (!movement.active) {
      return;
    }

    const step = Math.min(PLAYER_MOVE_PIXELS * (deltaMs / 16), WALK_STEP - movement.travelled);
    movement.travelled += step;
    localPlayerPixel = {
      x: movement.from.x + (movement.to.x - movement.from.x) * (movement.travelled / WALK_STEP),
      y: movement.from.y + (movement.to.y - movement.from.y) * (movement.travelled / WALK_STEP)
    };
    playerFrameTick += deltaMs;
    if (playerFrameTick > 120) {
      playerFrameTick = 0;
      playerFrame = playerFrame === 0 ? 1 : playerFrame === 1 ? 2 : 1;
    }

    if (movement.travelled >= WALK_STEP) {
      movement.active = false;
      movement.travelled = 0;
      localPlayer.position = pixelToTile(movement.to);
      localPlayerPixel = { ...movement.to };
      playerFrame = 0;
      void service.updateLocalPlayerPosition(snapshot.roomId, localPlayer.id, {
        x: localPlayer.position.x,
        y: localPlayer.position.y,
        facing: localPlayer.facing
      });
    }
  }

  function updateAgentMovement(deltaMs: number) {
    for (const sprite of characterSprites.values()) {
      const actor = snapshot.npcs.find((candidate) => candidate.id === sprite.actorId);
      if (!actor || !sprite.targetPosition) {
        continue;
      }

      const distanceX = sprite.targetPosition.x - sprite.position.x;
      const distanceY = sprite.targetPosition.y - sprite.position.y;
      const remaining = Math.hypot(distanceX, distanceY);
      if (remaining <= 0.5) {
        sprite.position = { ...sprite.targetPosition };
        sprite.targetPosition = null;
        sprite.animationFrame = 0;
        actor.position = pixelToTile(sprite.position);
        actor.movement = {
          mode: "idle",
          target: null,
          updatedAt: new Date().toISOString()
        };
        continue;
      }

      const step = Math.min(AGENT_MOVE_PIXELS * (deltaMs / 16), remaining);
      const ratio = step / remaining;
      sprite.position = {
        x: sprite.position.x + distanceX * ratio,
        y: sprite.position.y + distanceY * ratio
      };
      sprite.animationTick += deltaMs;
      if (sprite.animationTick > 160) {
        sprite.animationTick = 0;
        sprite.animationFrame = sprite.animationFrame === 0 ? 1 : sprite.animationFrame === 1 ? 2 : 1;
      }
    }
  }

  function startLocalMovement(direction: FacingDirection) {
    const vector = directionVectors[direction];
    const targetTile = {
      x: snapshot.players.find((actor) => actor.id === snapshot.localPlayerId)!.position.x + vector.x,
      y: snapshot.players.find((actor) => actor.id === snapshot.localPlayerId)!.position.y + vector.y
    };

    if (!isWalkable(targetTile, boundaries, characterSprites, playerCollisionBox, localPlayerPixel, direction)) {
      return;
    }

    movement = {
      active: true,
      direction,
      from: { ...localPlayerPixel },
      to: tileToPixel(targetTile),
      travelled: 0
    };
  }

  function hydrateCharacters(nextSnapshot: RoomSnapshot) {
    const nextIds = new Set(nextSnapshot.npcs.map((actor) => actor.id));
    for (const existingId of Array.from(characterSprites.keys())) {
      if (!nextIds.has(existingId)) {
        characterSprites.delete(existingId);
      }
    }

    for (const actor of nextSnapshot.npcs) {
      const existing = characterSprites.get(actor.id);
      const spriteSrc =
        coworkingRoomConfig.npcSpriteSources[actor.id] ??
        Object.values(coworkingRoomConfig.npcSpriteSources)[0];
      const pixelPosition = tileToPixel(actor.position);
      const nextZone = existing?.zoneName ?? findZoneName(actor.position);
      if (existing) {
        if (!existing.targetPosition) {
          existing.position = pixelPosition;
        }
        existing.facing = actor.facing;
        existing.spriteSrc = spriteSrc;
        existing.zoneName = nextZone;
        existing.image = images[spriteSrc];
        continue;
      }

      characterSprites.set(actor.id, {
        actorId: actor.id,
        spriteSrc,
        image: images[spriteSrc],
        position: pixelPosition,
        startPosition: pixelPosition,
        targetPosition: null,
        zoneName: nextZone,
        animationFrame: 0,
        animationTick: 0,
        facing: actor.facing
      });
    }
  }

  function emitStatus() {
    onStatus({
      connectedPlayers: snapshot.players.map((player) => ({
        id: player.id,
        displayName: player.displayName,
        isLocal: player.id === snapshot.localPlayerId
      })),
      activeZones: snapshot.npcs.map((npc) => ({
        actorId: npc.id,
        displayName: npc.displayName,
        zoneName: characterSprites.get(npc.id)?.zoneName ?? findZoneName(npc.position)
      }))
    });
  }

  function pickZoneTile(zone: RoomZone) {
    const tile = zone.tiles[zoneCursor % zone.tiles.length];
    zoneCursor += 1;
    return tile;
  }

  function getActorPixel(actorId: string) {
    const actor = snapshot.players.find((candidate) => candidate.id === actorId);
    return actor ? tileToPixel(actor.position) : { x: 0, y: 0 };
  }

  function tileToPixel(tile: { x: number; y: number }): PixelPosition {
    return {
      x: tile.x * tileSize,
      y: tile.y * tileSize
    };
  }

  function pixelToTile(pixel: PixelPosition) {
    return {
      x: Math.round(pixel.x / tileSize),
      y: Math.round(pixel.y / tileSize)
    };
  }

  function findZoneName(position: { x: number; y: number }) {
    return (
      coworkingRoomConfig.zones.find((zone) =>
        zone.tiles.some((tile) => tile.x === position.x && tile.y === position.y)
      )?.name ?? null
    );
  }
}

function drawScene(
  context: CanvasRenderingContext2D,
  images: LoadedImageMap,
  boundaries: Boundary[],
  characters: Map<string, CharacterSprite>,
  snapshot: RoomSnapshot,
  localPlayerPixel: PixelPosition,
  playerScreen: PixelPosition,
  playerFrame: number,
  mapPixelSize: { width: number; height: number }
) {
  context.clearRect(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);
  context.fillStyle = "#0b0f0c";
  context.fillRect(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);

  const camera = {
    x: VIEWPORT_WIDTH / 2 / RENDER_SCALE - FRAME_SIZE / 2 - localPlayerPixel.x,
    y: VIEWPORT_HEIGHT / 2 / RENDER_SCALE - FRAME_SIZE / 2 - localPlayerPixel.y
  };

  drawBackgroundLayer(context, images[coworkingRoomConfig.backgroundSrc], camera, mapPixelSize);
  drawBoundaries(context, boundaries, camera);
  drawCharacters(context, characters, camera);
  drawPlayer(context, images[coworkingRoomConfig.playerSpriteSrc], snapshot, playerScreen, playerFrame);
  drawBackgroundLayer(context, images[coworkingRoomConfig.foregroundSrc], camera, mapPixelSize);
}

function drawBackgroundLayer(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  camera: PixelPosition,
  mapPixelSize: { width: number; height: number }
) {
  context.drawImage(
    image,
    Math.round(camera.x * RENDER_SCALE),
    Math.round(camera.y * RENDER_SCALE),
    mapPixelSize.width * RENDER_SCALE,
    mapPixelSize.height * RENDER_SCALE
  );
}

function drawBoundaries(
  context: CanvasRenderingContext2D,
  boundaries: Boundary[],
  camera: PixelPosition
) {
  context.save();
  context.globalAlpha = 0.08;
  context.fillStyle = "#f7f3d8";
  for (const boundary of boundaries) {
    context.fillRect(
      Math.round((boundary.x + camera.x) * RENDER_SCALE),
      Math.round((boundary.y + camera.y) * RENDER_SCALE),
      boundary.width * RENDER_SCALE,
      boundary.height * RENDER_SCALE
    );
  }
  context.restore();
}

function drawCharacters(
  context: CanvasRenderingContext2D,
  characters: Map<string, CharacterSprite>,
  camera: PixelPosition
) {
  for (const sprite of characters.values()) {
    drawSprite(
      context,
      sprite.image,
      sprite.position,
      camera,
      sprite.facing,
      sprite.animationFrame
    );
  }
}

function drawPlayer(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  snapshot: RoomSnapshot,
  playerScreen: PixelPosition,
  playerFrame: number
) {
  const localPlayer = snapshot.players.find((actor) => actor.id === snapshot.localPlayerId);
  if (!localPlayer) {
    return;
  }

  drawShadow(context, playerScreen);
  drawSprite(context, image, playerScreen, { x: 0, y: 0 }, localPlayer.facing, playerFrame, true);
}

function drawSprite(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  position: PixelPosition,
  camera: PixelPosition,
  facing: FacingDirection,
  frame: number,
  fixed = false
) {
  const drawX = fixed ? position.x : Math.round((position.x + camera.x) * RENDER_SCALE);
  const drawY = fixed ? position.y : Math.round((position.y + camera.y) * RENDER_SCALE);

  if (!fixed) {
    drawShadow(context, { x: drawX, y: drawY });
  }

  context.drawImage(
    image,
    frame * FRAME_SIZE,
    rowByDirection[facing] * FRAME_SIZE,
    FRAME_SIZE,
    FRAME_SIZE,
    drawX,
    drawY,
    FRAME_SIZE * RENDER_SCALE,
    FRAME_SIZE * RENDER_SCALE
  );
}

function drawShadow(context: CanvasRenderingContext2D, position: PixelPosition) {
  context.save();
  context.fillStyle = "rgba(0, 0, 0, 0.28)";
  context.fillRect(position.x + 10, position.y + 40, 28, 6);
  context.restore();
}

function createBoundaries(
  collisionFlat: number[],
  tileSize: number,
  mapWidth: number
) {
  const boundaries: Boundary[] = [];

  collisionFlat.forEach((symbol, index) => {
    if (symbol !== 1025) {
      return;
    }

    const x = (index % mapWidth) * tileSize;
    const y = Math.floor(index / mapWidth) * tileSize;
    boundaries.push({ x, y, width: tileSize, height: tileSize });
  });

  return boundaries;
}

function isWalkable(
  targetTile: { x: number; y: number },
  boundaries: Boundary[],
  characters: Map<string, CharacterSprite>,
  playerCollisionBox: Boundary,
  currentPixel: PixelPosition,
  direction: FacingDirection
) {
  const vector = directionVectors[direction];
  const projection = {
    x: playerCollisionBox.x,
    y: playerCollisionBox.y,
    width: playerCollisionBox.width,
    height: playerCollisionBox.height
  };

  for (const boundary of boundaries) {
    const shiftedBoundary = {
      x: (boundary.x - currentPixel.x + vector.x * WALK_STEP) * RENDER_SCALE + playerCollisionBox.x,
      y: (boundary.y - currentPixel.y + vector.y * WALK_STEP) * RENDER_SCALE + playerCollisionBox.y,
      width: boundary.width * RENDER_SCALE,
      height: boundary.height * RENDER_SCALE
    };
    if (rectanglesOverlap(projection, shiftedBoundary)) {
      return false;
    }
  }

  for (const sprite of characters.values()) {
    const actorBox = {
      x: (sprite.position.x - currentPixel.x + vector.x * WALK_STEP) * RENDER_SCALE + playerCollisionBox.x,
      y: (sprite.position.y - currentPixel.y + vector.y * WALK_STEP) * RENDER_SCALE + playerCollisionBox.y,
      width: WALK_STEP * RENDER_SCALE,
      height: WALK_STEP * RENDER_SCALE
    };
    if (rectanglesOverlap(projection, actorBox)) {
      return false;
    }
  }

  return targetTile.x >= 0 && targetTile.y >= 0;
}

function rectanglesOverlap(a: MovableBody, b: MovableBody) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function toDirection(key: string): FacingDirection | null {
  if (key === "ArrowUp" || key.toLowerCase() === "w") {
    return "up";
  }
  if (key === "ArrowDown" || key.toLowerCase() === "s") {
    return "down";
  }
  if (key === "ArrowLeft" || key.toLowerCase() === "a") {
    return "left";
  }
  if (key === "ArrowRight" || key.toLowerCase() === "d") {
    return "right";
  }
  return null;
}

function getQueuedDirection(pressedKeys: Partial<Record<FacingDirection, boolean>>) {
  if (pressedKeys.up) {
    return "up";
  }
  if (pressedKeys.down) {
    return "down";
  }
  if (pressedKeys.left) {
    return "left";
  }
  if (pressedKeys.right) {
    return "right";
  }
  return null;
}

function cloneSnapshot(snapshot: RoomSnapshot): RoomSnapshot {
  return {
    roomId: snapshot.roomId,
    localPlayerId: snapshot.localPlayerId,
    players: snapshot.players.map(cloneActor),
    npcs: snapshot.npcs.map(cloneActor),
    placedItems: snapshot.placedItems.map((item) => ({ ...item }))
  };
}

function cloneActor(actor: RoomActor): RoomActor {
  return {
    ...actor,
    position: { ...actor.position },
    movement: {
      ...actor.movement,
      target: actor.movement.target ? { ...actor.movement.target } : null
    }
  };
}

function createMovementState(start: PixelPosition): MovementState {
  return {
    active: false,
    direction: "down",
    from: { ...start },
    to: { ...start },
    travelled: 0
  };
}

function facingFromDelta(from: PixelPosition, to: PixelPosition): FacingDirection {
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;
  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    return deltaX >= 0 ? "right" : "left";
  }
  return deltaY >= 0 ? "down" : "up";
}

function bindKey<K extends keyof WindowEventMap>(
  target: Window,
  eventName: K,
  handler: (event: WindowEventMap[K]) => void
) {
  target.addEventListener(eventName, handler);
  return () => target.removeEventListener(eventName, handler);
}

async function loadImages(sources: string[]) {
  const entries = await Promise.all(
    sources.map(
      (source) =>
        new Promise<[string, HTMLImageElement]>((resolve, reject) => {
          const image = new Image();
          image.src = source;
          image.onload = () => resolve([source, image]);
          image.onerror = () => reject(new Error(`Failed to load image: ${source}`));
        })
    )
  );

  return Object.fromEntries(entries);
}
