/**
 * ECO Bridge Client v0.3 — MIT-compatible internal connector.
 * Protocolo postMessage: GitHub Pages -> iframe aislado de Apps Script.
 * Sin credenciales en URL, cookies compartidas ni consultas a Sheets en el cliente.
 */
(function (root) {
  'use strict';
  var CONFIG = root.ECO_RUNTIME || {};
  var TIMEOUT_MS = 45000;
  var bridge = null;
  var frame = null;
  var ready = false;
  var readyPromise = null;
  var pending = new Map();
  var sequence = 0;
  var channel=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
  var endpoint=null,endpointOrigin=null;
  var allowedMethods = new Set([
    "estadoAccesoPersonaECO",
    "iniciarSesionPersonaECO",
    "estadoSesionPersonaECO",
    "cerrarSesionPersonaECO",
    "obtenerPersonaECO",
    "consultarPerfilECO",
    "obtenerActividadesFamiliaresPersonaECO",
    "obtenerPortadasECO",
    "obtenerMensajesPendientesPersonaECO",
    "obtenerHistorialMensajesPersonaECO",
    "obtenerValidacionPersonaECO",
    "registrarActividadPorTokenPersonaECO",
    "guardarActividadPersonaECO",
    "guardarRespuestaActividadPersonaECO",
    "guardarEvidenciaActividadPersonaECO",
    "guardarEvidenciaDocumentalPersonaECO",
    "marcarMensajeLeidoPersonaECO",
    "crearContrasenaPersonaECO",
    "seleccionarPersonaAdminPersonaECO",
    "cambiarPersonaAdminPersonaECO"
]);
  function active() { return CONFIG.mode === 'live' && typeof CONFIG.bridgeUrl === 'string' && !!CONFIG.bridgeUrl; }
  function isBridgeHost(origin) {
    try {
      var h = new URL(origin).hostname;
      return origin.startsWith('https://') && (h === 'script.google.com' || h === 'script.googleusercontent.com' || h.endsWith('.googleusercontent.com'));
    } catch (_) { return false; }
  }
  function validUrl() {
    var parsed = new URL(CONFIG.bridgeUrl);
    if (parsed.protocol !== 'https:' || parsed.hostname !== 'script.google.com' || !/^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(parsed.pathname) || parsed.search || parsed.hash)
      throw new Error('Configura una URL /exec válida del conector ECO.');
    return parsed.href;
  }
  function install() {
    if (!active()) return false;
    var url = validUrl();
    if (bridge) return true;
    bridge = document.createElement('iframe');
    bridge.title = 'Conexión segura ECO';
    bridge.setAttribute('aria-hidden', 'true');
    bridge.setAttribute('referrerpolicy', 'no-referrer');
    bridge.style.cssText = 'position:absolute!important;width:0!important;height:0!important;border:0!important;opacity:0!important;pointer-events:none!important;';
    bridge.src=url+'?ecoChannel='+channel;
    frame = bridge;
    document.body.appendChild(frame);
    readyPromise = new Promise(function(resolve, reject){
      root.__ecoBridgeReady = {resolve:resolve,reject:reject};
    });
    // El iframe sólo puede responder desde dominios de Google verificados.
    root.addEventListener('message', function (evt) {
      if(!isBridgeHost(evt.origin))return;
      if(endpoint&&(evt.source!==endpoint||evt.origin!==endpointOrigin))return;
      var msg = evt.data;
      if(!msg||msg.ecoBridge!=='ECO_V3'||msg.channel!==channel)return;
      if(msg.type==='ready'){
        if(!evt.source)return;endpoint=evt.source;endpointOrigin=evt.origin;
        ready = true;
        root.__ecoBridgeReady.resolve();
        return;
      }
      if (msg.type !== 'reply' || typeof msg.id !== 'string') return;
      var job = pending.get(msg.id);
      if (!job) return;
      pending.delete(msg.id);
      clearTimeout(job.timer);
      if (msg.ok) job.resolve(msg.value);
      else job.reject(new Error(msg.error || 'Error de comunicación con ECO.'));
    });
    return true;
  }
  function invoke(method, args) {
    if (!active()) return Promise.reject(new Error('El conector ECO no está activado.'));
    if (!allowedMethods.has(method)) return Promise.reject(new Error('Operación no autorizada: '+method));
    try { install(); } catch (e) { return Promise.reject(e); }
    var promise = new Promise(function(resolve,reject){
      var id = String(Date.now())+'-'+String(++sequence);
      var timer = setTimeout(function(){pending.delete(id);reject(new Error('No hubo respuesta del conector ECO. Comprueba su publicación y permisos.'));}, TIMEOUT_MS);
      pending.set(id,{resolve:resolve,reject:reject,timer:timer});
      Promise.race([readyPromise, new Promise(function(_,r){setTimeout(function(){r(new Error('No se pudo conectar con el servicio de Google Sheets.'));}, 16000);})])
        .then(function(){
          if (!pending.has(id)) return;
          endpoint.postMessage({ecoBridge:'ECO_V3',channel:channel,type:'call',id:id,method:method,args:Array.isArray(args)?args:[]},endpointOrigin);
        }).catch(function(e){var job=pending.get(id);if(job){pending.delete(id);clearTimeout(job.timer);job.reject(e);}});
    });
    return promise;
  }
  // Operaciones que requieren token de sesión personal (no incluye acceso RH).
  var metodosSesionPersona = new Set([
    'estadoSesionPersonaECO','obtenerPersonaECO','consultarPerfilECO',
    'obtenerActividadesFamiliaresPersonaECO','obtenerPortadasECO',
    'obtenerMensajesPendientesPersonaECO','obtenerHistorialMensajesPersonaECO',
    'guardarActividadPersonaECO','guardarRespuestaActividadPersonaECO',
    'guardarEvidenciaActividadPersonaECO','guardarEvidenciaDocumentalPersonaECO',
    'marcarMensajeLeidoPersonaECO','seleccionarPersonaAdminPersonaECO',
    'cambiarPersonaAdminPersonaECO'
  ]);
  var invalidPersonaTokens = new Set();
  function invalidatePersonaSession(token){
    if(token)invalidPersonaTokens.add(String(token));
  }
  function sesionPersonalVencida(err){
    var m=String((err&&err.message)||err||'').normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'').toLowerCase();
    return /\bsesion\s+(?:expiro|expirada|vencio|vencida|caducada|no valida|invalida|fue revocada)\b|\binicia sesion nuevamente\b/.test(m);
  }
  function runShim(success,failure) {
    return new Proxy({}, {get:function(target,key){
      if (key === 'withSuccessHandler') return function(fn){return runShim(fn,failure);};
      if (key === 'withFailureHandler') return function(fn){return runShim(success,fn);};
      if (key === 'then') return undefined;
      return function(){var args=Array.prototype.slice.call(arguments),metodo=String(key);
        var token=metodosSesionPersona.has(metodo)?String(args[0]||''):'';
        return invoke(metodo,args).then(function(v){
          if(token && invalidPersonaTokens.has(token))return;
          if(typeof success==='function')success(v);
        },function(err){
          if(token && invalidPersonaTokens.has(token))return;
          if(token && sesionPersonalVencida(err)){
            invalidatePersonaSession(token);
            root.dispatchEvent(new CustomEvent('eco-persona-sesion-expirada',{
              detail:{token:token}
            }));
            return; // Evita mensajes de error una vez que se regresó al acceso.
          }
          if(typeof failure==='function')failure(err);
          else console.error('Conector ECO:',err.message);
        });
      };
    }});
  }
  function installLegacyGoogleRun() {
    if (!install()) return false;
    root.google = root.google || {};
    root.google.script = root.google.script || {};
    root.google.script.run = runShim(null,null);
    root.google.script.url = {getLocation:function(callback){
      var search = new URLSearchParams(root.location.search);
      var parameters = {};
      search.forEach(function(v,k){parameters[k]=v;});
      Promise.resolve().then(function(){callback({parameter:parameters});});
    }};
    return true;
  }
  root.EcoBridgeClient = {active:active,install:install,invoke:invoke,installLegacyGoogleRun:installLegacyGoogleRun,invalidatePersonaSession:invalidatePersonaSession};
})(window);
