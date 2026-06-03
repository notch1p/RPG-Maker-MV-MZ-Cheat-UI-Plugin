<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { KEY_VALUE_STORAGE } from "@/js/KeyValueStorage";

interface SavedLocation {
  name: string;
  mapId: number;
  x: number;
  y: number;
}

interface TableRow {
  name: string;
  mapName: string;
  mapId: number;
  coord: { x: number; y: number };
}

const locationAliasInput = ref("");
const search = ref("");
const locations = ref<SavedLocation[]>([]);
const currentMapName = ref("");
const locationAliasField = ref<HTMLInputElement | null>(null);

const tableHeaders = [
  { title: "别名", key: "name" },
  { title: "地图名", key: "mapName" },
  { title: "坐标", key: "coord" },
  { title: "操作", key: "actions", sortable: false },
];

const tableItems = computed<TableRow[]>(() =>
  locations.value.map((location) => ({
    name: location.name,
    mapName: $dataMapInfos[location.mapId]
      ? $dataMapInfos[location.mapId]!.name
      : "NULL",
    mapId: location.mapId,
    coord: { x: location.x, y: location.y },
  })),
);

function getMapAncestors(id: number, path: number[]) {
  path.push(id);
  if ($dataMapInfos[id]?.parentId === 0) {
    path.reverse();
    return;
  }
  getMapAncestors($dataMapInfos[id]!.parentId, path);
}

async function getMapFullPath(id: number): Promise<string> {
  if (!id || !$dataMapInfos[id]) return "NULL";
  const fullPath: number[] = [];
  getMapAncestors(id, fullPath);
  return fullPath.map((mid) => $dataMapInfos[mid]!.name).join(" / ");
}

function loadLocations() {
  const data = KEY_VALUE_STORAGE.getItem("cheat.locations");
  if (!data) {
    locations.value = [];
    return;
  }
  locations.value = JSON.parse(data);
}

function saveLocations() {
  KEY_VALUE_STORAGE.setItem("cheat.locations", JSON.stringify(locations.value));
}

async function initializeVariables() {
  loadLocations();
  currentMapName.value = await getMapFullPath($gameMap.mapId());
}

function addLocation(locationAlias: string) {
  locations.value.push({
    name: locationAlias,
    mapId: $gameMap.mapId(),
    x: $gamePlayer.x,
    y: $gamePlayer.y,
  });
  saveLocations();
}

function onAddLocation() {
  addLocation(locationAliasInput.value);
  locationAliasInput.value = "";
  locationAliasField.value?.blur();
}

function onLocationAliasKeyDown(e: KeyboardEvent) {
  if (e.code === "Enter") onAddLocation();
}

function removeLocation(index: number) {
  locations.value.splice(index, 1);
  saveLocations();
}

function teleportLocation(mapId: number, x: number, y: number) {
  $gamePlayer.reserveTransfer(mapId, x, y, $gamePlayer.direction(), 0);
  $gamePlayer.setPosition(x, y);
}

function tableItemFilter(_value: any, query: string, itemWrap: any): boolean {
  if (query == null || query.trim() === "") return true;
  const q = query.toLowerCase();
  const t = itemWrap.raw ?? itemWrap;
  return (
    String(t.name).toLowerCase().includes(q) ||
    String(t.mapName).toLowerCase().includes(q)
  );
}

onMounted(async () => {
  await initializeVariables();
  locationAliasField.value?.focus();
});
</script>

<template>
  <v-card flat class="ma-0 pa-0">
    <v-card-subtitle class="ma-0 pa-0">保存当前位置</v-card-subtitle>
    <span class="text-body-2 text-green-darken-1"
      >地图 : {{ currentMapName }}</span
    >
    <v-text-field
      ref="locationAliasField"
      v-model="locationAliasInput"
      label="位置别名"
      variant="solo"
      bg-color="grey-darken-3"
      density="compact"
      hide-details
      @keydown.self.stop="onLocationAliasKeyDown"
      @focus="($event.target as HTMLInputElement).select()"
    >
      <template #append>
        <v-tooltip location="bottom">
          <template #activator="{ props: tipProps }">
            <v-btn
              v-bind="tipProps"
              class="mt-n1"
              color="teal"
              size="x-small"
              icon="mdi-plus"
              @click="onAddLocation"
            />
          </template>
          <span>保存当前位置</span>
        </v-tooltip>
      </template>
    </v-text-field>

    <v-card-subtitle class="ma-0 pa-0 mt-5">搜索保存的位置</v-card-subtitle>
    <v-data-table
      v-if="tableHeaders"
      class="mt-2"
      :headers="tableHeaders"
      :items="tableItems"
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
      </template>
      <template #item.coord="{ item }">
        {{ item.coord.x }}, {{ item.coord.y }}
      </template>
      <template #item.actions="{ item, index }">
        <v-tooltip location="bottom">
          <template #activator="{ props: tipProps }">
            <v-btn
              v-bind="tipProps"
              color="green"
              size="x-small"
              icon="mdi-map-marker"
              @click="teleportLocation(item.mapId, item.coord.x, item.coord.y)"
            />
          </template>
          <span>传送</span>
        </v-tooltip>
        <v-tooltip location="bottom">
          <template #activator="{ props: tipProps }">
            <v-btn
              v-bind="tipProps"
              color="red"
              class="ml-2"
              size="x-small"
              icon="mdi-delete"
              @click="removeLocation(index)"
            />
          </template>
          <span>删除</span>
        </v-tooltip>
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
