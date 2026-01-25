<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { Doughnut, Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
} from 'chart.js'
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval } from 'date-fns'
import { useTasksStore } from '../stores/tasks'
import { useTagsStore } from '../stores/tags'
import { useEntriesStore } from '../stores/entries'
import api from '../services/api'
import TagChip from '../components/TagChip.vue'

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend)

const tasksStore = useTasksStore()
const tagsStore = useTagsStore()
const entriesStore = useEntriesStore()

const timeRange = ref('7days')
const selectedTags = ref([])
const showManualEntry = ref(false)
const showEditEntry = ref(false)
const editingEntry = ref(null)

const manualEntry = ref({
  taskId: null,
  date: format(new Date(), 'yyyy-MM-dd'),
  startTime: '09:00',
  endTime: '10:00',
  comment: ''
})

const timeRanges = [
  { title: 'Today', value: 'day' },
  { title: 'Yesterday', value: 'yesterday' },
  { title: '7 Days', value: '7days' },
  { title: '30 Days', value: 'month' }
]

const dateRange = computed(() => {
  const now = new Date()
  switch (timeRange.value) {
    case 'day':
      return { start: startOfDay(now), end: endOfDay(now) }
    case 'yesterday':
      const yesterday = subDays(now, 1)
      return { start: startOfDay(yesterday), end: endOfDay(yesterday) }
    case '7days':
      return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) }
    case 'month':
      return { start: startOfDay(subDays(now, 29)), end: endOfDay(now) }
    default:
      return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) }
  }
})

const filteredEntries = computed(() => {
  let entries = entriesStore.entries.filter(e => {
    const entryDate = new Date(e.startTime)
    return entryDate >= dateRange.value.start && entryDate <= dateRange.value.end
  })

  if (selectedTags.value.length > 0) {
    entries = entries.filter(e => {
      const task = tasksStore.getTaskById(e.taskId)
      return task && task.tags.some(tagId => selectedTags.value.includes(tagId))
    })
  }

  return entries
})

const taskDurations = computed(() => {
  const durations = {}

  filteredEntries.value.forEach(entry => {
    const start = new Date(entry.startTime)
    const end = entry.endTime ? new Date(entry.endTime) : new Date()
    const duration = (end - start) / 1000 / 60 // minutes

    if (!durations[entry.taskId]) {
      durations[entry.taskId] = 0
    }
    durations[entry.taskId] += duration
  })

  return durations
})

const totalMinutes = computed(() => {
  return Object.values(taskDurations.value).reduce((sum, d) => sum + d, 0)
})

const formattedTotalTime = computed(() => {
  const hours = Math.floor(totalMinutes.value / 60)
  const minutes = Math.round(totalMinutes.value % 60)
  return `${hours}h ${minutes}m`
})

const doughnutData = computed(() => {
  const labels = []
  const data = []
  const colors = []

  Object.entries(taskDurations.value)
    .sort(([, a], [, b]) => b - a)
    .forEach(([taskId, duration]) => {
      const task = tasksStore.getTaskById(taskId)
      if (task) {
        labels.push(task.name)
        data.push(Math.round(duration))
        colors.push(task.color || '#6B7CFF')
      }
    })

  return {
    labels,
    datasets: [{
      data,
      backgroundColor: colors,
      borderWidth: 0
    }]
  }
})

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        boxWidth: 12,
        padding: 16
      }
    },
    tooltip: {
      callbacks: {
        label: (context) => {
          const minutes = context.raw
          const hours = Math.floor(minutes / 60)
          const mins = Math.round(minutes % 60)
          return `${hours}h ${mins}m`
        }
      }
    }
  }
}

const barData = computed(() => {
  const days = eachDayOfInterval({
    start: dateRange.value.start,
    end: dateRange.value.end
  })

  const taskIds = [...new Set(filteredEntries.value.map(e => e.taskId))]
  const datasets = taskIds.map(taskId => {
    const task = tasksStore.getTaskById(taskId)
    const data = days.map(day => {
      const dayStart = startOfDay(day)
      const dayEnd = endOfDay(day)

      return filteredEntries.value
        .filter(e => {
          const entryDate = new Date(e.startTime)
          return e.taskId === taskId && entryDate >= dayStart && entryDate <= dayEnd
        })
        .reduce((sum, e) => {
          const start = new Date(e.startTime)
          const end = e.endTime ? new Date(e.endTime) : new Date()
          return sum + (end - start) / 1000 / 60
        }, 0)
    })

    return {
      label: task?.name || 'Unknown',
      data,
      backgroundColor: task?.color || '#6B7CFF'
    }
  })

  return {
    labels: days.map(d => format(d, 'EEE')),
    datasets
  }
})

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: { stacked: true },
    y: {
      stacked: true,
      ticks: {
        callback: (value) => `${Math.round(value / 60)}h`
      }
    }
  },
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      callbacks: {
        label: (context) => {
          const minutes = context.raw
          const hours = Math.floor(minutes / 60)
          const mins = Math.round(minutes % 60)
          return `${context.dataset.label}: ${hours}h ${mins}m`
        }
      }
    }
  }
}

