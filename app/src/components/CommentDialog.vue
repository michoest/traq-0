<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  entry: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'save'])

const comment = ref('')

watch(() => props.entry, (entry) => {
  comment.value = entry?.comment || ''
})

function close() {
  emit('update:modelValue', false)
}

function save() {
  emit('save', comment.value)
  close()
}
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="400"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title>Add Comment</v-card-title>
      <v-card-text>
        <v-textarea
          v-model="comment"
          label="Comment"
          placeholder="What did you work on?"
          rows="3"
          auto-grow
          autofocus
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="close">Skip</v-btn>
        <v-btn color="primary" variant="elevated" @click="save">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
