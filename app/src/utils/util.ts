import utilStore from '@/stores/utils'
import { watch } from 'vue'

export const globalUtil = {
  /**
   * @param title The title of this dialog
   * @param content The text will be showed in the dialog
   * @param icon The activator, should be mdi, default 'mdi-alert-circle'
   * @param mode 1 for single cancel button,globalDialogValue will not be valued, 2 for providing
   * confirm and cancel buttons that will value globalDialogValue with true and false
   */
  activeDialog: async (
    title: string | undefined,
    content: string | undefined,
    icon: string | undefined,
    mode: number = 1,
  ) => {
    const utils = utilStore()
    utils.globalDialogTitle = title
    utils.globalDialogContent = content
    utils.globalDialogIcon = icon
    utils.globalDialogMode = mode
    utils.globalDialogVisiblity = true
    return new Promise((resolve) => {
      watch(
        () => utils.globalDialogValue,
        (val) => {
          resolve(val)
          setTimeout(() => {
            utils.globalDialogValue = false
          }, 1000)
        },
      )
    })
  },
}
