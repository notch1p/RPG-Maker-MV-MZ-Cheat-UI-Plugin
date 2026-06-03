<script setup lang="ts">
import { computed } from "vue";
import { Key } from "@/js/KeyCodes";

const props = withDefaults(
  defineProps<{
    modelValue?: Key;
    deletable?: boolean;
    label?: string;
    solo?: boolean;
    outlined?: boolean;
    bgColor?: string;
    combiningKeyAlone?: boolean;
  }>(),
  {
    modelValue: () => Key.createEmpty(),
    deletable: true,
    label: "",
    solo: false,
    outlined: false,
    bgColor: undefined,
    combiningKeyAlone: false,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: Key];
}>();

const showingText = computed(() => props.modelValue.asDisplayString());

const deleteBtnStyle = computed(
  () => `opacity: ${props.modelValue.isEmpty() ? 0 : 0.7}`,
);

const variant = computed<"outlined" | "solo" | "filled">(() =>
  props.outlined ? "outlined" : props.solo ? "solo" : "filled",
);

function onDeleteClick() {
  emit("update:modelValue", Key.createEmpty());
}

function onShortcutInput(e: KeyboardEvent) {
  const eventKey = Key.fromEvent(e);

  if (eventKey.isCombiningKey() && !props.combiningKeyAlone) {
    return;
  }

  if (!eventKey.equals(props.modelValue)) {
    emit("update:modelValue", eventKey);
  }
}
</script>

<template>
  <v-text-field
    :model-value="showingText"
    :label="label"
    :variant="variant"
    :bg-color="bgColor"
    density="compact"
    hide-details
    @keydown.stop.prevent="onShortcutInput"
    @focus="($event.target as HTMLInputElement).select()"
  >
    <template #append-inner>
      <v-btn
        v-if="deletable"
        :disabled="modelValue.isEmpty()"
        size="small"
        :style="deleteBtnStyle"
        icon="mdi-close-circle"
        variant="text"
        @click="onDeleteClick"
      />
    </template>
  </v-text-field>
</template>
