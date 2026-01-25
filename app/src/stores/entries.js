import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../services/api'
import offlineService from '../services/offline'
import { useSyncStore } from './sync'

export const useEntriesStore = defineStore('entries', () => {
  const entries = ref([])
  const activeEntries = ref([])
  const loading = ref(false)
  const error = ref(null)

  const activeTaskIds = computed(() => activeEntries.value.map(e => e.taskId))

  async function fetchEntries(params = {}) {
    try {
      loading.value = true
      const response = await api.getEntries(params)
      entries.value = response.entries
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  async function fetchActiveEntries() {
    try {
      const response = await api.getActiveEntries()
      activeEntries.value = response.entries
    } catch (e) {
      error.value = e.message
    }
  }

  async function startTask(taskId) {
    const syncStore = useSyncStore()

    if (!syncStore.isOnline) {
      // Queue for later sync
      const tempEntry = {
        id: `temp_${Date.now()}`,
        taskId,
        startTime: new Date().toISOString(),
        endTime: null,
        comment: null,
        _offline: true
      }
      activeEntries.value.push(tempEntry)
      await offlineService.addToQueue({
        action: 'start',
        payload: { taskId },
        tempId: tempEntry.id
      })
      return { entry: tempEntry, otherActiveEntries: [] }
    }

    try {
      const response = await api.startTask(taskId)
      activeEntries.value.push(response.entry)
      return response
    } catch (e) {
      error.value = e.message
      throw e
    }
  }

  async function stopTask(taskId, entryId) {
    const syncStore = useSyncStore()

    if (!syncStore.isOnline) {
      // Update local state and queue for later
      const entry = activeEntries.value.find(e => e.taskId === taskId || e.id === entryId)
      if (entry) {
        entry.endTime = new Date().toISOString()
        activeEntries.value = activeEntries.value.filter(e => e.id !== entry.id)
        entries.value.unshift(entry)
        await offlineService.addToQueue({
          action: 'stop',
          payload: { taskId, entryId: entry.id }
        })
      }
      return { entry }
    }

    try {
      const response = await api.stopTask(taskId, entryId)
      activeEntries.value = activeEntries.value.filter(e => e.id !== response.entry.id)
      entries.value.unshift(response.entry)
      return response
    } catch (e) {
      error.value = e.message
      throw e
    }
  }

  async function stopAllTasks() {
    const syncStore = useSyncStore()

    if (!syncStore.isOnline) {
      const now = new Date().toISOString()
      activeEntries.value.forEach(entry => {
        entry.endTime = now
        entries.value.unshift(entry)
      })
      await offlineService.addToQueue({
        action: 'stopAll',
        payload: {}
      })
      activeEntries.value = []
      return { stoppedCount: activeEntries.value.length }
    }

    try {
      const response = await api.stopAllTasks()
      activeEntries.value = []
      if (response.entries) {
        response.entries.forEach(e => entries.value.unshift(e))
      }
      return response
    } catch (e) {
      error.value = e.message
      throw e
    }
  }

  async function createEntry(entry) {
    try {
      const response = await api.createEntry(entry)
      entries.value.unshift(response.entry)
      return response.entry
    } catch (e) {
      error.value = e.message
      throw e
    }
  }

  async function updateEntry(id, updates) {
    try {
      const response = await api.updateEntry(id, updates)
      const index = entries.value.findIndex(e => e.id === id)
      if (index !== -1) {
        entries.value[index] = response.entry
      }
      // Also update in active entries if present
      const activeIndex = activeEntries.value.findIndex(e => e.id === id)
      if (activeIndex !== -1) {
        activeEntries.value[activeIndex] = response.entry
      }
      return response.entry
    } catch (e) {
      error.value = e.message
      throw e
    }
  }

  async function deleteEntry(id) {
    try {
      await api.deleteEntry(id)
      entries.value = entries.value.filter(e => e.id !== id)
      activeEntries.value = activeEntries.value.filter(e => e.id !== id)
    } catch (e) {
      error.value = e.message
      throw e
    }
  }

  function isTaskRunning(taskId) {
    return activeEntries.value.some(e => e.taskId === taskId)
  }

  function getActiveEntry(taskId) {
    return activeEntries.value.find(e => e.taskId === taskId)
  }

  return {
    entries,
    activeEntries,
    loading,
    error,
    activeTaskIds,
    fetchEntries,
    fetchActiveEntries,
    startTask,
    stopTask,
    stopAllTasks,
    createEntry,
    updateEntry,
    deleteEntry,
    isTaskRunning,
    getActiveEntry
  }
})
