<template>
  <div>
    <v-alert v-if="error" class="mb-3" type="error" density="compact">{{ error }}</v-alert>

    <v-row class="mb-1">
      <v-col cols="12" sm="6">
        <v-card class="data-card" variant="flat" border>
          <v-card-text>
            <div class="metric-label">Ventas</div>
            <div class="metric-value">{{ moneda(reporte.totalVentas) }}</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6">
        <v-card class="data-card" variant="flat" border>
          <v-card-text>
            <div class="metric-label">Compras</div>
            <div class="metric-value">{{ moneda(reporte.totalCompras) }}</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-progress-linear v-if="cargando" indeterminate color="primary" class="mb-2" />

    <v-alert v-if="!cargando && reporte.centros.length === 0" class="mb-3" type="info" variant="tonal" density="compact">
      Ningún centro tiene líneas de producto asociadas. Asócialas en Clasificación → Líneas de producto para ver el resultado por centro.
    </v-alert>

    <v-row>
      <v-col v-for="centro in reporte.centros" :key="centro.idCentroCosto" cols="12" md="6">
        <v-card class="data-card resultado" variant="flat" border>
          <v-card-text>
            <div class="resultado__nombre">{{ centro.nombre }}</div>
            <div class="resultado__lineas">Líneas: {{ centro.lineas.join(', ') }}</div>
            <div class="fila"><span>Ventas</span><strong>{{ moneda(centro.ventas) }}</strong></div>
            <div class="fila"><span>Compras</span><strong>{{ moneda(centro.compras) }}</strong></div>
            <div v-for="tipo in centro.porTipo" :key="tipo.idTipoGasto ?? 'sin-tipo'" class="fila fila--tipo">
              <span>{{ tipo.nombre }}</span><span>{{ moneda(tipo.total) }}</span>
            </div>
            <div class="fila fila--resultado" :class="centro.diferencia < 0 ? 'text-error' : 'text-success'">
              <span>Resultado</span><strong>{{ moneda(centro.diferencia) }}</strong>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-card v-if="reporte.gastosSinLinea.length" class="data-card mt-3" variant="flat" border>
      <v-card-text>
        <div class="resultado__nombre">Gastos sin línea asociada</div>
        <div class="resultado__lineas">Centros que no tienen ventas propias (p. ej. gastos generales). No se reparten entre los demás.</div>
        <template v-for="gasto in reporte.gastosSinLinea" :key="gasto.idCentroCosto">
          <div class="fila"><span>{{ gasto.nombre }}</span><strong>{{ moneda(gasto.total) }}</strong></div>
          <div v-for="tipo in gasto.porTipo" :key="tipo.idTipoGasto ?? 'sin-tipo'" class="fila fila--tipo">
            <span>{{ tipo.nombre }}</span><span>{{ moneda(tipo.total) }}</span>
          </div>
        </template>
      </v-card-text>
    </v-card>

    <v-card class="data-card mt-3" variant="flat" border>
      <v-card-text>
        <div class="resultado__nombre">Partidas sin clasificar</div>
        <div class="resultado__lineas">Con estas partidas, los totales cuadran con las ventas y compras del sistema.</div>
        <div class="fila"><span>Ventas sin centro (sin línea o línea sin centro)</span><strong>{{ moneda(reporte.ventasSinCentro) }}</strong></div>
        <div class="fila" :class="{ 'text-warning': reporte.comprasSinAsignar.total > 0 }">
          <span>Compras sin centro asignado</span><strong>{{ moneda(reporte.comprasSinAsignar.total) }}</strong>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { api } from '../../api.js';

const props = defineProps({
  filtros: { type: Object, required: true }
});

const reporte = ref({ totalVentas: 0, totalCompras: 0, centros: [], gastosSinLinea: [], ventasSinCentro: 0, comprasSinAsignar: { total: 0, porTipo: [] } });
const cargando = ref(false);
const error = ref('');

function moneda(valor) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor || 0);
}

async function cargar() {
  cargando.value = true;
  error.value = '';
  try {
    const params = new URLSearchParams();
    if (props.filtros.desde) params.set('desde', props.filtros.desde);
    if (props.filtros.hasta) params.set('hasta', props.filtros.hasta);
    reporte.value = await api.get(`/reportes/resultado-por-centro?${params.toString()}`);
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
  font-size: 1.3rem;
  font-weight: 760;
  margin-top: 8px;
  white-space: nowrap;
}

.resultado__nombre {
  font-weight: 700;
  font-size: 1.05rem;
}

.resultado__lineas {
  color: #667085;
  font-size: 0.85rem;
  margin-bottom: 8px;
}

.fila {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  min-height: 40px;
  align-items: center;
  border-bottom: 1px solid #f2f4f7;
}

.fila strong {
  white-space: nowrap;
}

.fila--tipo {
  min-height: 32px;
  padding-left: 14px;
  color: #667085;
  font-size: 0.88rem;
}

.fila--resultado {
  border-bottom: 0;
  font-size: 1.05rem;
}
</style>
