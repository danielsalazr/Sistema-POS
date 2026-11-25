<template>
  <div>
    <v-alert v-if="error" class="mb-3" type="error" density="compact">{{ error }}</v-alert>

    <v-row class="mb-2">
      <v-col cols="12" sm="4">
        <v-card class="data-card" variant="flat" border>
          <v-card-text>
            <div class="metric-label">Total vendido</div>
            <div class="metric-value">{{ currency(reporte.totalVendido) }}</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" sm="4">
        <v-card class="data-card" variant="flat" border>
          <v-card-text>
            <div class="metric-label">Ventas</div>
            <div class="metric-value">{{ number(reporte.numeroVentas) }}</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" sm="4">
        <v-card class="data-card" variant="flat" border>
          <v-card-text>
            <div class="metric-label">Unidades</div>
            <div class="metric-value">{{ number(reporte.unidades) }}</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-progress-linear v-if="cargando" indeterminate color="primary" class="mb-2" />

    <div v-if="!cargando && reporte.lineas.length === 0" class="reporte-vacio">No hay ventas en el rango seleccionado.</div>

    <v-expansion-panels v-model="abiertas" multiple variant="accordion">
      <v-expansion-panel v-for="linea in reporte.lineas" :key="linea.idLineaProducto ?? 'sin-linea'" :value="linea.idLineaProducto ?? 'sin-linea'">
        <v-expansion-panel-title class="linea__titulo">
          <div class="linea">
            <div class="linea__encabezado">
              <span class="linea__nombre" :class="{ 'text-medium-emphasis': linea.idLineaProducto === null }">{{ linea.nombre }}</span>
              <span class="linea__porcentaje">{{ percent(linea.porcentaje) }}</span>
            </div>
            <v-progress-linear :model-value="linea.porcentaje" :color="linea.idLineaProducto === null ? 'grey' : 'primary'" height="8" rounded />
            <div class="linea__detalle">
              <strong>{{ currency(linea.valor) }}</strong>
              <span>{{ number(linea.unidades) }} unidades</span>
              <span>{{ number(linea.numeroVentas) }} ventas</span>
            </div>
          </div>
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <div v-for="producto in linea.productos" :key="`${producto.idProducto}-${producto.descripcion}`" class="producto">
            <div class="producto__nombre">{{ producto.descripcion }}</div>
            <div class="producto__valores">
              <span>{{ number(producto.unidades) }} u</span>
              <strong>{{ currency(producto.valor) }}</strong>
            </div>
          </div>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { api } from '../../api.js';

const props = defineProps({
  filtros: { type: Object, required: true }
});

const reporte = ref({ totalVendido: 0, unidades: 0, numeroVentas: 0, lineas: [] });
const cargando = ref(false);
const error = ref('');
const abiertas = ref([]);

function currency(value) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value || 0);
}

function number(value) {
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(value || 0);
}

function percent(value) {
  return `${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 }).format(value || 0)} %`;
}

async function cargar() {
  cargando.value = true;
  error.value = '';
  try {
    const params = new URLSearchParams();
    if (props.filtros.desde) params.set('desde', props.filtros.desde);
    if (props.filtros.hasta) params.set('hasta', props.filtros.hasta);
    if (props.filtros.idUsuario) params.set('idUsuario', props.filtros.idUsuario);
    reporte.value = await api.get(`/reportes/ventas-por-linea?${params.toString()}`);
  } catch (err) {
    error.value = err.message;
  } finally {
    cargando.value = false;
  }
}

defineExpose({ cargar });
</script>

<style scoped>
.metric-label {
  color: #667085;
  font-weight: 600;
}

.metric-value {
  font-size: 1.45rem;
  font-weight: 760;
  margin-top: 8px;
}

.reporte-vacio {
  color: #667085;
  padding: 24px 4px;
}

.linea__titulo {
  min-height: 88px;
}

.linea {
  width: 100%;
  display: grid;
  gap: 6px;
  padding-right: 8px;
}

.linea__encabezado {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.linea__nombre {
  font-weight: 650;
  overflow-wrap: anywhere;
}

.linea__porcentaje {
  font-weight: 650;
  white-space: nowrap;
}

.linea__detalle {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 14px;
  color: #667085;
  font-size: 0.9rem;
}

.linea__detalle strong {
  color: #1f2937;
}

.producto {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid #eef0f3;
  min-height: 48px;
  align-items: center;
}

.producto:last-child {
  border-bottom: 0;
}

.producto__nombre {
  overflow-wrap: anywhere;
}

.producto__valores {
  display: flex;
  gap: 12px;
  white-space: nowrap;
  color: #667085;
}

.producto__valores strong {
  color: #1f2937;
}
</style>
