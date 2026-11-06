/* Marvea · Tienda + cuenta + Business Club en una sola página · mv-tienda v1 (7-nov-2026) · generado desde tienda.js
   Catálogo real (catalogo.json), apartado real en el inventario (Edge Function tienda-stock), cuenta única con el Business Club
   (Supabase Auth), compra como invitada o con cuenta, pago con Stripe Checkout (Edge Function crear-pago) o transferencia. */
'use strict';
/* ============================================================ CATÁLOGO */
const ICONOS = {
  Pulseras:'<svg viewBox="0 0 100 100" fill="none" stroke="#5A2748" stroke-width="5"><ellipse cx="50" cy="50" rx="34" ry="30"/><ellipse cx="50" cy="50" rx="26" ry="22" stroke-opacity=".45"/><circle cx="50" cy="20" r="6" fill="#F2653F" stroke="none"/></svg>',
  Aretes:'<svg viewBox="0 0 100 100" fill="none" stroke="#5A2748" stroke-width="5"><circle cx="34" cy="58" r="18"/><circle cx="66" cy="58" r="18"/><path d="M34 40V22M66 40V22"/><circle cx="34" cy="18" r="4" fill="#F2653F" stroke="none"/><circle cx="66" cy="18" r="4" fill="#F2653F" stroke="none"/></svg>',
  Collares:'<svg viewBox="0 0 100 100" fill="none" stroke="#5A2748" stroke-width="5" stroke-linecap="round"><path d="M18 22c4 30 16 46 32 46s28-16 32-46"/><path d="M50 68v10"/><path d="M42 84l8-8 8 8-8 8z" fill="#F2653F" stroke="none"/></svg>',
  Cadenas:'<svg viewBox="0 0 100 100" fill="none" stroke="#5A2748" stroke-width="5"><rect x="14" y="40" width="22" height="14" rx="7"/><rect x="39" y="40" width="22" height="14" rx="7"/><rect x="64" y="40" width="22" height="14" rx="7"/></svg>',
  Anillos:'<svg viewBox="0 0 100 100" fill="none" stroke="#5A2748" stroke-width="5"><circle cx="50" cy="60" r="24"/><path d="M38 34l12-14 12 14z" fill="#F2653F" stroke="none"/></svg>'
};
const CAT_COLOR = new Proxy({Pulseras:'#F5C9D8',Aretes:'#9CC9EC',Collares:'#F2D84B',Cadenas:'#B9C93A',Anillos:'#F2653F',Dijes:'#E8A0C0',Juegos:'#5A2748',Tobilleras:'#8DB8A0',Accesorios:'#C9A86A'},{get:(o,k)=>o[k]||'#9a8e95'});
const PESO_G=60, MIN=12;
const TARIFAS=[{id:'2kg',nombre:'Hasta 2 kg',max:2,costo:240},{id:'5kg',nombre:'Hasta 5 kg',max:5,costo:305}];
let P=[]; const CATS={};
const hash=s=>{let h=7;for(const ch of s)h=(h*31+ch.charCodeAt(0))>>>0;return h;};
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function fotoHTML(x){ return (x.foto?`<img src="${esc(x.foto)}" alt="${esc(x.n)}" loading="lazy" decoding="async" onerror="this.parentElement.classList.add('sinfoto')">`:'')+(ICONOS[x.cat]||ICONOS.Collares); }
async function cargarCatalogo(){
  let d=null;
  try{ const r=await fetch('catalogo.json?v='+Date.now(),{cache:'no-cache'}); if(r.ok) d=await r.json(); }catch(e){}
  if(!d||!d.productos||!d.productos.length) return false;
  (d.categorias||[]).forEach(c=>{CATS[c.p]=c.n;});
  P=d.productos.filter(p=>p&&p.codigo&&p.precio>0).map(p=>{
    const cat=CATS[p.categoria]||p.categoria, h=hash(p.codigo), et=(p.etiqueta||'').trim(), etl=et.toLowerCase();
    const ult=etl==='últimas piezas'||etl==='ultimas piezas';
    // existencia REAL: llega del servidor (nivel 0 agotado · 1 últimas · 2 hay) al arrancar y cada minuto; popularidad por etiqueta
    const ex=ult?1:2;
    const v=(etl.includes('vendido')?60:etl.includes('tendencia')?45:etl.includes('new')||etl.includes('dupe')?25:8)+(h%15);
    return {c:p.codigo,n:p.nombre,cat,catP:p.categoria,m:p.material||'',p:Number(p.precio),foto:p.foto||'',et:ult?'':(et&&etl!=='ninguna'?et:''),notas:p.notas||'',ex,v,creado:p.creado||''};
  });
  return true;
}
/* ---------- Cuenta única (Supabase Auth, la misma del Business Club). Usuario = WhatsApp (10 dígitos) o correo; contraseña elegida por la clienta; también Google. */
const CUENTA={ url:'https://kuuewntjxtjjktxbgxfk.supabase.co', anon:'sb_publishable_o9LoacKHt5UBgIcJPJZa4g_QCbRM2U8', dominio:'club.marveamayoreo.com', fn:'https://kuuewntjxtjjktxbgxfk.supabase.co/functions/v1/cuenta', sitio:'https://www.marveamayoreo.com/' };
const sbc=(window.supabase&&window.supabase.createClient)?window.supabase.createClient(CUENTA.url,CUENTA.anon,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'marvea.club.auth'}}):null;
const CLIENTAS={};
const medir=(n,d)=>{ try{ if(typeof gtag==='function') gtag('event',n,d||{}); }catch(_){} };

/* ============================================================ ESTADO */
const S={stock:{},cart:{},filtro:'Todos',busca:'',orden:'pop',material:'',cliente:null,form:{},editar:false,
  tarifa:null,recoger:false,resguardar:false,sumar:false,factura:false,avisos:new Map(),notis:[],crearCuenta:false,timerFin:null,calc:{},mult:2,_para:null};
const prod=c=>P.find(x=>x.c===c);
const tarjetas=c=>document.querySelectorAll(`[data-k="${c}"]`);
function setInp(c,v){ tarjetas(c).forEach(el=>{ const i=el.querySelector('.step input'); if(i&&document.activeElement!==i) i.value=v; }); }
// nivel público del inventario real (ya descontadas las piezas que esta clienta tiene apartadas): 0 agotado · 1 últimas (≤2) · 2 hay
const disp=c=>{const s=S.stock[c]; if(!s) return 0; return s.ex===0?0:s.ex===1?2:99;};
const pzs=()=>Object.values(S.cart).reduce((a,b)=>a+b,0);
const sub=()=>Object.entries(S.cart).reduce((a,[c,q])=>a+prod(c).p*q,0);
const kg=()=>pzs()*PESO_G/1000;
const fmt=n=>'$'+Math.round(n).toLocaleString('es-MX');
const tarifaPeso=k=>TARIFAS.find(t=>k<=t.max)||null;
const norm=s=>(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim();
const topList=()=>[...P].sort((a,b)=>b.v-a.v).slice(0,8);
const topN=n=>[...P].filter(x=>disp(x.c)>0||!S.stock[x.c]).sort((a,b)=>b.v-a.v).slice(0,n);
function envio(){
  if(!pzs()) return {costo:0};
  const pq=S.cliente&&S.cliente.paquete;
  if(S.recoger) return {costo:0,modo:'recoger'};
  if(S.sumar&&pq){ const k=pq.kg+kg(), t=tarifaPeso(k); if(!t) return {costo:null,k}; const pag=(TARIFAS.find(x=>x.id===pq.tarifa)||TARIFAS[0]).costo; return {costo:Math.max(0,t.costo-pag),k,t,modo:'sumar'}; }
  const min=tarifaPeso(kg()); if(!min) return {costo:null};
  const t=TARIFAS.find(x=>x.id===S.tarifa&&kg()<=x.max)||min; return {costo:t.costo,t};
}
const iva=()=>S.factura?sub()*.16:0;
const total=()=>sub()+iva()+(envio().costo||0);
const pVenta=c=>(S.calc[c]&&S.calc[c].pv)||Math.round(prod(c).p*S.mult);

/* ============================================================ UI BÁSICA */
function toast(m,t=''){const e=document.createElement('div');e.className='toast '+t;e.innerHTML=m;document.getElementById('toasts').appendChild(e);setTimeout(()=>e.remove(),4200);}
function sec(id){const el=document.getElementById(id); if(!el) return; const y=el.getBoundingClientRect().top+window.scrollY-150;window.scrollTo({top:y,behavior:'smooth'});}
function abrirModal(html,tam){const m=document.getElementById('modal');m.className='modal'+(tam?' '+tam:'');m.innerHTML=html;m.scrollTop=0;requestAnimationFrame(()=>{m.classList.add('on');document.getElementById('velo').classList.add('on');});}
function cerrarModal(){document.getElementById('modal').classList.remove('on');document.getElementById('velo').classList.remove('on');}
document.addEventListener('keydown',e=>{ if(e.key==='Escape') cerrarModal(); });

/* ============================================================ TARJETAS */
function card(x){
  return `<article class="prod" data-k="${x.c}">
    <div class="foto" onclick="abrirFicha('${x.c}')">${fotoHTML(x)}<span class="tag"></span></div>
    <div class="cuerpo"><div class="nom" onclick="abrirFicha('${x.c}')">${esc(x.n)}</div>
      <div class="precio">${fmt(x.p)}<small>MXN</small></div>
      <div class="vend">Véndela en ${fmt(x.p*2)}–${fmt(x.p*3)}</div>
      <div class="mat">${esc(x.cat)}${x.m?' · '+esc(x.m):''}</div>
      <div class="ctl"><div class="step"><button class="menos" onclick="quitar1('${x.c}')" aria-label="una menos">−</button><input type="number" min="0" inputmode="numeric" value="0" onchange="setQty('${x.c}',this.value)" onfocus="this.select()" aria-label="cantidad"><button class="sm" onclick="add('${x.c}')" aria-label="agregar"><span>+</span></button></div>
      <button class="avisame oculto" onclick="avisame('${x.c}')">Avísame</button></div>
    </div></article>`;
}
function patch(c){
  const x=prod(c); if(!x) return; const d=disp(c),q=S.cart[c]||0,s=S.stock[c]||{ex:2};
  tarjetas(c).forEach(el=>{
    const tg=el.querySelector('.tag');
    if(tg){ if(s.ex===0&&!q){tg.textContent='Agotado';tg.className='tag ago';} else if(s.ex<=1){tg.textContent='Últimas piezas';tg.className='tag ult';} else if(x.et){tg.textContent=x.et;tg.className='tag';} else tg.className='tag oculto'; }
    const ago=s.ex===0&&!q, stp=el.querySelector('.step'); if(!stp) return;
    stp.classList.toggle('oculto',ago); stp.classList.toggle('en',q>0);
    const inp=stp.querySelector('input'); if(document.activeElement!==inp) inp.value=q;
    stp.querySelector('.sm').disabled=d===0;
    const av=el.querySelector('.avisame'); if(av){ av.classList.toggle('oculto',!ago); av.classList.toggle('ok',S.avisos.has(c)); av.textContent=S.avisos.has(c)?'✓ Te avisamos':'Avísame cuando haya'; }
  });
  const f=document.getElementById('ficha-ctl'); if(f&&f.dataset.c===c) pintarFichaCtl(c);
}
function flash(c){ tarjetas(c).forEach(s=>{ s.classList.add('flash'); setTimeout(()=>s.classList.remove('flash'),450); }); }
function renderFiltros(){
  const cnt={}; P.forEach(x=>{cnt[x.cat]=(cnt[x.cat]||0)+1;});
  const cats=['Todos',...Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a])];
  const enCat=S.vista==='catalogo';
  document.getElementById('filtros').innerHTML=`<button class="${S.vista==='inicio'?'on':''}" onclick="irVista('inicio')"><i class="fa-solid fa-house"></i> Inicio</button>`+cats.map(c=>`<button class="${enCat&&S.filtro===c?'on':''}" onclick="setFiltro('${esc(c)}')">${c==='Todos'?'Todo el catálogo':esc(c)}<small>${c==='Todos'?P.length:cnt[c]}</small></button>`).join('')+`<button onclick="abrirArmar()"><i class="fa-solid fa-wand-magic-sparkles"></i> Arma mi paquete</button>`;
  const lat=document.getElementById('catsLat'); if(lat) lat.innerHTML=cats.map(c=>`<label><input type="radio" name="catl" ${S.filtro===c?'checked':''} onchange="setFiltro('${esc(c)}')"> ${c==='Todos'?'Todas':esc(c)}<small>${c==='Todos'?P.length:cnt[c]}</small></label>`).join('');
}
function setFiltro(c){ S.filtro=c; if(S.vista!=='catalogo') irVista('catalogo'); else { renderFiltros(); renderGrid(true); window.scrollTo({top:0,behavior:'smooth'}); } }
const matOkSel=x=>{ if(!S.material) return true; const m=norm(x.m); return S.material==='acero'?(m.includes('acero')&&!m.includes('oro')):S.material==='chapa'?m.includes('chapa'):m.includes('laminado'); };
function renderGrid(anim){
  const g=document.getElementById('grid'),b=norm(S.busca);
  const x=document.getElementById('buscarX'); if(x) x.style.display=b?'block':'none';
  let l=P.filter(x=>(S.filtro==='Todos'||x.cat===S.filtro)&&matOkSel(x)&&(!b||norm(x.n+' '+x.m+' '+x.cat+' '+x.c+' '+x.et).includes(b)||(b==='dorado'&&norm(x.m).includes('oro'))));
  if(S.orden==='pop') l.sort((a,b)=>(disp(b.c)>0)-(disp(a.c)>0)||b.v-a.v); else if(S.orden==='nuevo') l.sort((a,b)=>(b.creado||'').localeCompare(a.creado||'')); else if(S.orden==='menor') l.sort((a,b)=>a.p-b.p); else l.sort((a,b)=>b.p-a.p);
  document.getElementById('tituloGrid').innerHTML=b?`Resultados para <i>“${esc(S.busca)}”</i>`:S.filtro==='Todos'?(S.orden==='nuevo'?'Lo más <i>nuevo</i>':S.orden==='pop'?'Lo más <i>vendido</i>':'Todo el <i>catálogo</i>'):`${esc(S.filtro)}`;
  document.getElementById('cuentaGrid').textContent=l.length+(l.length===1?' modelo':' modelos');
  g.classList.toggle('anim',!!anim);
  g.innerHTML=l.length?l.map(card).join(''):'<div class="vacio">No encontramos ese modelo. Prueba con otra palabra o <a href="https://wa.me/528132660673" target="_blank" rel="noopener" style="color:var(--coral);font-weight:800">pregúntanos por WhatsApp</a>.</div>';
  l.forEach(x=>patch(x.c)); if(anim) setTimeout(()=>g.classList.remove('anim'),600);
}
/* ---------- ficha de producto ---------- */
function abrirFicha(c){
  const x=prod(c); if(!x) return; medir('ver_pieza',{codigo:c});
  abrirModal(`<div class="m-cab"><span class="kicker">${esc(x.cat)} · ${esc(x.c)}</span><button class="x-btn" onclick="cerrarModal()">✕</button></div>
   <div class="m-body"><div class="ficha"><div class="foto-g">${x.foto?`<img src="${esc(x.foto)}" alt="${esc(x.n)}">`:ICONOS[x.cat]||ICONOS.Collares}</div>
    <div><h3>${esc(x.n)}</h3><div class="sub" style="margin-top:4px">${esc(x.m)}${x.et?' · <b style="color:var(--coral)">'+esc(x.et)+'</b>':''}</div>
     <div class="precio">${fmt(x.p)} <small>MXN · precio de mayoreo</small></div>
     <div class="gana">💰 Si la vendes entre <b>${fmt(x.p*2)}</b> y <b>${fmt(x.p*3)}</b>, ganas de <b>${fmt(x.p)}</b> a <b>${fmt(x.p*2)}</b> por pieza.</div>
     ${x.notas?`<div class="notas">${esc(x.notas)}</div>`:''}
     <div class="ctl" id="ficha-ctl" data-c="${esc(c)}" style="margin-top:16px"></div>
     <div class="ben"><span><i class="fa-solid fa-lock"></i> Al agregarla queda apartada 15 minutos para ti</span><span><i class="fa-solid fa-gem"></i> Mínimo 12 piezas en total, combinando modelos</span><span><i class="fa-solid fa-plane-up"></i> Sale hoy y llega mañana por DHL Express</span></div>
    </div></div></div>`,'grande');
  pintarFichaCtl(c);
}
function pintarFichaCtl(c){
  const el=document.getElementById('ficha-ctl'); if(!el) return; const q=S.cart[c]||0, d=disp(c), s=S.stock[c]||{ex:2};
  if(s.ex===0&&!q){ el.innerHTML=`<div class="sub"><b style="color:var(--rojo)">Agotada por ahora.</b></div><button class="avisame${S.avisos.has(c)?' ok':''}" style="margin-top:8px" onclick="avisame('${c}')">${S.avisos.has(c)?'✓ Te avisamos':'Avísame cuando haya'}</button>`; return; }
  el.innerHTML=`<div class="step ${q?'en':''}"><button class="menos" onclick="quitar1('${c}')">−</button><input type="number" min="0" value="${q}" onchange="setQty('${c}',this.value)" onfocus="this.select()"><button class="sm" onclick="add('${c}')" ${d?'':'disabled'}><span>+</span></button></div>${q?`<div class="acc" style="margin-top:10px"><button class="c" onclick="cerrarModal();verCarrito()">Ver mi carrito (${pzs()} pzas)</button><button class="s" onclick="cerrarModal()">Seguir comprando</button></div>`:''}`;
}
/* ============================================================ APARTADO REAL (Supabase › tienda-stock) */
const STOCK={ fn:'https://kuuewntjxtjjktxbgxfk.supabase.co/functions/v1/tienda-stock', anon:CUENTA.anon };
let SESION=''; try{ SESION=localStorage.getItem('marvea.sesion')||''; }catch(_){}
if(!/^[a-z0-9-]{16,64}$/.test(SESION)){ SESION=(crypto.randomUUID?crypto.randomUUID():('s'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)+'-'+Math.random().toString(36).slice(2))).toLowerCase(); try{localStorage.setItem('marvea.sesion',SESION);}catch(_){} }
async function stockApi(accion,datos){
  const ctrl=new AbortController(); const tm=setTimeout(()=>ctrl.abort(),12000);
  let r; try{ r=await fetch(STOCK.fn,{method:'POST',headers:{'Content-Type':'application/json','apikey':STOCK.anon,'Authorization':'Bearer '+STOCK.anon},body:JSON.stringify(Object.assign({accion,sesion:SESION},datos||{})),signal:ctrl.signal}); }
  catch(err){ clearTimeout(tm); throw new Error('sin conexión'); }
  clearTimeout(tm); let d={}; try{ d=await r.json(); }catch(_){}
  if(!r.ok) throw new Error(d.error||('error '+r.status)); return d;
}
const SRV={cart:{},pend:new Set(),timer:null,enviando:false,avisar:true};
function aplicarDisp(disp){ if(!disp) return; let cambio=[]; Object.entries(disp).forEach(([c,n])=>{ const s=S.stock[c]; if(!s) return; const antes=s.ex; s.ex=Number(n)||0; if(antes!==s.ex){ patch(c); if(antes===0&&s.ex>0&&S.avisos.has(c)){ const av=S.avisos.get(c); S.notis.unshift({c,av}); S.avisos.delete(c); cambio.push(prod(c).n); } } });
  if(cambio.length){ actualizar(); toast(`¡Ya está disponible <b>${cambio.join(', ')}</b>! Te la dejamos lista en tu carrito.`,'ok'); } }
