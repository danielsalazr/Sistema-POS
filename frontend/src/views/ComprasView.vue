<template>
  <section class="page">
    <div class="page-header">
      <div>
        <div class="page-title">Compras</div>
        <div class="page-subtitle">Registra entradas de inventario por proveedor.</div>
      </div>
      <v-btn color="primary" prepend-icon="mdi-refresh" @click="loadHistorial">Actualizar historial</v-btn>
    </div>

    <v-row>
      <v-col cols="12" lg="7">
        <v-card class="data-card" variant="flat" border>
          <v-card-title>{{ compraEditando ? `Editando compra ${compraEditando.idCompra}` : 'Nueva compra' }}</v-card-title>
          <v-card-text>
            <v-alert v-if="compraEditando" class="mb-4" type="info" variant="tonal" density="compact">
              Al guardar se revierte el inventario anterior de la compra y se aplica el nuevo detalle.
            </v-alert>
            <v-row>
              <v-col cols="12" md="4">
                <v-text-field v-model="fechaMovimiento" label="Fecha del movimiento" type="date" />
              </v-col>
              <v-col cols="12" md="5">
                <v-autocomplete
                  v-model="proveedorSeleccionado"
                  v-model:search="busquedaProveedor"
                  :items="proveedores"
                  :loading="cargandoProveedores"
                  item-title="nombre"
                  item-value="idProveedor"
                  label="Proveedor"
                  prepend-inner-icon="mdi-factory"
                  return-object
                  @update:search="buscarProveedores"
                />
              </v-col>
              <v-col cols="12" md="7">
                <v-autocomplete
                  v-model="productoPendiente"
                  v-model:search="busquedaProducto"
                  :items="productos"
                  :loading="cargandoProductos"
                  item-title="descripcion"
                  item-value="idProducto"
                  label="Producto"
                  prepend-inner-icon="mdi-magnify"
                  return-object
                  clearable
                  @update:search="buscarProductos"
                />
              </v-col>
            </v-row>

            <v-row>
              <v-col cols="12" md="4">
                <v-text-field v-model="descripcionPendiente" label="Descripcion libre" placeholder="Fresas, banano, Nutella..." />
              </v-col>
              <v-col cols="6" md="3">
                <v-text-field v-model.number="cantidadPendiente" label="Cantidad" min="1" type="number" />
              </v-col>
              <v-col cols="6" md="3">
                <v-text-field v-model.number="costoPendiente" label="Costo" min="0" type="number" />
              </v-col>
              <v-col cols="6" md="2">
                <v-text-field v-model.number="precioVentaPendiente" label="Precio venta" min="0" type="number" />
              </v-col>
              <v-col cols="6" md="3">
                <v-btn block class="mt-1" color="primary" prepend-icon="mdi-plus" :disabled="!puedeAgregarItem" @click="agregarProductoPendiente">
                  Agregar
                </v-btn>
              </v-col>
            </v-row>

            <v-table density="comfortable">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th class="text-right">Costo</th>
                  <th class="text-right">Cantidad</th>
                  <th class="text-right">Subtotal</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="carrito.length === 0">
                  <td colspan="5" class="empty-row">Agrega productos para registrar la compra.</td>
                </tr>
                <tr v-for="item in carrito" :key="item.idProducto">
                  <td>
                    <div>{{ item.descripcion }}</div>
                    <div class="text-caption text-medium-emphasis">{{ item.idProducto ? 'Inventario' : 'Insumo libre' }}</div>
                  </td>
                  <td class="text-right">{{ currency(item.precioCompra) }}</td>
                  <td class="text-right qty-cell">
                    <v-text-field v-model.number="item.cantidadComprada" type="number" min="1" density="compact" hide-details />
                  </td>
                  <td class="text-right">{{ currency(item.precioCompra * item.cantidadComprada) }}</td>
                  <td class="text-right">
                    <v-btn icon="mdi-delete" color="error" size="small" variant="text" @click="quitarProducto(item)" />
                  </td>
                </tr>
              </tbody>
            </v-table>
          </v-card-text>

          <v-divider />

          <v-card-text>
            <v-row align="center">
              <v-col cols="12" md="4">
                <v-text-field v-model.number="pago" label="Pago" type="number" prepend-inner-icon="mdi-cash" />
              </v-col>
              <v-col cols="12" md="8">
                <div class="totals">
                  <div><span>Total compra</span><strong>{{ currency(total) }}</strong></div>
                  <div><span>Saldo</span><strong>{{ currency(saldoCompra) }}</strong></div>
                </div>
              </v-col>
            </v-row>
          </v-card-text>

          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="limpiar">Limpiar</v-btn>
            <v-btn v-if="compraEditando" variant="text" color="secondary" @click="cancelarEdicion">Cancelar edicion</v-btn>
            <v-btn color="primary" prepend-icon="mdi-check" :loading="guardando" :disabled="!puedeGuardar" @click="registrarCompra">
              {{ compraEditando ? 'Actualizar compra' : 'Registrar compra' }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>

      <v-col cols="12" lg="5">
        <v-card class="data-card" variant="flat" border>
          <v-card-title>Ultimas compras</v-card-title>
          <v-data-table :key="historialKey" :headers="headers" :items="compras" :loading="cargandoCompras" item-value="idCompra" density="comfortable">
            <template #item.monto="{ item }">{{ currency(item.monto) }}</template>
            <template #item.fecha="{ item }">{{ formatDate(item.fecha) }}</template>
            <template #item.actions="{ item }">
              <v-btn icon="mdi-eye" size="small" variant="text" @click="verDetalle(item)" />
              <v-btn icon="mdi-pencil" size="small" variant="text" @click="editarCompra(item)" />
              <v-btn icon="mdi-cancel" size="small" color="error" variant="text" @click="anularCompra(item)" />
            </template>
          </v-data-table>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="detalleDialog" max-width="820">
      <v-card>
        <v-card-title class="d-flex align-center">
          <span>Compra {{ detalle?.idCompra }}</span>
          <v-spacer />
          <v-btn icon="mdi-pencil" variant="text" @click="editarCompra(detalle)" />
          <v-btn icon="mdi-close" variant="text" @click="detalleDialog = false" />
        </v-card-title>
        <v-card-text v-if="detalle">
          <v-list density="compact">
            <v-list-item title="Proveedor" :subtitle="detalle.proveedor" />
            <v-list-item title="Usuario" :subtitle="detalle.usuario" />
            <v-list-item title="Fecha del movimiento" :subtitle="formatDate(detalle.fecha)" />
            <v-list-item title="Fecha de registro" :subtitle="formatDate(detalle.fechaRegistro)" />
          </v-list>
          <v-table density="comfortable">
            <thead>
              <tr>
                <th>Producto</th>
                <th class="text-right">Cantidad</th>
                <th class="text-right">Costo</th>
                <th class="text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="producto in detalle.productos" :key="producto.idProducto">
                <td>{{ producto.descripcion }}</td>
                <td class="text-right">{{ producto.cantidadComprada }}</td>
                <td class="text-right">{{ currency(producto.precioCompra) }}</td>
                <td class="text-right">{{ currency(producto.precioCompra * producto.cantidadComprada) }}</td>
              </tr>
            </tbody>
          </v-table>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar.visible" :color="snackbar.color" timeout="3500">{{ snackbar.text }}</v-snackbar>
  </section>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue';
import { api } from '../api.js';
import { formatLocalDateTime, inputToSql, sqlToDateInput, todayDateInput } from '../dates.js';
import { session } from '../session.js';

const productos = ref([]);
const proveedores = ref([]);
const compras = ref([]);
const carrito = ref([]);
const productoPendiente = ref(null);
const proveedorSeleccionado = ref(null);
const busquedaProducto = ref('');
const busquedaProveedor = ref('');
const descripcionPendiente = ref('');
const fechaMovimiento = ref(todayDateInput());
const cantidadPendiente = ref(1);
const costoPendiente = ref(0);
const precioVentaPendiente = ref(0);
const pago = ref(0);
const cargandoProductos = ref(false);
const cargandoProveedores = ref(false);
const cargandoCompras = ref(false);
const guardando = ref(false);
const detalleDialog = ref(false);
const historialKey = ref(0);
const detalle = ref(null);
const compraEditando = ref(null);
const snackbar = ref({ visible: false, text: '', color: 'success' });

const headers = [
  { title: 'Folio', key: 'idCompra' },
  { title: 'Proveedor', key: 'proveedor' },
  { title: 'Total', key: 'monto' },
  { title: 'Fecha', key: 'fecha' },
  { title: '', key: 'actions', sortable: false, align: 'end' }
];

const total = computed(() => carrito.value.reduce((sum, item) => sum + Number(item.precioCompra || 0) * Number(item.cantidadComprada || 0), 0));
const saldoCompra = computed(() => Math.max(total.value - Number(pago.value || 0), 0));
const puedeGuardar = computed(() => carrito.value.length > 0 && proveedorSeleccionado.value && Number(pago.value || 0) >= 0);
const puedeAgregarItem = computed(() => productoPendiente.value || descripcionPendiente.value.trim());

function currency(value) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value || 0);
}

