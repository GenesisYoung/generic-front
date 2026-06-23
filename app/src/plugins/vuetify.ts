// plugins/vuetify.ts
import { createVuetify } from 'vuetify'
import { directives } from 'vuetify/dist/vuetify-labs.js'
import { components } from 'vuetify/dist/vuetify.js'
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg'

export default createVuetify({
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: {
      mdi,
    },
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
