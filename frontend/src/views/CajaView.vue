<template>
  <section class="page">
    <div class="page-header">
      <div>
        <div class="page-title">Caja</div>
        <div class="page-subtitle">Ingresos, egresos y resumen general.</div>
      </div>
      <v-btn color="primary" prepend-icon="mdi-refresh" @click="load">Actualizar</v-btn>
    </div>

    <v-row>
      <v-col cols="12" md="5">
        <v-card class="data-card" variant="flat" border>
          <v-card-title>Registrar movimiento</v-card-title>
          <v-card-text>
            <v-select v-model="tipo" :items="['ingresos', 'egresos']" label="Tipo" />
            <v-text-field v-model.number="form.monto" label="Monto" type="number" />
            <v-text-field v-model="form.descripcion" label="Descripcion" />
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn color="primary" :loading="saving" @click="guardar">Guardar</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>

      <v-col cols="12" md="7">
        <v-card class="data-card" variant="flat" border>
          <v-card-title>Resumen</v-card-title>
          <v-list lines="one">
            <v-list-item title="Ventas" :subtitle="currency(resumen.ventas)" />
            <v-list-item title="Abonos" :subtitle="currency(resumen.abonos)" />
            <v-list-item title="Ingresos" :subtitle="currency(resumen.ingresos)" />
            <v-list-item title="Egresos" :subtitle="currency(resumen.egresos)" />
            <v-list-item title="Entradas por prestamos y aportes" :subtitle="currency(resumen.entradaPrestamosAportes)" />
            <v-list-item title="Salidas por prestamos y aportes" :subtitle="currency(resumen.salidaPrestamosAportes)" />
            <v-divider />
            <v-list-item title="Total" :subtitle="currency(resumen.total)" />
          </v-list>
        </v-card>
      </v-col>
    </v-row>
  </section>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { api } from '../api.js';
import { session } from '../session.js';

const resumen = ref({ ventas: 0, abonos: 0, ingresos: 0, egresos: 0, total: 0 });
const tipo = ref('ingresos');
const saving = ref(false);
const form = reactive({ monto: 0, descripcion: '' });

function currency(value) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value || 0);
}

async function load() {
  resumen.value = await api.get('/caja/resumen');
}

async function guardar() {
  saving.value = true;
  try {
    await api.post(`/${tipo.value}`, {
      ...form,
      idUsuario: session.usuario.idUsuario
    });
    form.monto = 0;
    form.descripcion = '';
    await load();
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>
