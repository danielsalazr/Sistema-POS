<template>
  <section class="page">
    <div class="page-header">
      <div>
        <div class="page-title">Clasificación</div>
        <div class="page-subtitle">Líneas de producto, centros de costo y tipos de gasto para analizar ventas y compras por parte del negocio.</div>
      </div>
    </div>

    <v-tabs v-model="pestana" color="primary" show-arrows class="mb-4">
      <v-tab value="lineas" prepend-icon="mdi-shape-outline">Líneas de producto</v-tab>
      <v-tab value="centros" prepend-icon="mdi-sitemap-outline">Centros de costo</v-tab>
      <v-tab value="tipos" prepend-icon="mdi-tag-multiple-outline">Tipos de gasto</v-tab>
      <v-tab value="clasificar" prepend-icon="mdi-format-list-checks">Clasificar compras</v-tab>
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
          <template #detalle="{ registro }">
            <v-chip
              class="mt-2"
              size="small"
              :color="registro.idCentroCosto ? 'primary' : undefined"
              variant="tonal"
              prepend-icon="mdi-sitemap-outline"
              @click="abrirCentroLinea(registro)"
            >
              {{ nombreCentro(registro.idCentroCosto) }}
            </v-chip>
          </template>
          <template #menu="{ registro }">
            <v-list-item
              v-if="registro.activa"
              prepend-icon="mdi-playlist-plus"
              title="Asignar productos"
              @click="abrirAsignar(registro.idLineaProducto)"
            />
            <v-list-item prepend-icon="mdi-sitemap-outline" title="Asignar centro de costo" @click="abrirCentroLinea(registro)" />
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

      <v-window-item value="centros">
        <CatalogoCrud
          endpoint="/centros-costo"
          id-campo="idCentroCosto"
          campo-activo="activo"
          etiqueta-singular="centro de costo"
          etiqueta-plural="centros de costo"
          texto-nuevo="Nuevo centro"
          :femenino="false"
          :usos="[{ campo: 'cantidadItems', etiqueta: 'ítems de compra' }, { campo: 'cantidadLineas', etiqueta: 'líneas' }]"
          @cambio="cargarCatalogosCompra"
        />
      </v-window-item>

      <v-window-item value="tipos">
        <CatalogoCrud
          endpoint="/tipos-gasto"
          id-campo="idTipoGasto"
          campo-activo="activo"
          etiqueta-singular="tipo de gasto"
          etiqueta-plural="tipos de gasto"
          texto-nuevo="Nuevo tipo"
          :femenino="false"
          :usos="[{ campo: 'cantidadItems', etiqueta: 'ítems de compra' }]"
          @cambio="cargarCatalogosCompra"
        />
      </v-window-item>

      <v-window-item value="clasificar">
        <ClasificarComprasPanel :centros="centros" :tipos="tipos" />
      </v-window-item>
    </v-window>

    <AsignarLineaDialog v-model="dialogoAsignar" :lineas="lineas" :id-linea-inicial="idLineaInicial" @asignado="alAsignar" />

    <v-dialog v-model="dialogoCentro" max-width="460" :fullscreen="$vuetify.display.xs">
      <v-card>
        <v-card-title>Centro de costo de "{{ lineaCentro?.nombre }}"</v-card-title>
        <v-card-text>
          <v-alert v-if="errorCentro" class="mb-3" type="error" density="compact">{{ errorCentro }}</v-alert>
          <p class="mb-3 text-medium-emphasis">Las ventas de esta línea se sumarán a este centro en el reporte de resultado.</p>
          <v-select
            v-model="idCentroLinea"
            :items="opcionesCentroLinea"
            item-title="nombre"
            item-value="idCentroCosto"
            label="Centro de costo"
            prepend-inner-icon="mdi-sitemap-outline"
            :hint="centros.length ? '' : 'Crea primero los centros en la pestaña Centros de costo'"
            persistent-hint
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn size="large" variant="text" @click="dialogoCentro = false">Cancelar</v-btn>
          <v-btn size="large" color="primary" :loading="guardandoCentro" @click="guardarCentroLinea">Guardar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { api } from '../api.js';
import AsignarLineaDialog from '../components/AsignarLineaDialog.vue';
import CatalogoCrud from '../components/CatalogoCrud.vue';
import ClasificarComprasPanel from '../components/ClasificarComprasPanel.vue';

const PESTANAS = ['lineas', 'centros', 'tipos', 'clasificar'];
const route = useRoute();
const pestana = ref(PESTANAS.includes(route.query.pestana) ? route.query.pestana : 'lineas');
const catalogoLineas = ref(null);
const dialogoAsignar = ref(false);
const idLineaInicial = ref(undefined);
const productosSinLinea = ref(0);
const centrosTodos = ref([]);
const tipos = ref([]);
const dialogoCentro = ref(false);
const lineaCentro = ref(null);
const idCentroLinea = ref(null);
const guardandoCentro = ref(false);
const errorCentro = ref('');

const lineas = computed(() => catalogoLineas.value?.registros || []);
const centros = computed(() => centrosTodos.value.filter((centro) => centro.activo));
const opcionesCentroLinea = computed(() => {
  const actual = centrosTodos.value.find((centro) => centro.idCentroCosto === lineaCentro.value?.idCentroCosto && !centro.activo);
  return [
    { idCentroCosto: null, nombre: 'Sin centro' },
    ...centros.value,
    ...(actual ? [{ ...actual, nombre: `${actual.nombre} (inactivo)` }] : [])
  ];
});

function nombreCentro(idCentro) {
  if (!idCentro) return 'Sin centro de costo';
  return centrosTodos.value.find((centro) => centro.idCentroCosto === idCentro)?.nombre || 'Centro de costo';
}

async function cargarSinLinea() {
  try {
    const productos = await api.get('/productos');
    productosSinLinea.value = productos.filter((producto) => !producto.idLineaProducto).length;
  } catch {
    productosSinLinea.value = 0;
  }
}

async function cargarCatalogosCompra() {
  try {
    const [centrosPayload, tiposPayload] = await Promise.all([
      api.get('/centros-costo?incluirInactivas=1'),
      api.get('/tipos-gasto')
    ]);
    centrosTodos.value = centrosPayload;
    tipos.value = tiposPayload;
  } catch {
    centrosTodos.value = [];
    tipos.value = [];
  }
}

function abrirAsignar(idLinea) {
  idLineaInicial.value = idLinea;
  dialogoAsignar.value = true;
}

async function alAsignar() {
  await Promise.all([catalogoLineas.value?.cargar(), cargarSinLinea()]);
}

function abrirCentroLinea(linea) {
  lineaCentro.value = linea;
  idCentroLinea.value = linea.idCentroCosto ?? null;
  errorCentro.value = '';
  dialogoCentro.value = true;
}

async function guardarCentroLinea() {
  guardandoCentro.value = true;
  errorCentro.value = '';
  try {
    await api.put(`/lineas-producto/${lineaCentro.value.idLineaProducto}`, { idCentroCosto: idCentroLinea.value });
    dialogoCentro.value = false;
    await catalogoLineas.value?.cargar();
  } catch (err) {
    errorCentro.value = err.message;
  } finally {
    guardandoCentro.value = false;
  }
}

onMounted(() => Promise.all([cargarSinLinea(), cargarCatalogosCompra()]));
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
