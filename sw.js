const CACHE='sfp-v3-cache';
const ASSETS=['/index.html','/styles.css','/app.js','/manifest.json','/icons/192.png','/icons/512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))) });
self.addEventListener('fetch',e=>{ e.respondWith(caches.match(e.request).then(r=> r || fetch(e.request))) });