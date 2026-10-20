/* Pantalla inicial basada en Persona ECO existente; la app instalada conserva su interfaz propia. */
(function(){
'use strict';
var display=window.matchMedia('(display-mode: standalone)');
function update(){if(display.matches||navigator.standalone===true)document.documentElement.classList.remove('eco-install-first');}
update();if(display.addEventListener)display.addEventListener('change',update);
var open=document.getElementById('ecoContinuarNavegador');if(open)open.addEventListener('click',function(){document.documentElement.classList.remove('eco-install-first');var user=document.getElementById('usuario');if(user)user.focus();});
window.addEventListener('appinstalled',function(){document.documentElement.classList.remove('eco-install-first');});
if('serviceWorker' in navigator&&window.isSecureContext)window.addEventListener('load',function(){navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'}).catch(function(){});});
})();