<script setup lang="ts">
import { lan } from '@/lang'
import { saveTheme } from '@/theme/preference'
import { computed } from 'vue'
import { useTheme } from 'vuetify'

const theme = useTheme()
const isDark = computed(() => theme.current.value.dark)
const label = computed(() => (isDark.value ? lan.switchToLightTheme : lan.switchToDarkTheme))

async function toggleTheme() {
  const next = isDark.value ? 'light' : 'dark'
  await theme.change(next)
  saveTheme(next)
}
</script>

<template>
  <v-btn
    :icon="isDark ? 'mdi-weather-sunny' : 'mdi-weather-night'"
    :aria-label="label"
    :title="label"
    data-test="theme-toggle"
    @click="toggleTheme"
  />
</template>
