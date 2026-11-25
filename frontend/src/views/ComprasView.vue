<template>
  <section class="page">
    <div class="page-header">
      <div>
        <div class="page-title">Compras</div>
        <div class="page-subtitle">Registra compras e insumos por proveedor.</div>
      </div>
      <v-btn color="primary" prepend-icon="mdi-refresh" @click="loadHistorial">Actualizar historial</v-btn>
    </div>

    <v-row>
      <v-col cols="12" lg="7">
        <v-card class="data-card" variant="flat" border>
          <v-card-title>{{ compraEditando ? `Editando compra ${compraEditando.idCompra}` : 'Nueva compra' }}</v-card-title>
          <v-card-text>
            <v-alert v-if="compraEditando" class="mb-4" type="info" variant="tonal" density="compact">
              Al guardar se reemplaza el detalle anterior de la compra.
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
            </v-row>

            <v-alert v-if="!centros.length" class="mb-3" type="warning" variant="tonal" density="compact">
              Para registrar compras primero crea los centros de costo en
              <router-link to="/clasificacion?pestana=centros">Clasificación → Centros de costo</router-link>.
            </v-alert>

            <v-row>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="descripcionPendiente"
                  label="Descripcion"
                  placeholder="Fresas, banano, Nutella..."
                  @update:model-value="aplicarSugerencia"
                />
              </v-col>
              <v-col cols="6" md="3">
                <v-text-field v-model.number="cantidadPendiente" label="Cantidad" min="0.001" step="0.001" type="number" />
              </v-col>
              <v-col cols="6" md="3">
                <v-text-field v-model.number="costoPendiente" label="Costo" min="0" type="number" />
              </v-col>
              <v-col cols="12" md="9">
                <ClasificacionItemSelect
                  v-model:id-centro-costo="centroPendiente"
                  v-model:id-tipo-gasto="tipoPendiente"
                  :centros="centrosTodos"
                  :tipos="tiposTodos"
                  :sugerido="clasificacionSugerida"
                  @update:id-centro-costo="clasificacionSugerida = false"
                  @update:id-tipo-gasto="clasificacionSugerida = false"
                />
              </v-col>
              <v-col cols="12" md="3">
                <v-btn block size="large" color="primary" prepend-icon="mdi-plus" :disabled="!puedeAgregarItem" @click="agregarProductoPendiente">
                  Agregar
                </v-btn>
              </v-col>
            </v-row>

            <div v-if="carrito.length > 1" class="aplicar-todos">
              <span class="aplicar-todos__titulo">Aplicar a todos los ítems</span>
              <ClasificacionItemSelect
                v-model:id-centro-costo="centroTodos"
                v-model:id-tipo-gasto="tipoTodos"
                :centros="centrosTodos"
                :tipos="tiposTodos"
                compacta
              />
              <v-btn size="large" variant="tonal" color="primary" :disabled="!centroTodos && !tipoTodos" @click="aplicarATodos">Aplicar</v-btn>
            </div>

            <div v-if="carrito.length === 0" class="empty-row">Agrega lineas para registrar la compra.</div>
            <div
              v-for="(item, index) in carrito"
              :key="item.lineaId"
              class="item-compra"
              :class="{ 'item-compra--pendiente': !item.idCentroCosto }"
            >
              <div class="item-compra__fila">
                <div class="item-compra__descripcion">
                  <v-icon v-if="!item.idCentroCosto" icon="mdi-alert-circle" color="warning" size="small" class="mr-1" />
                  {{ item.descripcion }}
                </div>
                <strong>{{ currency(item.precioCompra * item.cantidadComprada) }}</strong>
                <v-btn icon="mdi-delete" color="error" variant="text" aria-label="Quitar item" @click="quitarProducto(index)" />
              </div>
              <div class="item-compra__fila">
                <span class="text-medium-emphasis">{{ currency(item.precioCompra) }} ×</span>
                <v-text-field v-model.number="item.cantidadComprada" type="number" min="0.001" step="0.001" density="compact" hide-details class="qty-cell" />
              </div>
              <ClasificacionItemSelect
                v-model:id-centro-costo="item.idCentroCosto"
                v-model:id-tipo-gasto="item.idTipoGasto"
                :centros="centrosTodos"
                :tipos="tiposTodos"
                :marcar-faltante="true"
                compacta
              />
            </div>
            <div v-if="itemsSinCentro > 0" class="sin-centro-aviso">
              <v-icon icon="mdi-alert-circle" color="warning" size="small" />
              {{ itemsSinCentro }} ítem(s) sin centro de costo. Asígnalos para poder guardar.
            </div>
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
          <v-card-title class="history-title">
            <span>Ultimas compras</span>
            <v-select
              v-model="limiteHistorial"
              :items="limiteHistorialOpciones"
              item-title="label"
              item-value="value"
              label="Mostrar"
              density="compact"
              hide-details
              class="history-limit"
              @update:model-value="guardarLimiteHistorial"
            />
          </v-card-title>
          <v-data-table :key="historialKey" :headers="headers" :items="compras" :loading="cargandoCompras" item-value="idCompra" density="comfortable">
            <template #item.monto="{ item }">{{ currency(item.monto) }}</template>
            <template #item.saldo="{ item }">{{ currency(Math.max(item.saldo || 0, 0)) }}</template>
            <template #item.fecha="{ item }">{{ formatDate(item.fecha) }}</template>
            <template #item.actions="{ item }">
              <v-btn icon="mdi-eye" size="small" variant="text" @click="verDetalle(item)" />
              <v-btn icon="mdi-pencil" size="small" variant="text" @click="editarCompra(item)" />
              <v-btn icon="mdi-cancel" size="small" color="error" variant="text" @click="pedirAnularCompra(item)" />
            </template>
          </v-data-table>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="detalleDialog" max-width="820" :fullscreen="$vuetify.display.xs">
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
          <div v-for="producto in detalle.productos" :key="producto.idProductoComprado" class="item-compra">
            <div class="item-compra__fila">
              <div class="item-compra__descripcion">{{ producto.descripcion }}</div>
              <strong>{{ currency(producto.precioCompra * producto.cantidadComprada) }}</strong>
            </div>
            <div class="item-compra__fila">
              <span class="text-medium-emphasis">{{ producto.cantidadComprada }} × {{ currency(producto.precioCompra) }}</span>
            </div>
            <div class="item-compra__fila item-compra__clasificacion">
              <v-chip size="small" variant="tonal" :color="producto.centroCosto ? 'primary' : 'warning'" prepend-icon="mdi-sitemap-outline">
                {{ producto.centroCosto || 'Sin centro' }}
              </v-chip>
              <v-chip size="small" variant="tonal" prepend-icon="mdi-tag-outline">{{ producto.tipoGasto || 'Sin tipo' }}</v-chip>
              <v-spacer />
              <v-btn size="small" variant="text" prepend-icon="mdi-pencil" @click="abrirCorreccion(producto)">Cambiar clasificación</v-btn>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>


    <v-dialog v-model="correccionDialog" max-width="520" :fullscreen="$vuetify.display.xs">
      <v-card>
        <v-card-title>Clasificación de "{{ itemCorreccion?.descripcion }}"</v-card-title>
        <v-card-text>
          <p class="mb-3 text-medium-emphasis">Solo cambia el centro y el tipo de gasto; montos, pagos e inventario no se modifican.</p>
          <ClasificacionItemSelect
            v-model:id-centro-costo="correccion.idCentroCosto"
            v-model:id-tipo-gasto="correccion.idTipoGasto"
            :centros="centrosTodos"
            :tipos="tiposTodos"
            :marcar-faltante="true"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn size="large" variant="text" @click="correccionDialog = false">Cancelar</v-btn>
          <v-btn size="large" color="primary" :disabled="!correccion.idCentroCosto" :loading="guardandoCorreccion" @click="guardarCorreccion">Guardar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="confirmarAnulacionCompraDialog" max-width="460">
      <v-card>
        <v-card-title>Confirmar anulacion</v-card-title>
        <v-card-text>
          <v-alert type="warning" variant="tonal" density="compact">
            Vas a anular la compra {{ compraParaAnular?.idCompra }}. Esta accion elimina el registro de compra.
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="cancelarAnulacionCompra">No</v-btn>
          <v-btn color="error" :loading="anulandoCompra" @click="confirmarAnulacionCompra">Si, anular</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-snackbar v-model="snackbar.visible" :color="snackbar.color" timeout="3500">{{ snackbar.text }}</v-snackbar>
  </section>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref } from 'vue';
