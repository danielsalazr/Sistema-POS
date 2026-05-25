<template>
  <section class="page">
    <div class="page-header">
      <div>
        <div class="page-title">Prestamos y aportes</div>
        <div class="page-subtitle">Dinero entre el negocio, socios y terceros.</div>
      </div>
      <div class="header-actions">
        <v-btn variant="tonal" prepend-icon="mdi-account-plus" @click="nuevaPersona">Nueva persona</v-btn>
        <v-btn color="primary" prepend-icon="mdi-plus" @click="nuevoMovimiento">Nuevo movimiento</v-btn>
      </div>
    </div>

    <v-row>
      <v-col cols="12" lg="5">
        <v-card class="data-card" variant="flat" border>
          <v-card-title>Personas</v-card-title>
          <v-card-text>
            <v-text-field v-model="q" label="Buscar" prepend-inner-icon="mdi-magnify" hide-details @input="loadPersonas" />
          </v-card-text>
          <v-data-table
            :key="personasKey"
            :headers="personasHeaders"
            :items="personas"
            :loading="loadingPersonas"
            item-value="idPersonaFinanciera"
            density="comfortable"
            hover
            @click:row="verMovimientosPersona"
          >
            <template #item.negocioDebe="{ item }">
              <span :class="deudaClase(item.negocioDebe)">{{ currency(item.negocioDebe) }}</span>
            </template>
            <template #item.personaDebe="{ item }">
              <span :class="deudaClase(item.personaDebe)">{{ currency(item.personaDebe) }}</span>
            </template>
            <template #item.actions="{ item }">
              <v-btn icon="mdi-pencil" size="small" variant="text" @click="editarPersona(item)" />
            </template>
          </v-data-table>
        </v-card>
      </v-col>

      <v-col cols="12" lg="7">
        <v-row class="mb-4">
          <v-col cols="12" md="6">
            <v-card class="data-card" variant="flat" border>
              <v-card-text>
                <div class="metric-label">El negocio debe</div>
                <div class="metric-value" :class="deudaClase(totalNegocioDebe)">{{ currency(totalNegocioDebe) }}</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" md="6">
            <v-card class="data-card" variant="flat" border>
              <v-card-text>
                <div class="metric-label">Le deben al negocio</div>
                <div class="metric-value" :class="deudaClase(totalPersonaDebe)">{{ currency(totalPersonaDebe) }}</div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <v-card class="data-card" variant="flat" border>
          <v-card-title>Movimientos</v-card-title>
          <v-data-table
            :key="movimientosKey"
            :headers="movimientosHeaders"
            :items="movimientos"
            :loading="loadingMovimientos"
            item-value="idMovimiento"
          >
            <template #item.tipo="{ item }">{{ tipoLabel(item.tipo) }}</template>
            <template #item.monto="{ item }">
              <span :class="tipoClase(item.tipo)">{{ signoMovimiento(item.tipo) }}{{ currency(item.monto) }}</span>
            </template>
            <template #item.subsanado="{ item }">{{ currency(item.subsanado) }}</template>
            <template #item.saldo="{ item }">{{ currency(item.saldo) }}</template>
            <template #item.estado="{ item }">
              <v-chip :color="estadoColor(item.estado)" size="small">{{ item.estado }}</v-chip>
            </template>
            <template #item.fecha="{ item }">{{ formatDate(item.fecha) }}</template>
            <template #item.actions="{ item }">
              <v-btn icon="mdi-eye" size="small" variant="text" @click="verDetalleMovimiento(item)" />
              <v-btn icon="mdi-cash-sync" size="small" variant="text" color="success" :disabled="item.estado === 'SUBSANADO'" @click="abrirSubsanacion(item)" />
              <v-btn icon="mdi-pencil" size="small" variant="text" @click="editarMovimiento(item)" />
            </template>
          </v-data-table>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="personaDialog" max-width="620">
      <v-card>
        <v-card-title>{{ personaForm.idPersonaFinanciera ? 'Editar persona' : 'Nueva persona' }}</v-card-title>
        <v-card-text>
          <div class="form-grid">
            <v-text-field v-model="personaForm.nombre" label="Nombre" />
            <v-select v-model="personaForm.relacion" :items="relaciones" label="Relacion" />
            <v-text-field v-model="personaForm.numeroTelefono" label="Telefono" />
            <v-text-field v-model="personaForm.notas" label="Notas" />
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="personaDialog = false">Cancelar</v-btn>
          <v-btn color="primary" :loading="savingPersona" @click="guardarPersona">Guardar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="movimientoDialog" max-width="680">
      <v-card>
        <v-card-title>{{ movimientoForm.idMovimiento ? 'Editar movimiento' : 'Nuevo movimiento' }}</v-card-title>
        <v-card-text>
          <v-alert class="mb-4" type="info" variant="tonal" density="compact">
            Estos movimientos afectan caja, pero no ventas, compras ni gastos operativos.
          </v-alert>
          <div class="form-grid">
            <v-autocomplete
              v-model="movimientoForm.idPersonaFinanciera"
              :items="personas"
              item-title="nombre"
              item-value="idPersonaFinanciera"
              label="Persona"
            />
            <v-select v-model="movimientoForm.tipo" :items="tipos" item-title="label" item-value="value" label="Tipo">
              <template #selection="{ item }">
                <span :class="tipoClase(item.raw.value)">{{ item.raw.label }}</span>
              </template>
              <template #item="{ props, item }">
                <v-list-item v-bind="props">
                  <template #title>
                    <span :class="tipoClase(item.raw.value)">{{ item.raw.label }}</span>
                  </template>
                </v-list-item>
              </template>
            </v-select>
            <v-text-field v-model.number="movimientoForm.monto" label="Monto" type="number" />
            <v-text-field v-model="movimientoForm.descripcion" label="Descripcion" />
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="movimientoDialog = false">Cancelar</v-btn>
          <v-btn color="primary" :loading="savingMovimiento" @click="guardarMovimiento">Guardar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="subsanacionDialog" max-width="680">
      <v-card>
        <v-card-title>Abonar / subsanar</v-card-title>
        <v-card-text>
          <v-alert class="mb-4" type="info" variant="tonal" density="compact">
            {{ movimientoSeleccionado?.persona }} - Saldo pendiente: {{ currency(movimientoSeleccionado?.saldo || 0) }}
          </v-alert>
          <div class="form-grid">
            <v-text-field v-model.number="subsanacionForm.monto" label="Monto" type="number" />
            <v-select v-model="subsanacionForm.idMedioPago" :items="mediosPago" item-title="nombre" item-value="idMedioPago" label="Medio de pago" clearable />
            <v-text-field v-model="subsanacionForm.referencia" label="Referencia" />
            <v-text-field v-model="subsanacionForm.descripcion" label="Descripcion" />
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="subsanacionDialog = false">Cancelar</v-btn>
          <v-btn color="primary" :loading="savingSubsanacion" :disabled="!puedeGuardarSubsanacion" @click="guardarSubsanacion">Guardar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="detalleDialog" max-width="860">
      <v-card>
        <v-card-title class="d-flex align-center">
          <span>Movimiento {{ detalle?.idMovimiento }}</span>
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" @click="detalleDialog = false" />
        </v-card-title>
        <v-card-text v-if="detalle">
          <v-row class="mb-2">
            <v-col cols="12" md="6">
              <v-list density="compact">
                <v-list-item title="Persona" :subtitle="detalle.persona" />
                <v-list-item title="Tipo" :subtitle="tipoLabel(detalle.tipo)" />
                <v-list-item title="Estado" :subtitle="detalle.estado" />
              </v-list>
            </v-col>
            <v-col cols="12" md="6">
              <v-list density="compact">
                <v-list-item title="Monto" :subtitle="currency(detalle.monto)" />
                <v-list-item title="Subsanado" :subtitle="currency(detalle.subsanado)" />
                <v-list-item title="Saldo" :subtitle="currency(detalle.saldo)" />
              </v-list>
            </v-col>
          </v-row>
          <v-table density="comfortable">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Medio</th>
                <th>Referencia</th>
                <th>Descripcion</th>
                <th class="text-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!detalle.subsanaciones?.length">
                <td colspan="5" class="empty-row">No hay subsanaciones registradas.</td>
              </tr>
              <tr v-for="subsanacion in detalle.subsanaciones" :key="subsanacion.idSubsanacion">
                <td>{{ formatDate(subsanacion.fecha) }}</td>
                <td>{{ subsanacion.medioPago || '-' }}</td>
                <td>{{ subsanacion.referencia || '-' }}</td>
                <td>{{ subsanacion.descripcion || '-' }}</td>
                <td class="text-right">{{ currency(subsanacion.monto) }}</td>
              </tr>
            </tbody>
          </v-table>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog v-model="movimientosPersonaDialog" max-width="980">
      <v-card>
        <v-card-title class="d-flex align-center">
          <span>Movimientos de {{ personaSeleccionada?.nombre }}</span>
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" @click="movimientosPersonaDialog = false" />
        </v-card-title>
        <v-card-text>
          <v-row class="mb-2" v-if="personaSeleccionada">
            <v-col cols="12" md="6">
              <v-card class="data-card" variant="flat" border>
                <v-card-text>
                  <div class="metric-label">Negocio debe</div>
                  <div class="metric-value" :class="deudaClase(personaSeleccionada.negocioDebe)">
                    {{ currency(personaSeleccionada.negocioDebe) }}
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="6">
              <v-card class="data-card" variant="flat" border>
                <v-card-text>
                  <div class="metric-label">Persona debe</div>
                  <div class="metric-value" :class="deudaClase(personaSeleccionada.personaDebe)">
                    {{ currency(personaSeleccionada.personaDebe) }}
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <v-data-table :headers="movimientosPersonaHeaders" :items="movimientosPersona" item-value="idMovimiento" density="comfortable">
            <template #item.fecha="{ item }">{{ formatDate(item.fecha) }}</template>
            <template #item.tipo="{ item }">{{ tipoLabel(item.tipo) }}</template>
            <template #item.monto="{ item }">
              <span :class="tipoClase(item.tipo)">{{ signoMovimiento(item.tipo) }}{{ currency(item.monto) }}</span>
            </template>
            <template #item.subsanado="{ item }">{{ currency(item.subsanado) }}</template>
            <template #item.saldo="{ item }">{{ currency(item.saldo) }}</template>
            <template #item.estado="{ item }">
              <v-chip :color="estadoColor(item.estado)" size="small">{{ item.estado }}</v-chip>
            </template>
            <template #item.actions="{ item }">
              <v-btn icon="mdi-eye" size="small" variant="text" @click="verDetalleMovimiento(item)" />
              <v-btn icon="mdi-cash-sync" size="small" variant="text" color="success" :disabled="item.estado === 'SUBSANADO'" @click="abrirSubsanacion(item)" />
              <v-btn icon="mdi-pencil" size="small" variant="text" @click="editarMovimiento(item)" />
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar.visible" :color="snackbar.color" timeout="3500">{{ snackbar.text }}</v-snackbar>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { api } from '../api.js';
import { session } from '../session.js';

