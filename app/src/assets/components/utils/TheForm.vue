<template>
  <v-container id="global-form-dialog" class="bg-blue-grey-lighten-3">
    <slot name="form"></slot>
  </v-container>
</template>

<script lang="ts" setup></script>

<style>
#global-form-dialog {
  max-width: 650px;
  max-height: 450px;
  overflow: scroll;
  z-index: 999;
  position: fixed;
  top: 25%;
  left: 25%;
  transform: translate(25%, 25%);
  border-radius: 1.25rem;
}
</style>
