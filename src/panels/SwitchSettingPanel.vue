<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { KeyValueStorage } from "@/js/KeyValueStorage";
import { ConfirmDialog } from "@/js/DialogHelper";

interface LockRecord {
  lockValue: boolean;
  lockEnabled: boolean;
}

interface TableItem extends LockRecord {
  id: number;
  name: string;
  value: boolean;
}

const lockStorage = new KeyValueStorage(
  "./www/cheat-settings/switch-locks.json",
);
const lockUpdateIntervalMs = 2500;
let lockUpdateTimer: ReturnType<typeof setInterval> | null = null;

const search = ref("");
const excludeNameless = ref(true);
const switchNames = ref<string[]>([]);
const tableItems = ref<TableItem[]>([]);
const persistedLockMap = ref<Record<string, LockRecord>>({});

const tableHeaders = [
  { title: "开关名", key: "name" },
  { title: "值", key: "value" },
  { title: "锁定", key: "lock", sortable: false, width: 72 },
];

const filteredTableItems = computed(() =>
  tableItems.value.filter((item) => {
    if (item.id === 0) return false;
    if (excludeNameless.value && !item.name) return false;
    return true;
  }),
);

const allSwitchOn = computed(() => {
  const hasOff = filteredTableItems.value.find((i) => i.value === false);
  return !hasOff;
});

const allSwitchIcon = computed(() =>
  allSwitchOn.value ? "mdi-toggle-switch-off" : "mdi-toggle-switch",
);

const allFilteredLocked = computed(() => {
  const lockable = filteredTableItems.value.filter((i) => i.id > 0);
  if (lockable.length === 0) return false;
  return lockable.every((i) => !!i.lockEnabled);
});

function getLockMapById(): Map<number, LockRecord> {
  const map = new Map<number, LockRecord>();
  if (tableItems.value.length > 0) {
    tableItems.value.forEach((item) => {
      map.set(item.id, {
        lockEnabled: !!item.lockEnabled,
        lockValue: !!item.lockValue,
      });
    });
    return map;
  }
  Object.keys(persistedLockMap.value || {}).forEach((idText) => {
    const id = Number(idText);
    if (!Number.isInteger(id)) return;
    const lockItem = persistedLockMap.value[idText] || ({} as LockRecord);
    map.set(id, {
      lockEnabled: !!lockItem.lockEnabled,
      lockValue: !!lockItem.lockValue,
    });
  });
  return map;
}

async function getSwitchNames(): Promise<string[]> {
  return $dataSystem.switches.slice();
}

function readPersistedLocks() {
  try {
    const raw = lockStorage.getItem("data");
    if (!raw) {
      persistedLockMap.value = {};
      return;
    }
    const data = JSON.parse(raw);
    persistedLockMap.value =
      data && typeof data === "object"
        ? (data as Record<string, LockRecord>)
        : {};
  } catch {
    persistedLockMap.value = {};
  }
}

function writePersistedLocks() {
  const payload: Record<string, LockRecord> = {};
  tableItems.value.forEach((item) => {
    if (!item.lockEnabled || item.id <= 0) return;
    payload[item.id] = { lockEnabled: true, lockValue: !!item.lockValue };
  });
  persistedLockMap.value = payload;
  lockStorage.setItem("data", JSON.stringify(payload));
}

async function initializeVariables() {
  const previousLockMap = getLockMapById();
  switchNames.value = await getSwitchNames();
  tableItems.value = switchNames.value.map((switchName, idx) => {
    const savedLock = previousLockMap.get(idx);
    return {
      id: idx,
      name: switchName,
      value: $gameSwitches.value(idx),
      lockEnabled: savedLock ? savedLock.lockEnabled : false,
      lockValue:
        savedLock && typeof savedLock.lockValue === "boolean"
          ? savedLock.lockValue
          : $gameSwitches.value(idx),
    };
  });
}

function onItemChange(item: TableItem) {
  $gameSwitches.setValue(item.id, item.value);
  item.value = $gameSwitches.value(item.id);
  if (item.lockEnabled) {
    item.lockValue = item.value;
    writePersistedLocks();
  }
}

function applySwitchLock(item: TableItem) {
  if (!item || !item.lockEnabled) return;
  const currentValue = !!$gameSwitches.value(item.id);
  const lockValue = !!item.lockValue;
  if (currentValue !== lockValue) $gameSwitches.setValue(item.id, lockValue);
  item.value = !!$gameSwitches.value(item.id);
}

function applyAllSwitchLocks() {
  tableItems.value.forEach((item) => {
    if (item.id > 0 && item.lockEnabled) applySwitchLock(item);
  });
}