const recentEntries = computed(() => {
  return filteredEntries.value.slice(0, 20)
})

function toggleTag(tagId) {
  const index = selectedTags.value.indexOf(tagId)
  if (index === -1) {
    selectedTags.value.push(tagId)
  } else {
    selectedTags.value.splice(index, 1)
  }
}

function formatDuration(entry) {
  const start = new Date(entry.startTime)
  const end = entry.endTime ? new Date(entry.endTime) : new Date()
  const minutes = Math.round((end - start) / 1000 / 60)
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
}

function formatEntryTime(entry) {
  const start = new Date(entry.startTime)
  const end = entry.endTime ? new Date(entry.endTime) : null
  const dateStr = format(start, 'MMM d')
  const startStr = format(start, 'HH:mm')
  const endStr = end ? format(end, 'HH:mm') : 'now'
  return `${dateStr}, ${startStr} - ${endStr}`
}

function editEntry(entry) {
  editingEntry.value = { ...entry }
  showEditEntry.value = true
}

async function saveEditedEntry() {
  if (editingEntry.value) {
    await entriesStore.updateEntry(editingEntry.value.id, {
      comment: editingEntry.value.comment
    })
    showEditEntry.value = false
    editingEntry.value = null
  }
}

async function deleteEntry(entry) {
  if (confirm('Delete this entry?')) {
    await entriesStore.deleteEntry(entry.id)
  }
}

async function createManualEntry() {
  const startDateTime = new Date(`${manualEntry.value.date}T${manualEntry.value.startTime}`)
  const endDateTime = new Date(`${manualEntry.value.date}T${manualEntry.value.endTime}`)

  await entriesStore.createEntry({
    taskId: manualEntry.value.taskId,
    startTime: startDateTime.toISOString(),
    endTime: endDateTime.toISOString(),
    comment: manualEntry.value.comment || null
  })

  showManualEntry.value = false
  manualEntry.value = {
    taskId: null,
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '10:00',
    comment: ''
  }

  fetchData()
}

