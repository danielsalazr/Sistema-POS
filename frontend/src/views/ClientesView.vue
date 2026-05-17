<template>
  <section class="page">
    <div class="page-header">
      <div>
        <div class="page-title">Clientes</div>
        <div class="page-subtitle">Directorio de clientes del POS.</div>
      </div>
      <v-btn color="primary" prepend-icon="mdi-account-plus" @click="nuevo">Nuevo cliente</v-btn>
    </div>

    <v-card class="data-card" variant="flat" border>
      <v-card-text>
        <v-text-field v-model="q" label="Buscar" prepend-inner-icon="mdi-magnify" hide-details @input="load" />
      </v-card-text>
      <v-data-table :headers="headers" :items="clientes" :loading="loading" item-value="idCliente">
        <template #item.actions="{ item }">
          <v-btn icon="mdi-pencil" size="small" variant="text" @click="editar(item)" />
          <v-btn icon="mdi-delete" size="small" variant="text" color="error" :disabled="item.idCliente === 1" @click="eliminar(item)" />
        </template>
      </v-data-table>
    </v-card>

    <v-dialog v-model="dialog" max-width="560">
      <v-card>
        <v-card-title>{{ form.idCliente ? 'Editar cliente' : 'Nuevo cliente' }}</v-card-title>
        <v-card-text>
          <v-text-field v-model="form.nombreCompleto" label="Nombre completo" />
          <v-text-field v-model="form.numeroTelefono" label="Telefono" />
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

const loading = ref(false);
const saving = ref(false);
const dialog = ref(false);
const q = ref('');
const clientes = ref([]);
const form = reactive(empty());

const headers = [
  { title: 'Nombre', key: 'nombreCompleto' },
  { title: 'Telefono', key: 'numeroTelefono' },
  { title: '', key: 'actions', sortable: false, align: 'end' }
];

function empty() {
  return { idCliente: null, nombreCompleto: '', numeroTelefono: '' };
}

async function load() {
  loading.value = true;
  try {
    clientes.value = await api.get(`/clientes?q=${encodeURIComponent(q.value)}`);
  } finally {
    loading.value = false;
  }
}

function nuevo() {
  Object.assign(form, empty());
  dialog.value = true;
}

function editar(item) {
  Object.assign(form, item);
  dialog.value = true;
}

async function guardar() {
  saving.value = true;
  try {
    if (form.idCliente) await api.put(`/clientes/${form.idCliente}`, form);
    else await api.post('/clientes', form);
    dialog.value = false;
    await load();
  } finally {
    saving.value = false;
  }
}

async function eliminar(item) {
  await api.delete(`/clientes/${item.idCliente}`);
  await load();
}

onMounted(load);
</script>