const personas = ref([]);
const movimientos = ref([]);
const mediosPago = ref([]);
const detalle = ref(null);
const movimientoSeleccionado = ref(null);
const personaSeleccionada = ref(null);
const personasKey = ref(0);
const movimientosKey = ref(0);
const q = ref('');
const loadingPersonas = ref(false);
const loadingMovimientos = ref(false);
const savingPersona = ref(false);
const savingMovimiento = ref(false);
const savingSubsanacion = ref(false);
const personaDialog = ref(false);
const movimientoDialog = ref(false);
const subsanacionDialog = ref(false);
const detalleDialog = ref(false);
const movimientosPersonaDialog = ref(false);
const snackbar = ref({ visible: false, text: '', color: 'success' });

const relaciones = ['Dueno', 'Socio', 'Familiar', 'Empleado', 'Tercero', 'Inversionista'];
const tipos = [
  { value: 'APORTE_AL_NEGOCIO', label: 'Aporte al negocio' },
  { value: 'RETIRO_DEL_NEGOCIO', label: 'Retiro del negocio' },
  { value: 'PRESTAMO_AL_NEGOCIO', label: 'Prestamo al negocio' },
  { value: 'PRESTAMO_DEL_NEGOCIO', label: 'Prestamo del negocio' },
  { value: 'DEVOLUCION_RECIBIDA', label: 'Devolucion recibida' },
  { value: 'DEVOLUCION_PAGADA', label: 'Devolucion pagada' }
];

