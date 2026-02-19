import { randomUUID } from 'crypto'
import type { IngestEvent, IngestRequest, IngestResponse, StacktraceFrame } from '../domain/ingest'
import { ValidationError } from '../http/errors'
import { getProcessContextDynamic, getProcessContextStatic } from '../utils/processContext'
import { ensureDefined, ensureNonEmpty } from '../utils/validate'
import type { HttpClient } from '../http/httpClient'

export type IngestNormalizationOptions = {
    schemaVersion?: number
    includeContext?: boolean
    includeSystemContext?: boolean
    includeRuntimeContext?: boolean
    maxEventBytes?: number
    maxFrames?: number
    maxMessageLength?: number
    maxExceptionValueLength?: number
}

const DEFAULT_NORMALIZATION: Required<IngestNormalizationOptions> = {
    schemaVersion: 1,
    includeContext: true,
    includeSystemContext: true,
    includeRuntimeContext: true,
    maxEventBytes: 64 * 1024,
    maxFrames: 60,
    maxMessageLength: 4000,
    maxExceptionValueLength: 4000,
}

/**
 * Event ingestion API.
 */
export class IngestApi {
    /**
     * Creates the ingestion client with an optional default DSN and PublicKey.
     */
    constructor(
        private readonly http: HttpClient,
        private readonly defaultDsnKey?: string,
        private readonly normalization?: IngestNormalizationOptions,
        private readonly defaultPublicKey?: string
    ) { }

    /**
     * Sends an event to the ingestion backend.
     */
    async event(input: IngestRequest): Promise<IngestResponse> {
        ensureDefined(input, 'input')
        const dsnKey = input.dsnKey ?? this.defaultDsnKey
        const publicKey = input.publicKey ?? this.defaultPublicKey

        ensureDefined(dsnKey, 'dsnKey')
        ensureNonEmpty(dsnKey, 'dsnKey')
        ensureDefined(input.event, 'event')

        if (!this.http.hasApiKey() && !publicKey) {
            throw new ValidationError('publicKey is required when apiKey is not provided')
        }

        if (input.idempotencyKey && input.idempotencyKey.length > 128) {
            throw new ValidationError('idempotencyKey must be at most 128 characters')
        }
        const headers: Record<string, string> = {}
        if (input.idempotencyKey) headers['x-idempotency-key'] = input.idempotencyKey
        if (input.sdkVersion) headers['x-sdk-version'] = input.sdkVersion
        const { idempotencyKey, sdkVersion, event, ...body } = input
        const normalizedEvent = normalizeEvent(event, this.normalization)
        
        const authMode = this.http.hasApiKey() ? 'apiKey' : 'none'
        return this.http.post<IngestResponse>('/ingest/events', { ...body, dsnKey, publicKey, event: normalizedEvent }, { auth: authMode, headers })
    }

    async health(dsnKey?: string, publicKey?: string): Promise<{ ok: boolean }> {
        const resolvedDsnKey = dsnKey ?? this.defaultDsnKey
        const resolvedPublicKey = publicKey ?? this.defaultPublicKey

        ensureDefined(resolvedDsnKey, 'dsnKey')
        ensureNonEmpty(resolvedDsnKey, 'dsnKey')
        
        const authMode = this.http.hasApiKey() ? 'apiKey' : 'none'
        return this.http.post<{ ok: boolean }>('/ingest/health', { dsnKey: resolvedDsnKey, publicKey: resolvedPublicKey }, { auth: authMode })
    }
}

function normalizeEvent(event: IngestEvent, options?: IngestNormalizationOptions): IngestEvent {
    const config = { ...DEFAULT_NORMALIZATION, ...options }
    const normalizedTimestamp = normalizeTimestamp(event.timestamp)
    const normalizedLevel = event.level ? event.level.toLowerCase() : undefined
    const normalizedMessage = event.message ? truncate(event.message, config.maxMessageLength) : undefined
    const normalizedException = normalizeException(event.exception, config)
    if (!normalizedMessage && !normalizedException) {
        throw new ValidationError('event message or exception is required')
    }
    const normalizedContext = normalizeContext(event.context, config)
    const normalizedEvent: IngestEvent = {
        ...event,
        event_id: event.event_id ?? randomUUID(),
        timestamp: normalizedTimestamp,
        schema_version: event.schema_version ?? config.schemaVersion,
        level: normalizedLevel as IngestEvent['level'],
        message: normalizedMessage,
        exception: normalizedException,
        context: normalizedContext,
    }
    return enforceSizeLimit(normalizedEvent, config)
}

