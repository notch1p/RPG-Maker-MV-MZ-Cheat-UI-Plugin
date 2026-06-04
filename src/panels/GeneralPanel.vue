<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { version as vueVersion } from "vue";
import {
  BattleCheat,
  GameSpeedCheat,
  GeneralCheat,
  SceneCheat,
  SpeedCheat,
} from "@/js/CheatHelper";
import { formatCommand } from "@/js/eventFormatter";
import { RPGVERSION } from "@/version";
import { DataCommand } from "rmmz-types";

interface EventRow {
  index: number;
  codeText: string;
  commandName: string;
  detail: string;
  is4xx: boolean;
  indentPx: number;
}

const noClip = ref(false);
const gold = ref<number | string>(0);
const speed = ref(0);
const fixSpeed = ref(false);
const minSpeed = 1;
const maxSpeed = 10;
const stepSpeed = 0.5;

const gameSpeed = ref(1);
const minGameSpeed = 0.1;
const maxGameSpeed = 10;
const stepGameSpeed = 0.1;
const applyAllForGameSpeed = ref(false);
const applyBattleForGameSpeed = ref(false);

const showEventInspectDialog = ref(false);
const inspectedEventId = ref<number | null>(null);
const inspectedEventCurrentIndex = ref(-1);
const inspectedEventRows = ref<EventRow[]>([]);
const inspectedEventMessage = ref("");

const showDebugReplDialog = ref(false);
const replInput = ref("$gameMap.mapId()");
const replOutputEntries = ref<string[]>([]);

const debugReplCard = ref<{ $el?: HTMLElement } | HTMLElement | null>(null);
const eventRowRefs = ref<Record<number, HTMLElement | null>>({});

let replGlobalKeyGuard: ((event: KeyboardEvent) => void) | null = null;
let popupEscapeKeyGuard: ((event: KeyboardEvent) => void) | null = null;

function initializeVariables() {
  noClip.value = $gamePlayer._through;
  speed.value = $gamePlayer.moveSpeed();
  fixSpeed.value = SpeedCheat.isFixed();
  gold.value = $gameParty._gold;

  gameSpeed.value = GameSpeedCheat.getRate();
  const opt = GameSpeedCheat.getSceneOption();
  if (opt === GameSpeedCheat.sceneOptions().all) {
    applyAllForGameSpeed.value = true;
  } else if (opt === GameSpeedCheat.sceneOptions().battle) {
    applyBattleForGameSpeed.value = true;
  }
}

function onNoClipChange() {
  GeneralCheat.toggleNoClip();
  initializeVariables();
}

function onSpeedChange() {
  SpeedCheat.setSpeed(speed.value, fixSpeed.value);
  SpeedCheat.__writeSettings(speed.value, fixSpeed.value);
  initializeVariables();
}

function addSpeed(amount: number) {
  speed.value = Math.min(Math.max(speed.value + amount, minSpeed), maxSpeed);
  onSpeedChange();
}

function onGoldChange() {
  const n = Number(gold.value);
  if (isNaN(n) || !Number.isInteger(n) || n < 0) return;
  const diff = n - $gameParty._gold;
  if (diff < 0) $gameParty.loseGold(-diff);
  else if (diff > 0) $gameParty.gainGold(diff);
  gold.value = $gameParty._gold;
  initializeVariables();
}

const gotoTitle = () => SceneCheat.gotoTitle();
const toggleSaveScene = () => SceneCheat.toggleSaveScene();
const toggleLoadScene = () => SceneCheat.toggleLoadScene();
const victory = () => BattleCheat.victory();
const recoverAllParty = () => BattleCheat.recoverAllParty();
const changeAllEnemyHealth = (n: number) => BattleCheat.changeAllEnemyHealth(n);

function getCurrentEventId(): number {
  return $gameMap._interpreter.eventId() || 0;
}

function getCurrentEventCommandIndex(): number {
  const index = $gameMap._interpreter._index;
  if (index < 0) return -1;
  return index - 1;
}

function setEventRowRef(index: number, el: Element | null) {
  eventRowRefs.value[index] = el as HTMLElement | null;
}

