<template>
  <div>
    <div class="catalogo-toolbar">
      <v-btn color="primary" size="large" prepend-icon="mdi-plus" @click="abrirNuevo">{{ textoNuevo }}</v-btn>
      <slot name="acciones" />
      <v-spacer />
      <v-switch v-model="mostrarInactivos" :label="`Ver ${etiquetaPlural} ${g.inactivos}`" color="primary" density="compact" hide-details @update:model-value="cargar" />
    </div>

    <v-alert v-if="error" class="mb-3" type="error" density="compact" closable @click:close="error = ''">{{ error }}</v-alert>

    <v-progress-linear v-if="cargando" indeterminate color="primary" class="mb-2" />

    <v-row dense>
      <v-col v-for="registro in registros" :key="registro[idCampo]" cols="12" sm="6" lg="4">
        <v-card class="catalogo-card" variant="flat" border :class="{ 'catalogo-card--inactivo': !registro[campoActivo] }">
          <div class="catalogo-card__cuerpo">
            <div class="catalogo-card__texto">
              <div class="catalogo-card__nombre">{{ registro.nombre }}</div>
              <div class="catalogo-card__detalle">
                <span v-for="uso in usos" :key="uso.campo">{{ registro[uso.campo] || 0 }} {{ uso.etiqueta }}</span>
                <v-chip v-if="!registro[campoActivo]" size="x-small" color="secondary" variant="tonal">{{ g.inactivo }}</v-chip>
              </div>
              <slot name="detalle" :registro="registro" />
            </div>
            <v-menu location="bottom end">
              <template #activator="{ props: menuProps }">
                <v-btn v-bind="menuProps" icon="mdi-dots-vertical" variant="text" size="large" :aria-label="`Acciones de ${registro.nombre}`" />
              </template>
              <v-list density="comfortable" min-width="220">
                <v-list-item prepend-icon="mdi-pencil" title="Renombrar" @click="abrirRenombrar(registro)" />
                <slot name="menu" :registro="registro" />
                <v-list-item
                  :prepend-icon="registro[campoActivo] ? 'mdi-eye-off' : 'mdi-eye'"
                  :title="registro[campoActivo] ? 'Desactivar' : 'Activar'"
                  @click="cambiarActivo(registro, !registro[campoActivo])"
                />
                <v-list-item prepend-icon="mdi-delete" title="Eliminar" base-color="error" @click="pedirEliminar(registro)" />
              </v-list>
            </v-menu>
          </div>
        </v-card>
      </v-col>
      <slot name="extra" />
    </v-row>

    <div v-if="!cargando && registros.length === 0" class="catalogo-vacio">
      Aún no hay {{ etiquetaPlural }}{{ mostrarInactivos ? '' : ` ${g.activos}` }}. Crea {{ g.primero }} con "{{ textoNuevo }}".
    </div>

    <v-dialog v-model="dialogoForm" max-width="520" :fullscreen="$vuetify.display.xs">
      <v-card>
        <v-card-title>{{ form.id ? `Renombrar ${etiquetaSingular}` : textoNuevo }}</v-card-title>
        <v-card-text>
          <v-alert v-if="errorForm" class="mb-3" type="error" density="compact">{{ errorForm }}</v-alert>
          <v-text-field v-model="form.nombre" label="Nombre" autofocus @keyup.enter="guardar" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn size="large" variant="text" @click="dialogoForm = false">Cancelar</v-btn>
          <v-btn size="large" color="primary" :loading="guardando" :disabled="!form.nombre.trim()" @click="guardar">Guardar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="dialogoEliminar" max-width="460" :fullscreen="$vuetify.display.xs">
      <v-card>
        <v-card-title>{{ enUso ? 'No se puede eliminar' : `Eliminar ${etiquetaSingular}` }}</v-card-title>
        <v-card-text>
          <template v-if="enUso">
            "{{ seleccionado?.nombre }}" está en uso ({{ textoUso }}). Para dejar de usar{{ g.lo }} puedes desactivar{{ g.lo }}: no aparecerá en los selectores,
            pero se conserva en los reportes.
          </template>
          <template v-else>¿Eliminar "{{ seleccionado?.nombre }}"? Esta acción no se puede deshacer.</template>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn size="large" variant="text" @click="dialogoEliminar = false">Cancelar</v-btn>
          <v-btn v-if="enUso && seleccionado?.[campoActivo]" size="large" color="primary" @click="desactivarDesdeEliminar">Desactivar</v-btn>
          <v-btn v-if="!enUso" size="large" color="error" :loading="guardando" @click="eliminar">Eliminar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { api } from '../api.js';

