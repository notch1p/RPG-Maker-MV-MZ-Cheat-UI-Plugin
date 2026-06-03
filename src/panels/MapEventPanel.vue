<script setup lang="ts">
import { DataEvent, DataMap } from "rmmz-types";
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";

interface MapPosition {
  x: number;
  y: number;
}

interface EnemyEntry {
  id: number;
  x: number;
  y: number;
  direction: number;
  moving: boolean;
  characterName: string;
  characterIndex: number;
}

interface TreasureEntry {
  id: number;
  name: string;
  x: number;
  y: number;
}

const mapCanvas = ref<HTMLCanvasElement | null>(null);

const treasureNamePattern =
  /treasure|chest|box|gold|coin|money|gem|jewel|diamond|ruby|emerald|loot|reward|prize|vault|safe|宝箱|宝物|金币|金钱|珠宝|财宝|奖励|宝石|钻石|红宝石|绿宝石|たからばこ|たからもの|きんか|きんせん|ほうせき|しゅほう|おうごん|ゴールド|コイン|マネー|ジェム|ジュエル|ダイヤモンド|ルビー|エメラルド|トレジャー|チェスト|ボックス|リワード|プライズ/i;
const treasureImageNamePattern =
  /chest|box|treasure|gold|coin|gem|jewel|crystal|orb|artifact|vault|safe|money|diamond|ruby|emerald|宝箱|宝物|金币|金钱|珠宝|财宝|钻石|红宝石|绿宝石|宝石|たからばこ|たからもの|きんか|きんせん|ほうせき|ダイヤモンド|ルビー|エメラルド|ゴールド|コイン|ジェム|ジュエル|クリスタル|トレジャー|チェスト|ボックス/i;
const treasureTextPattern =
  /found|obtained|received|gained|treasure|gold|coin|item|reward|loot|prize|discovered|acquired|collected|发现|获得|得到|找到|宝物|金币|收集|获取|奖励|战利品|發見|入手|取得|みつけた|てにいれた|えた|かくとく|ほうしゅう|あいてむ|たからもの|きんか|ゴールド|アイテム|リワード|トレジャー|コイン|しゅうしゅう|はっけん/i;
const enemyCommentPattern =
  /enemy|敌人|monster|hostile|boss|guard|soldier|bandit|thief|assassin|villain|criminal|mercenary|outlaw|warrior|knight|敵|モンスター|敵対|ボス|ガード|兵士|盗賊|暗殺者|悪|魔物|魔獣|デーモン|鬼|妖怪|悪役|犯罪者|傭兵|戦士|騎士|アウトロー/i;
const enemyImageNamePattern =
  /enemy|monster|evil|demon|beast|soldier|guard|bandit|thief|assassin|mercenary|outlaw|criminal|villain|boss|captain|samurai|ninja|ronin|hunter|archer|swordsman|mage|wizard|witch|sorcerer|priest|cleric|warrior|knight|man|woman|person|human|people|npc|char|character|sprite|敌人|敵|怪物|魔物|士兵|守卫|强盗|小偷|刺客|雇佣兵|罪犯|恶棍|老板|队长|武士|忍者|猎人|弓箭手|剑士|法师|巫师|祭司|战士|骑士|人|角色|モンスター|悪|デーモン|魔獣|兵士|ガード|盗賊|暗殺者|傭兵|犯罪者|悪役|ボス|キャプテン|サムライ|ニンジャ|浪人|ハンター|アーチャー|ソードマン|メイジ|ウィザード|魔女|ソーサラー|プリースト|クレリック|戦士|騎士|人間|キャラクター|スプライト/i;

function loadSetting<T>(key: string, defaultValue: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved !== null ? (JSON.parse(saved) as T) : defaultValue;
  } catch (error) {
    console.warn("Failed to load setting:", key, error);
    return defaultValue;
  }
}

function saveSetting(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn("Failed to save setting:", key, error);
  }
}