function sincronizarCarrito(carrito,expira){ // el servidor manda la verdad: lo que de veras quedó apartado
  const nuevo={}; Object.entries(carrito||{}).forEach(([c,q])=>{ if(prod(c)&&q>0) nuevo[c]=Number(q); });
  const tocados=new Set([...Object.keys(S.cart),...Object.keys(nuevo)]); S.cart=nuevo; SRV.cart=Object.assign({},nuevo);
  if(expira){ const t=new Date(expira).getTime(); if(t>Date.now()) S.timerFin=t; }
  tocados.forEach(c=>{ patch(c); setInp(c,S.cart[c]||0); }); actualizar(); guardarCarritoLocal();
}
function guardarCarritoLocal(){ try{ localStorage.setItem('marvea.carrito',JSON.stringify({cart:S.cart,fin:S.timerFin})); }catch(_){} }
function programar(c){ SRV.pend.add(c); clearTimeout(SRV.timer); SRV.timer=setTimeout(enviarApartado,180); }
async function enviarApartado(){
  if(SRV.enviando){ clearTimeout(SRV.timer); SRV.timer=setTimeout(enviarApartado,150); return; }
  const codes=[...SRV.pend]; if(!codes.length) return; SRV.pend.clear(); SRV.enviando=true;
  const items=codes.map(codigo=>({codigo,cant:S.cart[codigo]||0}));
  try{
    const d=await stockApi('apartar',{items});
    const parciales=[];
    Object.entries(d.items||{}).forEach(([c,o])=>{ if(!prod(c)) return; const quiso=S.cart[c]||0, tiene=Number(o.cant)||0;
      if(!SRV.pend.has(c)){ if(tiene) S.cart[c]=tiene; else delete S.cart[c]; }
      SRV.cart[c]=tiene; S.stock[c].ex=Number(o.nivel)||0; if(o.parcial&&tiene<quiso) parciales.push(tiene?`${prod(c).n}: solo había ${tiene}`:`${prod(c).n}: ya no hay`);
      patch(c); setInp(c,S.cart[c]||0); });
    if(d.expira){ const t=new Date(d.expira).getTime(); if(t>Date.now()) S.timerFin=t; }
    if(parciales.length&&SRV.avisar) toast('Se ajustó tu carrito a lo que queda en inventario: '+parciales.join(' · '),'alerta');
    SRV.avisar=true; actualizar(); guardarCarritoLocal();
  }catch(err){
    codes.forEach(c=>{ const v=SRV.cart[c]||0; if(v) S.cart[c]=v; else delete S.cart[c]; patch(c); setInp(c,v); });
    actualizar(); toast('No pudimos apartar las piezas ('+err.message+'). Revisa tu conexión e inténtalo de nuevo.','alerta');
  }finally{ SRV.enviando=false; if(SRV.pend.size){ clearTimeout(SRV.timer); SRV.timer=setTimeout(enviarApartado,120); } }
}
function add(c,n=1,silencio){
  const d=disp(c); if(d<=0){ if(!silencio) toast(`Ya no hay piezas disponibles de <b>${esc(prod(c).n)}</b>.`,'alerta'); return 0; }
  const h=Math.min(n,d); S.cart[c]=(S.cart[c]||0)+h;
  if(h<n&&!silencio) toast(`Agregamos las últimas piezas de <b>${esc(prod(c).n)}</b>; ya no hay más disponibles.`,'alerta');
  S.timerFin=Date.now()+15*60000; patch(c); flash(c); if(!silencio){ bump(); if(S.cart[c]===h) toast(`<b>${esc(prod(c).n)}</b> en tu carrito · ${pzs()} pza${pzs()===1?'':'s'}${pzs()<MIN?` (faltan ${MIN-pzs()} para el mínimo)`:' ✓'} <u style="cursor:pointer" onclick="verCarrito()">ver</u>`,'ok'); } actualizar(); programar(c);
  return h;
}
function setQty(c,v){
  v=Math.max(0,parseInt(v)||0); const actual=S.cart[c]||0, max=actual+disp(c);
  if(v>max){toast(`Ya no hay más piezas disponibles de <b>${esc(prod(c).n)}</b>; te dejamos las últimas.`,'alerta'); v=max;}
  if(v) S.cart[c]=v; else delete S.cart[c];
  setInp(c,v);
  S.timerFin=Date.now()+15*60000; patch(c); flash(c); bump(); actualizar(); programar(c);
}
function quitar1(c){if(!S.cart[c])return;S.cart[c]--;if(!S.cart[c])delete S.cart[c];patch(c);actualizar();programar(c);}
async function liberarTodo(){ const cs=Object.keys(S.cart); S.cart={}; SRV.cart={}; SRV.pend.clear(); cs.forEach(patch); actualizar(); guardarCarritoLocal(); try{ await stockApi('liberar'); }catch(_){} }
async function refrescarEstado(){ try{ const d=await stockApi('estado'); aplicarDisp(d.disponibilidad); if(!SRV.pend.size&&!SRV.enviando) sincronizarCarrito(d.carrito,d.expira); }catch(_){} }
function bump(){const n=document.getElementById('tabN');n.classList.add('bump');setTimeout(()=>n.classList.remove('bump'),250);}
function completar(){
  const falta=MIN-pzs(); let p=0,i=0; const t=topN(16).filter(x=>disp(x.c)>0);
  while(p<falta&&t.length&&i<200){ if(add(t[i%t.length].c,1,true)) p++; i++; }
  bump(); toast(`Agregamos ${p} piezas de lo más vendido.`,'ok');
}
function renderCarrito(){
  const n=pzs(),ok=n>=MIN;
  document.getElementById('tabN').textContent=n;
  const mi=document.getElementById('minimo'); mi.className='minimo'+(ok?' ok':'');
  mi.innerHTML=`<div class="t"><span>Mínimo de mayoreo</span><span><b>${n}</b> / ${MIN} piezas</span></div><div class="barra"><i style="width:${Math.min(100,n/MIN*100)}%"></i></div>
    <small>${ok?'✓ Ya cumples el mínimo':(n?`Te faltan ${MIN-n} · <button onclick="completar()">completar con lo más vendido</button>`:'Agrega modelos o deja que te armemos tu paquete')}</small>`;
  document.getElementById('notis').innerHTML=S.notis.map((o,i)=>`<div class="noti">🔔<div><b>¡Ya está disponible ${esc(prod(o.c).n)}!</b></div><button onclick="add('${o.c}');S.notis.splice(${i},1);renderCarrito()">Agregar</button></div>`).join('');
  document.getElementById('lista').innerHTML=n?Object.entries(S.cart).map(([c,q])=>{const x=prod(c);return `<div class="li"><div class="mf">${fotoHTML(x)}</div><div><div class="t">${esc(x.n)}</div><div class="s">${fmt(x.p)} c/u · ${fmt(x.p*q)}</div></div><div class="q"><button onclick="quitar1('${c}')">−</button><span>${q}</span><button onclick="add('${c}')" ${disp(c)?'':'disabled'}>+</button></div></div>`}).join(''):'<div class="vacio">Tu pedido está vacío.<br>Toca <b>Agregar</b> en cualquier modelo o usa <b>Arma mi paquete</b>.</div>';
  const e=envio();
  document.getElementById('tot').innerHTML=`<div class="f"><span>Subtotal · ${n} pzas</span><span>${fmt(sub())}</span></div>
    <div class="f"><span>Envío DHL ${n?`(${kg().toFixed(2)} kg)`:''}</span><span>${n?(e.costo===null?'a cotizar':(e.modo==='recoger'?'gratis':fmt(e.costo))):'—'}</span></div>
    <div class="f total"><span>Total</span><span>${fmt(total())} <small style="font-size:12px;font-weight:600">MXN</small></span></div>
    ${n?`<div class="ganancia"><span>💰 Ganas entre <b>${fmt(sub())}</b> y <b>${fmt(sub()*2)}</b> (×2–×3)</span><a href="#calculadora" onclick="toggleCarritoM(false);irSeccion('calculadora');return false" style="color:var(--verde);font-weight:800">calcular</a></div>`:''}
    <button class="comprar" ${ok?'':'disabled'} onclick="abrirCheckout()">${ok?'Pagar ahora →':`Faltan ${MIN-n} piezas para pagar`}</button><button class="seguir" onclick="toggleCarritoM(false);if(S.vista!=='catalogo')irVista('catalogo')">Seguir comprando</button>
    ${n?'<div class="libera">⏱ Tus piezas quedan apartadas 15 minutos. Si no terminas, regresan solas al inventario.</div>':''}`;
  document.getElementById('bmTot').textContent=fmt(total());
  document.getElementById('bmPz').textContent=`${n} piezas${ok?'':` · faltan ${MIN-n}`} · ver pedido`;
  document.getElementById('bmBtn').disabled=!ok;
  document.getElementById('barraM').classList.toggle('on',n>0); document.body.classList.toggle('con-barra',n>0);
}
function verCarrito(){ toggleCarritoM(true); }
function toggleCarritoM(on){ document.getElementById('carrito').classList.toggle('abierto',on); document.getElementById('veloC').classList.toggle('on',on); }
function actualizar(){renderCarrito();}
setInterval(()=>{
  const t=document.getElementById('timer');
  if(!pzs()) t.textContent=''; else { const ms=S.timerFin-Date.now();
    if(ms<=0){liberarTodo();toast('Pasaron los 15 minutos: tus piezas regresaron al inventario y quedan libres para otras compras.','alerta');}
    else t.textContent=`⏱ apartadas ${String(Math.floor(ms/60000)).padStart(2,'0')}:${String(Math.floor(ms%60000/1000)).padStart(2,'0')}`; }
},1000);
setInterval(refrescarEstado,60000);
document.addEventListener('visibilitychange',()=>{ if(!document.hidden) refrescarEstado(); });

