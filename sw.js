// Vault service worker: instant repeat visits. Thumbs/AI model/vendor = cache-first (immutable names); data/app = network-first.
const IMGC='vault-img-v1',STAT='vault-static-v1';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{
  const req=e.request;if(req.method!=='GET')return;const u=new URL(req.url);if(u.origin!==location.origin)return;const p=u.pathname;
  if(/\/img\/thumb\/|\/vendor\/|\/models\//.test(p)){
    e.respondWith(caches.open(IMGC).then(async c=>{const m=await c.match(req,{ignoreSearch:true});if(m)return m;const r=await fetch(req);if(r.ok&&r.status===200)c.put(req,r.clone());return r}));return}
  if(/\/img\/full\//.test(p))return;
  if(/\.(json|bin|js|css|html)$|\/$/.test(p)){
    e.respondWith(fetch(req).then(r=>{if(r.ok&&r.status===200){const rc=r.clone();caches.open(STAT).then(c=>c.put(req,rc))}return r}).catch(()=>caches.match(req)))}
});
