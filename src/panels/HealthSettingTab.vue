<script setup lang="ts">
import { Game_Actor, Game_Enemy } from "rmmz-types";
import { markRaw, ref, toRaw, watch } from "vue";

// Battlers come in as Game_Actor or Game_Enemy; rmmz-types' Game_Battler
// uses this-narrowing predicates that block straight assignment. Loose
// typing — we only call .name() / .hp / .mhp / .mp / .mmp / .setHp/setMp.
type Battler = Game_Actor | Game_Enemy;

interface HealthRow {
  _member: Battler;
  name: string;
  hp: { hp: number; mhp: number };
  mp: { mp: number; mmp: number };
}

const props = withDefaults(defineProps<{ items?: Battler[] }>(), {
  items: () => [],
});

const emit = defineEmits<{ change: [items: HealthRow[]] }>();

const tableHeaders = [
  { title: "名字", key: "name" },
  { title: "HP", key: "hp" },
  { title: "MP", key: "mp" },
];

const editingItems = ref<HealthRow[]>([]);

watch(
  () => props.items,
  () => {
    editingItems.value = props.items.map((member) => {
      // toRaw + markRaw to preserve identity for RMMZ internals that
      // compare battlers against the live $gameParty/$gameTroop arrays.
      const raw = markRaw(toRaw(member));
      return {
        _member: raw,
        name: raw.name(),
        hp: { hp: raw.hp, mhp: raw.mhp },
        mp: { mp: raw.mp, mmp: raw.mmp },
      };
    });
  },
  { immediate: true },
);

function onDataChange() {
  emit("change", editingItems.value);
}
</script>

<template>
  <div>
    <v-data-table
      v-if="tableHeaders"
      density="compact"
      hide-default-footer
      :headers="tableHeaders"
      :items="editingItems"
    >
      <template #item.name="{ item }">
        <span class="text-caption">{{ item.name }}</span>
      </template>
      <template #item.hp="{ item }">
        <div class="d-flex align-center" style="gap: 6px">
          <v-text-field
            v-model="item.hp.hp"
            bg-color="grey-darken-3"
            style="width: 84px"
            hide-details
            variant="solo"
            density="compact"
            @keydown.self.stop
            @change="onDataChange"
            @focus="($event.target as HTMLInputElement).select()"
          />
          <span class="text-caption">/ {{ item.hp.mhp }}</span>
        </div>
      </template>
      <template #item.mp="{ item }">
        <div class="d-flex align-center" style="gap: 6px">
          <v-text-field
            v-model="item.mp.mp"
            bg-color="grey-darken-3"
            style="width: 84px"
            hide-details
            variant="solo"
            density="compact"
            @keydown.self.stop
            @change="onDataChange"
            @focus="($event.target as HTMLInputElement).select()"
          />
          <span class="text-caption">/ {{ item.mp.mmp }}</span>
        </div>
      </template>
    </v-data-table>
  </div>
</template>
