<template>
  <div class="clasificacion" :class="{ 'clasificacion--compacta': compacta }">
    <v-select
      :model-value="idCentroCosto"
      :items="opcionesCentro"
      item-title="nombre"
      item-value="idCentroCosto"
      :label="compacta ? 'Centro' : 'Centro de costo'"
      :density="compacta ? 'compact' : 'comfortable'"
      :error="marcarFaltante && !idCentroCosto"
      :prepend-inner-icon="compacta ? undefined : 'mdi-sitemap-outline'"
      hide-details
      @update:model-value="emit('update:idCentroCosto', $event)"
    >
      <template v-if="sugerido && idCentroCosto" #append-inner>
        <v-chip size="x-small" color="primary" variant="tonal">sugerido</v-chip>
      </template>
    </v-select>
    <v-select
      :model-value="idTipoGasto"
      :items="opcionesTipo"
      item-title="nombre"
      item-value="idTipoGasto"
      :label="compacta ? 'Tipo' : 'Tipo de gasto (opcional)'"
      :density="compacta ? 'compact' : 'comfortable'"
      :prepend-inner-icon="compacta ? undefined : 'mdi-tag-outline'"
      hide-details
      clearable
      @update:model-value="emit('update:idTipoGasto', $event ?? null)"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue';

// centros / tipos: listas completas (incluidos inactivos); solo se ofrecen los activos y el valor actual.
const props = defineProps({
  idCentroCosto: { type: Number, default: null },
  idTipoGasto: { type: Number, default: null },
  centros: { type: Array, default: () => [] },
  tipos: { type: Array, default: () => [] },
  sugerido: { type: Boolean, default: false },
  marcarFaltante: { type: Boolean, default: false },
  compacta: { type: Boolean, default: false }
});
const emit = defineEmits(['update:idCentroCosto', 'update:idTipoGasto']);

const opcionesCentro = computed(() => props.centros
  .filter((centro) => centro.activo || centro.idCentroCosto === props.idCentroCosto)
  .map((centro) => (centro.activo ? centro : { ...centro, nombre: `${centro.nombre} (inactivo)` })));
const opcionesTipo = computed(() => props.tipos
  .filter((tipo) => tipo.activo || tipo.idTipoGasto === props.idTipoGasto)
  .map((tipo) => (tipo.activo ? tipo : { ...tipo, nombre: `${tipo.nombre} (inactivo)` })));
</script>

<style scoped>
.clasificacion {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 10px;
}

.clasificacion--compacta {
  grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  gap: 6px;
}

@media (max-width: 420px) {
  .clasificacion:not(.clasificacion--compacta) {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
