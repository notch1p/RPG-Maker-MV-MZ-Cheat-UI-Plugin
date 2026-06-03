<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import CheatModal from "@/CheatModal.vue";
import AlertSnackbar from "@/components/AlertSnackbar.vue";
import ConfirmDialog from "@/components/ConfirmDialog.vue";
import { GLOBAL_SHORTCUT } from "@/js/GlobalShortcut";
import { GeneralCheat } from "@/js/CheatHelper";
import { customizeRPGMakerFunctions } from "@/init/customize_functions";
import { Key } from "@/js/KeyCodes";
import { Alert } from "@/js/AlertHelper";
import { RPGVERSION } from "@/version";

const currentKey = Key.createEmpty();
const show = ref(false);
const currentComponentName = ref<string | null>(null);

function openCheatModal(componentName: string | null = null) {
  if (componentName) currentComponentName.value = componentName;
  show.value = true;
}

function toggleCheatModal(componentName: string | null = null) {
  const prevComponentName = currentComponentName.value;
  if (componentName) currentComponentName.value = componentName;

  if (show.value) {
    // Close unless user is switching panels.
    if (!componentName || componentName === prevComponentName) {
      show.value = false;
    }
    return;
  }
  show.value = true;
}

function onGlobalKeyDown(e: KeyboardEvent) {
  if (e.repeat) {
    GLOBAL_SHORTCUT.runKeyRepeatEvent(e, Key.fromKey(currentKey));
  } else {
    GLOBAL_SHORTCUT.runKeyLeaveEvent(e, Key.fromKey(currentKey));
    currentKey.add(e.keyCode);
    currentKey.adjustCombiningKey(e);
    GLOBAL_SHORTCUT.runKeyEnterEvent(e, Key.fromKey(currentKey));
  }
}

function onGlobalKeyUp(e: KeyboardEvent) {
  GLOBAL_SHORTCUT.runKeyLeaveEvent(e, Key.fromKey(currentKey));
  currentKey.remove(e.keyCode);
  GLOBAL_SHORTCUT.runKeyEnterEvent(e, Key.fromKey(currentKey));
}

function checkVersion() {
  Alert.info(
    `Cheat ${RPGVERSION} loaded. Toggle with ${GLOBAL_SHORTCUT.getShortcut(
      "toggleCheatModal",
    ).asString()}, F12 to access devconsole`,
    null,
    3000,
  );
}

onMounted(() => {
  customizeRPGMakerFunctions();
  GeneralCheat.toggleCheatModal = toggleCheatModal;
  GeneralCheat.openCheatModal = openCheatModal;

  window.addEventListener("keydown", onGlobalKeyDown);
  window.addEventListener("keyup", onGlobalKeyUp);

  checkVersion();
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onGlobalKeyDown);
  window.removeEventListener("keyup", onGlobalKeyUp);
});
</script>

<template>
  <v-app theme="dark" style="background-color: black">
    <v-main>
      <div class="pa-2">
        <v-fade-transition leave-absolute>
          <CheatModal
            v-if="show"
            id="cheat-modal"
            v-model="currentComponentName"
            class="opaque-on-mouseover"
          />
        </v-fade-transition>
        <AlertSnackbar />
        <ConfirmDialog />
      </div>
    </v-main>
  </v-app>
</template>
