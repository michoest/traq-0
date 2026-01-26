import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

export default createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary: '#6B7CFF',
          secondary: '#2EF2C8',
          accent: '#6A5CFF',
          error: '#FF5252',
          info: '#2196F3',
          success: '#4CAF50',
          warning: '#FFC107',
          background: '#F5F5F5'
        }
      },
      dark: {
        colors: {
          primary: '#6B7CFF',
          secondary: '#2EF2C8',
          accent: '#6A5CFF',
          error: '#FF5252',
          info: '#2196F3',
          success: '#4CAF50',
          warning: '#FFC107'
        }
      }
    }
  },
  defaults: {
    VBtn: {
      rounded: 'lg'
    },
    VCard: {
      rounded: 'lg'
    },
    VTextField: {
      variant: 'solo-filled',
      density: 'comfortable',
      flat: true
    },
    VSelect: {
      variant: 'solo-filled',
      density: 'comfortable',
      flat: true
    },
    VTextarea: {
      variant: 'solo-filled',
      density: 'comfortable',
      flat: true
    }
  }
})
