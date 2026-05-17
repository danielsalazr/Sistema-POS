import { reactive } from 'vue';

const stored = JSON.parse(localStorage.getItem('sublime-session') || 'null');

export const session = reactive({
  usuario: stored?.usuario || null,
  permisos: stored?.permisos || []
});

export function setSession(payload) {
  session.usuario = payload.usuario;
  session.permisos = payload.permisos || [];
  localStorage.setItem('sublime-session', JSON.stringify(payload));
}

export function clearSession() {
  session.usuario = null;
  session.permisos = [];
  localStorage.removeItem('sublime-session');
}