function scrollToCurrentEventEntry() {
  if (inspectedEventCurrentIndex.value < 0) return;
  const el = eventRowRefs.value[inspectedEventCurrentIndex.value];
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
}
/* really is DataCommandExt */
function formatEventListEntries(list: DataCommand[]): EventRow[] {
  if (list.length === 0) return [];
  return list.map((entry, index) => {
    const indent = entry.indent ? entry.indent : 0;
    const formatted = formatCommand(entry);
    return {
      index,
      codeText: entry.code.toString(),
      commandName: formatted.name,
      detail: formatted.detail,
      is4xx: formatted.is4xx,
      indentPx: Math.max(0, indent) * 16,
    };
  });
}

async function inspectCurrentEvent() {
  try {
    const eventId = getCurrentEventId();
    inspectedEventId.value = eventId;
    inspectedEventCurrentIndex.value = getCurrentEventCommandIndex();

    if (eventId <= 0) {
      inspectedEventRows.value = [];
      inspectedEventMessage.value = "当前没有正在执行的地图事件";
      showEventInspectDialog.value = true;
      return;
    }

    const eventObject = $gameMap.event(eventId);
    const pageData = eventObject.page();

    inspectedEventRows.value = formatEventListEntries(pageData.list);
    inspectedEventMessage.value =
      inspectedEventRows.value.length === 0 ? "(empty event list)" : "";
  } catch (error) {
    inspectedEventRows.value = [];
    inspectedEventMessage.value = `error: ${String(error)}`;
  }

  showEventInspectDialog.value = true;
  nextTick(() => {
    requestAnimationFrame(scrollToCurrentEventEntry);
  });
}

function closeEventInspectDialog() {
  showEventInspectDialog.value = false;
}

function openDebugRepl() {
  showDebugReplDialog.value = true;
}

function closeDebugRepl() {
  showDebugReplDialog.value = false;
}

function formatReplValue(value: unknown): string {
  if (value === undefined) return "undefined";
  if (typeof value === "string") return value;
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  ) {
    return String(value);
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    try {
      return String(value);
    } catch {
      return "[Unserializable value]";
    }
  }
}

function appendReplOutput(
  type: "input" | "result" | "error" | "warn",
  content: string,
) {
  const labelMap = { input: "IN", result: "OUT", error: "ERR", warn: "WARN" };
  replOutputEntries.value.push(`${labelMap[type] || "LOG"}> ${content}`);
  if (replOutputEntries.value.length > 200) {
    replOutputEntries.value = replOutputEntries.value.slice(-200);
  }
}

function clearReplOutput() {
  replOutputEntries.value = [];
}

function runRepl() {
  const code = String(replInput.value || "");
  if (!code) {
    appendReplOutput("warn", "请输入要执行的 JavaScript 代码");
    return;
  }
  appendReplOutput("input", code);
  try {
    // use global scope (which is what
    const evalFn = (globalThis as { eval(s: string): unknown }).eval;
    const result = evalFn(code);
    appendReplOutput("result", formatReplValue(result));
  } catch (error) {
    const message =
      error && (error as Error).stack ? (error as Error).stack! : String(error);
    appendReplOutput("error", message);
  }
}

function isNodeInsideDebugRepl(node: Element | null): boolean {
  const ref = debugReplCard.value as { $el?: HTMLElement } | HTMLElement | null;
  const replRoot =
    ref && (ref as { $el?: HTMLElement }).$el
      ? (ref as { $el: HTMLElement }).$el
      : (ref as HTMLElement | null);
  if (!replRoot || !node || typeof replRoot.contains !== "function") {
    return false;
  }
  if (replRoot.contains(node)) return true;
  if (
    typeof (node as Element).closest === "function" &&
    (node as Element).closest(".v-dialog__content, .v-overlay__content")
  ) {
    return true;
  }
  return false;
}

function enableReplGlobalKeyGuard() {
  if (replGlobalKeyGuard) return;
  replGlobalKeyGuard = (event: KeyboardEvent) => {
    if (!showDebugReplDialog.value) return;
    const target = event.target as Element | null;
    if (isNodeInsideDebugRepl(target)) return;
    if (typeof event.stopImmediatePropagation === "function") {
      event.stopImmediatePropagation();
    }
    event.stopPropagation();
    event.preventDefault();
  };
  window.addEventListener("keydown", replGlobalKeyGuard, true);
  window.addEventListener("keyup", replGlobalKeyGuard, true);
  window.addEventListener("keypress", replGlobalKeyGuard, true);
}

