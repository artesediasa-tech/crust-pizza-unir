/* Adaptador Cloudflare Workers AI para dashboard Crust Pizza V2.
   Envía solo agregaciones, sin datos personales ni registros individuales. */
(() => {
  'use strict';
  const ENDPOINT = 'https://crust-pizza-ai.artesediasa.workers.dev/';
  const MODEL_LABEL = 'Cloudflare Workers AI · Llama 3.1 8B';
  const initialQuestion = '¿Cuáles son las ventas netas y la utilidad bruta del período, y qué decisión comercial debería evaluar?';
  let currentQuestion = initialQuestion;
  pages.assistant = ['Asistente de IA', 'Consultas comerciales con un modelo en Cloudflare y datos agregados del filtro activo.'];
  // Evidencia calculada por el dashboard; la IA no determina los KPI ni los rankings.
  function commercialAnchors(question = '') {
    if (!filtered.length) return [];
    const decisions = evidence().decisions;
    const q = String(question).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    let ids = [0, 3]; // Sucursal de menor contribución y segmento candidato.
    if (/producto|pizza|margen|precio|rentab|costo/.test(q)) ids = [1, 2];
    else if (/sucursal|ciudad|local|tienda/.test(q)) ids = [0, 4];
    else if (/cliente|segmento|estudiante|familiar|profesional/.test(q)) ids = [3, 0];
    return ids.map(i => decisions[i]).filter(Boolean);
  }

  assistantView = function () {
    const status = aiReply && !/no se completó|No hay una recomendación validada/i.test(aiReply)
      ? 'Última consulta respondida; pendiente de revisión crítica'
      : 'Servicio remoto configurado · Consulta por validar';
    const catalog = new Map(D.products.map(p => [p.id, p]));
    const usd = n => new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(n / 100);
    const rows = (metric) => rank(filtered, 'pid', metric).slice(0, 3)
      .map((r, i) => (i + 1) + '. ' + esc(productLabel(catalog.get(r.key))) +
        ' · Ventas: ' + usd(r.sales) + ' · Utilidad: ' + usd(r.profit) +
        ' · Margen: ' + (r.margin === null ? 'Sin datos' : r.margin.toFixed(2) + ' %')).join('<br>');
    const totals = agg(filtered);
    const share = n => totals.sales ? (n / totals.sales * 100).toFixed(2) + ' %' : 'Sin datos';
    const rankedDimensions = dim => rank(filtered, dim, 'sales')
      .map(row => esc(row.key) + ': ' + share(row.sales)).join(' · ');
    const topline = rank(filtered, 'pid', 'units').slice(0, 3)
      .map((row, i) => (i + 1) + '. ' + esc(productLabel(catalog.get(row.key))) +
        ' · ' + row.units.toLocaleString('es-EC') + ' unidades').join('<br>');
    const verifiedRanks = '<div class="note"><strong>Resultados verificados por cálculos del dashboard (no por IA)</strong>' +
      '<p class="small">Ventas netas: ' + usd(totals.sales) + ' · Utilidad bruta: ' + usd(totals.profit) +
      ' · Margen bruto: ' + (totals.margin === null ? 'Sin datos' : totals.margin.toFixed(2) + ' %') + '</p>' +
      '<p class="small"><strong>Top 3 por utilidad bruta:</strong><br>' + rows('profit') + '</p>' +
      '<p class="small"><strong>Top 3 por margen bruto:</strong><br>' + rows('margin') +
      '</p><p class="small"><strong>Top 3 por unidades vendidas (no confundir con utilidad):</strong><br>' + topline +
      '</p><p class="small"><strong>Participación de ventas por segmento:</strong> ' + rankedDimensions('segment') +
      '</p><p class="small"><strong>Participación de ventas por ciudad:</strong> ' + rankedDimensions('city') +
      '</p><p class="small">Estas cifras se recalculan al cambiar filtros o cargar datos. La IA solo formula hipótesis; verifica cada afirmación en las tablas.</p></div>';
    const anchors = commercialAnchors(currentQuestion);
    const anchorPanel = '<div class="note"><strong>Evidencias para fundamentar propuestas</strong><p class="small">Calculadas según el filtro activo; no generadas por IA.</p>' +
      anchors.map((a, i) => '<p class="small"><strong>' + (i + 1) + '. ' + esc(a.title) + ':</strong> ' + esc(a.text) +
      '<br><strong>Cómo verificar:</strong> ' + esc(a.measure) + '</p>').join('') + '</div>';
    return '<div class="note warning">La IA genera propuestas que el equipo debe contrastar con las tablas. Su respuesta no sustituye los indicadores ni demuestra causalidad.</div>' + verifiedRanks + anchorPanel +
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
  // Rankings deterministas, calculados de los registros filtrados, no inventados por IA.
  const compactContextBase = compactContext;
  compactContext = function (question = '') {
    const context = compactContextBase(question);
    const productsById = new Map(D.products.map(p => [p.id, p]));
    const listing = (metric) => rank(filtered, 'pid', metric)
      .filter(p => p[metric] !== null && Number.isFinite(p[metric]))
      .slice(0, 8)
      .map((p, index) => ({
        puesto: index + 1,
        producto: productLabel(productsById.get(p.key)),
        ventasNetasUSD: Number((p.sales / 100).toFixed(2)),
        utilidadBrutaUSD: Number((p.profit / 100).toFixed(2)),
        margenBrutoPct: Number(p.margin.toFixed(3))
      }));
    context.rankingProductosPorUtilidadBrutaUSD = listing('profit');
    context.rankingProductosPorMargenBrutoPct = listing('margin');
    context.rankingProductosPorVentasNetasUSD = listing('sales');
    context.definicionRankings = 'Clasificaciones calculadas a partir de ventas filtradas y ordenadas de mayor a menor. No son conclusiones generadas por IA.';
    return context;
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
    const anchors = commercialAnchors(question);
    const anchorText = anchors.map((a,i)=>'Evidencia ' + String.fromCharCode(65+i) + ': '+ a.title+'. '+a.text+' Validación: '+a.measure).join(' ');
    const advisoryQuestion =
      ('Redacta solo dos ACCIONES COMERCIALES ESPECÍFICAS (A y B), cada una vinculada a su correspondiente evidencia calculada. ' +
      'Incluye: acción, indicador que la respalda, hipótesis y prueba propuesta. No inventes causas ni afirmes eficacia probada. ' +
      'No escribas números, importes, porcentajes, rankings ni cuotas: esos valores están en el panel verificable. ' +
      'Usa nombres de producto, sucursal o segmento solo si aparecen exactamente en las evidencias. ' +
      anchorText + ' Pregunta original: ' + question.slice(0, 150)).slice(0, 1000);
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
        body: JSON.stringify({ question: advisoryQuestion.slice(0, 1000), context }),
        signal: controller.signal
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || ('Error HTTP ' + response.status));
      const answer = typeof payload.respuesta === 'string' ? payload.respuesta.trim() : '';
      if (!answer) throw new Error('El modelo no devolvió una respuesta de texto.');
      // Proteger los datos auditables: el modelo solo aporta hipótesis, nunca cifras.
      if (/[\$€%]/.test(answer) || /\b\d+[.,]\d{2,}\b/.test(answer) || /\b(?:USD|EUR)\b/i.test(answer)) {
        aiReply = 'La IA intentó introducir cifras o porcentajes que no pueden validarse automáticamente. Se omite esa respuesta. Consulta únicamente los resultados verificados de arriba y repite la solicitud de propuestas sin cifras.';
        aiReplyScope = 'Respuesta de IA rechazada por incluir afirmaciones numéricas; no utilizar como evidencia.';
      } else {
        aiReply = 'HIPÓTESIS Y ACCIONES GENERADAS POR IA (pendientes de revisión del equipo):\n\n' + answer;
        aiReplyScope = 'Modelo: ' + MODEL_LABEL + ' · Filtros: ' + scope + ' · Pregunta original: ' + question +
          ' · Las cifras y los rankings provienen exclusivamente del cálculo determinista.';
      }
      aiVersion = version;
      modelName = MODEL_LABEL;

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
  window.CrustRemoteAI = { provider: 'Cloudflare Workers AI', endpoint: ENDPOINT, version: 'V2.3' };
})();