<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { KeyValueStorage } from "@/js/KeyValueStorage";

interface LockRecord {
  lockValue: any;
  lockEnabled: boolean;
}

interface TableItem extends LockRecord {
  id: number;
  name: string;

  value: any;
}

const lockStorage = new KeyValueStorage(
  "./www/cheat-settings/variable-locks.json",
);
const lockUpdateIntervalMs = 2500;
let lockUpdateTimer: ReturnType<typeof setInterval> | null = null;

const search = ref("");
const excludeNameless = ref(true);
const variableNames = ref<string[]>([]);
const tableItems = ref<TableItem[]>([]);
const persistedLockMap = ref<Record<string, LockRecord>>({});

const tableHeaders = [
  { title: "变量名", key: "name" },
  { title: "值", key: "value" },
  { title: "锁定", key: "lock", sortable: false, width: 72 },
];

const filteredTableItems = computed(() =>
  tableItems.value.filter((item) => {
    if (excludeNameless.value && !item.name) return false;
    return true;
  }),
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
        lockValue: item.lockValue,
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
      lockValue: lockItem.lockValue,
    });
  });
  return map;
}

async function getVariableNames(): Promise<string[]> {
  return $dataSystem.variables.slice();
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
    payload[item.id] = { lockEnabled: true, lockValue: item.lockValue };
  });
  persistedLockMap.value = payload;
  lockStorage.setItem("data", JSON.stringify(payload));
}

async function initializeVariables() {
  const previousLockMap = getLockMapById();
  variableNames.value = await getVariableNames();
  tableItems.value = variableNames.value.map((varName, idx) => {
    const savedLock = previousLockMap.get(idx);
    return {
      id: idx,
      name: varName,
      value: $gameVariables.value(idx),
      lockEnabled: savedLock ? savedLock.lockEnabled : false,
      lockValue: savedLock ? savedLock.lockValue : $gameVariables.value(idx),
    };
  });
}

function onItemChange(item: TableItem) {
  const v = $gameVariables.value(item.id);
  if (typeof v === "number") {
    $gameVariables.setValue(item.id, Number(item.value));
  } else {
    $gameVariables.setValue(item.id, item.value);
  }
  item.value = $gameVariables.value(item.id);
  if (item.lockEnabled) {
    item.lockValue = item.value;
    writePersistedLocks();
  }
}

function applyVariableLock(item: TableItem) {
  if (!item || !item.lockEnabled) return;
  const currentValue = $gameVariables.value(item.id);
  const lockValue = item.lockValue;
  if (currentValue !== lockValue) {
    $gameVariables.setValue(item.id, lockValue);
  }
  item.value = $gameVariables.value(item.id);
}

function applyAllVariableLocks() {
  tableItems.value.forEach((item) => {
    if (item.id > 0 && item.lockEnabled) applyVariableLock(item);
  });
}

function toggleItemLock(item: TableItem) {
  item.lockEnabled = !item.lockEnabled;
  if (item.lockEnabled) {
    item.lockValue = $gameVariables.value(item.id);
    applyVariableLock(item);
  }
  writePersistedLocks();
}

function toggleAllFilteredLocks() {
  const target = !allFilteredLocked.value;
  filteredTableItems.value.forEach((item) => {
    if (item.id <= 0) return;
    item.lockEnabled = target;
    if (target) {
      item.lockValue = $gameVariables.value(item.id);
      applyVariableLock(item);
    }
  });
  writePersistedLocks();
}

function tableItemFilter(_value: any, query: string, item: any): boolean {
  if (query == null || query.trim() === "") return true;
  const q = query.toLowerCase();
  const t = item.raw ?? item; // v-data-table v4 wraps rows
  const name = String(t.name || "").toLowerCase();
  const value = String(t.value).toLowerCase();
  return name.includes(q) || value.includes(q);
}

function startLockUpdater() {
  if (lockUpdateTimer) return;
  lockUpdateTimer = setInterval(applyAllVariableLocks, lockUpdateIntervalMs);
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
        <div class="d-flex align-center px-3 pt-3 pb-3">
          <v-checkbox
            v-model="excludeNameless"
            density="compact"
            hide-details
            label="隐藏无名变量"
          />
          <v-spacer />
          <v-tooltip location="bottom">
            <template #activator="{ props }">
              <v-btn
                v-bind="props"
                color="amber"
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
        <v-text-field
          v-model="item.value"
          bg-color="grey-darken-3"
          style="width: 110px"
          hide-details
          variant="solo"
          density="compact"
          @keydown.self.stop
          @change="onItemChange(item)"
          @focus="($event.target as HTMLInputElement).select()"
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
      <template #activator="{ props }">
        <v-btn
          v-bind="props"
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
