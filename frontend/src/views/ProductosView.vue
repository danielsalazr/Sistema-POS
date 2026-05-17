<template>
  <section class="page">
    <div class="page-header">
      <div>
        <div class="page-title">Productos</div>
        <div class="page-subtitle">Catalogo, existencias y precios.</div>
      </div>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="nuevo">Nuevo producto</v-btn>
    </div>

    <v-card class="data-card" variant="flat" border>
      <v-card-text>
        <v-text-field v-model="q" label="Buscar" prepend-inner-icon="mdi-magnify" hide-details @input="load" />
      </v-card-text>
      <v-data-table :headers="headers" :items="productos" :loading="loading" item-value="idProducto">
        <template #item.precioVenta="{ item }">{{ currency(item.precioVenta) }}</template>
        <template #item.actions="{ item }">
          <v-btn icon="mdi-pencil" size="small" variant="text" @click="editar(item)" />
          <v-btn icon="mdi-delete" size="small" variant="text" color="error" @click="eliminar(item)" />
        </template>
      </v-data-table>
    </v-card>

    <v-dialog v-model="dialog" max-width="720">
      <v-card>
        <v-card-title>{{ form.idProducto ? 'Editar producto' : 'Nuevo producto' }}</v-card-title>
        <v-card-text>
          <div class="form-grid">
            <v-text-field v-model="form.codigoBarras" label="Codigo de barras" />
            <v-text-field v-model="form.descripcion" label="Descripcion" />
            <v-text-field v-model.number="form.precioCompra" label="Precio compra" type="number" />
            <v-text-field v-model.number="form.precioVenta" label="Precio venta" type="number" />
            <v-text-field v-model.number="form.existencia" label="Existencia" type="number" />
            <v-text-field v-model.number="form.stock" label="Stock minimo" type="number" />
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

const loading = ref(false);
const saving = ref(false);
const dialog = ref(false);
const q = ref('');
const productos = ref([]);
const form = reactive(empty());

const headers = [
  { title: 'Codigo', key: 'codigoBarras' },
  { title: 'Descripcion', key: 'descripcion' },
  { title: 'Precio venta', key: 'precioVenta' },
  { title: 'Existencia', key: 'existencia' },
  { title: 'Stock', key: 'stock' },
  { title: '', key: 'actions', sortable: false, align: 'end' }
];

function empty() {
  return { idProducto: null, codigoBarras: '', descripcion: '', precioCompra: 0, precioVenta: 0, existencia: 0, stock: 0 };
}

function currency(value) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value || 0);
}

async function load() {
  loading.value = true;
  try {
    productos.value = await api.get(`/productos?q=${encodeURIComponent(q.value)}`);
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
    if (form.idProducto) await api.put(`/productos/${form.idProducto}`, form);
    else await api.post('/productos', form);
    dialog.value = false;
    await load();
  } finally {
    saving.value = false;
  }
}

async function eliminar(item) {
  await api.delete(`/productos/${item.idProducto}`);
  await load();
}

onMounted(load);
</script>