function disableReplGlobalKeyGuard() {
  if (!replGlobalKeyGuard) return;
  window.removeEventListener("keydown", replGlobalKeyGuard, true);
  window.removeEventListener("keyup", replGlobalKeyGuard, true);
  window.removeEventListener("keypress", replGlobalKeyGuard, true);
  replGlobalKeyGuard = null;
}

function enablePopupEscapeKeyGuard() {
  if (popupEscapeKeyGuard) return;
  popupEscapeKeyGuard = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    if (!showEventInspectDialog.value && !showDebugReplDialog.value) return;
    if (showDebugReplDialog.value) closeDebugRepl();
    if (showEventInspectDialog.value) closeEventInspectDialog();
    if (typeof event.stopImmediatePropagation === "function") {
      event.stopImmediatePropagation();
    }
    event.stopPropagation();
    event.preventDefault();
  };
  window.addEventListener("keydown", popupEscapeKeyGuard, true);
}

function disablePopupEscapeKeyGuard() {
  if (!popupEscapeKeyGuard) return;
  window.removeEventListener("keydown", popupEscapeKeyGuard, true);
  popupEscapeKeyGuard = null;
}

function updatePopupEscapeKeyGuard() {
  if (showEventInspectDialog.value || showDebugReplDialog.value) {
    enablePopupEscapeKeyGuard();
  } else {
    disablePopupEscapeKeyGuard();
  }
}

watch(showEventInspectDialog, updatePopupEscapeKeyGuard);
watch(showDebugReplDialog, (newValue) => {
  if (newValue) enableReplGlobalKeyGuard();
  else disableReplGlobalKeyGuard();
  updatePopupEscapeKeyGuard();
});

function onGameSpeedChange() {
  let opt: (() => boolean) | undefined;
  if (applyAllForGameSpeed.value) opt = GameSpeedCheat.sceneOptions().all;
  else if (applyBattleForGameSpeed.value)
    opt = GameSpeedCheat.sceneOptions().battle;
  GameSpeedCheat.setGameSpeed(gameSpeed.value, opt);
  GameSpeedCheat.__writeSettings(gameSpeed.value, opt!);
  initializeVariables();
}

function addGameSpeed(amount: number) {
  gameSpeed.value = Math.min(
    Math.max(gameSpeed.value + amount, minGameSpeed),
    maxGameSpeed,
  );
  onGameSpeedChange();
}

function setGameSpeed(_amount: number) {
  gameSpeed.value = 1;
  onGameSpeedChange();
}

function onApplyAllForGameSpeedChange() {
  applyBattleForGameSpeed.value = !applyAllForGameSpeed.value;
  onGameSpeedChange();
}

function onApplyBattleForGameSpeedChange() {
  applyAllForGameSpeed.value = !applyBattleForGameSpeed.value;
  onGameSpeedChange();
}

const replOutputText = computed(() => replOutputEntries.value.join("\n"));
const versionLabel = computed(
  () => `Commit ${RPGVERSION}, w/ Vue ${vueVersion} and Vuetify 4`,
);
const versionUrl = computed(
  () =>
    `https://github.com/notch1p/RPG-Maker-MV-MZ-Cheat-UI-Plugin/commit/${RPGVERSION}`,
);

function openVersionLink(e: Event) {
  e.preventDefault();
  if (typeof nw !== "undefined" && nw.Shell) {
    nw.Shell.openExternal(versionUrl.value);
  } else {
    window.open(versionUrl.value, "_blank", "noopener,noreferrer");
  }
}

onMounted(initializeVariables);
onBeforeUnmount(() => {
  disableReplGlobalKeyGuard();
  disablePopupEscapeKeyGuard();
});
</script>