function formatDate(value) {
  return formatLocalDateTime(value);
}

function notify(text, color = 'success') {
  snackbar.value = { visible: true, text, color };
}

async function buscarProductos() {
  cargandoProductos.value = true;
  try {
    productos.value = await api.get(`/productos?q=${encodeURIComponent(busquedaProducto.value || '')}`);
  } finally {
    cargandoProductos.value = false;
  }
}

async function buscarProveedores() {
  cargandoProveedores.value = true;
  try {
    proveedores.value = await api.get(`/proveedores?q=${encodeURIComponent(busquedaProveedor.value || '')}`);
  } finally {
    cargandoProveedores.value = false;
  }
}

async function loadHistorial() {
  cargandoCompras.value = true;
  try {
    compras.value = await api.get('/compras');
    historialKey.value += 1;
  } finally {
    cargandoCompras.value = false;
  }
}

async function refrescarCompras() {
  await loadHistorial();
  if (detalleDialog.value && detalle.value?.idCompra) {
    detalle.value = await api.get(`/compras/${detalle.value.idCompra}`);
  }
}

async function agregarProductoPendiente() {
  if (!puedeAgregarItem.value) return;
  const descripcion = descripcionPendiente.value.trim() || productoPendiente.value.descripcion;
  const idProducto = productoPendiente.value?.idProducto || null;
  const existente = idProducto ? carrito.value.find((item) => item.idProducto === idProducto) : null;
  const cantidad = Math.max(Number(cantidadPendiente.value || 1), 1);
  if (existente) {
    existente.cantidadComprada += cantidad;
    existente.precioCompra = Number(costoPendiente.value || existente.precioCompra);
    existente.precioVenta = Number(precioVentaPendiente.value || existente.precioVenta);
  } else {
    carrito.value.push({
      idProducto,
      codigoBarras: productoPendiente.value?.codigoBarras || '',
      descripcion,
      cantidadComprada: cantidad,
      precioCompra: Number(costoPendiente.value || productoPendiente.value?.precioCompra || 0),
      precioVenta: Number(precioVentaPendiente.value || productoPendiente.value?.precioVenta || 0)
    });
  }
  productoPendiente.value = null;
  descripcionPendiente.value = '';
  cantidadPendiente.value = 1;
  costoPendiente.value = 0;
  precioVentaPendiente.value = 0;
  busquedaProducto.value = '';
  await nextTick();
  pago.value = total.value;
}

