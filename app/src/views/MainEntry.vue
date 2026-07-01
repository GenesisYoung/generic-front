<script setup lang="ts">
import AppNavigation from '@/assets/components/AppNavigation.vue'
import TabMenu from '@/assets/components/TabMenu.vue'
import TheDialog from '@/assets/components/utils/TheDialog.vue'
import utilStore from '@/stores/utils'
import { inject } from 'vue'
type Lan = Record<string, string>
const lang: Lan | undefined = inject('lan')
const store = utilStore()
</script>

<template>
  <v-responsive class="border rounded">
    <v-app id="app">
      <v-app-bar :title="lang?.title"> </v-app-bar>
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
      <the-dialog
        :title="store.globalDialogTitle ?? undefined"
        :content="store.globalDialogContent ?? undefined"
        :icon="store.globalDialogIcon ?? undefined"
        :mode="store.globalDialogMode ?? undefined"
        class="global-dialog"
      />
    </v-app>
  </v-responsive>
</template>

<style>
.global-dialog {
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
}
</style>
