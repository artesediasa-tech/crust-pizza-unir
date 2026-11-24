/* CRUST PIZZA V3 — Navegación y lectura accesible, sin alterar las fórmulas ni los datos. */
(function(){
'use strict';
let filtersExpanded=false;
const captions={summary:'Inicio',branches:'Sucursales',products:'Productos',segments:'Clientes',findings:'Hallazgos y decisiones',assistant:'Asistente IA',data:'Cargar datos',method:'Ayuda y fuentes'};
function syncFilters(){
  const box=document.querySelector('.filters'),btn=document.getElementById('filtersToggle');
  if(!box||!btn)return;
  box.classList.toggle('expanded',filtersExpanded);
  btn.textContent=filtersExpanded?'Ocultar fechas':'Más filtros';
  btn.setAttribute('aria-expanded',String(filtersExpanded));
}
function setup(){
 document.body.classList.add('redesign-v3');
 const filters=document.querySelector('.filters');
 if(filters&&!document.getElementById('filtersToggle')){
   const btn=document.createElement('button');btn.type='button';btn.id='filtersToggle';btn.className='btn filterToggle';
   btn.setAttribute('aria-label','Mostrar u ocultar filtros de fechas');
   filters.insertBefore(btn,document.getElementById('resetButton'));
   btn.addEventListener('click',()=>{filtersExpanded=!filtersExpanded;syncFilters();});
   syncFilters();
 }
 const acts=document.querySelector('.heading .actions');
 if(acts&&!document.getElementById('printPDF')){
   const btn=document.createElement('button');btn.type='button';btn.id='printPDF';btn.className='btn';btn.textContent='Imprimir / PDF';
   btn.title='Abrir impresión para guardar la vista como PDF';
   acts.insertBefore(btn,acts.firstChild);btn.addEventListener('click',()=>window.print());
 }
 const aside=document.querySelector('aside');
 if(aside&&!document.getElementById('mobileNavWrap')){
   const wrap=document.createElement('div');wrap.id='mobileNavWrap';
   wrap.innerHTML='<label for="mobileNav">Sección</label><select id="mobileNav" aria-label="Sección del dashboard"></select><button type="button" id="mobileHelp" aria-label="Abrir glosario de indicadores" title="Glosario">?</button>';
   aside.appendChild(wrap);
   wrap.querySelector('select').addEventListener('change',e=>navigate(e.target.value));
   wrap.querySelector('#mobileHelp').addEventListener('click',()=>document.getElementById('guideDialog')?.showModal());
 }
 if(aside&&!document.getElementById('helpGlossary')){
   const btn=document.createElement('button');btn.id='helpGlossary';btn.className='helpbtn';btn.type='button';
   btn.textContent='¿Qué significan los indicadores?';
   aside.insertBefore(btn,aside.querySelector('.sideend'));
   btn.addEventListener('click',()=>document.getElementById('guideDialog').showModal());
   const dialog=document.createElement('dialog');dialog.id='guideDialog';
   dialog.innerHTML='<h2>Glosario comercial</h2><p class="small">Definiciones aplicadas a las bases del caso de UNIR.</p><div class="glossary">'+
     '<div><strong>Ventas netas</strong><span>Ingresos después de descuentos. Se suman desde VentaNeta.</span></div>'+
     '<div><strong>Utilidad bruta</strong><span>Ventas netas menos costo directo de ventas. No equivale a beneficio neto.</span></div>'+
     '<div><strong>Margen bruto</strong><span>Utilidad bruta dividida entre ventas netas, multiplicada por cien.</span></div>'+
     '<div><strong>Ticket promedio (aproximado)</strong><span>Ventas netas divididas entre VentaID distintos. Sin PedidoID no se conoce el ticket completo de cada pedido.</span></div>'+
     '<div><strong>Clientes compradores</strong><span>ClienteID únicos que tienen ventas en la selección filtrada.</span></div>'+
     '<div><strong>Transacciones</strong><span>VentaID únicos. No equivalen a unidades ni a pedidos completos.</span></div>'+
     '<div><strong>Producto de mayor utilidad</strong><span>Aporta más dólares después del costo directo. No necesariamente posee mayor margen ni vende más unidades.</span></div>'+
     '</div><div class="dialogactions"><button type="button" class="btn primary" id="closeGlossary">Cerrar</button></div>';
   document.body.appendChild(dialog);
   document.getElementById('closeGlossary').addEventListener('click',()=>dialog.close());
 }
}
function nav(){
 const element=document.getElementById('nav');if(!element)return;
 for(const btn of element.querySelectorAll('button[data-nav]')){
   const spans=btn.querySelectorAll('span');if(spans.length>1&&captions[btn.dataset.nav])spans[1].textContent=captions[btn.dataset.nav];
 }
 const fifth=element.querySelector('button[data-nav="findings"]');
 if(fifth){const tag=document.createElement('div');tag.className='navgroup';tag.textContent='Interpretación y entrega';element.insertBefore(tag,fifth);}
 const select=document.getElementById('mobileNav');
 if(select){select.innerHTML=Object.entries(captions).map(([key,val])=>'<option value="'+key+'">'+val+'</option>').join('');select.value=current;}
}
const money=n=>new Intl.NumberFormat('es-EC',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n/100);
const percent=n=>(n>0?'+':'')+n.toLocaleString('es-EC',{minimumFractionDigits:1,maximumFractionDigits:1})+' %';
function comparable(){
 const from=document.getElementById('dateFrom')?.value,to=document.getElementById('dateTo')?.value;
 if(from!=='2024-01-01'||to!=='2025-12-28')return null;
 const prev=filtered.filter(r=>r.date>='2024-01-01'&&r.date<='2024-11-30');
 const next=filtered.filter(r=>r.date>='2025-01-01'&&r.date<='2025-11-30');
 if(!prev.length||!next.length)return null;
 const months=list=>new Set(list.map(r=>r.date.slice(0,7))).size;
 if(months(prev)!==11||months(next)!==11)return null;
 const a=agg(prev),b=agg(next);
 const change=(x,y)=>y?(x/y-1)*100:null;
 return {a,b,delta:change(b.sales,a.sales),tx:change(b.transactions,a.transactions),average:change(b.ticket,a.ticket)};
}
function home(page){
 const kpis=page.querySelector('.kpis');if(!kpis)return;
 const trend=comparable();
 if(trend){
   const block=document.createElement('section');block.className='friendly-compare';block.setAttribute('aria-label','Comparación de ventas entre períodos comparables');
   block.innerHTML='<div><div class="lead">Comparativo homogéneo · enero a noviembre</div><p class="readout">2024: '+money(trend.a.sales)+' · 2025: '+money(trend.b.sales)+
     '<small>Variación descriptiva, no explicación causal. Diciembre se excluye por el corte parcial de 2025.</small></p>'+
     '<div class="facts">Registros de venta: '+percent(trend.tx)+' · Importe medio por VentaID: '+percent(trend.average)+'</div></div>'+
     '<div class="big '+(trend.delta<0?'negative':'')+'">'+percent(trend.delta)+'</div>';
   kpis.insertAdjacentElement('afterend',block);
 }
 const redundant=['Productos más vendidos','Ventas por segmento','Desempeño por sucursal'];
 for(const c of [...page.querySelectorAll('.card')]){
   if(redundant.some(t=>(c.querySelector('.cardhead h2')?.textContent||'').includes(t)))c.remove();
 }
 for(const grid of [...page.querySelectorAll('.grid')])if(!grid.querySelector('.card'))grid.remove();
 const pmap=new Map(D.products.map(p=>[p.id,p]));
 const bestProduct=rank(filtered,'pid','units').slice(0,3);
 const city=rank(filtered,'city','sales')[0];
 const branch=rank(filtered,'branch','sales')[0];
 const segment=rank(filtered,'segment','sales')[0];
 if(bestProduct.length&&city&&branch&&segment){
   const compact=document.createElement('section');compact.className='card compact-overview';
   compact.innerHTML='<div class="cardhead"><div><h2>Panorama comercial</h2><p>Los resultados principales de la selección, sin repetir todas las tablas.</p></div></div>'+
   '<div class="quick-metrics">'+
   '<div><strong>Productos más vendidos · unidades</strong><span>'+bestProduct.map((x,i)=>(i+1)+'. '+esc(productLabel(pmap.get(x.key)))+' ('+num(x.units)+')').join('<br>')+'</span></div>'+
   '<div><strong>Ciudad de mayor venta</strong><span>'+esc(city.key)+'<small>'+cash(city.sales)+'</small></span></div>'+
   '<div><strong>Sucursal de mayor venta</strong><span>'+esc(branch.key)+'<small>'+cash(branch.sales)+'</small></span></div>'+
   '<div><strong>Segmento de mayor venta</strong><span>'+esc(segment.key)+'<small>'+cash(segment.sales)+'</small></span></div>'+
   '</div>';
   page.appendChild(compact);
 }
 const links=document.createElement('div');links.className='quicklinks';
 links.innerHTML='<span class="quicklead">Continuar el análisis</span>'+
   '<button type="button" data-jump="products">Productos y márgenes</button>'+
   '<button type="button" data-jump="branches">Comparar sucursales</button>'+
   '<button type="button" data-jump="segments">Analizar clientes</button>';
 page.appendChild(links);
 for(const b of links.querySelectorAll('button'))b.addEventListener('click',()=>navigate(b.dataset.jump));
}
function details(page){
 if(current==='findings')for(const article of page.querySelectorAll('.insight')){
   const ps=[...article.querySelectorAll('p')];if(ps.length<2)continue;
   const detail=document.createElement('details');detail.innerHTML='<summary>Ver evidencia y validación</summary>';
   ps.slice(1).forEach(p=>detail.appendChild(p));
   article.querySelector('div:last-child').appendChild(detail);
 }
 if(current==='assistant'){
   for(const note of page.querySelectorAll('.note')){
     if(note.textContent.includes('Resultados verificados por cálculos del dashboard')){
       const detail=document.createElement('details');detail.className='evidence-details';
       detail.innerHTML='<summary>Ver cifras y rankings verificados</summary>';
       note.replaceWith(detail);detail.appendChild(note);break;
     }
   }
   for(const card of page.querySelectorAll('.card')){
     if(card.querySelector('.cardhead h2')?.textContent?.includes('Revisión crítica del equipo')){
       const detail=document.createElement('details');detail.className='review-details';
       detail.innerHTML='<summary>Revisión crítica del equipo: evaluar y documentar la respuesta</summary>';
       card.replaceWith(detail);detail.appendChild(card);break;
     }
   }
 }
}
function improve(){
 setup();nav();syncFilters();
 const page=document.getElementById('page');if(!page)return;
 if(current==='summary')home(page);
 if(['branches','products','segments'].includes(current))page.querySelector('.kpis')?.remove();
 details(page);
}
const originalRender=render;
render=function(){originalRender();improve();};
improve();
})();
