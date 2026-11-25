/* MARVEA · portada «Rueda» + encabezado editorial (25-nov-2026) · ver portada.css
   - La rueda: 28 fotos (pr-01.jpg … pr-28.jpg y su versión chica pr-NN-m.jpg) que pasan sobre un arco.
     Solo se descargan las que están por verse. Se detiene fuera de pantalla, con la pestaña oculta,
     al pasar el cursor y con «reducir movimiento».
   - Encabezado: al bajar la página se recoge el renglón grande de la marca. */
(function(){
  "use strict";
  var H=document.documentElement;

  /* ---------- encabezado ---------- */
  var top=document.querySelector('header.top'), ini=document.getElementById('v-inicio'), mini=false, cola=false;
  function mide(){ try{ if(typeof medirTop==='function') medirTop(); }catch(e){} }
  function vista(){ H.classList.toggle('pr-int', !(ini&&ini.classList.contains('on'))); mide(); }
  function alBajar(){ cola=false;
    if(!top||H.classList.contains('bloq')) return;          /* con el carrito o una ventana abierta la página está fija */
    var y=window.pageYOffset||0, m=mini?y>24:y>120;
    if(m!==mini){ mini=m; top.classList.toggle('mini',m); mide(); } }
  if(top){
    if(ini&&'MutationObserver'in window) new MutationObserver(vista).observe(ini,{attributes:true,attributeFilter:['class']});
    vista(); alBajar();
    window.addEventListener('scroll',function(){ if(!cola){ cola=true; (window.requestAnimationFrame||setTimeout)(alBajar); } },{passive:true});
  }

  /* ---------- rueda ---------- */
  var el=document.getElementById('prRueda'); if(!el) return;
  var N=28, its=[], i=0, reloj=null, visto=true, encima=false,
      quieto=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  function pon(img,k){ if(img.getAttribute('src')) return; var n=('0'+(k+1)).slice(-2);
    img.sizes='(max-width:520px) 170px, (max-width:820px) 210px, 260px';
    img.srcset='pr-'+n+'-m.jpg 600w, pr-'+n+'.jpg 1200w'; img.src='pr-'+n+'-m.jpg'; }
  for(var k=0;k<N;k++){ var im=document.createElement('img'); im.className='pr-it'; im.alt=''; im.decoding='async'; im.draggable=false; im.setAttribute('data-k',k); el.appendChild(im); its.push(im); }
  function desfase(k){ var o=((k-i)%N+N)%N; return o>N/2?o-N:o; }
  function pinta(){ for(var k=0;k<N;k++){ var o=desfase(k), a=Math.abs(o), im=its[k];
    im.style.setProperty('--o',o); im.style.zIndex=10-Math.min(a,9);
    im.classList.toggle('v',a<=3); im.classList.toggle('c',o===0); if(a<=4) pon(im,k); } }
  function ir(d){ i+=d; pinta(); }
  function para(){ if(reloj){ clearInterval(reloj); reloj=null; } }
  function anda(){ para(); if(quieto||!visto||encima||document.hidden) return; reloj=setInterval(function(){ ir(1); },3000); }
  pinta();
  (window.requestAnimationFrame||setTimeout)(function(){ el.classList.add('on'); anda(); });

  /* tocar una foto de los lados la trae al centro; deslizar con el dedo pasa a la siguiente */
  el.addEventListener('click',function(e){ var t=e.target; if(!t||!t.classList||!t.classList.contains('pr-it')) return;
    var o=desfase(+t.getAttribute('data-k')); if(o){ ir(o); anda(); } });
  var x0=null;
  el.addEventListener('pointerdown',function(e){ x0=e.clientX; });
  el.addEventListener('pointerup',function(e){ if(x0===null) return; var dx=e.clientX-x0; x0=null; if(Math.abs(dx)>36){ ir(dx<0?1:-1); anda(); } });
  el.addEventListener('pointercancel',function(){ x0=null; });
  el.addEventListener('mouseenter',function(){ encima=true; para(); });
  el.addEventListener('mouseleave',function(){ encima=false; anda(); });
  document.addEventListener('visibilitychange',anda);
  if('IntersectionObserver'in window) new IntersectionObserver(function(es){ visto=es[es.length-1].isIntersecting; anda(); },{threshold:.2}).observe(el);
})();
