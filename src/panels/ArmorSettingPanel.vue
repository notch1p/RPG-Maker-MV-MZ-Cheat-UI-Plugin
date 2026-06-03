<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { DataArmor } from "rmmz-types";
import ItemTableTab from "@/panels/ItemTableTab.vue";

const items = ref<(DataArmor | null)[]>([]);

const headers = [
  { title: "名称", key: "name" },
  { title: "描述", key: "desc" },
];

function initializeVariables() {
  items.value = $dataArmors;
}

function convertToTableData(item: DataArmor) {
  return { name: item.name, desc: item.description };
}

onMounted(initializeVariables);
</script>

<template>
  <v-card flat class="ma-0 pa-0">
    <ItemTableTab
      :items="items"
      :headers="headers"
      :as-table-data="convertToTableData"
      :searchable-attrs="['name', 'desc']"
    />
  </v-card>
</template>
