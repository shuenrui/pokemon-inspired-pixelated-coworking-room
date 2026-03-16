import Phaser from "phaser";
import {
  furnitureCatalog,
  starterRoomSnapshot,
  tileSize,
  type TileKind
} from "@tiletown/content";

type PixelRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
};

export function createPixelTextures(scene: Phaser.Scene) {
  createTileTexture(scene, "tile-floor", [
    { x: 0, y: 0, width: 16, height: 16, color: "#8e80ba" },
    { x: 1, y: 1, width: 14, height: 14, color: "#9d90c9" },
    { x: 2, y: 2, width: 12, height: 12, color: "#a798d0" },
    { x: 4, y: 4, width: 2, height: 2, color: "#8b7ab8" },
    { x: 10, y: 9, width: 2, height: 2, color: "#8b7ab8" }
  ]);
  createTileTexture(scene, "tile-wall", [
    { x: 0, y: 0, width: 16, height: 16, color: "#c7c39d" },
    { x: 1, y: 1, width: 14, height: 14, color: "#d7d1ae" },
    { x: 0, y: 12, width: 16, height: 4, color: "#a69976" },
    { x: 3, y: 4, width: 10, height: 2, color: "#ebe4c9" }
  ]);
  createTileTexture(scene, "tile-entry", [
    { x: 0, y: 0, width: 16, height: 16, color: "#6f5638" },
    { x: 1, y: 1, width: 14, height: 14, color: "#aa4438" },
    { x: 2, y: 2, width: 12, height: 12, color: "#c35345" },
    { x: 4, y: 4, width: 8, height: 8, color: "#db7865" }
  ]);
  createTileTexture(scene, "tile-rug", [
    { x: 0, y: 0, width: 16, height: 16, color: "#b66f4e" },
    { x: 1, y: 1, width: 14, height: 14, color: "#c98963" },
    { x: 2, y: 2, width: 12, height: 12, color: "#d69a73" },
    { x: 4, y: 3, width: 8, height: 1, color: "#f0cd9e" },
    { x: 4, y: 12, width: 8, height: 1, color: "#9d5e42" }
  ]);

  furnitureCatalog.forEach((item) => {
    createTexture(scene, `furniture-${item.id}`, tileSize * item.width, tileSize * item.height, getFurniturePixels(item.id));
  });

  createTexture(scene, "avatar-player", 16, 16, [
    { x: 5, y: 0, width: 6, height: 2, color: "#6b4535" },
    { x: 4, y: 2, width: 8, height: 4, color: "#f2c9a1" },
    { x: 3, y: 6, width: 10, height: 5, color: "#d26451" },
    { x: 2, y: 11, width: 4, height: 4, color: "#3f4859" },
    { x: 10, y: 11, width: 4, height: 4, color: "#3f4859" },
    { x: 5, y: 6, width: 2, height: 2, color: "#2e2a27" },
    { x: 9, y: 6, width: 2, height: 2, color: "#2e2a27" }
  ]);

  starterRoomSnapshot.npcs.forEach((npc) => {
    createTexture(scene, `npc-${npc.id}`, 16, 16, [
      { x: 5, y: 1, width: 6, height: 2, color: "#5a4536" },
      { x: 4, y: 3, width: 8, height: 4, color: "#efc19d" },
      { x: 3, y: 7, width: 10, height: 5, color: toHexColor(npc.color) },
      { x: 2, y: 12, width: 4, height: 3, color: "#3e4652" },
      { x: 10, y: 12, width: 4, height: 3, color: "#3e4652" }
    ]);
  });
}

function createTileTexture(scene: Phaser.Scene, key: string, pixels: PixelRect[]) {
  createTexture(scene, key, tileSize, tileSize, pixels);
}

function createTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  pixels: PixelRect[]
) {
  if (scene.textures.exists(key)) {
    return;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (!context) {
    return;
  }

  context.clearRect(0, 0, width, height);
  context.imageSmoothingEnabled = false;

  pixels.forEach((pixel) => {
    context.fillStyle = pixel.color;
    context.fillRect(pixel.x, pixel.y, pixel.width, pixel.height);
  });

  scene.textures.addCanvas(key, canvas);
}

function getFurniturePixels(itemId: string): PixelRect[] {
  switch (itemId) {
    case "desk":
      return [
        { x: 0, y: 0, width: 32, height: 16, color: "#9b714b" },
        { x: 2, y: 2, width: 28, height: 10, color: "#c69461" },
        { x: 4, y: 4, width: 7, height: 5, color: "#6ea2cc" },
        { x: 13, y: 3, width: 6, height: 6, color: "#e8e2ca" },
        { x: 22, y: 3, width: 4, height: 7, color: "#866347" },
        { x: 3, y: 12, width: 2, height: 4, color: "#5d422c" },
        { x: 27, y: 12, width: 2, height: 4, color: "#5d422c" }
      ];
    case "plant":
      return [
        { x: 4, y: 11, width: 8, height: 3, color: "#72553d" },
        { x: 5, y: 8, width: 6, height: 3, color: "#977150" },
        { x: 3, y: 3, width: 10, height: 6, color: "#62ac4e" },
        { x: 6, y: 1, width: 4, height: 2, color: "#81d05d" }
      ];
    case "bookshelf":
      return [
        { x: 0, y: 0, width: 32, height: 16, color: "#7b5c36" },
        { x: 2, y: 2, width: 28, height: 12, color: "#956f42" },
        { x: 4, y: 4, width: 24, height: 2, color: "#5f4528" },
        { x: 4, y: 8, width: 24, height: 2, color: "#5f4528" },
        { x: 5, y: 5, width: 4, height: 3, color: "#d94841" },
        { x: 10, y: 5, width: 4, height: 3, color: "#4f87d9" },
        { x: 16, y: 5, width: 5, height: 3, color: "#e7c15a" },
        { x: 22, y: 5, width: 4, height: 3, color: "#69aa61" },
        { x: 7, y: 9, width: 4, height: 3, color: "#d2d2d2" },
        { x: 15, y: 9, width: 5, height: 3, color: "#73a6d8" }
      ];
    case "meeting-table":
      return [
        { x: 0, y: 0, width: 32, height: 32, color: "#ae7b4d" },
        { x: 2, y: 2, width: 28, height: 28, color: "#cc9360" },
        { x: 6, y: 6, width: 20, height: 20, color: "#dda677" },
        { x: 5, y: 12, width: 7, height: 7, color: "#f2efe4" },
        { x: 20, y: 8, width: 6, height: 6, color: "#d64d43" },
        { x: 19, y: 18, width: 7, height: 7, color: "#f2efe4" }
      ];
    default:
      return [{ x: 0, y: 0, width: 16, height: 16, color: "#999999" }];
  }
}

export function getTileTextureKey(tile: TileKind) {
  switch (tile) {
    case "wall":
      return "tile-wall";
    case "entry":
      return "tile-entry";
    case "rug":
      return "tile-rug";
    default:
      return "tile-floor";
  }
}

function toHexColor(color: number) {
  return `#${color.toString(16).padStart(6, "0")}`;
}