function normalizeTimestamp(timestamp?: string) {
    if (!timestamp) return new Date().toISOString()
    const parsed = new Date(timestamp)
    if (Number.isNaN(parsed.getTime())) {
        throw new ValidationError('timestamp must be a valid ISO date')
    }
    return parsed.toISOString()
}

function normalizeException(exception: IngestEvent['exception'], config: Required<IngestNormalizationOptions>) {
    if (!exception) return undefined
    if (!exception.type || !exception.value) {
        throw new ValidationError('exception.type and exception.value are required')
    }
    return {
        ...exception,
        value: truncate(exception.value, config.maxExceptionValueLength),
        stacktrace: normalizeStacktrace(exception.stacktrace, config.maxFrames),
    }
}

function normalizeStacktrace(stacktrace: { frames?: StacktraceFrame[] } | undefined, maxFrames: number) {
    if (!stacktrace || !Array.isArray(stacktrace.frames)) return undefined
    const frames = stacktrace.frames
    const normalizedFrames = frames.slice(0, maxFrames).map((frame) => {
        const filename = typeof frame?.filename === 'string' ? frame.filename : undefined
        const functionName = typeof frame?.function === 'string' ? frame.function : undefined
        const lineno = typeof frame?.lineno === 'number' ? frame.lineno : undefined
        const colno = typeof frame?.colno === 'number' ? frame.colno : undefined
        const inferredInApp = filename ? !filename.includes('node_modules') : false
        return {
            filename,
            function: functionName,
            lineno,
            colno,
            in_app: typeof frame?.in_app === 'boolean' ? frame.in_app : inferredInApp,
        }
    })
    return { frames: normalizedFrames }
}

function normalizeContext(context: IngestEvent['context'] | undefined, config: Required<IngestNormalizationOptions>) {
    if (!config.includeContext) return context
    const systemContext = config.includeSystemContext ? getProcessContextDynamic() : undefined
    const runtimeContext = config.includeRuntimeContext ? getProcessContextStatic({ includeVersions: false }) : undefined
    const mergedContext = {
        ...context,
        system: context?.system ?? systemContext,
        runtime: context?.runtime ?? runtimeContext,
    }
    return mergedContext
}

function enforceSizeLimit(event: IngestEvent, config: Required<IngestNormalizationOptions>) {
    let normalized = event
    if (getSize(normalized) <= config.maxEventBytes) return normalized
    if (normalized.extra) {
        normalized = { ...normalized, extra: undefined }
    }
    if (getSize(normalized) <= config.maxEventBytes) return normalized
    if (normalized.tags) {
        normalized = { ...normalized, tags: undefined }
    }
    if (getSize(normalized) <= config.maxEventBytes) return normalized
    if (normalized.exception?.stacktrace) {
        normalized = {
            ...normalized,
            exception: { ...normalized.exception, stacktrace: undefined },
        }
    }
    if (getSize(normalized) <= config.maxEventBytes) return normalized
    if (normalized.message) {
        normalized = { ...normalized, message: truncate(normalized.message, config.maxMessageLength) }
    }
    if (normalized.exception?.value) {
        normalized = {
            ...normalized,
            exception: { ...normalized.exception, value: truncate(normalized.exception.value, config.maxExceptionValueLength) },
        }
    }
    if (getSize(normalized) <= config.maxEventBytes) return normalized
    throw new ValidationError('event payload exceeds size limit')
}

function getSize(value: unknown) {
    return Buffer.byteLength(JSON.stringify(value), 'utf8')
}

function truncate(value: string, maxLength: number) {
    if (value.length <= maxLength) return value
    return value.slice(0, maxLength)
}