const limitedView = ref(loadSetting("mapEventPanel_limitedView", true));
const clickToTeleportEnabled = ref(
  loadSetting("mapEventPanel_clickToTeleport", true),
);
const readInterval = ref(loadSetting("mapEventPanel_readInterval", 500));

const currentMapId = ref(0);
const canvasWidth = ref(550);
const canvasHeight = ref(550);
let cellSize = 14;
const baseCellSize = 14;
const maxViewSize = 25;

const mapData = ref<DataMap | null>(null);
const mapEvents = ref<DataEvent[]>([]);
const regularEvents = ref<DataEvent[]>([]);
const playerPosition = ref<MapPosition>({ x: 0, y: 0 });
const enemies = ref<EnemyEntry[]>([]);
const treasureBoxes = ref<TreasureEntry[]>([]);
let lastKnownMapId = 0;

const isCanvasVisible = ref(false);
let visibilityObserver: { disconnect: () => void } | null = null;
let renderIntervalId: ReturnType<typeof setInterval> | null = null;

const displayMapWidth = computed(() => {
  if (!mapData.value) return 0;
  return limitedView.value
    ? Math.min(maxViewSize, mapData.value.width)
    : mapData.value.width;
});

const displayMapHeight = computed(() => {
  if (!mapData.value) return 0;
  return limitedView.value
    ? Math.min(maxViewSize, mapData.value.height)
    : mapData.value.height;
});

const canvasStyle = computed(() => ({
  border: "1px solid #ccc",
  backgroundColor: "#000",
  cursor: clickToTeleportEnabled.value ? "pointer" : "default",
}));

function updateCanvasSize() {
  if (!mapData.value) return;
  if (limitedView.value) {
    cellSize = baseCellSize;
    canvasWidth.value = Math.min(600, maxViewSize * cellSize);
    canvasHeight.value = Math.min(600, maxViewSize * cellSize);
  } else {
    const maxCanvasSize = 600;
    const scaleX = maxCanvasSize / mapData.value.width;
    const scaleY = maxCanvasSize / mapData.value.height;
    cellSize = Math.max(1, Math.floor(Math.min(scaleX, scaleY)));
    canvasWidth.value = mapData.value.width * cellSize;
    canvasHeight.value = mapData.value.height * cellSize;
  }
}

function updateCurrentMapData() {
  try {
    currentMapId.value = $gameMap.mapId();
    mapData.value = $dataMap;
    if (mapData.value) updateCanvasSize();
  } catch (error) {
    console.warn("Could not get current map data:", error);
  }
}

function updatePlayerPosition() {
  try {
    if ($gamePlayer) {
      playerPosition.value = { x: $gamePlayer.x, y: $gamePlayer.y };
    }
  } catch (error) {
    console.warn("Could not get player position:", error);
  }
}

function isEnemyEvent(event: any): boolean {
  try {
    const hasMovement = event._moveType > 0;
    const hasCharacterGraphic =
      event._characterName && event._characterName !== "";
    const notPlayer = event._eventId !== ($gamePlayer as any)._eventId;

    if (hasMovement && notPlayer) return true;
    if (!hasCharacterGraphic) return false;

    if (event._pages) {
      for (const page of event._pages) {
        if (page && page.list) {
          for (const command of page.list) {
            if (command.code === 301) return true;
            if (command.code === 108 || command.code === 408) {
              const comment = command.parameters[0] || "";
              if (enemyCommentPattern.test(comment)) return true;
            }
          }
        }
      }
    }
    if (enemyImageNamePattern.test(event._characterName)) return true;
    return false;
  } catch {
    return false;
  }
}

