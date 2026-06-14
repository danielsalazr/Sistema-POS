<template>
  <section class="page">
    <div class="page-header">
      <div>
        <div class="page-title">Reportes</div>
        <div class="page-subtitle">Ventas al contado por fecha, usuario e items vendidos.</div>
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
          <v-col cols="12" md="3">
            <v-select
              v-model="filtros.idUsuario"
              :items="usuarios"
              item-title="nombre"
              item-value="idUsuario"
              label="Usuario"
              clearable
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-autocomplete
              v-model="filtros.idProductos"
              :items="productos"
              item-title="descripcion"
              item-value="idProducto"
              label="Items vendidos"
              multiple
              chips
              closable-chips
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

    <template v-if="mostrarResumenItems">
      <v-row class="mb-4">
        <v-col cols="12" md="4">
          <v-card class="data-card item-card" variant="flat" border>
            <v-card-text>
              <div class="metric-label">Cantidad items filtrados</div>
              <div class="metric-value">{{ number(resumenItems.cantidad) }}</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="4">
          <v-card class="data-card item-card" variant="flat" border>
            <v-card-text>
              <div class="metric-label">Total vendido items</div>
              <div class="metric-value">{{ currency(resumenItems.totalVendido) }}</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="4">
          <v-card class="data-card item-card" variant="flat" border>
            <v-card-text>
              <div class="metric-label">Total pagado items</div>
              <div class="metric-value">{{ currency(resumenItems.totalPagado) }}</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <v-card class="data-card mb-4" variant="flat" border>
                <v-card-title class="table-title">
          <span>Totalizacion por item</span>
          <v-btn size="small" variant="tonal" prepend-icon="mdi-file-excel" :disabled="!resumenItems.items.length" @click="exportarTotalizacionItems">
            Excel
          </v-btn>
        </v-card-title>
        <v-data-table
          :headers="itemHeaders"
          :items="resumenItems.items"
          density="comfortable"
          hover
          @click:row="abrirDetalleItem"
        >
          <template #item.cantidad="{ item }">{{ number(item.cantidad) }}</template>
          <template #item.totalVendido="{ item }">{{ currency(item.totalVendido) }}</template>
          <template #item.totalPagado="{ item }">{{ currency(item.totalPagado) }}</template>
        </v-data-table>
      </v-card>
    </template>

    <v-dialog v-model="detalleItemDialog" max-width="1040">
      <v-card>
        <v-card-title class="d-flex align-center">
          <span>Ventas de {{ itemSeleccionado?.descripcion }}</span>
          <v-spacer />
          <v-btn class="mr-2" size="small" variant="tonal" prepend-icon="mdi-file-excel" :disabled="!(itemSeleccionado?.ventas || []).length" @click="exportarVentasItem">
            Excel
          </v-btn>
          <v-btn icon="mdi-close" variant="text" @click="detalleItemDialog = false" />
        </v-card-title>
        <v-card-text>
          <v-row class="mb-4" v-if="itemSeleccionado">
            <v-col cols="12" md="4">
              <v-card class="data-card item-card" variant="flat" border>
                <v-card-text>
                  <div class="metric-label">Cantidad</div>
                  <div class="metric-value">{{ number(itemSeleccionado.cantidad) }}</div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="4">
              <v-card class="data-card item-card" variant="flat" border>
                <v-card-text>
                  <div class="metric-label">Total vendido</div>
                  <div class="metric-value">{{ currency(itemSeleccionado.totalVendido) }}</div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="4">
              <v-card class="data-card item-card" variant="flat" border>
                <v-card-text>
                  <div class="metric-label">Total pagado</div>
                  <div class="metric-value">{{ currency(itemSeleccionado.totalPagado) }}</div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <v-data-table :headers="detalleItemHeaders" :items="itemSeleccionado?.ventas || []" density="comfortable" item-value="idVenta">
            <template #item.fecha="{ item }">{{ formatDate(item.fecha) }}</template>
            <template #item.cantidad="{ item }">{{ number(item.cantidad) }}</template>
            <template #item.totalVendido="{ item }">{{ currency(item.totalVendido) }}</template>
            <template #item.totalPagado="{ item }">{{ currency(item.totalPagado) }}</template>
            <template #item.estadoPago="{ item }">
              <v-chip :color="estadoPagoColor(item.estadoPago)" size="small">{{ item.estadoPago }}</v-chip>
            </template>
            <template #item.estadoPreparacion="{ item }">
              <v-chip :color="estadoPreparacionColor(item.estadoPreparacion)" size="small">{{ item.estadoPreparacion || 'PENDIENTE' }}</v-chip>
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-card class="data-card" variant="flat" border>
            <v-card-title class="table-title">
        <span>Ventas al contado</span>
        <v-btn size="small" variant="tonal" prepend-icon="mdi-file-excel" :disabled="!ventas.length" @click="exportarVentasContado">
          Excel
        </v-btn>
      </v-card-title>
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
import { formatLocalDateTime } from '../dates.js';

const loading = ref(false);
const ventas = ref([]);
const usuarios = ref([]);
const productos = ref([]);
const resumen = ref({ cantidad: 0, total: 0, pago: 0 });
const resumenItems = ref({ cantidad: 0, totalVendido: 0, totalPagado: 0, items: [] });
const mostrarResumenItems = ref(false);
const detalleItemDialog = ref(false);
const itemSeleccionado = ref(null);
const filtros = reactive({ desde: today(), hasta: today(), idUsuario: null, idProductos: [] });

