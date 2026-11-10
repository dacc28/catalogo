/* Marvea · Mi cuenta (pedidos, Business Club, catálogo, perfil) dentro de la página única · generado desde club.js v6 */
(() => {
  "use strict";
  const SB_URL = "https://kuuewntjxtjjktxbgxfk.supabase.co";
  const SB_KEY = "sb_publishable_o9LoacKHt5UBgIcJPJZa4g_QCbRM2U8"; // clave pública: solo permite lo que las reglas de seguridad autorizan
  const DOMINIO = "club.marveamayoreo.com";
  const BASE = "https://www.marveamayoreo.com/";
  const FN_CUENTA = SB_URL + "/functions/v1/cuenta";
  const $ = (s, el) => (el || document).querySelector(s), $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const mxn = n => "$" + (Math.round(Number(n) || 0)).toLocaleString("es-MX");
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const digitos = w => { const d = String(w || "").replace(/\D/g, ""); if (d.length === 12 && d.startsWith("52")) return d.slice(2); if (d.length === 13 && d.startsWith("521")) return d.slice(3); return d.length >= 10 ? d.slice(-10) : d; };
  const esCorreo = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());
  const fecha = s => { try { return new Date(s).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" }); } catch (e) { return ""; } };
  const slugify = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  const medir = (ev, p) => { try { if (typeof gtag === "function") gtag("event", ev, p || {}); } catch (e) {} };
  const toast = (m, mal) => window.toast(esc(m), mal ? "alerta" : "ok");

  const sb = window.MV_SB;
  const mvF = c => { try { return window.mvFoto ? window.mvFoto(c) : ""; } catch (e) { return ""; } };
  const S = { yo: null, pedidos: [], pedidosWeb: [], ventas: [], precios: {}, inv: [], activo: false };
  async function cuentaApi(body, tok) { const r = await fetch(FN_CUENTA, { method: "POST", headers: { "Content-Type": "application/json", apikey: SB_KEY, Authorization: "Bearer " + (tok || SB_KEY) }, body: JSON.stringify(body) }); let j = {}; try { j = await r.json(); } catch (x) {} if (!r.ok) throw new Error(j.error || ("error " + r.status)); return j; }
  async function loginDe(u) { u = String(u || "").trim(); if (esCorreo(u)) { try { const j = await cuentaApi({ accion: "resolver", usuario: u }); if (j.login) return j.login; } catch (x) {} return u.toLowerCase(); } const d = digitos(u); return d.length === 10 ? d + "@" + DOMINIO : null; }

  /* ---------- acceso: lo maneja mv-tienda.js (una sola sesión) ---------- */
  sb.auth.onAuthStateChange((ev) => { if (ev === "PASSWORD_RECOVERY" || (/[?&]nueva=1/.test(location.search) && ev === "SIGNED_IN")) { setTimeout(() => { try { ir("perfil"); $("#n1").focus(); toast("Escribe tu contraseña nueva y guárdala."); } catch (x) {} }, 1500); } });

  let cargado = false, cargando = null;
  async function abrir(p) {
    $("#cuentaEntrar").classList.remove("on");
    if (!cargado) {
      $("#app").classList.add("on"); $("#cargando").style.display = "block"; $$(".panel").forEach(x => x.classList.remove("on"));
      try { cargando = cargando || cargar(); await cargando; cargado = true; }
      catch (e) { cargando = null; $("#cargando").innerHTML = '<div class="vacio">No pudimos abrir tu cuenta: ' + esc(e.message || e) + '<br><button class="btn" onclick="salir()">Salir y volver a entrar</button></div>'; return; }
      $("#cargando").style.display = "none"; pintarTodo();
    }
    $("#app").classList.add("on"); ir(p || "inicio", true);
    if (window.MV_S && window.MV_S._recuperar) { window.MV_S._recuperar = false; setTimeout(() => { ir("perfil", true); $("#n1").focus(); toast("Escribe tu contraseña nueva y guárdala."); }, 300); }
  }
  function cerrar() { cargado = false; cargando = null; S.yo = null; $("#app").classList.remove("on"); }
  async function recargar() { cargado = false; cargando = null; if (window.MV_S && window.MV_S.vista === "cuenta") await abrir(actual); }

  async function cargar() {
    const { data: yo, error: e1 } = await sb.from("clientas").select("*").limit(1).maybeSingle(); if (e1) throw e1;
    if (!yo) throw new Error("tu usuario aún no está vinculado a una clienta. Avísanos por WhatsApp.");
    const [{ data: ped, error: e2 }, { data: ven, error: e3 }, { data: pre, error: e4 }] = await Promise.all([
      sb.from("pedidos").select("*").order("fecha", { ascending: false }),
      sb.from("ventas").select("*").order("fecha", { ascending: false }),
      sb.from("precios").select("*")]);
    if (e2 || e3 || e4) throw (e2 || e3 || e4);
    S.yo = yo; S.yo.catalogo = yo.catalogo || {}; S.pedidos = ped || []; S.ventas = ven || []; S.precios = {}; (pre || []).forEach(p => S.precios[p.codigo] = p);
    // pedidos de la tienda en línea (pagados) que todavía no pasan por la app: se muestran en Mis pedidos con su estado real
    try {
      const { data: web } = await sb.from("pedidos_web").select("folio,estado,total,piezas,items,entrega,guia,pagado_en,creado,enviado_en,entregado_en").in("estado", ["pagado", "preparando", "enviado", "entregado"]).order("creado", { ascending: false });
      const ya = new Set(S.pedidos.map(p => String(p.titulo || "")));
      S.pedidosWeb = (web || []).filter(w => ![...ya].some(t => t.includes(w.folio))).map(w => ({ id: "web:" + w.folio, web: true, titulo: "Pedido web " + w.folio, fecha: w.pagado_en || w.creado, origen: "web", piezas: w.piezas, total: w.total, estado: w.estado === "pagado" ? "preparando" : w.estado, guia: w.guia || "", items: w.items || [], entrega: w.entrega || {} }));
    } catch (x) { S.pedidosWeb = []; }
    S.activo = S.pedidos.length + S.pedidosWeb.length > 0;
    calcular();
  }

  function calcular() { // inventario por pieza: comprado, vendido, costo promedio, precios de venta
    const m = {};
    for (const p of S.pedidos) for (const it of (p.items || [])) { const c = it.codigo; if (!c) continue; const r = m[c] || (m[c] = { codigo: c, nombre: it.nombre, foto: it.foto, categoria: it.categoria, material: it.material, comprado: 0, costoTotal: 0, vendido: 0, ingresos: 0 }); r.comprado += Number(it.cant) || 0; r.costoTotal += (Number(it.cant) || 0) * (Number(it.precio) || 0); if (!r.foto && it.foto) r.foto = it.foto; }
    for (const v of S.ventas) { const r = m[v.codigo]; if (!r) continue; r.vendido += Number(v.cant) || 0; r.ingresos += (Number(v.cant) || 0) * (Number(v.precio_venta) || 0); }
    S.inv = Object.values(m).map(r => { r.costo = r.comprado ? r.costoTotal / r.comprado : 0; const pr = S.precios[r.codigo]; r.precioVenta = pr && pr.precio_venta != null ? Number(pr.precio_venta) : null; const may = mayoreoCfg(); r.precioMayoreo = may.precios[r.codigo] != null ? Number(may.precios[r.codigo]) : (pr && pr.precio_mayoreo != null ? Number(pr.precio_mayoreo) : null); r.minMayoreo = may.desde; r.visible = pr ? pr.visible !== false : true; r.disponibles = Math.max(0, r.comprado - r.vendido); r.ganancia = r.ingresos - r.vendido * r.costo; return r; }).sort((a, b) => (a.categoria || "").localeCompare(b.categoria || "") || (a.nombre || "").localeCompare(b.nombre || ""));
  }

  /* ---------- pestañas ---------- */
  let actual = "inicio";
  const ir = (p, sinHash) => { if (!$("#p-" + p)) p = "inicio"; if (!S.activo && ["pedidos", "negocio", "catalogo"].includes(p)) { toast("Se activa con tu primera compra"); p = "inicio"; } if (p === "catalogo") pintarCatalogo(); if (p === "inicio") pintarMiniCat(); if (p === "calculadora" && window.calcMontar) window.calcMontar("calcCuenta"); $$("#tabs button").forEach(b => b.classList.toggle("on", b.dataset.p === p)); $$(".panel").forEach(x => x.classList.toggle("on", x.id === "p-" + p)); medir("club_panel", { panel: p }); actual = p; if (window.MV_S) window.MV_S._panel = p; if (!sinHash) { const h = "#/cuenta" + (p === "inicio" ? "" : "/" + p); if (location.hash !== h) history.replaceState(null, "", location.pathname + h); } window.scrollTo({ top: 0, behavior: "smooth" }); };
  $$("#tabs button").forEach(b => b.addEventListener("click", () => ir(b.dataset.p)));
  $$("[data-ir]").forEach(b => b.addEventListener("click", () => ir(b.dataset.ir)));

  function pintarTodo() { pintarCabecera(); $$("#tabs button[data-activo]").forEach(b => b.classList.toggle("off", !S.activo)); $("#bloqueado").style.display = S.activo ? "none" : ""; $("#inicioActivo").style.display = S.activo ? "" : "none"; pintarInicio(); pintarPedidos(); pintarNegocio(); pintarCatalogo(); pintarPerfil(); }

  function pintarCabecera() { const n = S.yo.nombre || "clienta"; $("#avatar").textContent = n.trim().charAt(0).toUpperCase() || "M"; $("#hola2").textContent = "Hola, " + n.split(" ")[0]; $("#subtitulo").textContent = (S.yo.catalogo.nombre || S.yo.negocio || "Marvea Business Club") + (S.yo.ciudad ? " · " + S.yo.ciudad : ""); }

  function estadoChip(p) { const e = p.estado || "preparando"; return e === "entregado" ? '<span class="chip ent"><i class="fa-solid fa-check"></i> Entregado</span>' : e === "enviado" ? '<span class="chip env"><i class="fa-solid fa-truck-fast"></i> En camino</span>' : '<span class="chip prep"><i class="fa-solid fa-box"></i> Preparando</span>'; }
  function origenChip(p) { if (p.origen === "web") return '<span class="chip wa"><i class="fa-solid fa-bag-shopping"></i> Tienda en línea</span>'; return p.origen === "whatsapp" ? '<span class="chip wa"><i class="fa-brands fa-whatsapp"></i> WhatsApp</span>' : '<span class="chip live"><i class="fa-solid fa-video"></i> Live</span>'; }
  function piezaHTML(it) { return '<div class="pz">' + ((it.foto = it.foto || mvF(it.codigo)) ? '<img src="' + esc(it.foto) + '" alt="" loading="lazy">' : '<img src="logo-m.png" alt="">') + '<div class="t"><b>' + esc(it.nombre || it.codigo) + '</b><span>' + (Number(it.cant) || 0) + ' pza' + (Number(it.cant) === 1 ? "" : "s") + ' · ' + mxn(it.precio) + ' c/u</span></div></div>'; }

  function pintarInicio() {
    const todos = [...(S.pedidosWeb || []), ...S.pedidos];
    const piezas = todos.reduce((s, p) => s + (Number(p.piezas) || 0), 0), inv = todos.reduce((s, p) => s + (Number(p.total) || 0), 0);
    const vend = S.inv.reduce((s, r) => s + r.vendido, 0), disp = S.inv.reduce((s, r) => s + r.disponibles, 0), ing = S.inv.reduce((s, r) => s + r.ingresos, 0), gan = S.inv.reduce((s, r) => s + r.ganancia, 0);
    $("#kPiezas").textContent = piezas; $("#kPedidos").textContent = todos.length + (todos.length === 1 ? " pedido" : " pedidos");
    $("#kInvertido").innerHTML = mxn(inv) + " <em>MXN</em>"; $("#kVendidas").textContent = vend; $("#kDisponibles").textContent = disp + " disponibles para vender";
    $("#kGanancia").innerHTML = mxn(gan) + " <em>MXN</em>"; $("#kIngresos").textContent = mxn(ing) + " en ventas registradas";
    const u = todos[0];
    if (u) { $("#uDesc").textContent = (u.titulo || "Pedido") + " · " + fecha(u.fecha) + " · " + (u.piezas || 0) + " piezas · " + mxn(u.total) + " MXN"; $("#uEstado").innerHTML = estadoChip(u); $("#uPiezas").innerHTML = (u.items || []).slice(0, 4).map(piezaHTML).join(""); }
    else { $("#uDesc").textContent = "Todavía no tienes pedidos. Cuando pagues tu primera compra, aparecerá aquí."; $("#uEstado").innerHTML = ""; $("#uPiezas").innerHTML = ""; }
    pintarMiniCat();
  }
  const abrirRastreo = g => { g = String(g || "").trim(); if (!g) { toast("Escribe tu número de guía", true); $("#guiaRapida").focus(); return; } const u = rastreoDe(/^(fedex|estafeta|paquetexpress|otra)\s/i.test(g) ? g : g.replace(/\s+/g, "")); if (!u) return toast("Esa paquetería se rastrea en su propia página: " + g, true); window.open(u, "_blank", "noopener"); medir("club_rastrear"); };
  $("#rastreoClub").addEventListener("submit", e => { e.preventDefault(); abrirRastreo($("#guiaRapida").value); });
  function rastreoDe(g) { // la guía que pone Marvea: "1234" (DHL), "FedEx 1234", "Estafeta 1234"...
    g = String(g || "").trim(); if (!g) return ""; const m = g.match(/^(fedex|estafeta|paquetexpress|otra)\s+(.+)$/i);
    if (!m) return "https://www.dhl.com/mx-es/home/tracking.html?tracking-id=" + encodeURIComponent(g) + "&submit=1";
    if (m[1].toLowerCase() === "fedex") return "https://www.fedex.com/fedextrack/?trknbr=" + encodeURIComponent(m[2]);
    return ""; }
  function pintarPedidos() {
    const box = $("#listaPedidos"); box.innerHTML = "";
    const todos = [...(S.pedidosWeb || []), ...S.pedidos];
    // una sola barra para rastrear: debajo, un botón por cada pedido que ya tiene guía (un clic y abre el rastreo)
    // un paquete = una guía: si varios pedidos salieron juntos se muestra una sola guía para todos
    const porGuia = new Map(); for (const p of todos) { const g = (p.guia || "").trim(); if (!g) continue; if (!porGuia.has(g)) porGuia.set(g, []); porGuia.get(g).push(p); }
    const guias = [...porGuia.entries()];
    $("#guiasRap").innerHTML = guias.length ? '<span class="gr-t">Tus guías:</span>' + guias.slice(0, 6).map(([g, ps], i) => { const enCamino = ps.some(p => p.estado !== "entregado"); const p = ps[0];
      const tit = ps.length > 1 ? ps.length + " pedidos · un solo paquete" : (p.web ? p.titulo.replace("Pedido web ", "Web ") : fecha(p.fecha));
      return '<button type="button" class="g-chip' + (enCamino ? " camino" : "") + '" data-i="' + i + '"><i class="fa-solid ' + (enCamino ? "fa-truck-fast" : "fa-check") + '"></i><span><b>' + esc(tit) + '</b><small>' + esc(g) + ' · ' + (enCamino ? "en camino" : "entregado") + '</small></span><i class="fa-solid fa-arrow-up-right-from-square"></i></button>'; }).join("") : "";
    $$("#guiasRap .g-chip").forEach(b => b.addEventListener("click", () => { const g = guias[Number(b.dataset.i)][0]; $("#guiaRapida").value = g; abrirRastreo(g); }));
    if (!todos.length) { box.innerHTML = '<div class="vacio"><b>Aún no hay pedidos</b>En cuanto pagues tu primera compra en la tienda en línea (o te la confirmemos por WhatsApp), la verás aquí con sus fotos, su estado y su guía.</div>'; return; }
    for (const p of todos) {
      const el = document.createElement("div"); el.className = "vidrio suave ped";
      const guia = (p.guia || "").trim(), ent = p.entrega || {}; const juntos = guia ? (porGuia.get(guia) || []) : [];
      const tipo = p.web ? (ent.tipo === "recoger" ? '<i class="fa-solid fa-store"></i> Recoges en Monterrey' : ent.resguardar ? '<i class="fa-solid fa-box-archive"></i> En resguardo (sale cuando tú lo pidas)' : '<i class="fa-solid fa-plane-up"></i> Envío DHL Express') : '<i class="fa-solid fa-truck-fast"></i> Envío';
      const guiaTx = guia ? '<button type="button" class="g-link" title="Rastrear este envío">Guía <b>' + esc(guia) + '</b> <i class="fa-solid fa-arrow-up-right-from-square"></i></button>'
        : '<span class="g-sin">' + (p.estado === "entregado" ? "" : (p.web && ent.tipo === "recoger" ? "Te avisamos por WhatsApp para la entrega" : "Tu guía aparece aquí cuando salga tu paquete")) + '</span>';
      el.innerHTML = '<div class="top"><div><b>' + esc(p.titulo || "Pedido") + '</b><small>' + fecha(p.fecha) + ' · ' + (p.piezas || 0) + ' piezas · ' + mxn(p.total) + ' MXN' + (p.web ? ' · pagado' : '') + '</small></div><div class="der">' + origenChip(p) + estadoChip(p) + '</div></div>'
        + '<div class="pzs">' + (p.items || []).map(piezaHTML).join("") + '</div>'
        + (!p.web && !guia && p.estado === "entregado" ? '' : '<div class="ped-pie"><span class="tipo">' + tipo + '</span>' + guiaTx + (!p.web && p.estado !== "entregado" ? '<button class="btn cristal sm recibido"><i class="fa-solid fa-check"></i> Ya lo recibí</button>' : '') + '</div>')
        + (juntos.length > 1 ? '<div class="ped-junto"><i class="fa-solid fa-box-open"></i> Viaja en el mismo paquete que ' + (juntos.length === 2 ? 'tu otro pedido' : 'tus otros ' + (juntos.length - 1) + ' pedidos') + ': una sola guía para ' + (juntos.length === 2 ? 'los dos' : 'los ' + juntos.length) + '.</div>' : '');
      const gl = $(".g-link", el); if (gl) gl.addEventListener("click", () => abrirRastreo(guia));
      const r = $(".recibido", el); r && r.addEventListener("click", async () => { const mismos = juntos.filter(x => !x.web && x.estado !== "entregado"); const ids = mismos.length > 1 ? mismos.map(x => x.id) : [p.id]; // mismo paquete: se marcan todos
        const { error } = await sb.from("pedidos").update({ estado: "entregado" }).in("id", ids); if (error) return toast("No se guardó: " + error.message, true); for (const x of (mismos.length > 1 ? mismos : [p])) x.estado = "entregado"; toast(ids.length > 1 ? "¡Qué bien! Tus " + ids.length + " pedidos quedaron como entregados" : "¡Qué bien! Pedido entregado"); pintarPedidos(); pintarInicio(); });
      box.append(el);
    }
  }

  /* ---------- Mis precios y ventas: menudeo, mayoreo (desde N piezas, igual para todas), ventas registradas ----------
     Menudeo y "visible" van en la tabla precios. El precio de mayoreo de cada pieza y el "desde N piezas" van en
     clientas.catalogo.mayoreo = { desde, precios: { codigo: precio } } (la tabla precios no tiene esas columnas). */
  const mayoreoCfg = () => { const m = (S.yo && S.yo.catalogo && S.yo.catalogo.mayoreo) || {}; return { desde: Math.max(2, Math.min(99, Math.round(Number(m.desde) || 3))), precios: Object.assign({}, m.precios || {}) }; };
  let colaMay = Promise.resolve(true);
  function guardarMayoreo(parcial) { // se guarda en orden (una escritura a la vez) y siempre con lo último
    const m = mayoreoCfg(); S.yo.catalogo = Object.assign({}, S.yo.catalogo, { mayoreo: { desde: parcial.desde != null ? parcial.desde : m.desde, precios: parcial.precios || m.precios } });
    const run = async () => { const { error } = await sb.from("clientas").update({ catalogo: S.yo.catalogo }).eq("id", S.yo.id); if (error) { toast("No se guardó: " + error.message, true); return false; } return true; };
    colaMay = colaMay.then(run, run); return colaMay;
  }
  function ganDe(r, pv) { const pp = pv == null || isNaN(pv) ? null : pv - r.costo; return { pp, potencial: pp == null ? 0 : pp * r.disponibles }; }
  function ganHTML(r, pv, pm) { const g = ganDe(r, pv);
    const gm = pm != null && !isNaN(pm) ? pm - r.costo : null;
    const lineaMay = gm != null ? '<small class="gmay">' + mxn(gm) + ' c/u en mayoreo</small>' : '';
    if (g.pp == null) return '<span class="gsin">Pon tu precio</span>' + lineaMay + (r.vendido ? '<small class="ya">Ya ganaste ' + mxn(r.ganancia) + '</small>' : '');
    return '<b class="' + (g.pp < 0 ? "neg" : "") + '">' + mxn(g.pp) + ' <i>c/u menudeo</i></b>' + lineaMay + (r.disponibles ? '<small>Si vendes ' + (r.disponibles === 1 ? "la que queda" : "las " + r.disponibles) + ': <b style="display:inline">' + mxn(g.potencial) + '</b></small>' : '') + (r.vendido ? '<small class="ya">Ya ganaste ' + mxn(r.ganancia) + '</small>' : ''); }
  function pintarResumenNegocio() {
    const disp = S.inv.reduce((s, r) => s + r.disponibles, 0), gan = S.inv.reduce((s, r) => s + r.ganancia, 0), ing = S.inv.reduce((s, r) => s + r.ingresos, 0);
    const pot = S.inv.reduce((s, r) => s + ganDe(r, r.precioTmp !== undefined ? r.precioTmp : r.precioVenta).potencial, 0);
    const sinPrecio = S.inv.filter(r => (r.precioTmp !== undefined ? r.precioTmp : r.precioVenta) == null && r.disponibles > 0).length;
    $("#resumenNegocio").innerHTML = '<span class="chip"><i class="fa-solid fa-gem"></i> ' + disp + ' piezas disponibles</span><span class="chip"><i class="fa-solid fa-sack-dollar"></i> ' + mxn(ing) + ' vendidos</span><span class="chip prep"><i class="fa-solid fa-arrow-trend-up"></i> ' + mxn(gan) + ' de ganancia ya hecha</span><span class="chip ent"><i class="fa-solid fa-coins"></i> ' + mxn(pot) + ' más si vendes lo que te queda</span><span class="chip total"><i class="fa-solid fa-star"></i> Ganancia total: ' + mxn(gan + pot) + '</span>' + (sinPrecio ? '<span class="chip"><i class="fa-solid fa-tag"></i> ' + sinPrecio + ' sin precio de venta</span>' : "");
  }
  async function guardarPrecio(r, cambios) {
    if ("precio_mayoreo" in cambios) { const m = mayoreoCfg(); const v = cambios.precio_mayoreo; if (v == null) delete m.precios[r.codigo]; else m.precios[r.codigo] = v; r.precioMayoreo = v; return guardarMayoreo({ precios: m.precios }); }
    const fila = { clienta_id: S.yo.id, codigo: r.codigo, precio_venta: "precio_venta" in cambios ? cambios.precio_venta : r.precioVenta, visible: "visible" in cambios ? cambios.visible : r.visible };
    const { error } = await sb.from("precios").upsert(fila); if (error) { toast("No se guardó: " + error.message, true); return false; }
    S.precios[r.codigo] = Object.assign({}, S.precios[r.codigo], fila); r.precioVenta = fila.precio_venta; r.visible = fila.visible !== false; return true;
  }
  async function cancelarVenta(v) {
    const r = S.inv.find(x => x.codigo === v.codigo) || {}; if (!confirm("¿Cancelar esta venta?\n" + (r.nombre || v.codigo) + " · " + v.cant + " × " + mxn(v.precio_venta) + "\nLa pieza vuelve a tu inventario.")) return;
    const { error } = await sb.from("ventas").delete().eq("id", v.id); if (error) return toast("No se pudo cancelar: " + error.message, true);
    S.ventas = S.ventas.filter(x => x.id !== v.id); calcular(); pintarNegocio(); pintarInicio(); toast("Venta cancelada · la pieza regresó a tu inventario");
  }
  function pintarVentasHechas() {
    let box = $("#ventasHechas"); if (!box) { box = document.createElement("div"); box.id = "ventasHechas"; box.className = "ventas-hechas"; $("#invVacio").parentNode.insertBefore(box, $("#invVacio").nextSibling); }
    const vs = S.ventas.slice(0, 40); if (!vs.length) { box.innerHTML = ""; return; }
    const nom = c => { const r = S.inv.find(x => x.codigo === c); return r ? (r.nombre || c) : c; };
    box.innerHTML = '<h3>Ventas que registraste</h3><p>¿Te equivocaste? Cancela la venta y la pieza regresa a tu inventario.</p><div class="vh-lista"></div>';
    const lista = $(".vh-lista", box);
    for (const v of vs) { const el = document.createElement("div"); el.className = "vh";
      el.innerHTML = '<div><b>' + esc(nom(v.codigo)) + '</b><span>' + fecha(v.fecha || v.creado) + ' · ' + v.cant + ' × ' + mxn(v.precio_venta) + '</span></div><b>' + mxn((Number(v.cant) || 0) * (Number(v.precio_venta) || 0)) + '</b><button class="btn cristal sm cancelar"><i class="fa-solid fa-rotate-left"></i> Cancelar</button>';
      $(".cancelar", el).addEventListener("click", () => cancelarVenta(v)); lista.append(el); }
  }
  const filaGan = new Map(); // codigo → función que repinta la ganancia de su fila (para cuando cambia "desde N piezas")
  function pintarNegocio() {
    const tb = $("#tablaInv tbody"); tb.innerHTML = ""; filaGan.clear(); $("#invVacio").style.display = S.inv.length ? "none" : "block"; $("#tablaInv").closest(".tabla-wrap").style.display = S.inv.length ? "" : "none"; $("#rapidos").style.display = S.inv.length ? "" : "none";
    const desde = mayoreoCfg().desde; if (document.activeElement !== $("#minMayoreo")) $("#minMayoreo").value = desde;
    for (const r of S.inv) { delete r.precioTmp; r.minMayoreo = desde; }
    pintarResumenNegocio();
    for (const r of S.inv) {
      const tr = document.createElement("tr"); if (!r.disponibles) tr.className = "agotado";
      const ultima = S.ventas.find(v => v.codigo === r.codigo);
      tr.innerHTML = '<td><div class="pcell">' + ((r.foto = r.foto || mvF(r.codigo)) ? '<img src="' + esc(r.foto) + '" alt="" loading="lazy">' : '<img src="logo-m.png" alt="">') + '<div><b>' + esc(r.nombre || r.codigo) + '</b><span>' + esc(r.codigo) + (r.material ? ' · ' + esc(r.material) : '') + ' · compraste ' + r.comprado + ', vendiste ' + r.vendido + '</span></div></div></td>'
        + '<td><b>' + r.disponibles + '</b></td><td>' + mxn(r.costo) + '</td>'
        + '<td><span class="inp">$<input type="number" min="0" step="1" inputmode="numeric" class="precio" value="' + (r.precioVenta == null ? "" : Math.round(r.precioVenta)) + '" placeholder="' + Math.round(r.costo * 2) + '"></span></td>'
        + '<td><span class="inp">$<input type="number" min="0" step="1" inputmode="numeric" class="mayoreo" value="' + (r.precioMayoreo == null ? "" : Math.round(r.precioMayoreo)) + '" placeholder="' + Math.round(r.costo * 1.5) + '"></span><small class="desde-hint">desde <b>' + r.minMayoreo + '</b> pzas</small></td>'
        + '<td class="gan">' + ganHTML(r, r.precioVenta, r.precioMayoreo) + '</td>'
        + '<td><div class="vender-box"><span class="inp"><input type="number" min="1" max="' + (r.disponibles || 1) + '" step="1" inputmode="numeric" class="cant" value="1" style="width:40px"></span><button class="ico vender" title="Registrar venta"' + (r.disponibles ? "" : " disabled") + '><i class="fa-solid fa-plus"></i></button>' + (ultima ? '<button class="ico deshacer" title="Cancelar la última venta de esta pieza"><i class="fa-solid fa-rotate-left"></i></button>' : '') + '</div></td>'
        + '<td><button class="ico visible' + (r.visible ? "" : " off") + '" title="' + (r.visible ? "Visible en tu catálogo" : "Oculta en tu catálogo") + '"><i class="fa-regular ' + (r.visible ? "fa-eye" : "fa-eye-slash") + '"></i></button></td>';
      const precioIn = $(".precio", tr), mayIn = $(".mayoreo", tr);
      const num = i => i.value === "" ? null : Math.max(0, Number(i.value));
      const repGan = () => { $(".gan", tr).innerHTML = ganHTML(r, r.precioTmp !== undefined ? r.precioTmp : r.precioVenta, num(mayIn)); $(".desde-hint b", tr).textContent = r.minMayoreo; };
      filaGan.set(r.codigo, repGan);
      precioIn.addEventListener("input", () => { r.precioTmp = num(precioIn); repGan(); pintarResumenNegocio(); });
      precioIn.addEventListener("change", async () => { if (await guardarPrecio(r, { precio_venta: num(precioIn) })) { delete r.precioTmp; repGan(); pintarResumenNegocio(); toast("Precio de menudeo guardado"); } });
      mayIn.addEventListener("input", repGan);
      mayIn.addEventListener("change", async () => { if (await guardarPrecio(r, { precio_mayoreo: num(mayIn) })) { repGan(); toast(num(mayIn) == null ? "Precio de mayoreo quitado" : "Precio de mayoreo guardado"); } });
      $(".visible", tr).addEventListener("click", async () => { if (await guardarPrecio(r, { visible: !r.visible })) { calcular(); pintarNegocio(); pintarMiniCat(); } });
      const dz = $(".deshacer", tr); if (dz) dz.addEventListener("click", () => cancelarVenta(ultima));
      $(".vender", tr).addEventListener("click", async () => {
        const cant = Math.max(1, Math.min(r.disponibles, Number($(".cant", tr).value) || 1)); let pv = num(precioIn); const pm = num(mayIn);
        const porMayoreo = pm != null && cant >= r.minMayoreo; if (porMayoreo) pv = pm; // venta por mayoreo
        if (pv == null) { const s = prompt("¿A cuánto vendiste cada pieza?", Math.round(r.costo * 2)); if (s == null) return; pv = Number(s) || 0; precioIn.value = pv; precioIn.dispatchEvent(new Event("change")); }
        const { data, error } = await sb.from("ventas").insert({ clienta_id: S.yo.id, codigo: r.codigo, cant, precio_venta: pv }).select().single(); if (error) return toast("No se registró: " + error.message, true);
        S.ventas.unshift(data); calcular(); pintarNegocio(); pintarInicio(); toast("Venta registrada: " + cant + " × " + mxn(pv) + (porMayoreo ? " (precio de mayoreo)" : "") + " · si te equivocaste, puedes cancelarla"); medir("club_venta");
      });
      tb.append(tr);
    }
    pintarVentasHechas();
  }
  // rellenar de un golpe solo los precios vacíos (para no pisar lo que ya puso): una sola escritura por botón
  $$("#rapidos [data-mult],#rapidos [data-multm]").forEach(b => b.addEventListener("click", async () => {
    const m = Number(b.dataset.mult || b.dataset.multm), esMay = !!b.dataset.multm;
    const vacias = S.inv.filter(r => r.disponibles && (esMay ? r.precioMayoreo == null : r.precioVenta == null));
    if (!vacias.length) return toast("Todas tus piezas ya tienen precio de " + (esMay ? "mayoreo" : "menudeo") + "; cámbialo pieza por pieza.");
    b.disabled = true; let ok;
    if (esMay) { const cfg = mayoreoCfg(); vacias.forEach(r => cfg.precios[r.codigo] = Math.round(r.costo * m)); ok = await guardarMayoreo({ precios: cfg.precios }); }
    else { const filas = vacias.map(r => ({ clienta_id: S.yo.id, codigo: r.codigo, precio_venta: Math.round(r.costo * m), visible: r.visible })); const { error } = await sb.from("precios").upsert(filas); if (error) toast("No se guardó: " + error.message, true); else filas.forEach(f => S.precios[f.codigo] = Object.assign({}, S.precios[f.codigo], f)); ok = !error; }
    b.disabled = false; if (!ok) return;
    calcular(); pintarNegocio(); pintarInicio(); toast("Listo: " + vacias.length + " precios de " + (esMay ? "mayoreo" : "menudeo") + " puestos (×" + m + "). Puedes ajustar cada uno.");
  }));
  // "Mayoreo desde N piezas": aplica a todas las piezas; se ve al instante y se guarda una sola vez
  let tMin = null;
  function ponerDesde(v, guardar) {
    v = Math.max(2, Math.min(99, Math.round(Number(v) || 3))); $("#minMayoreo").value = v;
    S.yo.catalogo = Object.assign({}, S.yo.catalogo, { mayoreo: Object.assign(mayoreoCfg(), { desde: v }) });
    S.inv.forEach(r => r.minMayoreo = v); filaGan.forEach(f => f());
    clearTimeout(tMin); if (guardar) tMin = setTimeout(async () => { if (await guardarMayoreo({ desde: v })) toast("Listo: precio de mayoreo desde " + v + " piezas"); }, 700);
  }
  $$("#minMayoreoBox [data-d]").forEach(b => b.addEventListener("click", () => ponerDesde((Number($("#minMayoreo").value) || 3) + Number(b.dataset.d), true)));
  $("#minMayoreo").addEventListener("input", () => { if ($("#minMayoreo").value !== "") ponerDesde($("#minMayoreo").value, true); });
  $("#minMayoreo").addEventListener("change", () => ponerDesde($("#minMayoreo").value, true));

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
    colorSel = c.color || COLORES[1];
    $("#cColores").innerHTML = COLORES.map(x => '<button type="button" style="background:' + x + '" data-c="' + x + '" class="' + (x === colorSel ? "on" : "") + '" aria-label="Color ' + x + '"></button>').join("");
    $$("#cColores button").forEach(b => b.onclick = () => { colorSel = b.dataset.c; $$("#cColores button").forEach(x => x.classList.toggle("on", x === b)); });
    pintarLogo(); pintarMiniCat();
    const p = piezasCat(), sinPrecio = p.filter(r => r.precioVenta == null).length;
    $("#cResumen").innerHTML = '<span class="chip"><i class="fa-solid fa-gem"></i> ' + p.length + ' piezas entrarán al PDF</span>' + (sinPrecio ? '<span class="chip prep"><i class="fa-solid fa-tag"></i> ' + sinPrecio + ' sin precio: saldrán como "Pregunta por precio" (ponlo en Mis precios)</span>' : "");
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
  async function fotoCuadrada(src, lado) {
    try { const i = await cargarImg(src); const cv = document.createElement("canvas"); cv.width = cv.height = lado; const g = cv.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, lado, lado);
      const s2 = Math.min(i.width, i.height); g.drawImage(i, (i.width - s2) / 2, (i.height - s2) / 2, s2, s2, 0, 0, lado, lado); return cv.toDataURL("image/jpeg", .82); } catch (e) { return null; }
  }
  const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const telFmt = d => d && d.length === 10 ? d.slice(0, 2) + " " + d.slice(2, 6) + " " + d.slice(6) : d;
  async function descargarPDF(btn) {
    if (!window.jspdf) return toast("No se pudo cargar el generador de PDF. Recarga la página.", true);
    if (document.querySelector("#p-catalogo.on")) { if (!(await guardarCat(null, true))) return; }
    const piezas = piezasCat(); if (!piezas.length) return toast("No tienes piezas disponibles para el catálogo", true);
    const c = S.yo.catalogo || {}, modo = (document.querySelector('input[name=pm]:checked') || {}).value || "mios", conPrecio = modo !== "sin", conMayoreo = modo === "mios";
    const txt = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Armando tu PDF…';
    try {
      const { jsPDF } = window.jspdf; const doc = new jsPDF({ unit: "mm", format: "a4" }); const W = 210, H = 297, M = 12;
      const col = hexRgb(c.color || COLORES[1]); const neg = c.nombre || S.yo.negocio || S.yo.nombre || "Mi catálogo";
      const wa = telFmt(digitos(c.whatsapp || S.yo.whatsapp || "")); const pie = [wa ? "Pedidos por WhatsApp: " + wa : "", c.redes || ""].filter(Boolean).join("   ·   ");
      const fotos = await Promise.all(piezas.map(p => p.foto ? fotoCuadrada(p.foto, 520) : Promise.resolve(null)));
      let logo = null, lw = 0, lh = 0; if (c.logo) { try { const pr = doc.getImageProperties(c.logo); const k = Math.min(30 / pr.width, 30 / pr.height); lw = pr.width * k; lh = pr.height * k; logo = c.logo; } catch (e) {} }
      const cols = 3, gap = 6, cw = (W - 2 * M - gap * (cols - 1)) / cols, ch = cw + (conMayoreo ? 29 : 24), top0 = 56, topN = 18, piso = H - 18;
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
        if (conPrecio) { doc.setTextColor(col[0], col[1], col[2]); doc.setFont("helvetica", "bold");
          if (p.precioVenta != null) { doc.setFontSize(13); doc.text("$" + Math.round(p.precioVenta).toLocaleString("es-MX"), x + 3, y + cw + 19);
            if (conMayoreo && p.precioMayoreo != null) { doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(90, 90, 90); doc.text("Mayoreo desde " + p.minMayoreo + " pzas: $" + Math.round(p.precioMayoreo).toLocaleString("es-MX"), x + 3, y + cw + 24.5); } }
          else { doc.setFontSize(9); doc.text("Pregunta por precio", x + 3, y + cw + 19); } }
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

  /* ---------- perfil ---------- */
  const TEL_ACTIVO = false; // true cuando Twilio Verify esté configurado (Secrets TWILIO_*)
  async function telAccion(accion, extra) { const { data: ses } = await sb.auth.getSession(); const tok = ses && ses.session ? ses.session.access_token : SB_KEY; return cuentaApi(Object.assign({ accion }, extra || {}), tok); }
  function pintarVerif() { const v = !!S.yo.tel_verificado; $("#pVerif").textContent = v ? "· WhatsApp verificado ✓" : ""; const box = $("#pVerifBox"); box.style.display = (!v && TEL_ACTIVO && S.yo.whatsapp) ? "flex" : "none"; }
  $("#pVerifEnviar").addEventListener("click", async () => { try { const j = await telAccion("tel-enviar", { canal: "whatsapp" }); toast(j.mensaje || "Código enviado"); $("#pVerifCodigo").style.display = ""; $("#pVerifOk").style.display = ""; $("#pVerifCodigo").focus(); } catch (x) { toast(String(x.message || x), true); } });
  $("#pVerifOk").addEventListener("click", async () => { try { const j = await telAccion("tel-verificar", { codigo: $("#pVerifCodigo").value }); toast(j.mensaje || "Verificado"); S.yo.tel_verificado = true; pintarVerif(); } catch (x) { toast(String(x.message || x), true); } });
  async function pintarPerfil() {
    pintarVerif(); $("#pNombre").value = S.yo.nombre || ""; $("#pWa").value = S.yo.whatsapp || ""; $("#pCiudad").value = S.yo.ciudad || ""; $("#pMail").value = S.yo.correo || ""; $("#pNegocio").value = S.yo.negocio || ""; $("#pDir").value = S.yo.direccion || ""; $("#pEstado").value = S.yo.estado || ""; $("#pCp").value = S.yo.cp || ""; $("#pRef").value = S.yo.referencias || "";
    try { const { data } = await sb.auth.getUser(); const u = data && data.user; const provs = (u && u.app_metadata && u.app_metadata.providers) || []; const login = u && u.email ? (u.email.endsWith("@" + DOMINIO) ? u.email.split("@")[0] + " (WhatsApp)" : u.email) : S.yo.whatsapp;
      $("#pUsuario").value = login || ""; const g = provs.includes("google"); $("#gEstado").textContent = g ? "Tu Google ya está ligado: puedes entrar con él o con tu contraseña." : "Liga tu Google para entrar con un clic, además de tu contraseña."; $("#gLigar").style.display = g ? "none" : ""; } catch (x) {}
  }
  $("#gLigar").addEventListener("click", async () => { try { const { error } = await sb.auth.linkIdentity({ provider: "google", options: { redirectTo: BASE + "club.html" } }); if (error) throw error; } catch (x) { toast("Para ligar Google, sal y entra con el botón 'Continuar con Google' usando este mismo WhatsApp.", true); } });
  $("#pGuardar").addEventListener("click", async () => { const v = id => $("#" + id).value.trim(); const wa = digitos(v("pWa")); if (v("pWa") && wa.length !== 10) return toast("Tu WhatsApp debe tener 10 dígitos", true); if (v("pMail") && !esCorreo(v("pMail"))) return toast("Revisa tu correo", true);
    const cambios = { nombre: v("pNombre"), whatsapp: wa, ciudad: v("pCiudad"), correo: v("pMail").toLowerCase(), negocio: v("pNegocio"), direccion: v("pDir"), estado: v("pEstado"), cp: v("pCp"), referencias: v("pRef"), actualizado: new Date().toISOString() };
    const { error } = await sb.from("clientas").update(cambios).eq("id", S.yo.id); if (error) return toast("No se guardó: " + error.message, true); Object.assign(S.yo, cambios); pintarCabecera(); $("#pOk").classList.add("on"); setTimeout(() => $("#pOk").classList.remove("on"), 3000); toast("Datos guardados"); });
  $("#nGuardar").addEventListener("click", async () => { const a = $("#n1").value, b = $("#n2").value; if (a.length < 8) return toast("Mínimo 8 caracteres", true); if (a !== b) return toast("Las contraseñas no coinciden", true); const { error } = await sb.auth.updateUser({ password: a }); if (error) return toast("No se cambió: " + error.message, true); $("#n1").value = $("#n2").value = ""; $("#nOk").classList.add("on"); setTimeout(() => $("#nOk").classList.remove("on"), 4000); toast("Contraseña cambiada"); });

  window.MVCuenta = { abrir, cerrar, ir: p => ir(p), recargar };
})();
