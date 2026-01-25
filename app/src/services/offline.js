import { get, set, del, keys } from 'idb-keyval'

const QUEUE_PREFIX = 'sync_queue_'

export const offlineService = {
  async addToQueue(action) {
    const id = `${QUEUE_PREFIX}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    await set(id, {
      ...action,
      id,
      timestamp: new Date().toISOString(),
      synced: false
    })
    return id
  },

  async getQueue() {
    const allKeys = await keys()
    const queueKeys = allKeys.filter(k => typeof k === 'string' && k.startsWith(QUEUE_PREFIX))
    const queue = await Promise.all(queueKeys.map(k => get(k)))
    return queue.filter(Boolean).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
  },

  async removeFromQueue(id) {
    await del(id)
  },

  async clearQueue() {
    const allKeys = await keys()
    const queueKeys = allKeys.filter(k => typeof k === 'string' && k.startsWith(QUEUE_PREFIX))
    await Promise.all(queueKeys.map(k => del(k)))
  },

  async getQueueLength() {
    const allKeys = await keys()
    return allKeys.filter(k => typeof k === 'string' && k.startsWith(QUEUE_PREFIX)).length
  }
}

export default offlineService
