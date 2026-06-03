<script setup lang="ts">
import { onMounted, ref } from "vue";
import { BattleCheat } from "@/js/CheatHelper";
import HealthSettingTab from "@/panels/HealthSettingTab.vue";
import { Game_Actor, Game_Enemy } from "rmmz-types";

// rmmz-types models Game_Enemy/Game_Actor with `this`-narrowing predicates,
// which prevents direct assignment to Game_Battler[]. Use loose typing here;
// the panel only reads/writes hp/mp.
type Battler = Game_Actor | Game_Enemy;

interface HealthRow {
  _member: Battler;
  name: string;
  hp: { hp: number; mhp: number };
  mp: { mp: number; mmp: number };
}

const disableRandomEncounter = ref(false);
const enemy = ref<Battler[]>([]);
const party = ref<Battler[]>([]);

function initializeVariables() {
  enemy.value = $gameTroop.members().map((m) => m);
  party.value = $gameParty.members().map((m) => m);
  disableRandomEncounter.value = BattleCheat.isDisableRandomEncounter();
}

function recoverAllEnemy() {
  BattleCheat.recoverAllEnemy();
  initializeVariables();
}
function recoverAllParty() {
  BattleCheat.recoverAllParty();
  initializeVariables();
}
function fillTpAllEnemy() {
  BattleCheat.fillTpAllEnemy();
  initializeVariables();
}
function fillTpAllParty() {
  BattleCheat.fillTpAllParty();
  initializeVariables();
}
function changeAllEnemyHealth(newHp: number) {
  BattleCheat.changeAllEnemyHealth(newHp);
  initializeVariables();
}
function changeAllPartyHealth(newHp: number) {
  BattleCheat.changeAllPartyHealth(newHp);
  initializeVariables();
}
const encounterBattle = () => BattleCheat.encounterBattle();
const victory = () => BattleCheat.victory();
const defeat = () => BattleCheat.defeat();
const escape = () => BattleCheat.escape();
const abort = () => BattleCheat.abort();

function onDisableRandomEncounterChange() {
  BattleCheat.toggleDisableRandomEncounter();
  initializeVariables();
}

function onDetailChange(items: HealthRow[]) {
  for (const item of items) {
    const member = item._member;
    member.setHp(Number(item.hp.hp));
    member.setMp(Number(item.mp.mp));
  }
  initializeVariables();
}

onMounted(initializeVariables);
</script>

<template>
  <v-card class="ma-0 pa-0" flat>
    <v-card-subtitle class="text-caption pa-1">战斗</v-card-subtitle>
    <v-card-text class="pt-0 pb-0">
      <v-checkbox
        v-model="disableRandomEncounter"
        hide-details
        density="compact"
        class="my-0 py-0"
        @change="onDisableRandomEncounterChange"
      >
        <template #label>
          <span class="text-caption">禁用随机遇敌</span>
        </template>
      </v-checkbox>
      <v-btn size="small" @click.prevent="encounterBattle">遇敌</v-btn>
      <v-btn size="small" @click.prevent="victory">胜利</v-btn>
      <v-btn size="small" @click.prevent="defeat">失败</v-btn>
      <v-btn size="small" @click.prevent="escape">逃跑</v-btn>
      <v-btn size="small" @click.prevent="abort">中止</v-btn>
    </v-card-text>

    <v-card-subtitle class="text-caption pa-1">敌人</v-card-subtitle>
    <v-card-text class="pt-0 pb-0">
      <v-btn size="small" @click.prevent="changeAllEnemyHealth(0)">HP 0</v-btn>
      <v-btn size="small" @click.prevent="changeAllEnemyHealth(1)">HP 1</v-btn>
      <v-btn size="small" @click.prevent="recoverAllEnemy">恢复</v-btn>
      <v-btn size="small" @click.prevent="fillTpAllEnemy">补满 TP</v-btn>
    </v-card-text>

    <v-card-subtitle class="text-caption pa-1">队伍</v-card-subtitle>
    <v-card-text class="pt-0 pb-0">
      <v-btn size="small" @click.prevent="changeAllPartyHealth(0)">HP 0</v-btn>
      <v-btn size="small" @click.prevent="changeAllPartyHealth(1)">HP 1</v-btn>
      <v-btn size="small" @click.prevent="recoverAllParty">恢复</v-btn>
      <v-btn size="small" @click.prevent="fillTpAllParty">补满 TP</v-btn>
    </v-card-text>

    <template v-if="enemy && enemy.length > 0">
      <v-card-subtitle class="text-caption pa-1">敌人详情</v-card-subtitle>
      <v-card-text class="pt-0 pb-0">
        <HealthSettingTab :items="enemy" @change="onDetailChange" />
      </v-card-text>
    </template>

    <template v-if="party && party.length > 0">
      <v-card-subtitle class="text-caption pa-1">队伍详情</v-card-subtitle>
      <v-card-text class="pt-0 pb-0">
        <HealthSettingTab :items="party" @change="onDetailChange" />
      </v-card-text>
    </template>

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