/* ============================================================ CUENTA: entrar / crear / Google / recuperar */
const esCorreo=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v||'').trim());
const dig10=v=>{ const d=String(v||'').replace(/\D/g,''); if(d.length===12&&d.startsWith('52')) return d.slice(2); if(d.length===13&&d.startsWith('521')) return d.slice(3); return d.length>=10?d.slice(-10):d; };
async function cuentaApi(body,tok){ const r=await fetch(CUENTA.fn,{method:'POST',headers:{'Content-Type':'application/json',apikey:CUENTA.anon,Authorization:'Bearer '+(tok||CUENTA.anon)},body:JSON.stringify(body)}); let j={}; try{ j=await r.json(); }catch(_){} if(!r.ok) throw new Error(j.error||('error '+r.status)); return j; }
const GOOGLE_SVG='<svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C40.9 35.4 44 30.1 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';
function abrirEntrar(para){
  S._para=para||null;
  abrirModal(`<div class="m-cab"><h3>Entra a <i>tu cuenta</i></h3><button class="x-btn" onclick="cerrarModal()">✕</button></div>
   <div class="m-body"><p class="sub" style="margin:0 0 12px;font-size:13.5px">Una sola cuenta para comprar y para tu Business Club.</p>
   <button class="btn-google" onclick="entrarGoogle()">${GOOGLE_SVG} Continuar con Google</button>
   <div class="o-linea">o con tu contraseña</div>
   <div class="campo"><label>WhatsApp o correo</label><input id="uEntrar" value="${esc(S.form.wa||S.form.mail||'')}" placeholder="81 0000 0000 · tu@correo.com" autocomplete="username" onkeydown="if(event.key==='Enter')document.getElementById('passEntrar').focus()"></div>
   <div class="campo" style="margin-top:8px"><label>Contraseña</label><input id="passEntrar" type="password" autocomplete="current-password" placeholder="••••••••" onkeydown="if(event.key==='Enter')entrar()"><div class="ay">¿La olvidaste? <u onclick="recuperar()">Recupérala aquí</u></div></div>
   <div class="acc"><button class="p" id="btnEntrarOk" onclick="entrar()">Entrar</button><button class="s" onclick="abrirRegistro()">Crear mi cuenta</button></div>
   <p class="sub" style="font-size:12.5px;margin:12px 0 0;text-align:center">También puedes comprar sin cuenta: tus datos se piden al pagar.</p></div>`,'chico');
  setTimeout(()=>document.getElementById('uEntrar')?.focus(),200);
}
async function loginDe(u){ u=String(u||'').trim(); if(esCorreo(u)){ try{ const j=await cuentaApi({accion:'resolver',usuario:u}); if(j.login) return j.login; }catch(_){} return u.toLowerCase(); } const d=dig10(u); return d.length===10?d+'@'+CUENTA.dominio:null; }
async function entrar(){
  if(!sbc){ toast('No se pudo cargar el acceso a cuentas. Recarga la página.','alerta'); return; }
  const u=document.getElementById('uEntrar').value||'', pass=document.getElementById('passEntrar').value||'';
  if(!pass){toast('Escribe tu contraseña.','alerta');return;}
  const b=document.getElementById('btnEntrarOk'); b.disabled=true; b.textContent='Entrando…';
  const login=await loginDe(u); if(!login){ b.disabled=false; b.textContent='Entrar'; toast('Escribe tu WhatsApp a 10 dígitos o tu correo.','alerta'); return; }
  const { data, error } = await sbc.auth.signInWithPassword({ email: login, password: pass });
  if(error||!data.user){ b.disabled=false; b.textContent='Entrar'; toast(/invalid/i.test(error&&error.message||'')?'Usuario o contraseña incorrectos.':'No se pudo entrar: '+(error&&error.message||''),'alerta'); return; }
  const c=await cargarClienta(data.user); cerrarModal(); medir('login',{via:'password'}); if(c){ alEntrar(c); if(document.getElementById('coBody')) renderCheckout(); toast(`Hola ${esc((c.nombre||'').split(' ')[0])} 👋`,'ok'); if(S._para==='pagar'){ S._para=null; setTimeout(abrirCheckout,300); } } else { const { data:u2 }=await sbc.auth.getUser(); if(u2&&u2.user) abrirCompletarGoogle(u2.user); }
}
async function entrarGoogle(){ if(!sbc) return; try{ sessionStorage.setItem('marvea.google.volver',JSON.stringify({para:S._para||null})); }catch(_){} const { error } = await sbc.auth.signInWithOAuth({ provider:'google', options:{ redirectTo: CUENTA.sitio+'club.html?google=1' } }); if(error) toast('No se pudo abrir Google: '+error.message,'alerta'); }
async function recuperar(){ const u=(document.getElementById('uEntrar')?.value||'').trim(); if(!u){ toast('Escribe tu WhatsApp o tu correo y vuelve a tocar Recupérala.','alerta'); return; }
  let j={}; try{ j=await cuentaApi({accion:'recuperar',usuario:u}); }catch(e){ j={error:e.message}; }
  if(j.ok){ toast(j.mensaje||'Si esa cuenta existe, te enviamos un correo para crear tu contraseña nueva.','ok'); return; }
  window.open('https://wa.me/528132380573?text='+encodeURIComponent('Hola Marvea, olvidé la contraseña de mi cuenta ('+u+'). ¿Me ayudan a restablecerla?'),'_blank'); toast(j.mensaje||j.error||'Atención al cliente te ayuda a restablecerla por WhatsApp.','ok'); }
async function cargarClienta(user){
  if(!sbc||!user) return null;
  const { data:cl } = await sbc.from('clientas').select('*').eq('user_id',user.id).limit(1).maybeSingle();
  if(!cl) return null; // sesión sin ficha (p. ej. Google recién entrado): hay que completar la cuenta
  const md=user.user_metadata||{}; const wa=dig10(cl.whatsapp||md.whatsapp||'');
  const c={ cuenta:true, id:cl.id, user_id:user.id, wa, nombre:cl.nombre||md.nombre||md.full_name||'', negocio:cl.negocio||'', mail:cl.correo||md.correo||(esCorreo(user.email)&&!user.email.endsWith('@'+CUENTA.dominio)?user.email:'')||'', dir:cl.direccion||'', ciudad:cl.ciudad||'', estado:cl.estado||'', cp:cl.cp||'', ref:cl.referencias||'', pedidos:0 };
  try{ const { data:peds } = await sbc.from('pedidos_web').select('folio,estado,items,piezas,entrega,pagado_en,creado').eq('user_id',user.id).in('estado',['pagado','preparando','enviado','entregado']).order('creado',{ascending:false}).limit(20);
    if(peds&&peds.length){ c.pedidos=peds.length; const u=peds[0]; c.ultimo={folio:u.folio,items:Object.fromEntries((u.items||[]).filter(i=>prod(i.codigo)).map(i=>[i.codigo,Number(i.cant)||0]))};
      const resg=peds.filter(p=>p.entrega&&p.entrega.resguardar&&(p.estado==='pagado'||p.estado==='preparando'));
      if(resg.length){ const piezas=resg.reduce((a,p)=>a+(Number(p.piezas)||0),0); const kgR=piezas*PESO_G/1000; const t=resg[resg.length-1].entrega.tipo; c.paquete={piezas,kg:kgR,tarifa:(t==='5kg'?'5kg':'2kg'),folios:resg.map(p=>p.folio)}; } }
  }catch(_){}
  CLIENTAS[wa||c.id]=c; return c;
}
function abrirRegistro(){
  const f=S.form||{};
  abrirModal(`<div class="m-cab"><h3>Crea <i>tu cuenta</i></h3><button class="x-btn" onclick="cerrarModal()">✕</button></div>
   <div class="m-body"><p class="sub" style="margin:0 0 12px;font-size:13.5px">Una sola cuenta para la tienda y el Business Club. Tú eliges tu contraseña; nadie en Marvea la ve. Tu domicilio lo pides una sola vez, al pagar.</p>
   <button class="btn-google" onclick="entrarGoogle()">${GOOGLE_SVG} Registrarme con Google</button>
   <div class="o-linea">o con WhatsApp / correo</div>
   <div class="form">
    <div class="campo full"><label>Nombre completo</label><input id="r_nombre" value="${esc(f.nombre||'')}" autocomplete="name"></div>
    <div class="campo"><label>WhatsApp (10 dígitos)</label><input id="r_wa" inputmode="numeric" maxlength="14" value="${esc(dig10(f.wa||''))}" autocomplete="tel-national" placeholder="81 0000 0000"></div>
    <div class="campo"><label>Correo</label><input id="r_mail" type="email" value="${esc(f.mail||'')}" autocomplete="email" placeholder="tu@correo.com"></div>
    <div class="campo"><label>Contraseña (mínimo 8)</label><input id="r_pass" type="password" autocomplete="new-password"></div>
    <div class="campo"><label>Repite tu contraseña</label><input id="r_pass2" type="password" autocomplete="new-password"></div>
   </div>
   <p class="sub" style="font-size:12px;margin:8px 0 0">Puedes dar solo tu WhatsApp o solo tu correo (con los dos recibes tu ticket por correo y avisos por WhatsApp).</p>
   <div class="ay" id="r_msg" style="min-height:18px;margin-top:8px;color:var(--rojo);font-weight:700;font-size:13px"></div>
   <div class="acc"><button class="p" id="r_btn" onclick="registrar()">Crear mi cuenta</button><button class="s" onclick="abrirEntrar()">Ya tengo cuenta</button></div></div>`);
  setTimeout(()=>document.getElementById('r_nombre')?.focus(),200);
}
async function registrar(){
  const g=id=>(document.getElementById(id)?.value||'').trim(); const msg=document.getElementById('r_msg');
  const d={ nombre:g('r_nombre'), wa:dig10(g('r_wa')), correo:g('r_mail').toLowerCase(), password:document.getElementById('r_pass').value };
  if(d.nombre.length<2) return msg.textContent='Escribe tu nombre.';
  if(g('r_wa')&&d.wa.length!==10) return msg.textContent='Tu WhatsApp debe tener 10 dígitos.';
  if(d.correo&&!esCorreo(d.correo)) return msg.textContent='Revisa tu correo.';
  if(!d.wa&&!d.correo) return msg.textContent='Deja tu WhatsApp o tu correo (o los dos).';
  if(d.password.length<8) return msg.textContent='La contraseña debe tener al menos 8 caracteres.';
  if(d.password!==document.getElementById('r_pass2').value) return msg.textContent='Las contraseñas no coinciden.';
  const b=document.getElementById('r_btn'); b.disabled=true; b.textContent='Creando tu cuenta…'; msg.textContent='';
  const r=await crearCuenta(d); b.disabled=false; b.textContent='Crear mi cuenta';
  if(!r.ok){ msg.textContent=r.error; return; }
  Object.assign(S.form,{nombre:d.nombre,wa:d.wa,mail:d.correo});
  cerrarModal(); medir('registro',{via:d.wa?'whatsapp':'correo'}); if(r.cliente) alEntrar(r.cliente); if(document.getElementById('coBody')) renderCheckout(); toast('Tu cuenta quedó creada ✓ Ya tienes tu Business Club en Mi cuenta.','ok');
  if(S._para==='pagar'){ S._para=null; setTimeout(abrirCheckout,300); }
}
async function crearCuenta(d){ // alta en el servidor + entrar
  try{
    const j=await cuentaApi(Object.assign({accion:'registrar'},d));
    if(!j.ok) return {ok:false,error:j.error||'No se pudo crear la cuenta'};
    if(!sbc) return {ok:true};
    const login=j.login||(d.wa?d.wa+'@'+CUENTA.dominio:d.correo);
    const { data, error } = await sbc.auth.signInWithPassword({ email:login, password:d.password });
    if(error||!data.user) return {ok:true};
    return {ok:true,cliente:await cargarClienta(data.user)};
  }catch(e){ return {ok:false,error:e.message||'Sin conexión; inténtalo de nuevo.'}; }
}
/* Google: la sesión existe pero aún no está ligada a una clienta → completar WhatsApp (y, si ya había cuenta con ese WhatsApp, ligar con contraseña) */
function abrirCompletarGoogle(user){
  const md=user.user_metadata||{};
  abrirModal(`<div class="m-cab"><h3>Completa <i>tu cuenta</i></h3><button class="x-btn" onclick="cancelarGoogle()">✕</button></div>
   <div class="m-body"><p class="sub" style="margin:0 0 12px;font-size:13.5px">Entraste con Google como <b>${esc(user.email||'')}</b>. Solo falta tu WhatsApp para avisarte de tus pedidos.</p>
   <div class="form"><div class="campo full"><label>Nombre completo</label><input id="g_nombre" value="${esc(md.full_name||md.name||'')}"></div>
   <div class="campo"><label>WhatsApp (10 dígitos)</label><input id="g_wa" inputmode="numeric" maxlength="14" placeholder="81 0000 0000"></div>
   <div class="campo"><label>Contraseña (opcional, para entrar sin Google)</label><input id="g_pass" type="password" autocomplete="new-password"></div></div>
   <div id="g_fusion" style="display:none;margin-top:10px"><p class="sub" style="font-size:13px">Ese WhatsApp ya tiene cuenta en Marvea. Escribe la contraseña de esa cuenta para ligarle tu Google:</p><div class="campo" style="margin-top:6px"><label>Contraseña de tu cuenta</label><input id="g_passVieja" type="password" autocomplete="current-password"></div></div>
   <div class="ay" id="g_msg" style="min-height:18px;margin-top:8px;color:var(--rojo);font-weight:700;font-size:13px"></div>
   <div class="acc"><button class="p" id="g_btn" onclick="completarGoogle()">Guardar y entrar</button><button class="s" onclick="cancelarGoogle()">Cancelar</button></div></div>`,'chico');
}
async function cancelarGoogle(){ try{ await sbc.auth.signOut(); }catch(_){} cerrarModal(); }
async function completarGoogle(){
  const msg=document.getElementById('g_msg'); const wa=dig10(document.getElementById('g_wa').value); if(wa.length!==10) return msg.textContent='Tu WhatsApp debe tener 10 dígitos.';
  const fus=document.getElementById('g_fusion').style.display!=='none'; const b=document.getElementById('g_btn'); b.disabled=true; b.textContent='Guardando…'; msg.textContent='';
  try{
    const ses=await sesionActual(); const tok=ses?ses.access_token:'';
    const body=fus?{accion:'google-fusionar',wa,password:document.getElementById('g_passVieja').value}:{accion:'google-completar',wa,nombre:document.getElementById('g_nombre').value.trim(),password:document.getElementById('g_pass').value,correo:(ses&&ses.user&&ses.user.email)||''};
    const j=await cuentaApi(body,tok);
    if(j.existe){ document.getElementById('g_fusion').style.display=''; document.getElementById('g_passVieja').focus(); msg.textContent='Ese WhatsApp ya tiene cuenta: escribe su contraseña para ligar tu Google.'; return; }
    if(fus){ toast('Google quedó ligado a tu cuenta. Entra de nuevo con Google.','ok'); await sbc.auth.signOut(); cerrarModal(); return; }
    const { data } = await sbc.auth.getUser(); const c=await cargarClienta(data&&data.user); cerrarModal(); if(c){ alEntrar(c); toast(`Hola ${esc((c.nombre||'').split(' ')[0])} 👋 Tu cuenta quedó lista.`,'ok'); if(document.getElementById('coBody')) renderCheckout(); } medir('registro',{via:'google'});
  }catch(e){ msg.textContent=String(e.message||e); }
  finally{ b.disabled=false; b.textContent='Guardar y entrar'; }
}
async function sesionActual(){ if(!sbc) return null; try{ const { data } = await sbc.auth.getSession(); return data&&data.session?data.session:null; }catch(_){ return null; } }
function setCliente(c){
  S.cliente=c; const h=document.getElementById('hola'), pq=c.paquete; h.classList.add('on');
  const nom=esc((c.nombre||'').split(' ')[0]||'clienta');
  h.innerHTML=`<i class="fa-regular fa-face-smile" style="color:var(--coral)"></i> <b>Hola, ${nom}</b>
    ${c.ultimo?`<button onclick="repetir()"><i class="fa-solid fa-rotate-right"></i> Repetir mi último pedido (${Object.values(c.ultimo.items).reduce((a,b)=>a+b,0)} pzas)</button>`:''}
    <button onclick="abrirCuenta('pedidos')"><i class="fa-solid fa-box-open"></i> Mis pedidos</button><button onclick="abrirCuenta('negocio')"><i class="fa-solid fa-store"></i> Mi Business Club</button>
    ${pq?`<span>🗃 Paquete en resguardo: ${pq.piezas} piezas · ${pq.kg.toFixed(2)} kg</span>`:''}`;
  document.getElementById('btnEntrarS').textContent='Hola, '+((c.nombre||'').split(' ')[0]||'');
}
function alEntrar(c){ setCliente(c); if(S.vista==='cuenta'&&window.MVCuenta) window.MVCuenta.abrir(S._panel||'inicio'); }
function salir(){ S.cliente=null;S.sumar=false;S.editar=false; document.getElementById('hola').classList.remove('on'); document.getElementById('btnEntrarS').textContent='Hola'; try{ if(sbc) sbc.auth.signOut(); }catch(_){} try{ if(window.MVCuenta) window.MVCuenta.cerrar(); }catch(_){} if(document.getElementById('coBody')) renderCheckout(); if(S.vista==='cuenta') renderCuentaEntrar(); toast('Cerraste tu sesión.'); }
function repetir(){let f=0;Object.entries(S.cliente.ultimo.items).forEach(([c,q])=>{f+=q-add(c,q,true);});bump();toast(f?`Repetimos tu pedido; ${f} piezas ya no tenían existencia.`:`Repetimos tu pedido ${S.cliente.ultimo.folio} ✓`,f?'alerta':'ok'); verCarrito();}
function avisame(c){
  if(S.avisos.has(c)) return; const cl=S.cliente||{};
  abrirModal(`<div class="m-cab"><h3>Avísame cuando <i>esté disponible</i></h3><button class="x-btn" onclick="cerrarModal()">✕</button></div>
   <div class="m-body"><div class="yo" style="margin-bottom:12px"><span class="mf">${fotoHTML(prod(c))}</span><div><b>${esc(prod(c).n)}</b><br><span class="sub">${esc(prod(c).m)} · $${prod(c).p}</span></div></div>
   <p class="sub" style="margin:0 0 10px;font-size:13.5px">En cuanto vuelva a haber piezas te avisamos y te la dejamos lista en tu carrito.</p>
   <div class="form"><div class="campo"><label>Correo</label><input id="avMail" type="email" value="${esc(cl.mail||S.form.mail||'')}" placeholder="tu@correo.com"></div><div class="campo"><label>WhatsApp</label><input id="avWa" inputmode="numeric" maxlength="14" value="${esc(cl.wa||S.form.wa||'')}" placeholder="81 0000 0000"></div></div>
   <div class="acc"><button class="p" onclick="guardarAviso('${c}')">Avísame</button></div></div>`,'chico');
}
function guardarAviso(c){
  const mail=(document.getElementById('avMail').value||'').trim(), wa=dig10(document.getElementById('avWa').value||'');
  if(!esCorreo(mail)&&wa.length!==10){toast('Deja tu correo o tu WhatsApp.','alerta');return;}
  S.avisos.set(c,{mail,wa}); patch(c); cerrarModal();
  toast(`Listo: te avisamos por ${[mail?'correo':'',wa?'WhatsApp':''].filter(Boolean).join(' y ')} cuando <b>${esc(prod(c).n)}</b> esté disponible.`,'ok');
}