async function downloadCsv() {
  const csv = await api.exportEntries({
    startDate: dateRange.value.start.toISOString(),
    endDate: dateRange.value.end.toISOString()
  })

  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `traq-export-${format(new Date(), 'yyyy-MM-dd')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

async function fetchData() {
  await entriesStore.fetchEntries({
    startDate: dateRange.value.start.toISOString(),
    endDate: dateRange.value.end.toISOString()
  })
}

watch(dateRange, fetchData)

onMounted(async () => {
  await Promise.all([
    tasksStore.fetchTasks(),
    tagsStore.fetchTags()
  ])
  await fetchData()
})
</script>

<template>
  <v-container class="pa-4">
    <!-- Time Range Selector -->
    <v-btn-toggle
      v-model="timeRange"
      mandatory
      color="primary"
      variant="outlined"
      divided
      class="mb-4"
    >
      <v-btn
        v-for="range in timeRanges"
        :key="range.value"
        :value="range.value"
        size="small"
      >
        {{ range.title }}
      </v-btn>
    </v-btn-toggle>

    <!-- Tag Filter -->
    <div
      v-if="tagsStore.tags.length > 0"
      class="d-flex flex-wrap ga-2 mb-4"
    >
      <v-chip
        :variant="selectedTags.length === 0 ? 'elevated' : 'outlined'"
        color="primary"
        size="small"
        @click="selectedTags = []"
      >
        All
      </v-chip>
      <TagChip
        v-for="tag in tagsStore.tags"
        :key="tag.id"
        :tag="tag"
        :selected="selectedTags.includes(tag.id)"
        size="small"
        @click="toggleTag(tag.id)"
      />
    </div>

    <!-- Total Time -->
    <v-card class="mb-4" variant="tonal" color="primary">
      <v-card-text class="text-center">
        <div class="text-overline">Total Time</div>
        <div class="text-h4 font-weight-bold">{{ formattedTotalTime }}</div>
      </v-card-text>
    </v-card>

    <!-- Charts -->
    <v-row>
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title class="text-subtitle-1">Distribution</v-card-title>
          <v-card-text style="height: 250px;">
            <Doughnut
              v-if="doughnutData.labels.length > 0"
              :data="doughnutData"
              :options="doughnutOptions"
            />
            <div v-else class="d-flex align-center justify-center h-100 text-medium-emphasis">
              No data for this period
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card>
          <v-card-title class="text-subtitle-1">Timeline</v-card-title>
          <v-card-text style="height: 250px;">
            <Bar
              v-if="barData.datasets.length > 0"
              :data="barData"
              :options="barOptions"
            />
            <div v-else class="d-flex align-center justify-center h-100 text-medium-emphasis">
              No data for this period
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Recent Entries -->
    <v-card class="mt-4">
      <v-card-title class="d-flex align-center">
        <span class="text-subtitle-1">Recent Entries</span>
        <v-spacer />
        <v-btn
          size="small"
          variant="text"
          color="primary"
          @click="showManualEntry = true"
        >
          <v-icon start>mdi-plus</v-icon>
          Add Entry
        </v-btn>
      </v-card-title>

      <v-list v-if="recentEntries.length > 0" density="compact">
        <v-list-item
          v-for="entry in recentEntries"
          :key="entry.id"
        >
          <template #prepend>
            <v-icon
              :icon="tasksStore.getTaskById(entry.taskId)?.icon || 'mdi-clock'"
              :color="tasksStore.getTaskById(entry.taskId)?.color || 'primary'"
              size="small"
            />
          </template>

          <v-list-item-title>
            {{ tasksStore.getTaskById(entry.taskId)?.name || 'Unknown' }}
          </v-list-item-title>

          <v-list-item-subtitle>
            {{ formatEntryTime(entry) }} ({{ formatDuration(entry) }})
            <span v-if="entry.comment" class="text-primary">
              - {{ entry.comment }}
            </span>
          </v-list-item-subtitle>

          <template #append>
            <v-btn
              icon="mdi-pencil"
              size="x-small"
              variant="text"
              @click="editEntry(entry)"
            />
            <v-btn
              icon="mdi-delete"
              size="x-small"
              variant="text"
              color="error"
              @click="deleteEntry(entry)"
            />
          </template>
        </v-list-item>
      </v-list>

      <v-card-text v-else class="text-center text-medium-emphasis">
        No entries for this period
      </v-card-text>
    </v-card>

    <!-- Download FAB -->
    <v-btn
      icon="mdi-download"
      color="primary"
      size="large"
      position="fixed"
      location="bottom right"
      class="mb-16 mr-4"
      @click="downloadCsv"
    />

    <!-- Manual Entry Dialog -->
    <v-dialog v-model="showManualEntry" max-width="400">
      <v-card>
        <v-card-title>Add Manual Entry</v-card-title>
        <v-card-text>
          <v-select
            v-model="manualEntry.taskId"
            :items="tasksStore.tasks"
            item-title="name"
            item-value="id"
            label="Task"
            required
          />
          <v-text-field
            v-model="manualEntry.date"
            label="Date"
            type="date"
          />
          <v-row>
            <v-col cols="6">
              <v-text-field
                v-model="manualEntry.startTime"
                label="Start Time"
                type="time"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="manualEntry.endTime"
                label="End Time"
                type="time"
              />
            </v-col>
          </v-row>
          <v-textarea
            v-model="manualEntry.comment"
            label="Comment (optional)"
            rows="2"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showManualEntry = false">Cancel</v-btn>
          <v-btn
            color="primary"
            :disabled="!manualEntry.taskId"
            @click="createManualEntry"
          >
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Edit Entry Dialog -->
    <v-dialog v-model="showEditEntry" max-width="400">
      <v-card v-if="editingEntry">
        <v-card-title>Edit Entry</v-card-title>
        <v-card-text>
          <v-textarea
            v-model="editingEntry.comment"
            label="Comment"
            rows="3"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showEditEntry = false">Cancel</v-btn>
          <v-btn color="primary" @click="saveEditedEntry">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
