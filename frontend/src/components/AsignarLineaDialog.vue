<template>
  <v-dialog :model-value="modelValue" max-width="640" scrollable :fullscreen="$vuetify.display.xs" @update:model-value="emit('update:modelValue', $event)">
    <v-card>
      <v-toolbar color="surface" density="comfortable">
        <v-btn icon="mdi-close" aria-label="Cerrar" @click="cerrar" />
        <v-toolbar-title>Asignar productos a una línea</v-toolbar-title>
      </v-toolbar>

      <v-card-text class="asignar__filtros">
        <v-alert v-if="error" class="mb-3" type="error" density="compact">{{ error }}</v-alert>
        <v-alert v-if="resultado" class="mb-3" type="success" density="compact">
          {{ resultado.actualizados }} producto(s) asignados. {{ resultado.ventasClasificadas }} renglón(es) de ventas históricas quedaron clasificados.
        </v-alert>
        <v-select
          v-model="idLineaDestino"
          :items="opcionesLinea"
          item-title="nombre"
          item-value="idLineaProducto"
          label="Línea destino"
          prepend-inner-icon="mdi-shape-outline"
        />
        <div class="asignar__busqueda">
          <v-text-field v-model="busqueda" label="Buscar producto" prepend-inner-icon="mdi-magnify" hide-details clearable />
          <v-switch v-model="soloSinLinea" label="Solo sin línea" color="primary" hide-details density="compact" />
        </div>
      </v-card-text>

      <v-divider />

      <v-card-text class="asignar__lista">
        <v-progress-linear v-if="cargando" indeterminate color="primary" />
        <div class="asignar__seleccion" role="button" @click="marcarVisibles(!todosVisiblesMarcados)">
          <v-checkbox-btn :model-value="todosVisiblesMarcados" :indeterminate="algunosVisiblesMarcados" @click.stop @update:model-value="marcarVisibles" />
          <span>{{ seleccion.length }} seleccionado(s) · {{ productosVisibles.length }} visibles</span>
        </div>
        <v-list density="comfortable" class="py-0">
          <v-list-item v-for="producto in productosVisibles" :key="producto.idProducto" class="asignar__item" @click="alternar(producto.idProducto)">
            <template #prepend>
              <v-checkbox-btn :model-value="seleccion.includes(producto.idProducto)" @click.stop="alternar(producto.idProducto)" />
            </template>
            <v-list-item-title>{{ producto.descripcion }}</v-list-item-title>
            <v-list-item-subtitle>{{ producto.lineaProducto || 'Sin línea' }}</v-list-item-subtitle>
          </v-list-item>
        </v-list>
        <div v-if="!cargando && productosVisibles.length === 0" class="asignar__vacio">No hay productos con este filtro.</div>
      </v-card-text>

      <v-divider />

      <v-card-actions class="asignar__acciones">
        <div class="asignar__aviso">Las ventas históricas sin línea de estos productos se clasificarán con la línea elegida.</div>
        <v-btn block size="large" color="primary" variant="flat" :disabled="!puedeAsignar" :loading="guardando" @click="asignar">
          {{ idLineaDestino === QUITAR ? 'Quitar línea a' : 'Asignar' }} {{ seleccion.length }} producto(s)
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { api } from '../api.js';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  lineas: { type: Array, default: () => [] },
  idLineaInicial: { type: Number, default: undefined }
});
const emit = defineEmits(['update:modelValue', 'asignado']);

const QUITAR = 'quitar';
const productos = ref([]);
const seleccion = ref([]);
const busqueda = ref('');
const soloSinLinea = ref(true);
const idLineaDestino = ref(null);
const cargando = ref(false);
const guardando = ref(false);
const error = ref('');
const resultado = ref(null);

const opcionesLinea = computed(() => [
  ...props.lineas.filter((linea) => linea.activa),
  { idLineaProducto: QUITAR, nombre: 'Sin línea (quitar línea)' }
]);

const productosVisibles = computed(() => {
  const texto = (busqueda.value || '').trim().toLowerCase();
  return productos.value.filter((producto) => (!soloSinLinea.value || !producto.idLineaProducto)
    && (!texto || producto.descripcion.toLowerCase().includes(texto)));
});
const todosVisiblesMarcados = computed(() => productosVisibles.value.length > 0
  && productosVisibles.value.every((producto) => seleccion.value.includes(producto.idProducto)));
const algunosVisiblesMarcados = computed(() => !todosVisiblesMarcados.value
  && productosVisibles.value.some((producto) => seleccion.value.includes(producto.idProducto)));
const puedeAsignar = computed(() => seleccion.value.length > 0 && idLineaDestino.value != null);

async function cargarProductos() {
  cargando.value = true;
  try {
    productos.value = await api.get('/productos');
  } catch (err) {
    error.value = err.message;
  } finally {
    cargando.value = false;
  }
}

function alternar(idProducto) {
  seleccion.value = seleccion.value.includes(idProducto)
    ? seleccion.value.filter((id) => id !== idProducto)
    : [...seleccion.value, idProducto];
}

function marcarVisibles(marcar) {
  const visibles = productosVisibles.value.map((producto) => producto.idProducto);
  seleccion.value = marcar
    ? [...new Set([...seleccion.value, ...visibles])]
    : seleccion.value.filter((id) => !visibles.includes(id));
}

async function asignar() {
  guardando.value = true;
  error.value = '';
  try {
    const idLinea = idLineaDestino.value === QUITAR ? null : idLineaDestino.value;
    resultado.value = await api.post('/lineas-producto/asignar', { idLineaProducto: idLinea, idProductos: seleccion.value });
    seleccion.value = [];
    await cargarProductos();
    emit('asignado', resultado.value);
  } catch (err) {
    error.value = err.message;
  } finally {
    guardando.value = false;
  }
}

function cerrar() {
  emit('update:modelValue', false);
}

watch(() => props.modelValue, (abierto) => {
  if (!abierto) return;
  seleccion.value = [];
  resultado.value = null;
  error.value = '';
  idLineaDestino.value = props.idLineaInicial ?? null;
  cargarProductos();
});
</script>

<style scoped>
.asignar__filtros {
  flex: 0 0 auto;
  padding-bottom: 8px;
}

.asignar__busqueda {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  align-items: center;
}

.asignar__busqueda .v-text-field {
  flex: 1 1 220px;
}

.asignar__lista {
  padding-top: 4px;
}

.asignar__seleccion {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  color: #667085;
  min-height: 48px;
}

.asignar__item {
  min-height: 56px;
}

.asignar__vacio {
  color: #667085;
  padding: 16px 4px;
}

.asignar__acciones {
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
  padding: 12px 16px;
}

.asignar__aviso {
  color: #667085;
  font-size: 0.85rem;
}
</style>
