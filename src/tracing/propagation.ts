import { setPropagationContext } from '../core/scope'

export type TraceHeaders = Record<string, string>

function getHeader(headers: Record<string, string>, name: string): string | undefined {
    const lname = name.toLowerCase()
    for (const k in headers) {
        if (k.toLowerCase() === lname) return headers[k]
    }
    return undefined
}

export function continueTraceFromHeaders(headers: Record<string, string>) {
    const h = getHeader(headers, 'observa-trace') ?? getHeader(headers, 'sentry-trace')
    if (!h) return
    const parts = h.split('-')
    const trace_id = parts[0]
    const span_id = parts[1]
    const sampled = parts[2] === '1' || parts[2] === 'true'
    setPropagationContext({ trace_id, span_id, sampled })
}

export function getTraceHeaders(ctx: { trace_id?: string; span_id?: string; sampled?: boolean }): TraceHeaders {
    const t = ctx.trace_id || ''
    const s = ctx.span_id || ''
    const f = ctx.sampled ? '1' : '0'
    return { 'observa-trace': `${t}-${s}-${f}` }
}

export function startTransaction() { }
export function startSpan() { }