/* ============================================================ ARMA MI PAQUETE */
const NEG={
  tienda:{txt:'Tengo tienda o local',w:{Aretes:1,Collares:1,Pulseras:1,Anillos:1,Cadenas:1,Dijes:.8,Juegos:.9},porque:'Para un local conviene variedad: que el aparador se vea lleno con poquitas piezas de muchos modelos.'},
  redes:{txt:'Vendo por redes / catálogo',w:{Aretes:1.3,Collares:1.4,Pulseras:1.1,Anillos:.8,Cadenas:.9,Dijes:.7,Juegos:1.2},porque:'En redes se venden más los collares y aretes: se ven mejor en foto y en video.'},
  bazar:{txt:'Bazares o temporadas',w:{Pulseras:1.3,Aretes:1.2,Anillos:1.2,Collares:.9,Cadenas:.8,Dijes:1.2,Juegos:.7},porque:'En bazar se mueven las piezas de precio bajo que se compran por impulso o para regalo.'},
  empiezo:{txt:'Apenas voy a empezar',w:{Aretes:1.2,Cadenas:1.1,Pulseras:1.1,Collares:1,Anillos:1,Dijes:.6,Juegos:.8},porque:'Para empezar, lo más seguro es lo que ya se vende mucho: menos riesgo y recuperas más rápido.'}
};
const A={neg:'empiezo',pres:1500,est:[],pref:'top',semilla:0,prop:null};
const PREG=[
  ['neg','¿Cómo vendes?',Object.entries(NEG).map(([k,v])=>[k,v.txt])],
  ['est','¿Qué material prefieren? (puedes elegir varios)',[['acero','Acero'],['chapa','Chapa de oro'],['laminado','Oro laminado']]],
  ['pref','¿Qué te importa más?',[['top','🏆 Lo más pedido'],['var','🎨 Más variedad'],['gan','💰 Más ganancia por pieza']]],
];
function abrirArmar(){
  abrirModal(`<div class="m-cab"><h3>Arma <i>mi paquete</i></h3><button class="x-btn" onclick="cerrarModal()">✕</button></div>
   <div class="m-body"><p class="sub" style="margin:0 0 14px;font-size:13.5px">Tres preguntas y tu presupuesto. Te armamos un paquete con lo disponible hoy; lo ajustas como quieras.</p>
   <div class="preg" id="preg"></div>
   <div class="monto"><div><div class="cajam"><label>Quiero invertir</label><span style="font-family:Fraunces,serif;font-size:22px;font-weight:700;color:var(--coral)">$</span><input id="montoIn" inputmode="numeric" value="${A.pres}" oninput="A.pres=parseInt(this.value)||0" onkeydown="if(event.key==='Enter')armarPaquete()"><span class="sub" style="font-size:12px">MXN</span></div><div class="rap"></div></div><button class="armar" onclick="armarPaquete()">Armar mi paquete →</button></div>
   <div id="propuesta"></div></div>`,'grande');
  renderPreg(); medir('armar_abrir');
}
function renderPreg(){
  const el=document.getElementById('preg'); if(!el) return;
  el.innerHTML=PREG.map(([k,q,ops],i)=>`<div><div class="q"><span>${i+1}.</span> ${q}</div><div class="ops">${ops.map(([v,l])=>`<button class="${k==='est'?(A.est.includes(v)?'on':''):(A[k]===v?'on':'')}" onclick="${k==='est'?`toggleEst('${v}')`:`A['${k}']='${v}';renderPreg()`}">${l}</button>`).join('')}</div></div>`).join('');
  document.querySelector('.monto .rap').innerHTML=[1000,1500,2500,4000,6000].map(v=>`<button onclick="A.pres=${v};document.getElementById('montoIn').value=${v}">${fmt(v)}</button>`).join('');
}
function toggleEst(v){ const i=A.est.indexOf(v); if(i>=0) A.est.splice(i,1); else A.est.push(v); renderPreg(); }
const matOk=x=>{ if(!A.est.length) return true; const m=norm(x.m); return A.est.some(e=>e==='acero'?(m.includes('acero')&&!m.includes('oro')):e==='chapa'?m.includes('chapa'):m.includes('laminado')); };
function armarPaquete(otra){
  A.pres=parseInt(document.getElementById('montoIn').value)||0;
  if(A.pres<300){toast('Escribe el monto que quieres invertir (mínimo $300).','alerta');return;}
  mostrarProp(otra);
}
function armar(){
  const w=NEG[A.neg].w, maxV=Math.max(1,...P.map(x=>x.v));
  const pool=P.filter(x=>disp(x.c)>0&&matOk(x))
    .map(x=>{let s=(w[x.cat]||1)*(A.pref==='top'?1+x.v/maxV*1.5:1)*(A.pref==='gan'?x.p/50:1)+Math.sin(A.semilla*7+x.p)*.25; return {x,s};})
    .sort((a,b)=>b.s-a.s).map(o=>o.x);
  const llenar=lista=>{ const tope=A.pref==='var'?2:4, out={}; let g=0,pz=0,guard=0,ronda=0;
    while(guard++<600){ let puso=false;
      for(const x of lista){ const ya=out[x.c]||0; if(ya>=Math.min(disp(x.c),tope*(ronda+1))) continue; if(g+x.p>A.pres) continue; out[x.c]=ya+1; g+=x.p; pz++; puso=true; }
      if(!puso){ if(ronda>5) break; ronda++; } }
    return {out,g,pz}; };
  const corta=A.pref==='top'?pool.slice(0,6):A.pref==='gan'?pool.slice(0,8):pool.slice(0,14);
  let r=llenar(corta); if(r.pz<MIN&&corta.length<pool.length) r=llenar(pool);
  return r;
}
function mostrarProp(otra){
  if(otra) A.semilla++;
  const pr=armar(); A.prop=pr;
  const ok=pr.pz>=MIN, venta=Object.entries(pr.out).reduce((a,[c,q])=>a+prod(c).p*2*q,0), gan=venta-pr.g;
  const porCat={}; Object.entries(pr.out).forEach(([c,q])=>{const k=prod(c).cat;porCat[k]=(porCat[k]||0)+q;});
  const prom=pr.pz?venta/pr.pz:0, rec=prom?Math.ceil(pr.g/prom):0;
  const html=ok?`<div class="prop">
    <span class="kicker">${otra?'Otra combinación':'Tu paquete sugerido'}</span>
    <div class="porque">💡 ${NEG[A.neg].porque}</div>
    <b style="color:var(--ciruela);font-family:Fraunces,serif;font-size:20px">${pr.pz} piezas · ${Object.keys(pr.out).length} modelos · ${fmt(pr.g)} de ${fmt(A.pres)}</b>
    <div class="mix">${Object.entries(porCat).map(([k,q])=>`<i style="width:${q/pr.pz*100}%;background:${CAT_COLOR[k]}"></i>`).join('')}</div>
    <div class="ley">${Object.entries(porCat).map(([k,q])=>`<span style="--c:${CAT_COLOR[k]}">${esc(k)} ${q}</span>`).join('')}</div>
    <div class="k3"><div><span>Inviertes</span><b>${fmt(pr.g)}</b></div><div><span>Lo vendes en (×2–×3)</span><b style="font-size:17px">${fmt(venta)} – ${fmt(pr.g*3)}</b></div><div class="g"><span>Ganas</span><b style="font-size:17px">${fmt(gan)} – ${fmt(pr.g*2)}</b></div></div>
    ${Object.entries(pr.out).map(([c,q])=>{const x=prod(c);return `<div class="li"><div class="mf">${fotoHTML(x)}</div><div><div class="t">${esc(x.n)}${x.et?' <span style="color:var(--coral);font-size:11px">'+esc(x.et)+'</span>':''}</div><div class="s">${esc(x.m)} · $${x.p}</div></div><div class="q">${q} pzs</div></div>`}).join('')}
    <p class="sub" style="font-size:13px;margin:12px 0 0">Recuperas tu inversión vendiendo <b style="color:var(--ciruela)">${rec} de ${pr.pz}</b> piezas (al doble). Envío DHL estimado: ${tarifaPeso(pr.pz*PESO_G/1000)?fmt(tarifaPeso(pr.pz*PESO_G/1000).costo):'a cotizar'}.</p>
    <div class="acc"><button class="c" onclick="aceptar(true)">Agregar y pagar →</button><button class="s" onclick="aceptar(false)">Solo agregar</button></div>
    <p class="sub" style="font-size:13px;margin:12px 0 0;text-align:center"><u style="cursor:pointer" onclick="armarPaquete(true)">Otra combinación</u></p></div>`
    :`<div class="prop"><b style="color:var(--ciruela)">Con ${fmt(A.pres)} y esos materiales no alcanzan ${MIN} piezas.</b><div class="acc"><button class="p" onclick="A.est=[];renderPreg();mostrarProp()">Probar con todos los materiales</button><button class="s" onclick="document.getElementById('montoIn').value=2500;armarPaquete()">Subir a $2,500</button></div></div>`;
  const pel=document.getElementById('propuesta'); pel.innerHTML=html; pel.scrollIntoView({behavior:'smooth',block:'start'}); medir('armar_propuesta',{piezas:pr.pz,monto:A.pres});
}
function aceptar(pagar){ Object.entries(A.prop.out).forEach(([c,q])=>add(c,q,true)); bump(); cerrarModal(); toast(`Agregamos ${A.prop.pz} piezas a tu carrito ✓`,'ok'); if(pagar) setTimeout(abrirCheckout,350); else verCarrito(); }

