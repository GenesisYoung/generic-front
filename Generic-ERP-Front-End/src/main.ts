import { createApp } from 'vue'
// Pinia
import { createPinia } from 'pinia'
// Vuetify
import { createVuetify } from 'vuetify'
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css' // Icons provided by @mdi/font
// Import ALL components (fine for development)
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
// Language Switching
import { lan } from '@/lang/china_zh'
import { darkTheme, lightTheme } from './theme/primary'

import App from './App.vue'
import router from './router'

const app = createApp(App)

const vuetify = createVuetify({
  components,
  theme: {
    defaultTheme: 'darkTheme',
    themes: {
      lightTheme,
      darkTheme,
    },
  },
  directives,
  icons: {
    defaultSet: 'mdi',
  },
})
app.use(createPinia())
app.provide('lan', lan)
app.use(vuetify)
app.use(router)

app.mount('#app')
