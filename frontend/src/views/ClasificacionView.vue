<template>
  <section class="page">
    <div class="page-header">
      <div>
        <div class="page-title">Clasificación</div>
        <div class="page-subtitle">Líneas de producto para analizar las ventas por parte del negocio.</div>
      </div>
    </div>

    <v-tabs v-model="pestana" color="primary" show-arrows class="mb-4">
      <v-tab value="lineas" prepend-icon="mdi-shape-outline">Líneas de producto</v-tab>
    </v-tabs>

    <v-window v-model="pestana">
      <v-window-item value="lineas">
        <CatalogoCrud
          ref="catalogoLineas"
          endpoint="/lineas-producto"
          id-campo="idLineaProducto"
          campo-activo="activa"
          etiqueta-singular="línea"
          etiqueta-plural="líneas"
          texto-nuevo="Nueva línea"
          :usos="[{ campo: 'cantidadProductos', etiqueta: 'productos' }, { campo: 'cantidadVentas', etiqueta: 'ventas' }]"
          @cambio="cargarSinLinea"
        >
          <template #acciones>
            <v-btn size="large" variant="tonal" prepend-icon="mdi-playlist-check" @click="abrirAsignar()">Asignar productos</v-btn>
          </template>
          <template #menu="{ registro }">
            <v-list-item
              v-if="registro.activa"
              prepend-icon="mdi-playlist-plus"
              title="Asignar productos"
              @click="abrirAsignar(registro.idLineaProducto)"
            />
          </template>
          <template #extra>
            <v-col cols="12" sm="6" lg="4">
              <v-card class="sin-linea" variant="outlined" @click="abrirAsignar()">
                <div class="sin-linea__cuerpo">
                  <div>
                    <div class="sin-linea__nombre">Sin línea</div>
                    <div class="sin-linea__detalle">{{ productosSinLinea }} productos por asignar</div>
                  </div>
                  <v-icon icon="mdi-chevron-right" />
                </div>
              </v-card>
            </v-col>
          </template>
        </CatalogoCrud>
      </v-window-item>
    </v-window>

    <AsignarLineaDialog v-model="dialogoAsignar" :lineas="lineas" :id-linea-inicial="idLineaInicial" @asignado="alAsignar" />
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { api } from '../api.js';
import AsignarLineaDialog from '../components/AsignarLineaDialog.vue';
import CatalogoCrud from '../components/CatalogoCrud.vue';

const pestana = ref('lineas');
const catalogoLineas = ref(null);
const dialogoAsignar = ref(false);
const idLineaInicial = ref(undefined);
const productosSinLinea = ref(0);

const lineas = computed(() => catalogoLineas.value?.registros || []);

async function cargarSinLinea() {
  try {
    const productos = await api.get('/productos');
    productosSinLinea.value = productos.filter((producto) => !producto.idLineaProducto).length;
  } catch {
    productosSinLinea.value = 0;
  }
}

function abrirAsignar(idLinea) {
  idLineaInicial.value = idLinea;
  dialogoAsignar.value = true;
}

async function alAsignar() {
  await Promise.all([catalogoLineas.value?.cargar(), cargarSinLinea()]);
}

onMounted(cargarSinLinea);
</script>

<style scoped>
.sin-linea {
  border-radius: 8px;
  border-style: dashed;
  min-height: 72px;
}

.sin-linea__cuerpo {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  min-height: 72px;
}

.sin-linea__nombre {
  font-weight: 650;
}

.sin-linea__detalle {
  color: #667085;
  font-size: 0.88rem;
}
</style>
