<script setup>
import { useSyncStore } from '../stores/sync'

const syncStore = useSyncStore()
</script>

<template>
  <div
    class="connection-status"
    :class="{ online: syncStore.isOnline, offline: !syncStore.isOnline }"
  />
</template>