function isTreasureEvent(event: any): boolean {
  try {
    if (event.name && treasureNamePattern.test(event.name)) return true;
    if (
      event._characterName &&
      treasureImageNamePattern.test(event._characterName)
    ) {
      return true;
    }
    if (event.pages) {
      for (const page of event.pages) {
        if (!page) continue;
        if (
          page.image &&
          page.image.characterName &&
          treasureImageNamePattern.test(page.image.characterName)
        ) {
          return true;
        }
        if (page && page.list) {
          for (const command of page.list) {
            if (command && command.parameters) {
              if (
                command.code === 125 ||
                command.code === 126 ||
                command.code === 127 ||
                command.code === 128
              ) {
                return true;
              }
              if (command.code === 101 || command.code === 401) {
                const text = command.parameters[0] || "";
                if (treasureTextPattern.test(text)) return true;
              }
            }
          }
        }
      }
    }
    return false;
  } catch {
    return false;
  }
}

function updateMapEvents() {
  try {
    mapEvents.value = [];
    enemies.value = [];
    treasureBoxes.value = [];
    regularEvents.value = [];

    if (!$dataMap || !$dataMap.events) return;

    for (let i = 1; i < $dataMap.events.length; i++) {
      const event = $dataMap.events[i];
      if (!event || event.x === undefined || event.y === undefined) continue;

      mapEvents.value.push(event);

      const gameEvent = ($gameMap as any)._events[i];

      if (gameEvent && isEnemyEvent(gameEvent)) {
        enemies.value.push({
          id: gameEvent._eventId || i,
          x: gameEvent._x !== undefined ? gameEvent._x : event.x,
          y: gameEvent._y !== undefined ? gameEvent._y : event.y,
          direction: gameEvent._direction || 2,
          moving: gameEvent._moveType > 0,
          characterName: gameEvent._characterName || "",
          characterIndex: gameEvent._characterIndex || 0,
        });
      } else if (isTreasureEvent(event)) {
        treasureBoxes.value.push({
          x: event.x,
          y: event.y,
          id: event.id,
          name: event.name,
        });
      } else {
        regularEvents.value.push(event);
      }
    }

    console.log(
      `Events processed: ${enemies.value.length} enemies, ${treasureBoxes.value.length} treasures, ${regularEvents.value.length} regular events`,
    );
  } catch (error) {
    console.warn("Could not get map events:", error);
  }
}

function updateEnemyPositions() {
  try {
    enemies.value.forEach((enemy) => {
      const gameEvent = ($gameMap as any)._events[enemy.id];
      if (gameEvent) {
        enemy.x = gameEvent._x;
        enemy.y = gameEvent._y;
        enemy.direction = gameEvent._direction || 2;
        enemy.moving = gameEvent._moveType > 0;
      }
    });
  } catch (error) {
    console.warn("Could not update enemy positions:", error);
  }
}

function checkForMapChange() {
  try {
    const id = $gameMap.mapId();
    if (id !== lastKnownMapId) {
      console.log(`Map changed from ${lastKnownMapId} to ${id}`);
      updateCurrentMapData();
      updateMapEvents();
      lastKnownMapId = id;
      nextTick(() => {
        if (isCanvasVisible.value) renderMap();
      });
    }
  } catch (error) {
    console.warn("Could not check for map change:", error);
  }
}

function isWithinMapBounds(x: number, y: number): boolean {
  try {
    if ($gameMap && typeof $gameMap.isValid === "function") {
      return $gameMap.isValid(x, y);
    }
    if ($gameMap) {
      const width = $gameMap.width();
      const height = $gameMap.height();
      return x >= 0 && x < width && y >= 0 && y < height;
    }
    if (mapData.value) {
      return (
        x >= 0 && x < mapData.value.width && y >= 0 && y < mapData.value.height
      );
    }
    return false;
  } catch {
    return false;
  }
}

function isTilePassable(x: number, y: number): boolean {
  try {
    if (!isWithinMapBounds(x, y)) return false;
    if ($gameMap && typeof $gameMap.isPassable === "function") {
      return (
        $gameMap.isPassable(x, y, 2) ||
        $gameMap.isPassable(x, y, 4) ||
        $gameMap.isPassable(x, y, 6) ||
        $gameMap.isPassable(x, y, 8)
      );
    }
    return true;
  } catch {
    return true;
  }
}

