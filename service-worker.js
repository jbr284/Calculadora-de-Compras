// [CORREÇÃO 1] Nome do cache único para este app
const CACHE_NAME = 'compras-cache-v1';

// [CORREÇÃO 2] Adicionei as bibliotecas do PDF aqui para funcionarem offline
const FILES_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png', // Certifique-se que estes arquivos existem na pasta
  './icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.21/jspdf.plugin.autotable.min.js'
];

self.addEventListener('install', function(event) {
  // Forçar atualização imediata (como fizemos na Agenda)
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(FILES_TO_CACHE);
    }).catch(function(err) {
      console.error("Erro ao adicionar arquivos ao cache:", err);
    })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
      .catch(() => caches.match('./index.html'))
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});
