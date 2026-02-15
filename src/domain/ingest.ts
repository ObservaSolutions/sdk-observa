import type { ProcessContextDynamic, ProcessContextStatic } from '../utils/processContext'

/**
 * Severity levels for events.
 */
export type IngestLevel = 'debug' | 'info' | 'warning' | 'warn' | 'error' | 'fatal'

export type StacktraceFrame = {
    filename?: string
    function?: string
    lineno?: number
    colno?: number
}

export type Stacktrace = {
    frames: StacktraceFrame[]
}

export type IngestException = {
    type: string
    value: string
    stacktrace?: Stacktrace
}

export type RequestContext = {
    requestId?: string
    userId?: string
    [key: string]: unknown
}

export type IngestEventContext = {
    system?: ProcessContextDynamic
    runtime?: ProcessContextStatic
    request?: RequestContext
}

/**
 * Ingestion event.
 */
export type IngestEvent = {
    /**
     * Unique event identifier.
     */
    event_id?: string
    /**
     * Event ISO timestamp.
     */
    timestamp?: string
    schema_version?: number
    /**
     * Severity level.
     */
    level?: IngestLevel
    /**
     * Main message.
     */
    message?: string
    exception?: IngestException
    context?: IngestEventContext
    tags?: Record<string, string>
    extra?: Record<string, unknown>
}

/**
 * Payload for sending an event to the backend.
 */
export type IngestRequest = {
    /**
     * Project DSN. Uses the SDK default when omitted.
     */
    dsnKey?: string
    /**
     * Event to record.
     */
    event: IngestEvent
    idempotencyKey?: string
    sdkVersion?: string
}

/**
 * Response after sending an event.
 */
export type IngestResponse = {
    /**
     * Assigned event identifier.
     */
    event_id: string
}
