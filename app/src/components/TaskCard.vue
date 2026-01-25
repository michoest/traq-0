<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useTagsStore } from '../stores/tags'
import { useEntriesStore } from '../stores/entries'

const props = defineProps({
  task: {
    type: Object,
    required: true
  },
  activeEntry: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['start', 'stop'])

const tagsStore = useTagsStore()
const entriesStore = useEntriesStore()

const elapsed = ref(0)
let intervalId = null

const isRunning = computed(() => !!props.activeEntry)

const taskTags = computed(() => {
  return props.task.tags
    .map(id => tagsStore.getTagById(id))
    .filter(Boolean)
})

const formattedDuration = computed(() => {
  const hours = Math.floor(elapsed.value / 3600)
  const minutes = Math.floor((elapsed.value % 3600) / 60)
  const seconds = elapsed.value % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`
})

function updateElapsed() {
  if (props.activeEntry) {
    const start = new Date(props.activeEntry.startTime)
    elapsed.value = Math.floor((Date.now() - start) / 1000)
  }
}

function startTimer() {
  if (intervalId) clearInterval(intervalId)
  updateElapsed()
  intervalId = setInterval(updateElapsed, 1000)
}

function stopTimer() {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
  elapsed.value = 0
}

onMounted(() => {
  if (isRunning.value) {
    startTimer()
  }
})

onUnmounted(() => {
  stopTimer()
})

// Watch for changes in running state
const unwatch = computed(() => {
  if (isRunning.value) {
    startTimer()
  } else {
    stopTimer()
  }
  return isRunning.value
})

function handleClick() {
  if (isRunning.value) {
    emit('stop', props.task.id, props.activeEntry?.id)
  } else {
    emit('start', props.task.id)
  }
}
</script>

<template>
  <v-card
    :color="isRunning ? 'primary' : undefined"
    :variant="isRunning ? 'elevated' : 'outlined'"
    class="task-card"
    @click="handleClick"
  >
    <v-card-text class="d-flex align-center pa-3">
      <v-icon
        :icon="task.icon || 'mdi-checkbox-blank-circle'"
        :color="isRunning ? 'white' : (task.color || 'primary')"
        size="32"
        class="mr-3"
      />

      <div class="flex-grow-1">
        <div
          class="font-weight-medium"
          :class="{ 'text-white': isRunning }"
        >
          {{ task.name }}
        </div>

        <div
          v-if="taskTags.length > 0"
          class="d-flex flex-wrap ga-1 mt-1"
        >
          <v-chip
            v-for="tag in taskTags"
            :key="tag.id"
            size="x-small"
            :color="isRunning ? 'white' : tag.color"
            :variant="isRunning ? 'outlined' : 'tonal'"
          >
            <v-icon start size="12">{{ tag.icon }}</v-icon>
            {{ tag.name }}
          </v-chip>
        </div>
      </div>

      <div class="text-right">
        <div
          v-if="isRunning"
          class="text-h6 font-weight-bold text-white"
        >
          {{ formattedDuration }}
        </div>
        <v-btn
          :icon="isRunning ? 'mdi-stop' : 'mdi-play'"
          :color="isRunning ? 'white' : 'primary'"
          :variant="isRunning ? 'outlined' : 'tonal'"
          size="small"
        />
      </div>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.task-card {
  cursor: pointer;
  transition: all 0.2s ease;
}

.task-card:hover {
  transform: translateY(-2px);
}

.task-card:active {
  transform: translateY(0);
}
</style>
