import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../services/api'

export const useTasksStore = defineStore('tasks', () => {
  const tasks = ref([])
  const loading = ref(false)
  const error = ref(null)

  const activeTasks = computed(() => tasks.value.filter(t => t.active))
  const inactiveTasks = computed(() => tasks.value.filter(t => !t.active))

  async function fetchTasks() {
    try {
      loading.value = true
      const response = await api.getTasks()
      tasks.value = response.tasks
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  async function createTask(task) {
    try {
      const response = await api.createTask(task)
      tasks.value.push(response.task)
      return response.task
    } catch (e) {
      error.value = e.message
      throw e
    }
  }

  async function updateTask(id, updates) {
    try {
      const response = await api.updateTask(id, updates)
      const index = tasks.value.findIndex(t => t.id === id)
      if (index !== -1) {
        tasks.value[index] = response.task
      }
      return response.task
    } catch (e) {
      error.value = e.message
      throw e
    }
  }

  async function deleteTask(id) {
    try {
      await api.deleteTask(id)
      tasks.value = tasks.value.filter(t => t.id !== id)
    } catch (e) {
      error.value = e.message
      throw e
    }
  }

  function getTaskById(id) {
    return tasks.value.find(t => t.id === id)
  }

  function getTasksByTag(tagId) {
    return tasks.value.filter(t => t.tags.includes(tagId))
  }

  return {
    tasks,
    loading,
    error,
    activeTasks,
    inactiveTasks,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    getTaskById,
    getTasksByTag
  }
})
