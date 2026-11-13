import { env } from '../config.js';

const SYSTEM_PROMPT = `Eres un revisor académico experto en proyectos de investigación universitaria.
Evalúas entregas de capítulos de tesis/proyecto según una rúbrica y el formato APA 7.ª edición
(márgenes de 2.54 cm, fuente Times New Roman 12, doble espacio, citas en texto autor-fecha,
lista de referencias con sangría francesa, etc.).

Debes responder ÚNICAMENTE con JSON válido con esta forma:
{
  "puntaje_total": <número 0-100>,
  "resumen": "<evaluación general en 3-5 frases>",
  "criterios": [
    {"nombre": "...", "puntaje": <número>, "max_puntos": <número>, "comentario": "..."}
  ],
  "observaciones": ["<lista de observaciones concretas>"],
  "fortalezas": ["<lista de fortalezas>"],
  "cumple_formato_apa": <true|false>,
  "recomendaciones": ["<acciones sugeridas>"],
  "veredicto": "<aprobado|requiere_mejoras|no_aprobado>"
}`;

export async function revisarConIA({ texto, capitulo, rubrica, numeroRevision }) {
  if (!env.ai.apiKey) {
    // Modo degradado: sin IA configurada se devuelve una revisión pendiente manual.
    return { modo: 'manual', motivo: 'AI_API_KEY no configurada' };
  }

  const criteriosTexto = (rubrica?.criterios || [])
    .map(c => `- ${c.nombre} (peso ${c.peso}, máx ${c.max_puntos}): ${c.descripcion}`)
    .join('\n');

  const userPrompt = `Capítulo: ${capitulo}
Revisión número: ${numeroRevision}

Rúbrica activa: ${rubrica?.nombre || 'Rúbrica base'}
Criterios:
${criteriosTexto}
${rubrica?.formato_apa === false ? '' : 'Formato requerido: APA 7.ª edición y normas de la universidad (Times New Roman 12, doble espacio, márgenes 2.54 cm, citas autor-fecha, referencias con sangría francesa).'}

Texto del documento:
"""
${texto.slice(0, 60000)}
"""

Evalúa el documento y devuelve solo el JSON.`;

  const res = await fetch(env.ai.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.ai.apiKey}`
    },
    body: JSON.stringify({
      model: env.ai.model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ]
    })
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Error IA (${res.status}): ${body.slice(0, 500)}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '{}';
  try {
    return JSON.parse(content);
  } catch {
    // Algunos modelos envuelven el JSON en markdown
    const match = content.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('La IA no devolvió JSON válido');
  }
}
