import {createHash} from 'node:crypto';
export function offlinePlugin() {
  return {name:'wordtop-offline-shell',apply:'build',generateBundle(_options,bundle){
    const files=Object.values(bundle).filter(file => file.type === 'chunk' ? file.isEntry : file.fileName.endsWith('.css')).map(file=>'/'+file.fileName);
    const version=createHash('sha256').update(files.join('\n')).digest('hex').slice(0,12);
    const urls=['/index.html','/books/2027.json',...files];
    this.emitFile({type:'asset',fileName:'sw.js',source:`
const CACHE='wordtop-shell-${version}';
const PRECACHE=${JSON.stringify(urls)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(PRECACHE))));
// Wait for existing app windows to close before changing versions. Never force a study reload.
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const key of await caches.keys())if(key.startsWith('wordtop-shell-')&&key!==CACHE)await caches.delete(key);
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 // Never cache auth, Supabase APIs, user records or external OCR requests.
 if(request.method!=='GET'||url.origin!==self.location.origin)return;
 if(request.mode==='navigate'){
  event.respondWith(fetch(request).catch(async()=>{const cache=await caches.open(CACHE);return await cache.match('/index.html')||Response.error();}));return;
 }
 if(!/^\\/(assets|fonts|books|banners|characters)\\//.test(url.pathname))return;
 event.respondWith((async()=>{
  let cache,cached;
  try{cache=await caches.open(CACHE);cached=await cache.match(request);}catch{/* Cache availability must not block online assets. */}
  if(cached)return cached;
  const response=await fetch(request);
  if(cache&&response.ok&&response.type==='basic')try{await cache.put(request,response.clone());}catch{/* Preserve the successful network response when storage is full. */}
  return response;
 })());
});
`});
  }};
}
