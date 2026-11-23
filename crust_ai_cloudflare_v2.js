/* Adaptador Cloudflare Workers AI para dashboard Crust Pizza V2.
   Envía solo agregaciones, sin datos personales ni registros individuales. */
(() => {
  'use strict';
  const ENDPOINT = 'https://crust-pizza-ai.artesediasa.workers.dev/';
  const MODEL_LABEL = 'Cloudflare Workers AI · Llama 3.1 8B';
  const initialQuestion = '¿Cuáles son las ventas netas y la utilidad bruta del período, y qué decisión comercial debería evaluar?';
  let currentQuestion = initialQuestion;
  pages.assistant = ['Asistente de IA', 'Consultas comerciales con un modelo en Cloudflare y datos agregados del filtro activo.'];
  assistantView = function () {
    const status = aiReply && !/no se completó|No hay una recomendación validada/i.test(aiReply)
      ? 'Última consulta respondida; pendiente de revisión crítica'
      : 'Servicio remoto configurado · Consulta por validar';
    return '<div class="note warning">La IA genera propuestas que el equipo debe contrastar con las tablas. Su respuesta no sustituye los indicadores ni demuestra causalidad.</div>' +
      card('IA mediante Cloudflare Workers AI', 'No descarga modelos en tu equipo y no necesita claves de API en el navegador.',
        '<div class="airow"><span class="tag" id="aiStatus">' + esc(status) + '</span>' +
        '<span class="small">Solo se envían cifras agregadas de la selección; sin datos personales ni filas individuales.</span></div>' +
        '<p class="small">Servicio remoto público de uso académico. Disponibilidad y cuota sujetas al servicio de Cloudflare.</p>') +
      card('Consulta sobre la selección activa', 'La respuesta se evaluará frente a productos, sucursales y clientes del dashboard.',
        '<label class="small" for="question">Pregunta comercial</label>' +
        '<textarea id="question" maxlength="1000" placeholder="Pregunta sobre ventas, rentabilidad o segmentos...">' + esc(currentQuestion) + '</textarea>' +
        '<div class="actions" style="margin:12px 0">' +
        '<button class="btn primary" id="askAI" ' + (aiBusy || !filtered.length ? 'disabled' : '') + '>Consultar IA de Cloudflare</button>' +
        '<button class="btn" id="exportContext">Descargar contexto de evidencia</button></div>' +
        '<div id="aiResponse" class="airesponse" aria-live="polite">' + esc(aiReply || 'Todavía no hay una respuesta del modelo remoto. Realiza una consulta para comprobar el servicio.') + '</div>' +
        '<p class="caption" id="aiScope">' + esc(aiReplyScope) +
        (aiReply && aiVersion !== dataVersion ? ' · ATENCIÓN: cambiaron los filtros o datos; esta respuesta corresponde a una selección anterior.' : '') +
        '</p>') +
      card('Revisión crítica del equipo', 'Solo marcar lo que realmente hayan comprobado en la aplicación.',
        '<div class="review"><label><input type="checkbox" id="checkFigures"> Las cifras coinciden con el dashboard y el período consultado.</label>' +
        '<label><input type="checkbox" id="checkCause"> Las hipótesis están separadas de los hechos.</label>' +
        '<label><input type="checkbox" id="checkFeasible"> La recomendación es viable y reconoce datos faltantes.</label>' +
        '<label><input type="checkbox" id="checkDecision"> El equipo decide qué aceptar, corregir o descartar.</label></div>' +
        '<textarea id="reviewNote" placeholder="Qué recomienda la IA, qué comprobaron y qué corregirían">' + esc(reviewNote) + '</textarea>' +
        '<button class="btn" id="saveReview" style="margin-top:12px">Guardar revisión crítica</button>' +
        '<p class="caption">La respuesta del modelo no se presenta como validada automáticamente.</p>');
  };
  askAI = async function () {
    if (aiBusy || !filtered.length) return;
    const input = byId('question');
    const question = (input?.value || '').trim();
    currentQuestion = question;
    if (!question) { toast('Escribe una pregunta antes de consultar.'); return; }
    if (question.length > 1000) { toast('La pregunta es demasiado larga.'); return; }
    const context = JSON.stringify(compactContext(question));
    if (context.length > 12000) { toast('El contexto es demasiado extenso para el servicio.'); return; }
    const version = dataVersion, scope = JSON.stringify(selection());
    aiBusy = true;
    input.disabled = true;
    byId('askAI').disabled = true;
    byId('aiResponse').textContent = 'Consultando la IA remota de Cloudflare…';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    try {
      const response = await fetch(ENDPOINT, {
        method: 'POST', mode: 'cors', credentials: 'omit', cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, context }),
        signal: controller.signal
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || ('Error HTTP ' + response.status));
      const answer = typeof payload.respuesta === 'string' ? payload.respuesta.trim() : '';
      if (!answer) throw new Error('El modelo no devolvió una respuesta de texto.');
      aiReply = answer;
      aiVersion = version;
      modelName = MODEL_LABEL;
      aiReplyScope = 'Modelo: ' + MODEL_LABEL + ' · Filtros: ' + scope + ' · Pregunta: ' + question;
    } catch (e) {
      aiReply = 'La consulta no se completó: ' + (e.name === 'AbortError' ? 'el servidor no respondió dentro del límite de tiempo' : (e.message || 'error de red')) + '. No hay una recomendación validada.';
      aiVersion = version;
      aiReplyScope = 'Intento fallido. No utilizar como conclusión académica.';
    } finally {
      clearTimeout(timeout);
      aiBusy = false;
      if (current === 'assistant') render();
    }
  };
  window.CrustRemoteAI = { provider: 'Cloudflare Workers AI', endpoint: ENDPOINT, version: 'V2' };
})();