function quitarProducto(producto) {
  carrito.value = carrito.value.filter((item) => item.idProducto !== producto.idProducto);
  nextTick(() => {
    pago.value = total.value;
  });
}

function limpiar() {
  carrito.value = [];
  pago.value = 0;
  productoPendiente.value = null;
  proveedorSeleccionado.value = null;
  busquedaProducto.value = '';
  busquedaProveedor.value = '';
  descripcionPendiente.value = '';
  cantidadPendiente.value = 1;
  costoPendiente.value = 0;
  precioVentaPendiente.value = 0;
  fechaMovimiento.value = todayDateInput();
}

function cancelarEdicion() {
  compraEditando.value = null;
  limpiar();
}

async function registrarCompra() {
  guardando.value = true;
  try {
    const payload = {
      idProveedor: proveedorSeleccionado.value.idProveedor,
      idUsuario: session.usuario.idUsuario,
      fechaMovimiento: inputToSql(fechaMovimiento.value),
      pago: Number(pago.value),
      productos: carrito.value.map((item) => ({
        idProducto: item.idProducto,
        descripcion: item.descripcion,
        codigoBarras: item.codigoBarras,
        cantidadComprada: Number(item.cantidadComprada),
        precioCompra: Number(item.precioCompra),
        precioVenta: Number(item.precioVenta)
      }))
    };
    const compra = compraEditando.value
      ? await api.put(`/compras/${compraEditando.value.idCompra}`, payload)
      : await api.post('/compras', payload);
    notify(`Compra ${compra.idCompra} ${compraEditando.value ? 'actualizada' : 'registrada'}`);
    compraEditando.value = null;
    limpiar();
    await Promise.all([buscarProductos(), refrescarCompras()]);
  } catch (err) {
    notify(err.message, 'error');
  } finally {
    guardando.value = false;
  }
}

