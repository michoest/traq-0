<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { useSyncStore } from './stores/sync'
import ConnectionStatus from './components/ConnectionStatus.vue'

const route = useRoute()
const authStore = useAuthStore()
const syncStore = useSyncStore()

const showSplash = ref(true)

const showNavigation = computed(() => {
  return authStore.isAuthenticated && route.name !== 'Login'
})

const navItems = [
  { title: 'Tracker', icon: 'mdi-timer', to: '/' },
  { title: 'Stats', icon: 'mdi-chart-bar', to: '/stats' },
  { title: 'Settings', icon: 'mdi-cog', to: '/settings' }
]

onMounted(() => {
  setTimeout(() => {
    showSplash.value = false
  }, 1000)
})
</script>

<template>
  <!-- Splash Screen -->
  <Transition name="fade">
    <div v-if="showSplash" class="splash-screen">
      <img src="/traq-icon.svg" alt="Traq" width="240" height="240" class="splash-logo" />
    </div>
  </Transition>

  <v-app v-show="!showSplash" class="safe-area">
    <ConnectionStatus />

    <v-main class="pb-16 app-background">
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
      </v-btn>
    </v-bottom-navigation>
  </v-app>
</template>

<style scoped>
.safe-area {
  padding: env(safe-area-inset-top, 0px) env(safe-area-inset-right, 0px) env(safe-area-inset-bottom, 0px) env(safe-area-inset-left, 0px);
}

.v-main {
  height: 100%;
  overflow-y: auto;
}

.app-background {
  background: linear-gradient(180deg, rgba(107, 124, 255, 0.1) 0%, rgba(46, 242, 200, 0.2) 100%);
  min-height: 100vh;
}

.splash-screen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #6B7CFF 0%, #6A5CFF 55%, #2EF2C8 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.splash-logo {
  animation: pulse 1s ease-in-out infinite alternate;
}

@keyframes pulse {
  from {
    transform: scale(1);
    opacity: 0.9;
  }
  to {
    transform: scale(1.05);
    opacity: 1;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
