<template>
  <section class="page">
    <div class="page-header">
      <div>
        <div class="page-title">Reportes</div>
        <div class="page-subtitle">Ventas al contado por fecha y usuario.</div>
      </div>
      <v-btn color="primary" prepend-icon="mdi-refresh" :loading="loading" @click="load">Consultar</v-btn>
    </div>

    <v-card class="data-card mb-4" variant="flat" border>
      <v-card-text>
        <v-row>
          <v-col cols="12" md="3">
            <v-text-field v-model="filtros.desde" label="Desde" type="date" />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field v-model="filtros.hasta" label="Hasta" type="date" />
          </v-col>
          <v-col cols="12" md="4">
            <v-select
              v-model="filtros.idUsuario"
              :items="usuarios"
              item-title="nombre"
              item-value="idUsuario"
              label="Usuario"
              clearable
            />
          </v-col>
          <v-col cols="12" md="2" class="d-flex align-center">
            <v-btn block variant="tonal" prepend-icon="mdi-filter-remove" @click="limpiar">Limpiar</v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-row class="mb-4">
      <v-col cols="12" md="4">
        <v-card class="data-card" variant="flat" border>
          <v-card-text>
            <div class="metric-label">Ventas</div>
            <div class="metric-value">{{ resumen.cantidad }}</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card class="data-card" variant="flat" border>
          <v-card-text>
            <div class="metric-label">Total vendido</div>
            <div class="metric-value">{{ currency(resumen.total) }}</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card class="data-card" variant="flat" border>
          <v-card-text>
            <div class="metric-label">Pago recibido</div>
            <div class="metric-value">{{ currency(resumen.pago) }}</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-card class="data-card" variant="flat" border>
      <v-card-title>Ventas al contado</v-card-title>
      <v-data-table :headers="headers" :items="ventas" :loading="loading" item-value="idVenta">
        <template #item.fecha="{ item }">{{ formatDate(item.fecha) }}</template>
        <template #item.monto="{ item }">{{ currency(item.monto) }}</template>
        <template #item.pago="{ item }">{{ currency(item.pago) }}</template>
      </v-data-table>
    </v-card>
  </section>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { api } from '../api.js';

const loading = ref(false);
const ventas = ref([]);
const usuarios = ref([]);
const resumen = ref({ cantidad: 0, total: 0, pago: 0 });
const filtros = reactive({ desde: today(), hasta: today(), idUsuario: null });

const headers = [
  { title: 'Folio', key: 'idVenta' },
  { title: 'Fecha', key: 'fecha' },
  { title: 'Cliente', key: 'cliente' },
  { title: 'Usuario', key: 'usuario' },
  { title: 'Productos', key: 'cantidadProductos' },
  { title: 'Total', key: 'monto' },
  { title: 'Pago', key: 'pago' }
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function currency(value) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value || 0);
}

function formatDate(value) {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

function queryString() {
  const params = new URLSearchParams({ resumen: '1', limite: 'todos' });
  if (filtros.desde) params.set('desde', filtros.desde);
  if (filtros.hasta) params.set('hasta', filtros.hasta);
  if (filtros.idUsuario) params.set('idUsuario', filtros.idUsuario);
  return params.toString();
}

async function load() {
  loading.value = true;
  try {
    const payload = await api.get(`/ventas/contado?${queryString()}`);
    ventas.value = payload.ventas;
    resumen.value = payload.resumen;
  } finally {
    loading.value = false;
  }
}

function limpiar() {
  filtros.desde = '';
  filtros.hasta = '';
  filtros.idUsuario = null;
  load();
}

onMounted(async () => {
  usuarios.value = await api.get('/usuarios');
  await load();
});
</script>

<style scoped>
.metric-label {
  color: #667085;
  font-weight: 600;
}

.metric-value {
  font-size: 1.55rem;
  font-weight: 760;
  margin-top: 8px;
}
</style>
