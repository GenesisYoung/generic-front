// src/main.ts

import '@mdi/font/css/materialdesignicons.css'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { createApp } from 'vue'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import 'vuetify/styles'

// import '@mdi/font/css/materialdesignicons.css'
import { registerAuthStore } from './api/http'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

const vuetify = createVuetify({
  icons: {
    defaultSet: 'mdi',
    // aliases,
    // sets: {
    //   mdi,
    // },
  },
  components,
  directives,
  theme: {
    defaultTheme: 'dark',
    themes: {
      light: {
        colors: { primary: '#7C3AED' }, // violet
      },
    },
  },
})

const app = createApp(App)

app.use(pinia)
app.use(router)
app.use(vuetify)

// Register the auth store with the Axios interceptor AFTER Pinia is installed.
registerAuthStore(() => useAuthStore())

app.mount('#app')
