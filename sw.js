// Service worker: ทำให้ติดตั้งเป็นแอปได้ และเปิดได้ตอนไม่มีเน็ต
// - หน้าเว็บ/ไฟล์ของเราเอง: เอาจากเน็ตก่อน (อัปเดตมาถึงทันที) ไม่มีเน็ตค่อยใช้ของในเครื่อง
// - Tailwind / ไอคอน / ฟอนต์จาก CDN: ใช้ของในเครื่องก่อน แล้วอัปเดตเบื้องหลัง
// - Google Apps Script (ซิงค์รายชื่อ): ไม่ยุ่งเลย ต้องสดเสมอ
const CACHE = 'label-v1.4';
const SHELL = [
  './',
  './fragile.png',
  './favicon.svg',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
  './manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.endsWith('script.google.com') || url.hostname.endsWith('googleusercontent.com')) return;

  if (req.mode === 'navigate' || url.origin === self.location.origin) {
    event.respondWith(networkFirst(req));
  } else {
    event.respondWith(cacheFirst(event, req));
  }
});

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req.mode === 'navigate' ? './' : req, res.clone());
    return res;
  } catch (e) {
    const hit = await cache.match(req.mode === 'navigate' ? './' : req, { ignoreSearch: true });
    if (hit) return hit;
    throw e;
  }
}

async function cacheFirst(event, req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  const update = fetch(req)
    .then((res) => {
      if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
      return res;
    })
    .catch(() => null);
  if (hit) {
    event.waitUntil(update);
    return hit;
  }
  const res = await update;
  if (res) return res;
  return Response.error();
}
