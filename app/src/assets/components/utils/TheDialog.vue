<template>
  <div id="dialog-main" max-width="480" v-if="store.globalDialogVisiblity">
    <v-card :prepend-icon="icon" :title="title" class="content">
      <v-card-text>
        {{ content }}
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <div v-if="mode === 1">
          <v-btn :text="lang?.confirm" @click="store.globalDialogVisiblity = false"></v-btn>
        </div>
        <div v-else-if="mode === 2">
          <v-btn
            :text="lang?.cancel"
            @click="
              () => {
                ;((store.globalDialogValue = false), (store.globalDialogVisiblity = false))
              }
            "
          />
          <v-btn
            :text="lang?.confirm"
            @click="
              () => {
                ;((store.globalDialogValue = true), (store.globalDialogVisiblity = false))
              }
            "
          />
        </div>
      </v-card-actions>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import utilStore from '@/stores/utils'
import { inject } from 'vue'
type Lan = Record<string, string>
const lang: Lan | undefined = inject('lan')
const store = utilStore()
const {
  title = 'Default title',
  content = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
  icon = 'mdi-alert-circle',
  mode = 1,
} = defineProps<{
  title?: string
  content?: string
  icon?: string
  mode?: number
}>()
</script>

<style scoped>
#dialog-main {
  max-width: 400px;
  min-width: 200px;
  z-index: 999999;
}
.content {
  /* padding-left: 1rem; */
  /* padding-right: 1rem; */
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
  border-radius: 0.5rem;
}
</style>
