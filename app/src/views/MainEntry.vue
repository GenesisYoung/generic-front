<script setup lang="ts">
import { inject } from 'vue'
import AppNavigation from '@/assets/components/AppNavigation.vue'
import TabMenu from '@/assets/components/TabMenu.vue'
type Lan = Record<string, string>
const lang: Lan | undefined = inject('lan')
</script>

<template>
  <v-responsive class="border rounded">
    <v-app id="app">
      <v-app-bar :title="lang?.title"></v-app-bar>
      <AppNavigation />
      <v-main>
        <TabMenu />
        <v-container>
          <router-view v-slot="{ Component }">
            <keep-alive>
              <component :is="Component" />
            </keep-alive>
          </router-view>
        </v-container>
      </v-main>
    </v-app>
  </v-responsive>
</template>

<style scoped></style>
