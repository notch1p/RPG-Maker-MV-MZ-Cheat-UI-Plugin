<script setup lang="ts">
import { DataMapInfo } from "rmmz-types";
import { computed, onMounted, ref } from "vue";
import { filterMap } from "@/js/Tools";

interface MapRow {
  _mapInfo: any;
  id: number;
  fullPath: string[];
  fullPathJoin: string;
  name: string;
}

const inputX = ref("0");
const inputY = ref("0");
const search = ref("");
const excludeFullPath = ref(true);
const maps = ref<MapRow[]>([]);

const tableHeaders = [
  { title: "ID", key: "id" },
  { title: "名称", key: "name" },
  { title: "完整路径", key: "fullPath" },
  { title: "操作", key: "actions", sortable: false },
];

const filteredTableHeaders = computed(() =>
  excludeFullPath.value
    ? tableHeaders.filter((h) => h.key !== "fullPath")
    : tableHeaders,
);

function getMapAncestors(id: number, path: number[]) {
  path.push(id);
  if ($dataMapInfos[id]?.parentId === 0) {
    path.reverse();
    return;
  }
  getMapAncestors($dataMapInfos[id]!.parentId, path);
}

async function getMapNames(dataMapInfos: DataMapInfo[]): Promise<string[]> {
  return dataMapInfos.map((m) => (m ? m.name : ""));
}

async function initializeVariables() {
  const mapNames = await getMapNames($dataMapInfos);
  maps.value = filterMap($dataMapInfos, (mapInfo) => {
    if (!mapInfo) return undefined;
    const fullPathIds: number[] = [];
    getMapAncestors(mapInfo.id, fullPathIds);
    const fullPath = fullPathIds.map((id) => mapNames[id]);
    return {
      _mapInfo: mapInfo,
      id: mapInfo.id,
      fullPath,
      fullPathJoin: fullPath.join(" / "),
      name: mapNames[mapInfo.id],
    };
  });
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
    String(t.fullPathJoin).toLowerCase().includes(q) ||
    String(t.id).toLowerCase().includes(q)
  );
}

onMounted(initializeVariables);
</script>

<template>
  <v-card flat class="ma-0 pa-0">
    <v-row>
      <v-col cols="12" md="6">
        <v-text-field
          v-model="inputX"
          label="X"
          density="compact"
          bg-color="grey-darken-3"
          hide-details
          variant="solo"
          @keydown.self.stop
          @focus="($event.target as HTMLInputElement).select()"
        />
      </v-col>
      <v-col cols="12" md="6">
        <v-text-field
          v-model="inputY"
          label="Y"
          density="compact"
          bg-color="grey-darken-3"
          hide-details
          variant="solo"
          @keydown.self.stop
          @focus="($event.target as HTMLInputElement).select()"
        />
      </v-col>
    </v-row>

    <v-data-table
      v-if="tableHeaders"
      class="mt-2"
      :headers="filteredTableHeaders"
      :items="maps"
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
        <v-checkbox v-model="excludeFullPath" label="隐藏完整路径" />
      </template>
      <template #item.fullPath="{ item }">
        {{ item.fullPathJoin }}
      </template>
      <template #item.actions="{ item }">
        <v-tooltip location="bottom">
          <template #activator="{ props: tipProps }">
            <v-btn
              v-bind="tipProps"
              color="green"
              size="x-small"
              icon="mdi-map-marker"
              @click="teleportLocation(item.id, Number(inputX), Number(inputY))"
            />
          </template>
          <span>传送</span>
        </v-tooltip>
      </template>
    </v-data-table>
  </v-card>
</template>
