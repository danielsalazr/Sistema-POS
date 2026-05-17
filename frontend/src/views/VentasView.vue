<template>
  <section class="page">
    <div class="page-header">
      <div>
        <div class="page-title">Ventas al contado</div>
        <div class="page-subtitle">Busca productos, cobra y descuenta inventario.</div>
      </div>
      <v-btn color="primary" prepend-icon="mdi-refresh" @click="loadHistorial">Actualizar historial</v-btn>
    </div>

    <v-row>
      <v-col cols="12" lg="7">
        <v-card class="data-card" variant="flat" border>
          <v-card-title>{{ ventaEditando ? `Editando venta ${ventaEditando.idVenta}` : 'Nueva venta' }}</v-card-title>
          <v-card-text>
            <v-alert v-if="ventaEditando" class="mb-4" type="info" variant="tonal" density="compact">
              Editando venta {{ ventaEditando.idVenta }}. Al guardar se recalcula el inventario.
            </v-alert>
            <v-row>
              <v-col cols="12" md="6">
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
                >
                  <template #item="{ props, item }">
                    <v-list-item
                      v-bind="props"
                      :subtitle="`${item.raw.codigoBarras || 'Sin codigo'} | Existencia: ${item.raw.existencia}`"
                    />
                  </template>
                </v-autocomplete>
              </v-col>
              <v-col cols="6" md="2">
                <v-text-field
                  v-model.number="cantidadPendiente"
                  label="Cantidad"
                  min="1"
                  type="number"
                  @keyup.enter="agregarProductoPendiente"
                />
              </v-col>
              <v-col cols="6" md="2">
                <v-btn
                  block
                  class="mt-1"
                  color="primary"
                  prepend-icon="mdi-cart-plus"
                  :disabled="!productoPendiente"
                  @click="agregarProductoPendiente"
                >
                  Agregar
                </v-btn>
              </v-col>
              <v-col cols="12" md="2">
                <v-autocomplete
                  v-model="clienteSeleccionado"
                  v-model:search="busquedaCliente"
                  :items="clientes"
                  :loading="cargandoClientes"
                  item-title="nombreCompleto"
                  item-value="idCliente"
                  label="Cliente"
                  prepend-inner-icon="mdi-account"
                  return-object
                  @update:search="buscarClientes"
                />
              </v-col>
            </v-row>

            <v-table density="comfortable">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th class="text-right">Precio</th>
                  <th class="text-right">Cantidad</th>
                  <th class="text-right">Subtotal</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="carrito.length === 0">
                  <td colspan="5" class="empty-row">Agrega productos para iniciar la venta.</td>
                </tr>
                <tr v-for="item in carrito" :key="item.idProducto">
                  <td>
                    <div class="font-weight-medium">{{ item.descripcion }}</div>
                    <div class="text-caption text-medium-emphasis">{{ item.codigoBarras || 'Sin codigo' }}</div>
                  </td>
                  <td class="text-right">{{ currency(item.precioVenta) }}</td>
                  <td class="text-right qty-cell">
                    <v-text-field
                      v-model.number="item.cantidadVendida"
                      type="number"
                      min="1"
                      :max="item.existencia"
                      density="compact"
                      hide-details
                    />
                  </td>
                  <td class="text-right">{{ currency(item.precioVenta * item.cantidadVendida) }}</td>
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
              <v-col cols="12" md="7">
                <div class="payments-header">
                  <v-switch v-model="registrarPagoInicial" label="Registrar pago inicial" color="primary" density="compact" hide-details />
                  <v-btn v-if="registrarPagoInicial" size="small" variant="tonal" prepend-icon="mdi-plus" @click="agregarPago">Agregar pago</v-btn>
                </div>
                <v-row v-if="registrarPagoInicial" v-for="(pagoItem, index) in pagos" :key="index" dense>
                  <v-col cols="12" md="5">
                    <v-select
                      v-model="pagoItem.idMedioPago"
                      :items="mediosPago"
                      item-title="nombre"
                      item-value="idMedioPago"
                      label="Medio"
                      density="compact"
                    />
                  </v-col>
                  <v-col cols="8" md="4">
                    <v-text-field v-model.number="pagoItem.monto" label="Monto" type="number" density="compact" />
                  </v-col>
                  <v-col cols="4" md="2">
                    <v-text-field v-model="pagoItem.referencia" label="Ref." density="compact" />
                  </v-col>
                  <v-col cols="12" md="1" class="text-right">
                    <v-btn icon="mdi-delete" color="error" size="small" variant="text" :disabled="pagos.length === 1" @click="quitarPago(index)" />
                  </v-col>
                </v-row>
              </v-col>
              <v-col cols="12" md="5">
                <div class="totals">
                  <div>
                    <span>Total</span>
                    <strong>{{ currency(total) }}</strong>
                  </div>
                  <div>
                    <span>Pagado</span>
                    <strong>{{ currency(pagoInicialTotal) }}</strong>
                  </div>
                  <div>
                    <span>Cambio</span>
                    <strong>{{ currency(cambio) }}</strong>
                  </div>
                  <div>
                    <span>Saldo</span>
                    <strong>{{ currency(saldo) }}</strong>
                  </div>
                </div>
              </v-col>
            </v-row>
          </v-card-text>

          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="limpiarVenta">Limpiar</v-btn>
            <v-btn v-if="ventaEditando" variant="text" color="secondary" @click="cancelarEdicion">Cancelar edicion</v-btn>
            <v-btn color="primary" prepend-icon="mdi-check" :loading="guardando" :disabled="!puedeCobrar" @click="registrarVenta">
              {{ ventaEditando ? 'Actualizar venta' : 'Registrar venta' }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>

      <v-col cols="12" lg="5">
        <v-card class="data-card" variant="flat" border>
          <v-card-title>Ultimas ventas</v-card-title>
          <v-data-table :headers="headers" :items="ventas" :loading="cargandoVentas" item-value="idVenta" density="comfortable">
            <template #item.monto="{ item }">{{ currency(item.monto) }}</template>
            <template #item.saldo="{ item }">{{ currency(Math.max(item.saldo || 0, 0)) }}</template>
            <template #item.estadoPago="{ item }">
              <v-chip :color="estadoPagoColor(item.estadoPago)" size="small">{{ item.estadoPago }}</v-chip>
            </template>
            <template #item.fecha="{ item }">{{ formatDate(item.fecha) }}</template>
            <template #item.actions="{ item }">
              <v-btn icon="mdi-eye" size="small" variant="text" @click="verDetalle(item)" />
              <v-btn icon="mdi-cash-plus" size="small" variant="text" color="success" :disabled="item.estadoPago === 'PAGADA'" @click="abrirPagoVenta(item)" />
              <v-btn icon="mdi-pencil" size="small" variant="text" @click="editarVenta(item)" />
              <v-btn icon="mdi-cancel" size="small" color="error" variant="text" @click="anularVenta(item)" />
            </template>
          </v-data-table>
        </v-card>
      </v-col>
    </v-row>

    <v-snackbar v-model="snackbar.visible" :color="snackbar.color" timeout="3500">
      {{ snackbar.text }}
    </v-snackbar>

    <v-dialog v-model="detalleDialog" max-width="860">
      <v-card>
        <v-card-title class="d-flex align-center">
          <span>Venta {{ detalle?.idVenta }}</span>
          <v-spacer />
          <v-btn icon="mdi-printer" variant="text" @click="imprimirTicket" />
          <v-btn icon="mdi-pencil" variant="text" @click="editarVenta(detalle)" />
          <v-btn icon="mdi-close" variant="text" @click="detalleDialog = false" />
        </v-card-title>
        <v-card-text v-if="detalle">
          <v-row class="mb-2">
            <v-col cols="12" md="6">
              <v-list density="compact">
                <v-list-item title="Cliente" :subtitle="detalle.cliente" />
                <v-list-item title="Telefono" :subtitle="detalle.numeroTelefono || 'Sin telefono'" />
              </v-list>
            </v-col>
            <v-col cols="12" md="6">
              <v-list density="compact">
                <v-list-item title="Usuario" :subtitle="detalle.usuario" />
                <v-list-item title="Fecha" :subtitle="formatDate(detalle.fecha)" />
                <v-list-item title="Estado de pago" :subtitle="detalle.estadoPago" />
              </v-list>
            </v-col>
          </v-row>

          <v-table density="comfortable">
            <thead>
              <tr>
                <th>Producto</th>
                <th class="text-right">Cantidad</th>
                <th class="text-right">Precio</th>
                <th class="text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="producto in detalle.productos" :key="`${producto.idProducto}-${producto.descripcion}`">
                <td>
                  <div class="font-weight-medium">{{ producto.descripcion }}</div>
                  <div class="text-caption text-medium-emphasis">{{ producto.codigoBarras || 'Sin codigo' }}</div>
                </td>
                <td class="text-right">{{ producto.cantidadVendida }}</td>
                <td class="text-right">{{ currency(producto.precioVenta) }}</td>
                <td class="text-right">{{ currency(producto.precioVenta * producto.cantidadVendida) }}</td>
              </tr>
            </tbody>
          </v-table>

          <v-table density="compact" class="mt-4">
            <thead>
              <tr>
                <th>Medio de pago</th>
                <th>Referencia</th>
                <th class="text-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="pagoItem in detalle.pagos || []" :key="pagoItem.idPagoVenta">
                <td>{{ pagoItem.medioPago }}</td>
                <td>{{ pagoItem.referencia || '-' }}</td>
                <td class="text-right">{{ currency(pagoItem.monto) }}</td>
              </tr>
            </tbody>
          </v-table>

          <div class="detalle-totales">
            <div><span>Total</span><strong>{{ currency(detalle.monto) }}</strong></div>
            <div><span>Pago</span><strong>{{ currency(detalle.pago) }}</strong></div>
            <div><span>Saldo</span><strong>{{ currency(Math.max(detalle.monto - detalle.pago, 0)) }}</strong></div>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog v-model="pagoDialog" max-width="720">
      <v-card>
        <v-card-title>Registrar pago venta {{ ventaParaPagar?.idVenta }}</v-card-title>
        <v-card-text>
          <v-alert class="mb-4" type="info" variant="tonal" density="compact">
            Saldo actual: {{ currency(ventaParaPagar?.saldo || 0) }}
          </v-alert>
          <div class="payments-header">
            <div class="font-weight-medium">Pagos recibidos</div>
            <v-btn size="small" variant="tonal" prepend-icon="mdi-plus" @click="agregarPagoPosterior">Agregar pago</v-btn>
          </div>
          <v-row v-for="(pagoItem, index) in pagosPosteriores" :key="index" dense>
            <v-col cols="12" md="5">
              <v-select v-model="pagoItem.idMedioPago" :items="mediosPago" item-title="nombre" item-value="idMedioPago" label="Medio" />
            </v-col>
            <v-col cols="8" md="4">
              <v-text-field v-model.number="pagoItem.monto" label="Monto" type="number" />
            </v-col>
            <v-col cols="4" md="2">
              <v-text-field v-model="pagoItem.referencia" label="Ref." />
            </v-col>
            <v-col cols="12" md="1" class="text-right">
              <v-btn icon="mdi-delete" color="error" size="small" variant="text" :disabled="pagosPosteriores.length === 1" @click="quitarPagoPosterior(index)" />
            </v-col>
          </v-row>
          <div class="detalle-totales">
            <div><span>Nuevo pago</span><strong>{{ currency(totalPagoPosterior) }}</strong></div>
            <div><span>Saldo despues</span><strong>{{ currency(Math.max((ventaParaPagar?.saldo || 0) - totalPagoPosterior, 0)) }}</strong></div>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="pagoDialog = false">Cancelar</v-btn>
          <v-btn color="primary" :loading="guardandoPagoPosterior" :disabled="!puedeGuardarPagoPosterior" @click="registrarPagoPosterior">
            Guardar pago
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </section>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { api } from '../api.js';
import { session } from '../session.js';

const productos = ref([]);
const clientes = ref([]);
const ventas = ref([]);
const mediosPago = ref([]);
const carrito = ref([]);
const pagos = ref([]);
const pagosPosteriores = ref([]);
const productoPendiente = ref(null);
const cantidadPendiente = ref(1);
const clienteSeleccionado = ref(null);
const busquedaProducto = ref('');
const busquedaCliente = ref('');
const cargandoProductos = ref(false);
const cargandoClientes = ref(false);
const cargandoVentas = ref(false);
const guardando = ref(false);
const detalleDialog = ref(false);
const pagoDialog = ref(false);
const detalle = ref(null);
const ventaEditando = ref(null);
const ventaParaPagar = ref(null);
const registrarPagoInicial = ref(true);
const guardandoPagoPosterior = ref(false);
const snackbar = ref({ visible: false, text: '', color: 'success' });

const headers = [
  { title: 'Folio', key: 'idVenta' },
  { title: 'Cliente', key: 'cliente' },
  { title: 'Total', key: 'monto' },
  { title: 'Saldo', key: 'saldo' },
  { title: 'Estado', key: 'estadoPago' },
  { title: 'Fecha', key: 'fecha' },
  { title: '', key: 'actions', sortable: false, align: 'end' }
];

const total = computed(() => carrito.value.reduce((sum, item) => sum + Number(item.precioVenta || 0) * Number(item.cantidadVendida || 0), 0));
const pagoTotal = computed(() => pagos.value.reduce((sum, item) => sum + Number(item.monto || 0), 0));
const pagoInicialTotal = computed(() => registrarPagoInicial.value ? pagoTotal.value : 0);
const cambio = computed(() => Math.max(pagoInicialTotal.value - total.value, 0));
const saldo = computed(() => Math.max(total.value - pagoInicialTotal.value, 0));
const puedeCobrar = computed(() => (
  carrito.value.length > 0 &&
  clienteSeleccionado.value &&
  (!registrarPagoInicial.value || (
    pagos.value.length > 0 &&
    pagos.value.every((pagoItem) => pagoItem.idMedioPago && Number(pagoItem.monto || 0) > 0)
  ))
));
const totalPagoPosterior = computed(() => pagosPosteriores.value.reduce((sum, item) => sum + Number(item.monto || 0), 0));
const puedeGuardarPagoPosterior = computed(() => pagosPosteriores.value.length > 0 && pagosPosteriores.value.every((pagoItem) => pagoItem.idMedioPago && Number(pagoItem.monto || 0) > 0));

watch(total, () => {
  if (pagos.value.length === 1) ajustarPagoAlTotal();
});

function currency(value) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value || 0);
}

