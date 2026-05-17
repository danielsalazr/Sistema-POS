<template>
  <v-app>
    <template v-if="session.usuario">
      <v-navigation-drawer v-model="drawer" width="270">
        <div class="brand">
          <div class="brand__mark">S</div>
          <div>
            <div class="brand__title">Sublime POS</div>
            <div class="brand__subtitle">Reconstruccion</div>
          </div>
        </div>

        <v-list nav density="comfortable">
          <v-list-item v-for="item in items" :key="item.to" :to="item.to" :prepend-icon="item.icon" :title="item.title" />
        </v-list>
      </v-navigation-drawer>

      <v-app-bar flat border>
        <v-app-bar-nav-icon @click="drawer = !drawer" />
        <v-app-bar-title>{{ currentTitle }}</v-app-bar-title>
        <v-spacer />
        <v-chip class="mr-3" prepend-icon="mdi-account-circle">{{ session.usuario.nombre }}</v-chip>
        <v-btn icon="mdi-logout" variant="text" @click="logout" />
      </v-app-bar>
    </template>

    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { clearSession, session } from './session.js';

const route = useRoute();
const router = useRouter();
const drawer = ref(true);

const items = [
  { title: 'Inicio', icon: 'mdi-view-dashboard', to: '/' },
  { title: 'Productos', icon: 'mdi-package-variant', to: '/productos' },
  { title: 'Ventas', icon: 'mdi-cart', to: '/ventas' },
  { title: 'Compras', icon: 'mdi-truck-delivery', to: '/compras' },
  { title: 'Clientes', icon: 'mdi-account-group', to: '/clientes' },
  { title: 'Proveedores', icon: 'mdi-factory', to: '/proveedores' },
  { title: 'Caja', icon: 'mdi-cash-register', to: '/caja' },
  { title: 'Reportes', icon: 'mdi-chart-box', to: '/reportes' },
  { title: 'Medios de pago', icon: 'mdi-credit-card-outline', to: '/medios-pago' },
  { title: 'Prestamos y aportes', icon: 'mdi-hand-coin', to: '/prestamos-aportes' },
  { title: 'Usuarios', icon: 'mdi-account-key', to: '/usuarios' },
  { title: 'Empresa', icon: 'mdi-store-cog', to: '/empresa' }
];

const currentTitle = computed(() => items.find((item) => item.to === route.path)?.title || 'Sublime POS');

function logout() {
  clearSession();
  router.push('/login');
}
</script>
