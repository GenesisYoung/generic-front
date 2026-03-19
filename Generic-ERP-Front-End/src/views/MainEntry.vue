<script setup lang="ts">
import { inject } from 'vue'
import AppNavigation from '@/src/components/AppNavigation.vue'
import { useAuthStore } from '@/stores/authStore'
import router from '@/router'
import { onBeforeMount } from 'vue'
import { useDevStore } from '@/stores/devStore'
type Lan = Record<string, string>
const lang: Lan | undefined = inject('lan')
const dev_mode = import.meta.env.VITE_APP_DEV_MODE === 'true'
const devStore = useDevStore()
const authStore = useAuthStore()
function checkAuth() {
  if (!authStore.isAuthenticated) {
    router.push('/login')
    return
  }
  authStore.checkAndRefreshToken()
}
onBeforeMount(() => {
  if (dev_mode) {
    devStore.initialUser()
  }
  checkAuth()
})
</script>

<template>
  <v-responsive class="border rounded">
    <v-app id="app">
      <v-app-bar :title="lang?.title"></v-app-bar>
      <AppNavigation />
      <v-main>
        <v-container> <router-view /> </v-container>
      </v-main>
    </v-app>
  </v-responsive>
</template>

<style scoped></style>
