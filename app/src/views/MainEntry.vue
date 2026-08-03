<script setup lang="ts">
/**
 * Main layout shell for authenticated pages: app bar (with user menu and
 * logout), sidebar navigation drawer, tab bar, and the routed page content.
 * Views are wrapped in <keep-alive> so tab switches preserve page state.
 */
import AppNavigation from '@/assets/components/AppNavigation.vue'
import TabMenu from '@/assets/components/TabMenu.vue'
import { useAuthStore } from '@/stores/auth'
import { inject, ref } from 'vue'
import { useDisplay } from 'vuetify'

// Active i18n string map, provided by the app root.
type Lan = Record<string, string>
const lang: Lan | undefined = inject('lan')
const auth = useAuthStore()
const { mobile } = useDisplay()
// Drawer starts open on desktop, closed on mobile.
const drawer = ref(!mobile.value)
</script>

<template>
  <v-app id="app">
    <v-app-bar :title="lang?.title" elevation="1">
      <template v-if="mobile" v-slot:prepend>
        <v-app-bar-nav-icon @click="drawer = !drawer" />
      </template>
      <template v-slot:append>
        <v-menu location="bottom end">
          <template v-slot:activator="{ props: menuProps }">
            <v-btn icon v-bind="menuProps" class="user-avatar-btn">
              <v-avatar size="36" color="primary">
                <v-img v-if="auth.identity?.avator" :src="auth.identity.avator" alt="" />
                <v-icon v-else icon="mdi-account-circle" />
              </v-avatar>
            </v-btn>
          </template>
          <v-list density="comfortable" min-width="180">
            <v-list-item :title="auth.identity?.displayName ?? auth.identity?.username" disabled />
            <v-divider />
            <v-list-item :title="lang?.settings" prepend-icon="mdi-cog-outline" />
            <v-list-item :title="lang?.logout" prepend-icon="mdi-logout" @click="auth.logout" />
          </v-list>
        </v-menu>
      </template>
    </v-app-bar>
    <AppNavigation v-model="drawer" />
    <v-main>
      <TabMenu />
      <Suspense>
        <v-container fluid>
          <router-view v-slot="{ Component }">
            <keep-alive>
              <component :is="Component" />
            </keep-alive>
          </router-view>
        </v-container>
        <template #fallback>
          <div class="center pa-8">{{ lang?.loading }}</div>
        </template>
      </Suspense>
    </v-main>
  </v-app>
</template>

<style scoped>
.user-avatar-btn {
  margin-right: var(--space-2);
}
</style>
