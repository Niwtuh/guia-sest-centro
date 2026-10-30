/* 
=========================================================================
 * sw.js — Service Worker do Guia Acadêmico SEST SENAT Centro
 * -------------------------------------------------------------------------
 * OBJETIVO: Garantir que o aplicativo abra mesmo SEM internet (offline-first).
 *
 * COMO FUNCIONA (em 3 passos didáticos):
 * 1) INSTALL : navegador baixa e guarda no cache todos os arquivos listados.
 * 2) ACTIVATE : limpa caches antigos (se houver) para liberar espaço.
 * 3) FETCH : quando o app pede um arquivo, tentamos primeiro o cache;
 * se não estiver lá, buscamos na rede e guardamos para a próxima.
 *
 * Observação: a estratégia usada é "cache-first" — ideal para apps cujo
 * conteúdo muda pouco (mapa, salas, calculadora) e que precisam abrir
 * instantaneamente na sala de aula mesmo com Wi-Fi instável.
========================================================================= */

// Lista de arquivos essenciais que devem funcionar offline.
const ARQUIVOS_PARA_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./js/app.js",
  "./js/storage.js",
  "./js/calculadora.js",
  "./js/mapa.js",
  "./data/locais.json"
];

// Nome do cache — incrementar a versão (v1 -> v2) a cada mudança estrutural
const NOME_CACHE = "sest-guia-v1";

// ────────────────────────────────────────────────────────────────────────
// EVENTO 1: INSTALL — disparado quando o SW é registrado pela primeira vez
// ────────────────────────────────────────────────────────────────────────
self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches.open(NOME_CACHE)
      .then((cache) => cache.addAll(ARQUIVOS_PARA_CACHE))
      .then(() => self.skipWaiting())
  );
});

// ────────────────────────────────────────────────────────────────────────
// EVENTO 2: ACTIVATE — disparado após o install; limpa caches antigos
// ────────────────────────────────────────────────────────────────────────
self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((listaDeCaches) => {
        return Promise.all(
          listaDeCaches
            .filter((nome) => nome !== NOME_CACHE)
            .map((nome) => caches.delete(nome))
        );
      })
      .then(() => self.clients.claim())
  );
});

// ────────────────────────────────────────────────────────────────────────
// EVENTO 3: FETCH — busca do cache primeiro, senão vai na rede
// ────────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (evento) => {
  if (evento.request.method !== "GET") return;

  evento.respondWith(
    caches.match(evento.request).then((respostaDoCache) => {
      return respostaDoCache || fetch(evento.request).then((respostaDaRede) => {
        const copia = respostaDaRede.clone();
        caches.open(NOME_CACHE).then((cache) => cache.put(evento.request, copia));
        return respostaDaRede;
      }).catch(() => {
        return new Response(
          "Conteúdo indisponível offline. Verifique sua conexão e tente novamente.",
          { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } }
        );
      });
    })
  );
});
