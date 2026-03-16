import Phaser from "phaser";
import {
  furnitureCatalog,
  starterRoomDefinition,
  tileSize,
  type FacingDirection,
  type RoomSnapshot
} from "@tiletown/content";
import {
  canOccupyTile,
  canPlaceFurniture,
  directionVectors
} from "@tiletown/engine";
import { useUiStore } from "../../state/uiStore";
import {
  createPixelTextures,
  getTileTextureKey
} from "../rendering/createPixelTextures";
import {
  resetRoomState,
  savePlacedItems
} from "../../data/roomState";
import { createRoomService } from "../../data/roomService";

export class MainRoomScene extends Phaser.Scene {
  private cursorKeys?: Phaser.Types.Input.Keyboard.CursorKeys;
  private modeToggleKey?: Phaser.Input.Keyboard.Key;
  private placeKey?: Phaser.Input.Keyboard.Key;
  private removeKey?: Phaser.Input.Keyboard.Key;
  private nextItemKey?: Phaser.Input.Keyboard.Key;
  private previousItemKey?: Phaser.Input.Keyboard.Key;
  private player?: Phaser.GameObjects.Image;
  private playerIndicator?: Phaser.GameObjects.Rectangle;
  private placementCursor?: Phaser.GameObjects.Rectangle;
  private furnitureLayer?: Phaser.GameObjects.Container;
  private actorLayer?: Phaser.GameObjects.Container;
  private roomState?: RoomSnapshot;
  private isMoving = false;
  private placementTile = { ...starterRoomDefinition.entry };
  private selectedFurnitureIndex = 0;
  private lastResetVersion = -1;
  private isReady = false;
  private loadingText?: Phaser.GameObjects.Text;
  private roomService = createRoomService();
  private unsubscribeRoom?: () => void;
  private actorSprites = new Map<string, Phaser.GameObjects.Image>();
  private heartbeatEvent?: Phaser.Time.TimerEvent;
  private beforeUnloadHandler?: () => void;

  constructor() {
    super("main-room");
  }

  create() {
    createPixelTextures(this);
    useUiStore.getState().setSceneTitle("Loading room");
    useUiStore.getState().setSelectedItem(furnitureCatalog[0].label);
    useUiStore.getState().setPlacedCount(0);

    this.cursorKeys = this.input.keyboard?.createCursorKeys();
    this.modeToggleKey = this.input.keyboard?.addKey("D");
    this.placeKey = this.input.keyboard?.addKey(
      Phaser.Input.Keyboard.KeyCodes.ENTER
    );
    this.removeKey = this.input.keyboard?.addKey(
      Phaser.Input.Keyboard.KeyCodes.BACKSPACE
    );
    this.nextItemKey = this.input.keyboard?.addKey(
      Phaser.Input.Keyboard.KeyCodes.CLOSED_BRACKET
    );
    this.previousItemKey = this.input.keyboard?.addKey(
      Phaser.Input.Keyboard.KeyCodes.OPEN_BRACKET
    );
    this.loadingText = this.add.text(10, 10, "Loading room snapshot...", {
      color: "#f8f5e6",
      fontFamily: "monospace",
      fontSize: "8px"
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribeRoom?.();
      this.heartbeatEvent?.destroy();
      if (this.beforeUnloadHandler) {
        window.removeEventListener("beforeunload", this.beforeUnloadHandler);
      }
    });
    void this.initializeScene();
  }

