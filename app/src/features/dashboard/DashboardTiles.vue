<script setup lang="ts">
/** A responsive row of number tiles; each tile opens the page behind its number. */
import { useRouter } from 'vue-router'
import type { Tile } from './model'

defineProps<{ tiles: Tile[] }>()
const router = useRouter()
</script>

<template>
  <v-row dense>
    <v-col v-for="t in tiles" :key="t.key" cols="6" sm="4" md="3">
      <v-card
        variant="tonal"
        :color="t.color"
        class="pa-3 cursor-pointer"
        :data-test="`tile-${t.key}`"
        @click="router.push(t.to)"
      >
        <div class="text-caption">{{ t.label }}</div>
        <div class="text-h4 font-weight-medium" data-test="tile-value">{{ t.value }}</div>
      </v-card>
    </v-col>
  </v-row>
</template>
