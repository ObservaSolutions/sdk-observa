# Observa SDK for Node.js

Official SDK for sending ingest events and uptime heartbeats to Observa.

## Who is this for?

This SDK is intended for backend services, workers, and server-side applications.
It is not designed for browser usage.

## SDK Contract

This SDK is an official client for the Observa backend.
You can optionally override the backend `baseUrl`; the SDK ensures the `/v1` prefix.

## Concepts

- **apiKey**: Organization-level credential used for authentication.
- **dsnKey**: Project-level identifier used to route events and heartbeats.

## Installation

```bash
npm install @observa/sdk
```

## Usage

```ts
import { ObservaSDK } from '@observa/sdk'

const sdk = new ObservaSDK({
  apiKey: 'org_api_key',
  dsnKey: 'project_dsn',
  baseUrl: 'https://backend-observa-production.up.railway.app',
})
```

The SDK validates credentials through the ingest health endpoint.

## Defaults

- Timeout: 5 seconds
- Retries: disabled by default
- `baseUrl` defaults to the Observa backend and is normalized to `/v1`
- `dsnKey` is required for ingest and uptime writes

## Ingest Events

```ts
const result = await sdk.ingest.event({
  event: {
    schema_version: 1,
    level: 'error',
    message: 'Something went wrong',
    exception: {
      type: 'Error',
      value: 'Timeout',
      stacktrace: {
        frames: [{ filename: 'src/service.ts', function: 'doWork', lineno: 42, colno: 13 }],
      },
    },
    tags: { service: 'billing' },
    extra: { requestId: 'req_123' },
    context: {
      system: sdk.getProcessContextDynamic(),
      runtime: sdk.getProcessContextStatic({ includeVersions: false }),
      request: { requestId: 'req_123' },
    },
  },
  idempotencyKey: 'req_123',
  sdkVersion: '2.0.0',
})

console.log(result.event_id)
```

Required:
- `apiKey` is sent as `x-api-key` header
- `dsnKey` is sent in the body as `dsnKey`

Optional:
- `idempotencyKey` is sent as `x-idempotency-key` header (max 128 chars)
- `sdkVersion` is sent as `x-sdk-version` header

Event context:
- `schema_version` identifies the event schema version.
- `context.system` carries dynamic process info (pid, uptime, memory).
- `context.runtime` carries static runtime info (node, arch, platform, release).
- `context.request` carries request-scoped metadata (requestId, userId, etc.).

## Uptime Heartbeats

```ts
const heartbeat = await sdk.uptime.recordHeartbeat({
  status: 'up',
  responseTimeMs: 120,
  checkedAt: new Date().toISOString(),
  message: 'Service healthy',
})

console.log(heartbeat.id)
```

## Ingest Health

```ts
const health = await sdk.ingest.health()
console.log(health.ok)
```

## Uptime Queries

```ts
const history = await sdk.uptime.history('project_id', '2026-02-08')
const latest = await sdk.uptime.latest('project_id')
const summary = await sdk.uptime.summary('project_id', 30)
```

These endpoints are public and do not require authentication.

## Updating Credentials

```ts
sdk.setApiKey('new_api_key')
```

## Error Handling

The SDK throws typed errors you can catch explicitly:

```ts
import { RateLimitError, AuthError } from '@observa/sdk'

try {
  await sdk.ingest.event({ event: { level: 'error', message: 'boom' } })
} catch (error) {
  if (error instanceof RateLimitError) {
    console.log('Retry after seconds:', error.retryAfter)
  }
  if (error instanceof AuthError) {
    console.log('Authentication failed')
  }
}
```

## Requirements

- Node.js >= 18

## License

MIT

## Links

- Documentation: ...
- GitHub: https://github.com/ObservaSolutions/sdk-observa
