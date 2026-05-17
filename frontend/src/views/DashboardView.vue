<template>
  <section class="page">
    <div class="page-header">
      <div>
        <div class="page-title">Inicio</div>
        <div class="page-subtitle">Resumen operativo del punto de venta.</div>
      </div>
      <v-btn color="primary" prepend-icon="mdi-refresh" @click="load">Actualizar</v-btn>
    </div>

    <v-row>
      <v-col v-for="card in cards" :key="card.label" cols="12" sm="6" lg="3">
        <v-card class="data-card" variant="flat" border>
          <v-card-text>
            <div class="metric-label">{{ card.label }}</div>
            <div class="metric-value" :class="card.className">{{ card.sign }}{{ currency(Math.abs(card.value || 0)) }}</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { api } from '../api.js';

const resumen = ref({ ventas: 0, abonos: 0, ingresos: 0, egresos: 0, total: 0 });

const cards = computed(() => [
  { label: 'Ventas', value: resumen.value.ventas, sign: '+ ', className: 'money-in' },
  { label: 'Abonos', value: resumen.value.abonos, sign: '+ ', className: 'money-in' },
  { label: 'Ingresos', value: resumen.value.ingresos, sign: '+ ', className: 'money-in' },
  { label: 'Egresos', value: resumen.value.egresos, sign: '- ', className: 'money-out' },
  { label: 'Compras', value: resumen.value.compras || 0, sign: '- ', className: 'money-out' },
  {
    label: 'Prestamos/aportes',
    value: (resumen.value.entradaPrestamosAportes || 0) - (resumen.value.salidaPrestamosAportes || 0),
    sign: ((resumen.value.entradaPrestamosAportes || 0) - (resumen.value.salidaPrestamosAportes || 0)) >= 0 ? '+ ' : '- ',
    className: ((resumen.value.entradaPrestamosAportes || 0) - (resumen.value.salidaPrestamosAportes || 0)) >= 0 ? 'money-in' : 'money-out'
  },
  { label: 'Total caja', value: resumen.value.total, sign: '', className: 'money-total' }
]);

function currency(value) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value || 0);
}

async function load() {
  resumen.value = await api.get('/caja/resumen');
}

onMounted(load);
</script>

<style scoped>
.metric-label {
  color: #667085;
  font-weight: 600;
}

.metric-value {
  font-size: 1.7rem;
  font-weight: 760;
  margin-top: 8px;
}

.money-in {
  color: #2e7d32;
}

.money-out {
  color: #d32f2f;
}

.money-total {
  color: #1976d2;
}
</style>
