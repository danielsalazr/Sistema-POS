<template>
  <section class="page">
    <div class="page-header">
      <div>
        <div class="page-title">Empresa</div>
        <div class="page-subtitle">Datos impresos en tickets y comprobantes.</div>
      </div>
      <div class="d-flex ga-2">
        <v-btn variant="tonal" prepend-icon="mdi-database-arrow-down" :loading="descargandoBackup" @click="descargarBackup">Descargar backup</v-btn>
        <v-btn color="primary" prepend-icon="mdi-content-save" :loading="saving" @click="guardar">Guardar</v-btn>
      </div>
    </div>
    <v-alert v-if="backupError" class="mb-4" type="error" density="compact">{{ backupError }}</v-alert>

    <v-card class="data-card" variant="flat" border>
      <v-card-title>Datos del negocio</v-card-title>
      <v-card-text>
        <div class="form-grid">
          <v-text-field v-model="empresa.nombre" label="Nombre" />
          <v-text-field v-model="empresa.telefono" label="Telefono" />
          <v-text-field v-model="empresa.direccion" label="Direccion" />
          <v-textarea v-model="empresa.mensajePersonal" label="Mensaje personal" rows="3" />
        </div>
      </v-card-text>
    </v-card>

    <v-card class="data-card mt-4" variant="flat" border>
      <v-card-title>Impresion POS</v-card-title>
      <v-card-text>
        <div class="form-grid">
          <v-text-field
            v-model.number="impresion.width"
            label="Ancho del ticket"
            type="number"
            min="28"
            max="48"
            hint="Usa 35 si sobra espacio a la derecha. Rango permitido: 28 a 48."
            persistent-hint
          />
          <v-switch
            v-model="impresion.imprimirTicketCliente"
            color="primary"
            label="Imprimir ticket cliente"
            hide-details
          />
          <v-switch
            v-model="impresion.imprimirComandaCocina"
            color="primary"
            label="Imprimir comanda cocina"
            hide-details
          />
        </div>
      </v-card-text>
    </v-card>

    <v-card class="data-card mt-4" variant="flat" border>
      <v-card-title>Seguridad</v-card-title>
      <v-card-text>
        <v-alert class="mb-4" :type="seguridad.contrasenaEliminacionConfigurada ? 'success' : 'warning'" variant="tonal" density="compact">
          {{ seguridad.contrasenaEliminacionConfigurada ? 'La eliminacion de prestamos y aportes tiene contrasena configurada.' : 'Configura una contrasena para poder eliminar prestamos y aportes.' }}
        </v-alert>
        <div class="form-grid">
          <v-text-field
            v-model="seguridad.contrasenaEliminacion"
            label="Contrasena para eliminar prestamos y aportes"
            type="password"
            autocomplete="new-password"
            :hint="seguridad.contrasenaEliminacionConfigurada ? 'Dejalo vacio para conservar la contrasena actual.' : 'Esta contrasena sera solicitada al eliminar movimientos.'"
            persistent-hint
          />
        </div>
      </v-card-text>
    </v-card>
  </section>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { api, downloadFile } from '../api.js';

const saving = ref(false);
const descargandoBackup = ref(false);
const backupError = ref('');

async function descargarBackup() {
  descargandoBackup.value = true;
  backupError.value = '';
  try {
    await downloadFile('/admin/backup');
  } catch (err) {
    backupError.value = `No se pudo descargar el backup: ${err.message}`;
  } finally {
    descargandoBackup.value = false;
  }
}
const empresa = reactive({ nombre: '', direccion: '', telefono: '', mensajePersonal: '' });
const impresion = reactive({ width: 35, imprimirTicketCliente: true, imprimirComandaCocina: false });
const seguridad = reactive({ contrasenaEliminacion: '', contrasenaEliminacionConfigurada: false });

async function load() {
  const [empresaData, impresionData, seguridadData] = await Promise.all([
    api.get('/ajustes/empresa'),
    api.get('/ajustes/impresion'),
    api.get('/ajustes/seguridad')
  ]);
  Object.assign(empresa, empresaData);
  Object.assign(impresion, impresionData);
  Object.assign(seguridad, seguridadData, { contrasenaEliminacion: '' });
}

async function guardar() {
  saving.value = true;
  try {
    const [empresaData, impresionData, seguridadData] = await Promise.all([
      api.put('/ajustes/empresa', empresa),
      api.put('/ajustes/impresion', impresion),
      api.put('/ajustes/seguridad', seguridad)
    ]);
    Object.assign(empresa, empresaData);
    Object.assign(impresion, impresionData);
    Object.assign(seguridad, seguridadData, { contrasenaEliminacion: '' });
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>