const personaForm = reactive(emptyPersona());
const movimientoForm = reactive(emptyMovimiento());
const subsanacionForm = reactive(emptySubsanacion());

const personasHeaders = [
  { title: 'Nombre', key: 'nombre' },
  { title: 'Relacion', key: 'relacion' },
  { title: 'Negocio debe', key: 'negocioDebe' },
  { title: 'Persona debe', key: 'personaDebe' },
  { title: '', key: 'actions', sortable: false, align: 'end' }
];

const movimientosHeaders = [
  { title: 'Fecha', key: 'fecha' },
  { title: 'Persona', key: 'persona' },
  { title: 'Tipo', key: 'tipo' },
  { title: 'Monto', key: 'monto' },
  { title: 'Subsanado', key: 'subsanado' },
  { title: 'Saldo', key: 'saldo' },
  { title: 'Estado', key: 'estado' },
  { title: 'Descripcion', key: 'descripcion' },
  { title: '', key: 'actions', sortable: false, align: 'end' }
];

const totalNegocioDebe = computed(() => personas.value.reduce((sum, persona) => sum + Number(persona.negocioDebe || 0), 0));
const totalPersonaDebe = computed(() => personas.value.reduce((sum, persona) => sum + Number(persona.personaDebe || 0), 0));
const puedeGuardarSubsanacion = computed(() => Number(subsanacionForm.monto || 0) > 0 && Number(subsanacionForm.monto || 0) <= Number(movimientoSeleccionado.value?.saldo || 0));
const movimientosPersonaHeaders = movimientosHeaders.filter((header) => header.key !== 'persona');
const movimientosPersona = computed(() => {
  if (!personaSeleccionada.value?.idPersonaFinanciera) return [];
  return movimientos.value.filter((item) => item.idPersonaFinanciera === personaSeleccionada.value.idPersonaFinanciera);
});

