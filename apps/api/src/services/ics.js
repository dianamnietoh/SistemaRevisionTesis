// Generador mínimo de archivos iCalendar (.ics) para recordatorios de entrega.

function icsDateTime(d) {
  // Formato iCalendar UTC: YYYYMMDDTHHMMSSZ
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escapeText(s) {
  return String(s || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Construye un archivo .ics con un evento recordatorio.
 * @param {object} e
 * @param {string} e.title       Título del evento
 * @param {string} [e.description]
 * @param {Date|string} e.start  Fecha/hora del evento
 * @param {Date|string} [e.end]  Duración (default: +1 hora)
 * @param {string} [e.uid]       Identificador único (default: aleatorio)
 * @param {number} [e.reminderHours]  Horas antes para alarma (default: 24)
 */
export function buildIcsEvent({ title, description = '', start, end, uid, reminderHours = 24 }) {
  const startD = new Date(start);
  if (Number.isNaN(startD.getTime())) throw new Error('Fecha inválida para el evento');
  const endD = end ? new Date(end) : new Date(startD.getTime() + 60 * 60 * 1000);
  const eventUid = uid || `${Date.now()}-${Math.random().toString(36).slice(2)}@sistema-titulacion`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SistemaTitulacion//Revisiones//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${eventUid}`,
    `DTSTAMP:${icsDateTime(new Date())}`,
    `DTSTART:${icsDateTime(startD)}`,
    `DTEND:${icsDateTime(endD)}`,
    `SUMMARY:${escapeText(title)}`,
    `DESCRIPTION:${escapeText(description)}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeText(title)}`,
    `TRIGGER:-PT${reminderHours}H`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ];

  // Las líneas ICS deben terminar en CRLF
  return lines.join('\r\n') + '\r\n';
}
