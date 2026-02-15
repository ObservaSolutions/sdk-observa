import type { IngestRequest, IngestResponse } from '../domain/ingest'
import { ValidationError } from '../http/errors'
import { ensureDefined, ensureNonEmpty } from '../utils/validate'
import type { HttpClient } from '../http/httpClient'

/**
 * Event ingestion API.
 */
export class IngestApi {
    /**
     * Creates the ingestion client with an optional default DSN.
     */
    constructor(private readonly http: HttpClient, private readonly defaultDsnKey?: string) { }

    /**
     * Sends an event to the ingestion backend.
     */
    async event(input: IngestRequest): Promise<IngestResponse> {
        ensureDefined(input, 'input')
        const dsnKey = input.dsnKey ?? this.defaultDsnKey
        ensureDefined(dsnKey, 'dsnKey')
        ensureNonEmpty(dsnKey, 'dsnKey')
        ensureDefined(input.event, 'event')
        if (input.idempotencyKey && input.idempotencyKey.length > 128) {
            throw new ValidationError('idempotencyKey must be at most 128 characters')
        }
        const headers: Record<string, string> = {}
        if (input.idempotencyKey) headers['x-idempotency-key'] = input.idempotencyKey
        if (input.sdkVersion) headers['x-sdk-version'] = input.sdkVersion
        const { idempotencyKey, sdkVersion, ...body } = input
        return this.http.post<IngestResponse>('/ingest/events', { ...body, dsnKey }, { auth: 'apiKey', headers })
    }

    async health(dsnKey?: string): Promise<{ ok: boolean }> {
        const resolvedDsnKey = dsnKey ?? this.defaultDsnKey
        ensureDefined(resolvedDsnKey, 'dsnKey')
        ensureNonEmpty(resolvedDsnKey, 'dsnKey')
        return this.http.post<{ ok: boolean }>('/ingest/health', { dsnKey: resolvedDsnKey }, { auth: 'apiKey' })
    }
}
