<template>
  <div class="login-page">
    <v-card class="login-card" elevation="8">
      <v-card-title class="text-h5">Dela POS</v-card-title>
      <v-card-subtitle>Ingreso al sistema reconstruido</v-card-subtitle>
      <v-card-text>
        <v-alert v-if="error" class="mb-4" type="error" density="compact">{{ error }}</v-alert>
        <v-form @submit.prevent="login">
          <v-text-field v-model="form.nombre" label="Usuario" prepend-inner-icon="mdi-account" autocomplete="username" />
          <v-text-field v-model="form.contrasena" label="Contrasena" prepend-inner-icon="mdi-lock" type="password" autocomplete="current-password" />
          <v-btn block color="primary" size="large" type="submit" :loading="loading">Entrar</v-btn>
        </v-form>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../api.js';
import { setSession } from '../session.js';

const router = useRouter();
const loading = ref(false);
const error = ref('');
const form = reactive({ nombre: 'admin', contrasena: 'admin' });

async function login() {
  loading.value = true;
  error.value = '';
  try {
    const payload = await api.post('/login', form);
    setSession(payload);
    router.push('/');
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 20px;
  background: linear-gradient(135deg, #eef4fb, #f7f9fb);
}

.login-card {
  width: min(100%, 410px);
  border-radius: 8px;
}
</style>
