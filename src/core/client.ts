import type { SDKOptions } from '../types/options'
import type { ObservaEvent } from '../types/event'
import type { Scope } from './scope'
import { uuid4 } from '../utils/uuid'
import { parseStack } from '../utils/stacktrace'
import { normalizeEvent } from '../utils/normalize'
import { getScope } from './scope'

type TransportLike = { send: (e: ObservaEvent) => Promise<void> }

export class Client {
    constructor(private readonly options: SDKOptions, private readonly transport: TransportLike) { }
    async captureException(error: unknown, hint?: Record<string, unknown>): Promise<string | null> {
        if (!this.isSampled()) return null
        const scope = getScope()
        const event = this.buildEvent('error', undefined, scope, error, hint)
        const final = this.beforeSend(event)
        if (!final) return null
        await this.transport.send(final)
        return final.event_id
    }
    async captureMessage(message: string, level: ObservaEvent['level'] = 'info', hint?: Record<string, unknown>): Promise<string | null> {
        if (!this.isSampled()) return null
        const scope = getScope()
        const event = this.buildEvent(level, message, scope, undefined, hint)
        const final = this.beforeSend(event)
        if (!final) return null
        await this.transport.send(final)
        return final.event_id
    }
    private isSampled(): boolean {
        const r = this.options.sampleRate ?? 1
        if (r >= 1) return true
        return Math.random() < r
    }
    private beforeSend(e: ObservaEvent): ObservaEvent | null {
        const f = this.options.beforeSend
        if (!f) return e
        try { return f(e) } catch { return e }
    }
    private buildEvent(level: ObservaEvent['level'], message: string | undefined, scope: Scope, error: unknown, hint?: Record<string, unknown>): ObservaEvent {
        const event_id = uuid4()
        const timestamp = new Date().toISOString()
        const exception = this.buildException(error)
        const contexts = scope.propagationContext.trace_id ? { trace: { trace_id: scope.propagationContext.trace_id, span_id: scope.propagationContext.span_id, sampled: scope.propagationContext.sampled } } : undefined
        const sdk = { name: '@observa/sdk-node', version: '0.1.0' }
        return normalizeEvent({
            event_id,
            timestamp,
            level,
            message,
            exception,
            environment: this.options.environment,
            release: this.options.release,
            user: scope.user,
            tags: scope.tags,
            extra: hint ? { ...scope.extra, hint } : scope.extra,
            breadcrumbs: scope.breadcrumbs,
            sdk,
            schema_version: 1,
            contexts,
        })
    }
    private buildException(error: unknown): ObservaEvent['exception'] | undefined {
        if (!error) return undefined
        if (error instanceof Error) {
            const type = error.name || 'Error'
            const value = String(error.message || String(error))
            const stacktrace = parseStack(error)
            return { type, value, stacktrace }
        }
        return { type: typeof error, value: String(error) }
    }
}