async function verDetalle(compra) {
  try {
    detalle.value = await api.get(`/compras/${compra.idCompra}`);
    detalleDialog.value = true;
  } catch (err) {
    notify(err.message, 'error');
  }
}

async function editarCompra(compra) {
  try {
    const compraCompleta = compra.productos ? compra : await api.get(`/compras/${compra.idCompra}`);
    compraEditando.value = compraCompleta;
    proveedorSeleccionado.value = proveedores.value.find((proveedor) => proveedor.idProveedor === compraCompleta.idProveedor) || {
      idProveedor: compraCompleta.idProveedor,
      nombre: compraCompleta.proveedor
    };
    carrito.value = compraCompleta.productos.map((producto) => ({
      idProducto: producto.idProducto,
      codigoBarras: producto.codigoBarras || '',
      descripcion: producto.descripcion,
      cantidadComprada: producto.cantidadComprada,
      precioCompra: producto.precioCompra,
      precioVenta: producto.precioVenta
    }));
    pago.value = compraCompleta.pago;
    fechaMovimiento.value = sqlToDateInput(compraCompleta.fecha);
    detalleDialog.value = false;
    notify(`Compra ${compraCompleta.idCompra} cargada para edicion`, 'info');
  } catch (err) {
    notify(err.message, 'error');
  }
}

async function anularCompra(compra) {
  try {
    await api.delete(`/compras/${compra.idCompra}`);
    notify(`Compra ${compra.idCompra} anulada`);
    await Promise.all([buscarProductos(), refrescarCompras()]);
  } catch (err) {
    notify(err.message, 'error');
  }
}

onMounted(async () => {
  await Promise.all([buscarProductos(), buscarProveedores(), loadHistorial()]);
});
</script>

<style scoped>
.empty-row {
  color: #667085;
  padding: 28px 16px;
  text-align: center;
}

.qty-cell {
  width: 120px;
}

.totals {
  display: flex;
  justify-content: flex-end;
  gap: 32px;
}

.totals div {
  display: grid;
  gap: 4px;
  text-align: right;
}

.totals span {
  color: #667085;
  font-size: 0.9rem;
}

.totals strong {
  font-size: 1.35rem;
}
</style>