/* ============================================================ PAGO */
function abrirCheckout(){
  if(pzs()<MIN){ toast(`El mínimo de mayoreo es ${MIN} piezas.`,'alerta'); return; } toggleCarritoM(false);
  if(!S.tarifa){const t=tarifaPeso(kg());S.tarifa=t?t.id:null;}
  if(S.cliente&&!S.editar){ const c=S.cliente; S.form=Object.assign({},S.form,{nombre:c.nombre,wa:c.wa,mail:c.mail,negocio:c.negocio,dir:c.dir,ciudad:c.ciudad,estado:c.estado,cp:c.cp,ref:c.ref}); if(!c.dir||!c.ciudad) S.editar=true; }
  abrirModal(`<div class="m-cab"><h3>Finalizar <i>compra</i></h3><button class="x-btn" onclick="cerrarModal()">✕</button></div><div class="m-body" id="coBody"></div>`);
  renderCheckout(); medir('begin_checkout',{piezas:pzs(),valor:total()});
}
function campo(id,l,ph,full,extra=''){return `<div class="campo ${full?'full':''}"><label>${l}</label><input id="c_${id}" value="${esc(S.form[id]||'')}" placeholder="${ph}" oninput="S.form['${id}']=this.value" ${extra}></div>`;}
function formDatos(conDomicilio){
  return `<div class="form">${campo('nombre','Nombre completo','Tu nombre',true,'autocomplete="name"')}${campo('wa','Teléfono / WhatsApp (10 dígitos)','81 0000 0000',false,'inputmode="numeric" maxlength="14" autocomplete="tel-national"')}${campo('mail','Correo (ahí llega tu ticket)','tu@correo.com',false,'type="email" autocomplete="email"')}
   ${conDomicilio?`${campo('dir','Calle, número y colonia','Ej. Av. Juárez 123, Centro',true,'autocomplete="street-address"')}${campo('cp','Código postal','66220',false,'inputmode="numeric" maxlength="5" autocomplete="postal-code"')}${campo('ciudad','Ciudad','Ciudad',false,'autocomplete="address-level2"')}${campo('estado','Estado','Nuevo León',false,'autocomplete="address-level1"')}${campo('ref','Referencias para el repartidor','Entre calles, color de casa, portón…',false)}`:''}
   ${campo('negocio','Nombre de tu negocio (opcional)','Ej. Accesorios Luna',true)}</div>`;
}
function renderCheckout(){
  const c=S.cliente,e=envio(),k=kg(),pq=c&&c.paquete, conDom=!S.recoger;
  let quien;
  if(c&&!S.editar){
    quien=`<div class="yo"><span class="av">${esc((c.nombre||'M')[0])}</span><div><b>${esc(c.nombre)}</b>${c.negocio?' · '+esc(c.negocio):''}<br>${S.recoger?'Recoges en Monterrey':(c.dir?'Enviamos a '+esc(c.dir)+(c.cp?', CP '+esc(c.cp):'')+', '+esc(c.ciudad)+(c.estado?', '+esc(c.estado):''):'<b style="color:var(--rojo)">Falta tu domicilio</b>')}${c.ref&&!S.recoger?'<br><small class="sub">Ref.: '+esc(c.ref)+'</small>':''}<br><small class="sub">${esc(c.wa||'')}${c.mail?' · '+esc(c.mail):''}</small></div><button onclick="S.editar=true;renderCheckout()">Editar</button></div>`;
  } else if(c){
    quien=`<div class="sub" style="font-size:13px;margin-bottom:8px"><b style="color:var(--ciruela)">${esc(c.nombre)}</b> · estos datos se guardan en tu cuenta para la próxima vez.</div>${formDatos(conDom)}<div class="acc" style="margin-top:10px"><button class="s" onclick="S.editar=false;renderCheckout()">Listo, así se queda</button></div>`;
  } else {
    quien=`<div class="tabs"><button class="on">Comprar como invitada</button><button onclick="abrirEntrar('pagar')"><i class="fa-regular fa-user"></i> Ya tengo cuenta</button></div>${formDatos(conDom)}
     <label class="check"><input type="checkbox" ${S.crearCuenta?'checked':''} onchange="S.crearCuenta=this.checked;renderCheckout()"><div><b>Guardar mis datos en una cuenta Marvea</b><small>Para no volver a escribir tu domicilio y activar tu Business Club (tus pedidos, tu guía DHL y tu catálogo con nuestras fotos). Solo eliges una contraseña.</small></div></label>
     ${S.crearCuenta?`<div class="form" style="margin-top:8px">${campo('pass','Contraseña (mínimo 8)','••••••••',false,'type="password" autocomplete="new-password"')}${campo('pass2','Repite tu contraseña','••••••••',false,'type="password" autocomplete="new-password"')}</div>`:''}`;
  }
  const tar=TARIFAS.map(t=>{const cabe=k<=t.max,on=!S.sumar&&!S.recoger&&S.tarifa===t.id&&cabe;return `<button class="${on?'on':''}" ${cabe?'':'disabled'} onclick="S.sumar=false;S.recoger=false;S.tarifa='${t.id}';renderCheckout();renderCarrito()"><b>DHL ${t.nombre}</b><em>${fmt(t.costo)}</em><small>${cabe?(tarifaPeso(k).id===t.id?'Tu pedido pesa '+k.toFixed(2)+' kg':'Útil si vas a resguardar y sumar'):'No cabe tu pedido'}</small></button>`;}).join('');
  let sb='';
  if(pq){const kt=pq.kg+k,nt=tarifaPeso(kt),pag=(TARIFAS.find(x=>x.id===pq.tarifa)||TARIFAS[0]).costo,dif=nt?Math.max(0,nt.costo-pag):null;
    const lleno=(pq.folios||[]).length>=3; if(lleno&&S.sumar){S.sumar=false;}
    sb=`<button class="${S.sumar?'on':''}" ${lleno?'disabled':''} onclick="S.sumar=true;S.recoger=false;S.resguardar=false;renderCheckout();renderCarrito()"><b>Agregar a mis resguardos</b><em>${lleno?'lleno':(dif===null?'cotizar':fmt(dif))}</em><small>${lleno?'Ya tienes 3 pedidos en resguardo (máximo 3): pide que salga tu paquete':`máximo 3 pedidos · ${pq.piezas} pzas guardadas · total ${kt.toFixed(2)} kg${dif===0?' · sin costo extra':' · solo la diferencia'}`}</small></button>`;}
  document.getElementById('coBody').innerHTML=`
    <div class="bloq"><div class="tt"><span>1</span>¿A quién le enviamos?</div>${quien}</div>
    <div class="bloq"><div class="tt"><span>2</span>Entrega</div><div class="seg">${tar}${sb}<button class="${S.recoger?'on':''}" onclick="S.recoger=true;S.sumar=false;S.resguardar=false;renderCheckout();renderCarrito()"><b>Recoger en Monterrey</b><em>Gratis</em><small>Te contactamos por WhatsApp para la entrega</small></button></div>
      <div class="nota dhl-n">✈️ <b>Tarifas y tiempos los determina DHL</b> según el peso y tu localidad. Sale hoy y llega mañana donde hay oficina DHL.</div>
      ${S.sumar||S.recoger?'':`<label class="check"><input type="checkbox" ${S.resguardar?'checked':''} onchange="S.resguardar=this.checked"><div><b>Resguardar mi paquete</b><small>Lo guardamos para juntarlo con tus próximos pedidos (hasta 3) y que todo salga en un envío; solo se cobra la diferencia si cambia la tarifa.</small></div></label>`}
      <label class="check"><input type="checkbox" ${S.factura?'checked':''} onchange="S.factura=this.checked;renderCheckout();renderCarrito()"><div><b>Necesito factura</b><small>Se agrega 16% de IVA. Te pedimos tus datos fiscales por WhatsApp.</small></div></label></div>
    <div class="bloq"><div class="tt"><span>3</span>Paga</div>
      <div class="resumen-m"><div class="det"><b>${pzs()} piezas</b> · ${fmt(sub())}${S.factura?` · IVA ${fmt(iva())}`:''} · ${e.costo===null?'envío a cotizar':(e.modo==='recoger'?'recoges gratis':(e.modo==='sumar'?'diferencia de envío ':'envío DHL ')+fmt(e.costo))}</div><div class="gran">${fmt(total())} <small style="font-size:13px;font-family:Urbanist;color:var(--tinta-2)">MXN</small></div></div>
      <div class="pagos"><button class="pago tarjeta" id="btnTarjeta" onclick="pagar('tarjeta')"><b>💳 Pagar con tarjeta</b><small>Se confirma al instante. Pago seguro con Stripe; Marvea nunca ve tu tarjeta.</small><div class="wallets"><span>Apple Pay</span><span>Google Pay</span><span>Visa · Mastercard · Amex</span><span>Crédito y débito</span></div></button>
      <button class="pago wa" onclick="pagar('transfer')"><b>🏦 Transferencia bancaria</b><small>Te mandamos tu pedido a WhatsApp con los datos bancarios. Apartado 12 h.</small></button></div>
      <p class="sub" style="font-size:12px;margin:12px 0 0;text-align:center">Al pagar aceptas los <a href="legal.html#terminos" target="_blank" style="color:var(--coral)">términos y condiciones</a> y el <a href="legal.html#privacidad" target="_blank" style="color:var(--coral)">aviso de privacidad</a>.</p></div>`;
}
function validar(){ let ok=true;
  const req=S.recoger?['wa','nombre']:['wa','nombre','dir','ciudad','estado']; if(!S.cliente&&S.crearCuenta) req.push('pass','pass2');
  req.forEach(k=>{const el=document.getElementById('c_'+k),v=(S.form[k]||'').trim(),bad=!v||(k==='wa'&&dig10(v).length!==10)||(k==='pass'&&v.length<8)||(k==='pass2'&&v!==(S.form.pass||''));if(el)el.classList.toggle('err',bad);if(bad)ok=false;});
  if(S.form.mail&&!esCorreo(S.form.mail)){ ok=false; const el=document.getElementById('c_mail'); if(el) el.classList.add('err'); }
  if(!S.cliente&&S.crearCuenta&&!S.form.mail&&dig10(S.form.wa||'').length!==10) ok=false;
  if(!ok) toast(S.crearCuenta&&!S.cliente?'Completa tus datos; la contraseña debe tener 8 caracteres y coincidir.':(S.recoger?'Escribe tu nombre y tu teléfono.':'Completa tus datos de envío.'),'alerta'); return ok; }
function mensajeWA(folio){ const c=S.form,e=envio();
  return `Hola Marvea 👋 Pedido web *${folio}*\n\n`+Object.entries(S.cart).map(([k,q])=>`• ${q} × ${prod(k).n} — ${fmt(prod(k).p*q)}`).join('\n')+
  `\n\nPiezas: ${pzs()}\nSubtotal: ${fmt(sub())}${S.factura?`\nIVA 16%: ${fmt(iva())}`:''}\n${S.recoger?'Recojo gratis en Monterrey':(S.sumar?'Agregar a mis resguardos · diferencia':S.resguardar?'Resguardar paquete · envío DHL':'Envío DHL')+': '+(e.costo===null?'a cotizar':fmt(e.costo))}\n*Total: ${fmt(total())} MXN*\n\nPago por transferencia · ${c.nombre}${S.recoger?'':`\n${c.dir}, ${c.cp?'CP '+c.cp+', ':''}${c.ciudad}, ${c.estado||''}${c.ref?`\nReferencias: ${c.ref}`:''}`}`; }
async function guardarDatosCuenta(){ // la clienta editó sus datos en el pago → quedan en su ficha para la próxima vez
  if(!S.cliente||!sbc) return; const f=S.form; const cambios={nombre:f.nombre||S.cliente.nombre,whatsapp:dig10(f.wa||S.cliente.wa),correo:f.mail||'',negocio:f.negocio||'',direccion:f.dir||'',ciudad:f.ciudad||'',estado:f.estado||'',cp:f.cp||'',referencias:f.ref||'',actualizado:new Date().toISOString()};
  try{ const { error } = await sbc.from('clientas').update(cambios).eq('id',S.cliente.id); if(!error){ Object.assign(S.cliente,{nombre:cambios.nombre,wa:cambios.whatsapp,mail:cambios.correo,negocio:cambios.negocio,dir:cambios.direccion,ciudad:cambios.ciudad,estado:cambios.estado,cp:cambios.cp,ref:cambios.referencias}); S.editar=false; } }catch(_){}
}
async function pagar(m){ if(!validar()) return;
  S.form.wa=dig10(S.form.wa||'');
  if(S.cliente&&S.editar) await guardarDatosCuenta();
  if(!S.cliente&&S.crearCuenta){ const f=S.form; const r=await crearCuenta({nombre:f.nombre,wa:f.wa,correo:f.mail||'',negocio:f.negocio||'',password:f.pass||'',dir:f.dir||'',ciudad:f.ciudad||'',estado:f.estado||'',cp:f.cp||'',ref:f.ref||''});
    if(!r.ok){ toast(r.error+' Si ya tienes cuenta, entra con tu contraseña.','alerta'); return; } if(r.cliente){ S.cliente=r.cliente; alEntrar(r.cliente); } toast('Tu cuenta quedó creada ✓','ok'); }
  const folio='MV-'+Math.floor(10000+Math.random()*90000);
  if(m==='transfer'){window.open('https://wa.me/528132660673?text='+encodeURIComponent(mensajeWA(folio)),'_blank');finalizar(m,folio);return;}
  const b=document.getElementById('btnTarjeta');b.disabled=true;b.innerHTML='<b><span class="cargando"></span>Conectando con Stripe…</b><small>Te llevamos a la página segura de pago.</small>';
  pagarStripe(folio).catch(err=>{ b.disabled=false; b.innerHTML='<b>💳 Pagar con tarjeta</b><small>Se confirma al instante. Pago seguro con Stripe.</small><div class="wallets"><span>Apple Pay</span><span>Google Pay</span><span>Visa · Mastercard · Amex</span></div>';
    if(err.faltan){ cerrarModal(); toast(err.message+(err.faltan.length?' ('+err.faltan.map(f=>`${f.nombre}: ${f.apartadas} de ${f.pedidas}`).join(' · ')+')':''),'alerta'); if(innerWidth<=980) toggleCarritoM(true); return; }
    toast('No se pudo iniciar el pago: '+err.message,'alerta'); }); }
