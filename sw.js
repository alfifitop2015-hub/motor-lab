/* عامل الخدمة: يجعل المحاكي يعمل دون إنترنت. غيّر رقم الإصدار عند كل تحديث كبير. */
const V='ws-v36';
const CORE=['./','index.html','pneumatic.html','troubleshoot.html','intro-video.html','manifest.webmanifest','icon-192.png','icon-512.png','icon-maskable-512.png','apple-touch-icon.png','favicon-32.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>Promise.all(CORE.map(u=>c.add(new Request(u,{cache:'reload'})).catch(()=>{})))).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url);
  const same=u.origin===self.location.origin;
  const cdn=/(^|\.)(cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(u.hostname);
  if(!same&&!cdn)return; /* خادم Google للنتائج وغيره: يمر مباشرة */
  const page=r.mode==='navigate'||(same&&/\.html?$|\/$/.test(u.pathname));
  if(page){ /* الصفحات: الأحدث من الإنترنت أولاً، والنسخة المحفوظة عند انقطاعه */
    e.respondWith(fetch(same?new Request(r.url,{cache:'no-cache',credentials:'same-origin'}):r).then(res=>{if(res.ok){const c=res.clone();caches.open(V).then(ca=>ca.put(r,c));}return res;})
      .catch(()=>caches.match(r,{ignoreSearch:true}).then(m=>m||caches.match('index.html'))));
    return;}
  e.respondWith(caches.match(r).then(m=>m||fetch(r).then(res=>{if(res.ok||res.type==='opaque'){const c=res.clone();caches.open(V).then(ca=>ca.put(r,c));}return res;})));
});
