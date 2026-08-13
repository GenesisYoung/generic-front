<script setup lang="ts">
import TheDialog from '@/assets/components/utils/TheDialog.vue'
import { lan } from '@/lang/china_zh.ts'
import { useAuthStore } from '@/stores/auth'
import { provide, watch } from 'vue'
import { useNotificationStore } from './stores/notification.ts'
import utilStore from './stores/utils.ts'
import MainEntry from './views/MainEntry.vue'
provide('lan', lan)
const isLoggedIn = useAuthStore().isAuthenticated
const store = utilStore()
const notificationStore = useNotificationStore()
notificationStore.start()
watch(
  () => useAuthStore().accessToken,
  (val) => {
    useNotificationStore().stop()
    useNotificationStore().start()
  },
)
</script>

<template>
  <main-entry v-if="isLoggedIn" />
  <router-view v-else />
  <the-dialog
    :title="store.globalDialogTitle ?? undefined"
    :content="store.globalDialogContent ?? undefined"
    :icon="store.globalDialogIcon ?? undefined"
    :mode="store.globalDialogMode ?? undefined"
  />
</template>
