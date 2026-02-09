# Observa SDK for Node.js

Official SDK for sending ingest events and uptime heartbeats to Observa.

## Who is this for?

This SDK is intended for backend services, workers, and server-side applications.
It is not designed for browser usage.

## SDK Contract

This SDK is an official client for the Observa backend.
It targets a fixed API and does not support custom base URLs.

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
})
```

The SDK targets the Observa backend health endpoint for internal availability checks.

## Defaults

- Timeout: 5 seconds
- Retries: disabled by default
- `dsnKey` is required for ingest and uptime writes

## Ingest Events

```ts
const result = await sdk.ingest.event({
  event: {
    level: 'error',
    message: 'Something went wrong',
    payload: { requestId: 'req_123' },
  },
})

console.log(result.event_id)
```

Required:
- `apiKey` is sent as `x-api-key` header
- `dsnKey` is sent in the body as `dsnKey`

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

- Documentation: https://observa.dev/docs
- GitHub: https://github.com/ObservaSolutions/observa-sdk
