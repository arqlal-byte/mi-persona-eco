/* Mi Persona ECO — Mensajería V2. Solo habilita prioridad y «Entendido» si el backend lo soporta.
 * Complementa el historial original, sin cambiar sesiones, actividades, perfil ni publicaciones.
 */
(function(root){
'use strict';
let habilitada=false,capToken='',peticion=0,carga=0;
const $=id=>document.getElementById(id);
function token(){try{return typeof sessionToken==='string'?sessionToken:'';}catch(_){return '';}}
function disponible(){try{return !!token()&&!sessionIsAdmin&&!!$('home')&&!$('home').classList.contains('hidden');}catch(_){return false;}}
function pendiente(m){return !!m && (!m.leido || (!!m.requiereConfirmacion && !m.confirmado));}
function nPendientes(items){return (Array.isArray(items)?items:[]).filter(pendiente).length;}
function actualizarContador(items){
 const n=nPendientes(items),badge=$('peMensajesBadge'),campana=$('ecoNotificacionesContador'),boton=$('ecoNotificacionesCampana');
 for(const el of [badge,campana])if(el){el.textContent=n?(n>99?'99+':String(n)):'';el.classList.toggle('hidden',!n);}
 if(boton){const texto=n===1?'1 mensaje pendiente':n+' mensajes pendientes';boton.title=n?texto:'Abrir mensajes';boton.setAttribute('aria-label',n?'Abrir mensajes: '+texto:'Abrir mensajes');}
}
function aplicarAdornos(items){
 if(!habilitada||!disponible()||!Array.isArray(items))return;
 const tarjetas=$('peMensajesLista')?.querySelectorAll(':scope > article')||[];
 items.forEach((m,i)=>{
  const card=tarjetas[i];if(!card)return;
  const cab=card.querySelector('.peMensajeCabecera');
  if(m.prioridad&&cab){
   const av=document.createElement('strong');av.textContent='Prioritario';av.style.color='#984a32';
   av.style.fontWeight='850';av.style.marginLeft='auto';cab.appendChild(av);
   card.style.borderLeft='5px solid #984a32';
  }
  if(m.requiereConfirmacion){
   const estado=document.createElement('div');estado.style.cssText='font-size:14px;font-weight:750;margin:10px 0;';
   estado.textContent=m.confirmado?'Confirmación registrada':'Pendiente de confirmación';
   card.appendChild(estado);
   if(!m.confirmado){
    const boton=document.createElement('button');boton.type='button';boton.textContent='Entendido';
    boton.className='peMensajeLeer';boton.style.margin='10px 0';
    boton.setAttribute('aria-label','Confirmar que has entendido el mensaje');
    boton.onclick=()=>{
     if(!disponible()||!habilitada)return;
     const sesion=token();boton.disabled=true;boton.textContent='Guardando confirmación…';
     google.script.run.withSuccessHandler(r=>{
      if(sesion!==token()||!disponible())return;
      if(!r?.ok){boton.disabled=false;boton.textContent='Reintentar confirmación';return;}
      m.confirmado=true;m.leido=true;m.fechaConfirmacion=r.fecha||m.fechaConfirmacion||'';
      if(typeof pePintarMensajes_==='function')pePintarMensajes_(items);
      root.EcoNotificaciones?.refrescar?.();
     }).withFailureHandler(e=>{
      if(sesion!==token())return;
      boton.disabled=false;boton.textContent='Reintentar confirmación';
      alert((e&&e.message)||'No se pudo guardar la confirmación.'); 
     }).eco2ConfirmarMensajeECO(sesion,m.id);
    };
    card.appendChild(boton);
   }
  }
 });
 actualizarContador(items);
}
function cargarV2(){
 if(!disponible()||!habilitada)return;
 const sesion=token(),actual=++carga,lista=$('peMensajesLista');
 if(lista)lista.textContent='Consultando mensajes…';
 google.script.run.withSuccessHandler(r=>{
  if(sesion!==token()||actual!==carga||!habilitada||!disponible())return;
  if(!r?.ok||!Array.isArray(r.mensajes)){if(lista)lista.textContent='No se pudo consultar el historial.';return;}
  const mensajes=r.mensajes.slice().sort((a,b)=>Number(!!b.prioridad)-Number(!!a.prioridad));
  // Las variables de la interfaz original conservan el historial por sesión.
  try{peMensajesCache_=mensajes;peMensajesCacheToken_=sesion;}catch(_){}
  if(typeof pePintarMensajes_==='function')pePintarMensajes_(mensajes);
 }).withFailureHandler(e=>{
  if(sesion!==token()||actual!==carga)return;
  if(lista)lista.textContent='No fue posible consultar mensajes: '+((e&&e.message)||'Error de comunicación');
 }).eco2ObtenerMensajesPersonaECO(sesion);
}
function prepararV2(){
 if(!disponible()){habilitada=false;capToken='';return;}
 const sesion=token();if(sesion===capToken)return;
 capToken=sesion;habilitada=false;const numero=++peticion;
 google.script.run.withSuccessHandler(r=>{
  if(numero!==peticion||sesion!==token()||!disponible())return;
  habilitada=!!(r?.ok&&r.listo===true&&Number(r.version)>=2);
  if(habilitada){
   const tab=document.querySelector('[data-pe-tab="mensajes"]');
   if(tab?.classList.contains('peTabActive'))cargarV2();
   root.EcoNotificaciones?.refrescar?.();
  }
 }).withFailureHandler(()=>{if(numero===peticion)habilitada=false;}).eco2CapacidadesPersonaECO(sesion);
}
function instalar(){
 if(typeof root.entrarHomePersonaECO_==='function'){
  const original=root.entrarHomePersonaECO_;
  root.entrarHomePersonaECO_=function(...args){const r=original.apply(this,args);prepararV2();return r;};
 }
 if(typeof root.peCargarMensajes_==='function'){
  const original=root.peCargarMensajes_;
  root.peCargarMensajes_=function(...args){if(habilitada&&disponible())return cargarV2();return original.apply(this,args);};
 }
 if(typeof root.pePintarMensajes_==='function'){
  const original=root.pePintarMensajes_;
  root.pePintarMensajes_=function(...args){const r=original.apply(this,args);aplicarAdornos(args[0]);return r;};
 }
 if(typeof root.peLimpiarCacheVistas_==='function'){
  const original=root.peLimpiarCacheVistas_;
  root.peLimpiarCacheVistas_=function(...args){++peticion;++carga;habilitada=false;capToken='';return original.apply(this,args);};
 }
 const salir=$('salir');if(salir)salir.addEventListener('click',()=>{++peticion;++carga;habilitada=false;capToken='';});
 if(disponible())prepararV2();
}
root.EcoMensajeriaV2=Object.freeze({ready:()=>habilitada&&disponible(),pendiente});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',instalar,{once:true});
else instalar();
})(window);
