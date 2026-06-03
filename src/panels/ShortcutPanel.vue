<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { GLOBAL_SHORTCUT } from "@/js/GlobalShortcut";
import { Key } from "@/js/KeyCodes";
import { Alert } from "@/js/AlertHelper";
import KeyInputField from "@/components/KeyInputField.vue";

interface ParamEntry {
  id: string;

  value: any;
}

interface ShortcutRow {
  id: string;
  name: string;
  desc: string;
  necessary: boolean;
  combiningKeyAlone: boolean;

  paramDesc: Record<string, any>;
  shortcut: Key;
  param: Record<string, ParamEntry>;
}

const shortcuts = ref<ShortcutRow[]>([]);
const tableExpanded = ref<string[]>([]);
const hideDesc = ref(true);
const search = ref("");
const shortcutSearch = ref<Key>(Key.createEmpty());

const tableHeaders = [
  { title: "名称", key: "name" },
  { title: "描述", key: "desc" },
  { title: "快捷键", key: "shortcut" },
  { title: "参数", key: "param" },
];

const filteredHeaders = computed(() =>
  tableHeaders.filter((header) => !hideDesc.value || header.key !== "desc"),
);

const filteredShortcuts = computed(() =>
  shortcuts.value.filter(
    (item) =>
      shortcutSearch.value.isEmpty() ||
      item.shortcut.contains(shortcutSearch.value),
  ),
);

function convertToInternalData(settings: any, config: any): ShortcutRow {
  const param: Record<string, ParamEntry> = {};
  if (settings.param) {
    for (const paramName of Object.keys(settings.param)) {
      param[paramName] = { id: paramName, value: settings.param[paramName] };
    }
  }
  return {
    id: config.id,
    name: config.name,
    desc: config.desc,
    necessary: config.necessary,
    combiningKeyAlone: config.combiningKeyAlone,
    paramDesc: config.param,
    shortcut: Key.fromKey(settings.shortcut),
    param,
  };
}

function initializeVariables() {
  shortcuts.value = Object.keys(GLOBAL_SHORTCUT.shortcutConfig).map((key) =>
    convertToInternalData(
      GLOBAL_SHORTCUT.shortcutSettings[key],
      GLOBAL_SHORTCUT.shortcutConfig[key],
    ),
  );
}

function restoreToDefault() {
  GLOBAL_SHORTCUT.restoreDefaultSettings();
  initializeVariables();
}

function onSearchChange() {
  shortcutSearch.value = Key.createEmpty();
}

function onShortcutSearchChange() {
  search.value = "";
}

function changeExpanded(item: ShortcutRow) {
  if (tableExpanded.value.length === 1 && tableExpanded.value[0] === item.id) {
    tableExpanded.value = [];
  } else {
    tableExpanded.value = [item.id];
  }
}

function onShortcutChange(key: Key, item: ShortcutRow) {
  try {
    GLOBAL_SHORTCUT.setShortcut(item.id, key);
  } catch (err) {
    Alert.error((err as Error).message);
  }
  item.shortcut = GLOBAL_SHORTCUT.getShortcut(item.id);
}

function onParameterChange(value: unknown, item: ShortcutRow, paramId: string) {
  try {
    GLOBAL_SHORTCUT.setParam(item.id, paramId, value);
  } catch (err) {
    Alert.error((err as Error).message);
  }
  item.param[paramId].value = GLOBAL_SHORTCUT.getParam(item.id, paramId);
}

function tableItemFilter(_value: any, query: string, itemWrap: any): boolean {
  if (query == null || query.trim() === "") return true;
  const q = query.toLowerCase();
  const t = itemWrap.raw ?? itemWrap;
  return (
    String(t.name).toLowerCase().includes(q) ||
    String(t.desc).toLowerCase().includes(q) ||
    (t.shortcut as Key).asDisplayString().toLowerCase().includes(q)
  );
}

onMounted(initializeVariables);
</script>

<template>
  <v-card flat class="ma-0 pa-0">
    <v-row>
      <v-col cols="12" md="8">
        <v-text-field
          v-model="search"
          label="搜索..."
          variant="solo"
          bg-color="grey-darken-3"
          density="compact"
          hide-details
          @keydown.self.stop
          @update:model-value="onSearchChange"
          @focus="($event.target as HTMLInputElement).select()"
        />
      </v-col>
      <v-col cols="12" md="4">
        <KeyInputField
          v-model="shortcutSearch"
          label="快捷键"
          solo
          bg-color="grey-darken-3"
          combining-key-alone
          @update:model-value="onShortcutSearchChange"
        />
      </v-col>
    </v-row>
    <v-card-text class="pa-0 d-flex justify-space-between align-center">
      <v-checkbox v-model="hideDesc" class="d-inline-flex" label="隐藏描述" />
      <v-tooltip location="bottom">
        <template #activator="{ props: tipProps }">
          <v-btn
            v-bind="tipProps"
            color="green"
            size="x-small"
            icon="mdi-restore"
            @click="restoreToDefault"
          />
        </template>
        <span>恢复默认设置</span>
      </v-tooltip>
    </v-card-text>
    <v-data-table
      v-model:expanded="tableExpanded"
      class="mt-2"
      :headers="filteredHeaders"
      :items="filteredShortcuts"
      :search="search"
      :custom-filter="tableItemFilter"
      :items-per-page="8"
      item-value="id"
      show-expand
      density="compact"
    >
      <template #item.shortcut="{ item }">
        <KeyInputField
          v-model="item.shortcut"
          style="width: 170px"
          :deletable="!item.necessary"
          solo
          bg-color="grey-darken-3"
          :combining-key-alone="item.combiningKeyAlone"
          @update:model-value="onShortcutChange($event, item)"
        />
      </template>
      <template #item.param="{ item }">
        <v-btn
          v-if="Object.keys(item.paramDesc).length > 0"
          color="blue-grey"
          size="x-small"
          icon="mdi-cog"
          @click="changeExpanded(item)"
        />
      </template>
      <template #expanded-row="{ columns, item }">
        <tr>
          <td :colspan="columns.length" class="ma-0 pa-0">
            <v-card
              v-if="Object.keys(item.paramDesc).length > 0"
              flat
              class="ma-0 py-2 px-0"
            >
              <v-card-subtitle class="py-0 mb-1">参数</v-card-subtitle>
              <v-card-text
                v-for="paramKey in Object.keys(item.paramDesc)"
                :key="paramKey"
                class="py-0 my-0 mb-1"
              >
                <v-row class="ma-0 pa-0">
                  <v-col class="pa-0" cols="12" md="3">
                    <v-text-field
                      v-model="item.param[paramKey].value"
                      variant="outlined"
                      density="compact"
                      hide-details
                      :label="item.paramDesc[paramKey].name"
                      @keydown.stop
                      @change="
                        onParameterChange(
                          item.param[paramKey].value,
                          item,
                          paramKey,
                        )
                      "
                      @focus="($event.target as HTMLInputElement).select()"
                    />
                  </v-col>
                  <v-col
                    class="pa-0 d-inline-flex align-center"
                    cols="12"
                    md="9"
                  >
                    <span class="ml-3"
                      >: {{ item.paramDesc[paramKey].desc }}</span
                    >
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>
          </td>
        </tr>
      </template>
    </v-data-table>
  </v-card>
</template>
