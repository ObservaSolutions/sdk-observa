/**
 * Main SDK.
 */
export { ObservaSDK } from './sdk'
/**
 * SDK options.
 */
export type { ObservaSDKOptions } from './sdk'

/**
 * Base HTTP client.
 */
export { HttpClient } from './http/httpClient'
/**
 * HTTP types.
 */
export type { HttpClientOptions, RequestOptions, RetryPolicy, AuthMode } from './http/httpClient'

/**
 * Typed SDK errors.
 */
export {
  SdkError,
  ValidationError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ServerError,
  NetworkError,
  TimeoutError,
} from './http/errors'

/**
 * Domain APIs.
 */
export { UptimeApi } from './apis/uptimeApi'
export { IngestApi } from './apis/ingestApi'

/**
 * Uptime types.
 */
export type { UptimeEvent, UptimeStatus, UptimeHeartbeatInput, UptimeSummary } from './domain/uptime'
/**
 * Ingestion types.
 */
export type { IngestEvent, IngestLevel, IngestRequest, IngestResponse, IngestException, Stacktrace, StacktraceFrame } from './domain/ingest'
export type {
  ProcessContext,
  ProcessContextDynamic,
  ProcessContextDynamicOptions,
  ProcessContextOptions,
  ProcessContextStatic,
  ProcessContextStaticOptions,
} from './utils/processContext'
export { getProcessContext, getProcessContextDynamic, getProcessContextStatic } from './utils/processContext'
