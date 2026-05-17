import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

export default createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'sublime',
    themes: {
      sublime: {
        dark: false,
        colors: {
          primary: '#1976d2',
          secondary: '#455a64',
          success: '#2e7d32',
          warning: '#ed6c02',
          error: '#d32f2f',
          surface: '#ffffff',
          background: '#f4f6f8'
        }
      }
    }
  }
});
