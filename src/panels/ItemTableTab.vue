<script setup lang="ts">
import { DataArmor, DataItem, DataWeapon } from "rmmz-types";
import { computed, markRaw, ref, toRaw, watch } from "vue";

interface TableHeader {
  title: string;
  key: string;
  width?: number;
  sortable?: boolean;
}

interface TableRow {
  gameItem: DataItem | DataArmor | DataWeapon;
  name: string;
  desc: string;
  amount: number;

  [k: string]: any;
}

const props = withDefaults(
  defineProps<{
    items?: (DataItem | DataArmor | DataWeapon | null)[];
    headers: TableHeader[];
    asTableData: (item: any) => Omit<TableRow, "gameItem" | "amount">;
    searchableAttrs?: string[];
  }>(),
  {
    items: () => [],
    searchableAttrs: () => [],
  },
);

const search = ref("");
const excludeNameless = ref(true);
const onlyOwnedItems = ref(false);
const tableHeaders = ref<TableHeader[]>([]);
const tableItems = ref<TableRow[]>([]);

function initializeVariables() {
  tableHeaders.value = props.headers.slice(0);
  tableHeaders.value.push({ title: "数量", key: "amount" });

  tableItems.value = props.items
    .filter((item) => !!item)
    .map((item) => {
      const tableItem = props.asTableData(item) as TableRow;
      // RMMZ's DataManager.isItem/isWeapon/isArmor uses reference equality
      // against $dataItems/$dataWeapons/$dataArmors. Parent passes the
      // reactive items array, so `item` here is already a Proxy.
      // toRaw unwraps it; markRaw prevents Vue from re-wrapping when we
      // stash it into the reactive tableItems.value.
      const raw = markRaw(toRaw(item));
      tableItem.gameItem = raw;
      tableItem.amount = $gameParty.numItems(raw);
      return tableItem;
    });
}

watch(() => props.items, initializeVariables, { immediate: true });

const filteredTableItems = computed(() =>
  tableItems.value.filter((item) => {
    if (excludeNameless.value && !item.name) return false;
    if (onlyOwnedItems.value && item.amount === 0) return false;
    return true;
  }),
);

function onItemChange(item: TableRow) {
  const diff = item.amount - $gameParty.numItems(item.gameItem);
  $gameParty.gainItem(item.gameItem, diff);
  item.amount = $gameParty.numItems(item.gameItem);
}

function tableItemFilter(_value: any, query: string, itemWrap: any): boolean {
  if (query.trim() === "") return true;
  const q = query.toLowerCase();
  const t = itemWrap.raw ?? itemWrap;
  for (const attr of props.searchableAttrs) {
    if (
      String(t[attr] ?? "")
        .toLowerCase()
        .includes(q)
    )
      return true;
  }
  return false;
}
</script>

<template>
  <v-card flat class="ma-0 pa-0">
    <v-data-table
      v-if="tableHeaders.length"
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
        <v-row class="ma-0 pa-0">
          <v-col cols="12" md="6">
            <v-checkbox
              v-model="excludeNameless"
              density="compact"
              hide-details
              label="隐藏无名物品"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-checkbox
              v-model="onlyOwnedItems"
              density="compact"
              hide-details
              label="只显示拥有的物品"
            />
          </v-col>
        </v-row>
      </template>
      <template #item.amount="{ item }">
        <v-text-field
          v-model="item.amount"
          bg-color="grey-darken-3"
          style="width: 88px"
          hide-details
          variant="solo"
          density="compact"
          @keydown.self.stop
          @change="onItemChange(item)"
          @focus="($event.target as HTMLInputElement).select()"
        />
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
      <span>Reload from game data</span>
    </v-tooltip>
  </v-card>
</template>
