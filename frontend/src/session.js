import { reactive } from 'vue';

const STORAGE_KEY = 'dela-pos-session';

function readStored() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
}

const stored = readStored();
localStorage.removeItem('sublime-session');

export const session = reactive({
  token: stored?.token || null,
  usuario: stored?.token ? stored.usuario || null : null,
  permisos: stored?.token ? stored.permisos || [] : [],
  compania: stored?.compania || { idCompania: 1, nombre: 'Dela Crepes' }
});

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    token: session.token,
    usuario: session.usuario,
    permisos: session.permisos,
    compania: session.compania
  }));
}

export function setSession(payload) {
  session.token = payload.token;
  session.usuario = payload.usuario;
  session.permisos = payload.permisos || [];
  persist();
}

export function clearSession() {
  session.token = null;
  session.usuario = null;
  session.permisos = [];
  persist();
}

export function setCompany(compania) {
  session.compania = compania;
  persist();
}
