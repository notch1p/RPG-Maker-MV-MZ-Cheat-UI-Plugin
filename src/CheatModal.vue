<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import GeneralPanel from "@/panels/GeneralPanel.vue";
import HealthSettingPanel from "@/panels/HealthSettingPanel.vue";
import StatsSettingPanel from "@/panels/StatsSettingPanel.vue";
import ItemSettingPanel from "@/panels/ItemSettingPanel.vue";
import WeaponSettingPanel from "@/panels/WeaponSettingPanel.vue";
import ArmorSettingPanel from "@/panels/ArmorSettingPanel.vue";
import VariableSettingPanel from "@/panels/VariableSettingPanel.vue";
import SwitchSettingPanel from "@/panels/SwitchSettingPanel.vue";
import SaveRecallPanel from "@/panels/SaveRecallPanel.vue";
import TeleportPanel from "@/panels/TeleportPanel.vue";
import MapEventPanel from "@/panels/MapEventPanel.vue";
import ShortcutPanel from "@/panels/ShortcutPanel.vue";

interface NavItem {
  name: string;
  icon: string;
  component?: string;
  children?: NavItem[];
}

const props = withDefaults(defineProps<{ modelValue?: string | null }>(), {
  modelValue: null,
});

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const panelComponents: Record<string, ReturnType<typeof Object>> = {
  "general-panel": GeneralPanel,
  "health-setting-panel": HealthSettingPanel,
  "stats-setting-panel": StatsSettingPanel,
  "item-setting-panel": ItemSettingPanel,
  "weapon-setting-panel": WeaponSettingPanel,
  "armor-setting-panel": ArmorSettingPanel,
  "variable-setting-panel": VariableSettingPanel,
  "switch-setting-panel": SwitchSettingPanel,
  "save-recall-panel": SaveRecallPanel,
  "teleport-panel": TeleportPanel,
  "map-event-panel": MapEventPanel,
  "shortcut-panel": ShortcutPanel,
};

const navWidth = 170;

const navTreeItems: NavItem[] = [
  { name: "常用", icon: "mdi-hammer-screwdriver", component: "general-panel" },
  { name: "战斗", icon: "mdi-battery-70", component: "health-setting-panel" },
  {
    name: "等级/属性",
    icon: "mdi-sword-cross",
    component: "stats-setting-panel",
  },
  {
    name: "物品",
    icon: "mdi-bag-personal-outline",
    children: [
      {
        name: "道具",
        icon: "mdi-flask-empty-plus",
        component: "item-setting-panel",
      },
      { name: "武器", icon: "mdi-sword", component: "weapon-setting-panel" },
      {
        name: "防具",
        icon: "mdi-shield-plus",
        component: "armor-setting-panel",
      },
    ],
  },
  { name: "变量", icon: "mdi-variable", component: "variable-setting-panel" },
  {
    name: "开关",
    icon: "mdi-toggle-switch",
    component: "switch-setting-panel",
  },
  {
    name: "存读位置",
    icon: "mdi-map-marker-plus",
    component: "save-recall-panel",
  },
  { name: "传送", icon: "mdi-run-fast", component: "teleport-panel" },
  { name: "地图事件", icon: "mdi-map-search", component: "map-event-panel" },
  {
    name: "快捷键",
    icon: "mdi-keyboard-outline",
    component: "shortcut-panel",
  },
];

const navTreeModel = ref<string[]>([]);
const navTreeOpened = ref<string[]>([]);

// Map component identifier ("general-panel") → nav item (used for initial
// model resolution from the modelValue prop).
const componentNameToNavItem = computed(() => {
  const ret: Record<string, NavItem> = {};
  function walk(node: NavItem | NavItem[]) {
    if (Array.isArray(node)) {
      node.forEach(walk);
    } else if (node.children) {
      walk(node.children);
    } else if (node.component) {
      ret[node.component] = node;
    }
  }
  walk(navTreeItems);
  return ret;
});

// Reverse map: tree-node name → component identifier. The treeview activates
// by item-value (which is `name`), so we translate name → component before
// emitting modelValue.
const nameToComponent = computed(() => {
  const ret: Record<string, string> = {};
  for (const [component, item] of Object.entries(
    componentNameToNavItem.value,
  )) {
    ret[item.name] = component;
  }
  return ret;
});

const currentComponent = computed(() => {
  if (!props.modelValue) return null;
  return panelComponents[props.modelValue] ?? null;
});

function onNavTreeUpdate(active: string[]) {
  if (active && active.length === 1) {
    const componentName = nameToComponent.value[active[0]];
    if (componentName) emit("update:modelValue", componentName);
  }
}

onMounted(() => {
  // Default: first leaf if model is unset / unknown.
  let component = props.modelValue;
  if (!component || !componentNameToNavItem.value[component]) {
    component = Object.keys(componentNameToNavItem.value)[0];
    emit("update:modelValue", component);
  }
  const item = componentNameToNavItem.value[component];
  navTreeModel.value = item ? [item.name] : [];
  // Open all parent groups so nested items are visible.
  navTreeOpened.value = navTreeItems
    .filter((n) => n.children)
    .map((n) => n.name);
});
</script>

<template>
  <v-card
    theme="dark"
    class="z-index-cheat-0"
    width="80vw"
    height="90vh"
    style="max-width: 775px; max-height: 550px"
  >
    <div class="d-flex fill-height ma-0 pa-0">
      <div
        :style="'width: ' + navWidth + 'px; flex-shrink: 0;'"
        class="fill-height pa-2 overflow-y-auto hide-scrollbar"
      >
        <v-treeview
          v-model:activated="navTreeModel"
          v-model:opened="navTreeOpened"
          :items="navTreeItems"
          item-value="name"
          density="compact"
          activatable
          open-on-click
          @update:activated="onNavTreeUpdate"
        >
          <template #prepend="{ item }">
            <v-icon size="small" class="mx-0 px-0 align-self-center">{{
              (item as NavItem).icon
            }}</v-icon>
          </template>
          <template #title="{ item }">
            <span class="text-subtitle-2">{{ (item as NavItem).name }}</span>
          </template>
        </v-treeview>
      </div>
      <v-divider vertical />
      <div
        class="fill-height pa-2 overflow-y-auto hide-scrollbar flex-grow-1"
        style="min-width: 0"
      >
        <component :is="currentComponent" v-if="currentComponent" />
      </div>
    </div>
  </v-card>
</template>

<style scoped>
/* Tighten v-treeview spacing in the narrow nav pane.
   Vuetify 4 list-items reserve generous start padding plus an expand-chevron
   slot on every row, which on a 170px pane pushes titles past center. */
:deep(.v-list-item) {
  padding-inline-start: 6px !important;
  padding-inline-end: 4px !important;
  /* min-height: 28px; */
}
:deep(.v-list-item__prepend) {
  width: auto;
}
:deep(.v-list-item__prepend > .v-list-item__spacer) {
  width: 0 !important;
}
:deep(.v-list-item__prepend > .v-icon) {
  margin-inline-end: 6px;
}
:deep(.v-treeview-group .v-list-item) {
  padding-inline-start: 18px !important;
}
</style>