  update() {
    if (!this.cursorKeys || !this.player || this.isMoving || !this.isReady) {
      return;
    }

    if (this.modeToggleKey && Phaser.Input.Keyboard.JustDown(this.modeToggleKey)) {
      this.toggleMode();
    }

    if (this.nextItemKey && Phaser.Input.Keyboard.JustDown(this.nextItemKey)) {
      this.cycleSelectedFurniture(1);
    }

    if (
      this.previousItemKey &&
      Phaser.Input.Keyboard.JustDown(this.previousItemKey)
    ) {
      this.cycleSelectedFurniture(-1);
    }

    this.syncResetRequest();

    if (useUiStore.getState().mode === "decorate") {
      this.handleDecorateInput();
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.cursorKeys.left)) {
      this.tryMove("left");
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.cursorKeys.right)) {
      this.tryMove("right");
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.cursorKeys.up)) {
      this.tryMove("up");
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.cursorKeys.down)) {
      this.tryMove("down");
    }
  }

  private drawRoom() {
    starterRoomDefinition.tiles.forEach((row, y) => {
      row.forEach((tile, x) => {
        this.add
          .image(x * tileSize, y * tileSize, getTileTextureKey(tile))
          .setOrigin(0, 0);
      });
    });

  }

  private tryMove(direction: FacingDirection) {
    const vector = directionVectors[direction];
    const localPlayer = this.getLocalPlayer();
    const roomState = this.getRoomState();
    const nextTile = {
      x: localPlayer.position.x + vector.x,
      y: localPlayer.position.y + vector.y
    };

    if (!canOccupyTile(starterRoomDefinition.collision, roomState.placedItems, nextTile)) {
      return;
    }

    this.isMoving = true;
    localPlayer.position = nextTile;
    localPlayer.facing = direction;
    localPlayer.movement = {
      mode: "walking",
      target: nextTile,
      updatedAt: new Date().toISOString()
    };
    this.updatePlayerIndicator(direction);
    this.tweens.add({
      targets: this.player,
      x: nextTile.x * tileSize + tileSize / 2,
      y: nextTile.y * tileSize + tileSize / 2,
      duration: 110,
      onComplete: () => {
        void this.roomService.updateLocalPlayerPosition(
          roomState.roomId,
          localPlayer.id,
          {
            x: nextTile.x,
            y: nextTile.y,
            facing: direction
          }
        );
        localPlayer.movement = {
          mode: "idle",
          target: null,
          updatedAt: new Date().toISOString()
        };
        this.isMoving = false;
      }
    });
  }

  private handleDecorateInput() {
    if (!this.cursorKeys || !this.placementCursor) {
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.cursorKeys.left)) {
      this.movePlacementCursor("left");
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.cursorKeys.right)) {
      this.movePlacementCursor("right");
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.cursorKeys.up)) {
      this.movePlacementCursor("up");
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.cursorKeys.down)) {
      this.movePlacementCursor("down");
      return;
    }

    if (this.placeKey && Phaser.Input.Keyboard.JustDown(this.placeKey)) {
      this.placeSelectedFurniture();
      return;
    }

    if (this.removeKey && Phaser.Input.Keyboard.JustDown(this.removeKey)) {
      this.removeFurnitureAtCursor();
    }
  }

  private toggleMode() {
    const nextMode = useUiStore.getState().mode === "explore" ? "decorate" : "explore";
    useUiStore.getState().setMode(nextMode);
    this.placementTile = { ...this.getLocalPlayer().position };
    this.refreshPlacementCursor();
  }

  private cycleSelectedFurniture(direction: 1 | -1) {
    this.selectedFurnitureIndex =
      (this.selectedFurnitureIndex + direction + furnitureCatalog.length) %
      furnitureCatalog.length;
    useUiStore
      .getState()
      .setSelectedItem(furnitureCatalog[this.selectedFurnitureIndex].label);
    this.refreshPlacementCursor();
  }

  private movePlacementCursor(direction: keyof typeof directionVectors) {
    const vector = directionVectors[direction];
    const nextTile = {
      x: this.placementTile.x + vector.x,
      y: this.placementTile.y + vector.y
    };
    const roomWidth = starterRoomDefinition.tiles[0]?.length ?? 0;
    const roomHeight = starterRoomDefinition.tiles.length;

    if (
      nextTile.x < 0 ||
      nextTile.y < 0 ||
      nextTile.x >= roomWidth ||
      nextTile.y >= roomHeight
    ) {
      return;
    }

    this.placementTile = nextTile;
    this.refreshPlacementCursor();
  }

  private placeSelectedFurniture() {
    const roomState = this.getRoomState();
    const selectedFurniture = furnitureCatalog[this.selectedFurnitureIndex];
    if (
      !canPlaceFurniture(
        starterRoomDefinition.collision,
        roomState.placedItems,
        selectedFurniture,
        this.placementTile
      )
    ) {
      return;
    }

    roomState.placedItems.push({
      id: `${selectedFurniture.id}-${roomState.placedItems.length + 1}`,
      itemId: selectedFurniture.id,
      x: this.placementTile.x,
      y: this.placementTile.y
    });
    this.renderFurniture();
    this.refreshPlacementCursor();
    savePlacedItems(roomState.placedItems);
    void this.roomService.savePlacedItems(
      roomState.roomId,
      roomState.placedItems
    );
    useUiStore.getState().setPlacedCount(roomState.placedItems.length);
  }

  private removeFurnitureAtCursor() {
    const roomState = this.getRoomState();
    const foundIndex = roomState.placedItems.findIndex(
      (item) => item.x === this.placementTile.x && item.y === this.placementTile.y
    );

    if (foundIndex === -1) {
      return;
    }

    roomState.placedItems.splice(foundIndex, 1);
    this.renderFurniture();
    this.refreshPlacementCursor();
    savePlacedItems(roomState.placedItems);
    void this.roomService.savePlacedItems(
      roomState.roomId,
      roomState.placedItems
    );
    useUiStore.getState().setPlacedCount(roomState.placedItems.length);
  }

  private renderFurniture() {
    if (!this.furnitureLayer) {
      return;
    }

    this.furnitureLayer.removeAll(true);

    this.getRoomState().placedItems.forEach((item) => {
      const definition = furnitureCatalog.find(
        (candidate) => candidate.id === item.itemId
      );

      if (!definition) {
        return;
      }

      const sprite = this.add
        .image(item.x * tileSize, item.y * tileSize, `furniture-${definition.id}`)
        .setOrigin(0, 0);
      this.furnitureLayer?.add(sprite);
    });
  }

  private refreshPlacementCursor() {
    if (!this.placementCursor) {
      return;
    }

    const selectedFurniture = furnitureCatalog[this.selectedFurnitureIndex];
    const canPlace = canPlaceFurniture(
      starterRoomDefinition.collision,
      this.getRoomState().placedItems,
      selectedFurniture,
      this.placementTile
    );

    this.placementCursor
      .setVisible(useUiStore.getState().mode === "decorate")
      .setPosition(
        this.placementTile.x * tileSize + (selectedFurniture.width * tileSize) / 2,
        this.placementTile.y * tileSize + (selectedFurniture.height * tileSize) / 2
      )
      .setSize(
        selectedFurniture.width * tileSize,
        selectedFurniture.height * tileSize
      )
      .setFillStyle(canPlace ? 0x9cf6aa : 0xff7b7b, 0.28)
      .setStrokeStyle(2, canPlace ? 0x215c31 : 0x8f1d1d);
  }

  private updatePlayerIndicator(direction: keyof typeof directionVectors) {
    if (!this.playerIndicator) {
      return;
    }

    const vector = directionVectors[direction];
    const localPlayer = this.getLocalPlayer();
    this.playerIndicator.setPosition(
      localPlayer.position.x * tileSize + tileSize / 2 + vector.x * 4,
      localPlayer.position.y * tileSize + tileSize / 2 + vector.y * 4
    );
  }

  private syncResetRequest() {
    const resetVersion = useUiStore.getState().resetVersion;
    if (resetVersion === this.lastResetVersion) {
      return;
    }

    this.lastResetVersion = resetVersion;
    if (resetVersion === 0) {
      return;
    }

    this.roomState = resetRoomState();
    useUiStore.getState().setPlacedCount(this.getRoomState().placedItems.length);
    this.renderFurniture();
    this.refreshPlacementCursor();
  }

  private async initializeScene() {
    const envelope = await this.roomService.getInitialState();
    this.roomState = envelope.snapshot;
    useUiStore.getState().setSceneTitle(starterRoomDefinition.name);
    useUiStore.getState().setPlacedCount(this.roomState.placedItems.length);
    this.syncUiPresence();
    this.loadingText?.destroy();
    this.drawRoom();
    this.furnitureLayer = this.add.container(0, 0);
    this.actorLayer = this.add.container(0, 0);
    this.renderFurniture();
    this.renderActors();

    const localPlayer = this.getLocalPlayer();
    this.player = this.add
      .image(
        localPlayer.position.x * tileSize + tileSize / 2,
        localPlayer.position.y * tileSize + tileSize / 2,
        "avatar-player"
      )
      .setOrigin(0.5, 0.5);
    this.playerIndicator = this.add
      .rectangle(
        localPlayer.position.x * tileSize + tileSize / 2,
        localPlayer.position.y * tileSize + tileSize / 2,
        4,
        4,
        0x4f3b1b
      )
      .setOrigin(0.5);
    this.placementCursor = this.add
      .rectangle(
        this.placementTile.x * tileSize + tileSize / 2,
        this.placementTile.y * tileSize + tileSize / 2,
        tileSize,
        tileSize,
        0x9cf6aa,
        0.22
      )
      .setStrokeStyle(2, 0x215c31)
      .setVisible(false);
    this.add.text(10, 10, "D: decorate  [ ]: cycle  Enter: place", {
      color: "#f8f5e6",
      fontFamily: "monospace",
      fontSize: "8px"
    });
    this.updatePlayerIndicator(localPlayer.facing);
    this.unsubscribeRoom = this.roomService.subscribeRoom(
      this.roomState.roomId,
      (snapshot) => {
        this.applyIncomingSnapshot(snapshot);
      }
    );
    this.heartbeatEvent = this.time.addEvent({
      delay: 30_000,
      loop: true,
      callback: () => {
        const roomState = this.getRoomState();
        void this.roomService.sendHeartbeat(
          roomState.roomId,
          roomState.localPlayerId
        );
      }
    });
    this.beforeUnloadHandler = () => {
      const roomState = this.getRoomState();
      this.roomService.leaveRoom(roomState.roomId, roomState.localPlayerId);
    };
    window.addEventListener("beforeunload", this.beforeUnloadHandler);
    this.isReady = true;
  }

  private getLocalPlayer() {
    return (
      this.getRoomState().players.find(
        (player) => player.id === this.getRoomState().localPlayerId
      ) ?? this.getRoomState().players[0]
    );
  }

  private getRoomState() {
    if (!this.roomState) {
      throw new Error("Room state is not ready");
    }

    return this.roomState;
  }

  private renderActors() {
    if (!this.actorLayer) {
      return;
    }

    this.actorLayer.removeAll(true);
    this.actorSprites.clear();

    const roomState = this.getRoomState();
    [...roomState.npcs, ...roomState.players.filter((player) => player.id !== roomState.localPlayerId)].forEach(
      (actor) => {
        const sprite = this.add
          .image(
            actor.position.x * tileSize + tileSize / 2,
            actor.position.y * tileSize + tileSize / 2,
            actor.spriteId
          )
          .setOrigin(0.5, 0.5);
        this.actorLayer?.add(sprite);
        this.actorSprites.set(actor.id, sprite);
      }
    );
  }

  private applyIncomingSnapshot(snapshot: RoomSnapshot) {
    const previousLocalPlayer = this.roomState?.players.find(
      (player) => player.id === this.roomState?.localPlayerId
    );
    const nextLocalPlayer = snapshot.players.find(
      (player) => player.id === snapshot.localPlayerId
    );

    this.roomState = snapshot;
    useUiStore.getState().setPlacedCount(snapshot.placedItems.length);
    this.syncUiPresence();
    this.renderFurniture();
    this.renderActors();

    if (this.player && nextLocalPlayer) {
      this.player.setPosition(
        nextLocalPlayer.position.x * tileSize + tileSize / 2,
        nextLocalPlayer.position.y * tileSize + tileSize / 2
      );
      this.updatePlayerIndicator(nextLocalPlayer.facing);
    }

    if (
      nextLocalPlayer &&
      previousLocalPlayer &&
      (nextLocalPlayer.position.x !== previousLocalPlayer.position.x ||
        nextLocalPlayer.position.y !== previousLocalPlayer.position.y)
    ) {
      this.placementTile = { ...nextLocalPlayer.position };
      this.refreshPlacementCursor();
    }
  }

  private syncUiPresence() {
    const roomState = this.getRoomState();
    useUiStore.getState().setOnlinePlayers(
      roomState.players.map((player) => ({
        id: player.id,
        displayName: player.displayName,
        isLocal: player.id === roomState.localPlayerId
      }))
    );
  }
}
