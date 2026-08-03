<template>
  <div class="center">
    <v-pagination
      :model-value="props.currentPage"
      :length="props.totalPages"
      :total-visible="5"
      density="comfortable"
      @update:model-value="emit('update:currentPage', $event)"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * Thin wrapper around v-pagination shared by all list pages.
 * Controlled component: emits `update:currentPage`, the parent refetches.
 */
const props = defineProps({
  currentPage: {
    type: Number,
    required: true,
  },
  totalPages: {
    type: Number,
    required: true,
  },
})
const emit = defineEmits(['update:currentPage'])
</script>
