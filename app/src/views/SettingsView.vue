<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import draggable from 'vuedraggable'
import { useAuthStore } from '../stores/auth'
import { useTasksStore } from '../stores/tasks'
import { useTagsStore } from '../stores/tags'
import { useSyncStore } from '../stores/sync'
import api from '../services/api'

const router = useRouter()
const authStore = useAuthStore()
const tasksStore = useTasksStore()
const tagsStore = useTagsStore()
const syncStore = useSyncStore()

// Dialogs
const showTaskDialog = ref(false)
const showTagDialog = ref(false)
const showTokenDialog = ref(false)
const showAdvanced = ref(false)

// Editing state
const editingTask = ref(null)
const editingTag = ref(null)

// Form data
const taskForm = ref({
  name: '',
  description: '',
  color: '#6B7CFF',
  icon: 'mdi-checkbox-blank-circle',
  tags: [],
  active: true
})

const tagForm = ref({
  name: '',
  color: '#6B7CFF',
  icon: 'mdi-tag'
})

// API Tokens
const apiTokens = ref([])
const newToken = ref(null)
const tokenName = ref('')

// Common icons for selection
const commonIcons = [
  'mdi-checkbox-blank-circle',
  'mdi-code-braces',
  'mdi-book',
  'mdi-music',
  'mdi-run',
  'mdi-dumbbell',
  'mdi-meditation',
  'mdi-food',
  'mdi-sleep',
  'mdi-briefcase',
  'mdi-school',
  'mdi-gamepad-variant',
  'mdi-movie',
  'mdi-palette',
  'mdi-heart',
  'mdi-home',
  'mdi-car',
  'mdi-phone',
  'mdi-email',
  'mdi-calendar',
  'mdi-tag',
  'mdi-star',
  'mdi-flag',
  'mdi-lightbulb'
]

// Common colors
const commonColors = [
  '#6B7CFF', '#2EF2C8', '#FF5252', '#FFC107',
  '#4CAF50', '#2196F3', '#9C27B0', '#FF9800',
  '#795548', '#607D8B', '#E91E63', '#00BCD4'
]

const allowMultipleTasks = computed({
  get: () => authStore.user?.settings?.allowMultipleTasks ?? true,
  set: (value) => authStore.updateSettings({ allowMultipleTasks: value })
})

const orderedTags = computed({
  get: () => [...tagsStore.tags],
  set: async (value) => {
    await tagsStore.reorderTags(value.map(t => t.id))
  }
})

const buildDate = computed(() => {
  try {
    return new Date(__BUILD_DATE__).toLocaleString()
  } catch {
    return 'Development'
  }
})

// Task functions
function openTaskDialog(task = null) {
  if (task) {
    editingTask.value = task
    taskForm.value = {
      name: task.name,
      description: task.description || '',
      color: task.color || '#6B7CFF',
      icon: task.icon || 'mdi-checkbox-blank-circle',
      tags: task.tags || [],
      active: task.active
    }
  } else {
    editingTask.value = null
    taskForm.value = {
      name: '',
      description: '',
      color: '#6B7CFF',
      icon: 'mdi-checkbox-blank-circle',
      tags: [],
      active: true
    }
  }
  showTaskDialog.value = true
}

async function saveTask() {
  if (!taskForm.value.name) return

  try {
    if (editingTask.value) {
      await tasksStore.updateTask(editingTask.value.id, taskForm.value)
    } else {
      await tasksStore.createTask(taskForm.value)
    }
    showTaskDialog.value = false
  } catch (e) {
    console.error('Failed to save task:', e)
  }
}

async function toggleTaskActive(task) {
  await tasksStore.updateTask(task.id, { active: !task.active })
}

async function deleteTask(task) {
  if (confirm(`Delete "${task.name}"? This will also delete all time entries.`)) {
    await tasksStore.deleteTask(task.id)
  }
}

// Tag functions
function openTagDialog(tag = null) {
  if (tag) {
    editingTag.value = tag
    tagForm.value = {
      name: tag.name,
      color: tag.color,
      icon: tag.icon
    }
  } else {
    editingTag.value = null
    tagForm.value = {
      name: '',
      color: '#6B7CFF',
      icon: 'mdi-tag'
    }
  }
  showTagDialog.value = true
}

async function saveTag() {
  if (!tagForm.value.name) return

  try {
    if (editingTag.value) {
      await tagsStore.updateTag(editingTag.value.id, tagForm.value)
    } else {
      await tagsStore.createTag(tagForm.value)
    }
    showTagDialog.value = false
  } catch (e) {
    console.error('Failed to save tag:', e)
  }
}

