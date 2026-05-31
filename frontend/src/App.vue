<template>
  <v-app>
    <template v-if="session.usuario && !route.meta.kiosk">
      <v-navigation-drawer v-model="drawer" width="270">
        <div class="brand">
          <div class="brand__mark">D</div>
          <div>
            <div class="brand__title">Dela POS</div>
            <div class="brand__subtitle">{{ session.compania?.nombre || 'Dela Crepes' }}</div>
          </div>
        </div>

        <v-list nav density="comfortable">
          <v-list-item
            v-for="item in items"
            :key="item.to"
            :to="item.external ? undefined : item.to"
            :href="item.external ? item.to : undefined"
            :target="item.external ? '_blank' : undefined"
            :rel="item.external ? 'noopener noreferrer' : undefined"
            :prepend-icon="item.icon"
            :title="item.title"
          />
        </v-list>
      </v-navigation-drawer>

      <v-app-bar flat border>
        <v-app-bar-nav-icon @click="drawer = !drawer" />
        <v-app-bar-title>{{ currentTitle }}</v-app-bar-title>
        <v-spacer />
        <v-select
          v-model="companiaSeleccionada"
          :items="companias"
          item-title="nombre"
          item-value="idCompania"
          density="compact"
          hide-details
          class="company-select mr-2"
          label="Compania"
          @update:model-value="onCompanyChange"
        />
        <v-btn icon="mdi-domain-plus" variant="text" @click="companyDialog = true" />
        <v-chip class="mr-3" prepend-icon="mdi-account-circle">{{ session.usuario.nombre }}</v-chip>
        <v-btn icon="mdi-logout" variant="text" @click="logout" />
      </v-app-bar>
    </template>

    <v-main>
      <router-view />
    </v-main>

    <v-dialog v-model="companyDialog" max-width="460">
      <v-card>
        <v-card-title>Nueva compania</v-card-title>
        <v-card-text>
          <v-text-field v-model="companyName" label="Nombre" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="companyDialog = false">Cancelar</v-btn>
          <v-btn color="primary" :loading="savingCompany" @click="createCompany">Guardar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from './api.js';
import { clearSession, session, setCompany } from './session.js';

const route = useRoute();
const router = useRouter();
const drawer = ref(true);
const companias = ref([]);
const companiaSeleccionada = ref(session.compania?.idCompania || 1);
const companyDialog = ref(false);
const companyName = ref('');
const savingCompany = ref(false);

const items = [
  { title: 'Inicio', icon: 'mdi-view-dashboard', to: '/' },
  { title: 'Productos', icon: 'mdi-package-variant', to: '/productos' },
  { title: 'Ventas', icon: 'mdi-cart', to: '/ventas' },
  { title: 'Pantalla pedidos', icon: 'mdi-monitor-dashboard', to: '/pantalla-pedidos', external: true },
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

const currentTitle = computed(() => items.find((item) => item.to === route.path)?.title || 'Dela POS');

function logout() {
  clearSession();
  router.push('/login');
}

async function loadCompanies() {
  companias.value = await api.get('/companias');
  const current = companias.value.find((item) => item.idCompania === companiaSeleccionada.value) || companias.value[0];
  if (current) {
    companiaSeleccionada.value = current.idCompania;
    setCompany(current);
  }
}

function onCompanyChange(idCompania) {
  const selected = companias.value.find((item) => item.idCompania === idCompania);
  if (selected) {
    setCompany(selected);
    router.go(0);
  }
}

async function createCompany() {
  if (!companyName.value.trim()) return;
  savingCompany.value = true;
  try {
    const created = await api.post('/companias', { nombre: companyName.value.trim() });
    await loadCompanies();
    companiaSeleccionada.value = created.idCompania;
    setCompany(created);
    companyDialog.value = false;
    companyName.value = '';
    router.go(0);
  } finally {
    savingCompany.value = false;
  }
}

onMounted(() => {
  if (session.usuario) loadCompanies();
});
</script>
