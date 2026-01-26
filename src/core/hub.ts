import type { SDKOptions } from '../types/options'
import { Client } from './client'
import { HttpTransport } from '../transport/httpTransport'
import { EventQueue } from '../transport/queue'
import { setBaseContext, setUser, setTag, setExtra, addBreadcrumb, withScope, pushScope, popScope, setPropagationContext, runWithNewScope } from './scope'
import type { ObservaEvent } from '../types/event'

let client: Client | undefined
let queue: EventQueue | undefined
let transport: HttpTransport | undefined
let enabled = true

export function init(options: SDKOptions) {
    enabled = options.enabled ?? true
    transport = new HttpTransport(options)
    queue = new EventQueue(transport)
    const adapter = { send: async (e: ObservaEvent) => queue!.push(e) }
    client = new Client(options, adapter)
    setBaseContext({ environment: options.environment, release: options.release })
    if (options.integrations) {
        for (const i of options.integrations) { try { i.setup() } catch { } }
    }
}

function getClient(): Client {
    if (!client) throw new Error('Observa SDK not initialized')
    return client
}

export async function captureException(error: unknown, hint?: Record<string, unknown>) {
    if (!enabled) return null
    try { return await getClient().captureException(error, hint) } catch { return null }
}

export async function captureMessage(message: string, level: 'error' | 'warning' | 'info' | 'debug' = 'info', hint?: Record<string, unknown>) {
    if (!enabled) return null
    try { return await getClient().captureMessage(message, level, hint) } catch { return null }
}

export { setUser, setTag, setExtra, addBreadcrumb, withScope, pushScope, popScope, setPropagationContext, runWithNewScope }

export async function flush() { if (queue) await queue.flush() }