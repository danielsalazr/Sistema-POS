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
  </section>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { api } from '../api.js';

const saving = ref(false);
const empresa = reactive({ nombre: '', direccion: '', telefono: '', mensajePersonal: '' });
const impresion = reactive({ width: 35, imprimirTicketCliente: true, imprimirComandaCocina: false });

async function load() {
  const [empresaData, impresionData] = await Promise.all([
    api.get('/ajustes/empresa'),
    api.get('/ajustes/impresion')
  ]);
  Object.assign(empresa, empresaData);
  Object.assign(impresion, impresionData);
}

async function guardar() {
  saving.value = true;
  try {
    const [empresaData, impresionData] = await Promise.all([
      api.put('/ajustes/empresa', empresa),
      api.put('/ajustes/impresion', impresion)
    ]);
    Object.assign(empresa, empresaData);
    Object.assign(impresion, impresionData);
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>
