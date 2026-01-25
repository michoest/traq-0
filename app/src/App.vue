<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { useSyncStore } from './stores/sync'
import ConnectionStatus from './components/ConnectionStatus.vue'

const route = useRoute()
const authStore = useAuthStore()
const syncStore = useSyncStore()

const showNavigation = computed(() => {
  return authStore.isAuthenticated && route.name !== 'Login'
})

const navItems = [
  { title: 'Tracker', icon: 'mdi-timer', to: '/' },
  { title: 'Stats', icon: 'mdi-chart-bar', to: '/stats' },
  { title: 'Settings', icon: 'mdi-cog', to: '/settings' }
]
</script>

<template>
  <v-app>
    <ConnectionStatus />

    <v-main class="pb-16">
      <router-view />
    </v-main>

    <v-bottom-navigation
      v-if="showNavigation"
      grow
      color="primary"
    >
      <v-btn
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
      >
        <v-icon>{{ item.icon }}</v-icon>
        <span>{{ item.title }}</span>
      </v-btn>
    </v-bottom-navigation>
  </v-app>
</template>

<style scoped>
.v-main {
  height: 100%;
  overflow-y: auto;
}
</style>
