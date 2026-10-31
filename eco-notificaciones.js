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
      #${CAMPANA_ID} { position:relative;flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;
        width:50px;height:50px;border:1px solid #c9d4db;border-radius:14px;background:#fff;color:#334f5f;
        cursor:pointer;margin-left:10px;touch-action:manipulation; }
      #${CAMPANA_ID}[hidden] {display:none!important;}
      #${CAMPANA_ID}:focus-visible { outline:3px solid #984a32;outline-offset:3px; }
      #${CAMPANA_ID} svg { width:25px;height:25px;stroke:currentColor;fill:none;stroke-width:1.9;
        stroke-linecap:round;stroke-linejoin:round; }
      #${CONTADOR_ID} { position:absolute;top:-7px;right:-8px;min-width:22px;height:22px;padding:1px 5px;
        border-radius:16px;background:#984a32;color:#fff;display:flex;align-items:center;justify-content:center;
        font-size:12px!important;line-height:1;font-weight:800;box-sizing:border-box; }
      #${CONTADOR_ID}.hidden { display:none; }
      /* Aviso inicial: panel gris oscuro, contraste alto y texto grande. */
      #${DIALOGO_ID} {
        width:min(94vw,600px);max-width:94vw;max-height:88dvh;overflow:auto;border:1px solid #76828d;
        border-radius:20px;padding:28px;box-sizing:border-box;background:#3d4852;color:#fff;
        box-shadow:0 22px 75px rgba(0,0,0,.45);
      }
      #${DIALOGO_ID}::backdrop { background:rgba(0,0,0,.70); }
      #${DIALOGO_ID} .ecoNotEyebrow {color:#fff;font-weight:850;font-size:16px;letter-spacing:.045em;}
      #${DIALOGO_ID} h2 {color:#fff;font-size:28px;line-height:1.25;margin:12px 0 16px;font-weight:850;}
      #${DIALOGO_ID} p {color:#fff;font-size:19px;line-height:1.6;white-space:pre-wrap;overflow-wrap:anywhere;}
      #${DIALOGO_ID} .ecoNotResumen {
        padding:19px 20px;background:#53616d;color:#fff;border:1px solid #81909a;
        border-radius:15px;max-height:240px;overflow:auto;font-size:21px;line-height:1.55;font-weight:650;
      }
      #${DIALOGO_ID} .ecoNotBotones {display:flex;flex-wrap:wrap;justify-content:flex-end;gap:12px;margin-top:26px;}
      #${DIALOGO_ID} button {min-height:54px;border-radius:11px;padding:12px 20px;font-size:18px;font-weight:800;cursor:pointer;}
      #${DIALOGO_ID} .ecoNotPosponer {background:transparent;color:#fff;border:2px solid #d4dce2;}
      #${DIALOGO_ID} .ecoNotAbrir {background:#fff;color:#273743;border:2px solid #fff;}
      #${DIALOGO_ID} button:focus-visible {outline:3px solid #ffdbad;outline-offset:3px;}
      /* Historial: tarjetas oscuras sin alterar estilos de actividades, familia o perfil. */
      #peMensajesLista { gap:16px; }
      #peMensajesLista .peMensajeItem {
        background:#414d58!important;color:#fff!important;border:1px solid #667581;
        border-radius:17px;padding:24px!important;box-shadow:0 6px 20px rgba(20,32,43,.16);
        overflow-wrap:anywhere;opacity:1!important;
      }
      #peMensajesLista .peMensajeLeido {background:#515e69!important;opacity:1!important;}
      #peMensajesLista .peMensajeItem .peMensajeCabecera,
      #peMensajesLista .peMensajeItem .peMensajeCabecera strong,
      #peMensajesLista .peMensajeItem .peMensajeCabecera span,
      #peMensajesLista .peMensajeItem .peMensajeReferencia,
      #peMensajesLista .peMensajeItem > div {
        color:#fff!important;font-size:18px!important;line-height:1.45;
      }
      #peMensajesLista .peMensajeItem .peMensajeCabecera strong {font-weight:850!important;}
      #peMensajesLista .peMensajeItem .peMensajeCuerpo {
        color:#fff!important;font-size:21px!important;line-height:1.65!important;
        margin:17px 0 20px;white-space:pre-wrap;overflow-wrap:anywhere;font-weight:600;
      }
      #peMensajesLista .peMensajeItem .peMensajeLeer,
      #peMensajesLista .peMensajeItem .peMensajeVer {
        background:#fff!important;color:#293b48!important;border:2px solid #fff!important;
        font-size:17px!important;line-height:1.35;font-weight:850;min-height:52px;
        border-radius:11px;padding:12px 16px;white-space:normal;
      }
      #peMensajesLista .peMensajeItem .peMensajeLeer {background:#e7edf1!important;}
      #peMensajesLista .peMensajeItem button:focus-visible {
        outline:3px solid #ffdbad;outline-offset:3px;
      }
      /* Ventana «Ver mensaje completo»: mismo lenguaje de alto contraste. */
      #peMensajeDialogCompleto {
        background:#3d4852!important;color:#fff!important;border:1px solid #76828d;
        border-radius:20px;padding:28px;box-shadow:0 20px 70px rgba(0,0,0,.38);
      }
      #peMensajeDialogCompleto h2 {font-size:28px!important;color:#fff!important;font-weight:850;}
      #peMensajeDialogCompleto .peMensajeDialogMeta {font-size:17px!important;color:#eef3f6!important;}
      #peMensajeDialogCompleto .peMensajeDialogTexto {
        font-size:21px!important;color:#fff!important;line-height:1.65!important;font-weight:600;
      }
      #peMensajeDialogCompleto .peMensajeDialogCerrar {
        font-size:18px!important;background:#fff!important;color:#283b48!important;
        border:2px solid #fff;border-radius:11px;min-height:52px;
      }
      @media(max-width:480px) {
        #${CAMPANA_ID} {width:46px;height:46px;margin-left:6px;}
        #${DIALOGO_ID} {padding:22px;}
        #${DIALOGO_ID} h2 {font-size:25px;}
        #${DIALOGO_ID} .ecoNotResumen {font-size:20px;padding:17px;}
        #${DIALOGO_ID} .ecoNotBotones button {flex:1 1 100%;font-size:17px;}
        #peMensajesLista .peMensajeItem {padding:19px!important;}
        #peMensajesLista .peMensajeItem .peMensajeCuerpo {font-size:20px!important;}
        #peMensajeDialogCompleto {padding:22px;}
        #peMensajeDialogCompleto .peMensajeDialogTexto {font-size:20px!important;}
      }
      @media(prefers-reduced-motion:reduce) {
        #${DIALOGO_ID},#peMensajeDialogCompleto {scroll-behavior:auto;}
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
    acciones.append(despues,abrir); dlg.append(ceja,titulo,intro,resumen,acciones);
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
    porId('ecoNotificacionesIntro').textContent = informacion.some(x=>x.prioridad)?'Tienes una comunicación prioritaria de Recursos Humanos. Puedes consultarla ahora o después.':'Recursos Humanos tiene comunicaciones para ti. Puedes consultarlas ahora o después en Mensajes.';
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