const headers = [
  { title: 'Folio', key: 'idVenta' },
  { title: 'Fecha', key: 'fecha' },
  { title: 'Cliente', key: 'cliente' },
  { title: 'Usuario', key: 'usuario' },
  { title: 'Productos', key: 'cantidadProductos' },
  { title: 'Total', key: 'monto' },
  { title: 'Pago', key: 'pago' }
];

const itemHeaders = [
  { title: 'Item', key: 'descripcion' },
  { title: 'Cantidad vendida', key: 'cantidad' },
  { title: 'Total vendido', key: 'totalVendido' },
  { title: 'Total pagado', key: 'totalPagado' }
];

const detalleItemHeaders = [
  { title: 'Venta', key: 'idVenta' },
  { title: 'Fecha', key: 'fecha' },
  { title: 'Cliente', key: 'cliente' },
  { title: 'Usuario', key: 'usuario' },
  { title: 'Cantidad', key: 'cantidad' },
  { title: 'Total item', key: 'totalVendido' },
  { title: 'Pagado item', key: 'totalPagado' },
  { title: 'Pago', key: 'estadoPago' },
  { title: 'Pedido', key: 'estadoPreparacion' }
];

const totalizacionItemExcelColumns = [
  { title: 'Item', value: (item) => item.descripcion },
  { title: 'Cantidad vendida', value: (item) => item.cantidad },
  { title: 'Total vendido', value: (item) => item.totalVendido },
  { title: 'Total pagado', value: (item) => item.totalPagado }
];

const ventasExcelColumns = [
  { title: 'Venta', value: (item) => item.idVenta },
  { title: 'Fecha', value: (item) => formatDate(item.fecha) },
  { title: 'Cliente', value: (item) => item.cliente },
  { title: 'Usuario', value: (item) => item.usuario },
  { title: 'Productos', value: (item) => item.cantidadProductos },
  { title: 'Total', value: (item) => item.monto },
  { title: 'Pago', value: (item) => item.pago },
  { title: 'Saldo', value: (item) => item.saldo },
  { title: 'Estado pago', value: (item) => item.estadoPago },
  { title: 'Estado pedido', value: (item) => item.estadoPreparacion || 'PENDIENTE' }
];

const ventasItemExcelColumns = [
  { title: 'Venta', value: (item) => item.idVenta },
  { title: 'Fecha', value: (item) => formatDate(item.fecha) },
  { title: 'Cliente', value: (item) => item.cliente },
  { title: 'Usuario', value: (item) => item.usuario },
  { title: 'Cantidad', value: (item) => item.cantidad },
  { title: 'Precio unitario', value: (item) => item.precioVenta },
  { title: 'Total item', value: (item) => item.totalVendido },
  { title: 'Pagado item', value: (item) => item.totalPagado },
  { title: 'Estado pago', value: (item) => item.estadoPago },
  { title: 'Estado pedido', value: (item) => item.estadoPreparacion || 'PENDIENTE' }
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function currency(value) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value || 0);
}

function number(value) {
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(value || 0);
}

function formatDate(value) {
  return formatLocalDateTime(value);
}

function estadoPagoColor(estado) {
  if (estado === 'PAGADA') return 'success';
  if (estado === 'PARCIAL') return 'warning';
  return 'error';
}

function estadoPreparacionColor(estado) {
  if (estado === 'CUMPLIDO') return 'success';
  return 'warning';
}

function abrirDetalleItem(_event, row) {
  itemSeleccionado.value = row.item;
  detalleItemDialog.value = true;
}

function exportarTotalizacionItems() {
  descargarExcel('totalizacion-por-item', resumenItems.value.items, totalizacionItemExcelColumns);
}

function exportarVentasContado() {
  descargarExcel('ventas-al-contado', ventas.value, ventasExcelColumns);
}

function exportarVentasItem() {
  const item = itemSeleccionado.value;
  if (!item) return;
  descargarExcel(`ventas-${slug(item.descripcion || 'item')}`, item.ventas || [], ventasItemExcelColumns);
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

function slug(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'item';
}

function queryString() {
  const params = new URLSearchParams({ resumen: '1', limite: 'todos' });
  if (filtros.desde) params.set('desde', filtros.desde);
  if (filtros.hasta) params.set('hasta', filtros.hasta);
  if (filtros.idUsuario) params.set('idUsuario', filtros.idUsuario);
  for (const idProducto of filtros.idProductos || []) params.append('idProducto', idProducto);
  return params.toString();
}

async function load() {
  loading.value = true;
  const consultarItems = Array.isArray(filtros.idProductos) && filtros.idProductos.length > 0;
  try {
    const payload = await api.get(`/ventas/contado?${queryString()}`);
    ventas.value = payload.ventas;
    resumen.value = payload.resumen;
    resumenItems.value = consultarItems
      ? payload.resumenItems || { cantidad: 0, totalVendido: 0, totalPagado: 0, items: [] }
      : { cantidad: 0, totalVendido: 0, totalPagado: 0, items: [] };
    mostrarResumenItems.value = consultarItems;
    if (itemSeleccionado.value) {
      itemSeleccionado.value = resumenItems.value.items.find((item) => item.idProducto === itemSeleccionado.value.idProducto) || null;
      if (!itemSeleccionado.value) detalleItemDialog.value = false;
    }
  } finally {
    loading.value = false;
  }
}

function limpiar() {
  filtros.desde = '';
  filtros.hasta = '';
  filtros.idUsuario = null;
  filtros.idProductos = [];
  load();
}

onMounted(async () => {
  const [usuariosPayload, productosPayload] = await Promise.all([
    api.get('/usuarios'),
    api.get('/productos')
  ]);
  usuarios.value = usuariosPayload;
  productos.value = productosPayload;
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

.table-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
</style>