import { api } from '../api.js';
import ClasificacionItemSelect from '../components/ClasificacionItemSelect.vue';
import { normalizarDescripcion } from '../texto.js';
import { formatLocalDateTime, inputToSql, sqlToDateInput, todayDateInput } from '../dates.js';
import { session } from '../session.js';

const limiteHistorialStorageKey = 'dela-pos.compras.limiteHistorial';

const proveedores = ref([]);
const compras = ref([]);
const carrito = ref([]);
const proveedorSeleccionado = ref(null);
const busquedaProveedor = ref('');
const descripcionPendiente = ref('');
const fechaMovimiento = ref(todayDateInput());
const cantidadPendiente = ref(1);
const costoPendiente = ref(0);
const pago = ref(0);
const cargandoProveedores = ref(false);
const cargandoCompras = ref(false);
const guardando = ref(false);
const anulandoCompra = ref(false);
const detalleDialog = ref(false);
const confirmarAnulacionCompraDialog = ref(false);
const historialKey = ref(0);
const limiteHistorial = ref(localStorage.getItem(limiteHistorialStorageKey) || '100');
const detalle = ref(null);
const compraEditando = ref(null);
const compraParaAnular = ref(null);
const snackbar = ref({ visible: false, text: '', color: 'success' });
const centrosTodos = ref([]);
const tiposTodos = ref([]);
const sugerencias = ref({});
const centroPendiente = ref(null);
const tipoPendiente = ref(null);
const clasificacionSugerida = ref(false);
const centroTodos = ref(null);
const tipoTodos = ref(null);
const correccionDialog = ref(false);
const itemCorreccion = ref(null);
const correccion = reactive({ idCentroCosto: null, idTipoGasto: null });
const guardandoCorreccion = ref(false);
let nextLineaId = 1;

