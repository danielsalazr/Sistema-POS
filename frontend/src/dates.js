export function todayNoonInput() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}T12:00`;
}

export function todayDateInput() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function currentDateTimeInput() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

export function sqlToInput(value) {
  if (!value) return todayNoonInput();
  return String(value).replace(' ', 'T').slice(0, 16);
}

export function sqlToDateInput(value) {
  if (!value) return todayDateInput();
  return String(value).slice(0, 10);
}

export function inputToSql(value) {
  if (!value) return todayNoonInput().replace('T', ' ') + ':00';
  const normalized = String(value).replace('T', ' ');
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(normalized)) return `${normalized}:00`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return `${normalized} 00:00:00`;
  return normalized;
}

export function formatLocalDateTime(value) {
  if (!value) return '';
  const [datePart, timePart = ''] = String(value).replace('T', ' ').split(' ');
  const [year, month, day] = datePart.split('-');
  const [hour = '00', minute = '00'] = timePart.split(':');
  if (!year || !month || !day) return String(value);
  if (hour === '00' && minute === '00') return `${day}/${month}/${year}`;
  return `${day}/${month}/${year} ${hour}:${minute}`;
}
