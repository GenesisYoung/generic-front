<script setup lang="ts">
import TheDialog from '@/assets/components/utils/TheDialog.vue'
import { lan } from '@/lang/china_zh'
import { useAuthStore } from '@/stores/auth'
import { provide } from 'vue'
import utilStore from './stores/utils.ts'
import MainEntry from './views/MainEntry.vue'
provide('lan', lan)
const isLoggedIn = useAuthStore().isAuthenticated
const store = utilStore()
</script>

<template>
  <main-entry v-if="isLoggedIn" />
  <router-view v-else />
  <the-dialog
    :title="store.globalDialogTitle ?? undefined"
    :content="store.globalDialogContent ?? undefined"
    :icon="store.globalDialogIcon ?? undefined"
    :mode="store.globalDialogMode ?? undefined"
    class="global-dialog"
  />
</template>

<style scoped>
.global-dialog {
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
}
</style>
