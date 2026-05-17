<template>
  <section class="page">
    <div class="page-header">
      <div>
        <div class="page-title">Usuarios</div>
        <div class="page-subtitle">Usuarios del sistema y base para permisos.</div>
      </div>
      <v-btn color="primary" prepend-icon="mdi-account-plus" @click="dialog = true">Nuevo usuario</v-btn>
    </div>

    <v-card class="data-card" variant="flat" border>
      <v-data-table :headers="headers" :items="usuarios" :loading="loading" item-value="idUsuario">
        <template #item.actions="{ item }">
          <v-btn icon="mdi-shield-account" size="small" variant="text" @click="abrirPermisos(item)" />
        </template>
      </v-data-table>
    </v-card>

    <v-dialog v-model="dialog" max-width="520">
      <v-card>
        <v-card-title>Nuevo usuario</v-card-title>
        <v-card-text>
          <v-text-field v-model="form.nombre" label="Usuario" />
          <v-text-field v-model="form.contrasena" label="Contrasena" type="password" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="dialog = false">Cancelar</v-btn>
          <v-btn color="primary" :loading="saving" @click="guardar">Guardar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="permisosDialog" max-width="760">
      <v-card>
        <v-card-title>Permisos de {{ usuarioSeleccionado?.nombre }}</v-card-title>
        <v-card-text>
          <v-row>
            <v-col v-for="permiso in permisos" :key="permiso.idPermiso" cols="12" md="6">
              <v-checkbox v-model="permisosSeleccionados" :label="permiso.clave" :value="permiso.idPermiso" density="compact" hide-details />
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="permisosDialog = false">Cancelar</v-btn>
          <v-btn color="primary" :loading="savingPermisos" @click="guardarPermisos">Guardar permisos</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </section>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { api } from '../api.js';

const usuarios = ref([]);
const permisos = ref([]);
const permisosSeleccionados = ref([]);
const usuarioSeleccionado = ref(null);
const loading = ref(false);
const saving = ref(false);
const savingPermisos = ref(false);
const dialog = ref(false);
const permisosDialog = ref(false);
const form = reactive({ nombre: '', contrasena: '' });

const headers = [
  { title: 'ID', key: 'idUsuario' },
  { title: 'Usuario', key: 'nombre' },
  { title: '', key: 'actions', sortable: false, align: 'end' }
];

async function load() {
  loading.value = true;
  try {
    const [usuariosPayload, permisosPayload] = await Promise.all([api.get('/usuarios'), api.get('/permisos')]);
    usuarios.value = usuariosPayload;
    permisos.value = permisosPayload;
  } finally {
    loading.value = false;
  }
}

async function guardar() {
  saving.value = true;
  try {
    await api.post('/usuarios', form);
    form.nombre = '';
    form.contrasena = '';
    dialog.value = false;
    await load();
  } finally {
    saving.value = false;
  }
}

async function abrirPermisos(usuario) {
  usuarioSeleccionado.value = usuario;
  const actuales = await api.get(`/permisos/de/${usuario.idUsuario}`);
  permisosSeleccionados.value = actuales.map((permiso) => permiso.idPermiso);
  permisosDialog.value = true;
}

async function guardarPermisos() {
  savingPermisos.value = true;
  try {
    await api.put(`/permisos/de/${usuarioSeleccionado.value.idUsuario}`, { idPermisos: permisosSeleccionados.value });
    permisosDialog.value = false;
  } finally {
    savingPermisos.value = false;
  }
}

onMounted(load);
</script>
