import { getToken } from './auth.js';

const API = import.meta.env.PUBLIC_API_URL || 'http://localhost:4000';

// Descarga el archivo .ics con la fecha/hora de entrega de observaciones
// y calificación, para agregarla al calendario de la computadora.
export async function descargarCalendario(entregaId, nombreArchivo = 'observaciones') {
  const res = await fetch(`${API}/api/entregas/${entregaId}/calendario`, {
    headers: { Authorization: `Bearer ${getToken()}` }
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Error ${res.status}`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${nombreArchivo}-${entregaId}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