function toggleItemLock(item: TableItem) {
  item.lockEnabled = !item.lockEnabled;
  if (item.lockEnabled) {
    item.lockValue = !!$gameSwitches.value(item.id);
    applySwitchLock(item);
  }
  writePersistedLocks();
}

function toggleAllFilteredLocks() {
  const target = !allFilteredLocked.value;
  filteredTableItems.value.forEach((item) => {
    if (item.id <= 0) return;
    item.lockEnabled = target;
    if (target) {
      item.lockValue = !!$gameSwitches.value(item.id);
      applySwitchLock(item);
    }
  });
  writePersistedLocks();
}

function tableItemFilter(_value: any, query: string, itemWrap: any): boolean {
  if (query == null || query.trim() === "") return true;
  const t = itemWrap.raw ?? itemWrap;
  return String(t.name || "")
    .toLowerCase()
    .includes(query.toLowerCase());
}

function toggleAllSwitches() {
  ConfirmDialog.show({
    width: 450,
    message:
      (allSwitchOn.value
        ? "Turn off all filtered switches?"
        : "Turn on all filtered switches?") +
      "\n(CAUTION: Potential to give fatal errors to save data)",
    actions: [
      {
        icon: "mdi-close",
        label: "cancel",
        color: "white",
        action: ConfirmDialog.close,
      },
      {
        icon: allSwitchIcon.value,
        color: "green",
        label: allSwitchOn.value ? "Turn Off" : "Turn On",
        async action() {
          const value = !allSwitchOn.value;
          filteredTableItems.value.forEach((item) => {
            $gameSwitches.setValue(item.id, value);
            item.value = value;
            if (item.lockEnabled) item.lockValue = value;
          });
          writePersistedLocks();
          await initializeVariables();
          ConfirmDialog.close();
        },
      },
    ],
  });
}

function startLockUpdater() {
  if (lockUpdateTimer) return;
  lockUpdateTimer = setInterval(applyAllSwitchLocks, lockUpdateIntervalMs);
}

function stopLockUpdater() {
  if (!lockUpdateTimer) return;
  clearInterval(lockUpdateTimer);
  lockUpdateTimer = null;
}

onMounted(() => {
  readPersistedLocks();
  initializeVariables();
  startLockUpdater();
});

onBeforeUnmount(stopLockUpdater);
</script>

<template>
  <v-card flat class="ma-0 pa-0">
    <v-data-table
      v-if="tableHeaders"
      :headers="tableHeaders"
      :items="filteredTableItems"
      :search="search"
      :custom-filter="tableItemFilter"
      :items-per-page="8"
      density="compact"
    >
      <template #top>
        <v-text-field
          v-model="search"
          label="搜索..."
          variant="solo"
          bg-color="grey-darken-3"
          density="compact"
          hide-details
          @keydown.self.stop
          @focus="($event.target as HTMLInputElement).select()"
        />
        <div class="d-flex px-3 pt-3 pb-3">
          <v-checkbox
            v-model="excludeNameless"
            density="compact"
            hide-details
            label="隐藏无名开关"
          />
          <v-spacer />
          <v-tooltip location="bottom">
            <template #activator="{ props: tipProps }">
              <v-btn
                v-bind="tipProps"
                color="teal"
                size="x-small"
                icon
                @click="toggleAllSwitches"
              >
                <v-icon>{{ allSwitchIcon }}</v-icon>
              </v-btn>
            </template>
            <span>{{
              allSwitchOn ? "关闭所有过滤的开关" : "打开所有过滤的开关"
            }}</span>
          </v-tooltip>
          <v-tooltip location="bottom">
            <template #activator="{ props: tipProps }">
              <v-btn
                v-bind="tipProps"
                color="amber"
                class="ml-2"
                size="x-small"
                icon
                @click="toggleAllFilteredLocks"
              >
                <v-icon>{{
                  allFilteredLocked ? "mdi-lock-open-variant" : "mdi-lock"
                }}</v-icon>
              </v-btn>
            </template>
            <span>{{
              allFilteredLocked ? "解锁所有过滤项" : "锁定所有过滤项"
            }}</span>
          </v-tooltip>
        </div>
      </template>
      <template #item.value="{ item }">
        <v-switch
          v-model="item.value"
          density="compact"
          hide-details
          @click.self.stop
          @change="onItemChange(item)"
        />
      </template>
      <template #item.lock="{ item }">
        <v-btn
          size="x-small"
          icon
          variant="text"
          :color="item.lockEnabled ? 'amber' : 'grey-lighten-1'"
          @click.stop="toggleItemLock(item)"
        >
          <v-icon>{{
            item.lockEnabled ? "mdi-lock" : "mdi-lock-open-variant"
          }}</v-icon>
        </v-btn>
      </template>
    </v-data-table>

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
  </v-card>
</template>
