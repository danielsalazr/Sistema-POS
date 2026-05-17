<template>
  <section class="page">
    <div class="page-header">
      <div>
        <div class="page-title">Proveedores</div>
        <div class="page-subtitle">Catalogo de proveedores para compras.</div>
      </div>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="nuevo">Nuevo proveedor</v-btn>
    </div>

    <v-card class="data-card" variant="flat" border>
      <v-card-text>
        <v-text-field v-model="q" label="Buscar" prepend-inner-icon="mdi-magnify" hide-details @input="load" />
      </v-card-text>
      <v-data-table :headers="headers" :items="proveedores" :loading="loading" item-value="idProveedor">
        <template #item.actions="{ item }">
          <v-btn icon="mdi-pencil" size="small" variant="text" @click="editar(item)" />
          <v-btn icon="mdi-delete" size="small" variant="text" color="error" @click="eliminar(item)" />
        </template>
      </v-data-table>
    </v-card>

    <v-dialog v-model="dialog" max-width="640">
      <v-card>
        <v-card-title>{{ form.idProveedor ? 'Editar proveedor' : 'Nuevo proveedor' }}</v-card-title>
        <v-card-text>
          <div class="form-grid">
            <v-text-field v-model="form.nombre" label="Nombre" />
            <v-text-field v-model="form.numeroTelefono" label="Telefono" />
            <v-text-field v-model="form.correo" label="Correo" />
            <v-text-field v-model="form.direccion" label="Direccion" />
          </div>
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

const proveedores = ref([]);
const q = ref('');
const loading = ref(false);
const saving = ref(false);
const dialog = ref(false);
const form = reactive(empty());

const headers = [
  { title: 'Nombre', key: 'nombre' },
  { title: 'Telefono', key: 'numeroTelefono' },
  { title: 'Correo', key: 'correo' },
  { title: 'Direccion', key: 'direccion' },
  { title: '', key: 'actions', sortable: false, align: 'end' }
];

function empty() {
  return { idProveedor: null, nombre: '', numeroTelefono: '', correo: '', direccion: '' };
}

async function load() {
  loading.value = true;
  try {
    proveedores.value = await api.get(`/proveedores?q=${encodeURIComponent(q.value)}`);
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
    if (form.idProveedor) await api.put(`/proveedores/${form.idProveedor}`, form);
    else await api.post('/proveedores', form);
    dialog.value = false;
    await load();
  } finally {
    saving.value = false;
  }
}

async function eliminar(item) {
  await api.delete(`/proveedores/${item.idProveedor}`);
  await load();
}

onMounted(load);
</script>
