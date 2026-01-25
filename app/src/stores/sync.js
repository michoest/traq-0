import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useOnline } from '@vueuse/core'
import api from '../services/api'
import offlineService from '../services/offline'

export const useSyncStore = defineStore('sync', () => {
  const online = useOnline()
  const syncing = ref(false)
  const pendingCount = ref(0)
  const lastSyncTime = ref(null)
  const debugLogs = ref([])
  const debugEnabled = ref(false)

  const isOnline = computed(() => online.value)

  function log(message, data = null) {
    if (debugEnabled.value) {
      const entry = {
        timestamp: new Date().toISOString(),
        message,
        data
      }
      debugLogs.value.unshift(entry)
      // Keep only last 100 logs
      if (debugLogs.value.length > 100) {
        debugLogs.value = debugLogs.value.slice(0, 100)
      }
      console.log(`[Traq Sync] ${message}`, data || '')
    }
  }

  async function updatePendingCount() {
    pendingCount.value = await offlineService.getQueueLength()
  }

  async function syncQueue() {
    if (syncing.value || !online.value) return

    syncing.value = true
    log('Starting sync')

    try {
      const queue = await offlineService.getQueue()
      log(`Found ${queue.length} items in queue`)

      for (const item of queue) {
        try {
          log(`Processing: ${item.action}`, item.payload)

          switch (item.action) {
            case 'start':
              await api.startTask(item.payload.taskId)
              break
            case 'stop':
              await api.stopTask(item.payload.taskId, item.payload.entryId)
              break
            case 'stopAll':
              await api.stopAllTasks()
              break
            default:
              log(`Unknown action: ${item.action}`)
          }

          await offlineService.removeFromQueue(item.id)
          log(`Synced: ${item.action}`)
        } catch (e) {
          log(`Failed to sync: ${item.action}`, e.message)
          // Keep item in queue for retry
        }
      }

      lastSyncTime.value = new Date().toISOString()
      log('Sync complete')
    } catch (e) {
      log('Sync error', e.message)
    } finally {
      syncing.value = false
      await updatePendingCount()
    }
  }

  function toggleDebug() {
    debugEnabled.value = !debugEnabled.value
  }

  function clearLogs() {
    debugLogs.value = []
  }

  // Auto-sync when coming online
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      log('Back online, starting sync')
      syncQueue()
    })
  }

  return {
    isOnline,
    syncing,
    pendingCount,
    lastSyncTime,
    debugLogs,
    debugEnabled,
    log,
    updatePendingCount,
    syncQueue,
    toggleDebug,
    clearLogs
  }
})
