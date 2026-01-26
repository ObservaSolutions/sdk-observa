# Observa SDK (Node.js) — Guía de arquitectura

Objetivo: construir un SDK para Node.js que hoy envíe **eventos JSON simples** (errores + contexto) y quede preparado para sumar **distributed tracing** sin romper la API pública ni el contrato con el backend.  
Además, desde el inicio debe estar diseñado para publicarse como paquete de **npm** (build, exports, typings, versionado).

---

## 0) Principios de diseño

- **No romper apps**: el SDK nunca debe tirar excepciones hacia la app; si falla, degradar a no-op.  
- **Separación clara**: Core (captura/ensamble) separado de Transport (envío) separado de Integrations (framework/runtime).  
- **Contexto por request**: en Node, el SDK debe soportar scopes aislados por request usando AsyncLocalStorage (ALS). El patrón ALS permite crear un “bubble” de contexto por request sin colisiones entre requests concurrentes.
- **Preparado para tracing**: guardar `propagationContext` desde el día 1, y luego agregar envío de `contexts.trace` y transacciones/spans.

---

## 1) Arquitectura del SDK (alto nivel)

Componentes principales (patrón tipo Sentry):

1. **Hub**: punto de entrada del SDK; expone API pública y decide a qué Client/Scope usar.
2. **Scope**: contexto adjunto a cada evento (user, tags, extra, breadcrumbs). Sentry usa “scopes” para enriquecer eventos con contexto.
3. **Client**: arma el evento final (merge de scope + evento) y lo manda al transport.
4. **Transport**: responsabilidad de enviar (HTTP), con cola, rate limit y retry. Sentry documenta “transports” como la capa de envío.
5. **Integrations**: conectores para runtime/framework (process, express, http) que capturan automáticamente eventos (sin código extra del usuario).

Diagrama:

```text
App Code
  ├─ init()
  ├─ captureException()
  ├─ setUser(), setTag(), addBreadcrumb()
  ↓
Hub (ALS-backed)
  ↓
Scope (per-request) + Base Scope (global)
  ↓
Client -> normalize/build Event JSON
  ↓
Transport (queue + rate limit + retry)
  ↓
Backend ingest endpoint (JSON)
```

---

## 2) Estructura del proyecto (npm-ready)

Propuesta de carpetas:

```text
observa-sdk-node/
  src/
    index.ts
    core/
      hub.ts
      scope.ts
      client.ts
      sdk.ts
    transport/
      httpTransport.ts
      queue.ts
      rateLimit.ts
    integrations/
      process.ts
      express.ts
      http.ts
    tracing/
      propagation.ts
      headers.ts
    types/
      event.ts
      breadcrumb.ts
      options.ts
    utils/
      stacktrace.ts
      normalize.ts
      uuid.ts
  package.json
  tsconfig.json
  README.md
  LICENSE
```

Notas:

- Mantener el core sin dependencias pesadas (ideal: 0 deps o muy pocas).
- Transport y parsers pueden estar en módulos separados para testearlos y reemplazarlos.

---

## 3) API pública (MVP)

### 3.1 init()

```ts
init({
  dsn?: string,              // o ingestUrl + apiKey, lo que acuerden con backend
  ingestUrl: string,         // endpoint base
  environment?: string,      // production/staging
  release?: string,          // "1.2.3" o commit
  enabled?: boolean,         // default true
  sampleRate?: number,       // eventos (errores) 0..1
  tracesSampleRate?: number, // futuro (tracing)
  beforeSend?: (event) => event | null,
  integrations?: Integration[],
})
```

### 3.2 captura

- `captureException(error, hint?) -> eventId`
- `captureMessage(message, level?, hint?) -> eventId`

### 3.3 contexto

- `setUser(user | null)`
- `setTag(key, value)`
- `setExtra(key, value)`
- `addBreadcrumb(breadcrumb)`
- `withScope(cb)` / `pushScope()` / `popScope()`

(Scoping es clave para request-level context).

---

## 4) Scope y AsyncLocalStorage (aislamiento por request)

### 4.1 Por qué ALS

En Node, ALS permite mantener un store asociado al contexto asíncrono de un request, y leerlo desde cualquier función async sin pasarlo por parámetros; es el patrón recomendado para “contexto por request”.

### 4.2 Modelo del Scope

```ts
type Scope = {
  user?: { id?: string; email?: string; username?: string };
  tags: Record<string, string>;
  extra: Record<string, unknown>;
  breadcrumbs: Breadcrumb[];
  context?: {
    environment?: string;
    release?: string;
    service?: string;
  };

  // Preparación para tracing desde el día 1
  propagationContext: {
    trace_id?: string;
    span_id?: string;
    sampled?: boolean;
  };
};
```

### 4.3 Stack de scopes

- Global/base scope: config general (environment, release, service).
- Request scope: creado en middleware (`requestHandler()`).
- Nested scope: `withScope` para jobs o secciones críticas.

---

## 5) Client y Event JSON (simple y extensible)

### 5.1 Payload base (MVP)

Definí un schema estable:

```ts
type ObservaEvent = {
  event_id: string;
  timestamp: string;     // ISO
  level: 'error'|'warning'|'info'|'debug';
  message?: string;

  exception?: {
    type: string;
    value: string;
    stacktrace?: { frames: Frame[] };
  };

  environment?: string;
  release?: string;

  user?: Scope['user'];
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  breadcrumbs?: Breadcrumb[];

  sdk?: { name: string; version: string };
  schema_version: 1;

  // tracing-ready (opcional en v1; usable en v1.1+)
  contexts?: {
    trace?: { trace_id: string; span_id?: string; sampled?: boolean };
  };
};
```

