/**
 * Inline beforeInteractive bootstrap for production clients (esp. Chrome iOS).
 * - Polyfills Array.prototype.at (Next + older WebViews still call it)
 * - Unregisters orphaned service workers
 * - Clears Cache Storage when the deploy SHA changes
 * - Forces a one-time hard reload so Chrome cannot keep a stale JS graph
 * - Reloads on ChunkLoadError / failed import of hashed /_next/static chunks
 */

export const APP_BUILD_ID =
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.NEXT_PUBLIC_APP_BUILD_ID ||
  "dev";

/** Safe to embed as a beforeInteractive <Script> body. */
export const ASSET_RECOVERY_BOOTSTRAP = `(()=>{try{
var BUILD=${JSON.stringify(APP_BUILD_ID)};
var BUILD_KEY="fn-asset-build-id";
var RELOAD_KEY="fn-asset-reloaded:"+BUILD;
function polyfillAt(){
  try{
    if(typeof Array!=="undefined"&&typeof Array.prototype.at!=="function"){
      Object.defineProperty(Array.prototype,"at",{
        configurable:true,
        writable:true,
        value:function(n){
          n=Math.trunc(n)||0;
          var len=this.length;
          if(n<0)n+=len;
          if(n<0||n>=len)return undefined;
          return this[n];
        }
      });
    }
  }catch(e){}
}
function clearCaches(){
  try{
    if(typeof caches!=="undefined"&&caches.keys){
      caches.keys().then(function(keys){
        return Promise.all(keys.map(function(k){return caches.delete(k);}));
      }).catch(function(){});
    }
  }catch(e){}
}
function unregisterWorkers(){
  try{
    if(navigator.serviceWorker&&navigator.serviceWorker.getRegistrations){
      navigator.serviceWorker.getRegistrations().then(function(regs){
        regs.forEach(function(r){try{r.unregister();}catch(e){}});
      }).catch(function(){});
    }
  }catch(e){}
}
function hardReloadOnce(){
  try{
    if(sessionStorage.getItem(RELOAD_KEY))return;
    sessionStorage.setItem(RELOAD_KEY,"1");
  }catch(e){}
  try{location.reload();}catch(e){}
}
polyfillAt();
unregisterWorkers();
try{
  var prev=null;
  try{prev=localStorage.getItem(BUILD_KEY);}catch(e){}
  if(prev&&prev!==BUILD){
    clearCaches();
    try{localStorage.setItem(BUILD_KEY,BUILD);}catch(e){}
    hardReloadOnce();
  }else if(!prev){
    try{localStorage.setItem(BUILD_KEY,BUILD);}catch(e){}
  }
}catch(e){}
window.addEventListener("pageshow",function(ev){
  try{
    if(ev&&ev.persisted){
      var stored=null;
      try{stored=localStorage.getItem(BUILD_KEY);}catch(e){}
      if(stored&&stored!==BUILD){hardReloadOnce();return;}
    }
  }catch(e){}
});
window.addEventListener("error",function(ev){
  try{
    var msg=(ev&&ev.message)||"";
    var src=(ev&&ev.filename)||"";
    if(/ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|at is not a function/i.test(msg)||(/\\/_next\\/static\\//.test(src)&&/at is not a function/i.test(msg))){
      clearCaches();
      hardReloadOnce();
    }
  }catch(e){}
},true);
window.addEventListener("unhandledrejection",function(ev){
  try{
    var reason=ev&&ev.reason;
    var msg=typeof reason==="string"?reason:(reason&&reason.message)||"";
    if(/ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|at is not a function/i.test(msg)){
      clearCaches();
      hardReloadOnce();
    }
  }catch(e){}
});
try{window.__FN_BUILD_ID__=BUILD;}catch(e){}
}catch(e){}})();`;
