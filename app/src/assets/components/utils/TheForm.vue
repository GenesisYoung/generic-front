<template>
  <div class="modal-backdrop">
    <v-card id="global-form-dialog" class="modal-panel" rounded="lg" elevation="0">
      <v-card-text class="pa-5">
        <slot name="form"></slot>
      </v-card-text>
    </v-card>
  </div>
</template>

<script lang="ts" setup></script>

<style scoped>
#global-form-dialog {
  width: min(650px, 92vw);
}
</style>