/* ---------- Stripe Checkout (real) */
const STRIPE={ fn:'https://kuuewntjxtjjktxbgxfk.supabase.co/functions/v1/crear-pago', anon:CUENTA.anon };
function snapshotPedido(folio){ return {folio,cart:S.cart,form:S.form,cliente:S.cliente,tarifa:S.tarifa,recoger:S.recoger,sumar:S.sumar,resguardar:S.resguardar,factura:S.factura,crearCuenta:S.crearCuenta,t:Date.now()}; }
async function pagarStripe(folio){
  const c=S.form, e=envio();
  if(SRV.pend.size||SRV.enviando){ await new Promise(r=>setTimeout(r,700)); }
  const payload={ folio, sesion:SESION, items:Object.entries(S.cart).map(([codigo,cant])=>({codigo,cant})), factura:S.factura, resguardar:S.resguardar, sumar:S.sumar,
    envio:{ tipo:S.recoger?'recoger':(e.t?e.t.id:'2kg'), costo:e.costo===null?0:e.costo, nombre:S.recoger?'Recoger en Monterrey':(e.modo==='sumar'?'Diferencia de envío DHL (agregado a resguardos)':undefined) },
    cliente:{ nombre:c.nombre, wa:dig10(c.wa||''), mail:c.mail||'', negocio:c.negocio||'', dir:c.dir||'', ciudad:c.ciudad||'', estado:c.estado||'', cp:c.cp||'', ref:c.ref||'', crearCuenta:!!S.cliente } };
  const ses=await sesionActual(); const tokenAuth=ses&&ses.access_token?ses.access_token:STRIPE.anon;
  try{ localStorage.setItem('marvea.pedido',JSON.stringify(snapshotPedido(folio))); }catch(_){}
  const ctrl=new AbortController(); const tm=setTimeout(()=>ctrl.abort(),15000);
  let r; try{ r=await fetch(STRIPE.fn,{method:'POST',headers:{'Content-Type':'application/json','apikey':STRIPE.anon,'Authorization':'Bearer '+tokenAuth},body:JSON.stringify(payload),signal:ctrl.signal}); }
  catch(err){ clearTimeout(tm); throw new Error('sin conexión con la función de pago'); }
  clearTimeout(tm);
  let d={}; try{ d=await r.json(); }catch(_){}
  if(r.status===409&&d.carrito){ sincronizarCarrito(d.carrito,null); S.timerFin=Date.now()+15*60000; const e2=new Error(d.error||'Se acabaron algunas piezas'); e2.faltan=d.faltan||[]; throw e2; }
  if(!r.ok||!d.url) throw new Error(d.error||('función de pago no disponible ('+r.status+')'));
  medir('add_payment_info',{valor:total()}); location.href=d.url;
}
function regresoStripe(){
  const q=new URLSearchParams(location.search), pago=q.get('pago'); if(!pago) return;
  let sn=null; try{ sn=JSON.parse(localStorage.getItem('marvea.pedido')||'null'); }catch(_){}
  history.replaceState(null,'',location.pathname);
  if(!sn||(q.get('folio')&&sn.folio!==q.get('folio'))){ toast(pago==='ok'?'Pago recibido ✓ Te enviamos tu ticket por correo.':'El pago se canceló; tu carrito sigue aquí.',pago==='ok'?'ok':'alerta'); return; }
  const cart={}; Object.entries(sn.cart||{}).forEach(([c,q2])=>{ if(prod(c)) cart[c]=q2; });
  Object.assign(S,{cart,form:sn.form||{},tarifa:sn.tarifa,recoger:!!sn.recoger,sumar:!!sn.sumar,resguardar:!!sn.resguardar,factura:!!sn.factura,crearCuenta:!!sn.crearCuenta});
  S.timerFin=Date.now()+15*60000;
  if(sn.cliente&&!S.cliente){ setCliente(sn.cliente); }
  Object.keys(cart).forEach(patch); actualizar();
  if(pago==='ok'){ try{localStorage.removeItem('marvea.pedido');}catch(_){} if(pzs()>=MIN){ abrirCheckout(); finalizar('tarjeta',sn.folio); } else toast('Pago recibido ✓','ok'); medir('purchase',{folio:sn.folio}); }
  else { toast('El pago se canceló. Tus piezas siguen en tu carrito.','alerta'); if(innerWidth<=980) toggleCarritoM(true);
    stockApi('reactivar').then(d=>{ aplicarDisp(d.disponibilidad); sincronizarCarrito(d.carrito,d.expira); if(!pzs()) toast('Pasó el tiempo del apartado: tus piezas regresaron al inventario. Vuelve a agregarlas.','alerta'); }).catch(()=>{}); }
}
function finalizar(metodo,folio){
  const c=S.cliente||{wa:dig10(S.form.wa||''),nombre:S.form.nombre||'',negocio:S.form.negocio||'',mail:S.form.mail||'',dir:S.form.dir||'',ciudad:S.form.ciudad||'',estado:S.form.estado||'',cp:S.form.cp||'',ref:S.form.ref||''}; const nueva=!S.cliente;
  const e=envio(),items={...S.cart},n=pzs(),sub0=sub(),tot=total(),k=kg(),fac=S.factura,ivaV=iva();
  Object.entries(items).forEach(([cd,q])=>{ prod(cd).v+=q; });
  if(S.cliente){ if(S.sumar&&c.paquete){c.paquete.piezas+=n;c.paquete.kg+=k;c.paquete.folios.push(folio);if(e.t)c.paquete.tarifa=e.t.id;} else if(S.resguardar){c.paquete={piezas:n,kg:k,tarifa:(e.t||TARIFAS[1]).id,folios:[folio]};} c.ultimo={folio,items}; c.pedidos=(c.pedidos||0)+1; }
  const resg=S.sumar||S.resguardar;
  S.cart={}; SRV.cart={}; SRV.pend.clear(); guardarCarritoLocal(); Object.keys(items).forEach(patch); actualizar(); if(!nueva) setCliente(c);
  if(metodo==='transfer') stockApi('liberar').catch(()=>{}); // por transferencia Marvea aparta a mano al recibir el WhatsApp
  setTimeout(refrescarEstado,1500);
  const nom=esc((c.nombre||'').split(' ')[0]);
  document.getElementById('coBody').innerHTML=`
    <div class="exito"><h3>${metodo==='tarjeta'?`¡Listo, ${nom}! <i>${resg?'Tu paquete queda en resguardo.':'Ya estamos preparando tu pedido.'}</i>`:`Ya casi, ${nom}. <i>Envíanos tu comprobante.</i>`}</h3>
      <p class="sub">Pedido <b>${folio}</b> · ${metodo==='tarjeta'?'pagado con tarjeta (Stripe)':'pendiente de transferencia (apartado 12 h; ya se abrió tu chat de WhatsApp)'}.</p>
      <div class="chips"><span class="chip">📦 ${n} piezas · ${k.toFixed(2)} kg</span><span class="chip">${S.recoger?'📍 Recoges gratis en Monterrey':resg?'🗃 En resguardo':'✈️ DHL Express'}</span>${fac?'<span class="chip">🧾 Factura</span>':''}</div>
    </div>
    ${nueva?`<div class="club"><span class="kicker">Activa tu Business Club</span>
      <h3 style="font-size:22px;color:var(--ciruela);margin:6px 0">Con este pedido puedes ganar <b>entre ${fmt(sub0)} y ${fmt(sub0*2)}</b></h3>
      <p class="sub" style="font-size:13px;margin:6px 0 10px">Tus datos ya están capturados. Elige una contraseña y tendrás tu catálogo con nuestras fotos, tus pedidos y tu guía DHL en un solo lugar.</p>
      <div class="form"><div class="campo"><label>Contraseña (mínimo 8)</label><input id="act_pass" type="password" autocomplete="new-password"></div><div class="campo"><label>Repítela</label><input id="act_pass2" type="password" autocomplete="new-password"></div></div>
      <div class="ay" id="act_msg" style="min-height:18px;margin-top:6px;color:var(--rojo);font-weight:700;font-size:13px"></div>
      <div class="acc"><button class="p" id="act_btn" onclick="activarCuenta()">Crear mi cuenta</button></div></div>`
    :`<div class="club"><span class="kicker">Tu Business Club</span>
      <h3 style="font-size:22px;color:var(--ciruela);margin:6px 0">Con este pedido puedes ganar <b>entre ${fmt(sub0)} y ${fmt(sub0*2)}</b></h3>
      <p class="sub" style="font-size:12.5px;margin:6px 0 0">El pedido ya aparece en Mis pedidos; ahí sigues tu guía DHL, registras lo que vendes y descargas tu catálogo con el nombre de tu negocio.</p></div>`}
    <div class="bloq tk"><div class="tt"><span>✓</span>Ticket</div>
      ${Object.entries(items).map(([cd,q])=>`<div class="r"><span>${q} × ${esc(prod(cd).n)}</span><b>${fmt(prod(cd).p*q)}</b></div>`).join('')}
      <div class="r"><span>${S.recoger?'Recoger en Monterrey':S.sumar?'Diferencia de envío DHL':'Envío DHL'}</span><b>${S.recoger?'Gratis':e.costo===null?'a cotizar':fmt(e.costo)}</b></div>${fac?`<div class="r"><span>IVA 16%</span><b>${fmt(ivaV)}</b></div>`:''}
      <div class="tt2"><span>Total</span><span>${fmt(tot)} MXN</span></div>
      <p class="sub" style="font-size:12.5px;margin:10px 0 0">📧 ${c.mail?`Te enviamos este ticket a <b>${esc(c.mail)}</b>.`:'Sin correo: tu ticket queda en tu Business Club y por WhatsApp.'}</p></div>
    ${c.paquete&&resg?`<div class="nota cielo">🗃 Paquete en resguardo: <b>${c.paquete.piezas} piezas · ${c.paquete.kg.toFixed(2)} kg</b> (${c.paquete.folios.join(', ')}). Cuando quieras que salga, pídelo desde tu Business Club o por WhatsApp.</div>`:''}
    <div class="acc"><button class="s" onclick="cerrarModal()">Seguir comprando</button><button class="p" onclick="cerrarModal();if(window.MVCuenta)MVCuenta.cerrar();abrirCuenta('pedidos')">Ver mi pedido en mi cuenta</button></div>`;
  S.sumar=false;S.resguardar=false;S.recoger=false;S.tarifa=null;S.factura=false;S.crearCuenta=false;S.editar=false;
  toast(metodo==='tarjeta'?'Pago aprobado ✓':'Pedido registrado, te esperamos en WhatsApp','ok');
}
async function activarCuenta(){ // compró como invitada → crea su cuenta con los datos ya capturados
  const msg=document.getElementById('act_msg'), p1=document.getElementById('act_pass').value, p2=document.getElementById('act_pass2').value;
  if(p1.length<8) return msg.textContent='La contraseña debe tener al menos 8 caracteres.'; if(p1!==p2) return msg.textContent='Las contraseñas no coinciden.';
  const f=S.form; const b=document.getElementById('act_btn'); b.disabled=true; b.textContent='Creando…';
  const r=await crearCuenta({nombre:f.nombre,wa:dig10(f.wa||''),correo:f.mail||'',negocio:f.negocio||'',password:p1,dir:f.dir||'',ciudad:f.ciudad||'',estado:f.estado||'',cp:f.cp||'',ref:f.ref||''});
  b.disabled=false; b.textContent='Crear mi cuenta';
  if(!r.ok){ msg.textContent=r.error; return; }
  if(r.cliente) alEntrar(r.cliente); medir('registro',{via:'post-compra'});
  document.querySelector('.club').innerHTML=`<span class="kicker">Business Club activado ✓</span><p style="margin:6px 0 0;color:var(--ciruela)">Tu cuenta quedó creada. Tu pedido se liga a ella en cuanto confirmemos el pago; entra con tu ${f.mail?'correo':'WhatsApp'} y tu contraseña.</p>`;
}

/* ============================================================ VISTAS (una sola página: inicio · catálogo · mi cuenta) */
window.MV_SB=sbc; window.MV_S=S; window.mvFoto=c=>((prod(c)||{}).foto||"");
S.vista='inicio'; S._panel='inicio';
function irVista(v,sub,sinHash){
  if(!['inicio','catalogo','cuenta','ayuda'].includes(v)) v='inicio';
  S.vista=v; document.body.dataset.vista=v; if(typeof MEGA!=='undefined'&&MEGA.abierto) toggleMega(false); document.querySelectorAll('.vista').forEach(x=>x.classList.toggle('on',x.id==='v-'+v));
  if(v==='catalogo'){ renderGrid(true); }
  if(v==='cuenta'){ S._panel=sub||S._panel||'inicio'; if(S.cliente&&window.MVCuenta){ document.getElementById('cuentaEntrar').classList.remove('on'); window.MVCuenta.abrir(S._panel); } else renderCuentaEntrar(); }
  if(v==='ayuda'){ S._ay=sub||S._ay||'comprar'; pintarAyuda(S._ay); }
  renderFiltros(); toggleCarritoM(false); pintarNavM();
  if(!sinHash){ const h='#/'+(v==='inicio'?'':v)+((v==='cuenta'&&sub&&sub!=='inicio')||(v==='ayuda'&&sub)?'/'+sub:''); if(location.hash!==h) history.pushState(null,'',location.pathname+h); }
  window.scrollTo({top:0}); medir('vista',{vista:v,sub:sub||''});
}
function irSeccion(id){ if(S.vista!=='inicio') irVista('inicio'); setTimeout(()=>{ const el=document.getElementById(id); if(el){ const y=el.getBoundingClientRect().top+window.scrollY-140; window.scrollTo({top:y,behavior:'smooth'}); } },60); }
function abrirCuenta(panel){ irVista('cuenta',panel||'inicio'); }
function leerHash(){
  const h=decodeURIComponent((location.hash||'').slice(1)); if(/access_token|error_description|type=recovery/.test(h)) return false;
  if(document.getElementById('modal').classList.contains('on')) cerrarModal();
  if(h.startsWith('/catalogo')){ if(h.split('/')[2]) S.filtro=h.split('/')[2]; irVista('catalogo',null,true); return true; }
  if(h.startsWith('/ayuda')){ irVista('ayuda',h.split('/')[2]||'comprar',true); return true; }
  if(h==='cuidados'||h==='como-comprar'){ irVista('ayuda',h==='cuidados'?'cuidados':'comprar',true); return true; }
  if(h.startsWith('/cuenta')){ irVista('cuenta',h.split('/')[2]||'inicio',true); return true; }
  if(h.startsWith('/p/')){ const c=h.slice(3); irVista('catalogo',null,true); if(prod(c)) setTimeout(()=>abrirFicha(c),200); return true; }
  if(h.startsWith('cat=')){ const c=h.slice(4); if(P.some(x=>x.cat===c)) S.filtro=c; irVista('catalogo',null,true); return true; }
  if(h.startsWith('p=')){ const c=h.slice(2); irVista('catalogo',null,true); if(prod(c)) setTimeout(()=>abrirFicha(c),200); return true; }
  if(h==='nuevo'){ S.orden='nuevo'; S.filtro='Todos'; document.getElementById('orden').value='nuevo'; irVista('catalogo',null,true); return true; }
  if(['calculadora','envios','preguntas','como-funciona','ganar','rastreo','contacto','club'].includes(h)){ irVista('inicio',null,true); irSeccion(h==='ganar'?'calculadora':h==='rastreo'?'envios':h==='club'?'calculadora':h); return true; }
  irVista('inicio',null,true); return true;
}
window.addEventListener('popstate',()=>leerHash());

/* búsqueda y filtros */
(function(){
  const b=document.getElementById('buscar'); let t=null;
  b.addEventListener('input',()=>{ clearTimeout(t); t=setTimeout(()=>{ S.busca=b.value; if(S.busca&&S.vista!=='catalogo') irVista('catalogo'); else renderGrid(false); },120); });
  b.addEventListener('keydown',e=>{ if(e.key==='Enter'){ S.busca=b.value; irVista('catalogo'); b.blur(); } });
  document.getElementById('buscarX').addEventListener('click',()=>{ b.value=''; S.busca=''; renderGrid(false); b.focus(); });
  document.getElementById('orden').addEventListener('change',e=>{ S.orden=e.target.value; renderGrid(true); });
  document.querySelectorAll('#materiales input').forEach(r=>r.addEventListener('change',()=>{ S.material=r.value; renderGrid(true); }));
})();

/* ============================================================ CENTRO DE AYUDA */
function irAyuda(t){ irVista('ayuda',t||'comprar'); }
function pintarAyuda(t){ if(!document.getElementById('ay-'+t)) t='comprar'; S._ay=t;
  document.querySelectorAll('#tabsAy button').forEach(b=>b.classList.toggle('on',b.dataset.ay===t));
  document.querySelectorAll('.ay-panel').forEach(x=>x.classList.toggle('on',x.id==='ay-'+t));
  const b=document.querySelector('#tabsAy button.on'); if(b) centrarH(b,'center'); }
document.querySelectorAll('#tabsAy button').forEach(b=>b.addEventListener('click',()=>{ pintarAyuda(b.dataset.ay); renderFiltros(); const h='#/ayuda/'+b.dataset.ay; if(location.hash!==h) history.replaceState(null,'',location.pathname+h); medir('ayuda',{tema:b.dataset.ay}); }));
(function(){ const f=document.getElementById('rastreoAy'); if(f) f.addEventListener('submit',()=>{ const g=document.getElementById('guiaAy'); g.value=(g.value||'').replace(/[^0-9A-Za-z]/g,''); medir('rastreo_dhl'); }); })();
/* alto de la barra superior (para las pestañas pegadas) */
function medirTop(){ const t=document.querySelector('header.top'); if(t) document.documentElement.style.setProperty('--top-h',t.offsetHeight+'px'); }
let __anchoTop=window.innerWidth; window.addEventListener('resize',()=>{ if(window.innerWidth!==__anchoTop){ __anchoTop=window.innerWidth; medirTop(); } }); setTimeout(medirTop,50); window.addEventListener('load',medirTop);

