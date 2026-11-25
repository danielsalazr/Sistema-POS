<template>
  <div>
    <v-alert v-if="!centros.length" class="mb-3" type="info" variant="tonal" density="compact">
      Crea primero tus centros de costo en la pestaña "Centros de costo".
    </v-alert>
    <v-alert v-if="error" class="mb-3" type="error" density="compact" closable @click:close="error = ''">{{ error }}</v-alert>
    <v-alert v-if="mensaje" class="mb-3" type="success" density="compact" closable @click:close="mensaje = ''">{{ mensaje }}</v-alert>

    <div class="panel-filtros">
      <v-btn-toggle v-model="pendiente" color="primary" variant="outlined" divided mandatory @update:model-value="cargar">
        <v-btn value="centro">Sin centro</v-btn>
        <v-btn value="tipo">Sin tipo</v-btn>
      </v-btn-toggle>
      <v-text-field
        v-model="busqueda"
        class="panel-busqueda"
        label="Buscar descripción"
        prepend-inner-icon="mdi-magnify"
        hide-details
        clearable
        @update:model-value="buscarConPausa"
      />
    </div>

    <div class="panel-progreso">
      <strong>{{ numero(resumen.totalItems) }}</strong> ítems {{ pendiente === 'centro' ? 'sin centro de costo' : 'sin tipo de gasto' }}
      · {{ moneda(resumen.totalValor) }} · {{ numero(grupos.length) }} descripciones
    </div>

    <v-progress-linear v-if="cargando" indeterminate color="primary" class="mb-2" />

    <div v-if="!cargando && grupos.length === 0" class="panel-vacio">
      {{ busqueda ? 'No hay ítems pendientes con esa descripción.' : '¡Todo clasificado! No hay ítems pendientes.' }}
    </div>

    <v-card v-for="grupo in gruposVisibles" :key="grupo.descripcion" class="grupo mb-3" variant="flat" border>
      <v-card-text>
        <div class="grupo__titulo">{{ grupo.ejemplo }}</div>
        <div class="grupo__detalle">
          {{ grupo.cantidadItems }} ítem(s) · {{ moneda(grupo.total) }} · {{ rangoFechas(grupo) }}
        </div>
        <div class="grupo__acciones">
          <v-select
            v-if="pendiente === 'centro'"
            v-model="seleccion(grupo).idCentroCosto"
            :items="centros"
            item-title="nombre"
            item-value="idCentroCosto"
            label="Centro de costo"
            density="comfortable"
            hide-details
          />
          <v-select
            v-model="seleccion(grupo).idTipoGasto"
            :items="tipos"
            item-title="nombre"
            item-value="idTipoGasto"
            :label="pendiente === 'centro' ? 'Tipo (opcional)' : 'Tipo de gasto'"
            density="comfortable"
            hide-details
            clearable
          />
          <v-btn
            color="primary"
            size="large"
            :loading="guardando === grupo.descripcion"
            :disabled="!puedeAplicar(grupo)"
            @click="aplicar(grupo)"
          >
            {{ itemsMarcados(grupo).length ? `Aplicar a ${itemsMarcados(grupo).length}` : `Aplicar a ${grupo.cantidadItems}` }}
          </v-btn>
        </div>
        <v-btn class="mt-2 px-1" variant="text" size="small" :append-icon="abiertos.has(grupo.descripcion) ? 'mdi-chevron-up' : 'mdi-chevron-down'" @click="alternarGrupo(grupo)">
          {{ abiertos.has(grupo.descripcion) ? 'Ocultar ítems' : 'Ver ítems' }}
        </v-btn>
        <div v-if="abiertos.has(grupo.descripcion)" class="grupo__items">
          <div class="grupo__ayuda">Marca ítems para aplicar solo a ellos; sin marcar se aplica a todo el grupo.</div>
          <label v-for="item in grupo.items" :key="item.idProductoComprado" class="item">
            <v-checkbox-btn :model-value="itemsMarcados(grupo).includes(item.idProductoComprado)" @update:model-value="alternarItem(grupo, item.idProductoComprado)" />
            <span class="item__texto">
              <span>{{ fecha(item.fecha) }} · {{ item.proveedor || 'Sin proveedor' }} · compra #{{ item.idCompra }}</span>
              <span class="item__valor">{{ numero(item.cantidadComprada) }} × {{ moneda(item.precioCompra) }} = <strong>{{ moneda(item.subtotal) }}</strong></span>
            </span>
          </label>
        </div>
      </v-card-text>
    </v-card>

    <v-btn v-if="gruposVisibles.length < grupos.length" block variant="tonal" size="large" @click="limite += 40">
      Ver más ({{ grupos.length - gruposVisibles.length }} descripciones restantes)
    </v-btn>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { api } from '../api.js';
import { formatLocalDateTime } from '../dates.js';

const props = defineProps({
  centros: { type: Array, default: () => [] },
  tipos: { type: Array, default: () => [] }
});

