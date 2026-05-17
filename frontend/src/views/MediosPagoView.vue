<template>
  <section class="page">
    <div class="page-header">
      <div>
        <div class="page-title">Medios de pago</div>
        <div class="page-subtitle">Catalogo usado al cobrar ventas.</div>
      </div>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="nuevo">Nuevo medio</v-btn>
    </div>

    <v-card class="data-card" variant="flat" border>
      <v-data-table :headers="headers" :items="medios" :loading="loading" item-value="idMedioPago">
        <template #item.activo="{ item }">
          <v-chip :color="item.activo ? 'success' : 'secondary'" size="small">{{ item.activo ? 'Activo' : 'Inactivo' }}</v-chip>
        </template>
        <template #item.actions="{ item }">
          <v-btn icon="mdi-pencil" size="small" variant="text" @click="editar(item)" />
          <v-btn icon="mdi-delete" size="small" variant="text" color="error" @click="eliminar(item)" />
        </template>
      </v-data-table>
    </v-card>

    <v-dialog v-model="dialog" max-width="520">
      <v-card>
        <v-card-title>{{ form.idMedioPago ? 'Editar medio' : 'Nuevo medio' }}</v-card-title>
        <v-card-text>
          <v-text-field v-model="form.nombre" label="Nombre" />
          <v-switch v-model="form.activo" label="Activo" color="primary" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="dialog = false">Cancelar</v-btn>
          <v-btn color="primary" :loading="saving" @click="guardar">Guardar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </section>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { api } from '../api.js';

const medios = ref([]);
const loading = ref(false);
const saving = ref(false);
const dialog = ref(false);
const form = reactive(empty());

const headers = [
  { title: 'ID', key: 'idMedioPago' },
  { title: 'Nombre', key: 'nombre' },
  { title: 'Estado', key: 'activo' },
  { title: '', key: 'actions', sortable: false, align: 'end' }
];

function empty() {
  return { idMedioPago: null, nombre: '', activo: true };
}

async function load() {
  loading.value = true;
  try {
    medios.value = await api.get('/medios-pago?incluirInactivos=1');
  } finally {
    loading.value = false;
  }
}

function nuevo() {
  Object.assign(form, empty());
  dialog.value = true;
}

function editar(item) {
  Object.assign(form, { ...item, activo: Boolean(item.activo) });
  dialog.value = true;
}

async function guardar() {
  saving.value = true;
  try {
    if (form.idMedioPago) await api.put(`/medios-pago/${form.idMedioPago}`, form);
    else await api.post('/medios-pago', form);
    dialog.value = false;
    await load();
  } finally {
    saving.value = false;
  }
}

async function eliminar(item) {
  await api.delete(`/medios-pago/${item.idMedioPago}`);
  await load();
}

onMounted(load);
</script>
