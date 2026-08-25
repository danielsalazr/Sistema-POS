<template>
  <section class="page">
    <div class="page-header">
      <div>
        <div class="page-title">Movimientos de dinero</div>
        <div class="page-subtitle">Ultimos movimientos que afectan caja.</div>
      </div>
      <v-btn color="primary" prepend-icon="mdi-refresh" :loading="loading" @click="load">Actualizar</v-btn>
    </div>

    <v-row>
      <v-col cols="12" md="4">
        <v-card class="metric-card entrada" variant="flat" border>
          <span>Entradas listadas</span>
          <strong>{{ currency(resumen.entradas) }}</strong>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card class="metric-card salida" variant="flat" border>
          <span>Salidas listadas</span>
          <strong>{{ currency(resumen.salidas) }}</strong>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card class="metric-card" variant="flat" border>
          <span>Neto listado</span>
          <strong :class="resumen.neto >= 0 ? 'text-success' : 'text-error'">{{ currency(resumen.neto) }}</strong>
        </v-card>
      </v-col>
    </v-row>

    <v-alert v-if="error" class="mt-4" type="error" variant="tonal" closable @click:close="error = ''">{{ error }}</v-alert>

    <v-card class="data-card mt-4" variant="flat" border>
      <v-card-title>Filtros</v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="12" md="3">
            <v-select v-model="filtros.origen" :items="origenes" item-title="label" item-value="value" label="Tipo" />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field v-model="filtros.desde" type="date" label="Desde" />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field v-model="filtros.hasta" type="date" label="Hasta" />
          </v-col>
          <v-col cols="12" md="3">
            <v-select v-model="filtros.limite" :items="limites" item-title="label" item-value="value" label="Mostrar" />
          </v-col>
        </v-row>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="limpiarFiltros">Limpiar</v-btn>
        <v-btn color="primary" prepend-icon="mdi-magnify" :loading="loading" @click="load">Consultar</v-btn>
      </v-card-actions>
    </v-card>

    <v-card class="data-card mt-4" variant="flat" border>
      <v-card-title class="table-title">
        <span>Historial</span>
        <div class="table-actions">
          <v-chip size="small" variant="tonal">{{ resumen.cantidad }} movimientos</v-chip>
          <v-btn size="small" variant="tonal" prepend-icon="mdi-file-excel" :disabled="!movimientos.length" @click="exportarMovimientos">
            Excel
          </v-btn>
        </div>
      </v-card-title>
      <v-data-table :headers="headers" :items="movimientos" :loading="loading" item-value="idMovimientoCaja" density="comfortable">
        <template #item.fecha="{ item }">{{ formatDate(item.fecha) }}</template>
        <template #item.origen="{ item }">
          <v-chip size="small" variant="tonal">{{ origenLabel(item.origen) }}</v-chip>
        </template>
        <template #item.direccion="{ item }">
          <v-chip :color="item.direccion === 'ENTRADA' ? 'success' : 'error'" size="small" variant="tonal">
            {{ item.direccion === 'ENTRADA' ? 'Entrada' : 'Salida' }}
          </v-chip>
        </template>
        <template #item.monto="{ item }">
          <span :class="item.direccion === 'ENTRADA' ? 'amount-in' : 'amount-out'">
            {{ item.direccion === 'ENTRADA' ? '+' : '-' }} {{ currency(item.monto) }}
          </span>
        </template>
        <template #item.descripcion="{ item }">
          <div class="description-cell">
            <strong>{{ item.descripcion || item.tipo }}</strong>
            <span v-if="item.tercero">{{ item.tercero }}</span>
          </div>
        </template>
        <template #item.referencia="{ item }">
          <span>{{ item.referencia || '-' }}</span>
        </template>
        <template #item.saldoCaja="{ item }">
          <strong :class="Number(item.saldoCaja || 0) >= 0 ? 'text-success' : 'text-error'">{{ currency(item.saldoCaja) }}</strong>
        </template>
        <template #no-data>
          <div class="empty-state">No hay movimientos con los filtros seleccionados.</div>
        </template>
      </v-data-table>
    </v-card>
  </section>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { api } from '../api.js';
import { formatLocalDateTime } from '../dates.js';

const loading = ref(false);
const movimientos = ref([]);
const resumen = ref({ entradas: 0, salidas: 0, neto: 0, cantidad: 0 });
const error = ref('');
const filtros = reactive({ origen: 'TODOS', desde: '', hasta: '', limite: localStorage.getItem('dela-pos.movimientos-dinero.limite') || '100' });

const limites = [
  { label: 'Ultimos 100', value: '100' },
  { label: 'Ultimos 200', value: '200' },
  { label: 'Ultimos 500', value: '500' },
  { label: 'Ultimos 1000', value: '1000' },
  { label: 'Todos', value: 'todos' }
];

