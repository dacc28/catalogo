/* MODO BUEN FIN · se enciende y se apaga solo.
   Vigencia: del viernes 13-nov-2026 al lunes 16-nov-2026 a las 00:00 (hora de Monterrey, UTC-6).
   Fuera de esas fechas este archivo no hace nada y la página queda como siempre.
   Pruebas: ?bf=1 lo fuerza, ?bf=0 lo apaga. */
(function(){
  var INI=Date.UTC(2026,10,13,6,0,0), FIN=Date.UTC(2026,10,16,6,0,0);
  var q=/[?&]bf=([01])/.exec(location.search), forzar=q&&q[1]==='1';
  function vigente(){ if(q&&q[1]==='0') return false; var t=Date.now(); return forzar||(t>=INI&&t<FIN); }
  if(!vigente()) return;

  var H=document.documentElement, guard={}, puestos=[], tic=null;
  function el(h){var d=document.createElement('div');d.innerHTML=h.trim();return d.firstChild;}
  function dos(n){return (n<10?'0':'')+n;}
  function falta(){var s=Math.max(0,Math.floor((FIN-Date.now())/1000));if(forzar&&Date.now()>=FIN)s=2*86400+5*3600+17*60+42;
    return {d:Math.floor(s/86400),h:Math.floor(s%86400/3600),m:Math.floor(s%3600/60),s:s%60,t:s};}
  var CD='<div class="bf-cd" aria-label="Tiempo restante"><div><b data-bf="d">0</b><small>días</small></div><div><b data-bf="h">00</b><small>horas</small></div><div><b data-bf="m">00</b><small>min</small></div><div><b data-bf="s">00</b><small>seg</small></div></div>';
  function irCat(){ if(window.irVista) irVista('catalogo'); }
  function irInfo(){ if(window.irVista&&!document.getElementById('v-inicio').classList.contains('on')) irVista('inicio');
    setTimeout(function(){var s=document.getElementById('buenfin');if(s)s.scrollIntoView({behavior:'smooth',block:'start'});},60); }
  window.bfCat=irCat; window.bfInfo=irInfo;

  function encender(){
    H.classList.add('bf');
    var av=document.querySelector('.aviso');
    if(av){guard.av=av.innerHTML;
      av.innerHTML='<span><span class="bf-et">BUEN FIN</span></span><span><b>4x3</b> en toda la joyería: lleva 4 piezas y paga 3</span><span class="sep">·</span><span><i class="fa-regular fa-clock"></i>Termina en <b data-bf="txt"></b></span>';}
    var tx=document.querySelector('#banner .banner-tx');
    if(tx){guard.tx=tx.innerHTML;
      tx.innerHTML='<span class="tag-coral">Buen Fin · 13 al 15 de noviembre</span>'
       +'<div class="bf-h"><div class="bf-43" aria-hidden="true">4<i>x</i>3</div><h1><small>Oferta de Buen Fin 4x3</small>¡Lleva 4 piezas <i>y paga 3!</i></h1></div>'
       +'<div class="bf-reloj"><span>La promoción termina en</span>'+CD+'</div>'
       +'<div class="banner-acc"><button class="btn coral lg" onclick="bfCat()">Aprovechar el 4x3 <i class="fa-solid fa-arrow-right"></i></button><button class="btn blanco lg" onclick="bfInfo()">¿Cómo funciona?</button></div>'
       +'<p class="bf-nota-c">*Aplican restricciones: la pieza gratis es la de menor precio. <a onclick="bfInfo()">Ver detalles</a></p>';}
    var im=document.querySelector('#banner .banner-img');
    if(im){var lg=el('<div class="bf-logo"><img src="buenfin.png" alt="Buen Fin: el fin de semana más barato del año"></div>');im.appendChild(lg);puestos.push(lg);}

    var ven=document.querySelector('#v-inicio .ventajas');
    if(ven){var sec=el('<section class="bf-sec" id="buenfin"><div class="bf-sec-in">'
      +'<div class="bf-izq"><img src="buenfin.png" alt="Buen Fin" loading="lazy"><div class="bf-vig"><b>Del 13 al 15 de noviembre</b>Termina el domingo a las 11:59 p.m.</div></div>'
      +'<div><h2>Buen Fin en Marvea: <i>4x3</i></h2><p class="bf-sub">Lleva 4 piezas y paga 3, en toda la joyería.</p>'
      +'<div class="bf-pasos"><div><em>1</em><b>Elige tus piezas</b><span>Surtidas, de cualquier categoría y material.</span></div>'
      +'<div><em>2</em><b>Por cada 4, una va gratis</b><span>Con 4 piezas pagas 3; con 8 pagas 6; con 12 pagas 9.</span></div>'
      +'<div><em>3</em><b>La gratis es la de menor precio</b><span>Las otras las pagas a su precio de mayoreo de siempre.</span></div></div>'
      +'<button class="btn lg" onclick="bfCat()">Ver el catálogo <i class="fa-solid fa-arrow-right"></i></button></div>'
      +'<div class="bf-ej" id="bfEj"></div></div>'
      +'<div class="bf-nota"><b>*Aplican restricciones.</b> En el 4x3, por cada 4 piezas que lleves, 1 es gratis. La pieza gratis siempre es la de menor precio de tu compra: si llevas 8 piezas, son gratis las 2 de menor precio; si llevas 12, las 3 de menor precio. Promoción vigente del 13 al 15 de noviembre de 2026, hasta las 11:59 p.m. (hora del centro de México).</div></section>');
      ven.parentNode.insertBefore(sec,ven.nextSibling);puestos.push(sec);ejemplo();}

    var cat=document.querySelector('#v-catalogo');
    if(cat){var t=el('<div class="wrap"><div class="bf-tira" onclick="bfInfo()"><span class="bf-et">BUEN FIN</span><span><b>4x3</b> · Lleva 4 piezas y paga 3</span><span>Termina en <b data-bf="txt"></b></span></div></div>');
      cat.insertBefore(t,cat.firstChild);puestos.push(t);}
    pinta(); tic=setInterval(pinta,1000);
  }
  function ejemplo(){
    var c=document.getElementById('bfEj'); if(!c) return;
    function arma(l){ l.sort(function(a,b){return b.precio-a.precio;}); var g=l[l.length-1], tot=0, pag=0, h='<h4>Ejemplo con 4 piezas</h4><ul>';
      l.forEach(function(x){ tot+=x.precio; var gr=x===g; if(!gr) pag+=x.precio;
        h+='<li'+(gr?' class="gratis"':'')+'>'+(x.foto?'<img src="'+x.foto+'" alt="" loading="lazy">':'<div class="bf-ph"><i class="fa-solid fa-gem"></i></div>')
          +'<span>'+x.nombre.replace(/</g,'&lt;')+'</span><b>'+(gr?'<s>$'+x.precio+'</s><u>GRATIS</u>':'$'+x.precio)+'</b></li>'; });
      c.innerHTML=h+'</ul><div class="bf-tot"><span>Pagas solo 3 piezas</span><span><s>$'+tot+'</s><b>$'+pag+'</b></span></div>'; }
    arma([{nombre:'Collar',precio:60},{nombre:'Pulsera',precio:50},{nombre:'Aretes',precio:45},{nombre:'Anillo',precio:35}]);
    fetch('catalogo.json').then(function(r){return r.json();}).then(function(j){
      var l=[],v={},ps=(j.productos||[]).filter(function(x){return x.disponible&&x.foto&&x.precio>0;});
      ['COL','PUL','ARE','ANI'].forEach(function(k,i){var o=ps.filter(function(x){return x.categoria===k&&!v[x.precio];});
        o.sort(function(a,b){return a.precio-b.precio;}); var x=o[Math.floor(o.length*[.75,.55,.4,.15][i])]; if(x){v[x.precio]=1;l.push(x);} });
      if(l.length===4) arma(l); }).catch(function(){});
  }
  function pinta(){
    if(!vigente()){ apagar(); return; }
    var f=falta(), txt=(f.d?f.d+' d ':'')+dos(f.h)+' h '+dos(f.m)+' min'+(f.d?'':' '+dos(f.s)+' s');
    document.querySelectorAll('[data-bf]').forEach(function(n){var k=n.getAttribute('data-bf');
      var val=k==='txt'?txt:k==='d'?String(f.d):dos(f[k]); if(n.textContent!==val) n.textContent=val;});
  }
  function apagar(){ /* terminó el Buen Fin con la página abierta: todo vuelve a como estaba */
    clearInterval(tic); H.classList.remove('bf');
    var av=document.querySelector('.aviso'); if(av&&guard.av!=null) av.innerHTML=guard.av;
    var tx=document.querySelector('#banner .banner-tx'); if(tx&&guard.tx!=null) tx.innerHTML=guard.tx;
    puestos.forEach(function(n){ if(n.parentNode) n.parentNode.removeChild(n); });
  }
  encender();
})();