const limiteHistorialOpciones = [
  { label: 'Ultimos 100', value: '100' },
  { label: 'Ultimos 200', value: '200' },
  { label: 'Ultimos 500', value: '500' },
  { label: 'Ultimos 1000', value: '1000' },
  { label: 'Todos', value: 'todos' }
];

const headers = [
  { title: 'Folio', key: 'idCompra' },
  { title: 'Proveedor', key: 'proveedor' },
  { title: 'Total', key: 'monto' },
  { title: 'Saldo', key: 'saldo' },
  { title: 'Fecha', key: 'fecha' },
  { title: '', key: 'actions', sortable: false, align: 'end' }
];

const total = computed(() => carrito.value.reduce((sum, item) => sum + Number(item.precioCompra || 0) * Number(item.cantidadComprada || 0), 0));
const saldoCompra = computed(() => Math.max(total.value - Number(pago.value || 0), 0));
const centros = computed(() => centrosTodos.value.filter((centro) => centro.activo));
const itemsSinCentro = computed(() => carrito.value.filter((item) => !item.idCentroCosto).length);
const puedeGuardar = computed(() => carrito.value.length > 0 && proveedorSeleccionado.value && Number(pago.value || 0) >= 0 && itemsSinCentro.value === 0);
const puedeAgregarItem = computed(() => descripcionPendiente.value.trim() && Number(cantidadPendiente.value || 0) > 0 && Number(costoPendiente.value || 0) >= 0);

function currency(value) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value || 0);
}

function formatDate(value) {
  return formatLocalDateTime(value);
}

function notify(text, color = 'success') {
  snackbar.value = { visible: true, text, color };
}


async function buscarProveedores() {
  cargandoProveedores.value = true;
  try {
    proveedores.value = await api.get(`/proveedores?q=${encodeURIComponent(busquedaProveedor.value || '')}`);
  } finally {
    cargandoProveedores.value = false;
  }
}

