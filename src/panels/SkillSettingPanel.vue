<script setup lang="ts">
import { markRaw, onMounted, ref, toRaw } from "vue";
import type { DataSkill, Game_Actor } from "rmmz-types";
import { filterMap } from "@/js/Tools";

interface SkillRow {
  id: number;
  name: string;
  description: string;
  iconIndex: number;
}

type SkillId = Parameters<Game_Actor["learnSkill"]>[0];
interface ActorRow {
  _actor: Game_Actor;
  id: number;
  name: string;
  // Per-actor filter state lives on the row so it survives tab switches.
  onlyLearned: boolean;
  skillSearch: string;
  learnedSkillIds: SkillId[];
}

const selectedTab = ref<number | null>(null);
const actors = ref<ActorRow[]>([]);
const allSkills = ref<SkillRow[]>([]);

const skillHeaders = [
  {
    title: "已学",
    key: "isLearned",
    sortable: false,
    align: "center" as const,
    width: 60,
  },
  { title: "名称", key: "name" },
  { title: "描述", key: "description", sortable: false },
  {
    title: "操作",
    key: "actions",
    sortable: false,
    align: "center" as const,
    width: 110,
  },
];

function extractSkill(skill: DataSkill): SkillRow {
  return {
    id: skill.id,
    name: skill.name,
    description: skill.description,
    iconIndex: skill.iconIndex,
  };
}

function extractActor(actor: Game_Actor): ActorRow {
  const raw = markRaw(toRaw(actor));
  return {
    _actor: raw,
    id: raw._actorId,
    name: raw._name,
    onlyLearned: false,
    skillSearch: "",
    learnedSkillIds: raw.skills().map((s) => s.id),
  };
}

function initializeVariables() {
  allSkills.value = filterMap($dataSkills, (s) =>
    s && s.name ? extractSkill(s) : undefined,
  );
  actors.value = $gameParty.members().map(extractActor);
}

// Called per render per actor — small N (a few party members × ~100 skills),
// fine to recompute. Returns rows enriched with the per-actor `isLearned`.
function getFilteredSkills(
  actor: ActorRow,
): (SkillRow & { isLearned: boolean })[] {
  const q = actor.skillSearch.trim().toLowerCase();
  const learned = new Set(actor.learnedSkillIds);
  return filterMap(allSkills.value, (s) => {
    const isLearned = learned.has(s.id);
    if (actor.onlyLearned && !isLearned) return undefined;
    if (q) {
      const hit =
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q);
      if (!hit) return undefined;
    }
    return { ...s, isLearned };
  });
}

function addSkill(actor: ActorRow, skill: SkillRow) {
  if (actor._actor.isLearnedSkill(skill.id)) return;
  actor._actor.learnSkill(skill.id);
  actor.learnedSkillIds = actor._actor.skills().map((s) => s.id);
}

function removeSkill(actor: ActorRow, skill: SkillRow) {
  actor._actor.forgetSkill(skill.id);
  actor.learnedSkillIds = actor._actor.skills().map((s) => s.id);
}

onMounted(initializeVariables);
</script>

<template>
  <v-card flat class="ma-0 pa-0">
    <v-tabs v-model="selectedTab" bg-color="grey-darken-3" show-arrows>
      <v-tab v-for="(actor, idx) in actors" :key="actor.id" :value="idx">
        {{ actor.name }}
      </v-tab>
    </v-tabs>
    <v-window v-model="selectedTab">
      <v-window-item
        v-for="(actor, idx) in actors"
        :key="actor.id"
        :value="idx"
      >
        <v-card flat class="ma-0">
          <v-card-actions class="pa-0">
            <v-checkbox
              v-model="actor.onlyLearned"
              density="compact"
              hide-details
              label="只显示已学习技能"
            />
            <v-spacer />
            <v-tooltip location="bottom">
              <template #activator="{ props: tipProps }">
                <v-btn
                  v-bind="tipProps"
                  color="pink"
                  size="small"
                  icon="mdi-refresh"
                  @click="initializeVariables"
                />
              </template>
              <span>重新加载游戏数据</span>
            </v-tooltip>
          </v-card-actions>

          <v-text-field
            v-model="actor.skillSearch"
            label="搜索技能..."
            variant="solo"
            bg-color="grey-darken-3"
            density="compact"
            hide-details
            @keydown.stop
            @focus="($event.target as HTMLInputElement).select()"
          />

          <v-data-table
            class="mt-2"
            density="compact"
            :headers="skillHeaders"
            :items="getFilteredSkills(actor)"
            :items-per-page="8"
            no-data-text="没有匹配的技能"
          >
            <template #item.isLearned="{ item }">
              <v-icon
                size="small"
                :color="item.isLearned ? 'green' : 'grey-darken-2'"
              >
                {{ item.isLearned ? "mdi-check-circle" : "mdi-circle-outline" }}
              </v-icon>
            </template>
            <template #item.actions="{ item }">
              <v-btn
                v-if="item.isLearned"
                size="x-small"
                color="error"
                class="ma-0"
                prepend-icon="mdi-close"
                @click="removeSkill(actor, item)"
              >
                移除
              </v-btn>
              <v-btn
                v-else
                size="x-small"
                color="success"
                class="ma-0"
                prepend-icon="mdi-plus"
                @click="addSkill(actor, item)"
              >
                添加
              </v-btn>
            </template>
          </v-data-table>
        </v-card>
      </v-window-item>
    </v-window>
  </v-card>
</template>