/* ============================================================ BARRA DE CATEGORÍAS + MENÚ "Todo el catálogo" */
function pintarBarra(cnt,foto,cats){
  const enCat=S.vista==='catalogo', f=document.getElementById('filtros');
  f.innerHTML=`<button class="b-todo ${MEGA.abierto?'abierto':''}" id="btnMega" onclick="toggleMega()" aria-expanded="${MEGA.abierto}"><i class="fa-solid fa-bars-staggered"></i><span>Todo el catálogo</span><i class="fa-solid fa-chevron-down fl"></i></button>`
    +`<div class="b-cats">`+AYUDA_BARRA.map(([t,ic,n])=>`<button class="b-cat b-info ${S.vista==='ayuda'&&S._ay===t?'on':''}" onclick="irAyuda('${t}')"><span class="ic"><i class="${ic}"></i></span><span>${n}</span></button>`).join('')+`</div>`
    +`<button class="b-arma" onclick="abrirArmar()"><i class="fa-solid fa-wand-magic-sparkles"></i><span>Arma mi paquete</span></button>`;
  const on=f.querySelector('.b-cat.on'); if(on) centrarH(on,'nearest');
}
const MEGA={abierto:false,cat:null};
const AYUDA_BARRA=[['comprar','fa-solid fa-bag-shopping','Cómo comprar'],['envios','fa-solid fa-truck-fast','Envíos'],['pagos','fa-regular fa-credit-card','Pagos'],['cuidados','fa-solid fa-gem','Cuidados'],['preguntas','fa-regular fa-circle-question','Preguntas frecuentes'],['cambios','fa-solid fa-shield-heart','Garantía'],['contacto','fa-brands fa-whatsapp','Contacto']];
function toggleMega(v){ MEGA.abierto=v===undefined?!MEGA.abierto:!!v; const m=document.getElementById('mega'); if(!m) return;
  if(MEGA.abierto){ pintarMega(); m.classList.add('on'); document.body.classList.add('mega-on'); medir('menu_catalogo'); } else { m.classList.remove('on'); document.body.classList.remove('mega-on'); }
  const b=document.getElementById('btnMega'); if(b){ b.classList.toggle('abierto',MEGA.abierto); b.setAttribute('aria-expanded',MEGA.abierto); } }
function pintarMega(){
  const {cnt,foto,min,cats}=infoCats(); if(!MEGA.cat||!cnt[MEGA.cat]) MEGA.cat=cats[0];
  let nuevos=P.filter(x=>Date.now()-new Date(x.creado||0)<14*864e5).length; if(nuevos>P.length*.4) nuevos=0;
  document.getElementById('mega').innerHTML=`<div class="wrap mega-in">
    <nav class="mega-cats">${cats.map(c=>`<button class="${MEGA.cat===c?'on':''}" onmouseenter="megaVer('${esc(c)}')" onfocus="megaVer('${esc(c)}')" onclick="toggleMega(false);setFiltro('${esc(c)}')"><span class="ph">${foto[c]?`<img src="${esc(foto[c])}" alt="" loading="lazy">`:''}</span><span class="tx"><b>${esc(c)}</b><small>${cnt[c]} modelos · desde ${fmt(min[c])}</small></span><i class="fa-solid fa-chevron-right"></i></button>`).join('')}
      <button class="todo" onclick="toggleMega(false);setFiltro('Todos')"><span class="ph"><i class="fa-solid fa-table-cells-large"></i></span><span class="tx"><b>Ver todo el catálogo</b><small>${P.length} modelos</small></span><i class="fa-solid fa-arrow-right"></i></button></nav>
    <div class="mega-prev" id="megaPrev"></div>
    <aside class="mega-lado">
      <h5>Atajos</h5>
      <button onclick="toggleMega(false);megaOrden('pop')"><i class="fa-solid fa-fire"></i> Lo más vendido</button>
      <button onclick="toggleMega(false);megaOrden('nuevo')"><i class="fa-solid fa-bolt"></i> Acaban de llegar${nuevos?` <em>${nuevos}</em>`:''}</button>
      <button onclick="toggleMega(false);megaOrden('menor')"><i class="fa-solid fa-tag"></i> Precio más bajo</button>
      <h5>Por material</h5>
      <button onclick="toggleMega(false);megaMaterial('acero')"><span class="dot acero"></span> Acero inoxidable</button>
      <button onclick="toggleMega(false);megaMaterial('laminado')"><span class="dot oro"></span> Oro laminado</button>
      <button onclick="toggleMega(false);megaMaterial('chapa')"><span class="dot chapa"></span> Chapa de oro</button>
      <div class="mega-promo" onclick="toggleMega(false);abrirArmar()"><i class="fa-solid fa-wand-magic-sparkles"></i><b>¿No sabes qué elegir?</b><span>3 preguntas y te armamos tu paquete con tu presupuesto.</span><u>Armar mi paquete →</u></div>
    </aside></div>`;
  megaVer(MEGA.cat);
}
function megaVer(c){ MEGA.cat=c; document.querySelectorAll('#mega .mega-cats button').forEach(b=>b.classList.toggle('on',b.textContent.trim().startsWith(c)&&!b.classList.contains('todo')));
  const l=P.filter(x=>x.cat===c&&x.foto).sort((a,b)=>(disp(b.c)>0)-(disp(a.c)>0)||b.v-a.v).slice(0,6), n=P.filter(x=>x.cat===c).length;
  const box=document.getElementById('megaPrev'); if(!box) return;
  box.innerHTML=`<div class="mp-cab"><h4>${esc(c)}</h4><button class="link" onclick="toggleMega(false);setFiltro('${esc(c)}')">Ver los ${n} <i class="fa-solid fa-arrow-right"></i></button></div>
    <div class="mp-grid">${l.map(x=>`<button onclick="toggleMega(false);irVista('catalogo');abrirFicha('${x.c}')"><span class="ph"><img src="${esc(x.foto)}" alt="" loading="lazy">${/vendido/i.test(x.et)?'<em>Más vendido</em>':''}</span><b>${esc(x.n)}</b><span class="pr">${fmt(x.p)} <small>· véndela en ${fmt(x.p*2)}</small></span></button>`).join('')}</div>`; }
function megaOrden(o){ S.orden=o; S.filtro='Todos'; const s=document.getElementById('orden'); if(s) s.value=o; irVista('catalogo'); }
function megaMaterial(m){ S.material=m; S.filtro='Todos'; document.querySelectorAll('#materiales input').forEach(r=>{ r.checked=r.value===m; }); irVista('catalogo'); }
document.addEventListener('click',e=>{ if(!MEGA.abierto) return; if(e.target.closest('#mega')||e.target.closest('#btnMega')) return; toggleMega(false); });
document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&MEGA.abierto) toggleMega(false); });

/* ============================================================ SIN BRINCOS: scroll horizontal de barras y página quieta con carrito/ventanas abiertas */
function centrarH(el,modo){ const p=el&&el.parentElement; if(!p||p.scrollWidth<=p.clientWidth+1) return; const r=el.getBoundingClientRect(), pr=p.getBoundingClientRect();
  if(modo==='nearest'){ if(r.left>=pr.left&&r.right<=pr.right) return; p.scrollLeft+= r.left<pr.left?(r.left-pr.left-12):(r.right-pr.right+12); return; }
  p.scrollLeft+=(r.left-pr.left)-(pr.width-r.width)/2; }
const BLOQ={n:new Set(),y:0};
const TACTIL=window.matchMedia('(hover:none) and (pointer:coarse)').matches;
function bloquear(quien,on){ const antes=BLOQ.n.size; if(on) BLOQ.n.add(quien); else BLOQ.n.delete(quien); const b=document.body, d=document.documentElement;
  if(!antes&&BLOQ.n.size){ BLOQ.y=window.scrollY; d.classList.add('bloq');
    if(TACTIL){ b.style.position='fixed'; b.style.top=(-BLOQ.y)+'px'; b.style.left='0'; b.style.right='0'; b.style.width='100%'; }
    else { const g=window.innerWidth-d.clientWidth; d.style.overflow='hidden'; if(g>0) b.style.paddingRight=g+'px'; } }
  else if(antes&&!BLOQ.n.size){ d.classList.remove('bloq');
    if(TACTIL){ b.style.position=''; b.style.top=''; b.style.left=''; b.style.right=''; b.style.width=''; window.scrollTo(0,BLOQ.y); }
    else { d.style.overflow=''; b.style.paddingRight=''; } } }
toggleCarritoM=(function(o){ return function(on){ o.apply(this,arguments); bloquear('carrito',!!on); }; })(toggleCarritoM);
abrirModal=(function(o){ return function(){ o.apply(this,arguments); bloquear('modal',true); }; })(abrirModal);
cerrarModal=(function(o){ return function(){ o.apply(this,arguments); bloquear('modal',false); }; })(cerrarModal);
toggleMega=(function(o){ return function(){ o.apply(this,arguments); bloquear('mega',MEGA.abierto); }; })(toggleMega);
/* barra de abajo en el celular */
actualizar=(function(o){ return function(){ const r=o.apply(this,arguments); try{ pintarNavM(); }catch(e){} return r; }; })(actualizar);
function pintarNavM(){ const n=document.getElementById('navM'); if(!n) return; const v=S.vista; n.querySelectorAll('button[data-v]').forEach(b=>b.classList.toggle('on',b.dataset.v===v)); const c=document.getElementById('navMn'); if(c){ const z=pzs(); c.textContent=z; c.style.display=z?'':'none'; const b=c.parentElement, l=b&&b.querySelector('span'), t=document.getElementById('bmTot'); if(l){ l.textContent=z&&t&&t.textContent?t.textContent:'Carrito'; b.classList.toggle('lleno',!!z); } } }

/* ============================================================ CATÁLOGO con pestañas por categoría */
const ICONO_CAT={'Aretes':'fa-solid fa-star','Pulseras':'fa-solid fa-ring','Collares':'fa-solid fa-gem','Anillos':'fa-solid fa-ring','Juegos':'fa-solid fa-gift','Cadenas':'fa-solid fa-link','Dijes':'fa-solid fa-heart'};
function infoCats(){ const cnt={},foto={},min={}; P.forEach(x=>{ cnt[x.cat]=(cnt[x.cat]||0)+1; if(x.foto&&(!foto[x.cat]||/vendido|tendencia/i.test(x.et))) foto[x.cat]=x.foto; min[x.cat]=Math.min(min[x.cat]||9999,x.p); }); return {cnt,foto,min,cats:Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a])}; }
function renderFiltros(){
  const {cnt,foto,min,cats}=infoCats(), todas=['Todos',...cats], enCat=S.vista==='catalogo';
  pintarBarra(cnt,foto,cats);
  const lat=document.getElementById('catsLat'); if(lat) lat.innerHTML=todas.map(c=>`<label><input type="radio" name="catl" ${S.filtro===c?'checked':''} onchange="setFiltro('${esc(c)}')"> ${c==='Todos'?'Todas':esc(c)}<small>${c==='Todos'?P.length:cnt[c]}</small></label>`).join('');
  const tb=document.getElementById('tabsCat'); if(tb){ tb.innerHTML=todas.map(c=>{ const f=c==='Todos'?null:foto[c]; return `<button class="${S.filtro===c?'on':''}" onclick="setFiltro('${esc(c)}')"><span class="ph">${f?`<img src="${esc(f)}" alt="" loading="lazy">`:`<i class="${c==='Todos'?'fa-solid fa-table-cells-large':(ICONO_CAT[c]||'fa-solid fa-gem')}"></i>`}</span><span><b>${c==='Todos'?'Todo':esc(c)}</b><small>${c==='Todos'?P.length+' modelos':cnt[c]+' · desde '+fmt(min[c])}</small></span></button>`; }).join('');
    const on=tb.querySelector('button.on'); if(on&&enCat) centrarH(on,'center'); }
}
function renderGrid(anim){
  const g=document.getElementById('grid'),b=norm(S.busca);
  const x=document.getElementById('buscarX'); if(x) x.style.display=b?'block':'none';
  let l=P.filter(x=>(S.filtro==='Todos'||x.cat===S.filtro)&&matOkSel(x)&&(!b||norm(x.n+' '+x.m+' '+x.cat+' '+x.c+' '+x.et).includes(b)||(b==='dorado'&&norm(x.m).includes('oro'))));
  if(S.orden==='pop') l.sort((a,b)=>(disp(b.c)>0)-(disp(a.c)>0)||b.v-a.v); else if(S.orden==='nuevo') l.sort((a,b)=>(b.creado||'').localeCompare(a.creado||'')); else if(S.orden==='menor') l.sort((a,b)=>a.p-b.p); else l.sort((a,b)=>b.p-a.p);
  document.getElementById('tituloGrid').innerHTML=b?`Resultados para <i>“${esc(S.busca)}”</i>`:S.filtro==='Todos'?(S.orden==='nuevo'?'Lo más <i>nuevo</i>':'Todo el <i>catálogo</i>'):`${esc(S.filtro)}`;
  document.getElementById('cuentaGrid').textContent=l.length+(l.length===1?' modelo':' modelos');
  const agrupar=S.filtro==='Todos'&&!b&&l.length>0;
  g.classList.toggle('agrupado',agrupar); g.classList.toggle('anim',!!anim);
  if(!l.length) g.innerHTML='<div class="vacio">No encontramos ese modelo. Prueba con otra palabra o <a href="https://wa.me/528132660673" target="_blank" rel="noopener" style="color:var(--coral);font-weight:800">pregúntanos por WhatsApp</a>.</div>';
  else if(agrupar){ const {cats,min}=infoCats(); g.innerHTML=cats.map(c=>{ const lc=l.filter(x=>x.cat===c); if(!lc.length) return ''; return `<section class="grupo"><div class="g-cab"><h3>${esc(c)}<small>${lc.length} modelos · desde ${fmt(min[c])}</small></h3><button class="link" onclick="setFiltro('${esc(c)}')">Ver solo ${esc(c.toLowerCase())} <i class="fa-solid fa-chevron-right"></i></button></div><div class="grid">${lc.map(card).join('')}</div></section>`; }).join(''); }
  else g.innerHTML=l.map(card).join('');
  l.forEach(x=>patch(x.c)); if(anim) setTimeout(()=>g.classList.remove('anim'),600);
}

/* ============================================================ INICIO */
function renderInicio(){
  const cnt={}, foto={}, min={}; P.forEach(x=>{ cnt[x.cat]=(cnt[x.cat]||0)+1; if(x.foto&&(!foto[x.cat]||/vendido|tendencia/i.test(x.et))) foto[x.cat]=x.foto; min[x.cat]=Math.min(min[x.cat]||9999,x.p); });
  document.getElementById('catsRow').innerHTML=Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a]).map(c=>`<button onclick="setFiltro('${esc(c)}')"><div class="ph">${foto[c]?`<img src="${esc(foto[c])}" alt="" loading="lazy">`:''}</div><b>${esc(c)}</b><span>${cnt[c]} modelos · desde ${fmt(min[c])}</span></button>`).join('');
  document.getElementById('rowTop').innerHTML=topN(12).map(card).join('');
  document.getElementById('rowNuevo').innerHTML=[...P].filter(x=>x.foto).sort((a,b)=>(b.creado||'').localeCompare(a.creado||'')).slice(0,12).map(card).join('');
  const demo=document.getElementById('catDemo'); if(demo) demo.innerHTML=P.filter(x=>x.foto).slice(0,6).map(x=>`<div><img src="${esc(x.foto)}" alt="" loading="lazy"><b>${esc(x.n)}</b><span>${fmt(x.p*2)}</span></div>`).join('');
  P.forEach(x=>patch(x.c));
}

