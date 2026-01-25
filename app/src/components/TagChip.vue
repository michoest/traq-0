<script setup>
defineProps({
  tag: {
    type: Object,
    required: true
  },
  selected: {
    type: Boolean,
    default: false
  },
  size: {
    type: String,
    default: 'default'
  }
})

defineEmits(['click'])
</script>

<template>
  <v-chip
    :color="tag.color"
    :variant="selected ? 'elevated' : 'tonal'"
    :size="size"
    @click="$emit('click', tag)"
  >
    <v-icon v-if="tag.icon" start size="small">{{ tag.icon }}</v-icon>
    {{ tag.name }}
  </v-chip>
</template>