Sentry define modelos de payloads de eventos y también modelos de trace/span/transaction para su sistema de tracing; te conviene usar una estructura similar (aunque propia) para facilitar evolución.

### 5.2 Hooks

- `beforeSend(event)`: sanitizar datos sensibles o ignorar eventos. (Si retorna `null`, drop).
- `sampleRate`: drop probabilístico.

---

## 6) Transport (HTTP) + resiliencia

Sentry separa explícitamente la capa de transporte para controlar cómo se envía.

MVP recomendado:

- `HttpTransport.send(event: ObservaEvent): Promise<void>`
- Cola en memoria: `queue.push(event)`
- Flush async con batch chico (ej. 10) o 1 a 1 inicialmente.
- Retry con backoff para errores de red/5xx.
- Rate limit por minuto para evitar DDOS involuntario por loops de error.

Política:

- Timeouts cortos (3–5s).
- Si el backend responde 429, respetar `Retry-After` si lo envían.

---

## 7) Integrations (MVP)

### 7.1 Process Integration (crítico)

Capturar:

- `unhandledRejection`
- `uncaughtException`

Sentry tiene integración específica para `unhandledRejection` en Node y es un patrón estándar para capturar errores no manejados.

Política recomendada:

- En `unhandledRejection`: capturar + seguir.
- En `uncaughtException`: capturar + `flush()` rápido; la decisión de `process.exit(1)` debería ser configurable (porque muchas arquitecturas prefieren reiniciar el proceso). (Esto se decide con tu backend/equipo.)

### 7.2 Express Integration

- `requestHandler()`:
  - crea un scope por request con ALS (`als.run(scope, () => next())`)
  - agrega tags: `http.method`, `http.route`, `http.url`
  - si existe `req.user`, setea `user` en el scope
  - agrega breadcrumbs de requests salientes (si luego integrás http)
  - `errorHandler(err, req, res, next)`:
  - `captureException(err, { request: ... })`
  - `next(err)`

---

## 8) Tracing (preparación desde el día 1)

### 8.1 Qué implementar ahora (aunque no se use)

- Guardar `propagationContext` en el scope.
- Exponer funciones “no-op” (o behind a flag):
  - `startTransaction()`
    - `startSpan()`
    - `getTraceHeaders()`
    - `continueTraceFromHeaders(headers)`

### 8.2 Headers de propagación (cuando llegue el momento)

Sentry usa headers como `sentry-trace` y `baggage` para continuar trazas entre servicios; tu SDK puede adoptar el mismo enfoque cuando habiliten distributed tracing.

### 8.3 Evolución recomendada

- v1: errores (JSON) + scope + breadcrumbs + ALS + `propagationContext` interno.
- v1.1: enviar `contexts.trace` en eventos (backend puede ignorarlo).
- v2: transactions/spans + propagación HTTP completa + sampling de trazas.

---

## 9) Preparación para npm (desde el inicio)

### 9.1 package.json es obligatorio

Para publicar en el registry, el paquete debe incluir `package.json`. `name` y `version` son campos requeridos y `name` debe ser lowercase sin espacios.

### 9.2 Dual ESM/CJS (recomendado)

Muchos usuarios en Node aún consumen CJS, y otros ya usan ESM; soportar ambos evita fricción.

- Usar `exports` para definir entrypoints y controlar resolución del paquete.
- Considerar un build dual (CJS + ESM) y typings compartidos.
- TypeScript y Node “nodenext”/interoperabilidad: las reglas ESM/CJS impactan en compilación; `type: "module"` y `--module nodenext` son parte del modelo moderno.

Ejemplo de `package.json` (plantilla):

```json
{
  "name": "@observa/sdk-node",
  "version": "0.1.0",
  "description": "Observa SDK for Node.js",
  "license": "MIT",
  "repository": { "type": "git", "url": "https://github.com/tuorg/observa-sdk-node.git" },
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "files": ["dist", "README.md", "LICENSE"],
  "sideEffects": false,
  "engines": { "node": ">=18" },
  "scripts": {
    "build": "tsup src/index.ts --format esm,cjs --dts",
    "test": "vitest run",
    "lint": "eslint ."
  }
}
```

La idea de usar `exports` con `import`/`require` para dual publishing es un approach estándar y documentado en guías modernas.

---

## 10) Checklist de implementación (orden sugerido)

1. Core mínimo:
    - Hub + Scope + ALS store
    - API: `init`, `captureException`, `setUser/setTag/addBreadcrumb`
2. Transport:
    - HTTP send + timeout
    - queue + flush
3. Process integration:
    - `unhandledRejection` / `uncaughtException` -> capture + flush
4. Express integration:
    - requestHandler + errorHandler (ALS per request)
5. Tracing-ready:
    - `propagationContext` en Scope
    - stubs de API de tracing
6. NPM publishing:
    - build dual ESM/CJS + exports + d.ts
    - CI y versionado

---

## 11) Contrato a acordar con backend (muy importante)

Antes de codear, alinearse con tu amigo en:

- Auth: ¿DSN tipo Sentry, o `ingestUrl + apiKey`?
- Endpoint: `POST /api/store` (body JSON)
- Respuestas: 200 OK con `{ event_id }`, 4xx para auth/schema, 429 para rate limit.
- Campos mínimos del evento que backend necesita hoy vs opcionales.

---

## 12) “Definition of Done” del SDK v1

- Instalable por npm y usable en 2 líneas (`init` + middleware).
- Captura automática de errores de proceso (`unhandledRejection` / `uncaughtException`).
- Express: contexto por request aislado (ALS).
- Envío confiable (queue + retry básico).
- Preparado para tracing (propagationContext + stubs), sin romper API cuando se active.
