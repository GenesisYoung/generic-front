<script lang="ts" setup>
/**
 * Tab bar of the multi-tab workspace. Purely presentational: tab state and
 * navigation live in the tabs store (clicking activates, the × closes).
 */
import { useTabsStore } from '@/stores/tabs'
import { storeToRefs } from 'pinia'
const tabsStore = useTabsStore()
const { tabs } = storeToRefs(tabsStore)
</script>

<template>
  <v-container class="pa-0">
    <v-row align="center" class="mb-12">
      <v-col>
        <v-tabs v-model="tabsStore.activeTab" show-arrows>
          <v-tab
            v-for="tab in tabs"
            :key="tab.id"
            :value="tab.id"
            @click="tabsStore.setActiveTab(tab.id)"
          >
            {{ tab.title }}
            <v-btn
              density="comfortable"
              icon="mdi-close"
              variant="plain"
              @click.stop="tabsStore.removeTab(tab.id)"
            />
          </v-tab>
        </v-tabs>
      </v-col>
    </v-row>
  </v-container>
</template>
