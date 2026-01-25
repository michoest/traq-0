import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../services/api'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const initialized = ref(false)
  const loading = ref(false)
  const error = ref(null)

  const isAuthenticated = computed(() => !!user.value)
  const fullName = computed(() => user.value ? `${user.value.firstName} ${user.value.lastName}` : '')

  async function checkAuth() {
    if (initialized.value) return

    try {
      loading.value = true
      const response = await api.getMe()
      user.value = response.user
    } catch (e) {
      user.value = null
    } finally {
      initialized.value = true
      loading.value = false
    }
  }

  async function login(email, password) {
    try {
      loading.value = true
      error.value = null
      const response = await api.login(email, password)
      user.value = response.user
      return true
    } catch (e) {
      error.value = e.message
      return false
    } finally {
      loading.value = false
    }
  }

  async function register(firstName, lastName, email, password) {
    try {
      loading.value = true
      error.value = null
      const response = await api.register(firstName, lastName, email, password)
      user.value = response.user
      return true
    } catch (e) {
      error.value = e.message
      return false
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    try {
      await api.logout()
    } catch (e) {
      // Ignore logout errors
    } finally {
      user.value = null
    }
  }

  async function updateSettings(settings) {
    try {
      const response = await api.updateSettings(settings)
      user.value = response.user
      return true
    } catch (e) {
      error.value = e.message
      return false
    }
  }

  return {
    user,
    initialized,
    loading,
    error,
    isAuthenticated,
    fullName,
    checkAuth,
    login,
    register,
    logout,
    updateSettings
  }
})
