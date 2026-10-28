/* Marvea · navegación, video, animaciones de entrada y piezas del catálogo */
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

  /* ir a una sección (compensa el menú fijo) */
  function irA(el) { const y = el.getBoundingClientRect().top + window.pageYOffset - 80; window.scrollTo({ top: y, behavior: "smooth" }); }
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
    return `<a class="prod" href="catalogo.html#${esc(p.codigo)}">${etq}<div class="ph"><img loading="lazy" src="${esc(p.foto)}" alt="${esc(p.nombre)}"></div><div class="tx"><div class="nm">${esc(p.nombre)}</div><div class="mt">${esc(cats[p.categoria] || "")}${p.material ? " · " + esc(p.material) : ""}</div><div class="pr">${money(p.precio)}<span>mayoreo</span></div><div class="ver"><span>Ver pieza</span></div></div></a>`;
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
      const total = $("#totalPiezas"); if (total) { total.dataset.contar = String(prods.length); if (total.textContent !== "0") contador(total); }
      if (location.hash) setTimeout(irAlHash, 100);
      const fecha = $("#fechaCat"); if (fecha && d.actualizado) fecha.textContent = new Date(d.actualizado).toLocaleDateString("es-MX", { day: "numeric", month: "long" });
    } catch (e) {}
  }
  catalogo();
})();
