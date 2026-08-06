/**
 * UI utility store: holds the reactive state of the single global dialog
 * (rendered by TheDialog.vue). Open it via `globalUtil.activeDialog()` in
 * utils/util.ts rather than mutating this state directly.
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'

const utilStore = defineStore('utils', () => {
  /**
   * States
   */
  //-----dialog start-----
  // Determine if the dialog is visiable
  const globalDialogVisiblity = ref<boolean>(false)
  // Choose the activator of the dialog
  const globalDialogActivator = ref<string | undefined>(undefined)
  //  Dialog mode: 1->Only have a close button, 2->Both confirm and cancel
  const globalDialogMode = ref<number>(1)
  // Only when mode is 2 will effect, boolean type only. Confirm gives it a true value, cancel give
  // it a false value. Default value is false
  const globalDialogValue = ref<boolean>(false)
  const globalDialogTitle = ref<string | undefined>(undefined)
  const globalDialogIcon = ref<string | undefined>('mdi-alert-circle')
  const globalDialogContent = ref<string | unknown>()
  //-----dialog end-----
  /**
   * Getters
   */
  //-----dialog start-----

  //-----dialog end-----

  return {
    globalDialogVisiblity,
    globalDialogActivator,
    globalDialogMode,
    globalDialogValue,
    globalDialogTitle,
    globalDialogContent,
    globalDialogIcon,
  }
})

export default utilStore
