/* Marvea · catálogo web (solo visualización) y calculadora de ganancias (manual)
   Lee catalogo.json publicado por el sistema Marvea. Modo según data-mode en <body>. */
(function () {
  "use strict";
  const MODE = document.body.dataset.mode || "catalogo";
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const money = n => "$" + Math.round(n).toLocaleString("es-MX");
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  let DATA = null, PROD = [];
  const CATS = {}, byCode = {};
  const DEF = { multiplicador: 2, whatsapp: { pedidos: "5218132380573", informes: "5218132660673" } };
  const mult = () => (DATA && DATA.multiplicador) || DEF.multiplicador;
  const waNum = () => (DATA && DATA.whatsapp && DATA.whatsapp.informes) || DEF.whatsapp.informes;

  async function cargarCatalogo() {
    const v = Math.floor(Date.now() / 300000);
    const r = await fetch("catalogo.json?v=" + v, { cache: "no-cache" });
    if (!r.ok) throw new Error("http " + r.status);
    DATA = await r.json();
    (DATA.categorias || []).forEach(c => { CATS[c.p] = c.n; });
    PROD = (DATA.productos || []).filter(p => p.disponible !== false);
    PROD.forEach(p => { byCode[p.codigo] = p; });
  }
  function badge(p) {
    const e = (p.etiqueta || "").toLowerCase(); if (!e || e === "ninguna") return "";
    const cls = e.includes("tendencia") ? "tendencia" : e.includes("vendido") ? "vendido" : e.includes("dupe") ? "dupe" : e.includes("ltimas") ? "ultimas" : e.includes("new") ? "new" : "";
    return `<span class="badge ${cls}">${esc(p.etiqueta)}</span>`;
  }
  const catNombre = p => CATS[p.categoria] || p.categoria || "";
  const fotoUrl = p => p.foto || "";

  /* ---------- catálogo (solo ver) ---------- */
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
    return `<article class="card" data-cod="${esc(p.codigo)}">
      <div class="foto" data-abrir="${esc(p.codigo)}">${badge(p)}<img loading="lazy" src="${esc(fotoUrl(p))}" alt="${esc(p.nombre)}"></div>
      <div class="info">
        <div class="nombre">${esc(p.nombre)}</div>
        <div class="detalle">${esc(p.codigo)}${p.material ? " · " + esc(p.material) : ""}</div>
        <div class="precio"><b>${money(p.precio)}</b><span>mayoreo</span></div>
        <div class="disp"><i></i>Disponible · en exhibición</div>
      </div></article>`;
  }
  function pintarCatalogo() {
    const cont = $("#grid"); if (!cont) return;
    const l = productosFiltrados();
    $("#conteo") && ($("#conteo").textContent = l.length + (l.length === 1 ? " modelo disponible" : " modelos disponibles"));
    if (!l.length) { cont.innerHTML = `<div class="estado" style="grid-column:1/-1"><b>No encontramos piezas con esa búsqueda</b>Prueba con otra palabra o cambia de categoría.</div>`; return; }
    let html = "", lastCat = null;
    if (orden === "cat" && !filtroCat) l.forEach(p => { if (p.categoria !== lastCat) { lastCat = p.categoria; html += `<h2 class="seccion-cat" style="grid-column:1/-1">${esc(catNombre(p))}</h2>`; } html += cardHTML(p); });
    else html = l.map(cardHTML).join("");
    cont.innerHTML = html;
    $$("[data-abrir]", cont).forEach(f => f.addEventListener("click", () => abrirModal(f.dataset.abrir)));
  }
  function pintarChips() {
    const el = $("#chips"); if (!el) return;
    const counts = {}; PROD.forEach(p => { counts[p.categoria] = (counts[p.categoria] || 0) + 1; });
    const cats = (DATA.categorias || []).filter(c => counts[c.p]);
    el.innerHTML = `<button class="chip ${!filtroCat ? "activo" : ""}" data-cat="">Todo<small>${PROD.length}</small></button>` + cats.map(c => `<button class="chip ${filtroCat === c.p ? "activo" : ""}" data-cat="${c.p}">${esc(c.n)}<small>${counts[c.p]}</small></button>`).join("");
    $$(".chip", el).forEach(b => b.addEventListener("click", () => { filtroCat = b.dataset.cat; pintarChips(); pintarCatalogo(); window.scrollTo({ top: 0, behavior: "smooth" }); }));
  }
  function abrirModal(c) {
    const p = byCode[c]; if (!p) return;
    let m = $("#modal"); if (!m) { m = document.createElement("div"); m.id = "modal"; m.className = "modal"; document.body.append(m); m.addEventListener("click", e => { if (e.target === m) m.classList.remove("abierto"); }); }
    const msg = encodeURIComponent(`¡Hola Marvea! Vi en la página la pieza ${p.codigo} · ${p.nombre} (${money(p.precio)} mayoreo) y quiero más información.`);
    m.innerHTML = `<div class="caja-m"><button class="cerrar" aria-label="cerrar">×</button>
      <div class="foto-m"><img src="${esc(fotoUrl(p))}" alt="${esc(p.nombre)}"></div>
      <div class="info-m">
        <div class="tag-m"><span>${esc(catNombre(p))}</span>${p.material ? `<span>${esc(p.material)}</span>` : ""}<span>${esc(p.codigo)}</span></div>
        <h2>${esc(p.nombre)}</h2>
        ${badge(p).replace('class="badge', 'style="position:static;display:inline-block" class="badge')}
        <div class="precio-m">${money(p.precio)}<small>precio mayoreo</small></div>
        <div class="disp"><i></i>Disponible · en exhibición</div>
        ${p.notas ? `<div class="notas">${esc(p.notas)}</div>` : ""}
        <div class="gana-m">Si la vendes en <b>${money(p.precio * mult())}</b> ganas <b>${money(p.precio * mult() - p.precio)}</b> por pieza.</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px"><a class="btn coral" target="_blank" rel="noopener" href="https://wa.me/${waNum()}?text=${msg}">Preguntar por WhatsApp</a><a class="btn ghost" href="${window.self !== window.top ? "https://www.marveamayoreo.com/calculadora" : "calculadora.html?pieza=" + encodeURIComponent(p.codigo)}" target="_top">Calcular mi ganancia</a></div>
      </div></div>`;
    $(".cerrar", m).addEventListener("click", () => m.classList.remove("abierto"));
    m.classList.add("abierto");
  }

  /* ---------- calculadora manual ---------- */
  let filas = []; // {codigo|"", nombre, costo, cant, venta}
  function opcionesSelect(sel) {
    const grupos = {}; PROD.forEach(p => { (grupos[p.categoria] = grupos[p.categoria] || []).push(p); });
    let h = `<option value="">— Elige una pieza —</option><option value="__libre">Otra pieza (escribo el costo)</option>`;
    Object.keys(grupos).sort((a, b) => (CATS[a] || a).localeCompare(CATS[b] || b)).forEach(k => {
      h += `<optgroup label="${esc(CATS[k] || k)}">` + grupos[k].sort((a, b) => a.nombre.localeCompare(b.nombre)).map(p => `<option value="${esc(p.codigo)}" ${sel === p.codigo ? "selected" : ""}>${esc(p.nombre)} · ${money(p.precio)}</option>`).join("") + `</optgroup>`;
    });
    if (sel === "__libre") h = h.replace('value="__libre"', 'value="__libre" selected');
    return h;
  }
  function filaHTML(f, i) {
    const p = byCode[f.codigo];
    const g = (f.venta - f.costo) * f.cant;
    return `<div class="fila" data-i="${i}">
      <div class="fila-pieza">
        ${p ? `<img src="${esc(fotoUrl(p))}" alt="">` : `<span class="fila-ph">M</span>`}
        <div style="flex:1;min-width:0">
          <select class="sel" data-f="codigo" aria-label="pieza">${opcionesSelect(f.codigo)}</select>
          ${p ? `<div class="fila-det">${esc(p.codigo)}${p.material ? " · " + esc(p.material) : ""}</div>` : ""}
        </div>
        <button class="quitar" data-quitar="${i}" aria-label="quitar">quitar</button>
      </div>
      <div class="fila-campos">
        <label>Costo mayoreo<span class="inp">$<input type="number" min="0" step="1" data-f="costo" value="${f.costo || ""}" ${p ? "readonly" : ""} placeholder="0"></span></label>
        <label>Cantidad<span class="inp"><input type="number" min="1" step="1" data-f="cant" value="${f.cant}"></span></label>
        <label>Tu precio de venta<span class="inp">$<input type="number" min="0" step="1" data-f="venta" value="${f.venta || ""}" placeholder="${p ? Math.round(p.precio * mult()) : "0"}"></span></label>
        <div class="fila-gan"><span>Ganas</span><b class="${g < 0 ? "neg" : ""}">${money(g)}</b><small>${f.cant} × (${money(f.venta)} − ${money(f.costo)})</small></div>
      </div></div>`;
  }
  function nuevaFila(codigo) { const p = byCode[codigo]; return { codigo: codigo || "", costo: p ? p.precio : 0, cant: 1, venta: p ? Math.round(p.precio * mult()) : 0 }; }
  function pintarFilas() {
    const cont = $("#filas"); if (!cont) return;
    cont.innerHTML = filas.map(filaHTML).join("");
    $$(".fila", cont).forEach(el => {
      const i = Number(el.dataset.i), f = filas[i];
      $("[data-f=codigo]", el).addEventListener("change", e => { const v = e.target.value; const p = byCode[v]; f.codigo = v; if (p) { f.costo = p.precio; f.venta = Math.round(p.precio * mult()); } else if (v === "__libre") { f.costo = 0; f.venta = 0; } pintarFilas(); });
      $$("input[data-f]", el).forEach(inp => inp.addEventListener("input", () => { const k = inp.dataset.f; let v = Number(inp.value) || 0; if (k === "cant") v = Math.max(1, Math.round(v)); f[k] = v; pintarTotales(); const gan = $(".fila-gan", el); if (gan) { const g = (f.venta - f.costo) * f.cant; $("b", gan).textContent = money(g); $("b", gan).classList.toggle("neg", g < 0); $("small", gan).textContent = `${f.cant} × (${money(f.venta)} − ${money(f.costo)})`; } }));
      $("[data-quitar]", el).addEventListener("click", () => { filas.splice(i, 1); if (!filas.length) filas.push(nuevaFila("")); pintarFilas(); });
    });
    pintarTotales();
  }
  function pintarTotales() {
    const act = filas.filter(f => f.cant > 0 && (f.costo > 0 || f.venta > 0));
    const n = act.reduce((a, f) => a + f.cant, 0), inv = act.reduce((a, f) => a + f.costo * f.cant, 0), ven = act.reduce((a, f) => a + f.venta * f.cant, 0), g = ven - inv;
    const set = (id, v) => { const e = $(id); if (e) e.textContent = v; };
    set("#tPiezas", n); set("#tInv", money(inv)); set("#tVen", money(ven)); set("#tGan", money(g));
    set("#tMargen", inv > 0 ? Math.round(g / inv * 100) + "%" : "—");
    const r = $("#resumen"); if (r) r.textContent = n ? `Con ${n} pieza${n === 1 ? "" : "s"} inviertes ${money(inv)} y, si las vendes a tu precio, recuperas ${money(ven)}: ganas ${money(g)}.` : "Elige una pieza del catálogo, pon cuántas comprarías y a cuánto las venderías.";
    const gEl = $("#tGan"); if (gEl) gEl.classList.toggle("neg", g < 0);
    const min = (DATA && DATA.minimo_piezas) || 12; const mi = $("#minimo"); if (mi) { const falta = Math.max(0, min - n); mi.classList.toggle("ok", !falta && n > 0); mi.textContent = falta ? `Recuerda: el pedido mínimo es de ${min} piezas surtidas (te faltarían ${falta}).` : `✓ Este pedido cubre el mínimo de ${min} piezas surtidas.`; }
  }
  function mensajeWA() {
    const act = filas.filter(f => f.cant > 0 && f.costo > 0);
    const lines = act.map(f => { const p = byCode[f.codigo]; return `• ${f.cant} × ${p ? p.codigo + " " + p.nombre : "pieza"} (${money(f.costo)} c/u)`; });
    return `¡Hola Marvea! Hice mi cálculo en la página y me interesan estas piezas:\n\n${lines.join("\n")}\n\n¿Me confirman disponibilidad?`;
  }

  /* ---------- arranque ---------- */
  async function init() {
    if (window.self !== window.top) document.body.classList.add("embebido");
    try { await cargarCatalogo(); }
    catch (e) { const g = $("#grid") || $("#filas"); if (g) g.innerHTML = `<div class="estado"><b>El catálogo se está preparando</b>Vuelve en unos minutos o escríbenos por WhatsApp y te lo mandamos.</div>`; return; }
    const f = $("#fecha"); if (f && DATA.actualizado) f.textContent = new Date(DATA.actualizado).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
    $("#buscar") && $("#buscar").addEventListener("input", e => { busq = e.target.value; pintarCatalogo(); });
    $("#orden") && $("#orden").addEventListener("change", e => { orden = e.target.value; pintarCatalogo(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") { const m = $("#modal"); m && m.classList.remove("abierto"); } });
    pintarChips(); pintarCatalogo();
    if (MODE === "calculadora") {
      const pre = new URLSearchParams(location.search).get("pieza");
      filas = [nuevaFila(pre && byCode[pre] ? pre : "")];
      $("#addFila") && $("#addFila").addEventListener("click", () => { filas.push(nuevaFila("")); pintarFilas(); const last = $$(".fila").pop(); last && last.scrollIntoView({ behavior: "smooth", block: "center" }); });
      $("#btnLimpiar") && $("#btnLimpiar").addEventListener("click", () => { filas = [nuevaFila("")]; pintarFilas(); });
      $("#btnWA") && $("#btnWA").addEventListener("click", () => window.open("https://wa.me/" + waNum() + "?text=" + encodeURIComponent(mensajeWA()), "_blank"));
      pintarFilas();
    }
  }
  init();
})();
