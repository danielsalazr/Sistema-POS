<template>
  <section class="orders-screen">
    <header class="orders-header">
      <div>
        <div class="orders-title">Pedidos pendientes</div>
        <div class="orders-subtitle">
          {{ pedidos.length }} en pantalla
          <span v-if="lastUpdate">Actualizado {{ lastUpdate }}</span>
        </div>
      </div>
      <div class="orders-actions">
        <button class="ghost-button" type="button" @click="loadPedidos">Actualizar</button>
      </div>
    </header>

    <main class="orders-grid">
      <article v-for="pedido in pedidos" :key="pedido.idVenta" class="order-card">
        <div class="order-card__top">
          <div>
            <div class="order-number">Venta {{ pedido.idVenta }}</div>
            <div class="order-time">{{ formatDate(pedido.fecha) }}</div>
          </div>
          <button class="done-button" type="button" :disabled="savingId === pedido.idVenta" @click="marcarCumplido(pedido)">
            Cumplido
          </button>
        </div>

        <div class="order-client">{{ pedido.cliente }}</div>

        <div class="items-list">
          <div v-for="producto in pedido.productos" :key="`${pedido.idVenta}-${producto.idProducto}-${producto.descripcion}`" class="item-row">
            <span class="item-qty">{{ producto.cantidadVendida }}</span>
            <span>
              <span class="item-name">{{ producto.descripcion }}</span>
              <span v-if="producto.nota" class="item-note">{{ producto.nota }}</span>
            </span>
          </div>
        </div>
      </article>

      <div v-if="!loading && pedidos.length === 0" class="empty-state">
        No hay pedidos pendientes
      </div>
    </main>

    <div v-if="error" class="error-banner">{{ error }}</div>
  </section>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { api } from '../api.js';
import { formatLocalDateTime } from '../dates.js';

const pedidos = ref([]);
const loading = ref(false);
const error = ref('');
const lastUpdate = ref('');
const savingId = ref(null);
let timer = null;

function formatDate(value) {
  return formatLocalDateTime(value);
}

function currentTimeLabel() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
}

async function loadPedidos() {
  loading.value = true;
  try {
    pedidos.value = await api.get('/pedidos-pendientes');
    lastUpdate.value = currentTimeLabel();
    error.value = '';
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

async function marcarCumplido(pedido) {
  savingId.value = pedido.idVenta;
  try {
    await api.post(`/pedidos/${pedido.idVenta}/cumplido`, {});
    pedidos.value = pedidos.value.filter((item) => item.idVenta !== pedido.idVenta);
    await loadPedidos();
  } catch (err) {
    error.value = err.message;
  } finally {
    savingId.value = null;
  }
}

onMounted(() => {
  loadPedidos();
  timer = window.setInterval(loadPedidos, 10000);
});

onBeforeUnmount(() => {
  if (timer) window.clearInterval(timer);
});
</script>

<style scoped>
.orders-screen {
  min-height: 100vh;
  background: #050505;
  color: #f8fafc;
  padding: 22px;
}

.orders-header {
  align-items: center;
  display: flex;
  gap: 16px;
  justify-content: space-between;
  margin-bottom: 20px;
}

.orders-title {
  font-size: 2rem;
  font-weight: 800;
}

.orders-subtitle {
  color: #a3a3a3;
  display: flex;
  gap: 14px;
  margin-top: 4px;
}

.orders-actions {
  display: flex;
  gap: 10px;
}

.ghost-button,
.done-button {
  border: 0;
  cursor: pointer;
  font: inherit;
  font-weight: 800;
}

.ghost-button {
  background: #1f2937;
  border-radius: 8px;
  color: #f8fafc;
  padding: 11px 16px;
}

.orders-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
}

.order-card {
  background: #ffffff;
  border-left: 10px solid #f59e0b;
  border-radius: 8px;
  color: #111827;
  min-height: 230px;
  padding: 18px;
}

.order-card__top {
  align-items: flex-start;
  display: flex;
  gap: 12px;
  justify-content: space-between;
}

.order-number {
  font-size: 1.35rem;
  font-weight: 900;
}

.order-time {
  color: #4b5563;
  font-weight: 700;
  margin-top: 3px;
}

.done-button {
  background: #16a34a;
  border-radius: 8px;
  color: #ffffff;
  padding: 10px 14px;
}

.done-button:disabled {
  cursor: wait;
  opacity: 0.65;
}

.order-client {
  border-bottom: 1px solid #e5e7eb;
  font-size: 1rem;
  font-weight: 800;
  margin: 14px 0;
  padding-bottom: 12px;
}

.items-list {
  display: grid;
  gap: 10px;
}

.item-row {
  align-items: start;
  display: grid;
  gap: 10px;
  grid-template-columns: 42px 1fr;
}

.item-qty {
  background: #111827;
  border-radius: 8px;
  color: #ffffff;
  font-size: 1.05rem;
  font-weight: 900;
  padding: 5px 0;
  text-align: center;
}

.item-name {
  display: block;
  font-size: 1.1rem;
  font-weight: 800;
  line-height: 1.25;
}

.item-note {
  background: #fef3c7;
  border-radius: 8px;
  color: #92400e;
  display: inline-block;
  font-size: 1rem;
  font-weight: 900;
  line-height: 1.2;
  margin-top: 7px;
  padding: 6px 8px;
}

.empty-state {
  align-items: center;
  border: 2px dashed #404040;
  border-radius: 8px;
  color: #a3a3a3;
  display: flex;
  font-size: 1.6rem;
  font-weight: 800;
  justify-content: center;
  min-height: 260px;
}

.error-banner {
  background: #991b1b;
  border-radius: 8px;
  bottom: 18px;
  color: #ffffff;
  font-weight: 800;
  left: 18px;
  padding: 12px 16px;
  position: fixed;
  right: 18px;
}

@media (max-width: 700px) {
  .orders-screen {
    padding: 14px;
  }

  .orders-header {
    align-items: stretch;
    flex-direction: column;
  }

  .orders-title {
    font-size: 1.55rem;
  }
}
</style>
