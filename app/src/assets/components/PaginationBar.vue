<template>
  <v-container>
    <v-pagination
      :model-value="props.currentPage"
      :length="props.totalPages"
      density="comfortable"
      @update:model-value="emit('update:currentPage', $event)"
    />
  </v-container>
</template>

<script setup lang="ts">
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