async function deleteTag(tag) {
  if (confirm(`Delete tag "${tag.name}"?`)) {
    await tagsStore.deleteTag(tag.id)
  }
}

// Token functions
async function fetchTokens() {
  try {
    const response = await api.getTokens()
    apiTokens.value = response.tokens
  } catch (e) {
    console.error('Failed to fetch tokens:', e)
  }
}

async function createToken() {
  if (!tokenName.value) return

  try {
    const response = await api.createToken(tokenName.value)
    newToken.value = response.token.plainToken
    tokenName.value = ''
    await fetchTokens()
  } catch (e) {
    console.error('Failed to create token:', e)
  }
}

async function revokeToken(token) {
  if (confirm(`Revoke token "${token.name}"?`)) {
    await api.revokeToken(token.id)
    await fetchTokens()
  }
}

function copyToken() {
  navigator.clipboard.writeText(newToken.value)
}

async function logout() {
  await authStore.logout()
  router.push('/login')
}

onMounted(async () => {
  await Promise.all([
    tasksStore.fetchTasks(),
    tagsStore.fetchTags(),
    fetchTokens()
  ])
})
</script>

<template>
  <v-container class="pa-4">
    <!-- User Info -->
    <v-card class="mb-4">
      <v-card-text class="d-flex align-center">
        <v-avatar color="primary" size="48" class="mr-4">
          <span class="text-h6">{{ authStore.user?.firstName?.[0] }}{{ authStore.user?.lastName?.[0] }}</span>
        </v-avatar>
        <div class="flex-grow-1">
          <div class="font-weight-medium">{{ authStore.fullName }}</div>
          <div class="text-body-2 text-medium-emphasis">{{ authStore.user?.email }}</div>
        </div>
        <v-btn variant="tonal" color="error" @click="logout">
          <v-icon start>mdi-logout</v-icon>
          Logout
        </v-btn>
      </v-card-text>
    </v-card>

    <!-- Tasks Management -->
    <v-card class="mb-4">
      <v-card-title class="d-flex align-center">
        <v-icon start>mdi-format-list-checks</v-icon>
        Tasks
        <v-spacer />
        <v-btn
          size="small"
          color="primary"
          variant="tonal"
          @click="openTaskDialog()"
        >
          <v-icon start>mdi-plus</v-icon>
          Add
        </v-btn>
      </v-card-title>

      <v-list v-if="tasksStore.tasks.length > 0">
        <v-list-item
          v-for="task in tasksStore.tasks"
          :key="task.id"
          :class="{ 'opacity-50': !task.active }"
        >
          <template #prepend>
            <v-icon :icon="task.icon || 'mdi-checkbox-blank-circle'" :color="task.color" />
          </template>

          <v-list-item-title>{{ task.name }}</v-list-item-title>
          <v-list-item-subtitle v-if="task.description">
            {{ task.description }}
          </v-list-item-subtitle>

          <template #append>
            <v-btn
              :icon="task.active ? 'mdi-eye' : 'mdi-eye-off'"
              size="x-small"
              variant="text"
              :color="task.active ? 'success' : 'grey'"
              @click="toggleTaskActive(task)"
            />
            <v-btn
              icon="mdi-pencil"
              size="x-small"
              variant="text"
              @click="openTaskDialog(task)"
            />
            <v-btn
              icon="mdi-delete"
              size="x-small"
              variant="text"
              color="error"
              @click="deleteTask(task)"
            />
          </template>
        </v-list-item>
      </v-list>

      <v-card-text v-else class="text-center text-medium-emphasis">
        No tasks yet. Create your first task!
      </v-card-text>
    </v-card>

    <!-- Tags Management -->
    <v-card class="mb-4">
      <v-card-title class="d-flex align-center">
        <v-icon start>mdi-tag-multiple</v-icon>
        Tags
        <v-spacer />
        <v-btn
          size="small"
          color="primary"
          variant="tonal"
          @click="openTagDialog()"
        >
          <v-icon start>mdi-plus</v-icon>
          Add
        </v-btn>
      </v-card-title>

      <draggable
        v-if="tagsStore.tags.length > 0"
        v-model="orderedTags"
        item-key="id"
        handle=".drag-handle"
        tag="div"
      >
        <template #item="{ element: tag }">
          <v-list-item>
            <template #prepend>
              <v-icon class="drag-handle cursor-move mr-2">mdi-drag</v-icon>
              <v-icon :icon="tag.icon" :color="tag.color" />
            </template>

            <v-list-item-title>{{ tag.name }}</v-list-item-title>

            <template #append>
              <v-btn
                icon="mdi-pencil"
                size="x-small"
                variant="text"
                @click="openTagDialog(tag)"
              />
              <v-btn
                icon="mdi-delete"
                size="x-small"
                variant="text"
                color="error"
                @click="deleteTag(tag)"
              />
            </template>
          </v-list-item>
        </template>
      </draggable>

      <v-card-text v-else class="text-center text-medium-emphasis">
        No tags yet. Tags help organize your tasks.
      </v-card-text>
    </v-card>

    <!-- Settings -->
    <v-card class="mb-4">
      <v-card-title>
        <v-icon start>mdi-tune</v-icon>
        Settings
      </v-card-title>

      <v-list>
        <v-list-item>
          <v-list-item-title>Allow multiple tasks at once</v-list-item-title>
          <v-list-item-subtitle>
            Track multiple tasks simultaneously
          </v-list-item-subtitle>
          <template #append>
            <v-switch
              v-model="allowMultipleTasks"
              color="primary"
              hide-details
              density="compact"
            />
          </template>
        </v-list-item>
      </v-list>
    </v-card>

    <!-- API Tokens -->
    <v-card class="mb-4">
      <v-card-title class="d-flex align-center">
        <v-icon start>mdi-key</v-icon>
        API Tokens
        <v-spacer />
        <v-btn
          size="small"
          color="primary"
          variant="tonal"
          @click="showTokenDialog = true"
        >
          <v-icon start>mdi-plus</v-icon>
          Generate
        </v-btn>
      </v-card-title>

      <v-card-subtitle>
        Use tokens for iOS Shortcuts integration
      </v-card-subtitle>

      <v-list v-if="apiTokens.length > 0">
        <v-list-item v-for="token in apiTokens" :key="token.id">
          <v-list-item-title>{{ token.name }}</v-list-item-title>
          <v-list-item-subtitle>
            Created: {{ new Date(token.createdAt).toLocaleDateString() }}
            <span v-if="token.lastUsedAt">
              | Last used: {{ new Date(token.lastUsedAt).toLocaleDateString() }}
            </span>
          </v-list-item-subtitle>
          <template #append>
            <v-btn
              icon="mdi-delete"
              size="x-small"
              variant="text"
              color="error"
              @click="revokeToken(token)"
            />
          </template>
        </v-list-item>
      </v-list>

      <v-card-text v-else class="text-center text-medium-emphasis">
        No API tokens yet
      </v-card-text>
    </v-card>

    <!-- Advanced Settings -->
    <v-expansion-panels v-model="showAdvanced">
      <v-expansion-panel>
        <v-expansion-panel-title>
          <v-icon start>mdi-cog</v-icon>
          Advanced
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <v-list density="compact">
            <v-list-item>
              <v-list-item-title>Build Date</v-list-item-title>
              <template #append>
                <span class="text-body-2">{{ buildDate }}</span>
              </template>
            </v-list-item>

            <v-list-item>
              <v-list-item-title>Backend URL</v-list-item-title>
              <template #append>
                <span class="text-body-2">{{ $env?.VITE_API_URL || 'localhost' }}</span>
              </template>
            </v-list-item>

            <v-list-item>
              <v-list-item-title>Connection Status</v-list-item-title>
              <template #append>
                <v-chip
                  :color="syncStore.isOnline ? 'success' : 'error'"
                  size="small"
                >
                  {{ syncStore.isOnline ? 'Online' : 'Offline' }}
                </v-chip>
              </template>
            </v-list-item>

            <v-list-item>
              <v-list-item-title>Debug Logs</v-list-item-title>
              <template #append>
                <v-switch
                  :model-value="syncStore.debugEnabled"
                  color="primary"
                  hide-details
                  density="compact"
                  @update:model-value="syncStore.toggleDebug()"
                />
              </template>
            </v-list-item>
          </v-list>

          <div v-if="syncStore.debugEnabled && syncStore.debugLogs.length > 0" class="mt-4">
            <div class="d-flex align-center mb-2">
              <span class="text-subtitle-2">Logs</span>
              <v-spacer />
              <v-btn size="x-small" variant="text" @click="syncStore.clearLogs()">
                Clear
              </v-btn>
            </div>
            <v-card variant="outlined" class="pa-2" style="max-height: 200px; overflow-y: auto;">
              <div
                v-for="(log, i) in syncStore.debugLogs"
                :key="i"
                class="text-caption font-weight-mono"
              >
                <span class="text-medium-emphasis">{{ log.timestamp.split('T')[1].split('.')[0] }}</span>
                {{ log.message }}
              </div>
            </v-card>
          </div>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>

    <!-- Task Dialog -->
    <v-dialog v-model="showTaskDialog" max-width="500">
      <v-card>
        <v-card-title>
          {{ editingTask ? 'Edit Task' : 'New Task' }}
        </v-card-title>
        <v-card-text>
          <v-text-field
            v-model="taskForm.name"
            label="Name"
            required
            autofocus
          />

          <v-textarea
            v-model="taskForm.description"
            label="Description (optional)"
            rows="2"
          />

          <div class="mb-4">
            <div class="text-subtitle-2 mb-2">Color</div>
            <div class="d-flex flex-wrap ga-2">
              <v-btn
                v-for="color in commonColors"
                :key="color"
                :color="color"
                size="small"
                icon
                :variant="taskForm.color === color ? 'elevated' : 'flat'"
                @click="taskForm.color = color"
              />
            </div>
          </div>

          <div class="mb-4">
            <div class="text-subtitle-2 mb-2">Icon</div>
            <div class="d-flex flex-wrap ga-2">
              <v-btn
                v-for="icon in commonIcons"
                :key="icon"
                size="small"
                :icon="icon"
                :variant="taskForm.icon === icon ? 'elevated' : 'outlined'"
                :color="taskForm.icon === icon ? 'primary' : undefined"
                @click="taskForm.icon = icon"
              />
            </div>
          </div>

          <v-select
            v-model="taskForm.tags"
            :items="tagsStore.tags"
            item-title="name"
            item-value="id"
            label="Tags"
            multiple
            chips
          />

          <v-switch
            v-model="taskForm.active"
            label="Active (show in tracker)"
            color="primary"
            hide-details
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showTaskDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            :disabled="!taskForm.name"
            @click="saveTask"
          >
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Tag Dialog -->
    <v-dialog v-model="showTagDialog" max-width="400">
      <v-card>
        <v-card-title>
          {{ editingTag ? 'Edit Tag' : 'New Tag' }}
        </v-card-title>
        <v-card-text>
          <v-text-field
            v-model="tagForm.name"
            label="Name"
            required
            autofocus
          />

          <div class="mb-4">
            <div class="text-subtitle-2 mb-2">Color</div>
            <div class="d-flex flex-wrap ga-2">
              <v-btn
                v-for="color in commonColors"
                :key="color"
                :color="color"
                size="small"
                icon
                :variant="tagForm.color === color ? 'elevated' : 'flat'"
                @click="tagForm.color = color"
              />
            </div>
          </div>

          <div class="mb-4">
            <div class="text-subtitle-2 mb-2">Icon</div>
            <div class="d-flex flex-wrap ga-2">
              <v-btn
                v-for="icon in commonIcons"
                :key="icon"
                size="small"
                :icon="icon"
                :variant="tagForm.icon === icon ? 'elevated' : 'outlined'"
                :color="tagForm.icon === icon ? 'primary' : undefined"
                @click="tagForm.icon = icon"
              />
            </div>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showTagDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            :disabled="!tagForm.name"
            @click="saveTag"
          >
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Token Dialog -->
    <v-dialog v-model="showTokenDialog" max-width="450">
      <v-card>
        <v-card-title>Generate API Token</v-card-title>
        <v-card-text>
          <template v-if="!newToken">
            <v-text-field
              v-model="tokenName"
              label="Token Name"
              placeholder="e.g., iPhone Shortcuts"
              hint="Give it a name to remember what it's for"
              persistent-hint
            />
          </template>

          <template v-else>
            <v-alert type="warning" variant="tonal" class="mb-4">
              Copy this token now! It won't be shown again.
            </v-alert>

            <v-text-field
              :model-value="newToken"
              label="Your API Token"
              readonly
              append-inner-icon="mdi-content-copy"
              @click:append-inner="copyToken"
            />

            <div class="text-body-2 mt-4">
              <strong>Usage in iOS Shortcuts:</strong><br>
              Set the Authorization header to:<br>
              <code>Bearer {{ newToken.substring(0, 20) }}...</code>
            </div>
          </template>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <template v-if="!newToken">
            <v-btn variant="text" @click="showTokenDialog = false">Cancel</v-btn>
            <v-btn
              color="primary"
              :disabled="!tokenName"
              @click="createToken"
            >
              Generate
            </v-btn>
          </template>
          <template v-else>
            <v-btn
              color="primary"
              @click="showTokenDialog = false; newToken = null"
            >
              Done
            </v-btn>
          </template>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<style scoped>
.cursor-move {
  cursor: move;
}
</style>
