/* Marvea · catálogo mayorista y calculadora de ganancias (web)
   Lee catalogo.json (publicado por el sistema Marvea) y arma el pedido de la clienta.
   Modo "catalogo" o "calculadora" según data-mode en <body>. */
(function () {
  "use strict";
  const MODE = document.body.dataset.mode || "catalogo";
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const money = n => "$" + Math.round(n).toLocaleString("es-MX");
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- datos ---------- */
  let DATA = null;          // catalogo.json
  let PROD = [];            // productos visibles
  const CATS = {};          // prefijo -> nombre
  const byCode = {};
  const DEF = { minimo_piezas: 12, envios: [{ hasta_kg: 2, precio: 240 }, { hasta_kg: 5, precio: 305 }], whatsapp: { pedidos: "5218132380573", informes: "5218132660673" }, multiplicador: 2 };

  /* ---------- pedido (compartido entre catálogo y calculadora) ---------- */
  const KEY = "marvea-pedido-v1";
  let pedido = {};          // codigo -> { q, venta }
  let mult = DEF.multiplicador;
  function cargar() { try { const j = JSON.parse(localStorage.getItem(KEY) || "{}"); pedido = j.items || {}; if (j.mult) mult = j.mult; } catch (e) { pedido = {}; } }
  function guardar() { try { localStorage.setItem(KEY, JSON.stringify({ items: pedido, mult })); } catch (e) {} }
  function piezas() { return Object.values(pedido).reduce((a, b) => a + b.q, 0); }
  function inversion() { return Object.entries(pedido).reduce((a, [c, it]) => a + (byCode[c] ? byCode[c].precio * it.q : 0), 0); }
  function ventaDe(c) { const it = pedido[c]; const p = byCode[c]; if (!p) return 0; return it && it.venta ? it.venta : Math.round(p.precio * mult); }
  function ventas() { return Object.entries(pedido).reduce((a, [c, it]) => a + ventaDe(c) * it.q, 0); }
  function setQ(c, q) { q = Math.max(0, Math.min(999, Math.round(q) || 0)); if (!q) delete pedido[c]; else pedido[c] = Object.assign(pedido[c] || {}, { q }); guardar(); pintarPedido(); pintarCards(c); }
  function envio(n) { // estimado por número de piezas: ~45 piezas por kg aprox. (joyería ligera)
    const kg = Math.max(0.5, n / 45); const e = (DATA && DATA.envios || DEF.envios).slice().sort((a, b) => a.hasta_kg - b.hasta_kg);
    const t = e.find(x => kg <= x.hasta_kg); return t ? t.precio : null;
  }

  /* ---------- carga del catálogo ---------- */
  async function cargarCatalogo() {
    const v = Math.floor(Date.now() / 300000); // rompe caché cada 5 min
    const r = await fetch("catalogo.json?v=" + v, { cache: "no-cache" });
    if (!r.ok) throw new Error("http " + r.status);
    DATA = await r.json();
    (DATA.categorias || []).forEach(c => { CATS[c.p] = c.n; });
    PROD = (DATA.productos || []).filter(p => p.disponible !== false);
    PROD.forEach(p => { byCode[p.codigo] = p; });
  }

  /* ---------- UI común ---------- */
  function toast(msg) { let t = $("#toast"); if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; document.body.append(t); } t.textContent = msg; t.classList.add("ver"); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("ver"), 1800); }
  function badge(p) {
    const e = (p.etiqueta || "").toLowerCase(); if (!e || e === "ninguna") return "";
    const cls = e.includes("tendencia") ? "tendencia" : e.includes("vendido") ? "vendido" : e.includes("dupe") ? "dupe" : e.includes("ltimas") ? "ultimas" : e.includes("new") ? "new" : "";
    return `<span class="badge ${cls}">${esc(p.etiqueta)}</span>`;
  }
  function catNombre(p) { return CATS[p.categoria] || p.categoria || ""; }
  function fotoUrl(p) { return p.foto || ""; }

  function stepperHTML(c, q) {
    return `<span class="stepper" data-cod="${esc(c)}"><button type="button" data-d="-1" aria-label="menos">−</button><input type="number" min="0" value="${q}" aria-label="cantidad"><button type="button" data-d="1" aria-label="más">+</button></span>`;
  }
  function wireStepper(el) {
    const c = el.dataset.cod, inp = $("input", el);
    $$("button", el).forEach(b => b.addEventListener("click", () => setQ(c, (pedido[c] ? pedido[c].q : 0) + Number(b.dataset.d))));
    inp.addEventListener("change", () => setQ(c, Number(inp.value)));
  }

  /* ---------- catálogo ---------- */
  let filtroCat = "", busq = "", orden = "cat";
  function productosFiltrados() {
    const q = busq.trim().toLowerCase();
    let l = PROD.filter(p => (!filtroCat || p.categoria === filtroCat) && (!q || (p.nombre + " " + p.codigo + " " + (p.material || "") + " " + catNombre(p) + " " + (p.etiqueta || "")).toLowerCase().includes(q)));
    if (orden === "precio-asc") l.sort((a, b) => a.precio - b.precio);
    else if (orden === "precio-desc") l.sort((a, b) => b.precio - a.precio);
    else if (orden === "nuevo") l.sort((a, b) => (b.creado || "").localeCompare(a.creado || ""));
    else l.sort((a, b) => (CATS[a.categoria] || "").localeCompare(CATS[b.categoria] || "") || a.nombre.localeCompare(b.nombre));
    return l;
  }
  function cardHTML(p) {
    const q = pedido[p.codigo] ? pedido[p.codigo].q : 0;
    return `<article class="card ${q ? "en-pedido" : ""}" data-cod="${esc(p.codigo)}">
      <div class="foto" data-abrir="${esc(p.codigo)}">${badge(p)}<img loading="lazy" src="${esc(fotoUrl(p))}" alt="${esc(p.nombre)}"></div>
      <div class="info">
        <div class="nombre">${esc(p.nombre)}</div>
        <div class="detalle">${esc(p.codigo)}${p.material ? " · " + esc(p.material) : ""}</div>
        <div class="precio"><b>${money(p.precio)}</b><span>mayoreo</span></div>
        <div class="gana">Véndela en ${money(p.precio * mult)} → ganas ${money(p.precio * mult - p.precio)}</div>
        <div class="acciones">${stepperHTML(p.codigo, q)}<button type="button" class="btn sm add" data-add="${esc(p.codigo)}">${q ? "✓ Listo" : "Agregar"}</button></div>
      </div></article>`;
  }
  function pintarCatalogo() {
    const cont = $("#grid"); if (!cont) return;
    const l = productosFiltrados();
    $("#conteo").textContent = l.length + (l.length === 1 ? " pieza" : " piezas");
    if (!l.length) { cont.innerHTML = `<div class="estado" style="grid-column:1/-1"><b>No encontramos piezas con esa búsqueda</b>Prueba con otra palabra o cambia de categoría.</div>`; return; }
    let html = "", lastCat = null;
    if (orden === "cat" && !filtroCat) {
      l.forEach(p => { if (p.categoria !== lastCat) { lastCat = p.categoria; html += `<h2 class="seccion-cat" style="grid-column:1/-1">${esc(catNombre(p))}</h2>`; } html += cardHTML(p); });
    } else html = l.map(cardHTML).join("");
    cont.innerHTML = html;
    $$(".stepper", cont).forEach(wireStepper);
    $$("[data-add]", cont).forEach(b => b.addEventListener("click", () => { const c = b.dataset.add; if (!pedido[c]) { setQ(c, 1); toast("Agregada a tu pedido"); } else abrirPanel(); }));
    $$("[data-abrir]", cont).forEach(f => f.addEventListener("click", () => abrirModal(f.dataset.abrir)));
  }
  function pintarCards(c) {
    $$(`.card[data-cod="${CSS.escape(c)}"]`).forEach(card => {
      const q = pedido[c] ? pedido[c].q : 0; card.classList.toggle("en-pedido", !!q);
      const inp = $(".stepper input", card); if (inp && Number(inp.value) !== q) inp.value = q;
      const b = $("[data-add]", card); if (b) b.textContent = q ? "✓ Listo" : "Agregar";
    });
    $$(".calc-item[data-cod]").forEach(() => {});
    if (MODE === "calculadora") pintarCalcLista();
  }
  function pintarChips() {
    const el = $("#chips"); if (!el) return;
    const counts = {}; PROD.forEach(p => { counts[p.categoria] = (counts[p.categoria] || 0) + 1; });
    const cats = (DATA.categorias || []).filter(c => counts[c.p]);
    el.innerHTML = `<button class="chip ${!filtroCat ? "activo" : ""}" data-cat="">Todo<small>${PROD.length}</small></button>` + cats.map(c => `<button class="chip ${filtroCat === c.p ? "activo" : ""}" data-cat="${c.p}">${esc(c.n)}<small>${counts[c.p]}</small></button>`).join("");
    $$(".chip", el).forEach(b => b.addEventListener("click", () => { filtroCat = b.dataset.cat; pintarChips(); pintarCatalogo(); window.scrollTo({ top: 0, behavior: "smooth" }); }));
  }

  /* ---------- modal ---------- */
  function abrirModal(c) {
    const p = byCode[c]; if (!p) return;
    let m = $("#modal"); if (!m) { m = document.createElement("div"); m.id = "modal"; m.className = "modal"; document.body.append(m); m.addEventListener("click", e => { if (e.target === m) m.classList.remove("abierto"); }); }
    const q = pedido[c] ? pedido[c].q : 0;
    m.innerHTML = `<div class="caja-m"><button class="cerrar" aria-label="cerrar">×</button>
      <div class="foto-m"><img src="${esc(fotoUrl(p))}" alt="${esc(p.nombre)}"></div>
      <div class="info-m">
        <div class="tag-m"><span>${esc(catNombre(p))}</span>${p.material ? `<span>${esc(p.material)}</span>` : ""}<span>${esc(p.codigo)}</span></div>
        <h2>${esc(p.nombre)}</h2>
        ${badge(p).replace('class="badge', 'style="position:static;display:inline-block" class="badge')}
        <div class="precio-m">${money(p.precio)}<small>precio mayoreo</small></div>
        ${p.notas ? `<div class="notas">${esc(p.notas)}</div>` : ""}
        <div class="gana-m">Sugerencia: véndela en <b>${money(p.precio * mult)}</b> y ganas <b>${money(p.precio * mult - p.precio)}</b> por pieza.</div>
        <div class="acciones" style="display:flex;gap:8px;align-items:center;margin-top:6px">${stepperHTML(c, q)}<button type="button" class="btn coral" data-add="${esc(c)}">${q ? "Ver mi pedido" : "Agregar a mi pedido"}</button></div>
      </div></div>`;
    $(".cerrar", m).addEventListener("click", () => m.classList.remove("abierto"));
    wireStepper($(".stepper", m));
    $("[data-add]", m).addEventListener("click", () => { if (!pedido[c]) { setQ(c, 1); } m.classList.remove("abierto"); abrirPanel(); });
    m.classList.add("abierto");
  }

  /* ---------- panel del pedido ---------- */
  function abrirPanel() { $("#velo").classList.add("abierto"); $("#panel").classList.add("abierto"); document.body.classList.add("panel-abierto"); pintarPedido(); }
  function cerrarPanel() { $("#velo").classList.remove("abierto"); $("#panel").classList.remove("abierto"); document.body.classList.remove("panel-abierto"); }
  function ganHTML(compact) {
    const n = piezas(), inv = inversion(), ven = ventas(), g = ven - inv;
    return `<h3>¿Cuánto puedes ganar? <span class="script">con este pedido</span></h3>
      <p>${n ? `Si vendes tus ${n} piezas al precio sugerido:` : "Agrega piezas para ver tu ganancia estimada."}</p>
      <div class="cajas"><div class="caja"><b>${money(inv)}</b><span>Inviertes</span></div><div class="caja"><b>${money(ven)}</b><span>Vendes</span></div><div class="caja dest"><b>${money(g)}</b><span>Ganas</span></div></div>
      <div class="mult"><span>Precio de venta:</span><input type="range" id="mult" min="1.3" max="3" step="0.1" value="${mult}"><b>×${mult.toFixed(1)}</b></div>
      ${compact ? "" : `<p style="margin-top:8px;opacity:.75">Muchas de nuestras piezas se venden al doble o más. Mueve la barra para probar tu margen.</p>`}`;
  }
  function wireMult(root) { const r = $("#mult", root); if (!r) return; r.addEventListener("input", () => { mult = Number(r.value); $("b", r.parentElement).textContent = "×" + mult.toFixed(1); guardar(); pintarTotales(); pintarCatalogoGana(); if (MODE === "calculadora") pintarCalcLista(); }); }
  function pintarCatalogoGana() { $$(".card").forEach(card => { const p = byCode[card.dataset.cod]; const g = $(".gana", card); if (p && g) g.textContent = `Véndela en ${money(p.precio * mult)} → ganas ${money(p.precio * mult - p.precio)}`; }); }
  function pintarTotales() {
    const n = piezas(), inv = inversion(), ven = ventas(), g = ven - inv, min = (DATA && DATA.minimo_piezas) || DEF.minimo_piezas;
    $$(".js-piezas").forEach(e => e.textContent = n);
    $$(".js-inv").forEach(e => e.textContent = money(inv));
    $$(".js-ven").forEach(e => e.textContent = money(ven));
    $$(".js-gan").forEach(e => e.textContent = money(g));
    const f = $("#flot"); if (f) { f.classList.toggle("vacio", !n); $(".n", f).textContent = n + (n === 1 ? " pieza" : " piezas"); $(".t", f).textContent = money(inv) + " · ganas " + money(g); }
    const mi = $("#minimo"); if (mi) { const falta = Math.max(0, min - n); mi.classList.toggle("ok", !falta); mi.innerHTML = falta ? `Compra mínima: ${min} piezas surtidas · te faltan <b>${falta}</b><div class="prog"><i style="width:${Math.min(100, n / min * 100)}%"></i></div>` : `✓ Ya cubres el mínimo de ${min} piezas · puedes enviar tu pedido`; }
    const env = $("#envio"); if (env) { const e = envio(n); env.textContent = n ? (e ? "aprox. " + money(e) + " (DHL 3–5 días)" : "a cotizar") : "—"; }
    const bw = $("#btnWA"); if (bw) bw.disabled = n < min;
    const gan = $("#ganPanel"); if (gan) { gan.innerHTML = ganHTML(true); wireMult(gan); }
    const gh = $("#ganHero"); if (gh) { gh.innerHTML = ganHTML(false); wireMult(gh); }
  }
  function pintarPedido() {
    const cont = $("#items"); if (cont) {
      const l = Object.entries(pedido).map(([c, it]) => ({ p: byCode[c], it, c })).filter(x => x.p);
      cont.innerHTML = l.length ? l.map(({ p, it, c }) => `<div class="linea-item" data-cod="${esc(c)}"><img src="${esc(fotoUrl(p))}" alt=""><div><div class="ln">${esc(p.nombre)}</div><div class="lp">${esc(p.codigo)} · ${money(p.precio)} c/u</div>${stepperHTML(c, it.q)}</div><div class="lr"><span class="sub">${money(p.precio * it.q)}</span><button class="quitar" data-q="${esc(c)}">quitar</button></div></div>`).join("")
        : `<div class="vacio-msg"><b>Tu pedido está vacío</b>Agrega piezas desde el catálogo. Mínimo ${(DATA && DATA.minimo_piezas) || DEF.minimo_piezas} piezas surtidas a tu gusto.</div>`;
      $$(".stepper", cont).forEach(wireStepper);
      $$("[data-q]", cont).forEach(b => b.addEventListener("click", () => setQ(b.dataset.q, 0)));
    }
    pintarTotales();
  }
  function mensajeWA() {
    const l = Object.entries(pedido).map(([c, it]) => ({ p: byCode[c], it })).filter(x => x.p);
    const lines = l.map(({ p, it }) => `• ${it.q} × ${p.codigo} ${p.nombre} — ${money(p.precio * it.q)}`);
    return `¡Hola Marvea! Quiero hacer este pedido desde la página web:\n\n${lines.join("\n")}\n\nTotal: ${piezas()} piezas · ${money(inversion())} MXN\n\n¿Me confirmas disponibilidad y el costo de envío?`;
  }
  function enviarWA() {
    const num = (DATA && DATA.whatsapp && DATA.whatsapp.pedidos) || DEF.whatsapp.pedidos;
    window.open("https://wa.me/" + num + "?text=" + encodeURIComponent(mensajeWA()), "_blank");
  }
  async function copiarPedido() { try { await navigator.clipboard.writeText(mensajeWA()); toast("Pedido copiado"); } catch (e) { toast("No se pudo copiar"); } }

  /* ---------- calculadora ---------- */
  function pintarCalcLista() {
    const cont = $("#calcItems"); if (!cont) return;
    const l = Object.entries(pedido).map(([c, it]) => ({ p: byCode[c], it, c })).filter(x => x.p);
    if (!l.length) { cont.innerHTML = `<div class="vacio-msg"><b>Aún no eliges piezas</b>Busca abajo en el catálogo y agrega las que te gusten. Puedes cambiar el precio de venta de cada una.</div>`; return; }
    cont.innerHTML = l.map(({ p, it, c }) => { const v = ventaDe(c); return `<div class="calc-item" data-cod="${esc(c)}"><img src="${esc(fotoUrl(p))}" alt=""><div><div class="cn">${esc(p.nombre)} <span style="font-weight:500;color:var(--tinta-2)">· ${money(p.precio)} mayoreo</span></div><div class="cr">${stepperHTML(c, it.q)}<span class="venta">vende en $<input type="number" min="0" value="${v}" data-venta="${esc(c)}"></span><span class="cg">ganas ${money((v - p.precio) * it.q)}</span><button class="quitar" data-q="${esc(c)}">quitar</button></div></div></div>`; }).join("");
    $$(".stepper", cont).forEach(wireStepper);
    $$("[data-q]", cont).forEach(b => b.addEventListener("click", () => setQ(b.dataset.q, 0)));
    $$("[data-venta]", cont).forEach(i => i.addEventListener("change", () => { const c = i.dataset.venta; if (pedido[c]) { pedido[c].venta = Math.max(0, Number(i.value) || 0); guardar(); pintarTotales(); pintarCalcLista(); } }));
  }

  /* ---------- arranque ---------- */
  async function init() {
    cargar();
    try { await cargarCatalogo(); }
    catch (e) {
      const g = $("#grid") || $("#calcItems"); if (g) g.innerHTML = `<div class="estado" style="grid-column:1/-1"><b>El catálogo se está preparando</b>Vuelve en unos minutos o escríbenos por WhatsApp y te lo mandamos.</div>`;
      $("#flot") && $("#flot").classList.add("vacio"); return;
    }
    if (DATA.multiplicador && !localStorage.getItem(KEY)) mult = DATA.multiplicador;
    const f = $("#fecha"); if (f && DATA.actualizado) f.textContent = new Date(DATA.actualizado).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
    $("#buscar") && $("#buscar").addEventListener("input", e => { busq = e.target.value; pintarCatalogo(); });
    $("#orden") && $("#orden").addEventListener("change", e => { orden = e.target.value; pintarCatalogo(); });
    $("#abrirPanel") && $("#abrirPanel").addEventListener("click", abrirPanel);
    $("#cerrarPanel") && $("#cerrarPanel").addEventListener("click", cerrarPanel);
    $("#velo") && $("#velo").addEventListener("click", cerrarPanel);
    $("#btnWA") && $("#btnWA").addEventListener("click", enviarWA);
    $("#btnCopiar") && $("#btnCopiar").addEventListener("click", copiarPedido);
    $("#btnVaciar") && $("#btnVaciar").addEventListener("click", () => { if (confirm("¿Vaciar tu pedido?")) { pedido = {}; guardar(); pintarPedido(); pintarCatalogo(); pintarCalcLista(); } });
    document.addEventListener("keydown", e => { if (e.key === "Escape") { cerrarPanel(); const m = $("#modal"); m && m.classList.remove("abierto"); } });
    pintarChips(); pintarCatalogo(); pintarPedido(); pintarCalcLista();
    window.addEventListener("storage", e => { if (e.key === KEY) { cargar(); pintarPedido(); pintarCatalogo(); pintarCalcLista(); } });
  }
  init();
})();