function emptyPersona() {
  return { idPersonaFinanciera: null, nombre: '', relacion: 'Tercero', numeroTelefono: '', notas: '' };
}

function emptyMovimiento() {
  return { idMovimiento: null, idPersonaFinanciera: null, tipo: 'APORTE_AL_NEGOCIO', monto: 0, descripcion: '' };
}

function emptySubsanacion() {
  return { monto: 0, idMedioPago: null, referencia: '', descripcion: '' };
}

function currency(value) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value || 0);
}

function formatDate(value) {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

function tipoLabel(value) {
  return tipos.find((tipo) => tipo.value === value)?.label || value;
}

function esEntrada(value) {
  return ['APORTE_AL_NEGOCIO', 'PRESTAMO_AL_NEGOCIO', 'DEVOLUCION_RECIBIDA'].includes(value);
}

function tipoClase(value) {
  return esEntrada(value) ? 'money-in' : 'money-out';
}

function signoMovimiento(value) {
  return esEntrada(value) ? '+ ' : '- ';
}

function deudaClase(value) {
  return Number(value || 0) > 0 ? 'debt-positive' : 'debt-cleared';
}

function estadoColor(estado) {
  if (estado === 'SUBSANADO') return 'success';
  if (estado === 'PARCIAL') return 'warning';
  return 'error';
}

function notify(text, color = 'success') {
  snackbar.value = { visible: true, text, color };
}

async function loadPersonas() {
  loadingPersonas.value = true;
  try {
    personas.value = await api.get(`/personas-financieras?q=${encodeURIComponent(q.value)}`);
    personasKey.value += 1;
  } finally {
    loadingPersonas.value = false;
  }
}

async function loadMovimientos() {
  loadingMovimientos.value = true;
  try {
    movimientos.value = await api.get('/prestamos-aportes');
    movimientosKey.value += 1;
  } finally {
    loadingMovimientos.value = false;
  }
}

async function loadMediosPago() {
  mediosPago.value = await api.get('/medios-pago');
}

async function refrescarPrestamosAportes() {
  await Promise.all([loadPersonas(), loadMovimientos()]);

  if (movimientoSeleccionado.value?.idMovimiento) {
    const actualizado = movimientos.value.find((item) => item.idMovimiento === movimientoSeleccionado.value.idMovimiento);
    if (actualizado) movimientoSeleccionado.value = actualizado;
  }

  if (personaSeleccionada.value?.idPersonaFinanciera) {
    const personaActualizada = personas.value.find((item) => item.idPersonaFinanciera === personaSeleccionada.value.idPersonaFinanciera);
    if (personaActualizada) personaSeleccionada.value = personaActualizada;
  }

  if (detalleDialog.value && detalle.value?.idMovimiento) {
    detalle.value = await api.get(`/prestamos-aportes/${detalle.value.idMovimiento}`);
  }
}

function verMovimientosPersona(_event, row) {
  personaSeleccionada.value = row.item;
  movimientosPersonaDialog.value = true;
}

function nuevaPersona() {
  Object.assign(personaForm, emptyPersona());
  personaDialog.value = true;
}

function editarPersona(item) {
  Object.assign(personaForm, item);
  personaDialog.value = true;
}

function nuevoMovimiento() {
  Object.assign(movimientoForm, emptyMovimiento());
  movimientoDialog.value = true;
}

function editarMovimiento(item) {
  Object.assign(movimientoForm, {
    idMovimiento: item.idMovimiento,
    idPersonaFinanciera: item.idPersonaFinanciera,
    tipo: item.tipo,
    monto: item.monto,
    descripcion: item.descripcion || ''
  });
  movimientoDialog.value = true;
}

async function guardarPersona() {
  savingPersona.value = true;
  try {
    if (personaForm.idPersonaFinanciera) await api.put(`/personas-financieras/${personaForm.idPersonaFinanciera}`, personaForm);
    else await api.post('/personas-financieras', personaForm);
    personaDialog.value = false;
    await refrescarPrestamosAportes();
  } catch (err) {
    notify(err.message, 'error');
  } finally {
    savingPersona.value = false;
  }
}

async function guardarMovimiento() {
  savingMovimiento.value = true;
  try {
    const payload = {
      ...movimientoForm,
      monto: Number(movimientoForm.monto),
      idUsuario: session.usuario.idUsuario
    };
    if (movimientoForm.idMovimiento) await api.put(`/prestamos-aportes/${movimientoForm.idMovimiento}`, payload);
    else await api.post('/prestamos-aportes', payload);
    movimientoDialog.value = false;
    notify(`Movimiento ${movimientoForm.idMovimiento ? 'actualizado' : 'registrado'}`);
    await refrescarPrestamosAportes();
  } catch (err) {
    notify(err.message, 'error');
  } finally {
    savingMovimiento.value = false;
  }
}

function abrirSubsanacion(item) {
  movimientoSeleccionado.value = item;
  Object.assign(subsanacionForm, emptySubsanacion(), { monto: item.saldo });
  subsanacionDialog.value = true;
}

async function guardarSubsanacion() {
  savingSubsanacion.value = true;
  try {
    await api.post(`/prestamos-aportes/${movimientoSeleccionado.value.idMovimiento}/subsanaciones`, {
      ...subsanacionForm,
      monto: Number(subsanacionForm.monto),
      idUsuario: session.usuario.idUsuario
    });
    subsanacionDialog.value = false;
    notify('Subsanacion registrada');
    await refrescarPrestamosAportes();
  } catch (err) {
    notify(err.message, 'error');
  } finally {
    savingSubsanacion.value = false;
  }
}

async function verDetalleMovimiento(item) {
  try {
    detalle.value = await api.get(`/prestamos-aportes/${item.idMovimiento}`);
    detalleDialog.value = true;
  } catch (err) {
    notify(err.message, 'error');
  }
}

onMounted(async () => {
  await Promise.all([loadPersonas(), loadMovimientos(), loadMediosPago()]);
});
</script>

<style scoped>
.header-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.metric-label {
  color: #667085;
  font-weight: 600;
}

.metric-value {
  font-size: 1.35rem;
  font-weight: 760;
  margin-top: 8px;
}

.money-in {
  color: #2e7d32;
  font-weight: 700;
}

.money-out {
  color: #d32f2f;
  font-weight: 700;
}

.debt-positive {
  color: #d32f2f;
  font-weight: 760;
}

.debt-cleared {
  color: #2e7d32;
  font-weight: 760;
}

.empty-row {
  color: #667085;
  padding: 24px 16px;
  text-align: center;
}
</style>
