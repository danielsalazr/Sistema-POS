<template>
  <section class="page">
    <div class="page-header">
      <div>
        <div class="page-title">Empresa</div>
        <div class="page-subtitle">Datos impresos en tickets y comprobantes.</div>
      </div>
      <v-btn color="primary" prepend-icon="mdi-content-save" :loading="saving" @click="guardar">Guardar</v-btn>
    </div>

    <v-card class="data-card" variant="flat" border>
      <v-card-text>
        <div class="form-grid">
          <v-text-field v-model="empresa.nombre" label="Nombre" />
          <v-text-field v-model="empresa.telefono" label="Telefono" />
          <v-text-field v-model="empresa.direccion" label="Direccion" />
          <v-textarea v-model="empresa.mensajePersonal" label="Mensaje personal" rows="3" />
        </div>
      </v-card-text>
    </v-card>
  </section>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { api } from '../api.js';

const saving = ref(false);
const empresa = reactive({ nombre: '', direccion: '', telefono: '', mensajePersonal: '' });

async function load() {
  Object.assign(empresa, await api.get('/ajustes/empresa'));
}

async function guardar() {
  saving.value = true;
  try {
    Object.assign(empresa, await api.put('/ajustes/empresa', empresa));
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>