function isTooLargeToDrawWalkableBoundaries(width: number, height: number) {
  return width > 50 && height > 50;
}

function drawWalkableBoundaries(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
) {
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = 2;
  for (let x = startX; x < endX; x++) {
    for (let y = startY; y < endY; y++) {
      if (!isTilePassable(x, y)) continue;
      const canvasX = (x - startX) * cellSize;
      const canvasY = (y - startY) * cellSize;
      if ($gamePlayer && typeof ($gamePlayer as any).canPass === "function") {
        const canMoveLeft = ($gamePlayer as any).canPass(x, y, 4);
        const canMoveRight = ($gamePlayer as any).canPass(x, y, 6);
        const canMoveUp = ($gamePlayer as any).canPass(x, y, 8);
        const canMoveDown = ($gamePlayer as any).canPass(x, y, 2);
        ctx.beginPath();
        if (!canMoveLeft) {
          ctx.moveTo(canvasX, canvasY);
          ctx.lineTo(canvasX, canvasY + cellSize);
        }
        if (!canMoveRight) {
          ctx.moveTo(canvasX + cellSize, canvasY);
          ctx.lineTo(canvasX + cellSize, canvasY + cellSize);
        }
        if (!canMoveUp) {
          ctx.moveTo(canvasX, canvasY);
          ctx.lineTo(canvasX + cellSize, canvasY);
        }
        if (!canMoveDown) {
          ctx.moveTo(canvasX, canvasY + cellSize);
          ctx.lineTo(canvasX + cellSize, canvasY + cellSize);
        }
        ctx.stroke();
      }
    }
  }
}

function drawMapGrid(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
) {
  for (let x = startX; x < endX; x++) {
    for (let y = startY; y < endY; y++) {
      const canvasX = (x - startX) * cellSize;
      const canvasY = (y - startY) * cellSize;
      ctx.fillStyle = isTilePassable(x, y) ? "#888888" : "#333333";
      ctx.fillRect(canvasX, canvasY, cellSize, cellSize);
    }
  }
  if (!isTooLargeToDrawWalkableBoundaries(endX - startX, endY - startY)) {
    drawWalkableBoundaries(ctx, startX, startY, endX, endY);
  }
  ctx.strokeStyle = "#444444";
  ctx.lineWidth = 0.5;
  for (let x = startX; x < endX; x++) {
    for (let y = startY; y < endY; y++) {
      const canvasX = (x - startX) * cellSize;
      const canvasY = (y - startY) * cellSize;
      ctx.strokeRect(canvasX, canvasY, cellSize, cellSize);
    }
  }
}