/* ============================================================ CALCULADORA (inicio y Mi cuenta) */
const CALC={};
function calcMontar(id){
  const host=document.getElementById(id); if(!host||!P.length) return;
  if(!CALC[id]){ const base=topN(1)[0]||P[0]; CALC[id]={filas:[{c:base.c,q:12,pv:Math.round(base.p*2.5),libre:false}],mult:2.5}; }
  calcPintar(id);
}
function calcOpciones(sel){ const g={}; P.forEach(x=>{ (g[x.cat]=g[x.cat]||[]).push(x); }); return Object.keys(g).sort().map(k=>`<optgroup label="${esc(k)}">`+g[k].map(x=>`<option value="${x.c}" ${x.c===sel?'selected':''}>${esc(x.n)} · ${fmt(x.p)}</option>`).join('')+'</optgroup>').join(''); }
function calcPintar(id){
  const st=CALC[id], host=document.getElementById(id); if(!st||!host) return;
  host.innerHTML=st.filas.map((f,i)=>{ const x=prod(f.c)||P[0]; return `<div class="calc-fila"><div class="ph">${x.foto?`<img src="${esc(x.foto)}" alt="">`:''}</div>
    <div class="c-pieza"><label>Pieza</label><select onchange="calcSet('${id}',${i},'c',this.value)">${calcOpciones(f.c)}</select><div class="det">${fmt(x.p)} c/u mayoreo · ${esc(x.m)}</div></div>
    <div><label>Cuántas</label><input type="number" min="1" max="999" value="${f.q}" inputmode="numeric" oninput="calcSet('${id}',${i},'q',this.value)"></div>
    <div><label>La vendes en (c/u)</label><input type="number" min="0" value="${f.pv}" inputmode="numeric" oninput="calcSet('${id}',${i},'pv',this.value)"></div>
    ${st.filas.length>1?`<button class="qq" title="Quitar" onclick="calcQuitar('${id}',${i})">✕</button>`:'<span></span>'}</div>`; }).join('')
  +`<div class="calc-mult">Precio de venta de todas: ${[2,2.5,3].map(m=>`<button class="${st.mult===m?'on':''}" onclick="calcMult('${id}',${m})">×${m}</button>`).join('')} <button onclick="calcAgregarFila('${id}')">+ Agregar otra pieza</button></div>
  <div class="calc-res" id="${id}-res"></div><div class="calc-nota" id="${id}-nota"></div>
  <div class="calc-acc"><button class="btn coral lg" onclick="calcAlCarrito('${id}')"><i class="fa-solid fa-bag-shopping"></i> Agregar a mi carrito</button></div>`;
  calcTotales(id);
}
function calcTotales(id){
  const st=CALC[id]; let inv=0,ven=0,pz=0; st.filas.forEach(f=>{ const x=prod(f.c); if(!x) return; inv+=x.p*f.q; ven+=f.pv*f.q; pz+=f.q; });
  const gan=ven-inv, prom=pz?ven/pz:0, rec=prom?Math.ceil(inv/prom):0;
  const r=document.getElementById(id+'-res'); if(r) r.innerHTML=`<div><b>${fmt(inv)}</b><span>Inviertes</span></div><div><b>${fmt(ven)}</b><span>Vendes</span></div><div class="g"><b>${fmt(gan)}</b><span>Ganas</span></div>`;
  const n=document.getElementById(id+'-nota'); if(n) n.innerHTML=pz<MIN?`Llevas <b>${pz} piezas</b>; el mínimo de compra es <b>${MIN}</b> en total (puedes combinar modelos).`:(gan>0?`Con ${pz} piezas recuperas tu inversión vendiendo <b>${rec}</b>; las otras <b>${pz-rec}</b> son ganancia. Margen <b>${inv?Math.round(gan/inv*100):0}%</b>.`:'Pon un precio de venta mayor al de mayoreo.');
}
function calcSet(id,i,k,v){ const f=CALC[id].filas[i]; if(k==='c'){ f.c=v; f.pv=Math.round(prod(v).p*CALC[id].mult); calcPintar(id); return; } f[k]=Math.max(k==='q'?1:0,parseInt(v)||0); calcTotales(id); }
function calcMult(id,m){ const st=CALC[id]; st.mult=m; st.filas.forEach(f=>{ f.pv=Math.round(prod(f.c).p*m); }); calcPintar(id); }
function calcAgregarFila(id){ const st=CALC[id]; const usados=new Set(st.filas.map(f=>f.c)); const x=topN(30).find(x=>!usados.has(x.c))||P[0]; st.filas.push({c:x.c,q:6,pv:Math.round(x.p*st.mult)}); calcPintar(id); }
function calcQuitar(id,i){ CALC[id].filas.splice(i,1); calcPintar(id); }
function calcAlCarrito(id){ let tot=0,f=0; CALC[id].filas.forEach(r=>{ const ya=S.cart[r.c]||0; if(r.q>ya){ const h=add(r.c,r.q-ya,true); tot+=h; f+=(r.q-ya)-h; } }); bump(); toast(tot?`Agregamos <b>${tot} piezas</b> a tu carrito${f?` (${f} ya no tenían existencia)`:''}.`:'Esas piezas ya estaban en tu carrito.',f?'alerta':'ok'); medir('calculadora_carrito',{piezas:tot}); verCarrito(); }
/* otras partes (iframe antiguo de la calculadora) pueden mandar piezas aquí */
window.mvAgregarItems=function(items){ let tot=0; (items||[]).forEach(i=>{ if(prod(i.codigo)) tot+=add(i.codigo,Number(i.cant)||1,true); }); bump(); if(tot) toast(`Agregamos <b>${tot} piezas</b> a tu carrito.`,'ok'); verCarrito(); };

/* ============================================================ MI CUENTA sin sesión (entrar / crear cuenta en la misma página) */
function renderCuentaEntrar(){
  document.getElementById('app').classList.remove('on');
  const box=document.getElementById('cuentaEntrar'); box.classList.add('on');
  box.innerHTML=`<div class="ce-caja"><h2>Entra a <i>tu cuenta</i></h2><p>Una sola cuenta para comprar y para tu Business Club.</p>
     <button class="btn-google" onclick="entrarGoogle()">${GOOGLE_SVG} Continuar con Google</button>
     <div class="o-linea">o con tu contraseña</div>
     <div class="campo"><label>WhatsApp o correo</label><input id="ceU" autocomplete="username" placeholder="81 0000 0000 · tu@correo.com" onkeydown="if(event.key==='Enter')document.getElementById('ceP').focus()"></div>
     <div class="campo" style="margin-top:10px"><label>Contraseña</label><input id="ceP" type="password" autocomplete="current-password" placeholder="••••••••" onkeydown="if(event.key==='Enter')entrarInline()"><div class="ay">¿La olvidaste? <u onclick="recuperarInline()">Recupérala aquí</u></div></div>
     <div class="acc"><button class="p" id="ceBtn" onclick="entrarInline()">Entrar</button></div></div>
   <div class="ce-caja"><h2>¿Nueva en <i>Marvea</i>?</h2><p>Crea tu cuenta en 30 segundos. Tu domicilio lo pides una sola vez, al pagar.</p>
     <div class="form"><div class="campo full"><label>Nombre completo</label><input id="crN" autocomplete="name"></div>
       <div class="campo"><label>WhatsApp (10 dígitos)</label><input id="crW" inputmode="numeric" maxlength="14" autocomplete="tel-national" placeholder="81 0000 0000"></div>
       <div class="campo"><label>Correo</label><input id="crM" type="email" autocomplete="email" placeholder="tu@correo.com"></div>
       <div class="campo"><label>Contraseña (mínimo 8)</label><input id="crP" type="password" autocomplete="new-password"></div>
       <div class="campo"><label>Repítela</label><input id="crP2" type="password" autocomplete="new-password"></div></div>
     <p class="sub" style="font-size:12px;margin-top:8px">Basta con WhatsApp <b>o</b> correo. Con los dos recibes tu ticket por correo y avisos por WhatsApp.</p>
     <div class="ay" id="crMsg" style="min-height:18px;margin-top:6px;color:var(--rojo);font-weight:700;font-size:13px"></div>
     <div class="acc"><button class="c" id="crBtn" onclick="registrarInline()">Crear mi cuenta</button></div>
     <ul class="ce-lista"><li><i class="fa-solid fa-box-open"></i>Tus pedidos y tu guía DHL en un solo lugar</li><li><i class="fa-solid fa-tags"></i>Tus precios de menudeo y mayoreo</li><li><i class="fa-solid fa-file-pdf"></i>Tu catálogo en PDF con nuestras fotos y tu logo</li></ul></div>`;
}
async function entrarInline(){
  const u=document.getElementById('ceU').value, p=document.getElementById('ceP').value; if(!p) return toast('Escribe tu contraseña.','alerta');
  const b=document.getElementById('ceBtn'); b.disabled=true; b.textContent='Entrando…';
  const login=await loginDe(u); if(!login){ b.disabled=false; b.textContent='Entrar'; return toast('Escribe tu WhatsApp a 10 dígitos o tu correo.','alerta'); }
  const { data, error } = await sbc.auth.signInWithPassword({ email:login, password:p });
  b.disabled=false; b.textContent='Entrar';
  if(error||!data.user) return toast(/invalid/i.test(error&&error.message||'')?'Usuario o contraseña incorrectos.':'No se pudo entrar: '+(error&&error.message||''),'alerta');
  const c=await cargarClienta(data.user); if(c){ medir('login',{via:'password'}); alEntrar(c); } else abrirCompletarGoogle(data.user);
}
async function recuperarInline(){ const u=(document.getElementById('ceU').value||'').trim(); if(!u) return toast('Escribe tu WhatsApp o tu correo y vuelve a tocar Recupérala.','alerta');
  let j={}; try{ j=await cuentaApi({accion:'recuperar',usuario:u}); }catch(e){ j={error:e.message}; }
  if(j.ok) return toast(j.mensaje||'Si esa cuenta existe, te enviamos un correo para crear tu contraseña nueva.','ok');
  window.open('https://wa.me/528132380573?text='+encodeURIComponent('Hola Marvea, olvidé la contraseña de mi cuenta ('+u+'). ¿Me ayudan a restablecerla?'),'_blank'); toast(j.mensaje||j.error||'Atención al cliente te ayuda por WhatsApp.','ok'); }
async function registrarInline(){
  const g=id=>(document.getElementById(id).value||'').trim(), msg=document.getElementById('crMsg');
  const d={nombre:g('crN'),wa:dig10(g('crW')),correo:g('crM').toLowerCase(),password:document.getElementById('crP').value};
  if(d.nombre.length<2) return msg.textContent='Escribe tu nombre.'; if(g('crW')&&d.wa.length!==10) return msg.textContent='Tu WhatsApp debe tener 10 dígitos.';
  if(d.correo&&!esCorreo(d.correo)) return msg.textContent='Revisa tu correo.'; if(!d.wa&&!d.correo) return msg.textContent='Deja tu WhatsApp o tu correo.';
  if(d.password.length<8) return msg.textContent='La contraseña debe tener al menos 8 caracteres.'; if(d.password!==document.getElementById('crP2').value) return msg.textContent='Las contraseñas no coinciden.';
  const b=document.getElementById('crBtn'); b.disabled=true; b.textContent='Creando…'; msg.textContent='';
  const r=await crearCuenta(d); b.disabled=false; b.textContent='Crear mi cuenta';
  if(!r.ok) return msg.textContent=r.error; Object.assign(S.form,{nombre:d.nombre,wa:d.wa,mail:d.correo}); medir('registro',{via:d.wa?'whatsapp':'correo'});
  if(r.cliente){ alEntrar(r.cliente); toast('¡Bienvenida a Marvea! Tu cuenta quedó lista.','ok'); }
}

/* ============================================================ ARRANQUE */
(async()=>{
  const ok=await cargarCatalogo();
  if(!ok){ document.getElementById('grid').innerHTML='<div class="vacio">No se pudo cargar el catálogo. Revisa tu conexión y recarga la página.</div>'; document.getElementById('rowTop').innerHTML='<div class="vacio">No se pudo cargar el catálogo.</div>'; document.getElementById('nModelos').textContent='0'; return; }
  P.forEach(x=>{S.stock[x.c]={ex:x.ex};});
  document.getElementById('nModelos').textContent=P.length;
  renderInicio(); calcMontar('calcHome'); actualizar();
  leerHash();
  // carrito guardado + disponibilidad real del inventario
  let local=null; try{ local=JSON.parse(localStorage.getItem('marvea.carrito')||'null'); }catch(_){}
  const esRegreso=!!new URLSearchParams(location.search).get('pago');
  try{ const d=await stockApi('estado'); aplicarDisp(d.disponibilidad); if(!esRegreso) sincronizarCarrito(d.carrito,d.expira); }
  catch(_){ if(local&&local.fin>Date.now()&&!esRegreso){ Object.entries(local.cart||{}).forEach(([c,q])=>{ if(prod(c)) S.cart[c]=q; }); S.timerFin=local.fin; Object.keys(S.cart).forEach(patch); actualizar(); } }
  renderInicio();
  // sesión (contraseña o Google)
  try{ const ses=await sesionActual(); if(ses&&ses.user){ const c=await cargarClienta(ses.user); if(c) alEntrar(c); else { const u=ses.user; const esGoogle=((u.app_metadata||{}).provider==='google')||((u.app_metadata||{}).providers||[]).includes('google'); if(esGoogle) abrirCompletarGoogle(u); } } }catch(_){}
  if(/[?&](google|nueva)=1/.test(location.search)||/access_token/.test(location.hash)){ const nueva=/[?&]nueva=1/.test(location.search)||/type=recovery/.test(location.hash); history.replaceState(null,'',location.pathname+(nueva?'#/cuenta/perfil':'#/cuenta')); if(nueva) S._recuperar=true; irVista('cuenta',nueva?'perfil':'inicio',true); try{ const v=JSON.parse(sessionStorage.getItem('marvea.google.volver')||'null'); sessionStorage.removeItem('marvea.google.volver'); if(v&&v.para==='pagar'&&S.cliente&&pzs()>=MIN) setTimeout(abrirCheckout,500); }catch(_){} }
  // piezas mandadas desde otras páginas ("Agregar a mi carrito")
  try{ const ag=JSON.parse(localStorage.getItem('marvea.agregar')||'null'); localStorage.removeItem('marvea.agregar');
    if(ag&&Array.isArray(ag.items)&&ag.items.length&&(Date.now()-(ag.t||0))<30*60000){ let tot=0; ag.items.forEach(i=>{ if(prod(i.codigo)) tot+=add(i.codigo,Number(i.cant)||1,true); }); if(tot){ toast(`Agregamos <b>${tot} pieza${tot===1?'':'s'}</b> a tu carrito.`,'ok'); verCarrito(); } }
    if(/[?&]agregar=1/.test(location.search)) history.replaceState(null,'',location.pathname+location.hash); }catch(_){}
  regresoStripe();
  // rastreo DHL: limpiar la guía
  const rf=document.getElementById('rastreoForm'); if(rf) rf.addEventListener('submit',()=>{ const g=document.getElementById('guia'); g.value=(g.value||'').replace(/[^0-9A-Za-z]/g,''); medir('rastreo_dhl'); });
})();