<template>
  <v-card class="ma-0 pa-0" flat>
    <v-card-text class="py-0">
      <v-checkbox v-model="noClip" label="穿墙" @change="onNoClipChange" />
    </v-card-text>

    <v-card-text class="py-0">
      <v-text-field
        v-model="gold"
        label="钱"
        variant="outlined"
        density="compact"
        hide-details
        @keydown.self.stop
        @change="onGoldChange"
        @focus="($event.target as HTMLInputElement).select()"
      />
    </v-card-text>

    <v-card-text class="pt-4 pb-0">
      <v-slider
        v-model="speed"
        :min="minSpeed"
        :max="maxSpeed"
        :step="stepSpeed"
        thumb-label
        thumb-color="red"
        hide-details
        @end="onSpeedChange"
      >
        <template #prepend>
          <span
            class="text-grey-lighten-1 align-self-center mr-2 text-body-2"
            style="white-space: nowrap"
            >移动速度</span
          >
          <v-icon color="grey-lighten-3" @click="addSpeed(-stepSpeed)"
            >mdi-chevron-left</v-icon
          >
        </template>
        <template #append>
          <v-icon color="grey-lighten-3" @click="addSpeed(stepSpeed)"
            >mdi-chevron-right</v-icon
          >
          <span class="text-grey-lighten-1 align-self-center ml-2">{{
            speed.toFixed(1)
          }}</span>
        </template>
      </v-slider>
      <v-checkbox
        v-model="fixSpeed"
        class="pt-0"
        hide-details
        density="compact"
        label="固定速度"
        @change="onSpeedChange"
      />

      <v-slider
        v-model="gameSpeed"
        :min="minGameSpeed"
        :max="maxGameSpeed"
        :step="stepGameSpeed"
        class="mt-3"
        thumb-label
        thumb-color="red"
        hide-details
        @end="onGameSpeedChange"
      >
        <template #prepend>
          <span
            class="text-grey-lighten-1 align-self-center mr-2 d-inline-block text-body-2"
            style="white-space: nowrap"
            >游戏速度</span
          >
          <v-icon color="grey-lighten-3" @click="addGameSpeed(-stepGameSpeed)"
            >mdi-chevron-left</v-icon
          >
        </template>
        <template #append>
          <v-icon color="grey-lighten-3" @click="addGameSpeed(stepGameSpeed)"
            >mdi-chevron-right</v-icon
          >
          <span class="text-grey-lighten-1 align-self-center ml-2 mr-2"
            >x{{ gameSpeed.toFixed(1) }}</span
          >
          <v-icon
            size="16"
            color="grey-lighten-3"
            class="ml-2"
            @click="setGameSpeed(1)"
            >mdi-restore</v-icon
          >
        </template>
      </v-slider>

      <v-checkbox
        v-model="applyAllForGameSpeed"
        class="d-inline-flex pt-0"
        hide-details
        density="compact"
        label="全部场景"
        @change="onApplyAllForGameSpeedChange"
      />
      <v-checkbox
        v-model="applyBattleForGameSpeed"
        class="d-inline-flex ml-2 pt-0 mb-0"
        hide-details
        density="compact"
        label="战斗中"
        @change="onApplyBattleForGameSpeedChange"
      />
    </v-card-text>

    <v-card-subtitle class="mt-3 font-weight-bold">快速操作</v-card-subtitle>

    <v-card-text class="py-0">
      <v-btn size="small" @click="gotoTitle">返回标题</v-btn>
      <v-btn size="small" @click="toggleSaveScene">保存页面</v-btn>
      <v-btn size="small" @click="toggleLoadScene">加载页面</v-btn>
    </v-card-text>

    <v-card-text>
      <v-btn size="small" @click="victory">胜利</v-btn>
      <v-btn size="small" @click="recoverAllParty">我方恢复</v-btn>
      <v-btn size="small" @click="changeAllEnemyHealth(1)">敌人1血</v-btn>
    </v-card-text>

    <v-card-text class="pt-0">
      <v-btn size="small" color="indigo" @click="inspectCurrentEvent"
        >检查当前事件</v-btn
      >
      <v-btn
        size="small"
        color="deep-purple"
        class="ml-2"
        @click="openDebugRepl"
        >打开REPL</v-btn
      >
    </v-card-text>

    <v-dialog v-model="showEventInspectDialog" max-width="1200" persistent>
      <v-card theme="dark">
        <v-card-title class="d-flex align-center">
          <v-btn
            size="small"
            icon="mdi-close"
            variant="text"
            @click="closeEventInspectDialog"
          />
          <v-spacer />
          <span class="text-h6"
            >Event ID:
            {{ inspectedEventId === null ? "-" : inspectedEventId }}</span
          >
        </v-card-title>
        <v-card-text>
          <v-sheet
            class="pa-0"
            style="max-height: 620px; overflow-y: auto; font-size: 12px"
          >
            <div
              v-if="inspectedEventRows.length === 0"
              class="pa-4 text-grey-lighten-1"
            >
              {{ inspectedEventMessage || "(empty event list)" }}
            </div>
            <div v-else>
              <div
                class="d-flex px-3 py-1 font-weight-bold"
                style="
                  border-bottom: 1px solid rgba(255, 255, 255, 0.18);
                  position: sticky;
                  top: 0;
                  z-index: 1;
                "
              >
                <div style="width: 60px">Index</div>
                <div style="width: 70px">Code</div>
                <div class="flex-grow-1">Command / Params</div>
              </div>
              <div
                v-for="row in inspectedEventRows"
                :key="row.index"
                :ref="(el) => setEventRowRef(row.index, el as Element | null)"
                class="d-flex px-3 py-1"
                :style="{
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                  backgroundColor:
                    row.index === inspectedEventCurrentIndex
                      ? 'rgba(33, 150, 243, 0.16)'
                      : 'transparent',
                }"
              >
                <div style="width: 60px" class="text-grey-lighten-1">
                  {{ row.index }}
                </div>
                <div style="width: 70px" class="text-blue-lighten-2">
                  {{ row.codeText }}
                </div>
                <div
                  class="flex-grow-1"
                  :style="{ paddingLeft: row.indentPx + 'px' }"
                >
                  <div
                    :class="
                      row.is4xx ? 'text-grey-lighten-1' : 'font-weight-bold'
                    "
                  >
                    {{ row.commandName }}
                  </div>
                  <div
                    v-if="row.detail"
                    class="text-caption text-grey-lighten-2"
                    style="
                      margin-top: 2px;
                      white-space: pre-wrap;
                      word-break: break-word;
                    "
                  >
                    {{ row.detail }}
                  </div>
                </div>
              </div>
            </div>
          </v-sheet>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showDebugReplDialog" max-width="1200" persistent>
      <v-card
        ref="debugReplCard"
        theme="dark"
        @keydown.stop
        @keyup.stop
        @keypress.stop
      >
        <v-card-title class="d-flex align-center">
          <v-btn
            size="small"
            icon="mdi-close"
            variant="text"
            @click="closeDebugRepl"
          />
          <v-card-actions>
            <v-btn size="small" color="primary" @click="runRepl"
              >执行 (⌘/Ctrl+Enter)</v-btn
            >
            <v-btn size="small" variant="text" @click="clearReplOutput"
              >清空输出</v-btn
            >
          </v-card-actions>
          <v-spacer />
          <span class="text-h6">调试 REPL</span>
        </v-card-title>
        <v-card-text>
          <v-textarea
            v-model="replInput"
            label="输入"
            variant="outlined"
            auto-grow
            rows="10"
            hide-details
            style="font-family: monospace; font-size: 12px"
            @keydown.ctrl.enter.stop.prevent="runRepl"
            @keydown.meta.enter.stop.prevent="runRepl"
            @keydown.stop
            @keyup.stop
            @keypress.stop
          />

          <div class="mt-3 mb-1 text-caption">输出</div>
          <v-textarea
            :model-value="replOutputText"
            variant="outlined"
            auto-grow
            rows="23"
            readonly
            hide-details
            style="font-family: monospace; font-size: 12px"
            @keydown.stop
            @keyup.stop
            @keypress.stop
          />
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-tooltip location="bottom">
      <template #activator="{ props: tipProps }">
        <v-btn
          v-bind="tipProps"
          style="position: absolute; top: 0; right: 0"
          color="pink"
          size="small"
          icon="mdi-refresh"
          @click="initializeVariables"
        />
      </template>
      <span>重新加载游戏数据</span>
    </v-tooltip>

    <v-card-text class="pt-2 pb-2 text-caption text-grey-lighten-1 text-center">
      <a
        :href="versionUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="text-grey-lighten-1"
        style="text-decoration: none"
        @click="openVersionLink"
      >
        {{ versionLabel }}
      </a>
    </v-card-text>
  </v-card>
</template>
