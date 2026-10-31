/*
 * Mi Persona ECO — Notificaciones internas · Módulo opcional de interfaz
 * Primera etapa: campanita, contador, aviso al ingresar e historial.
 * No modifica el Servicio de Datos, ni Sheets, ni las credenciales.
 */
(function (root) {
  'use strict';

  const ESTILO_ID = 'ecoNotificacionesEstilo';
  const CAMPANA_ID = 'ecoNotificacionesCampana';
  const CONTADOR_ID = 'ecoNotificacionesContador';
  const DIALOGO_ID = 'ecoNotificacionesDialogo';
  const CONSULTA_INTERVALO = 60000;

  let consultaNumero = 0;
  let ultimaConsulta = 0;
  let tokenConsultado = '';
  let pendientes = [];
  let firmaAvisada = '';

  function porId(id) { return document.getElementById(id); }
  function tokenActual() {
    try { return typeof sessionToken === 'string' ? sessionToken : ''; }
    catch (_) { return ''; }
  }
  function esAdmin() {
    try { return typeof sessionIsAdmin === 'boolean' && sessionIsAdmin; }
    catch (_) { return true; }
  }
  function esHomeVisible() {
    const home = porId('home');
    return !!home && !home.classList.contains('hidden');
  }
  function activa() { return !!tokenActual() && !esAdmin() && esHomeVisible(); }

  function instalarEstilos() {
    if (porId(ESTILO_ID)) return;
    const css = document.createElement('style');
    css.id = ESTILO_ID;
    css.textContent = `

      /* ECO: prioridad visual absoluta al CONTENIDO de los mensajes. */
      #${CAMPANA_ID} {position:relative;flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;
        width:50px;height:50px;border:1px solid #c9d4db;border-radius:14px;background:#fff;color:#334f5f;
        cursor:pointer;margin-left:10px;touch-action:manipulation;}
      #${CAMPANA_ID}[hidden] {display:none!important;}
      #${CAMPANA_ID}:focus-visible {outline:3px solid #984a32;outline-offset:3px;}
      #${CAMPANA_ID} svg {width:25px;height:25px;stroke:currentColor;fill:none;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;}
      #${CONTADOR_ID} {position:absolute;top:-7px;right:-8px;min-width:22px;height:22px;padding:1px 5px;
        border-radius:16px;background:#984a32;color:#fff;display:flex;align-items:center;justify-content:center;
        font-size:12px!important;line-height:1;font-weight:800;box-sizing:border-box;}
      #${CONTADOR_ID}.hidden {display:none;}

      /* El aviso es discreto. El mensaje es el elemento dominante. */
      #${DIALOGO_ID} {width:min(94vw,650px);max-width:94vw;max-height:88dvh;overflow-y:auto;
        padding:24px;box-sizing:border-box;border:1px solid #a2adb6;border-radius:20px;
        background:#edf1f4!important;color:#273943!important;box-shadow:0 22px 65px rgba(0,0,0,.35);}
      #${DIALOGO_ID}::backdrop {background:rgba(0,0,0,.65);}
      #${DIALOGO_ID} .ecoNotEyebrow {font-size:12px!important;font-weight:750;color:#5f6f7c!important;
        line-height:1.3;letter-spacing:.05em;margin:0 0 5px;}
      #${DIALOGO_ID} #ecoNotificacionesTitulo {font-size:15px!important;font-weight:650!important;
        color:#566673!important;line-height:1.35;margin:0 0 13px;}
      #${DIALOGO_ID} #ecoNotificacionesResumen {display:block!important;margin:0!important;
        padding:25px 27px!important;background:#343e47!important;color:#fff!important;
        border:2px solid #343e47!important;border-radius:18px!important;
        font-size:29px!important;font-weight:800!important;line-height:1.48!important;
        letter-spacing:.003em;white-space:pre-wrap;overflow-wrap:anywhere;
        max-height:57dvh;overflow:auto;text-align:left;}
      #${DIALOGO_ID} #ecoNotificacionesIntro {font-size:13px!important;font-weight:400!important;
        color:#657482!important;line-height:1.45;margin:11px 2px 0!important;white-space:normal;}
      #${DIALOGO_ID} .ecoNotBotones {display:flex;justify-content:flex-end;flex-wrap:wrap;
        gap:11px;margin-top:23px;}
      #${DIALOGO_ID} button {font-size:17px!important;min-height:52px;padding:11px 18px;
        border-radius:11px;font-weight:800;cursor:pointer;}
      #${DIALOGO_ID} .ecoNotPosponer {background:#fff;color:#3a4a55;border:2px solid #b7c3cb;}
      #${DIALOGO_ID} .ecoNotAbrir {background:#343e47;color:#fff;border:2px solid #343e47;}
      #${DIALOGO_ID} button:focus-visible {outline:3px solid #984a32;outline-offset:3px;}

      /* Historial: burbujas grises oscuras, cuerpo blanco y grande. */
      #peMensajesLista {gap:18px;}
      #peMensajesLista .peMensajeItem {background:#343e47!important;color:#fff!important;
        border:1px solid #677683!important;border-radius:18px!important;padding:24px!important;
        box-shadow:0 7px 23px rgba(0,0,0,.15);opacity:1!important;overflow-wrap:anywhere;}
      #peMensajesLista .peMensajeLeido {background:#48535e!important;opacity:1!important;}
      #peMensajesLista .peMensajeItem .peMensajeCabecera,
      #peMensajesLista .peMensajeItem .peMensajeCabecera strong,
      #peMensajesLista .peMensajeItem .peMensajeCabecera span,
      #peMensajesLista .peMensajeItem .peMensajeReferencia,
      #peMensajesLista .peMensajeItem > div {color:#dce5eb!important;font-size:14px!important;line-height:1.4!important;}
      #peMensajesLista .peMensajeItem .peMensajeCuerpo {color:#fff!important;
        font-size:26px!important;font-weight:800!important;line-height:1.53!important;
        margin:19px 0 23px!important;white-space:pre-wrap!important;overflow-wrap:anywhere;}
      #peMensajesLista .peMensajeItem .peMensajeLeer,
      #peMensajesLista .peMensajeItem .peMensajeVer {font-size:17px!important;
        min-height:51px;border-radius:11px;padding:12px 16px;font-weight:800!important;
        line-height:1.35!important;background:#fff!important;color:#283843!important;
        border:2px solid #fff!important;white-space:normal;}
      #peMensajesLista .peMensajeItem button:focus-visible {outline:3px solid #ffdaae;outline-offset:3px;}

      /* Diálogo de lectura completa: el texto es lo más importante. */
      #peMensajeDialogCompleto {background:#edf1f4!important;color:#273943!important;
        border:1px solid #a2adb6;border-radius:20px;padding:24px;}
      #peMensajeDialogCompleto h2 {font-size:15px!important;color:#64727f!important;font-weight:650!important;}
      #peMensajeDialogCompleto .peMensajeDialogMeta {font-size:13px!important;color:#64727f!important;}
      #peMensajeDialogCompleto .peMensajeDialogTexto {background:#343e47!important;color:#fff!important;
        border-radius:16px;padding:24px;margin:15px 0 6px;font-size:26px!important;
        font-weight:800!important;line-height:1.55!important;white-space:pre-wrap;overflow-wrap:anywhere;}
      #peMensajeDialogCompleto .peMensajeDialogCerrar {background:#343e47!important;color:#fff!important;
        border:2px solid #343e47;border-radius:11px;font-size:17px!important;min-height:52px;}
      @media (max-width:480px) {
        #${CAMPANA_ID} {width:46px;height:46px;margin-left:6px;}
        #${DIALOGO_ID} {padding:18px;}
        #${DIALOGO_ID} #ecoNotificacionesResumen {font-size:26px!important;padding:22px!important;}
        #${DIALOGO_ID} .ecoNotBotones button {flex:1 1 100%;font-size:17px!important;}
        #peMensajesLista .peMensajeItem {padding:20px!important;}
        #peMensajesLista .peMensajeItem .peMensajeCuerpo {font-size:24px!important;}
        #peMensajeDialogCompleto {padding:18px;}
        #peMensajeDialogCompleto .peMensajeDialogTexto {font-size:24px!important;padding:20px;}
      }
    `;
    document.head.appendChild(css);
  }

  function instalarCampana() {
    if (porId(CAMPANA_ID)) return;
    const fila = document.querySelector('#home .peGreetingRow');
    if (!fila) return;
    const b = document.createElement('button');
    b.type = 'button'; b.id = CAMPANA_ID;
    b.title = 'Abrir mensajes'; b.setAttribute('aria-label','Abrir mensajes');
    b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
      '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/>' +
      '<path d="M10 21h4"/></svg>';
    const c = document.createElement('span'); c.id = CONTADOR_ID;
    c.className = 'hidden'; c.setAttribute('aria-hidden','true'); b.appendChild(c);
    b.addEventListener('click', abrirMensajes);
    fila.appendChild(b);
  }

  function mostrarCampanaSiCorresponde() {
    const bell = porId(CAMPANA_ID);
    if (bell) bell.hidden = esAdmin();
  }

  function contador(n) {
    const cuenta = Math.max(0,Math.floor(Number(n)||0));
    const label = cuenta === 1 ? '1 mensaje pendiente' : cuenta + ' mensajes pendientes';
    const bell = porId(CAMPANA_ID), badge = porId(CONTADOR_ID), tab = porId('peMensajesBadge');
    if (badge) { badge.textContent = cuenta > 99 ? '99+' : String(cuenta); badge.classList.toggle('hidden',!cuenta); }
    mostrarCampanaSiCorresponde();
    if (bell) { bell.setAttribute('aria-label',cuenta ? 'Abrir mensajes: '+label : 'Abrir mensajes'); bell.title = cuenta?label:'Abrir mensajes'; }
    if (tab) { tab.textContent = cuenta ? String(cuenta) : ''; tab.classList.toggle('hidden',!cuenta); }
  }

  function crearDialogo() {
    let dlg = porId(DIALOGO_ID);
    if (dlg) return dlg;
    dlg = document.createElement('dialog'); dlg.id = DIALOGO_ID;
    dlg.setAttribute('aria-labelledby','ecoNotificacionesTitulo');
    const ceja = document.createElement('div'); ceja.className='ecoNotEyebrow'; ceja.textContent='MI PERSONA ECO';
    const titulo = document.createElement('h2'); titulo.id='ecoNotificacionesTitulo';
    const intro = document.createElement('p'); intro.id='ecoNotificacionesIntro';
    const resumen = document.createElement('p'); resumen.id='ecoNotificacionesResumen'; resumen.className='ecoNotResumen';
    const acciones = document.createElement('div'); acciones.className='ecoNotBotones';
    const despues = document.createElement('button'); despues.type='button'; despues.className='ecoNotPosponer'; despues.textContent='Ver después';
    despues.addEventListener('click',()=>dlg.close());
    const abrir = document.createElement('button'); abrir.type='button'; abrir.className='ecoNotAbrir'; abrir.textContent='Ver mensajes';
    abrir.addEventListener('click',abrirMensajes);
    acciones.append(despues,abrir); dlg.append(ceja,titulo,resumen,intro,acciones);
    document.body.appendChild(dlg); return dlg;
  }

  function cerrarDialogo() {
    const dlg = porId(DIALOGO_ID);
    if (dlg && dlg.open) dlg.close();
  }

  function abrirMensajes() {
    if (!activa()) return;
    cerrarDialogo();
    if (typeof root.peCambiarPestana_ === 'function') root.peCambiarPestana_('mensajes');
    else if (typeof peCambiarPestana_ === 'function') peCambiarPestana_('mensajes');
  }

  function mostrarAviso(informacion) {
    if (!activa() || !informacion.length) return;
    const tabMensajes = document.querySelector('[data-pe-tab="mensajes"]');
    if (tabMensajes && tabMensajes.classList.contains('peTabActive')) return;
    const clave = tokenActual()+'|'+informacion.map(x=>String(x.id||'')).sort().join('|');
    if (clave === firmaAvisada) return;
    const dlg = crearDialogo();
    porId('ecoNotificacionesTitulo').textContent = informacion.length===1
      ? 'Tienes un mensaje pendiente' : 'Tienes '+informacion.length+' mensajes pendientes';
    porId('ecoNotificacionesIntro').textContent = informacion.some(x=>x.prioridad)?'Mensaje prioritario de Recursos Humanos':'Mensaje de Recursos Humanos';
    const primero=informacion[0];
    const texto=String(primero?.mensaje||'').trim();
    porId('ecoNotificacionesResumen').textContent = texto
      ? (texto.length>400?texto.slice(0,397)+'…':texto)
      : 'Consulta tu bandeja para leer el mensaje completo.';
    if (typeof dlg.showModal === 'function' && !dlg.open) {
      try { dlg.showModal(); firmaAvisada=clave; } catch (_) { /* No afectar navegación. */ }
    }
  }

  function refrescar(forzar, avisar) {
    if (!activa()) { limpiar(false); return; }
    if (typeof google==='undefined' || !google.script || !google.script.run) return;
    const ahora = Date.now();
    if (!forzar && tokenActual()===tokenConsultado && ahora-ultimaConsulta<CONSULTA_INTERVALO) return;
    const token = tokenActual(); tokenConsultado=token; ultimaConsulta=ahora;
    const numero = ++consultaNumero;
    google.script.run.withSuccessHandler(r=>{
      if (numero!==consultaNumero || token!==tokenActual() || !activa()) return;
      if (!r || !r.ok || !Array.isArray(r.mensajes)) return;
      pendientes=r.mensajes.filter(x=>x && (!x.leido || (x.requiereConfirmacion && !x.confirmado))).sort((a,b)=>Number(!!b.prioridad)-Number(!!a.prioridad));
      contador(pendientes.length);
      if (avisar) mostrarAviso(pendientes);
    }).withFailureHandler(()=>{
      // El fallo de notificaciones no debe interrumpir el inicio de sesión.
      if (numero!==consultaNumero) return;
      ultimaConsulta=0;
    })[root.EcoMensajeriaV2?.ready?.()?'eco2ObtenerMensajesPersonaECO':'obtenerMensajesPendientesPersonaECO'](token);
  }

  function limpiar(limpiarFirma) {
    ++consultaNumero; pendientes=[]; tokenConsultado=''; ultimaConsulta=0; contador(0); cerrarDialogo();
    if (limpiarFirma) firmaAvisada='';
  }

  function incorporarHistorial(mensajes) {
    if (!activa() || !Array.isArray(mensajes)) return;
    ++consultaNumero; // La lectura reciente prevalece sobre consultas anteriores.
    pendientes = mensajes.filter(x=>x && (!x.leido || (x.requiereConfirmacion && !x.confirmado)));
    contador(pendientes.length);
    ultimaConsulta = Date.now(); tokenConsultado=tokenActual();
  }

  function enlazarFunciones() {
    if (typeof root.renderHome === 'function' && !root.renderHome.ecoNotificacionV1) {
      const original=root.renderHome;
      const envoltorio=function (...args) {
        const result=original.apply(this,args);
        mostrarCampanaSiCorresponde();
        return result;
      };
      envoltorio.ecoNotificacionV1=true;
      root.renderHome=envoltorio;
    }
    // La consulta se dispara después de mostrar Home, no bloquea el ingreso.
    if (typeof root.entrarHomePersonaECO_ === 'function' && !root.entrarHomePersonaECO_.ecoNotificacionV1) {
      const original=root.entrarHomePersonaECO_;
      const envoltorio=function (...args) {
        const r=original.apply(this,args);
        instalarCampana();
        if (activa()) refrescar(true,true);
        return r;
      };
      envoltorio.ecoNotificacionV1=true;
      root.entrarHomePersonaECO_=envoltorio;
    }
    if (typeof root.pePintarMensajes_ === 'function' && !root.pePintarMensajes_.ecoNotificacionV1) {
      const original=root.pePintarMensajes_;
      const envoltorio=function (...args) {
        const r=original.apply(this,args);
        incorporarHistorial(args[0]);
        return r;
      };
      envoltorio.ecoNotificacionV1=true;
      root.pePintarMensajes_=envoltorio;
    }
    if (typeof root.peLimpiarCacheVistas_ === 'function' && !root.peLimpiarCacheVistas_.ecoNotificacionV1) {
      const original=root.peLimpiarCacheVistas_;
      const envoltorio=function (...args) { limpiar(true); return original.apply(this,args); };
      envoltorio.ecoNotificacionV1=true;
      root.peLimpiarCacheVistas_=envoltorio;
    }
    const salir = porId('salir');
    if (salir) salir.addEventListener('click',()=>limpiar(true));
  }

  function iniciar() {
    if (!porId('home')) return;
    instalarEstilos(); instalarCampana(); enlazarFunciones();
    document.addEventListener('visibilitychange',()=>{
      if (!document.hidden && activa()) refrescar(false,false);
    });
    root.addEventListener('focus',()=>{if(activa())refrescar(false,false);});
    if (activa()) refrescar(true,false);
  }

  root.EcoNotificaciones = Object.freeze({refrescar:()=>refrescar(true,false),limpiar:()=>limpiar(true)});
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',iniciar,{once:true});
  else iniciar();
})(window);
