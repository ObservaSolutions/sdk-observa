import { IngestApi, type IngestNormalizationOptions } from './apis/ingestApi'
import { UptimeApi } from './apis/uptimeApi'
import { HttpClient, type RetryPolicy } from './http/httpClient'
import {
    getProcessContext,
    getProcessContextDynamic,
    getProcessContextStatic,
    type ProcessContext,
    type ProcessContextDynamic,
    type ProcessContextDynamicOptions,
    type ProcessContextOptions,
    type ProcessContextStatic,
    type ProcessContextStaticOptions,
} from './utils/processContext'

/**
 * SDK configuration options.
 */
export type ObservaSDKOptions = {
    /**
     * Organization API key used to authenticate SDK requests.
     */
    apiKey?: string
    /**
     * Project DSN used to identify the destination of events and heartbeats.
     */
    dsnKey: string
    /**
     * Public key for frontend/mobile projects.
     */
    publicKey?: string
    baseUrl?: string
    /**
     * HTTP request timeout in milliseconds.
     */
    timeoutMs?: number
    /**
     * Retry policy for transient errors.
     */
    retry?: RetryPolicy
    /**
     * Additional headers sent with every request.
     */
    headers?: Record<string, string>
    ingest?: IngestNormalizationOptions
}

/**
 * Fixed backend target for the SDK.
 */
const DEFAULT_BASE_URL = 'https://backend-observa-production.up.railway.app/v1'

/**
 * Main SDK for error ingestion and uptime heartbeats.
 */
export class ObservaSDK {
    /**
     * Uptime API (heartbeats and public reads).
     */
    readonly uptime: UptimeApi
    /**
     * Event ingestion API.
     */
    readonly ingest: IngestApi

    private readonly http: HttpClient

    /**
     * Creates an SDK instance with required dsnKey and either apiKey or publicKey.
     */
    constructor(options: ObservaSDKOptions) {
        if (!options || (!options.apiKey && !options.publicKey) || !options.dsnKey) {
            throw new Error('ObservaSDK requires dsnKey and either apiKey or publicKey')
        }
        const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '')
        const normalizedBaseUrl = baseUrl.endsWith('/v1') ? baseUrl : `${baseUrl}/v1`
        this.http = new HttpClient({
            baseUrl: normalizedBaseUrl,
            apiKey: options.apiKey,
            timeoutMs: options.timeoutMs,
            retry: options.retry,
            headers: options.headers,
        })
        this.ingest = new IngestApi(this.http, options.dsnKey, options.ingest, options.publicKey)
        this.uptime = new UptimeApi(this.http, options.dsnKey)
        this.http.startHealthCheck(() => this.ingest.health(options.dsnKey, options.publicKey))
    }

    /**
     * Updates the API key used by the SDK at runtime.
     */
    setApiKey(apiKey: string) {
        this.http.setApiKey(apiKey)
    }

    getProcessContext(options?: ProcessContextOptions): ProcessContext {
        return getProcessContext(options)
    }

    getProcessContextStatic(options?: ProcessContextStaticOptions): ProcessContextStatic {
        return getProcessContextStatic(options)
    }

    getProcessContextDynamic(options?: ProcessContextDynamicOptions): ProcessContextDynamic {
        return getProcessContextDynamic(options)
    }
}
