<script setup lang="ts">
import { markRaw, onMounted, ref, toRaw } from "vue";
import type { Game_Actor } from "rmmz-types";
import { GeneralCheat } from "@/js/CheatHelper";

interface ActorRow {
  _actor: Game_Actor;
  id: number;
  name: string;
  godMode: boolean;
  level: number;
  exp: number;
  param: number[];
}

const selectedTab = ref<number | null>(null);
const paramNames = ref<string[]>([]);
const actors = ref<ActorRow[]>([]);

function extractActorData(actor: Game_Actor): ActorRow {
  // toRaw + markRaw to preserve identity for RMMZ APIs (e.g.
  // GeneralCheat.isGodMode / toggleGodMode keyed by actor reference).
  const raw = markRaw(toRaw(actor));

  const a = raw as any;
  const paramSize = a._paramPlus.length;
  const param: number[] = new Array(paramSize);
  for (let paramId = 0; paramId < paramSize; ++paramId) {
    // ParamID is a branded number in rmmz-types; runtime call is just `param(n)`.
    param[paramId] = raw.param(
      paramId as unknown as Parameters<Game_Actor["param"]>[0],
    );
  }
  return {
    _actor: raw,
    id: a._actorId,
    name: a._name,
    godMode: GeneralCheat.isGodMode(raw),
    level: raw.level,
    exp: raw.currentExp(),
    param,
  };
}

function initializeVariables() {
  paramNames.value = $dataSystem.terms.params;
  actors.value = $gameParty.members().map((actor) => extractActorData(actor));
}

function onLevelChange(item: ActorRow) {
  item._actor.changeLevel(Number(item.level), false);
  initializeVariables();
}
function onExpChange(item: ActorRow) {
  item._actor.changeExp(Number(item.exp), false);
  initializeVariables();
}
function onParamChange(item: ActorRow, paramIndex: number) {
  const id = paramIndex as unknown as Parameters<Game_Actor["param"]>[0];
  const diff = Number(item.param[paramIndex]) - item._actor.param(id);
  item._actor.addParam(id, diff);
  initializeVariables();
}
function onGodModeChange(item: ActorRow) {
  GeneralCheat.toggleGodMode(item._actor);
  initializeVariables();
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
              v-model="actor.godMode"
              label="无敌模式"
              @change="onGodModeChange(actor)"
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
          <v-card-subtitle class="pa-0">等级 / 经验</v-card-subtitle>
          <v-row class="mt-0">
            <v-col>
              <v-text-field
                v-model="actor.level"
                label="Lv"
                variant="outlined"
                density="compact"
                hide-details
                @keydown.self.stop
                @change="onLevelChange(actor)"
                @focus="($event.target as HTMLInputElement).select()"
              />
            </v-col>
            <v-col>
              <v-text-field
                v-model="actor.exp"
                label="EXP"
                variant="outlined"
                density="compact"
                hide-details
                @keydown.self.stop
                @change="onExpChange(actor)"
                @focus="($event.target as HTMLInputElement).select()"
              />
            </v-col>
          </v-row>

          <v-card-subtitle class="pa-0 mt-4">属性</v-card-subtitle>
          <v-row class="mt-0">
            <v-col
              v-for="(_, paramIdx) in actor.param.length"
              :key="paramIdx"
              cols="12"
              md="6"
            >
              <v-text-field
                v-model="actor.param[paramIdx]"
                :label="paramNames[paramIdx]"
                variant="outlined"
                density="compact"
                hide-details
                @keydown.self.stop
                @change="onParamChange(actor, paramIdx)"
                @focus="($event.target as HTMLInputElement).select()"
              />
            </v-col>
          </v-row>
        </v-card>
      </v-window-item>
    </v-window>
  </v-card>
</template>