async function cargarClasificacion() {
  try {
    const [centrosPayload, tiposPayload, sugerenciasPayload] = await Promise.all([
      api.get('/centros-costo?incluirInactivas=1'),
      api.get('/tipos-gasto?incluirInactivas=1'),
      api.get('/compras/sugerencias-clasificacion')
    ]);
    centrosTodos.value = centrosPayload;
    tiposTodos.value = tiposPayload;
    sugerencias.value = sugerenciasPayload;
  } catch (err) {
    notify(err.message, 'error');
  }
}

// design 003 D-03: propone la clasificacion usada la ultima vez para la misma descripcion.
function aplicarSugerencia(descripcion) {
  const sugerencia = sugerencias.value[normalizarDescripcion(descripcion)];
  if (!sugerencia) {
    clasificacionSugerida.value = false;
    return;
  }
  const centro = centrosTodos.value.find((item) => item.idCentroCosto === sugerencia.idCentroCosto && item.activo);
  if (!centro) return;
  const tipo = tiposTodos.value.find((item) => item.idTipoGasto === sugerencia.idTipoGasto && item.activo);
  centroPendiente.value = centro.idCentroCosto;
  tipoPendiente.value = tipo ? tipo.idTipoGasto : null;
  clasificacionSugerida.value = true;
}

function aplicarATodos() {
  for (const item of carrito.value) {
    if (centroTodos.value) item.idCentroCosto = centroTodos.value;
    if (tipoTodos.value) item.idTipoGasto = tipoTodos.value;
  }
  notify('Clasificación aplicada a todos los ítems', 'info');
}

function abrirCorreccion(producto) {
  itemCorreccion.value = producto;
  correccion.idCentroCosto = producto.idCentroCosto ?? null;
  correccion.idTipoGasto = producto.idTipoGasto ?? null;
  correccionDialog.value = true;
}

async function guardarCorreccion() {
  guardandoCorreccion.value = true;
  try {
    await api.patch(`/compras/${detalle.value.idCompra}/items/${itemCorreccion.value.idProductoComprado}`, {
      idCentroCosto: correccion.idCentroCosto,
      idTipoGasto: correccion.idTipoGasto
    });
    correccionDialog.value = false;
    detalle.value = await api.get(`/compras/${detalle.value.idCompra}`);
    notify('Clasificación actualizada');
  } catch (err) {
    notify(err.message, 'error');
  } finally {
    guardandoCorreccion.value = false;
  }
}

async function loadHistorial() {
  cargandoCompras.value = true;
  try {
    compras.value = await api.get('/compras?limite=' + encodeURIComponent(limiteHistorial.value));
    historialKey.value += 1;
  } finally {
    cargandoCompras.value = false;
  }
}

async function guardarLimiteHistorial() {
  localStorage.setItem(limiteHistorialStorageKey, limiteHistorial.value);
  await loadHistorial();
}

async function refrescarCompras() {
  await loadHistorial();
  if (detalleDialog.value && detalle.value?.idCompra) {
    detalle.value = await api.get(`/compras/${detalle.value.idCompra}`);
  }
}

async function agregarProductoPendiente() {
  if (!puedeAgregarItem.value) return;
  const cantidad = Number(cantidadPendiente.value || 0);
  if (cantidad <= 0) return;
  carrito.value.push({
    lineaId: nextLineaId++,
    idProducto: null,
    codigoBarras: '',
    descripcion: descripcionPendiente.value.trim(),
    cantidadComprada: cantidad,
    precioCompra: Number(costoPendiente.value || 0),
    precioVenta: 0,
    idCentroCosto: centroPendiente.value,
    idTipoGasto: tipoPendiente.value
  });
  clasificacionSugerida.value = false;
  descripcionPendiente.value = '';
  cantidadPendiente.value = 1;
  costoPendiente.value = 0;
  await nextTick();
  pago.value = total.value;
}
function quitarProducto(index) {
  carrito.value.splice(index, 1);
  nextTick(() => {
    pago.value = total.value;
  });
}