const origenes = [
  { label: 'Todos', value: 'TODOS' },
  { label: 'Ventas', value: 'VENTA' },
  { label: 'Compras', value: 'COMPRA' },
  { label: 'Ingresos', value: 'INGRESO' },
  { label: 'Egresos', value: 'EGRESO' },
  { label: 'Prestamos y aportes', value: 'PRESTAMOS_APORTES' },
  { label: 'Subsanaciones', value: 'SUBSANACION' },
  { label: 'Abonos', value: 'ABONO' }
];

const headers = [
  { title: 'Fecha', key: 'fecha' },
  { title: 'Tipo', key: 'origen' },
  { title: 'Movimiento', key: 'descripcion' },
  { title: 'Direccion', key: 'direccion' },
  { title: 'Monto', key: 'monto', align: 'end' },
  { title: 'Medio', key: 'medioPago' },
  { title: 'Referencia', key: 'referencia' },
  { title: 'Usuario', key: 'usuario' },
  { title: 'Caja luego', key: 'saldoCaja', align: 'end' }
];

const movimientosExcelColumns = [
  { title: 'Fecha', value: (item) => formatDate(item.fecha) },
  { title: 'Tipo', value: (item) => origenLabel(item.origen) },
  { title: 'Movimiento', value: (item) => item.descripcion || item.tipo || '' },
  { title: 'Tercero', value: (item) => item.tercero || '' },
  { title: 'Direccion', value: (item) => item.direccion === 'ENTRADA' ? 'Entrada' : 'Salida' },
  { title: 'Monto', value: (item) => item.direccion === 'ENTRADA' ? Number(item.monto || 0) : -Number(item.monto || 0) },
  { title: 'Medio', value: (item) => item.medioPago || '' },
  { title: 'Referencia', value: (item) => item.referencia || '' },
  { title: 'Usuario', value: (item) => item.usuario || '' },
  { title: 'Caja luego', value: (item) => Number(item.saldoCaja || 0) }
];

function currency(value) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value || 0);
}

function formatDate(value) {
  return formatLocalDateTime(value);
}

function origenLabel(value) {
  return origenes.find((item) => item.value === value)?.label || value;
}

function queryString() {
  const params = new URLSearchParams();
  params.set('limite', filtros.limite);
  if (filtros.origen !== 'TODOS') params.set('origen', filtros.origen);
  if (filtros.desde) params.set('desde', filtros.desde);
  if (filtros.hasta) params.set('hasta', filtros.hasta);
  return params.toString();
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function exportarMovimientos() {
  descargarExcel('movimientos-dinero', movimientos.value, movimientosExcelColumns);
}

function descargarExcel(nombre, rows, columns) {
  const tableRows = rows.map((row) => `<tr>${columns.map((column) => `<td>${excelValue(column.value(row))}</td>`).join('')}</tr>`).join('');
  const tableHeaders = columns.map((column) => `<th>${escapeHtml(column.title)}</th>`).join('');
  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="UTF-8"></head>
      <body><table><thead><tr>${tableHeaders}</tr></thead><tbody>${tableRows}</tbody></table></body>
    </html>`;
  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${nombre}-${today()}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

function excelValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return String(value);
  const text = String(value);
  const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return escapeHtml(safeText);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
async function load() {
  loading.value = true;
  try {
    error.value = '';
    localStorage.setItem('dela-pos.movimientos-dinero.limite', filtros.limite);
    const payload = await api.get(`/caja/movimientos?${queryString()}`);
    movimientos.value = payload.movimientos || [];
    resumen.value = payload.resumen || { entradas: 0, salidas: 0, neto: 0, cantidad: 0 };
  } catch (err) {
    error.value = err.message || 'No se pudo cargar el historial de movimientos';
    movimientos.value = [];
    resumen.value = { entradas: 0, salidas: 0, neto: 0, cantidad: 0 };
  } finally {
    loading.value = false;
  }
}

function limpiarFiltros() {
  filtros.origen = 'TODOS';
  filtros.desde = '';
  filtros.hasta = '';
  load();
}

onMounted(load);
</script>

<style scoped>
.metric-card {
  display: grid;
  gap: 6px;
  padding: 16px;
}

.metric-card span {
  color: #64748b;
  font-size: 0.86rem;
}

.metric-card strong {
  font-size: 1.35rem;
}

.metric-card.entrada {
  border-left: 4px solid #16a34a;
}

.metric-card.salida {
  border-left: 4px solid #dc2626;
}

.table-title {
  align-items: center;
  display: flex;
  justify-content: space-between;
}

.table-actions {
  align-items: center;
  display: flex;
  gap: 10px;
}

.description-cell {
  display: grid;
  gap: 2px;
  min-width: 220px;
}

.description-cell span {
  color: #64748b;
  font-size: 0.82rem;
}

.amount-in {
  color: #15803d;
  font-weight: 700;
}

.amount-out {
  color: #b91c1c;
  font-weight: 700;
}

.empty-state {
  color: #64748b;
  padding: 20px;
  text-align: center;
}
</style>
