<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ConfirmDialog } from "@/js/DialogHelper";

interface DialogAction {
  icon: string;
  iconRight?: boolean;
  label: string;
  color: string;
  action: () => void | Promise<void>;
}

interface DialogOptions {
  width: number;
  message: string;
  actions: DialogAction[];
}

const showDialog = ref(false);
const options = ref<DialogOptions | undefined>(undefined);

const messageArray = computed(() =>
  options.value ? options.value.message.split("\n") : [],
);

function defaultSettings(): DialogOptions {
  return {
    width: 400,
    message: "",
    actions: [
      {
        icon: "mdi-close",
        iconRight: false,
        label: "취소",
        color: "red",
        action: close,
      },
    ],
  };
}

function copyObjectProps(src: Record<string, any>, dest: Record<string, any>) {
  for (const key of Object.keys(src)) {
    const value = src[key];
    if (
      !Array.isArray(value) &&
      typeof value === "object" &&
      value !== null &&
      Object.hasOwn(dest, key)
    ) {
      copyObjectProps(value, dest[key]);
    } else {
      dest[key] = src[key];
    }
  }
}

function show(opts: Partial<DialogOptions>) {
  const merged = defaultSettings();
  copyObjectProps(opts, merged);
  options.value = merged;
  showDialog.value = true;
}

function close() {
  showDialog.value = false;
  options.value = undefined;
}

onMounted(() => {
  (ConfirmDialog as any).show = show;
  (ConfirmDialog as any).close = close;
});
</script>

<template>
  <v-dialog v-if="options" v-model="showDialog" :width="options.width">
    <v-card theme="dark" class="pt-4">
      <v-card-text class="text-subtitle-1">
        <template v-for="(msg, idx) in messageArray" :key="idx">
          <span>{{ msg }}</span>
          <br />
        </template>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          v-for="(action, idx) in options.actions"
          :key="idx"
          variant="text"
          class="font-weight-bold"
          :color="action.color"
          @click="action.action"
        >
          <v-icon v-if="!action.iconRight" class="mr-1">{{
            action.icon
          }}</v-icon>
          <span>{{ action.label }}</span>
          <v-icon v-if="action.iconRight" class="ml-1">{{
            action.icon
          }}</v-icon>
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
