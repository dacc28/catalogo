/* MARVEA · PAUSA DE LA TIENDA EN LÍNEA POR VENTAS EN LIVE (13-nov-2026)
   Se enciende y se apaga desde el sistema: Tienda en línea › «Pausar tienda en línea» (documento config/tiendaPausa en la nube).
   Mientras está pausada el catálogo se sigue viendo, pero no se pueden agregar piezas ni pagar, y la página muestra
   «Compras Online Pausadas por Ventas en Live» con los links del live que se hayan llenado (de 1 a 3; los vacíos no salen).
   El servidor también lo impide (stripe/pausa_tienda.sql), así que una página vieja abierta tampoco puede comprar.
   Si este archivo falla o la nube no contesta, la tienda queda como siempre. Prueba de vista: ?pausa=1 */
(function(){
  if(typeof CUENTA==='undefined'||typeof S==='undefined'||!window.fetch) return;
  var FN=CUENTA.url+'/rest/v1/rpc/marvea_web_pausa', KEY=CUENTA.anon, CADA=20000;
  var FRASE='Compras Online Pausadas por Ventas en Live';
  var q=/[?&]pausa=([01])/.exec(location.search), forzar=!!(q&&q[1]==='1');
  var P={on:false,links:[],desde:'',listo:false}, pidiendo=false, tAviso=null;
  var H=document.documentElement;
  function e(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }

  /* ---------- links: solo http/https, máximo 3, sin repetidos ---------- */
  function limpiar(l){ var o=[]; (Array.isArray(l)?l:[]).forEach(function(x){ x=String(x||'').trim(); if(!/^https?:\/\/[^\s<>"']{8,400}$/i.test(x)) return;
      try{ var u=new URL(x); if(u.protocol!=='https:'&&u.protocol!=='http:') return; x=u.href; }catch(_){ return; } if(o.indexOf(x)<0&&o.length<3) o.push(x); }); return o; }
  function red(u){ var h=''; try{ h=new URL(u).hostname.toLowerCase(); }catch(_){}
    if(/(^|\.)(facebook|fb)\.(com|watch|me|gg)$/.test(h)) return ['Facebook','fa-brands fa-facebook'];
    if(/(^|\.)tiktok\.com$/.test(h)) return ['TikTok','fa-brands fa-tiktok'];
    if(/(^|\.)instagram\.com$/.test(h)) return ['Instagram','fa-brands fa-instagram'];
    if(/(^|\.)(youtube\.com|youtu\.be)$/.test(h)) return ['YouTube','fa-brands fa-youtube'];
    if(/(^|\.)(whatsapp\.com|wa\.me)$/.test(h)) return ['WhatsApp','fa-brands fa-whatsapp'];
    return ['','fa-solid fa-tower-broadcast']; }
  function botones(cls){ var n={}, rs=P.links.map(red); rs.forEach(function(r){ n[r[0]]=(n[r[0]]||0)+1; }); var k={};
    return P.links.map(function(u,i){ var r=rs[i]; k[r[0]]=(k[r[0]]||0)+1; var t=(r[0]?'Ver live en '+r[0]:'Ver el live')+(n[r[0]]>1?' '+k[r[0]]:'');
      return '<a class="'+cls+'" href="'+e(u)+'" target="_blank" rel="noopener"><i class="'+r[1]+'"></i><span>'+t+'</span></a>'; }).join(''); }

  /* ---------- lo que se ve ---------- */
  function barra(){ var b=document.getElementById('mvpBar'), top=document.querySelector('header.top');
    if(!P.on){ if(b) b.remove(); return; } if(!top) return;
    if(!b){ b=document.createElement('div'); b.id='mvpBar'; b.className='mvp-bar'; b.setAttribute('role','status'); top.insertBefore(b,top.firstChild); }
    b.className='mvp-bar'+(P.links.length>1?' varios':''); // en celular, con 2 o 3 links sale un solo botón «Ver lives» que abre el aviso con todos
    b.innerHTML='<button type="button" class="mvp-tx" onclick="mvPausaAviso()"><span class="mvp-dot" aria-hidden="true"></span><b>'+FRASE+'</b></button>'+(P.links.length?'<span class="mvp-ls">'+botones('mvp-l')+'</span><button type="button" class="mvp-l mvp-ver" onclick="mvPausaAviso()"><i class="fa-solid fa-tower-broadcast"></i><span>Ver lives</span></button>':''); }
  function avisoHTML(){ var hay=false; try{ hay=pzs()>0; }catch(_){}
    return '<div class="mvp-m" id="mvpM"><button class="x-btn" onclick="cerrarModal()" aria-label="cerrar">✕</button>'
      +'<div class="mvp-ic" aria-hidden="true"><i class="fa-solid fa-tower-broadcast"></i></div><span class="mvp-tag"><span class="mvp-dot"></span>Estamos en vivo</span>'
      +'<h3>Compras Online Pausadas <i>por Ventas en Live</i></h3>'
      +'<p>En este momento estamos vendiendo en vivo, por eso la compra en línea está en pausa. Puedes seguir viendo el catálogo: en cuanto termine el live se reactiva sola, sin recargar la página.</p>'
      +(P.links.length?'<div class="mvp-bs">'+botones('mvp-b')+'</div>':'')
      +(hay?'<p class="mvp-n"><i class="fa-regular fa-clock"></i> Las piezas de tu carrito siguen apartadas mientras dura su tiempo; si se vence, quedan anotadas para que las vuelvas a agregar.</p>':'')
      +'<button class="btn ghost mvp-seguir" onclick="cerrarModal()">Seguir viendo el catálogo</button></div>'; }
  function aviso(){ if(!P.on) return; try{ if(typeof toggleCarritoM==='function') toggleCarritoM(false); }catch(_){} try{ abrirModal(avisoHTML(),'chico'); }catch(_){} }
  function avisoPronto(){ clearTimeout(tAviso); tAviso=setTimeout(aviso,60); }
  window.mvPausaAviso=aviso; window.mvPausa=function(){ return P.on; };
  function pintar(antes){
    H.classList.toggle('mv-pausa',P.on); barra(); try{ if(typeof medirTop==='function') medirTop(); }catch(_){}
    if(P.on&&!antes){ // se acaba de pausar (o la clienta llegó con la tienda en pausa): aviso una sola vez por pausa
      var k='mv.pausa.visto', id=P.desde||'1', visto=''; try{ visto=sessionStorage.getItem(k)||''; }catch(_){}
      var enPagoAbierto=!!document.getElementById('coBody');
      if(visto!==id||enPagoAbierto){ try{ sessionStorage.setItem(k,id); }catch(_){} aviso(); }
    } else if(P.on&&document.getElementById('mvpM')){ try{ abrirModal(avisoHTML(),'chico'); }catch(_){} } // cambiaron los links con el aviso abierto
    if(!P.on&&antes){ if(document.getElementById('mvpM')){ try{ cerrarModal(); }catch(_){} }
      try{ toast('<b>¡Listo!</b> Las compras en línea ya están activas otra vez.','ok',7000); }catch(_){}
      try{ if(typeof refrescarEstado==='function') refrescarEstado(); }catch(_){} }
  }
  function aplicar(d){ var antes=P.on, l=limpiar(d&&d.links), on=forzar||!!(d&&d.pausada===true);
    var cambio=!P.listo||on!==P.on||l.join('|')!==P.links.join('|'); P.listo=true; P.on=on; P.links=on?l:[]; P.desde=String((d&&d.desde)||''); if(cambio) pintar(antes); }
  function revisar(){ if(pidiendo) return Promise.resolve(); pidiendo=true;
    var ctrl=('AbortController' in window)?new AbortController():null, tm=setTimeout(function(){ try{ ctrl&&ctrl.abort(); }catch(_){} },9000);
    return fetch(FN,{method:'POST',headers:{'Content-Type':'application/json','apikey':KEY,'Authorization':'Bearer '+KEY},body:'{}',cache:'no-store',signal:ctrl?ctrl.signal:undefined})
      .then(function(r){ return r.ok?r.json():null; }).then(function(d){ if(d&&typeof d==='object') aplicar(d); else if(forzar&&!P.listo) aplicar({pausada:true}); })
      .catch(function(){ if(forzar&&!P.listo) aplicar({pausada:true}); }) // sin respuesta: se queda como estaba
      .then(function(){ clearTimeout(tm); pidiendo=false; }); }
  window.mvPausaRevisar=revisar;

  /* ---------- candados en la página: no agregar ni pagar mientras esté pausada ---------- */
  function envolver(nombre,fn){ var o=window[nombre]; if(typeof o!=='function') return; window[nombre]=function(){ return fn.call(this,o,arguments); }; }
  envolver('add',function(o,a){ if(P.on){ avisoPronto(); return 0; } return o.apply(this,a); });
  envolver('setQty',function(o,a){ if(P.on){ var c=a[0], v=Math.max(0,parseInt(a[1])||0), act=(S.cart&&S.cart[c])||0; if(v>act){ try{ setInp(c,act); tarjetas(c).forEach(function(el){ var i=el.querySelector('.step input'); if(i) i.value=act; }); }catch(_){} avisoPronto(); return; } } return o.apply(this,a); });
  envolver('abrirCheckout',function(o,a){ if(P.on){ aviso(); return; } return o.apply(this,a); });
  envolver('pagar',function(o,a){ if(P.on){ aviso(); return Promise.resolve(); } return o.apply(this,a); });
  envolver('toast',function(o,a){ if(/pausad/i.test(String(a[0]||''))&&!/activas otra vez/.test(String(a[0]||''))){ revisar().then(function(){ if(P.on) aviso(); else o.apply(null,a); }); return; } return o.apply(this,a); }); // el servidor rechazó por pausa antes de que la página se enterara

  revisar();
  setInterval(function(){ if(!document.hidden) revisar(); },CADA);
  document.addEventListener('visibilitychange',function(){ if(!document.hidden) revisar(); });
  window.addEventListener('pageshow',function(ev){ if(ev.persisted) revisar(); });
  window.addEventListener('online',revisar);
})();
