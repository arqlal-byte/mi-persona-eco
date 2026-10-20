/* Mi Persona ECO: alcance exclusivo de esta app; no almacena HTML, sesiones ni respuestas. */
self.addEventListener('install',()=>{self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(self.clients.claim());});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||event.request.mode!=='navigate'||url.origin!==self.location.origin||!url.pathname.startsWith('/mi-persona-eco/'))return;
 event.respondWith(fetch(event.request).catch(()=>new Response('<!doctype html><html lang="es-MX"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mi Persona ECO</title><body style="font:16px system-ui;padding:28px;color:#172126"><h1 style="font-size:24px">Necesitas conexión a internet</h1><p>Conéctate y vuelve a abrir Mi Persona ECO para consultar tu información.</p><button onclick="location.reload()" style="font:inherit;padding:12px">Reintentar</button></body></html>',{status:503,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}})));
});
