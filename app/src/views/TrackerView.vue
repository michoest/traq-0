<script setup>
import { ref, computed, onMounted } from 'vue'
import { useTasksStore } from '../stores/tasks'
import { useTagsStore } from '../stores/tags'
import { useEntriesStore } from '../stores/entries'
import { useAuthStore } from '../stores/auth'
import TaskCard from '../components/TaskCard.vue'
import TagChip from '../components/TagChip.vue'
import CommentDialog from '../components/CommentDialog.vue'

const tasksStore = useTasksStore()
const tagsStore = useTagsStore()
const entriesStore = useEntriesStore()
const authStore = useAuthStore()

const selectedTags = ref([])
const showCommentDialog = ref(false)
const lastStoppedEntry = ref(null)
const showStopOthersSnackbar = ref(false)
const otherActiveCount = ref(0)
const commentSnackbar = ref(false)

const filteredTasks = computed(() => {
  let tasks = tasksStore.activeTasks

  if (selectedTags.value.length > 0) {
    tasks = tasks.filter(task =>
      task.tags.some(tagId => selectedTags.value.includes(tagId))
    )
  }

  return tasks
})

const runningTasks = computed(() => {
  return filteredTasks.value.filter(task =>
    entriesStore.isTaskRunning(task.id)
  )
})

const idleTasks = computed(() => {
  return filteredTasks.value.filter(task =>
    !entriesStore.isTaskRunning(task.id)
  )
})

const allowMultipleTasks = computed(() => {
  return authStore.user?.settings?.allowMultipleTasks ?? true
})

function toggleTag(tagId) {
  const index = selectedTags.value.indexOf(tagId)
  if (index === -1) {
    selectedTags.value.push(tagId)
  } else {
    selectedTags.value.splice(index, 1)
  }
}

async function handleStart(taskId) {
  try {
    const response = await entriesStore.startTask(taskId)

    // Show "stop other tasks" snackbar if enabled and there are other active tasks
    if (allowMultipleTasks.value && response.otherActiveEntries?.length > 0) {
      otherActiveCount.value = response.otherActiveEntries.length
      showStopOthersSnackbar.value = true

      // Auto-hide after 5 seconds
      setTimeout(() => {
        showStopOthersSnackbar.value = false
      }, 5000)
    }
  } catch (e) {
    console.error('Failed to start task:', e)
  }
}

async function handleStop(taskId, entryId) {
  try {
    const response = await entriesStore.stopTask(taskId, entryId)
    lastStoppedEntry.value = response.entry

    // Show comment snackbar
    commentSnackbar.value = true
  } catch (e) {
    console.error('Failed to stop task:', e)
  }
}

async function handleStopAll() {
  try {
    await entriesStore.stopAllTasks()
    showStopOthersSnackbar.value = false
  } catch (e) {
    console.error('Failed to stop all tasks:', e)
  }
}

function openCommentDialog() {
  commentSnackbar.value = false
  showCommentDialog.value = true
}

async function saveComment(comment) {
  if (lastStoppedEntry.value && comment) {
    await entriesStore.updateEntry(lastStoppedEntry.value.id, { comment })
  }
  lastStoppedEntry.value = null
}

onMounted(async () => {
  await Promise.all([
    tasksStore.fetchTasks(),
    tagsStore.fetchTags(),
    entriesStore.fetchActiveEntries()
  ])
})
</script>

<template>
  <v-container class="pa-4">
    <!-- Tag Filter -->
    <div
      v-if="tagsStore.tags.length > 0"
      class="d-flex flex-wrap ga-2 mb-4 hide-scrollbar"
      style="overflow-x: auto;"
    >
      <v-chip
        :variant="selectedTags.length === 0 ? 'elevated' : 'outlined'"
        color="primary"
        @click="selectedTags = []"
      >
        All
      </v-chip>
      <TagChip
        v-for="tag in tagsStore.tags"
        :key="tag.id"
        :tag="tag"
        :selected="selectedTags.includes(tag.id)"
        @click="toggleTag(tag.id)"
      />
    </div>

    <!-- Running Tasks -->
    <div v-if="runningTasks.length > 0" class="mb-6">
      <div class="text-overline text-medium-emphasis mb-2">
        Active ({{ runningTasks.length }})
      </div>
      <TransitionGroup name="task-list" tag="div" class="d-flex flex-column ga-2">
        <TaskCard
          v-for="task in runningTasks"
          :key="task.id"
          :task="task"
          :active-entry="entriesStore.getActiveEntry(task.id)"
          @start="handleStart"
          @stop="handleStop"
        />
      </TransitionGroup>
    </div>

    <!-- Idle Tasks -->
    <div v-if="idleTasks.length > 0">
      <div class="text-overline text-medium-emphasis mb-2">
        Tasks ({{ idleTasks.length }})
      </div>
      <TransitionGroup name="task-list" tag="div" class="d-flex flex-column ga-2">
        <TaskCard
          v-for="task in idleTasks"
          :key="task.id"
          :task="task"
          @start="handleStart"
          @stop="handleStop"
        />
      </TransitionGroup>
    </div>

    <!-- Empty State -->
    <div
      v-if="filteredTasks.length === 0"
      class="text-center py-12"
    >
      <v-icon size="64" color="grey-lighten-1">mdi-timer-off</v-icon>
      <div class="text-h6 text-medium-emphasis mt-4">No tasks yet</div>
      <div class="text-body-2 text-medium-emphasis">
        Go to Settings to create your first task
      </div>
      <v-btn
        color="primary"
        variant="tonal"
        class="mt-4"
        to="/settings"
      >
        <v-icon start>mdi-cog</v-icon>
        Open Settings
      </v-btn>
    </div>

    <!-- Stop Other Tasks Snackbar -->
    <v-snackbar
      v-model="showStopOthersSnackbar"
      location="bottom"
      color="info"
      timeout="-1"
    >
      {{ otherActiveCount }} other task{{ otherActiveCount > 1 ? 's' : '' }} running
      <template #actions>
        <v-btn
          variant="text"
          @click="handleStopAll"
        >
          Stop all
        </v-btn>
        <v-btn
          icon="mdi-close"
          size="small"
          variant="text"
          @click="showStopOthersSnackbar = false"
        />
      </template>
    </v-snackbar>

    <!-- Comment Snackbar -->
    <v-snackbar
      v-model="commentSnackbar"
      location="bottom"
      timeout="5000"
    >
      Task stopped
      <template #actions>
        <v-btn
          variant="text"
          color="primary"
          @click="openCommentDialog"
        >
          Add comment
        </v-btn>
      </template>
    </v-snackbar>

    <!-- Comment Dialog -->
    <CommentDialog
      v-model="showCommentDialog"
      :entry="lastStoppedEntry"
      @save="saveComment"
    />
  </v-container>
</template>
