/* Marvea · sitio principal (liquid glass): navegación, video, animaciones y piezas del catálogo */
(function () {
  "use strict";
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const money = n => "$" + Math.round(n).toLocaleString("es-MX");
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* videos: horizontal en pantallas anchas, vertical en celular */
  function videos() {
    const vertical = matchMedia("(max-width:640px) and (orientation:portrait)").matches;
    $$("video[data-h]").forEach(v => {
      const src = vertical ? v.dataset.v : v.dataset.h;
      if (v.dataset.actual === src) return;
      v.dataset.actual = src; v.src = src; v.load();
      const p = v.play(); if (p && p.catch) p.catch(() => {});
    });
  }
  videos(); addEventListener("orientationchange", () => setTimeout(videos, 300));
  // reproducir solo cuando el bloque está a la vista (ahorra batería)
  if ("IntersectionObserver" in window) {
    const vo = new IntersectionObserver(es => es.forEach(e => { const v = e.target; if (e.isIntersecting) { const p = v.play(); if (p && p.catch) p.catch(() => {}); } else v.pause(); }), { threshold: .05 });
    $$("video[data-h]").forEach(v => vo.observe(v));
  }

  /* eventos para Google Analytics (si está cargado) */
  const medir = (nombre, datos) => { try { if (typeof gtag === "function") gtag("event", nombre, datos || {}); } catch (e) {} };
  document.addEventListener("click", e => {
    const a = e.target.closest("a,button"); if (!a) return;
    const href = a.getAttribute("href") || "";
    if (href.includes("wa.me/528132660673")) medir("whatsapp_ventas", { ubicacion: a.className || a.textContent.trim().slice(0, 40) });
    else if (href.includes("wa.me/528132380573")) medir("whatsapp_atencion", { ubicacion: a.className || a.textContent.trim().slice(0, 40) });
    else if (href.startsWith("mailto:")) medir("correo_click");
    else if (href.includes("instagram.com")) medir("red_social", { red: "instagram" });
    else if (href.includes("tiktok.com")) medir("red_social", { red: "tiktok" });
    else if (href.includes("facebook.com")) medir("red_social", { red: "facebook" });
    else if (a.classList.contains("prod")) medir("ver_pieza", { codigo: (href.split("#")[1] || ""), nombre: (a.querySelector(".nm") || {}).textContent || "" });
    else if (href.includes("calculadora.html")) medir("ir_calculadora");
    else if (href.includes("catalogo.html")) medir("ir_catalogo");
    else if (href.includes("tienda.html")) medir("ir_tienda");
  }, true);
  const rfm = $("#rastreoForm"); if (rfm) rfm.addEventListener("submit", () => medir("rastreo_dhl"));
  $$(".item button").forEach(b => b.addEventListener("click", () => medir("faq_abrir", { pregunta: b.textContent.trim().slice(0, 60) })));

  /* ir a una sección (compensa el menú fijo) */
  function irA(el) { const y = el.getBoundingClientRect().top + window.pageYOffset - 92; window.scrollTo({ top: y, behavior: "smooth" }); }
  function irAlHash() { const id = decodeURIComponent((location.hash || "").slice(1)); if (!id) return; const el = document.getElementById(id); if (el) { irA(el); setTimeout(() => irA(el), 700); } }
  addEventListener("load", () => setTimeout(irAlHash, 150));
  addEventListener("hashchange", irAlHash);

  /* botón ir al inicio: aparece al bajar más de una pantalla */
  const arriba = $("#irArriba");
  if (arriba) { const ver = () => arriba.classList.toggle("visible", scrollY > 320); ver(); addEventListener("scroll", ver, { passive: true }); arriba.addEventListener("click", () => { window.scrollTo({ top: 0, behavior: "smooth" }); history.replaceState(null, "", location.pathname); }); }

  /* nav */
  const nav = $(".nav");
  if (nav) {
    const onScroll = () => nav.classList.toggle("solida", scrollY > 10);
    onScroll(); addEventListener("scroll", onScroll, { passive: true });
    const h = $(".hamb", nav); h && h.addEventListener("click", () => nav.classList.toggle("abierto"));
    $$("li a", nav).forEach(a => a.addEventListener("click", () => nav.classList.remove("abierto")));
    const path = location.pathname.split("/").pop() || "index.html";
    // enlaces a secciones de esta misma página: desplazamiento suave sin recargar
    $$('a[href*="#"]').forEach(a => a.addEventListener("click", e => {
      const href = a.getAttribute("href") || ""; const [file, hash] = href.split("#"); if (!hash) return;
      if (file && file !== path && !(file === "index.html" && path === "")) return;
      const el = document.getElementById(hash); if (!el) return;
      e.preventDefault(); nav.classList.remove("abierto"); irA(el); history.replaceState(null, "", "#" + hash);
    }));
    $$("li a", nav).forEach(a => { const href = (a.getAttribute("href") || "").split("#")[0]; if (href && href === path && path !== "index.html") a.classList.add("activo"); });
  }

  /* revelado al hacer scroll */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: .12, rootMargin: "0px 0px -40px 0px" });
  $$(".rev,[data-stagger]").forEach(el => io.observe(el));
  $$("[data-stagger]").forEach(g => Array.from(g.children).forEach((c, i) => { c.style.transitionDelay = (i * 90) + "ms"; }));

  /* contadores */
  function contador(el) {
    const fin = Number(el.dataset.contar), suf = el.dataset.sufijo || "";
    const t0 = performance.now(), dur = 1400;
    const tick = t => { const k = Math.min(1, (t - t0) / dur); el.textContent = Math.round(fin * (1 - Math.pow(1 - k, 3))).toLocaleString("es-MX") + suf; if (k < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }
  const co = new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return; co.unobserve(e.target); contador(e.target); }));
  $$("[data-contar]").forEach(el => co.observe(el));

  /* acordeón */
  $$(".item button").forEach(b => b.addEventListener("click", () => {
    const it = b.parentElement, cuerpo = $(".cuerpo", it), abierto = it.classList.contains("abierto");
    $$(".item.abierto").forEach(o => { o.classList.remove("abierto"); $(".cuerpo", o).style.maxHeight = "0"; });
    if (!abierto) { it.classList.add("abierto"); cuerpo.style.maxHeight = cuerpo.scrollHeight + "px"; }
  }));

  /* rastreo DHL: abre la página oficial con la guía */
  const rf = $("#rastreoForm");
  if (rf) rf.addEventListener("submit", () => { const g = $("#guia"); g.value = (g.value || "").replace(/[^0-9A-Za-z]/g, ""); });

  /* ---------- carrito pendiente: piezas agregadas desde la página principal; la tienda las toma al abrir (marvea.agregar) ---------- */
  function pendientes() { try { const a = JSON.parse(localStorage.getItem("marvea.agregar") || "null"); return a && Array.isArray(a.items) && (Date.now() - (a.t || 0)) < 30 * 60000 ? a.items : []; } catch (e) { return []; } }
  function toast(m, t) { const box = $("#toasts"); if (!box) return; const e = document.createElement("div"); e.className = "toast " + (t || ""); e.innerHTML = m; box.appendChild(e); setTimeout(() => e.remove(), 3800); }
  function pintarMini() { const n = pendientes().reduce((a, i) => a + (Number(i.cant) || 0), 0); const m = $("#miniCarrito"); if (!m) return; $("#mcN").textContent = String(n); m.classList.toggle("on", n > 0); }
  function agregarPendiente(codigo, cant, nombre) {
    const items = pendientes(); const f = items.find(i => i.codigo === codigo); if (f) f.cant = (Number(f.cant) || 0) + cant; else items.push({ codigo, cant });
    try { localStorage.setItem("marvea.agregar", JSON.stringify({ items, t: Date.now() })); } catch (e) {}
    medir("agregar_desde_inicio", { codigo, cant }); pintarMini();
    const tot = items.reduce((a, i) => a + (Number(i.cant) || 0), 0);
    toast("<b>" + esc(nombre || codigo) + "</b> lista en tu carrito · " + tot + (tot === 1 ? " pieza" : " piezas") + (tot < 12 ? " (mínimo 12 para pagar)" : " ✓"), "ok");
  }
  document.addEventListener("click", e => { const b = e.target.closest("[data-agregar]"); if (!b) return; e.preventDefault(); agregarPendiente(b.dataset.agregar, 1, b.dataset.nombre); b.classList.add("ok"); b.textContent = "✓"; setTimeout(() => { b.classList.remove("ok"); b.textContent = "+"; }, 900); });
  pintarMini();

  /* ---------- categorías con foto ---------- */
  function categorias(prods, cats, orden) {
    const row = $("#catsRow"); if (!row) return;
    const por = {}; prods.forEach(p => { (por[p.categoria] = por[p.categoria] || []).push(p); });
    const lista = orden.filter(c => por[c.p] && por[c.p].length).map(c => ({ p: c.p, n: c.n, l: por[c.p] })).sort((a, b) => b.l.length - a.l.length);
    row.innerHTML = lista.map(c => { const f = c.l.find(p => /tendencia|vendido/i.test(p.etiqueta || "")) || c.l[0]; const min = Math.min(...c.l.map(p => Number(p.precio) || 999)); return `<a class="catc vidrio" href="tienda.html#cat=${encodeURIComponent(c.n)}"><img loading="lazy" src="${esc(f.foto)}" alt="${esc(c.n)}"><div class="tx"><b>${esc(c.n)}</b><span>${c.l.length} modelos · desde ${money(min)}</span></div></a>`; }).join("");
  }

  /* ---------- calculadora v2: una pieza, cantidad, precio de venta → inviertes / vendes / ganas ---------- */
  function calc2(prods, cats) {
    const sel = $("#c2Modelo"), cant = $("#c2Cant"), venta = $("#c2Venta"); if (!sel || !cant || !venta) return;
    let mult = 2.5, tocado = false;
    const porCat = {}; prods.forEach(p => { const k = cats[p.categoria] || p.categoria || "Otros"; (porCat[k] = porCat[k] || []).push(p); });
    sel.innerHTML = Object.keys(porCat).sort().map(k => '<optgroup label="' + esc(k) + '">' + porCat[k].map(p => '<option value="' + esc(p.codigo) + '">' + esc(p.nombre) + ' · ' + money(p.precio) + '</option>').join("") + '</optgroup>').join("");
    const dest = prods.find(p => /vendido|tendencia/i.test(p.etiqueta || "")) || prods[0]; if (dest) sel.value = dest.codigo;
    const pieza = () => prods.find(x => x.codigo === sel.value);
    const pintar = () => {
      const p = pieza(); const n = Math.max(1, Math.min(999, parseInt(cant.value) || 1)); const u = p ? Number(p.precio) || 0 : 0;
      if (!tocado) venta.value = Math.round(u * mult);
      const pv = Math.max(0, Number(venta.value) || 0), inv = u * n, ven = pv * n, gan = ven - inv;
      $("#c2Foto").src = p && p.foto ? p.foto : "logo-m.png"; $("#c2Det").innerHTML = p ? "<b>" + money(u) + "</b> c/u mayoreo · " + esc(cats[p.categoria] || "") + (p.material ? " · " + esc(p.material) : "") : "Elige una pieza del catálogo";
      $("#c2Inv").textContent = money(inv); $("#c2Ven").textContent = money(ven); $("#c2Gan").textContent = money(gan); $("#c2N").textContent = String(n);
      const rec = pv > 0 ? Math.ceil(inv / pv) : 0; $("#c2Barra").querySelector("i").style.width = (n ? Math.min(100, rec / n * 100) : 0) + "%";
      $("#c2Nota").innerHTML = !p ? "Precios de mayoreo en pesos mexicanos (MXN)." : n < 12 ? "Recuerda: el mínimo de compra es de <b>12 piezas</b> en total; puedes combinar modelos." : pv > u ? "Recuperas tu inversión vendiendo <b>" + rec + " de " + n + "</b>; las otras " + (n - rec) + " son ganancia pura. Margen " + Math.round((pv - u) / u * 100) + "%." : "Pon un precio de venta mayor al de mayoreo para ver tu ganancia.";
      $$("#c2Mult button").forEach(b => b.classList.toggle("on", !tocado && Number(b.dataset.m) === mult));
    };
    sel.addEventListener("change", () => { tocado = false; pintar(); }); cant.addEventListener("input", pintar); venta.addEventListener("input", () => { tocado = true; pintar(); });
    $("#c2Menos").addEventListener("click", () => { cant.value = Math.max(1, (parseInt(cant.value) || 1) - 1); pintar(); });
    $("#c2Mas").addEventListener("click", () => { cant.value = Math.min(999, (parseInt(cant.value) || 0) + 1); pintar(); });
    $$("#c2Mult button").forEach(b => b.addEventListener("click", () => { mult = Number(b.dataset.m); tocado = false; pintar(); }));
    $("#c2Agregar").addEventListener("click", () => { const p = pieza(); if (!p) return; const n = Math.max(1, parseInt(cant.value) || 1); agregarPendiente(p.codigo, n, p.nombre); medir("calculadora_agregar", { codigo: p.codigo, cant: n }); });
    pintar();
  }

  /* simulador rápido de ganancia */
  const sim = $("#sim");
  if (sim) {
    const n = $("#simN"), p = $("#simP"), m = $("#simM");
    const pintar = () => { const piezas = +n.value, precio = +p.value, mult = +m.value / 10; const inv = piezas * precio, ven = inv * mult; $("#simNv").textContent = piezas + " pzas"; $("#simPv").textContent = money(precio); $("#simMv").textContent = "×" + mult.toFixed(1); $("#simInv").textContent = money(inv); $("#simVen").textContent = money(ven); $("#simGan").textContent = money(ven - inv); };
    [n, p, m].forEach(i => i.addEventListener("input", pintar)); pintar();
  }

  /* piezas del catálogo (lo más pedido y recién llegado) */
  function tarjeta(p, cats) {
    const e = (p.etiqueta || "").toLowerCase();
    const cls = e.includes("tendencia") ? "coral" : e.includes("ltimas") ? "rosa" : e.includes("dupe") ? "cielo" : e.includes("new") ? "lima" : e.includes("vendido") ? "amarillo" : "";
    const etq = p.etiqueta && e !== "ninguna" ? `<span class="etq ${cls}">${esc(p.etiqueta)}</span>` : "";
    return `<a class="vidrio prod" href="tienda.html#p=${encodeURIComponent(p.codigo)}">${etq}<button type="button" class="agr" data-agregar="${esc(p.codigo)}" data-nombre="${esc(p.nombre)}" title="Agregar a mi carrito" aria-label="Agregar ${esc(p.nombre)}">+</button><div class="ph"><img loading="lazy" src="${esc(p.foto)}" alt="${esc(p.nombre)}"></div><div class="tx"><div class="nm">${esc(p.nombre)}</div><div class="mt">${esc(cats[p.categoria] || "")}${p.material ? " · " + esc(p.material) : ""}</div><div class="pr">${money(p.precio)}<span class="vend">véndela en ${money(p.precio * 2)}+</span></div></div></a>`;
  }
  async function catalogo() {
    try {
      const r = await fetch("catalogo.json?v=" + Math.floor(Date.now() / 300000), { cache: "no-cache" }); if (!r.ok) return;
      const d = await r.json(); const prods = (d.productos || []).filter(p => p.disponible !== false && p.foto);
      const cats = {}; (d.categorias || []).forEach(c => { cats[c.p] = c.n; });
      const peso = p => { const e = (p.etiqueta || "").toLowerCase(); return e.includes("vendido") ? 0 : e.includes("tendencia") ? 1 : e.includes("dupe") ? 2 : e.includes("new") ? 3 : e.includes("ltimas") ? 4 : 5; };
      const dest = prods.slice().sort((a, b) => peso(a) - peso(b) || (b.creado || "").localeCompare(a.creado || "")).slice(0, 8);
      const codigos = new Set(dest.map(p => p.codigo));
      const nuevo = prods.slice().sort((a, b) => (b.creado || "").localeCompare(a.creado || "")).filter(p => !codigos.has(p.codigo)).slice(0, 8);
      const g1 = $("#masPedido"), g2 = $("#recienLlegado");
      if (g1) g1.innerHTML = dest.length ? dest.map(p => tarjeta(p, cats)).join("") : '<div class="vacio">Pronto verás aquí las piezas destacadas.</div>';
      if (g2) g2.innerHTML = nuevo.length ? nuevo.map(p => tarjeta(p, cats)).join("") : '<div class="vacio">Pronto verás aquí las piezas nuevas.</div>';
      const total = $("#totalPiezas"); if (total) { const piezas = Number(d.piezas) > 0 ? Number(d.piezas) : prods.length * 12; total.dataset.contar = String(piezas); if (total.textContent !== "0") contador(total); }
      /* maqueta del Business Club: catálogo de ejemplo de una clienta, con nuestras fotos y sus precios (×2) */
      calc2(prods, cats); categorias(prods, cats, d.categorias || []);
      const nm = $("#nModelos"); if (nm) nm.textContent = String(prods.length);
      const demo = $("#catDemo"); if (demo) { const l = prods.filter(p => p.foto).slice(0, 6); if (l.length >= 3) demo.innerHTML = l.map(p => `<div class="p"><div class="im"><img loading="lazy" src="${esc(p.foto)}" alt=""></div><b>${esc(p.nombre)}</b><span>${money(Number(p.precio) * 2)}</span></div>`).join(""); }
      if (location.hash) setTimeout(irAlHash, 100);
      const fecha = $("#fechaCat"); if (fecha && d.actualizado) fecha.textContent = new Date(d.actualizado).toLocaleDateString("es-MX", { day: "numeric", month: "long" });
    } catch (e) {}
  }
  catalogo();

})();
