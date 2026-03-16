import Phaser from "phaser";
import { MainRoomScene } from "./scenes/MainRoomScene";

export function createGame(parent: HTMLDivElement) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    pixelArt: true,
    backgroundColor: "#8f86b2",
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 16 * 20,
      height: 16 * 15
    },
    scene: [MainRoomScene]
  });
}
