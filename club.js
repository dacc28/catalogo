/* Marvea Business Club · beta · lógica del perfil privado de clientas */
(() => {
  "use strict";
  const SB_URL = "https://kuuewntjxtjjktxbgxfk.supabase.co";
  const SB_KEY = "sb_publishable_o9LoacKHt5UBgIcJPJZa4g_QCbRM2U8"; // clave pública: solo permite lo que las reglas de seguridad autorizan
  const DOMINIO = "club.marveamayoreo.com";
  const BASE = "https://www.marveamayoreo.com/";
  const $ = (s, el) => (el || document).querySelector(s), $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const mxn = n => "$" + (Math.round(Number(n) || 0)).toLocaleString("es-MX");
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const digitos = w => { const d = String(w || "").replace(/\D/g, ""); if (d.length === 12 && d.startsWith("52")) return d.slice(2); if (d.length === 13 && d.startsWith("521")) return d.slice(3); return d.length >= 10 ? d.slice(-10) : d; };
  const fecha = s => { try { return new Date(s).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" }); } catch (e) { return ""; } };
  const slugify = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  const medir = (ev, p) => { try { if (typeof gtag === "function") gtag("event", ev, p || {}); } catch (e) {} };
  let toastT; const toast = (m, mal) => { const t = $("#toast"); t.textContent = m; t.classList.toggle("mal", !!mal); t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), 2600); };

  // menú móvil
  const nav = $(".nav"); const h = $(".hamb", nav); h && h.addEventListener("click", () => nav.classList.toggle("abierto"));

  if (!window.supabase) { const e = $("#loginError"); e.textContent = "No se pudo cargar el Club. Revisa tu conexión e intenta de nuevo."; e.classList.add("on"); return; }
  const sb = window.supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: true, autoRefreshToken: true } });

  const S = { yo: null, pedidos: [], ventas: [], precios: {}, inv: [] };

  /* ---------- acceso ---------- */
  $("#verPass").addEventListener("click", () => { const i = $("#pass"); i.type = i.type === "password" ? "text" : "password"; $("#verPass i").className = i.type === "password" ? "fa-regular fa-eye" : "fa-regular fa-eye-slash"; });
  $("#formLogin").addEventListener("submit", async e => {
    e.preventDefault(); const err = $("#loginError"); err.classList.remove("on");
    const d = digitos($("#usuario").value), p = $("#pass").value;
    if (d.length !== 10) { err.textContent = "Escribe tu WhatsApp a 10 dígitos (sin +52)."; err.classList.add("on"); return; }
    const b = $("#btnEntrar"); b.disabled = true; b.textContent = "Entrando…";
    const { error } = await sb.auth.signInWithPassword({ email: d + "@" + DOMINIO, password: p });
    b.disabled = false; b.innerHTML = 'Entrar <span class="fl">→</span>';
    if (error) { err.textContent = /invalid/i.test(error.message) ? "Usuario o contraseña incorrectos. Si no tienes acceso todavía, pídelo por WhatsApp." : "No pudimos entrar: " + error.message; err.classList.add("on"); medir("club_login_error"); return; }
    medir("club_login"); abrir();
  });
  $("#salir").addEventListener("click", async () => { await sb.auth.signOut(); location.reload(); });

  async function abrir() {
    $("#login").style.display = "none"; $("#cargando").style.display = "block";
    try { await cargar(); } catch (e) { $("#cargando").style.display = "none"; $("#login").style.display = ""; const err = $("#loginError"); err.textContent = "No pudimos abrir tu espacio: " + (e.message || e); err.classList.add("on"); await sb.auth.signOut(); return; }
    $("#cargando").style.display = "none"; $("#app").classList.add("on"); pintarTodo();
  }

  async function cargar() {
    const { data: yo, error: e1 } = await sb.from("clientas").select("*").limit(1).maybeSingle(); if (e1) throw e1;
    if (!yo) throw new Error("tu usuario aún no está vinculado a una clienta. Avísanos por WhatsApp.");
    const [{ data: ped, error: e2 }, { data: ven, error: e3 }, { data: pre, error: e4 }] = await Promise.all([
      sb.from("pedidos").select("*").order("fecha", { ascending: false }),
      sb.from("ventas").select("*").order("fecha", { ascending: false }),
      sb.from("precios").select("*")]);
    if (e2 || e3 || e4) throw (e2 || e3 || e4);
    S.yo = yo; S.yo.catalogo = yo.catalogo || {}; S.pedidos = ped || []; S.ventas = ven || []; S.precios = {}; (pre || []).forEach(p => S.precios[p.codigo] = p);
    calcular();
  }

  function calcular() { // inventario por pieza: comprado, vendido, costo promedio, precio de venta
    const m = {};
    for (const p of S.pedidos) for (const it of (p.items || [])) { const c = it.codigo; if (!c) continue; const r = m[c] || (m[c] = { codigo: c, nombre: it.nombre, foto: it.foto, categoria: it.categoria, material: it.material, comprado: 0, costoTotal: 0, vendido: 0, ingresos: 0 }); r.comprado += Number(it.cant) || 0; r.costoTotal += (Number(it.cant) || 0) * (Number(it.precio) || 0); if (!r.foto && it.foto) r.foto = it.foto; }
    for (const v of S.ventas) { const r = m[v.codigo]; if (!r) continue; r.vendido += Number(v.cant) || 0; r.ingresos += (Number(v.cant) || 0) * (Number(v.precio_venta) || 0); }
    S.inv = Object.values(m).map(r => { r.costo = r.comprado ? r.costoTotal / r.comprado : 0; const pr = S.precios[r.codigo]; r.precioVenta = pr && pr.precio_venta != null ? Number(pr.precio_venta) : null; r.visible = pr ? pr.visible !== false : true; r.disponibles = Math.max(0, r.comprado - r.vendido); r.ganancia = r.ingresos - r.vendido * r.costo; return r; }).sort((a, b) => (a.categoria || "").localeCompare(b.categoria || "") || (a.nombre || "").localeCompare(b.nombre || ""));
  }

  /* ---------- pestañas ---------- */
  const ir = p => { if (p === "catalogo") pintarCatalogo(); if (p === "inicio") pintarMiniCat(); $$("#tabs button").forEach(b => b.classList.toggle("on", b.dataset.p === p)); $$(".panel").forEach(x => x.classList.toggle("on", x.id === "p-" + p)); medir("club_panel", { panel: p }); window.scrollTo({ top: 0, behavior: "smooth" }); };
  $$("#tabs button").forEach(b => b.addEventListener("click", () => ir(b.dataset.p)));
  $$("[data-ir]").forEach(b => b.addEventListener("click", () => ir(b.dataset.ir)));

  function pintarTodo() { pintarCabecera(); pintarInicio(); pintarPedidos(); pintarNegocio(); pintarCatalogo(); pintarPerfil(); }

  function pintarCabecera() { const n = S.yo.nombre || "clienta"; $("#avatar").textContent = n.trim().charAt(0).toUpperCase() || "M"; $("#hola").textContent = "Hola, " + n.split(" ")[0]; $("#subtitulo").textContent = (S.yo.catalogo.nombre || S.yo.negocio || "Marvea Business Club") + (S.yo.ciudad ? " · " + S.yo.ciudad : ""); }

  function estadoChip(p) { const e = p.estado || "preparando"; return e === "entregado" ? '<span class="chip ent"><i class="fa-solid fa-check"></i> Entregado</span>' : e === "enviado" ? '<span class="chip env"><i class="fa-solid fa-truck-fast"></i> En camino</span>' : '<span class="chip prep"><i class="fa-solid fa-box"></i> Preparando</span>'; }
  function origenChip(p) { return p.origen === "whatsapp" ? '<span class="chip wa"><i class="fa-brands fa-whatsapp"></i> WhatsApp</span>' : '<span class="chip live"><i class="fa-solid fa-video"></i> Live</span>'; }
  function piezaHTML(it) { return '<div class="pz">' + (it.foto ? '<img src="' + esc(it.foto) + '" alt="" loading="lazy">' : '<img src="logo-m.png" alt="">') + '<div class="t"><b>' + esc(it.nombre || it.codigo) + '</b><span>' + (Number(it.cant) || 0) + ' pza' + (Number(it.cant) === 1 ? "" : "s") + ' · ' + mxn(it.precio) + ' c/u</span></div></div>'; }

  function pintarInicio() {
    const piezas = S.pedidos.reduce((s, p) => s + (Number(p.piezas) || 0), 0), inv = S.pedidos.reduce((s, p) => s + (Number(p.total) || 0), 0);
    const vend = S.inv.reduce((s, r) => s + r.vendido, 0), disp = S.inv.reduce((s, r) => s + r.disponibles, 0), ing = S.inv.reduce((s, r) => s + r.ingresos, 0), gan = S.inv.reduce((s, r) => s + r.ganancia, 0);
    $("#kPiezas").textContent = piezas; $("#kPedidos").textContent = S.pedidos.length + (S.pedidos.length === 1 ? " pedido" : " pedidos");
    $("#kInvertido").innerHTML = mxn(inv) + " <em>MXN</em>"; $("#kVendidas").textContent = vend; $("#kDisponibles").textContent = disp + " disponibles para vender";
    $("#kGanancia").innerHTML = mxn(gan) + " <em>MXN</em>"; $("#kIngresos").textContent = mxn(ing) + " en ventas registradas";
    const u = S.pedidos[0];
    if (u) { $("#uDesc").textContent = (u.titulo || "Pedido") + " · " + fecha(u.fecha) + " · " + (u.piezas || 0) + " piezas · " + mxn(u.total) + " MXN"; $("#uEstado").innerHTML = estadoChip(u); $("#uPiezas").innerHTML = (u.items || []).slice(0, 4).map(piezaHTML).join(""); }
    else { $("#uDesc").textContent = "Todavía no tienes pedidos finalizados. Cuando cerremos tu primera compra, aparecerá aquí."; $("#uEstado").innerHTML = ""; $("#uPiezas").innerHTML = ""; }
    pintarMiniCat();
  }
  function pintarPedidos() {
    const box = $("#listaPedidos"); box.innerHTML = "";
    if (!S.pedidos.length) { box.innerHTML = '<div class="vacio"><b>Aún no hay pedidos</b>En cuanto finalicemos tu primera compra en un live o por WhatsApp, la verás aquí con sus fotos.</div>'; return; }
    for (const p of S.pedidos) {
      const el = document.createElement("div"); el.className = "glass ped";
      const guia = (p.guia || "").trim(); const track = guia ? "https://www.dhl.com/mx-es/home/tracking.html?tracking-id=" + encodeURIComponent(guia) + "&submit=1" : "";
      el.innerHTML = '<div class="top"><div><b>' + esc(p.titulo || "Pedido") + '</b><small>' + fecha(p.fecha) + ' · ' + (p.piezas || 0) + ' piezas · ' + mxn(p.total) + ' MXN</small></div><div class="der">' + origenChip(p) + estadoChip(p) + '</div></div>'
        + '<div class="pzs">' + (p.items || []).map(piezaHTML).join("") + '</div>'
        + '<div class="guia"><label><i class="fa-solid fa-truck-fast"></i> Guía DHL</label><input value="' + esc(guia) + '" placeholder="Pega aquí tu número de guía" maxlength="30">'
        + (track ? '<a class="btn claro sm" href="' + track + '" target="_blank" rel="noopener">Rastrear</a>' : '') + '<button class="btn vidrio sm guardar">Guardar guía</button>'
        + (p.estado !== "entregado" ? '<button class="btn vidrio sm recibido"><i class="fa-solid fa-check"></i> Ya lo recibí</button>' : '') + '</div>';
      $(".guardar", el).addEventListener("click", async () => { const g = $(".guia input", el).value.trim(); const { error } = await sb.from("pedidos").update({ guia: g, estado: g && p.estado === "preparando" ? "enviado" : p.estado }).eq("id", p.id); if (error) return toast("No se guardó: " + error.message, true); p.guia = g; if (g && p.estado === "preparando") p.estado = "enviado"; toast("Guía guardada"); pintarPedidos(); pintarInicio(); });
      const r = $(".recibido", el); r && r.addEventListener("click", async () => { const { error } = await sb.from("pedidos").update({ estado: "entregado" }).eq("id", p.id); if (error) return toast("No se guardó: " + error.message, true); p.estado = "entregado"; toast("¡Qué bien! Pedido entregado"); pintarPedidos(); pintarInicio(); });
      box.append(el);
    }
  }

  function pintarNegocio() {
    const tb = $("#tablaInv tbody"); tb.innerHTML = ""; $("#invVacio").style.display = S.inv.length ? "none" : "block"; $("#tablaInv").style.display = S.inv.length ? "" : "none";
    const disp = S.inv.reduce((s, r) => s + r.disponibles, 0), gan = S.inv.reduce((s, r) => s + r.ganancia, 0), ing = S.inv.reduce((s, r) => s + r.ingresos, 0), sinPrecio = S.inv.filter(r => r.precioVenta == null && r.disponibles > 0).length;
    $("#resumenNegocio").innerHTML = '<span class="chip vidrio"><i class="fa-solid fa-gem"></i> ' + disp + ' piezas disponibles</span><span class="chip vidrio"><i class="fa-solid fa-sack-dollar"></i> ' + mxn(ing) + ' vendidos</span><span class="chip prep"><i class="fa-solid fa-arrow-trend-up"></i> ' + mxn(gan) + ' de ganancia</span>' + (sinPrecio ? '<span class="chip vidrio"><i class="fa-solid fa-tag"></i> ' + sinPrecio + ' sin precio de venta</span>' : "");
    for (const r of S.inv) {
      const tr = document.createElement("tr"); if (!r.disponibles) tr.className = "agotado";
      tr.innerHTML = '<td><div class="pcell">' + (r.foto ? '<img src="' + esc(r.foto) + '" alt="" loading="lazy">' : '<img src="logo-m.png" alt="">') + '<div><b>' + esc(r.nombre || r.codigo) + '</b><span>' + esc(r.codigo) + (r.material ? ' · ' + esc(r.material) : '') + '</span></div></div></td>'
        + '<td>' + r.comprado + '</td><td>' + r.vendido + '</td><td><b>' + r.disponibles + '</b></td><td>' + mxn(r.costo) + '</td>'
        + '<td><span class="inp">$<input type="number" min="0" step="1" class="precio" value="' + (r.precioVenta == null ? "" : Math.round(r.precioVenta)) + '" placeholder="' + Math.round(r.costo * 2) + '"></span></td>'
        + '<td class="gan">' + mxn(r.ganancia) + '</td>'
        + '<td><span class="inp"><input type="number" min="1" max="' + (r.disponibles || 1) + '" step="1" class="cant" value="1" style="width:40px"></span> <button class="ico vender" title="Registrar venta"' + (r.disponibles ? "" : " disabled") + '><i class="fa-solid fa-plus"></i></button></td>'
        + '<td><button class="ico visible' + (r.visible ? "" : " off") + '" title="' + (r.visible ? "Visible en tu catálogo" : "Oculta en tu catálogo") + '"><i class="fa-regular ' + (r.visible ? "fa-eye" : "fa-eye-slash") + '"></i></button></td>';
      const precioIn = $(".precio", tr);
      precioIn.addEventListener("change", async () => { const v = precioIn.value === "" ? null : Number(precioIn.value); const { error } = await sb.from("precios").upsert({ clienta_id: S.yo.id, codigo: r.codigo, precio_venta: v, visible: r.visible }); if (error) return toast("No se guardó el precio: " + error.message, true); S.precios[r.codigo] = { codigo: r.codigo, precio_venta: v, visible: r.visible }; toast("Precio guardado"); });
      $(".visible", tr).addEventListener("click", async () => { const nv = !r.visible; const { error } = await sb.from("precios").upsert({ clienta_id: S.yo.id, codigo: r.codigo, precio_venta: r.precioVenta, visible: nv }); if (error) return toast("No se guardó: " + error.message, true); S.precios[r.codigo] = { codigo: r.codigo, precio_venta: r.precioVenta, visible: nv }; calcular(); pintarNegocio(); toast(nv ? "Visible en tu catálogo" : "Oculta de tu catálogo"); });
      $(".vender", tr).addEventListener("click", async () => {
        const cant = Math.max(1, Math.min(r.disponibles, Number($(".cant", tr).value) || 1)); let pv = precioIn.value === "" ? null : Number(precioIn.value);
        if (pv == null) { const s = prompt("¿A cuánto vendiste cada pieza?", Math.round(r.costo * 2)); if (s == null) return; pv = Number(s) || 0; precioIn.value = pv; precioIn.dispatchEvent(new Event("change")); }
        const { data, error } = await sb.from("ventas").insert({ clienta_id: S.yo.id, codigo: r.codigo, cant, precio_venta: pv }).select().single(); if (error) return toast("No se registró: " + error.message, true);
        S.ventas.unshift(data); calcular(); pintarNegocio(); pintarInicio(); toast("Venta registrada: " + cant + " × " + mxn(pv)); medir("club_venta");
      });
      tb.append(tr);
    }
  }

  /* ---------- Mi catálogo: PDF con su nombre, logo y precios (sin links ni datos del proveedor) ---------- */
  const COLORES = ["#2B2B2B", "#5A2748", "#B76E79", "#1F4E5A", "#8C6A3F", "#C2185B", "#3C5A40", "#1D3557"];
  let colorSel = null;
  const piezasCat = () => S.inv.filter(r => r.disponibles > 0 && r.visible);
  function pintarMiniCat() { const c = S.yo.catalogo || {}; const n = piezasCat().length;
    $("#iCat").innerHTML = '<div class="lg">' + (c.logo ? '<img src="' + c.logo + '" alt="">' : '<i class="fa-regular fa-image"></i>') + '</div><div><b>' + esc(c.nombre || S.yo.negocio || "Tu negocio") + '</b><span>' + n + (n === 1 ? " pieza disponible" : " piezas disponibles") + '</span></div>'; }
  function pintarLogo() { const c = S.yo.catalogo || {}; $("#logoPrev").innerHTML = c.logo ? '<img src="' + c.logo + '" alt="Logo">' : '<span><i class="fa-regular fa-image"></i>Sin logo</span>'; $("#logoQuitar").hidden = !c.logo; }
  function pintarCatalogo() {
    const c = S.yo.catalogo || {};
    $("#cNombre").value = c.nombre || S.yo.negocio || ""; $("#cWhats").value = c.whatsapp || S.yo.whatsapp || ""; $("#cFrase").value = c.frase || ""; $("#cRedes").value = c.redes || "";
    colorSel = c.color || COLORES[0];
    $("#cColores").innerHTML = COLORES.map(x => '<button type="button" style="background:' + x + '" data-c="' + x + '" class="' + (x === colorSel ? "on" : "") + '" aria-label="Color ' + x + '"></button>').join("");
    $$("#cColores button").forEach(b => b.onclick = () => { colorSel = b.dataset.c; $$("#cColores button").forEach(x => x.classList.toggle("on", x === b)); });
    pintarLogo(); pintarMiniCat();
    const p = piezasCat(), sinPrecio = p.filter(r => r.precioVenta == null).length;
    $("#cResumen").innerHTML = '<span class="chip vidrio"><i class="fa-solid fa-gem"></i> ' + p.length + ' piezas entrarán al PDF</span>' + (sinPrecio ? '<span class="chip prep"><i class="fa-solid fa-tag"></i> ' + sinPrecio + ' sin precio: saldrán como "Pregunta por precio" (ponlo en Mi negocio)</span>' : "");
  }
  async function guardarCat(extra, silencioso) {
    const cat = Object.assign({}, S.yo.catalogo, { nombre: $("#cNombre").value.trim(), whatsapp: digitos($("#cWhats").value), frase: $("#cFrase").value.trim(), redes: $("#cRedes").value.trim(), color: colorSel }, extra || {});
    const { error } = await sb.from("clientas").update({ catalogo: cat, negocio: cat.nombre, actualizado: new Date().toISOString() }).eq("id", S.yo.id);
    if (error) { toast("No se guardó: " + error.message, true); return false; }
    S.yo.catalogo = cat; S.yo.negocio = cat.nombre; pintarCatalogo(); pintarCabecera();
    if (!silencioso) { $("#cOk").classList.add("on"); setTimeout(() => $("#cOk").classList.remove("on"), 3000); toast("Datos guardados"); }
    return true;
  }
  $("#cGuardar").addEventListener("click", () => guardarCat());
  // logo: se reduce en el navegador (máx. 500 px) y se guarda con su perfil
  $("#logoFile").addEventListener("change", async e => {
    const f = e.target.files && e.target.files[0]; e.target.value = ""; if (!f) return;
    if (!/^image\//.test(f.type)) return toast("Sube una imagen PNG o JPG", true);
    try {
      const img = await cargarImg(URL.createObjectURL(f)); const max = 500, k = Math.min(1, max / Math.max(img.width, img.height));
      const cv = document.createElement("canvas"); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k); cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
      let url = f.type === "image/jpeg" ? cv.toDataURL("image/jpeg", .9) : cv.toDataURL("image/png");
      if (url.length > 700000) url = cv.toDataURL("image/jpeg", .85);
      if (await guardarCat({ logo: url }, true)) { toast("Logo guardado"); medir("club_logo"); }
    } catch (x) { toast("No se pudo leer la imagen", true); }
  });
  $("#logoQuitar").addEventListener("click", async () => { if (await guardarCat({ logo: "" }, true)) toast("Logo quitado"); });
  const cargarImg = src => new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = src; });
  async function fotoCuadrada(src, lado) { // recorta al centro en cuadrado con fondo blanco → JPEG
    try { const i = await cargarImg(src); const cv = document.createElement("canvas"); cv.width = cv.height = lado; const g = cv.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, lado, lado);
      const s2 = Math.min(i.width, i.height); g.drawImage(i, (i.width - s2) / 2, (i.height - s2) / 2, s2, s2, 0, 0, lado, lado); return cv.toDataURL("image/jpeg", .82); } catch (e) { return null; }
  }
  const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const telFmt = d => d && d.length === 10 ? d.slice(0, 2) + " " + d.slice(2, 6) + " " + d.slice(6) : d;
  async function descargarPDF(btn) {
    if (!window.jspdf) return toast("No se pudo cargar el generador de PDF. Recarga la página.", true);
    if (document.querySelector("#p-catalogo.on")) { if (!(await guardarCat(null, true))) return; }
    const piezas = piezasCat(); if (!piezas.length) return toast("No tienes piezas disponibles para el catálogo", true);
    const c = S.yo.catalogo || {}, conPrecio = (document.querySelector('input[name=pm]:checked') || {}).value !== "sin";
    const txt = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Armando tu PDF…';
    try {
      const { jsPDF } = window.jspdf; const doc = new jsPDF({ unit: "mm", format: "a4" }); const W = 210, H = 297, M = 12;
      const col = hexRgb(c.color || COLORES[0]); const neg = c.nombre || S.yo.negocio || S.yo.nombre || "Mi catálogo";
      const wa = telFmt(digitos(c.whatsapp || S.yo.whatsapp || "")); const pie = [wa ? "Pedidos por WhatsApp: " + wa : "", c.redes || ""].filter(Boolean).join("   ·   ");
      const fotos = await Promise.all(piezas.map(p => p.foto ? fotoCuadrada(p.foto, 520) : Promise.resolve(null)));
      let logo = null, lw = 0, lh = 0; if (c.logo) { try { const pr = doc.getImageProperties(c.logo); const k = Math.min(30 / pr.width, 30 / pr.height); lw = pr.width * k; lh = pr.height * k; logo = c.logo; } catch (e) {} }
      const cols = 3, gap = 6, cw = (W - 2 * M - gap * (cols - 1)) / cols, ch = cw + 24, top0 = 56, topN = 18, piso = H - 18;
      const encabezado = primera => {
        if (primera) {
          doc.setFillColor(col[0], col[1], col[2]); doc.rect(0, 0, W, 46, "F");
          let x = M; if (logo) { doc.setFillColor(255, 255, 255); doc.roundedRect(M, 8, 30, 30, 3, 3, "F"); doc.addImage(logo, M + (30 - lw) / 2, 8 + (30 - lh) / 2, lw, lh); x = M + 36; }
          doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(neg.length > 22 ? 20 : 26); doc.text(neg, x, c.frase ? 22 : 26);
          if (c.frase) { doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.text(doc.splitTextToSize(c.frase, W - x - M - 40), x, 30); }
          doc.setFont("helvetica", "bold"); doc.setFontSize(9); const mes = new Date().toLocaleDateString("es-MX", { month: "long", year: "numeric" });
          doc.text("CATÁLOGO", W - M, 18, { align: "right" }); doc.setFont("helvetica", "normal"); doc.text(mes.charAt(0).toUpperCase() + mes.slice(1), W - M, 23, { align: "right" });
        } else { doc.setFillColor(col[0], col[1], col[2]); doc.rect(0, 0, W, 10, "F"); doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.text(neg, M, 6.6); }
      };
      encabezado(true); let x0 = 0, y = top0, n = 0;
      piezas.forEach((p, idx) => {
        if (y + ch > piso) { doc.addPage(); encabezado(false); y = topN; x0 = 0; }
        const x = M + x0 * (cw + gap);
        doc.setDrawColor(230, 225, 222); doc.setLineWidth(.2); doc.roundedRect(x, y, cw, ch, 3, 3, "S");
        if (fotos[idx]) doc.addImage(fotos[idx], "JPEG", x + .6, y + .6, cw - 1.2, cw - 1.2); else { doc.setFillColor(245, 242, 240); doc.rect(x + .6, y + .6, cw - 1.2, cw - 1.2, "F"); }
        doc.setTextColor(40, 40, 40); doc.setFont("helvetica", "bold"); doc.setFontSize(10.5); doc.text(doc.splitTextToSize(p.nombre || p.codigo, cw - 6)[0], x + 3, y + cw + 6);
        doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(120, 120, 120); doc.text(doc.splitTextToSize([p.categoria, p.material].filter(Boolean).join(" · "), cw - 6)[0] || "", x + 3, y + cw + 11);
        if (conPrecio) { doc.setTextColor(col[0], col[1], col[2]); doc.setFont("helvetica", "bold"); if (p.precioVenta != null) { doc.setFontSize(13); doc.text("$" + Math.round(p.precioVenta).toLocaleString("es-MX"), x + 3, y + cw + 19); } else { doc.setFontSize(9); doc.text("Pregunta por precio", x + 3, y + cw + 19); } }
        if (p.disponibles <= 1) { doc.setFontSize(7.5); doc.setFont("helvetica", "bold"); doc.setTextColor(255, 255, 255); doc.setFillColor(col[0], col[1], col[2]); doc.roundedRect(x + 3, y + 3, 22, 5.5, 2.7, 2.7, "F"); doc.text("ÚLTIMA PIEZA", x + 14, y + 6.8, { align: "center" }); }
        n++; x0++; if (x0 === cols) { x0 = 0; y += ch + gap; }
      });
      const tot = doc.getNumberOfPages();
      for (let pg = 1; pg <= tot; pg++) { doc.setPage(pg); doc.setDrawColor(col[0], col[1], col[2]); doc.setLineWidth(.4); doc.line(M, H - 13, W - M, H - 13); doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(col[0], col[1], col[2]); if (pie) doc.text(pie, M, H - 8); doc.setFont("helvetica", "normal"); doc.setTextColor(140, 140, 140); doc.text(pg + " / " + tot, W - M, H - 8, { align: "right" }); }
      const nombreArch = "Catalogo-" + (slugify(neg) || "mi-negocio") + ".pdf"; doc.save(nombreArch); toast("Listo: " + nombreArch); medir("club_catalogo_pdf", { piezas: n });
    } catch (e) { toast("No se pudo armar el PDF: " + (e.message || e), true); }
    finally { btn.disabled = false; btn.innerHTML = txt; }
  }
  $("#cPdf").addEventListener("click", e => descargarPDF(e.currentTarget));
  $("#iPdf").addEventListener("click", e => descargarPDF(e.currentTarget));

  function pintarPerfil() { $("#pNombre").value = S.yo.nombre || ""; $("#pCiudad").value = S.yo.ciudad || ""; $("#pUsuario").value = S.yo.whatsapp || ""; }
  $("#pGuardar").addEventListener("click", async () => { const { error } = await sb.from("clientas").update({ nombre: $("#pNombre").value.trim(), ciudad: $("#pCiudad").value.trim(), actualizado: new Date().toISOString() }).eq("id", S.yo.id); if (error) return toast("No se guardó: " + error.message, true); S.yo.nombre = $("#pNombre").value.trim(); S.yo.ciudad = $("#pCiudad").value.trim(); pintarCabecera(); $("#pOk").classList.add("on"); setTimeout(() => $("#pOk").classList.remove("on"), 3000); });
  $("#nGuardar").addEventListener("click", async () => { const a = $("#n1").value, b = $("#n2").value; if (a.length < 8) return toast("Mínimo 8 caracteres", true); if (a !== b) return toast("Las contraseñas no coinciden", true); const { error } = await sb.auth.updateUser({ password: a }); if (error) return toast("No se cambió: " + error.message, true); $("#n1").value = $("#n2").value = ""; $("#nOk").classList.add("on"); setTimeout(() => $("#nOk").classList.remove("on"), 4000); toast("Contraseña cambiada"); });

  // sesión guardada → entrar directo
  sb.auth.getSession().then(({ data }) => { if (data && data.session) abrir(); });
})();
