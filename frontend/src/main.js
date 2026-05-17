import '@mdi/font/css/materialdesignicons.css';
import 'vuetify/styles';
import './styles.css';

import { createApp } from 'vue';
import App from './App.vue';
import router from './router.js';
import vuetify from './plugins/vuetify.js';

createApp(App).use(router).use(vuetify).mount('#app');