const pendiente = ref('centro');
const busqueda = ref('');
const grupos = ref([]);
const resumen = ref({ totalItems: 0, totalValor: 0 });
const cargando = ref(false);
const guardando = ref('');
const error = ref('');
const mensaje = ref('');
const limite = ref(40);
const abiertos = ref(new Set());
const selecciones = reactive({});
let temporizador = null;

const gruposVisibles = computed(() => grupos.value.slice(0, limite.value));

const SELECCION_VACIA = Object.freeze({ idCentroCosto: null, idTipoGasto: null, items: [] });

function seleccion(grupo) {
  return selecciones[grupo.descripcion] || SELECCION_VACIA;
}

function itemsMarcados(grupo) {
  return seleccion(grupo).items;
}

function puedeAplicar(grupo) {
  const actual = seleccion(grupo);
  return pendiente.value === 'centro' ? Boolean(actual.idCentroCosto) : Boolean(actual.idTipoGasto);
}

function alternarGrupo(grupo) {
  const copia = new Set(abiertos.value);
  if (copia.has(grupo.descripcion)) copia.delete(grupo.descripcion);
  else copia.add(grupo.descripcion);
  abiertos.value = copia;
}

function alternarItem(grupo, idItem) {
  const actual = seleccion(grupo);
  actual.items = actual.items.includes(idItem) ? actual.items.filter((id) => id !== idItem) : [...actual.items, idItem];
}

function moneda(valor) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor || 0);
}

function numero(valor) {
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(valor || 0);
}

function fecha(valor) {
  return formatLocalDateTime(valor);
}

function rangoFechas(grupo) {
  const desde = fecha(grupo.desde);
  const hasta = fecha(grupo.hasta);
  return desde === hasta ? desde : `${desde} – ${hasta}`;
}

async function cargar() {
  cargando.value = true;
  error.value = '';
  try {
    const params = new URLSearchParams({ pendiente: pendiente.value });
    if (busqueda.value) params.set('q', busqueda.value);
    const respuesta = await api.get(`/compras/items-por-clasificar?${params.toString()}`);
    for (const grupo of respuesta.grupos) {
      if (!selecciones[grupo.descripcion]) selecciones[grupo.descripcion] = { idCentroCosto: null, idTipoGasto: null, items: [] };
    }
    grupos.value = respuesta.grupos;
    resumen.value = { totalItems: respuesta.totalItems, totalValor: respuesta.totalValor };
    limite.value = 40;
  } catch (err) {
    error.value = err.message;
  } finally {
    cargando.value = false;
  }
}

function buscarConPausa() {
  clearTimeout(temporizador);
  temporizador = setTimeout(cargar, 300);
}

async function aplicar(grupo) {
  const actual = seleccion(grupo);
  guardando.value = grupo.descripcion;
  error.value = '';
  try {
    const cuerpo = {
      pendiente: pendiente.value,
      idCentroCosto: pendiente.value === 'centro' ? actual.idCentroCosto : undefined,
      idTipoGasto: actual.idTipoGasto || undefined
    };
    if (actual.items.length) cuerpo.idProductoComprados = actual.items;
    else cuerpo.descripcion = grupo.descripcion;
    const resultado = await api.post('/compras/clasificar', cuerpo);
    mensaje.value = `${resultado.actualizados} ítem(s) de "${grupo.ejemplo}" clasificados.`;
    selecciones[grupo.descripcion] = { idCentroCosto: null, idTipoGasto: null, items: [] };
    await cargar();
  } catch (err) {
    error.value = err.message;
  } finally {
    guardando.value = '';
  }
}

defineExpose({ cargar });
onMounted(cargar);
</script>

<style scoped>
.panel-filtros {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin-bottom: 10px;
}

.panel-busqueda {
  flex: 1 1 240px;
}

.panel-progreso {
  color: #667085;
  margin-bottom: 12px;
}

.panel-vacio {
  color: #667085;
  padding: 24px 4px;
}

.grupo {
  border-radius: 8px;
}

.grupo__titulo {
  font-weight: 650;
  overflow-wrap: anywhere;
}

.grupo__detalle {
  color: #667085;
  font-size: 0.88rem;
  margin: 2px 0 10px;
}

.grupo__acciones {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
}

@media (max-width: 720px) {
  .grupo__acciones {
    grid-template-columns: minmax(0, 1fr);
  }
}

.grupo__items {
  border-top: 1px solid #eef0f3;
  margin-top: 6px;
  padding-top: 6px;
}

.grupo__ayuda {
  color: #667085;
  font-size: 0.82rem;
  margin-bottom: 4px;
}

.item {
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 52px;
  cursor: pointer;
  border-bottom: 1px solid #f2f4f7;
}

.item__texto {
  display: flex;
  flex-direction: column;
  font-size: 0.88rem;
  min-width: 0;
  overflow-wrap: anywhere;
}

.item__valor {
  color: #667085;
}
</style>
