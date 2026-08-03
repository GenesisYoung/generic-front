<template>
  <div class="modal-backdrop" v-if="store.globalDialogVisiblity">
    <v-card :prepend-icon="icon" :title="title" class="modal-panel dialog-card" rounded="lg">
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
/**
 * The single global dialog, mounted once in App.vue and driven by the
 * utils store. Open it via globalUtil.activeDialog() — mode 1 shows only a
 * confirm button; mode 2 shows cancel/confirm and writes the choice to
 * store.globalDialogValue (awaited by the caller).
 */
import utilStore from '@/stores/utils'
import { inject } from 'vue'

// Active i18n string map, provided by the app root.
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
.dialog-card {
  width: min(400px, 92vw);
}
</style>