function limpiar() {
  carrito.value = [];
  pago.value = 0;
  proveedorSeleccionado.value = null;
  busquedaProveedor.value = '';
  descripcionPendiente.value = '';
  cantidadPendiente.value = 1;
  costoPendiente.value = 0;
  fechaMovimiento.value = todayDateInput();
  centroPendiente.value = null;
  tipoPendiente.value = null;
  centroTodos.value = null;
  tipoTodos.value = null;
  clasificacionSugerida.value = false;
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
        idProducto: null,
        descripcion: item.descripcion,
        codigoBarras: null,
        cantidadComprada: Number(item.cantidadComprada),
        precioCompra: Number(item.precioCompra),
        precioVenta: 0,
        idCentroCosto: item.idCentroCosto,
        idTipoGasto: item.idTipoGasto || null
      }))
    };
    const compra = compraEditando.value
      ? await api.put(`/compras/${compraEditando.value.idCompra}`, payload)
      : await api.post('/compras', payload);
    notify(`Compra ${compra.idCompra} ${compraEditando.value ? 'actualizada' : 'registrada'}`);
    compraEditando.value = null;
    limpiar();
    await Promise.all([refrescarCompras(), cargarClasificacion()]);
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
      lineaId: nextLineaId++,
      idProducto: null,
      codigoBarras: '',
      descripcion: producto.descripcion,
      cantidadComprada: producto.cantidadComprada,
      precioCompra: producto.precioCompra,
      precioVenta: 0,
      idCentroCosto: producto.idCentroCosto ?? null,
      idTipoGasto: producto.idTipoGasto ?? null
    }));
    pago.value = compraCompleta.pago;
    fechaMovimiento.value = sqlToDateInput(compraCompleta.fecha);
    detalleDialog.value = false;
    const pendientes = carrito.value.filter((item) => !item.idCentroCosto).length;
    notify(
      pendientes
        ? `Compra ${compraCompleta.idCompra} cargada: asigna centro de costo a ${pendientes} ítem(s) antes de guardar`
        : `Compra ${compraCompleta.idCompra} cargada para edicion`,
      pendientes ? 'warning' : 'info'
    );
  } catch (err) {
    notify(err.message, 'error');
  }
}

function pedirAnularCompra(compra) {
  compraParaAnular.value = compra;
  confirmarAnulacionCompraDialog.value = true;
}

function cancelarAnulacionCompra() {
  confirmarAnulacionCompraDialog.value = false;
  compraParaAnular.value = null;
}

async function confirmarAnulacionCompra() {
  if (!compraParaAnular.value) return;
  anulandoCompra.value = true;
  try {
    const idCompra = compraParaAnular.value.idCompra;
    await api.delete(`/compras/${idCompra}`);
    notify(`Compra ${idCompra} anulada`);
    cancelarAnulacionCompra();
    await refrescarCompras();
  } catch (err) {
    notify(err.message, 'error');
  } finally {
    anulandoCompra.value = false;
  }
}
onMounted(async () => {
  await Promise.all([buscarProveedores(), loadHistorial(), cargarClasificacion()]);
});
</script>

<style scoped>
.empty-row {
  color: #667085;
  padding: 28px 16px;
  text-align: center;
}

.qty-cell {
  max-width: 120px;
}

.aplicar-todos {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 10px 12px;
  margin-bottom: 8px;
  border-radius: 8px;
  background: #f4f7fb;
}

.aplicar-todos__titulo {
  font-weight: 600;
  font-size: 0.9rem;
}

@media (max-width: 720px) {
  .aplicar-todos {
    grid-template-columns: minmax(0, 1fr);
  }
}

.item-compra {
  border-bottom: 1px solid #eef0f3;
  padding: 10px 0;
  display: grid;
  gap: 6px;
}

.item-compra--pendiente {
  background: #fff8eb;
  border-left: 3px solid #f79009;
  padding-left: 8px;
}

.item-compra__fila {
  display: flex;
  align-items: center;
  gap: 10px;
}

.item-compra__descripcion {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
}

.item-compra__clasificacion {
  flex-wrap: wrap;
}

.sin-centro-aviso {
  color: #b54708;
  font-size: 0.9rem;
  margin-top: 8px;
}

.history-title {
  align-items: center;
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.history-limit {
  max-width: 180px;
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
