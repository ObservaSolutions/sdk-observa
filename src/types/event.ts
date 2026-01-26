export type Frame = {
    filename?: string
    function?: string
    lineno?: number
    colno?: number
    in_app?: boolean
}

import type { Breadcrumb } from './breadcrumb'

export type ObservaEvent = {
    event_id: string
    timestamp: string
    level: 'error' | 'warning' | 'info' | 'debug'
    message?: string
    exception?: {
        type: string
        value: string
        stacktrace?: { frames: Frame[] }
    }
    environment?: string
    release?: string
    user?: { id?: string; email?: string; username?: string }
    tags?: Record<string, string>
    extra?: Record<string, unknown>
    breadcrumbs?: Breadcrumb[]
    sdk?: { name: string; version: string }
    schema_version: 1
    contexts?: { trace?: { trace_id: string; span_id?: string; sampled?: boolean } }
}