import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../services/api'

export const useTagsStore = defineStore('tags', () => {
  const tags = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchTags() {
    try {
      loading.value = true
      const response = await api.getTags()
      tags.value = response.tags
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  async function createTag(tag) {
    try {
      const response = await api.createTag(tag)
      tags.value.push(response.tag)
      return response.tag
    } catch (e) {
      error.value = e.message
      throw e
    }
  }

  async function updateTag(id, updates) {
    try {
      const response = await api.updateTag(id, updates)
      const index = tags.value.findIndex(t => t.id === id)
      if (index !== -1) {
        tags.value[index] = response.tag
      }
      return response.tag
    } catch (e) {
      error.value = e.message
      throw e
    }
  }

  async function reorderTags(tagIds) {
    try {
      const response = await api.reorderTags(tagIds)
      tags.value = response.tags
    } catch (e) {
      error.value = e.message
      throw e
    }
  }

  async function deleteTag(id) {
    try {
      await api.deleteTag(id)
      tags.value = tags.value.filter(t => t.id !== id)
    } catch (e) {
      error.value = e.message
      throw e
    }
  }

  function getTagById(id) {
    return tags.value.find(t => t.id === id)
  }

  return {
    tags,
    loading,
    error,
    fetchTags,
    createTag,
    updateTag,
    reorderTags,
    deleteTag,
    getTagById
  }
})