function formatDate(value) {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

function estadoPagoColor(estado) {
  if (estado === 'PAGADA') return 'success';
  if (estado === 'PARCIAL') return 'warning';
  return 'error';
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

async function buscarClientes() {
  cargandoClientes.value = true;
  try {
    clientes.value = await api.get(`/clientes?q=${encodeURIComponent(busquedaCliente.value || '')}`);
    if (!clienteSeleccionado.value) clienteSeleccionado.value = clientes.value.find((cliente) => cliente.idCliente === 1) || clientes.value[0];
  } finally {
    cargandoClientes.value = false;
  }
}

async function cargarMediosPago() {
  mediosPago.value = await api.get('/medios-pago');
  if (pagos.value.length === 0) agregarPago(0);
}

function medioEfectivo() {
  return mediosPago.value.find((medio) => medio.nombre.toLowerCase() === 'efectivo') || mediosPago.value[0];
}

function agregarPago(monto = 0) {
  const medio = medioEfectivo();
  pagos.value.push({ idMedioPago: medio?.idMedioPago || null, monto: Number(monto || 0), referencia: '' });
}

function quitarPago(index) {
  pagos.value.splice(index, 1);
}

function ajustarPagoAlTotal() {
  if (pagos.value.length === 0) agregarPago(total.value);
  else if (pagos.value.length === 1) pagos.value[0].monto = total.value;
}

async function agregarProducto(producto, cantidad = 1) {
  if (!producto) return;
  const cantidadSolicitada = Math.max(Number(cantidad || 1), 1);
  const existente = carrito.value.find((item) => item.idProducto === producto.idProducto);
  if (existente) {
    const nuevaCantidad = existente.cantidadVendida + cantidadSolicitada;
    existente.cantidadVendida = Math.min(nuevaCantidad, existente.existencia);
  } else {
    carrito.value.push({ ...producto, cantidadVendida: Math.min(cantidadSolicitada, producto.existencia) });
  }
  productoPendiente.value = null;
  cantidadPendiente.value = 1;
  busquedaProducto.value = '';
  await nextTick();
  ajustarPagoAlTotal();
}

function agregarProductoPendiente() {
  agregarProducto(productoPendiente.value, cantidadPendiente.value);
}

function quitarProducto(producto) {
  carrito.value = carrito.value.filter((item) => item.idProducto !== producto.idProducto);
  nextTick(() => {
    ajustarPagoAlTotal();
  });
}

function limpiarVenta() {
  carrito.value = [];
  pagos.value = [];
  agregarPago(0);
  registrarPagoInicial.value = true;
  productoPendiente.value = null;
  cantidadPendiente.value = 1;
}

function cancelarEdicion() {
  ventaEditando.value = null;
  limpiarVenta();
}

async function registrarVenta() {
  guardando.value = true;
  try {
    const payload = {
      idCliente: clienteSeleccionado.value.idCliente,
      idUsuario: session.usuario.idUsuario,
      pagos: registrarPagoInicial.value ? pagos.value.map((pagoItem) => ({
        idMedioPago: pagoItem.idMedioPago,
        monto: Number(pagoItem.monto),
        referencia: pagoItem.referencia || ''
      })) : [],
      productos: carrito.value.map((item) => ({
        idProducto: item.idProducto,
        cantidadVendida: Number(item.cantidadVendida),
        precioVenta: Number(item.precioVenta)
      }))
    };
    const venta = ventaEditando.value
      ? await api.put(`/ventas/contado/${ventaEditando.value.idVenta}`, payload)
      : await api.post('/ventas/contado', payload);
    notify(`Venta ${venta.idVenta} ${ventaEditando.value ? 'actualizada' : 'registrada'}. Cambio: ${currency(venta.cambio)}`);
    ventaEditando.value = null;
    limpiarVenta();
    await Promise.all([buscarProductos(), loadHistorial()]);
  } catch (err) {
    notify(err.message, 'error');
  } finally {
    guardando.value = false;
  }
}

async function loadHistorial() {
  cargandoVentas.value = true;
  try {
    ventas.value = await api.get('/ventas/contado');
  } finally {
    cargandoVentas.value = false;
  }
}

async function verDetalle(venta) {
  try {
    detalle.value = await api.get(`/ventas/contado/${venta.idVenta}`);
    detalleDialog.value = true;
  } catch (err) {
    notify(err.message, 'error');
  }
}

function imprimirTicket() {
  if (!detalle.value) return;
  const filas = detalle.value.productos.map((producto) => `
    <tr>
      <td>${producto.descripcion}</td>
      <td class="right">${producto.cantidadVendida}</td>
      <td class="right">${currency(producto.precioVenta)}</td>
      <td class="right">${currency(producto.precioVenta * producto.cantidadVendida)}</td>
    </tr>
  `).join('');
  const html = `
    <!doctype html>
    <html>
      <head>
        <title>Venta ${detalle.value.idVenta}</title>
        <style>
          body { font-family: Arial, sans-serif; width: 280px; margin: 0; padding: 12px; color: #111; }
          h1 { font-size: 16px; margin: 0 0 6px; text-align: center; }
          p { margin: 2px 0; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
          th, td { padding: 4px 0; border-bottom: 1px dashed #bbb; vertical-align: top; }
          .right { text-align: right; }
          .totals { margin-top: 10px; font-size: 13px; }
          .totals div { display: flex; justify-content: space-between; margin: 3px 0; }
        </style>
      </head>
      <body>
        <h1>Sublime POS</h1>
        <p>Venta: ${detalle.value.idVenta}</p>
        <p>Fecha: ${formatDate(detalle.value.fecha)}</p>
        <p>Cliente: ${detalle.value.cliente}</p>
        <p>Usuario: ${detalle.value.usuario}</p>
        <p>Pago: ${(detalle.value.pagos || []).map((pagoItem) => `${pagoItem.medioPago} ${currency(pagoItem.monto)}`).join(' / ')}</p>
        <table>
          <thead>
            <tr><th>Producto</th><th class="right">Cant.</th><th class="right">P.Unit</th><th class="right">Subtotal</th></tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
        <div class="totals">
          <div><span>Total</span><strong>${currency(detalle.value.monto)}</strong></div>
          <div><span>Pago</span><strong>${currency(detalle.value.pago)}</strong></div>
          <div><span>Saldo</span><strong>${currency(Math.max(detalle.value.monto - detalle.value.pago, 0))}</strong></div>
        </div>
        <script>window.print(); window.close();<\/script>
      </body>
    </html>
  `;
  const printWindow = window.open('', '_blank', 'width=360,height=640');
  printWindow.document.write(html);
  printWindow.document.close();
}

async function editarVenta(venta) {
  try {
    const ventaCompleta = venta.productos ? venta : await api.get(`/ventas/contado/${venta.idVenta}`);
    ventaEditando.value = ventaCompleta;
    clienteSeleccionado.value = clientes.value.find((cliente) => cliente.idCliente === ventaCompleta.idCliente) || {
      idCliente: ventaCompleta.idCliente,
      nombreCompleto: ventaCompleta.cliente,
      numeroTelefono: ventaCompleta.numeroTelefono
    };
    carrito.value = ventaCompleta.productos.map((producto) => {
      const productoActual = productos.value.find((item) => item.idProducto === producto.idProducto);
      return {
        idProducto: producto.idProducto,
        codigoBarras: producto.codigoBarras,
        descripcion: producto.descripcion,
        precioCompra: producto.precioCompra,
        precioVenta: producto.precioVenta,
        existencia: Number(producto.cantidadVendida) + Number(productoActual?.existencia || 0),
        stock: productoActual?.stock || 0,
        cantidadVendida: producto.cantidadVendida
      };
    });
    pagos.value = ventaCompleta.pagos?.length
      ? ventaCompleta.pagos.map((pagoItem) => ({
        idMedioPago: pagoItem.idMedioPago,
        monto: pagoItem.monto,
        referencia: pagoItem.referencia || ''
      }))
      : [{ idMedioPago: medioEfectivo()?.idMedioPago || null, monto: ventaCompleta.pago, referencia: '' }];
    registrarPagoInicial.value = pagos.value.some((pagoItem) => Number(pagoItem.monto || 0) > 0);
    detalleDialog.value = false;
    notify(`Venta ${ventaCompleta.idVenta} cargada para edicion`, 'info');
  } catch (err) {
    notify(err.message, 'error');
  }
}

function abrirPagoVenta(venta) {
  ventaParaPagar.value = venta;
  pagosPosteriores.value = [];
  agregarPagoPosterior(Math.max(Number(venta.saldo || 0), 0));
  pagoDialog.value = true;
}

function agregarPagoPosterior(monto = 0) {
  const medio = medioEfectivo();
  pagosPosteriores.value.push({ idMedioPago: medio?.idMedioPago || null, monto: Number(monto || 0), referencia: '' });
}

function quitarPagoPosterior(index) {
  pagosPosteriores.value.splice(index, 1);
}

async function registrarPagoPosterior() {
  guardandoPagoPosterior.value = true;
  try {
    await api.post(`/ventas/contado/${ventaParaPagar.value.idVenta}/pagos`, {
      pagos: pagosPosteriores.value.map((pagoItem) => ({
        idMedioPago: pagoItem.idMedioPago,
        monto: Number(pagoItem.monto),
        referencia: pagoItem.referencia || ''
      }))
    });
    notify(`Pago registrado en venta ${ventaParaPagar.value.idVenta}`);
    pagoDialog.value = false;
    await loadHistorial();
  } catch (err) {
    notify(err.message, 'error');
  } finally {
    guardandoPagoPosterior.value = false;
  }
}

async function anularVenta(venta) {
  try {
    await api.delete(`/ventas/contado/${venta.idVenta}`);
    notify(`Venta ${venta.idVenta} anulada`);
    await Promise.all([buscarProductos(), loadHistorial()]);
  } catch (err) {
    notify(err.message, 'error');
  }
}

onMounted(async () => {
  await Promise.all([buscarProductos(), buscarClientes(), cargarMediosPago(), loadHistorial()]);
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

.payments-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.detalle-totales {
  display: flex;
  justify-content: flex-end;
  gap: 28px;
  margin-top: 18px;
}

.detalle-totales div {
  display: grid;
  gap: 3px;
  text-align: right;
}

.detalle-totales span {
  color: #667085;
  font-size: 0.9rem;
}

.detalle-totales strong {
  font-size: 1.2rem;
}

@media (max-width: 720px) {
  .totals {
    justify-content: space-between;
  }

  .detalle-totales {
    justify-content: space-between;
  }
}
</style>
