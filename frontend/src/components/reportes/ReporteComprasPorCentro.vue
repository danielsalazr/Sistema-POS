<template>
  <div>
    <v-alert v-if="error" class="mb-3" type="error" density="compact">{{ error }}</v-alert>

    <v-card class="data-card mb-3" variant="flat" border>
      <v-card-text>
        <div class="metric-label">Total compras</div>
        <div class="metric-value">{{ moneda(reporte.total) }}</div>
      </v-card-text>
    </v-card>

    <v-progress-linear v-if="cargando" indeterminate color="primary" class="mb-2" />
    <div v-if="!cargando && reporte.centros.length === 0" class="reporte-vacio">No hay compras en el rango seleccionado.</div>

    <v-expansion-panels multiple variant="accordion">
      <v-expansion-panel v-for="centro in reporte.centros" :key="centro.idCentroCosto ?? 'sin-centro'">
        <v-expansion-panel-title class="centro__titulo">
          <div class="centro">
            <div class="centro__encabezado">
              <span class="centro__nombre" :class="{ 'text-warning': centro.idCentroCosto === null }">{{ centro.nombre }}</span>
              <span class="centro__porcentaje">{{ porcentaje(centro.porcentaje) }}</span>
            </div>
            <v-progress-linear :model-value="centro.porcentaje" :color="centro.idCentroCosto === null ? 'warning' : 'primary'" height="8" rounded />
            <div class="centro__detalle">
              <strong>{{ moneda(centro.total) }}</strong>
              <span>{{ centro.items.length }} ítems</span>
            </div>
          </div>
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <div class="seccion">Por tipo de gasto</div>
          <div v-for="tipo in centro.porTipo" :key="tipo.idTipoGasto ?? 'sin-tipo'" class="fila">
            <span :class="{ 'text-medium-emphasis': tipo.idTipoGasto === null }">{{ tipo.nombre }}</span>
            <strong>{{ moneda(tipo.total) }}</strong>
          </div>
          <div class="seccion mt-3">Ítems</div>
          <div v-for="item in itemsVisibles(centro)" :key="item.idProductoComprado" class="item">
            <div class="item__texto">
              <span>{{ item.descripcion }}</span>
              <span class="text-medium-emphasis">{{ fecha(item.fecha) }} · {{ item.proveedor || 'Sin proveedor' }} · {{ item.tipoGasto || 'Sin tipo' }}</span>
            </div>
            <strong>{{ moneda(item.valor) }}</strong>
          </div>
          <v-btn
            v-if="centro.items.length > itemsVisibles(centro).length"
            class="mt-2"
            variant="tonal"
            block
            @click="verMas(centro)"
          >
            Ver más ({{ centro.items.length - itemsVisibles(centro).length }})
          </v-btn>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { api } from '../../api.js';
import { formatLocalDateTime } from '../../dates.js';

const props = defineProps({
  filtros: { type: Object, required: true }
});

const reporte = ref({ total: 0, centros: [] });
const cargando = ref(false);
const error = ref('');
const limites = reactive({});

function clave(centro) {
  return centro.idCentroCosto ?? 'sin-centro';
}

function itemsVisibles(centro) {
  return centro.items.slice(0, limites[clave(centro)] || 30);
}

function verMas(centro) {
  limites[clave(centro)] = (limites[clave(centro)] || 30) + 50;
}

function moneda(valor) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor || 0);
}

function porcentaje(valor) {
  return `${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 }).format(valor || 0)} %`;
}

function fecha(valor) {
  return formatLocalDateTime(valor);
}

async function cargar() {
  cargando.value = true;
  error.value = '';
  try {
    const params = new URLSearchParams();
    if (props.filtros.desde) params.set('desde', props.filtros.desde);
    if (props.filtros.hasta) params.set('hasta', props.filtros.hasta);
    reporte.value = await api.get(`/reportes/compras-por-centro?${params.toString()}`);
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

.centro__titulo {
  min-height: 88px;
}

.centro {
  width: 100%;
  display: grid;
  gap: 6px;
  padding-right: 8px;
}

.centro__encabezado,
.fila,
.item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.centro__nombre {
  font-weight: 650;
  overflow-wrap: anywhere;
}

.centro__porcentaje {
  font-weight: 650;
  white-space: nowrap;
}

.centro__detalle {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 14px;
  color: #667085;
  font-size: 0.9rem;
}

.centro__detalle strong {
  color: #1f2937;
}

.seccion {
  font-weight: 600;
  color: #475467;
  margin-bottom: 4px;
}

.fila {
  min-height: 40px;
  align-items: center;
  border-bottom: 1px solid #f2f4f7;
}

.item {
  min-height: 52px;
  align-items: center;
  border-bottom: 1px solid #f2f4f7;
  padding: 6px 0;
}

.item__texto {
  display: flex;
  flex-direction: column;
  min-width: 0;
  font-size: 0.9rem;
  overflow-wrap: anywhere;
}

.item strong,
.fila strong {
  white-space: nowrap;
}
</style>
