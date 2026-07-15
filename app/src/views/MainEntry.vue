<script setup lang="ts">
import AppNavigation from '@/assets/components/AppNavigation.vue'
import TabMenu from '@/assets/components/TabMenu.vue'
import { useAuthStore } from '@/stores/auth'
import { inject, ref } from 'vue'
type Lan = Record<string, string>
const lang: Lan | undefined = inject('lan')
const showPanel = ref(false)
function togglePanel() {
  showPanel.value = !showPanel.value
}
</script>

<template>
  <v-responsive class="border rounded">
    <v-app id="app">
      <v-app-bar :title="lang?.title">
        <template v-slot:append>
          <div id="user-avartor">
            <ul id="user-panel" v-if="showPanel">
              <li>
                <v-btn>{{ lang?.settings }}</v-btn>
              </li>
              <li>
                <v-btn @click="useAuthStore().logout">{{ lang?.logout }}</v-btn>
              </li>
            </ul>
            <v-btn icon v-if="!useAuthStore().identity?.avator" @click="togglePanel">
              <v-icon>mdi-account-circle</v-icon>
            </v-btn>
            <v-btn v-else @click="togglePanel">
              <img :src="useAuthStore().identity?.avator" alt="" srcset="" />
            </v-btn>
          </div>
        </template>
      </v-app-bar>
      <AppNavigation />
      <v-main>
        <TabMenu />
        <Suspense>
          <v-container>
            <router-view v-slot="{ Component }">
              <keep-alive>
                <component :is="Component" />
              </keep-alive>
            </router-view>
          </v-container>
          <template #fallback>{{ lang?.loading }}</template>
        </Suspense>
      </v-main>
      <!-- <the-dialog
        :title="store.globalDialogTitle ?? undefined"
        :content="store.globalDialogContent ?? undefined"
        :icon="store.globalDialogIcon ?? undefined"
        :mode="store.globalDialogMode ?? undefined"
        class="global-dialog"
      /> -->
    </v-app>
  </v-responsive>
</template>

<style>
/* .global-dialog {
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
} */
#user-avartor {
  position: relative;
  min-width: 50px;
  min-height: 50px;
  display: flex;
  justify-content: center;
  align-items: center;
}
#user-panel {
  position: fixed;
  list-style: none;
  right: 25px;
  top: 40px;
  padding: 5px;
  background-color: aliceblue;
  color: black;
  font-family: 'Courier New', Courier, monospace;
  border-radius: 2px;
  cursor: pointer;
  user-select: none;
}
</style>