const props = defineProps({
  endpoint: { type: String, required: true },
  idCampo: { type: String, required: true },
  campoActivo: { type: String, default: 'activo' },
  etiquetaSingular: { type: String, required: true },
  etiquetaPlural: { type: String, required: true },
  textoNuevo: { type: String, required: true },
  usos: { type: Array, default: () => [] },
  femenino: { type: Boolean, default: true }
});
const emit = defineEmits(['cambio']);

const registros = ref([]);
const cargando = ref(false);
const guardando = ref(false);
const error = ref('');
const errorForm = ref('');
const mostrarInactivos = ref(false);
const dialogoForm = ref(false);
const dialogoEliminar = ref(false);
const seleccionado = ref(null);
const enUso = ref(null);
const form = reactive({ id: null, nombre: '' });

const g = computed(() => (props.femenino
  ? { inactivos: 'inactivas', activos: 'activas', inactivo: 'Inactiva', primero: 'la primera', lo: 'la' }
  : { inactivos: 'inactivos', activos: 'activos', inactivo: 'Inactivo', primero: 'el primero', lo: 'lo' }));

const textoUso = computed(() => (enUso.value
  ? props.usos.map((uso) => `${enUso.value[uso.campo] || 0} ${uso.etiqueta}`).join(', ')
  : ''));

async function cargar() {
  cargando.value = true;
  try {
    registros.value = await api.get(`${props.endpoint}${mostrarInactivos.value ? '?incluirInactivas=1' : ''}`);
    error.value = '';
  } catch (err) {
    error.value = err.message;
  } finally {
    cargando.value = false;
  }
}

function abrirNuevo() {
  Object.assign(form, { id: null, nombre: '' });
  errorForm.value = '';
  dialogoForm.value = true;
}

function abrirRenombrar(registro) {
  Object.assign(form, { id: registro[props.idCampo], nombre: registro.nombre });
  errorForm.value = '';
  dialogoForm.value = true;
}

async function guardar() {
  if (!form.nombre.trim()) return;
  guardando.value = true;
  errorForm.value = '';
  try {
    if (form.id) await api.put(`${props.endpoint}/${form.id}`, { nombre: form.nombre });
    else await api.post(props.endpoint, { nombre: form.nombre });
    dialogoForm.value = false;
    await cargar();
    emit('cambio');
  } catch (err) {
    errorForm.value = err.message;
  } finally {
    guardando.value = false;
  }
}

async function cambiarActivo(registro, activo) {
  try {
    await api.put(`${props.endpoint}/${registro[props.idCampo]}`, { [props.campoActivo]: activo });
    await cargar();
    emit('cambio');
  } catch (err) {
    error.value = err.message;
  }
}

function pedirEliminar(registro) {
  seleccionado.value = registro;
  enUso.value = null;
  dialogoEliminar.value = true;
}

async function eliminar() {
  guardando.value = true;
  try {
    await api.delete(`${props.endpoint}/${seleccionado.value[props.idCampo]}`);
    dialogoEliminar.value = false;
    await cargar();
    emit('cambio');
  } catch (err) {
    if (err.code === 'EN_USO') enUso.value = err;
    else {
      dialogoEliminar.value = false;
      error.value = err.message;
    }
  } finally {
    guardando.value = false;
  }
}

async function desactivarDesdeEliminar() {
  dialogoEliminar.value = false;
  await cambiarActivo(seleccionado.value, false);
}

defineExpose({ cargar, registros });
onMounted(cargar);
</script>

<style scoped>
.catalogo-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.catalogo-card {
  border-radius: 8px;
  min-height: 72px;
}

.catalogo-card--inactivo {
  opacity: 0.65;
}

.catalogo-card__cuerpo {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 8px 12px 16px;
}

.catalogo-card__texto {
  flex: 1;
  min-width: 0;
}

.catalogo-card__nombre {
  font-weight: 650;
  overflow-wrap: anywhere;
}

.catalogo-card__detalle {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  align-items: center;
  color: #667085;
  font-size: 0.88rem;
  margin-top: 2px;
}

.catalogo-vacio {
  color: #667085;
  padding: 24px 4px;
}
</style>
