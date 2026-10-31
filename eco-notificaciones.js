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

      /* Diseño ejecutivo ECO — mensaje primero, sin tamaños desproporcionados. */
      #${CAMPANA_ID} {
        position:relative;flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;
        width:48px;height:48px;border:1px solid #d5dfe5;border-radius:13px;
        background:#fff;color:#415969;cursor:pointer;margin-left:8px;touch-action:manipulation;
      }
      #${CAMPANA_ID}[hidden] {display:none!important;}
      #${CAMPANA_ID}:focus-visible {outline:3px solid #984a32;outline-offset:3px;}
      #${CAMPANA_ID} svg {width:24px;height:24px;stroke:currentColor;fill:none;
        stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;}
      #${CONTADOR_ID} {position:absolute;top:-6px;right:-7px;min-width:22px;height:22px;padding:1px 5px;
        border-radius:20px;background:#984a32;color:#fff;display:flex;align-items:center;justify-content:center;
        font-size:12px!important;line-height:1;font-weight:750;box-sizing:border-box;}
      #${CONTADOR_ID}.hidden {display:none;}

      /* Aviso: fondo blanco y mensaje azul grisáceo. */
      #${DIALOGO_ID} {width:min(92vw,590px);max-width:92vw;max-height:86dvh;overflow-y:auto;
        background:#fff!important;color:#243846!important;border:1px solid #e0e7eb!important;
        border-radius:18px!important;padding:24px!important;box-sizing:border-box;
        box-shadow:0 20px 58px rgba(16,34,47,.25)!important;}
      #${DIALOGO_ID}::backdrop {background:rgba(21,36,48,.58);}
      #${DIALOGO_ID} .ecoNotEyebrow {font-size:12px!important;letter-spacing:.065em;
        color:#596b79!important;font-weight:750!important;line-height:1.4;margin:0 0 5px;}
      #${DIALOGO_ID} #ecoNotificacionesTitulo {font-size:13px!important;color:#70808d!important;
        font-weight:500!important;line-height:1.4;margin:0 0 14px;}
      #${DIALOGO_ID} #ecoNotificacionesResumen {
        display:block;background:#415969!important;color:#fff!important;
        border:1px solid #415969!important;border-radius:14px!important;
        padding:20px 21px!important;margin:0!important;
        font-size:19px!important;font-weight:500!important;line-height:1.58!important;
        white-space:pre-wrap!important;overflow-wrap:anywhere;max-height:48dvh;overflow-y:auto;
      }
      #${DIALOGO_ID} #ecoNotificacionesIntro {font-size:12px!important;color:#71808d!important;
        font-weight:400!important;line-height:1.45;margin:10px 2px 0!important;}
      #${DIALOGO_ID} .ecoNotBotones {display:flex;flex-wrap:wrap;justify-content:flex-end;
        gap:10px;margin-top:22px;}
      #${DIALOGO_ID} button {font-size:15px!important;font-weight:700!important;
        line-height:1.3;min-height:46px;padding:11px 17px;border-radius:10px;cursor:pointer;}
      #${DIALOGO_ID} .ecoNotPosponer {background:#fff!important;color:#4c5e6b!important;
        border:1px solid #ccd6dc!important;}
      #${DIALOGO_ID} .ecoNotAbrir {background:#415969!important;color:#fff!important;
        border:1px solid #415969!important;}
      #${DIALOGO_ID} button:focus-visible {outline:3px solid #984a32;outline-offset:3px;}

      /* Historial: tarjetas blancas, texto real en burbujas oscuras. */
      #peMensajesLista {gap:15px;}
      #peMensajesLista .peMensajeItem {background:#fff!important;color:#263a47!important;
        border:1px solid #d9e1e6!important;border-radius:15px!important;padding:18px!important;
        box-shadow:0 4px 15px rgba(30,52,67,.07);opacity:1!important;overflow-wrap:anywhere;}
      #peMensajesLista .peMensajeLeido {background:#fafbfd!important;opacity:1!important;}
      #peMensajesLista .peMensajeItem .peMensajeCabecera,
      #peMensajesLista .peMensajeItem .peMensajeCabecera strong,
      #peMensajesLista .peMensajeItem .peMensajeCabecera span,
      #peMensajesLista .peMensajeItem .peMensajeReferencia {color:#667785!important;
        font-size:13px!important;line-height:1.45!important;}
      #peMensajesLista .peMensajeItem .peMensajeCabecera strong {font-weight:750!important;color:#405767!important;}
      #peMensajesLista .peMensajeItem .peMensajeCabecera strong:nth-child(3) {
        display:inline-flex;align-items:center;font-size:12px!important;
        color:#9a452d!important;border:1px solid #e6c2b7;border-radius:100px;
        background:#fff4f0;padding:4px 9px;margin-left:auto;
      }
      #peMensajesLista .peMensajeItem .peMensajeCuerpo {
        display:block;background:#415969!important;color:#fff!important;
        border-radius:12px!important;border:0!important;padding:18px 19px!important;
        font-size:19px!important;font-weight:500!important;line-height:1.6!important;
        margin:14px 0 12px!important;white-space:pre-wrap!important;overflow-wrap:anywhere;
      }
      #peMensajesLista .peMensajeItem .peMensajeLeer,
      #peMensajesLista .peMensajeItem .peMensajeVer {
        font-size:15px!important;font-weight:700!important;line-height:1.3!important;
        min-height:44px;border-radius:10px!important;padding:10px 14px!important;
        white-space:normal;
      }
      #peMensajesLista .peMensajeItem .peMensajeVer {background:#415969!important;
        border:1px solid #415969!important;color:#fff!important;}
      #peMensajesLista .peMensajeItem .peMensajeLeer {background:#fff!important;
        color:#415969!important;border:1px solid #9babb6!important;}
      #peMensajesLista .peMensajeItem button:focus-visible {outline:3px solid #984a32;outline-offset:3px;}

      /* Lectura completa: mismo contraste y escala. */
      #peMensajeDialogCompleto {background:#fff!important;color:#243846!important;
        border:1px solid #e0e7eb;border-radius:18px!important;padding:24px!important;
        box-shadow:0 20px 58px rgba(16,34,47,.25)!important;}
      #peMensajeDialogCompleto h2 {font-size:18px!important;font-weight:750!important;
        color:#344b59!important;margin-bottom:8px;}
      #peMensajeDialogCompleto .peMensajeDialogMeta {font-size:13px!important;
        color:#6a7b88!important;line-height:1.45;}
      #peMensajeDialogCompleto .peMensajeDialogTexto {display:block;background:#415969!important;
        color:#fff!important;font-size:19px!important;font-weight:500!important;
        line-height:1.6!important;border-radius:12px!important;padding:20px!important;
        margin:14px 0 5px!important;white-space:pre-wrap;overflow-wrap:anywhere;}
      #peMensajeDialogCompleto .peMensajeDialogCerrar {background:#415969!important;
        color:#fff!important;border:1px solid #415969!important;border-radius:10px!important;
        font-size:15px!important;font-weight:750!important;min-height:46px;padding:11px 17px!important;}

      @media(max-width:480px) {
        #${CAMPANA_ID} {width:44px;height:44px;margin-left:5px;}
        #${DIALOGO_ID} {padding:20px!important;}
        #${DIALOGO_ID} #ecoNotificacionesResumen {font-size:18px!important;padding:18px!important;}
        #${DIALOGO_ID} .ecoNotBotones button {flex:1 1 auto;min-width:125px;}
        #peMensajesLista .peMensajeItem {padding:15px!important;}
        #peMensajesLista .peMensajeItem .peMensajeCuerpo {font-size:18px!important;padding:17px!important;}
        #peMensajeDialogCompleto {padding:20px!important;}
        #peMensajeDialogCompleto .peMensajeDialogTexto {font-size:18px!important;padding:18px!important;}
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
    const ceja = document.createElement('div'); ceja.className='ecoNotEyebrow'; ceja.textContent='COMUNICACIÓN DE RECURSOS HUMANOS';
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
