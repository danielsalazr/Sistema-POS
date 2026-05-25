import { reactive } from 'vue';

const stored = JSON.parse(localStorage.getItem('dela-pos-session') || localStorage.getItem('sublime-session') || 'null');

export const session = reactive({
  usuario: stored?.usuario || null,
  permisos: stored?.permisos || [],
  compania: stored?.compania || { idCompania: 1, nombre: 'Dela Crepes' }
});

export function setSession(payload) {
  session.usuario = payload.usuario;
  session.permisos = payload.permisos || [];
  localStorage.setItem('dela-pos-session', JSON.stringify({
    usuario: session.usuario,
    permisos: session.permisos,
    compania: session.compania
  }));
  localStorage.removeItem('sublime-session');
}

export function clearSession() {
  session.usuario = null;
  session.permisos = [];
  localStorage.removeItem('dela-pos-session');
  localStorage.removeItem('sublime-session');
}

export function setCompany(compania) {
  session.compania = compania;
  localStorage.setItem('dela-pos-session', JSON.stringify({
    usuario: session.usuario,
    permisos: session.permisos,
    compania: session.compania
  }));
}
