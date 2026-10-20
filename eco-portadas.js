/**
 * Imágenes oficiales: si Drive bloquea el thumbnail por cookies/permisos,
 * solicitar únicamente la portada autorizada por nómina al conector privado.
 */
(function(root){
  'use strict';
  if(!root.EcoBridgeClient || !root.EcoBridgeClient.active()) return;
  var queue=new Map(),timer=null;
  function fail(img){
    img.style.display='none';
    img.setAttribute('aria-label','Portada no disponible.');
    var p=img.parentElement;
    if(p && !p.querySelector('.eco-cover-missing')){
      var label=document.createElement('span');
      label.className='eco-cover-missing';label.textContent='Portada no disponible';
      label.style.cssText='display:block;text-align:center;padding:20px;color:#667176;font-size:14px';
      p.appendChild(label);
    }
  }
  function onError(ev){
    var img=ev.target;
    if(!(img instanceof HTMLImageElement) || !img.matches('.activityCover,.familyActivityCover'))return;
    if(img.dataset.ecoPortadaRescate)return;
    img.dataset.ecoPortadaRescate='1';
    var box=img.closest('[data-id]');
    var id=box && box.getAttribute('data-id');
    if(!id){fail(img);return;}
    queue.set(id,img);
    if(timer!==null)return;
    timer=setTimeout(flush,240);
  }
  function flush(){
    timer=null;
    var next=Array.from(queue.entries()).slice(0,3);
    next.forEach(([id])=>queue.delete(id));
    if(queue.size)timer=setTimeout(flush,300);
    // El token solo existe en memoria en modo real; nunca se publica en GitHub.
    var token=typeof sessionToken==='string'?sessionToken:'';
    if(!token){next.forEach(([id,img])=>fail(img));return;}
    root.EcoBridgeClient.invoke('obtenerPortadasECO',[token,next.map(([id])=>id)])
      .then(function(response){
        var results=new Map((response&&response.portadas||[]).map(x=>[String(x.id),x]));
        next.forEach(function([id,img]){
          var val=results.get(id);
          if(val&&typeof val.dataUrl==='string'&&/^data:image\/(jpeg|png|webp);base64,/.test(val.dataUrl))img.src=val.dataUrl;
          else fail(img);
        });
      }).catch(function(){next.forEach(([id,img])=>fail(img));});
  }
  document.addEventListener('error',onError,true);
})(window);