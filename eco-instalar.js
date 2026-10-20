/* Ayuda de instalación. Independiente de autenticación, Google y datos personales. */
(function(){
 'use strict';
 const panel=document.getElementById('ecoInstalar'),button=document.getElementById('ecoInstalarBoton'),status=document.getElementById('ecoInstalarEstado');
 const standalone=window.matchMedia('(display-mode: standalone)');let offer=null;
 function update(){if(panel)panel.hidden=standalone.matches||navigator.standalone===true;}
 update();if(standalone.addEventListener)standalone.addEventListener('change',update);
 window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();offer=event;if(button)button.hidden=false;});
 if(button)button.addEventListener('click',async()=>{if(!offer)return;button.disabled=true;try{await offer.prompt();const choice=await offer.userChoice;if(status)status.textContent=choice.outcome==='accepted'?'Instalación solicitada. Busca el icono de Persona ECO en tu celular.':'Puedes instalarla después desde el menú del navegador.';}catch(_){if(status)status.textContent='Usa las instrucciones de tu navegador para agregar el icono.';}finally{offer=null;button.hidden=true;button.disabled=false;}});
 window.addEventListener('appinstalled',()=>{offer=null;if(button)button.hidden=true;if(panel)panel.hidden=true;});
 if('serviceWorker' in navigator&&window.isSecureContext){window.addEventListener('load',()=>{navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'}).catch(()=>{if(status)status.textContent='Puedes usar la app desde este enlace y agregarla desde el menú del navegador.';});});}
})();
