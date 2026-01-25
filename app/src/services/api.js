const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

class ApiService {
  constructor() {
    this.baseUrl = API_URL
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`
    const config = {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    }

    if (options.body && typeof options.body === 'object') {
      config.body = JSON.stringify(options.body)
    }

    const response = await fetch(url, config)

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }))
      throw new Error(error.error || 'Request failed')
    }

    // Handle CSV responses
    if (response.headers.get('content-type')?.includes('text/csv')) {
      return response.text()
    }

    return response.json()
  }

  // Auth
  async login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: { email, password }
    })
  }

  async register(firstName, lastName, email, password) {
    return this.request('/auth/register', {
      method: 'POST',
      body: { firstName, lastName, email, password }
    })
  }

  async logout() {
    return this.request('/auth/logout', { method: 'POST' })
  }

  async getMe() {
    return this.request('/auth/me')
  }

  async updateSettings(settings) {
    return this.request('/auth/settings', {
      method: 'PUT',
      body: { settings }
    })
  }

  // API Tokens
  async createToken(name) {
    return this.request('/auth/tokens', {
      method: 'POST',
      body: { name }
    })
  }

  async getTokens() {
    return this.request('/auth/tokens')
  }

  async revokeToken(id) {
    return this.request(`/auth/tokens/${id}`, { method: 'DELETE' })
  }

  // Tasks
  async getTasks() {
    return this.request('/tasks')
  }

  async createTask(task) {
    return this.request('/tasks', {
      method: 'POST',
      body: task
    })
  }

  async updateTask(id, task) {
    return this.request(`/tasks/${id}`, {
      method: 'PUT',
      body: task
    })
  }

  async deleteTask(id) {
    return this.request(`/tasks/${id}`, { method: 'DELETE' })
  }

  // Tags
  async getTags() {
    return this.request('/tags')
  }

  async createTag(tag) {
    return this.request('/tags', {
      method: 'POST',
      body: tag
    })
  }

  async updateTag(id, tag) {
    return this.request(`/tags/${id}`, {
      method: 'PUT',
      body: tag
    })
  }

  async reorderTags(tagIds) {
    return this.request('/tags/reorder', {
      method: 'PUT',
      body: { tagIds }
    })
  }

  async deleteTag(id) {
    return this.request(`/tags/${id}`, { method: 'DELETE' })
  }

  // Entries
  async getEntries(params = {}) {
    const query = new URLSearchParams()
    if (params.startDate) query.set('startDate', params.startDate)
    if (params.endDate) query.set('endDate', params.endDate)
    if (params.taskId) query.set('taskId', params.taskId)
    const queryString = query.toString()
    return this.request(`/entries${queryString ? '?' + queryString : ''}`)
  }

  async getActiveEntries() {
    return this.request('/entries/active')
  }

  async startTask(taskId) {
    return this.request('/entries/start', {
      method: 'POST',
      body: { taskId }
    })
  }

  async stopTask(taskId, entryId) {
    return this.request('/entries/stop', {
      method: 'POST',
      body: { taskId, entryId }
    })
  }

  async stopAllTasks() {
    return this.request('/entries/stop-all', { method: 'POST' })
  }

  async createEntry(entry) {
    return this.request('/entries', {
      method: 'POST',
      body: entry
    })
  }

  async updateEntry(id, entry) {
    return this.request(`/entries/${id}`, {
      method: 'PUT',
      body: entry
    })
  }

  async deleteEntry(id) {
    return this.request(`/entries/${id}`, { method: 'DELETE' })
  }

  async exportEntries(params = {}) {
    const query = new URLSearchParams()
    if (params.startDate) query.set('startDate', params.startDate)
    if (params.endDate) query.set('endDate', params.endDate)
    const queryString = query.toString()
    return this.request(`/entries/export${queryString ? '?' + queryString : ''}`)
  }
}

export const api = new ApiService()
export default api