function drawMapEvents(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
) {
  regularEvents.value.forEach((event) => {
    if (
      event.x >= startX &&
      event.x < startX + displayMapWidth.value &&
      event.y >= startY &&
      event.y < startY + displayMapHeight.value
    ) {
      const canvasX = (event.x - startX) * cellSize;
      const canvasY = (event.y - startY) * cellSize;
      ctx.fillStyle = "#FFD700";
      ctx.fillRect(canvasX, canvasY, cellSize, cellSize);
      ctx.fillStyle = "#000000";
      ctx.font = `${Math.max(8, cellSize - 4)}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("EV", canvasX + cellSize / 2, canvasY + cellSize / 2);
    }
  });
}

function drawEnemies(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
) {
  enemies.value.forEach((enemy) => {
    if (
      enemy.x >= startX &&
      enemy.x < startX + displayMapWidth.value &&
      enemy.y >= startY &&
      enemy.y < startY + displayMapHeight.value
    ) {
      const canvasX = (enemy.x - startX) * cellSize;
      const canvasY = (enemy.y - startY) * cellSize;
      ctx.fillStyle = "#FF8C00";
      ctx.beginPath();
      ctx.arc(
        canvasX + cellSize / 2,
        canvasY + cellSize / 2,
        Math.max(3, cellSize / 3),
        0,
        2 * Math.PI,
      );
      ctx.fill();
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 1;
      ctx.stroke();
      if (enemy.moving) {
        const centerX = canvasX + cellSize / 2;
        const centerY = canvasY + cellSize / 2;
        const size = Math.max(2, cellSize / 6);
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        switch (enemy.direction) {
          case 2:
            ctx.moveTo(centerX, centerY + size);
            ctx.lineTo(centerX - size / 2, centerY);
            ctx.lineTo(centerX + size / 2, centerY);
            break;
          case 4:
            ctx.moveTo(centerX - size, centerY);
            ctx.lineTo(centerX, centerY - size / 2);
            ctx.lineTo(centerX, centerY + size / 2);
            break;
          case 6:
            ctx.moveTo(centerX + size, centerY);
            ctx.lineTo(centerX, centerY - size / 2);
            ctx.lineTo(centerX, centerY + size / 2);
            break;
          case 8:
            ctx.moveTo(centerX, centerY - size);
            ctx.lineTo(centerX - size / 2, centerY);
            ctx.lineTo(centerX + size / 2, centerY);
            break;
          default:
            ctx.arc(centerX, centerY, size / 2, 0, 2 * Math.PI);
        }
        ctx.closePath();
        ctx.fill();
      }
    }
  });
}

function drawTreasureBoxes(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
) {
  treasureBoxes.value.forEach((t) => {
    if (
      t.x >= startX &&
      t.x < startX + displayMapWidth.value &&
      t.y >= startY &&
      t.y < startY + displayMapHeight.value
    ) {
      const canvasX = (t.x - startX) * cellSize;
      const canvasY = (t.y - startY) * cellSize;
      ctx.fillStyle = "#0066FF";
      ctx.fillRect(canvasX, canvasY, cellSize, cellSize);
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 1;
      ctx.strokeRect(
        canvasX + cellSize / 8,
        canvasY + cellSize / 8,
        (cellSize * 3) / 4,
        (cellSize * 3) / 4,
      );
      ctx.fillStyle = "#66AAFF";
      ctx.fillRect(
        canvasX + (cellSize * 3) / 8,
        canvasY + cellSize / 4,
        cellSize / 4,
        cellSize / 4,
      );
    }
  });
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
) {
  const px = (playerPosition.value.x - startX) * cellSize;
  const py = (playerPosition.value.y - startY) * cellSize;
  if (
    playerPosition.value.x >= startX &&
    playerPosition.value.x < startX + displayMapWidth.value &&
    playerPosition.value.y >= startY &&
    playerPosition.value.y < startY + displayMapHeight.value
  ) {
    ctx.fillStyle = "#FF0000";
    ctx.beginPath();
    ctx.arc(
      px + cellSize / 2,
      py + cellSize / 2,
      Math.max(3, cellSize / 3),
      0,
      2 * Math.PI,
    );
    ctx.fill();
  }
}

function renderMap() {
  if (!mapData.value || !mapCanvas.value) return;
  const canvas = mapCanvas.value;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  let startX = 0,
    startY = 0,
    endX = mapData.value.width,
    endY = mapData.value.height;

  if (limitedView.value) {
    startX = Math.max(0, playerPosition.value.x - Math.floor(maxViewSize / 2));
    startY = Math.max(0, playerPosition.value.y - Math.floor(maxViewSize / 2));
    endX = Math.min(mapData.value.width, startX + maxViewSize);
    endY = Math.min(mapData.value.height, startY + maxViewSize);
    if (endX - startX < maxViewSize) startX = Math.max(0, endX - maxViewSize);
    if (endY - startY < maxViewSize) startY = Math.max(0, endY - maxViewSize);
  }

  drawMapGrid(ctx, startX, startY, endX, endY);
  drawMapEvents(ctx, startX, startY);
  drawTreasureBoxes(ctx, startX, startY);
  drawEnemies(ctx, startX, startY);
  drawPlayer(ctx, startX, startY);
}

function setCanvasVisible(visible: boolean) {
  if (isCanvasVisible.value === visible) return;
  isCanvasVisible.value = visible;
  if (visible) {
    nextTick(() => {
      if (mapData.value) renderMap();
    });
  }
}

function setupCanvasVisibilityObserver() {
  const canvas = mapCanvas.value;
  if (!canvas) return;
  if (typeof IntersectionObserver !== "undefined") {
    try {
      const obs = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            setCanvasVisible(
              entry.isIntersecting && entry.intersectionRatio > 0,
            );
          }
        },
        { root: null, threshold: 0.01 },
      );
      obs.observe(canvas);
      visibilityObserver = { disconnect: () => obs.disconnect() };
      return;
    } catch {
      /* fall through */
    }
  }

  const checkVisibility = () => {
    const rect = canvas.getBoundingClientRect();
    const vw = window.innerWidth || document.documentElement.clientWidth;
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const visible =
      rect.width > 0 &&
      rect.height > 0 &&
      rect.bottom >= 0 &&
      rect.right >= 0 &&
      rect.left <= vw &&
      rect.top <= vh;
    setCanvasVisible(visible);
  };

  let timeout: ReturnType<typeof setTimeout> | null = null;
  const throttledCheck = () => {
    if (timeout) return;
    timeout = setTimeout(() => {
      timeout = null;
      checkVisibility();
    }, 200);
  };

  window.addEventListener("scroll", throttledCheck, true);
  window.addEventListener("resize", throttledCheck);
  visibilityObserver = {
    disconnect() {
      window.removeEventListener("scroll", throttledCheck, true);
      window.removeEventListener("resize", throttledCheck);
    },
  };
  checkVisibility();
}

function teleportPlayerTo(targetX: number, targetY: number) {
  try {
    if ($gamePlayer) {
      $gamePlayer.setPosition(targetX, targetY);
      ($gamePlayer as any).center(targetX, targetY);
      ($gamePlayer as any).makeEncounterCount();
      console.log(`Teleported player to (${targetX}, ${targetY})`);
    }
  } catch (error) {
    console.warn("Could not teleport player:", error);
  }
}

function onCanvasClick(event: MouseEvent) {
  if (!clickToTeleportEnabled.value || !mapData.value || !mapCanvas.value)
    return;
  const canvas = mapCanvas.value;
  const rect = canvas.getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  const clickY = event.clientY - rect.top;
  const cellX = Math.floor(clickX / cellSize);
  const cellY = Math.floor(clickY / cellSize);

  let mapX: number;
  let mapY: number;

  if (limitedView.value) {
    const startX = Math.max(
      0,
      playerPosition.value.x - Math.floor(maxViewSize / 2),
    );
    const startY = Math.max(
      0,
      playerPosition.value.y - Math.floor(maxViewSize / 2),
    );
    const endX = Math.min(mapData.value.width, startX + maxViewSize);
    const endY = Math.min(mapData.value.height, startY + maxViewSize);

    if (endX - startX < maxViewSize) {
      mapX = Math.max(0, endX - maxViewSize) + cellX;
    } else {
      mapX = startX + cellX;
    }
    if (endY - startY < maxViewSize) {
      mapY = Math.max(0, endY - maxViewSize) + cellY;
    } else {
      mapY = startY + cellY;
    }
  } else {
    mapX = cellX;
    mapY = cellY;
  }

  if (
    mapX >= 0 &&
    mapX < mapData.value.width &&
    mapY >= 0 &&
    mapY < mapData.value.height
  ) {
    teleportPlayerTo(mapX, mapY);
  } else {
    console.warn(`Click coordinates (${mapX}, ${mapY}) are outside map bounds`);
  }
}

watch(limitedView, (newValue) => {
  saveSetting("mapEventPanel_limitedView", newValue);
  updateCanvasSize();
  nextTick(() => {
    if (isCanvasVisible.value) renderMap();
  });
});

watch(clickToTeleportEnabled, (newValue) => {
  saveSetting("mapEventPanel_clickToTeleport", newValue);
});

watch(readInterval, (newValue) => {
  let valid = parseInt(String(newValue));
  if (isNaN(valid) || valid < 100) valid = 100;
  if (valid > 1000) valid = 1000;
  if (valid !== readInterval.value) {
    readInterval.value = valid;
  }
  saveSetting("mapEventPanel_readInterval", valid);
  if (renderIntervalId) {
    clearInterval(renderIntervalId);
    renderIntervalId = null;
  }
  renderIntervalId = setInterval(() => {
    checkForMapChange();
    updatePlayerPosition();
    updateEnemyPositions();
    if (isCanvasVisible.value) renderMap();
  }, valid);
});

function initializeMapDisplay() {
  updateCurrentMapData();
  updatePlayerPosition();
  updateMapEvents();
  lastKnownMapId = currentMapId.value;

  renderIntervalId = setInterval(() => {
    checkForMapChange();
    updatePlayerPosition();
    updateEnemyPositions();
    if (isCanvasVisible.value) renderMap();
  }, readInterval.value);
}

onMounted(() => {
  initializeMapDisplay();
  nextTick(() => {
    setupCanvasVisibilityObserver();
    if (isCanvasVisible.value) renderMap();
  });
});

onBeforeUnmount(() => {
  try {
    visibilityObserver?.disconnect();
  } catch {
    /* ignore */
  }
  try {
    if (renderIntervalId) {
      clearInterval(renderIntervalId);
      renderIntervalId = null;
    }
  } catch {
    /* ignore */
  }
});
</script>

<template>
  <v-card flat class="ma-0 pa-0">
    <v-row class="mb-0 pa-0">
      <v-col cols="12">
        <canvas
          ref="mapCanvas"
          :width="canvasWidth"
          :height="canvasHeight"
          :style="canvasStyle"
          @click="onCanvasClick"
        />
      </v-col>
    </v-row>

    <v-row class="mb-0 pa-0">
      <v-col cols="12">
        <div class="text-caption">
          <v-chip size="x-small" color="grey">灰色: 可行走</v-chip>
          <v-chip size="x-small" color="grey-darken-3" class="ml-2"
            >深灰: 不可行走</v-chip
          >
          <v-chip size="x-small" color="red" class="ml-2"
            >红点: 角色位置</v-chip
          >
          <v-chip size="x-small" color="yellow" text-color="black" class="ml-2"
            >EV: 事件位置</v-chip
          >
          <v-chip size="x-small" color="white" text-color="black" class="ml-2"
            >白线: 地图边界</v-chip
          >
          <v-chip size="x-small" color="orange" class="ml-2"
            >橙点: 敌人/可移动的事件位置</v-chip
          >
          <v-chip size="x-small" color="blue" class="ml-2"
            >蓝点: 宝箱/道具变化的事件位置</v-chip
          >
        </div>
      </v-col>
    </v-row>

    <v-row class="mb-0 pa-0">
      <v-col cols="12" md="4">
        <v-switch
          v-model="limitedView"
          label="25x25 视图"
          color="primary"
          hide-details
        />
      </v-col>
      <v-col cols="12" md="4">
        <v-text-field
          v-model="currentMapId"
          label="当前地图 ID"
          density="compact"
          readonly
          bg-color="grey-darken-3"
          hide-details
          variant="outlined"
        />
      </v-col>
      <v-col cols="12" md="4">
        <v-text-field
          v-model="readInterval"
          label="读取间隔 (100-1000ms)"
          density="compact"
          type="number"
          bg-color="grey-darken-3"
          hide-details
          variant="outlined"
        />
      </v-col>
    </v-row>
  </v-card>
</template>
