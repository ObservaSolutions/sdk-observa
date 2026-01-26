# Observa SDK (Node.js) — Roadmap y Checklist

Objetivo v1: Captura y envío de eventos JSON (errores + contexto) con ALS por request, Integrations de proceso/Express, transporte HTTP confiable (cola), y preparación para tracing (propagationContext y stubs), alineado con la [Guía de arquitectura](file:///Users/nahuelschmidt/Desktop/Nahuel/Trabajo/observa/observa-sdk-node/docs/SDK_GUIDE.md#L1-369).

## Estado Actual

- Core
  - Hub: inicialización, delega capturas, usa Queue/Transport: [hub.ts]
  - Client: arma ObservaEvent, sample/beforeSend, contexts.trace: [client.ts]
  - Scope: ALS + stack de scopes + setUser/setTag/etc.: [scope.ts]
- Transport
  - HTTP con timeout y auth opcional: [httpTransport.ts]
  - Cola en memoria con flush: [queue.ts]
  - Rate limit (vacío): [rateLimit.ts]
- Integrations
  - Proceso: unhandledRejection/uncaughtException + flush: [process.ts]
  - Express: requestHandler/errorHandler: [express.ts]
  - HTTP saliente (vacío): [http.ts]
- Tracing
  - Headers (helper simple): [headers.ts]
  - Propagation (continueTraceFromHeaders, getTraceHeaders, startTransaction, startSpan): [propagation.ts]
- Types y Utils
  - Types: [event.ts], [breadcrumb.ts], [options.ts]
  - Utils: [stacktrace.ts], [normalize.ts], [uuid.ts]
- Entrypoints y Config
  - Entrypoint raíz ESM: [index.ts]
  - Entrypoint en src: [src/index.ts]
  - package.json mínimo sin build/exports dual: [package.json]
  - tsconfig en modo bundler con noEmit y allowImportingTsExtensions: [tsconfig.json]

## Pendiente/Incompleto

- Tracing
  - Completar propagation.ts (continueTraceFromHeaders, getTraceHeaders, startTransaction, startSpan)
  - Decidir si consolidar helpers en propagation.ts y deprecar headers.ts
- Transport resiliencia
  - Implementar rate limit (token bucket/ventana deslizante)
  - Retry con backoff para 5xx/network; respetar 429 (Retry-After)
  - Batch pequeño opcional en cola (p. ej., 10)
- Integrations
  - HTTP saliente: breadcrumbs + propagación de headers + captura de errores
- NPM-ready
  - Build dual ESM/CJS (exports), dist y types, scripts de build
  - LICENSE (MIT) y README con Quick Start
- Calidad
  - Tests (vitest) para Client/Queue/Transport/Scope/Integrations
  - Linter (eslint) y CI
- Limpieza
  - Unificar core/hub y core/sdk (mantener uno solo)
  - Ajustar entrypoints a dist durante publicación
- Evolución
  - contexts.trace en v1.1; transacciones/spans en v2

## Roadmap por Fases

- Fase 1: Tracing básico y limpieza
  - Completar propagation.ts
  - Unificar tracing (propagation vs headers)
  - Consolidar hub/sdk (dejar solo hub)
- Fase 2: Transport robusto
  - Rate limit configurable
  - Retry con backoff y manejo de 429
  - Opcional: batching en EventQueue
- Fase 3: Integrations HTTP saliente
  - Instrumentación http/https.request
  - Propagación headers observa-trace/sentry-trace
  - Breadcrumbs de requests y captura de errores
- Fase 4: Publicación npm
  - package.json con exports dual, scripts de build, files y types
  - Generar dist y validar consumo ESM/CJS
  - LICENSE y README
- Fase 5: Calidad
  - Test unitarios y CI mínima
  - Linter y control de estilo
- Fase 6: Tracing v1.1/v2
  - contexts.trace siempre que haya propagationContext
  - API de transacciones/spans y sampling

## Checklist Detallado

- Core & Scope
  - [x] Hub/Client/Scope mínimos
  - [x] ALS por request y stack de scopes
  - [x] API pública (init/capture/contexto)
- Transport
  - [x] HTTP send + timeout
  - [x] Cola y flush
  - [ ] Rate limit
  - [ ] Retry + backoff
  - [ ] Respeto de 429 y Retry-After
- Integrations
  - [x] Process (unhandledRejection/uncaughtException)
  - [x] Express (requestHandler/errorHandler)
  - [ ] HTTP saliente (breadcrumbs + propagación + errores)
- Tracing
  - [ ] propagation.ts completo
  - [ ] Decisión de formato de headers definitivo (observa-trace/sentry-trace)
  - [ ] contexts.trace consistente en eventos (v1.1)
- Types & Utils
  - [x] Types base (event/breadcrumb/options)
  - [x] uuid.ts seguro (evita undefined)
  - [x] stacktrace.ts compatible con noUncheckedIndexedAccess
- Publicación
  - [ ] package.json con exports (ESM/CJS) y scripts
  - [ ] Generar dist y types (.d.ts)
  - [ ] LICENSE y README
- Calidad
  - [ ] Tests unitarios (jest) por módulo
  - [ ] Linter (eslint) y CI (GitHub Actions)
  - [ ] Añadir JSDoc a todas las funciones

## Notas de Implementación

- ALS: aislar contexto por request con AsyncLocalStorage; baseScope global y push/pop/withScope para nesting.
- Resiliencia: el SDK no debe romper apps; si falla, degradar a no-op; timeouts cortos en HTTP.
- Privacidad: beforeSend para sanear datos sensibles; sampleRate controla volumen.
- Tracing: guardar propagationContext desde v1 para futura evolución; exponer stubs sin romper la API.
