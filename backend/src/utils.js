export function requireFields(body, fields) {
  const missing = fields.filter((field) => body[field] === undefined || body[field] === null || body[field] === '');
  if (missing.length) {
    const error = new Error(`Faltan campos requeridos: ${missing.join(', ')}`);
    error.status = 400;
    throw error;
  }
}

export function nowSql() {
  return localDateTimeSql();
}

export function numeric(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function localDateTimeSql(date = new Date()) {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(date).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});

  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

export function normalizeDateTimeInput(value) {
  if (!value) return localDateTimeSql();
  const normalized = String(value).trim().replace('T', ' ');
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return `${normalized} 00:00:00`;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(normalized)) return `${normalized}:00`;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(normalized)) return normalized;
  return localDateTimeSql(new Date(value));
}
