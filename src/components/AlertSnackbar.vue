<script setup lang="ts">
import { onMounted, ref } from "vue";
import { Alert } from "@/js/AlertHelper";

const showSnackbar = ref(false);
const text = ref<string[]>([]);
const timeout = ref(1000);
const color = ref("black");

type Level = "success" | "info" | "warn" | "error";

interface ShowOptions {
  text: string;
  color?: string;
  timeout: number;
}

function show(options: ShowOptions) {
  showSnackbar.value = false;
  text.value = options.text.split("\n");
  timeout.value = options.timeout;
  if (options.color) color.value = options.color;
  showSnackbar.value = true;
}

onMounted(() => {
  Alert.alertInternal = (
    level: Level,
    msg: string,
    _err: unknown = null,
    timeoutMs = 1500,
  ) => {
    const colorMap: Record<Level, string> = {
      success: "green",
      info: "blue",
      warn: "orange",
      error: "red",
    };
    show({
      text: msg,
      color: colorMap[level] ?? "blue-grey",
      timeout: timeoutMs,
    });
  };
});
</script>

<template>
  <v-snackbar
    v-model="showSnackbar"
    location="top left"
    :color="color"
    :timeout="timeout"
    class="z-index-cheat-1"
  >
    <span
      v-for="(line, idx) in text"
      :key="idx"
      class="font-weight-bold text-caption d-block"
      >{{ line }}</span
    >
    <template #actions>
      <v-btn
        icon="mdi-close"
        size="x-small"
        color="white"
        variant="text"
        @click="showSnackbar = false"
      />
    </template>
  </v-snackbar>
</template>
