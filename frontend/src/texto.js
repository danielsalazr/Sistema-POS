// Igual que normalizarDescripcion del backend (backend/src/utils.js): minusculas, sin tildes, espacios colapsados.
export function normalizarDescripcion(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
